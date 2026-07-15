/**
 * FR recognition sidecar client.
 * mob-fr-sidecar-primary-poc: FM_FR_ENGINE=deepface|onnx|seeta
 *   seeta    → fr-sidecar-seeta/ :8767 (live — mob-fr-seeta-sidecar-wire)
 *   onnx     → fr-sidecar-fast/ :8766 (fallback only)
 *   deepface → fr-sidecar/ :8765 (backup only)
 * mob-fr-seeta-sidecar-wire: default engine = seeta when FM_FR_ENGINE unset.
 * License gate is the caller's responsibility (analyticsFace / fr).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DEEPFACE_DIR = path.join(ROOT, 'fr-sidecar');
const FAST_DIR = path.join(ROOT, 'fr-sidecar-fast');
const SEETA_DIR = path.join(ROOT, 'fr-sidecar-seeta');
const STORAGE_DIR = path.join(ROOT, 'storage');
const SIDECAR_STDERR_LOG = path.join(STORAGE_DIR, 'fr-sidecar-stderr.log');

const DEEPFACE_PORT = parseInt(process.env.FM_FR_SIDECAR_PORT || '8765', 10);
const FAST_PORT = parseInt(process.env.FM_FR_SIDECAR_FAST_PORT || '8766', 10);
const SEETA_PORT = parseInt(process.env.FM_FR_SIDECAR_SEETA_PORT || '8767', 10);
const DEFAULT_HOST = process.env.FM_FR_SIDECAR_HOST || '127.0.0.1';
const AUTO = process.env.FM_FR_SIDECAR_AUTO === '1';
const FALLBACK_DEEPFACE = process.env.FM_FR_FALLBACK_DEEPFACE === '1';
/** Cold uvicorn + first probe can take minutes on a busy PC — default 3 min. */
const BOOTSTRAP_TRIES = Math.max(40, parseInt(process.env.FM_FR_BOOTSTRAP_TRIES || '360', 10) || 360);
const BOOTSTRAP_POLL_MS = Math.max(250, parseInt(process.env.FM_FR_BOOTSTRAP_POLL_MS || '500', 10) || 500);

let child = null;
let starting = null;
let bootstrapDone = false;

function normalizeEngine() {
    /* mob-fr-seeta-sidecar-wire — default live engine = seeta; onnx/deepface via FM_FR_ENGINE only */
    const raw = String(process.env.FM_FR_ENGINE || 'seeta').trim().toLowerCase();
    if (raw === 'deepface' || raw === 'backup') return 'deepface';
    if (raw === 'onnx' || raw === 'primary' || raw === 'fast' || raw === 'insightface') return 'onnx';
    if (raw === 'seeta' || raw === 'seetaface' || raw === 'seetaface6') return 'seeta';
    return 'seeta';
}

function engineConfig() {
    const engine = normalizeEngine();
    if (engine === 'onnx') {
        return {
            engine,
            dir: FAST_DIR,
            port: FAST_PORT,
            defaultUrl: 'http://' + DEFAULT_HOST + ':' + FAST_PORT,
            logTag: 'fr-sidecar-fast',
        };
    }
    if (engine === 'seeta') {
        return {
            engine,
            dir: SEETA_DIR,
            port: SEETA_PORT,
            defaultUrl: 'http://' + DEFAULT_HOST + ':' + SEETA_PORT,
            logTag: 'fr-sidecar-seeta',
        };
    }
    return {
        engine: 'deepface',
        dir: DEEPFACE_DIR,
        port: DEEPFACE_PORT,
        defaultUrl: 'http://' + DEFAULT_HOST + ':' + DEEPFACE_PORT,
        logTag: 'fr-sidecar',
    };
}

function appendSidecarLog(line) {
    try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.appendFileSync(SIDECAR_STDERR_LOG, line, 'utf8');
    } catch (_) { /* ignore */ }
}

function baseUrl() {
    if (process.env.FM_FR_SIDECAR_URL) {
        return String(process.env.FM_FR_SIDECAR_URL).replace(/\/$/, '');
    }
    return engineConfig().defaultUrl.replace(/\/$/, '');
}

