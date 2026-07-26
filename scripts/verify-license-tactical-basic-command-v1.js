'use strict';

/**
 * MOB-APPLY LICENSE-TACTICAL-BASIC-COMMAND-V1
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const licenseManager = require(path.join(root, 'lib', 'licenseManager'));
const genSrc = fs.readFileSync(path.join(root, 'tools', 'generate-license.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'public', 'js', 'license-entitlements-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(/--tactical-plan/.test(genSrc), 'generator plan flag');
assert.ok(/--tactical-pin-live-cap/.test(genSrc), 'generator pin cap flag');
assert.ok(/tacticalPinLiveCap/.test(fs.readFileSync(path.join(root, 'lib', 'licenseManager.js'), 'utf8')), 'manager pin cap');
assert.ok(typeof licenseManager.getTacticalPinLiveCap === 'function', 'getTacticalPinLiveCap export');
assert.ok(typeof licenseManager.getTacticalPlan === 'function', 'getTacticalPlan export');

/* Optional field must not appear when omitted (old licenses) */
const bare = licenseManager.canonicalPayload({
    customerName: 'T',
    hardwareId: 'abc',
    expiryDate: '2099-01-01',
    maxFixedCameras: 1,
    maxBwcDevices: 1,
    features: { analytics: true },
});
assert.ok(!Object.prototype.hasOwnProperty.call(bare, 'tacticalPinLiveCap'), 'omit pin cap when absent');

const withCap = licenseManager.canonicalPayload({
    customerName: 'T',
    hardwareId: 'abc',
    expiryDate: '2099-01-01',
    maxFixedCameras: 1,
    maxBwcDevices: 1,
    features: { tacticalOverwatch: true },
    tacticalPinLiveCap: 16,
});
assert.strictEqual(withCap.tacticalPinLiveCap, 16);
assert.strictEqual(withCap.features.tacticalOverwatch, true);

/* features must stay boolean — never coerce pin cap into features */
assert.ok(!('tacticalPinLiveCap' in (withCap.features || {})), 'pin cap not in features');

assert.ok(/ax-tactical-ar-open/.test(ui), 'UI locks Overwatch button');
assert.ok(/applyUpgradeBadge\(tactical, false\)/.test(ui), 'Tactical tab not locked on Overwatch');
assert.ok(/getTacticalPinLiveCap/.test(ui), 'UI exposes pin cap helper');
assert.ok(/license-tactical-basic-command-v1/.test(html), 'cache bust');

/* Sign round-trip with ephemeral key */
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
const doc = licenseManager.buildLicDocument({
    customerName: 'Cmd Co',
    hardwareId: licenseManager.computeHardwareId(),
    expiryDate: '2099-12-31',
    maxFixedCameras: 4,
    maxBwcDevices: 8,
    tacticalPinLiveCap: 16,
    features: { tacticalOverwatch: true },
}, privPem);
assert.strictEqual(doc.payload.tacticalPinLiveCap, 16);
const sig = licenseManager.verifySignature(doc.payload, doc.signature, pubPem);
assert.ok(sig.ok, 'signature ok with pin cap');

console.log('[ok] verify-license-tactical-basic-command-v1');
