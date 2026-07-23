/**
 * FR live poller — grab stills from analytics-fr cams → detect → 1:N → emit hits/crops.
 * mob-fr-best-frame-window: several grabs per tick, emit sharpest face only.
 * mob-fr-alert-tier-server: grade gates interrupt emit (poi/monitoring → rail+ledger only).
 * mob-fr-poller-batch-grab: N JPEG grabs → one /represent-probe-batch HTTP (ONNX); DeepFace serial fallback in client.
 * mob-fr-rail-window-score: emit best-of-window real matchProbe % onto Recent (near-miss visible).
 * mob-fr-rail-scored-only: Recent = scored window frames only (no unlabeled rolling twins).
 * mob-fr-snap-grab-faster: default 2 grabs / 200ms gap (was 3 / 350) — less still harvest per poll.
 * mob-fr-bwc-track-buffer-best-face: keep a short per-BWC quality buffer for walking bodycam faces.
 * FR-LIVE-GRAB-ZLM-HANDOFF-V1: pool live OR WVP handoff active → grab via FLV when handoff.
 * FR-LIVE-SNAP-FASTER-V1: poll floor 1s (default 1); one grab under handoff.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const frLiveProbe = require('./frLiveProbe');
const frSidecarClient = require('./frSidecarClient');
const frBlacklist = require('./frBlacklist');
const frSnapLedger = require('./frSnapLedger');
const { alertTierFor, shouldInterruptOperators, shouldNotifyOperators } = require('./frAlertTier');

/** FR-LIVE-SNAP-FASTER-V1 — floor 1s (was 2); default 1 for snappier Recent under FLV. */
const POLL_SEC = Math.max(1, Math.min(10, parseInt(process.env.FM_FR_POLL_SEC || '1', 10) || 1));
const LIVE_SLOTS = Math.max(1, Math.min(4, parseInt(process.env.FM_FR_LIVE_SLOTS || '4', 10) || 4));
const MATCH_MIN = Math.max(70, Math.min(99, parseInt(process.env.FM_FR_MATCH_MIN || '75', 10) || 75));
const HIT_DEDUPE_MS = parseInt(process.env.FM_FR_HIT_DEDUPE_MS || '45000', 10) || 45000;
/**
 * FR-BLACKLIST-SCORE-UPGRADE-DISPATCH-V1 — same floor as auto go-ops (default 75).
 * Cross this after a sub-threshold interrupt → one re-emit for map dispatch.
 */
const AUTO_DISPATCH_SCORE_MIN = Math.max(70, Math.min(99,
    parseInt(process.env.FM_FR_MAP_AUTO_SCORE_MIN || process.env.FM_FR_MATCH_MIN || '75', 10) || 75));
/** Grabs per cam per poll window — classic path default 2; handoff uses grabsForCam(). */
const BEST_FRAME_GRABS = Math.max(1, Math.min(5, parseInt(process.env.FM_FR_BEST_FRAME_GRABS || '2', 10) || 2));
/** Under WVP handoff: default 1 still/tick (override FM_FR_HANDOFF_BEST_FRAME_GRABS). */
const HANDOFF_BEST_FRAME_GRABS = Math.max(1, Math.min(5, parseInt(
    process.env.FM_FR_HANDOFF_BEST_FRAME_GRABS != null && String(process.env.FM_FR_HANDOFF_BEST_FRAME_GRABS).trim() !== ''
        ? process.env.FM_FR_HANDOFF_BEST_FRAME_GRABS
        : '1',
    10
) || 1));
const BEST_FRAME_GAP_MS = Math.max(100, Math.min(1000, parseInt(process.env.FM_FR_BEST_FRAME_GAP_MS || '200', 10) || 200));
/** mob-fr-snapshot-rolling: grab crops for ledger; rail flood disabled by scored-only. */
const ROLLING_RAIL = process.env.FM_FR_ROLLING_RAIL !== '0';
/**
 * mob-fr-rail-scored-only: Recent UI only gets window-scored ticks (real %).
 * Rolling grabs may still save to disk/ledger but must not emit unlabeled face cards.
 */
