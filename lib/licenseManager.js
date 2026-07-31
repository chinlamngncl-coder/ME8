/**
 * Air-gapped license manager — Ed25519-signed license.lic (verify-only on customer hosts).
 *
 * Private key NEVER ships with ME8. Generator: tools/generate-license.js (offline).
 * Public key: keys/license-public.pem | FM_LICENSE_PUBLIC_KEY | lib/licenseVerifyKey.js
 *
 * Payload: customerName, hardwareId, expiryDate, maxFixedCameras, maxBwcDevices,
 *          features, optional tacticalPinLiveCap (8|16), optional orgId
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const licenseVerifyKey = require('./licenseVerifyKey');

const LIC_FILENAME = 'license.lic';
const ALG = 'Ed25519';
const FATAL = 'LICENSE EXPIRED OR INVALID';
const MAX_LICENSE_BYTES = 10 * 1024; /* 10KB — DOS / memory failsafe */

let storageDir = null;
let baseDir = null;
let cached = null;

function init(opts) {
    const o = opts || {};
    storageDir = o.storageDir || storageDir;
    baseDir = o.baseDir || baseDir;
    cached = null;
}

function resolvePublicKeyPem() {
    const fromEnv = process.env.FM_LICENSE_PUBLIC_KEY;
    if (fromEnv && String(fromEnv).trim()) {
        return String(fromEnv).replace(/\\n/g, '\n').trim();
    }
    const roots = [
        baseDir,
        path.join(__dirname, '..'),
        storageDir ? path.join(storageDir, '..') : null,
    ].filter(Boolean);
    for (let i = 0; i < roots.length; i++) {
        const keyFile = path.join(roots[i], 'keys', 'license-public.pem');
        if (fs.existsSync(keyFile)) {
            return fs.readFileSync(keyFile, 'utf8').trim();
        }
    }
    if (licenseVerifyKey.publicKeyPem && String(licenseVerifyKey.publicKeyPem).trim()) {
        return String(licenseVerifyKey.publicKeyPem).trim();
    }
    return '';
}

/** Stable MAC fingerprint (SHA-256 of sorted non-internal MACs). */
function collectMacList() {
    const ifaces = os.networkInterfaces() || {};
    const macs = [];
    Object.keys(ifaces).forEach(function (name) {
        (ifaces[name] || []).forEach(function (addr) {
            if (!addr || addr.internal) return;
            const mac = String(addr.mac || '').toLowerCase();
            if (!mac || mac === '00:00:00:00:00:00') return;
            if (macs.indexOf(mac) === -1) macs.push(mac);
        });
    });
    macs.sort();
    return macs;
}

function computeHardwareId() {
    const macs = collectMacList();
    const raw = macs.length ? macs.join('|') : ('hostname:' + os.hostname());
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 32);
}

function licensePaths() {
    const paths = [];
    if (storageDir) paths.push(path.join(storageDir, LIC_FILENAME));
    if (baseDir) paths.push(path.join(baseDir, LIC_FILENAME));
    paths.push(path.join(__dirname, '..', LIC_FILENAME));
    paths.push(path.join(__dirname, '..', 'storage', LIC_FILENAME));
    return paths;
}

function findLicenseFile() {
    const paths = licensePaths();
    for (let i = 0; i < paths.length; i++) {
        if (fs.existsSync(paths[i])) return paths[i];
    }
    return null;
}

/** Partner trial pack — skip MAC/CPU match; expiry still mandatory (padlock after date). */
const TRIAL_WILDCARD_HWID = 'trial_wildcard';

function isTrialWildcardHwid(licensedId) {
    return String(licensedId || '').trim().toLowerCase() === TRIAL_WILDCARD_HWID;
}

