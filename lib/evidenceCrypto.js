/**
 * Evidence at-rest encryption — AES-256-GCM.
 * Uses the same vault key as secretsVaultCrypto (DPAPI-wrapped or env).
 * Backward-compatible: files without the MEV1 magic header are served as plaintext.
 *
 * On-disk format (prepended binary header):
 *   [4]  MAGIC = 0x4D455631 ("MEV1")
 *   [12] GCM IV (random per file)
 *   [16] GCM auth tag
 *   [...] AES-256-GCM ciphertext of original file bytes
 */
'use strict';
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const MAGIC      = Buffer.from([0x4D, 0x45, 0x56, 0x31]); // MEV1
const MAGIC_LEN  = 4;
const IV_LEN     = 12;
const TAG_LEN    = 16;
const HEADER_LEN = MAGIC_LEN + IV_LEN + TAG_LEN; // 32 bytes

let _storageDir = null;

function init(storageDir) {
    _storageDir = storageDir;
}

function getKey() {
    if (!_storageDir) throw new Error('evidenceCrypto.init() must be called before use');
    const vaultCrypto = require('./secretsVaultCrypto');
    return vaultCrypto.getVaultKey(_storageDir);
}

// ── Check ─────────────────────────────────────────────────────────────────────
function isEncryptedFile(fullPath) {
    try {
        const fd = fs.openSync(fullPath, 'r');
        const buf = Buffer.alloc(MAGIC_LEN);
        fs.readSync(fd, buf, 0, MAGIC_LEN, 0);
        fs.closeSync(fd);
        return buf.equals(MAGIC);
    } catch (_) {
        return false;
    }
}

// ── Encrypt file in place (called after FTP / HTTPS upload lands on disk) ────
function encryptFileInPlace(fullPath) {
    try {
        if (!fs.existsSync(fullPath)) return;
        const raw = fs.readFileSync(fullPath);
        if (raw.length >= MAGIC_LEN && raw.slice(0, MAGIC_LEN).equals(MAGIC)) {
            return; // already encrypted
        }
        const key = getKey();
        const iv  = crypto.randomBytes(IV_LEN);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const ciphertext = Buffer.concat([cipher.update(raw), cipher.final()]);
        const tag = cipher.getAuthTag();
        const output = Buffer.concat([MAGIC, iv, tag, ciphertext]);
        fs.writeFileSync(fullPath, output);
    } catch (err) {
        // Non-fatal — log but don't crash. File stays as plaintext if encryption fails.
        const log = require('./fleetLog');
        log.web.warn('evidence-crypto: encryptFileInPlace failed', { file: fullPath, err: err.message });
    }
}

// ── Decrypt fully into Buffer (for small files / secure export compat) ────────
function decryptToBuffer(fullPath) {
    const raw = fs.readFileSync(fullPath);
    if (!raw.slice(0, MAGIC_LEN).equals(MAGIC)) return raw; // plaintext — backward compat
    const iv  = raw.slice(MAGIC_LEN, MAGIC_LEN + IV_LEN);
    const tag = raw.slice(MAGIC_LEN + IV_LEN, HEADER_LEN);
    const ct  = raw.slice(HEADER_LEN);
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
}

// ── Pipe decrypted content to an Express response (streaming, works for GB files) ─
function pipeDecrypted(fullPath, res) {
    try {
        const stat = fs.statSync(fullPath);
        const headerBuf = Buffer.alloc(HEADER_LEN);
        const fd = fs.openSync(fullPath, 'r');
        const bytesRead = fs.readSync(fd, headerBuf, 0, HEADER_LEN, 0);
        fs.closeSync(fd);

        // Plaintext file (old upload or non-encrypted) — serve directly
        if (bytesRead < MAGIC_LEN || !headerBuf.slice(0, MAGIC_LEN).equals(MAGIC)) {
            const stream = fs.createReadStream(fullPath);
            stream.on('error', (e) => {
                if (!res.headersSent) res.status(500).end();
                else res.end();
                require('./fleetLog').web.warn('evidence-crypto: read error', { file: fullPath, err: e.message });
            });
            return stream.pipe(res);
        }

        // Encrypted file — stream decrypt
        const iv  = headerBuf.slice(MAGIC_LEN, MAGIC_LEN + IV_LEN);
        const tag = headerBuf.slice(MAGIC_LEN + IV_LEN, HEADER_LEN);
        const key = getKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        // Content-Length is original size = encrypted_file_size - HEADER_LEN
        // (GCM ciphertext is same length as plaintext)
        const originalSize = stat.size - HEADER_LEN;
        if (originalSize > 0 && !res.headersSent) {
            res.setHeader('Content-Length', originalSize);
        }
        const cipherStream = fs.createReadStream(fullPath, { start: HEADER_LEN });
        cipherStream.on('error', (e) => {
            if (!res.headersSent) res.status(500).end();
            else res.end();
            require('./fleetLog').web.warn('evidence-crypto: cipher read error', { file: fullPath, err: e.message });
        });
        decipher.on('error', (e) => {
            if (!res.headersSent) res.status(500).end();
            else res.end();
            require('./fleetLog').web.warn('evidence-crypto: decipher error', { file: fullPath, err: e.message });
        });
        cipherStream.pipe(decipher).pipe(res);
    } catch (err) {
        require('./fleetLog').web.warn('evidence-crypto: pipeDecrypted error', { file: fullPath, err: err.message });
        if (!res.headersSent) res.status(500).json({ ok: false, error: 'Could not read evidence file.' });
        else res.end();
    }
}

module.exports = {
    init,
    isEncryptedFile,
    encryptFileInPlace,
    decryptToBuffer,
    pipeDecrypted,
    HEADER_LEN,
    MAGIC,
};
