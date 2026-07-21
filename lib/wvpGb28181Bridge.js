/**
 * MOB-APPLY-WVP-GB28181-TRANSLATION-BRIDGE
 * + MOB-APPLY-WVP-BACKEND-TRANSLATION-AND-TCP
 * + MOB-ARCH-WVP-NATIVE-WEBHOOK-INTEGRATION
 * Maps WVP gateway ↔ ME8 Master (no frontend).
 *
 * Inbound:  HTTP event bus /api/lab/wvp/events → raiseDeviceAlarm / ptt-rx-state
 * Outbound: Socket.IO ptt-start → WVP REST /api/play/broadcast (not Fleet SIP INVITE)
 */
'use strict';

const wvpLab = require('./wvpLabClient');
const log = require('./fleetLog');

/** Socket.IO event names the Ops dashboard already listens for */
const SOCKET_EVENTS = {
    sosAlarm: 'sos-alarm',
    pttRxState: 'ptt-rx-state',
    pttRxAudio: 'ptt-rx-audio',
    pttTalkState: 'ptt-talk-state',
    pttStart: 'ptt-start',
    pttStop: 'ptt-stop',
    pttAudio: 'ptt-audio',
};

/**
 * @param {string} deviceId
 * @returns {Promise<string>}
 */
async function resolveChannelId(deviceId) {
    const did = String(deviceId || '').trim();
    if (!did) return '';
    try {
        const page = await wvpLab.listChannels(did);
        const first = page && Array.isArray(page.list) ? page.list[0] : null;
        if (first) {
            return String(first.channelId || first.deviceId || did).trim() || did;
        }
    } catch (err) {
        log.ptt.warn('wvp channel resolve failed', {
            camId: did,
            message: err && err.message ? err.message : String(err),
        });
    }
    return did;
}

/**
 * WVP audio broadcast (GB Broadcast → device audio INVITE). Not a video Play INVITE.
 * @param {string} deviceId
 * @param {object} [opts]
 * @param {string} [opts.channelId]
 * @param {boolean} [opts.broadcastMode]
 */
async function startAudioBroadcast(deviceId, opts) {
    opts = opts || {};
    if (!wvpLab.isEnabled()) {
        return { ok: false, reason: 'FM_LAB_WVP=0' };
    }
    const did = String(deviceId || '').trim();
    if (!did) return { ok: false, reason: 'deviceId_required' };
    const cid = String(opts.channelId || '').trim() || await resolveChannelId(did);
    return wvpLab.startAudioBroadcast(did, cid, {
        broadcastMode: opts.broadcastMode !== false,
    });
}

async function stopAudioBroadcast(deviceId, opts) {
    opts = opts || {};
    if (!wvpLab.isEnabled()) {
        return { ok: false, reason: 'FM_LAB_WVP=0' };
    }
    const did = String(deviceId || '').trim();
    if (!did) return { ok: false, reason: 'deviceId_required' };
    const cid = String(opts.channelId || '').trim() || await resolveChannelId(did);
    return wvpLab.stopAudioBroadcast(did, cid);
}

/**
 * MOB-APPLY-WVP-GB28181-TRANSLATION-BRIDGE
 * + MOB-ARCH-WVP-NATIVE-WEBHOOK-INTEGRATION
 * Outbound talk: WVP REST /api/play/broadcast (native audio API) — never Fleet SIP INVITE.
 * Fan-out every camId; Fleet TCP PCM still used when device is on 29201.
 */
async function fanOutPttStartViaWvp(camIds, deps) {
    deps = deps || {};
    const ids = (Array.isArray(camIds) ? camIds : []).map(String).filter(Boolean);
    const isPttOnline = typeof deps.isPttOnline === 'function'
        ? deps.isPttOnline
        : function () { return false; };

    const pttOnline = ids.filter((id) => isPttOnline(id));
    const wvpStarted = [];
    const wvpFailed = [];

    if (!ids.length) {
        return { pttOnline, wvpStarted, wvpFailed };
    }

    if (!wvpLab.isEnabled()) {
        return { pttOnline, wvpStarted, wvpFailed };
    }

    /* Iterate entire camIds[] — WVP SIP audio broadcast per cam (not video INVITE) */
    const settled = await Promise.all(ids.map(async (id) => {
        try {
            const r = await startAudioBroadcast(id, { broadcastMode: true });
            if (r && r.ok) {
                return {
                    id,
                    ok: true,
                    app: r.app || 'broadcast',
                    stream: r.stream || (id + '_' + id),
                };
            }
            return { id, ok: false, reason: (r && r.reason) || 'broadcast_failed' };
        } catch (err) {
            return {
                id,
                ok: false,
                reason: err && err.message ? err.message : String(err),
            };
        }
    }));

    const wvpMeta = {};
    settled.forEach((row) => {
        if (row.ok) {
            wvpStarted.push(row.id);
            wvpMeta[row.id] = { app: row.app, stream: row.stream };
        } else {
            wvpFailed.push(row.id);
            log.ptt.warn('wvp gb28181 broadcast start failed', {
                camId: row.id,
                reason: row.reason || null,
            });
        }
    });

    log.ptt.info('wvp gb28181 ptt fan-out', {
        requested: ids.length,
        pttTcp: pttOnline.length,
        wvpStarted: wvpStarted.length,
        wvpFailed: wvpFailed.length,
        inviteVideo: false,
        everyCamId: true,
    });

    return { pttOnline, wvpStarted, wvpFailed, wvpMeta };
}

/**
 * Stop WVP broadcasts started for a talk session.
 * @param {string[]} camIds
 */
async function fanOutPttStopViaWvp(camIds) {
    const ids = (Array.isArray(camIds) ? camIds : []).map(String).filter(Boolean);
    if (!ids.length || !wvpLab.isEnabled()) return { stopped: [] };
    const stopped = [];
    await Promise.all(ids.map(async (id) => {
        try {
            const r = await stopAudioBroadcast(id);
            if (r && r.ok !== false) stopped.push(id);
        } catch (err) {
            log.ptt.warn('wvp gb28181 broadcast stop failed', {
                camId: id,
                message: err && err.message ? err.message : String(err),
            });
        }
    }));
    return { stopped };
}

module.exports = {
    SOCKET_EVENTS,
    resolveChannelId,
    startAudioBroadcast,
    stopAudioBroadcast,
    fanOutPttStartViaWvp,
    fanOutPttStopViaWvp,
};
