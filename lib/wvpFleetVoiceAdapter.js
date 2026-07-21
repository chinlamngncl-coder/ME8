/**

 * MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1

 * + MOB-APPLY-FLEET-VOICE-ADAPTER-UPLINK-V1

 * + MOB-APPLY-FLEET-VOICE-UPLINK-RESTART-STABLE-V1

 * One backend gate: Fleet voice sockets → WVP broadcast + FFmpeg RTMP mic uplink.

 *

 * Restart-stable: soft stop defers tear-down so rapid 2nd PTT reuses the live

 * broadcast/uplink instead of stop→immediate-start racing WVP/ZLM/cam RTP.

 */

'use strict';



const wvpGb28181Bridge = require('./wvpGb28181Bridge');

const wvpLab = require('./wvpLabClient');

const wvpVoiceUplink = require('./wvpVoiceUplink');

const log = require('./fleetLog');



/** camId → Timeout — pending hard tear-down after soft stop */

const pendingTeardown = new Map();

/** camId → ms timestamp of last completed hard stop */

const lastHardStopAt = new Map();

/** cams currently held open (broadcast+uplink live), including during soft-stop grace */

const heldOpen = new Set();



function teardownMs() {

    const n = parseInt(process.env.FM_WVP_VOICE_TEARDOWN_MS || '2000', 10);

    return Number.isFinite(n) && n >= 0 ? n : 2000;

}



function restartSettleMs() {

    const n = parseInt(process.env.FM_WVP_VOICE_RESTART_SETTLE_MS || '800', 10);

    return Number.isFinite(n) && n >= 0 ? n : 800;

}



function sleep(ms) {

    return new Promise(function (resolve) { setTimeout(resolve, ms); });

}



function cancelTeardown(camId) {

    const id = String(camId || '').trim();

    const t = pendingTeardown.get(id);

    if (!t) return false;

    clearTimeout(t);

    pendingTeardown.delete(id);

    return true;

}



async function hardStopOne(camId) {

    const id = String(camId || '').trim();

    if (!id) return;

    cancelTeardown(id);

    heldOpen.delete(id);

    await wvpVoiceUplink.stopAsync(id);

    try {

        await wvpGb28181Bridge.stopAudioBroadcast(id);

    } catch (err) {

        log.ptt.warn('wvp broadcast hard-stop failed', {

            camId: id,

            message: err && err.message ? err.message : String(err),

        });

    }

    lastHardStopAt.set(id, Date.now());

    log.ptt.info('fleet voice adapter hard-stop', {

        camId: id,

        path: 'wvp-fleet-voice-restart-stable',

    });

}



/**

 * @param {string[]} camIds

 * @param {{ isWvpManaged: (id: string) => boolean, isPttOnline?: (id: string) => boolean }} deps

 */

