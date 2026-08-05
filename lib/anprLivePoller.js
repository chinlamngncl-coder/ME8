/**
 * ANPR-LIVE — async producer/consumer + dual-engine temporal OCR.
 * Producer samples 3–5 FPS into DropOldestQueue (maxsize=1) per cam.
 * Consumer: track-only YOLO; dual FastALPR+PP-OCRv4 on top-3 macros at track exit.
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
/**
 * ANPR live grab cadence — ~3 FPS (333ms) to balance load vs fast cars.
 * Hatch: FM_ANPR_GRAB_MS (150–2000). Busy path uses same floor unless overridden.
 */
const _grabRaw = parseInt(process.env.FM_ANPR_GRAB_MS || '333', 10) || 333;
const GRAB_MS = Math.max(150, Math.min(2000, _grabRaw));
const _grabBusyRaw = parseInt(process.env.FM_ANPR_GRAB_MS_BUSY || String(GRAB_MS), 10) || GRAB_MS;
const GRAB_MS_BUSY = Math.max(150, Math.min(2000, _grabBusyRaw));
/** Drop still if ffmpeg grab wall time exceeds this (ms). */
const GRAB_BUDGET_MS = Math.max(400, Math.min(8000,
    parseInt(process.env.FM_ANPR_GRAB_BUDGET_MS || '900', 10) || 900));
/** Drop queued/grabbed frames older than this — LIFO newest only. */
const STALE_FRAME_MS = 1500;
/**
 * Soft OCR / force-flush: strip plate string if micro/job sharpness below this
 * (publish one Unclear instead of 11WM4 mush).
 */
const SHARP_EMIT_FM = Math.max(5, Math.min(200,
    parseFloat(process.env.FM_ANPR_SHARP_EMIT_FM || '35') || 35));
/** After a track emits once, block re-emits for this Track ID (stop UI spam). */
const TRACK_EMIT_BLOCK_MS = Math.max(1000, Math.min(15000,
    parseInt(process.env.FM_ANPR_TRACK_EMIT_BLOCK_MS || '5000', 10) || 5000));
/** Dwell update cadence — refresh existing rail card, do not spam new cards. */
const DWELL_UPDATE_MS = Math.max(2000, Math.min(30000,
    parseInt(process.env.FM_ANPR_DWELL_UPDATE_MS || String(TRACK_EMIT_BLOCK_MS), 10) || TRACK_EMIT_BLOCK_MS));
/**
 * Force-flush OCR: how many top macros to OCR (quality-sorted). Default 1 for <1s path.
 * Hatch: FM_ANPR_FLUSH_MACROS=3 restores multi-macro temporal OCR.
 */
const FLUSH_MACROS = Math.max(1, Math.min(5, parseInt(process.env.FM_ANPR_FLUSH_MACROS || '1', 10) || 1));
/** Emit best plate on force-flush even if strict temporal N not met (soft lock / force). */
const FORCE_FLUSH_EMIT = String(process.env.FM_ANPR_FORCE_FLUSH_EMIT || '1').trim() !== '0';

