#!/usr/bin/env node
'use strict';

/**
 * Task 3.4 — entitlements helpers + middleware + API surface (static verify).
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const licenseManager = require(path.join(root, 'lib', 'licenseManager'));
const mw = require(path.join(root, 'lib', 'licenseEntitlementsMw'));

process.env.FM_AIRGAP_LICENSE_REQUIRED = '0';
licenseManager.init({
    storageDir: path.join(root, 'storage'),
    baseDir: root,
});
licenseManager.invalidateCache();

assert.strictEqual(typeof licenseManager.hasFeature, 'function');
assert.strictEqual(typeof licenseManager.checkFixedCamLimit, 'function');
assert.strictEqual(typeof licenseManager.checkBwcLimit, 'function');
assert.strictEqual(typeof licenseManager.getPublicEntitlements, 'function');
assert.strictEqual(typeof mw.requireFeature, 'function');
assert.strictEqual(typeof mw.checkFixedCamCapacity, 'function');
assert.strictEqual(typeof mw.checkBwcCapacity, 'function');

/* Lab open — no required license */
assert.strictEqual(licenseManager.hasFeature('tacticalOverwatch'), true);
assert.strictEqual(licenseManager.checkFixedCamLimit(999).allowed, true);
assert.strictEqual(licenseManager.checkBwcLimit(999).allowed, true);
const pub = licenseManager.getPublicEntitlements();
assert.ok(pub.labOpen === true || pub.licensed === true);

const serverSrc = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
assert.ok(serverSrc.includes("/api/license/entitlements"));
assert.ok(serverSrc.includes('ERR_LIC_CAM_LIMIT_EXCEEDED') || serverSrc.includes('checkFixedCamCapacity'));
assert.ok(serverSrc.includes("requireFeature('ptzControl')"));

const ui = fs.readFileSync(path.join(root, 'public', 'js', 'license-entitlements-ui.js'), 'utf8');
assert.ok(ui.includes('/api/license/entitlements'));
assert.ok(ui.includes('Upgrade License'));

const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
assert.ok(indexHtml.includes('license-entitlements-ui.js'));

console.log('[ok] verify-license-entitlements-v1');
