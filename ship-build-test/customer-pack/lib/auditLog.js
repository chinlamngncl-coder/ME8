/**
 * Compliance audit trail — append-only, stored in mobility.db.
 */
const siteDb = require('./siteDb');

function clientIp(req) {
    if (!req) return null;
    const fwd = req.headers && req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || req.ip || null;
}

function record(action, opts) {
    opts = opts || {};
    return siteDb.appendAudit({
        action,
        actor: opts.actor || opts.username || null,
        role: opts.role || null,
        target: opts.target || null,
        detail: opts.detail || null,
        clientIp: opts.clientIp || opts.ip || null,
    });
}

function recordFromRequest(req, action, opts) {
    opts = opts || {};
    const user = req && req.dashboardUser;
    return record(action, {
        actor: user ? user.username : opts.actor,
        role: user ? user.role : opts.role,
        target: opts.target,
        detail: opts.detail,
        clientIp: clientIp(req),
    });
}

function list(opts) {
    return siteDb.listAudit(opts);
}

module.exports = {
    record,
    recordFromRequest,
    list,
    clientIp,
};
