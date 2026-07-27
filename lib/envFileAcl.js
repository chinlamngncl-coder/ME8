'use strict';

/**
 * Lock .env so only the OS admin / current owner can read it.
 * Does NOT strip or rewrite variable contents.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function envPath(appRoot) {
    return path.join(appRoot || process.cwd(), '.env');
}

function lockEnvFile(appRoot) {
    const file = envPath(appRoot);
    const result = { ok: false, path: file, platform: process.platform, detail: '' };
    if (!fs.existsSync(file)) {
        result.detail = 'missing';
        return result;
    }
    try {
        if (process.platform === 'win32') {
            const identity = require('os').userInfo().username;
            const cmds = [
                ['icacls', [file, '/inheritance:r']],
                ['icacls', [file, '/grant:r', 'SYSTEM:F']],
                ['icacls', [file, '/grant:r', 'Administrators:F']],
                ['icacls', [file, '/grant:r', identity + ':F']],
            ];
            for (const [bin, args] of cmds) {
                const r = spawnSync(bin, args, { encoding: 'utf8', windowsHide: true });
                if (r.status !== 0) {
                    result.detail = String(r.stderr || r.stdout || 'icacls failed').slice(0, 240);
                    return result;
                }
            }
            result.ok = true;
            result.detail = 'icacls locked';
            return result;
        }
        fs.chmodSync(file, 0o600);
        result.ok = true;
        result.detail = 'chmod 600';
        return result;
    } catch (err) {
        result.detail = err && err.message ? err.message : String(err);
        return result;
    }
}

module.exports = {
    envPath,
    lockEnvFile,
};
