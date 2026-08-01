/**
 * ANPR-LIVE — async producer/consumer + deferred single-shot OCR.
 * Producer grabs stills into DropOldestQueue (maxsize=1) per cam.
 * Consumer: track-only YOLO; WPOD+OCR once on sharpest macro when track exits.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const frLiveProbe = require('./frLiveProbe');
const anprPlateRead = require('./anprPlateRead');
const anprPlateList = require('./anprPlateList');
const anprTrackBestFrame = require('./anprTrackBestFrame');
const anprCaptureHistory = require('./anprCaptureHistory');
const anprSpatialFusion = require('./anprSpatialFusion');
const analyticsCaptureStore = require('./analyticsCaptureStore');
const siteDb = require('./siteDb');

const POLL_SEC = Math.max(1, Math.min(15, parseInt(process.env.FM_ANPR_POLL_SEC || '1', 10) || 1));
const MAX_CAMS = Math.max(1, Math.min(6, parseInt(process.env.FM_ANPR_LIVE_MAX_CAMS || '4', 10) || 4));
const HIT_DEDUPE_MS = Math.max(10000, Math.min(120000, parseInt(process.env.FM_ANPR_HIT_DEDUPE_MS || '45000', 10) || 45000));
/** Grab cadence (producer) — independent of AI latency. */
const GRAB_MS = Math.max(400, Math.min(5000, parseInt(process.env.FM_ANPR_GRAB_MS || String(POLL_SEC * 1000), 10) || (POLL_SEC * 1000)));

let deps = null;
let grabTimer = null;
let harvestTimer = null;
let grabBusy = false;
let aiBusy = false;
let harvestBusy = false;
/** @type {Map<string, { camIds: string[], at: number }>} */
const watchBySocket = new Map();
/** @type {Map<string, number>} */
const lastHitAt = new Map();
/** Latest grabbed JPEG per cam — DropOldestQueue maxsize=1 (Python-equivalent). */
/** @type {Map<string, DropOldestQueue>} */
const frameQueuesByCam = new Map();

class DropOldestQueue {
    constructor() {
        this._item = null;
        this._at = 0;
    }
    /** If full, drop oldest then put newest (queue.Queue maxsize=1). */
    putLatest(jpeg) {
        /* Drop oldest immediately when slot occupied */
        this._item = jpeg;
        this._at = Date.now();
    }
    /** Non-blocking take — returns null if empty. */
    getNowait() {
        if (!this._item) return null;
        const jpeg = this._item;
        const at = this._at;
        this._item = null;
        this._at = 0;
        return { jpeg, at };
    }
    peekAt() {
        return this._item ? this._at : 0;
    }
    get size() {
        return this._item ? 1 : 0;
    }
}

function queueForCam(camId) {
    const id = String(camId || '');
    let q = frameQueuesByCam.get(id);
    if (!q) {
        q = new DropOldestQueue();
        frameQueuesByCam.set(id, q);
    }
    return q;
}

/** Avoid re-emitting same plate+cam immediately after a track flush. */
/** @type {Map<string, number>} */
const lastPlateEmitAt = new Map();
let cropsDir = null;
let seqCounter = 0;

function init(options) {
    deps = options || {};
    const storageDir = deps.storageDir || path.join(__dirname, '..', 'storage');
    try { analyticsCaptureStore.init(storageDir); } catch (_) { /* ignore */ }
    cropsDir = path.join(storageDir, 'anpr-live-crops');
    try { fs.mkdirSync(cropsDir, { recursive: true }); } catch (_) { /* ignore */ }
    try {
        anprTrackBestFrame.setMacrosDir(path.join(storageDir, 'anpr-track-macros'));
    } catch (_) { /* ignore */ }
}

function auditMetaForCam(camId, at) {
    const label = deviceLabel(camId) || camId || 'bwc';
    let username = 'system';
    try {
        if (deps && typeof deps.getAuditUsername === 'function') {
            username = deps.getAuditUsername() || 'system';
        }
    } catch (_) { /* ignore */ }
    return {
        username: String(username),
        userId: String(username),
        bwcName: label,
        camId: String(camId || ''),
        deviceLabel: label,
        at: at || new Date().toISOString(),
    };
}

