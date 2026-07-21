/**

 * Live playback descriptor broker — single JSON engine choice for lab + future UI.

 * + MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1 — WVP/ZLM FLV for classic frozen UI (no SIP).

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



async function tryWvpVideoHandoff(camId, ctx) {

    let handoff;

    try {

        handoff = require('./wvpVideoHandoff');

    } catch (_) {

        return null;

    }

    if (!handoff.isHandoffEnabled || !handoff.isHandoffEnabled()) return null;

    const publicHost = (ctx && ctx.publicHost)

        || process.env.FM_WVP_STREAM_HOST

        || process.env.HOST

        || '192.168.1.38';

    const out = await handoff.ensurePlay(camId, { publicHost });

    if (!out || !out.ok || !out.flvUrl) {

        log.media.info('live broker wvp handoff miss', {

            camId,

            reason: (out && out.reason) || 'fail',

            path: 'backend-video-wvp-handoff-v1',

        });

        return null;

    }

    return {

        ok: true,

        engine: 'zlm',

        camId,

        flvUrl: out.flvUrl,

        source: 'wvp-video-handoff',

        reused: !!out.reused,

        fallbackAvailable: false,

    };

}



/**

 * @param {string} camId

 * @param {object} ctx — { req, publicHost, videoWsPort, isStreamingForCam, relay, zlm }

 */

async function getDescriptor(camId, ctx) {

    camId = String(camId || '').trim();

    if (!camId) {

        return { ok: false, error: 'camId required' };

    }



    const wvpDesc = await tryWvpVideoHandoff(camId, ctx);

    if (wvpDesc) return wvpDesc;



    const poolLive = ctx && ctx.isStreamingForCam ? !!ctx.isStreamingForCam(camId) : false;

    const zlmHealthy = ctx && ctx.zlm && ctx.zlm.isHealthy ? ctx.zlm.isHealthy() : zlmIngestLab.isHealthy();

    const relay = ctx && ctx.relay;

    const relayState = relay && relay.getState ? relay.getState(camId) : null;

    const relayPublishing = !!(relayState && relayState.publishing);



    if (zlmHealthy && relayPublishing) {

        const streamId = relayState.streamId || zlmIngestLab.streamIdForCam(camId);

        const flvReady = await zlmIngestLab.waitForStreamPublished(streamId, 5000);

        if (!flvReady) {

            log.media.info('live broker fallback', { camId, reason: 'zlm_flv_not_ready', streamId });

            if (poolLive) {

                return {

                    ok: true,

                    engine: 'ffmpeg',

                    camId,

                    wsUrl: buildWsUrl(camId, ctx),

                    reason: 'zlm_flv_not_ready',

                    zlm: zlmIngestLab.getStatus(),

                    relay: relayState || null,

                };

            }

            return {

                ok: true,

                engine: 'idle',

                camId,

                reason: 'zlm_flv_not_ready',

                hint: 'ZLM relay active but FLV not registered yet — retry Play in a few seconds.',

                zlm: zlmIngestLab.getStatus(),

                relay: relayState || null,

            };

        }

        return {

            ok: true,

            engine: 'zlm',

            camId,

            streamId,

            flvUrl: zlmIngestLab.flvPlayUrl(streamId, ctx),

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


