/**
 * ANPR MOB-601 sidecar client (127.0.0.1:8768).
 * License gate is caller's responsibility (analyticsAnpr).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const ANPR_DIR = path.join(ROOT, 'anpr-sidecar');
const STORAGE_DIR = path.join(ROOT, 'storage');
const SIDECAR_STDERR_LOG = path.join(STORAGE_DIR, 'anpr-sidecar-stderr.log');

const PORT = parseInt(process.env.FM_ANPR_SIDECAR_PORT || '8768', 10);
const DEFAULT_HOST = process.env.FM_ANPR_SIDECAR_HOST || '127.0.0.1';
const AUTO = process.env.FM_ANPR_SIDECAR_AUTO === '1';
const BOOTSTRAP_TRIES = Math.max(20, parseInt(process.env.FM_ANPR_BOOTSTRAP_TRIES || '120', 10) || 120);
const BOOTSTRAP_POLL_MS = Math.max(250, parseInt(process.env.FM_ANPR_BOOTSTRAP_POLL_MS || '500', 10) || 500);

let child = null;
let starting = null;

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
    const venvPy = path.join(ANPR_DIR, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvPy)) return venvPy;
    const venvPyUnix = path.join(ANPR_DIR, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPyUnix)) return venvPyUnix;
    return process.env.FM_ANPR_PYTHON || 'python';
}

function resolveCompiledExe() {
    const name = process.platform === 'win32' ? 'anpr-engine.exe' : 'anpr-engine';
    const hits = [path.join(ROOT, 'bin', name), path.join(ROOT, name)];
    for (let i = 0; i < hits.length; i++) {
        if (fs.existsSync(hits[i])) return hits[i];
    }
    return '';
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
                try { parsed = raw ? JSON.parse(raw) : null; } catch (_) { parsed = { ok: false, error: 'bad_json', raw: raw.slice(0, 200) }; }
                resolve({ status: res.statusCode || 0, body: parsed });
            });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 0, body: { ok: false, error: 'timeout' } });
        });
        req.on('error', (err) => {
            resolve({ status: 0, body: { ok: false, error: 'sidecar_unreachable', message: String(err && err.message || err).slice(0, 120) } });
        });
        if (payload) req.write(payload);
        req.end();
    });
}

async function health() {
    const r = await httpJson('GET', '/health', null, 8000);
    if (r.status >= 200 && r.status < 300 && r.body && r.body.ok) {
        return Object.assign({ ok: true }, r.body);
    }
    if (r.body && r.body.error === 'timeout') {
        return { ok: false, error: 'timeout', engine: 'fastalpr-ship-v1' };
    }
    return {
        ok: false,
        error: (r.body && r.body.error) || 'sidecar_unreachable',
        engine: 'fastalpr-ship-v1',
        message: r.body && r.body.message,
        hint: AUTO
            ? 'ANPR is starting or not installed. Wait, or run START-ANPR.bat once.'
            : 'Plate reading is not running. On the server double-click START-ANPR.bat and leave that window open.',
        url: baseUrl(),
        detail: r.body,
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
        const compiled = resolveCompiledExe();
        const py = compiled || resolvePython();
        const args = compiled ? [] : ['-m', 'uvicorn', 'app:app', '--host', DEFAULT_HOST, '--port', String(PORT)];
        try {
            appendSidecarLog('spawn ' + py + ' ' + args.join(' ') + '\n');
            child = spawn(py, args, {
                cwd: compiled ? path.dirname(compiled) : ANPR_DIR,
                windowsHide: true,
                env: Object.assign({}, process.env, {
                    FM_ANPR_REGION: process.env.FM_ANPR_REGION || 'ph',
                    FM_ANPR_CONF_FLOOR: process.env.FM_ANPR_CONF_FLOOR || '0.50',
                    FM_ANPR_LIVE_CONF_FLOOR: process.env.FM_ANPR_LIVE_CONF_FLOOR || '0.50',
                    FM_ANPR_OCR_CONF_FLOOR: process.env.FM_ANPR_OCR_CONF_FLOOR || '0.50',
                    FM_ANPR_DUAL_CONF: process.env.FM_ANPR_DUAL_CONF || '0.50',
                    FM_ANPR_STRICT_REGEX: process.env.FM_ANPR_STRICT_REGEX || '0',
                    FM_ANPR_FASTALPR_OCR: process.env.FM_ANPR_FASTALPR_OCR || 'cct-s-v2-global-model',
                    FM_ANPR_TEMPORAL_MIN_LOCK: process.env.FM_ANPR_TEMPORAL_MIN_LOCK || '2',
                    FM_ANPR_TEMPORAL_N: process.env.FM_ANPR_TEMPORAL_N || '3',
                    // ANPR-BEST-PLATE-CROP-TRACK-V1
                    FM_ANPR_BOX_PAD: process.env.FM_ANPR_BOX_PAD || '0.10',
                    FM_ANPR_PLATE_RANK_K: process.env.FM_ANPR_PLATE_RANK_K || '3',
                    FM_ANPR_ENHANCE_SKIP_FM: process.env.FM_ANPR_ENHANCE_SKIP_FM || '80',
                    // ANPR-OCR-CCT-S-GLOBAL-V1
                    FM_ANPR_ENGINE: process.env.FM_ANPR_ENGINE || 'rapidocr',
                    FM_ANPR_FASTALPR_DET: process.env.FM_ANPR_FASTALPR_DET
                        || 'yolo-v9-t-512-license-plate-end2end',
                    FM_ANPR_FASTALPR_DET_CONF: process.env.FM_ANPR_FASTALPR_DET_CONF || '0.18',
                    FM_ANPR_BLUR_FLOOR: process.env.FM_ANPR_BLUR_FLOOR || '20',
                    FM_ANPR_MICRO_BLUR_FLOOR: process.env.FM_ANPR_MICRO_BLUR_FLOOR || '35',
                    FM_ANPR_ENGINE_B: process.env.FM_ANPR_ENGINE_B || 'hyperlpr3',
                    FM_ANPR_DUAL_ENGINE: process.env.FM_ANPR_DUAL_ENGINE || '1',
                    FM_ANPR_OCR_TIMEOUT_S: process.env.FM_ANPR_OCR_TIMEOUT_S || '2.5',
                    FM_ANPR_FISHEYE: process.env.FM_ANPR_FISHEYE || '0',
                }),
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (err) {
            appendSidecarLog('spawn error: ' + String(err && err.message || err) + '\n');
            starting = null;
            resolve({ ok: false, error: err.message });
            return;
        }
        child.on('exit', () => { child = null; });
        if (child.stderr) {
            child.stderr.on('data', (chunk) => appendSidecarLog(chunk.toString('utf8')));
        }
        let tries = 0;
        const tick = async () => {
            tries += 1;
            const h = await health();
            if (h.ok) {
                starting = null;
                resolve({ ok: true, started: true });
                return;
            }
            if (tries >= BOOTSTRAP_TRIES) {
                starting = null;
                resolve({
                    ok: false,
                    error: 'sidecar_start_timeout',
                    hint: 'Run anpr-sidecar\\INSTALL.ps1 then START-ANPR.bat',
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

async function ensureReady(opts) {
    const h = await health();
    if (h.ok) return h;
    if (!AUTO && !(opts && opts.force)) {
        return {
            ok: false,
            error: 'sidecar_not_running',
            engine: 'fastalpr-ship-v1',
            hint: 'Double-click START-ANPR.bat in the ME8 folder and leave it open.',
            url: baseUrl(),
        };
    }
    const started = await startProcess();
    if (!started.ok) return started;
    return health();
}

function stop() {
    if (child && !child.killed) {
        try { child.kill(); } catch (_) { /* ignore */ }
        child = null;
    }
}

