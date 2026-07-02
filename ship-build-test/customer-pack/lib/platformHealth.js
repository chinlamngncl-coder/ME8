/**
 * Platform health snapshot for vendor / field-engineer diagnostics.
 */

const fs = require('fs');
const os = require('os');

function collectHealth(deps) {
    const {
        uptimeSec,
        adminServiceStatusSnapshot,
        activeCameraSockets,
        fleetRegistry,
        liveStreamPool,
        platformLicense,
        logFile,
        runtimePorts,
        sipListenerReady,
        traceEnabled,
    } = deps;

    const mem = process.memoryUsage();
    const fleet = typeof fleetRegistry.getDashboardFleet === 'function'
        ? fleetRegistry.getDashboardFleet()
        : [];
    const online = fleet.filter((d) => d.online);
    let logSizeBytes = null;
    let logModifiedAt = null;
    try {
        if (logFile && fs.existsSync(logFile)) {
            const st = fs.statSync(logFile);
            logSizeBytes = st.size;
            logModifiedAt = st.mtime.toISOString();
        }
    } catch (_) { /* ignore */ }

    let license = { valid: false };
    try {
        if (platformLicense && typeof platformLicense.getStatusPublic === 'function') {
            license = platformLicense.getStatusPublic();
        }
    } catch (err) {
        license = { valid: false, error: err.message };
    }

    const ports = typeof adminServiceStatusSnapshot === 'function'
        ? adminServiceStatusSnapshot()
        : {};

    const streaming = typeof liveStreamPool.listCamIds === 'function'
        ? liveStreamPool.listCamIds()
        : [];

    return {
        at: new Date().toISOString(),
        uptimeSec: uptimeSec != null ? uptimeSec : process.uptime(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
            rssMb: Math.round(mem.rss / 1024 / 1024),
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
        services: {
            sipListenerReady: !!sipListenerReady,
            sipPortStatus: ports.sipPortStatus,
            pttPortStatus: ports.pttPortStatus,
            msgWsConnections: activeCameraSockets ? activeCameraSockets.size : 0,
            msgWsDeviceIds: activeCameraSockets
                ? Array.from(activeCameraSockets.keys())
                : [],
        },
        fleet: {
            configured: fleet.length,
            online: online.length,
            offline: fleet.length - online.length,
            deviceIds: fleet.map((d) => ({ id: d.id, online: d.online, name: d.name })),
        },
        media: {
            activeStreams: Array.isArray(streaming) ? streaming.length : 0,
            streamingCamIds: Array.isArray(streaming) ? streaming : [],
        },
        ports: runtimePorts || {},
        log: {
            path: logFile || null,
            sizeBytes: logSizeBytes,
            modifiedAt: logModifiedAt,
        },
        trace: {
            enabled: !!traceEnabled,
            envLocked: process.env.FM_TRACE === '1',
        },
        license,
        moduleMap: [
            { channel: 'SIP', module: 'server.js', topics: 'register, keepalive, DeviceStatus, GPS, alarms' },
            { channel: 'Media', module: 'lib/liveStreamPool.js', topics: 'RTP, ffmpeg, JSMpeg WS' },
            { channel: 'Messaging', module: 'lib/hdaMessageProtocol.js', topics: 'WS :6000 text link' },
            { channel: 'PTT', module: 'lib/pttServer.js', topics: 'group config, audio' },
            { channel: 'Web', module: 'public/js/fleet-ui.js', topics: 'map, pins, device-status' },
        ],
    };
}

module.exports = { collectHealth };
