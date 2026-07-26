'use strict';

/**
 * MOB-APPLY TACTICAL-BLUEPRINT-CLEAR-REMOVE-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-blueprint-ui.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const siteDb = fs.readFileSync(path.join(root, 'lib', 'siteDb.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

JSON.parse(en);

assert.ok(/id="ax-tactical-bp-clear"/.test(html), 'clear button');
assert.ok(/id="ax-tactical-bp-remove"/.test(html), 'remove button');
assert.ok(/tactical-blueprint-ui\.js\?v=20260726-tactical-blueprint-(clear-remove|zero-raw)-v1/.test(html), 'cache');
assert.ok(/doClearFromMap/.test(js) && /doRemovePlan/.test(js), 'handlers');
assert.ok(/method:\s*'DELETE'/.test(js), 'client DELETE');
assert.ok(/app\.delete\(\s*'\/api\/tactical\/blueprints\/:id'/.test(server), 'delete route');
assert.ok(/deleteTacticalBlueprint/.test(siteDb) && /deleteTacticalBlueprint/.test(server), 'siteDb delete');
assert.ok(/"tactical\.bpClear"/.test(en) && /"tactical\.bpRemove"/.test(en), 'i18n');

console.log('[ok] verify-tactical-blueprint-clear-remove-v1');
