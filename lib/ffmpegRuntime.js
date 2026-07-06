/**
 * Bundled media engine (LGPL build) — required for rental installs.
 * Binary: vendor/ffmpeg-lgpl/ffmpeg.exe — see scripts/download-ffmpeg-lgpl.ps1
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveFfmpegPath, resolveFfmpegSource } = require('./resolveFfmpeg');

let cachedVersion = null;
let cachedCheck = null;

function runVersion(binPath) {
    return new Promise((resolve, reject) => {
        const proc = spawn(binPath, ['-version'], { windowsHide: true });
        let out = '';
        proc.stdout.on('data', (c) => { out += c; });
        proc.stderr.on('data', (c) => { out += c; });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code !== 0) reject(new Error('ffmpeg -version exit ' + code));
            else resolve(out.split(/\r?\n/)[0] || 'ffmpeg');
        });
    });
}

async function verify(options) {
    const opts = options || {};
    const binPath = resolveFfmpegPath();
    const source = resolveFfmpegSource();
    const allowSystem = process.env.FM_FFMPEG_ALLOW_SYSTEM === '1';
    const requireBundled = process.env.FM_REQUIRE_BUNDLED_FFMPEG !== '0';

    const result = {
        ok: false,
        path: binPath,
        source,
        bundled: source === 'vendor-lgpl' || source === 'bin',
        versionLine: null,
        error: null,
    };

    if (source === 'system-path' && requireBundled && !allowSystem) {
        result.error = 'Bundled media engine required. Place vendor/ffmpeg-lgpl/ffmpeg.exe (LGPL build). '
            + 'Run scripts/download-ffmpeg-lgpl.ps1 or set FM_FFMPEG_ALLOW_SYSTEM=1 for dev machines.';
        cachedCheck = result;
        return result;
    }

    if (!binPath || (source !== 'system-path' && !fs.existsSync(binPath))) {
        result.error = 'ffmpeg binary not found at ' + binPath;
        cachedCheck = result;
        return result;
    }

    try {
        const versionLine = await runVersion(binPath);
        result.versionLine = versionLine;
        result.ok = true;
        cachedVersion = versionLine;
    } catch (err) {
        result.error = err.message || String(err);
    }

    cachedCheck = result;
    return result;
}

function getCachedCheck() {
    return cachedCheck;
}

function getVersionLine() {
    return cachedVersion;
}

async function assertReady(log) {
    const check = await verify();
    if (check.ok) {
        if (log && log.media) {
            log.media.info('ffmpeg ready', {
                path: check.path,
                source: check.source,
                bundled: check.bundled,
                version: check.versionLine,
            });
        }
        return check;
    }
    const msg = check.error || 'ffmpeg not available';
    if (log && log.media) log.media.err('ffmpeg required', { error: msg, path: check.path });
    throw new Error(msg);
}

module.exports = {
    verify,
    assertReady,
    getCachedCheck,
    getVersionLine,
};