/** Deterministic JSON for sign/verify (sorted keys, no whitespace variance). */
function canonicalPayload(payload) {
    const features = payload.features && typeof payload.features === 'object'
        ? payload.features
        : {};
    const featKeys = Object.keys(features).sort();
    const featObj = {};
    featKeys.forEach(function (k) {
        featObj[k] = !!features[k];
    });
    const obj = {
        customerName: String(payload.customerName || '').trim(),
        /* Aliases: hwid / expiration_date (CN trial wording) → hardwareId / expiryDate */
        hardwareId: String(payload.hardwareId || payload.hwid || '').trim().toLowerCase(),
        expiryDate: String(
            payload.expiryDate || payload.expiresAt || payload.expiration_date || '',
        ).trim(),
        maxFixedCameras: Number(payload.maxFixedCameras),
        maxBwcDevices: Number(payload.maxBwcDevices),
        features: featObj,
    };
    if (payload.licenseId) obj.licenseId = String(payload.licenseId).trim();
    if (payload.issuedAt) obj.issuedAt = String(payload.issuedAt).trim();
    /* Optional multi-tenant org — only in canonical when present (does not break old .lic) */
    const orgId = payload.orgId != null ? payload.orgId : payload.org_id;
    if (orgId != null && String(orgId).trim()) obj.orgId = String(orgId).trim();
    /* Optional Tactical pin live cap — NUMBER (not features{} boolean). Old .lic omit = ok. */
    const pinCapRaw = payload.tacticalPinLiveCap != null
        ? payload.tacticalPinLiveCap
        : payload.tactical_pin_live_cap;
    if (pinCapRaw != null && String(pinCapRaw).trim() !== '') {
        const pinCap = parseInt(pinCapRaw, 10);
        if (Number.isFinite(pinCap) && pinCap >= 1 && pinCap <= 64) {
            obj.tacticalPinLiveCap = pinCap;
        }
    }
    return obj;
}

function canonicalString(payload) {
    return JSON.stringify(canonicalPayload(payload));
}

function signPayload(payload, privateKeyPem) {
    const key = crypto.createPrivateKey(privateKeyPem);
    const sig = crypto.sign(null, Buffer.from(canonicalString(payload), 'utf8'), key);
    return sig.toString('base64');
}

function verifySignature(payload, signatureB64, publicKeyPem) {
    const pem = publicKeyPem || resolvePublicKeyPem();
    if (!pem) {
        return { ok: false, error: 'No license public key configured' };
    }
    const sig = String(signatureB64 || '').trim();
    if (!sig) return { ok: false, error: 'License signature missing' };
    try {
        const key = crypto.createPublicKey(pem);
        const ok = crypto.verify(
            null,
            Buffer.from(canonicalString(payload), 'utf8'),
            key,
            Buffer.from(sig, 'base64'),
        );
        return ok ? { ok: true } : { ok: false, error: 'License signature verification failed' };
    } catch (err) {
        return { ok: false, error: err.message || String(err) };
    }
}

function parseExpiry(expiryDate) {
    const raw = String(expiryDate || '').trim();
    if (!raw) return NaN;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return Date.parse(raw + 'T23:59:59.999Z');
    }
    return Date.parse(raw);
}

function hardwareMatches(licensedId, actualId) {
    /* CN / partner trial: TRIAL_WILDCARD skips local HWID — expiry enforced separately */
    if (isTrialWildcardHwid(licensedId)) return true;
    const want = String(licensedId || '').trim().toLowerCase();
    const got = String(actualId || '').trim().toLowerCase();
    if (!want || !got) return false;
    if (want === got) return true;
    /* Allow listing a raw MAC in the license for ops convenience */
    const macs = collectMacList();
    if (macs.indexOf(want) >= 0) return true;
    return false;
}

function isAirgapLicenseRequired() {
    if (process.env.FM_AIRGAP_LICENSE_REQUIRED === '0') return false;
    if (process.env.FM_AIRGAP_LICENSE_REQUIRED === '1') return true;
    if (process.env.FM_LICENSE_REQUIRED === '1') return true;
    if (process.env.FM_RENTAL_MODE === '1') return true;
    /* Customer ship packs set this; lab benches leave unset → optional until file present */
    return false;
}

/**
 * Load + cryptographically verify + HWID + expiry.
 */