function pythonBin(sideDir) {
    if (process.env.FM_FR_PY && normalizeEngine() === 'deepface') return process.env.FM_FR_PY;
    if (process.env.FM_FR_FAST_PY && normalizeEngine() === 'onnx') return process.env.FM_FR_FAST_PY;
    if (process.env.FM_FR_SEETA_PY && normalizeEngine() === 'seeta') return process.env.FM_FR_SEETA_PY;
    const dir = sideDir || engineConfig().dir;
    const venvPy = process.platform === 'win32'
        ? path.join(dir, '.venv', 'Scripts', 'python.exe')
        : path.join(dir, '.venv', 'bin', 'python');
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
    const cfg = engineConfig();
    const r = await httpJson('GET', '/health', null, 3000);
    if (r.status === 200 && r.body && (r.body.ok || r.body.ready)) {
        return {
            ok: true,
            ready: true,
            engine: r.body.engine || cfg.engine,
            fallback: r.body.fallback || 'deepface',
            ...r.body,
            url: baseUrl(),
        };
    }
    return {
        ok: false,
        ready: false,
        engine: cfg.engine,
        fallback: 'deepface',
        error: (r.body && r.body.error) || 'not_running',
        url: baseUrl(),
        detail: r.body,
        hint: cfg.engine === 'seeta'
            ? 'Start Seeta lab: fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1 then START-SEETA-LAB.bat'
            : undefined,
    };
}

