'use strict';

/**
 * ME8 network tier runtime — env failsafes before firewall + Fleet boot.
 * Defense-in-depth: OS firewall + Node software subnet lock (server.js).
 */

const TRUST_PROXY_CLOUD = 'loopback, linklocal, uniquelocal';

function normalizeTier(raw) {
    const t = String(raw || process.env.ME8_NETWORK_TIER || 'lan').trim().toLowerCase();
    if (['lan', 'wan', 'cloud', 'hybrid'].includes(t)) return t;
    return 'lan';
}

function normalizeIp(ip) {
    let s = String(ip || '').trim();
    if (s.startsWith('::ffff:')) s = s.slice(7);
    return s;
}

/** Loopback or RFC 1918 — used by software subnet lock when tier is lan. */
function isLoopbackOrRfc1918(ip) {
    const s = normalizeIp(ip);
    if (!s) return false;
    if (s === '::1' || s.toLowerCase() === 'localhost') return true;
    if (s.startsWith('127.')) return true;

    const m = s.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return false;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

/**
 * Apply env-side tier effects. Does not write .env.
 */
function applyNetworkTierRuntime(options) {
    const opts = options || {};
    const tier = normalizeTier(opts.tier);

    process.env.ME8_NETWORK_TIER = tier;
    process.env.ME8_DASHBOARD_BIND = '0.0.0.0';

    if (tier === 'cloud' || tier === 'hybrid') {
        process.env.ME8_TRUST_PROXY = TRUST_PROXY_CLOUD;
    } else if (process.env.ME8_TRUST_PROXY == null || process.env.ME8_TRUST_PROXY === '') {
        process.env.ME8_TRUST_PROXY = '';
    }

    return {
        tier: tier,
        bind: process.env.ME8_DASHBOARD_BIND,
        trustProxy: process.env.ME8_TRUST_PROXY || false,
    };
}

/** Software subnet lock — drops non-private clients when tier is lan. */
function lanSubnetLockMiddleware() {
    return function lanSubnetLockMw(req, res, next) {
        const tier = normalizeTier(process.env.ME8_NETWORK_TIER);
        if (tier !== 'lan') return next();

        const ip = req.ip
            || (req.socket && req.socket.remoteAddress)
            || (req.connection && req.connection.remoteAddress)
            || '';

        if (isLoopbackOrRfc1918(ip)) return next();

        res.status(403).type('text/plain').send(
            'Forbidden: LAN tier accepts loopback or private (RFC 1918) addresses only.'
        );
    };
}

module.exports = {
    TRUST_PROXY_CLOUD,
    normalizeTier,
    normalizeIp,
    isLoopbackOrRfc1918,
    applyNetworkTierRuntime,
    lanSubnetLockMiddleware,
};
