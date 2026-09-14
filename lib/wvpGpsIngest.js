'use strict';

/**
 * ENTERPRISE-GPS-INGEST-V1 — WVP HTTP pull.
 * No SIP proxy. No PTT/MESSAGE intercept. No leasing tables.
 */

const log = require('./fleetLog');
const geofence = require('./geofence');

const CHUNK = Math.max(50, Math.min(100, parseInt(process.env.FM_WVP_GPS_CHUNK || '80', 10) || 80));
const MAX_KMH = 160;
const HOLE_MS = 2 * 60 * 1000;
const CAND_TTL_MS = 2 * 60 * 1000;
const MOVE_M = 5;
const HEARTBEAT_MS = 30000;
const MAP_FLUSH_MS = Math.max(3000, Math.min(5000, parseInt(process.env.FM_GPS_MAP_FLUSH_MS || '4000', 10) || 4000));
const DB_FLUSH_MS = Math.max(10000, Math.min(15000, parseInt(process.env.FM_GPS_DB_FLUSH_MS || '12000', 10) || 12000));

let timer = null;
let mapTimer = null;
let dbTimer = null;
let started = false;
let inFlight = false;
let emitGpsIfValid = null;
let emitGpsBatch = null;
let siteDb = null;
let exitHooked = false;

const lastAccepted = new Map();
const candidates = new Map();
const lastCourtIso = new Map();
const mapPending = new Map();
let courtBuf = [];

function pollMs() {
    return Math.max(10000, parseInt(process.env.FM_WVP_GPS_INGEST_MS || '15000', 10) || 15000);
}

function yieldEventLoop() {
    return new Promise(function (resolve) { setImmediate(resolve); });
}

function parseGpsTime(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    let ms = Date.parse(s.indexOf('T') >= 0 ? s : s.replace(' ', 'T'));
    if (!Number.isFinite(ms)) return null;
    const y = new Date(ms).getUTCFullYear();
    if (y < 2020 || y > 2100) return null;
    return { ms: ms, iso: new Date(ms).toISOString() };
}

function speedKmh(aLat, aLon, bLat, bLon, dtSec) {
    const m = geofence.haversineMeters(aLat, aLon, bLat, bLon);
    return (m / dtSec) * 3.6;
}

function sweepCandidates(now) {
    candidates.forEach(function (row, id) {
        if (!row || (now - row.at) > CAND_TTL_MS) candidates.delete(id);
    });
}

function acceptPoint(id, lat, lon, parsed) {
    const gpsTimeMs = parsed && parsed.ms ? parsed.ms : null;
    lastAccepted.set(id, { lat: lat, lon: lon, tMs: gpsTimeMs || Date.now() });
    if (typeof emitGpsIfValid === 'function') {
        emitGpsIfValid(id, lat, lon, {
            skipWs: true,
            skipTrack: true,
            gpsTimeMs: gpsTimeMs,
        });
    }
    mapPending.set(id, { cameraId: id, lat: lat, lon: lon, gpsTimeMs: gpsTimeMs });
    if (!parsed || !parsed.iso) return;
    if (lastCourtIso.get(id) === parsed.iso) return;
    lastCourtIso.set(id, parsed.iso);
    courtBuf.push({
        deviceId: id,
        lat: lat,
        lon: lon,
        recordedAt: parsed.iso,
        source: 'wvp',
    });
}

function driftOk(prev, lat, lon, tMs) {
    if (!prev) return true;
    const dist = geofence.haversineMeters(prev.lat, prev.lon, lat, lon);
    const dtMs = tMs - prev.tMs;
    return dist >= MOVE_M || dtMs >= HEARTBEAT_MS;
}

function candidateAgrees(cand, lat, lon, tMs) {
    const distM = geofence.haversineMeters(cand.lat, cand.lon, lat, lon);
    if (distM <= MOVE_M) return true;
    const dtC = (tMs - cand.tMs) / 1000;
    if (dtC < 1) return false;
    return speedKmh(cand.lat, cand.lon, lat, lon, dtC) <= MAX_KMH;
}

function filterPoint(id, lat, lon, parsed) {
    const now = Date.now();
    const tMs = parsed ? parsed.ms : now;
    const prev = lastAccepted.get(id);

    let cand = candidates.get(id);
    if (cand && (now - cand.at) > CAND_TTL_MS) {
        candidates.delete(id);
        cand = null;
    }

    /* Hole confirm vs candidate only — never re-test dt against lastAccepted. */
    if (cand && parsed) {
        if (!candidateAgrees(cand, lat, lon, tMs)) {
            candidates.set(id, { lat: lat, lon: lon, tMs: tMs, parsed: parsed, at: now });
            return;
        }
        candidates.delete(id);
        acceptPoint(id, lat, lon, parsed);
        return;
    }

    if (prev && parsed && (tMs - prev.tMs) > HOLE_MS) {
        candidates.set(id, { lat: lat, lon: lon, tMs: tMs, parsed: parsed, at: now });
        return;
    }

    if (prev && parsed) {
        const dtSec = (tMs - prev.tMs) / 1000;
        if (dtSec >= 1) {
            if (speedKmh(prev.lat, prev.lon, lat, lon, dtSec) > MAX_KMH) return;
        }
    }

    if (!driftOk(prev, lat, lon, tMs)) return;
    acceptPoint(id, lat, lon, parsed);
}