async function bootstrap(opts) {
    const force = !!(opts && opts.force);
    if (!AUTO && !force) return health();
    const h = await health();
    if (h.ok) return h;
    return ensureReady({ force: force });
}

async function readPath(absPath, opts) {
    const ready = await ensureReady();
    if (!ready.ok) {
        return {
            ok: false,
            error: ready.error === 'sidecar_unreachable' || ready.error === 'sidecar_not_running' || ready.error === 'sidecar_start_timeout'
                ? 'sidecar_unreachable'
                : (ready.error || 'engine_missing'),
            message: ready.message || ready.hint,
        };
    }
    if (!absPath || !fs.existsSync(absPath)) {
        return { ok: false, error: 'bad_file' };
    }
    const region = (opts && opts.region) || process.env.FM_ANPR_REGION || 'ph';
    // ANPR-PLATE-DETECT-ROI-V1 — detect ON by default; set skipYolo:true only for lab hatch
    const skipYolo = !!(opts && opts.skipYolo === true);
    const r = await httpJson('POST', '/read', {
        path: absPath,
        region: region,
        skip_yolo: skipYolo,
        skip_detect: skipYolo,
        ocr_path: (opts && opts.ocrPath) || 'heavy',
    }, 180000);
    if (r.status >= 200 && r.status < 300 && r.body) return r.body;
    return r.body || { ok: false, error: 'failed' };
}

