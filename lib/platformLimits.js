/**
 * Rental / fleet scale limits — env defaults; signed license overrides when valid.
 */
const platformLicense = require('./platformLicense');

function parsePositiveInt(val, fallback) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function loadLimits() {
    const rentalMode = process.env.FM_RENTAL_MODE === '1';
    const maxConcurrentLive = parsePositiveInt(process.env.FM_MAX_CONCURRENT_LIVE, 64);
    const maxSuperAdmins = parsePositiveInt(process.env.FM_MAX_SUPER_ADMINS, 5);
    const entitlements = platformLicense.getEntitlements();

    if (entitlements) {
        return {
            maxBwcDevices: entitlements.maxBwcDevices,
            maxDashboardUsers: entitlements.maxDashboardUsers,
            maxSuperAdmins: entitlements.maxSuperAdmins != null ? entitlements.maxSuperAdmins : maxSuperAdmins,
            maxOperators: entitlements.maxOperators != null ? entitlements.maxOperators : null,
            evidenceRetentionDays: entitlements.evidenceRetentionDays != null ? entitlements.evidenceRetentionDays : null,
            sku: entitlements.sku || null,
            maxConcurrentLive,
            rentalMode,
            licenseId: entitlements.licenseId,
            licenseType: entitlements.type,
            limitsSource: 'license',
        };
    }

    return {
        maxBwcDevices: parsePositiveInt(process.env.FM_MAX_BWC_DEVICES, 5000),
        maxDashboardUsers: parsePositiveInt(process.env.FM_MAX_DASHBOARD_USERS, 500),
        maxSuperAdmins,
        maxOperators: null,
        evidenceRetentionDays: null,
        sku: null,
        maxConcurrentLive,
        rentalMode,
        licenseId: null,
        licenseType: null,
        limitsSource: 'env',
    };
}

function assertBwcCount(count, limits) {
    const lim = limits || loadLimits();
    const n = parseInt(count, 10) || 0;
    if (n > lim.maxBwcDevices) {
        const src = lim.limitsSource === 'license' ? 'license' : 'FM_MAX_BWC_DEVICES';
        throw new Error(`Device limit reached (${lim.maxBwcDevices} from ${src}). Contact your platform operator.`);
    }
}

function assertUserCount(count, limits) {
    const lim = limits || loadLimits();
    const n = parseInt(count, 10) || 0;
    if (n > lim.maxDashboardUsers) {
        const src = lim.limitsSource === 'license' ? 'license' : 'FM_MAX_DASHBOARD_USERS';
        throw new Error(`User limit reached (${lim.maxDashboardUsers} from ${src}).`);
    }
}

function assertSuperAdminCount(count, limits) {
    const lim = limits || loadLimits();
    const n = parseInt(count, 10) || 0;
    if (n > lim.maxSuperAdmins) {
        throw new Error('License limit reached for Super Admins.');
    }
}

function assertOperatorCount(count, limits) {
    const lim = limits || loadLimits();
    if (lim.maxOperators == null) return;
    const n = parseInt(count, 10) || 0;
    if (n > lim.maxOperators) {
        throw new Error('License limit reached for Operators.');
    }
}

function assertConcurrentLive(count, limits) {
    const lim = limits || loadLimits();
    const n = parseInt(count, 10) || 0;
    if (n > lim.maxConcurrentLive) {
        throw new Error(`Concurrent live limit reached (${lim.maxConcurrentLive}). Upgrade license or stop a stream.`);
    }
}

module.exports = {
    loadLimits,
    assertBwcCount,
    assertUserCount,
    assertSuperAdminCount,
    assertOperatorCount,
    assertConcurrentLive,
};
