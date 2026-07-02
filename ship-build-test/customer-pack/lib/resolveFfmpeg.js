const path = require('path');
const fs = require('fs');

function bundledStaticPath() {
    try {
        const bundled = require('ffmpeg-static');
        if (bundled && fs.existsSync(bundled)) return bundled;
    } catch (_) { /* npm install required */ }
    return null;
}

function localBinPath() {
    const local = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : null;
}

/**
 * Where ffmpeg was resolved from (for logs and rental verify).
 */
function resolveFfmpegSource() {
    if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return 'env';
    if (bundledStaticPath()) return 'ffmpeg-static';
    if (localBinPath()) return 'bin';
    return 'system-path';
}

/**
 * Bundled-first: ffmpeg-static → bin/ffmpeg.exe → FFMPEG_BIN → system ffmpeg (dev only).
 */
function resolveFfmpegPath() {
    const bundled = bundledStaticPath();
    if (bundled) return bundled;
    const local = localBinPath();
    if (local) return local;
    if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) {
        return process.env.FFMPEG_BIN;
    }
    return 'ffmpeg';
}

module.exports = { resolveFfmpegPath, resolveFfmpegSource, bundledStaticPath };
