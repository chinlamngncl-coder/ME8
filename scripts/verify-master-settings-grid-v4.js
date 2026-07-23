'use strict';

/**
 * MASTER-SETTINGS-GRID-AND-RULES-V4 — East-to-West + .cursorrules memory
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rules = fs.readFileSync(path.join(root, '.cursorrules'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');

assert.ok(rules.indexOf('ENTERPRISE FORM & GRID LAYOUT RULES') >= 0);
assert.ok(rules.indexOf('repeat(auto-fit, minmax(350px, 1fr))') >= 0);
assert.ok(rules.indexOf('max-width: 420px') >= 0);
assert.ok(rules.indexOf('FUNCTIONAL PRESERVATION') >= 0);

assert.ok(html.indexOf('ss-east-west-grid') >= 0);
assert.ok(html.indexOf('id="cd-site-reference"') >= 0);
assert.ok(html.indexOf('id="cd-operator-url"') >= 0);
assert.ok(html.indexOf('id="ss-new-user"') >= 0);
assert.ok(html.indexOf('id="ss-add-user"') >= 0);
assert.ok(html.indexOf('id="server-setup-save"') >= 0);
assert.ok(html.indexOf('id="server-setup-cancel"') >= 0);
assert.ok(html.indexOf('master-settings-grid-v4') >= 0 || html.indexOf('settings-theme-unify.css') >= 0);

assert.ok(css.indexOf('MASTER-SETTINGS-GRID-AND-RULES-V4') >= 0);
assert.ok(css.indexOf('repeat(auto-fit, minmax(350px, 1fr))') >= 0);
assert.ok(css.indexOf('max-width: 420px') >= 0);
assert.ok(css.indexOf('justify-content: space-between') >= 0);
assert.ok(css.indexOf('flex-direction: column') >= 0);

console.log('[ok] verify-master-settings-grid-v4');
