/**
 * Cloud deployment profile — site identity, public access, central entitlement verification.
 * One dedicated site per Mobility node today; shared multi-organization platform is roadmap.
 */
const fs = require('fs');
const path = require('path');

function defaults() {
    return {
        siteReferenceId: '',
        regionLabel: '',
        organizationLegalName: '',
        enableEntitlementVerification: false,
        entitlementCheckUrl: '',
        entitlementCheckToken: '',
        entitlementCheckIntervalHours: 24,
        operationsContactEmail: '',
        notes: '',
    };
}

function normalize(raw) {
    const base = defaults();
    const inRaw = raw && typeof raw === 'object' ? raw : {};
    const hours = parseInt(inRaw.entitlementCheckIntervalHours, 10);
    return {
        siteReferenceId: String(inRaw.siteReferenceId || '').trim(),
        regionLabel: String(inRaw.regionLabel || '').trim(),
        organizationLegalName: String(inRaw.organizationLegalName || '').trim(),
        enableEntitlementVerification: inRaw.enableEntitlementVerification != null
            ? !!inRaw.enableEntitlementVerification
            : base.enableEntitlementVerification,
        entitlementCheckUrl: String(inRaw.entitlementCheckUrl || '').trim(),
        entitlementCheckToken: String(inRaw.entitlementCheckToken != null ? inRaw.entitlementCheckToken : base.entitlementCheckToken),
        entitlementCheckIntervalHours: Number.isFinite(hours) && hours >= 1 && hours <= 168
            ? hours
            : base.entitlementCheckIntervalHours,
        operationsContactEmail: String(inRaw.operationsContactEmail || '').trim(),
        notes: String(inRaw.notes || '').trim(),
    };
}

function filePath(storageDir) {
    return path.join(storageDir, 'cloud-deployment.json');
}

function load(storageDir) {
    try {
        const fp = filePath(storageDir);
        if (fs.existsSync(fp)) {
            return normalize(JSON.parse(fs.readFileSync(fp, 'utf8')));
        }
    } catch (_) { /* defaults */ }
    return normalize(null);
}

function save(storageDir, body) {
    const fp = filePath(storageDir);
    const prev = load(storageDir);
    const next = normalize(Object.assign({}, prev, body || {}));
    if (body && body.entitlementCheckToken === '' && prev.entitlementCheckToken) {
        next.entitlementCheckToken = prev.entitlementCheckToken;
    }
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf8');
    return next;
}

function publicView(settings) {
    const s = normalize(settings);
    return {
        siteReferenceId: s.siteReferenceId,
        regionLabel: s.regionLabel,
        organizationLegalName: s.organizationLegalName,
        enableEntitlementVerification: s.enableEntitlementVerification,
        entitlementCheckUrl: s.entitlementCheckUrl,
        entitlementCheckTokenSet: !!s.entitlementCheckToken,
        entitlementCheckIntervalHours: s.entitlementCheckIntervalHours,
        operationsContactEmail: s.operationsContactEmail,
        notes: s.notes,
    };
}

function resolveEntitlementCheckUrl(storageDir) {
    const fromEnv = (process.env.FM_LICENSE_HEARTBEAT_URL || '').trim();
    if (fromEnv) return fromEnv;
    const s = load(storageDir);
    if (s.enableEntitlementVerification && s.entitlementCheckUrl) {
        return s.entitlementCheckUrl.trim();
    }
    return '';
}

function resolveEntitlementCheckIntervalMs(storageDir) {
    const fromEnv = parseInt(process.env.FM_LICENSE_HEARTBEAT_INTERVAL_MS || '', 10);
    if (Number.isFinite(fromEnv) && fromEnv >= 3600000) return fromEnv;
    const s = load(storageDir);
    return Math.max(3600000, (s.entitlementCheckIntervalHours || 24) * 60 * 60 * 1000);
}

function architectureStatus() {
    return {
        dedicatedSiteDeployment: true,
        sharedMultiOrganizationPlatform: false,
        centralOperationsConsole: false,
        onlineEntitlementVerification: true,
        perOrganizationStorageQuotas: false,
        featureTierEnforcement: false,
    };
}

