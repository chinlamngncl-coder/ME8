/**
 * ZLM REST helpers for Gate B lab — no liveStreamPool import.
 */
const log = require('./fleetLog');

const config = {
    enabled: process.env.FM_ZLM_ENABLED === '1',
    httpBase: String(process.env.FM_ZLM_HTTP || 'http://127.0.0.1:80').replace(/\/$/, ''),
    secret: String(process.env.FM_ZLM_SECRET || '').trim(),
    app: String(process.env.FM_ZLM_APP || 'live').trim(),
    vhost: String(process.env.FM_ZLM_VHOST || '__defaultVhost__').trim(),
    rtmpBase: String(process.env.FM_ZLM_RTMP || 'rtmp://127.0.0.1:1935').replace(/\/$/, ''),
};

let lastHealth = { ok: false, reason: 'not_checked', checkedAt: 0 };

function isEnabled() {
    return config.enabled;
}

function getConfigPublic() {
    return {
        enabled: config.enabled,
        httpBase: config.httpBase,
        app: config.app,
        vhost: config.vhost,
        rtmpBase: config.rtmpBase,
        hasSecret: !!config.secret,
    };
}

function getStatus() {
    return {
        ...getConfigPublic(),
        health: { ...lastHealth },
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

function streamIdForCam(camId) {
    return String(camId || '').trim().replace(/[^\w.-]/g, '_');
}

function flvPlayUrl(streamId) {
    const base = config.httpBase.replace(/\/$/, '');
    let url = base + '/' + config.app + '/' + encodeURIComponent(streamId) + '.live.flv';
    if (config.vhost && config.vhost !== '__defaultVhost__') {
        url += '?vhost=' + encodeURIComponent(config.vhost);
    }
    return url;
}

function rtmpPublishUrl(streamId) {
    return config.rtmpBase + '/' + config.app + '/' + encodeURIComponent(streamId);
}

async function isStreamPublished(streamId) {
    if (!isHealthy()) return false;
    try {
        const json = await fetchJson(apiUrl('/index/api/getMediaList'));
        if (!json || json.code !== 0 || !Array.isArray(json.data)) return false;
        const sid = String(streamId || '').trim();
        return json.data.some((row) => {
            const app = row && row.app ? String(row.app) : '';
            const stream = row && row.stream ? String(row.stream) : '';
            return app === config.app && (stream === sid || stream === sid + '.live');
        });
    } catch (_) {
        return false;
    }
}

module.exports = {
    isEnabled,
    isHealthy,
    getStatus,
    getConfigPublic,
    healthCheck,
    streamIdForCam,
    flvPlayUrl,
    rtmpPublishUrl,
    isStreamPublished,
};
