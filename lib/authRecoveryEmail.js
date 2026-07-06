/**
 * Recovery email — verify flow for super-admin lockout recovery (MOB mob-me8-auth-recovery-email).
 */
const crypto = require('crypto');
const platformSmtp = require('./platformSmtp');

const VERIFY_TTL_MS = 30 * 60 * 1000;
const RESEND_MAX = 3;
const RESEND_WINDOW_MS = 60 * 60 * 1000;

const resendByUserId = new Map();

function isValidEmail(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s || s.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizeEmail(raw) {
    return String(raw || '').trim().toLowerCase();
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function newVerifyToken() {
    return crypto.randomBytes(32).toString('hex');
}

function purgeResendLog(userId) {
    const row = resendByUserId.get(userId);
    if (!row) return;
    const cutoff = Date.now() - RESEND_WINDOW_MS;
    row.times = (row.times || []).filter(function (t) { return t >= cutoff; });
    if (!row.times.length) resendByUserId.delete(userId);
    else resendByUserId.set(userId, row);
}

function canResend(userId) {
    purgeResendLog(userId);
    const row = resendByUserId.get(userId);
    return !row || !row.times || row.times.length < RESEND_MAX;
}

function recordResend(userId) {
    purgeResendLog(userId);
    const row = resendByUserId.get(userId) || { times: [] };
    row.times.push(Date.now());
    resendByUserId.set(userId, row);
}

function recoveryStatus(user) {
    const email = normalizeEmail(user && user.recoveryEmail);
    const verified = !!(email && user.recoveryEmailVerifiedAt);
    const pending = !!(email && !verified && user.recoveryEmailVerifyTokenHash);
    return {
        email: email || '',
        verified,
        verifiedAt: user && user.recoveryEmailVerifiedAt ? user.recoveryEmailVerifiedAt : null,
        pending,
        expiresAt: user && user.recoveryEmailVerifyExpiresAt ? user.recoveryEmailVerifyExpiresAt : null,
    };
}

function mustVerifyRecoveryEmail(user) {
    const dashboardTotp = require('./dashboardTotp');
    if (dashboardTotp.isTotpSuspended()) return false;
    if (!user || user.active === false) return false;
    if (user.role !== 'super_admin') return false;
    if (!dashboardTotp.userTotpEnabled(user)) return false;
    return !recoveryStatus(user).verified;
}

function resolvePublicBaseUrl(req, settings) {
    const dep = settings && settings.deployment ? settings.deployment : {};
    const fromSettings = String(dep.operatorUrl || '').trim().replace(/\/$/, '');
    if (fromSettings) return fromSettings;
    const host = (req && req.get && req.get('host')) || 'localhost:3988';
    const proto = (req && (req.secure || req.get('x-forwarded-proto') === 'https')) ? 'https' : 'http';
    return proto + '://' + host;
}

function buildVerifyUrl(baseUrl, token) {
    const base = String(baseUrl || '').replace(/\/$/, '');
    return base + '/verify-recovery-email.html?token=' + encodeURIComponent(token);
}

async function sendVerificationEmail(runtime, to, verifyUrl, username) {
    const problems = platformSmtp.validateForSend(runtime);
    if (!to) problems.push('Recovery email address is required.');
    if (problems.length) {
        const err = new Error(problems[0]);
        err.code = 'SMTP_VALIDATION';
        err.problems = problems;
        throw err;
    }
    const transport = platformSmtp.buildTransport(runtime);
    const fromName = runtime.fromName || 'Mobility Axiom';
    const from = runtime.fromName
        ? '"' + fromName.replace(/"/g, '') + '" <' + runtime.fromEmail + '>'
        : runtime.fromEmail;
    const who = username ? (' for ' + username) : '';
    const info = await transport.sendMail({
        from,
        to,
        subject: 'Mobility C2 — verify recovery email',
        text: [
            'Verify this email address' + who + ' on your Mobility C2 dashboard.',
            '',
            'Open this link within 30 minutes:',
            verifyUrl,
            '',
            'If you did not request this, you can ignore this message.',
            '',
            'Sent at: ' + new Date().toISOString(),
        ].join('\n'),
    });
    return {
        messageId: info && info.messageId ? info.messageId : null,
    };
}

function prepareUserPendingVerify(user, email) {
    const token = newVerifyToken();
    user.recoveryEmail = normalizeEmail(email);
    delete user.recoveryEmailVerifiedAt;
    user.recoveryEmailVerifyTokenHash = hashToken(token);
    user.recoveryEmailVerifyExpiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
    return token;
}

function findUserByVerifyToken(users, token) {
    const want = hashToken(token);
    const now = Date.now();
    for (let i = 0; i < (users || []).length; i += 1) {
        const u = users[i];
        if (!u || u.active === false) continue;
        if (!u.recoveryEmailVerifyTokenHash || u.recoveryEmailVerifyTokenHash !== want) continue;
        const exp = Date.parse(u.recoveryEmailVerifyExpiresAt || '');
        if (!exp || now > exp) continue;
        return u;
    }
    return null;
}

function confirmUserVerify(user) {
    user.recoveryEmailVerifiedAt = new Date().toISOString();
    delete user.recoveryEmailVerifyTokenHash;
    delete user.recoveryEmailVerifyExpiresAt;
}

module.exports = {
    VERIFY_TTL_MS,
    isValidEmail,
    normalizeEmail,
    recoveryStatus,
    mustVerifyRecoveryEmail,
    canResend,
    recordResend,
    resolvePublicBaseUrl,
    buildVerifyUrl,
    sendVerificationEmail,
    prepareUserPendingVerify,
    findUserByVerifyToken,
    confirmUserVerify,
};
