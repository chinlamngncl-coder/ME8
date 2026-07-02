/**
 * Platform tenancy program — dedicated site today; shared platform roadmap (Phase 3).
 * Does not alter SIP, media, or single-tenant runtime behaviour.
 */
const fs = require('fs');
const path = require('path');

const TENANCY_FILENAME = 'platform-tenancy.json';

function defaults() {
    return {
        isolationMode: 'dedicated_site',
        programPhase: 1,
        siteReferenceId: '',
        organizationId: '',
        notes: '',
    };
}

function normalize(raw) {
    const base = defaults();
    const inRaw = raw && typeof raw === 'object' ? raw : {};
    const mode = String(inRaw.isolationMode || base.isolationMode).trim();
    const phase = parseInt(inRaw.programPhase, 10);
    return {
        isolationMode: mode === 'shared_platform' ? 'shared_platform' : 'dedicated_site',
        programPhase: Number.isFinite(phase) && phase >= 1 && phase <= 3 ? phase : base.programPhase,
        siteReferenceId: String(inRaw.siteReferenceId || '').trim(),
        organizationId: String(inRaw.organizationId || '').trim(),
        notes: String(inRaw.notes || '').trim(),
    };
}

function filePath(storageDir) {
    return path.join(storageDir, TENANCY_FILENAME);
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
    const next = normalize(Object.assign({}, load(storageDir), body || {}));
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf8');
    return next;
}

function getPhases() {
    return [
        {
            id: 1,
            title: 'Dedicated site deployment',
            summary: 'One organization per server with signed platform entitlements and operator HTTPS.',
            deliverables: [
                'Signed platform entitlement per customer site',
                'Cloud Deployment profile and inbound port checklist',
                'Optional NOC health and metrics polling',
            ],
        },
        {
            id: 2,
            title: 'Central operations verification',
            summary: 'Each site reports to your vendor operations portal on a schedule for validity and suspension.',
            deliverables: [
                'Operations portal site check-in API',
                'Customer registry with expiry and capacity',
                'Cloud Deployment verification status on each site',
            ],
        },
        {
            id: 3,
            title: 'Shared multi-organization platform',
            summary: 'Single operations URL serving many isolated organizations with metering and tier enforcement.',
            deliverables: [
                'Tenant isolation on data and storage paths',
                'Subdomain or org-scoped authentication',
                'Central usage metering and feature tiers',
            ],
        },
    ];
}

function assessProgram(deps) {
    deps = deps || {};
    const tenancy = normalize(deps.tenancy);
    const license = deps.license || {};
    const heartbeat = deps.heartbeat || {};
    const cloud = deps.cloud || {};

    const phase1 = {
        id: 1,
        status: 'active',
        label: 'Active',
        detail: license.valid
            ? 'Dedicated site with valid platform entitlement'
            : 'Dedicated site model — install signed entitlement for production',
    };

    const verificationConfigured = cloud.enableEntitlementVerification && !!cloud.entitlementCheckUrl;
    const phase2Status = heartbeat.lastSuccessAt && heartbeat.ok
        ? 'active'
        : (verificationConfigured ? 'configured' : 'planned');
    const phase2 = {
        id: 2,
        status: phase2Status,
        label: phase2Status === 'active' ? 'Active' : (phase2Status === 'configured' ? 'Configured' : 'Planned'),
        detail: phase2Status === 'active'
            ? 'Operations portal receiving site check-ins'
            : (verificationConfigured
                ? 'Portal endpoint set — run verification or wait for scheduled check'
                : 'Deploy vendor Operations Portal and enable verification on sites'),
    };

    const phase3 = {
        id: 3,
        status: 'planned',
        label: 'Planned',
        detail: tenancy.isolationMode === 'shared_platform'
            ? 'Shared platform mode flagged — engineering build required'
            : 'Roadmap — do not represent as available in customer proposals yet',
    };

    const currentPhase = phase2.status === 'active' ? 2 : 1;
    return {
        isolationMode: tenancy.isolationMode,
        currentPhase: currentPhase,
        targetPhase: 3,
        phases: [phase1, phase2, phase3],
        tenderLanguage: 'Per-organization dedicated deployment with cryptographically signed entitlements '
            + 'and optional central entitlement verification through the vendor operations portal.',
    };
}

module.exports = {
    defaults,
    normalize,
    load,
    save,
    getPhases,
    assessProgram,
    TENANCY_FILENAME,
};
