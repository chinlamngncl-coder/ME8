/**
 * Express middleware — air-gap license.lic feature flags + camera capacity.
 * Pair with lib/licenseManager.js (Task 3.4).
 */
'use strict';

const licenseManager = require('./licenseManager');

/**
 * Require features[featureName] === true (lab-open fail-open inside hasFeature).
 * Usage: app.post('/path', requireFeature('ptzControl'), handler)
 */
function requireFeature(featureName) {
    const name = String(featureName || '').trim();
    return function licenseRequireFeature(req, res, next) {
        if (licenseManager.hasFeature(name)) return next();
        return res.status(403).json({
            ok: false,
            error: 'ERR_LIC_FEATURE_DENIED',
            code: 'ERR_LIC_FEATURE_DENIED',
            feature: name,
            message: 'This feature is not enabled on the current license.',
        });
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
        /* current + addCount <= max  ↔  checkFixedCamLimit(current + addCount - 1) */
        const probe = current + addCount - 1;
        const check = licenseManager.checkFixedCamLimit(probe);
        if (check.allowed) return next();
        return res.status(403).json({
            ok: false,
            error: 'ERR_LIC_CAM_LIMIT_EXCEEDED',
            code: 'ERR_LIC_CAM_LIMIT_EXCEEDED',
            message: 'Fixed camera license limit reached. Upgrade license to add more cameras.',
            current: current,
            addCount: addCount,
            max: check.max,
            remaining: check.remaining,
        });
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
        const check = licenseManager.checkBwcLimit(total - 1);
        if (check.allowed) return next();
        return res.status(403).json({
            ok: false,
            error: 'ERR_LIC_BWC_LIMIT_EXCEEDED',
            code: 'ERR_LIC_BWC_LIMIT_EXCEEDED',
            message: 'BWC device license limit reached. Upgrade license to register more devices.',
            total: total,
            max: check.max,
            remaining: check.remaining,
        });
    };
}

module.exports = {
    requireFeature,
    checkFixedCamCapacity,
    checkBwcCapacity,
    checkCameraCapacity: checkFixedCamCapacity,
};
