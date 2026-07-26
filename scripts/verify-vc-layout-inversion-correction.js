'use strict';

/**
 * MOB-FIX-VC-LAYOUT-INVERSION-CORRECTION — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'public', 'js', 'conference-layout.js'), 'utf8');
const lazy = fs.readFileSync(path.join(root, 'public', 'js', 'vc-lazy.js'), 'utf8');

assert.ok(html.indexOf('MOB-FIX-VC-LAYOUT-INVERSION-CORRECTION') >= 0, 'fix marker');
assert.ok(html.indexOf('flex: 1 1 0% !important') >= 0, 'stage flex fill');
assert.ok(html.indexOf('flex-direction: row !important') >= 0, 'speaker row');
assert.ok(html.indexOf('flex: 0 0 96px !important') >= 0, 'ops strip thin footer only');
assert.ok(html.indexOf('position: absolute') >= 0 && html.indexOf('inset: 0') >= 0, 'spotlight tile fill');
assert.ok(html.indexOf('grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))') >= 0, 'gallery grid');
assert.ok(layout.indexOf("missionMode === 'operations' && mode === 'split'") >= 0
    || layout.indexOf("missionMode === 'speaker' || missionMode === 'operations'") >= 0,
    'operations without share uses speaker chrome');
assert.ok(lazy.indexOf('vc-layout-inversion-correction') >= 0, 'cache bust');

console.log('[ok] verify-vc-layout-inversion-correction');
