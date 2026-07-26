'use strict';

/**
 * Phase 2 Task 2.3 — Save View state sync (Right master → Left map FOV)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const owSrc = fs.readFileSync(path.join(root, 'public/js/tactical-overwatch.js'), 'utf8');
const arSrc = fs.readFileSync(path.join(root, 'public/js/tactical-ar.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/global.css'), 'utf8');

assert.ok(/tactical-overwatch\.js/.test(html), 'index loads tactical-overwatch.js');
assert.ok(/ax-tactical-ow-save-view/.test(html), 'Save View panel');
assert.ok(/ax-tactical-ow-view-name/.test(html), 'View name input');
assert.ok(/ax-tactical-ow-azimuth-slider/.test(html) && /ax-tactical-ow-fov-slider/.test(html), 'heading/FOV sliders');
assert.ok(/ax-tactical-ow-manual-banner/.test(html), 'manual overlay banner');
assert.ok(/Manual Control Active - Overlays Suspended/.test(html), 'manual banner copy');
assert.ok(/class="[^"]*ar-glass/.test(html), 'ar-glass class');
assert.ok(/ax-tactical-ow-save-view/.test(css) && /ax-tactical-ow-manual-banner/.test(css), 'Save View + banner CSS');
assert.ok(/tactical-ow:view-config/.test(owSrc), 'view-config event');
assert.ok(/tactical-ow:manual-override/.test(owSrc), 'manual-override event');
assert.ok(/function drawCameraFov/.test(owSrc), 'drawCameraFov');
assert.ok(/function renderOverwatchPins/.test(owSrc), 'renderOverwatchPins');
assert.ok(/onManualOverride/.test(arSrc) && /manual:\s*true/.test(arSrc), 'PTZ pan → manual override');
assert.ok(/20260725-tactical-overwatch-save-view-sync-v1/.test(html), 'cache bust');

const listeners = {};
const sandbox = {
    window: {},
    document: {
        readyState: 'complete',
        getElementById: function () { return null; },
        addEventListener: function (type, fn) {
            listeners[type] = listeners[type] || [];
            listeners[type].push(fn);
        },
        dispatchEvent: function (ev) {
            const list = listeners[ev.type] || [];
            list.forEach(function (fn) { fn(ev); });
            return true;
        },
    },
    CustomEvent: function (type, init) {
        this.type = type;
        this.detail = (init && init.detail) || {};
    },
    localStorage: {
        _d: {},
        getItem: function (k) { return this._d[k] || null; },
        setItem: function (k, v) { this._d[k] = String(v); },
    },
    fetch: function () {
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ cams: [] }); } });
    },
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.addEventListener = function () {};
vm.runInNewContext(owSrc, sandbox);

assert.ok(sandbox.TacticalOverwatch, 'TacticalOverwatch global');
assert.strictEqual(typeof sandbox.TacticalOverwatch.drawCameraFov, 'function');
assert.strictEqual(typeof sandbox.TacticalOverwatch.publishViewConfig, 'function');
assert.ok(sandbox.TacticalOverwatch.EVT.VIEW_CONFIG.indexOf('view-config') >= 0);

let heard = null;
sandbox.TacticalOverwatch.on(sandbox.TacticalOverwatch.EVT.VIEW_CONFIG, function (ev) {
    heard = ev.detail;
});
sandbox.TacticalOverwatch.emit(sandbox.TacticalOverwatch.EVT.VIEW_CONFIG, { azimuth: 45, fov: 70 });
assert.ok(heard && heard.azimuth === 45 && heard.fov === 70, 'Right→Left bus delivers view-config');

console.log('[ok] verify-tactical-overwatch-fov-compass-v1 (save-view sync)');
