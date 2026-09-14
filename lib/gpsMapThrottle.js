'use strict';

/**
 * GPS-NOTIFY-INGEST-WVP-V1 — map valve.
 * Ingest may run often. Leaflet only gets a point if the cam moved >5 m or 30 s passed.
 */

const geofence = require('./geofence');

const MOVE_M = 5;
const HEARTBEAT_MS = 30000;
const published = new Map();

function shouldPublish(camId, lat, lon) {
    const id = String(camId || '').trim();
    const la = Number(lat);
    const lo = Number(lon);
    if (!id || !Number.isFinite(la) || !Number.isFinite(lo) || la === 0 || lo === 0) return false;
    const prev = published.get(id);
    const now = Date.now();
    if (!prev) {
        published.set(id, { lat: la, lon: lo, at: now });
        return true;
    }
    const moved = geofence.haversineMeters(prev.lat, prev.lon, la, lo);
    if (moved >= MOVE_M || (now - prev.at) >= HEARTBEAT_MS) {
        published.set(id, { lat: la, lon: lo, at: now });
        return true;
    }
    return false;
}

function getPublished(camId) {
    return published.get(String(camId || '').trim()) || null;
}

module.exports = { shouldPublish, getPublished, MOVE_M, HEARTBEAT_MS };
