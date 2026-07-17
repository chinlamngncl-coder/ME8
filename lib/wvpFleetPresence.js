/**
 * mob-fleet-presence-from-wvp-v1
 * One-row BWC registers to WVP (:5060). Fleet SIP (:5062) never sees REGISTER.
 * Poll WVP device online → fleetRegistry.markOnline so Axiom map/fleet list match.
 * Does NOT change SIP ports. Does NOT mark offline (stale timer / SIP handle that).
 */
'use strict';

const log = require('./fleetLog');

let timer = null;
let lastOnlineKey = '';
let started = false;

function envEnabled() {
    const flag = String(process.env.FM_WVP_FLEET_PRESENCE || '1').trim();
    if (flag === '0' || /^false$/i.test(flag) || /^off$/i.test(flag)) return false;
    return true;
}

function pollMs() {
    return Math.max(5000, parseInt(process.env.FM_WVP_FLEET_PRESENCE_MS || '8000', 10) || 8000);
}

/**
 * @param {object} opts
 * @param {object} opts.wvpLab
 * @param {object} opts.fleetRegistry
 * @param {function(string):boolean} [opts.isBwcCameraId]
 * @param {function(string):void} [opts.onBecameOnline] — ensureBwcEntry, runtime, roster
 * @param {function():void} [opts.emitRoster]
 */
function start(opts) {
    opts = opts || {};
    if (started) return { ok: true, already: true };
    const wvpLab = opts.wvpLab;
    const fleetRegistry = opts.fleetRegistry;
    if (!wvpLab || !fleetRegistry) return { ok: false, reason: 'missing_deps' };
    if (!envEnabled()) {
        log.media.info('wvp fleet presence off', { env: 'FM_WVP_FLEET_PRESENCE=0' });
        return { ok: false, reason: 'disabled' };
    }
    if (typeof wvpLab.isEnabled === 'function' && !wvpLab.isEnabled()) {
        log.media.info('wvp fleet presence skipped — FM_LAB_WVP not 1');
        return { ok: false, reason: 'wvp_lab_off' };
    }

    started = true;
    const tick = async function () {
        try {
            const page = await wvpLab.listDevices(1, 100);
            const list = (page && page.list) || [];
            const onlineIds = [];
            let changed = false;
            for (let i = 0; i < list.length; i++) {
                const d = list[i];
                const id = d && d.deviceId ? String(d.deviceId).trim() : '';
                if (!id) continue;
                if (opts.isBwcCameraId && !opts.isBwcCameraId(id)) continue;
                if (!d.online) continue;
                onlineIds.push(id);
                const rec = fleetRegistry.ensure(id);
                const wasOffline = !(rec && rec.online);
                fleetRegistry.markOnline(id);
                fleetRegistry.touch(id);
                if (wasOffline) {
                    changed = true;
                    if (typeof opts.onBecameOnline === 'function') {
                        try { opts.onBecameOnline(id); } catch (_) { /* ignore */ }
                    }
                }
            }
            onlineIds.sort();
            const key = onlineIds.join(',');
            if (key !== lastOnlineKey) {
                lastOnlineKey = key;
                changed = true;
                log.media.info('wvp fleet presence', { online: onlineIds.length, ids: onlineIds });
            }
            if (changed && typeof opts.emitRoster === 'function') {
                try { opts.emitRoster(); } catch (_) { /* ignore */ }
            }
        } catch (err) {
            log.media.warn('wvp fleet presence poll failed', {
                message: err && err.message ? err.message : String(err),
            });
        }
    };

    tick();
    timer = setInterval(tick, pollMs());
    if (timer.unref) timer.unref();
    log.media.info('wvp fleet presence started', { pollMs: pollMs() });
    return { ok: true, pollMs: pollMs() };
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    started = false;
}

module.exports = {
    start,
    stop,
    envEnabled,
};
