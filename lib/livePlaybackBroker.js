/**
 * Live playback descriptor broker — single JSON engine choice for lab + future UI.
 * Read-only pool queries only; never starts SIP or RTP.
 */
const zlmIngestLab = require('./zlmIngestLab');
const log = require('./fleetLog');

function buildWsUrl(camId, ctx) {
    const req = ctx && ctx.req;
    const host = (req && req.headers && req.headers.host)
        ? req.headers.host.split(':')[0]
        : (ctx && ctx.publicHost) || '127.0.0.1';
    const port = (ctx && ctx.videoWsPort) || parseInt(process.env.FM_VIDEO_WS_PORT || '3989', 10);
    return 'ws://' + host + ':' + port + '/?camId=' + encodeURIComponent(camId);
}

/**
 * @param {string} camId
 * @param {object} ctx — { req, publicHost, videoWsPort, isStreamingForCam, relay, zlm }
 */
function getDescriptor(camId, ctx) {
    camId = String(camId || '').trim();
    if (!camId) {
        return { ok: false, error: 'camId required' };
    }

    const poolLive = ctx && ctx.isStreamingForCam ? !!ctx.isStreamingForCam(camId) : false;
    const zlmHealthy = ctx && ctx.zlm && ctx.zlm.isHealthy ? ctx.zlm.isHealthy() : zlmIngestLab.isHealthy();
    const relay = ctx && ctx.relay;
    const relayState = relay && relay.getState ? relay.getState(camId) : null;
    const relayPublishing = !!(relayState && relayState.publishing);

    if (zlmHealthy && relayPublishing) {
        const streamId = relayState.streamId || zlmIngestLab.streamIdForCam(camId);
        return {
            ok: true,
            engine: 'zlm',
            camId,
            streamId,
            flvUrl: zlmIngestLab.flvPlayUrl(streamId),
            relayBytes: relayState.bytes || 0,
            fallbackAvailable: poolLive,
        };
    }

    if (poolLive) {
        const reason = !zlmIngestLab.isEnabled()
            ? 'zlm_disabled'
            : (!zlmHealthy ? 'zlm_unhealthy' : 'relay_inactive');
        if (reason !== 'zlm_disabled') {
            log.media.info('live broker fallback', { camId, reason });
        }
        return {
            ok: true,
            engine: 'ffmpeg',
            camId,
            wsUrl: buildWsUrl(camId, ctx),
            reason,
            zlm: zlmIngestLab.getStatus(),
            relay: relayState || null,
        };
    }

    return {
        ok: true,
        engine: 'idle',
        camId,
        reason: 'no_active_stream',
        hint: 'Start live on the dashboard wall first, then Play on the ZLM test bench.',
        zlm: zlmIngestLab.getStatus(),
        relay: relayState || null,
    };
}

module.exports = {
    getDescriptor,
    buildWsUrl,
};
