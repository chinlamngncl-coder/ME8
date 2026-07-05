/**
 * Dashboard auth — multi-user with roles (super_admin, operator).
 * Stored in storage/dashboard-users.json; migrates legacy dashboard-auth.json once.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROLES = Object.freeze({
    super_admin: { label: 'Super admin', canManageServer: true, canManageUsers: true },
    operator: { label: 'Operator', canManageServer: false, canManageUsers: false },
});

const DEFAULT_PERMISSIONS = Object.freeze({
    mapDeviceControl: false,
    deviceKillSwitch: false,
    geofenceControl: false,
    clearMapPins: false,
    evidenceView: false,
    evidenceDownload: false,
    evidenceExport: false,
    evidenceEdit: false,
    dockAdmin: false,
    conferenceView: false,
    conferenceJoin: false,
    conferenceHost: false,
    conferenceRecord: false,
    conferenceBwcShare: false,
    conferenceCrossGroup: false,
    auditView: false,
    auditExport: false,
    overlayView: false,
    overlayEdit: false,
    overlayCloseOp: false,
    overlayCamera: false,
    evidenceDownloadExpiresAt: null,
    signInStartsAt: null,
    signInExpiresAt: null,
    seeAllDispatchGroups: false,
});

const REMOTE_CONTROL_COMMANDS = new Set([
    'TakePicture',
    'Record',
    'StopRecord',
    'Lock',
    'Unlock',
]);
const REMOTE_CONTROL_KILL_COMMANDS = new Set(['ShutDown', 'Reboot']);
const REMOTE_CONTROL_REASON_COMMANDS = new Set(['Lock', 'ShutDown', 'Reboot']);
const REMOTE_CONTROL_REASON_MIN_LEN = 10;

function remoteControlRequiresReason(command) {
    return REMOTE_CONTROL_REASON_COMMANDS.has(String(command || ''));
}

function parseRemoteControlPayload(payload) {
    if (payload && typeof payload === 'object' && payload.command != null) {
        return {
            command: String(payload.command || '').trim(),
            reason: String(payload.reason || '').trim(),
            incidentId: String(payload.incidentId || '').trim().slice(0, 80),
        };
    }
    return {
        command: String(payload || '').trim(),
        reason: '',
        incidentId: '',
    };
}

function validateRemoteControlReason(command, reason) {
    if (!remoteControlRequiresReason(command)) {
        return { ok: true, reason: String(reason || '').trim() };
    }
    const r = String(reason || '').trim();
    if (r.length < REMOTE_CONTROL_REASON_MIN_LEN) {
        return {
            ok: false,
            error: 'Operational reason required (minimum ' + REMOTE_CONTROL_REASON_MIN_LEN + ' characters).',
        };
    }
    return { ok: true, reason: r };
}

const DEFAULT_USERNAME = 'global';
const DEFAULT_PASSWORD = 'global123';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LEN = 12;
const MIN_PASSWORD_LEN_SUPER_ADMIN = 14;
const PASSWORD_HISTORY_MAX = 5;
const PASSWORD_SPECIAL_CHARS = '!@#$%^&*()-_+=';
const PASSWORD_SPECIAL_RE = /[!@#$%^&*()\-_+=]/;
const PASSWORD_BLOCKED = new Set([
    DEFAULT_PASSWORD,
    'password',
    'password123',
    'admin123',
    'global123',
    'changeme',
    'welcome1',
]);

const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
    '/must-change-password.html',
    '/js/must-change-password.js',
    '/js/password-policy-ui.js',
    '/js/i18n.js',
    '/api/auth/change-password',
    '/api/auth/password-policy',
    '/api/auth/logout',
    '/api/auth/session',
    '/enroll-totp.html',
    '/js/enroll-totp.js',
    '/api/auth/totp/enroll/start',
    '/api/auth/totp/enroll/confirm',
]);

function minPasswordLengthForRole(role) {
    return normalizeRole(role) === 'super_admin' ? MIN_PASSWORD_LEN_SUPER_ADMIN : MIN_PASSWORD_LEN;
}

function getPasswordPolicyPublic(role) {
    const minLength = minPasswordLengthForRole(role);
    return {
        minLength,
        minLengthSuperAdmin: MIN_PASSWORD_LEN_SUPER_ADMIN,
        minLengthOperator: MIN_PASSWORD_LEN,
        requireUpper: true,
        requireLower: true,
        requireDigit: true,
        requireSpecial: true,
        specialChars: PASSWORD_SPECIAL_CHARS,
        historyCount: PASSWORD_HISTORY_MAX,
        blockDefaultInstallPassword: true,
    };
}

function passwordMatchesHistory(user, password) {
    if (!user) return false;
    const hist = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
    for (const row of hist) {
        if (!row || !row.salt || !row.passwordHash) continue;
        try {
            const { hash } = hashPassword(password, row.salt);
            if (crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(row.passwordHash, 'hex'))) {
                return true;
            }
        } catch (_) { /* skip */ }
    }
    return false;
}

