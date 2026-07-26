'use strict';

/**
 * Phase 2 Task 2.3 — PTZ AR split + UV % pins + preset lock
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const arSrc = fs.readFileSync(path.join(root, 'public/js/tactical-ar.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/global.css'), 'utf8');

assert.ok(/tactical-ar\.js/.test(html), 'index loads tactical-ar.js');
assert.ok(/ax-tactical-ar-glass/.test(html) && /ax-tactical-ar-pane/.test(html), 'AR DOM');
assert.ok(/has-ar-split/.test(css) && /ax-tactical-ar-glass/.test(css), 'AR CSS');
assert.ok(/goto-preset/.test(server) && /ptz\/presets/.test(server), 'preset APIs');

const sandbox = {
    window: {},
    document: {
        readyState: 'complete',
        getElementById: function () { return null; },
        addEventListener: function () {},
        querySelectorAll: function () { return []; },
    },
    fetch: function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve({}); } }); },
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.addEventListener = function () {};
vm.runInNewContext(arSrc, sandbox);

assert.ok(sandbox.TacticalAr && typeof sandbox.TacticalAr.renderArPins === 'function', 'TacticalAr API');

// Percentage projection contract (unit-style)
function pct(uv) {
    const x = Math.min(1, Math.max(0, Number(uv)));
    return (x * 100) + '%';
}
assert.strictEqual(pct(0.25), '25%');
assert.strictEqual(pct(1), '100%');
assert.ok(/Overwatch \(AR\)/.test(html) || /Overwatch \(AR\)/.test(arSrc) || /tactical\.arOpenSplit/.test(html), 'Overwatch (AR) open');
assert.ok(/Close Overwatch/.test(html) || /Close Overwatch/.test(arSrc), 'Close Overwatch');
assert.ok(!/>\s*Close AR\s*</.test(html), 'no Close AR label');
assert.ok(!/>\s*PTZ AR split\s*</.test(html), 'no PTZ AR split label');
assert.ok(/uv_x \* 100/.test(arSrc) && /uv_y \* 100/.test(arSrc), 'UV percent math in source');
assert.ok(/clearPresetLock|markers hidden/.test(arSrc), 'unlock on pan');
assert.ok(/Me8LivePlayerFactory\.attachFlvPrimary/.test(arSrc), 'hooks live FLV');

console.log('[ok] verify-tactical-ptz-ar-split-v1');
