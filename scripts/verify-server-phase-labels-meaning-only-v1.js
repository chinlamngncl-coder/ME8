'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');
const enJson = JSON.parse(en);

assert.strictEqual(enJson['server.phase.identity'], 'Identity');
assert.strictEqual(enJson['server.phase.networking'], 'Networking');
assert.strictEqual(enJson['server.phase.access'], 'Access & Security');
assert.strictEqual(enJson['server.phase.storage'], 'Storage & Devices');
assert.strictEqual(enJson['server.phase.resiliency'], 'Resiliency');
assert.strictEqual(enJson['server.phase.diagnostics'], 'Diagnostics');

assert.ok(!/"server\.phase\.(identity|networking|access|storage|resiliency|diagnostics)":\s*"Phase /.test(en), 'no Phase N in locale titles');
assert.ok(!en.includes('Networking (Core)'), 'no Core');

const start = html.indexOf('id="ss-panel-server"');
const end = html.indexOf('id="ss-panel-dashboard"');
const server = html.slice(start, end);
assert.ok(!/Phase\s*[1-6]/.test(server), 'no Phase N in server panel HTML');
assert.ok(server.includes('>Identity</button>'), 'nav Identity');
assert.ok(server.includes('>Networking</button>'), 'nav Networking');
assert.ok(html.includes('server-phase-labels-meaning-only-v1'), 'cache bust');

console.log('[ok] verify-server-phase-labels-meaning-only-v1');
