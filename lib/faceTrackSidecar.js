/**
 * Face-track / face-follow sidecar bridge.
 *
 * mob-evidence-redact-seeta-detect-v1:
 *   Default detector = SeetaFace6 (fr-sidecar-seeta vendor).
 *   YuNet only if FM_REDACT_FACE_ENGINE=yunet.
 *
 * Spawns redaction-track/detect_faces.py.
 * Gated by analyticsFace ("fr") on server routes.
 * Modes: selfcheck, detect (preview), burn (per-frame face-follow).
 * Never on the live wall path.
 */

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SIDE_DIR = path.join(ROOT, 'redaction-track');
const SEETA_DIR = path.join(ROOT, 'fr-sidecar-seeta');
const SCRIPT = path.join(SIDE_DIR, 'detect_faces.py');
const YUNET_MODEL = path.join(SIDE_DIR, 'models', 'face_detection_yunet.onnx');

function redactFaceEngine() {
    const raw = String(process.env.FM_REDACT_FACE_ENGINE || 'seeta').trim().toLowerCase();
    if (raw === 'yunet' || raw === 'opencv' || raw === 'opencv-yunet') return 'yunet';
    return 'seeta';
}

/** Candidate python launchers, in order. Override with FM_PY_BIN / FM_FR_SEETA_PY. */
function pythonCandidates(engine) {
    const out = [];
    if (process.env.FM_PY_BIN) out.push(process.env.FM_PY_BIN);
    if (engine === 'seeta' && process.env.FM_FR_SEETA_PY) out.push(process.env.FM_FR_SEETA_PY);
    if (engine === 'seeta') {
        const seetaPy = process.platform === 'win32'
            ? path.join(SEETA_DIR, '.venv', 'Scripts', 'python.exe')
            : path.join(SEETA_DIR, '.venv', 'bin', 'python');
        if (fs.existsSync(seetaPy)) out.push(seetaPy);
    }
    const venvPy = process.platform === 'win32'
        ? path.join(SIDE_DIR, '.venv', 'Scripts', 'python.exe')
        : path.join(SIDE_DIR, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPy)) out.push(venvPy);
    if (process.platform === 'win32') {
        out.push('py', 'python', 'python3');
    } else {
        out.push('python3', 'python');
    }
    return out;
}

function runPython(pyBin, args, opts) {
    return new Promise((resolve) => {
        const finalArgs = (pyBin === 'py') ? ['-3', SCRIPT].concat(args) : [SCRIPT].concat(args);
        execFile(pyBin, finalArgs, {
            timeout: (opts && opts.timeout) || 120000,
            windowsHide: true,
            maxBuffer: 32 * 1024 * 1024,
            env: Object.assign({}, process.env, {
                /* Seeta ctypes finds models relative to vendor package */
            }),
        }, (err, stdout, stderr) => {
            resolve({ err: err || null, stdout: String(stdout || ''), stderr: String(stderr || '') });
        });
    });
}

function parseJsonLoose(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { /* try to salvage */ }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { return null; }
    }
    return null;
}

function engineArgs(engine) {
    const args = ['--engine', engine];
    if (engine === 'yunet') args.push('--model', YUNET_MODEL);
    else args.push('--model', YUNET_MODEL); /* unused for seeta; keep argparse happy */
    return args;
}

/**
 * Report whether the detection runtime is installed and usable.
 * Never throws. Returns { ok, engine, python?, cv2?, model, ... }.
 */
async function selfCheck() {
    if (!fs.existsSync(SCRIPT)) {
        return { ok: false, error: 'sidecar script missing', script: SCRIPT };
    }
    const engine = redactFaceEngine();
    const tried = [];
    for (const pyBin of pythonCandidates(engine)) {
        const res = await runPython(pyBin, ['selfcheck'].concat(engineArgs(engine)), { timeout: 20000 });
        const report = parseJsonLoose(res.stdout);
        if (report) {
            report.pythonBin = pyBin;
            report.engine = report.engine || engine;
            return report;
        }
        tried.push(pyBin + ': ' + (res.err ? res.err.code || res.err.message : 'no json'));
    }
    return {
        ok: false,
        engine: engine,
        error: 'python runtime not found',
        tried: tried,
        hint: engine === 'seeta'
            ? 'Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1'
            : undefined,
    };
}

