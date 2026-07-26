'use strict';

/**
 * TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1') >= 0, 'marker');
assert.ok(poi.indexOf('function spreadColocatedMarkers') >= 0, 'spread');
assert.ok(poi.indexOf('COLOC_CLUSTER_M') >= 0, 'coloc meters');
assert.ok(poi.indexOf('SPREAD_BEARINGS_DEG') >= 0, 'bearings');
assert.ok(poi.indexOf('_gpsLatLng') >= 0, 'true gps');
assert.ok(poi.indexOf('function setMarkerTrueGps') >= 0, 'set true gps');
assert.ok(poi.indexOf('latLngToLayerPoint') >= 0, 'pixel spread');
assert.ok(poi.indexOf('bindSpreadMapEvents') >= 0, 'zoom/move re-spread');
assert.ok(poi.indexOf('spreadColocatedMarkers()') >= 0, 'called');
assert.ok(
    html.indexOf('tactical-pin-spread-ops-coloc-v1') >= 0
    || html.indexOf('tactical-pin-spread-match-ops-dist-v1') >= 0
    || html.indexOf('tactical-pin-mount-prove-v1') >= 0,
    'cache'
);

console.log('[ok] verify-tactical-pin-marker-spread-ops-coloc-v1');
