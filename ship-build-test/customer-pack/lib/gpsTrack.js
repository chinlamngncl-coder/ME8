/**
 * GPS route track — append-only breadcrumb store (separate from last-gps.json cache).
 */
const geofence = require('./geofence');

let deps = null;
const lastStoredByCam = new Map();
/** @type {Set<string>} */
let highResDevices = new Set();

const DEFAULTS = {
    enabled: true,
    intervalSec: 30,
    minMoveM: 15,
    retentionDays: 90,
};

function configure(options) {
    deps = options || {};
}

function setHighResDevices(camIds) {
    highResDevices = new Set((camIds || []).map(function (id) { return String(id || '').trim(); }).filter(Boolean));
}

function isHighResDevice(camId) {
    return highResDevices.has(String(camId || '').trim());
}

function getSettings() {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return Object.assign({}, DEFAULTS);
    const raw = deps.siteDb.getSetting('gps_track_settings');
    if (!raw || typeof raw !== 'object') return Object.assign({}, DEFAULTS);
    return {
        enabled: raw.enabled !== false,
        intervalSec: Math.max(10, parseInt(raw.intervalSec, 10) || DEFAULTS.intervalSec),
        minMoveM: Math.max(0, parseInt(raw.minMoveM, 10) || DEFAULTS.minMoveM),
        retentionDays: Math.max(7, parseInt(raw.retentionDays, 10) || DEFAULTS.retentionDays),
    };
}

function saveSettings(patch) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return getSettings();
    const next = Object.assign({}, getSettings(), patch || {});
    deps.siteDb.setSetting('gps_track_settings', next);
    return next;
}

function runRetention() {
    const cfg = getSettings();
    const cutoff = new Date(Date.now() - cfg.retentionDays * 86400000).toISOString();
    if (deps && deps.siteDb && deps.siteDb.purgeGpsTrackOlderThan) {
        const n = deps.siteDb.purgeGpsTrackOlderThan(cutoff);
        if (n > 0 && deps.log && deps.log.sip) {
            deps.log.sip.info('gps track retention purge', { removed: n, cutoff });
        }
    }
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
    deps.siteDb.appendGpsTrackPoint({
        deviceId: camId,
        lat: la,
        lon: lo,
        source: source || 'sip',
        recordedAt: new Date(now).toISOString(),
    });
    lastStoredByCam.set(camId, { lat: la, lon: lo, at: now });
    return true;
}

function queryRoute(deviceId, fromIso, toIso, limit) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return [];
    return deps.siteDb.queryGpsTrackRoute(deviceId, fromIso, toIso, limit);
}

function evidenceForWindow(deviceId, fromIso, toIso) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return [];
    return deps.siteDb.listEvidenceForDeviceWindow(deviceId, fromIso, toIso, 50);
}

function evidenceNearPoint(deviceId, pointIso) {
    if (!deps || !deps.siteDb || !deps.siteDb.isReady()) return null;
    return deps.siteDb.findEvidenceNearTime(deviceId, pointIso, 900000);
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
};