function saveCropBuffer(camId, jpegBuf, kind) {
    if (!Buffer.isBuffer(jpegBuf) || jpegBuf.length < 80) return null;
    const k = kind === 'macro' ? 'macro' : 'micro';
    const meta = auditMetaForCam(camId);
    const saved = analyticsCaptureStore.saveJpeg('anpr', k, jpegBuf, meta);
    if (saved) {
        /* Legacy flat copy so old crop URLs / tools still resolve */
        try {
            const flatName = path.basename(saved.file);
            fs.writeFileSync(path.join(cropsDir, flatName), jpegBuf);
        } catch (_) { /* ignore */ }
        return {
            file: saved.rel,
            cropUrl: saved.url,
            rel: saved.rel,
            abs: saved.abs,
            kind: k,
            username: saved.username,
            bwcName: saved.bwcName,
        };
    }
    /* Fallback flat-only */
    const safeCam = String(camId || 'cam').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
    const name = 'anpr_' + safeCam + '_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex') + '.jpg';
    const abs = path.join(cropsDir, name);
    try {
        fs.writeFileSync(abs, jpegBuf);
        return { file: name, cropUrl: '/api/analytics/anpr/crop/' + encodeURIComponent(name) };
    } catch (_) {
        return null;
    }
}

function saveCropFromB64(camId, b64, kind) {
    if (!b64 || typeof b64 !== 'string') return null;
    let buf;
    try {
        buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    } catch (_) {
        return null;
    }
    return saveCropBuffer(camId, buf, kind);
}

function cropAbsolutePath(file) {
    const raw = String(file || '');
    if (!raw || raw.indexOf('..') >= 0) return null;
    /* Hierarchical audit path */
    if (raw.indexOf('/') >= 0 || raw.indexOf('%2F') >= 0 || raw.indexOf('%2f') >= 0) {
        let rel = raw;
        try { rel = decodeURIComponent(raw); } catch (_) { /* keep */ }
        const abs = analyticsCaptureStore.resolveRel(rel.indexOf('anpr/') === 0 ? rel : ('anpr/' + rel.replace(/^\/+/, '')));
        if (abs) return abs;
        const abs2 = analyticsCaptureStore.resolveRel(rel);
        if (abs2) return abs2;
    }
    const base = path.basename(raw);
    if (!base || base !== raw.replace(/\\/g, '/').split('/').pop()) {
        /* allow basename of hierarchical file for flat fallback */
    }
    if (!/^anpr_[a-zA-Z0-9._-]+\.jpg$/i.test(base) && !/^macro_\d+_[a-f0-9]+\.jpg$/i.test(base)
        && !/^micro_\d+_[a-f0-9]+\.jpg$/i.test(base)) {
        if (!/^anpr_[a-zA-Z0-9._-]+\.jpg$/i.test(base)) return null;
    }
    const absFlat = path.join(cropsDir || '', base);
    try {
        if (fs.existsSync(absFlat)) return absFlat;
    } catch (_) { /* ignore */ }
    return null;
}

function isAnprLicensed() {
    if (deps && typeof deps.isAnprLicensed === 'function') {
        try { return !!deps.isAnprLicensed(); } catch (_) { return false; }
    }
    return false;
}

