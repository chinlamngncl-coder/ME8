/**

 * MOB-ARCH-REVERT-AND-UNIFY-EVENT-BUS

 * + MOB-APPLY-BACKEND-ACL-TRANSLATOR-V1

 * Master-Gateway: WVP/proxy → ACL translator → classic Fleet handlers / Socket.IO.

 *

 * Mounted before requireDashboardAuth (no JWT/session).

 * Secured by loopback / FM_WVP_WEBHOOK_TRUSTED_IPS (+ optional bridge token).

 *

 * Frontend frozen — only classic event names (sos-alarm, device-status, heartbeat, …).

 */

'use strict';



const express = require('express');

const log = require('./fleetLog');

const wvpGb28181Bridge = require('./wvpGb28181Bridge');

const acl = require('./wvpFleetAclTranslator');



function normalizeIp(ip) {

    return String(ip || '').replace(/^::ffff:/i, '').toLowerCase();

}



function trustedIpSet() {

    const base = ['127.0.0.1', '::1', 'localhost'];

    const extra = String(process.env.FM_WVP_WEBHOOK_TRUSTED_IPS || '')

        .split(/[,\s]+/)

        .map((s) => s.trim())

        .filter(Boolean);

    return new Set(base.concat(extra).map(normalizeIp));

}



function clientIp(req) {

    return normalizeIp((req.socket && req.socket.remoteAddress) || req.ip || '');

}



function requireTrustedWvpSource(req, res, next) {

    const token = String(process.env.FM_WVP_ALARM_BRIDGE_TOKEN || '').trim();

    const hdr = String(

        (req.headers && (req.headers['x-me8-wvp-alarm'] || req.headers['x-ubitron-wvp-alarm'])) || ''

    ).trim();

    if (token && hdr && hdr === token) return next();

    if (trustedIpSet().has(clientIp(req))) return next();

    return res.status(403).json({ ok: false, error: 'wvp event bus forbidden' });

}



/**

 * @param {object} raw

 * @param {object} deps

 */

function ingest(raw, deps) {

    deps = deps || {};

    const norm = acl.normalize(raw);

    if (!norm.cameraId) {

        return { ok: false, error: 'cameraId required', status: 400 };

    }



    if (norm.type === 'alarm') {

        return ingestAlarm(norm, deps);

    }

    if (norm.type === 'ptt-rx' || norm.type === 'ptt_rx') {

        return ingestPttRx(norm, deps);

    }

    if (norm.type === 'device-status' || norm.type === 'devstatus') {

        return ingestDeviceStatus(norm, deps);

    }

    if (norm.type === 'register' || norm.type === 'online' || norm.type === 'keepalive') {

        return ingestPresence(norm, deps);

    }

    if (norm.type === 'gps' || norm.type === 'mobileposition') {

        return ingestGps(norm, deps);

    }

    return { ok: false, error: 'unknown_event_type', type: norm.type || null };

}



function ingestAlarm(norm, deps) {

    const camId = norm.cameraId;

    if (typeof deps.touchDeviceOnline === 'function') deps.touchDeviceOnline(camId);

    const gps = typeof deps.getLastGps === 'function' ? (deps.getLastGps(camId) || {}) : {};

    const result = deps.raiseDeviceAlarm({

        cameraId: camId,

        alarmKind: norm.alarmKind === 'fall' ? 'fall' : 'sos',

        alarmTime: norm.alarmTime || new Date().toLocaleTimeString(),

        lat: norm.lat != null ? norm.lat : (gps.lat != null ? gps.lat : null),

        lon: norm.lon != null ? norm.lon : (gps.lon != null ? gps.lon : null),

        source: norm.source || 'wvp_acl_translator',

        alarmMethod: 'gb28181',

        alarmType: 'Alarm',

        skipFleetVideoPull: true,

    });

    log.sip.info('wvp acl alarm → fleet', {

        camId,

        result,

        socketEvent: wvpGb28181Bridge.SOCKET_EVENTS.sosAlarm,

        path: 'backend-acl-translator-v1',

    });

    return { ok: true, type: 'alarm', cameraId: camId, result, invite: false };

}



function ingestPttRx(norm, deps) {

    const camId = norm.cameraId;

    const active = norm.active !== false && norm.active !== 0 && norm.active !== '0';

    if (typeof deps.touchDeviceOnline === 'function') deps.touchDeviceOnline(camId);

    if (typeof deps.emitPttRxState === 'function') deps.emitPttRxState(camId, active);

    log.ptt.info('wvp acl ptt-rx → fleet', {

        camId,

        active,

        socketEvent: wvpGb28181Bridge.SOCKET_EVENTS.pttRxState,

        path: 'backend-acl-translator-v1',

    });

    return { ok: true, type: 'ptt-rx', cameraId: camId, active };

}



