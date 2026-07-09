'use strict';

/** Per-dashboard-socket viewer ref-count for live video, scoped by UI surface (ops vs command-wall). */
const viewersBySocket = new Map();
const viewersByCam = new Map();
/** VC BWC ingress holds pool SIP/decode alive without a dashboard socket. */
const conferenceRefsByCam = new Map();

function normalizeSurface(surface) {
    const s = String(surface || 'ops').trim().toLowerCase();
    if (s === 'command-wall' || s === 'cw' || s === 'commandwall') return 'command-wall';
    return 'ops';
}

function viewKey(camId, surface) {
    return String(camId) + '\0' + normalizeSurface(surface);
}

function parseViewKey(key) {
    const idx = key.indexOf('\0');
    if (idx < 0) return { camId: key, surface: 'ops' };
    return { camId: key.slice(0, idx), surface: key.slice(idx + 1) };
}

/** Per-socket surfaces holding a viewer ref for one cam (ops vs command-wall). */
function socketSurfacesForCam(socketId, camId) {
    const out = { ops: false, commandWall: false };
    if (!socketId || !camId) return out;
    const want = String(camId);
    const cams = viewersBySocket.get(socketId);
    if (!cams) return out;
    cams.forEach(function (count, key) {
        if (count <= 0) return;
        const parsed = parseViewKey(key);
        if (parsed.camId !== want) return;
        if (parsed.surface === 'command-wall') out.commandWall = true;
        else out.ops = true;
    });
    return out;
}

function ensureSocketMap(socketId) {
    if (!viewersBySocket.has(socketId)) {
        viewersBySocket.set(socketId, new Map());
    }
    return viewersBySocket.get(socketId);
}

function addView(socketId, camId, surface) {
    if (!socketId || !camId) return 0;
    const key = viewKey(camId, surface);
    const cams = ensureSocketMap(socketId);
    /* One ref per socket+cam+surface — duplicate start-video must not inflate count. */
    if (cams.has(key) && cams.get(key) > 0) {
        return viewersByCam.get(camId) || 0;
    }
    cams.set(key, 1);
    const total = (viewersByCam.get(camId) || 0) + 1;
    viewersByCam.set(camId, total);
    return total;
}

function removeView(socketId, camId, surface) {
    if (!socketId || !camId) return viewersByCam.get(camId) || 0;
    const key = viewKey(camId, surface);
    const cams = viewersBySocket.get(socketId);
    if (!cams || !cams.has(key)) return viewersByCam.get(camId) || 0;
    const n = cams.get(key);
    if (n <= 1) cams.delete(key);
    else cams.set(key, n - 1);
    if (cams.size === 0) viewersBySocket.delete(socketId);
    const total = Math.max(0, (viewersByCam.get(camId) || 0) - 1);
    if (total === 0) viewersByCam.delete(camId);
    else viewersByCam.set(camId, total);
    return total;
}

function conferenceRefCount(camId) {
    return conferenceRefsByCam.get(camId) || 0;
}

function addConferenceRef(camId) {
    if (!camId) return 0;
    const total = conferenceRefCount(camId) + 1;
    conferenceRefsByCam.set(camId, total);
    return total + (viewersByCam.get(camId) || 0);
}

function removeConferenceRef(camId) {
    if (!camId) return countForCam(camId);
    const n = conferenceRefCount(camId);
    if (n <= 1) conferenceRefsByCam.delete(camId);
    else conferenceRefsByCam.set(camId, n - 1);
    return countForCam(camId);
}

function countForCam(camId) {
    return (viewersByCam.get(camId) || 0) + conferenceRefCount(camId);
}

/** Diagnostics — per-surface dashboard refs + VC conference refs (logging only). */
function refBreakdownForCam(camId) {
    const want = String(camId || '').trim();
    let ops = 0;
    let commandWall = 0;
    let socketsWithRefs = 0;
    viewersBySocket.forEach(function (cams) {
        let socketHas = false;
        cams.forEach(function (count, key) {
            if (count <= 0) return;
            const parsed = parseViewKey(key);
            if (parsed.camId !== want) return;
            socketHas = true;
            if (parsed.surface === 'command-wall') commandWall += count;
            else ops += count;
        });
        if (socketHas) socketsWithRefs += 1;
    });
    const dashboardTotal = viewersByCam.get(want) || 0;
    const conferenceRefs = conferenceRefCount(want);
    return {
        dashboardTotal: dashboardTotal,
        ops: ops,
        commandWall: commandWall,
        conferenceRefs: conferenceRefs,
        countForCam: dashboardTotal + conferenceRefs,
        socketsWithRefs: socketsWithRefs,
    };
}

/**
 * Read-only snapshot for super-admin / tech diagnostics (no PII beyond dashboard usernames).
 */