let deps = null;
let grabTimer = null;
let harvestTimer = null;
let grabBusy = false;
/** Skip overlapping producer ticks — prevents Uvicorn request DDoS. */
let isGrabbing = false;
let aiBusy = false;
let harvestBusy = false;
/** Last producer grab start — stretch interval when AI busy. */
let lastProducerAt = 0;
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
    /** Non-blocking take — returns null if empty or stale (> STALE_FRAME_MS). */
    getNowait() {
        if (!this._item) return null;
        const jpeg = this._item;
        const at = this._at;
        this._item = null;
        this._at = 0;
        if (Date.now() - at > STALE_FRAME_MS) {
            return null; /* drop stale — LIFO newest only */
        }
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
/**
 * Dwell Time Tracker — plateText → { firstSeen, lastEmit }.
 * Repeating plates update dwell on the rail instead of new cards.
 * @type {Map<string, { firstSeen: number, lastEmit: number }>}
 */
const recentPlatesCache = new Map();
/** 60 seconds of no sightings = car has left — start a fresh dwell card on return. */
const DWELL_TIMEOUT_MS = 60000;
setInterval(() => {
    const now = Date.now();
    for (const [plateKey, record] of recentPlatesCache.entries()) {
        if (now - record.lastEmit > DWELL_TIMEOUT_MS) {
            recentPlatesCache.delete(plateKey);
        }
    }
}, 30000); // Run sweep every 30 seconds
/** Track-ID debounce — emit once then block TRACK_EMIT_BLOCK_MS. */
/** @type {Map<string, number>} */
const trackEmitBlockUntil = new Map();
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

function passesStrictEmitGatekeeper(sidecarResponse, rawPlateText) {
    // =====================================================================
    // STRICT CONFIDENCE & FORMAT GATEKEEPER - DO NOT OVERWRITE OR DELETE
    // =====================================================================
    const sr = sidecarResponse || {};
    // 1. Confidence Check (Requires 80% or higher)
    if (sr.confidence !== undefined && sr.confidence !== null && sr.confidence !== '') {
        const conf = Number(sr.confidence);
        if (Number.isFinite(conf)) {
            const minConfidence = conf <= 1.0 ? 0.80 : 80;
            if (conf < minConfidence) {
                // AI is guessing. Silently skip frame. Do not kill track.
                return false;
            }
        }
    }

    // =====================================================================
    // FLEXIBLE FORMAT GATEKEEPER - DO NOT OVERWRITE
    // =====================================================================
    // Format Check: Allow 2-3 letters, optional space, 3-5 numbers.
    // Covers standard cars AND motorbikes.
    const cleanPlateText = String(rawPlateText || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const plateFormatRegex = /^[A-Z]{2,3}\s*\d{3,5}$/i;

    if (!cleanPlateText || cleanPlateText.toUpperCase() === 'UNCLEAR' || sr.status === 'blurry') {
        // Skip blurry/unclear frames
        return false;
    }

    if (!plateFormatRegex.test(cleanPlateText)) {
        // Fails flexible format (likely a hallucination). Silently skip.
        return false;
    }
    // =====================================================================
    return true;
}

function publishTick(tick) {
    if (!tick) return;
    const sidecarResponse = tick._sidecar || tick;
    const rawPlateText = tick.plateCompact || tick.plate || tick.plateText || '';
    if (!passesStrictEmitGatekeeper(sidecarResponse, rawPlateText)) {
        return;
    }

    seqCounter += 1;
    tick.seq = seqCounter;
    tick.motion = tick.motion || 'Stationary';
    /* Frontend contract aliases (keep legacy keys) */
    const captureId = tick.id
        || tick.hitId
        || tick.frameUuid
        || ('anpr_' + String(tick.camId || 'cam')
            + '_' + String(tick.trackId != null ? tick.trackId : seqCounter));
    tick.id = captureId;
    tick.plateText = tick.plateText || tick.plate || tick.plateCompact || null;
    tick.macroCropUrl = tick.macroCropUrl || tick.vehicleUrl || null;
    tick.microCropUrl = tick.microCropUrl || tick.cropUrl || null;
    tick.bwcUser = tick.bwcUser || tick.deviceLabel || null;
    tick.source = tick.source || 'live';
    if (tick.dwellSeconds == null) tick.dwellSeconds = 0;
    if (tick.isUpdate == null) tick.isUpdate = false;
    if (deps && deps.emit) {
        try {
            console.log('[ANPR-TRACE] WS emit anpr-crop-tick', {
                camId: tick.camId,
                deviceLabel: tick.deviceLabel || null,
                plate: tick.plateCompact || tick.plate || tick.plateText || null,
                unclear: !!tick.unclear,
                dwellSeconds: tick.dwellSeconds || 0,
                hasCrop: !!(tick.macroCropUrl || tick.vehicleUrl || tick.microCropUrl || tick.cropUrl),
            });
        } catch (_) { /* ignore */ }
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
                id: hitId,
                camId: tick.camId,
                deviceLabel: tick.deviceLabel,
                bwcUser: tick.deviceLabel || tick.bwcUser,
                at: tick.at,
                plate: tick.plate,
                plateText: tick.plate || tick.plateCompact,
                plateCompact: tick.plateCompact,
                confidence: tick.confidence,
                vehicleUrl: tick.vehicleUrl,
                cropUrl: tick.cropUrl,
                macroCropUrl: tick.vehicleUrl || tick.macroCropUrl,
                microCropUrl: tick.cropUrl || tick.microCropUrl,
                listId: listMatch.id,
                listStatus: listMatch.listStatus || 'suspicious',
                displayName: listMatch.displayName || listMatch.plate || tick.plate,
                reasonCode: listMatch.reasonCode || '',
                source: 'live',
                isLive: true,
                isWatchlistHit: true,
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

function plateFromDualResult(result) {
    if (!result || typeof result !== 'object') return null;
    /* Prefer top-level OCR fields from /read-macro (dual_lpr + pipeline) */
    const nestedVehicle = result.vehicle && typeof result.vehicle === 'object'
        ? (result.vehicle.plate && typeof result.vehicle.plate === 'object'
            ? (result.vehicle.plate.text || result.vehicle.plate.plate || null)
            : (result.vehicle.plate || result.vehicle.plateText || null))
        : null;
    const dual = result.dual && typeof result.dual === 'object' ? result.dual : null;
    const cons = dual && dual.consensus && typeof dual.consensus === 'object' ? dual.consensus : null;
    const engA = dual && dual.engineA && typeof dual.engineA === 'object' ? dual.engineA : null;
    const engB = dual && dual.engineB && typeof dual.engineB === 'object' ? dual.engineB : null;
    const temporal = dual && dual.temporal && typeof dual.temporal === 'object' ? dual.temporal : null;
    /* Never prefer rawText over regex-locked plate — restores LTO syntax gate */
    const candidates = [
        result.plate,
        result.plateCompact,
        temporal && temporal.lockedPlate,
        cons && cons.plate,
        engA && engA.plate,
        engB && engB.plate,
        result.regexOk === false ? null : result.plateText,
        nestedVehicle,
    ];
    for (let i = 0; i < candidates.length; i++) {
        const locked = passesLtoPlateSyntax(candidates[i]);
        if (locked) return locked;
    }
    return null;
}

/** Flexible plate syntax — 2–3 letters + 3–5 digits (cars + motorbikes). */
function passesLtoPlateSyntax(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().toUpperCase();
    if (!s || s === 'UNCLEAR') return null;
    const compact = s.replace(/[\s\-_.]/g, '');
    const m = compact.match(/^([A-Z]{2,3})(\d{3,5})$/);
    if (!m) return null;
    return m[1] + ' ' + m[2];
}

function compactPlateText(plate) {
    if (!plate) return null;
    try {
        if (anprPlateList && typeof anprPlateList.compactPlate === 'function') {
            const c = anprPlateList.compactPlate(plate);
            if (c) return String(c);
        }
    } catch (_) { /* ignore */ }
    return String(plate).replace(/[\s\-_.]/g, '').toUpperCase();
}

function isDualLocked(result) {
    if (!result) return false;
    if (result.temporalLocked) return true;
    if (result.dual && result.dual.temporalLocked) return true;
    if (result.dual && result.dual.consensus && result.dual.consensus.consensusMode === 'match') {
        return true;
    }
    if (result.ok && plateFromDualResult(result)) return true;
    return false;
}

/** Strict track lock — temporal consensus only (emit-once gate). */
function isTemporalLockedStrict(result) {
    if (!result) return false;
    if (result.temporalLocked === true) return true;
    if (result.dual && result.dual.temporalLocked === true) return true;
    const t = result.dual && result.dual.temporal;
    if (t && t.temporalLocked === true) return true;
    return false;
}

function trackEmitKey(tick) {
    const cam = String((tick && tick.camId) || '');
    if (tick && tick.trackId != null) return cam + '|t' + String(tick.trackId);
    if (tick && tick.plateCompact) return cam + '|p' + String(tick.plateCompact);
    return cam + '|anon';
}

function plateDwellKey(tick) {
    const raw = (tick && (tick.plateCompact || tick.plateText || tick.plate)) || '';
    const p = String(raw).replace(/[\s\-_.]/g, '').toUpperCase();
    if (!p || p === 'UNCLEAR') return null;
    return p;
}

function pruneDwellCache(now) {
    const cutoff = (now || Date.now()) - DWELL_TIMEOUT_MS;
    for (const [k, rec] of recentPlatesCache.entries()) {
        if (!rec || !rec.lastEmit || rec.lastEmit < cutoff) recentPlatesCache.delete(k);
    }
}

/**
 * Dwell Time Tracker gate:
 *  - First sighting → allow new anpr-crop-tick (dwellSeconds: 0)
 *  - Dwelling plate → emit anpr-crop-update every DWELL_UPDATE_MS; abort new card
 * @returns {'new'|'dwell'}
 */
function gateDwellEmit(tick) {
    const plateKey = plateDwellKey(tick);
    if (!plateKey) return 'new';
    const now = Date.now();
    if (recentPlatesCache.size > 200) pruneDwellCache(now);
    const record = recentPlatesCache.get(plateKey);
    const plateText = tick.plateText || tick.plate || tick.plateCompact || plateKey;
    if (record) {
        /* Plate is dwelling — throttle WS/render; never spam a new rail card */
        if (now - record.lastEmit > DWELL_UPDATE_MS) {
            record.lastEmit = now;
            const dwellSeconds = Math.floor((now - record.firstSeen) / 1000);
            if (deps && deps.emit) {
                try {
                    deps.emit('anpr-crop-update', {
                        plateText,
                        plate: tick.plate || plateText,
                        plateCompact: tick.plateCompact || plateKey,
                        dwellSeconds,
                        isUpdate: true,
                        camId: tick.camId || null,
                        deviceLabel: tick.deviceLabel || tick.bwcUser || null,
                        bwcUser: tick.bwcUser || tick.deviceLabel || null,
                        at: tick.at || new Date().toISOString(),
                        id: tick.id || null,
                        trackId: tick.trackId != null ? tick.trackId : null,
                        macroCropUrl: tick.macroCropUrl || tick.vehicleUrl || null,
                        microCropUrl: tick.microCropUrl || tick.cropUrl || null,
                        vehicleUrl: tick.vehicleUrl || tick.macroCropUrl || null,
                        cropUrl: tick.cropUrl || tick.microCropUrl || null,
                        source: 'live',
                        isLive: true,
                    }, tick.camId);
                } catch (_) { /* ignore */ }
            }
        }
        return 'dwell';
    }
    /* First time seeing plate — save + allow standard new card emit */
    recentPlatesCache.set(plateKey, { firstSeen: now, lastEmit: now });
    tick.dwellSeconds = 0;
    tick.isUpdate = false;
    return 'new';
}

function allowTrackEmit(tick) {
    const key = trackEmitKey(tick);
    const now = Date.now();
    const until = trackEmitBlockUntil.get(key) || 0;
    if (now < until) return false;
    /* Same-cam spam: one rail card per cam for block window (SUV double-card) */
    const camKey = String((tick && tick.camId) || '') + '|cam';
    if (camKey !== '|cam') {
        const camUntil = trackEmitBlockUntil.get(camKey) || 0;
        if (now < camUntil) return false;
        trackEmitBlockUntil.set(camKey, now + TRACK_EMIT_BLOCK_MS);
    }
    trackEmitBlockUntil.set(key, now + TRACK_EMIT_BLOCK_MS);
    /* Also block same plate+cam for the block window */
    if (tick && tick.plateCompact) {
        const pk = String(tick.camId) + '|' + String(tick.plateCompact);
        trackEmitBlockUntil.set(pk, now + TRACK_EMIT_BLOCK_MS);
        lastPlateEmitAt.set(pk, now);
    }
    return true;
}

/**
 * Strip soft OCR garbage before rail — do NOT wipe a high-confidence Python plate
 * just because temporal lock is still pending (result.unclear).
 */
function applySharpEmitGate(tick, result, job) {
    if (!tick) return tick;
    const locked = isTemporalLockedStrict(result);
    if (locked) return tick;
    const plate = tick.plateCompact || tick.plate || tick.plateText;
    if (!plate) return tick;
    const fm = Number(
        (result && result.sharpness)
        || (tick && tick.sharpness)
        || (job && job.sharpness)
        || 0
    );
    let conf = result && result.confidence != null ? Number(result.confidence) : null;
    if (conf == null && result && result.conf != null) conf = Number(result.conf);
    if (Number.isFinite(conf) && conf > 0 && conf <= 1) conf = conf * 100;
    const compact = String(plate).replace(/[\s\-_.]/g, '');
    /* High-conf OCR from sidecar — keep text even if Python set unclear/temporal_pending */
    if (compact.length >= 5 && Number.isFinite(conf) && conf >= 50) {
        return tick;
    }
    const softMush = fm < SHARP_EMIT_FM
        || (Number.isFinite(conf) && conf < 50)
        || compact.length < 5
        || !!(result && result.error === 'micro_blur_reject');
    if (!softMush) return tick;
    tick.plate = null;
    tick.plateCompact = null;
    tick.plateText = null;
    tick.unclear = true;
    tick.temporalLocked = false;
    tick.ocrError = 'sharp_emit_gate';
    tick.reviewStatus = 'Unclear / Manual Review';
    tick.sharpEmitGate = { fm: Math.round(fm * 10) / 10, conf: conf, floor: SHARP_EMIT_FM };
    return tick;
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

    const plateRaw = plateFromDualResult(result);
    const plateCompact = plateRaw ? compactPlateText(plateRaw) : null;
    const plateDisplay = plateRaw
        ? (result.plate && String(result.plate).trim()) || plateRaw
        : null;
    const softLocked = isDualLocked(result);
    const lockedStrict = isTemporalLockedStrict(result);
    const forceFlushed = !!(result && result.dual && result.dual.forceFlushed)
        || !!(job && job.forceFlush && plateCompact && softLocked);
    /* Zero-latency: treat force-flush best string as emit-ready lock */
    const locked = lockedStrict || (FORCE_FLUSH_EMIT && forceFlushed && !!plateCompact)
        || (FORCE_FLUSH_EMIT && job && job.forceFlush && softLocked && !!plateCompact)
        || (FORCE_FLUSH_EMIT && job && job.forceFlush && !!plateCompact);

    let listMatch = null;
    if (plateCompact && (locked || softLocked || plateCompact)) {
        try {
            const probed = anprPlateList.matchProbe(plateCompact || plateDisplay);
            if (probed && probed.match) listMatch = probed.match;
        } catch (_) { /* ignore */ }
    }

    const ocrFailed = !plateCompact;
    let conf = result && result.confidence != null ? Number(result.confidence) : null;
    if (conf == null && result && result.conf != null) conf = Number(result.conf);
    /* Normalize 0–1 → percent for UI */
    if (Number.isFinite(conf) && conf > 0 && conf <= 1) conf = Math.round(conf * 100);

    const candidate = {
        camId,
        deviceLabel: job.deviceLabel || deviceLabel(camId),
        at: job.at || new Date().toISOString(),
        plate: plateDisplay || null,
        plateCompact: plateCompact || null,
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
        isWatchlistHit: !!(listMatch && listMatch.id),
        source: 'live',
        ocrError: plateCompact ? null : ((result && result.error) || 'plate_not_found'),
        frameUuid: job.frameUuid || (result && result.frameUuid) || null,
        /* Valid mapped OCR text → never leave unclear true for the rail */
        unclear: plateCompact
            ? false
            : (ocrFailed
                || !!(result && result.error === 'ocr_exception')),
        reviewStatus: plateCompact
            ? null
            : ((result && result.reviewStatus) || 'Unclear / Manual Review'),
        trackId: job.trackId,
        motion: job.motion || 'Stationary',
        sharpness: job.sharpness || (result && result.sharpness) || 0,
        bboxArea: job.bboxArea,
        trackQuality: job.trackQuality,
        deferredSingleShot: true,
        dualEngine: !!(result && result.dual),
        temporalLocked: locked || !!plateCompact,
        forceFlushed: !!(job && job.forceFlush) || forceFlushed,
        maxWidth: job.maxWidth,
        rawText: (result && result.rawText) || plateRaw || null,
        id: job.frameUuid || ('anpr_' + String(camId) + '_t' + String(job.trackId != null ? job.trackId : Date.now())),
        plateText: plateDisplay || plateCompact || null,
        macroCropUrl: savedVehicle ? savedVehicle.cropUrl : null,
        microCropUrl: savedPlate ? savedPlate.cropUrl : null,
        bwcUser: job.deviceLabel || deviceLabel(camId),
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
            const macroPaths = Array.isArray(job.macroPaths) && job.macroPaths.length
                ? job.macroPaths.slice()
                : (job.macroPath ? [job.macroPath] : []);
            /* Zero-latency: OCR top-N sharpest macros only (default 1). */
            const ocrPaths = macroPaths.slice(0, FLUSH_MACROS);
            const trackKey = job.trackId != null ? String(job.trackId) : null;
            try {
                /* Dual-engine: OCR flushed macros with same trackId; prefer locked */
                for (let mi = 0; mi < ocrPaths.length; mi++) {
                    const mp = ocrPaths[mi];
                    if (!mp) continue;
                    let one = null;
                    const ocrT0 = Date.now();
                    try {
                        one = await anprPlateRead.readMacroPath(mp, { trackId: trackKey });
                    } catch (err) {
                        one = {
                            ok: false,
                            unclear: true,
                            reviewStatus: 'Unclear / Manual Review',
                            error: 'ocr_exception',
                            message: String(err && err.message || err).slice(0, 160),
                        };
                    }
                    if (deps && deps.log) {
                        try {
                            deps.log.media.info('anpr read-macro ms', {
                                camId: job.camId,
                                trackId: job.trackId,
                                ms: Date.now() - ocrT0,
                                ok: !!(one && one.ok),
                                path: 'anpr-live-cpu-budget-sharp-emit-v1',
                            });
                        } catch (_) { /* ignore */ }
                    }
                    result = one;
                    if (one && (one.temporalLocked || (one.dual && one.dual.temporalLocked))) {
                        break;
                    }
                    /* Force-flush: first approved plate is enough — do not wait for N */
                    if (FORCE_FLUSH_EMIT && one && one.ok && plateFromDualResult(one)) {
                        break;
                    }
                    /* Soft blur — stop OCR loop; keep macros for retry */
                    if (one && (one.status === 'blurry' || one.error === 'micro_blur_reject')) {
                        break;
                    }
                    /* Intra-frame engines agree — good enough if only one frame */
                    if (one && one.ok && one.dual && one.dual.consensus
                        && one.dual.consensus.consensusMode === 'match'
                        && ocrPaths.length === 1) {
                        break;
                    }
                }
                if (!result) {
                    result = {
                        ok: false,
                        unclear: true,
                        reviewStatus: 'Unclear / Manual Review',
                        error: 'plate_not_found',
                    };
                }
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

            /* Soft blur skip — keep track + macros, do not clear cache, retry next poll */
            if (result && (result.status === 'blurry' || result.error === 'micro_blur_reject')) {
                try {
                    anprTrackBestFrame.releaseBlurry(job.camId, job.trackId);
                } catch (_) { /* ignore */ }
                if (deps && deps.log) {
                    try {
                        deps.log.media.info('anpr blur soft-skip', {
                            camId: job.camId,
                            trackId: job.trackId,
                            blurScore: result.blur_score || result.sharpness || null,
                            path: 'anpr-fast-flush-blur-reject-v1',
                        });
                    } catch (_) { /* ignore */ }
                }
                continue;
            }

            let tick = await buildTickFromMacroJob(job, result);
            if (!tick) {
                try {
                    anprTrackBestFrame.releaseBlurry(job.camId, job.trackId);
                } catch (_) { /* ignore */ }
                continue;
            }
            tick = applySharpEmitGate(tick, result, job);
            /* Re-assert OCR mapping after gates — only LTO-regex-valid plates */
            const mapped = plateFromDualResult(result);
            if (mapped && !(tick.plateCompact || tick.plate)) {
                tick.plate = mapped;
                tick.plateText = mapped;
                tick.plateCompact = compactPlateText(mapped);
            }
            /* Drop hallucinated / non-LTO strings that leaked past OCR */
            if (tick.plateCompact || tick.plate || tick.plateText) {
                const locked = passesLtoPlateSyntax(tick.plateCompact || tick.plate || tick.plateText);
                if (!locked) {
                    tick.plate = null;
                    tick.plateCompact = null;
                    tick.plateText = null;
                    tick.unclear = true;
                } else {
                    tick.unclear = false;
                    tick.plate = locked;
                    tick.plateText = locked;
                    tick.plateCompact = compactPlateText(locked);
                    tick.reviewStatus = null;
                    tick.ocrError = null;
                }
            }
            const hasCrop = !!(tick.vehicleUrl || tick.macroCropUrl || tick.cropUrl || tick.microCropUrl);
            const plateOk = !!(tick.plateCompact || tick.plate);
            const plateDisp = String(tick.plateText || tick.plate || tick.plateCompact || '').trim().toUpperCase();
            /* No plate yet (UNCLEAR / blank / crop-only) — keep track + macros, silent next frame */
            if (!plateOk || plateDisp === 'UNCLEAR') {
                try {
                    anprTrackBestFrame.releaseBlurry(job.camId, job.trackId);
                } catch (_) { /* ignore */ }
                continue;
            }

            /* Real plate — safe to drop temp macro files */
            macroPaths.forEach((mp) => {
                try { fs.unlinkSync(mp); } catch (_) { /* ignore */ }
            });
            try { if (job.macroPath) fs.unlinkSync(job.macroPath); } catch (_) { /* ignore */ }

            /* Normalize confidence to 0–100 for VIP / fast-flush */
            let emitConf = tick.confidence != null ? Number(tick.confidence)
                : (result && result.confidence != null ? Number(result.confidence)
                    : (result && result.conf != null ? Number(result.conf) : NaN));
            if (Number.isFinite(emitConf) && emitConf > 0 && emitConf <= 1) emitConf = emitConf * 100;
            const normalizedConf = emitConf;
            const plateLen = String(tick.plateCompact || tick.plate || '').replace(/[\s\-_.]/g, '').length;
            const alreadyFlushed = !!(job.trackId
                && anprTrackBestFrame.isFlushed(job.camId, job.trackId));

            tick._sidecar = {
                confidence: (result && result.confidence != null) ? result.confidence
                    : ((result && result.conf != null) ? result.conf : tick.confidence),
                status: (result && result.status) || tick.status || null,
            };

            /* Format + 80% floor first — then VIP can bypass consensus wait */
            if (!passesStrictEmitGatekeeper(tick._sidecar, tick.plateCompact || tick.plate || tick.plateText)) {
                try {
                    anprTrackBestFrame.releaseBlurry(job.camId, job.trackId);
                } catch (_) { /* ignore */ }
                continue;
            }

            // =====================================================================
            // FAST-TRACK VIP RULE (≥95%) — emit now; skip multi-frame consensus wait
            // =====================================================================
            if (plateOk && Number.isFinite(normalizedConf) && normalizedConf >= 95 && !alreadyFlushed) {
                try { anprTrackBestFrame.markFlushed(job.camId, job.trackId); } catch (_) { /* ignore */ }
                tick.temporalLocked = true;
                tick.fastFlush = true;
                tick.vipFastTrack = true;
                const camIdVip = String(tick.camId || '');
                const parentOfRearVip = maps.secToParent.get(camIdVip);
                const hasSecondaryVip = maps.parentToSec.has(camIdVip);
                if (parentOfRearVip) {
                    const fusedVip = anprSpatialFusion.tryFuseRear(tick, parentOfRearVip, camIdVip);
                    if (fusedVip) tick = fusedVip;
                } else if (hasSecondaryVip) {
                    const heldVip = anprSpatialFusion.holdFrontPending(tick, camIdVip);
                    if (heldVip && !tick.plateCompact) continue;
                }
                if (gateDwellEmit(tick) === 'dwell') continue;
                if (!allowTrackEmit(tick)) continue;
                if (deps && deps.log) {
                    try {
                        deps.log.media.info('anpr track emit', {
                            camId: tick.camId,
                            trackId: tick.trackId,
                            plate: tick.plateCompact || tick.plate || null,
                            confidence: normalizedConf,
                            vipFastTrack: true,
                            fastFlush: true,
                            path: 'anpr-vip-fast-track-95-v1',
                        });
                    } catch (_) { /* ignore */ }
                }
                publishTick(tick);
                continue; /* do not fall through to consensus voting path */
            }
            // =====================================================================
            // EXISTING CONSENSUS / FORCE-FLUSH PATH
            // =====================================================================

            if (alreadyFlushed && plateOk) {
                if (gateDwellEmit(tick) === 'dwell') continue;
                continue;
            }
            const highConfFast = plateOk && plateLen >= 5 && Number.isFinite(normalizedConf) && normalizedConf > 85;
            if (highConfFast) {
                try { anprTrackBestFrame.markFlushed(job.camId, job.trackId); } catch (_) { /* ignore */ }
                tick.temporalLocked = true;
                tick.fastFlush = true;
            }

            /* Emit only when we have a real plate string — never crop-only UNCLEAR */
            const canEmit = plateOk && (
                tick.temporalLocked
                || highConfFast
                || (FORCE_FLUSH_EMIT && job.forceFlush)
                || job.dwellFlush
                || job.flushReason === 'dwell'
                || job.flushReason === 'exit'
            );
            if (!canEmit) {
                try {
                    anprTrackBestFrame.releaseBlurry(job.camId, job.trackId);
                } catch (_) { /* ignore */ }
                continue;
            }

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

            if (tick.plateCompact || tick.plate || tick.plateText) {
                /* Dwell tracker: update existing card every 5s — do not prepend spam */
                if (gateDwellEmit(tick) === 'dwell') continue;
            }
            /* Track debounce: one WS new-card emit per Track ID, then block */
            if (!allowTrackEmit(tick)) continue;
            if (deps && deps.log) {
                try {
                    deps.log.media.info('anpr track emit', {
                        camId: tick.camId,
                        trackId: tick.trackId,
                        plate: tick.plateCompact || tick.plate || null,
                        plateText: tick.plate || tick.plateCompact || null,
                        temporalLocked: !!tick.temporalLocked,
                        unclear: !!tick.unclear,
                        dwellSeconds: tick.dwellSeconds || 0,
                        hasCrop: !!hasCrop,
                        engine: tick.engine || null,
                        fastFlush: !!tick.fastFlush,
                        flushReason: job.flushReason || (job.dwellFlush ? 'dwell' : 'exit'),
                        path: 'anpr-otsu-no-unclear-spam-v1',
                    });
                } catch (_) { /* ignore */ }
            }
            if (plateOk && job.trackId) {
                try { anprTrackBestFrame.markFlushed(job.camId, job.trackId); } catch (_) { /* ignore */ }
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
    const t0 = Date.now();
    try {
        jpeg = await frLiveProbe.grabJpegForFr(camId, videoWsPort);
    } catch (err) {
        if (deps && deps.log) {
            try {
                deps.log.media.info('anpr live grab skip', {
                    camId,
                    err: String(err && err.message || err).slice(0, 120),
                    ms: Date.now() - t0,
                    path: 'anpr-live-cpu-budget-sharp-emit-v1',
                });
            } catch (_) { /* ignore */ }
        }
        return;
    }
    const grabMs = Date.now() - t0;
    if (deps && deps.log) {
        try {
            deps.log.media.info('anpr live grab ms', {
                camId,
                ms: grabMs,
                budgetMs: GRAB_BUDGET_MS,
                bytes: Buffer.isBuffer(jpeg) ? jpeg.length : 0,
                path: 'anpr-drop-stale-2fps-v1',
            });
        } catch (_) { /* ignore */ }
    }
    if (grabMs > GRAB_BUDGET_MS || grabMs > STALE_FRAME_MS) {
        if (deps && deps.log) {
            try {
                deps.log.media.info('anpr live grab stale/over budget — skip enqueue', {
                    camId,
                    ms: grabMs,
                    staleMs: STALE_FRAME_MS,
                    budgetMs: GRAB_BUDGET_MS,
                    path: 'anpr-drop-stale-2fps-v1',
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
    if (isGrabbing) return;
    isGrabbing = true;
    grabBusy = true;
    try {
        if (!isAnprLicensed()) return;
        const cams = unionCamIds();
        if (!cams.length) return;
        const now = Date.now();
        const busy = harvestBusy || aiBusy;
        const interval = busy ? GRAB_MS_BUSY : GRAB_MS;
        if (lastProducerAt && (now - lastProducerAt) < interval) return;
        lastProducerAt = now;
        await Promise.all(cams.map((id) => grabCam(id).catch(() => { /* next */ })));
        setImmediate(() => { consumerTick().catch(() => { /* ignore */ }); });
    } catch (err) {
        console.error('ANPR Poller Error:', err);
    } finally {
        // GUARANTEED RELEASE — never leave lock stuck
        isGrabbing = false;
        grabBusy = false;
    }
}

/** Consumer: Stage-1 on newest frames only — drop stale (>1.5s); never a backlog. */
async function consumerTick() {
    if (aiBusy) return;
    if (!isAnprLicensed()) return;
    aiBusy = true;
    try {
        /* One LIFO pass per cam — no multi-round backlog drain */
        const jobs = [];
        frameQueuesByCam.forEach((q, camId) => {
            const packed = q.getNowait();
            if (!packed || !packed.jpeg) return;
            if (Date.now() - (packed.at || 0) > STALE_FRAME_MS) return;
            jobs.push(
                inferFrame(camId, packed.jpeg, packed.at).catch(() => { /* next */ })
            );
        });
        if (jobs.length) {
            await Promise.all(jobs);
            emitHarvested();
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
    /* Absolute newest only — refuse stale snapshots before YOLO */
    if (Date.now() - startedAt > STALE_FRAME_MS) {
        try {
            console.log('[ANPR-TRACE] drop stale frame before track', {
                camId: String(camId),
                ageMs: Date.now() - startedAt,
                staleMs: STALE_FRAME_MS,
            });
        } catch (_) { /* ignore */ }
        return;
    }
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
    const trackT0 = Date.now();
    const label = deviceLabel(camId);
    try {
        result = await anprPlateRead.trackPath(tmpPath, { camId: String(camId) });
    } catch (err) {
        if (deps && deps.log) {
            try {
                deps.log.media.info('anpr live track fail', {
                    camId,
                    deviceLabel: label,
                    err: String(err && err.message || err).slice(0, 120),
                    ms: Date.now() - trackT0,
                    path: 'anpr-pipeline-trace-v1',
                });
            } catch (_) { /* ignore */ }
        }
        try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
        return;
    }
    if (deps && deps.log) {
        try {
            deps.log.media.info('anpr live track ms', {
                camId,
                deviceLabel: label,
                ms: Date.now() - trackT0,
                hasDetection: !!(result && result.hasDetection),
                error: (result && result.error) || null,
                path: 'anpr-pipeline-trace-v1',
            });
        } catch (_) { /* ignore */ }
    }
    try {
        console.log('[ANPR-TRACE] Node track result', {
            camId: String(camId),
            deviceLabel: label,
            hasDetection: !!(result && result.hasDetection),
            error: (result && result.error) || null,
            w: result && result.vehicle ? result.vehicle.w : null,
        });
    } catch (_) { /* ignore */ }
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
    }, GRAB_MS);
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
    GRAB_MS_BUSY,
    GRAB_BUDGET_MS,
    STALE_FRAME_MS,
    TRACK_EMIT_BLOCK_MS,
    DWELL_UPDATE_MS,
    SHARP_EMIT_FM,
};
