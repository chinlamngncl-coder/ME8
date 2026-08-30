/**
 * Express middleware — air-gap license.lic feature flags + camera capacity.
 * Pair with lib/licenseManager.js (Task 3.4).
 */
'use strict';

const licenseManager = require('./licenseManager');
const licenseLimitResponse = require('./licenseLimitResponse');

/**
 * Require features[featureName] === true (lab-open fail-open inside hasFeature).
 * Usage: app.post('/path', requireFeature('ptzControl'), handler)
 */
function requireFeature(featureName) {
    const name = String(featureName || '').trim();
    return function licenseRequireFeature(req, res, next) {
        let ok = false;
        try {
            ok = !!licenseManager.hasFeature(name);
        } catch (_) {
            ok = false;
        }
        if (ok) return next();
        return licenseLimitResponse.limitReached403(res, 'module');
    };
}

/**
 * Block when adding would exceed maxFixedCameras.
 * @param {object} [opts]
 * @param {function(req): number} [opts.addCountFrom] — default 1
 * @param {function(): number} [opts.currentCount] — default must be set by wire-up
 */
function checkFixedCamCapacity(opts) {
    const o = opts || {};
    return function licenseCheckFixedCamCapacity(req, res, next) {
        let addCount = 1;
        if (typeof o.addCountFrom === 'function') {
            addCount = Math.max(0, Number(o.addCountFrom(req)) || 0);
        }
        if (addCount < 1) return next();
        const current = typeof o.currentCount === 'function'
            ? Math.max(0, Number(o.currentCount()) || 0)
            : 0;
        /* Deny when Current + New > Max  ↔  proposedTotal = current + addCount */
        const check = licenseManager.checkFixedCamLimit(current + addCount);
        if (check.allowed) return next();
        return licenseLimitResponse.limitReached403(res, 'devices');
    };
}

/**
 * Block when BWC registry total would exceed maxBwcDevices.
 * @param {object} [opts]
 * @param {function(req): number} [opts.totalCountFrom] — proposed total device count
 */
function checkBwcCapacity(opts) {
    const o = opts || {};
    return function licenseCheckBwcCapacity(req, res, next) {
        const total = typeof o.totalCountFrom === 'function'
            ? Math.max(0, Number(o.totalCountFrom(req)) || 0)
            : 0;
        if (total < 1) return next();
        const check = licenseManager.checkBwcLimit(total);
        if (check.allowed) return next();
        return licenseLimitResponse.limitReached403(res, 'devices');
    };
}

module.exports = {
    requireFeature,
    checkFixedCamCapacity,
    checkBwcCapacity,
    checkCameraCapacity: checkFixedCamCapacity,
};
