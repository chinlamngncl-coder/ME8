'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-USER-CARD-COMPACT-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');

assert.ok(setupJs.includes('ss-user-tier-id'), 'identity tier');
assert.ok(setupJs.includes('ss-user-tier-ops'), 'ops tier');
assert.ok(!setupJs.includes('ss-user-tier1'), 'old tall tier1 gone');
assert.ok(!setupJs.includes('ss-user-identity'), 'no stacked identity column');
assert.ok(setupJs.includes('ss-user-username'), 'username kept');
assert.ok(setupJs.includes('ss-user-display-name'), 'display kept');
assert.ok(setupJs.includes('ss-user-contact-note'), 'contact kept');
assert.ok(themeCss.includes('ss-user-tier-id') || indexHtml.includes('ss-user-tier-id'), 'tier CSS');
assert.ok(indexHtml.includes('dashboard-auth-user-card-compact-v1'), 'cache bust');

console.log('[ok] verify-dashboard-auth-user-card-compact-v1');
