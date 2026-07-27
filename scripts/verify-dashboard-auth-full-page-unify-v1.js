'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-FULL-PAGE-UNIFY
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');

const usersStart = indexHtml.indexOf('id="ss-users-section"');
const usersEnd = indexHtml.indexOf('id="ss-my-account-section"');
assert.ok(usersStart > 0 && usersEnd > usersStart, 'users section bounds');
const usersBlock = indexHtml.slice(usersStart, usersEnd);

assert.ok(/id="ss-users-list-section"[\s\S]*class="ss-config-section"|class="ss-config-section"[\s\S]*id="ss-users-list-section"/.test(usersBlock)
  || /<div class="ss-config-section" id="ss-users-list-section">/.test(usersBlock), 'list section');
assert.ok(/<div class="ss-config-section" id="ss-users-add-section">/.test(usersBlock), 'add section');
assert.ok(/id="ss-tech-pin-section" class="ss-config-section"/.test(indexHtml), 'IT PIN section');

assert.ok(!/<table class="ss-users-table">/.test(usersBlock), 'no wide users table');
assert.ok(!/min-width:\s*2240px/.test(indexHtml), 'no 2240px horizontal force');
assert.ok(/id="ss-users-body" class="ss-users-list"/.test(usersBlock), 'users list body');

assert.ok(/ADD NEW OPERATOR/.test(usersBlock), 'add operator header');
assert.ok(/id="ss-users-add-section"[\s\S]*ss-east-west-grid[\s\S]*id="ss-new-user"[\s\S]*id="ss-new-role"/.test(usersBlock), 'identity east-west');
assert.ok(/id="ss-new-pass"[\s\S]*id="ss-new-admin-pass"/.test(usersBlock), 'password pair kept');
assert.ok(/ss-east-west-grid[\s\S]*id="ss-new-pass"[\s\S]*id="ss-new-admin-pass"/.test(usersBlock), 'password east-west');

['ss-new-user', 'ss-new-display-name', 'ss-new-contact-note', 'ss-new-role', 'ss-new-pass', 'ss-new-admin-pass', 'ss-add-user', 'ss-superadmin-count'].forEach(function (id) {
  assert.ok(usersBlock.indexOf('id="' + id + '"') >= 0, 'id ' + id);
});

[
  'ss-user-map-control', 'ss-user-kill-switch', 'ss-user-geofence', 'ss-user-clear-map-pins',
  'ss-user-evidence-view', 'ss-user-evidence-dl', 'ss-user-evidence-export', 'ss-user-evidence-edit',
  'ss-user-dock-admin', 'ss-user-conference-view', 'ss-user-conference-join', 'ss-user-conference-host',
  'ss-user-conference-record', 'ss-user-conference-bwc', 'ss-user-conference-cross',
  'ss-user-audit-view', 'ss-user-audit-export', 'ss-user-signin-from', 'ss-user-signin-exp',
  'ss-user-evidence-exp', 'ss-user-see-all-groups', 'ss-user-dispatch-grp', 'ss-user-save',
].forEach(function (cls) {
  assert.ok(setupJs.indexOf(cls) >= 0, 'binding class ' + cls);
});

assert.ok(/function closestUserRow/.test(setupJs), 'closestUserRow');
assert.ok(/ss-config-section[\s\S]*data-user-id/.test(setupJs) || /class="ss-config-section/.test(setupJs) && /data-user-id=/.test(setupJs), 'card row render');
assert.ok(/System/.test(setupJs) && /Evidence/.test(setupJs) && /Video Conference/.test(setupJs) && /Audit/.test(setupJs), 'perm groups');
assert.ok(/ss-east-west-grid/.test(setupJs), 'tier grids in render');
assert.ok(/dashboard-auth-full-page-unify-v1/.test(indexHtml), 'cache bust');
assert.ok(/#ss-users-body\.ss-users-list/.test(themeCss) || /#ss-users-body\.ss-users-list/.test(indexHtml), 'list theme');

console.log('[ok] verify-dashboard-auth-full-page-unify-v1');
