/**
 * AES-USIP-FILE-DECRYPT-V1 — decrypt vendor `*-AES.*` media (HDA1 / vendor AES magic).
 * Format: private SDK AES format note — master key from env/secrets only.
 * Distinct from evidenceCrypto MEV1 (Axiom vault). Do not mix.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const MAGIC_HDA1 = Buffer.from([0x48, 0x44, 0x41, 0x31]); // HDA1 (doc)
const MAGIC_VENDOR = Buffer.from([0x59, 0x44, 0x54, 0x31]); // lab BWC AES stamp (hex only; no OEM name in logs)
const MAGIC = MAGIC_HDA1; // legacy export name
const HEADER_LEN = 53;
const MASTER_LEN = 16;
const WRAP_IV_OFF = 5;
const ENC_KEY_IV_OFF = 21;
const ENC_KEY_IV_LEN = 32;

let masterKeyBuf = null;
let configured = false;
let logRef = null;
let secretsPath = null;
let storageDirRef = null;

function init(opts) {
    const o = opts || {};
    logRef = o.log || null;
    storageDirRef = o.storageDir || o.root || null;
    if (storageDirRef) {
        secretsPath = path.join(path.resolve(storageDirRef), 'secrets', 'usip-aes-file.json');
    }
    reloadMasterSecret();
    return { configured, secretsPath: secretsPath || null };
}

function padMasterKey(str) {
    const src = Buffer.from(String(str || ''), 'utf8');
    const out = Buffer.alloc(MASTER_LEN, 0);
    src.copy(out, 0, 0, Math.min(src.length, MASTER_LEN));
    return out;
}

function reloadMasterSecret() {
    masterKeyBuf = null;
    configured = false;
    let keyStr = String(process.env.FM_USIP_AES_FILE_MASTER || '').trim();
    if (!keyStr && secretsPath) {
        try {
            if (fs.existsSync(secretsPath)) {
                const raw = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
                if (raw && raw.masterKey) keyStr = String(raw.masterKey).trim();
            }
        } catch (_) { /* ignore */ }
    }
    if (!keyStr) {
        if (logRef && logRef.sip && typeof logRef.sip.warn === 'function') {
            logRef.sip.warn('usip aes file master missing', {
                path: 'AES-USIP-FILE-DECRYPT-V1',
                hint: 'Super Admin: Evidence Storage → AES File Unlock',
            });
        }
        return false;
    }
    masterKeyBuf = padMasterKey(keyStr);
    configured = true;
    return true;
}

function isConfigured() {
    return configured;
}

/** Status for Super Admin UI — never includes key or absolute path. */
function getUnlockStatus() {
    return {
        configured: !!configured,
        envOverride: !!(String(process.env.FM_USIP_AES_FILE_MASTER || '').trim()),
    };
}

/**
 * AES-EVIDENCE-UNLOCK-SUPERADMIN-UI-V1 — write master to secrets file; reload memory.
 * @returns {{ ok: true, configured: boolean } | { ok: false, error: string }}
 */
