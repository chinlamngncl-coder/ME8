/**

 * MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1

 * + MOB-APPLY-BACKEND-VIDEO-HANDOFF-STABLE-V1

 * Classic UI frozen — stable WVP startPlay + absolute FLV for /api/live/playback.

 */

'use strict';



const http = require('http');

const https = require('https');

const wvpLab = require('./wvpLabClient');

const log = require('./fleetLog');



/** camId → { play, at, flvUrl } */

const active = new Map();

/** camId → Promise chain (serialize start/stop per cam) */

const chains = new Map();

/** camId → Timeout for deferred hard stop */

const pendingStop = new Map();

/** Global spacing between WVP startPlay calls (Open All storm) */

let lastStartAt = 0;

let globalGate = Promise.resolve();



function isHandoffEnabled() {

    if (String(process.env.FM_WVP_VIDEO_HANDOFF || '').trim() === '1') return true;

    if (String(process.env.FM_LAB_WVP || '').trim() !== '1') return false;

    return String(process.env.FM_SOFTOPEN_WVP_ONLY || '0').trim() !== '0';

}



function reuseMs() {

    const n = parseInt(process.env.FM_WVP_HANDOFF_REUSE_MS || '120000', 10);

    return Number.isFinite(n) && n >= 5000 ? n : 120000;

}



function stopGraceMs() {

    const n = parseInt(process.env.FM_WVP_HANDOFF_STOP_GRACE_MS || '4000', 10);

    return Number.isFinite(n) && n >= 0 ? n : 4000;

}



function startGapMs() {

    const n = parseInt(process.env.FM_WVP_HANDOFF_START_GAP_MS || '500', 10);

    return Number.isFinite(n) && n >= 0 ? n : 500;

}



function zlmHttpPort() {

    const n = parseInt(process.env.FM_WVP_ZLM_HTTP_PORT || '18088', 10);

    return Number.isFinite(n) && n > 0 ? n : 18088;

}



function sleep(ms) {

    return new Promise(function (resolve) { setTimeout(resolve, ms); });

}



function cancelPendingStop(camId) {

    const t = pendingStop.get(camId);

    if (!t) return false;

    clearTimeout(t);

    pendingStop.delete(camId);

    return true;

}



function sanitizeWvpMsg(msg) {

    let s = String(msg || '').trim();

    if (!s) return 'startPlay_failed';

    /* Common WVP Chinese → short ASCII for logs / UI error */

    if (/ssrc|冲突/i.test(s)) return 'wvp_ssrc_conflict';

    if (/超时|timeout/i.test(s)) return 'wvp_stream_timeout';

    if (/点播失败|失败/.test(s) && /点播|play|Play/.test(s)) return 'wvp_play_failed';

    if (/离线|offline/i.test(s)) return 'wvp_device_offline';

    if (/[\u4e00-\u9fff]/.test(s)) {

        return 'wvp_error:' + Buffer.from(s, 'utf8').toString('base64').slice(0, 48);

    }

    return s.slice(0, 160);

}



/**

 * Prefer LAN ZLM HTTP port (18088). Avoid bare :80 which browsers often cannot reach.

 */

