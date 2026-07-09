/**
 * Advanced feature license gate.
 *
 * Reads feature flags from the platform license (storage/platform-license.json).
 * Falls back to FM_LICENSE_* env flags for lab/bench use only when the license
 * has no modules field (e.g. a "Core Only" base license).
 *
 * Feature map from license modules:
 *   analyticsFace.enabled    → fr
 *   analyticsAnpr.enabled    → anpr
 *   videoRedaction.enabled   → redaction
 *
 * The browser receives only plain booleans via GET /api/license-features.
 */

const platformLicense = require('./platformLicense');

function _envFlag(key) {
    const v = String(process.env[key] || '').trim();
    return v === '1' || v.toLowerCase() === 'true';
}

function getFeatures() {
    const entitlements = platformLicense.getEntitlements();
    const mods = entitlements && entitlements.modules;

    // If the license explicitly carries module flags, use them.
    if (mods && (
        mods.analyticsFace.maxSources > 0 ||
        mods.analyticsAnpr.maxSources  > 0 ||
        mods.videoRedaction.enabled    ||
        mods.analyticsFace.enabled     ||
        mods.analyticsAnpr.enabled
    )) {
        return {
            fr:        mods.analyticsFace.enabled,
            anpr:      mods.analyticsAnpr.enabled,
            redaction: mods.videoRedaction.enabled,
        };
    }

    // No module entitlements in the license — fall back to env flags.
    // This covers: lab bench, "Core Only" licenses, missing license in non-required mode.
    return {
        fr:        _envFlag('FM_LICENSE_FR'),
        anpr:      _envFlag('FM_LICENSE_ANPR'),
        redaction: _envFlag('FM_LICENSE_REDACTION'),
    };
}

function isFeatureEnabled(name) {
    return getFeatures()[name] === true;
}

module.exports = { getFeatures, isFeatureEnabled };
