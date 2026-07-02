/**
 * HQ hold-PTT downlink policy — model default (UB-X → voice), per-cam override, env legacy list.
 */
const PTT_VOICE_MODEL_PREFIXES = String(process.env.FM_PTT_VOICE_MODEL_PREFIXES || 'UB')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const PTT_VOICE_OVERRIDE_CAMIDS = String(process.env.FM_PTT_VOICE_FALLBACK_CAMIDS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const VALID_MODES = new Set(['auto', 'ptt', 'voice']);

function normalizeMode(mode) {
    const m = String(mode || 'auto').trim().toLowerCase();
    return VALID_MODES.has(m) ? m : 'auto';
}

function normalizeSettingsPtt(settings) {
    const ptt = (settings && settings.ptt) || {};
    const downlinkByCamId = {};
    if (ptt.downlinkByCamId && typeof ptt.downlinkByCamId === 'object') {
        Object.keys(ptt.downlinkByCamId).forEach((camId) => {
            if (!camId) return;
            downlinkByCamId[String(camId).trim()] = normalizeMode(ptt.downlinkByCamId[camId]);
        });
    }
    return {
        modelVoicePrefixes: Array.isArray(ptt.modelVoicePrefixes) && ptt.modelVoicePrefixes.length
            ? ptt.modelVoicePrefixes.map(String).filter(Boolean)
            : PTT_VOICE_MODEL_PREFIXES.slice(),
        downlinkByCamId,
    };
}

function modelHintForCam(camId, deps) {
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

function modelPrefersVoice(modelHint, prefixes) {
    const u = String(modelHint || '').trim().toUpperCase();
    if (!u) return false;
    return (prefixes || PTT_VOICE_MODEL_PREFIXES).some((p) => {
        const pref = String(p || '').trim().toUpperCase();
        return pref && u.startsWith(pref);
    });
}

function resolveUseVoice(camId, settings, deps) {
    const id = String(camId || '').trim();
    if (!id) return false;
    const ptt = normalizeSettingsPtt(settings);
    const mode = ptt.downlinkByCamId[id] || 'auto';
    if (mode === 'voice') return true;
    if (mode === 'ptt') return false;
    if (PTT_VOICE_OVERRIDE_CAMIDS.indexOf(id) >= 0) return true;
    return modelPrefersVoice(modelHintForCam(id, deps), ptt.modelVoicePrefixes);
}

function buildClientPayload(settings, deps) {
    const ptt = normalizeSettingsPtt(settings);
    const deviceModels = {};
    const downlinkResolved = {};
    const camIds = new Set();
    if (deps && typeof deps.listConfiguredCamIds === 'function') {
        deps.listConfiguredCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    if (deps && typeof deps.listOnlinePttCamIds === 'function') {
        deps.listOnlinePttCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    camIds.forEach((camId) => {
        const hint = modelHintForCam(camId, deps);
        if (hint) deviceModels[camId] = hint;
        downlinkResolved[camId] = resolveUseVoice(camId, settings, deps);
    });
    return {
        modelVoicePrefixes: ptt.modelVoicePrefixes.slice(),
        downlinkByCamId: Object.assign({}, ptt.downlinkByCamId),
        deviceModels,
        downlinkResolved,
        voiceOverrideCamIds: PTT_VOICE_OVERRIDE_CAMIDS.slice(),
    };
}

function syncDownlinkFromDevices(devices, settings) {
    const next = Object.assign({}, settings || {});
    const ptt = normalizeSettingsPtt(next);
    const map = Object.assign({}, ptt.downlinkByCamId);
    (devices || []).forEach((d) => {
        if (!d || !d.deviceId) return;
        const id = String(d.deviceId).trim();
        if (d.pttDownlinkMode != null && String(d.pttDownlinkMode).trim()) {
            map[id] = normalizeMode(d.pttDownlinkMode);
        }
    });
    next.ptt = {
        modelVoicePrefixes: ptt.modelVoicePrefixes,
        downlinkByCamId: map,
    };
    return next;
}

module.exports = {
    normalizeMode,
    normalizeSettingsPtt,
    resolveUseVoice,
    buildClientPayload,
    syncDownlinkFromDevices,
    PTT_VOICE_MODEL_PREFIXES,
    PTT_VOICE_OVERRIDE_CAMIDS,
};
