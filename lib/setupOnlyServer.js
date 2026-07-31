'use strict';

/**
 * Setup-only HTTP(S) server — no Video / SIP / Analytics / full DB stack.
 * Used for --safe-mode, --reset-license, and boot-lock until license is valid.
 * Glass Fortress: headless Setup PIN required for all mutating Setup APIs.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const express = require('express');
const { spawnSync } = require('child_process');
const licenseManager = require('./licenseManager');
const dashboardTls = require('./dashboardTls');
const { localhostHttpGate } = require('./localhostHttpGate');
const { listenWithRetry } = require('./listenRetry');
const { glassFortress } = require('./glassFortressLog');

/** In-memory 6-digit PIN for this Setup process only */
let setupPin = null;

function generateSetupPin() {
    const n = crypto.randomInt(0, 1000000);
    setupPin = String(n).padStart(6, '0');
    return setupPin;
}

function getSetupPin() {
    return setupPin;
}

function setupPort() {
    const httpPort = parseInt(process.env.FM_HTTP_PORT || '3988', 10) || 3988;
    const httpsDash = parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438;
    let n = parseInt(process.env.SETUP_PORT || '13988', 10);
    if (!Number.isFinite(n) || n <= 0) n = 13988;
    /* Never share the live dashboard ports — that caused EACCES on lab :3988 */
    if (n === httpPort || n === httpsDash) {
        n = httpPort >= 13000 ? httpPort + 1000 : 13988;
        process.env.SETUP_PORT = String(n);
    }
    return n;
}

function ensureTlsCerts(appRoot) {
    try {
        spawnSync(
            process.execPath,
            [path.join(appRoot, 'scripts', 'ensure-lab-dashboard-tls-certs.js')],
            { encoding: 'utf8', windowsHide: true, cwd: appRoot }
        );
    } catch (_) { /* ignore */ }
    return dashboardTls.resolveFromEnv(appRoot);
}

function clearActiveLicenses(appRoot) {
    const removed = [];
    const candidates = [
        path.join(appRoot, 'storage', 'license.lic'),
        path.join(appRoot, 'license.lic'),
        path.join(appRoot, 'storage', 'platform-license.json'),
    ];
    candidates.forEach(function (p) {
        try {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
                removed.push(p);
            }
        } catch (_) { /* ignore */ }
    });
    try { licenseManager.invalidateCache(); } catch (_) { /* ignore */ }
    return removed;
}

function extractSetupPin(req) {
    const body = req.body;
    if (body && typeof body === 'object' && !Buffer.isBuffer(body) && body.pin != null) {
        return String(body.pin).trim();
    }
    const hdr = req.headers && (req.headers['x-me8-setup-pin'] || req.headers['x-setup-pin']);
    if (hdr) return String(hdr).trim();
    if (req.query && req.query.pin != null) return String(req.query.pin).trim();
    return '';
}

function requireSetupPin(req, res, next) {
    const got = extractSetupPin(req);
    if (!setupPin || got !== setupPin) {
        return res.status(401).json({
            ok: false,
            error: 'Setup PIN required or incorrect',
            code: 'SETUP_PIN_REQUIRED',
            message: 'Enter the 6-digit PIN printed in the server console / service log, then retry.',
        });
    }
    return next();
}

