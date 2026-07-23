'use strict';

/**
 * REVERSE-PROXY-UI-POLISH-V1 — readiness classify unit checks
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const siteReadiness = require('../lib/siteReadiness');

function cls(operatorUrl, trustProxy, mode) {
    return siteReadiness.classifyTrustProxyReadiness({
        settings: { deployment: { mode: mode || 'lan', operatorUrl: operatorUrl } },
        trustProxy: trustProxy,
        operatorUrl: operatorUrl,
    });
}

let r = cls('https://192.168.1.38:4438', false, 'lab');
assert.strictEqual(r.status, 'ok');
assert.strictEqual(r.passKind, 'direct');

r = cls('https://ops.customer.com', true, 'cloud');
assert.strictEqual(r.status, 'ok');
assert.strictEqual(r.passKind, 'proxy');

r = cls('https://ops.customer.com', false, 'cloud');
assert.strictEqual(r.status, 'warn');
assert.ok(/needTrustBehindProxy/.test(r.detailKey));

r = cls('http://ops.customer.com', true, 'lan');
assert.strictEqual(r.status, 'warn');

r = cls('http://ops.customer.com', false, 'cloud');
assert.strictEqual(r.status, 'warn');

r = cls('', false, 'lab');
assert.strictEqual(r.status, 'ok');

const en = fs.readFileSync(path.join(__dirname, '..', 'public', 'locales', 'en.json'), 'utf8');
assert.ok(en.indexOf('Turn ON only if HTTPS stops at nginx/Caddy') >= 0);
assert.ok(en.indexOf('server.trustReverseProxyHelp') >= 0);
assert.ok(en.indexOf('server.productionAccess.savedOn') >= 0);

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
assert.ok(html.indexOf('ss-trust-proxy-help') >= 0);
assert.ok(html.indexOf('ss-proxy-readiness') >= 0);
assert.ok(html.indexOf('id="ss-trust-proxy"') >= 0);
assert.ok(!/X-Forwarded-Proto/.test(html.match(/ss-section-production[\s\S]*?ss-section-site-time/)[0]));

const setup = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'server-setup.js'), 'utf8');
assert.ok(/renderProxyReadiness/.test(setup));
assert.ok(/savedOn/.test(setup));

console.log('[ok] verify-reverse-proxy-ui-polish');
