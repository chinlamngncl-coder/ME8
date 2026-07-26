'use strict';

/**
 * TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1 — static guards
 * Mount-prove MOB may use plain layerGroup; team color + live BWC sync still required.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1') >= 0, 'marker');
assert.ok(poi.indexOf('function teamColorForCam') >= 0, 'teamColorForCam');
assert.ok(poi.indexOf('function ensureCluster') >= 0, 'ensureCluster');
assert.ok(
    poi.indexOf('markerClusterGroup') >= 0 || poi.indexOf('L.layerGroup()') >= 0,
    'pin layer'
);
assert.ok(poi.indexOf('function syncLiveBwcPins') >= 0, 'syncLiveBwcPins');
assert.ok(poi.indexOf('dispatchGroupLookup') >= 0, 'dispatchGroupLookup');
assert.ok(poi.indexOf('poiIcon') < 0, 'no hardcoded poiIcon');
assert.ok(poi.indexOf('grabBwcIcon') < 0, 'no grabBwcIcon');
assert.ok(poi.indexOf('grabPinGroup') < 0, 'no grabPinGroup');
assert.ok(
    /ax-tactical-poi-marker-inner[\s\S]{0,200}#64748b/.test(css)
    || css.indexOf('ax-tactical-pin-dot') >= 0,
    'pin chrome'
);
assert.ok(
    html.indexOf('tactical-pin-cluster-team-color-v1') >= 0
    || html.indexOf('tactical-pin-fullview-ops-chrome-v1') >= 0
    || html.indexOf('tactical-pin-mount-prove-v1') >= 0,
    'cache'
);

console.log('[ok] verify-tactical-pin-cluster-team-color-v1');
