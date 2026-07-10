/**
 * FR live poller — grab stills from analytics-fr cams → detect → 1:N → emit hits/crops.
 * mob-fr-best-frame-window: several grabs per tick, emit sharpest face only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const frLiveProbe = require('./frLiveProbe');
const frSidecarClient = require('./frSidecarClient');
const frBlacklist = require('./frBlacklist');
const frSnapLedger = require('./frSnapLedger');

const POLL_SEC = Math.max(2, parseInt(process.env.FM_FR_POLL_SEC || '2', 10) || 2);
const LIVE_SLOTS = Math.max(1, Math.min(4, parseInt(process.env.FM_FR_LIVE_SLOTS || '4', 10) || 4));
const MATCH_MIN = Math.max(70, Math.min(99, parseInt(process.env.FM_FR_MATCH_MIN || '75', 10) || 75));
const HIT_DEDUPE_MS = parseInt(process.env.FM_FR_HIT_DEDUPE_MS || '45000', 10) || 45000;
/** Grabs per cam per poll window — rail gets each good face; alarm uses sharpest only. */
const BEST_FRAME_GRABS = Math.max(1, Math.min(5, parseInt(process.env.FM_FR_BEST_FRAME_GRABS || '3', 10) || 3));
const BEST_FRAME_GAP_MS = Math.max(100, Math.min(1000, parseInt(process.env.FM_FR_BEST_FRAME_GAP_MS || '350', 10) || 350));
/** mob-fr-snapshot-rolling: emit every usable grab to Snapshot rail (not only window winner). */
const ROLLING_RAIL = process.env.FM_FR_ROLLING_RAIL !== '0';

let deps = null;
let timer = null;
let busy = false;
/** @type {Map<string, { camIds: string[], threshold: number, at: number }>} */
const watchBySocket = new Map();
/** @type {Map<string, number>} */
const lastHitAt = new Map();
let cropsDir = null;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function init(options) {
    deps = options || {};
    const storageDir = deps.storageDir || path.join(__dirname, '..', 'storage');
    cropsDir = path.join(storageDir, 'fr-live-crops');
    try { fs.mkdirSync(cropsDir, { recursive: true }); } catch (_) { /* ignore */ }
    /* mob-fr-snap-ledger: durable crops + cam/time/score/GPS index */
    frSnapLedger.init(storageDir, {
        getGps: typeof deps.getGps === 'function' ? deps.getGps : null,
    });
}

function setWatchSlots(socketId, camIds, threshold) {
    if (!socketId) return;
    const ids = (Array.isArray(camIds) ? camIds : [])
        .map((c) => String(c || '').trim())
        .filter(Boolean)
        .slice(0, LIVE_SLOTS);
    const thr = Math.max(70, Math.min(99, Number(threshold) || MATCH_MIN));
    if (!ids.length) {
        watchBySocket.delete(socketId);
        return;
    }
    watchBySocket.set(socketId, { camIds: ids, threshold: thr, at: Date.now() });
}

function clearWatch(socketId) {
    if (socketId) watchBySocket.delete(socketId);
}

function collectProbeCams() {
    const byCam = Object.create(null);
    watchBySocket.forEach((w) => {
        (w.camIds || []).forEach((id) => {
            if (!byCam[id] || w.threshold < byCam[id].threshold) {
                byCam[id] = { camId: id, threshold: w.threshold };
            }
        });
    });
    if (deps.liveViewers && typeof deps.liveViewers.listCamIdsForSurface === 'function') {
        deps.liveViewers.listCamIdsForSurface('analytics-fr').forEach((id) => {
            if (!byCam[id]) byCam[id] = { camId: id, threshold: MATCH_MIN };
        });
    }
    const list = Object.keys(byCam).map((k) => byCam[k]);
    return list.slice(0, LIVE_SLOTS);
}

/**
 * Persist face crop to snap ledger (durable) — not the old 80-file wipe folder.
 * @param {string} camId
 * @param {string} b64
 * @param {object} [meta]
 * @returns {string|null} crop file name
 */
function saveCropB64(camId, b64, meta) {
    if (!b64) return null;
    const m = meta || {};
    const entry = frSnapLedger.record({
        camId,
        deviceLabel: m.deviceLabel || deviceLabelFor(camId),
        jpegB64: b64,
        at: m.at || new Date().toISOString(),
        scorePct: m.scorePct || 0,
        match: !!m.match,
        hitId: m.hitId || null,
        blacklistId: m.blacklistId || null,
        displayName: m.displayName || null,
        sharpness: m.sharpness,
        source: m.source || 'live',
        rolling: !!m.rolling,
        bestFrame: !!m.bestFrame,
    });
    return entry ? entry.cropFile : null;
}

function cropUrl(fileName) {
    if (!fileName) return null;
    /* Prefer ledger URL; legacy /crop/ still serves old fr-live-crops files */
    if (String(fileName).indexOf('frs-') === 0) return frSnapLedger.cropUrl(fileName);
    return '/api/analytics/fr/crop/' + encodeURIComponent(fileName);
}

