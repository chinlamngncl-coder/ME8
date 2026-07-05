/**
 * Tee RTP from liveStreamPool into ZLM openRtpServer ports.
 * FFmpeg/JSMpeg pool path is untouched — parallel ingest for test-zlm.html only.
 */
const dgram = require('dgram');
const zlmRuntime = require('./zlmRuntime');
const log = require('./fleetLog');

/** camId → ingest state */
const ingests = new Map();
let poolRef = null;
let hostRef = '127.0.0.1';
let videoWsPort = 3989;

function wire(liveStreamPool, opts) {
    poolRef = liveStreamPool;
    if (opts && opts.host) hostRef = opts.host;
    if (opts && opts.videoWsPort) videoWsPort = opts.videoWsPort;

    if (!zlmRuntime.isEnabled()) {
        log.media.info('zlm ingest wire skipped — FM_ZLM_ENABLED=0');
        return;
    }

    liveStreamPool.setOnRtpListening((camId) => {
        beginIngest(camId).catch((err) => {
            log.media.warn('zlm ingest begin failed', { camId, message: err.message });
        });
    });

    liveStreamPool.setOnSessionEnd((camId) => {
        endIngest(camId).catch(() => { /* ignore */ });
    });

    log.media.info('zlm ingest wired to liveStreamPool');
}

async function beginIngest(camId) {
    camId = String(camId || '').trim();
    if (!camId || ingests.has(camId)) return;

    const health = await zlmRuntime.healthCheck();
    if (!health.ok) {
        log.media.info('zlm ingest skip — unhealthy', { camId, reason: health.reason });
        return;
    }

    const streamId = zlmRuntime.streamIdForCam(camId);
    let opened;
    try {
        opened = await zlmRuntime.openRtpServer(streamId);
    } catch (err) {
        log.media.warn('zlm openRtpServer', { camId, message: err.message });
        return;
    }

    const forward = dgram.createSocket('udp4');
    let unregister = function () { /* noop */ };

    if (poolRef && poolRef.registerRtpMirror) {
        unregister = poolRef.registerRtpMirror(camId, (msg) => {
            if (!opened || !opened.port) return;
            forward.send(msg, opened.port, '127.0.0.1', (err) => {
                if (err) return;
                const st = ingests.get(camId);
                if (!st) return;
                st.packets += 1;
                if (st.packets === 1) {
                    log.media.info('zlm ingest first rtp forwarded', {
                        camId,
                        streamId,
                        zlmPort: opened.port,
                    });
                }
            });
        });
    }

    ingests.set(camId, {
        camId,
        streamId,
        zlmPort: opened.port,
        forward,
        unregister,
        packets: 0,
        startedAt: Date.now(),
    });

    log.media.info('zlm ingest active', { camId, streamId, zlmPort: opened.port });
}

async function endIngest(camId) {
    camId = String(camId || '').trim();
    const state = ingests.get(camId);
    if (!state) return;

    if (state.unregister) {
        try { state.unregister(); } catch (_) { /* ignore */ }
    }
    if (state.forward) {
        try { state.forward.close(); } catch (_) { /* ignore */ }
    }
    ingests.delete(camId);

    await zlmRuntime.closeRtpServer(state.streamId);
    log.media.info('zlm ingest ended', { camId, streamId: state.streamId, packets: state.packets });
}

function listIngests() {
    return Array.from(ingests.values()).map((s) => ({
        camId: s.camId,
        streamId: s.streamId,
        zlmPort: s.zlmPort,
        packets: s.packets,
        startedAt: s.startedAt,
    }));
}

function buildWsUrl(camId, req) {
    const host = (req && req.headers && req.headers.host)
        ? req.headers.host.split(':')[0]
        : hostRef;
    return 'ws://' + host + ':' + videoWsPort + '/?camId=' + encodeURIComponent(camId);
}

function getPlaybackForCam(camId, req) {
    camId = String(camId || '').trim();
    if (!camId) return { ok: false, error: 'camId required' };

    const ingest = ingests.get(camId);
    const poolLive = poolRef && poolRef.isStreamingForCam && poolRef.isStreamingForCam(camId);
    const zlmOk = zlmRuntime.isHealthy() && ingest;

    if (zlmOk) {
        return {
            ok: true,
            mode: 'zlm',
            camId,
            streamId: ingest.streamId,
            flvUrl: zlmRuntime.flvPlayUrl(ingest.streamId),
            zlmPort: ingest.zlmPort,
            packets: ingest.packets,
            fallbackAvailable: !!poolLive,
        };
    }

    if (poolLive) {
        return {
            ok: true,
            mode: 'ffmpeg',
            camId,
            wsUrl: buildWsUrl(camId, req),
            reason: zlmRuntime.isEnabled() ? 'zlm_unavailable' : 'zlm_disabled',
            zlm: zlmRuntime.getStatus(),
        };
    }

    return {
        ok: true,
        mode: 'idle',
        camId,
        reason: 'no_active_stream',
        zlm: zlmRuntime.getStatus(),
    };
}

module.exports = {
    wire,
    beginIngest,
    endIngest,
    listIngests,
    getPlaybackForCam,
};
