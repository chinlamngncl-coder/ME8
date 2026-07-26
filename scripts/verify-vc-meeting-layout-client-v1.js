'use strict';

/**
 * VC-MEETING-LAYOUT-CLIENT-V1 — static guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'public', 'js', 'conference-layout.js'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'public', 'js', 'conference-hub.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const lazy = fs.readFileSync(path.join(root, 'public', 'js', 'vc-lazy.js'), 'utf8');

assert.ok(layout.indexOf("missionMode = 'speaker'") >= 0, 'default speaker');
assert.ok(layout.indexOf('setMissionMode') >= 0, 'setMissionMode');
assert.ok(layout.indexOf('vc-client-v1') >= 0, 'client v1 class');
assert.ok(html.indexOf('vc-meeting-dock') >= 0, 'dock in HTML');
assert.ok(html.indexOf('data-vc-mission="speaker"') >= 0, 'speaker button');
assert.ok(html.indexOf('data-vc-mission="operations"') >= 0, 'operations button');
assert.ok(html.indexOf('data-vc-mission="focus"') >= 0, 'focus button');
assert.ok(html.indexOf('vc-stage-badge') >= 0, 'badge');
assert.ok(html.indexOf('view-gallery') < 0 || html.indexOf('vc-meeting-dock') >= 0, 'dock present');
assert.ok(hub.indexOf('vc-dock-mic') >= 0, 'hub docks mic');
assert.ok(hub.indexOf('toggleLocalCam') >= 0, 'cam toggle');
assert.ok(lazy.indexOf('conference-layout.js') >= 0, 'loads layout');
assert.ok(html.indexOf('vc-meeting-dock') >= 0 || lazy.indexOf('vc-meeting-layout-client-v1') >= 0 || lazy.indexOf('vc-ui-compact') >= 0, 'layout cache lineage');

console.log('[ok] verify-vc-meeting-layout-client-v1');
