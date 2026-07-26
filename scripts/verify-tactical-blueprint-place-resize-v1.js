'use strict';

/**
 * MOB-APPLY TACTICAL-BLUEPRINT-PLACE-RESIZE-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-blueprint-ui.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const siteDb = fs.readFileSync(path.join(root, 'lib', 'siteDb.js'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'db', 'migrations', '006_tactical_blueprint_placement.sql'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(/ax-tactical-bp-adjust/.test(html) && /ax-tactical-bp-save-place/.test(html), 'adjust UI');
assert.ok(/ax-tactical-bp-opacity/.test(html), 'opacity');
assert.ok(/tactical-blueprint-ui\.js\?v=20260726-tactical-blueprint-place-resize-v1/.test(html), 'js cache');
assert.ok(/global\.css\?v=20260726-tactical-blueprint-place-resize-v1/.test(html), 'css cache');
assert.ok(/ax-tactical-bp-corner/.test(css), 'corner css');
assert.ok(/startAdjustMode/.test(js) && /doSavePlacement/.test(js), 'adjust+save');
assert.ok(/aspect lock|\/ aspect/.test(js) || /widthM \/ aspect/.test(js), 'aspect lock');
assert.ok(/\/api\/tactical\/blueprints\/:id\/placement/.test(server)
    || /\/api\/tactical\/blueprints\/:id\/placement/.test(server.replace(/\\/g, '')), 'patch route');
assert.ok(/updateTacticalBlueprintPlacement/.test(siteDb) && /updateTacticalBlueprintPlacement/.test(server), 'siteDb+route');
assert.ok(/006_tactical_blueprint_placement\.sql/.test(siteDb), 'migration wired');
assert.ok(/schema_version\) < 6/.test(siteDb), 'schema >= 6');
assert.ok(/placement_south/.test(sql), 'sql columns');
assert.ok(/"tactical\.bpAdjust"/.test(en) && /"tactical\.bpSavePlace"/.test(en), 'i18n');

console.log('[ok] verify-tactical-blueprint-place-resize-v1');
