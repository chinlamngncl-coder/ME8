/**
 * Rental / fleet scale limits — env defaults; signed license overrides when valid.
 * Fixed/BWC camera pools always follow license.lic (Free Tier 16/10 when missing).
 */
const platformLicense = require('./platformLicense');
const licenseManager = require('./licenseManager');

function parsePositiveInt(val, fallback) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

const SOFTWARE_MAX_OPERATORS = 60;

function clampOperators(n) {
    const v = parsePositiveInt(n, SOFTWARE_MAX_OPERATORS);
    return Math.min(SOFTWARE_MAX_OPERATORS, v);
}

/** Dual-pool caps from license.lic — no env/5000 fail-open, no hardcoded ceiling. */
function cameraPoolCaps() {
    const pub = licenseManager.getPublicEntitlements();
    return {
        maxFixedCameras: Number(pub.maxFixedCameras),
        maxBwcDevices: Number(pub.maxBwcDevices),
        freeTier: !!pub.freeTier,
    };
}

function loadLimits() {
    const rentalMode = process.env.FM_RENTAL_MODE === '1';
    const maxConcurrentLive = parsePositiveInt(process.env.FM_MAX_CONCURRENT_LIVE, 64);
    const maxSuperAdmins = parsePositiveInt(process.env.FM_MAX_SUPER_ADMINS, 5);
    const pool = cameraPoolCaps();
    const entitlements = platformLicense.getEntitlements();

    if (entitlements) {
        return {
            maxBwcDevices: pool.maxBwcDevices,
            maxFixedCameras: pool.maxFixedCameras,
            maxDashboardUsers: entitlements.maxDashboardUsers,
            maxSuperAdmins: entitlements.maxSuperAdmins != null ? entitlements.maxSuperAdmins : maxSuperAdmins,
            maxOperators: clampOperators(entitlements.maxOperators != null ? entitlements.maxOperators : SOFTWARE_MAX_OPERATORS),
            evidenceRetentionDays: entitlements.evidenceRetentionDays != null ? entitlements.evidenceRetentionDays : null,
            sku: entitlements.sku || null,
            maxConcurrentLive,
            rentalMode,
            licenseId: entitlements.licenseId,
            licenseType: entitlements.type,
            limitsSource: pool.freeTier ? 'free_tier' : 'license',
        };
    }

    return {
        maxBwcDevices: pool.maxBwcDevices,
        maxFixedCameras: pool.maxFixedCameras,
        maxDashboardUsers: parsePositiveInt(process.env.FM_MAX_DASHBOARD_USERS, 500),
        maxSuperAdmins,
        maxOperators: clampOperators(process.env.FM_MAX_OPERATORS),
        evidenceRetentionDays: null,
        sku: null,
        maxConcurrentLive,
        rentalMode,
        licenseId: null,
        licenseType: null,
        limitsSource: pool.freeTier ? 'free_tier' : 'license',
    };
}

function assertBwcCount(count, limits) {
    const n = parseInt(count, 10) || 0;
    const check = licenseManager.checkBwcLimit(n);
    if (!check.ok) {
        throw new Error('Device limit reached (' + check.max + '). Contact your platform operator.');
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
    const cap = clampOperators(lim.maxOperators);
    const n = parseInt(count, 10) || 0;
    if (n > cap) {
        throw new Error('License limit reached for Operators.');
    }
}

function assertFixedCamCount(count, limits) {
    const n = parseInt(count, 10) || 0;
    const check = licenseManager.checkFixedCamLimit(n);
    if (!check.ok) {
        throw new Error('Fixed camera limit reached (' + check.max + ').');
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
    assertFixedCamCount,
    assertConcurrentLive,
    SOFTWARE_MAX_OPERATORS,
};