const RAIL_SCORED_ONLY = process.env.FM_FR_RAIL_SCORED_ONLY !== '0';
/** mob-fr-alert-tier-server: poi/monitoring skip fr-blacklist-hit (set 0 = legacy all interrupt). */
const ALERT_TIER_ENABLED = process.env.FM_FR_ALERT_TIER !== '0';
/** mob-fr-poller-batch-grab: set 0 to force legacy 1 HTTP per grab (debug). Default on. */
const BATCH_PROBE = process.env.FM_FR_BATCH_PROBE !== '0';
/** FR-LIVE-DEAD-DIAGNOSE-V1 — rate-limit skip logs (handoff vs no pool). */
const skipLogAtByCam = new Map();
const SKIP_LOG_MS = 30000;
/** BWC faces move through bad frames; keep a short buffer and emit only the best candidate. */
const TRACK_BUFFER_MS = Math.max(1000, Math.min(5000, parseInt(process.env.FM_FR_TRACK_BUFFER_MS || '2200', 10) || 2200));
const TRACK_BUFFER_MAX = Math.max(3, Math.min(20, parseInt(process.env.FM_FR_TRACK_BUFFER_MAX || '8', 10) || 8));

let deps = null;
let timer = null;
let busy = false;
/** @type {Map<string, { camIds: string[], threshold: number, at: number }>} */
const watchBySocket = new Map();
/** @type {Map<string, number>} */
const lastHitAt = new Map();
/** @type {Map<string, number>} last emitted interrupt score — FR-BLACKLIST-SCORE-UPGRADE-DISPATCH-V1 */
const lastHitScoreByKey = new Map();
/** @type {Map<string, Array<object>>} */
const trackBufferByCam = new Map();
let cropsDir = null;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fleet mpeg1 pool streaming, or WVP/ZLM handoff already playing this cam. */
function isCamLiveForFr(camId) {
    const id = String(camId || '').trim();
    if (!id) return false;
    const pool = deps && deps.liveStreamPool;
    if (pool && pool.isStreamingForCam && pool.isStreamingForCam(id)) return true;
    return isHandoffLiveForFr(id);
}

function isHandoffLiveForFr(camId) {
    const id = String(camId || '').trim();
    if (!id) return false;
    try {
        const wvp = require('./wvpVideoHandoff');
        if (wvp.isHandoffEnabled && wvp.isHandoffEnabled()
            && wvp.isActive && wvp.isActive(id)
            && wvp.getUpstreamFlv && wvp.getUpstreamFlv(id)) {
            return true;
        }
    } catch (_) { /* ignore */ }
    return false;
}