function pushPasswordHistory(user) {
    if (!user || !user.passwordHash || !user.salt) return;
    const hist = Array.isArray(user.passwordHistory) ? user.passwordHistory.slice() : [];
    hist.unshift({ salt: user.salt, passwordHash: user.passwordHash });
    user.passwordHistory = hist.slice(0, PASSWORD_HISTORY_MAX);
}

function assertPasswordAllowed(password, context) {
    const pass = String(password || '');
    const ctx = context || {};
    const role = ctx.role != null ? ctx.role : 'operator';
    const username = String(ctx.username || '').trim();
    const user = ctx.user || null;
    const minLen = minPasswordLengthForRole(role);

    if (pass.length < minLen) {
        throw new Error(`Password must be at least ${minLen} characters`);
    }
    if (!/[A-Z]/.test(pass)) {
        throw new Error('Password must include at least one uppercase letter');
    }
    if (!/[a-z]/.test(pass)) {
        throw new Error('Password must include at least one lowercase letter');
    }
    if (!/[0-9]/.test(pass)) {
        throw new Error('Password must include at least one number');
    }
    if (!PASSWORD_SPECIAL_RE.test(pass)) {
        throw new Error(`Password must include at least one special character (${PASSWORD_SPECIAL_CHARS})`);
    }
    const lower = pass.toLowerCase();
    if (pass === DEFAULT_PASSWORD) {
        throw new Error('The default install password cannot be used. Choose a new password.');
    }
    if (PASSWORD_BLOCKED.has(lower)) {
        throw new Error('That password is too common. Choose a stronger password.');
    }
    if (username && lower === username.toLowerCase()) {
        throw new Error('Password cannot be the same as the username');
    }
    if (user && verifyPassword(user, pass)) {
        throw new Error('New password must be different from the current password');
    }
    if (user && passwordMatchesHistory(user, pass)) {
        throw new Error(`Password cannot match any of your last ${PASSWORD_HISTORY_MAX} passwords`);
    }
}

function applyUserPasswordChange(user, newPassword, context) {
    const role = (context && context.role) != null ? context.role : user.role;
    const username = (context && context.username) != null ? context.username : user.username;
    assertPasswordAllowed(newPassword, { username, role, user });
    pushPasswordHistory(user);
    const { salt, hash } = hashPassword(String(newPassword));
    user.salt = salt;
    user.passwordHash = hash;
    user.mustChangePassword = false;
    return user;
}

function userMustChangePassword(user) {
    return !!(user && user.active !== false && user.mustChangePassword);
}

function sessionMustChangePassword(session) {
    if (!session || !session.userId) return false;
    return userMustChangePassword(findUserById(session.userId));
}

function flagDefaultPasswordUsers(users) {
    let dirty = false;
    (users || []).forEach((u) => {
        if (u.active === false || u.mustChangePassword) return;
        if (verifyPassword(u, DEFAULT_PASSWORD)) {
            u.mustChangePassword = true;
            dirty = true;
        }
    });
    if (dirty) writeUsersFile(users);
    return users;
}

/** Run scrypt default-password scan once at process start — not on every ensureUsers() read. */
let defaultPasswordUsersFlagged = false;

function flagDefaultPasswordUsersOnce(users) {
    if (defaultPasswordUsersFlagged) return users || [];
    defaultPasswordUsersFlagged = true;
    if (!users || !users.length) return users || [];
    return flagDefaultPasswordUsers(users);
}

function isPasswordChangeBypassPath(reqPath) {
    if (PASSWORD_CHANGE_ALLOWED_PATHS.has(reqPath)) return true;
    if (reqPath.startsWith('/locales/') && reqPath.endsWith('.json')) return true;
    if (reqPath.startsWith('/assets/')) return true;
    if (reqPath.endsWith('.png') || reqPath.endsWith('.webp') || reqPath.endsWith('.ico')) return true;
    return false;
}

let usersPath = null;
let legacyAuthPath = null;
const sessions = new Map();
const dashboardTotp = require('./dashboardTotp');

function newUserId() {
    return crypto.randomBytes(8).toString('hex');
}

function hashPassword(password, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), s, 64).toString('hex');
    return { salt: s, hash };
}

function readUsersFile() {
    try {
        if (usersPath && fs.existsSync(usersPath)) {
            const data = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            if (Array.isArray(data.users)) return data.users;
        }
    } catch (_) { /* ignore */ }
    return null;
}

function writeUsersFile(users) {
    if (!usersPath) return;
    fs.mkdirSync(path.dirname(usersPath), { recursive: true });
    fs.writeFileSync(usersPath, JSON.stringify({ users }, null, 2), 'utf8');
}

function migrateLegacyAuth() {
    if (!legacyAuthPath || !fs.existsSync(legacyAuthPath)) return null;
    try {
        const old = JSON.parse(fs.readFileSync(legacyAuthPath, 'utf8'));
        if (!old || !old.username || !old.passwordHash || !old.salt) return null;
        return [{
            id: newUserId(),
            username: String(old.username).trim(),
            passwordHash: old.passwordHash,
            salt: old.salt,
            role: 'super_admin',
            active: true,
            createdAt: new Date().toISOString(),
        }];
    } catch (_) {
        return null;
    }
}

