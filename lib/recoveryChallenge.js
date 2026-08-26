'use strict';
/**
 * recoveryChallenge.js
 * Air-gapped Super Admin recovery — challenge generation + grant verification.
 *
 * Flow:
 *   1. Server generates a signed challenge (.dat) containing nonce + fingerprint + expiry.
 *   2. Engineer loads .dat into the air-gapped CRM tool → CRM signs a grant (.lic) with the CRM private key.
 *   3. Server verifies the grant signature with the embedded CRM public key, consumes the nonce (one-time), resets the target user's password.
 *
 * Keys:
 *   CRM_PUBLIC_KEY_B64 — Ed25519 SPKI DER, base64.  Private key lives ONLY in the CRM tool.
 */

const crypto = require('crypto');
const licenseManager = require('./licenseManager');

// ── Embedded CRM public key ────────────────────────────────────────────────────
// Replace this if you rotate the CRM keypair (run "Generate New Keypair" in the CRM tool and paste the new public key here).
const CRM_PUBLIC_KEY_B64 = 'MCowBQYDK2VwAyEALnrJedAeeaC0APxTZX62MqDWJN9vAxcBouzkT2aHFVA=';

const CHALLENGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory nonce store: nonce → { fingerprint, expiry }
const _pending = new Map();

// ── Fingerprint = same HWID used by license binding ────────────────────────────
function _getFingerprint() {
    const hwid = licenseManager.computeHardwareId();
    if (!hwid) throw new Error('Unable to compute server hardware fingerprint');
    return String(hwid).trim().toLowerCase();
}

// ── Periodic cleanup ───────────────────────────────────────────────────────────
function _cleanup() {
    const now = Date.now();
    for (const [k, v] of _pending) {
        if (now > v.expiry) _pending.delete(k);
    }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a challenge buffer to be downloaded as ubitron-recovery-req.dat.
 * @returns {Buffer} JSON payload
 */
function generateChallenge() {
    _cleanup();
    const nonce = crypto.randomUUID();
    const fingerprint = _getFingerprint();
    const expiry = Date.now() + CHALLENGE_TTL_MS;
    _pending.set(nonce, { fingerprint, expiry });
    const payload = { nonce, fingerprint, expiry, version: 1 };
    return Buffer.from(JSON.stringify(payload, null, 2));
}

/**
 * Verify a signed recovery grant (.lic) issued by the CRM.
 * @param {Buffer} grantBuf  Raw content of the .lic file
 * @returns {{ targetUsername: string, newPassword: string }}
 * @throws {Error} with a safe message on any validation failure
 */
function verifyGrant(grantBuf, options) {
    const opts = options || {};
    // Parse outer envelope
    let outer;
    try {
        outer = JSON.parse(grantBuf.toString('utf8'));
    } catch (_) {
        throw new Error('Grant file is not valid JSON');
    }

    const { payload: payloadB64, signature: sigB64 } = outer || {};
    if (!payloadB64 || !sigB64) throw new Error('Grant file is missing payload or signature');

    // Verify Ed25519 signature
    let pubKey;
    try {
        pubKey = crypto.createPublicKey({
            key: opts.publicKeyDer || Buffer.from(CRM_PUBLIC_KEY_B64, 'base64'),
            format: 'der',
            type: 'spki',
        });
    } catch (_) {
        throw new Error('Server public key configuration error');
    }

    const payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    const sigBuf    = Buffer.from(sigB64, 'base64');

    let signatureOk = false;
    try {
        signatureOk = crypto.verify(null, Buffer.from(payload, 'utf8'), pubKey, sigBuf);
    } catch (_) {
        throw new Error('Signature verification failed');
    }
    if (!signatureOk) throw new Error('Grant signature is invalid');

    // Parse inner payload
    let claims;
    try {
        claims = JSON.parse(payload);
    } catch (_) {
        throw new Error('Grant payload is malformed');
    }

    const { type, challenge_nonce, target_username, new_password, issued_at } = claims;

    if (type !== 'admin_recovery') throw new Error('Grant type mismatch');

    // TTL check (24h from issuance)
    if (!issued_at || Date.now() - issued_at > CHALLENGE_TTL_MS) {
        throw new Error('Grant has expired — issue a new one within 24 hours');
    }

    // Nonce check + one-time consumption
    _cleanup();
    const pending = _pending.get(challenge_nonce);
    if (!pending) throw new Error('Challenge nonce not recognised — may have already been used or expired');
    if (Date.now() > pending.expiry) {
        _pending.delete(challenge_nonce);
        throw new Error('Challenge has expired — generate a fresh challenge and reissue');
    }
    if (!target_username || !new_password) throw new Error('Grant is missing target username or password');
    const currentFingerprint = _getFingerprint();
    if (pending.fingerprint !== currentFingerprint) {
        throw new Error('Challenge hardware fingerprint mismatch');
    }
    const tokenHwid = String(claims.hwid || claims.hardware_id || claims.fingerprint || '').trim().toLowerCase();
    if (tokenHwid && tokenHwid !== currentFingerprint) {
        throw new Error('Grant hardware fingerprint mismatch');
    }

    _pending.delete(challenge_nonce); // consume only after every check succeeds

    return {
        targetUsername: String(target_username).trim(),
        newPassword:    String(new_password),
    };
}

module.exports = { generateChallenge, verifyGrant };
