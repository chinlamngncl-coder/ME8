'use strict';

/**
 * TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const poi = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');

assert.ok(poi.indexOf('TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1') >= 0, 'marker');
assert.ok(poi.indexOf('function buildGrabTargets') >= 0, 'buildGrabTargets');
assert.ok(poi.indexOf('function grabCycleStep') >= 0, 'grabCycleStep');
assert.ok(poi.indexOf('function makeEphemeralHost') >= 0, 'ephemeral BWC pin');
assert.ok(poi.indexOf("streamKind === 'bwc'") >= 0, 'bwc stream kind');
assert.ok(poi.indexOf('fetchDescriptorPreferZlm') >= 0, 'BWC FLV via playback');
assert.ok(poi.indexOf('openAllLivePins') < 0 || poi.indexOf('No auto wall') >= 0, 'no wall primary');
/* openInCircle must not call openAllLivePins */
const openFn = poi.split('function openInCircle')[1] || '';
const openBody = openFn.split('function openPoiPinLive')[0] || openFn.split('function openLinked')[0] || '';
assert.ok(openBody.indexOf('openAllLivePins') < 0, 'openInCircle no openAllLivePins');
assert.ok(openBody.indexOf('openOnWall') < 0, 'openInCircle no openOnWall');
assert.ok(html.indexOf('ax-tactical-grab-prev') >= 0, 'prev btn');
assert.ok(html.indexOf('ax-tactical-grab-next') >= 0, 'next btn');
assert.ok(html.indexOf('tactical-open-grabbed-bwc-pin-cycle-v1') >= 0, 'cache');
assert.ok(en.indexOf('"tactical.circleOpenedPinsCycle"') >= 0, 'en cycle toast');
assert.ok(en.indexOf('"tactical.grabCycleLabel"') >= 0, 'en cycle label');

console.log('[ok] verify-tactical-open-grabbed-bwc-pin-cycle-v1');
