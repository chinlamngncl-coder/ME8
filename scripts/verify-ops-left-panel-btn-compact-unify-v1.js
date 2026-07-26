'use strict';

/**
 * OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1 — static guards
 * Ops #sidebar buttons match Open All / Clear map pins compact size.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(css.indexOf('OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1') >= 0, 'CSS marker');
assert.ok(css.indexOf('#sidebar .btn.btn-action') >= 0, 'sidebar action compact');
assert.ok(css.indexOf('#sidebar .btn.btn-ghost') >= 0, 'sidebar ghost compact');
assert.ok(/padding:\s*4px\s+8px/.test(css), 'padding 4px 8px');
assert.ok(/font-size:\s*10px/.test(css), 'font-size 10px');
assert.ok(html.indexOf('ops-left-panel-btn-compact-unify-v1') >= 0, 'global.css cache bust');
assert.ok(html.indexOf('OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1') >= 0, 'index marker');

console.log('[ok] verify-ops-left-panel-btn-compact-unify-v1');