function isCamLive(camId) {
    const id = String(camId || '').trim();
    if (!id) return false;
    const pool = deps && deps.liveStreamPool;
    if (pool && pool.isStreamingForCam && pool.isStreamingForCam(id)) return true;
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

function setWatchSlots(socketId, camIds) {
    const sid = String(socketId || '');
    if (!sid) return;
    const cleaned = [];
    const seen = Object.create(null);
    (Array.isArray(camIds) ? camIds : []).forEach((c) => {
        const id = String(c || '').trim();
        if (!id || seen[id]) return;
        seen[id] = true;
        cleaned.push(id);
    });
    if (!cleaned.length) {
        watchBySocket.delete(sid);
        return;
    }
    watchBySocket.set(sid, { camIds: cleaned.slice(0, MAX_CAMS), at: Date.now() });
}

function clearSocket(socketId) {
    watchBySocket.delete(String(socketId || ''));
}

function unionCamIds() {
    const seen = Object.create(null);
    const out = [];
    watchBySocket.forEach((row) => {
        (row.camIds || []).forEach((id) => {
            if (seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
    });
    return out.slice(0, MAX_CAMS);
}

function deviceLabel(camId) {
    if (deps && typeof deps.deviceLabel === 'function') {
        try { return String(deps.deviceLabel(camId) || camId); } catch (_) { /* ignore */ }
    }
    return String(camId);
}

function gpsFields(camId) {
    if (!deps || typeof deps.getGps !== 'function') return {};
    try {
        const g = deps.getGps(camId);
        if (g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lon))) {
            const out = { lat: Number(g.lat), lon: Number(g.lon) };
            if (g.at != null) out.gpsAt = g.at;
            return out;
        }
    } catch (_) { /* ignore */ }
    return {};
}

/** Cached pairing refreshed on a short TTL from Postgres. */
let _pairCache = { at: 0, parentToSec: new Map(), secToParent: new Map() };
async function refreshPairingCache() {
    try {
        if (!siteDb.isReady()) return;
        const devices = await siteDb.listDevices();
        const parentToSec = new Map();
        const secToParent = new Map();
        (devices || []).forEach((d) => {
            const pid = String((d && d.deviceId) || '').trim();
            const sec = String((d && d.pairedSecondaryCameraId) || '').trim();
            if (!pid || !sec || pid === sec) return;
            if (secToParent.has(sec)) return;
            parentToSec.set(pid, sec);
            secToParent.set(sec, pid);
        });
        _pairCache = { at: Date.now(), parentToSec, secToParent };
    } catch (_) { /* ignore */ }
}

function getPairingMapsSync() {
    if (deps && typeof deps.getPairingMaps === 'function') {
        try {
            const m = deps.getPairingMaps();
            if (m && m.parentToSec instanceof Map) return m;
        } catch (_) { /* ignore */ }
    }
    if (Date.now() - (_pairCache.at || 0) > 15000) {
        refreshPairingCache().catch(() => { /* ignore */ });
    }
    return { parentToSec: _pairCache.parentToSec, secToParent: _pairCache.secToParent };
}

function vehicleBboxFromResult(result) {
    const v = result && result.vehicle;
    if (!v) return null;
    const w = Number(v.w);
    const h = Number(v.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 4 || h < 4) return null;
    return {
        x: Number(v.x) || 0,
        y: Number(v.y) || 0,
        w,
        h,
        label: v.label || null,
        score: v.score != null ? Number(v.score) : null,
    };
}

function publishTick(tick) {
    if (!tick) return;
    seqCounter += 1;
    tick.seq = seqCounter;
    tick.motion = tick.motion || 'Stationary';
    if (deps && deps.emit) {
        deps.emit('anpr-crop-tick', tick, tick.camId);
    }
    try {
        anprCaptureHistory.record(tick).catch(() => { /* ignore */ });
    } catch (_) { /* ignore */ }

    const listMatch = tick.listMatch;
    if (tick.unclear) return;
    if (listMatch && listMatch.id) {
        const now = Date.now();
        const dedupeKey = tick.camId + '|' + String(listMatch.id);
        const prev = lastHitAt.get(dedupeKey) || 0;
        if (now - prev >= HIT_DEDUPE_MS) {
            lastHitAt.set(dedupeKey, now);
            const hitId = 'anprhit_' + crypto.randomBytes(6).toString('hex');
            const hit = {
                hitId,
                camId: tick.camId,
                deviceLabel: tick.deviceLabel,
                at: tick.at,
                plate: tick.plate,
                plateCompact: tick.plateCompact,
                confidence: tick.confidence,
                vehicleUrl: tick.vehicleUrl,
                cropUrl: tick.cropUrl,
                listId: listMatch.id,
                listStatus: listMatch.listStatus || 'suspicious',
                displayName: listMatch.displayName || listMatch.plate || tick.plate,
                reasonCode: listMatch.reasonCode || '',
                source: 'live',
                isLive: true,
                kind: 'anpr',
                trackId: tick.trackId,
                seq: tick.seq,
                motion: tick.motion,
            };
            Object.assign(hit, gpsFields(tick.camId));
            if (deps && deps.emit) deps.emit('anpr-list-hit', hit, tick.camId);
            if (deps && typeof deps.onHit === 'function') {
                try { deps.onHit(hit); } catch (_) { /* ignore */ }
            }
        }
    }
}

function emitHarvested() {
    /* Fire-and-forget async harvest (deferred OCR) — do not block consumer loop */
    emitHarvestedAsync().catch(() => { /* ignore */ });
}

async function buildTickFromMacroJob(job, result) {
    const camId = job.camId;
    const savedPlate = result && result.cropJpegB64
        ? saveCropFromB64(camId, result.cropJpegB64, 'micro')
        : null;
    let savedVehicle = result && result.vehicleJpegB64
        ? saveCropFromB64(camId, result.vehicleJpegB64, 'macro')
        : null;
    /* Prefer the tracked keyframe as vehicle scene if OCR returned none */
    if (!savedVehicle && job.macroPath) {
        try {
            const buf = fs.readFileSync(job.macroPath);
            savedVehicle = saveCropBuffer(camId, buf, 'macro');
        } catch (_) { /* ignore */ }
    }

    const plate = result && result.ok
        ? (result.plate || result.plateCompact || null)
        : null;

    let listMatch = null;
    if (plate) {
        try {
            const probed = anprPlateList.matchProbe(result.plateCompact || result.plate);
            if (probed && probed.match) listMatch = probed.match;
        } catch (_) { /* ignore */ }
    }

    const ocrFailed = !plate;
    const conf = result && result.confidence != null ? Number(result.confidence) : null;
    const candidate = {
        camId,
        deviceLabel: job.deviceLabel || deviceLabel(camId),
        at: job.at || new Date().toISOString(),
        plate: plate || null,
        plateCompact: plate
            ? (result.plateCompact || anprPlateList.compactPlate(plate))
            : null,
        confidence: conf,
        lowConfidence: !!(result && result.lowConfidence),
        engine: (result && result.engine) || null,
        vehicleUrl: savedVehicle ? savedVehicle.cropUrl : null,
        cropUrl: savedPlate ? savedPlate.cropUrl : null,
        macroPath: savedVehicle ? (savedVehicle.rel || savedVehicle.file) : null,
        microPath: savedPlate ? (savedPlate.rel || savedPlate.file) : null,
        userId: (savedVehicle && savedVehicle.username)
            || (savedPlate && savedPlate.username)
            || 'system',
        bwcId: String(camId || ''),
        hasVehicle: !!savedVehicle,
        hasCrop: !!savedPlate,
        vehicleLabel: job.vehicleLabel || (result && result.vehicle && result.vehicle.label) || null,
        mmr: null,
        make: null,
        model: null,
        color: null,
        mmrText: null,
        mmrMismatch: false,
        mmrMismatchDetail: null,
        listMatch: listMatch || null,
        source: 'live',
        ocrError: plate ? null : ((result && result.error) || 'plate_not_found'),
        frameUuid: job.frameUuid || (result && result.frameUuid) || null,
        unclear: ocrFailed || !!(result && (result.unclear || result.error === 'ambiguous_read' || result.error === 'ocr_exception')),
        reviewStatus: ocrFailed
            ? ((result && result.reviewStatus) || 'Unclear / Manual Review')
            : null,
        trackId: job.trackId,
        motion: job.motion || 'Stationary',
        sharpness: job.sharpness || (result && result.sharpness) || 0,
        bboxArea: job.bboxArea,
        trackQuality: job.trackQuality,
        deferredSingleShot: true,
        maxWidth: job.maxWidth,
    };
    Object.assign(candidate, gpsFields(camId));

    const mmr = (result && result.mmr)
        || (result && result.vehicle && (result.vehicle.make || result.vehicle.color)
            ? {
                make: result.vehicle.make,
                model: result.vehicle.model,
                color: result.vehicle.color,
                mmrText: result.vehicle.mmrText,
            }
            : null);
    if (mmr) {
        candidate.mmr = mmr;
        candidate.make = mmr.make || null;
        candidate.model = mmr.model || null;
        candidate.color = mmr.color || null;
        candidate.mmrText = mmr.mmrText || [mmr.color, mmr.make, mmr.model].filter(Boolean).join(' - ');
        if (listMatch) {
            try {
                const mm = anprPlateList.mmrMismatch(listMatch, mmr);
                if (mm && mm.mismatch) {
                    candidate.mmrMismatch = true;
                    candidate.mmrMismatchDetail = mm.detail || '';
                }
            } catch (_) { /* ignore */ }
        }
    }
    return candidate;
}

async function emitHarvestedAsync() {
    if (harvestBusy) return;
    harvestBusy = true;
    try {
        const harvested = anprTrackBestFrame.harvestEmits();
        const maps = getPairingMapsSync();
        for (let i = 0; i < harvested.length; i++) {
            const job = harvested[i];
            if (!job) continue;
            if (job.discard) {
                try {
                    if (job.macroPath) fs.unlinkSync(job.macroPath);
                } catch (_) { /* ignore */ }
                if (deps && deps.log) {
                    try {
                        deps.log.media.info('anpr track discard', {
                            camId: job.camId,
                            trackId: job.trackId,
                            reason: job.reason,
                            maxWidth: job.maxWidth,
                            minMacroW: job.minMacroW,
                        });
                    } catch (_) { /* ignore */ }
                }
                continue;
            }

            let result = null;
            try {
                result = await anprPlateRead.readMacroPath(job.macroPath, {});
            } catch (err) {
                if (deps && deps.log) {
                    try {
                        deps.log.media.info('anpr deferred read fail', {
                            camId: job.camId,
                            trackId: job.trackId,
                            err: String(err && err.message || err).slice(0, 120),
                        });
                    } catch (_) { /* ignore */ }
                }
                /* Still publish Unclear so operator can use vehicle magnifier */
                result = {
                    ok: false,
                    unclear: true,
                    reviewStatus: 'Unclear / Manual Review',
                    error: 'ocr_exception',
                    message: String(err && err.message || err).slice(0, 160),
                };
            }
            try { fs.unlinkSync(job.macroPath); } catch (_) { /* ignore */ }

            let tick = await buildTickFromMacroJob(job, result);
            if (!tick) continue;
            /* Always allow Unclear cards through (vehicle scene for magnifier) */
            if (!tick.vehicleUrl && !tick.plate && !tick.unclear) continue;

            const camId = String(tick.camId || '');
            const parentOfRear = maps.secToParent.get(camId);
            const hasSecondary = maps.parentToSec.has(camId);

            if (parentOfRear) {
                const fused = anprSpatialFusion.tryFuseRear(tick, parentOfRear, camId);
                if (fused) tick = fused;
            } else if (hasSecondary) {
                const held = anprSpatialFusion.holdFrontPending(tick, camId);
                if (held && !tick.plateCompact) {
                    continue;
                }
            }

            if (tick.plateCompact) {
                const pk = String(tick.camId) + '|' + String(tick.plateCompact);
                const prev = lastPlateEmitAt.get(pk) || 0;
                if (Date.now() - prev < 8000) continue;
                lastPlateEmitAt.set(pk, Date.now());
            }
            publishTick(tick);
        }

        try {
            const expired = anprSpatialFusion.flushExpiredPendings();
            for (let j = 0; j < expired.length; j++) {
                if (expired[j]) publishTick(expired[j]);
            }
        } catch (_) { /* ignore */ }
    } finally {
        harvestBusy = false;
    }
}

/** Producer: grab stills only — never awaits OCR / YOLO. */
async function grabCam(camId) {
    if (!isCamLive(camId)) return;
    const videoWsPort = deps && deps.videoWsPort;
    let jpeg;
    try {
        jpeg = await frLiveProbe.grabJpegForFr(camId, videoWsPort);
    } catch (err) {
        if (deps && deps.log) {
            try {
                deps.log.media.info('anpr live grab skip', {
                    camId,
                    err: String(err && err.message || err).slice(0, 120),
                });
            } catch (_) { /* ignore */ }
        }
        return;
    }
    if (!Buffer.isBuffer(jpeg) || jpeg.length < 200) return;
    enqueueLatestFrame(camId, jpeg);
}

/**
 * Drop-oldest / maxsize=1 — if full, dump oldest then put newest
 * (Python: queue.Queue(maxsize=1) + get_nowait before put).
 */
function enqueueLatestFrame(camId, jpeg) {
    const id = String(camId || '');
    if (!id || !Buffer.isBuffer(jpeg)) return;
    queueForCam(id).putLatest(jpeg);
}

async function producerTick() {
    if (grabBusy) return;
    if (!isAnprLicensed()) return;
    const cams = unionCamIds();
    if (!cams.length) return;
    grabBusy = true;
    try {
        await Promise.all(cams.map((id) => grabCam(id).catch(() => { /* next */ })));
    } finally {
        grabBusy = false;
    }
    setImmediate(() => { consumerTick().catch(() => { /* ignore */ }); });
}

/** Consumer: Stage-1 on newest frames only — cams in parallel; never a backlog. */
async function consumerTick() {
    if (aiBusy) return;
    if (!isAnprLicensed()) return;
    aiBusy = true;
    try {
        let guard = 0;
        while (guard < 16) {
            guard += 1;
            const jobs = [];
            frameQueuesByCam.forEach((q, camId) => {
                const packed = q.getNowait();
                if (!packed || !packed.jpeg) return;
                jobs.push(
                    inferFrame(camId, packed.jpeg, packed.at).catch(() => { /* next */ })
                );
            });
            if (!jobs.length) break;
            await Promise.all(jobs);
            emitHarvested();
            let pending = 0;
            frameQueuesByCam.forEach((q) => { pending += q.size; });
            if (!pending) break;
        }
    } finally {
        aiBusy = false;
        let pending = 0;
        frameQueuesByCam.forEach((q) => { pending += q.size; });
        if (pending > 0) {
            setImmediate(() => { consumerTick().catch(() => { /* ignore */ }); });
        }
    }
}

async function inferFrame(camId, jpeg, grabbedAt) {
    const startedAt = grabbedAt || Date.now();
    const tmpPath = path.join(
        cropsDir || os.tmpdir(),
        'anpr_live_tmp_' + String(camId).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '_' + process.pid + '.jpg'
    );
    try {
        fs.writeFileSync(tmpPath, jpeg);
    } catch (_) {
        return;
    }

    let result;
    try {
        result = await anprPlateRead.trackPath(tmpPath);
    } catch (err) {
        if (deps && deps.log) {
            try {
                deps.log.media.info('anpr live track fail', {
                    camId,
                    err: String(err && err.message || err).slice(0, 120),
                });
            } catch (_) { /* ignore */ }
        }
        try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
        return;
    }
    try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }

    const q = frameQueuesByCam.get(String(camId));
    if (q && q.peekAt() > startedAt) {
        return;
    }

    if (!result || !result.ok || !result.hasDetection) return;

    const bbox = vehicleBboxFromResult(result);
    if (!bbox) return;
    if (!result.vehicleJpegB64) return;

    const sharpness = result.sharpness != null
        ? Number(result.sharpness)
        : (result.vehicle && result.vehicle.sharpness != null
            ? Number(result.vehicle.sharpness)
            : 0);

    anprTrackBestFrame.observe(camId, bbox, {
        sharpness,
        vehicleJpegB64: result.vehicleJpegB64,
        vehicleLabel: result.vehicle && result.vehicle.label
            ? String(result.vehicle.label)
            : null,
        frameUuid: result.frameUuid || null,
        deviceLabel: deviceLabel(camId),
        at: new Date().toISOString(),
    });
}

function start() {
    if (grabTimer) return;
    refreshPairingCache().catch(() => { /* ignore */ });
    grabTimer = setInterval(() => {
        producerTick().catch(() => { /* ignore */ });
    }, GRAB_MS);
    harvestTimer = setInterval(() => {
        try { emitHarvested(); } catch (_) { /* ignore */ }
    }, 500);
}

function stop() {
    if (grabTimer) {
        clearInterval(grabTimer);
        grabTimer = null;
    }
    if (harvestTimer) {
        clearInterval(harvestTimer);
        harvestTimer = null;
    }
    frameQueuesByCam.clear();
    anprTrackBestFrame.reset();
    try { anprSpatialFusion.reset(); } catch (_) { /* ignore */ }
}

module.exports = {
    init,
    start,
    stop,
    setWatchSlots,
    clearSocket,
    cropAbsolutePath,
    POLL_SEC,
    MAX_CAMS,
    GRAB_MS,
};
