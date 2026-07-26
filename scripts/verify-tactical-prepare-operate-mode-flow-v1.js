'use strict';

/**
 * TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(shell.indexOf('TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1') >= 0, 'shell marker');
assert.ok(shell.indexOf('function enterGrabMode') >= 0, 'enterGrabMode');
assert.ok(shell.indexOf('function enterPlaceMode') >= 0, 'enterPlaceMode');
assert.ok(shell.indexOf('function goIdle') >= 0, 'goIdle');
assert.ok(shell.indexOf('function syncModeBanner') >= 0, 'syncModeBanner');
assert.ok(shell.indexOf('_tacticalGrab') >= 0, 'grab flag');
assert.ok(shell.indexOf('GRAB_STYLE') >= 0, 'grab style');
assert.ok(shell.indexOf("ev.key !== 'Escape'") >= 0 || shell.indexOf('Escape') >= 0, 'Esc idle');
assert.ok(poi.indexOf('setPlaceMode: setPlaceMode') >= 0, 'export setPlaceMode');
assert.ok(poi.indexOf('Nothing in this circle') >= 0 || poi.indexOf('tactical.circleNoneIn') >= 0, 'loud empty');
assert.ok(html.indexOf('ax-tactical-prepare-block') >= 0, 'prepare block');
assert.ok(html.indexOf('ax-tactical-operate-block') >= 0, 'operate block');
assert.ok(html.indexOf('ax-tactical-grab-circle') >= 0, 'grab btn');
assert.ok(html.indexOf('ax-tactical-mode-banner') >= 0, 'banner');
assert.ok(html.indexOf('tactical-prepare-operate-mode-flow-v1') >= 0, 'cache');
assert.ok(css.indexOf('ax-tactical-mode-banner') >= 0, 'banner css');
assert.ok(en.indexOf('"tactical.prepareTitle"') >= 0, 'en prepare');
assert.ok(en.indexOf('"tactical.openGrabbed"') >= 0, 'en openGrabbed');
assert.ok(en.indexOf('"tactical.bannerGrab"') >= 0, 'en bannerGrab');

console.log('[ok] verify-tactical-prepare-operate-mode-flow-v1');
