'use strict';

/**
 * TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1 — static guards
 * (superseded mount path may use plain layerGroup — chrome + status still required)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1') >= 0, 'marker');
assert.ok(poi.indexOf('ax-tactical-pin-label') >= 0, 'label chrome');
assert.ok(poi.indexOf('ax-tactical-pin-dot') >= 0, 'dot chrome');
assert.ok(poi.indexOf('iconSize: [110, 52]') >= 0, 'ops-size icon');
assert.ok(poi.indexOf('function updatePinMountStatus') >= 0, 'mount status');
assert.ok(
    poi.indexOf('markerClusterGroup failed') >= 0
    || poi.indexOf('plain layerGroup') >= 0
    || poi.indexOf('L.layerGroup()') >= 0,
    'layer path'
);
assert.ok(poi.indexOf('offline: !online') >= 0, 'offline flag on icon');
assert.ok(css.indexOf('ax-tactical-pin-label') >= 0, 'pin css');
assert.ok(
    html.indexOf('tactical-pin-fullview-ops-chrome-v1') >= 0
    || html.indexOf('tactical-pin-mount-prove-v1') >= 0,
    'cache'
);
assert.ok(en.indexOf('"tactical.pinMountEmpty"') >= 0, 'en empty');
assert.ok(en.indexOf('"tactical.pinMountCount"') >= 0, 'en count');

console.log('[ok] verify-tactical-pin-fullview-ops-chrome-v1');
