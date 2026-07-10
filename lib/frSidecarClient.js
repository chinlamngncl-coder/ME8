/**
 * FR recognition sidecar client (DeepFace Facenet/SFace via FastAPI).
 * License gate is the caller's responsibility (analyticsFace / fr).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SIDE_DIR = path.join(__dirname, '..', 'fr-sidecar');
const DEFAULT_PORT = parseInt(process.env.FM_FR_SIDECAR_PORT || '8765', 10);
const DEFAULT_HOST = process.env.FM_FR_SIDECAR_HOST || '127.0.0.1';
const AUTO = process.env.FM_FR_SIDECAR_AUTO === '1';

let child = null;
let starting = null;

function baseUrl() {
    return (process.env.FM_FR_SIDECAR_URL || ('http://' + DEFAULT_HOST + ':' + DEFAULT_PORT)).replace(/\/$/, '');
}

function pythonBin() {
    if (process.env.FM_FR_PY) return process.env.FM_FR_PY;
    const venvPy = process.platform === 'win32'
        ? path.join(SIDE_DIR, '.venv', 'Scripts', 'python.exe')
        : path.join(SIDE_DIR, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPy)) return venvPy;
    return process.platform === 'win32' ? 'py' : 'python3';
}

function httpJson(method, urlPath, body, timeoutMs) {
    return new Promise((resolve) => {
        const u = new URL(baseUrl() + urlPath);
        const payload = body != null ? Buffer.from(JSON.stringify(body), 'utf8') : null;
        const req = http.request({
            hostname: u.hostname,
            port: u.port || 80,
            path: u.pathname + u.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': payload.length } : {}),
            },
            timeout: timeoutMs || 120000,
        }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (_) { parsed = { ok: false, raw: data.slice(0, 200) }; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });
        req.on('error', (err) => resolve({ status: 0, body: { ok: false, error: 'sidecar_unreachable', message: err.message } }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 0, body: { ok: false, error: 'sidecar_timeout' } });
        });
        if (payload) req.write(payload);
        req.end();
    });
}

async function health() {
    const r = await httpJson('GET', '/health', null, 3000);
    if (r.status === 200 && r.body && r.body.ok) return { ok: true, ...r.body, url: baseUrl() };
    return { ok: false, error: (r.body && r.body.error) || 'not_running', url: baseUrl(), detail: r.body };
}

function startProcess() {
    if (child && !child.killed) return Promise.resolve();
    if (starting) return starting;
    starting = new Promise((resolve) => {
        const py = pythonBin();
        const args = py === 'py'
            ? ['-3', '-m', 'uvicorn', 'app:app', '--host', DEFAULT_HOST, '--port', String(DEFAULT_PORT)]
            : ['-m', 'uvicorn', 'app:app', '--host', DEFAULT_HOST, '--port', String(DEFAULT_PORT)];
        try {
            child = spawn(py, args, {
                cwd: SIDE_DIR,
                windowsHide: true,
                env: Object.assign({}, process.env, {
                    FM_FR_MODEL: process.env.FM_FR_MODEL || 'Facenet',
                }),
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (err) {
            starting = null;
            resolve({ ok: false, error: err.message });
            return;
        }
        child.on('exit', () => { child = null; });
        let tries = 0;
        const tick = async () => {
            tries += 1;
            const h = await health();
            if (h.ok) {
                starting = null;
                resolve({ ok: true, started: true });
                return;
            }
            if (tries >= 40) {
                starting = null;
                resolve({ ok: false, error: 'sidecar_start_timeout', hint: 'Double-click START-FR.bat in the ME8 folder' });
                return;
            }
            setTimeout(tick, 500);
        };
        setTimeout(tick, 800);
    });
    return starting;
}

async function ensureReady() {
    const h = await health();
    if (h.ok) return h;
    if (!AUTO) {
        return {
            ok: false,
            error: 'sidecar_not_running',
            hint: 'Face matching is not running. On the server double-click START-FR.bat and leave that window open.',
            url: baseUrl(),
        };
    }
    const started = await startProcess();
    if (!started.ok) return started;
    return health();
}

async function verifyPaths(path1, path2, model) {
    const ready = await ensureReady();
    if (!ready.ok) return ready;
    if (!path1 || !path2 || !fs.existsSync(path1) || !fs.existsSync(path2)) {
        return { ok: false, error: 'image_path_missing' };
    }
    const r = await httpJson('POST', '/verify', {
        path1: path1,
        path2: path2,
        model: model || process.env.FM_FR_MODEL || 'Facenet',
    }, 180000);
    if (r.status >= 200 && r.status < 300) return r.body;
    return r.body || { ok: false, error: 'verify_http_' + r.status };
}

async function verifyBase64(b64a, b64b, model) {
    const ready = await ensureReady();
    if (!ready.ok) return ready;
    const r = await httpJson('POST', '/verify', {
        image1_b64: b64a,
        image2_b64: b64b,
        model: model || process.env.FM_FR_MODEL || 'Facenet',
    }, 180000);
    if (r.status >= 200 && r.status < 300) return r.body;
    return r.body || { ok: false, error: 'verify_http_' + r.status };
}

async function representPath(imagePath, model) {
    const ready = await ensureReady();
    if (!ready.ok) return ready;
    if (!imagePath || !fs.existsSync(imagePath)) {
        return { ok: false, error: 'image_path_missing' };
    }
    const r = await httpJson('POST', '/represent', {
        path: imagePath,
        model: model || process.env.FM_FR_MODEL || 'Facenet',
    }, 180000);
    if (r.status >= 200 && r.status < 300) return r.body;
    return r.body || { ok: false, error: 'represent_http_' + r.status };
}

async function representProbePath(imagePath, model) {
    const ready = await ensureReady();
    if (!ready.ok) return ready;
    if (!imagePath || !fs.existsSync(imagePath)) {
        return { ok: false, error: 'image_path_missing' };
    }
    const r = await httpJson('POST', '/represent-probe', {
        path: imagePath,
        model: model || process.env.FM_FR_MODEL || 'Facenet',
    }, 180000);
    if (r.status >= 200 && r.status < 300) return r.body;
    return r.body || { ok: false, error: 'represent_http_' + r.status };
}

function stop() {
    if (child && !child.killed) {
        try { child.kill(); } catch (_) { /* ignore */ }
        child = null;
    }
}

module.exports = {
    health,
    ensureReady,
    verifyPaths,
    verifyBase64,
    representPath,
    representProbePath,
    stop,
    paths: { dir: SIDE_DIR },
    baseUrl,
};