function validateLicenseFile(filePath, opts) {
    const options = opts || {};
    const actualHwid = options.hardwareId || computeHardwareId();
    if (!filePath || !fs.existsSync(filePath)) {
        return {
            ok: false,
            fatal: true,
            code: 'MISSING',
            error: FATAL + ' (license.lic missing)',
            hardwareId: actualHwid,
        };
    }
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return {
                ok: false,
                fatal: true,
                code: 'MISSING',
                error: FATAL + ' (license.lic missing)',
                hardwareId: actualHwid,
            };
        }
        return {
            ok: false,
            fatal: true,
            code: 'FS_ERROR',
            error: FATAL + ' (cannot stat license.lic)',
            hardwareId: actualHwid,
        };
    }
    if (!stat.isFile() || stat.size <= 0) {
        return {
            ok: false,
            fatal: true,
            code: 'EMPTY',
            error: FATAL + ' (license.lic empty)',
            hardwareId: actualHwid,
        };
    }
    if (stat.size > MAX_LICENSE_BYTES) {
        return {
            ok: false,
            fatal: true,
            code: 'TOO_LARGE',
            error: FATAL + ' (license.lic exceeds 10KB limit)',
            hardwareId: actualHwid,
        };
    }
    let doc;
    try {
        doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return {
            ok: false,
            fatal: true,
            code: 'PARSE',
            error: FATAL + ' (cannot parse license.lic)',
            hardwareId: actualHwid,
        };
    }
    const payload = doc.payload || doc;
    const signature = doc.signature || doc.sig;
    if (!payload || typeof payload !== 'object') {
        return { ok: false, fatal: true, code: 'SHAPE', error: FATAL + ' (bad payload)', hardwareId: actualHwid };
    }
    const canon = canonicalPayload(payload);
    if (!canon.customerName) {
        return { ok: false, fatal: true, code: 'CUSTOMER', error: FATAL + ' (customerName required)', hardwareId: actualHwid };
    }
    if (!canon.hardwareId) {
        return { ok: false, fatal: true, code: 'HWID', error: FATAL + ' (hardwareId required)', hardwareId: actualHwid };
    }
    if (!Number.isFinite(canon.maxFixedCameras) || canon.maxFixedCameras < 0) {
        return { ok: false, fatal: true, code: 'CAMS', error: FATAL + ' (maxFixedCameras invalid)', hardwareId: actualHwid };
    }
    if (!Number.isFinite(canon.maxBwcDevices) || canon.maxBwcDevices < 1) {
        return { ok: false, fatal: true, code: 'BWC', error: FATAL + ' (maxBwcDevices invalid)', hardwareId: actualHwid };
    }
    const trialWildcard = isTrialWildcardHwid(canon.hardwareId);
    const expMs = parseExpiry(canon.expiryDate);
    if (!Number.isFinite(expMs)) {
        return {
            ok: false,
            fatal: true,
            code: 'EXPIRY',
            error: FATAL + (trialWildcard
                ? ' (trial wildcard requires expiration_date / expiryDate)'
                : ' (expiryDate invalid)'),
            hardwareId: actualHwid,
        };
    }
    if (Date.now() > expMs) {
        return {
            ok: false,
            fatal: true,
            code: 'EXPIRED',
            error: FATAL,
            expired: true,
            expiryDate: canon.expiryDate,
            hardwareId: actualHwid,
            payload: canon,
            trialWildcard: trialWildcard || undefined,
        };
    }
    const sigCheck = verifySignature(canon, signature, options.publicKeyPem);
    if (!sigCheck.ok) {
        return {
            ok: false,
            fatal: true,
            code: 'SIGNATURE',
            error: FATAL + ' (' + sigCheck.error + ')',
            hardwareId: actualHwid,
            payload: canon,
        };
    }
    if (!hardwareMatches(canon.hardwareId, actualHwid)) {
        return {
            ok: false,
            fatal: true,
            code: 'HWID_MISMATCH',
            error: FATAL + ' (hardwareId does not match this host)',
            hardwareId: actualHwid,
            licensedHardwareId: canon.hardwareId,
            payload: canon,
        };
    }
    return {
        ok: true,
        fatal: false,
        filePath: filePath,
        hardwareId: actualHwid,
        payload: canon,
        features: canon.features,
        maxFixedCameras: canon.maxFixedCameras,
        maxBwcDevices: canon.maxBwcDevices,
        expiryDate: canon.expiryDate,
        customerName: canon.customerName,
        trialWildcard: trialWildcard || undefined,
    };
}

function loadAndValidate(opts) {
    if (cached && !(opts && opts.force)) return cached;
    const file = findLicenseFile();
    if (!file) {
        cached = {
            ok: false,
            filePresent: false,
            fatal: isAirgapLicenseRequired(),
            code: 'MISSING',
            error: isAirgapLicenseRequired()
                ? FATAL + ' (license.lic missing)'
                : null,
            hardwareId: computeHardwareId(),
            payload: null,
        };
        return cached;
    }
    const result = validateLicenseFile(file, opts);
    cached = Object.assign({ filePresent: true }, result);
    return cached;
}