/** FR-LIVE-SNAP-FASTER-V1 — one FLV still per tick under handoff (classic keeps BEST_FRAME_GRABS). */
function grabsForCam(camId) {
    if (isHandoffLiveForFr(camId)) return HANDOFF_BEST_FRAME_GRABS;
    return BEST_FRAME_GRABS;
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

function setMatchThresholdForActiveWatches(threshold) {
    const thr = Math.max(70, Math.min(99, Number(threshold) || MATCH_MIN));
    watchBySocket.forEach((w, socketId) => {
        watchBySocket.set(socketId, {
            camIds: Array.isArray(w.camIds) ? w.camIds : [],
            threshold: thr,
            at: Date.now(),
        });
    });
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

function probeTmpPath(camId) {
    return path.join(
        cropsDir,
        'probe-' + camId.replace(/[^\w.-]+/g, '_') + '-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex') + '.jpg'
    );
}

/**
 * Map sidecar represent-probe body → grabRepresent result shape.
 */
function classifyProbeRep(camId, rep) {
    if (!rep || !rep.ok) {
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
    const sharpness = rep.sharpness != null ? Number(rep.sharpness) : 0;
    const qualityScore = rep.qualityScore != null ? Number(rep.qualityScore) : 0;
    return {
        kind: 'ok',
        camId,
        rep,
        sharpness,
        qualityScore,
        faceArea: fw * fh,
    };
}

function compareCandidate(a, b) {
    if (!a && !b) return 0;
    if (a && !b) return 1;
    if (!a && b) return -1;
    const aq = Number(a.qualityScore || 0);
    const bq = Number(b.qualityScore || 0);
    if (aq !== bq) return aq > bq ? 1 : -1;
    const as = Number(a.sharpness || 0);
    const bs = Number(b.sharpness || 0);
    if (as !== bs) return as > bs ? 1 : -1;
    const aa = Number(a.faceArea || 0);
    const ba = Number(b.faceArea || 0);
    if (aa !== ba) return aa > ba ? 1 : -1;
    const at = Number(a.seenAt || 0);
    const bt = Number(b.seenAt || 0);
    return at === bt ? 0 : (at > bt ? 1 : -1);
}

function pruneTrackBuffer(camId, now) {
    const list = trackBufferByCam.get(camId) || [];
    const kept = list.filter((c) => c && c.rep && now - Number(c.seenAt || 0) <= TRACK_BUFFER_MS);
    if (kept.length) {
        trackBufferByCam.set(camId, kept);
    } else {
        trackBufferByCam.delete(camId);
    }
    return kept;
}

function addTrackBufferCandidates(camId, candidates, now) {
    const merged = pruneTrackBuffer(camId, now);
    (candidates || []).forEach((c) => {
        if (!c || !c.rep) return;
        merged.push(Object.assign({}, c, { seenAt: now }));
    });
    merged.sort((a, b) => compareCandidate(b, a));
    const capped = merged.slice(0, TRACK_BUFFER_MAX);
    if (capped.length) {
        trackBufferByCam.set(camId, capped);
    } else {
        trackBufferByCam.delete(camId);
    }
    return { best: capped[0] || null, bufferSize: capped.length };
}

function pruneTrackBuffers(activeCamIds) {
    const now = Date.now();
    const active = activeCamIds || new Set();
    Array.from(trackBufferByCam.keys()).forEach((camId) => {
        if (!active.has(camId)) {
            trackBufferByCam.delete(camId);
            return;
        }
        pruneTrackBuffer(camId, now);
    });
}

/**
 * One grab + sidecar probe (legacy single-HTTP path). Does not emit.
 */
async function grabRepresent(camId) {
    if (!isCamLiveForFr(camId)) {
        return { kind: 'fail', camId };
    }
    const port = deps.videoWsPort;
    let jpeg;
    try {
        jpeg = await frLiveProbe.grabJpegForFr(camId, port);
    } catch (err) {
        if (deps.log) {
            try { deps.log.media.warn('fr grab failed', { camId, message: String(err && err.message || err).slice(0, 120) }); } catch (_) { /* ignore */ }
        }
        return { kind: 'fail', camId };
    }
    const tmp = probeTmpPath(camId);
    try {
        fs.writeFileSync(tmp, jpeg);
        const rep = await frSidecarClient.representProbePath(tmp);
        return classifyProbeRep(camId, rep);
    } finally {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
}

/**
 * mob-fr-poller-batch-grab: write N stills, one batch represent, then classify.
 */
async function grabRepresentBatch(camId, grabCount) {
    if (!isCamLiveForFr(camId)) {
        return [{ kind: 'fail', camId }];
    }
    const port = deps.videoWsPort;
    const tmpFiles = [];
    try {
        for (let g = 0; g < grabCount; g++) {
            if (g > 0) await sleep(BEST_FRAME_GAP_MS);
            let jpeg;
            try {
                jpeg = await frLiveProbe.grabJpegForFr(camId, port);
            } catch (err) {
                if (deps.log) {
                    try { deps.log.media.warn('fr grab failed', { camId, message: String(err && err.message || err).slice(0, 120) }); } catch (_) { /* ignore */ }
                }
                tmpFiles.push(null);
                continue;
            }
            const tmp = probeTmpPath(camId);
            try {
                fs.writeFileSync(tmp, jpeg);
                tmpFiles.push(tmp);
            } catch (_) {
                tmpFiles.push(null);
            }
        }
        const paths = tmpFiles.filter(Boolean);
        if (!paths.length) {
            return Array.from({ length: grabCount }, () => ({ kind: 'fail', camId }));
        }
        const batch = await frSidecarClient.representProbeBatchPaths(paths);
        const byPath = Object.create(null);
        (batch && batch.results ? batch.results : []).forEach((row) => {
            if (row && row.path) byPath[row.path] = row;
        });
        return tmpFiles.map((tmp) => {
            if (!tmp) return { kind: 'fail', camId };
            const rep = byPath[tmp] || { ok: false, error: 'batch_missing_row' };
            return classifyProbeRep(camId, rep);
        });
    } finally {
        tmpFiles.forEach((tmp) => {
            if (!tmp) return;
            try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        });
    }
}

function pickBestCandidate(cands) {
    if (!cands || !cands.length) return null;
    let best = cands[0];
    for (let i = 1; i < cands.length; i++) {
        const c = cands[i];
        if (compareCandidate(c, best) > 0) best = c;
    }
    return best;
}

function emitHit(camId, matched, tick) {
    const dedupeKey = camId + ':' + matched.match.id;
    const now = Date.now();
    const scorePct = Number(matched.scorePct);
    const score = Number.isFinite(scorePct) ? scorePct : 0;
    const prevAt = lastHitAt.get(dedupeKey) || 0;
    const prevScore = lastHitScoreByKey.has(dedupeKey)
        ? Number(lastHitScoreByKey.get(dedupeKey))
        : null;
    const withinDedupe = prevAt && (now - prevAt) < HIT_DEDUPE_MS;
    /*
     * FR-BLACKLIST-SCORE-UPGRADE-DISPATCH-V1:
     * Allow one re-emit when prior interrupt was below auto-dispatch floor
     * and this match crosses >= AUTO_DISPATCH_SCORE_MIN (default 75).
     */
    const scoreUpgrade = withinDedupe
        && prevScore != null
        && Number.isFinite(prevScore)
        && prevScore < AUTO_DISPATCH_SCORE_MIN
        && score >= AUTO_DISPATCH_SCORE_MIN;
    if (withinDedupe && !scoreUpgrade) return null;
    lastHitAt.set(dedupeKey, now);
    lastHitScoreByKey.set(dedupeKey, score);
    const listStatus = matched.match.listStatus || 'blacklist';
    const tier = ALERT_TIER_ENABLED ? alertTierFor(listStatus) : 'high';
    const hit = {
        hitId: 'frh-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
        camId,
        deviceLabel: deviceLabelFor(camId),
        blacklistId: matched.match.id,
        displayName: matched.match.displayName,
        idNumber: matched.match.idNumber || '',
        listStatus,
        alertTier: tier,
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
        scoreUpgrade: !!scoreUpgrade,
        prevScorePct: scoreUpgrade ? prevScore : null,
    };
    Object.assign(hit, gpsFieldsForCam(camId));

    if (!shouldInterruptOperators(tier)) {
        if (ROLLING_RAIL && deps.emit) {
            deps.emit('fr-crop-tick', cropTickPayload({
                camId,
                deviceLabel: hit.deviceLabel,
                at: tick.at,
                faces: tick.faces || 1,
                cropUrl: tick.cropUrl,
                match: true,
                scorePct: hit.scorePct,
                displayName: hit.displayName,
                blacklistId: hit.blacklistId,
                listStatus: hit.listStatus,
                alertTier: tier,
                sharpness: tick.sharpness,
                bestFrame: true,
                windowGrabs: tick.windowGrabs,
            }), camId);
        }
        if (deps.log) {
            try {
                deps.log.media.info('fr watchlist match (tier gated)', {
                    camId,
                    blacklistId: hit.blacklistId,
                    listStatus: hit.listStatus,
                    alertTier: tier,
                    scorePct: hit.scorePct,
                });
            } catch (_) { /* ignore */ }
        }
    }

    if (scoreUpgrade && deps.log) {
        try {
            deps.log.media.info('fr blacklist score upgrade dispatch', {
                camId,
                blacklistId: hit.blacklistId,
                prevScorePct: prevScore,
                scorePct: score,
                autoMin: AUTO_DISPATCH_SCORE_MIN,
                path: 'fr-blacklist-score-upgrade-dispatch-v1',
            });
        } catch (_) { /* ignore */ }
    }

    /* FR-GRADE-COLOUR-TOAST-NO-JUMP-V1 — notify all grades (colour toast); map jump is client-side blacklist-only */
    if (shouldNotifyOperators(tier) && deps.emit) {
        deps.emit('fr-blacklist-hit', hit, camId);
    }
    if (deps.onHit) {
        try { deps.onHit(hit); } catch (_) { /* ignore */ }
    }
    return hit;
}

function emitRollingFromCandidate(camId, one) {
    if (!ROLLING_RAIL || !one.rep || !one.rep.cropJpegB64) return;
    const atIso = new Date().toISOString();
    const cropFile = saveCropB64(camId, one.rep.cropJpegB64, {
        at: atIso,
        sharpness: one.sharpness,
        rolling: true,
        source: 'live',
    });
    if (!cropFile) return;
    /* mob-fr-rail-scored-only — do not flood Recent with unscored twins */
    if (RAIL_SCORED_ONLY || !deps.emit) return;
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
        windowGrabs: grabsForCam(camId),
    }), camId);
}

