'use strict';

/**
 * Express middleware: when HTTPS is the product path, plain HTTP is allowed
 * ONLY from 127.0.0.1 / ::1 / localhost — prevents WAN HTTP while avoiding
 * browser SSL lockout for local physical access.
 */

function remoteIsLocalhost(req) {
    const raw = String(
        (req.socket && req.socket.remoteAddress)
        || (req.connection && req.connection.remoteAddress)
        || ''
    );
    const ip = raw.replace(/^::ffff:/i, '');
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    const host = String(req.headers.host || '').split(':')[0].toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
    return false;
}

function isTlsRequest(req) {
    if (req.secure) return true;
    if (req.socket && req.socket.encrypted) return true;
    const xf = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    if (xf === 'https') return true;
    return false;
}

function localhostHttpGate(options) {
    const opts = options || {};
    const enabled = opts.enabled !== false;
    return function localhostHttpGateMw(req, res, next) {
        if (!enabled) return next();
        if (isTlsRequest(req)) return next();
        if (remoteIsLocalhost(req)) return next();
        res.status(403).type('text/plain').send(
            'Plain HTTP is only allowed from localhost (127.0.0.1). '
            + 'Use HTTPS, or open http://127.0.0.1 locally / via SSH tunnel.'
        );
    };
}

module.exports = {
    remoteIsLocalhost,
    isTlsRequest,
    localhostHttpGate,
};
