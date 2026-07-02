/**
 * Field-engineer diagnostics access — separate from dashboard users.
 * PIN from encrypted server vault (dashboard provision) or installer bootstrap env.
 */

const crypto = require('crypto');
const serverSecrets = require('./serverSecrets');

const COOKIE_NAME = 'fm_tech_diag';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MIN_PIN_LEN = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const sessions = new Map();
const attemptsByIp = new Map();

let pinHash = null;
let pinSalt = null;
let configured = false;

function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function hashPin(pin, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(pin), s, 64).toString('hex');
    return { salt: s, hash };
}

function clearPinState() {
    pinHash = null;
    pinSalt = null;
    configured = false;
}

function loadFromVault(storageDir) {
    if (!storageDir) return false;
    const secrets = serverSecrets.loadSecrets(storageDir);
    const t = (secrets && secrets.tech) || {};
    if (!t.engineerPinHash || !t.engineerPinSalt) return false;
    pinHash = t.engineerPinHash;
    pinSalt = t.engineerPinSalt;
    configured = true;
    return true;
}

function loadFromEnv() {
    const pin = (process.env.FM_TECH_ENGINEER_PIN || '').trim();
    if (!pin || pin.length < MIN_PIN_LEN) {
        clearPinState();
        return false;
    }
    const { salt, hash } = hashPin(pin);
    pinSalt = salt;
    pinHash = hash;
    configured = true;
    return true;
}

function init(storageDir) {
    clearPinState();
    if (storageDir && loadFromVault(storageDir)) return true;
    return loadFromEnv();
}

function provisionPin(storageDir, pin) {
    const p = String(pin || '').trim();
    if (p.length < MIN_PIN_LEN) {
        const err = new Error('PIN must be at least 12 characters.');
        err.errorKey = 'tech.provision.pinTooShort';
        throw err;
    }
    const { salt, hash } = hashPin(p);
    const secrets = serverSecrets.loadSecrets(storageDir);
    secrets.tech = { engineerPinHash: hash, engineerPinSalt: salt };
    serverSecrets.saveSecrets(storageDir, secrets);
    pinHash = hash;
    pinSalt = salt;
    configured = true;
    return true;
}

function isConfigured() {
    return configured && !!pinHash;
}

function verifyPin(pin) {
    if (!isConfigured()) return false;
    const { hash } = hashPin(String(pin || ''), pinSalt);
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(pinHash, 'hex'));
    } catch (_) {
        return false;
    }
}

function isLockedOut(ip) {
    const row = attemptsByIp.get(ip);
    return !!(row && row.lockedUntil > Date.now());
}

function recordFailedAttempt(ip) {
    const row = attemptsByIp.get(ip) || { count: 0, lockedUntil: 0 };
    row.count += 1;
    if (row.count >= MAX_ATTEMPTS) {
        row.lockedUntil = Date.now() + LOCKOUT_MS;
        row.count = 0;
    }
    attemptsByIp.set(ip, row);
}

function clearAttempts(ip) {
    attemptsByIp.delete(ip);
}

function createSession() {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { expires: Date.now() + SESSION_TTL_MS });
    return token;
}

function destroySession(token) {
    if (token) sessions.delete(token);
}

function getSession(token) {
    if (!token) return null;
    const row = sessions.get(token);
    if (!row) return null;
    if (Date.now() > row.expires) {
        sessions.delete(token);
        return null;
    }
    return row;
}

function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i < 1) return;
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (k) out[k] = decodeURIComponent(v);
    });
    return out;
}

function tokenFromRequest(req) {
    return parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
}

function setSessionCookie(res, token) {
    const maxAge = Math.floor(SESSION_TTL_MS / 1000);
    res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
    );
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function requireTechAuth(req, res, next) {
    if (!isConfigured()) {
        return res.status(503).json({
            ok: false,
            error: 'Engineer diagnostics is not available on this server.',
        });
    }
    const session = getSession(tokenFromRequest(req));
    if (!session) {
        return res.status(401).json({ ok: false, error: 'Engineer authentication required.' });
    }
    req.techSession = session;
    return next();
}

function loginHandler(log) {
    return (req, res) => {
        if (!isConfigured()) {
            return res.status(503).json({
                ok: false,
                error: 'Engineer diagnostics is not available on this server.',
            });
        }
        const ip = clientIp(req);
        if (isLockedOut(ip)) {
            if (log && log.web) log.web.warn('tech login locked out', { ip });
            return res.status(429).json({
                ok: false,
                error: 'Too many failed attempts. Try again in 15 minutes.',
            });
        }
        const body = req.body || {};
        const pin = String(body.pin || body.password || '').trim();
        if (!pin) {
            return res.status(400).json({ ok: false, error: 'Engineer PIN required.' });
        }
        if (!verifyPin(pin)) {
            recordFailedAttempt(ip);
            if (log && log.web) log.web.warn('tech login failed', { ip });
            return res.status(401).json({ ok: false, error: 'Invalid engineer PIN.' });
        }
        clearAttempts(ip);
        const token = createSession();
        setSessionCookie(res, token);
        if (log && log.web) log.web.info('tech login ok', { ip });
        return res.json({ ok: true, expiresInSec: Math.floor(SESSION_TTL_MS / 1000) });
    };
}

function logoutHandler(req, res) {
    destroySession(tokenFromRequest(req));
    clearSessionCookie(res);
    res.json({ ok: true });
}

function sessionHandler(req, res) {
    if (!isConfigured()) {
        return res.json({ ok: false, configured: false });
    }
    const session = getSession(tokenFromRequest(req));
    if (!session) {
        return res.json({ ok: false, configured: true, authenticated: false });
    }
    return res.json({
        ok: true,
        configured: true,
        authenticated: true,
        expiresInSec: Math.max(0, Math.floor((session.expires - Date.now()) / 1000)),
    });
}

module.exports = {
    COOKIE_NAME,
    MIN_PIN_LEN,
    init,
    provisionPin,
    isConfigured,
    requireTechAuth,
    loginHandler,
    logoutHandler,
    sessionHandler,
    tokenFromRequest,
    getSession,
};