async function probeOne(entry) {
    const camId = entry.camId;
    if (!isCamLiveForFr(camId)) {
        /* FR-LIVE-DEAD-DIAGNOSE-V1 — wait for tile handoff (or classic pool) before grab */
        if (deps.log) {
            const now = Date.now();
            const last = skipLogAtByCam.get(camId) || 0;
            if (now - last >= SKIP_LOG_MS) {
                skipLogAtByCam.set(camId, now);
                const handoffOn = String(process.env.FM_WVP_VIDEO_HANDOFF || '').trim() === '1';
                try {
                    deps.log.media.warn('fr probe skip: cam not live for FR', {
                        camId,
                        wvpHandoff: handoffOn,
                        hint: handoffOn
                            ? 'wait for WVP/FLV handoff on FR tile (start watch), then grab uses ZLM'
                            : 'start-video / liveStreamPool not live for this cam',
                    });
                } catch (_) { /* ignore */ }
            }
        }
        return null;
    }

    const grabN = grabsForCam(camId);
    const candidates = [];
    let sawEmpty = false;
    let ones;

    if (BATCH_PROBE) {
        ones = await grabRepresentBatch(camId, grabN);
    } else {
        ones = [];
        for (let g = 0; g < grabN; g++) {
            if (g > 0) await sleep(BEST_FRAME_GAP_MS);
            ones.push(await grabRepresent(camId));
        }
    }

    for (let i = 0; i < ones.length; i++) {
        const one = ones[i];
        if (one.kind === 'ok' && one.rep) {
            candidates.push(one);
            emitRollingFromCandidate(camId, one);
        } else if (one.kind === 'empty') {
            sawEmpty = true;
        }
    }

    const observedAt = Date.now();
    const buffered = addTrackBufferCandidates(camId, candidates, observedAt);
    const best = buffered.best || pickBestCandidate(candidates);
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
        return { camId, faces: 0, windowGrabs: grabN, candidates: 0 };
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
        listStatus: matched.match ? (matched.match.listStatus || 'blacklist') : null,
        alertTier: matched.match ? alertTierFor(matched.match.listStatus || 'blacklist') : null,
        sharpness: best.sharpness,
        bestFrame: true,
        windowGrabs: grabN,
        windowCandidates: candidates.length,
        trackBufferCandidates: buffered.bufferSize || candidates.length,
        trackBufferMs: TRACK_BUFFER_MS,
        windowScore: true,
    };
    /*
     * mob-fr-rail-window-score + mob-fr-rail-scored-only:
     * Recent only gets this best-of-window tick (real matchProbe %). Skip blank 0% when nothing to show.
     */
    const scoredPct = Number(tick.scorePct) || 0;
    if (deps.emit && (tick.match || scoredPct > 0)) {
        deps.emit('fr-crop-tick', cropTickPayload(tick), camId);
    }

    if (matched.match) {
        const hit = emitHit(camId, matched, tick);
        if (hit) return { camId, hit, bestFrame: true };
    }
    return { camId, faces: tick.faces, match: tick.match, scorePct: tick.scorePct, bestFrame: true };
}

async function tick() {
    if (busy || !deps) return;
    if (deps.isFrLicensed && !deps.isFrLicensed()) return;
    const cams = collectProbeCams();
    const activeCamIds = new Set(cams.map((c) => c.camId));
    pruneTrackBuffers(activeCamIds);
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
    trackBufferByCam.clear();
    lastHitAt.clear();
    lastHitScoreByKey.clear();
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
    setMatchThresholdForActiveWatches,
    clearWatch,
    cropAbsolutePath,
    POLL_SEC,
    LIVE_SLOTS,
    MATCH_MIN,
    BEST_FRAME_GRABS,
    HANDOFF_BEST_FRAME_GRABS,
    BEST_FRAME_GAP_MS,
    ROLLING_RAIL,
    RAIL_SCORED_ONLY,
    BATCH_PROBE,
    TRACK_BUFFER_MS,
    TRACK_BUFFER_MAX,
};
