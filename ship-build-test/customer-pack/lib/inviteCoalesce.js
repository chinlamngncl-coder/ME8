'use strict';

/** Per-cam coalesce: duplicate start-video while invite pending or pool not ready yet. */
const pendingReadySockets = new Map();
const deferredStarts = new Map();
const coalesceCounts = new Map();

function normCamId(camId) {
    return camId ? String(camId).trim() : '';
}

function trackPendingSocket(camId, socket) {
    const id = normCamId(camId);
    if (!id || !socket) return;
    if (!pendingReadySockets.has(id)) pendingReadySockets.set(id, new Set());
    pendingReadySockets.get(id).add(socket);
}

function pendingCount(camId) {
    const set = pendingReadySockets.get(normCamId(camId));
    return set ? set.size : 0;
}

function removeSocket(socket) {
    if (!socket) return;
    pendingReadySockets.forEach((set) => {
        set.delete(socket);
    });
}

function clearPending(camId) {
    pendingReadySockets.delete(normCamId(camId));
}

function flushPendingReady(camId, payload) {
    const id = normCamId(camId);
    const set = pendingReadySockets.get(id);
    if (!set || !set.size) return 0;
    const msg = payload || { camId: id };
    let sent = 0;
    set.forEach((sock) => {
        if (sock && sock.connected) {
            sock.emit('video-stream-ready', msg);
            sent += 1;
        }
    });
    pendingReadySockets.delete(id);
    return sent;
}

function flushPendingFailed(camId, payload) {
    const id = normCamId(camId);
    const set = pendingReadySockets.get(id);
    if (!set || !set.size) return 0;
    const msg = payload || { camId: id };
    let sent = 0;
    set.forEach((sock) => {
        if (sock && sock.connected) {
            sock.emit('video-stream-failed', msg);
            sent += 1;
        }
    });
    pendingReadySockets.delete(id);
    return sent;
}

function cancelDeferred(camId) {
    const id = normCamId(camId);
    const entry = deferredStarts.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    deferredStarts.delete(id);
}

function cancelAllDeferred() {
    deferredStarts.forEach((entry) => {
        if (entry.timer) clearTimeout(entry.timer);
    });
    deferredStarts.clear();
}

function scheduleDeferredStart(camId, delayMs, fn) {
    const id = normCamId(camId);
    if (!id || typeof fn !== 'function') return;
    const waitMs = Math.max(25, delayMs || 0);
    const existing = deferredStarts.get(id);
    if (existing) {
        existing.fn = fn;
        return;
    }
    const timer = setTimeout(() => {
        deferredStarts.delete(id);
        try { fn(); } catch (_) { /* ignore */ }
    }, waitMs);
    if (typeof timer.unref === 'function') timer.unref();
    deferredStarts.set(id, { timer, fn });
}

function bumpCoalesce(camId) {
    const id = normCamId(camId);
    const n = (coalesceCounts.get(id) || 0) + 1;
    coalesceCounts.set(id, n);
    return n;
}

function takeCoalesceCount(camId) {
    const id = normCamId(camId);
    const n = coalesceCounts.get(id) || 0;
    coalesceCounts.delete(id);
    return n;
}

module.exports = {
    trackPendingSocket,
    pendingCount,
    removeSocket,
    clearPending,
    flushPendingReady,
    flushPendingFailed,
    cancelDeferred,
    cancelAllDeferred,
    scheduleDeferredStart,
    bumpCoalesce,
    takeCoalesceCount,
};
