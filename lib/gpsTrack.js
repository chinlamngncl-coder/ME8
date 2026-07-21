/**
 * GPS route track — append-only breadcrumb store (separate from last-gps.json cache).
 */
const geofence = require('./geofence');

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
    setHighResDevices,
    isHighResDevice,
    dispatcherHealth: () => ({ ok: droppedWrites === 0, pendingWrites, droppedWrites, maxPendingWrites: MAX_PENDING_WRITES }),
    drain,
};