function invalidateCache() {
    cached = null;
}

/**
 * Boot gate — throws with FATAL message when license cannot run services.
 * Lab: leave FM_AIRGAP_LICENSE_REQUIRED unset/0 and omit license.lic.
 * Ship: set FM_AIRGAP_LICENSE_REQUIRED=1 and ship signed storage/license.lic.
 */
function validateOnBoot(opts) {
    const st = loadAndValidate(opts);
    if (st.ok) return st;
    if (!st.filePresent && !isAirgapLicenseRequired()) {
        return st; /* lab optional */
    }
    const msg = st.error || FATAL;
    const err = new Error(msg);
    err.code = 'LICENSE_FATAL';
    err.licenseStatus = st;
    throw err;
}

function getFeatures() {
    const st = loadAndValidate();
    if (!st.ok || !st.features) return {};
    return Object.assign({}, st.features);
}

function isLabOpen() {
    const st = loadAndValidate();
    return !!(st && !st.filePresent && !isAirgapLicenseRequired());
}

/**
 * Runtime feature toggle from signed license.features.
 * Lab (no license.lic + air-gap not required): fail-open → true.
 * Licensed host: true only when features[featureName] === true.
 */
function hasFeature(featureName) {
    try {
        const name = String(featureName || '').trim();
        if (!name) return false;
        if (isLabOpen()) return true;
        const st = loadAndValidate();
        if (!st.ok || !st.features) return false;
        return !!st.features[name];
    } catch (_) {
        /* Fail closed — never throw to callers on corrupt / missing license */
        return false;
    }
}

/**
 * Capacity: allowed when currentCount < maxFixedCameras.
 * Lab open: unlimited (ok).
 * Pass registry size BEFORE adding one cam, or (totalAfter - 1) for batch adds.
 */
function checkFixedCamLimit(currentCount) {
    const n = Math.max(0, Number(currentCount) || 0);
    if (isLabOpen()) {
        return {
            ok: true,
            allowed: true,
            unlimited: true,
            current: n,
            max: null,
            remaining: null,
            code: null,
        };
    }
    const st = loadAndValidate();
    if (!st.ok) {
        return {
            ok: false,
            allowed: false,
            unlimited: false,
            current: n,
            max: null,
            remaining: 0,
            code: 'ERR_LIC_INVALID',
            error: st.error || FATAL,
        };
    }
    const max = Number(st.maxFixedCameras);
    const allowed = Number.isFinite(max) && n < max;
    return {
        ok: allowed,
        allowed: allowed,
        unlimited: false,
        current: n,
        max: max,
        remaining: Number.isFinite(max) ? Math.max(0, max - n) : 0,
        code: allowed ? null : 'ERR_LIC_CAM_LIMIT_EXCEEDED',
        error: allowed ? null : 'ERR_LIC_CAM_LIMIT_EXCEEDED',
    };
}

/** Same shape as fixed cams — currentCount < maxBwcDevices. */
function checkBwcLimit(currentCount) {
    const n = Math.max(0, Number(currentCount) || 0);
    if (isLabOpen()) {
        return {
            ok: true,
            allowed: true,
            unlimited: true,
            current: n,
            max: null,
            remaining: null,
            code: null,
        };
    }
    const st = loadAndValidate();
    if (!st.ok) {
        return {
            ok: false,
            allowed: false,
            unlimited: false,
            current: n,
            max: null,
            remaining: 0,
            code: 'ERR_LIC_INVALID',
            error: st.error || FATAL,
        };
    }
    const max = Number(st.maxBwcDevices);
    const allowed = Number.isFinite(max) && n < max;
    return {
        ok: allowed,
        allowed: allowed,
        unlimited: false,
        current: n,
        max: max,
        remaining: Number.isFinite(max) ? Math.max(0, max - n) : 0,
        code: allowed ? null : 'ERR_LIC_BWC_LIMIT_EXCEEDED',
        error: allowed ? null : 'ERR_LIC_BWC_LIMIT_EXCEEDED',
    };
}

/**
 * Tactical map pin live open cap from signed license.
 * Lab open → null (unlimited / next MOB may default UI).
 * Licensed with field → 8 or 16 (clamped 1..64).
 * Licensed without field → default 8 (Basic floor).
 */
