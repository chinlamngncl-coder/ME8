'use strict';

/**
 * TACTICAL-TAB-SHELL-UI-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-shell.js'), 'utf8');
const ev = fs.readFileSync(path.join(root, 'public', 'js', 'evidence-manager.js'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(html.indexOf('id="nav-tab-tactical"') >= 0, 'nav tab');
assert.ok(html.indexOf('id="app-view-tactical"') >= 0, 'app view');
assert.ok(html.indexOf('id="ax-panel-tactical"') >= 0, 'panel');
assert.ok(html.indexOf('id="ax-tactical-map"') >= 0, 'map host');
assert.ok(html.indexOf('tactical-shell.js') >= 0, 'shell script');
assert.ok(css.indexOf('TACTICAL-TAB-SHELL-UI-V1') >= 0 || css.indexOf('#ax-panel-tactical') >= 0, 'global.css scope');
assert.ok(css.indexOf('#ax-panel-tactical') >= 0, 'scoped selectors');
assert.ok(shell.indexOf('TacticalShell') >= 0, 'TacticalShell export');
assert.ok(shell.indexOf('create-tactical-zone') < 0, 'no socket yet');
assert.ok(shell.indexOf('booleanPointInPolygon') < 0, 'no Turf');
assert.ok(ev.indexOf("showTab('tactical')") >= 0, 'tab click');
assert.ok(ev.indexOf("tab !== 'tactical'") >= 0 || ev.indexOf("tab === 'tactical'") >= 0, 'showTab hide');
assert.ok(en.indexOf('"nav.tactical"') >= 0, 'i18n nav');
assert.ok(en.indexOf('"tactical.statusIdle"') >= 0, 'i18n status');

console.log('[ok] verify-tactical-tab-shell-ui-v1');
