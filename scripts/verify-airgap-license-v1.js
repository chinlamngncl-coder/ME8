'use strict';

/**
 * Phase 3 Task 3.1 — air-gapped Ed25519 license.lic generator + validator
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const mgrSrc = fs.readFileSync(path.join(root, 'lib/licenseManager.js'), 'utf8');
const genSrc = fs.readFileSync(path.join(root, 'tools/generate-license.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

assert.ok(/licenseManager\.validateOnBoot/.test(server), 'server calls validateOnBoot');
assert.ok(/LICENSE EXPIRED OR INVALID/.test(mgrSrc) && /LICENSE EXPIRED OR INVALID/.test(server), 'fatal string');
assert.ok(/computeHardwareId/.test(mgrSrc) && /networkInterfaces/.test(mgrSrc), 'HWID from NICs');
assert.ok(/ed25519|Ed25519/.test(mgrSrc) && /ed25519|Ed25519/.test(genSrc), 'Ed25519');
assert.ok(/maxFixedCameras/.test(mgrSrc) && /tacticalOverwatch/.test(genSrc), 'payload fields');
assert.ok(/generate-license\.js/.test(genSrc) || fs.existsSync(path.join(root, 'tools/generate-license.js')), 'CLI exists');

const licenseManager = require(path.join(root, 'lib/licenseManager.js'));
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

const hwid = licenseManager.computeHardwareId();
assert.ok(/^[a-f0-9]{32}$/.test(hwid), 'hwid shape');

const doc = licenseManager.buildLicDocument({
    customerName: 'Verify Co',
    hardwareId: hwid,
    expiryDate: '2099-12-31',
    maxFixedCameras: 10,
    maxBwcDevices: 8,
    features: { tacticalOverwatch: true },
}, privPem);

assert.strictEqual(doc.alg, 'Ed25519');
assert.ok(doc.signature);

const tmp = path.join(os.tmpdir(), 'me8-lic-verify-' + process.pid + '.lic');
fs.writeFileSync(tmp, JSON.stringify(doc));

const ok = licenseManager.validateLicenseFile(tmp, {
    publicKeyPem: pubPem,
    hardwareId: hwid,
});
assert.strictEqual(ok.ok, true, ok.error);
assert.strictEqual(ok.features.tacticalOverwatch, true);

const badHwid = licenseManager.validateLicenseFile(tmp, {
    publicKeyPem: pubPem,
    hardwareId: 'ffffffffffffffffffffffffffffffff',
});
assert.strictEqual(badHwid.ok, false);
assert.ok(/LICENSE EXPIRED OR INVALID/.test(badHwid.error));

const expiredDoc = licenseManager.buildLicDocument({
    customerName: 'Old',
    hardwareId: hwid,
    expiryDate: '2020-01-01',
    maxFixedCameras: 1,
    maxBwcDevices: 1,
    features: {},
}, privPem);
const tmp2 = path.join(os.tmpdir(), 'me8-lic-expired-' + process.pid + '.lic');
fs.writeFileSync(tmp2, JSON.stringify(expiredDoc));
const exp = licenseManager.validateLicenseFile(tmp2, { publicKeyPem: pubPem, hardwareId: hwid });
assert.strictEqual(exp.ok, false);
assert.strictEqual(exp.code, 'EXPIRED');

try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
try { fs.unlinkSync(tmp2); } catch (_) { /* ignore */ }

console.log('[ok] verify-airgap-license-v1');