function getTacticalPinLiveCap() {
    if (isLabOpen()) return null;
    const st = loadAndValidate();
    if (!st.ok || !st.payload) return 0;
    const n = Number(st.payload.tacticalPinLiveCap);
    if (Number.isFinite(n) && n >= 1) return Math.min(64, Math.floor(n));
    return 8;
}

/**
 * Derived plan label for UI / ship desk.
 * command = Overwatch on OR pin cap >= 16; else basic when licensed.
 */
function getTacticalPlan() {
    if (isLabOpen()) return 'lab';
    const st = loadAndValidate();
    if (!st.ok || !st.payload) return null;
    const cap = getTacticalPinLiveCap();
    const ow = !!(st.features && st.features.tacticalOverwatch);
    if (ow || (cap != null && cap >= 16)) return 'command';
    return 'basic';
}

/**
 * Public / UI-safe entitlement snapshot (no signature, no private key material).
 */
function getPublicEntitlements() {
    const st = loadAndValidate();
    if (isLabOpen()) {
        return {
            licensed: false,
            labOpen: true,
            customerName: null,
            expiryDate: null,
            hardwareId: st.hardwareId || computeHardwareId(),
            maxFixedCameras: null,
            maxBwcDevices: null,
            tacticalPinLiveCap: null,
            tacticalPlan: 'lab',
            features: {
                ptt: true,
                redaction: true,
                analyticsFr: true,
                analyticsAnpr: true,
                analyticsWeapon: true,
                videoConference: true,
                tacticalOverwatch: true,
                cadIntegration: true,
                /* legacy aliases */
                analytics: true,
                ptzControl: true,
            },
            airgapRequired: false,
        };
    }
    if (!st.ok || !st.payload) {
        return {
            licensed: false,
            labOpen: false,
            customerName: null,
            expiryDate: null,
            hardwareId: st.hardwareId || computeHardwareId(),
            maxFixedCameras: null,
            maxBwcDevices: null,
            tacticalPinLiveCap: 0,
            tacticalPlan: null,
            features: {},
            airgapRequired: isAirgapLicenseRequired(),
            errorCode: st.code || 'INVALID',
        };
    }
    return {
        licensed: true,
        labOpen: false,
        customerName: st.customerName || null,
        expiryDate: st.expiryDate || null,
        hardwareId: st.hardwareId || null,
        maxFixedCameras: st.maxFixedCameras,
        maxBwcDevices: st.maxBwcDevices,
        tacticalPinLiveCap: getTacticalPinLiveCap(),
        tacticalPlan: getTacticalPlan(),
        features: getFeatures(),
        airgapRequired: isAirgapLicenseRequired(),
        licenseId: st.payload.licenseId || null,
        orgId: st.payload.orgId || null,
    };
}

function getEntitlements() {
    const st = loadAndValidate();
    if (!st.ok || !st.payload) return null;
    return {
        customerName: st.customerName,
        hardwareId: st.hardwareId,
        expiryDate: st.expiryDate,
        maxFixedCameras: st.maxFixedCameras,
        maxBwcDevices: st.maxBwcDevices,
        features: getFeatures(),
    };
}

function buildLicDocument(payload, privateKeyPem) {
    const canon = canonicalPayload(payload);
    if (!canon.issuedAt) {
        canon.issuedAt = new Date().toISOString();
    }
    if (!canon.licenseId) {
        canon.licenseId = 'lic-' + crypto.randomBytes(8).toString('hex');
    }
    const signature = signPayload(canon, privateKeyPem);
    return {
        v: 1,
        alg: ALG,
        payload: canon,
        signature: signature,
    };
}

module.exports = {
    ALG,
    LIC_FILENAME,
    FATAL,
    TRIAL_WILDCARD_HWID,
    init,
    invalidateCache,
    computeHardwareId,
    collectMacList,
    isTrialWildcardHwid,
    canonicalPayload,
    canonicalString,
    signPayload,
    verifySignature,
    validateLicenseFile,
    loadAndValidate,
    validateOnBoot,
    getFeatures,
    getEntitlements,
    getPublicEntitlements,
    getTacticalPinLiveCap,
    getTacticalPlan,
    isLabOpen,
    hasFeature,
    checkFixedCamLimit,
    checkBwcLimit,
    buildLicDocument,
    findLicenseFile,
    resolvePublicKeyPem,
    isAirgapLicenseRequired,
};
