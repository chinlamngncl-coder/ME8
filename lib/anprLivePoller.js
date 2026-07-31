/**
 * ANPR-LIVE-ZLM-WATCH-V1 + ANPR-LIVE-VEHICLE-SCENE-PLATE-V1
 * Sample stills → vehicle scene + plate ROI → rail (vehicle primary; plate optional).
 * Does not invite the BWC again; grabs from existing handoff FLV when active.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const frLiveProbe = require('./frLiveProbe');
const anprPlateRead = require('./anprPlateRead');
const anprPlateList = require('./anprPlateList');

const POLL_SEC = Math.max(1, Math.min(15, parseInt(process.env.FM_ANPR_POLL_SEC || '1', 10) || 1));
const MAX_CAMS = Math.max(1, Math.min(6, parseInt(process.env.FM_ANPR_LIVE_MAX_CAMS || '4', 10) || 4));
const HIT_DEDUPE_MS = Math.max(10000, Math.min(120000, parseInt(process.env.FM_ANPR_HIT_DEDUPE_MS || '45000', 10) || 45000));
const READ_DEDUPE_MS = Math.max(2000, Math.min(60000, parseInt(process.env.FM_ANPR_READ_DEDUPE_MS || '5000', 10) || 5000));
/** Crop-first rail: dense snaps while vehicle moves (ANPR-LIVE-POWER-CROP-MIT-V1). */
const CROP_DEDUPE_MS = Math.max(600, Math.min(15000, parseInt(process.env.FM_ANPR_CROP_DEDUPE_MS || '900', 10) || 900));

let deps = null;
let timer = null;
let busy = false;
/** @type {Map<string, { camIds: string[], at: number }>} */
const watchBySocket = new Map();
/** @type {Map<string, number>} */
const lastHitAt = new Map();
/** @type {Map<string, number>} */
const lastReadAt = new Map();
/** @type {Map<string, number>} */
const lastCropAt = new Map();
let cropsDir = null;

function init(options) {
    deps = options || {};
    const storageDir = deps.storageDir || path.join(__dirname, '..', 'storage');
    cropsDir = path.join(storageDir, 'anpr-live-crops');
    try { fs.mkdirSync(cropsDir, { recursive: true }); } catch (_) { /* ignore */ }
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

function saveCropBuffer(camId, jpegBuf) {
    if (!cropsDir || !Buffer.isBuffer(jpegBuf) || jpegBuf.length < 80) return null;
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

function saveCropFromB64(camId, b64) {
    if (!b64 || typeof b64 !== 'string') return null;
    let buf;
    try {
        buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    } catch (_) {
        return null;
    }
    return saveCropBuffer(camId, buf);
}

function cropAbsolutePath(file) {
    const base = path.basename(String(file || ''));
    if (!base || base !== file || base.indexOf('..') >= 0) return null;
    if (!/^anpr_[a-zA-Z0-9._-]+\.jpg$/i.test(base)) return null;
    const abs = path.join(cropsDir || '', base);
    try {
        if (!fs.existsSync(abs)) return null;
    } catch (_) { return null; }
    return abs;
}

async function processCam(camId) {
    if (!isCamLive(camId)) return;
    const now = Date.now();
    const lastR = lastReadAt.get(camId) || 0;
    const skipOcrHeavy = (now - lastR) < READ_DEDUPE_MS;

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
        result = await anprPlateRead.readPath(tmpPath, {});
    } catch (err) {
        if (deps && deps.log) {
            try {
                deps.log.media.info('anpr live read fail', {
                    camId,
                    err: String(err && err.message || err).slice(0, 120),
                });
            } catch (_) { /* ignore */ }
        }
        try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
        return;
    }
    try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }

    /* VEHICLE-SCENE-PLATE-V1: vehicle scene primary; tight plate crop secondary (never full street). */
    const savedPlate = result && result.cropJpegB64
        ? saveCropFromB64(camId, result.cropJpegB64)
        : null;
    const savedVehicle = result && result.vehicleJpegB64
        ? saveCropFromB64(camId, result.vehicleJpegB64)
        : null;
    if (!savedPlate && !savedVehicle) return;

    const plate = result && result.ok
        ? (result.plate || result.plateCompact || null)
        : null;

    if (plate) {
        if (skipOcrHeavy) {
            const lastC = lastCropAt.get(camId) || 0;
            if (now - lastC < CROP_DEDUPE_MS) return;
        }
        lastReadAt.set(camId, now);
        lastCropAt.set(camId, now);
    } else {
        const lastC = lastCropAt.get(camId) || 0;
        if (now - lastC < CROP_DEDUPE_MS) return;
        lastCropAt.set(camId, now);
    }

    let listMatch = null;
    if (plate) {
        try {
            const probed = anprPlateList.matchProbe(result.plateCompact || result.plate);
            if (probed && probed.match) listMatch = probed.match;
        } catch (_) { /* ignore */ }
    }

    const at = new Date().toISOString();
    const tick = {
        camId,
        deviceLabel: deviceLabel(camId),
        at,
        plate: plate || null,
        plateCompact: plate
            ? (result.plateCompact || anprPlateList.compactPlate(plate))
            : null,
        confidence: result && result.confidence != null ? result.confidence : null,
        lowConfidence: !!(result && result.lowConfidence),
        engine: (result && result.engine) || null,
        vehicleUrl: savedVehicle ? savedVehicle.cropUrl : null,
        cropUrl: savedPlate ? savedPlate.cropUrl : null,
        hasVehicle: !!savedVehicle,
        hasCrop: !!savedPlate,
        vehicleLabel: result && result.vehicle && result.vehicle.label
            ? String(result.vehicle.label)
            : null,
        listMatch: listMatch || null,
        source: 'live',
        ocrError: plate ? null : ((result && result.error) || 'plate_not_found'),
    };
    Object.assign(tick, gpsFields(camId));

    if (deps && deps.emit) {
        deps.emit('anpr-crop-tick', tick, camId);
    }

    if (listMatch && listMatch.id) {
        const dedupeKey = camId + '|' + String(listMatch.id);
        const prev = lastHitAt.get(dedupeKey) || 0;
        if (now - prev >= HIT_DEDUPE_MS) {
            lastHitAt.set(dedupeKey, now);
            const hitId = 'anprhit_' + crypto.randomBytes(6).toString('hex');
            const hit = {
                hitId,
                camId,
                deviceLabel: tick.deviceLabel,
                at,
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
            };
            Object.assign(hit, gpsFields(camId));
            if (deps && deps.emit) deps.emit('anpr-list-hit', hit, camId);
            if (deps && typeof deps.onHit === 'function') {
                try { deps.onHit(hit); } catch (_) { /* ignore */ }
            }
        }
    }
}

async function tick() {
    if (busy) return;
    if (!isAnprLicensed()) return;
    const cams = unionCamIds();
    if (!cams.length) return;
    busy = true;
    try {
        for (let i = 0; i < cams.length; i++) {
            try {
                await processCam(cams[i]);
            } catch (_) { /* next cam */ }
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
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
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
    CROP_DEDUPE_MS,
};