function absolutizeFlv(play, publicHost) {

    if (!play) return null;

    const host = String(publicHost || process.env.FM_WVP_STREAM_HOST || process.env.HOST || '192.168.1.38').trim();

    const port = zlmHttpPort();

    const preferDirect = play.preferDirect !== false;

    let url = null;

    if (preferDirect && play.directFlv && /^https?:\/\//i.test(play.directFlv)) {

        url = play.directFlv;

    } else if (play.upstreamFlv && /^https?:\/\//i.test(play.upstreamFlv)) {

        url = play.upstreamFlv;

    } else if (play.wsFlv && /^wss?:\/\//i.test(play.wsFlv)) {

        url = play.wsFlv.replace(/^ws/i, 'http');

    } else if (play.flvUrl) {

        if (/^https?:\/\//i.test(play.flvUrl)) url = play.flvUrl;

        else url = 'http://' + host + ':' + port + (play.flvUrl.charAt(0) === '/' ? '' : '/') + play.flvUrl;

    }

    if (!url) return null;

    try {

        const u = new URL(url);

        u.hostname = host;

        if (!u.port || u.port === '80' || u.port === '443') {

            u.port = String(port);

        }

        /* Same-origin proxy path stays relative-absolutized to dashboard host:3988 — keep as-is if /api/lab */

        if (/\/api\/lab\/wvp\/flv/i.test(u.pathname)) {

            return 'http://' + host + ':3988' + u.pathname + u.search;

        }

        return u.toString();

    } catch (_) {

        return url;

    }

}



function enqueueCam(camId, fn) {

    const prev = chains.get(camId) || Promise.resolve();

    const next = prev.catch(function () { /* ignore */ }).then(fn);

    chains.set(camId, next.finally(function () {

        if (chains.get(camId) === next) chains.delete(camId);

    }));

    return next;

}



function gateGlobalStart() {

    const gap = startGapMs();

    globalGate = globalGate.catch(function () { /* ignore */ }).then(async function () {

        const wait = Math.max(0, gap - (Date.now() - lastStartAt));

        if (wait > 0) await sleep(wait);

        lastStartAt = Date.now();

    });

    return globalGate;

}



async function hardStopOne(camId) {

    const id = String(camId || '').trim();

    cancelPendingStop(id);

    active.delete(id);

    if (!wvpLab.isEnabled()) return { ok: true, skipped: true };

    try {

        const r = await wvpLab.stopPlay(id, id);

        log.media.info('wvp video handoff hard-stop', {

            camId: id,

            ok: !!(r && r.ok),

            path: 'backend-video-handoff-stable-v1',

        });

        return r || { ok: true };

    } catch (err) {

        return { ok: false, message: err && err.message ? err.message : String(err) };

    }

}



function buildFlvStreamProxyPath(camId, labWvpToken) {

    const id = String(camId || '').trim();

    const token = String(labWvpToken || '').trim();

    if (!id || !token) return null;

    return '/api/lab/wvp/flv-stream?camId=' + encodeURIComponent(id)
        + '&labWvp=' + encodeURIComponent(token);

}



function requireFlvStreamAccess(req, res, next) {

    const dashboardAuth = require('./dashboardAuth');

    if (dashboardAuth.sessionFromRequest(req)) {

        return next();

    }

    const token = String((req.query && req.query.labWvp) || '').trim();

    const camId = String((req.query && req.query.camId) || '').trim();

    if (!token || !camId) {

        return res.status(401).json({ ok: false, error: 'Unauthorized' });

    }

    const upstream = wvpLab.takeFlvUpstream(token);

    if (!upstream) {

        return res.status(401).json({ ok: false, error: 'Unauthorized' });

    }

    const cur = active.get(camId);

    if (!cur || !cur.upstreamFlv || cur.upstreamFlv !== upstream) {

        return res.status(401).json({ ok: false, error: 'Unauthorized' });

    }

    return next();

}



function proxyFlvStream(req, res, camId) {

    const id = String(camId || '').trim();

    const cur = active.get(id);

    const upstream = cur && cur.upstreamFlv;

    if (!upstream) {

        return res.status(404).json({ ok: false, error: 'no_active_handoff_stream', camId: id });

    }

    let url;

    try {

        url = new URL(upstream);

    } catch (_) {

        return res.status(400).json({ ok: false, error: 'bad_upstream_flv' });

    }

    const transport = url.protocol === 'https:' ? https : http;

    const upstreamReq = transport.get(url, (upstreamRes) => {

        try { upstreamReq.setTimeout(0); } catch (_) { /* ignore */ }

        if (upstreamRes.statusCode !== 200) {

            log.media.warn('wvp flv-stream proxy upstream', {

                camId: id,

                status: upstreamRes.statusCode,

                host: url.host,

                path: 'flv-stream-token-auth-v1',

            });

            res.status(upstreamRes.statusCode || 502).end();

            upstreamRes.resume();

            return;

        }

        res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'video/x-flv');

        res.setHeader('Cache-Control', 'no-cache, no-store');

        res.setHeader('Access-Control-Allow-Origin', '*');

        upstreamRes.pipe(res);

        log.media.info('wvp flv-stream proxy open', {

            camId: id,

            host: url.host,

            path: 'flv-stream-token-auth-v1',

        });

    });

    upstreamReq.on('error', (err) => {

        log.media.warn('wvp flv-stream proxy error', {

            camId: id,

            message: err && err.message ? err.message : String(err),

            path: 'flv-stream-token-auth-v1',

        });

        if (!res.headersSent) {

            res.status(502).json({ ok: false, error: 'zlm_flv_unreachable' });

        }

    });

    upstreamReq.setTimeout(30000, () => {

        upstreamReq.destroy(new Error('upstream connect timeout'));

    });

    req.on('close', () => {

        try { upstreamReq.destroy(); } catch (_) { /* ignore */ }

    });

}