async function startTalk(camIds, deps) {

    deps = deps || {};

    const ids = (Array.isArray(camIds) ? camIds : []).map(String).filter(Boolean);

    const isWvpManaged = typeof deps.isWvpManaged === 'function'

        ? deps.isWvpManaged

        : function () { return false; };

    const isPttOnline = typeof deps.isPttOnline === 'function'

        ? deps.isPttOnline

        : function () { return false; };



    const wvpIds = ids.filter((id) => isWvpManaged(id));

    const fleetIds = ids.filter((id) => !isWvpManaged(id));

    const pttOnline = fleetIds.filter((id) => isPttOnline(id));

    let wvpStarted = [];

    let wvpFailed = [];

    let wvpMeta = {};

    let uplinkStarted = [];

    let reused = [];



    const needFresh = [];

    for (let i = 0; i < wvpIds.length; i += 1) {

        const id = wvpIds[i];

        const cancelled = cancelTeardown(id);

        if (cancelled || heldOpen.has(id) || wvpVoiceUplink.isActive(id)) {

            if (wvpVoiceUplink.isActive(id) || heldOpen.has(id)) {

                heldOpen.add(id);

                wvpStarted.push(id);

                uplinkStarted.push(id);

                reused.push(id);

                continue;

            }

        }

        needFresh.push(id);

    }



    if (needFresh.length) {

        const settle = restartSettleMs();

        let waitMs = 0;

        needFresh.forEach((id) => {

            const last = lastHardStopAt.get(id) || 0;

            const age = Date.now() - last;

            if (last && age < settle) {

                waitMs = Math.max(waitMs, settle - age);

            }

        });

        if (waitMs > 0) {

            log.ptt.info('fleet voice adapter restart settle', {

                cams: needFresh,

                waitMs,

                path: 'wvp-fleet-voice-restart-stable',

            });

            await sleep(waitMs);

        }



        const fan = await wvpGb28181Bridge.fanOutPttStartViaWvp(needFresh, {

            isPttOnline: function () { return false; },

        });

        (fan.wvpStarted || []).forEach((id) => wvpStarted.push(id));

        (fan.wvpFailed || []).forEach((id) => wvpFailed.push(id));

        wvpMeta = Object.assign(wvpMeta, fan.wvpMeta || {});



        let pushKey = '';

        try {

            pushKey = await wvpLab.getPushKey();

        } catch (err) {

            log.ptt.warn('wvp pushKey resolve failed', {

                message: err && err.message ? err.message : String(err),

            });

        }



        if (pushKey) {

            (fan.wvpStarted || []).forEach((id) => {

                const meta = wvpMeta[id] || {};

                const up = wvpVoiceUplink.start(id, {

                    app: meta.app || 'broadcast',

                    stream: meta.stream || (id + '_' + id),

                    pushKey,

                });

                if (up && up.ok) {

                    uplinkStarted.push(id);

                    heldOpen.add(id);

                } else {

                    log.ptt.warn('wvp voice uplink start failed', {

                        camId: id,

                        reason: (up && up.reason) || 'unknown',

                    });

                }

            });

        } else {

            (fan.wvpStarted || []).forEach((id) => heldOpen.add(id));

        }

    }



    log.ptt.info('fleet voice adapter start', {

        requested: ids.length,

        wvp: wvpIds.length,

        fleetPtt: pttOnline.length,

        wvpStarted: wvpStarted.length,

        wvpFailed: wvpFailed.length,

        uplinkStarted: uplinkStarted.length,

        reused: reused.length,

        path: 'wvp-fleet-voice-restart-stable',

    });



    return {

        pttOnline,

        wvpStarted,

        wvpFailed,

        wvpIds,

        fleetIds,

        uplinkStarted,

        reused,

        wvpMeta,

    };

}



/**

 * Soft stop: schedule hard tear-down after grace so a quick re-press can reuse.

 * @param {string[]} camIds

 * @param {{ immediate?: boolean }} [opts]

 */

async function stopTalk(camIds, opts) {

    opts = opts || {};

    const ids = (Array.isArray(camIds) ? camIds : []).map(String).filter(Boolean);

    if (!ids.length) return { stopped: [], deferred: [] };



    if (opts.immediate) {

        await Promise.all(ids.map((id) => hardStopOne(id)));

        log.ptt.info('fleet voice adapter stop', {

            stopped: ids,

            deferred: [],

            path: 'wvp-fleet-voice-restart-stable',

        });

        return { stopped: ids, deferred: [] };

    }



    const grace = teardownMs();

    const deferred = [];

    ids.forEach((id) => {

        cancelTeardown(id);

        if (grace <= 0) return;

        deferred.push(id);

        const t = setTimeout(function () {

            pendingTeardown.delete(id);

            hardStopOne(id).catch(function () { /* ignore */ });

        }, grace);

        if (typeof t.unref === 'function') t.unref();

        pendingTeardown.set(id, t);

    });



    if (grace <= 0) {

        await Promise.all(ids.map((id) => hardStopOne(id)));

        log.ptt.info('fleet voice adapter stop', {

            stopped: ids,

            deferred: [],

            path: 'wvp-fleet-voice-restart-stable',

        });

        return { stopped: ids, deferred: [] };

    }



    log.ptt.info('fleet voice adapter stop', {

        stopped: [],

        deferred,

        graceMs: grace,

        path: 'wvp-fleet-voice-restart-stable',

    });

    return { stopped: [], deferred };

}



/**

 * Fan G.711 A-law mic frames to active WVP uplink sessions.

 * @param {string[]} camIds

 * @param {Buffer} buf

 */

function pushAlaw(camIds, buf) {

    const ids = (Array.isArray(camIds) ? camIds : []).map(String).filter(Boolean);

    if (!ids.length || !buf || !buf.length) return 0;

    let n = 0;

    ids.forEach((id) => {

        if (wvpVoiceUplink.writeAlaw(id, buf)) n += 1;

    });

    return n;

}



module.exports = {

    startTalk,

    stopTalk,

    pushAlaw,

    hardStopOne,

};


