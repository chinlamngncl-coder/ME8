/**
 * SOS live-video invite queue — max 6 concurrent streams; FIFO for the rest.
 */
const log = require('./fleetLog');

const MAX_SOS_LIVE = 6;
const queue = [];
const pending = new Set();

let deps = null;
let ioRef = null;

function configure(options) {
    deps = options || {};
}

function setIo(io) {
    ioRef = io;
}

function emitUpdate() {
    if (!ioRef) return;
    ioRef.emit('sos-queue-update', getSnapshot());
}

function getSnapshot() {
    const pool = deps && deps.liveStreamPool;
    const activeStreams = pool ? pool.listCamIds().filter((id) => pool.isStreamingForCam(id)) : [];
    return {
        maxLive: MAX_SOS_LIVE,
        active: activeStreams.slice(),
        queued: queue.slice(),
        pending: [...pending],
        slotsUsed: activeStreams.length,
        slotsFree: Math.max(0, MAX_SOS_LIVE - activeStreams.length),
    };
}

function isQueued(camId) {
    return queue.includes(camId) || pending.has(camId);
}

function removeFromQueue(camId) {
    const idx = queue.indexOf(camId);
    if (idx >= 0) queue.splice(idx, 1);
    pending.delete(camId);
}

function slotsFree() {
    const pool = deps && deps.liveStreamPool;
    if (!pool) return MAX_SOS_LIVE;
    return Math.max(0, MAX_SOS_LIVE - pool.countActive());
}

function tryStartNext() {
    if (!deps || !deps.startVideoForSosAlarm) return;
    while (queue.length && slotsFree() > 0) {
        const camId = queue.shift();
        if (!camId) continue;
        if (deps.dashboardVideo && deps.dashboardVideo.isStreamingForCam(camId)) {
            pending.delete(camId);
            continue;
        }
        pending.add(camId);
        log.media.info('sos queue starting', { camId, slotsFree: slotsFree() });
        deps.startVideoForSosAlarm(camId);
        emitUpdate();
        return;
    }
    emitUpdate();
}

/** Request live video for an SOS cam — starts immediately or queues. */
function requestVideo(camId) {
    camId = camId ? String(camId).trim() : '';
    if (!camId) return;
    if (deps && deps.dashboardVideo && deps.dashboardVideo.isStreamingForCam(camId)) {
        removeFromQueue(camId);
        emitUpdate();
        return;
    }
    if (queue.includes(camId) || pending.has(camId)) {
        emitUpdate();
        return;
    }
    if (slotsFree() > 0) {
        pending.add(camId);
        log.media.info('sos queue immediate', { camId });
        deps.startVideoForSosAlarm(camId);
        emitUpdate();
        return;
    }
    queue.push(camId);
    log.media.info('sos queue enqueued', { camId, position: queue.length });
    emitUpdate();
}

function onStreamStarted(camId) {
    camId = camId ? String(camId).trim() : '';
    if (!camId) return;
    pending.delete(camId);
    removeFromQueue(camId);
    if (deps && deps.sosInviteLock) deps.sosInviteLock.release(camId, 'streaming');
    emitUpdate();
}

function onStreamStopped(camId) {
    camId = camId ? String(camId).trim() : '';
    if (!camId) return;
    pending.delete(camId);
    removeFromQueue(camId);
    tryStartNext();
}

function onInviteFailed(camId) {
    camId = camId ? String(camId).trim() : '';
    if (!camId) return;
    pending.delete(camId);
    const idx = queue.indexOf(camId);
    if (idx >= 0) queue.splice(idx, 1);
    emitUpdate();
    tryStartNext();
}

function clearForCam(camId) {
    camId = camId ? String(camId).trim() : '';
    if (!camId) return;
    removeFromQueue(camId);
    emitUpdate();
}

module.exports = {
    configure,
    setIo,
    MAX_SOS_LIVE,
    getSnapshot,
    requestVideo,
    onStreamStarted,
    onStreamStopped,
    onInviteFailed,
    clearForCam,
    isQueued,
    tryStartNext,
};