/**
 * Run face detection over a video, returning the box timeline JSON.
 * Callers MUST gate this behind the analyticsFace ("fr") entitlement.
 */
async function detect(videoPath, opts) {
    opts = opts || {};
    if (!videoPath || !fs.existsSync(videoPath)) {
        return { ok: false, error: 'input video not found' };
    }
    const engine = opts.engine || redactFaceEngine();
    const args = ['detect', '--input', videoPath].concat(engineArgs(engine));
    if (opts.maxSeconds) args.push('--max-seconds', String(opts.maxSeconds));
    if (opts.stride) args.push('--stride', String(opts.stride));
    if (opts.score) args.push('--score', String(opts.score));

    for (const pyBin of pythonCandidates(engine)) {
        const res = await runPython(pyBin, args, { timeout: opts.timeout || 300000 });
        const report = parseJsonLoose(res.stdout);
        if (report) return report;
        if (res.err && (res.err.code === 'ENOENT' || res.err.code === 127)) continue;
        return {
            ok: false,
            engine: engine,
            error: (res.stderr || (res.err && res.err.message) || 'detection failed').slice(0, 500),
            hint: engine === 'seeta' ? 'Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1' : undefined,
        };
    }
    return { ok: false, engine: engine, error: 'python runtime not found' };
}

/**
 * Per-frame face-follow burn (Tier 2). Writes muted video to outPath.
 */
async function burnFaceFollow(videoPath, outPath, opts) {
    opts = opts || {};
    if (!videoPath || !fs.existsSync(videoPath)) {
        return { ok: false, error: 'input video not found' };
    }
    if (!outPath) return { ok: false, error: 'out path required' };
    const engine = opts.engine || redactFaceEngine();
    const args = [
        'burn',
        '--input', videoPath,
        '--out', outPath,
    ].concat(engineArgs(engine)).concat([
        /* REDACT-FACE-QUALITY-KNOBS-V1 — hold↑ + iou wired; pad stays 0.12 (operator: no fat body box) */
        '--score', String(opts.score != null ? opts.score : 0.72),
        '--pad', String(opts.pad != null ? opts.pad : 0.12),
        '--sigma', String(opts.sigma != null ? opts.sigma : 18),
        '--detect-every', String(opts.detectEvery != null ? opts.detectEvery : 1),
        '--hold-frames', String(opts.holdFrames != null ? opts.holdFrames : 14),
        '--iou', String(opts.iou != null ? opts.iou : 0.18),
    ]);
    if (opts.maxSeconds) args.push('--max-seconds', String(opts.maxSeconds));
    if (opts.timelineOut) args.push('--timeline-out', String(opts.timelineOut));

    for (const pyBin of pythonCandidates(engine)) {
        const res = await runPython(pyBin, args, { timeout: opts.timeout || 900000 });
        const report = parseJsonLoose(res.stdout);
        if (report) return report;
        if (res.err && (res.err.code === 'ENOENT' || res.err.code === 127)) continue;
        return {
            ok: false,
            engine: engine,
            error: (res.stderr || (res.err && res.err.message) || 'face-follow burn failed').slice(0, 500),
            hint: engine === 'seeta' ? 'Run fr-sidecar-seeta\\INSTALL-SEETA-LAB.ps1' : undefined,
        };
    }
    return { ok: false, engine: engine, error: 'python runtime not found' };
}

module.exports = {
    selfCheck,
    detect,
    burnFaceFollow,
    redactFaceEngine,
    paths: { script: SCRIPT, model: YUNET_MODEL, dir: SIDE_DIR, seetaDir: SEETA_DIR },
};