function ensureUsers() {
    let users = readUsersFile();
    if (users && users.length) {
        return users;
    }

    users = migrateLegacyAuth();
    if (!users || !users.length) {
        const { salt, hash } = hashPassword(DEFAULT_PASSWORD);
        users = [{
            id: newUserId(),
            username: DEFAULT_USERNAME,
            passwordHash: hash,
            salt,
            role: 'super_admin',
            active: true,
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
        }];
    }
    writeUsersFile(users);
    return flagDefaultPasswordUsersOnce(users);
}

function saveUsers(users) {
    writeUsersFile(users);
    return users;
}

function init(storageDir) {
    usersPath = path.join(storageDir, 'dashboard-users.json');
    legacyAuthPath = path.join(storageDir, 'dashboard-auth.json');
    const users = ensureUsers();
    flagDefaultPasswordUsersOnce(users);
}

function normalizeRole(role) {
    return role === 'super_admin' ? 'super_admin' : 'operator';
}

function parseDayStartMs(dateAt) {
    if (!dateAt) return null;
    const s = String(dateAt).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(s + 'T00:00:00.000Z').getTime();
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
}

function parseExpiryEndMs(expiresAt) {
    if (!expiresAt) return null;
    const s = String(expiresAt).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(s + 'T23:59:59.999Z').getTime();
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
}

function resolveDeviceKillSwitch(raw, role) {
    const p = raw && typeof raw === 'object' ? raw : {};
    if (normalizeRole(role) === 'super_admin' && p.deviceKillSwitch === undefined) {
        return true;
    }
    return !!p.deviceKillSwitch;
}

function normalizePermissions(raw, role) {
    if (normalizeRole(role) === 'super_admin') {
        const p = raw && typeof raw === 'object' ? raw : {};
        return {
            mapDeviceControl: true,
            deviceKillSwitch: resolveDeviceKillSwitch(p, role),
            geofenceControl: true,
            clearMapPins: true,
            evidenceView: true,
            evidenceDownload: true,
            evidenceExport: true,
            evidenceEdit: true,
            dockAdmin: true,
            conferenceView: true,
            conferenceJoin: true,
            conferenceHost: true,
            conferenceRecord: true,
            conferenceBwcShare: true,
            conferenceCrossGroup: true,
            auditView: true,
            auditExport: true,
            overlayView: true,
            overlayEdit: true,
            overlayCloseOp: true,
            overlayCamera: true,
            evidenceDownloadExpiresAt: null,
            signInStartsAt: null,
            signInExpiresAt: null,
            seeAllDispatchGroups: true,
        };
    }
    const p = raw && typeof raw === 'object' ? raw : {};
    const expires = p.evidenceDownloadExpiresAt != null && String(p.evidenceDownloadExpiresAt).trim()
        ? String(p.evidenceDownloadExpiresAt).trim()
        : null;
    const signInStart = p.signInStartsAt != null && String(p.signInStartsAt).trim()
        ? String(p.signInStartsAt).trim()
        : null;
    const signInExp = p.signInExpiresAt != null && String(p.signInExpiresAt).trim()
        ? String(p.signInExpiresAt).trim()
        : null;
    return {
        mapDeviceControl: !!p.mapDeviceControl,
        deviceKillSwitch: !!p.deviceKillSwitch,
        geofenceControl: !!p.geofenceControl,
        clearMapPins: !!p.clearMapPins,
        evidenceView: !!p.evidenceView || !!p.evidenceDownload,
        evidenceDownload: !!p.evidenceDownload,
        evidenceExport: !!p.evidenceExport,
        evidenceEdit: !!p.evidenceEdit,
        dockAdmin: !!p.dockAdmin,
        conferenceView: !!p.conferenceView || !!p.conferenceJoin,
        conferenceJoin: !!p.conferenceJoin,
        conferenceHost: !!p.conferenceHost,
        conferenceRecord: !!p.conferenceRecord,
        conferenceBwcShare: !!p.conferenceBwcShare,
        conferenceCrossGroup: !!p.conferenceCrossGroup,
        auditView: !!p.auditView || !!p.auditExport,
        auditExport: !!p.auditExport,
        overlayView: !!p.overlayView || !!p.overlayEdit,
        overlayEdit: !!p.overlayEdit,
        overlayCloseOp: !!p.overlayCloseOp,
        overlayCamera: !!p.overlayCamera,
        evidenceDownloadExpiresAt: expires,
        signInStartsAt: signInStart,
        signInExpiresAt: signInExp,
        seeAllDispatchGroups: !!p.seeAllDispatchGroups,
    };
}

function normalizeAssignedGroupIds(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => String(id || '').trim()).filter(Boolean);
}

