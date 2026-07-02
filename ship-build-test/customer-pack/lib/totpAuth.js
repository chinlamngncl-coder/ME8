/**
 * RFC 6238 TOTP — offline, no vendor API. Uses Node crypto only.
 */
const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SEC = 30;
const TOTP_DIGITS = 6;
const BACKUP_CODE_COUNT = 8;

function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}

function base32Decode(str) {
    const cleaned = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const out = [];
    for (let i = 0; i < cleaned.length; i++) {
        const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
        if (idx < 0) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

function generateSecret() {
    return base32Encode(crypto.randomBytes(20));
}

function hotp(secretBase32, counter, digits) {
    const key = base32Decode(secretBase32);
    const buf = Buffer.alloc(8);
    const ctr = BigInt(counter);
    buf.writeUInt32BE(Number((ctr >> 32n) & 0xffffffffn), 0);
    buf.writeUInt32BE(Number(ctr & 0xffffffffn), 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const bin = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);
    const mod = 10 ** (digits || TOTP_DIGITS);
    return String(bin % mod).padStart(digits || TOTP_DIGITS, '0');
}

function currentTotp(secretBase32, timeMs) {
    const t = timeMs != null ? timeMs : Date.now();
    const counter = Math.floor(t / 1000 / TOTP_STEP_SEC);
    return hotp(secretBase32, counter, TOTP_DIGITS);
}

function verifyTotp(secretBase32, token, windowSteps) {
    const code = String(token || '').trim().replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) return false;
    const window = windowSteps != null ? windowSteps : 1;
    const now = Date.now();
    const counter = Math.floor(now / 1000 / TOTP_STEP_SEC);
    for (let w = -window; w <= window; w++) {
        if (hotp(secretBase32, counter + w, TOTP_DIGITS) === code) return true;
    }
    return false;
}

function buildOtpAuthUri({ issuer, accountName, secret }) {
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const q = new URLSearchParams({
        secret: String(secret || ''),
        issuer: String(issuer || 'Ubitron ME8'),
        algorithm: 'SHA1',
        digits: String(TOTP_DIGITS),
        period: String(TOTP_STEP_SEC),
    });
    return `otpauth://totp/${label}?${q.toString()}`;
}

function generateBackupCodes(count) {
    const n = count != null ? count : BACKUP_CODE_COUNT;
    const codes = [];
    for (let i = 0; i < n; i++) {
        const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
    }
    return codes;
}

function hashBackupCode(code) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(code || '').trim().toUpperCase(), salt, 32).toString('hex');
    return { salt, hash };
}

function verifyBackupCode(code, row) {
    if (!row || row.used || !row.salt || !row.hash) return false;
    const normalized = String(code || '').trim().toUpperCase();
    const hash = crypto.scryptSync(normalized, row.salt, 32).toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(row.hash, 'hex'));
    } catch (_) {
        return false;
    }
}

async function qrDataUrl(otpauthUri) {
    const QRCode = require('qrcode');
    return QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });
}

module.exports = {
    generateSecret,
    verifyTotp,
    currentTotp,
    buildOtpAuthUri,
    generateBackupCodes,
    hashBackupCode,
    verifyBackupCode,
    qrDataUrl,
    BACKUP_CODE_COUNT,
};
