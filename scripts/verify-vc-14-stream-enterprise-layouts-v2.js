'use strict';

/**
 * VC-14-STREAM-ENTERPRISE-LAYOUTS-V2 — static guards
 * Caps 8 humans + 6 BWC/fixed; five mission layout maps; dock buttons; cache.
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
const store = fs.readFileSync(path.join(root, 'lib', 'conferenceStore.js'), 'utf8');
const livekit = fs.readFileSync(path.join(root, 'docker', 'livekit.yaml'), 'utf8');

assert.ok(/MAX_SHARE_TILES\s*=\s*6/.test(layout), 'MAX_SHARE_TILES=6');
assert.ok(/MAX_PEOPLE\s*=\s*8/.test(layout), 'MAX_PEOPLE=8');
assert.ok(/SIDEBAR_MAX\s*=\s*13/.test(layout), 'SIDEBAR_MAX=13');
assert.ok(layout.indexOf("MISSION_MODES = ['speaker', 'operations', 'gallery', 'focus', 'dual']") >= 0, '5 mission modes');
assert.ok(layout.indexOf('layout-speaker') >= 0, 'layout-speaker class');
assert.ok(layout.indexOf('layout-operations') >= 0, 'layout-operations');
assert.ok(layout.indexOf('layout-gallery') >= 0, 'layout-gallery');
assert.ok(layout.indexOf('layout-focus') >= 0, 'layout-focus');
assert.ok(layout.indexOf('layout-dual') >= 0, 'layout-dual');
assert.ok(layout.indexOf('function applyMissionLayoutChrome') >= 0, 'applyMissionLayoutChrome');
assert.ok(layout.indexOf('VC-14-STREAM-ENTERPRISE-LAYOUTS-V2') >= 0, 'V2 marker');
assert.ok(layout.indexOf('function exitFocusToSpeaker') >= 0, 'keep Focus escape');

assert.ok(/MAX_BWC_INGRESS\s*=\s*6/.test(store), 'store MAX_BWC_INGRESS=6');
assert.ok(/max_participants:\s*20/.test(livekit), 'livekit max_participants 20');
assert.ok(/maxBwcIngress\)\s*\|\|\s*6/.test(hub), 'hub default maxBwc 6');

assert.ok(html.indexOf('data-vc-mission="gallery"') >= 0, 'dock Gallery');
assert.ok(html.indexOf('data-vc-mission="dual"') >= 0, 'dock Dual');
assert.ok(html.indexOf('VC-14-STREAM-ENTERPRISE-LAYOUTS-V2') >= 0, 'V2 CSS marker');
assert.ok(html.indexOf('aspect-ratio: 16 / 9') >= 0, '16:9 tile rule');
assert.ok(html.indexOf('object-fit: contain') >= 0, 'object-fit contain');
assert.ok(html.indexOf('.layout-speaker') >= 0, 'CSS layout-speaker');
assert.ok(html.indexOf('.layout-operations') >= 0, 'CSS layout-operations');
assert.ok(html.indexOf('.layout-gallery') >= 0, 'CSS layout-gallery');
assert.ok(html.indexOf('.layout-focus') >= 0, 'CSS layout-focus');
assert.ok(html.indexOf('.layout-dual') >= 0, 'CSS layout-dual');
assert.ok(html.indexOf('flex: 0 0 260px') >= 0, 'sidebar ~260px');
assert.ok(html.indexOf('flex: 0 0 180px') >= 0, 'ops human strip ~180px');

assert.ok(en.indexOf('"conference.missionGallery"') >= 0, 'en Gallery');
assert.ok(en.indexOf('"conference.missionDual"') >= 0, 'en Dual');
assert.ok(lazy.indexOf('vc-14-stream-enterprise-layouts-v2') >= 0, 'lazy cache');

console.log('[ok] verify-vc-14-stream-enterprise-layouts-v2');