function buildSetupApp(appRoot) {
    if (!setupPin) generateSetupPin();

    const app = express();
    app.disable('x-powered-by');
    app.use(localhostHttpGate({ enabled: true }));
    /* octet-stream/text for license upload only — 10KB hard cap (DOS failsafe) */
    app.use(express.raw({ type: ['application/octet-stream', 'text/plain'], limit: '10kb' }));
    app.use(express.json({ limit: '64kb' }));

    const setupHtml = path.join(appRoot, 'public', 'setup-boot.html');
    app.get('/', function (_req, res) {
        if (fs.existsSync(setupHtml)) return res.sendFile(setupHtml);
        res.type('html').send('<h1>ME8 Setup</h1><p>Missing public/setup-boot.html</p>');
    });
    app.get('/api/setup/status', function (_req, res) {
        licenseManager.init({ baseDir: appRoot, storageDir: path.join(appRoot, 'storage') });
        const st = licenseManager.loadAndValidate();
        res.json({
            ok: true,
            setupPort: setupPort(),
            hardwareId: licenseManager.computeHardwareId(),
            licenseOk: !!(st && st.ok),
            licensePresent: !!(st && st.filePresent),
            error: st && st.error ? st.error : null,
            safeMode: process.env.FM_SAFE_MODE === '1',
            networkTier: process.env.ME8_NETWORK_TIER || 'lan',
            pinRequired: true,
        });
    });
    app.post('/api/setup/license', requireSetupPin, function (req, res) {
        try {
            const body = req.body;
            if (!body || !Buffer.isBuffer(body) || body.length < 32) {
                return res.status(400).json({ ok: false, error: 'Empty or invalid license body' });
            }
            if (body.length > 10240) {
                return res.status(413).json({ ok: false, error: 'Payload Too Large' });
            }
            const dest = path.join(appRoot, 'storage', 'license.lic');
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, body);
            licenseManager.invalidateCache();
            licenseManager.init({ baseDir: appRoot, storageDir: path.join(appRoot, 'storage') });
            const st = licenseManager.loadAndValidate();
            if (!st.ok) {
                try { fs.unlinkSync(dest); } catch (_) { /* ignore */ }
                return res.status(400).json({
                    ok: false,
                    error: st.error || licenseManager.FATAL,
                    hardwareId: licenseManager.computeHardwareId(),
                });
            }
            return res.json({
                ok: true,
                message: 'License accepted. Restart me8-server (without --safe-mode) to start full services.',
                hardwareId: licenseManager.computeHardwareId(),
            });
        } catch (err) {
            glassFortress(
                'Setup license upload failed.',
                err && err.message ? err.message : String(err),
                'Confirm the .lic file is valid Ed25519 JSON under 10KB and the Setup PIN is correct.'
            );
            return res.status(500).json({
                ok: false,
                error: err && err.message ? err.message : String(err),
            });
        }
    });
    app.post('/api/setup/network-tier', requireSetupPin, function (req, res) {
        try {
            const tier = String(req.body && req.body.tier || '').trim().toLowerCase();
            if (!['lan', 'wan', 'cloud', 'hybrid'].includes(tier)) {
                return res.status(400).json({ ok: false, error: 'Invalid network tier' });
            }

            const envPath = path.join(appRoot, '.env');
            let lines = [];
            if (fs.existsSync(envPath)) {
                lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
            }

            let found = false;
            lines = lines.map(function (line) {
                if (/^\s*ME8_NETWORK_TIER=/.test(line)) {
                    found = true;
                    return 'ME8_NETWORK_TIER=' + tier;
                }
                return line;
            });
            if (!found) lines.push('ME8_NETWORK_TIER=' + tier);

            fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
            process.env.ME8_NETWORK_TIER = tier;

            return res.json({
                ok: true,
                tier: tier,
                message: 'Deployment tier saved. Restart after license activation to apply full runtime behavior.',
            });
        } catch (err) {
            glassFortress(
                'Setup network-tier save failed.',
                err && err.message ? err.message : String(err),
                'Ensure the install folder is writable and the Setup PIN is correct, then retry.'
            );
            return res.status(500).json({
                ok: false,
                error: err && err.message ? err.message : String(err),
            });
        }
    });
    app.use(function (err, req, res, next) {
        if (err && (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413)) {
            return res.status(413).json({ ok: false, error: 'Payload Too Large' });
        }
        return next(err);
    });
    return app;
}

function startSetupOnlyServer(appRoot) {
    const root = appRoot || path.join(__dirname, '..');
    const port = setupPort();
    const httpsPortRaw = parseInt(process.env.SETUP_HTTPS_PORT || '', 10);
    let httpsPort = Number.isFinite(httpsPortRaw) && httpsPortRaw > 0 ? httpsPortRaw : (port + 1);
    if (httpsPort === port) httpsPort = port + 1;
    const dashHttp = parseInt(process.env.FM_HTTP_PORT || '3988', 10) || 3988;
    const dashHttps = parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438;
    if (httpsPort === dashHttp || httpsPort === dashHttps || httpsPort === port) {
        httpsPort = port + 1;
        process.env.SETUP_HTTPS_PORT = String(httpsPort);
    }
    licenseManager.init({ baseDir: root, storageDir: path.join(root, 'storage') });
    const pin = generateSetupPin();
    console.log('[ACTION REQUIRED] Setup Mode Active. Web UI PIN: ' + pin);
    const app = buildSetupApp(root);
    const tls = ensureTlsCerts(root);

    return new Promise(function (resolve, reject) {
        const httpSrv = http.createServer(app);
        let httpsSrv = null;

        listenWithRetry(httpSrv, port, '127.0.0.1', { label: 'Setup HTTP :' + port })
            .then(function () {
                console.log('[setup] HTTP Setup UI bound 127.0.0.1:' + port);
                console.log('[setup] Hardware ID: ' + licenseManager.computeHardwareId());
                console.log('[setup] Video / DB / Analytics halted until valid license + normal restart.');
                console.log('[setup] HTTP (no SSL lockout): http://127.0.0.1:' + port);
                console.log('[ACTION REQUIRED] Setup Mode Active. Web UI PIN: ' + pin);

                if (!(tls && tls.ready && tls.httpsOptions)) {
                    resolve({ http: httpSrv, https: null, port: port, httpsPort: httpsPort, setupPin: pin });
                    return;
                }
                try {
                    httpsSrv = https.createServer(tls.httpsOptions, app);
                    return listenWithRetry(httpsSrv, httpsPort, '127.0.0.1', {
                        label: 'Setup HTTPS :' + httpsPort,
                        retries: 5,
                    }).then(function () {
                        console.log('[setup] HTTPS Setup UI bound 127.0.0.1:' + httpsPort);
                        resolve({ http: httpSrv, https: httpsSrv, port: port, httpsPort: httpsPort, setupPin: pin });
                    }).catch(function (err) {
                        console.warn('[setup] HTTPS listen failed (HTTP localhost still up):', err && err.message);
                        try { httpsSrv.close(); } catch (_) { /* ignore */ }
                        resolve({ http: httpSrv, https: null, port: port, httpsPort: httpsPort, setupPin: pin });
                    });
                } catch (err) {
                    console.warn('[setup] HTTPS create failed:', err.message);
                    resolve({ http: httpSrv, https: null, port: port, httpsPort: httpsPort, setupPin: pin });
                }
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

module.exports = {
    setupPort,
    clearActiveLicenses,
    startSetupOnlyServer,
    buildSetupApp,
    generateSetupPin,
    getSetupPin,
    requireSetupPin,
};
