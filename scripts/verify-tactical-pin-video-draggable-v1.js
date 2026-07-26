'use strict';

/**
 * TACTICAL-PIN-VIDEO-DRAGGABLE-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-PIN-VIDEO-DRAGGABLE-V1') >= 0, 'marker');
assert.ok(poi.indexOf('function enablePopupDrag') >= 0, 'enablePopupDrag');
assert.ok(poi.indexOf('ax-tactical-poi-popup-drag') >= 0, 'drag handle html');
assert.ok(poi.indexOf('enablePopupDrag(marker)') >= 0, 'wired on open');
assert.ok(css.indexOf('ax-tactical-poi-popup-drag') >= 0, 'drag css');
assert.ok(html.indexOf('tactical-pin-video-draggable-v1') >= 0, 'cache');
assert.ok(en.indexOf('"tactical.poiDragHint"') >= 0, 'en hint');

console.log('[ok] verify-tactical-pin-video-draggable-v1');
