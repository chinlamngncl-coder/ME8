/**
 * Operator export watermark — burn-in via bundled ffmpeg.
 * Super-admin raw pipe stays in the route. Encode failure must never serve raw.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const resolveFfmpeg = require('./resolveFfmpeg');
const evidenceCrypto = require('./evidenceCrypto');

const FFMPEG_TIMEOUT_MS = 600000;

function escapeDrawtext(s) {
    return String(s || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%')
        .replace(/\n/g, ' ')
        .slice(0, 180);
}

function safeUsername(name) {
    return String(name || 'operator').replace(/[^\w.@-]+/g, '_').slice(0, 40) || 'operator';
}

function buildWatermarkText(username) {
    const day = new Date().toISOString().split('T')[0];
    return 'Exported By: ' + safeUsername(username)
        + ' | Date: ' + day
        + ' | Mobility Axiom';
}

function fontFileArg() {
    const win = path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts', 'arial.ttf');
    if (process.platform === 'win32' && fs.existsSync(win)) {
        return win.replace(/\\/g, '/').replace(/:/g, '\\:');
    }
    return '';
}

function unlinkQuiet(p) {
    if (!p) return Promise.resolve();
    return fs.promises.unlink(p).catch(function () { /* already gone */ });
}

function runFfmpeg(args) {
    return new Promise(function (resolve, reject) {
        const bin = resolveFfmpeg.resolveFfmpegPath();
        let settled = false;
        let child;
        try {
            child = spawn(bin, args, {
                windowsHide: true,
                shell: false,
                stdio: ['ignore', 'ignore', 'pipe'],
            });
        } catch (err) {
            reject(err);
            return;
        }
        const timer = setTimeout(function () {
            try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
        }, FFMPEG_TIMEOUT_MS);
        let errTail = '';
        if (child.stderr) {
            child.stderr.on('data', function (buf) {
                errTail = (errTail + String(buf)).slice(-800);
            });
        }
        child.on('error', function (err) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(err);
        });
        child.on('close', function (code) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (code === 0) resolve();
            else reject(new Error('ffmpeg exit ' + String(code) + (errTail ? ': ' + errTail : '')));
        });
    });
}

async function materializePlainInput(sourcePath) {
    if (!evidenceCrypto.isEncryptedFile(sourcePath)) return { inputPath: sourcePath, tempIn: null };
    const tempIn = path.join(os.tmpdir(), 'wm_in_' + Date.now() + '_' + process.pid + '.bin');
    await pipeline(evidenceCrypto.createPlainReadStream(sourcePath), fs.createWriteStream(tempIn));
    return { inputPath: tempIn, tempIn: tempIn };
}

async function encodeWatermarked(sourcePath, watermarkText) {
    const stamp = Date.now() + '_' + process.pid;
    const tempOut = path.join(os.tmpdir(), 'wm_' + stamp + '.mp4');
    const mat = await materializePlainInput(sourcePath);
    const vfParts = [
        "drawtext=text='" + escapeDrawtext(watermarkText) + "'",
        'fontcolor=white',
        'fontsize=24',
        'x=10',
        'y=h-th-10',
        'box=1',
        'boxcolor=black@0.5',
        'boxborderw=5',
    ];
    const font = fontFileArg();
    if (font) vfParts.push('fontfile=' + font);
    const args = [
        '-y',
        '-i', mat.inputPath,
        '-vf', vfParts.join(':'),
        '-c:v', 'libopenh264',
        '-b:v', '4000k',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        tempOut,
    ];
    try {
        await runFfmpeg(args);
        const st = await fs.promises.stat(tempOut);
        if (!st || st.size < 1024) throw new Error('watermark output empty');
        return { tempOut: tempOut, tempIn: mat.tempIn };
    } catch (err) {
        await unlinkQuiet(tempOut);
        await unlinkQuiet(mat.tempIn);
        throw err;
    }
}

function pipeThenUnlink(filePath, res, extraPaths) {
    const extras = extraPaths || [];
    let cleaned = false;
    const cleanup = function () {
        if (cleaned) return;
        cleaned = true;
        unlinkQuiet(filePath);
        extras.forEach(function (p) { unlinkQuiet(p); });
    };
    const stream = fs.createReadStream(filePath);
    stream.on('error', function () {
        cleanup();
        if (!res.headersSent) res.status(500).end();
        else res.end();
    });
    res.on('finish', cleanup);
    res.on('close', cleanup);
    stream.pipe(res);
}

module.exports = {
    buildWatermarkText,
    encodeWatermarked,
    pipeThenUnlink,
};
