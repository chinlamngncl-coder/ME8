'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-DISPATCH-ROW-DENSE-V1
 * + NETWORK-SECTION-NAV-INACTIVE-WHITE-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(setupJs.includes('ss-dispatch-cell--super'), 'super admin dispatch placement');
assert.ok(setupJs.includes('ss-dispatch-cell--operator'), 'operator dispatch placement');
assert.ok(setupJs.includes('dispatchGroupPinColor'), 'pin colour from group data');
assert.ok(setupJs.includes('ss-dispatch-pin'), 'pin swatch in chip');
assert.ok(setupJs.includes('ss-dispatch-jump-groups'), 'jump to Map groups');
assert.ok(setupJs.includes("setMainTab('groups')"), 'jump handler switches tab');
assert.ok(setupJs.includes('g.name || g.id'), 'group name from data');
assert.ok(!setupJs.includes("esc('PP')") && !setupJs.includes('"PP"'), 'no hardcoded PP chip');
assert.ok(indexHtml.includes('ss-dispatch-chips'), 'chips row css');
assert.ok(indexHtml.includes('ss-dispatch-head'), 'station groups + jump head');
assert.ok(/\.ss-network-section-nav button \{[^}]*color:\s*#ffffff/.test(indexHtml)
  || /\.ss-network-section-nav button \{[^}]*color:\s*#ffffff/.test(themeCss), 'network inactive white');
assert.ok(themeCss.includes('#server-setup-panel .ss-network-section-nav button')
  && /color:\s*#ffffff/.test(themeCss), 'theme network white');
assert.ok(en.includes('"server.users.jumpToMapGroups"'), 'locale jump label');
assert.ok(indexHtml.includes('dashboard-auth-dispatch-nav-v1'), 'cache bust');

console.log('[ok] verify-dashboard-auth-dispatch-nav-v1');
