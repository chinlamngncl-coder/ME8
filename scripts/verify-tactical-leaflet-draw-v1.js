'use strict';

/**
 * TACTICAL-LEAFLET-DRAW-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');
const drawJs = path.join(root, 'public', 'vendor', 'leaflet-draw', 'leaflet.draw.js');
const drawCss = path.join(root, 'public', 'vendor', 'leaflet-draw', 'leaflet.draw.css');

assert.ok(fs.existsSync(drawJs), 'leaflet.draw.js vendored');
assert.ok(fs.existsSync(drawCss), 'leaflet.draw.css vendored');
assert.ok(html.indexOf('leaflet-draw/leaflet.draw.js') >= 0, 'draw js linked');
assert.ok(html.indexOf('leaflet-draw/leaflet.draw.css') >= 0, 'draw css linked');
assert.ok(html.indexOf('id="ax-tactical-draw-polygon"') >= 0, 'polygon btn');
assert.ok(html.indexOf('id="ax-tactical-draw-circle"') >= 0, 'circle btn');
assert.ok(html.indexOf('tactical-leaflet-draw-v1') >= 0, 'cache bust');
assert.ok(css.indexOf('#ax-panel-tactical.ax-tactical-shell') >= 0, 'tactical shell grid');
assert.ok(/@media \(max-width: 900px\)[\s\S]*?#ax-panel-tactical\.ax-tactical-shell[\s\S]*?\}\s*\}/.test(css), 'tactical media closed cleanly');
assert.ok(shell.indexOf('L.Draw') >= 0, 'uses L.Draw');
assert.ok(shell.indexOf('toGeoJSON') >= 0, 'GeoJSON stub');
assert.ok(shell.indexOf('create-tactical-zone') < 0, 'no socket');
assert.ok(shell.indexOf('booleanPointInPolygon') < 0, 'no Turf');
assert.ok(shell.indexOf('startPlay') < 0, 'no media hook');
assert.ok(en.indexOf('"tactical.statusNeedIncident"') >= 0, 'i18n need incident');
assert.ok(en.indexOf('"tactical.statusSaved"') >= 0, 'i18n saved');

console.log('[ok] verify-tactical-leaflet-draw-v1');
