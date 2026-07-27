'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));

const start = html.indexOf('id="ss-panel-server"');
const end = html.indexOf('id="ss-panel-dashboard"');
assert.ok(start > 0 && end > start, 'server panel bounds');
const server = html.slice(start, end);

assert.ok(server.includes('ss-phase-identity'), 'phase 1');
assert.ok(server.includes('ss-phase-networking'), 'phase 2');
assert.ok(server.includes('ss-phase-access'), 'phase 3');
assert.ok(server.includes('ss-phase-storage'), 'phase 4');
assert.ok(server.includes('ss-phase-resiliency'), 'phase 5');
assert.ok(server.includes('ss-phase-diagnostics'), 'phase 6');

const navMatch = server.match(/id="ss-network-section-nav"[\s\S]*?<\/nav>/);
assert.ok(navMatch, 'nav');
assert.strictEqual((navMatch[0].match(/data-ss-section="/g) || []).length, 6, 'exactly 6 nav pills');
assert.ok(!navMatch[0].includes('ss-section-deployment'), 'old 12-tab section nav gone');

assert.ok(/ss-section-deployment[\s\S]*ss-east-west-grid[\s\S]*ss-deployment-mode/.test(server), 'identity grid');
assert.ok(/ss-section-lan[\s\S]*ss-east-west-grid[\s\S]*ss-lan-server-ip/.test(server), 'lan grid');
assert.ok(/ss-section-wan[\s\S]*ss-east-west-grid[\s\S]*ss-wan-public-ip/.test(server), 'wan grid');
assert.ok(/ss-section-operator[\s\S]*ss-east-west-grid[\s\S]*ss-operator-url/.test(server), 'access grid');
assert.ok(server.includes('id="cd-readiness"') && server.includes('id="ss-site-readiness"'), 'diagnostics both blocks');
assert.ok(server.indexOf('ss-phase-diagnostics') < server.indexOf('cd-readiness'), 'status in phase 6');
assert.ok(server.indexOf('ss-phase-storage') < server.indexOf('ss-section-command-displays'), 'control room in phase 4');
assert.ok(server.indexOf('ss-phase-networking') < server.indexOf('ss-section-bwc-register'), 'device reg in phase 2');

const ids = [
  'ss-deployment-mode', 'ss-tenant-name', 'ss-lan-server-ip', 'ss-wan-public-ip', 'ss-public-host',
  'ss-operator-url', 'ss-trust-proxy', 'ss-ssl-cert', 'ss-sip-port', 'ss-site-timezone',
  'ss-open-command-wall', 'ss-resilience-node-id', 'ss-site-readiness', 'cd-readiness',
];
ids.forEach(function (id) {
  const n = (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;
  assert.strictEqual(n, 1, 'unique id ' + id + ' got ' + n);
});

assert.ok(setupJs.includes("'ss-phase-identity'"), 'NETWORK_SECTION_IDS phases');
assert.ok(setupJs.includes("setActiveNetworkSectionNav('ss-phase-identity')"), 'default phase nav');
assert.ok(html.includes('consolidate-ia-and-grid-v1'), 'cache bust');

console.log('[ok] verify-1-consolidate-ia-and-grid');
