'use strict';

/**
 * Non-destructive SIP bridge starter (Glass Fortress).
 * NEVER writes .env / .env.template — listen/target resolved in memory only.
 *
 * Camera bridge LISTEN (NOT Fleet SIP):
 *   1) process.env.WVP_SIP_PROXY_LISTEN (if set and not 0)
 *   2) default 5060
 *
 * Do NOT use Settings sip.sipPort / FM_GB28181_SIP_PORT here — those are Fleet
 * (often 5062). Using them caused EADDRINUSE and killed UbitronC2.
 *
 * TARGET: 127.0.0.1 + port from WVP_SIP_PROXY_TARGET (default 5061).
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { glassFortress, glassFortressWarn } = require('./glassFortressLog');

let childProc = null;
let started = false;

function parsePort(raw, fallback) {
    const n = parseInt(String(raw == null ? '' : raw).trim(), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 65535) return n;
    return fallback;
}

/**
 * Resolve listen + target in memory (no .env writes).
 */
function resolveBridgeConfig(appRoot) {
    void appRoot;
    const rawListen = String(process.env.WVP_SIP_PROXY_LISTEN || '').trim();
    const fromProxyEnv = rawListen && rawListen !== '0' ? parsePort(rawListen, null) : null;
    const listenPort = fromProxyEnv != null ? fromProxyEnv : 5060;

    const targetRaw = String(process.env.WVP_SIP_PROXY_TARGET || '5061').trim();
    let targetPort = 5061;
    const m = targetRaw.match(/^(?:([^:]+):)?(\d+)$/);
    if (m) {
        targetPort = parsePort(m[2], 5061);
    } else {
        targetPort = parsePort(targetRaw, 5061);
    }
    /*
     * Legacy drift: older lab .env used 15061 after an old docker publish.
     * Current compose publishes host 5061 → container 5060. 15061 is dead.
     * Remap in memory only — do not rewrite .env here.
     */
    if (targetPort === 15061) {
        console.warn('[sip-bridge] WVP_SIP_PROXY_TARGET port 15061 is legacy/dead — using 5061 in memory');
        targetPort = 5061;
    }
    /* Anti-reflection: always loopback */
    const targetHost = '127.0.0.1';

    return {
        listenPort: listenPort,
        targetHost: targetHost,
        targetPort: targetPort,
        target: targetHost + ':' + targetPort,
        source: fromProxyEnv != null ? 'WVP_SIP_PROXY_LISTEN' : 'default-5060',
    };
}

function validateConfig(cfg) {
    if (!cfg || !Number.isFinite(cfg.listenPort) || !Number.isFinite(cfg.targetPort)) {
        glassFortress(
            'SIP bridge refused to start — invalid listen/target ports.',
            'Resolved ports were not valid integers in 1..65535.',
            'Check Settings → SIP port and env WVP_SIP_PROXY_TARGET (port only or 127.0.0.1:port). Do not edit .env from this module.'
        );
        return false;
    }
    if (cfg.listenPort === cfg.targetPort) {
        glassFortress(
            'SIP bridge refused to start — listen port equals target port (' + cfg.listenPort + ').',
            'Forwarding camera SIP to the same port would create an infinite routing loop.',
            'Set camera/UI SIP listen to a different port than Docker WVP (target default 5061). Example: listen 5060 → target 127.0.0.1:5061.'
        );
        return false;
    }
    if (cfg.targetHost !== '127.0.0.1') {
        glassFortress(
            'SIP bridge refused to start — target host is not 127.0.0.1.',
            'Anti-reflection policy blocks forwarding SIP off-loopback.',
            'Leave WVP_SIP_PROXY_TARGET as a port (e.g. 5061) or 127.0.0.1:5061 only.'
        );
        return false;
    }
    return true;
}

/**
 * Start bridge child with in-memory env overrides. Never crashes parent.
 * @returns {{ ok: boolean, config?: object, error?: string }}
 */
function startSipBridge(opts) {
    const o = opts || {};
    const root = o.appRoot || path.join(__dirname, '..');
    if (started && childProc && !childProc.killed) {
        return { ok: true, config: resolveBridgeConfig(root), alreadyRunning: true };
    }

    const cfg = resolveBridgeConfig(root);
    if (!validateConfig(cfg)) {
        return { ok: false, error: 'INVALID_CONFIG', config: cfg };
    }

    /* Explicit disable hatch — never write .env from this module */
    if (String(process.env.WVP_SIP_PROXY_LISTEN || '').trim() === '0') {
        console.log('[sip-bridge] WVP_SIP_PROXY_LISTEN=0 — bridge not started');
        return { ok: false, error: 'DISABLED', config: cfg };
    }

    const script = path.join(root, 'scripts', 'wvp-sip-lan-proxy.js');
    if (!fs.existsSync(script)) {
        glassFortress(
            'SIP bridge script missing.',
            'Expected file scripts/wvp-sip-lan-proxy.js was not found under the install root.',
            'Re-install the ME8 pack or restore scripts/wvp-sip-lan-proxy.js, then restart.'
        );
        return { ok: false, error: 'SCRIPT_MISSING', config: cfg };
    }

    try {
        const env = Object.assign({}, process.env, {
            WVP_SIP_PROXY_LISTEN: String(cfg.listenPort),
            WVP_SIP_PROXY_TARGET: cfg.target,
        });
        childProc = spawn(process.execPath, [script], {
            cwd: root,
            env: env,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        started = true;
        childProc.stdout.on('data', function (buf) {
            process.stdout.write(buf);
        });
        childProc.stderr.on('data', function (buf) {
            process.stderr.write(buf);
        });
        childProc.on('error', function (err) {
            glassFortressWarn(
                'SIP bridge process failed to spawn.',
                err && err.message ? err.message : String(err),
                'Confirm Node.js is installed and scripts/wvp-sip-lan-proxy.js is readable. Restart ME8.'
            );
            started = false;
            childProc = null;
        });
        childProc.on('exit', function (code, signal) {
            console.warn('[sip-bridge] child exited code=' + code + ' signal=' + signal);
            started = false;
            childProc = null;
        });
        console.log('[sip-bridge] started listen=' + cfg.listenPort
            + ' → ' + cfg.target + ' (source=' + cfg.source + ', in-memory only)');
        return { ok: true, config: cfg };
    } catch (err) {
        glassFortressWarn(
            'SIP bridge start threw unexpectedly — Fleet continues without bridge.',
            err && err.message ? err.message : String(err),
            'Check Docker WVP is up and port ' + cfg.listenPort + ' is free. Cameras need this bridge to register.'
        );
        started = false;
        childProc = null;
        return { ok: false, error: err && err.message ? err.message : String(err), config: cfg };
    }
}

function stopSipBridge() {
    if (childProc && !childProc.killed) {
        try { childProc.kill(); } catch (_) { /* ignore */ }
    }
    childProc = null;
    started = false;
}

module.exports = {
    resolveBridgeConfig,
    validateConfig,
    startSipBridge,
    stopSipBridge,
};
