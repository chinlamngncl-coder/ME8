/**
 * Fleet voice path — broadcast (camera dial-back) vs outbound Talk intercom (platform INVITE).
 * UB-X class BWCs default to outbound Talk; others default to SIP Broadcast MESSAGE.
 */
const OUTBOUND_MODEL_PREFIXES = String(process.env.FM_VOICE_OUTBOUND_MODEL_PREFIXES
    || process.env.FM_PTT_VOICE_MODEL_PREFIXES || 'UB')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

function parseCamIdList(raw) {
    return new Set(String(raw || '')
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean));
}

const BROADCAST_CAMIDS = parseCamIdList(process.env.FM_VOICE_BROADCAST_CAMIDS || '');
const OUTBOUND_CAMIDS = parseCamIdList(process.env.FM_VOICE_OUTBOUND_INTERCOM_CAMIDS || '');

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

function modelPrefersOutbound(hint, prefixes) {
    const u = String(hint || '').trim().toUpperCase();
    if (!u) return false;
    return (prefixes || OUTBOUND_MODEL_PREFIXES).some((p) => {
        const pref = String(p || '').trim().toUpperCase();
        return pref && u.startsWith(pref);
    });
}

/** @returns {'broadcast'|'outbound-intercom'} */
function resolveFleetVoicePath(camId, deps) {
    const id = String(camId || '').trim();
    if (!id) return 'broadcast';
    if (BROADCAST_CAMIDS.has(id)) return 'broadcast';
    if (OUTBOUND_CAMIDS.has(id)) return 'outbound-intercom';
    if (modelPrefersOutbound(modelHintForCam(id, deps), OUTBOUND_MODEL_PREFIXES)) {
        return 'outbound-intercom';
    }
    return 'broadcast';
}

function buildClientPayload(deps) {
    const profiles = {};
    const camIds = new Set();
    if (deps && typeof deps.listConfiguredCamIds === 'function') {
        deps.listConfiguredCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    if (deps && typeof deps.listOnlinePttCamIds === 'function') {
        deps.listOnlinePttCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    if (deps && typeof deps.listOnlineCamIds === 'function') {
        deps.listOnlineCamIds().forEach((id) => { if (id) camIds.add(String(id).trim()); });
    }
    camIds.forEach((camId) => {
        profiles[camId] = resolveFleetVoicePath(camId, deps);
    });
    return {
        voiceCallProfiles: profiles,
        outboundModelPrefixes: OUTBOUND_MODEL_PREFIXES.slice(),
        broadcastCamIds: [...BROADCAST_CAMIDS],
        outboundCamIds: [...OUTBOUND_CAMIDS],
    };
}

module.exports = {
    resolveFleetVoicePath,
    buildClientPayload,
    OUTBOUND_MODEL_PREFIXES,
};
