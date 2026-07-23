'use strict';

/**
 * SEC-NONSIP-ID-CRYPTO-RANDOM-V1
 * Crypto-strong IDs for non-SIP server paths (fixed cams, conference shares, multer temps).
 * SIP Call-ID / tag / SN stay in sipCryptoIdentifiers.js.
 */

const crypto = require('crypto');

function randomHex(byteLen) {
    const n = Math.max(1, Math.min(32, Number(byteLen) || 4));
    return crypto.randomBytes(n).toString('hex');
}

/** Fixed-camera registry id — was Math.random base36 suffix. */
function fixedCamId() {
    return 'fc-' + Date.now().toString(36) + randomHex(3);
}

/** Conference room share image filename. */
function conferenceShareFileName(ext) {
    const safeExt = String(ext || '.jpg');
    return 'share-' + Date.now() + '-' + randomHex(4) + safeExt;
}

/** Multer disk filename prefix + sanitized original basename. */
function multerTempFileName(safeOriginal) {
    const safe = String(safeOriginal || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'file';
    return Date.now() + '-' + randomHex(4) + '-' + safe;
}

module.exports = {
    randomHex,
    fixedCamId,
    conferenceShareFileName,
    multerTempFileName,
};
