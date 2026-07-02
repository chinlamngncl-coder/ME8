/**
 * Short-lived reverify tokens after password confirmation (5 min).
 * Dangerous API routes accept adminPassword or reverifyToken.
 */
const crypto = require('crypto');
const dashboardAuth = require('./dashboardAuth');

const REVEREIFY_TTL_MS = 5 * 60 * 1000;
const pendingTokens = new Map();

function purgeExpiredTokens() {
    const now = Date.now();
    for (const [key, row] of pendingTokens.entries()) {
        if (!row || now > row.expires) pendingTokens.delete(key);
    }
}

function issueToken(session) {
    purgeExpiredTokens();
    if (!session || !session.userId) throw new Error('Unauthorized');
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + REVEREIFY_TTL_MS;
    pendingTokens.set(token, { userId: session.userId, expires: expiresAt });
    return { reverifyToken: token, expiresAt };
}

function tokenValid(session, token) {
    purgeExpiredTokens();
    const row = pendingTokens.get(String(token || ''));
    if (!row || !session || row.userId !== session.userId) return false;
    if (Date.now() > row.expires) {
        pendingTokens.delete(String(token || ''));
        return false;
    }
    return true;
}

function assertReverified(session, body) {
    const payload = body || {};
    const adminPassword = payload.adminPassword != null ? String(payload.adminPassword) : '';
    const reverifyToken = payload.reverifyToken != null ? String(payload.reverifyToken) : '';

    if (adminPassword) {
        if (dashboardAuth.verifySessionPassword(session, adminPassword)) {
            return { ok: true };
        }
        return {
            ok: false,
            error: 'Incorrect password',
            errorKey: 'errors.passwordWrong',
        };
    }
    if (reverifyToken && tokenValid(session, reverifyToken)) {
        return { ok: true };
    }
    return {
        ok: false,
        error: 'Enter your password to confirm this change.',
        errorKey: 'errors.passwordConfirmRequired',
    };
}

function revokeTokensForUser(userId) {
    for (const [key, row] of pendingTokens.entries()) {
        if (row && row.userId === userId) pendingTokens.delete(key);
    }
}

module.exports = {
    REVEREIFY_TTL_MS,
    issueToken,
    assertReverified,
    revokeTokensForUser,
};
