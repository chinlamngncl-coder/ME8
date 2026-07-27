'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-USER-CARD-DENSE-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');

assert.ok(/#ss-users-body \.ss-role-scope-cell[\s\S]*flex-direction:\s*row/.test(indexHtml)
  || /#ss-users-body \.ss-role-scope-cell[\s\S]*flex-direction:\s*row/.test(themeCss)
  || /\.ss-role-scope-cell \{[^}]*flex-direction:\s*row/.test(indexHtml), 'role badges row');
assert.ok(/#ss-users-body \.ss-user-card \{[^}]*padding:\s*8px/.test(indexHtml)
  || /#ss-users-body \.ss-user-card \{[^}]*padding:\s*8px/.test(themeCss), 'tighter card pad');
assert.ok(/#ss-users-body[\s\S]*color:\s*#e2e8f0/.test(indexHtml)
  || /#ss-users-body[\s\S]*color:\s*#e2e8f0/.test(themeCss), 'brighter labels');
assert.ok(indexHtml.includes('dashboard-auth-user-card-dense-v1'), 'cache bust');

console.log('[ok] verify-dashboard-auth-user-card-dense-v1');
