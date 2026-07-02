/**
 * Optional online license heartbeat — vendor endpoint verifies lease/subscription.
 * Skipped when FM_LICENSE_HEARTBEAT_URL is unset (offline-only installs).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const platformLicense = require('./platformLicense');
const log = require('./fleetLog');

const STATE_FILENAME = 'license-heartbeat.json';
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 5 * 60 * 1000;

let storageDir = null;
let timer = null;
let startupTimer = null;
let state = null;

function heartbeatUrl() {
    const fromEnv = (process.env.FM_LICENSE_HEARTBEAT_URL || '').trim();
    if (fromEnv) return fromEnv;
    if (!storageDir) return '';
    try {
        const cloudDeployment = require('./cloudDeployment');
        return cloudDeployment.resolveEntitlementCheckUrl(storageDir);
    } catch (_) {
        return '';
    }
}

function heartbeatIntervalMs() {
    if (!storageDir) {
        return Math.max(3600000, parseInt(process.env.FM_LICENSE_HEARTBEAT_INTERVAL_MS || '', 10) || DEFAULT_INTERVAL_MS);
    }
    try {
        const cloudDeployment = require('./cloudDeployment');
        return cloudDeployment.resolveEntitlementCheckIntervalMs(storageDir);
    } catch (_) {
        return DEFAULT_INTERVAL_MS;
    }
}

function readUsageCounts(dir) {
    let bwcDevices = 0;
    let dashboardUsers = 0;
    try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, 'bwc-devices.json'), 'utf8'));
        const list = raw.devices || raw.channels || [];
        bwcDevices = list.filter(function (d) { return d && d.active !== false; }).length;
    } catch (_) { /* ignore */ }
    try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, 'dashboard-users.json'), 'utf8'));
        const list = Array.isArray(raw) ? raw : (raw.users || []);
        dashboardUsers = list.filter(function (u) { return u && u.active !== false; }).length;
    } catch (_) { /* ignore */ }
    return { bwcDevices: bwcDevices, dashboardUsers: dashboardUsers };
}

function clearTimers() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
    }
}

function scheduleChecks() {
    clearTimers();
    const url = heartbeatUrl();
    if (!url) return;
    const intervalMs = heartbeatIntervalMs();
    startupTimer = setTimeout(() => {
        runCheck().catch(() => {});
        timer = setInterval(() => {
            runCheck().catch(() => {});
        }, intervalMs);
        if (timer.unref) timer.unref();
    }, STARTUP_DELAY_MS);
    if (startupTimer.unref) startupTimer.unref();
}

function statePath() {
    return path.join(storageDir, STATE_FILENAME);
}

function loadState() {
    if (state) return state;
    try {
        if (fs.existsSync(statePath())) {
            state = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
            return state;
        }
    } catch (_) { /* ignore */ }
    state = {};
    return state;
}

function saveState(next) {
    state = next;
    try {
        fs.mkdirSync(storageDir, { recursive: true });
        fs.writeFileSync(statePath(), JSON.stringify(next, null, 2), 'utf8');
    } catch (err) {
        log.web.warn('license heartbeat state save failed', { message: err.message });
    }
}

function postJson(urlStr, body, extraHeaders) {
    return new Promise((resolve, reject) => {
        let url;
        try {
            url = new URL(urlStr);
        } catch (err) {
            reject(err);
            return;
        }
        const payload = JSON.stringify(body);
        const lib = url.protocol === 'https:' ? https : http;
        const headers = Object.assign({
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
        }, extraHeaders || {});
        const req = lib.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'POST',
            headers: headers,
            timeout: 15000,
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = raw ? JSON.parse(raw) : null;
                } catch (_) { /* ignore */ }
                resolve({ status: res.statusCode, body: parsed, raw });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('heartbeat timeout'));
        });
        req.write(payload);
        req.end();
    });
}

async function runCheck() {
    const url = heartbeatUrl();
    if (!url) return null;

    const lic = platformLicense.loadAndValidate();
    if (!lic.valid || !lic.license) {
        const st = loadState();
        saveState(Object.assign({}, st, {
            lastAttemptAt: new Date().toISOString(),
            ok: false,
            skipped: true,
            reason: 'no-valid-license',
        }));
        return loadState();
    }

    const payload = {
        licenseId: lic.license.licenseId,
        customerName: lic.license.customerName,
        type: lic.license.type,
        expiresAt: lic.license.expiresAt,
        appVersion: process.env.FM_APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
    };
    if (storageDir) {
        try {
            const cloud = require('./cloudDeployment').load(storageDir);
            if (cloud.siteReferenceId) payload.siteReferenceId = cloud.siteReferenceId;
            if (cloud.regionLabel) payload.regionLabel = cloud.regionLabel;
        } catch (_) { /* ignore */ }
        try {
            payload.usage = readUsageCounts(storageDir);
        } catch (_) { /* ignore */ }
    }

    try {
        const cloudDeployment = storageDir ? require('./cloudDeployment').load(storageDir) : null;
        const headers = {};
        if (cloudDeployment && cloudDeployment.entitlementCheckToken) {
            headers.Authorization = 'Bearer ' + cloudDeployment.entitlementCheckToken;
        }
        const res = await postJson(url, payload, headers);
        const body = res.body || {};
        const ok = res.status >= 200 && res.status < 300 && body.valid !== false && !body.revoked;
        const next = {
            lastAttemptAt: payload.timestamp,
            lastSuccessAt: ok ? payload.timestamp : (loadState().lastSuccessAt || null),
            ok,
            revoked: !!body.revoked,
            expiresAt: body.expiresAt || lic.license.expiresAt,
            message: body.message || null,
            httpStatus: res.status,
        };
        saveState(next);
        if (body.revoked) {
            log.web.warn('license heartbeat revoked', { licenseId: lic.license.licenseId });
        } else if (!ok) {
            log.web.warn('license heartbeat failed', { status: res.status });
        } else {
            log.web.info('license heartbeat ok', { licenseId: lic.license.licenseId });
        }
        return next;
    } catch (err) {
        const next = Object.assign({}, loadState(), {
            lastAttemptAt: payload.timestamp,
            ok: false,
            error: err.message,
        });
        saveState(next);
        log.web.warn('license heartbeat error', { message: err.message });
        return next;
    }
}

function getStatusPublic() {
    const url = heartbeatUrl();
    const st = loadState();
    return {
        configured: !!url,
        url: url ? url.replace(/\/\/[^@]+@/, '//***@') : null,
        lastAttemptAt: st.lastAttemptAt || null,
        lastSuccessAt: st.lastSuccessAt || null,
        ok: st.ok != null ? !!st.ok : null,
        revoked: !!st.revoked,
        message: st.message || st.error || null,
    };
}

function init(opts) {
    storageDir = opts.storageDir;
    loadState();
    scheduleChecks();
}

function reschedule() {
    if (!storageDir) return;
    scheduleChecks();
}

function invalidateCache() {
    state = null;
}

module.exports = {
    init,
    runCheck,
    reschedule,
    getStatusPublic,
    invalidateCache,
};
