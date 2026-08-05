/**
 * Weapon live poller — already-live stills → RF-DETR gun/knife → Recent.
 * No silent INVITE. No WEAPON alarm / nearby in this MOB.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const frLiveProbe = require('./frLiveProbe');
const weaponSidecarClient = require('./weaponSidecarClient');

const POLL_SEC = Math.max(2, Math.min(15, parseInt(process.env.FM_WEAPON_POLL_SEC || '3', 10) || 3));
const MAX_CAMS = Math.max(1, Math.min(6, parseInt(process.env.FM_WEAPON_LIVE_MAX_CAMS || '6', 10) || 6));
const CONFIRM_N = Math.max(2, Math.min(4, parseInt(process.env.FM_WEAPON_CONFIRM_N || '2', 10) || 2));
const DEDUPE_MS = Math.max(8000, Math.min(120000, parseInt(process.env.FM_WEAPON_HIT_DEDUPE_MS || '20000', 10) || 20000));
const RECENT_MAX = 20;

let deps = null;
let timer = null;
let busy = false;
let cropsDir = null;
/** @type {Map<string, { camIds: string[], at: number }>} */
const watchBySocket = new Map();
/** @type {Map<string, number>} */
const streakByCam = new Map();
/** @type {Map<string, number>} */
const lastHitAt = new Map();
/** @type {Array<object>} */
let recentHits = [];

function init(opts) {
    deps = opts || {};
    const root = (deps.storageDir && String(deps.storageDir)) || path.join(__dirname, '..', 'storage');
    cropsDir = path.join(root, 'weapon-live-crops');
    try { fs.mkdirSync(cropsDir, { recursive: true }); } catch (_) { /* ignore */ }
}

function isWeaponLicensed() {
    if (deps && typeof deps.isWeaponLicensed === 'function') {
        try { return !!deps.isWeaponLicensed(); } catch (_) { return false; }
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
        if (wvp.getCachedFlv && wvp.getCachedFlv(id)) return true;
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

function cropAbsolutePath(file) {
    const base = path.basename(String(file || ''));
    if (!/^wd_[a-zA-Z0-9._-]+\.jpg$/i.test(base)) return null;
    const abs = path.join(cropsDir || '', base);
    try {
        if (fs.existsSync(abs)) return abs;
    } catch (_) { /* ignore */ }
    return null;
}

function listRecent(limit) {
    const n = Math.max(1, Math.min(RECENT_MAX, parseInt(limit, 10) || 8));
    return recentHits.slice(0, n);
}

function pushRecent(hit) {
    recentHits.unshift(hit);
    if (recentHits.length > RECENT_MAX) recentHits = recentHits.slice(0, RECENT_MAX);
}

async function tickCam(camId) {
    if (!isCamLive(camId)) {
        streakByCam.delete(camId);
        return;
    }
    const videoWsPort = deps && deps.videoWsPort;
    let jpeg;
    try {
        jpeg = await frLiveProbe.grabJpegForFr(camId, videoWsPort);
    } catch (_) {
        streakByCam.delete(camId);
        return;
    }
    if (!jpeg || !jpeg.length) {
        streakByCam.delete(camId);
        return;
    }
    const tmp = path.join(cropsDir, 'tmp_' + camId.replace(/[^a-zA-Z0-9]/g, '').slice(-12) + '.jpg');
    fs.writeFileSync(tmp, jpeg);
    let det;
    try {
        det = await weaponSidecarClient.detectPath(tmp, { camId });
    } finally {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
    const hits = (det && det.ok && Array.isArray(det.hits)) ? det.hits : [];
    const keep = hits.filter((h) => h && (h.cls === 'gun' || h.cls === 'knife') && Number(h.conf) > 0);
    if (!keep.length) {
        streakByCam.delete(camId);
        return;
    }
    const streak = (streakByCam.get(camId) || 0) + 1;
    streakByCam.set(camId, streak);
    if (streak < CONFIRM_N) return;
    const now = Date.now();
    if ((lastHitAt.get(camId) || 0) + DEDUPE_MS > now) return;
    lastHitAt.set(camId, now);

    const best = keep.slice().sort((a, b) => Number(b.conf) - Number(a.conf))[0];
    const file = 'wd_' + now + '_' + crypto.randomBytes(4).toString('hex') + '.jpg';
    const abs = path.join(cropsDir, file);
    if (det.crop_jpeg_b64) {
        fs.writeFileSync(abs, Buffer.from(String(det.crop_jpeg_b64), 'base64'));
    } else {
        fs.writeFileSync(abs, jpeg);
    }
    const hit = {
        hitId: file.replace(/\.jpg$/i, ''),
        camId,
        deviceName: deviceLabel(camId),
        cls: best.cls,
        conf: Number(best.conf) || 0,
        at: now,
        cropFile: file,
    };
    pushRecent(hit);
    if (deps && typeof deps.emit === 'function') {
        try { deps.emit('weapon-detect', hit, camId); } catch (_) { /* ignore */ }
    }
}

async function pollOnce() {
    if (busy || !isWeaponLicensed()) return;
    const cams = unionCamIds().filter(isCamLive);
    if (!cams.length) return;
    busy = true;
    try {
        for (let i = 0; i < cams.length; i++) {
            await tickCam(cams[i]);
        }
    } finally {
        busy = false;
    }
}

function start() {
    if (timer) return;
    timer = setInterval(() => {
        pollOnce().catch(() => { /* ignore */ });
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
    listRecent,
    POLL_SEC,
    MAX_CAMS,
    CONFIRM_N,
};
