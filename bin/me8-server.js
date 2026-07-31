#!/usr/bin/env node
'use strict';

/**
 * ME8 1-Pack entry — seamless installer / boot lock / CLI recovery.
 * Lab continues to use: node server.js
 *
 *   node bin/me8-server.js
 *   node bin/me8-server.js --safe-mode
 *   node bin/me8-server.js --reset-license
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const APP_ROOT = path.join(__dirname, '..');
process.chdir(APP_ROOT);

require('dotenv').config({ path: path.join(APP_ROOT, '.env') });

const { parseArgv, printHelp } = require('../lib/seamlessCli');
const { lockEnvFile } = require('../lib/envFileAcl');
const { applyNetworkTierRuntime } = require('../lib/networkTierRuntime');
const { applyFirewallIngress } = require('../lib/firewallIngress');
const { installOrphanHooks } = require('../lib/processGroupHooks');
const setupOnly = require('../lib/setupOnlyServer');
const licenseManager = require('../lib/licenseManager');
const licenseGatekeeper = require('../lib/licenseGatekeeper');
const sipBridge = require('../lib/sipBridge');
const { glassFortress } = require('../lib/glassFortressLog');

const flags = parseArgv(process.argv.slice(2));
if (flags.help) {
    printHelp();
    process.exit(0);
}
if (flags.unknown.length) {
    console.warn('[me8-server] Ignoring unknown flags:', flags.unknown.join(' '));
}

process.env.FM_SEAMLESS_PACK = '1';
/* Default away from lab dashboard :3988 — operator can override in .env */
if (!process.env.SETUP_PORT) process.env.SETUP_PORT = '13988';
if (!process.env.SETUP_HTTPS_PORT) process.env.SETUP_HTTPS_PORT = '13989';
/* Avoid colliding with live dashboard ports from .env */
(function avoidDashPorts() {
    const httpP = parseInt(process.env.FM_HTTP_PORT || '3988', 10) || 3988;
    const httpsP = parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438;
    let setup = parseInt(process.env.SETUP_PORT, 10) || 13988;
    let setupHttps = parseInt(process.env.SETUP_HTTPS_PORT, 10) || 13989;
    if (setup === httpP || setup === httpsP) {
        setup = 13988;
        process.env.SETUP_PORT = String(setup);
        console.warn('[me8-server] SETUP_PORT collided with dashboard — using ' + setup);
    }
    if (setupHttps === httpP || setupHttps === httpsP || setupHttps === setup) {
        setupHttps = setup + 1;
        process.env.SETUP_HTTPS_PORT = String(setupHttps);
        console.warn('[me8-server] SETUP_HTTPS_PORT adjusted to ' + setupHttps);
    }
})();
/* 1-Pack defaults: air-gap license required unless operator overrides in .env */
if (process.env.FM_SEAMLESS_BOOT_LOCK == null || process.env.FM_SEAMLESS_BOOT_LOCK === '') {
    process.env.FM_SEAMLESS_BOOT_LOCK = '1';
}
if (process.env.FM_AIRGAP_LICENSE_REQUIRED == null || process.env.FM_AIRGAP_LICENSE_REQUIRED === '') {
    process.env.FM_AIRGAP_LICENSE_REQUIRED = '1';
}

installOrphanHooks();

const acl = lockEnvFile(APP_ROOT);
if (acl.ok) console.log('[me8-server] .env ACL:', acl.detail);
else if (acl.detail !== 'missing') console.warn('[me8-server] .env ACL warn:', acl.detail);

const tierRuntime = applyNetworkTierRuntime();
console.log('[me8-server] Network tier:', tierRuntime.tier, 'bind=', tierRuntime.bind, 'trustProxy=', tierRuntime.trustProxy || 'off');

try {
    const fw = applyFirewallIngress({ tier: tierRuntime.tier });
    if (fw.ok) console.log('[me8-server] Firewall ingress applied (tier=' + tierRuntime.tier + ', WebRTC UDP + SETUP localhost).');
    else console.warn('[me8-server] Firewall helper skipped/failed (run as admin for full effect):', fw.detail || fw.platform);
} catch (err) {
    console.warn('[me8-server] Firewall helper exception (boot continues):', err.message);
}

licenseManager.init({
    baseDir: APP_ROOT,
    storageDir: path.join(APP_ROOT, 'storage'),
});

if (flags.resetLicense) {
    const removed = setupOnly.clearActiveLicenses(APP_ROOT);
    console.log('[me8-server] --reset-license removed:', removed.length ? removed.join(', ') : '(none found)');
    process.env.FM_SAFE_MODE = '1';
}

if (flags.safeMode) {
    process.env.FM_SAFE_MODE = '1';
}

