'use strict';

/**
 * TACTICAL-DRAW-DELETE-LIST-UX-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(shell.indexOf('statusDeleted') >= 0, 'Deleted status');
assert.ok(shell.indexOf("activeMode !== 'delete'") >= 0 || shell.indexOf("activeMode === 'delete'") >= 0, 'delete mode');
assert.ok(shell.indexOf('onLayerClick') >= 0 || shell.indexOf('removeLayerFromState') >= 0, 'one-shot layer remove');
assert.ok(shell.indexOf('EditToolbar.Delete') < 0, 'no double-finish Delete toolbar');
assert.ok(shell.indexOf('ax-tactical-zone-badge') >= 0, 'zone badge in list HTML');
assert.ok(shell.indexOf('create-tactical-zone') < 0, 'no socket');
assert.ok(shell.indexOf('booleanPointInPolygon') < 0, 'no Turf');
assert.ok(css.indexOf('ax-tactical-zone-badge') >= 0, 'badge CSS');
assert.ok(css.indexOf('ax-tactical-zone-id') >= 0, 'id CSS');
assert.ok(en.indexOf('"tactical.statusDeleted"') >= 0, 'i18n Deleted');
assert.ok(html.indexOf('tactical-draw-delete-list-ux-v1') >= 0, 'cache bust');

console.log('[ok] verify-tactical-draw-delete-list-ux-v1');
