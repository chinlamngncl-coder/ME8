'use strict';

/**
 * Read intrinsic width/height for JPEG / PNG / WebP without sharp.
 * Used by tactical blueprint upload (Task 2.2).
 */

const fs = require('fs');

function readPng(buf) {
    if (buf.length < 24) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
    };
}

function readJpeg(buf) {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
            i += 1;
            continue;
        }
        const marker = buf[i + 1];
        if (marker === 0xd9 || marker === 0xda) break;
        const len = buf.readUInt16BE(i + 2);
        if (len < 2 || i + 2 + len > buf.length) break;
        // SOF0 / SOF1 / SOF2 (baseline / extended / progressive)
        if (
            marker === 0xc0 || marker === 0xc1 || marker === 0xc2
            || marker === 0xc3 || marker === 0xc5 || marker === 0xc6
            || marker === 0xc7 || marker === 0xc9 || marker === 0xca
            || marker === 0xcb || marker === 0xcd || marker === 0xce
            || marker === 0xcf
        ) {
            return {
                height: buf.readUInt16BE(i + 5),
                width: buf.readUInt16BE(i + 7),
            };
        }
        i += 2 + len;
    }
    return null;
}

function readWebp(buf) {
    if (buf.length < 30) return null;
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
    const fourcc = buf.toString('ascii', 12, 16);
    if (fourcc === 'VP8X' && buf.length >= 30) {
        const w = 1 + buf[24] + (buf[25] << 8) + (buf[26] << 16);
        const h = 1 + buf[27] + (buf[28] << 8) + (buf[29] << 16);
        return { width: w, height: h };
    }
    if (fourcc === 'VP8 ' && buf.length >= 30) {
        // lossy bitstream starts at 20; frame tag then width/height at +6/+8 of payload
        const start = 20;
        if (buf.length < start + 10) return null;
        const w = buf.readUInt16LE(start + 6) & 0x3fff;
        const h = buf.readUInt16LE(start + 8) & 0x3fff;
        return { width: w, height: h };
    }
    if (fourcc === 'VP8L' && buf.length >= 25) {
        const b0 = buf[21];
        const b1 = buf[22];
        const b2 = buf[23];
        const b3 = buf[24];
        const w = 1 + (((b1 & 0x3f) << 8) | b0);
        const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width: w, height: h };
    }
    return null;
}

function dimensionsFromBuffer(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 24) return null;
    return readPng(buf) || readJpeg(buf) || readWebp(buf);
}

async function readImageDimensions(filePath) {
    const fd = await fs.promises.open(filePath, 'r');
    try {
        const buf = Buffer.alloc(65536);
        const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
        const slice = buf.subarray(0, bytesRead);
        const dim = dimensionsFromBuffer(slice);
        if (!dim || !(dim.width > 0) || !(dim.height > 0)) {
            const err = new Error('Could not read image dimensions (need JPEG, PNG, or WebP)');
            err.status = 400;
            throw err;
        }
        return { width: dim.width, height: dim.height };
    } finally {
        await fd.close().catch(() => {});
    }
}

module.exports = {
    dimensionsFromBuffer,
    readImageDimensions,
};