function ingestDeviceStatus(norm, deps) {

    const camId = norm.cameraId;

    if (typeof deps.touchDeviceOnline === 'function') deps.touchDeviceOnline(camId);



    if (typeof deps.emitDeviceStatusFromAcl === 'function') {

        const payload = deps.emitDeviceStatusFromAcl(norm);

        log.sip.info('wvp acl device-status → fleet', {

            camId,

            battery: norm.battery,

            signal: norm.signal,

            socketEvent: 'device-status',

            path: 'backend-acl-translator-v1',

        });

        return { ok: true, type: 'device-status', cameraId: camId, payload: payload || null };

    }



    /* Fallback: presence-only if server did not wire emit */

    log.sip.info('wvp acl device-status → touch only', {

        camId,

        path: 'backend-acl-translator-v1',

    });

    return { ok: true, type: 'device-status', cameraId: camId, emit: false };

}



function ingestPresence(norm, deps) {

    const camId = norm.cameraId;

    if (typeof deps.touchDeviceOnline === 'function') deps.touchDeviceOnline(camId);

    if (typeof deps.emitHeartbeat === 'function') deps.emitHeartbeat(camId);

    log.sip.info('wvp acl presence → fleet', {

        camId,

        type: norm.type,

        socketEvent: 'heartbeat',

        path: 'backend-acl-translator-v1',

    });

    return { ok: true, type: norm.type || 'presence', cameraId: camId };

}



function ingestGps(norm, deps) {

    const camId = norm.cameraId;

    if (typeof deps.touchDeviceOnline === 'function') deps.touchDeviceOnline(camId);

    if (norm.lat != null && norm.lon != null && typeof deps.emitGpsUpdate === 'function') {

        deps.emitGpsUpdate(camId, norm.lat, norm.lon);

    }

    log.sip.info('wvp acl gps → fleet', {

        camId,

        lat: norm.lat,

        lon: norm.lon,

        socketEvent: 'gps-update',

        path: 'backend-acl-translator-v1',

    });

    return { ok: true, type: 'gps', cameraId: camId };

}



/**

 * @param {object} deps

 */

function createRouter(deps) {

    deps = deps || {};

    const opErr = typeof deps.opErr === 'function'

        ? deps.opErr

        : function (err) {

            return { ok: false, error: err && err.message ? err.message : String(err || 'error') };

        };



    const router = express.Router();

    const alarmDedup = new Map();

    const pttRxDedup = new Map();

    const registerDedup = new Map();

    const statusDedup = new Map();

    const ALARM_DEDUP_MS = 4000;



    function handleIngest(req, res) {

        try {

            const body = req.body || {};

            const norm = acl.normalize(body);

            const type = norm.type;

            const camId = norm.cameraId;

            const now = Date.now();



            if (type === 'alarm' && camId) {

                const prev = alarmDedup.get(camId) || 0;

                if (now - prev < ALARM_DEDUP_MS) {

                    return res.json({ ok: true, deduped: true, type: 'alarm', cameraId: camId });

                }

                alarmDedup.set(camId, now);

            }

            if (type === 'ptt-rx' && camId) {

                const active = norm.active !== false && norm.active !== 0 && norm.active !== '0';

                const prev = pttRxDedup.get(camId) || 0;

                if (active && now - prev < 1500) {

                    return res.json({ ok: true, deduped: true, type: 'ptt-rx', cameraId: camId });

                }

                if (active) pttRxDedup.set(camId, now);

            }

            if ((type === 'register' || type === 'online') && camId) {

                const prev = registerDedup.get(camId) || 0;

                if (now - prev < 25000) {

                    return res.json({ ok: true, deduped: true, type: 'register', cameraId: camId });

                }

                registerDedup.set(camId, now);

            }

            if (type === 'device-status' && camId) {

                const prev = statusDedup.get(camId) || 0;

                if (now - prev < 2000) {

                    return res.json({ ok: true, deduped: true, type: 'device-status', cameraId: camId });

                }

                statusDedup.set(camId, now);

            }



            const out = ingest(Object.assign({}, body, { type: norm.type }), deps);

            if (!out.ok && out.status) {

                return res.status(out.status).json(opErr(out.error));

            }

            if (!out.ok) {

                return res.status(400).json(opErr(out.error || 'ingest_failed'));

            }

            res.json(out);

        } catch (err) {

            res.status(err.status || 500).json(opErr(err));

        }

    }



    router.post('/events', requireTrustedWvpSource, express.json({ limit: '64kb' }), handleIngest);

    router.post('/device-alarm', requireTrustedWvpSource, express.json({ limit: '32kb' }), (req, res) => {

        req.body = Object.assign({ type: 'alarm' }, req.body || {});

        return handleIngest(req, res);

    });

    router.post('/device-ptt-rx', requireTrustedWvpSource, express.json({ limit: '16kb' }), (req, res) => {

        req.body = Object.assign({ type: 'ptt-rx' }, req.body || {});

        return handleIngest(req, res);

    });

    router.post('/device-status', requireTrustedWvpSource, express.json({ limit: '64kb' }), (req, res) => {

        req.body = Object.assign({ type: 'device-status' }, req.body || {});

        return handleIngest(req, res);

    });



    return router;

}



module.exports = {

    createRouter,

    ingest,

    requireTrustedWvpSource,

    SOCKET_EVENTS: wvpGb28181Bridge.SOCKET_EVENTS,

};