/** @returns {null|'not_yet'|'expired'} */
function getSignInBlockReasonForUser(user) {
    if (!user || normalizeRole(user.role) === 'super_admin') return null;
    const perms = permissionsForUser(user);
    const startMs = parseDayStartMs(perms.signInStartsAt);
    if (startMs != null && Date.now() < startMs) return 'not_yet';
    const endMs = parseExpiryEndMs(perms.signInExpiresAt);
    if (endMs != null && Date.now() > endMs) return 'expired';
    return null;
}

function isSignInExpired(user) {
    return getSignInBlockReasonForUser(user) === 'expired';
}

function permissionsForUser(user) {
    if (!user) return { ...DEFAULT_PERMISSIONS };
    return normalizePermissions(user.permissions, user.role);
}

function canMapDeviceControl(session) {
    if (!session || !session.userId) return false;
    if (normalizeRole(session.role) === 'super_admin') return true;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return permissionsForUser(user).mapDeviceControl;
}

function canDeviceKillSwitch(session) {
    if (!session || !session.userId) return false;
    return !!permissionsForUser(findUserById(session.userId)).deviceKillSwitch;
}

function canGeofenceForUser(user) {
    if (!user) return false;
    if (normalizeRole(user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).geofenceControl;
}

function canGeofenceControl(session) {
    if (!session || !session.userId) return false;
    return canGeofenceForUser(findUserById(session.userId));
}

function canClearMapPins(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return permissionsForUser(user).clearMapPins;
}

function canEvidenceDownload(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    const perms = permissionsForUser(user);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    if (!perms.evidenceDownload) return false;
    const expMs = parseExpiryEndMs(perms.evidenceDownloadExpiresAt);
    if (expMs != null && Date.now() > expMs) return false;
    return true;
}

function canEvidenceView(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    const perms = permissionsForUser(user);
    return !!(perms.evidenceView || perms.evidenceDownload);
}

function canEvidenceExport(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).evidenceExport;
}

function canEvidenceEdit(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).evidenceEdit;
}

function canDockAdmin(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).dockAdmin;
}

function canConferenceView(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    const perms = permissionsForUser(user);
    return !!(perms.conferenceView || perms.conferenceJoin);
}

function canConferenceJoin(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).conferenceJoin;
}

function canConferenceHost(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).conferenceHost;
}

function canConferenceRecord(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).conferenceRecord;
}

function canConferenceBwcShare(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).conferenceBwcShare;
}

function canAuditView(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    const perms = permissionsForUser(user);
    return !!(perms.auditView || perms.auditExport);
}

function canAuditExport(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).auditExport;
}

function canOverlayView(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    const p = permissionsForUser(user);
    return !!(p.overlayView || p.overlayEdit || p.overlayCloseOp);
}

function canOverlayEdit(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).overlayEdit;
}

function canOverlayClose(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).overlayCloseOp;
}

function canOverlayCamera(session) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    if (normalizeRole(user && user.role) === 'super_admin') return true;
    return !!permissionsForUser(user).overlayCamera;
}

function getPermissionsForSession(session) {
    if (!session || !session.userId) return { ...DEFAULT_PERMISSIONS };
    return permissionsForUser(findUserById(session.userId));
}

function canRemoteControlCommand(session, command) {
    const cmd = String(command || '');
    if (REMOTE_CONTROL_KILL_COMMANDS.has(cmd)) {
        return canDeviceKillSwitch(session);
    }
    if (!REMOTE_CONTROL_COMMANDS.has(cmd)) return false;
    return canMapDeviceControl(session);
}

function isKillSwitchCommand(command) {
    return REMOTE_CONTROL_KILL_COMMANDS.has(String(command || ''));
}

function findUserByUsername(username) {
    const name = String(username || '').trim();
    if (!name) return null;
    return ensureUsers().find((u) => u.active !== false && u.username === name) || null;
}

function findUserById(id) {
    return ensureUsers().find((u) => u.id === id) || null;
}

function provisionOidcUser(username, role) {
    const name = String(username || '').trim();
    const r = normalizeRole(role);
    if (r === 'super_admin') {
        throw new Error('OIDC cannot auto-provision super admin — use admin group mapping on existing account');
    }
    const users = ensureUsers();
    if (!name) throw new Error('Username is required');
    if (users.some(function (u) { return u.active !== false && u.username === name; })) {
        throw new Error('Username already exists');
    }
    const platformLimits = require('./platformLimits');
    platformLimits.assertUserCount(users.filter(function (u) { return u.active !== false; }).length + 1);
    const randomPass = crypto.randomBytes(24).toString('hex');
    const hashed = hashPassword(randomPass);
    const user = {
        id: newUserId(),
        username: name,
        passwordHash: hashed.hash,
        salt: hashed.salt,
        role: 'operator',
        active: true,
        oidcProvisioned: true,
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    return user;
}

/**
 * OIDC login — match local user or auto-provision operator; session role from IdP groups.
 */
function loginFromOidc(opts) {
    opts = opts || {};
    const username = String(opts.username || '').trim();
    if (!username) throw new Error('OIDC username missing');
    let user = findUserByUsername(username);
    if (!user && opts.autoProvision) {
        user = provisionOidcUser(username, 'operator');
    }
    if (!user) throw new Error('No local account for ' + username + '. Enable auto-provision or create the user first.');
    const block = getSignInBlockReasonForUser(user);
    if (block === 'not_yet') throw new Error('Sign-in not allowed yet for this account');
    if (block === 'expired') throw new Error('Sign-in expired for this account');
    const sessionRole = opts.sessionRole === 'super_admin' ? 'super_admin' : 'operator';
    const token = createSession(user, sessionRole);
    return {
        token: token,
        user: user,
        sessionRole: sessionRole,
    };
}

function verifyPassword(user, password) {
    if (!user) return false;
    const { hash } = hashPassword(String(password || ''), user.salt);
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    } catch (_) {
        return false;
    }
}

