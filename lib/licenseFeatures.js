/**
 * Commercial feature license gate (air-gap license.lic via licenseManager).
 *
 * All eight commercial modules resolve strictly through
 * licenseManager.hasFeature(name). Lab-open (no license.lic) fail-opens inside
 * hasFeature. Missing / invalid / corrupted licenses fail closed → false.
 *
 * Canonical names:
 *   ptt, redaction, analyticsFr, analyticsAnpr, analyticsWeapon,
 *   videoConference, tacticalOverwatch, cadIntegration
 *
 * Legacy aliases (same engine): fr → analyticsFr, anpr → analyticsAnpr
 *
 * Browser receives plain booleans via GET /api/license-features.
 */
'use strict';

const licenseManager = require('./licenseManager');

const COMMERCIAL_FEATURES = [
    'ptt',
    'redaction',
    'analyticsFr',
    'analyticsAnpr',
    'analyticsWeapon',
    'videoConference',
    'tacticalOverwatch',
    'cadIntegration',
];

const ALIASES = {
    fr: 'analyticsFr',
    anpr: 'analyticsAnpr',
};

function resolveName(name) {
    const raw = String(name || '').trim();
    if (!raw) return '';
    return ALIASES[raw] || raw;
}

function safeHasFeature(featureName) {
    const name = resolveName(featureName);
    if (!name) return false;
    try {
        return !!licenseManager.hasFeature(name);
    } catch (_) {
        return false;
    }
}

function getFeatures() {
    const out = {};
    for (let i = 0; i < COMMERCIAL_FEATURES.length; i++) {
        const key = COMMERCIAL_FEATURES[i];
        out[key] = safeHasFeature(key);
    }
    /* Legacy keys for existing Analytics / Evidence UI */
    out.fr = out.analyticsFr;
    out.anpr = out.analyticsAnpr;
    return out;
}

function isFeatureEnabled(name) {
    return safeHasFeature(name);
}

module.exports = {
    COMMERCIAL_FEATURES,
    getFeatures,
    isFeatureEnabled,
};