function startProcess() {
    const cfg = engineConfig();
    if (child && !child.killed) return Promise.resolve({ ok: true, started: false });
    if (starting) return starting;
    starting = new Promise((resolve) => {
        const py = pythonBin(cfg.dir);
        const args = py === 'py'
            ? ['-3', '-m', 'uvicorn', 'app:app', '--host', DEFAULT_HOST, '--port', String(cfg.port)]
            : ['-m', 'uvicorn', 'app:app', '--host', DEFAULT_HOST, '--port', String(cfg.port)];
        appendSidecarLog('\n--- ' + cfg.logTag + ' spawn ' + new Date().toISOString() + ' ---\n'
            + 'engine=' + cfg.engine + ' python=' + py + ' cwd=' + cfg.dir + ' port=' + cfg.port + '\n');
        if (!fs.existsSync(cfg.dir)) {
            starting = null;
            resolve({
                ok: false,
                error: 'sidecar_dir_missing',
                hint: cfg.engine === 'seeta'
                    ? 'fr-sidecar-seeta missing. Pull ME8 and run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1'
                    : (cfg.engine === 'onnx'
                        ? 'fr-sidecar-fast missing. Pull latest ME8 and run fr-sidecar-fast INSTALL.'
                        : 'fr-sidecar folder missing.'),
            });
            return;
        }
        if (!fs.existsSync(py) && py !== 'py' && py !== 'python3') {
            starting = null;
            resolve({
                ok: false,
                error: 'python_missing',
                hint: cfg.engine === 'seeta'
                    ? 'Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1 once, then restart.'
                    : (cfg.engine === 'onnx'
                        ? 'Install ONNX FR once: cd fr-sidecar-fast && py -3 -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt'
                        : 'Face matching Python not found. Run START-FR.bat once in the ME8 folder, then restart the service.'),
                python: py,
            });
            return;
        }
        try {
            const env = Object.assign({}, process.env, {
                FM_FR_MODEL: process.env.FM_FR_MODEL || 'Facenet',
                FM_FR_SIDECAR_HOST: DEFAULT_HOST,
                FM_FR_SIDECAR_PORT: String(cfg.port),
                FM_FR_SIDECAR_FAST_PORT: String(FAST_PORT),
            });
            child = spawn(py, args, {
                cwd: cfg.dir,
                windowsHide: true,
                env: env,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (err) {
            appendSidecarLog('spawn error: ' + String(err && err.message || err) + '\n');
            starting = null;
            resolve({ ok: false, error: err.message });
            return;
        }
        child.on('error', (err) => {
            appendSidecarLog('child error: ' + String(err && err.message || err) + '\n');
        });
        child.on('exit', (code, signal) => {
            appendSidecarLog('exit code=' + code + ' signal=' + (signal || '') + '\n');
            child = null;
        });
        if (child.stderr) {
            child.stderr.on('data', (chunk) => {
                appendSidecarLog(chunk.toString('utf8'));
            });
        }
        let tries = 0;
        const tick = async () => {
            tries += 1;
            const h = await health();
            if (h.ok) {
                starting = null;
                resolve({ ok: true, started: true, engine: cfg.engine });
                return;
            }
            if (tries >= BOOTSTRAP_TRIES) {
                starting = null;
                resolve({
                    ok: false,
                    error: 'sidecar_start_timeout',
                    engine: cfg.engine,
                    hint: cfg.engine === 'onnx'
                        ? 'ONNX FR still starting or packages missing. Install fr-sidecar-fast requirements, then restart.'
                        : (AUTO
                            ? 'Face matching is still starting or not installed. First-time setup may need START-FR.bat once, then restart the service.'
                            : 'Double-click START-FR.bat in the ME8 folder'),
                    python: py,
                    tries,
                });
                return;
            }
            setTimeout(tick, BOOTSTRAP_POLL_MS);
        };
        setTimeout(tick, 800);
    });
    return starting;
}

async function ensureReady() {
    const h = await health();
    if (h.ok) return h;
    const cfg = engineConfig();
    if (cfg.notWired) return h;
    if (!AUTO) {
        return {
            ok: false,
            error: 'sidecar_not_running',
            engine: cfg.engine,
            hint: cfg.engine === 'onnx'
                ? 'ONNX FR not running. Set FM_FR_SIDECAR_AUTO=1 or start fr-sidecar-fast uvicorn on 8766.'
                : (AUTO
                    ? 'Face matching is starting. Wait a moment and refresh, or ask IT to restart the service.'
                    : 'Face matching is not running. On the server double-click START-FR.bat and leave that window open.'),
            url: baseUrl(),
        };
    }
    const started = await startProcess();
    if (!started.ok) {
        if (FALLBACK_DEEPFACE && cfg.engine === 'onnx') {
            appendSidecarLog('primary failed; FM_FR_FALLBACK_DEEPFACE=1 — set FM_FR_ENGINE=deepface manually for now\n');
        }
        return started;
    }
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
    if (normalizeEngine() === 'onnx') {
        return {
            ok: false,
            error: 'onnx_path_only',
            hint: 'ONNX POC verify uses server paths. Use DeepFace (FM_FR_ENGINE=deepface) for browser b64 verify, or save files first.',
        };
    }
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

/** Batch probe (primary ONNX). DeepFace sidecar may 404 — falls back to serial probes. */
async function representProbeBatchPaths(imagePaths, model) {
    const ready = await ensureReady();
    if (!ready.ok) return ready;
    const paths = (imagePaths || []).filter((p) => p && fs.existsSync(p));
    if (!paths.length) return { ok: false, error: 'image_path_missing' };
    const r = await httpJson('POST', '/represent-probe-batch', {
        paths: paths,
        model: model || process.env.FM_FR_MODEL || 'Facenet',
    }, 300000);
    if (r.status >= 200 && r.status < 300 && r.body && r.body.ok) return r.body;
    // Fallback: serial single probes (DeepFace has no batch yet)
    const results = [];
    for (const p of paths) {
        const one = await representProbePath(p, model);
        results.push(Object.assign({ path: p }, one || {}));
    }
    return {
        ok: true,
        engine: normalizeEngine(),
        count: results.length,
        batchTotalMs: null,
        results: results,
        serialFallback: true,
    };
}

function stop() {
    if (child && !child.killed) {
        try { child.kill(); } catch (_) { /* ignore */ }
        child = null;
    }
}

/** mob-runtime-fr-child-process: start FR sidecar in background when AUTO=1 (service / enterprise). */
async function bootstrap() {
    if (!AUTO) return health();
    if (bootstrapDone) return health();
    bootstrapDone = true;
    const h = await health();
    if (h.ok) return h;
    return ensureReady();
}

function isAutoStartEnabled() {
    return AUTO;
}

function activeEngine() {
    return normalizeEngine();
}

module.exports = {
    health,
    bootstrap,
    isAutoStartEnabled,
    ensureReady,
    verifyPaths,
    verifyBase64,
    representPath,
    representProbePath,
    representProbeBatchPaths,
    stop,
    activeEngine,
    paths: { dir: DEEPFACE_DIR, fastDir: FAST_DIR },
    baseUrl,
};
