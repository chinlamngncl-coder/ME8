'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-USER-EDIT-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));

assert.strictEqual(en['server.tab.dashboard'], 'Dashboard Authentication');
assert.ok(indexHtml.includes('Dashboard Authentication'), 'HTML tab label');
assert.ok(setupJs.includes('ss-user-username'), 'username input');
assert.ok(setupJs.includes('ss-user-display-name'), 'display name input');
assert.ok(setupJs.includes('ss-user-contact-note'), 'contact note input');
assert.ok(setupJs.includes('function readRowProfile'), 'readRowProfile');
assert.ok(/username:\s*profile\.username/.test(setupJs), 'save sends username');
assert.ok(/displayName:\s*profile\.displayName/.test(setupJs), 'save sends displayName');
assert.ok(/contactNote:\s*profile\.contactNote/.test(setupJs), 'save sends contactNote');
assert.ok(en['server.users.loginUsername'] === 'Login username', 'i18n login username');
assert.ok(indexHtml.includes('dashboard-auth-user-edit-v1'), 'cache bust');

console.log('[ok] verify-dashboard-auth-user-edit-v1');
