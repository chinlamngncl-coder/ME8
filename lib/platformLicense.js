/**
 * Platform license — vendor-signed entitlements per install (sell / rent).
 * File: storage/platform-license.json (not editable in dashboard).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const licenseVerifyKey = require('./licenseVerifyKey');

const LICENSE_FILENAME = 'platform-license.json';
const CANONICAL_KEYS = Object.freeze([
    'licenseId',
    'customerName',
    'type',
    'maxBwcDevices',
    'maxDashboardUsers',
    'issuedAt',
    'expiresAt',
]);

let storageDir = null;
let cached = null;

function init(dir) {
    storageDir = dir;
    cached = null;
}

function licenseFilePath() {
    return path.join(storageDir || path.join(__dirname, '..', 'storage'), LICENSE_FILENAME);
}

function resolvePublicKeyPem() {
    const fromEnv = process.env.FM_LICENSE_PUBLIC_KEY;
    if (fromEnv && String(fromEnv).trim()) {
        return String(fromEnv).replace(/\\n/g, '\n').trim();
    }
    const keyFile = path.join(__dirname, '..', 'keys', 'license-public.pem');
    if (fs.existsSync(keyFile)) {
        return fs.readFileSync(keyFile, 'utf8').trim();
    }
    if (licenseVerifyKey.publicKeyPem && String(licenseVerifyKey.publicKeyPem).trim()) {
        return String(licenseVerifyKey.publicKeyPem).trim();
    }
    return '';
}

function canonicalString(payload) {
    const obj = {};
    CANONICAL_KEYS.forEach((k) => {
        if (payload[k] !== undefined && payload[k] !== null) {
            obj[k] = payload[k];
        }
    });
    return JSON.stringify(obj);
}

function verifySignature(payload, signatureHex) {
    const pem = resolvePublicKeyPem();
    if (!pem) {
        return { ok: false, error: 'No license public key configured on this server. Vendor: export public key from MobilityC2-VENDOR-IMPORTANT/LicenseIssuer' };
    }
    const sig = String(signatureHex || '').trim();
    if (!/^[0-9a-fA-F]+$/.test(sig)) {
        return { ok: false, error: 'License signature missing or invalid format' };
    }
    try {
        const key = crypto.createPublicKey(pem);
        const ok = crypto.verify(
            null,
            Buffer.from(canonicalString(payload), 'utf8'),
            key,
            Buffer.from(sig, 'hex')
        );
        return ok ? { ok: true } : { ok: false, error: 'License signature does not match (file may have been edited)' };
    } catch (err) {
        return { ok: false, error: err.message || String(err) };
    }
}

function isLicenseRequired() {
    if (process.env.FM_LICENSE_REQUIRED === '0') return false;
    if (process.env.FM_LICENSE_REQUIRED === '1') return true;
    return process.env.FM_RENTAL_MODE === '1';
}

function validatePayload(raw) {
    if (!raw || typeof raw !== 'object') {
        return { valid: false, error: 'License file is empty or invalid' };
    }
    const licenseId = String(raw.licenseId || '').trim();
    const customerName = String(raw.customerName || '').trim();
    const type = String(raw.type || '').trim();
    if (!licenseId) return { valid: false, error: 'License missing licenseId' };
    if (!customerName) return { valid: false, error: 'License missing customerName' };
    if (type !== 'perpetual' && type !== 'subscription') {
        return { valid: false, error: 'License type must be perpetual or subscription' };
    }
    const maxBwcDevices = parseInt(raw.maxBwcDevices, 10);
    const maxDashboardUsers = parseInt(raw.maxDashboardUsers, 10);
    if (!Number.isFinite(maxBwcDevices) || maxBwcDevices < 1) {
        return { valid: false, error: 'License maxBwcDevices must be a positive number' };
    }
    if (!Number.isFinite(maxDashboardUsers) || maxDashboardUsers < 1) {
        return { valid: false, error: 'License maxDashboardUsers must be a positive number' };
    }

    const payload = {
        licenseId,
        customerName,
        type,
        maxBwcDevices,
        maxDashboardUsers,
        issuedAt: String(raw.issuedAt || '').trim() || new Date().toISOString(),
        expiresAt: raw.expiresAt == null || raw.expiresAt === '' ? null : String(raw.expiresAt).trim(),
    };

    if (!payload.expiresAt) {
        return { valid: false, error: 'License expiresAt is required (every license must have an expiry date)' };
    }
    const exp = Date.parse(payload.expiresAt);
    if (!Number.isFinite(exp)) {
        return { valid: false, error: 'License expiresAt is not a valid ISO date' };
    }
    if (exp < Date.now()) {
        return {
            valid: false,
            error: 'License expired on ' + payload.expiresAt,
            expired: true,
            license: payload,
        };
    }

    const sigCheck = verifySignature(payload, raw.signature);
    if (!sigCheck.ok) {
        return { valid: false, error: sigCheck.error, license: payload };
    }

    let daysUntilExpiry = null;
    if (payload.expiresAt) {
        daysUntilExpiry = Math.ceil((Date.parse(payload.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000));
    }

    return {
        valid: true,
        license: payload,
        signature: String(raw.signature).trim(),
        expired: false,
        daysUntilExpiry,
    };
}

function loadAndValidate() {
    if (cached) return cached;

    const file = licenseFilePath();
    if (!fs.existsSync(file)) {
        cached = {
            filePresent: false,
            valid: false,
            error: isLicenseRequired() ? 'No platform-license.json in storage/' : null,
            license: null,
            expired: false,
            daysUntilExpiry: null,
        };
        return cached;
    }

    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        cached = {
            filePresent: true,
            valid: false,
            error: 'Cannot read license file: ' + err.message,
            license: null,
            expired: false,
            daysUntilExpiry: null,
        };
        return cached;
    }

    const result = validatePayload(raw);
    cached = {
        filePresent: true,
        valid: !!result.valid,
        error: result.valid ? null : result.error,
        license: result.license || null,
        expired: !!result.expired,
        daysUntilExpiry: result.daysUntilExpiry != null ? result.daysUntilExpiry : null,
    };
    return cached;
}

function invalidateCache() {
    cached = null;
}

function assertReadyForStartup() {
    const st = loadAndValidate();
    if (st.valid) return st;

    if (st.filePresent) {
        throw new Error('Platform license invalid: ' + (st.error || 'unknown'));
    }
    if (isLicenseRequired()) {
        throw new Error(
            'Platform license required for this install (FM_RENTAL_MODE=1). '
            + 'Place vendor-signed storage/platform-license.json. '
            + 'Licenses are issued from MobilityC2-VENDOR-IMPORTANT/LicenseIssuer (company internal). '
            + 'See docs/LICENSE-OPERATIONS.md'
        );
    }
    return st;
}

function getEntitlements() {
    const st = loadAndValidate();
    if (!st.valid || !st.license) return null;
    return {
        licenseId: st.license.licenseId,
        customerName: st.license.customerName,
        type: st.license.type,
        maxBwcDevices: st.license.maxBwcDevices,
        maxDashboardUsers: st.license.maxDashboardUsers,
        expiresAt: st.license.expiresAt,
        issuedAt: st.license.issuedAt,
    };
}

function getStatusPublic() {
    const st = loadAndValidate();
    return {
        required: isLicenseRequired(),
        filePresent: st.filePresent,
        valid: st.valid,
        error: st.valid ? null : st.error,
        licenseId: st.valid && st.license ? st.license.licenseId : null,
        customerName: st.valid && st.license ? st.license.customerName : null,
        type: st.valid && st.license ? st.license.type : null,
        expiresAt: st.valid && st.license ? (st.license.expiresAt || null) : null,
        expired: st.expired,
        daysUntilExpiry: st.daysUntilExpiry,
        entitlements: st.valid && st.license ? {
            maxBwcDevices: st.license.maxBwcDevices,
            maxDashboardUsers: st.license.maxDashboardUsers,
        } : null,
        limitsSource: st.valid ? 'license' : (st.filePresent ? 'invalid-license' : 'env'),
    };
}

module.exports = {
    init,
    invalidateCache,
    assertReadyForStartup,
    loadAndValidate,
    getEntitlements,
    getStatusPublic,
    isLicenseRequired,
    licenseFilePath,
    LICENSE_FILENAME,
};
