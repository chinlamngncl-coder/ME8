/**
 * GPS route track — append-only breadcrumb store (separate from last-gps.json cache).
 */
const geofence = require('./geofence');
const fixedCamRegistry = require('./fixedCamRegistry');

let deps = null;
const lastStoredByCam = new Map();
const writeTails = new Map();
let pendingWrites = 0;
let droppedWrites = 0;
const MAX_PENDING_WRITES = 2000;
/** @type {Set<string>} */
let highResDevices = new Set();

const DEFAULTS = {
    enabled: true,
    intervalSec: 30,
    minMoveM: 15,
    retentionDays: 90,
};
let cachedSettings = Object.assign({}, DEFAULTS);

async function configure(options) {
    deps = options || {};
    if (deps.siteDb && deps.siteDb.isReady()) {
        const raw = await deps.siteDb.getSetting('gps_track_settings', null);
        if (raw && typeof raw === 'object') cachedSettings = normalizeSettings(raw);
    }
}

function setHighResDevices(camIds) {
    highResDevices = new Set((camIds || []).map(function (id) { return String(id || '').trim(); }).filter(Boolean));
}

function isHighResDevice(camId) {
    return highResDevices.has(String(camId || '').trim());
}

function normalizeSettings(raw) {
    return {
        enabled: raw.enabled !== false,
        intervalSec: Math.max(10, parseInt(raw.intervalSec, 10) || DEFAULTS.intervalSec),
        minMoveM: Math.max(0, parseInt(raw.minMoveM, 10) || DEFAULTS.minMoveM),
        retentionDays: Math.max(7, parseInt(raw.retentionDays, 10) || DEFAULTS.retentionDays),
    };
}

function getSettings() {
    return Object.assign({}, cachedSettings);
}

async function saveSettings(patch) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return getSettings();
    const next = Object.assign({}, getSettings(), patch || {});
    cachedSettings = normalizeSettings(next);
    await deps.siteDb.setSetting('gps_track_settings', cachedSettings);
    return getSettings();
}

async function runRetention() {
    const cfg = getSettings();
    const cutoff = new Date(Date.now() - cfg.retentionDays * 86400000).toISOString();
    if (deps && deps.siteDb && deps.siteDb.purgeGpsTrackOlderThan) {
        const n = await deps.siteDb.purgeGpsTrackOlderThan(cutoff);
        if (n > 0 && deps.log && deps.log.sip) {
            deps.log.sip.info('gps track retention purge', { removed: n, cutoff });
        }
    }
}

function dispatchWrite(deviceId, work) {
    if (pendingWrites >= MAX_PENDING_WRITES) {
        droppedWrites += 1;
        console.error('[gps-track] PostgreSQL dispatcher full; write dropped', { deviceId, droppedWrites });
        return false;
    }
    pendingWrites += 1;
    const key = String(deviceId);
    const previous = writeTails.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(work).catch((err) => {
        console.error('[gps-track] PostgreSQL write failed:', err && err.message ? err.message : err);
    }).finally(() => {
        pendingWrites -= 1;
        if (writeTails.get(key) === next) writeTails.delete(key);
    });
    writeTails.set(key, next);
    return true;
}

function recordPoint(camId, lat, lon, source) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return false;
    const cfg = getSettings();
    if (!cfg.enabled || !camId) return false;
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
    const now = Date.now();
    const prev = lastStoredByCam.get(camId);
    const highRes = isHighResDevice(camId);
    const storeIntervalSec = highRes ? Math.min(cfg.intervalSec, 12) : cfg.intervalSec;
    if (prev) {
        const elapsed = now - prev.at;
        const distM = geofence.haversineMeters(prev.lat, prev.lon, la, lo);
        if (elapsed < storeIntervalSec * 1000 && distM < cfg.minMoveM) return false;
    }
    const accepted = dispatchWrite(camId, () => deps.siteDb.appendGpsTrackPoint({
        deviceId: camId,
        lat: la,
        lon: lo,
        source: source || 'sip',
        recordedAt: new Date(now).toISOString(),
    }));
    if (!accepted) return false;
    lastStoredByCam.set(camId, { lat: la, lon: lo, at: now });
    return true;
}

