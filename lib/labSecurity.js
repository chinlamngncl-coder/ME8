/**
 * Enterprise lab security settings — IdP/OIDC, monitoring, proxy (storage/lab-security.json).
 * Configured via Server config → LAB tab (engineer PIN). Does not affect BWC/SIP/media paths.
 */
const fs = require('fs');
const path = require('path');

function defaults() {
    return {
        oidcEnabled: false,
        oidcIssuer: '',
        oidcClientId: 'mobility-dashboard',
        oidcClientSecret: '',
        oidcScopes: 'openid profile email groups',
        oidcAdminGroups: 'mobility-admins,bwcms-admins',
        oidcOperatorGroups: 'mobility-operators,bwcms-operators',
        oidcAutoProvision: true,
        localLoginEnabled: true,
        trustProxy: false,
        metricsEnabled: true,
        metricsToken: '',
        auditExportToken: '',
        notes: '',
    };
}

function normalize(raw) {
    const base = defaults();
    const inRaw = raw && typeof raw === 'object' ? raw : {};
    return {
        oidcEnabled: inRaw.oidcEnabled != null ? !!inRaw.oidcEnabled : base.oidcEnabled,
        oidcIssuer: String(inRaw.oidcIssuer || '').trim().replace(/\/+$/, ''),
        oidcClientId: String(inRaw.oidcClientId || base.oidcClientId).trim(),
        oidcClientSecret: String(inRaw.oidcClientSecret != null ? inRaw.oidcClientSecret : base.oidcClientSecret),
        oidcScopes: String(inRaw.oidcScopes || base.oidcScopes).trim(),
        oidcAdminGroups: String(inRaw.oidcAdminGroups || base.oidcAdminGroups).trim(),
        oidcOperatorGroups: String(inRaw.oidcOperatorGroups || base.oidcOperatorGroups).trim(),
        oidcAutoProvision: inRaw.oidcAutoProvision != null ? !!inRaw.oidcAutoProvision : base.oidcAutoProvision,
        localLoginEnabled: inRaw.localLoginEnabled != null ? !!inRaw.localLoginEnabled : base.localLoginEnabled,
        trustProxy: inRaw.trustProxy != null ? !!inRaw.trustProxy : base.trustProxy,
        metricsEnabled: inRaw.metricsEnabled != null ? !!inRaw.metricsEnabled : base.metricsEnabled,
        metricsToken: String(inRaw.metricsToken != null ? inRaw.metricsToken : base.metricsToken).trim(),
        auditExportToken: String(inRaw.auditExportToken != null ? inRaw.auditExportToken : base.auditExportToken).trim(),
        notes: String(inRaw.notes || '').trim(),
    };
}

function filePath(storageDir) {
    return path.join(storageDir, 'lab-security.json');
}

function load(storageDir) {
    try {
        const fp = filePath(storageDir);
        if (fs.existsSync(fp)) {
            return normalize(JSON.parse(fs.readFileSync(fp, 'utf8')));
        }
    } catch (_) { /* use defaults */ }
    return normalize(null);
}

function save(storageDir, body) {
    const fp = filePath(storageDir);
    const prev = load(storageDir);
    const next = normalize(Object.assign({}, prev, body || {}));
    if (body && body.oidcClientSecret === '' && prev.oidcClientSecret) {
        next.oidcClientSecret = prev.oidcClientSecret;
    }
    if (body && body.metricsToken === '' && prev.metricsToken) {
        next.metricsToken = prev.metricsToken;
    }
    if (body && body.auditExportToken === '' && prev.auditExportToken) {
        next.auditExportToken = prev.auditExportToken;
    }
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf8');
    return next;
}

function maskSecret(value) {
    const s = String(value || '');
    if (!s) return '';
    if (s.length <= 4) return '****';
    return s.slice(0, 2) + '****' + s.slice(-2);
}

function publicView(settings) {
    const s = normalize(settings);
    return {
        oidcEnabled: s.oidcEnabled,
        oidcIssuer: s.oidcIssuer,
        oidcClientId: s.oidcClientId,
        oidcClientSecretSet: !!s.oidcClientSecret,
        oidcScopes: s.oidcScopes,
        oidcAdminGroups: s.oidcAdminGroups,
        oidcOperatorGroups: s.oidcOperatorGroups,
        oidcAutoProvision: s.oidcAutoProvision,
        localLoginEnabled: s.localLoginEnabled,
        trustProxy: s.trustProxy,
        metricsEnabled: s.metricsEnabled,
        metricsTokenSet: !!s.metricsToken,
        auditExportTokenSet: !!s.auditExportToken,
        notes: s.notes,
    };
}

function parseGroupList(csv) {
    return String(csv || '').split(',').map(function (g) {
        return g.trim().toLowerCase();
    }).filter(Boolean);
}

function readinessChecklist(settings, deps) {
    deps = deps || {};
    const s = normalize(settings);
    const items = [];
    items.push({
        id: 'local-login',
        label: 'Local break-glass login',
        ok: s.localLoginEnabled,
        detail: s.localLoginEnabled ? 'Enabled for emergency access' : 'Disabled — IdP only when OIDC on',
    });
    items.push({
        id: 'oidc',
        label: 'OIDC / IdP login',
        ok: s.oidcEnabled && !!s.oidcIssuer && !!s.oidcClientId && !!s.oidcClientSecret,
        detail: s.oidcEnabled
            ? (s.oidcIssuer || 'Set issuer URL (Keycloak / Azure AD / AD FS)')
            : 'Disabled — enable for lab AD+MFA path',
    });
    items.push({
        id: 'https',
        label: 'HTTPS operator URL',
        ok: !!(deps.operatorUrl && String(deps.operatorUrl).toLowerCase().startsWith('https://')),
        detail: deps.operatorUrl || 'Set operator login URL to https://… in Server config',
    });
    items.push({
        id: 'trust-proxy',
        label: 'Trust reverse proxy',
        ok: s.trustProxy,
        detail: s.trustProxy ? 'On — use behind nginx/Caddy' : 'Off — direct HTTP only',
    });
    items.push({
        id: 'metrics',
        label: 'Prometheus metrics endpoint',
        ok: s.metricsEnabled,
        detail: s.metricsEnabled
            ? 'GET /api/metrics' + (s.metricsToken ? ' (token required)' : ' (set metrics token!)')
            : 'Disabled',
    });
    items.push({
        id: 'health',
        label: 'Liveness health check',
        ok: true,
        detail: 'GET /api/health (public)',
    });
    items.push({
        id: 'audit',
        label: 'Audit log API',
        ok: true,
        detail: 'GET /api/audit-log (super admin) — export via SIEM forwarder',
    });
    items.push({
        id: 'tech-pin',
        label: 'Engineer PIN (LAB tab gate)',
        ok: !!deps.techPinConfigured,
        detail: deps.techPinConfigured
            ? 'Administrator PIN configured in dashboard'
            : 'Set administrator PIN when opening Diagnostics (super admin)',
    });
    items.push({
        id: 'firewall-doc',
        label: 'Firewall port checklist',
        ok: true,
        detail: 'Server config → deployment firewall rows + docs/lab/README.md',
    });
    const score = items.filter(function (i) { return i.ok; }).length;
    return {
        items: items,
        score: score,
        total: items.length,
        readyPct: Math.round((score / items.length) * 100),
    };
}

module.exports = {
    defaults,
    normalize,
    load,
    save,
    publicView,
    maskSecret,
    parseGroupList,
    readinessChecklist,
};
