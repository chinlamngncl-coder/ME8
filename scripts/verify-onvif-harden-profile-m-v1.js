'use strict';

/**
 * Phase 2 Task 2.5 — ONVIF hardening: clock sync, stream_transport, Pull-Point, Profile M
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const onvifSrc = fs.readFileSync(path.join(root, 'lib/fixedCamOnvif.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const mig = fs.readFileSync(path.join(root, 'db/migrations/004_fixed_cameras_stream_transport.sql'), 'utf8');
const siteDb = fs.readFileSync(path.join(root, 'lib/siteDb.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'public/js/fixed-cams-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const reg = fs.readFileSync(path.join(root, 'lib/fixedCamRegistry.js'), 'utf8');

assert.ok(/function syncCameraClock/.test(onvifSrc), 'syncCameraClock');
assert.ok(/setSystemDateAndTime/.test(onvifSrc), 'SetSystemDateAndTime');
assert.ok(/function startEventSubscription/.test(onvifSrc), 'Pull-Point start');
assert.ok(/createPullPointSubscription|PullPoint/.test(onvifSrc), 'Pull-Point');
assert.ok(/profileM/.test(onvifSrc), 'Profile M flag');
assert.ok(/Analytics|AnalyticsDevice/.test(onvifSrc), 'Analytics detection');
assert.ok(!/Profile C|Access Control/i.test(onvifSrc) || /Access C\/A\/D ignored/.test(onvifSrc), 'no access-control focus');

assert.ok(/stream_transport/.test(mig), 'migration stream_transport');
assert.ok(/004_fixed_cameras_stream_transport\.sql/.test(siteDb), 'siteDb runs 004');
assert.ok(/streamTransport/.test(reg), 'registry streamTransport');
assert.ok(/streamTransport/.test(ui), 'UI payload streamTransport');
assert.ok(/fc-transport-row/.test(html), 'transport form row');
assert.ok(/StreamTransport/.test(ui), 'CSV template StreamTransport');

assert.ok(/onvif\/events\/start/.test(server), 'events start route');
assert.ok(/onvif\/events\/stop/.test(server), 'events stop route');
assert.ok(/resolveStreamTransport/.test(server), 'ZLM uses resolveStreamTransport');
assert.ok(/clock:/.test(server), 'capabilities returns clock');

const mod = require(path.join(root, 'lib/fixedCamOnvif.js'));
assert.strictEqual(typeof mod.syncCameraClock, 'function');
assert.strictEqual(typeof mod.startEventSubscription, 'function');
assert.strictEqual(typeof mod.stopEventSubscription, 'function');
assert.strictEqual(typeof mod.detectProfiles, 'function');
assert.strictEqual(mod.normalizeTransport('UDP'), 'udp');
assert.strictEqual(mod.normalizeTransport('tcp'), 'tcp');

const profiles = mod.detectProfiles({
    Media: {},
    PTZ: {},
    Media2: {},
    Recording: {},
    Analytics: {},
    Events: {},
}, null);
assert.strictEqual(profiles.profileS, true);
assert.strictEqual(profiles.profileT, true);
assert.strictEqual(profiles.profileG, true);
assert.strictEqual(profiles.profileM, true);
assert.strictEqual(profiles.hasEvents, true);

const classified = mod.classifyOnvifEvent({ topic: 'tns1:RuleEngine/LineDetector/Crossed' });
assert.strictEqual(classified.kind, 'line_crossing');

console.log('[ok] verify-onvif-harden-profile-m-v1');
