/**
 * Platform outbound SMTP — settings normalization, public view, and test send.
 */
const nodemailer = require('nodemailer');

function smtpDefaultsFromEnv() {
    return {
        host: String(process.env.FM_SMTP_HOST || '').trim(),
        port: parseInt(process.env.FM_SMTP_PORT || '587', 10) || 587,
        secure: normalizeSecureMode(process.env.FM_SMTP_SECURE || 'starttls'),
        fromName: String(process.env.FM_SMTP_FROM_NAME || 'Mobility Axiom').trim(),
        fromEmail: String(process.env.FM_SMTP_FROM_EMAIL || '').trim(),
        user: String(process.env.FM_SMTP_USER || '').trim(),
        password: String(process.env.FM_SMTP_PASS || '').trim(),
        lastTestAt: '',
        lastTestOk: null,
        lastTestError: '',
    };
}

function normalizeSecureMode(raw) {
    const v = String(raw || '').toLowerCase().trim();
    if (v === 'ssl' || v === 'tls' || v === 'true' || v === '1') return 'ssl';
    if (v === 'none' || v === 'plain' || v === 'off' || v === '0') return 'none';
    return 'starttls';
}

function normalizeSmtp(smtpIn, envBase) {
    const base = envBase || smtpDefaultsFromEnv();
    const inS = smtpIn || {};
    const port = parseInt(inS.port != null ? inS.port : base.port, 10) || 587;
    return {
        host: String(inS.host != null ? inS.host : base.host).trim(),
        port: Math.min(65535, Math.max(1, port)),
        secure: normalizeSecureMode(inS.secure != null ? inS.secure : base.secure),
        fromName: String(inS.fromName != null ? inS.fromName : base.fromName).trim(),
        fromEmail: String(inS.fromEmail != null ? inS.fromEmail : base.fromEmail).trim(),
        user: String(inS.user != null ? inS.user : base.user).trim(),
        password: String(inS.password != null ? inS.password : base.password),
        lastTestAt: String(inS.lastTestAt != null ? inS.lastTestAt : base.lastTestAt || '').trim(),
        lastTestOk: inS.lastTestOk != null ? !!inS.lastTestOk : (base.lastTestOk != null ? !!base.lastTestOk : null),
        lastTestError: String(inS.lastTestError != null ? inS.lastTestError : base.lastTestError || '').trim(),
    };
}

function resolveSmtpRuntime(settings) {
    const s = settings && typeof settings === 'object' ? settings : {};
    return normalizeSmtp(s.smtp, smtpDefaultsFromEnv());
}

function smtpPublicView(settings) {
    const r = resolveSmtpRuntime(settings);
    return {
        host: r.host,
        port: r.port,
        secure: r.secure,
        fromName: r.fromName,
        fromEmail: r.fromEmail,
        user: r.user,
        passwordConfigured: !!r.password,
        lastTestAt: r.lastTestAt || null,
        lastTestOk: r.lastTestOk,
        lastTestError: r.lastTestError || null,
    };
}

function stripPassword(smtp) {
    const copy = Object.assign({}, smtp || {});
    delete copy.password;
    return copy;
}

function buildTransport(runtime) {
    const secure = runtime.secure === 'ssl';
    const opts = {
        host: runtime.host,
        port: runtime.port,
        secure,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    };
    if (runtime.secure === 'starttls') {
        opts.requireTLS = true;
    }
    if (runtime.user) {
        opts.auth = {
            user: runtime.user,
            pass: runtime.password || '',
        };
    }
    return nodemailer.createTransport(opts);
}

function validateForSend(runtime) {
    const errors = [];
    if (!runtime.host) errors.push('SMTP host is required.');
    if (!runtime.fromEmail) errors.push('From email address is required.');
    if (runtime.user && !runtime.password) errors.push('SMTP password is required when a username is set.');
    return errors;
}

async function sendTestMail(runtime, testTo) {
    const to = String(testTo || '').trim();
    const problems = validateForSend(runtime);
    if (!to) problems.push('Test recipient email is required.');
    if (problems.length) {
        const err = new Error(problems[0]);
        err.code = 'SMTP_VALIDATION';
        err.problems = problems;
        throw err;
    }
    const transport = buildTransport(runtime);
    const fromName = runtime.fromName || 'Mobility Axiom';
    const from = runtime.fromName
        ? `"${fromName.replace(/"/g, '')}" <${runtime.fromEmail}>`
        : runtime.fromEmail;
    const info = await transport.sendMail({
        from,
        to,
        subject: 'Mobility C2 — SMTP test',
        text: [
            'This is a test message from your Mobility C2 dashboard.',
            '',
            'If you received this email, outbound SMTP is configured correctly.',
            '',
            `Sent at: ${new Date().toISOString()}`,
        ].join('\n'),
    });
    return {
        messageId: info && info.messageId ? info.messageId : null,
        accepted: info && info.accepted ? info.accepted : [],
    };
}

module.exports = {
    smtpDefaultsFromEnv,
    normalizeSecureMode,
    normalizeSmtp,
    resolveSmtpRuntime,
    smtpPublicView,
    stripPassword,
    buildTransport,
    validateForSend,
    sendTestMail,
};
