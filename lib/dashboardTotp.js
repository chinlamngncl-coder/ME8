/**
 * Dashboard TOTP enrollment, login challenges, backup codes.
 */
const crypto = require('crypto');
const totpAuth = require('./totpAuth');

const LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ENROLL_PENDING_TTL_MS = 15 * 60 * 1000;
const TOTP_ISSUER = 'Ubitron ME8';

const pendingLoginChallenges = new Map();
const pendingEnrollments = new Map();

function purgeExpired(map, ttlMs) {
    const now = Date.now();
    for (const [key, row] of map.entries()) {
        if (!row || now > row.expires) map.delete(key);
    }
}

function userTotpEnabled(user) {
    return !!(user && user.totpEnabled && user.totpSecret);
}

function userMustEnrollTotp(user) {
    if (!user || user.active === false) return false;
    if (user.mustChangePassword) return false;
    if (user.oidcOnly) return false;
    return user.role === 'super_admin' && !userTotpEnabled(user);
}

function userRequiresTotpAtLogin(user) {
    return userTotpEnabled(user);
}

function normalizeBackupRows(rows) {
    return Array.isArray(rows) ? rows.filter((r) => r && !r.used) : [];
}

function createLoginChallenge(user) {
    purgeExpired(pendingLoginChallenges, LOGIN_CHALLENGE_TTL_MS);
    const challenge = crypto.randomBytes(24).toString('hex');
    pendingLoginChallenges.set(challenge, {
        userId: user.id,
        username: user.username,
        role: user.role,
        expires: Date.now() + LOGIN_CHALLENGE_TTL_MS,
    });
    return challenge;
}

function getLoginChallenge(challenge) {
    purgeExpired(pendingLoginChallenges, LOGIN_CHALLENGE_TTL_MS);
    const row = pendingLoginChallenges.get(String(challenge || ''));
    if (!row || Date.now() > row.expires) return null;
    return row;
}

function consumeLoginChallenge(challenge) {
    const row = getLoginChallenge(challenge);
    if (!row) return null;
    pendingLoginChallenges.delete(String(challenge || ''));
    return row;
}

function startEnrollment(userId, secret) {
    purgeExpired(pendingEnrollments, ENROLL_PENDING_TTL_MS);
    const token = crypto.randomBytes(24).toString('hex');
    pendingEnrollments.set(token, {
        userId,
        secret,
        expires: Date.now() + ENROLL_PENDING_TTL_MS,
    });
    return token;
}

function getEnrollment(token) {
    purgeExpired(pendingEnrollments, ENROLL_PENDING_TTL_MS);
    const row = pendingEnrollments.get(String(token || ''));
    if (!row || Date.now() > row.expires) return null;
    return row;
}

function consumeEnrollment(token) {
    const row = getEnrollment(token);
    if (!row) return null;
    pendingEnrollments.delete(String(token || ''));
    return row;
}

function buildEnrollmentPayload(user, secret) {
    const accountName = user.username;
    const otpauthUri = totpAuth.buildOtpAuthUri({
        issuer: TOTP_ISSUER,
        accountName,
        secret,
    });
    return {
        secret,
        otpauthUri,
        accountName,
        issuer: TOTP_ISSUER,
    };
}

async function buildEnrollmentQr(payload) {
    return totpAuth.qrDataUrl(payload.otpauthUri);
}

function verifyUserTotpCode(user, code) {
    if (!user || !user.totpSecret) return { ok: false, usedBackup: false };
    const token = String(code || '').trim().replace(/\s/g, '');
    if (totpAuth.verifyTotp(user.totpSecret, token)) {
        return { ok: true, usedBackup: false };
    }
    const rows = normalizeBackupRows(user.totpBackupCodes);
    for (let i = 0; i < rows.length; i++) {
        if (totpAuth.verifyBackupCode(token, rows[i])) {
            return { ok: true, usedBackup: true, backupIndex: i };
        }
    }
    return { ok: false, usedBackup: false };
}

function markBackupCodeUsed(user, backupIndex) {
    if (!Array.isArray(user.totpBackupCodes) || backupIndex < 0) return user;
    if (user.totpBackupCodes[backupIndex]) {
        user.totpBackupCodes[backupIndex].used = true;
        user.totpBackupCodes[backupIndex].usedAt = new Date().toISOString();
    }
    return user;
}

function enableTotpOnUser(user, secret, plainBackupCodes) {
    user.totpEnabled = true;
    user.totpSecret = String(secret || '');
    user.totpEnrolledAt = new Date().toISOString();
    user.totpBackupCodes = (plainBackupCodes || []).map((code) => {
        const hashed = totpAuth.hashBackupCode(code);
        return { salt: hashed.salt, hash: hashed.hash, used: false };
    });
    return user;
}

function disableTotpOnUser(user) {
    delete user.totpEnabled;
    delete user.totpSecret;
    delete user.totpEnrolledAt;
    delete user.totpBackupCodes;
    return user;
}

function remainingBackupCount(user) {
    return normalizeBackupRows(user && user.totpBackupCodes).length;
}

module.exports = {
    TOTP_ISSUER,
    userTotpEnabled,
    userMustEnrollTotp,
    userRequiresTotpAtLogin,
    createLoginChallenge,
    getLoginChallenge,
    consumeLoginChallenge,
    startEnrollment,
    getEnrollment,
    consumeEnrollment,
    buildEnrollmentPayload,
    buildEnrollmentQr,
    verifyUserTotpCode,
    markBackupCodeUsed,
    enableTotpOnUser,
    disableTotpOnUser,
    remainingBackupCount,
    totpAuth,
};
