#!/usr/bin/env node
'use strict';

/**
 * Dry-run: protected ship blob boots license gate without lib/ or server.js.
 *
 * 1) Ensures ship-build/protected/run.js exists (or builds it)
 * 2) Asserts layout (no lib/, no server.js)
 * 3) Seeds minimal storage (settings + empty secrets) so top-level init reaches validateOnBoot
 * 4) Spawns node run.js with FM_AIRGAP_LICENSE_REQUIRED=1 and no license.lic
 *    → must exit non-zero and print LICENSE EXPIRED OR INVALID
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'ship-build', 'protected');
const runJs = path.join(outDir, 'run.js');

function ensureBuild() {
    if (fs.existsSync(runJs) && fs.existsSync(path.join(outDir, 'MANIFEST.json'))) {
        const src = fs.readFileSync(runJs, 'utf8');
        if (/LICENSE EXPIRED OR INVALID/.test(src)) return;
    }
    console.log('[verify:ship-protected] building…');
    execSync('node scripts/build-ship-protected.js', { cwd: root, stdio: 'inherit', shell: true });
}

function copyFileIfExists(from, to) {
    if (!fs.existsSync(from)) return;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
}

function seedStorageForBoot() {
    const storage = path.join(outDir, 'storage');
    fs.mkdirSync(storage, { recursive: true });

    const templateDir = path.join(root, 'pack', 'me8-fresh', 'storage-template');
    if (fs.existsSync(templateDir)) {
        for (const name of fs.readdirSync(templateDir)) {
            copyFileIfExists(path.join(templateDir, name), path.join(storage, name));
        }
    }

    /* Full secrets shape so applySecrets never hits undefined.* before license gate */
    const secretsDir = path.join(storage, 'secrets');
    fs.mkdirSync(secretsDir, { recursive: true });
    const secretsPath = path.join(secretsDir, 'server-secrets.json');
    fs.writeFileSync(
        secretsPath,
        JSON.stringify(
            {
                version: 1,
                sip: { password: '', passwordAlt: '' },
                onvif: { password: '' },
                bwcRegistration: { password: '' },
                ftp: { password: '' },
                smtp: { password: '' },
                tech: { engineerPinHash: '', engineerPinSalt: '' },
            },
            null,
            2,
        ) + '\n',
    );

    const licPath = path.join(storage, 'license.lic');
    if (fs.existsSync(licPath)) fs.unlinkSync(licPath);
}

ensureBuild();

assert.ok(fs.existsSync(runJs), 'run.js missing');
assert.ok(!fs.existsSync(path.join(outDir, 'server.js')), 'server.js must not be in protected pack');
assert.ok(!fs.existsSync(path.join(outDir, 'lib')), 'lib/ must not be in protected pack');

const bundle = fs.readFileSync(runJs, 'utf8');
assert.ok(/LICENSE EXPIRED OR INVALID/.test(bundle), 'license fatal string inlined in bundle');
assert.ok(!/require\(["']\.\/lib\/licenseManager["']\)/.test(bundle), 'no readable relative require to licenseManager');

const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'MANIFEST.json'), 'utf8'));
assert.strictEqual(manifest.licenseGateStringPresent, true);

seedStorageForBoot();

const env = Object.assign({}, process.env, {
    FM_AIRGAP_LICENSE_REQUIRED: '1',
    FM_LICENSE_REQUIRED: '0',
    FM_RENTAL_MODE: '0',
    FM_HTTPS_ENABLED: '0',
    NODE_PATH: path.join(root, 'node_modules'),
});

const result = spawnSync(process.execPath, [runJs], {
    cwd: outDir,
    env: env,
    encoding: 'utf8',
    timeout: 60000,
    shell: false,
});

const combined = String(result.stdout || '') + String(result.stderr || '');
assert.ok(result.status !== 0, 'process must exit non-zero when license missing');
assert.ok(
    /LICENSE EXPIRED OR INVALID/i.test(combined),
    'stdout/stderr must show LICENSE EXPIRED OR INVALID\n---\n' + combined.slice(0, 2000),
);

console.log('[ok] verify-ship-protected-boot-v1');
console.log('  exit=', result.status);
console.log('  layout= ship-build/protected (run.js + public + keys + storage; no lib/)');
