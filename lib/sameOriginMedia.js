'use strict';

/**
 * SAME-ORIGIN-MEDIA-PROXY-V1
 * Browser FLV must stay on the dashboard origin (http or https).
 * Never send raw :18088 (or other ZLM HTTP) to an HTTPS page.
 */

const http = require('http');
const https = require('https');
const dashboardAuth = require('./dashboardAuth');
const log = require('./fleetLog');

function zlmHttpPort() {
    const n = parseInt(
        process.env.FM_WVP_ZLM_HTTP_PORT
            || process.env.FM_ZLM_HTTP_PORT
            || '18088',
        10
    );
    return Number.isFinite(n) && n > 0 ? n : 18088;
}

function isBadDockerLan(ip) {
    return /^172\.(1[7-9]|2[0-9]|3[0-1])\./.test(String(ip || ''));
}

function allowedHosts() {
    const set = new Set(['127.0.0.1', 'localhost', '::1']);
    ['HOST', 'FM_WVP_STREAM_HOST', 'FM_GB28181_PUBLIC_HOST', 'FM_HTTPS_LAN_IP'].forEach((k) => {
        const v = String(process.env[k] || '').trim();
        if (!v) return;
        if (/^\d+\.\d+\.\d+\.\d+$/.test(v) && !isBadDockerLan(v)) set.add(v);
        else if (!/^\d+\.\d+\.\d+\.\d+$/.test(v) && v !== 'YOUR_LAN_IP') set.add(v);
    });
    return set;
}

function isAllowlistedZlmUpstream(urlStr) {
    let u;
    try {
        u = new URL(String(urlStr || '').trim());
    } catch (_) {
        return false;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (!allowedHosts().has(u.hostname)) return false;
    const port = u.port
        ? parseInt(u.port, 10)
        : (u.protocol === 'https:' ? 443 : 80);
    const zlm = zlmHttpPort();
    if (port === zlm) return true;
    /* Some lab ZLM builds expose FLV on 80 with /live/ or /rtp/ */
    if ((port === 80 || port === 443) && /\/(live|rtp)\//i.test(u.pathname)) return true;
    return false;
}

/**
 * Normalize any play URL for the browser — always prefer same-origin /api/lab/…
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function toBrowserFlvUrl(url) {
    const s = String(url || '').trim();
    if (!s) return null;
    if (s.charAt(0) === '/') {
        if (/^\/api\/lab\//i.test(s)) return s;
        return s;
    }
    let u;
    try {
        u = new URL(s);
    } catch (_) {
        return s;
    }
    if (/\/api\/lab\//i.test(u.pathname)) {
        return u.pathname + (u.search || '');
    }
    if (isAllowlistedZlmUpstream(s)) {
        return '/api/lab/media/upstream-flv?u=' + encodeURIComponent(s);
    }
    return s;
}

function proxyUpstreamFlv(req, res) {
    if (!dashboardAuth.sessionFromRequest(req)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    const raw = String((req.query && req.query.u) || '').trim();
    if (!raw) {
        return res.status(400).json({ ok: false, error: 'u required' });
    }
    if (!isAllowlistedZlmUpstream(raw)) {
        log.media.warn('same-origin media proxy denied', { reason: 'not_allowlisted' });
        return res.status(400).json({ ok: false, error: 'upstream_not_allowed' });
    }

    let url;
    try {
        url = new URL(raw);
    } catch (_) {
        return res.status(400).json({ ok: false, error: 'bad_upstream_url' });
    }

    const lib = url.protocol === 'https:' ? https : http;
    const upstreamReq = lib.request(
        {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                connection: 'close',
                accept: '*/*',
            },
        },
        (upstreamRes) => {
            const code = upstreamRes.statusCode || 502;
            if (code >= 400) {
                log.media.warn('same-origin media proxy upstream', {
                    status: code,
                    host: url.host,
                });
                res.status(502).json({ ok: false, error: 'upstream_http_' + code });
                upstreamRes.resume();
                return;
            }
            res.statusCode = code;
            const ct = upstreamRes.headers['content-type'];
            if (ct) res.setHeader('Content-Type', ct);
            res.setHeader('Cache-Control', 'no-store');
            upstreamRes.pipe(res);
            log.media.info('same-origin media proxy open', { host: url.host, path: url.pathname });
        }
    );
    upstreamReq.on('error', (err) => {
        log.media.warn('same-origin media proxy error', {
            message: err && err.message ? err.message : String(err),
        });
        if (!res.headersSent) {
            res.status(502).json({ ok: false, error: 'upstream_error' });
        }
    });
    upstreamReq.setTimeout(30000, () => {
        upstreamReq.destroy(new Error('upstream connect timeout'));
    });
    req.on('close', () => {
        try { upstreamReq.destroy(); } catch (_) { /* ignore */ }
    });
    upstreamReq.end();
}

module.exports = {
    zlmHttpPort,
    allowedHosts,
    isAllowlistedZlmUpstream,
    toBrowserFlvUrl,
    proxyUpstreamFlv,
};