function verifyLogin(username, password) {
    const user = findUserByUsername(username);
    return verifyPassword(user, password);
}

function verifyLoginUser(username, password) {
    const user = findUserByUsername(username);
    if (!user || !verifyPassword(user, password)) return null;
    if (getSignInBlockReasonForUser(user)) return null;
    const pass = String(password || '');
    if (pass === DEFAULT_PASSWORD && !user.mustChangePassword) {
        return null;
    }
    return {
        id: user.id,
        username: user.username,
        role: normalizeRole(user.role),
        mustChangePassword: !!user.mustChangePassword,
    };
}

function getSignInBlockReasonForCredentials(username, password) {
    const user = findUserByUsername(username);
    if (!user || !verifyPassword(user, password)) return null;
    return getSignInBlockReasonForUser(user);
}

function isLoginExpired(username, password) {
    return getSignInBlockReasonForCredentials(username, password) === 'expired';
}

function verifyGeofenceOperator(username, password) {
    const user = findUserByUsername(username);
    if (!user || !verifyPassword(user, password)) return null;
    if (getSignInBlockReasonForUser(user)) return null;
    if (!canGeofenceForUser(user)) return null;
    return user;
}

function listUsersPublic(includePermissions) {
    return ensureUsers()
        .filter((u) => u.active !== false)
        .map((u) => {
            const row = {
                id: u.id,
                username: u.username,
                role: normalizeRole(u.role),
                createdAt: u.createdAt || null,
                displayName: u.displayName || null,
                contactNote: u.contactNote || null,
            };
            if (includePermissions) {
                row.permissions = permissionsForUser(u);
            }
            if (normalizeRole(u.role) !== 'super_admin') {
                row.assignedGroupIds = Array.isArray(u.assignedGroupIds)
                    ? u.assignedGroupIds.slice()
                    : [];
            }
            return row;
        });
}

function countSuperAdmins(users) {
    return users.filter((u) => u.active !== false && normalizeRole(u.role) === 'super_admin').length;
}

function createUser({ username, password, role, assignedGroupIds, displayName, contactNote }) {
    const name = String(username || '').trim();
    const pass = String(password || '');
    const r = normalizeRole(role);
    if (r === 'super_admin') {
        const users = ensureUsers();
        const existing = users.filter((u) => u.active !== false && normalizeRole(u.role) === 'super_admin');
        const platformLimits = require('./platformLimits');
        platformLimits.assertSuperAdminCount(existing.length + 1);
    }
    const users = ensureUsers();
    if (!name) throw new Error('Username is required');
    assertPasswordAllowed(pass, { username: name, role: r });
    if (users.some((u) => u.active !== false && u.username === name)) {
        throw new Error('Username already exists');
    }
    const platformLimits = require('./platformLimits');
    platformLimits.assertUserCount(users.filter((u) => u.active !== false).length + 1);
    const { salt, hash } = hashPassword(pass);
    const user = {
        id: newUserId(),
        username: name,
        passwordHash: hash,
        salt,
        role: r,
        active: true,
        createdAt: new Date().toISOString(),
        assignedGroupIds: r === 'operator' ? normalizeAssignedGroupIds(assignedGroupIds) : undefined,
    };
    if (displayName != null && String(displayName).trim()) user.displayName = String(displayName).trim();
    if (contactNote != null && String(contactNote).trim()) user.contactNote = String(contactNote).trim();
    users.push(user);
    saveUsers(users);
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: permissionsForUser(user),
        assignedGroupIds: user.assignedGroupIds || [],
    };
}

function verifySessionPassword(session, password) {
    if (!session || !session.userId) return false;
    const user = findUserById(session.userId);
    return verifyPassword(user, password);
}

