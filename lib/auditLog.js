/**
 * Compliance audit trail — append-only, stored in PostgreSQL.
 */
const siteDb = require('./siteDb');
let auditTail = Promise.resolve();
let pending = 0;
let dropped = 0;
const MAX_PENDING = 2000;

function clientIp(req) {
    if (!req) return null;
    const fwd = req.headers && req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || req.ip || null;
}

function record(action, opts) {
    opts = opts || {};
    if (pending >= MAX_PENDING) {
        dropped += 1;
        console.error('[audit] PostgreSQL dispatcher full; audit dropped', { action, dropped });
        return Promise.resolve(null);
    }
    pending += 1;
    const work = auditTail.catch(() => {}).then(() => siteDb.appendAudit({
            action,
            actor: opts.actor || opts.username || null,
            role: opts.role || null,
            target: opts.target || null,
            detail: opts.detail || null,
            clientIp: opts.clientIp || opts.ip || null,
        }))
        .catch((err) => {
            console.error('[audit] PostgreSQL write failed:', err && err.message ? err.message : err);
            return null;
        })
        .finally(() => { pending -= 1; });
    auditTail = work;
    return work;
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

async function drain() {
    await auditTail.catch(() => {});
}

module.exports = {
    record,
    recordFromRequest,
    list,
    clientIp,
    dispatcherHealth: () => ({ ok: dropped === 0, pending, dropped, maxPending: MAX_PENDING }),
    drain,
};
