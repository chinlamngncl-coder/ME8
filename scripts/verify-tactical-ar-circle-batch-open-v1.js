'use strict';

/**
 * TACTICAL-AR-CIRCLE-BATCH-OPEN-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(shell.indexOf('TACTICAL-AR-CIRCLE-BATCH-OPEN-V1') >= 0, 'shell marker');
assert.ok(shell.indexOf('function getGrabCircle') >= 0, 'getGrabCircle');
assert.ok(shell.indexOf('getGrabCircle: getGrabCircle') >= 0, 'export getGrabCircle');
assert.ok(poi.indexOf('function openInCircle') >= 0, 'openInCircle');
assert.ok(poi.indexOf('CIRCLE_OPEN_CAP') >= 0, 'cap');
assert.ok(poi.indexOf('openInCircle: openInCircle') >= 0, 'export openInCircle');
assert.ok(html.indexOf('ax-tactical-open-in-circle') >= 0, 'button');
assert.ok(html.indexOf('tactical-shell.js') >= 0, 'shell script');
assert.ok(en.indexOf('"tactical.openInCircle"') >= 0 || en.indexOf('"tactical.openGrabbed"') >= 0, 'en open label');
assert.ok(en.indexOf('"tactical.circleOpenedWallFull"') >= 0, 'en wall full');

console.log('[ok] verify-tactical-ar-circle-batch-open-v1');