function flushMap() {
    if (!mapPending.size || typeof emitGpsBatch !== 'function') {
        mapPending.clear();
        return;
    }
    const rows = Array.from(mapPending.values());
    mapPending.clear();
    try {
        emitGpsBatch(rows);
    } catch (_) { /* next tick */ }
}

async function flushPending() {
    const rows = courtBuf;
    courtBuf = [];
    flushMap();
    if (!rows.length) return 0;
    if (!siteDb || typeof siteDb.appendGpsTrackPointsBulk !== 'function' || !siteDb.isReady()) {
        courtBuf = rows.concat(courtBuf);
        return 0;
    }
    try {
        return await siteDb.appendGpsTrackPointsBulk(rows);
    } catch (err) {
        courtBuf = rows.concat(courtBuf);
        log.media.warn('wvp gps bulk insert', {
            message: (err && err.message) ? String(err.message).slice(0, 80) : 'fail',
        });
        return 0;
    }
}

function hookExit() {
    if (exitHooked) return;
    exitHooked = true;
    const onExit = function () {
        flushPending().catch(function () {});
    };
    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);
}

function start(opts) {
    opts = opts || {};
    if (started) return { ok: true, already: true };
    const wvpLab = opts.wvpLab;
    const fleetRegistry = opts.fleetRegistry;
    emitGpsIfValid = opts.emitGpsIfValid;
    emitGpsBatch = opts.emitGpsBatch;
    siteDb = opts.siteDb || null;
    if (!wvpLab || typeof emitGpsIfValid !== 'function') {
        return { ok: false, reason: 'missing_deps' };
    }
    if (typeof wvpLab.isEnabled === 'function' && !wvpLab.isEnabled()) {
        log.media.info('wvp gps ingest skipped — WVP handoff off');
        return { ok: false, reason: 'wvp_off' };
    }
    started = true;
    hookExit();

    const tick = async function () {
        if (inFlight) return;
        inFlight = true;
        try {
            sweepCandidates(Date.now());
            const ids = [];
            const seen = {};
            if (fleetRegistry && typeof fleetRegistry.getDashboardFleet === 'function') {
                fleetRegistry.getDashboardFleet().forEach(function (d) {
                    const id = d && d.id ? String(d.id).trim() : '';
                    if (!id || seen[id]) return;
                    if (opts.isBwcCameraId && !opts.isBwcCameraId(id)) return;
                    if (!d.online) return;
                    seen[id] = true;
                    ids.push(id);
                });
            }
            if (!ids.length && typeof wvpLab.listDevices === 'function') {
                const page = await wvpLab.listDevices(1, 100);
                ((page && page.list) || []).forEach(function (d) {
                    const id = d && d.deviceId ? String(d.deviceId).trim() : '';
                    if (!id || seen[id] || !d.online) return;
                    if (opts.isBwcCameraId && !opts.isBwcCameraId(id)) return;
                    seen[id] = true;
                    ids.push(id);
                });
            }
            for (let off = 0; off < ids.length; off += CHUNK) {
                const chunk = ids.slice(off, off + CHUNK);
                await Promise.all(chunk.map(async function (id) {
                    try {
                        const chs = await wvpLab.listChannels(id, 1, 8);
                        const list = (chs && chs.list) || [];
                        for (let i = 0; i < list.length; i++) {
                            const row = list[i];
                            if (!row || row.lat == null || row.lon == null) continue;
                            filterPoint(id, row.lat, row.lon, parseGpsTime(row.gpsTime));
                            break;
                        }
                    } catch (_) { /* next cam */ }
                }));
                await yieldEventLoop();
            }
        } catch (err) {
            log.media.warn('wvp gps ingest tick', {
                message: (err && err.message) ? String(err.message).slice(0, 80) : 'fail',
            });
        } finally {
            inFlight = false;
        }
    };

    timer = setInterval(tick, pollMs());
    if (timer.unref) timer.unref();
    mapTimer = setInterval(flushMap, MAP_FLUSH_MS);
    if (mapTimer.unref) mapTimer.unref();
    dbTimer = setInterval(function () {
        flushPending().catch(function () {});
    }, DB_FLUSH_MS);
    if (dbTimer.unref) dbTimer.unref();
    setTimeout(tick, 1200);
    log.media.info('wvp gps ingest started', {
        pollMs: pollMs(),
        chunk: CHUNK,
        maxSockets: 10,
        path: 'enterprise-gps-ingest-v1',
    });
    return { ok: true };
}

module.exports = { start, flushPending };
