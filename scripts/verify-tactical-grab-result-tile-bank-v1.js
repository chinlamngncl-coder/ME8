'use strict';

/**
 * TACTICAL-GRAB-RESULT-TILE-BANK-V1 — soft guards (REJECTED layout; bank removed)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');

/* Rejected product face — bank must stay out of grab path */
assert.ok(html.indexOf('ax-tactical-tile-bank') < 0, 'bank html removed');
assert.ok(poi.indexOf('fillTileBank') < 0, 'no fillTileBank');
assert.ok(poi.indexOf('TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1') >= 0, 'spiderfy succeeded');

console.log('[ok] verify-tactical-grab-result-tile-bank-v1 (rejected; bank gone)');
