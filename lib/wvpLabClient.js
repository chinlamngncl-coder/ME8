/**
 * mob-track-b1-one-tile-wvp-play — WVP-Pro lab API client (GB desk).
 * mob-wvp-lab-jwt-auth — WVP 2.7+ needs access-token JWT (not legacy Cookie only).
 * Does NOT touch Fleet SIP / liveStreamPool / wall FFmpeg.
 */
'use strict';

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
const log = require('./fleetLog');

function md5(s) {
    return crypto.createHash('md5').update(String(s), 'utf8').digest('hex');
}

function cfg() {
    return {
        base: String(process.env.FM_WVP_BASE || 'http://127.0.0.1:18080').replace(/\/$/, ''),
        user: String(process.env.FM_WVP_USER || 'admin').trim() || 'admin',
        passwordPlain: String(process.env.FM_WVP_PASSWORD || 'admin'),
        streamHost: String(process.env.FM_WVP_STREAM_HOST || process.env.HOST || '192.168.1.38').trim(),
    };
}

function isEnabled() {
    return String(process.env.FM_LAB_WVP || '').trim() === '1';
}

/** Live FLV proxy tokens — must outlast a watch session (old 180s killed mid-play). */
const flvTokens = new Map();
const FLV_TTL_MS = Math.max(
    60 * 60 * 1000,
    parseInt(String(process.env.FM_WVP_FLV_TOKEN_TTL_MS || ''), 10) || (12 * 60 * 60 * 1000)
);

function issueFlvToken(upstreamUrl) {
    const token = crypto.randomBytes(12).toString('hex');
    flvTokens.set(token, { url: String(upstreamUrl), exp: Date.now() + FLV_TTL_MS });
    return token;
}

function takeFlvUpstream(token) {
    const key = String(token || '').trim();
    const row = flvTokens.get(key);
    if (!row || row.exp < Date.now()) {
        if (row) flvTokens.delete(key);
        return null;
    }
    /* Sliding renew while live proxy is (re)opened. */
    row.exp = Date.now() + FLV_TTL_MS;
    return row.url;
}

let accessToken = '';
let sessionAt = 0;
/** Refresh before typical WVP JWT expiry (~1h). */
const SESSION_TTL_MS = 50 * 60 * 1000;

function requestJson(method, pathWithQuery, opts) {
    const c = cfg();
    const url = new URL(c.base + pathWithQuery);
    const transport = url.protocol === 'https:' ? https : http;
    const headers = Object.assign({ Accept: 'application/json' }, (opts && opts.headers) || {});
    /* WVP 2.7.x JWT — header name is access-token (not Bearer Authorization). */
    if (accessToken && !(opts && opts.skipAuth)) {
        headers['access-token'] = accessToken;
    }

    return new Promise((resolve, reject) => {
        const req = transport.request({
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: method || 'GET',
            headers,
            timeout: (opts && opts.timeoutMs) || 20000,
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                let json = null;
                try { json = raw ? JSON.parse(raw) : null; } catch (_) {
                    return reject(new Error('WVP non-JSON (' + res.statusCode + ')'));
                }
                resolve({ status: res.statusCode || 0, json, raw });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('WVP request timeout'));
        });
        if (opts && opts.body != null) {
            req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
        }
        req.end();
    });
}

function assertApiOk(out, fallbackMsg) {
    if (out && out.json && (out.json.code === 401 || out.status === 401)) {
        const msg = (out.json && out.json.msg) || '请登录后重新请求';
        throw new Error(msg);
    }
    return out;
}

async function login(force) {
    if (!force && accessToken && (Date.now() - sessionAt) < SESSION_TTL_MS) {
        return { ok: true, reused: true };
    }
    accessToken = '';
    const c = cfg();
    const passHash = md5(c.passwordPlain);
    const path = '/api/user/login?username=' + encodeURIComponent(c.user)
        + '&password=' + encodeURIComponent(passHash);
    const out = await requestJson('GET', path, { skipAuth: true });
    if (!out.json || out.json.code !== 0) {
        const msg = (out.json && out.json.msg) || ('login_http_' + out.status);
        throw new Error('WVP login failed: ' + msg);
    }
    const data = out.json.data || {};
    const tok = data.accessToken || data.access_token || '';
    if (!tok) {
        throw new Error('WVP login failed: no accessToken');
    }
    accessToken = String(tok);
    sessionAt = Date.now();
    log.media.info('wvp lab login ok', { user: c.user, base: c.base, jwt: true });
    return { ok: true, reused: false };
}

