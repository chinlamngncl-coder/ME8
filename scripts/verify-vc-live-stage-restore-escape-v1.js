'use strict';

/**
 * VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1 — static guards
 * Caps stay 8/6/4 (BWC6 disc OK — no raise here).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'public', 'js', 'conference-layout.js'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'public', 'js', 'conference-hub.js'), 'utf8');
const lazy = fs.readFileSync(path.join(root, 'public', 'js', 'vc-lazy.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(layout.indexOf('function exitFocusToSpeaker') >= 0, 'exitFocusToSpeaker');
assert.ok(layout.indexOf('syncExitFocusBtn') >= 0, 'exit focus button');
assert.ok(layout.indexOf('layoutFocusTile') >= 0, 'Focus tile label');
assert.ok(layout.indexOf("textContent = '⤢'") < 0, 'no expand glyph on pin');
assert.ok(/MAX_SHARE_TILES\s*=\s*4/.test(layout), 'share cap still 4');
assert.ok(/MAX_PEOPLE\s*=\s*8/.test(layout), 'people cap still 8');
assert.ok(/FILMSTRIP_MAX\s*=\s*6/.test(layout), 'filmstrip still 6');
assert.ok(hub.indexOf('function vcToast') >= 0, 'vcToast');
assert.ok(hub.indexOf('bwcAddOk') >= 0 || hub.indexOf('LIVE') >= 0, 'BWC success toast');
assert.ok(lazy.indexOf('vc-live-stage-restore-escape-v1') >= 0, 'lazy cache');
assert.ok(html.indexOf('VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1') >= 0, 'restore CSS');
assert.ok(html.indexOf('vc-exit-focus') >= 0, 'exit focus css');
assert.ok(en.indexOf('"conference.exitFocus"') >= 0, 'en exitFocus');
assert.ok(en.indexOf('"conference.bwcAddOk"') >= 0, 'en bwcAddOk');

console.log('[ok] verify-vc-live-stage-restore-escape-v1');
