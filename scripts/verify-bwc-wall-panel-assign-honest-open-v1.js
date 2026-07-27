'use strict';

/**
 * MOB-APPLY BWC-WALL-PANEL-ASSIGN-HONEST-OPEN-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(setupJs.includes('function openWallPanelAssignFromSettings'), 'honest open helper');
assert.ok(setupJs.includes('function expandOpsVideoWallDrawer'), 'expand wall drawer');
assert.ok(setupJs.includes("EvidenceManager.showTab('ops')"), 'switch to ops');
assert.ok(setupJs.includes('video-wall-collapsed'), 'expand collapsed class');
assert.ok(setupJs.includes('openWallPanelAssignFromSettings()'), 'button uses helper');
assert.ok(!/openDevices\.addEventListener\('click',\s*\(\)\s*=>\s*\{\s*setOpen\(false\);\s*if \(global\.VideoConfig/.test(setupJs),
  'old close-only path removed');
assert.ok(en.includes('"Assign wall panels'), 'en button rename');
assert.ok(en.includes('"server.openVideoWallHint"'), 'en hint key');
assert.ok(!en.includes('"Video Wall (6 Panels)"'), 'old 6-panel label gone');
assert.ok(indexHtml.includes('server.openVideoWallHint'), 'hint in HTML');
assert.ok(indexHtml.includes('Assign wall panels'), 'HTML fallback label');
assert.ok(!indexHtml.includes('Video wall (8 panels)'), 'old 8-panel fallback gone');
assert.ok(indexHtml.includes('bwc-wall-panel-assign-honest-open-v1'), 'cache bust');

console.log('[ok] verify-bwc-wall-panel-assign-honest-open-v1');
