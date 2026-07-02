/**
 * Rental tenant profile — one customer per Mobility C2 node (default tenant).
 * Multi-tenant SaaS on a shared URL is roadmap; this file is the contract for limits + login URL.
 */
const fs = require('fs');
const path = require('path');
const platformLimits = require('./platformLimits');

function profilePath(storageDir) {
    return path.join(storageDir, 'tenant-profile.json');
}

function defaultProfile(settings) {
    const dep = (settings && settings.deployment) || {};
    const limits = platformLimits.loadLimits();
    const planLabel = limits.licenseType
        ? limits.licenseType
        : (process.env.FM_RENTAL_PLAN || 'enterprise');
    return {
        tenantId: 'default',
        displayName: dep.tenantName || '',
        bwcRegisterIp: settings.publicHost || '',
        operatorLoginUrl: dep.operatorUrl || '',
        deploymentMode: dep.mode || 'lan',
        networkAccess: dep.networkAccess || 'lan-static',
        plan: planLabel,
        licenseId: limits.licenseId || null,
        limitsSource: limits.limitsSource || 'env',
        limits: {
            maxBwcDevices: limits.maxBwcDevices,
            maxDashboardUsers: limits.maxDashboardUsers,
            maxConcurrentLive: limits.maxConcurrentLive,
        },
        updatedAt: new Date().toISOString(),
    };
}

function load(storageDir, settings) {
    const file = profilePath(storageDir);
    try {
        if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            const base = defaultProfile(settings);
            return {
                ...base,
                ...data,
                limits: { ...base.limits, ...(data.limits || {}) },
            };
        }
    } catch (_) { /* rebuild */ }
    return defaultProfile(settings);
}

function save(storageDir, settings) {
    const next = defaultProfile(settings);
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(profilePath(storageDir), JSON.stringify(next, null, 2), 'utf8');
    return next;
}

function capabilities() {
    return {
        bundledFfmpeg: true,
        platformLicense: true,
        /** One SIP/ffmpeg pipeline today — see docs/RENTAL-READINESS.md */
        multiConcurrentLive: false,
        multiTenantSharedPlatform: false,
        loadBalanced: false,
        onlineLicenseActivation: false,
        maxConcurrentLiveNote: 'One active SIP live transcode per server today; video wall shares one stream until multi-ffmpeg milestone.',
    };
}

module.exports = {
    load,
    save,
    defaultProfile,
    capabilities,
    profilePath,
};