function saveMasterKey(keyStr) {
    const s = String(keyStr || '').trim();
    if (!s) return { ok: false, error: 'empty' };
    if (!storageDirRef || !secretsPath) return { ok: false, error: 'not_inited' };
    try {
        const dir = path.dirname(secretsPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(secretsPath, JSON.stringify({ masterKey: s }, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch (_) {
        return { ok: false, error: 'write_failed' };
    }
    reloadMasterSecret();
    return { ok: true, configured: !!configured };
}

/** Remove file-backed master (env override may still keep configured true). */
function clearMasterKey() {
    if (!secretsPath) return { ok: false, error: 'not_inited' };
    try {
        if (fs.existsSync(secretsPath)) fs.unlinkSync(secretsPath);
    } catch (_) {
        return { ok: false, error: 'clear_failed' };
    }
    reloadMasterSecret();
    return { ok: true, configured: !!configured };
}

function isUsipAesFileName(name) {
    const base = path.basename(String(name || ''));
    return /-AES\.[^.]+$/i.test(base);
}

function readMagic(fullPath) {
    try {
        const fd = fs.openSync(fullPath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        return buf.equals(MAGIC_HDA1) || buf.equals(MAGIC_VENDOR);
    } catch (_) {
        return false;
    }
}

function isUsipAesFile(fullPath) {
    const p = String(fullPath || '');
    if (!p) return false;
    if (isUsipAesFileName(p)) return true;
    return readMagic(p);
}

function aesCtrDecrypt(cipherBuf, key16, iv16) {
    const decipher = crypto.createDecipheriv('aes-128-ctr', key16, iv16);
    return Buffer.concat([decipher.update(cipherBuf), decipher.final()]);
}

/**
 * @returns {{ ok: true, plain: Buffer } | { ok: false, error: string }}
 */
function decryptBuffer(raw) {
    if (!configured || !masterKeyBuf) {
        return { ok: false, error: 'master_missing' };
    }
    if (!Buffer.isBuffer(raw) || raw.length < HEADER_LEN) {
        return { ok: false, error: 'too_short' };
    }
    if (!raw.slice(0, 4).equals(MAGIC_HDA1) && !raw.slice(0, 4).equals(MAGIC_VENDOR)) {
        return { ok: false, error: 'bad_magic' };
    }
    if (raw[4] !== 1) {
        return { ok: false, error: 'bad_version' };
    }
    const wrapIv = raw.slice(WRAP_IV_OFF, WRAP_IV_OFF + 16);
    const encKeyIv = raw.slice(ENC_KEY_IV_OFF, ENC_KEY_IV_OFF + ENC_KEY_IV_LEN);
    let plain32;
    try {
        plain32 = aesCtrDecrypt(encKeyIv, masterKeyBuf, wrapIv);
    } catch (_) {
        return { ok: false, error: 'unwrap_failed' };
    }
    if (plain32.length < 32) {
        return { ok: false, error: 'unwrap_short' };
    }
    const fileKey = plain32.slice(0, 16);
    const dataIv = plain32.slice(16, 32);
    const ct = raw.slice(HEADER_LEN);
    try {
        const plain = aesCtrDecrypt(ct, fileKey, dataIv);
        return { ok: true, plain };
    } catch (_) {
        return { ok: false, error: 'body_decrypt_failed' };
    }
}

function decryptToBuffer(fullPath) {
    const raw = fs.readFileSync(fullPath);
    const out = decryptBuffer(raw);
    if (!out.ok) {
        const err = new Error(out.error || 'usip_aes_decrypt_failed');
        err.code = 'USIP_AES_DECRYPT';
        throw err;
    }
    return out.plain;
}

function pipeDecrypted(fullPath, res) {
    try {
        const plain = decryptToBuffer(fullPath);
        if (!res.headersSent) {
            res.setHeader('Content-Length', plain.length);
            res.setHeader('X-Usip-Aes', '1');
        }
        const stream = Readable.from(plain);
        stream.on('error', () => {
            if (!res.headersSent) res.status(500).end();
            else res.end();
        });
        return stream.pipe(res);
    } catch (e) {
        if (logRef && logRef.web && typeof logRef.web.warn === 'function') {
            logRef.web.warn('usip aes file decrypt failed', {
                path: 'AES-USIP-FILE-DECRYPT-V1',
                error: e && e.code ? e.code : 'decrypt_failed',
            });
        }
        if (!res.headersSent) res.status(500).json({ ok: false, error: 'usip_aes_decrypt_failed' });
        else res.end();
        return null;
    }
}

/**
 * Decrypt to a short-lived temp under storage/tmp — caller must unlink.
 * @returns {{ ok: true, tempPath: string, bytes: number } | { ok: false, error: string }}
 */
function decryptToTempFile(fullPath, opts) {
    const o = opts || {};
    if (!storageDirRef) return { ok: false, error: 'not_inited' };
    let plain;
    try {
        plain = decryptToBuffer(fullPath);
    } catch (e) {
        return { ok: false, error: (e && e.code) || 'decrypt_failed' };
    }
    const tmpDir = path.join(path.resolve(storageDirRef), 'tmp', 'usip-aes-play');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (_) { /* ignore */ }
    const base = path.basename(fullPath).replace(/-AES(\.[^.]+)$/i, '$1');
    const tempPath = path.join(tmpDir, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '-' + base);
    try {
        fs.writeFileSync(tempPath, plain);
    } catch (_) {
        return { ok: false, error: 'temp_write_failed' };
    }
    const ttlMs = Math.max(30, parseInt(String(o.ttlSec != null ? o.ttlSec : 120), 10) || 120) * 1000;
    setTimeout(() => {
        try { fs.unlinkSync(tempPath); } catch (_) { /* ignore */ }
    }, ttlMs);
    return { ok: true, tempPath, bytes: plain.length, ttlMs };
}

function guessContentType(fileName) {
    const n = String(fileName || '').toLowerCase();
    if (/\.mp4$/i.test(n)) return 'video/mp4';
    if (/\.jpe?g$/i.test(n)) return 'image/jpeg';
    if (/\.png$/i.test(n)) return 'image/png';
    if (/\.wav$/i.test(n)) return 'audio/wav';
    return 'application/octet-stream';
}

module.exports = {
    HEADER_LEN,
    MAGIC,
    init,
    reloadMasterSecret,
    isConfigured,
    getUnlockStatus,
    saveMasterKey,
    clearMasterKey,
    isUsipAesFileName,
    isUsipAesFile,
    decryptBuffer,
    decryptToBuffer,
    pipeDecrypted,
    decryptToTempFile,
    guessContentType,
};