function updateUser(userId, patch) {
    const users = ensureUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('User not found');
    const user = users[idx];
    const nextRole = patch.role != null ? normalizeRole(patch.role) : normalizeRole(user.role);
    const wasSuper = normalizeRole(user.role) === 'super_admin';
    const willSuper = nextRole === 'super_admin';
    if (!wasSuper && willSuper) {
        const platformLimits = require('./platformLimits');
        platformLimits.assertSuperAdminCount(countSuperAdmins(users) + 1);
    }
    if (wasSuper && !willSuper && user.active !== false && countSuperAdmins(users) <= 1) {
        throw new Error('Cannot remove the last super admin');
    }
    if (patch.username != null) {
        const name = String(patch.username).trim();
        if (!name) throw new Error('Username is required');
        if (users.some((u, i) => i !== idx && u.active !== false && u.username === name)) {
            throw new Error('Username already exists');
        }
        user.username = name;
    }
    if (patch.role != null) user.role = nextRole;
    if (patch.active === false) {
        if (wasSuper && countSuperAdmins(users) <= 1) {
            throw new Error('Cannot deactivate the last super admin');
        }
        user.active = false;
    }
    if (patch.password != null && String(patch.password).length > 0) {
        const pass = String(patch.password);
        applyUserPasswordChange(user, pass, {
            username: user.username,
            role: normalizeRole(user.role),
        });
    }
    if (patch.mustChangePassword === true) user.mustChangePassword = true;
    if (patch.mustChangePassword === false) user.mustChangePassword = false;
    if (patch.displayName != null) {
        const dn = String(patch.displayName).trim();
        if (dn) user.displayName = dn;
        else delete user.displayName;
    }
    if (patch.contactNote != null) {
        const cn = String(patch.contactNote).trim();
        if (cn) user.contactNote = cn;
        else delete user.contactNote;
    }
    if (patch.permissions != null && typeof patch.permissions === 'object') {
        if (normalizeRole(user.role) === 'super_admin') {
            user.permissions = {
                mapDeviceControl: true,
                deviceKillSwitch: !!patch.permissions.deviceKillSwitch,
                geofenceControl: true,
                clearMapPins: true,
                evidenceView: true,
                evidenceDownload: true,
                evidenceExport: true,
                evidenceEdit: true,
                dockAdmin: true,
                conferenceView: true,
                conferenceJoin: true,
                conferenceHost: true,
                conferenceRecord: true,
                conferenceBwcShare: true,
                conferenceCrossGroup: true,
                auditView: true,
                auditExport: true,
                overlayView: true,
                overlayEdit: true,
                overlayCloseOp: true,
                overlayCamera: true,
                evidenceDownloadExpiresAt: null,
                signInStartsAt: null,
                signInExpiresAt: null,
                seeAllDispatchGroups: true,
            };
        } else {
            user.permissions = {
                mapDeviceControl: !!patch.permissions.mapDeviceControl,
                deviceKillSwitch: !!patch.permissions.deviceKillSwitch,
                geofenceControl: !!patch.permissions.geofenceControl,
                clearMapPins: !!patch.permissions.clearMapPins,
                evidenceView: !!patch.permissions.evidenceView,
                evidenceDownload: !!patch.permissions.evidenceDownload,
                evidenceExport: !!patch.permissions.evidenceExport,
                evidenceEdit: !!patch.permissions.evidenceEdit,
                dockAdmin: !!patch.permissions.dockAdmin,
                conferenceView: !!patch.permissions.conferenceView,
                conferenceJoin: !!patch.permissions.conferenceJoin,
                conferenceHost: !!patch.permissions.conferenceHost,
                conferenceRecord: !!patch.permissions.conferenceRecord,
                conferenceBwcShare: !!patch.permissions.conferenceBwcShare,
                conferenceCrossGroup: !!patch.permissions.conferenceCrossGroup,
                auditView: !!patch.permissions.auditView,
                auditExport: !!patch.permissions.auditExport,
                overlayView: !!patch.permissions.overlayView,
                overlayEdit: !!patch.permissions.overlayEdit,
                overlayCloseOp: !!patch.permissions.overlayCloseOp,
                overlayCamera: !!patch.permissions.overlayCamera,
                evidenceDownloadExpiresAt: patch.permissions.evidenceDownloadExpiresAt != null
                    ? (String(patch.permissions.evidenceDownloadExpiresAt).trim() || null)
                    : (user.permissions && user.permissions.evidenceDownloadExpiresAt) || null,
                signInStartsAt: patch.permissions.signInStartsAt != null
                    ? (String(patch.permissions.signInStartsAt).trim() || null)
                    : (user.permissions && user.permissions.signInStartsAt) || null,
                signInExpiresAt: patch.permissions.signInExpiresAt != null
                    ? (String(patch.permissions.signInExpiresAt).trim() || null)
                    : (user.permissions && user.permissions.signInExpiresAt) || null,
                seeAllDispatchGroups: !!patch.permissions.seeAllDispatchGroups,
            };
        }
    }
    if (patch.assignedGroupIds != null) {
        if (normalizeRole(user.role) === 'super_admin') {
            delete user.assignedGroupIds;
        } else {
            user.assignedGroupIds = normalizeAssignedGroupIds(patch.assignedGroupIds);
        }
    }
    users[idx] = user;
    saveUsers(users);
    return {
        id: user.id,
        username: user.username,
        role: normalizeRole(user.role),
        active: user.active !== false,
        permissions: permissionsForUser(user),
        assignedGroupIds: Array.isArray(user.assignedGroupIds) ? user.assignedGroupIds.slice() : [],
    };
}

