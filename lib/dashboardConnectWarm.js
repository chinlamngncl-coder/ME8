/**
 * MOB-APPLY-DASHBOARD-CONNECT-WVP-PRESENCE-WARM-V1
 * On dashboard socket connect: one-shot WVP device list → mark online only when WVP reports online.
 * Never paints offline devices online. Never marks devices offline (SIP stale timer handles that).
 */
'use strict';

let warmPromise = null;
let lastWarmAt = 0;

function envEnabled() {
    const flag = String(process.env.FM_DASHBOARD_CONNECT_WARM || '1').trim();
    if (flag === '0' || /^false$/i.test(flag) || /^off$/i.test(flag)) return false;
    return true;
}

function warmMinMs() {
    return Math.max(1000, parseInt(process.env.FM_DASHBOARD_CONNECT_WARM_MS || '3000', 10) || 3000);
}

function staggerBaseMs() {
    return Math.max(0, parseInt(process.env.FM_LOGIN_REPLAY_STAGGER_BASE_MS || '400', 10) || 400);
}

function staggerStepMs() {
    return Math.max(0, parseInt(process.env.FM_LOGIN_REPLAY_STAGGER_STEP_MS || '300', 10) || 300);
}

/**
 * @param {object} opts
 * @param {object} opts.wvpLab
 * @param {object} opts.fleetRegistry
 * @param {function(string):boolean} opts.isBwcCameraId
 * @param {function(string):void} [opts.onCamOnline] — newly online from this warm
 * @param {function(string, number):void} [opts.burstGpsStatus]
 * @param {object} [opts.log]
 */
async function warmFromWvp(opts) {
    opts = opts || {};
    const wvpLab = opts.wvpLab;
    const fleetRegistry = opts.fleetRegistry;
    const isBwcCameraId = opts.isBwcCameraId;
    if (!wvpLab || !fleetRegistry || typeof isBwcCameraId !== 'function') {
        return { ok: false, reason: 'missing_deps', changed: false, onlineIds: [] };
    }
    if (!envEnabled()) {
        return { ok: false, reason: 'disabled', changed: false, onlineIds: [] };
    }
    if (typeof wvpLab.isEnabled === 'function' && !wvpLab.isEnabled()) {
        return { ok: false, reason: 'wvp_off', changed: false, onlineIds: [] };
    }

    const page = await wvpLab.listDevices(1, 100);
    const list = (page && page.list) || [];
    const onlineIds = [];
    let changed = false;
    const newlyOnline = [];

    for (let i = 0; i < list.length; i++) {
        const d = list[i];
        const id = d && d.deviceId ? String(d.deviceId).trim() : '';
        if (!id || !isBwcCameraId(id)) continue;
        if (!d.online) continue;
        onlineIds.push(id);
        const rec = fleetRegistry.ensure(id);
        const wasOffline = !(rec && rec.online);
        fleetRegistry.markOnline(id);
        fleetRegistry.touch(id);
        if (wasOffline) {
            changed = true;
            newlyOnline.push(id);
            if (typeof opts.onCamOnline === 'function') {
                try { opts.onCamOnline(id); } catch (_) { /* ignore */ }
            }
        }
    }

    if (typeof opts.burstGpsStatus === 'function') {
        onlineIds.forEach((id, i) => {
            try {
                opts.burstGpsStatus(id, staggerBaseMs() + i * staggerStepMs());
            } catch (_) { /* ignore */ }
        });
    }

    if (opts.log && opts.log.web) {
        opts.log.web.info('dashboard connect warm', {
            wvpOnline: onlineIds.length,
            newlyOnline: newlyOnline.length,
            ids: onlineIds,
        });
    }

    return { ok: true, changed, onlineIds, newlyOnline };
}

/**
 * Coalesce concurrent dashboard connects into one WVP listDevices call.
 * @param {object} socket
 * @param {object} opts — same as warmFromWvp plus replayToSocket, emitRoster
 */
function scheduleOnConnect(socket, opts) {
    opts = opts || {};
    if (!envEnabled()) return;
    const wvpLab = opts.wvpLab;
    if (wvpLab && typeof wvpLab.isEnabled === 'function' && !wvpLab.isEnabled()) return;

    const now = Date.now();
    if (!warmPromise && now - lastWarmAt < warmMinMs()) {
        return;
    }

    if (!warmPromise) {
        warmPromise = warmFromWvp(opts).finally(() => {
            lastWarmAt = Date.now();
            warmPromise = null;
        });
    }

    warmPromise.then((result) => {
        if (!result || !result.ok) return;
        if (result.changed && typeof opts.emitRoster === 'function') {
            try { opts.emitRoster(); } catch (_) { /* ignore */ }
        }
        if (typeof opts.replayToSocket === 'function' && socket) {
            try { opts.replayToSocket(socket); } catch (_) { /* ignore */ }
        }
    }).catch((err) => {
        if (opts.log && opts.log.web) {
            opts.log.web.warn('dashboard connect warm failed', {
                message: err && err.message ? err.message : String(err),
            });
        }
    });
}

module.exports = {
    envEnabled,
    warmFromWvp,
    scheduleOnConnect,
};
