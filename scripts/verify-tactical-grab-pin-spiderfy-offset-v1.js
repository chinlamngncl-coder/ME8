'use strict';

/**
 * TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1') >= 0, 'marker');
assert.ok(poi.indexOf('function assignSpiderOffsets') >= 0, 'spiderfy');
assert.ok(poi.indexOf('SPIDER_OFFSETS') >= 0, 'offsets');
assert.ok(poi.indexOf('setPopupOffset') >= 0, 'popup offset');
assert.ok(poi.indexOf('fillTileBank') < 0, 'no fillTileBank');
assert.ok(poi.indexOf('setTileBankVisible') < 0, 'no tile bank show');

const applyBody = (poi.split('function applyGrabWindow')[1] || '').split('function grabCycleStep')[0] || '';
assert.ok(applyBody.indexOf('assignSpiderOffsets') >= 0, 'apply uses spider');
assert.ok(applyBody.indexOf('openTargetPinLive') >= 0, 'apply uses pin live');
assert.ok(applyBody.indexOf('fillTileBank') < 0, 'apply no bank');

assert.ok(html.indexOf('ax-tactical-tile-bank') < 0, 'no bank html');
assert.ok(html.indexOf('ax-tactical-grab-cycle') >= 0, 'cycle on rail');
assert.ok(html.indexOf('tactical-grab-pin-spiderfy-offset-v1') >= 0, 'cache');
assert.ok(en.indexOf('"tactical.circleOpenedPinsSpider"') >= 0, 'en spider toast');

console.log('[ok] verify-tactical-grab-pin-spiderfy-offset-v1');
