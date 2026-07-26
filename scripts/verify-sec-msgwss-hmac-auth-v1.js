'use strict';

/**
 * SEC Phase 1.5 — msgWss HMAC auth
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const msgWssAuth = require('../lib/msgWssAuth');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const runJs = fs.readFileSync(path.join(root, 'run.js'), 'utf8');

const camId = '34020000001329000009';
const password = 'sip-secret';
const secret = 'lab-hmac-secret';
const token = msgWssAuth.computeToken(camId, password, secret);
assert.ok(token && /^[a-f0-9]{64}$/.test(token), 'token hex sha256');

assert.strictEqual(
    msgWssAuth.verifyConnectionToken({
        requireToken: true,
        providedToken: token,
        camId,
        devicePassword: password,
        serverSecret: secret,
    }).ok,
    true,
    'valid token ok',
);

assert.strictEqual(
    msgWssAuth.verifyConnectionToken({
        requireToken: true,
        providedToken: '',
        camId,
        devicePassword: password,
        serverSecret: secret,
    }).ok,
    false,
    'missing token rejected',
);

assert.strictEqual(
    msgWssAuth.verifyConnectionToken({
        requireToken: true,
        providedToken: 'deadbeef',
        camId,
        devicePassword: password,
        serverSecret: secret,
    }).ok,
    false,
    'bad token rejected',
);

const url = msgWssAuth.buildDeviceUrl({
    host: '192.168.1.38',
    port: 6000,
    camId,
    devicePassword: password,
    serverSecret: secret,
});
assert.ok(url.includes('user=' + encodeURIComponent(camId)), 'url has user');
assert.ok(url.includes('token=' + encodeURIComponent(token)), 'url has token');
assert.strictEqual(msgWssAuth.extractTokenFromUrl(url), token, 'extract token');

function assertWired(src, label) {
    assert.ok(/close\s*\(\s*4003\s*,\s*['"]Unauthorized['"]\s*\)/.test(src), label + ' close 4003');
    assert.ok(!/close\s*\(\s*4001\s*,\s*['"]Unauthorized['"]\s*\)/.test(src), label + ' not 4001 Unauthorized');
    assert.ok(/verifyConnectionToken|msgWssAuth\.verifyConnectionToken/.test(src), label + ' verify');
    assert.ok(/extractTokenFromUrl|msgWssAuth\.extractTokenFromUrl/.test(src), label + ' extract');
    assert.ok(/FM_MSGWSS_HMAC_SECRET|MSGWSS_HMAC_SECRET/.test(src), label + ' secret env');
}

assertWired(server, 'server');
assertWired(runJs, 'run');

console.log('[ok] verify-sec-msgwss-hmac-auth-v1');
