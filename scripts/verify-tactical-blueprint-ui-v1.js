'use strict';

/**
 * MOB-APPLY TACTICAL-BLUEPRINT-UI-V1 — static verify
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-blueprint-ui.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(/id="ax-tactical-bp-block"/.test(html), 'bp block in html');
assert.ok(/ax-tactical-bp-upload/.test(html) && /ax-tactical-bp-show/.test(html), 'upload+show controls');
assert.ok(/tactical-blueprint-ui\.js\?v=20260726-tactical-blueprint/.test(html), 'script cache');
assert.ok(/global\.css\?v=20260726-tactical-blueprint/.test(html), 'css cache');
assert.ok(/\.ax-tactical-bp\s*\{/.test(css), 'dark bp css');
assert.ok(/rgba\(15,\s*23,\s*42/.test(css), 'dark navy panel');
assert.ok(/TacticalBlueprintUi/.test(js), 'module export');
assert.ok(/\/api\/tactical\/blueprints\/upload/.test(js), 'upload API');
assert.ok(/imageOverlay/.test(js), 'map overlay');
assert.ok(/super_admin/.test(js), 'super admin gate');
assert.ok(/TacticalBlueprintUi\.onShow/.test(shell), 'shell hooks ui');
assert.ok(/"tactical\.bpTitle"/.test(en) && /"tactical\.bpUpload"/.test(en), 'en i18n');

console.log('[ok] verify-tactical-blueprint-ui-v1');