function writeSetupPortToEnv(nextPort) {
    const envPath = path.join(APP_ROOT, '.env');
    let lines = [];
    if (fs.existsSync(envPath)) {
        lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    }
    let found = false;
    lines = lines.map(function (line) {
        if (/^\s*SETUP_PORT=/.test(line)) {
            found = true;
            return 'SETUP_PORT=' + String(nextPort);
        }
        return line;
    });
    if (!found) lines.push('SETUP_PORT=' + String(nextPort));
    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
    process.env.SETUP_PORT = String(nextPort);
}

function promptForSetupPort(blockedPort) {
    return new Promise(function (resolve, reject) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('[WARNING] Port ' + blockedPort + ' is blocked by OS. Enter a new Setup Port: ', function (answer) {
            rl.close();
            const next = String(answer || '').trim();
            if (!/^\d+$/.test(next)) {
                reject(new Error('Invalid port provided.'));
                return;
            }
            const n = parseInt(next, 10);
            if (!Number.isFinite(n) || n <= 0 || n > 65535) {
                reject(new Error('Invalid port range.'));
                return;
            }
            resolve(n);
        });
    });
}

async function startSetupWithPortFallback() {
    while (true) {
        try {
            return await setupOnly.startSetupOnlyServer(APP_ROOT);
        } catch (err) {
            const code = err && err.code ? String(err.code) : '';
            const blocked = code === 'EACCES' || code === 'EADDRINUSE';
            const currentPort = process.env.SETUP_PORT || '13988';
            if (!blocked) throw err;
            if (!process.stdout.isTTY) {
                console.error('[FATAL] Port ' + currentPort + ' is locked');
                process.exit(1);
            }
            const nextPort = await promptForSetupPort(currentPort);
            writeSetupPortToEnv(nextPort);
            try {
                const fw = applyFirewallIngress({ tier: tierRuntime.tier });
                if (fw.ok) console.log('[me8-server] Firewall ingress re-applied for SETUP_PORT=' + nextPort);
                else console.warn('[me8-server] Firewall helper skipped/failed for SETUP_PORT=' + nextPort + ':', fw.detail || fw.platform);
            } catch (fwErr) {
                console.warn('[me8-server] Firewall helper exception for SETUP_PORT=' + nextPort + ':', fwErr.message);
            }
        }
    }
}

function needsSetupOnly() {
    if (process.env.FM_SAFE_MODE === '1') {
        return { setup: true, reason: 'safe-mode' };
    }
    if (String(process.env.FM_SEAMLESS_BOOT_LOCK || '') === '0') {
        return { setup: false, reason: 'boot-lock-disabled' };
    }

    const gate = licenseGatekeeper.evaluateBootLicense({
        baseDir: APP_ROOT,
        storageDir: path.join(APP_ROOT, 'storage'),
    });

    if (gate.pass) {
        console.log('[me8-server] License gate PASS:', gate.code);
        return { setup: false, reason: gate.code };
    }

    console.error('[me8-server] License gate FAIL:', gate.code, '—', gate.message);
    if (gate.code === 'HARDWARE_CLOCK_INVALID') {
        glassFortress(
            'Boot blocked — hardware clock invalid.',
            gate.message || 'System date is before 2026-01-01 UTC.',
            'Set the correct date/time in BIOS/CMOS (replace the CMOS battery if the clock resets after power loss). Open Setup UI, then restart me8-server. This is NOT a license expiry rollback.'
        );
    }
    if (gate.hardwareId) {
        console.error('[me8-server] Hardware ID:', gate.hardwareId);
    }
    return { setup: true, reason: gate.code, message: gate.message };
}

(async function main() {
    const boot = needsSetupOnly();
    if (boot.setup) {
        console.log('[me8-server] Boot lock — Setup UI only (Video / DB / Analytics halted).');
        if (boot.reason && boot.reason !== 'safe-mode') {
            console.log('[me8-server] Gate reason:', boot.reason, boot.message || '');
        }
        await startSetupWithPortFallback();
        return;
    }
    console.log('[me8-server] License OK — starting full Fleet stack…');
    try {
        sipBridge.startSipBridge({ appRoot: APP_ROOT });
    } catch (bridgeErr) {
        console.warn('[me8-server] SIP bridge start skipped:', bridgeErr && bridgeErr.message);
    }
    require(path.join(APP_ROOT, 'server.js'));
})().catch(function (err) {
    glassFortress(
        'me8-server fatal exit.',
        err && err.message ? err.message : String(err),
        'Read the stack above. For port conflicts use netstat/lsof. For clock issues set BIOS time. Then restart.'
    );
    console.error('[me8-server] Fatal:', err && err.stack ? err.stack : err);
    process.exit(1);
});
