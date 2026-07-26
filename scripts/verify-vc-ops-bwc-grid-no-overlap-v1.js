'use strict';

/**
 * VC-OPS-BWC-GRID-NO-OVERLAP-V1 — static guards
 * Operations spotlight tiles are grid cells (BWC + fixed), not absolute stack.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(html.indexOf('VC-OPS-BWC-GRID-NO-OVERLAP-V1') >= 0, 'CSS marker');
assert.ok(
    /layout-operations[\s\S]{0,800}position:\s*relative\s*!important/.test(html),
    'ops tiles position relative'
);
assert.ok(
    /layout-operations[\s\S]{0,800}inset:\s*auto\s*!important/.test(html),
    'ops tiles inset auto'
);
assert.ok(
    /vc-mode-operations\.vc-mode-deploy[\s\S]{0,400}display:\s*grid\s*!important/.test(html),
    'ops spotlight grid !important'
);
/* Speaker/Focus absolute full-bleed must remain */
assert.ok(
    /\.vc-stage\.vc-client-v1 \.vc-spotlight-inner \.vc-tile\s*\{[^}]*position:\s*absolute/.test(html),
    'speaker absolute tile kept'
);

console.log('[ok] verify-vc-ops-bwc-grid-no-overlap-v1');
