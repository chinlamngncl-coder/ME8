'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-POLISH-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));

assert.ok(indexHtml.includes('id="ss-dash-sub-add"'), 'subtab add');
assert.ok(indexHtml.includes('id="ss-dash-sub-users"'), 'subtab users');
assert.ok(indexHtml.includes('id="ss-dash-sub-me"'), 'subtab me');
assert.ok(!indexHtml.includes('id="ss-dash-sub-operators"'), 'old operators subtab removed');

const addIdx = indexHtml.indexOf('id="ss-users-add-section"');
const listIdx = indexHtml.indexOf('id="ss-users-list-section"');
assert.ok(addIdx > 0 && listIdx > addIdx, 'add section before list section');

assert.ok(indexHtml.includes('Add New Admin / Operator'), 'title text');
assert.ok(indexHtml.includes('ss-users-add-actions'), 'save actions wrap');
assert.ok(/ss-users-add-actions[\s\S]*id="ss-add-user"/.test(indexHtml), 'save inside wrap');

assert.ok(/let activeDashSubTab = 'add'/.test(setupJs), 'default add tab');
assert.ok(/setDashSubTab\('users'\)/.test(setupJs), 'jump to users after create');
assert.ok(/highlightUserRow\(createdName\)/.test(setupJs), 'highlight new user');
assert.ok(/tab === 'users' \|\| tab === 'operators'/.test(setupJs), 'operators alias');

assert.ok(themeCss.includes('appearance: none'), 'custom checkbox');
assert.ok(themeCss.includes(':checked::after'), 'visible tick mark');
assert.ok(themeCss.includes('ss-users-add-actions'), 'save size CSS');
assert.ok(themeCss.includes('justify-self: start'), 'no full-bleed button');

assert.strictEqual(en['server.users.colClearMapPins'], 'Clear map pins');
assert.strictEqual(en['server.users.addNewAdminOperator'], 'Add New Admin / Operator');
assert.strictEqual(en['server.dashSub.usersAuthority'], 'Users & authority');

assert.ok(indexHtml.includes('dashboard-auth-polish-v1'), 'cache bust');

[
  'ss-new-user', 'ss-new-pass', 'ss-new-admin-pass', 'ss-add-user', 'ss-users-body',
  'ss-user-kill-switch', 'ss-user-map-control', 'ss-user-clear-map-pins',
].forEach(function (token) {
  assert.ok(indexHtml.includes(token) || setupJs.includes(token), 'kept ' + token);
});

console.log('[ok] verify-dashboard-auth-polish-v1');