async function queryRoute(deviceId, fromIso, toIso, limit) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return [];
    return deps.siteDb.queryGpsTrackRoute(deviceId, fromIso, toIso, limit);
}

async function evidenceForWindow(deviceId, fromIso, toIso) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return [];
    return deps.siteDb.listEvidenceForDeviceWindow(deviceId, fromIso, toIso, 50);
}

async function evidenceNearPoint(deviceId, pointIso) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return null;
    return deps.siteDb.findEvidenceNearTime(deviceId, pointIso, 900000);
}

const PROXIMITY_RADIUS_M = 1000;
const PROXIMITY_BWC_LIMIT = 8;
const PROXIMITY_FIXED_LIMIT = 5;
const PROXIMITY_WINDOW_SEC = 5;

async function proximityScan(deviceId, atIso) {
    const empty = {
        origin: null,
        units: [],
        fixedCameras: [],
        radiusM: PROXIMITY_RADIUS_M,
        windowSec: PROXIMITY_WINDOW_SEC,
        crossTeamOverride: true,
        originMissing: true,
    };
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return empty;
    if (typeof deps.siteDb.queryGpsProximityAt !== 'function') return empty;
    const origin = typeof deps.siteDb.queryGpsPointAt === 'function'
        ? await deps.siteDb.queryGpsPointAt(deviceId, atIso, PROXIMITY_WINDOW_SEC)
        : null;
    if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) return empty;
    /* Cross-team override: all BWC traces in the time slice — no dispatch-group filter. */
    const peers = await deps.siteDb.queryGpsProximityAt(deviceId, atIso, PROXIMITY_WINDOW_SEC);
    const units = (peers || []).map(function (u) {
        const dist = geofence.haversineMeters(origin.lat, origin.lon, u.lat, u.lon);
        return {
            id: u.deviceId,
            deviceId: u.deviceId,
            name: u.deviceId,
            type: 'BWC',
            lat: u.lat,
            lon: u.lon,
            recordedAt: u.recordedAt,
            distanceM: Math.round(dist),
        };
    }).filter(function (u) {
        return Number.isFinite(u.distanceM) && u.distanceM <= PROXIMITY_RADIUS_M;
    }).sort(function (a, b) {
        return a.distanceM - b.distanceM;
    }).slice(0, PROXIMITY_BWC_LIMIT);

    let fixedCameras = [];
    try {
        const hits = fixedCamRegistry.findWithinRadius(origin.lat, origin.lon, PROXIMITY_RADIUS_M / 1000);
        fixedCameras = (hits || []).map(function (c) {
            const lat = Number(c.lat);
            const lon = Number(c.lng != null ? c.lng : c.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            if (lat === 0 && lon === 0) return null;
            const dist = geofence.haversineMeters(origin.lat, origin.lon, lat, lon);
            return {
                id: String(c.id || ''),
                name: String(c.name || c.id || ''),
                type: c.ptzEnabled ? 'PTZ' : 'Static',
                lat: lat,
                lon: lon,
                distanceM: Math.round(dist),
            };
        }).filter(function (c) {
            return c && c.id && Number.isFinite(c.distanceM) && c.distanceM <= PROXIMITY_RADIUS_M;
        }).sort(function (a, b) {
            return a.distanceM - b.distanceM;
        }).slice(0, PROXIMITY_FIXED_LIMIT);
    } catch (_) {
        fixedCameras = [];
    }
    return {
        origin: origin,
        units: units,
        fixedCameras: fixedCameras,
        radiusM: PROXIMITY_RADIUS_M,
        windowSec: PROXIMITY_WINDOW_SEC,
        crossTeamOverride: true,
        originMissing: false,
    };
}

async function drain() {
    await Promise.all([...writeTails.values()].map((tail) => tail.catch(() => {})));
}

module.exports = {
    configure,
    getSettings,
    saveSettings,
    runRetention,
    recordPoint,
    queryRoute,
    evidenceForWindow,
    evidenceNearPoint,
    proximityScan,
    setHighResDevices,
    isHighResDevice,
    dispatcherHealth: () => ({ ok: droppedWrites === 0, pendingWrites, droppedWrites, maxPendingWrites: MAX_PENDING_WRITES }),
    drain,
};
