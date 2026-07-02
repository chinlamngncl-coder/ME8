'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DISPATCH_TTL_MS = 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'fm_officer_session';

const sessions = new Map();
let webPush = null;
try {
    webPush = require('web-push');
} catch (e) {
    webPush = null;
}

function enabledFromEnv(env) {
    return (env || process.env).FM_OFFICER_APP_ENABLED !== '0';
}

function paths(storageDir) {
    const root = path.join(storageDir, 'officer-app');
    return {
        root,
        vapid: path.join(root, 'vapid.json'),
        push: path.join(root, 'push-subscriptions.json'),
        dispatches: path.join(root, 'dispatches-by-cam.json'),
    };
}

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) { /* ignore */ }
    return fallback;
}

function writeJson(filePath, data) {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function safeEqual(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
}

function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i < 0) return;
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (k) out[k] = decodeURIComponent(v);
    });
    return out;
}

function getVapidKeys(storageDir, publicBaseUrl) {
    const p = paths(storageDir);
    let keys = readJson(p.vapid, null);
    if (keys && keys.publicKey && keys.privateKey) return keys;
    if (!webPush) return null;
    const generated = webPush.generateVAPIDKeys();
    keys = {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
        subject: publicBaseUrl ? `mailto:mobility@${publicBaseUrl.replace(/^https?:\/\//, '')}` : 'mailto:mobility@mobility-c2.local',
        createdAt: new Date().toISOString(),
    };
    writeJson(p.vapid, keys);
    return keys;
}

function configureWebPush(vapid) {
    if (!webPush || !vapid) return false;
    webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    return true;
}

function createSession(camId) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { camId: String(camId), expiresAt: Date.now() + SESSION_TTL_MS });
    return token;
}

function sessionFromToken(token) {
    if (!token) return null;
    const s = sessions.get(String(token));
    if (!s) return null;
    if (s.expiresAt < Date.now()) {
        sessions.delete(String(token));
        return null;
    }
    return s;
}

function setSessionCookie(res, token) {
    const maxAge = Math.floor(SESSION_TTL_MS / 1000);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function officerSessionFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    return sessionFromToken(cookies[COOKIE_NAME]);
}

function verifyDeviceLogin(loadBwcDevices, deviceId, password) {
    const bwcDevices = require('./bwcDevices');
    const rec = bwcDevices.findById(loadBwcDevices(), String(deviceId || '').trim());
    if (!rec) return null;
    const pass = String(password || '');
    const stored = String(rec.password || '');
    if (!stored || !safeEqual(pass, stored)) return null;
    return rec;
}

function loadPushSubs(storageDir) {
    return readJson(paths(storageDir).push, { subscriptions: {} });
}

function savePushSubs(storageDir, data) {
    writeJson(paths(storageDir).push, data);
}

function addPushSubscription(storageDir, camId, sub) {
    if (!camId || !sub || !sub.endpoint) return false;
    const data = loadPushSubs(storageDir);
    const key = String(camId);
    if (!data.subscriptions[key]) data.subscriptions[key] = [];
    const list = data.subscriptions[key].filter((s) => s.endpoint !== sub.endpoint);
    list.unshift({ ...sub, updatedAt: Date.now() });
    data.subscriptions[key] = list.slice(0, 5);
    savePushSubs(storageDir, data);
    return true;
}

function loadDispatches(storageDir) {
    return readJson(paths(storageDir).dispatches, { byCam: {} });
}

function saveDispatches(storageDir, data) {
    writeJson(paths(storageDir).dispatches, data);
}

function recordDispatch(storageDir, entry, team) {
    const data = loadDispatches(storageDir);
    const now = Date.now();
    Object.keys(data.byCam).forEach((camId) => {
        data.byCam[camId] = (data.byCam[camId] || []).filter((d) => d.expiresAt > now);
    });
    (team || []).forEach((camId) => {
        const id = String(camId);
        if (!data.byCam[id]) data.byCam[id] = [];
        data.byCam[id].unshift(entry);
        data.byCam[id] = data.byCam[id].slice(0, 15);
    });
    saveDispatches(storageDir, data);
    return entry;
}

function listDispatchesForCam(storageDir, camId) {
    const data = loadDispatches(storageDir);
    const now = Date.now();
    return (data.byCam[String(camId)] || []).filter((d) => d.expiresAt > now);
}

async function pushToCamIds(storageDir, publicBaseUrl, camIds, payload, log) {
    const vapid = getVapidKeys(storageDir, publicBaseUrl);
    if (!configureWebPush(vapid)) {
        return { ok: false, reason: webPush ? 'no_vapid' : 'web_push_module_missing', sent: 0 };
    }
    const subs = loadPushSubs(storageDir);
    let sent = 0;
    let failed = 0;
    const body = JSON.stringify(payload);
    for (const camId of camIds || []) {
        const list = subs.subscriptions[String(camId)] || [];
        for (const sub of list) {
            try {
                await webPush.sendNotification(sub, body, { TTL: 86400 });
                sent += 1;
            } catch (err) {
                failed += 1;
                if (log) log.web.warn('officer push failed', { camId, status: err.statusCode, err: err.message });
                if (err.statusCode === 404 || err.statusCode === 410) {
                    subs.subscriptions[String(camId)] = list.filter((s) => s.endpoint !== sub.endpoint);
                }
            }
        }
    }
    savePushSubs(storageDir, subs);
    return { ok: sent > 0, sent, failed };
}