function collectTelemetry(io, liveStreamPool) {
    const camSet = new Set();
    viewersByCam.forEach(function (_n, camId) { camSet.add(String(camId)); });
    if (liveStreamPool && typeof liveStreamPool.listCamIds === 'function') {
        liveStreamPool.listCamIds().forEach(function (id) { camSet.add(String(id)); });
    }

    const sockets = io && io.sockets && io.sockets.sockets;
    const cameras = [];
    camSet.forEach(function (camId) {
        const refs = refBreakdownForCam(camId);
        const session = liveStreamPool && typeof liveStreamPool.getSession === 'function'
            ? liveStreamPool.getSession(camId)
            : null;
        const poolActive = !!(liveStreamPool && typeof liveStreamPool.isDashboardWatchingCam === 'function'
            && liveStreamPool.isDashboardWatchingCam(camId));
        const poolStreaming = !!(liveStreamPool && typeof liveStreamPool.isStreamingForCam === 'function'
            && liveStreamPool.isStreamingForCam(camId));
        const watchers = [];
        if (sockets) {
            sockets.forEach(function (sock) {
                const cams = viewersBySocket.get(sock.id);
                if (!cams) return;
                let hasOps = false;
                let hasCommandWall = false;
                cams.forEach(function (count, key) {
                    if (count <= 0) return;
                    const parsed = parseViewKey(key);
                    if (parsed.camId !== camId) return;
                    if (parsed.surface === 'command-wall') hasCommandWall = true;
                    else hasOps = true;
                });
                if (!hasOps && !hasCommandWall) return;
                const user = sock.dashboardUser || null;
                watchers.push({
                    username: user && user.username ? String(user.username) : null,
                    role: user && user.role ? String(user.role) : null,
                    ops: hasOps,
                    commandWall: hasCommandWall,
                });
            });
        }
        cameras.push({
            camId: camId,
            opsRefs: refs.ops,
            commandWallRefs: refs.commandWall,
            conferenceRefs: refs.conferenceRefs,
            dashboardRefs: refs.dashboardTotal,
            totalRefs: refs.countForCam,
            socketsWithRefs: refs.socketsWithRefs,
            poolActive: poolActive,
            poolStreaming: poolStreaming,
            poolWsClients: session && session.wssClients ? session.wssClients.size : 0,
            watchers: watchers,
        });
    });
    cameras.sort(function (a, b) { return a.camId.localeCompare(b.camId); });

    const maxLive = parseInt(process.env.FM_MAX_CONCURRENT_LIVE || '8', 10) || 8;
    return {
        at: new Date().toISOString(),
        maxLive: maxLive,
        activePoolSessions: liveStreamPool && typeof liveStreamPool.countActive === 'function'
            ? liveStreamPool.countActive()
            : 0,
        cameras: cameras,
    };
}

/** Remove every viewer ref for one cam on one dashboard socket (all surfaces). */
function removeAllViewsForSocket(socketId, camId) {
    if (!socketId || !camId) return viewersByCam.get(camId) || 0;
    const cams = viewersBySocket.get(socketId);
    if (!cams) return viewersByCam.get(camId) || 0;
    const want = String(camId);
    let removed = 0;
    const keysToDelete = [];
    cams.forEach((count, key) => {
        const parsed = parseViewKey(key);
        if (parsed.camId !== want) return;
        removed += count;
        keysToDelete.push(key);
    });
    keysToDelete.forEach((key) => cams.delete(key));
    if (cams.size === 0) viewersBySocket.delete(socketId);
    const total = Math.max(0, (viewersByCam.get(camId) || 0) - removed);
    if (total === 0) viewersByCam.delete(camId);
    else viewersByCam.set(camId, total);
    return total;
}

/** Session-wide stop — drop all refs for camId on every socket logged in as username. */
function removeAllViewsForUser(socketsMap, username, camId) {
    if (!username || !camId || !socketsMap) return viewersByCam.get(camId) || 0;
    const want = String(username);
    socketsMap.forEach((sock) => {
        if (!sock || !sock.dashboardUser) return;
        if (String(sock.dashboardUser.username) !== want) return;
        removeAllViewsForSocket(sock.id, camId);
    });
    return viewersByCam.get(camId) || 0;
}

/** Emit video-stream-ready only to sockets that hold a viewer ref for this cam. */
function notifyStreamReady(io, camId) {
    if (!io || !camId) return 0;
    const sockets = io.sockets && io.sockets.sockets;
    if (!sockets) return 0;
    const want = String(camId);
    let sent = 0;
    sockets.forEach((sock) => {
        const cams = viewersBySocket.get(sock.id);
        if (!cams) return;
        const surfaces = new Set();
        cams.forEach((count, key) => {
            if (count <= 0) return;
            const parsed = parseViewKey(key);
            if (parsed.camId !== want) return;
            surfaces.add(parsed.surface);
        });
        surfaces.forEach((surface) => {
            if (sock.connected) {
                sock.emit('video-stream-ready', { camId: want, surface: surface });
                sent += 1;
            }
        });
    });
    return sent;
}

/** Drop all refs for a disconnected dashboard socket; returns camIds that hit zero. */
function releaseSocket(socketId) {
    const cams = viewersBySocket.get(socketId);
    if (!cams) return [];
    const toStop = [];
    const camDeltas = Object.create(null);
    cams.forEach((count, key) => {
        const parsed = parseViewKey(key);
        camDeltas[parsed.camId] = (camDeltas[parsed.camId] || 0) + count;
    });
    Object.keys(camDeltas).forEach((camId) => {
        const prevTotal = viewersByCam.get(camId) || 0;
        const newTotal = Math.max(0, prevTotal - camDeltas[camId]);
        if (newTotal === 0) {
            viewersByCam.delete(camId);
            toStop.push(camId);
        } else {
            viewersByCam.set(camId, newTotal);
        }
    });
    viewersBySocket.delete(socketId);
    return toStop;
}

module.exports = {
    normalizeSurface,
    addView,
    removeView,
    removeAllViewsForSocket,
    removeAllViewsForUser,
    addConferenceRef,
    removeConferenceRef,
    conferenceRefCount,
    countForCam,
    socketSurfacesForCam,
    refBreakdownForCam,
    collectTelemetry,
    notifyStreamReady,
    releaseSocket,
};
