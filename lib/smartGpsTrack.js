'use strict';

/**
 * Per-device high-resolution GPS (SIP MobilePosition Interval).
 * Patrol baseline stays on FM_GPS_POLL_MS; incident/manual uses Interval XML.
 */
const DEFAULT_HIGH_RES_SEC = Math.max(5, parseInt(process.env.FM_GPS_HIGH_RES_INTERVAL_SEC || '15', 10));
const REFRESH_QUERY_MS = Math.max(60000, parseInt(process.env.FM_GPS_HIGH_RES_REFRESH_MS || '300000', 10));

const SOS_REASONS = new Set(['sos-alarm', 'sos-team']);

let deps = null;
/** @type {Map<string, { reasons: Set<string>, startedAt: string, intervalSec: number, refreshTimer: ReturnType<typeof setTimeout>|null }>} */
const active = new Map();

function configure(options) {
    deps = options || {};
}

function logInfo(msg, detail) {
    if (deps && deps.log && deps.log.sip) deps.log.sip.info(msg, detail);
}

function sendQuery(camId, intervalSec) {
    if (typeof deps.sendMobilePositionQuery === 'function') {
        deps.sendMobilePositionQuery(camId, intervalSec);
    }
}

function syncHighResStore() {
    if (typeof deps.syncHighResDevices === 'function') {
        deps.syncHighResDevices(Array.from(active.keys()));
    }
}

function emitState() {
    syncHighResStore();
    if (typeof deps.emitState === 'function') {
        deps.emitState(listActive());
    }
}

function listActive() {
    return Array.from(active.entries()).map(function ([camId, s]) {
        return {
            camId: camId,
            reasons: Array.from(s.reasons),
            intervalSec: s.intervalSec,
            startedAt: s.startedAt,
        };
    });
}

function isActive(camId) {
    return active.has(String(camId || '').trim());
}

function clearRefreshTimer(entry) {
    if (entry && entry.refreshTimer) {
        clearTimeout(entry.refreshTimer);
        entry.refreshTimer = null;
    }
}

function scheduleRefresh(camId, intervalSec) {
    const s = active.get(camId);
    if (!s) return;
    clearRefreshTimer(s);
    s.refreshTimer = setTimeout(function () {
        if (!active.has(camId)) return;
        sendQuery(camId, intervalSec);
        scheduleRefresh(camId, intervalSec);
    }, REFRESH_QUERY_MS);
}

function start(camId, reason, opts) {
    const id = String(camId || '').trim();
    const r = String(reason || 'manual').trim();
    if (!id || !r) return false;
    const intervalSec = (opts && opts.intervalSec) || DEFAULT_HIGH_RES_SEC;
    let s = active.get(id);
    if (!s) {
        s = {
            reasons: new Set(),
            startedAt: new Date().toISOString(),
            intervalSec: intervalSec,
            refreshTimer: null,
        };
        active.set(id, s);
    }
    s.reasons.add(r);
    s.intervalSec = intervalSec;
    sendQuery(id, intervalSec);
    scheduleRefresh(id, intervalSec);
    logInfo('smart gps tracking start', { camId: id, reason: r, intervalSec: intervalSec, reasons: Array.from(s.reasons) });
    emitState();
    return true;
}

function startBatch(camIds, reason, opts) {
    (camIds || []).forEach(function (id) { start(id, reason, opts); });
}

function stop(camId, reason) {
    const id = String(camId || '').trim();
    const s = active.get(id);
    if (!s) return false;
    if (reason) s.reasons.delete(String(reason).trim());
    else s.reasons.clear();
    if (s.reasons.size > 0) {
        emitState();
        return true;
    }
    clearRefreshTimer(s);
    active.delete(id);
    sendQuery(id, null);
    logInfo('smart gps tracking stop', { camId: id, reason: reason || 'all' });
    emitState();
    return true;
}

function stopByReasons(reasonList) {
    const reasons = new Set(reasonList || []);
    Array.from(active.entries()).forEach(function ([id, s]) {
        reasons.forEach(function (r) { s.reasons.delete(r); });
        if (s.reasons.size === 0) {
            clearRefreshTimer(s);
            active.delete(id);
            sendQuery(id, null);
            logInfo('smart gps tracking stop', { camId: id, reason: 'incident-clear' });
        }
    });
    emitState();
}

function stopAllSosTracking() {
    stopByReasons(Array.from(SOS_REASONS));
}

function onSosAlarmPushed(payload) {
    if (!payload || !payload.cameraId) return;
    if (payload.refresh || payload.replay || payload.fromLiveBye) return;
    start(payload.cameraId, 'sos-alarm');
}

module.exports = {
    configure,
    start,
    startBatch,
    stop,
    stopByReasons,
    stopAllSosTracking,
    onSosAlarmPushed,
    listActive,
    isActive,
    DEFAULT_HIGH_RES_SEC,
    SOS_REASONS,
};