async function dispatchToTeam(opts, log) {
    const {
        storageDir,
        publicBaseUrl,
        team,
        alarmCamId,
        lat,
        lon,
        radiusM,
        shareUrl,
        shareToken,
        mapsUrl,
        resolveOperatorNameForCam,
    } = opts;
    const id = crypto.randomBytes(8).toString('hex');
    const entry = {
        id,
        createdAt: Date.now(),
        expiresAt: Date.now() + DISPATCH_TTL_MS,
        alarmCamId: alarmCamId || '',
        lat,
        lon,
        radiusM,
        shareUrl: shareUrl || '',
        shareToken: shareToken || '',
        mapsUrl: mapsUrl || '',
        team: (team || []).slice(),
    };
    recordDispatch(storageDir, entry, team);
    const officerBase = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, '')}/officer/` : '/officer/';
    const openUrl = shareUrl || `${officerBase}#dispatch/${id}`;
    const pushPayload = {
        title: 'SOS assist — dispatch',
        body: `Assist alarm ${String(alarmCamId || '').slice(-6)} · tap for map`,
        url: openUrl,
        tag: `mobility-dispatch-${id}`,
        dispatchId: id,
    };
    const pushResult = await pushToCamIds(storageDir, publicBaseUrl, team, pushPayload, log);
    return {
        ok: true,
        dispatchId: id,
        push: pushResult,
        teamSize: (team || []).length,
    };
}

function requireOfficerSession(req, res, next) {
    const session = officerSessionFromRequest(req);
    if (!session) {
        return res.status(401).json({ ok: false, error: 'Officer login required' });
    }
    req.officerSession = session;
    return next();
}

function registerOfficerAppRoutes(app, opts) {
    const {
        storageDir,
        loadBwcDevices,
        resolveOperatorNameForCam,
        publicBaseUrl,
        log,
        publicDir,
    } = opts;
    const officerStatic = path.join(publicDir, 'officer');

    app.use('/officer', express.static(officerStatic, { index: false }));
    app.get(['/officer', '/officer/'], (req, res) => {
        res.sendFile(path.join(officerStatic, 'index.html'));
    });

    app.get('/api/officer/push/vapid-public-key', (req, res) => {
        if (!enabledFromEnv()) return res.status(404).json({ ok: false, error: 'Officer app disabled' });
        const vapid = getVapidKeys(storageDir, publicBaseUrl);
        if (!vapid) {
            return res.status(503).json({ ok: false, error: 'Web push unavailable — run npm install web-push' });
        }
        res.json({ ok: true, publicKey: vapid.publicKey });
    });

    app.post('/api/officer/login', (req, res) => {
        if (!enabledFromEnv()) return res.status(404).json({ ok: false, error: 'Officer app disabled' });
        try {
            const body = req.body || {};
            const deviceId = String(body.deviceId || body.camId || '').trim();
            const password = String(body.password || '');
            const rec = verifyDeviceLogin(loadBwcDevices, deviceId, password);
            if (!rec) {
                return res.status(401).json({ ok: false, error: 'Invalid device ID or password' });
            }
            const token = createSession(rec.deviceId);
            setSessionCookie(res, token);
            res.json({
                ok: true,
                camId: rec.deviceId,
                operatorName: rec.operatorName || resolveOperatorNameForCam(rec.deviceId) || rec.deviceId.slice(-8),
            });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });

    app.post('/api/officer/logout', (req, res) => {
        const cookies = parseCookies(req.headers.cookie);
        if (cookies[COOKIE_NAME]) sessions.delete(cookies[COOKIE_NAME]);
        clearSessionCookie(res);
        res.json({ ok: true });
    });

    app.get('/api/officer/session', (req, res) => {
        const session = officerSessionFromRequest(req);
        if (!session) return res.json({ ok: false });
        res.json({
            ok: true,
            camId: session.camId,
            operatorName: resolveOperatorNameForCam(session.camId) || session.camId.slice(-8),
        });
    });

    app.post('/api/officer/push/subscribe', requireOfficerSession, (req, res) => {
        const body = req.body || {};
        const sub = body.subscription || body;
        if (!sub || !sub.endpoint) {
            return res.status(400).json({ ok: false, error: 'Push subscription required' });
        }
        addPushSubscription(storageDir, req.officerSession.camId, sub);
        res.json({ ok: true });
    });

    app.get('/api/officer/dispatch/feed', requireOfficerSession, (req, res) => {
        const list = listDispatchesForCam(storageDir, req.officerSession.camId);
        res.json({ ok: true, dispatches: list });
    });

    app.get('/api/officer/dispatch/:id', requireOfficerSession, (req, res) => {
        const list = listDispatchesForCam(storageDir, req.officerSession.camId);
        const hit = list.find((d) => d.id === req.params.id);
        if (!hit) return res.status(404).json({ ok: false, error: 'Dispatch not found or expired' });
        res.json({ ok: true, dispatch: hit });
    });
}

function getStatusPublic(storageDir, publicBaseUrl) {
    const vapid = getVapidKeys(storageDir, publicBaseUrl);
    return {
        enabled: enabledFromEnv(),
        webPushReady: !!(webPush && vapid),
        installUrl: '/officer/',
        pushModule: webPush ? 'web-push' : 'missing',
    };
}

module.exports = {
    enabledFromEnv,
    registerOfficerAppRoutes,
    dispatchToTeam,
    getStatusPublic,
    officerSessionFromRequest,
    COOKIE_NAME,
};
