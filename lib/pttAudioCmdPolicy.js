/**
 * HQ→BWC PTT TCP audio frame dwCMD (4 legacy vs 130 modern).
 * Separate from pttDownlinkPolicy (hold-PTT voice call vs PTT TCP path).
 */
const CMD_LEGACY = 4;
const CMD_MODERN = 130;

const FLEET_CMD_MODE = String(process.env.FM_PTT_DOWNLINK_CMD || 'auto').trim().toLowerCase();
const ENV_LEGACY_CAMIDS = new Set(
    String(process.env.FM_PTT_DOWNLINK_LEGACY_CAMIDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);
const MODEL_LEGACY_PREFIXES = String(
    process.env.FM_PTT_AUDIO_CMD_MODEL_PREFIXES
    || process.env.FM_PTT_VOICE_MODEL_PREFIXES
    || 'UB',
)
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

const VALID_MODES = new Set(['auto', 'legacy', 'modern']);

function normalizeMode(mode) {
    const m = String(mode || 'auto').trim().toLowerCase();
    if (m === '4') return 'legacy';
    if (m === '130') return 'modern';
    return VALID_MODES.has(m) ? m : 'auto';
}

function fleetForcedMode() {
    if (FLEET_CMD_MODE === 'legacy' || FLEET_CMD_MODE === '4') return 'legacy';
    if (FLEET_CMD_MODE === '130' || FLEET_CMD_MODE === 'modern') return 'modern';
    return null;
}

function normalizeSettings(settings) {
    const ptt = (settings && settings.ptt) || {};
    const audioCmdByCamId = {};
    if (ptt.audioCmdByCamId && typeof ptt.audioCmdByCamId === 'object') {
        Object.keys(ptt.audioCmdByCamId).forEach((camId) => {
            if (!camId) return;
            audioCmdByCamId[String(camId).trim()] = normalizeMode(ptt.audioCmdByCamId[camId]);
        });
    }
    return {
        modelLegacyPrefixes: Array.isArray(ptt.modelLegacyPrefixes) && ptt.modelLegacyPrefixes.length
            ? ptt.modelLegacyPrefixes.map(String).filter(Boolean)
            : MODEL_LEGACY_PREFIXES.slice(),
        audioCmdByCamId,
    };
}

function modelHintForCam(camId, loginUser, deps) {
    if (loginUser) return String(loginUser);
    if (!camId || !deps) return '';
    if (typeof deps.getPttLoginUser === 'function') {
        const u = deps.getPttLoginUser(camId);
        if (u) return String(u);
    }
    if (typeof deps.getBwcUserName === 'function') {
        const u = deps.getBwcUserName(camId);
        if (u) return String(u);
    }
    return '';
}

function modelPrefersLegacy(hint, prefixes) {
    const u = String(hint || '').trim().toUpperCase();
    if (!u) return false;
    return (prefixes || MODEL_LEGACY_PREFIXES).some((p) => {
        const pref = String(p || '').trim().toUpperCase();
        return pref && u.startsWith(pref);
    });
}

function deviceModeForCam(camId, deps) {
    const id = String(camId || '').trim();
    if (!id || !deps) return 'auto';
    const map = deps.audioCmdByCamId;
    if (map && map[id]) return normalizeMode(map[id]);
    return 'auto';
}

/**
 * Resolve dwCMD for HQ→field PTT audio.
 * Priority: fleet force → per-BWC legacy/modern → learned uplink → env legacy list → model prefix → 130.
 */
function resolveDwCmd(ctx, deps) {
    const fleet = fleetForcedMode();
    if (fleet === 'legacy') return CMD_LEGACY;
    if (fleet === 'modern') return CMD_MODERN;

    const camId = String((ctx && ctx.camId) || '').trim();
    const deviceMode = deviceModeForCam(camId, deps);
    if (deviceMode === 'legacy') return CMD_LEGACY;
    if (deviceMode === 'modern') return CMD_MODERN;

    const learned = ctx && ctx.learnedCmd;
    if (learned === CMD_LEGACY || learned === CMD_MODERN) return learned;
    if (camId && ENV_LEGACY_CAMIDS.has(camId)) return CMD_LEGACY;

    const prefixes = (deps && deps.modelLegacyPrefixes) || MODEL_LEGACY_PREFIXES;
    const hint = modelHintForCam(camId, ctx && ctx.loginUser, deps);
    if (modelPrefersLegacy(hint, prefixes)) return CMD_LEGACY;

    return CMD_MODERN;
}

function syncFromDevices(devices, settings) {
    const next = Object.assign({}, settings || {});
    const ptt = normalizeSettings(next);
    const map = Object.assign({}, ptt.audioCmdByCamId);
    (devices || []).forEach((d) => {
        if (!d || !d.deviceId) return;
        const id = String(d.deviceId).trim();
        if (d.pttAudioCmdMode != null && String(d.pttAudioCmdMode).trim()) {
            map[id] = normalizeMode(d.pttAudioCmdMode);
        }
    });
    next.ptt = Object.assign({}, next.ptt || {}, {
        modelLegacyPrefixes: ptt.modelLegacyPrefixes,
        audioCmdByCamId: map,
    });
    return next;
}

function buildResolvedMap(deps) {
    const out = {};
    const camIds = new Set();
    if (deps && typeof deps.listConfiguredCamIds === 'function') {
        deps.listConfiguredCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    if (deps && typeof deps.listOnlinePttCamIds === 'function') {
        deps.listOnlinePttCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    camIds.forEach((camId) => {
        out[camId] = resolveDwCmd({ camId, loginUser: null, learnedCmd: null }, deps);
    });
    return out;
}

module.exports = {
    CMD_LEGACY,
    CMD_MODERN,
    normalizeMode,
    normalizeSettings,
    resolveDwCmd,
    syncFromDevices,
    buildResolvedMap,
    ENV_LEGACY_CAMIDS,
    MODEL_LEGACY_PREFIXES,
};
