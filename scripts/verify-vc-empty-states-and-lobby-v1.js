'use strict';

/**
 * VC-EMPTY-STATES-AND-LOBBY-V1 — static guards
 * Lobby: stage/dock hidden. In-room zero streams: placeholder, no black void.
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

assert.ok(layout.indexOf('function syncEmptyStageState') >= 0, 'syncEmptyStageState');
assert.ok(layout.indexOf('empty-stage-placeholder') >= 0, 'placeholder in layout');
assert.ok(layout.indexOf('vc-empty-stage') >= 0, 'vc-empty-stage class');
assert.ok(layout.indexOf('vc-has-streams') >= 0, 'vc-has-streams class');
assert.ok(hub.indexOf("classList.toggle('is-lobby'") >= 0, 'hub is-lobby');
assert.ok(hub.indexOf('stage.hidden = !inRoom') >= 0, 'stage.hidden from inRoom');
assert.ok(hub.indexOf('Mark meeting chrome before stage show') >= 0
    || hub.indexOf("panel.classList.add('vc-in-meeting')") >= 0, 'early in-meeting on join');
assert.ok(html.indexOf('VC-EMPTY-STATES-AND-LOBBY-V1') >= 0, 'CSS marker');
assert.ok(html.indexOf('#vc-stage[hidden]') >= 0, 'hidden display:none override');
assert.ok(html.indexOf('empty-stage-placeholder') >= 0, 'placeholder markup');
assert.ok(html.indexOf('display: none !important') >= 0, 'force hide');
assert.ok(en.indexOf('"conference.emptyStageTitle"') >= 0, 'en title');
assert.ok(en.indexOf('"conference.emptyStageBody"') >= 0, 'en body');
assert.ok(lazy.indexOf('vc-empty-states-lobby-v1') >= 0, 'lazy cache');

console.log('[ok] verify-vc-empty-states-and-lobby-v1');