/** Live track-only — Stage-1 YOLO + macro crop; no WPOD/OCR. */
async function trackPath(absPath, opts) {
    const ready = await ensureReady();
    if (!ready.ok) {
        return {
            ok: false,
            trackOnly: true,
            error: ready.error === 'sidecar_unreachable' || ready.error === 'sidecar_not_running' || ready.error === 'sidecar_start_timeout'
                ? 'sidecar_unreachable'
                : (ready.error || 'engine_missing'),
            message: ready.message || ready.hint,
        };
    }
    if (!absPath || !fs.existsSync(absPath)) {
        return { ok: false, trackOnly: true, error: 'bad_file' };
    }
    const camId = (opts && opts.camId) ? String(opts.camId) : null;
    const r = await httpJson('POST', '/track', {
        path: absPath,
        cam_id: camId,
        stream_id: camId,
    }, 30000);
    if (r.status >= 200 && r.status < 300 && r.body) return r.body;
    return r.body || { ok: false, trackOnly: true, error: 'failed' };
}

/** Deferred dual-engine OCR on a saved vehicle macro-crop (+ optional trackId for temporal lock). */
async function readMacroPath(absPath, opts) {
    const ready = await ensureReady();
    if (!ready.ok) {
        return {
            ok: false,
            error: ready.error === 'sidecar_unreachable' || ready.error === 'sidecar_not_running' || ready.error === 'sidecar_start_timeout'
                ? 'sidecar_unreachable'
                : (ready.error || 'engine_missing'),
            message: ready.message || ready.hint,
        };
    }
    if (!absPath || !fs.existsSync(absPath)) {
        return { ok: false, error: 'bad_file' };
    }
    const region = (opts && opts.region) || process.env.FM_ANPR_REGION || 'ph';
    const body = {
        path: absPath,
        region: region,
        ocr_path: (opts && opts.ocrPath) || 'live',
    };
    if (opts && opts.trackId != null && String(opts.trackId).trim()) {
        body.track_id = String(opts.trackId).trim();
    }
    const ocrMs = Math.max(
        800,
        Math.min(8000, parseInt(process.env.FM_ANPR_OCR_TIMEOUT_MS || '2500', 10) || 2500)
    );
    const r = await httpJson('POST', '/read-macro', body, ocrMs);
    if (r.status >= 200 && r.status < 300 && r.body) return r.body;
    if (r.body && r.body.error === 'timeout') {
        return {
            ok: false,
            unclear: true,
            error: 'ocr_timeout',
            message: 'OCR exceeded live budget — skipped',
            reviewStatus: 'Unclear / Manual Review',
        };
    }
    return r.body || { ok: false, error: 'failed' };
}

async function watchStart(camId, streamUrl, sessionId) {
    const r = await httpJson('POST', '/watch/start', {
        camId: String(camId || ''),
        streamUrl: String(streamUrl || ''),
        sessionId: sessionId != null ? String(sessionId) : undefined,
    }, 15000);
    return r.body || { ok: false, error: 'failed' };
}

async function watchStop(camId, sessionId) {
    const r = await httpJson('POST', '/watch/stop', {
        camId: String(camId || ''),
        sessionId: sessionId != null ? String(sessionId) : undefined,
    }, 10000);
    return r.body || { ok: false, error: 'failed' };
}

async function watchEvents(maxN) {
    const n = Math.max(1, Math.min(64, parseInt(maxN, 10) || 16));
    const r = await httpJson('GET', '/watch/events?max=' + n, null, 8000);
    return r.body || { ok: false, events: [] };
}

function isAutoStartEnabled() {
    return AUTO;
}

module.exports = {
    health,
    bootstrap,
    ensureReady,
    readPath,
    trackPath,
    readMacroPath,
    watchStart,
    watchStop,
    watchEvents,
    isAutoStartEnabled,
    baseUrl,
    stop,
};