function deviceLabelFor(camId) {
    if (deps && typeof deps.deviceLabel === 'function') {
        try { return deps.deviceLabel(camId) || camId; } catch (_) { /* ignore */ }
    }
    return camId;
}

function gpsFieldsForCam(camId) {
    if (!camId || !deps || typeof deps.getGps !== 'function') {
        return { lat: null, lon: null, gpsAt: null };
    }
    try {
        const g = deps.getGps(camId);
        const lat = g && g.lat != null ? Number(g.lat) : NaN;
        const lon = g && g.lon != null ? Number(g.lon) : NaN;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { lat, lon, gpsAt: g.at != null ? g.at : null };
        }
    } catch (_) { /* ignore */ }
    return { lat: null, lon: null, gpsAt: null };
}

function cropTickPayload(base) {
    return Object.assign({}, base, gpsFieldsForCam(base && base.camId));
}

/**
 * One grab + sidecar probe. Does not emit.
 * @returns {Promise<{ kind: 'ok'|'skip'|'empty'|'fail', camId: string, sharpness?: number, rep?: object, faceArea?: number }>}
 */
async function grabRepresent(camId) {
    const pool = deps.liveStreamPool;
    if (!pool || !pool.isStreamingForCam || !pool.isStreamingForCam(camId)) {
        return { kind: 'fail', camId };
    }
    const port = deps.videoWsPort;
    let jpeg;
    try {
        jpeg = await frLiveProbe.grabJpeg(camId, port);
    } catch (err) {
        if (deps.log) {
            try { deps.log.media.warn('fr grab failed', { camId, message: String(err && err.message || err).slice(0, 120) }); } catch (_) { /* ignore */ }
        }
        return { kind: 'fail', camId };
    }
    const tmp = path.join(cropsDir, 'probe-' + camId.replace(/[^\w.-]+/g, '_') + '-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex') + '.jpg');
    try {
        fs.writeFileSync(tmp, jpeg);
        const rep = await frSidecarClient.representProbePath(tmp);
        if (!rep || !rep.ok) {
            /* blur / tiny / clipped (half-face at edge) — no rail, no ledger */
            const skip = rep && (
                rep.error === 'quality_blur'
                || rep.error === 'face_too_small'
                || rep.error === 'face_clipped'
                || rep.error === 'face_composition'
            );
            if (skip) {
                return {
                    kind: 'skip',
                    camId,
                    sharpness: rep.sharpness != null ? Number(rep.sharpness) : 0,
                    skipReason: rep.error || 'skip',
                };
            }
            return { kind: 'empty', camId };
        }
        const fw = Number(rep.faceWidth) || 0;
        const fh = Number(rep.faceHeight) || 0;
        return {
            kind: 'ok',
            camId,
            rep,
            sharpness: rep.sharpness != null ? Number(rep.sharpness) : 0,
            faceArea: fw * fh,
        };
    } finally {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
}

function pickBestCandidate(cands) {
    if (!cands || !cands.length) return null;
    let best = cands[0];
    for (let i = 1; i < cands.length; i++) {
        const c = cands[i];
        const bs = best.sharpness || 0;
        const cs = c.sharpness || 0;
        if (cs > bs) {
            best = c;
            continue;
        }
        if (cs === bs && (c.faceArea || 0) > (best.faceArea || 0)) best = c;
    }
    return best;
}

function emitHit(camId, matched, tick) {
    const dedupeKey = camId + ':' + matched.match.id;
    const now = Date.now();
    if (lastHitAt.has(dedupeKey) && now - lastHitAt.get(dedupeKey) < HIT_DEDUPE_MS) return;
    lastHitAt.set(dedupeKey, now);
    const hit = {
        hitId: 'frh-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
        camId,
        deviceLabel: deviceLabelFor(camId),
        blacklistId: matched.match.id,
        displayName: matched.match.displayName,
        idNumber: matched.match.idNumber || '',
        listStatus: matched.match.listStatus || 'blacklist',
        reasonCode: matched.match.reasonCode || 'other',
        reasonOther: matched.match.reasonOther || '',
        lastSeen: matched.match.lastSeen || '',
        lastIncident: matched.match.lastIncident || '',
        notes: matched.match.notes || '',
        scorePct: matched.scorePct,
        threshold: matched.minScorePct,
        cropUrl: tick.cropUrl,
        photoUrl: '/api/analytics/fr/blacklist/' + encodeURIComponent(matched.match.id) + '/photo',
        at: tick.at,
        source: 'live',
        sharpness: tick.sharpness != null ? tick.sharpness : null,
    };
    if (deps.emit) deps.emit('fr-blacklist-hit', hit, camId);
    if (deps.onHit) {
        try { deps.onHit(hit); } catch (_) { /* ignore */ }
    }
    return hit;
}

