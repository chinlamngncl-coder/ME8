'use strict';

/**
 * VC-UI-COMPACT-LAYOUT-FIX-V1 — static guards (CSS/layout only)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const lazy = fs.readFileSync(path.join(root, 'public', 'js', 'vc-lazy.js'), 'utf8');

assert.ok(html.indexOf('VC-UI-COMPACT-LAYOUT-FIX-V1') >= 0, 'compact marker in CSS');
assert.ok(html.indexOf('aspect-ratio: 16 / 9') >= 0, '16:9 strip tiles');
assert.ok(html.indexOf('object-fit: contain') >= 0, 'object-fit contain');
assert.ok(
    html.indexOf('#vc-panel-live.vc-in-meeting .vc-room-card') >= 0,
    'compact in-meeting room cards'
);
assert.ok(
    html.indexOf('.vc-stage.vc-client-v1 .vc-stage-body.vc-mode-operations.vc-mode-deploy .vc-gallery-grid .vc-tile') >= 0,
    'operations strip tile override'
);
assert.ok(lazy.indexOf('vc-ui-compact-layout-fix-v1') >= 0, 'cache bust');
assert.ok(html.indexOf('vc-ui-compact-layout-fix-v1') >= 0, 'vc-lazy cache in html');

console.log('[ok] verify-vc-ui-compact-layout-fix-v1');
