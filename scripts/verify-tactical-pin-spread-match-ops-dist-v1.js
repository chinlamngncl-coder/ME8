'use strict';

/**
 * TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1') >= 0, 'marker');
assert.ok(poi.indexOf('SPREAD_MIN_ZOOM = 16') >= 0, 'min zoom 16');
assert.ok(poi.indexOf('Math.max(58, 38 + cluster.length * 14)') >= 0, 'exact Ops distPx');
assert.ok(poi.indexOf('Math.max(90, 56 + cluster.length * 22)') < 0, 'wide formula removed');
assert.ok(poi.indexOf('allowSpread') >= 0, 'zoom gate');
assert.ok(html.indexOf('tactical-pin-spread-match-ops-dist-v1') >= 0, 'cache');

console.log('[ok] verify-tactical-pin-spread-match-ops-dist-v1');
