/**
 * Tenant context from air-gap Ed25519 license.lic (+ lab fail-open).
 * MOB-APPLY TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1
 */
'use strict';

const licenseManager = require('./licenseManager');

const DEFAULT_ORG = 'default';

function tenantEnforce() {
    return /^(1|true|yes|on)$/i.test(String(process.env.FM_TENANT_LICENSE_ENFORCE || '').trim())
        || licenseManager.isAirgapLicenseRequired();
}

function socketIsolate() {
    const raw = process.env.FM_TENANT_SOCKET_ISOLATE;
    if (raw == null || String(raw).trim() === '') return true; /* default on — single-org room safe for lab */
    return !/^(0|false|no|off)$/i.test(String(raw).trim());
}

function orgRoom(orgId) {
    return 'org:' + String(orgId || DEFAULT_ORG).trim();
}

/**
 * Resolve tenant + quotas from verified license (or lab-open defaults).
 * @returns {{ ok: boolean, orgId: string, limits: object, labOpen: boolean, error?: string, code?: string }}
 */
function resolveTenantContext() {
    const pub = licenseManager.getPublicEntitlements();
    const st = typeof licenseManager.loadAndValidate === 'function'
        ? licenseManager.loadAndValidate()
        : { ok: pub.labOpen || pub.licensed, payload: null };

    if (pub.labOpen) {
        return {
            ok: true,
            labOpen: true,
            orgId: String(process.env.FM_ORG_ID || DEFAULT_ORG).trim() || DEFAULT_ORG,
            limits: {
                maxFixedCameras: null,
                maxBwcDevices: null,
                features: pub.features || {},
                unlimited: true,
            },
            customerName: null,
            licenseId: null,
        };
    }

    if (!pub.licensed || !st.ok) {
        return {
            ok: false,
            labOpen: false,
            orgId: DEFAULT_ORG,
            limits: {
                maxFixedCameras: 0,
                maxBwcDevices: 0,
                features: {},
                unlimited: false,
            },
            error: 'License invalid or missing.',
            code: 'ERR_LIC_INVALID',
        };
    }

    const payload = st.payload || {};
    const orgId = String(
        payload.orgId
        || payload.org_id
        || process.env.FM_ORG_ID
        || DEFAULT_ORG,
    ).trim() || DEFAULT_ORG;

    return {
        ok: true,
        labOpen: false,
        orgId: orgId,
        limits: {
            maxFixedCameras: pub.maxFixedCameras,
            maxBwcDevices: pub.maxBwcDevices,
            features: pub.features || {},
            unlimited: false,
            expiryDate: pub.expiryDate || null,
        },
        customerName: pub.customerName || null,
        licenseId: pub.licenseId || null,
    };
}

function getActiveOrgId() {
    return resolveTenantContext().orgId || DEFAULT_ORG;
}

module.exports = {
    DEFAULT_ORG,
    tenantEnforce,
    socketIsolate,
    orgRoom,
    resolveTenantContext,
    getActiveOrgId,
};
