/**
 * ZLM (ZLMediaKit) sidecar health + REST helpers.
 * Off by default (FM_ZLM_ENABLED=0) — does not affect FFmpeg/JSMpeg path.
 */
const log = require('./fleetLog');

const config = {
    enabled: process.env.FM_ZLM_ENABLED === '1',
    httpBase: String(process.env.FM_ZLM_HTTP || 'http://127.0.0.1:80').replace(/\/$/, ''),
    secret: process.env.FM_ZLM_SECRET || '',
    app: process.env.FM_ZLM_APP || 'live',
    vhost: process.env.FM_ZLM_VHOST || '__defaultVhost__',
};

let lastHealth = { ok: false, reason: 'not_checked', checkedAt: 0 };
let warmupDone = false;

function isEnabled() {
    return config.enabled;
}

function getConfigPublic() {
    return {
        enabled: config.enabled,
        httpBase: config.httpBase,
        app: config.app,
        vhost: config.vhost,
        hasSecret: !!config.secret,
    };
}

function getStatus() {
    return {
        ...getConfigPublic(),
        health: { ...lastHealth },
        warmupDone,
    };
}

function apiUrl(path, params) {
    const url = new URL(config.httpBase + path);
    if (params) {
        Object.keys(params).forEach((k) => {
            if (params[k] != null && params[k] !== '') url.searchParams.set(k, String(params[k]));
        });
    }
    if (config.secret) url.searchParams.set('secret', config.secret);
    return url.toString();
}

async function fetchJson(url, timeoutMs) {
    const ms = timeoutMs || 4000;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
    try {
        const res = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (_) {
            throw new Error('ZLM API returned non-JSON');
        }
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function healthCheck(force) {
    if (!config.enabled) {
        lastHealth = { ok: false, reason: 'disabled', checkedAt: Date.now() };
        return lastHealth;
    }
    if (!config.secret) {
        lastHealth = { ok: false, reason: 'missing_secret', checkedAt: Date.now() };
        return lastHealth;
    }
    if (!force && Date.now() - lastHealth.checkedAt < 8000 && lastHealth.checkedAt > 0) {
        return lastHealth;
    }
    try {
        const json = await fetchJson(apiUrl('/index/api/getServerConfig'));
        if (json && json.code === 0) {
            lastHealth = { ok: true, reason: 'ok', checkedAt: Date.now() };
            log.media.info('zlm health ok', { httpBase: config.httpBase });
        } else {
            lastHealth = {
                ok: false,
                reason: (json && json.msg) || 'api_error',
                checkedAt: Date.now(),
            };
            log.media.warn('zlm health fail', { reason: lastHealth.reason });
        }
    } catch (err) {
        lastHealth = { ok: false, reason: err.message || 'unreachable', checkedAt: Date.now() };
        log.media.warn('zlm health unreachable', { message: lastHealth.reason });
    }
    return lastHealth;
}

function isHealthy() {
    return !!(config.enabled && lastHealth.ok);
}

async function warmup(logger) {
    warmupDone = true;
    if (!config.enabled) {
        (logger || log).media.info('zlm disabled — FFmpeg path unchanged');
        return lastHealth;
    }
    (logger || log).media.info('zlm warmup', getConfigPublic());
    return healthCheck(true);
}

async function openRtpServer(streamId) {
    const json = await fetchJson(apiUrl('/index/api/openRtpServer', {
        port: 0,
        tcp_mode: 0,
        stream_id: streamId,
    }));
    if (!json || json.code !== 0) {
        throw new Error((json && json.msg) || 'openRtpServer failed');
    }
    return { port: json.port, streamId };
}

async function closeRtpServer(streamId) {
    try {
        const json = await fetchJson(apiUrl('/index/api/closeRtpServer', { stream_id: streamId }));
        if (json && json.code === 0) {
            log.media.info('zlm rtp server closed', { streamId });
        }
    } catch (err) {
        log.media.warn('zlm closeRtpServer', { streamId, message: err.message });
    }
}

function flvPlayUrl(streamId) {
    const base = config.httpBase.replace(/\/$/, '');
    let url = base + '/' + config.app + '/' + encodeURIComponent(streamId) + '.live.flv';
    if (config.vhost && config.vhost !== '__defaultVhost__') {
        url += '?vhost=' + encodeURIComponent(config.vhost);
    }
    return url;
}

function streamIdForCam(camId) {
    return String(camId || '').trim().replace(/[^\w.-]/g, '_');
}

module.exports = {
    isEnabled,
    isHealthy,
    getStatus,
    getConfigPublic,
    healthCheck,
    warmup,
    openRtpServer,
    closeRtpServer,
    flvPlayUrl,
    streamIdForCam,
};
