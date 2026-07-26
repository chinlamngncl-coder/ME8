/**
 * Socket.io org-room broadcast isolation.
 * MOB-APPLY TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1
 *
 * When isolation is on (default), io.emit → org:<activeOrgId> only
 * (single-tenant install = all dashboards in one room; no cross-org leak).
 * Use io.emitToOrg(orgId, event, ...) for explicit multi-tenant emits later.
 */
'use strict';

const tenantContext = require('./tenantContext');

/**
 * @param {import('socket.io').Server} io
 */
function installTenantIo(io) {
    if (!io || io.__tenantIoInstalled) return io;
    const rawEmit = typeof io.emit === 'function' ? io.emit.bind(io) : null;
    if (!rawEmit) return io;

    io.__rawEmit = rawEmit;
    io.__tenantIoInstalled = true;

    function tenantScopedEmit(event) {
        if (!tenantContext.socketIsolate()) {
            return rawEmit.apply(io, arguments);
        }
        const orgId = tenantContext.getActiveOrgId();
        const room = tenantContext.orgRoom(orgId);
        const target = io.to(room);
        return target.emit.apply(target, Array.prototype.slice.call(arguments));
    }

    io.emitToOrg = function emitToOrg(orgId, event) {
        const room = tenantContext.orgRoom(orgId);
        const target = io.to(room);
        const args = Array.prototype.slice.call(arguments, 1);
        return target.emit.apply(target, args);
    };

    io.emit = tenantScopedEmit;

    return io;
}

module.exports = {
    installTenantIo,
};
