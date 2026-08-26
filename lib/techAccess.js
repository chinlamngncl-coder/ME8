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
    // Ed25519 unlock is always available (CRM-signed). PIN vault is legacy optional.
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

// ── Ed25519 diagnostics unlock (Advanced Telemetry / engineer gate) ───────────
const CRM_PUBLIC_KEY_B64 = 'MCowBQYDK2VwAyEALnrJedAeeaC0APxTZX62MqDWJN9vAxcBouzkT2aHFVA=';
const UNLOCK_TTL_MS = 15 * 60 * 1000;
const unlockChallenges = new Map();

function _cleanupUnlockChallenges() {
    const now = Date.now();
    for (const [k, v] of unlockChallenges) {
        if (now > v.expiry) unlockChallenges.delete(k);
    }
}

function createUnlockChallenge() {
    _cleanupUnlockChallenges();
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + UNLOCK_TTL_MS;
    let hardwareId = '';
    try {
        hardwareId = String(require('./licenseManager').computeHardwareId() || '');
    } catch (_) {
        hardwareId = '';
    }
    unlockChallenges.set(nonce, { expiry, hardwareId });
    return { nonce, fingerprint: hardwareId, hardwareId, expiry, version: 1 };
}

function verifyUnlockGrant(grantBuf, options) {
    const opts = options || {};
    let outer;
    try {
        outer = JSON.parse(Buffer.isBuffer(grantBuf) ? grantBuf.toString('utf8') : String(grantBuf));
    } catch (_) {
        throw new Error('Unlock token is not valid JSON');
    }
    const { payload: payloadB64, signature: sigB64 } = outer || {};
    if (!payloadB64 || !sigB64) throw new Error('Unlock token missing payload or signature');

    const pubKey = crypto.createPublicKey({
        key: opts.publicKeyDer || Buffer.from(CRM_PUBLIC_KEY_B64, 'base64'),
        format: 'der',
        type: 'spki',
    });
    const payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    const sigBuf = Buffer.from(sigB64, 'base64');
    let ok = false;
    try {
        ok = crypto.verify(null, Buffer.from(payload, 'utf8'), pubKey, sigBuf);
    } catch (_) {
        throw new Error('Signature verification failed');
    }
    if (!ok) throw new Error('Unlock token signature is invalid');

    let claims;
    try {
        claims = JSON.parse(payload);
    } catch (_) {
        throw new Error('Unlock token payload is malformed');
    }
    if (claims.type !== 'diagnostics_unlock') throw new Error('Grant type mismatch');
    if (!claims.issued_at || Date.now() - claims.issued_at > UNLOCK_TTL_MS) {
        throw new Error('Unlock token has expired');
    }
    _cleanupUnlockChallenges();
    const pending = unlockChallenges.get(claims.challenge_nonce);
    if (!pending) throw new Error('Challenge nonce not recognised or already used');
    if (Date.now() > pending.expiry) {
        unlockChallenges.delete(claims.challenge_nonce);
        throw new Error('Challenge has expired');
    }
    let localHwid = '';
    try {
        localHwid = String(require('./licenseManager').computeHardwareId() || '');
    } catch (_) { /* ignore */ }
    const expectedHwid = String(pending.hardwareId || '').trim().toLowerCase();
    const actualHwid = String(localHwid || '').trim().toLowerCase();
    if (!expectedHwid || !actualHwid || expectedHwid !== actualHwid) {
        throw new Error('Challenge hardware ID mismatch');
    }
    const tokenHwid = String(claims.hwid || claims.hardware_id || claims.fingerprint || '').trim().toLowerCase();
    if (tokenHwid && tokenHwid !== actualHwid) {
        throw new Error('Unlock token hardware ID mismatch');
    }
    unlockChallenges.delete(claims.challenge_nonce);
    return true;
}

function challengeHandler(req, res) {
    try {
        const challenge = createUnlockChallenge();
        // Top-level nonce for UI; nested challenge kept for CRM / legacy callers
        res.json({ ok: true, nonce: challenge.nonce, challenge });
    } catch (err) {
        res.status(500).json({ ok: false, error: 'Challenge generation failed' });
    }
}

function unlockGrantHandler(log) {
    return (req, res) => {
        const ip = clientIp(req);
        if (isLockedOut(ip)) {
            return res.status(429).json({
                ok: false,
                error: 'Too many failed attempts. Try again in 15 minutes.',
            });
        }
        const grantStr = (req.body || {}).grant || (req.body || {}).token || '';
        if (!grantStr) {
            return res.status(400).json({ ok: false, error: 'Unlock token required' });
        }
        try {
            verifyUnlockGrant(Buffer.from(String(grantStr), 'utf8'));
            clearAttempts(ip);
            const token = createSession();
            setSessionCookie(res, token);
            if (log && log.web) log.web.info('tech unlock grant ok', { ip });
            return res.json({ ok: true, expiresInSec: Math.floor(SESSION_TTL_MS / 1000) });
        } catch (err) {
            recordFailedAttempt(ip);
            if (log && log.web) log.web.warn('tech unlock grant failed', { ip });
            return res.status(403).json({
                ok: false,
                error: 'Unlock token rejected — invalid, expired, or already used',
            });
        }
    };
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
    challengeHandler,
    unlockGrantHandler,
    createUnlockChallenge,
    verifyUnlockGrant,
    tokenFromRequest,
    getSession,
};
