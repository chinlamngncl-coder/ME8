/**
 * Spatial-temporal fusion — Primary (front) pending + Secondary (rear) plate within 5s / GPS.
 * Produces one unified event: Front macro + Rear micro/plate.
 */
'use strict';

const crypto = require('crypto');

const FUSE_MS = Math.max(1000, Math.min(15000, parseInt(process.env.FM_ANPR_FUSE_MS || '5000', 10) || 5000));
const GPS_M = Math.max(5, Math.min(80, parseFloat(process.env.FM_ANPR_FUSE_GPS_M || '25') || 25));

/** @type {Map<string, object>} pendingId -> pending */
const pending = new Map();

function haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (Number(d) * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ / 2) ** 2
        + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function purgeOld(now) {
    pending.forEach((p, id) => {
        if (!p || (now - p.t1) > FUSE_MS * 2) pending.delete(id);
    });
}

/**
 * Front saw vehicle but plate failed / unclear — hold macro for rear hand-off.
 */
function holdFrontPending(tick, parentCamId) {
    if (!tick || !parentCamId) return null;
    const now = Date.now();
    purgeOld(now);
    if (!tick.vehicleUrl) return null;
    const hasPlate = !!(tick.plateCompact && !tick.unclear);
    if (hasPlate) return null;
    const id = 'pend_' + crypto.randomBytes(5).toString('hex');
    const row = {
        pendingId: id,
        parentCamId: String(parentCamId),
        t1: now,
        lat: tick.lat != null ? Number(tick.lat) : null,
        lon: tick.lon != null ? Number(tick.lon) : null,
        frontMacroUrl: tick.vehicleUrl,
        frontTick: Object.assign({}, tick),
        frameUuid: tick.frameUuid || null,
    };
    pending.set(id, row);
    return row;
}

/**
 * Rear cam produced a plate — try merge with a front pending from parentCamId.
 * @returns {object|null} fused tick or null
 */
function tryFuseRear(tick, parentCamId, rearCamId) {
    if (!tick || !parentCamId) return null;
    if (!tick.plateCompact || tick.unclear) return null;
    const now = Date.now();
    purgeOld(now);
    let best = null;
    pending.forEach((p) => {
        if (!p || String(p.parentCamId) !== String(parentCamId)) return;
        if ((now - p.t1) > FUSE_MS) return;
        let gpsOk = true;
        if (Number.isFinite(p.lat) && Number.isFinite(p.lon)
            && Number.isFinite(Number(tick.lat)) && Number.isFinite(Number(tick.lon))) {
            gpsOk = haversineM(p.lat, p.lon, tick.lat, tick.lon) <= GPS_M;
        }
        if (!gpsOk) return;
        if (!best || p.t1 > best.t1) best = p;
    });
    if (!best) return null;
    pending.delete(best.pendingId);
    const fused = Object.assign({}, tick, {
        vehicleUrl: best.frontMacroUrl || tick.vehicleUrl,
        cropUrl: tick.cropUrl,
        fusion: {
            pendingId: best.pendingId,
            parentCamId: best.parentCamId,
            rearCamId: String(rearCamId || tick.camId || ''),
            dtMs: now - best.t1,
            frontFrameUuid: best.frameUuid || null,
            rearFrameUuid: tick.frameUuid || null,
        },
        source: 'live-fusion',
        deviceLabel: (tick.deviceLabel || '') + ' (fused)',
        frameUuid: tick.frameUuid || best.frameUuid || null,
        /* Prefer front macro frame identity for vehicle scene */
        macroFrameUuid: best.frameUuid || null,
        microFrameUuid: tick.frameUuid || null,
    });
    return fused;
}

/**
 * Front pendings past fuse window with no rear merge — emit as unclear for Manual Review.
 * @returns {object[]} ticks to publish
 */
function flushExpiredPendings() {
    const now = Date.now();
    const out = [];
    pending.forEach((p, id) => {
        if (!p || (now - p.t1) <= FUSE_MS) return;
        pending.delete(id);
        const tick = Object.assign({}, p.frontTick || {}, {
            vehicleUrl: p.frontMacroUrl || (p.frontTick && p.frontTick.vehicleUrl),
            plate: null,
            plateCompact: null,
            unclear: true,
            reviewStatus: 'manual_review',
            fusion: { pendingId: p.pendingId, expired: true, parentCamId: p.parentCamId },
            frameUuid: p.frameUuid || (p.frontTick && p.frontTick.frameUuid) || null,
            source: 'live-fusion-expired',
        });
        out.push(tick);
    });
    return out;
}

function reset() {
    pending.clear();
}

module.exports = {
    holdFrontPending,
    tryFuseRear,
    flushExpiredPendings,
    reset,
    FUSE_MS,
    GPS_M,
};