function readinessChecklist(deps) {
    deps = deps || {};
    const items = [];
    const cloud = normalize(deps.cloud);
    const license = deps.license || {};
    const usage = deps.usage || {};
    const limits = deps.limits || {};
    const deployment = deps.deployment || {};
    const heartbeat = deps.heartbeat || {};
    const operatorUrl = String(deployment.operatorUrl || '').trim();
    const mode = String(deployment.mode || 'lan').toLowerCase();
    const wanIp = deps.wanPublicIp || '';
    const bwcIp = deps.bwcRegisterIp || '';

    items.push({
        id: 'site-profile',
        label: 'Site profile',
        ok: !!(cloud.siteReferenceId && (cloud.organizationLegalName || deployment.tenantName)),
        detail: cloud.siteReferenceId
            ? (cloud.organizationLegalName || deployment.tenantName || 'Add organization name')
            : 'Set site reference and organization name',
    });
    items.push({
        id: 'entitlement',
        label: 'Platform entitlement',
        ok: !!license.valid,
        detail: license.valid
            ? ((license.customerName || 'Licensed') + (license.expiresAt ? ' · valid until ' + String(license.expiresAt).slice(0, 10) : ''))
            : (license.required ? 'Signed entitlement file required' : 'Optional for lab — recommended for production'),
    });
    items.push({
        id: 'usage',
        label: 'Capacity within entitlement',
        ok: (!limits.maxBwcDevices || (usage.bwcDevices || 0) <= limits.maxBwcDevices)
            && (!limits.maxDashboardUsers || (usage.dashboardUsers || 0) <= limits.maxDashboardUsers),
        detail: limits.maxBwcDevices
            ? ((usage.bwcDevices || 0) + ' / ' + limits.maxBwcDevices + ' body-worn cameras · '
                + (usage.dashboardUsers || 0) + ' / ' + (limits.maxDashboardUsers || '—') + ' operators')
            : 'Entitlement limits not loaded',
    });
    items.push({
        id: 'operator-https',
        label: 'Secure operator access',
        ok: operatorUrl.toLowerCase().startsWith('https://'),
        detail: operatorUrl || 'Set operator login URL with HTTPS',
    });
    items.push({
        id: 'topology',
        label: 'Cloud or hybrid topology',
        ok: mode === 'cloud' || mode === 'hybrid',
        detail: mode === 'cloud' || mode === 'hybrid'
            ? ('Deployment mode: ' + mode)
            : 'Select Cloud / VPS or Hybrid for hosted operations',
    });
    items.push({
        id: 'public-endpoint',
        label: 'Public camera endpoint',
        ok: !!(wanIp || (bwcIp && !/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(bwcIp))),
        detail: wanIp || bwcIp || 'Set public WAN address or camera register IP',
    });
    items.push({
        id: 'verification',
        label: 'Central entitlement verification',
        ok: cloud.enableEntitlementVerification && !!cloud.entitlementCheckUrl && !!heartbeat.lastSuccessAt,
        detail: cloud.enableEntitlementVerification
            ? (heartbeat.lastSuccessAt
                ? ('Last verified ' + String(heartbeat.lastSuccessAt).slice(0, 19).replace('T', ' '))
                : (cloud.entitlementCheckUrl ? 'Configured — run verification check' : 'Set verification endpoint URL'))
            : 'Enable when your operations portal is ready',
    });
    items.push({
        id: 'health',
        label: 'Operations health endpoint',
        ok: true,
        detail: 'GET /api/health — use with your monitoring platform',
    });
    items.push({
        id: 'architecture',
        label: 'Dedicated site model',
        ok: true,
        detail: 'One organization per server instance — industry-standard for sovereign / on-prem dispatch',
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
    resolveEntitlementCheckUrl,
    resolveEntitlementCheckIntervalMs,
    architectureStatus,
    readinessChecklist,
};
