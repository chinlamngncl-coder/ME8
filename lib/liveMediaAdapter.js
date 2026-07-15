/**
 * Gate C — live media adapter (MVP server step).
 *
 * Dashboard wall stays on pool / FFmpeg (JSMpeg) until Gate D.
 * When lab ZLM is on, start a side relay after pool is live (same as Gate B
 * test bench, but automatic). Relay failure never blocks wall start/stop.
 *
 * Forbidden here: edits to liveStreamPool.js, video-wall.js, SIP invite order.
 */
const log = require('./fleetLog');

function zlmSideEnabled() {
    if (process.env.FM_ZLM_ENABLED !== '1') return false;
    return process.env.FM_LAB_ZLM === '1'
        || process.env.FM_ZLM_PACK === '1'
        || process.env.FM_ZLM_SPAWN === '1';
}

function onPoolLive(camId, opts) {
    if (!zlmSideEnabled()) return;
    const id = String(camId || '').trim();
    if (!id) return;
    let relay;
    try {
        relay = require('./zlmLabRelay');
    } catch (err) {
        log.media.info('live adapter zlm side skipped', { camId: id, reason: 'relay_module', message: err && err.message });
        return;
    }
    Promise.resolve()
        .then(() => relay.start(id, opts || {}))
        .then((st) => {
            log.media.info('live adapter zlm side started', {
                camId: id,
                streamId: st && st.streamId,
                publishing: !!(st && st.publishing),
            });
        })
        .catch((err) => {
            log.media.info('live adapter zlm side skipped', {
                camId: id,
                reason: err && err.message ? String(err.message).slice(0, 200) : 'relay_failed',
            });
        });
}

function onPoolStop(camId) {
    if (!zlmSideEnabled()) return;
    const id = String(camId || '').trim();
    if (!id) return;
    try {
        const relay = require('./zlmLabRelay');
        const out = relay.stop(id);
        if (out && out.stopped) {
            log.media.info('live adapter zlm side stopped', { camId: id });
        }
    } catch (err) {
        log.media.info('live adapter zlm side stop skipped', {
            camId: id,
            reason: err && err.message ? String(err.message).slice(0, 200) : 'stop_failed',
        });
    }
}

async function getDescriptor(camId, ctx) {
    const broker = require('./livePlaybackBroker');
    return broker.getDescriptor(camId, ctx);
}

module.exports = {
    zlmSideEnabled,
    onPoolLive,
    onPoolStop,
    getDescriptor,
};
