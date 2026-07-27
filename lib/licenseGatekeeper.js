'use strict';

/**
 * Strict Ed25519 license gatekeeper for 1-Pack boot.
 * Size limit + explicit error codes + never crash the process.
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const licenseManager = require('./licenseManager');
const licenseVerifyKey = require('./licenseVerifyKey');
const timeAnchor = require('./timeAnchor');

const MAX_LICENSE_BYTES = 10 * 1024; /* 10KB */
const PUBLIC_KEY_PEM = String(licenseVerifyKey.publicKeyPem || '').trim();

/**
 * Strict Ed25519 verify — detached base64 signature over JSON payload bytes.
 */
function verifyEd25519Payload(payload, signatureB64, publicKeyPem) {
    const pem = publicKeyPem || PUBLIC_KEY_PEM;
    if (!pem) return { ok: false, code: 'NO_PUBLIC_KEY', error: 'No license public key configured' };
    const sig = String(signatureB64 || '').trim();
    if (!sig) return { ok: false, code: 'SIGNATURE_MISSING', error: 'License signature missing' };
    try {
        const key = crypto.createPublicKey(pem);
        const message = Buffer.from(JSON.stringify(payload), 'utf8');
        const ok = crypto.verify(null, message, key, Buffer.from(sig, 'base64'));
        return ok
            ? { ok: true }
            : { ok: false, code: 'SIGNATURE_INVALID', error: 'Ed25519 signature verification failed' };
    } catch (err) {
        return { ok: false, code: 'SIGNATURE_ERROR', error: err.message || String(err) };
    }
}

function readLicenseWithLimit(filePath) {
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return { ok: false, code: 'ENOENT', error: 'license.lic missing' };
        }
        return { ok: false, code: 'FS_ERROR', error: err.message || String(err) };
    }
    if (!stat.isFile() || stat.size <= 0) {
        return { ok: false, code: 'EMPTY', error: 'license.lic empty' };
    }
    if (stat.size > MAX_LICENSE_BYTES) {
        return { ok: false, code: 'TOO_LARGE', error: 'license.lic exceeds 10KB limit' };
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const doc = JSON.parse(raw);
        return { ok: true, doc: doc };
    } catch (err) {
        if (err instanceof SyntaxError) {
            return { ok: false, code: 'SYNTAX', error: 'license.lic is not valid JSON' };
        }
        return { ok: false, code: 'READ_ERROR', error: err.message || String(err) };
    }
}

/**
 * Boot evaluation for bin/me8-server.js
 * PASS → proceed to server.js
 * FAIL → Setup UI with logged reason
 * Never throws — unexpected errors become CRITICAL_CRASH.
 */
function evaluateBootLicense(opts) {
    try {
        const o = opts || {};
        const storageDir = o.storageDir || (o.baseDir ? path.join(o.baseDir, 'storage') : path.join(__dirname, '..', 'storage'));

        /* Time anchor BEFORE Ed25519 / expiry — blocks large clock rollback */
        const anchor = timeAnchor.validateTimeAnchor({ storageDir: storageDir });
        if (!anchor.ok) {
            return {
                pass: false,
                code: anchor.code || 'CLOCK_ROLLBACK_DETECTED',
                message: anchor.message || 'System clock rollback detected',
            };
        }

        licenseManager.init({
            baseDir: o.baseDir,
            storageDir: storageDir,
        });

        const filePath = licenseManager.findLicenseFile();
        if (!filePath) {
            if (!licenseManager.isAirgapLicenseRequired()) {
                return { pass: true, code: 'LAB_OPEN', message: 'No license (lab optional)' };
            }
            return { pass: false, code: 'ENOENT', message: 'license.lic missing' };
        }

        const read = readLicenseWithLimit(filePath);
        if (!read.ok) {
            return { pass: false, code: read.code, message: read.error };
        }

        /* Full business rules (canonical sign, HWID, expiry) via licenseManager */
        const st = licenseManager.validateLicenseFile(filePath, {
            publicKeyPem: PUBLIC_KEY_PEM,
            hardwareId: licenseManager.computeHardwareId(),
        });

        if (!st.ok) {
            return {
                pass: false,
                code: st.code || 'INVALID',
                message: st.error || licenseManager.FATAL,
                hardwareId: st.hardwareId,
            };
        }

        return {
            pass: true,
            code: 'OK',
            message: 'License cryptographically valid',
            hardwareId: st.hardwareId,
            payload: st.payload,
        };
    } catch (err) {
        return {
            pass: false,
            code: 'CRITICAL_CRASH',
            message: err && err.message ? err.message : String(err),
        };
    }
}

module.exports = {
    MAX_LICENSE_BYTES,
    PUBLIC_KEY_PEM,
    verifyEd25519Payload,
    readLicenseWithLimit,
    evaluateBootLicense,
};
