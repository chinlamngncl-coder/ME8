/**
 * Pre/post Fleet voice intercom telemetry — DeviceStatus snapshot + forced query per phase.
 */

const STATUS_WAIT_MS = 15000;

function snapshotTelemetry(fleetRegistry, camId) {
    const rec = fleetRegistry && typeof fleetRegistry.ensure === 'function'
        ? fleetRegistry.ensure(camId)
        : null;
    const tel = (rec && rec.telemetry) || {};
    return {
        recording: tel.recording != null ? String(tel.recording) : null,
        encode: tel.encode != null ? String(tel.encode) : null,
        video: tel.video != null ? String(tel.video) : null,
        online: tel.online != null ? String(tel.online) : null,
        callstate: tel.callstate != null ? String(tel.callstate) : null,
        audio: tel.audio != null ? String(tel.audio) : null,
    };
}

function createVoiceIntercomTelemetry(deps) {
    const watch = new Map();

    function logPhase(camId, phase, profileId, extra) {
        if (!deps || !deps.log || !deps.log.media) return;
        const payload = Object.assign({
            camId,
            phase,
            profile: profileId || null,
            device: snapshotTelemetry(deps.fleetRegistry, camId),
        }, extra || {});
        deps.log.media.info('voice intercom telemetry', payload);
    }

    function requestStatus(camId, phase, profileId) {
        const id = String(camId || '').trim();
        if (!id) return;
        watch.set(id, { phase, profile: profileId || null, at: Date.now() });
        if (typeof deps.queryDeviceStatus === 'function') {
            try {
                deps.queryDeviceStatus(id, { force: true });
            } catch (_) { /* ignore */ }
        }
    }

    function onDeviceStatus(camId, payload, source) {
        const id = String(camId || '').trim();
        if (!id) return false;
        const row = watch.get(id);
        if (!row || Date.now() - row.at > STATUS_WAIT_MS) return false;
        if (!deps || !deps.log || !deps.log.media) {
            watch.delete(id);
            return true;
        }
        deps.log.media.info('voice intercom telemetry device-status', {
            camId: id,
            phase: row.phase,
            profile: row.profile,
            source: source || null,
            recording: payload && payload.recording != null ? String(payload.recording) : null,
            encode: payload && payload.encode != null ? String(payload.encode) : null,
            video: payload && payload.video != null ? String(payload.video) : null,
            online: payload && payload.online != null ? String(payload.online) : null,
            callstate: payload && payload.callstate != null ? String(payload.callstate) : null,
            audio: payload && payload.audio != null ? String(payload.audio) : null,
            deviceTime: payload && payload.deviceTime ? payload.deviceTime : null,
        });
        watch.delete(id);
        return true;
    }

    function clear(camId) {
        if (camId) watch.delete(String(camId).trim());
        else watch.clear();
    }

    return {
        logPhase,
        requestStatus,
        onDeviceStatus,
        clear,
        snapshotTelemetry: (camId) => snapshotTelemetry(deps.fleetRegistry, camId),
    };
}

module.exports = {
    createVoiceIntercomTelemetry,
    snapshotTelemetry,
};