async function startPlayOnce(id, publicHost) {

    await gateGlobalStart();

    const play = await wvpLab.startPlay(id, id);

    const upstreamFlv = absolutizeFlv(play, publicHost);

    if (!upstreamFlv) return { ok: false, reason: 'no_flv_url' };

    const labWvpToken = wvpLab.issueFlvToken(upstreamFlv);

    const flvUrl = buildFlvStreamProxyPath(id, labWvpToken);

    active.set(id, { play, flvUrl, upstreamFlv, labWvpToken, at: Date.now() });

    log.media.info('wvp video handoff start', {

        camId: id,

        flvHost: (upstreamFlv.match(/^https?:\/\/([^/]+)/i) || [])[1] || null,

        flvProxy: '/api/lab/wvp/flv-stream?camId=' + encodeURIComponent(id) + '&labWvp=…',

        path: 'flv-stream-token-auth-v1',

    });

    return { ok: true, flvUrl, play, reused: false };

}



/**

 * @returns {Promise<{ ok: boolean, flvUrl?: string, reason?: string, play?: object, reused?: boolean }>}

 */

function ensurePlay(camId, opts) {

    opts = opts || {};

    const id = String(camId || '').trim();

    if (!id) return Promise.resolve({ ok: false, reason: 'camId_required' });

    if (!isHandoffEnabled()) return Promise.resolve({ ok: false, reason: 'handoff_off' });

    if (!wvpLab.isEnabled()) return Promise.resolve({ ok: false, reason: 'wvp_disabled' });



    return enqueueCam(id, async function () {

        cancelPendingStop(id);

        const cur = active.get(id);

        if (cur && cur.flvUrl && (Date.now() - (cur.at || 0)) < reuseMs()) {

            cur.at = Date.now();

            return { ok: true, flvUrl: cur.flvUrl, play: cur.play, reused: true };

        }



        try {

            return await startPlayOnce(id, opts.publicHost);

        } catch (err) {

            const raw = err && err.message ? err.message : String(err);

            const reason = sanitizeWvpMsg(raw);

            log.media.warn('wvp video handoff startPlay fail', {

                camId: id,

                message: reason,

                raw: raw.slice(0, 80),

                path: 'backend-video-handoff-stable-v1',

            });

            /* ssrc / busy → stop + one retry */

            if (/ssrc|conflict|冲突|busy|失败|timeout|超时/i.test(raw + reason)) {

                await hardStopOne(id);

                await sleep(900);

                try {

                    return await startPlayOnce(id, opts.publicHost);

                } catch (err2) {

                    const r2 = sanitizeWvpMsg(err2 && err2.message ? err2.message : String(err2));

                    log.media.warn('wvp video handoff retry fail', {

                        camId: id,

                        message: r2,

                        path: 'backend-video-handoff-stable-v1',

                    });

                    return { ok: false, reason: r2 };

                }

            }

            return { ok: false, reason };

        }

    });

}



/**

 * Soft stop: keep WVP session briefly so rapid re-open reuses FLV (Open All / double click).

 * @param {string} camId

 * @param {{ immediate?: boolean }} [opts]

 */

function stopPlay(camId, opts) {

    opts = opts || {};

    const id = String(camId || '').trim();

    if (!id) return Promise.resolve({ ok: true, skipped: true });



    if (opts.immediate) {

        return enqueueCam(id, function () { return hardStopOne(id); });

    }



    const grace = stopGraceMs();

    if (grace <= 0) {

        return enqueueCam(id, function () { return hardStopOne(id); });

    }



    cancelPendingStop(id);

    log.media.info('wvp video handoff soft-stop scheduled', {

        camId: id,

        graceMs: grace,

        path: 'backend-video-handoff-stable-v1',

    });

    const t = setTimeout(function () {

        pendingStop.delete(id);

        enqueueCam(id, function () { return hardStopOne(id); }).catch(function () { /* ignore */ });

    }, grace);

    if (typeof t.unref === 'function') t.unref();

    pendingStop.set(id, t);

    return Promise.resolve({ ok: true, deferred: true, graceMs: grace });

}



function getCachedFlv(camId) {

    const cur = active.get(String(camId || '').trim());

    return cur && cur.flvUrl ? cur.flvUrl : null;

}



function isActive(camId) {

    return active.has(String(camId || '').trim());

}



module.exports = {

    isHandoffEnabled,

    ensurePlay,

    stopPlay,

    getCachedFlv,

    isActive,

    absolutizeFlv,

    sanitizeWvpMsg,

    buildFlvStreamProxyPath,

    requireFlvStreamAccess,

    proxyFlvStream,

};


