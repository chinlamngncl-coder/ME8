/**
 * Platform license optional modules — canonical shape shared with vendor LicenseIssuer.
 * Must stay in sync with MobilityC2-VENDOR-IMPORTANT/LicenseIssuer/lib/licenseSign.js
 */
const DEFAULT_MODULES = Object.freeze({
    videoConference:  { enabled: false },
    analyticsFace:    { enabled: false, maxSources: 0 },
    analyticsAnpr:    { enabled: false, maxSources: 0 },
    analyticsWeapon:  { enabled: false, maxSources: 0 },
    videoRedaction:   { enabled: false },
    edgeFace:         { enabled: false },
    edgeLpr:          { enabled: false },
});

function parseNonNegativeInt(value, fallback) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
}

function normalizeModules(raw) {
    const m = raw && typeof raw === 'object' ? raw : {};
    const faceMax   = parseNonNegativeInt(m.analyticsFace   && m.analyticsFace.maxSources,   0);
    const anprMax   = parseNonNegativeInt(m.analyticsAnpr   && m.analyticsAnpr.maxSources,   0);
    const weaponMax = parseNonNegativeInt(m.analyticsWeapon && m.analyticsWeapon.maxSources, 0);
    const vcEnabled        = !!(m.videoConference && m.videoConference.enabled);
    const redactionEnabled = !!(m.videoRedaction  && m.videoRedaction.enabled);
    const out = {
        videoConference:  { enabled: vcEnabled },
        analyticsFace:    { enabled: faceMax > 0,   maxSources: faceMax   },
        analyticsAnpr:    { enabled: anprMax > 0,   maxSources: anprMax   },
        analyticsWeapon:  { enabled: weaponMax > 0, maxSources: weaponMax },
        videoRedaction:   { enabled: redactionEnabled },
    };
    /* Optional — omit from signed canonical unless the license already carries them */
    if (m.edgeFace != null || m.edgeLpr != null) {
        out.edgeFace = { enabled: !!(m.edgeFace && (m.edgeFace.enabled === true || m.edgeFace === true)) };
        out.edgeLpr = { enabled: !!(m.edgeLpr && (m.edgeLpr.enabled === true || m.edgeLpr === true)) };
    }
    return out;
}

function resolveModules(modules) {
    if (!modules) return { ...DEFAULT_MODULES };
    return Object.assign({}, DEFAULT_MODULES, normalizeModules(modules));
}

function modulesFromIssueFlags(flags) {
    if (!flags || typeof flags !== 'object') return null;
    const hasAny = flags.videoConference || flags.analyticsFace != null
        || flags.analyticsAnpr != null || flags.analyticsWeapon != null
        || flags.videoRedaction != null
        || flags.edgeFace != null || flags.edgeLpr != null;
    if (!hasAny) return null;
    return normalizeModules({
        videoConference: { enabled: !!flags.videoConference },
        analyticsFace:   { maxSources: flags.analyticsFace },
        analyticsAnpr:   { maxSources: flags.analyticsAnpr },
        analyticsWeapon: { maxSources: flags.analyticsWeapon },
        videoRedaction:  { enabled: !!flags.videoRedaction },
        edgeFace:        { enabled: !!flags.edgeFace },
        edgeLpr:         { enabled: !!flags.edgeLpr },
    });
}

function validateModulesShape(raw) {
    if (raw == null) return { ok: true, modules: null };
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        return { ok: false, error: 'License modules must be an object' };
    }
    const keys = ['videoConference', 'analyticsFace', 'analyticsAnpr', 'analyticsWeapon', 'videoRedaction', 'edgeFace', 'edgeLpr'];
    for (const k of keys) {
        if (raw[k] != null && (typeof raw[k] !== 'object' || Array.isArray(raw[k]))) {
            return { ok: false, error: 'License modules.' + k + ' must be an object' };
        }
    }
    if (raw.videoConference && raw.videoConference.enabled != null
        && typeof raw.videoConference.enabled !== 'boolean') {
        return { ok: false, error: 'License modules.videoConference.enabled must be boolean' };
    }
    if (raw.videoRedaction && raw.videoRedaction.enabled != null
        && typeof raw.videoRedaction.enabled !== 'boolean') {
        return { ok: false, error: 'License modules.videoRedaction.enabled must be boolean' };
    }
    if (raw.edgeFace && raw.edgeFace.enabled != null
        && typeof raw.edgeFace.enabled !== 'boolean') {
        return { ok: false, error: 'License modules.edgeFace.enabled must be boolean' };
    }
    if (raw.edgeLpr && raw.edgeLpr.enabled != null
        && typeof raw.edgeLpr.enabled !== 'boolean') {
        return { ok: false, error: 'License modules.edgeLpr.enabled must be boolean' };
    }
    for (const k of ['analyticsFace', 'analyticsAnpr', 'analyticsWeapon']) {
        if (!raw[k]) continue;
        if (raw[k].maxSources != null && !Number.isFinite(parseInt(raw[k].maxSources, 10))) {
            return { ok: false, error: 'License modules.' + k + '.maxSources must be a number' };
        }
    }
    return { ok: true, modules: normalizeModules(raw) };
}

function publicModulesView(modules) {
    const m = resolveModules(modules);
    return {
        videoConference: { enabled: m.videoConference.enabled },
        analyticsFace:   { enabled: m.analyticsFace.enabled,   maxSources: m.analyticsFace.maxSources   },
        analyticsAnpr:   { enabled: m.analyticsAnpr.enabled,   maxSources: m.analyticsAnpr.maxSources   },
        analyticsWeapon: { enabled: m.analyticsWeapon.enabled, maxSources: m.analyticsWeapon.maxSources },
        videoRedaction:  { enabled: m.videoRedaction.enabled },
        edgeFace:        { enabled: !!(m.edgeFace && m.edgeFace.enabled) },
        edgeLpr:         { enabled: !!(m.edgeLpr && m.edgeLpr.enabled) },
    };
}

module.exports = {
    DEFAULT_MODULES,
    normalizeModules,
    resolveModules,
    modulesFromIssueFlags,
    validateModulesShape,
    publicModulesView,
};
