/**
 * Weapon sidecar client (127.0.0.1:8769) — RF-DETR Threat Apache-2.0.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const WD_DIR = path.join(ROOT, 'weapon-sidecar');
const STORAGE_DIR = path.join(ROOT, 'storage');
const SIDECAR_STDERR_LOG = path.join(STORAGE_DIR, 'weapon-sidecar-stderr.log');

const PORT = parseInt(process.env.FM_WEAPON_SIDECAR_PORT || '8769', 10);
const DEFAULT_HOST = process.env.FM_WEAPON_SIDECAR_HOST || '127.0.0.1';
const AUTO = process.env.FM_WEAPON_SIDECAR_AUTO === '1';

let child = null;
let starting = null;
/** Skip /health on every detect when recently OK. */
let healthOkUntil = 0;
let detectBackoffUntil = 0;

function baseUrl() {
    return 'http://' + DEFAULT_HOST + ':' + PORT;
}

function appendSidecarLog(line) {
    try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.appendFileSync(SIDECAR_STDERR_LOG, line, 'utf8');
    } catch (_) { /* ignore */ }
}

function resolvePython() {
    const venvPy = path.join(WD_DIR, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvPy)) return venvPy;
    const venvPyUnix = path.join(WD_DIR, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPyUnix)) return venvPyUnix;
    return process.env.FM_WEAPON_PYTHON || 'python';
}

function httpJson(method, urlPath, body, timeoutMs) {
    return new Promise((resolve) => {
        const payload = body == null ? null : Buffer.from(JSON.stringify(body), 'utf8');
        const req = http.request({
            host: DEFAULT_HOST,
            port: PORT,
            path: urlPath,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': payload.length } : {}),
            },
            timeout: timeoutMs || 60000,
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let parsed = null;
                try { parsed = raw ? JSON.parse(raw) : null; } catch (_) {
                    parsed = { ok: false, error: 'bad_json', raw: raw.slice(0, 200) };
                }
                resolve({ status: res.statusCode || 0, body: parsed });
            });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 0, body: { ok: false, error: 'timeout' } });
        });
        req.on('error', (err) => {
            resolve({
                status: 0,
                body: {
                    ok: false,
                    error: 'sidecar_unreachable',
                    message: String(err && err.message || err).slice(0, 120),
                },
            });
        });
        if (payload) req.write(payload);
        req.end();
    });
}

async function health() {
    const r = await httpJson('GET', '/health', null, 12000);
    if (r.status >= 200 && r.status < 300 && r.body && r.body.ok) {
        return Object.assign({ ok: true }, r.body);
    }
    return {
        ok: false,
        error: (r.body && r.body.error) || 'sidecar_unreachable',
        engine: 'rfdetr-threat-apache',
        message: r.body && (r.body.message || r.body.hint),
        hint: AUTO
            ? 'Weapon engine is starting or not installed. Wait, or run START-WEAPON.bat once.'
            : 'Weapon engine is not running. Double-click START-WEAPON.bat and leave that window open.',
        url: baseUrl(),
    };
}

function startProcess() {
    if (starting) return starting;
    starting = new Promise((resolve) => {
        if (child && !child.killed) {
            starting = null;
            resolve({ ok: true, started: true });
            return;
        }
        const py = resolvePython();
        const args = ['-m', 'uvicorn', 'app:app', '--host', DEFAULT_HOST, '--port', String(PORT)];
        try {
            appendSidecarLog('spawn ' + py + ' ' + args.join(' ') + '\n');
            child = spawn(py, args, {
                cwd: WD_DIR,
                windowsHide: true,
                env: Object.assign({}, process.env),
            });
            child.stderr.on('data', (buf) => appendSidecarLog(String(buf)));
            child.on('exit', () => { child = null; });
        } catch (err) {
            starting = null;
            resolve({ ok: false, error: 'spawn_failed', message: String(err && err.message || err).slice(0, 160) });
            return;
        }
        let n = 0;
        const tick = async () => {
            const h = await health();
            // WEAPON-ENGINE-WARM-AUTO-V1: HTTP up + warming is not model-ready
            if (h.ok && h.ready !== false && !h.warming) {
                starting = null;
                resolve({ ok: true, started: true });
                return;
            }
            if (++n > 80) {
                starting = null;
                resolve({
                    ok: false,
                    error: 'sidecar_start_timeout',
                    hint: 'Run START-WEAPON.bat once. First install downloads RF-DETR weights.',
                });
                return;
            }
            setTimeout(tick, 500);
        };
        setTimeout(tick, 800);
    });
    return starting;
}

function isFullyReady(h) {
    return !!(h && h.ok && h.ready !== false && !h.warming);
}

async function ensureReady() {
    if (Date.now() < healthOkUntil) {
        return { ok: true, ready: true, engine: 'rfdetr-threat-apache', cached: true };
    }
    const h = await health();
    if (isFullyReady(h)) {
        healthOkUntil = Date.now() + 15000;
        return h;
    }
    // Reachable but still loading weights — do not cache as ready
    if (h.ok && (h.warming || h.ready === false)) {
        healthOkUntil = 0;
        return h;
    }
    healthOkUntil = 0;
    if (!AUTO) {
        return {
            ok: false,
            error: 'sidecar_not_running',
            engine: 'rfdetr-threat-apache',
            hint: 'Double-click START-WEAPON.bat in the ME8 folder and leave it open.',
            url: baseUrl(),
        };
    }
    const started = await startProcess();
    if (!started.ok) return started;
    const h2 = await health();
    if (isFullyReady(h2)) healthOkUntil = Date.now() + 15000;
    return h2;
}

async function detectPath(absPath, opts) {
    if (Date.now() < detectBackoffUntil) {
        return { ok: false, error: 'sidecar_backoff' };
    }
    const ready = await ensureReady();
    if (!ready.ok) {
        detectBackoffUntil = Date.now() + 4000;
        return {
            ok: false,
            error: ready.error || 'sidecar_unreachable',
            message: ready.message || ready.hint,
        };
    }
    if (ready.warming || ready.ready === false) {
        return { ok: false, error: 'warming', message: ready.hint || 'Weapon engine warming' };
    }
    if (!absPath || !fs.existsSync(absPath)) {
        return { ok: false, error: 'bad_file' };
    }
    const r = await httpJson('POST', '/detect', {
        path: absPath,
        cam_id: opts && opts.camId ? String(opts.camId) : null,
    }, 20000);
    if (r.status >= 200 && r.status < 300 && r.body) {
        healthOkUntil = Date.now() + 15000;
        return r.body;
    }
    if (!r.status || (r.body && r.body.error === 'timeout')) {
        detectBackoffUntil = Date.now() + 4000;
        healthOkUntil = 0;
    }
    return r.body || { ok: false, error: 'failed' };
}

function isAutoStartEnabled() {
    return AUTO;
}

module.exports = {
    health,
    ensureReady,
    detectPath,
    isAutoStartEnabled,
    baseUrl,
};