async function withAuth(fn) {
    await login(false);
    try {
        return await fn();
    } catch (err) {
        const msg = String(err && err.message || err);
        if (/401|Unauthorized|登录|login|重新请求/i.test(msg)) {
            await login(true);
            return fn();
        }
        throw err;
    }
}

function rewriteStreamHost(urlStr) {
    if (!urlStr) return urlStr;
    try {
        const u = new URL(urlStr);
        const host = cfg().streamHost;
        if (host) u.hostname = host;
        /* WVP play URLs use :80; lab maps host 80→ZLM (mob-wvp-play-host-port-80). */
        if (!u.port || u.port === '80') {
            u.port = '';
        }
        return u.toString();
    } catch (_) {
        return urlStr;
    }
}

/** ZLM often exposes same FLV path on HTTP and WS — proxy needs http(s). */
function wsUrlToHttp(urlStr) {
    if (!urlStr) return null;
    try {
        const u = new URL(urlStr);
        if (u.protocol === 'ws:') u.protocol = 'http:';
        else if (u.protocol === 'wss:') u.protocol = 'https:';
        else return u.toString();
        return u.toString();
    } catch (_) {
        return null;
    }
}

/** WVP 2.7 nests page payloads under data; older all-in-one used top-level total/list. */
function pagePayload(json) {
    if (!json || typeof json !== 'object') return { total: 0, list: [] };
    const box = (json.data && typeof json.data === 'object' && (json.data.list || json.data.total != null))
        ? json.data
        : json;
    return {
        total: typeof box.total === 'number' ? box.total : (Array.isArray(box.list) ? box.list.length : 0),
        list: Array.isArray(box.list) ? box.list : [],
    };
}

async function listDevices(page, count) {
    return withAuth(async () => {
        const p = page || 1;
        const n = count || 50;
        const out = assertApiOk(await requestJson('GET', '/api/device/query/devices?page=' + p + '&count=' + n));
        if (!out.json || (out.json.code != null && out.json.code !== 0)) {
            throw new Error((out.json && out.json.msg) || 'device list failed');
        }
        const pageData = pagePayload(out.json);
        return {
            total: pageData.total,
            list: pageData.list.map((d) => ({
                deviceId: d.deviceId,
                name: d.name || d.deviceId,
                online: !!(d.onLine || d.online),
                manufacturer: d.manufacturer || null,
                channelCount: d.channelCount || 0,
                ip: d.ip || null,
            })),
        };
    });
}

async function listChannels(deviceId, page, count) {
    const id = String(deviceId || '').trim();
    if (!id) throw new Error('deviceId required');
    return withAuth(async () => {
        const p = page || 1;
        const n = count || 50;
        const path = '/api/device/query/devices/' + encodeURIComponent(id)
            + '/channels?page=' + p + '&count=' + n;
        const out = assertApiOk(await requestJson('GET', path));
        if (!out.json || (out.json.code != null && out.json.code !== 0)) {
            throw new Error((out.json && out.json.msg) || 'channel list failed');
        }
        const pageData = pagePayload(out.json);
        return {
            total: pageData.total,
            list: pageData.list.map((ch) => ({
                channelId: ch.channelId || ch.deviceId || id,
                deviceId: ch.deviceId || id,
                name: ch.name || ch.channelId || ch.deviceId || id,
                status: ch.status,
                hasAudio: !!ch.hasAudio,
            })),
        };
    });
}