function markTotpBackupUsed(userId, backupIndex) {
    const users = ensureUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('User not found');
    dashboardTotp.markBackupCodeUsed(users[idx], backupIndex);
    saveUsers(users);
    return users[idx];
}

function enableUserTotp(userId, secret, plainBackupCodes) {
    const users = ensureUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('User not found');
    dashboardTotp.enableTotpOnUser(users[idx], secret, plainBackupCodes);
    saveUsers(users);
    return users[idx];
}

function assertSuperAdminUser(user) {
    if (!user || user.active === false) throw new Error('User not found');
    if (normalizeRole(user.role) !== 'super_admin') {
        throw new Error('Recovery applies to super admin accounts only');
    }
}

function listSuperAdminsRecoveryStatus() {
    return ensureUsers()
        .filter((u) => u.active !== false && normalizeRole(u.role) === 'super_admin')
        .map((u) => ({
            id: u.id,
            username: u.username,
            totpEnabled: dashboardTotp.userTotpEnabled(u),
            mustChangePassword: !!u.mustChangePassword,
            backupCodesRemaining: dashboardTotp.remainingBackupCount(u),
        }));
}

function resetSuperAdminTotpById(userId) {
    const users = ensureUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('User not found');
    assertSuperAdminUser(users[idx]);
    dashboardTotp.disableTotpOnUser(users[idx]);
    saveUsers(users);
    return {
        id: users[idx].id,
        username: users[idx].username,
        totpEnabled: false,
    };
}

function resetSuperAdminTotpByUsername(username) {
    const user = findUserByUsername(username);
    if (!user) throw new Error('User not found');
    return resetSuperAdminTotpById(user.id);
}

function resetSuperAdminPasswordForRecovery(username, tempPassword) {
    const users = ensureUsers();
    const idx = users.findIndex((u) => u.active !== false && u.username === String(username || '').trim());
    if (idx < 0) throw new Error('User not found');
    assertSuperAdminUser(users[idx]);
    const user = users[idx];
    assertPasswordAllowed(String(tempPassword || ''), {
        username: user.username,
        role: normalizeRole(user.role),
        user: user,
    });
    pushPasswordHistory(user);
    const { salt, hash } = hashPassword(String(tempPassword));
    user.salt = salt;
    user.passwordHash = hash;
    user.mustChangePassword = true;
    saveUsers(users);
    return {
        id: user.id,
        username: user.username,
        mustChangePassword: true,
    };
}

function changeOwnPassword(username, currentPassword, newPassword) {
    const user = findUserByUsername(username);
    if (!user || !verifyPassword(user, currentPassword)) {
        throw new Error('Current password is incorrect');
    }
    const users = ensureUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx < 0) throw new Error('User not found');
    applyUserPasswordChange(users[idx], newPassword, {
        username: users[idx].username,
        role: normalizeRole(users[idx].role),
    });
    saveUsers(users);
    return users[idx];
}

function getUsername() {
    const admins = ensureUsers().filter((u) => u.active !== false && normalizeRole(u.role) === 'super_admin');
    return (admins[0] || ensureUsers()[0]).username;
}

function createSession(user, roleOverride) {
    const token = crypto.randomBytes(32).toString('hex');
    const role = roleOverride != null ? normalizeRole(roleOverride) : normalizeRole(user.role);
    sessions.set(token, {
        userId: user.id,
        username: user.username,
        role: role,
        oidcLogin: roleOverride != null,
        expires: Date.now() + SESSION_TTL_MS,
    });
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
    const user = findUserById(row.userId);
    if (getSignInBlockReasonForUser(user)) {
        sessions.delete(token);
        return null;
    }
    return row;
}

function isValidSession(token) {
    return !!getSession(token);
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

function sessionTokenFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    return cookies.fm_session || null;
}

function sessionFromRequest(req) {
    return getSession(sessionTokenFromRequest(req));
}

function roleCanManageServer(role) {
    return !!(ROLES[normalizeRole(role)] && ROLES[normalizeRole(role)].canManageServer);
}

function roleCanManageUsers(role) {
    return !!(ROLES[normalizeRole(role)] && ROLES[normalizeRole(role)].canManageUsers);
}

function isSecureRequest(req) {
    if (!req) return false;
    if (req.secure) return true;
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    return proto === 'https';
}

