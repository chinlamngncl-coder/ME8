'use strict';

/**
 * TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1 — static guards
 * (Superseded in part by BWC-PIN-CYCLE; keep soft checks on shared pin path.)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(poi.indexOf('function openPoiPinLive') >= 0, 'openPoiPinLive');
assert.ok(poi.indexOf('liveByPoi') >= 0, 'multi live map');
assert.ok(poi.indexOf('autoClose: false') >= 0, 'multi popup');
assert.ok(poi.indexOf('circleOpenedPinsOk') >= 0 || poi.indexOf('tactical.circleOpenedPinsOk') >= 0, 'pins toast');
assert.ok(html.indexOf('tactical-poi.js') >= 0, 'poi script');
assert.ok(en.indexOf('"tactical.circleOpenedPinsOk"') >= 0, 'en pins ok');

console.log('[ok] verify-tactical-open-grabbed-pin-popup-live-v1');
