/**
 * ZLMediaKit sidecar — health probe and config (mob-me8-zlm-sidecar).
 * Ingest bridge + failover (mob-me8-zlm-ingest-bridge, mob-me8-zlm-failover).
 */
'use strict';

const http = require('http');
const https = require('https');

const DEFAULT_HTTP_URL = 'http://127.0.0.1:8080';
const DEFAULT_PROBE_MS = 15000;

let cachedStatus = null;
let monitorTimer = null;

function trimUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function readConfig() {
    const liveEngine = String(process.env.FM_LIVE_ENGINE || 'ffmpeg').trim().toLowerCase();
    const enabledExplicit = process.env.FM_ZLM_ENABLED === '1';
    const enabled = enabledExplicit || liveEngine === 'zlm';
    return {
        enabled,
        liveEngine,
        fallbackFfmpeg: process.env.FM_LIVE_FALLBACK_FFMPEG !== '0',
        httpUrl: trimUrl(process.env.FM_ZLM_HTTP_URL) || DEFAULT_HTTP_URL,
        secret: String(process.env.FM_ZLM_SECRET || '').trim(),
        binPath: String(process.env.FM_ZLM_BIN || '').trim(),
        configPath: String(process.env.FM_ZLM_CONFIG || '').trim(),
        autostart: process.env.FM_ZLM_AUTOSTART !== '0',
        probeMs: parseInt(process.env.FM_ZLM_HEALTH_MS || String(DEFAULT_PROBE_MS), 10) || DEFAULT_PROBE_MS,
    };
}

function isPrimaryEngine() {
    const cfg = readConfig();
    return cfg.liveEngine === 'zlm';
}

function isFallbackEnabled() {
    return readConfig().fallbackFfmpeg;
}

function httpGetJson(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        let parsed;
        try {
            parsed = new URL(url);
        } catch (err) {
            reject(err);
            return;
        }
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(
            parsed,
            { method: 'GET', timeout: timeoutMs || 4000 },
            (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, json: JSON.parse(body) });
                    } catch (e) {
                        reject(new Error('Invalid JSON from ZLM API'));
                    }
                });
            }
        );
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('ZLM API timeout'));
        });
        req.on('error', reject);
        req.end();
    });
}

function buildHealthUrl(cfg) {
    const base = cfg.httpUrl;
    const q = cfg.secret ? ('?secret=' + encodeURIComponent(cfg.secret)) : '';
    return base + '/index/api/getServerConfig' + q;
}

async function probeHealth(options) {
    const opts = options || {};
    const cfg = readConfig();
    const result = {
        ok: false,
        configured: cfg.enabled,
        primary: isPrimaryEngine(),
        fallbackFfmpeg: cfg.fallbackFfmpeg,
        httpUrl: cfg.httpUrl,
        binPath: cfg.binPath || null,
        autostart: cfg.autostart,
        apiCode: null,
        error: null,
        checkedAt: new Date().toISOString(),
    };

    if (!cfg.enabled) {
        result.error = 'ZLM sidecar disabled (set FM_ZLM_ENABLED=1 or FM_LIVE_ENGINE=zlm)';
        cachedStatus = result;
        return result;
    }

    try {
        const { status, json } = await httpGetJson(buildHealthUrl(cfg), opts.timeoutMs || 4000);
        if (status >= 200 && status < 300 && json && (json.code === 0 || json.code === undefined)) {
            result.ok = true;
            result.apiCode = json.code != null ? json.code : 0;
            if (json.data && json.data.general) {
                result.mediaServerVersion = json.data.general.mediaServerVersion || null;
            }
        } else {
            result.error = 'ZLM API HTTP ' + status + (json && json.msg ? ': ' + json.msg : '');
            result.apiCode = json && json.code != null ? json.code : null;
        }
    } catch (err) {
        result.error = err.message || String(err);
    }

    cachedStatus = result;
    return result;
}

function getCachedStatus() {
    return cachedStatus;
}

function getStatusPublic() {
    const s = cachedStatus || { ok: false, configured: readConfig().enabled };
    return {
        ok: !!s.ok,
        configured: !!s.configured,
        primary: isPrimaryEngine(),
        fallbackFfmpeg: isFallbackEnabled(),
        httpUrl: s.httpUrl || readConfig().httpUrl,
        binConfigured: !!readConfig().binPath,
        autostart: readConfig().autostart,
        mediaServerVersion: s.mediaServerVersion || null,
        error: s.ok ? null : (s.error || 'Not probed yet'),
        checkedAt: s.checkedAt || null,
    };
}

function startHealthMonitor(log) {
    const cfg = readConfig();
    if (monitorTimer) return;
    if (!cfg.enabled) return;

    const tick = () => {
        probeHealth().then((st) => {
            if (!st.ok && log && log.media) {
                log.media.warn('zlm sidecar health fail', {
                    error: st.error,
                    httpUrl: st.httpUrl,
                    primary: st.primary,
                });
            }
        }).catch(() => { /* ignore */ });
    };

    tick();
    monitorTimer = setInterval(tick, Math.max(5000, cfg.probeMs));
    if (monitorTimer.unref) monitorTimer.unref();
}

function stopHealthMonitor() {
    if (monitorTimer) {
        clearInterval(monitorTimer);
        monitorTimer = null;
    }
}

module.exports = {
    readConfig,
    isPrimaryEngine,
    isFallbackEnabled,
    probeHealth,
    getCachedStatus,
    getStatusPublic,
    startHealthMonitor,
    stopHealthMonitor,
};
