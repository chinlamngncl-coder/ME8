/**
 * OIDC authorization code + PKCE for dashboard login (lab / enterprise IdP).
 */
const crypto = require('crypto');
const labSecurity = require('./labSecurity');

const pending = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;
let discoveryCache = { issuer: null, doc: null, at: 0 };
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

function base64Url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pkcePair() {
    const verifier = base64Url(crypto.randomBytes(32));
    const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
    return { verifier: verifier, challenge: challenge };
}

function requestBaseUrl(req, settings) {
    if (settings && settings.trustProxy) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        if (host) return proto.split(',')[0].trim() + '://' + host.split(',')[0].trim();
    }
    const host = req.headers.host || '127.0.0.1:3888';
    return 'http://' + host;
}

function redirectUri(req, settings) {
    return requestBaseUrl(req, settings) + '/api/auth/oidc/callback';
}

async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        throw new Error('Invalid JSON from ' + url);
    }
    if (!res.ok) {
        throw new Error((data && data.error_description) || data.error || text.slice(0, 200));
    }
    return data;
}

async function discover(issuer) {
    const iss = String(issuer || '').trim().replace(/\/+$/, '');
    if (!iss) throw new Error('OIDC issuer URL required');
    const now = Date.now();
    if (discoveryCache.issuer === iss && discoveryCache.doc && now - discoveryCache.at < DISCOVERY_TTL_MS) {
        return discoveryCache.doc;
    }
    const url = iss + '/.well-known/openid-configuration';
    const doc = await fetchJson(url);
    discoveryCache = { issuer: iss, doc: doc, at: now };
    return doc;
}

function cleanupPending() {
    const now = Date.now();
    pending.forEach(function (row, key) {
        if (now - row.at > PENDING_TTL_MS) pending.delete(key);
    });
}

function extractGroups(profile) {
    const out = [];
    const g = profile && profile.groups;
    if (Array.isArray(g)) {
        g.forEach(function (x) {
            if (x != null) out.push(String(x).trim().toLowerCase());
        });
    } else if (typeof g === 'string') {
        g.split(',').forEach(function (x) {
            const t = x.trim().toLowerCase();
            if (t) out.push(t);
        });
    }
    const roles = profile && profile.realm_access && profile.realm_access.roles;
    if (Array.isArray(roles)) {
        roles.forEach(function (r) {
            if (r) out.push(String(r).trim().toLowerCase());
        });
    }
    return out;
}

function resolveSessionRole(groups, settings) {
    const admins = labSecurity.parseGroupList(settings.oidcAdminGroups);
    const ops = labSecurity.parseGroupList(settings.oidcOperatorGroups);
    const gset = new Set(groups);
    if (admins.some(function (a) { return gset.has(a); })) return 'super_admin';
    if (ops.some(function (o) { return gset.has(o); })) return 'operator';
    return 'operator';
}

function getPublicConfig(settings) {
    const s = labSecurity.normalize(settings);
    if (!s.oidcEnabled || !s.oidcIssuer) {
        return { enabled: false, localLoginEnabled: s.localLoginEnabled };
    }
    return {
        enabled: true,
        localLoginEnabled: s.localLoginEnabled,
        issuer: s.oidcIssuer,
        label: 'Sign in with organization account',
    };
}

async function testDiscovery(settings) {
    const s = labSecurity.normalize(settings);
    const doc = await discover(s.oidcIssuer);
    return {
        issuer: s.oidcIssuer,
        authorization_endpoint: doc.authorization_endpoint,
        token_endpoint: doc.token_endpoint,
        userinfo_endpoint: doc.userinfo_endpoint,
    };
}

function startLogin(req, res, settings) {
    const s = labSecurity.normalize(settings);
    if (!s.oidcEnabled) {
        return res.status(400).json({ ok: false, error: 'OIDC is not enabled' });
    }
    return discover(s.oidcIssuer).then(function (doc) {
        cleanupPending();
        const state = crypto.randomBytes(16).toString('hex');
        const pkce = pkcePair();
        pending.set(state, { verifier: pkce.verifier, at: Date.now() });
        const params = new URLSearchParams({
            client_id: s.oidcClientId,
            response_type: 'code',
            scope: s.oidcScopes,
            redirect_uri: redirectUri(req, s),
            state: state,
            code_challenge: pkce.challenge,
            code_challenge_method: 'S256',
        });
        const url = doc.authorization_endpoint + '?' + params.toString();
        return res.redirect(url);
    }).catch(function (err) {
        return res.status(400).json({ ok: false, error: err.message });
    });
}

async function handleCallback(req, res, settings, dashboardAuth) {
    const s = labSecurity.normalize(settings);
    const err = req.query && req.query.error;
    if (err) {
        return res.redirect('/login.html?oidc_error=' + encodeURIComponent(String(err)));
    }
    const code = req.query && req.query.code;
    const state = req.query && req.query.state;
    if (!code || !state) {
        return res.redirect('/login.html?oidc_error=missing_code');
    }
    const row = pending.get(state);
    pending.delete(state);
    if (!row) {
        return res.redirect('/login.html?oidc_error=invalid_state');
    }
    try {
        const doc = await discover(s.oidcIssuer);
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: s.oidcClientId,
            client_secret: s.oidcClientSecret,
            code: String(code),
            redirect_uri: redirectUri(req, s),
            code_verifier: row.verifier,
        });
        const tokenRes = await fetch(doc.token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: body.toString(),
        });
        const tokenText = await tokenRes.text();
        let tokens;
        try {
            tokens = JSON.parse(tokenText);
        } catch (_) {
            throw new Error('Token endpoint returned non-JSON');
        }
        if (!tokenRes.ok) {
            throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');
        }
        let profile = {};
        if (tokens.access_token && doc.userinfo_endpoint) {
            const uiRes = await fetch(doc.userinfo_endpoint, {
                headers: { Authorization: 'Bearer ' + tokens.access_token, Accept: 'application/json' },
            });
            profile = await uiRes.json();
        }
        if (tokens.id_token && !profile.sub) {
            const parts = String(tokens.id_token).split('.');
            if (parts.length >= 2) {
                try {
                    profile = Object.assign(profile, JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')));
                } catch (_) { /* ignore */ }
            }
        }
        const groups = extractGroups(profile);
        const sessionRole = resolveSessionRole(groups, s);
        const username = String(
            profile.preferred_username || profile.email || profile.sub || ''
        ).trim();
        if (!username) throw new Error('IdP did not return a username');
        const loginResult = dashboardAuth.loginFromOidc({
            username: username,
            email: profile.email || '',
            groups: groups,
            sessionRole: sessionRole,
            autoProvision: s.oidcAutoProvision,
        });
        dashboardAuth.setSessionCookie(res, loginResult.token, req);
        return res.redirect('/');
    } catch (e) {
        return res.redirect('/login.html?oidc_error=' + encodeURIComponent(e.message || 'oidc_failed'));
    }
}

module.exports = {
    getPublicConfig,
    testDiscovery,
    startLogin,
    handleCallback,
    redirectUri,
    requestBaseUrl,
    extractGroups,
};
