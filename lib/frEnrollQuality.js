/**
 * Blacklist enroll — image size / pixel gate (DISC A2 / false-small).
 * Face count, face-box px, sharpness stay in the FR sidecar.
 */
const fs = require('fs');

const MIN_BYTES = parseInt(process.env.FM_FR_ENROLL_MIN_BYTES || '30000', 10) || 30000;
const MAX_BYTES = parseInt(process.env.FM_FR_ENROLL_MAX_BYTES || String(20 * 1024 * 1024), 10) || (20 * 1024 * 1024);
const MIN_SHORT = parseInt(process.env.FM_FR_ENROLL_MIN_SHORT || '480', 10) || 480;
const MIN_SIDE = parseInt(process.env.FM_FR_ENROLL_MIN_SIDE || '320', 10) || 320;
/** Read this many bytes to find JPEG SOF (EXIF/thumbnails often exceed 64KB). */
const JPEG_HEADER_READ = parseInt(process.env.FM_FR_JPEG_HEADER_READ || String(1024 * 1024), 10) || (1024 * 1024);

function readPngDims(buf) {
    if (buf.length < 24) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
    };
}

function readJpegDims(buf) {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
            i += 1;
            continue;
        }
        // Skip fill bytes 0xFF 0xFF...
        while (i + 1 < buf.length && buf[i + 1] === 0xff) i += 1;
        if (i + 1 >= buf.length) break;
        const marker = buf[i + 1];
        // Standalone markers without length
        if (marker === 0xd8) { i += 2; continue; } // SOI
        if (marker === 0xd9) break; // EOI
        if (marker >= 0xd0 && marker <= 0xd7) { i += 2; continue; } // RST
        if (marker === 0x01) { i += 2; continue; } // TEM
        if (marker === 0xda) break; // SOS — image data
        if (i + 3 >= buf.length) break;
        const len = buf.readUInt16BE(i + 2);
        if (len < 2) break;
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
        const isSof = (marker >= 0xc0 && marker <= 0xc3)
            || (marker >= 0xc5 && marker <= 0xc7)
            || (marker >= 0xc9 && marker <= 0xcb)
            || (marker >= 0xcd && marker <= 0xcf);
        if (isSof && i + 8 < buf.length) {
            return {
                height: buf.readUInt16BE(i + 5),
                width: buf.readUInt16BE(i + 7),
            };
        }
        i += 2 + len;
    }
    return null;
}

function readImageDims(filePath) {
    let buf;
    try {
        const st = fs.statSync(filePath);
        const want = Math.min(Math.max(st.size, 24), JPEG_HEADER_READ);
        const fd = fs.openSync(filePath, 'r');
        try {
            buf = Buffer.alloc(want);
            const n = fs.readSync(fd, buf, 0, want, 0);
            buf = buf.subarray(0, n);
        } finally {
            fs.closeSync(fd);
        }
    } catch (_) {
        return null;
    }
    return readPngDims(buf) || readJpegDims(buf);
}

/**
 * @returns {{ ok: true, width: number, height: number, bytes: number, gate?: undefined }
 *   | { ok: false, code: string, gate: string, width?: number, height?: number, bytes?: number }}
 */
function checkEnrollImageFile(filePath, fileBytes) {
    let bytes = fileBytes;
    if (bytes == null) {
        try {
            bytes = fs.statSync(filePath).size;
        } catch (_) {
            return { ok: false, code: 'fr.bad_file', gate: 'file' };
        }
    }
    if (bytes < MIN_BYTES || bytes > MAX_BYTES) {
        return { ok: false, code: 'fr.bad_file', gate: 'file', bytes };
    }
    const dims = readImageDims(filePath);
    if (!dims || !dims.width || !dims.height) {
        return { ok: false, code: 'fr.bad_file', gate: 'file', bytes };
    }
    const shortSide = Math.min(dims.width, dims.height);
    if (dims.width < MIN_SIDE || dims.height < MIN_SIDE || shortSide < MIN_SHORT) {
        return {
            ok: false,
            code: 'fr.image_too_small',
            gate: 'image',
            width: dims.width,
            height: dims.height,
            bytes,
        };
    }
    return { ok: true, width: dims.width, height: dims.height, bytes };
}

module.exports = {
    checkEnrollImageFile,
    readImageDims,
    limits: {
        minBytes: MIN_BYTES,
        maxBytes: MAX_BYTES,
        minShort: MIN_SHORT,
        minSide: MIN_SIDE,
        jpegHeaderRead: JPEG_HEADER_READ,
    },
};
