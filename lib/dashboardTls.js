'use strict';

/**
 * DASHBOARD-HTTPS-LAN-V1 — resolve lab TLS paths / ports (no nginx required).
 * Self-signed PEMs under certs/lab-dashboard/ (gitignored).
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_REL_CERT = path.join('certs', 'lab-dashboard', 'cert.pem');
const DEFAULT_REL_KEY = path.join('certs', 'lab-dashboard', 'key.pem');

function envFlag(name) {
    const v = String(process.env[name] || '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function resolvePaths(baseDir) {
    const root = baseDir || process.cwd();
    const certRel = String(process.env.FM_HTTPS_CERT || DEFAULT_REL_CERT).trim() || DEFAULT_REL_CERT;
    const keyRel = String(process.env.FM_HTTPS_KEY || DEFAULT_REL_KEY).trim() || DEFAULT_REL_KEY;
    const certPath = path.isAbsolute(certRel) ? certRel : path.join(root, certRel);
    const keyPath = path.isAbsolute(keyRel) ? keyRel : path.join(root, keyRel);
    return { certPath, keyPath, certRel, keyRel };
}

/**
 * @param {{ httpPort?: number, baseDir?: string }} opts
 */
function resolveFromEnv(opts) {
    const httpPort = opts && opts.httpPort != null
        ? Number(opts.httpPort)
        : parseInt(process.env.FM_HTTP_PORT || process.env.PORT || '3888', 10);
    const enabled = envFlag('FM_HTTPS_ENABLED');
    const httpsPort = parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438;
    const paths = resolvePaths(opts && opts.baseDir);

    if (!enabled) {
        return {
            enabled: false,
            httpPort,
            httpsPort,
            certPath: paths.certPath,
            keyPath: paths.keyPath,
            httpsOptions: null,
            reason: 'FM_HTTPS_ENABLED off',
        };
    }

    if (!fs.existsSync(paths.certPath) || !fs.existsSync(paths.keyPath)) {
        return {
            enabled: true,
            ready: false,
            httpPort,
            httpsPort,
            certPath: paths.certPath,
            keyPath: paths.keyPath,
            httpsOptions: null,
            reason: 'cert or key missing — run scripts/ensure-lab-dashboard-tls-certs.js',
        };
    }

    let key;
    let cert;
    try {
        key = fs.readFileSync(paths.keyPath);
        cert = fs.readFileSync(paths.certPath);
    } catch (err) {
        return {
            enabled: true,
            ready: false,
            httpPort,
            httpsPort,
            certPath: paths.certPath,
            keyPath: paths.keyPath,
            httpsOptions: null,
            reason: 'failed to read cert/key: ' + (err && err.message ? err.message : String(err)),
        };
    }

    return {
        enabled: true,
        ready: true,
        httpPort,
        httpsPort,
        certPath: paths.certPath,
        keyPath: paths.keyPath,
        httpsOptions: { key, cert },
        reason: 'ok',
    };
}

module.exports = {
    DEFAULT_REL_CERT,
    DEFAULT_REL_KEY,
    envFlag,
    resolvePaths,
    resolveFromEnv,
};
