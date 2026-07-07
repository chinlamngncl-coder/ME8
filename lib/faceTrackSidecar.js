/**
 * Face-track detection sidecar bridge (SCAFFOLD — detection gated OFF).
 *
 * Spawns the Python detector (redaction-track/detect_faces.py) which uses
 * OpenCV (Apache-2.0) + the YuNet model (MIT). This module is INERT until the
 * analyticsFace ("fr") entitlement is enabled: server routes must check the
 * license feature before calling detect(). selfCheck() is safe to call any
 * time — it only reports whether the runtime + model are installed.
 *
 * The sidecar is a separate process, out of the live-video path. If Python or
 * the model is missing, callers get a structured { ok:false } report rather
 * than a thrown/crashing server.
 */

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const SIDE_DIR = path.join(__dirname, '..', 'redaction-track');
const SCRIPT = path.join(SIDE_DIR, 'detect_faces.py');
const MODEL = path.join(SIDE_DIR, 'models', 'face_detection_yunet.onnx');

/** Candidate python launchers, in order. Override with FM_PY_BIN. */
function pythonCandidates() {
    const out = [];
    if (process.env.FM_PY_BIN) out.push(process.env.FM_PY_BIN);
    if (process.platform === 'win32') {
        out.push('py', 'python', 'python3');
    } else {
        out.push('python3', 'python');
    }
    return out;
}

function runPython(pyBin, args, opts) {
    return new Promise((resolve) => {
        // On Windows the "py" launcher wants "-3" prepended for python3.
        const finalArgs = (pyBin === 'py') ? ['-3', SCRIPT].concat(args) : [SCRIPT].concat(args);
        execFile(pyBin, finalArgs, {
            timeout: (opts && opts.timeout) || 120000,
            windowsHide: true,
            maxBuffer: 32 * 1024 * 1024,
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

/**
 * Report whether the detection runtime is installed and usable.
 * Never throws. Returns { ok, python?, cv2?, model, modelPresent, missing[] }.
 */
async function selfCheck() {
    if (!fs.existsSync(SCRIPT)) {
        return { ok: false, error: 'sidecar script missing', script: SCRIPT };
    }
    const tried = [];
    for (const pyBin of pythonCandidates()) {
        const res = await runPython(pyBin, ['selfcheck', '--model', MODEL], { timeout: 20000 });
        const report = parseJsonLoose(res.stdout);
        if (report) {
            report.pythonBin = pyBin;
            return report;
        }
        tried.push(pyBin + ': ' + (res.err ? res.err.code || res.err.message : 'no json'));
    }
    return { ok: false, error: 'python runtime not found', tried: tried, model: MODEL };
}

/**
 * Run face detection over a video, returning the box timeline JSON.
 * Callers MUST gate this behind the analyticsFace ("fr") entitlement.
 * Never throws — returns { ok:false, error } on any failure.
 *
 * @param {string} videoPath absolute path to source video
 * @param {object} [opts] { maxSeconds, stride, score, timeout }
 */
async function detect(videoPath, opts) {
    opts = opts || {};
    if (!videoPath || !fs.existsSync(videoPath)) {
        return { ok: false, error: 'input video not found' };
    }
    const args = ['detect', '--input', videoPath, '--model', MODEL];
    if (opts.maxSeconds) args.push('--max-seconds', String(opts.maxSeconds));
    if (opts.stride) args.push('--stride', String(opts.stride));
    if (opts.score) args.push('--score', String(opts.score));

    for (const pyBin of pythonCandidates()) {
        const res = await runPython(pyBin, args, { timeout: opts.timeout || 300000 });
        const report = parseJsonLoose(res.stdout);
        if (report) return report;
        if (res.err && (res.err.code === 'ENOENT' || res.err.code === 127)) continue;
        return { ok: false, error: (res.stderr || (res.err && res.err.message) || 'detection failed').slice(0, 500) };
    }
    return { ok: false, error: 'python runtime not found' };
}

module.exports = {
    selfCheck,
    detect,
    paths: { script: SCRIPT, model: MODEL, dir: SIDE_DIR },
};