async function probeOne(entry) {
    const camId = entry.camId;
    const pool = deps.liveStreamPool;
    if (!pool || !pool.isStreamingForCam || !pool.isStreamingForCam(camId)) {
        return null;
    }

    const candidates = [];
    let sawEmpty = false;
    for (let g = 0; g < BEST_FRAME_GRABS; g++) {
        if (g > 0) await sleep(BEST_FRAME_GAP_MS);
        const one = await grabRepresent(camId);
        if (one.kind === 'ok' && one.rep) {
            candidates.push(one);
            /* Rolling Snapshot rail: every usable face grab, not only the window winner. */
            if (ROLLING_RAIL && deps.emit && one.rep.cropJpegB64) {
                const atIso = new Date().toISOString();
                const cropFile = saveCropB64(camId, one.rep.cropJpegB64, {
                    at: atIso,
                    sharpness: one.sharpness,
                    rolling: true,
                    source: 'live',
                });
                if (cropFile) {
                    deps.emit('fr-crop-tick', cropTickPayload({
                        camId,
                        deviceLabel: deviceLabelFor(camId),
                        at: atIso,
                        faces: one.rep.faceCount || 1,
                        cropUrl: cropUrl(cropFile),
                        match: false,
                        scorePct: 0,
                        sharpness: one.sharpness,
                        bestFrame: false,
                        rolling: true,
                        windowGrabs: BEST_FRAME_GRABS,
                    }), camId);
                }
            }
        } else if (one.kind === 'empty') {
            sawEmpty = true;
        }
    }

    const best = pickBestCandidate(candidates);
    if (!best || !best.rep) {
        if (!candidates.length && sawEmpty && deps.emit) {
            deps.emit('fr-crop-tick', cropTickPayload({
                camId,
                deviceLabel: deviceLabelFor(camId),
                at: new Date().toISOString(),
                faces: 0,
                match: false,
            }), camId);
        }
        return { camId, faces: 0, windowGrabs: BEST_FRAME_GRABS, candidates: 0 };
    }

    const rep = best.rep;
    const matched = frBlacklist.matchProbe(rep.embedding, { minScorePct: entry.threshold });
    const atIso = new Date().toISOString();
    /* Always ledger the window winner (match or not) — GPS + cam for later map trace */
    const cropFile = saveCropB64(camId, rep.cropJpegB64, {
        at: atIso,
        scorePct: matched.scorePct || 0,
        match: !!(matched.match),
        blacklistId: matched.match ? matched.match.id : null,
        displayName: matched.match ? matched.match.displayName : null,
        sharpness: best.sharpness,
        bestFrame: true,
        source: 'live',
    });
    const tick = {
        camId,
        deviceLabel: deviceLabelFor(camId),
        at: atIso,
        faces: rep.faceCount || 1,
        cropUrl: cropUrl(cropFile),
        scorePct: matched.scorePct || 0,
        match: !!(matched.match),
        displayName: matched.match ? matched.match.displayName : null,
        blacklistId: matched.match ? matched.match.id : null,
        sharpness: best.sharpness,
        bestFrame: true,
        windowGrabs: BEST_FRAME_GRABS,
        windowCandidates: candidates.length,
    };
    /* Rolling already filled the rail per grab; non-rolling emits one card per window. */
    if (deps.emit && !ROLLING_RAIL) {
        deps.emit('fr-crop-tick', cropTickPayload(tick), camId);
    }

    if (matched.match) {
        const hit = emitHit(camId, matched, tick);
        if (hit) return { camId, hit, bestFrame: true };
    }
    return { camId, faces: tick.faces, match: tick.match, bestFrame: true };
}

async function tick() {
    if (busy || !deps) return;
    if (deps.isFrLicensed && !deps.isFrLicensed()) return;
    const cams = collectProbeCams();
    if (!cams.length) return;
    busy = true;
    try {
        for (let i = 0; i < cams.length; i++) {
            try {
                await probeOne(cams[i]);
            } catch (_) { /* continue other cams */ }
        }
    } finally {
        busy = false;
    }
}

function start() {
    if (timer) return;
    timer = setInterval(() => {
        tick().catch(() => { /* ignore */ });
    }, POLL_SEC * 1000);
    setTimeout(() => { tick().catch(() => {}); }, 1500);
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    watchBySocket.clear();
}

function cropAbsolutePath(fileName) {
    const fromLedger = frSnapLedger.cropAbsolutePath(fileName);
    if (fromLedger) return fromLedger;
    if (!fileName || !cropsDir) return null;
    const safe = path.basename(String(fileName));
    if (!/\.jpe?g$/i.test(safe)) return null;
    const p = path.join(cropsDir, safe);
    return fs.existsSync(p) ? p : null;
}

module.exports = {
    init,
    start,
    stop,
    setWatchSlots,
    clearWatch,
    cropAbsolutePath,
    POLL_SEC,
    LIVE_SLOTS,
    MATCH_MIN,
    BEST_FRAME_GRABS,
    BEST_FRAME_GAP_MS,
    ROLLING_RAIL,
};
