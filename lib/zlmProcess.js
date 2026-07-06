/**
 * ZLM process health for Gate B lab — builder Docker or pack binary later.
 * Does NOT spawn ZLM on Fleet boot; does NOT touch liveStreamPool.
 */
const zlmIngestLab = require('./zlmIngestLab');
const log = require('./fleetLog');

function isLabEnabled() {
    return String(process.env.FM_LAB_ZLM || '').trim() === '1';
}

function isConfigured() {
    return zlmIngestLab.isEnabled();
}

function getPublicStatus() {
    return {
        labEnabled: isLabEnabled(),
        zlm: zlmIngestLab.getStatus(),
    };
}

async function healthCheck(force) {
    if (!isLabEnabled()) {
        return { ok: false, reason: 'lab_disabled', checkedAt: Date.now() };
    }
    if (!zlmIngestLab.isEnabled()) {
        return { ok: false, reason: 'zlm_disabled', checkedAt: Date.now() };
    }
    return zlmIngestLab.healthCheck(force);
}

function isHealthy() {
    return isLabEnabled() && zlmIngestLab.isHealthy();
}

async function warmup() {
    if (!isLabEnabled()) {
        log.media.info('zlm lab gate B disabled — set FM_LAB_ZLM=1 for test bench');
        return { ok: false, reason: 'lab_disabled' };
    }
    if (!zlmIngestLab.isEnabled()) {
        log.media.info('zlm lab skipped — FM_ZLM_ENABLED=0');
        return { ok: false, reason: 'zlm_disabled' };
    }
    log.media.info('zlm lab warmup', zlmIngestLab.getConfigPublic());
    return healthCheck(true);
}

module.exports = {
    isLabEnabled,
    isConfigured,
    isHealthy,
    getPublicStatus,
    healthCheck,
    warmup,
};