function setSessionCookie(res, token, req) {
    const maxAge = Math.floor(SESSION_TTL_MS / 1000);
    const secure = isSecureRequest(req) ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `fm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
    );
}

function clearSessionCookie(res, req) {
    const secure = isSecureRequest(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `fm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

const PUBLIC_PATHS = new Set([
    '/login.html',
    '/js/login.js',
    '/js/i18n.js',
    '/api/auth/login',
    '/api/auth/login/totp',
    '/api/auth/session',
    '/api/auth/logout',
    '/api/auth/oidc/config',
    '/api/auth/oidc/start',
    '/api/auth/oidc/callback',
    '/api/health',
]);

function isPublicPath(reqPath) {
    if (PUBLIC_PATHS.has(reqPath)) return true;
    if (reqPath.startsWith('/locales/') && reqPath.endsWith('.json')) return true;
    if (reqPath.startsWith('/assets/')) return true;
    return false;
}

function sessionMustEnrollTotp(session) {
    if (!session || !session.userId) return false;
    return dashboardTotp.userMustEnrollTotp(findUserById(session.userId));
}

function requireDashboardAuth(req, res, next) {
    if (isPublicPath(req.path)) return next();
    if (req.path.startsWith('/socket.io')) return next();
    const session = sessionFromRequest(req);
    if (session) {
        req.dashboardUser = session;
        if (sessionMustChangePassword(session)) {
            if (!isPasswordChangeBypassPath(req.path)) {
                if (req.path.startsWith('/api/')) {
                    return res.status(403).json({
                        ok: false,
                        error: 'Password change required before using the dashboard',
                        errorKey: 'errors.passwordChangeRequired',
                        mustChangePassword: true,
                    });
                }
                if (req.path === '/' || req.path === '/index.html') {
                    return res.redirect('/must-change-password.html');
                }
                if (req.path.endsWith('.html')) {
                    return res.redirect('/must-change-password.html');
                }
                return res.status(403).send('Password change required');
            }
        } else if (sessionMustEnrollTotp(session)) {
            if (!isPasswordChangeBypassPath(req.path)) {
                if (req.path.startsWith('/api/')) {
                    return res.status(403).json({
                        ok: false,
                        error: 'Authenticator setup required before using the dashboard',
                        errorKey: 'errors.totpEnrollRequired',
                        mustEnrollTotp: true,
                    });
                }
                if (req.path === '/' || req.path === '/index.html' || req.path.endsWith('.html')) {
                    return res.redirect('/enroll-totp.html');
                }
                return res.status(403).send('Authenticator setup required');
            }
        }
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    if (req.path === '/' || req.path === '/index.html' || req.path.endsWith('.html')) {
        return res.redirect('/login.html');
    }
    return res.status(401).send('Unauthorized');
}

function requireSuperAdmin(req, res, next) {
    const session = req.dashboardUser || sessionFromRequest(req);
    if (!session || !roleCanManageServer(session.role)) {
        return res.status(403).json({ ok: false, error: 'Super admin access required' });
    }
    return next();
}

module.exports = {
    ROLES,
    DEFAULT_PERMISSIONS,
    REMOTE_CONTROL_COMMANDS,
    init,
    getUsername,
    verifyLogin,
    verifyLoginUser,
    verifyGeofenceOperator,
    isLoginExpired,
    getSignInBlockReasonForCredentials,
    verifySessionPassword,
    listUsersPublic,
    findUserById,
    findUserByUsername,
    markTotpBackupUsed,
    enableUserTotp,
    listSuperAdminsRecoveryStatus,
    resetSuperAdminTotpById,
    resetSuperAdminTotpByUsername,
    resetSuperAdminPasswordForRecovery,
    saveUsers,
    normalizeRole,
    permissionsForUser,
    canMapDeviceControl,
    canDeviceKillSwitch,
    canGeofenceControl,
    canGeofenceForUser,
    canClearMapPins,
    canEvidenceDownload,
    canEvidenceView,
    canEvidenceExport,
    canEvidenceEdit,
    canDockAdmin,
    canConferenceView,
    canConferenceJoin,
    canConferenceHost,
    canConferenceRecord,
    canConferenceBwcShare,
    canAuditView,
    canAuditExport,
    canOverlayView,
    canOverlayEdit,
    canOverlayClose,
    canOverlayCamera,
    parseDayStartMs,
    parseExpiryEndMs,
    canRemoteControlCommand,
    isKillSwitchCommand,
    remoteControlRequiresReason,
    parseRemoteControlPayload,
    validateRemoteControlReason,
    REMOTE_CONTROL_REASON_MIN_LEN,
    getPermissionsForSession,
    createUser,
    updateUser,
    changeOwnPassword,
    createSession,
    destroySession,
    getSession,
    isValidSession,
    sessionFromRequest,
    parseCookies,
    sessionTokenFromRequest,
    loginFromOidc,
    provisionOidcUser,
    setSessionCookie,
    clearSessionCookie,
    requireDashboardAuth,
    requireSuperAdmin,
    roleCanManageServer,
    roleCanManageUsers,
    isPublicPath,
    MIN_PASSWORD_LEN,
    MIN_PASSWORD_LEN_SUPER_ADMIN,
    getPasswordPolicyPublic,
    sessionMustChangePassword,
    sessionMustEnrollTotp,
    userMustChangePassword,
    assertPasswordAllowed,
    DEFAULT_PASSWORD,
};
