const path = require('path');
const fs = require('fs');

const VENDOR_LGPL = path.join(__dirname, '..', 'vendor', 'ffmpeg-lgpl', 'ffmpeg.exe');

function vendorLgplPath() {
    return fs.existsSync(VENDOR_LGPL) ? VENDOR_LGPL : null;
}

function localBinPath() {
    const local = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
    return fs.existsSync(local) ? local : null;
}

/**
 * Where ffmpeg was resolved from (for logs and install verify).
 */
function resolveFfmpegSource() {
    if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return 'env';
    if (vendorLgplPath()) return 'vendor-lgpl';
    if (localBinPath()) return 'bin';
    return 'system-path';
}

/**
 * vendor/ffmpeg-lgpl/ffmpeg.exe (LGPL) → bin/ffmpeg.exe → FFMPEG_BIN → system ffmpeg (dev only).
 */
function resolveFfmpegPath() {
    const vendor = vendorLgplPath();
    if (vendor) return vendor;
    const local = localBinPath();
    if (local) return local;
    if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) {
        return process.env.FFMPEG_BIN;
    }
    return 'ffmpeg';
}

module.exports = { resolveFfmpegPath, resolveFfmpegSource, vendorLgplPath };
