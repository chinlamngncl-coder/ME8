/**
 * Unified device alarm → SOS dashboard pipeline (SOS button, fall alert, message alarms).
 */

let deps = null;

function configure(options) {
    deps = options;
}

function sosPullDelayMs() {
    const n = parseInt(process.env.FM_SOS_COLD_PULL_MS || '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function scheduleServerPull(camId, wasWatching) {
    if (!camId || typeof deps.startVideoForAlarm !== 'function') return;
    const delayMs = sosPullDelayMs();
    deps.log.sip.info('sos server pull scheduled', { camId, delayMs, livePostBye: !!wasWatching });
    setTimeout(function () {
        if (deps.mediaSession.isStreamingForCam(camId)) return;
        if (typeof deps.mediaSession.isInviteInFlight === 'function'
            && deps.mediaSession.isInviteInFlight(camId)) {
            deps.log.sip.info('sos server pull skipped', { camId, reason: 'invite_in_flight' });
            return;
        }
        deps.startVideoForAlarm(camId);
    }, delayMs);
}

function raiseDeviceAlarm(opts) {
    if (!deps) throw new Error('deviceAlarm not configured');
    const camId = opts && opts.cameraId ? String(opts.cameraId) : null;
    if (!camId) return null;

    const alarmKind = opts.alarmKind === 'fall' ? 'fall' : 'sos';
    const alarmTime = opts.alarmTime || new Date().toLocaleTimeString();
    const lat = opts.lat != null ? opts.lat : null;
    const lon = opts.lon != null ? opts.lon : null;
    const source = opts.source || 'sip';

    const wasWatching = deps.mediaSession.isDashboardWatchingCam(camId);
    const streaming = deps.mediaSession.isStreamingForCam(camId);
    const postLiveBye = wasWatching && !streaming;

    deps.mediaSession.clearReinviteOnSos(camId);

    const payloadBase = {
        cameraId: camId,
        time: alarmTime,
        lat,
        lon,
        alreadyLive: wasWatching,
        startVideo: !wasWatching,
        alarmSource: source,
    };
    if (opts.fromLiveBye || postLiveBye) payloadBase.fromLiveBye = true;

    if (deps.sosIncidents.hasOpenAlarm(camId)) {
        deps.log.sip.info('alarm merged with open incident', {
            camId,
            lat,
            lon,
            alarmKind,
            source,
            alarmMethod: opts.alarmMethod,
            alarmType: opts.alarmType,
        });
        const mergeExtra = { refresh: true };
        if (opts.fromLiveBye || postLiveBye) mergeExtra.fromLiveBye = true;
        deps.emitDashboard(deps.buildPayload(payloadBase, alarmKind, mergeExtra));
        if (typeof deps.scheduleCapture === 'function') deps.scheduleCapture(camId);
        if (!streaming) scheduleServerPull(camId, wasWatching);
        return { merged: true, alarmKind };
    }

    deps.log.sip.info('device alarm raised', {
        camId,
        lat,
        lon,
        alarmKind,
        source,
        alarmMethod: opts.alarmMethod,
        alarmType: opts.alarmType,
        liveOnDashboard: wasWatching,
        streaming,
        postLiveBye,
    });

    const incident = deps.sosIncidents.recordAlarm({
        cameraId: camId,
        alarmTime,
        lat,
        lon,
        operatorName: deps.resolveOperatorName(camId),
        alarmKind,
    });

    deps.emitDashboard(deps.buildPayload(Object.assign({ incidentId: incident.id }, payloadBase), alarmKind));

    if (typeof deps.scheduleCapture === 'function') deps.scheduleCapture(camId);
    if (typeof deps.scheduleSnapshot === 'function') deps.scheduleSnapshot(camId);
    if (!streaming) scheduleServerPull(camId, wasWatching);

    if (typeof deps.auditRecord === 'function') {
        deps.auditRecord('alarm.raise', {
            target: camId,
            detail: { alarmKind, source, alarmMethod: opts.alarmMethod, alarmType: opts.alarmType },
        });
    }

    return { incidentId: incident.id, alarmKind };
}

module.exports = {
    configure,
    raiseDeviceAlarm,
};
