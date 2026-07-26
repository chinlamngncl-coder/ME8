/**
 * Express + Socket.io tenant guards (Ed25519 via licenseManager).
 * MOB-APPLY TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1
 *
 * Plain-English 403 bodies (no raw stack / DOCTYPE).
 */
'use strict';

const tenantContext = require('./tenantContext');

function attachTenantToReq(req, ctx) {
    req.orgId = ctx.orgId;
    req.licenseLimits = ctx.limits;
    req.tenant = ctx;
}

/**
 * Always attach org_id + limits. Does not 403 (safe for static + login).
 */
function attachTenantContext(req, _res, next) {
    try {
        attachTenantToReq(req, tenantContext.resolveTenantContext());
    } catch (_) {
        attachTenantToReq(req, {
            ok: false,
            orgId: tenantContext.DEFAULT_ORG,
            limits: { maxFixedCameras: 0, maxBwcDevices: 0, features: {}, unlimited: false },
            labOpen: false,
        });
    }
    next();
}

/**
 * Verify Ed25519 license context. Invalid → HTTP 403.
 * Lab-open (no license.lic, air-gap not required) → pass with default org.
 * Force strict with FM_TENANT_LICENSE_ENFORCE=1 or FM_AIRGAP_LICENSE_REQUIRED=1.
 */
function requireValidTenantLicense(req, res, next) {
    const ctx = tenantContext.resolveTenantContext();
    attachTenantToReq(req, ctx);
    if (ctx.ok) return next();
    if (!tenantContext.tenantEnforce() && ctx.labOpen) return next();
    return res.status(403).json({
        ok: false,
        error: 'License invalid or missing.',
        code: 'ERR_LIC_INVALID',
    });
}

/**
 * When enforce flags on: require valid license for /api (except auth/health/public).
 */
function requireValidLicenseWhenEnforced(req, res, next) {
    if (!tenantContext.tenantEnforce()) {
        attachTenantToReq(req, tenantContext.resolveTenantContext());
        return next();
    }
    const path = String((req.originalUrl || req.url || '').split('?')[0]);
    const skip = /^\/api\/auth\/(login|session|login-ui|oidc)/i.test(path)
        || /^\/api\/health/i.test(path)
        || /^\/api\/license\/(entitlements|public)/i.test(path);
    if (skip) {
        attachTenantToReq(req, tenantContext.resolveTenantContext());
        return next();
    }
    return requireValidTenantLicense(req, res, next);
}

/**
 * Socket.io handshake — same Ed25519 validation as Express.
 * Call after session auth middleware (or combine).
 */
function socketTenantGuard(socket, next) {
    try {
        const ctx = tenantContext.resolveTenantContext();
        socket.data = socket.data || {};
        socket.data.orgId = ctx.orgId;
        socket.data.licenseLimits = ctx.limits;
        socket.data.tenant = ctx;
        if (!ctx.ok && tenantContext.tenantEnforce()) {
            return next(new Error('License invalid or missing.'));
        }
        return next();
    } catch (err) {
        return next(err);
    }
}

/**
 * After connect: force socket into org room.
 */
function joinOrgRoom(socket) {
    const orgId = (socket.data && socket.data.orgId)
        || tenantContext.getActiveOrgId();
    const room = tenantContext.orgRoom(orgId);
    socket.join(room);
    socket.data.orgRoom = room;
    return room;
}

module.exports = {
    attachTenantContext,
    requireValidTenantLicense,
    requireValidLicenseWhenEnforced,
    socketTenantGuard,
    joinOrgRoom,
};