async function startPlay(deviceId, channelId) {
    const did = String(deviceId || '').trim();
    const cid = String(channelId || '').trim() || did;
    if (!did) throw new Error('deviceId required');
    return withAuth(async () => {
        const path = '/api/play/start/' + encodeURIComponent(did) + '/' + encodeURIComponent(cid)
            + '?isSubStream=false';
        const out = assertApiOk(await requestJson('GET', path, { timeoutMs: 25000 }));
        if (!out.json || out.json.code !== 0 || !out.json.data) {
            const msg = (out.json && out.json.msg) || ('play_http_' + out.status);
            throw new Error(String(msg));
        }
        const data = out.json.data;
        /* mob-wvp-tile-ws-flv-player — prefer WVP ws_flv; HTTP + proxy remain fallbacks. */
        const wsFlv = data.ws_flv ? rewriteStreamHost(data.ws_flv) : null;
        const flvHttp = data.flv
            ? rewriteStreamHost(data.flv)
            : (wsFlv ? rewriteStreamHost(wsUrlToHttp(wsFlv)) : null);
        if (!flvHttp && !wsFlv) {
            throw new Error('WVP play returned no flv URL');
        }
        const upstream = flvHttp || rewriteStreamHost(wsUrlToHttp(wsFlv));
        const token = issueFlvToken(upstream);
        const preferDirect = String(process.env.FM_WVP_DIRECT_FLV || '1').trim() !== '0';
        const preferWs = String(process.env.FM_WVP_WS_FLV || '1').trim() !== '0';
        return {
            deviceId: did,
            channelId: cid,
            upstreamFlv: upstream,
            directFlv: flvHttp || upstream,
            wsFlv: wsFlv,
            preferDirect: preferDirect,
            preferWs: preferWs,
            flvUrl: '/api/lab/wvp/flv?labWvp=' + encodeURIComponent(token),
            raw: {
                flv: data.flv || null,
                ws_flv: data.ws_flv || null,
                hls: data.hls || null,
                fmp4: data.fmp4 || null,
                rtsp: data.rtsp || null,
            },
        };
    });
}

async function stopPlay(deviceId, channelId) {
    const did = String(deviceId || '').trim();
    const cid = String(channelId || '').trim() || did;
    if (!did) throw new Error('deviceId required');
    return withAuth(async () => {
        const path = '/api/play/stop/' + encodeURIComponent(did) + '/' + encodeURIComponent(cid)
            + '?isSubStream=false';
        const out = assertApiOk(await requestJson('GET', path, { timeoutMs: 15000 }));
        return {
            ok: !!(out.json && (out.json.code === 0 || out.json.code === 1)),
            msg: (out.json && out.json.msg) || null,
        };
    });
}

async function health() {
    if (!isEnabled()) {
        return { ok: false, reason: 'FM_LAB_WVP=0' };
    }
    try {
        await login(true);
        const devices = await listDevices(1, 5);
        return {
            ok: true,
            base: cfg().base,
            streamHost: cfg().streamHost,
            deviceTotal: devices.total,
            online: devices.list.filter((d) => d.online).length,
        };
    } catch (err) {
        return { ok: false, reason: err.message || String(err), base: cfg().base };
    }
}

function proxyFlv(req, res, token) {
    const upstream = takeFlvUpstream(token);
    if (!upstream) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired WVP FLV token' });
    }
    let url;
    try {
        url = new URL(upstream);
    } catch (_) {
        return res.status(400).json({ ok: false, error: 'Bad upstream URL' });
    }
    const transport = url.protocol === 'https:' ? https : http;
    /* Connect wait only — once headers arrive, disable idle kill for live FLV. */
    const upstreamReq = transport.get(url, (upstreamRes) => {
        try { upstreamReq.setTimeout(0); } catch (_) { /* ignore */ }
        if (upstreamRes.statusCode !== 200) {
            log.media.warn('wvp flv proxy upstream', { status: upstreamRes.statusCode });
            res.status(upstreamRes.statusCode || 502).end();
            upstreamRes.resume();
            return;
        }
        res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'video/x-flv');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        upstreamRes.pipe(res);
        log.media.info('wvp flv proxy open', { host: url.host, path: url.pathname });
    });
    upstreamReq.on('error', (err) => {
        log.media.warn('wvp flv proxy error', { message: err.message });
        if (!res.headersSent) {
            res.status(502).json({ ok: false, error: 'WVP FLV unreachable' });
        }
    });
    upstreamReq.setTimeout(30000, () => {
        log.media.warn('wvp flv proxy connect timeout', { host: url.host });
        upstreamReq.destroy(new Error('upstream connect timeout'));
    });
    req.on('close', () => {
        try { upstreamReq.destroy(); } catch (_) { /* ignore */ }
    });
}

module.exports = {
    isEnabled,
    cfg,
    health,
    listDevices,
    listChannels,
    startPlay,
    stopPlay,
    proxyFlv,
    md5,
};
