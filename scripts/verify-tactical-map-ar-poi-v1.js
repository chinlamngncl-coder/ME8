'use strict';

/**
 * TACTICAL-MAP-AR-POI-V1 — static guards (Leaflet only, no AR SDK)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(html.indexOf('id="ax-tactical-poi-block"') >= 0, 'poi rail block');
assert.ok(html.indexOf('id="ax-tactical-poi-place"') >= 0, 'place btn');
assert.ok(html.indexOf('tactical-poi.js?v=20260724-tactical-map-ar-poi-v1') >= 0, 'poi script');
assert.ok(html.indexOf('tactical-map-ar-poi-v1') >= 0, 'cache bust');
assert.ok(css.indexOf('ax-tactical-poi-marker') >= 0, 'poi marker css');
const poiCode = poi.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
assert.ok(poi.indexOf('L.marker') >= 0 || poi.indexOf('L.divIcon') >= 0, 'Leaflet marker');
assert.ok(poi.indexOf('me8.tacticalPois.v1') >= 0, 'localStorage key');
assert.ok(poi.indexOf('/api/fixed-cams/') >= 0, 'fixed cam API');
assert.ok(!/\bAR\.js\b/.test(poiCode), 'no AR.js runtime');
assert.ok(!/\bCesium\b/.test(poiCode), 'no Cesium');
assert.ok(!/mapbox-gl|mapboxgl/i.test(poiCode), 'no mapbox gl');
assert.ok(!/\bWebXR\b/.test(poiCode), 'no WebXR');
assert.ok(shell.indexOf('TacticalPoi') >= 0, 'shell wires TacticalPoi');
assert.ok(en.indexOf('"tactical.poiTitle"') >= 0, 'en i18n');
assert.ok(en.indexOf('"tactical.poiOpen"') >= 0, 'en open');

console.log('[ok] verify-tactical-map-ar-poi-v1');
