'use strict';

/**
 * MOB-APPLY TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const ctx = fs.readFileSync(path.join(root, 'lib', 'tenantContext.js'), 'utf8');
const mw = fs.readFileSync(path.join(root, 'lib', 'tenantMiddleware.js'), 'utf8');
const tio = fs.readFileSync(path.join(root, 'lib', 'tenantIo.js'), 'utf8');
const lic = fs.readFileSync(path.join(root, 'lib', 'licenseManager.js'), 'utf8');
const cssUnify = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const roadmap = fs.readFileSync(
    path.join(root, 'docs', 'MOB-DISC-ENTERPRISE-SAAS-MULTI-TENANT-ROADMAP-20260726.md'),
    'utf8',
);

assert.ok(/resolveTenantContext/.test(ctx) && /orgRoom/.test(ctx), 'tenantContext');
assert.ok(/requireValidTenantLicense/.test(mw) && /socketTenantGuard/.test(mw), 'middleware');
assert.ok(/joinOrgRoom/.test(mw), 'join room');
assert.ok(/installTenantIo/.test(tio) && /emitToOrg/.test(tio), 'tenantIo');
assert.ok(/tenantIo\.installTenantIo\(io\)/.test(server), 'io wrap wired');
assert.ok(/socketTenantGuard/.test(server), 'socket guard wired');
assert.ok(/attachTenantContext/.test(server), 'express attach');
assert.ok(/requireValidLicenseWhenEnforced/.test(server), 'api enforce');
assert.ok(/joinOrgRoom\(socket\)/.test(server), 'connection join');
assert.ok(/orgId/.test(lic) && /payload\.orgId/.test(lic), 'license orgId optional');
assert.ok(/ss-east-west-grid/.test(cssUnify) || /ss-east-west-grid/.test(indexHtml), 'east-west ref');
assert.ok(/#ss-panel-cloud/.test(indexHtml), 'cloud panel css');
assert.ok(/Steps 2–4|Step 2/.test(roadmap) && /UI\/UX mandates/.test(roadmap), 'roadmap');

const tenantContext = require('../lib/tenantContext');
const t = tenantContext.resolveTenantContext();
assert.ok(t && t.orgId, 'resolve orgId');
assert.ok(tenantContext.orgRoom('acme') === 'org:acme', 'room name');

console.log('[ok] verify-tenant-middleware-and-css-review-v1');
