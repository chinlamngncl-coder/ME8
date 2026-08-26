'use strict';
/**
 * ANPR ingest external service — grab/track/OCR off Fleet main.
 * Env: FM_ANPR_FLEET_URL (default http://127.0.0.1:3888)
 *      FM_ANPR_INGEST_TOKEN (optional; must match Fleet)
 *      FM_ANPR_INGEST_WORKER=1 (set by this entry)
 */
process.env.FM_ANPR_INGEST_WORKER = '1';

const path = require('path');
const http = require('http');
const https = require('https');
const runtime = require('./anprLivePollerRuntime');

const FLEET = String(process.env.FM_ANPR_FLEET_URL || 'http://127.0.0.1:3888').replace(/\/$/, '');
const TOKEN = String(process.env.FM_ANPR_INGEST_TOKEN || '').trim();
const POLL_MS = Math.max(500, Math.min(5000, parseInt(process.env.FM_ANPR_INGEST_POLL_MS || '1000', 10) || 1000));

function installRoot() {
    if (process.pkg) {
        const exeDir = path.dirname(process.execPath);
        if (path.basename(exeDir).toLowerCase() === 'bin') return path.dirname(exeDir);
        return exeDir;
    }
    return path.join(__dirname, '..');
}
let storageDir = path.join(installRoot(), 'storage');
let startedRuntime = false;

function fleetRequest(method, apiPath, bodyObj) {
    return new Promise((resolve, reject) => {
        let u;
        try {
            u = new URL(FLEET + apiPath);
        } catch (err) {
            reject(err);
            return;
        }
        const lib = u.protocol === 'https:' ? https : http;
        const payload = bodyObj != null ? Buffer.from(JSON.stringify(bodyObj), 'utf8') : null;
        const headers = { Accept: 'application/json' };
        if (TOKEN) headers['x-anpr-ingest-token'] = TOKEN;
        if (payload) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = String(payload.length);
        }
        const req = lib.request({
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port || (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname + u.search,
            method,
            headers,
            timeout: 8000,
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try { json = raw ? JSON.parse(raw) : null; } catch (_) { json = { raw }; }
                if (res.statusCode >= 400) {
                    reject(new Error('fleet HTTP ' + res.statusCode + ' ' + String(raw).slice(0, 120)));
                    return;
                }
                resolve(json);
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            try { req.destroy(); } catch (_) { /* ignore */ }
            reject(new Error('fleet timeout'));
        });
        if (payload) req.write(payload);
        req.end();
    });
}

async function postMsg(msg) {
    try {
        await fleetRequest('POST', '/api/analytics/anpr/ingest-tick', msg);
    } catch (err) {
        console.log('[anpr-ingest] post fail', String(err && err.message || err).slice(0, 120));
    }
}

function ensureRuntime(state) {
    if (state && state.storageDir) storageDir = state.storageDir;
    if (startedRuntime) return;
    runtime.init({
        storageDir,
        videoWsPort: state && state.videoWsPort,
        isAnprLicensed: () => true,
        deviceLabel: (id) => String(id),
        getGps: () => null,
        emit: (event, payload, camId) => {
            postMsg({ type: 'emit', event, payload, camId });
        },
        onHit: (hit) => {
            postMsg({ type: 'onHit', hit });
        },
    });
    runtime.start();
    startedRuntime = true;
    console.log('[anpr-ingest] runtime started grabMs=' + runtime.GRAB_MS);
}

function applyState(state) {
    if (!state || !state.ok) return;
    ensureRuntime(state);
    const cams = Array.isArray(state.cams) ? state.cams : [];
    const ids = cams.map((c) => c.camId);
    const flvMap = Object.create(null);
    const labels = Object.create(null);
    const gps = Object.create(null);
    cams.forEach((c) => {
        if (!c || !c.camId) return;
        if (c.flvUrl) flvMap[c.camId] = c.flvUrl;
        if (c.label) labels[c.camId] = c.label;
        if (c.gps) gps[c.camId] = c.gps;
    });
    runtime.applyChildIpc({ type: 'licensed', value: !!state.licensed });
    runtime.applyChildIpc({ type: 'liveCams', ids });
    runtime.applyChildIpc({ type: 'liveFlv', map: flvMap });
    runtime.applyChildIpc({ type: 'labels', map: labels });
    runtime.applyChildIpc({ type: 'gps', map: gps });
    runtime.applyChildIpc({ type: 'setWatchSlots', socketId: 'external-ingest', camIds: ids });
}

async function tick() {
    try {
        const state = await fleetRequest('GET', '/api/analytics/anpr/ingest-state');
        applyState(state);
    } catch (err) {
        console.log('[anpr-ingest] state fail', String(err && err.message || err).slice(0, 120));
    }
}

console.log('[anpr-ingest] external service → ' + FLEET);
setInterval(() => { tick().catch(() => {}); }, POLL_MS);
tick().catch(() => {});
