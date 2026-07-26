'use strict';

/**
 * TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1') >= 0, 'marker');
assert.ok(poi.indexOf('function kickPinMount') >= 0, 'kickPinMount');
assert.ok(poi.indexOf('clusterIsReal = false') >= 0, 'force plain layer');
assert.ok(poi.indexOf('L.layerGroup()') >= 0, 'layerGroup');
assert.ok(poi.indexOf('plain layerGroup') >= 0, 'plain layer comment');
assert.ok(poi.indexOf('function updateEmptyBanner') >= 0, 'empty banner');
assert.ok(poi.indexOf('countOpsGpsPins') >= 0, 'ops gps count');
assert.ok(poi.indexOf('_gpsLatLng') >= 0, 'ops gps field');
assert.ok(shell.indexOf('pin mount failed') >= 0, 'shell no silent swallow');
assert.ok(css.indexOf('ax-tactical-pin-empty') >= 0, 'empty css');
assert.ok(html.indexOf('ax-tactical-pin-empty') >= 0, 'empty html');
assert.ok(
    html.indexOf('tactical-pin-mount-prove-v1') >= 0
    || html.indexOf('tactical-pin-spread-ops-coloc-v1') >= 0,
    'cache'
);
assert.ok(en.indexOf('"tactical.pinMountEmptyMap"') >= 0, 'en empty map');
assert.ok(en.indexOf('"tactical.pinMountOpsButEmpty"') >= 0, 'en ops but empty');

console.log('[ok] verify-tactical-pin-mount-prove-v1');
