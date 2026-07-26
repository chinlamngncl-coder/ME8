'use strict';

/**
 * SEC Phase 1.1 — BWC companion timing-safe hash compare
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const runJs = fs.readFileSync(path.join(root, 'run.js'), 'utf8');

function extractSecureTokenEqual(src) {
    const m = src.match(/function secureTokenEqual\(actual, expected\) \{[\s\S]*?\n\}/);
    assert.ok(m, 'secureTokenEqual present');
    return m[0];
}

const serverFn = extractSecureTokenEqual(server);
const runFn = extractSecureTokenEqual(runJs);

assert.ok(serverFn.indexOf("createHash('sha256')") >= 0 || serverFn.indexOf('createHash("sha256")') >= 0, 'server sha256');
assert.ok(serverFn.indexOf('timingSafeEqual') >= 0, 'server timingSafeEqual');
assert.ok(serverFn.indexOf('a.length === b.length') < 0, 'server no raw length short-circuit');
assert.ok(runFn.indexOf('createHash("sha256")') >= 0 || runFn.indexOf("createHash('sha256')") >= 0, 'run sha256');
assert.ok(runFn.indexOf('a.length === b.length') < 0, 'run no raw length short-circuit');

const sandbox = { crypto, console };
vm.createContext(sandbox);
vm.runInContext(serverFn + '; this.secureTokenEqual = secureTokenEqual;', sandbox);
const eq = sandbox.secureTokenEqual;
assert.strictEqual(eq('secret-token', 'secret-token'), true, 'match');
assert.strictEqual(eq('secret-token', 'wrong'), false, 'mismatch');
assert.strictEqual(eq('', 'x'), false, 'empty actual');
assert.strictEqual(eq('x', ''), false, 'empty expected');
assert.strictEqual(eq(null, 'x'), false, 'null actual');

console.log('[ok] verify-sec-bwc-companion-timing-safe-hash-v1');
