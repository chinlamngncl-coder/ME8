/**
 * ZLM failover — circuit breaker, per-cam cooldown, failure window (mob-me8-zlm-failover).
 */
'use strict';

const zlmSidecar = require('./zlmSidecar');

const failures = [];
let circuitOpenUntil = 0;
const camBlockedUntil = new Map();

function readFailoverConfig() {
    return {
        startTimeoutMs: parseInt(process.env.FM_LIVE_ZLM_START_TIMEOUT_MS || '8000', 10) || 8000,
        stallTimeoutMs: parseInt(process.env.FM_LIVE_STALL_TIMEOUT_MS || '5000', 10) || 5000,
        camCooldownMs: parseInt(process.env.FM_LIVE_FAILOVER_COOLDOWN_MS || '300000', 10) || 300000,
        windowMs: parseInt(process.env.FM_LIVE_FAILOVER_WINDOW_MS || '900000', 10) || 900000,
        failRateThreshold: parseFloat(process.env.FM_LIVE_FAILOVER_RATE || '0.5') || 0.5,
        circuitCooldownMs: parseInt(process.env.FM_LIVE_CIRCUIT_COOLDOWN_MS || '900000', 10) || 900000,
    };
}

function isPrimaryMode() {
    return zlmSidecar.isPrimaryEngine();
}

function isFallbackEnabled() {
    return zlmSidecar.isFallbackEnabled();
}

function pruneFailures(now) {
    const cfg = readFailoverConfig();
    const cutoff = now - cfg.windowMs;
    while (failures.length && failures[0].at < cutoff) failures.shift();
}

function failRate(now) {
    pruneFailures(now);
    if (!failures.length) return 0;
    return failures.length;
}

function recordFailure(reason, camId) {
    const now = Date.now();
    const cfg = readFailoverConfig();
    failures.push({ at: now, reason: String(reason || 'unknown'), camId: String(camId || '') });
    pruneFailures(now);

    const attempts = failures.length;
    const recentAttachAttempts = failures.filter(function (f) {
        return f.reason === 'readiness_timeout' || f.reason === 'attach_failed' || f.reason === 'stall';
    }).length;

    if (recentAttachAttempts >= 3 && attempts >= 3) {
        const failEvents = failures.filter(function (f) {
            return f.reason === 'readiness_timeout' || f.reason === 'attach_failed' || f.reason === 'stall';
        });
        if (failEvents.length / Math.max(1, attempts) >= cfg.failRateThreshold) {
            circuitOpenUntil = now + cfg.circuitCooldownMs;
        }
    }

    if (camId) {
        camBlockedUntil.set(String(camId), now + cfg.camCooldownMs);
    }
}

function isCircuitOpen(now) {
    return (now || Date.now()) < circuitOpenUntil;
}

function isCamBlocked(camId) {
    const until = camBlockedUntil.get(String(camId || ''));
    if (!until) return false;
    if (Date.now() >= until) {
        camBlockedUntil.delete(String(camId));
        return false;
    }
    return true;
}

function shouldAttemptZlm(camId, zlmHealthyFn) {
    const cfg = zlmSidecar.readConfig();
    if (!cfg.enabled) return { ok: false, reason: 'disabled' };
    if (cfg.liveEngine !== 'zlm' && process.env.FM_LIVE_ZLM_MIRROR !== '1') {
        return { ok: false, reason: 'not_primary' };
    }
    if (isCircuitOpen()) return { ok: false, reason: 'circuit_open' };
    if (camId && isCamBlocked(camId)) return { ok: false, reason: 'cam_cooldown' };
    if (!zlmHealthyFn || !zlmHealthyFn()) return { ok: false, reason: 'sidecar_unhealthy' };
    return { ok: true, reason: null };
}

function clearCamBlock(camId) {
    camBlockedUntil.delete(String(camId || ''));
}

function getPublicStats() {
    const now = Date.now();
    pruneFailures(now);
    return {
        primary: isPrimaryMode(),
        fallbackFfmpeg: isFallbackEnabled(),
        circuitOpen: isCircuitOpen(now),
        circuitOpenUntil: circuitOpenUntil || null,
        recentFailures: failures.slice(-20).map(function (f) {
            return { at: f.at, reason: f.reason, camId: f.camId };
        }),
        failureCount: failures.length,
    };
}

module.exports = {
    readFailoverConfig,
    isPrimaryMode,
    isFallbackEnabled,
    recordFailure,
    shouldAttemptZlm,
    isCircuitOpen,
    isCamBlocked,
    clearCamBlock,
    getPublicStats,
};
