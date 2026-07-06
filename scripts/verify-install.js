#!/usr/bin/env node
/**
 * Verify rental install: Node, npm deps, bundled media engine (LGPL).
 * Usage: node scripts/verify-install.js [--quiet]
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const platformLicense = require('../lib/platformLicense');

const quiet = process.argv.includes('--quiet');
const root = path.join(__dirname, '..');

function ok(msg) {
    if (!quiet) console.log('[ok] ' + msg);
}

function fail(msg) {
    console.error('[fail] ' + msg);
    process.exit(1);
}

const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) fail('package.json not found — run from FleetBackend folder');

const vendorFfmpeg = path.join(root, 'vendor', 'ffmpeg-lgpl', 'ffmpeg.exe');
if (!fs.existsSync(vendorFfmpeg)) {
    fail('Media engine not found — run scripts/download-ffmpeg-lgpl.ps1 to install the LGPL build.');
}
ok('Media engine (LGPL) at ' + vendorFfmpeg);

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
    fail('Node 18+ required (found ' + process.version + ')');
}
ok('Node ' + process.version);

try {
    const centreLlm = require('../lib/centreLlm');
    const vendorModel = centreLlm.vendorModelPath(root);
    const runtimeModel = path.join(root, 'storage', 'llm', centreLlm.modelFileName());
    if (fs.existsSync(vendorModel)) {
        ok('Centre Summary AI bundled at vendor/llm/ (ships to customers)');
    } else if (fs.existsSync(runtimeModel)) {
        ok('Centre Summary AI installed at storage/llm/');
    } else if (process.env.FM_LLM_AUTO_DOWNLOAD === '1') {
        if (!quiet) {
            console.warn('[warn] Centre Summary AI model not bundled — will download on setup if internet available.');
        }
    } else if (!quiet) {
        console.warn('[warn] Centre Summary AI model missing — vendor: scripts\\download-centre-llm.ps1 before shipping.');
    }
} catch (err) {
    if (!quiet) console.warn('[warn] Centre Summary AI check skipped: ' + err.message);
}

const storage = path.join(root, 'storage');
if (!fs.existsSync(storage)) {
    fs.mkdirSync(storage, { recursive: true });
    ok('created storage/');
}

if (!quiet) {
    console.log('\nMobility C2 install check passed.');
    const rental = process.env.FM_RENTAL_MODE === '1';
    const licenseRequired = platformLicense.isLicenseRequired();
    const licensePath = platformLicense.licenseFilePath();
    const hasLicense = fs.existsSync(licensePath);
    if (rental || licenseRequired) {
        if (hasLicense) {
            platformLicense.init(path.join(root, 'storage'));
            const st = platformLicense.getStatusPublic();
            if (st.valid) {
                console.log('[ok] platform license valid — ' + st.customerName + ' (' + st.type + ')');
            } else {
                console.warn('[warn] platform license present but invalid: ' + (st.error || 'unknown'));
            }
        } else if (process.env.FM_LICENSE_REQUIRED !== '0') {
            console.warn('[warn] FM_RENTAL_MODE=1 but no storage/platform-license.json — server will not start.');
            console.warn('       Issue license from MobilityC2-VENDOR-IMPORTANT/LicenseIssuer (see docs/LICENSE-OPERATIONS.md)');
        }
    } else {
        console.log('Lab/dev: license optional. Set FM_RENTAL_MODE=1 for rental deployments.');
    }
    console.log('');
}
