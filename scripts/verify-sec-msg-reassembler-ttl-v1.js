'use strict';

/**
 * SEC Phase 1.4 — MessageReassembler TTL prune
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { MessageReassembler } = require('../lib/hdaMessageProtocol');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const runJs = fs.readFileSync(path.join(root, 'run.js'), 'utf8');
const lib = fs.readFileSync(path.join(root, 'lib/hdaMessageProtocol.js'), 'utf8');

assert.ok(/pruneStaleBuffers\s*\(/.test(lib), 'lib pruneStaleBuffers');
assert.ok(/lastTouched/.test(lib), 'lib lastTouched');

const r = new MessageReassembler();
r._parts.set('stale', {
    totalLen: 100,
    chunks: new Map(),
    received: 1,
    meta: {},
    lastTouched: Date.now() - 120000,
});
r._parts.set('fresh', {
    totalLen: 100,
    chunks: new Map(),
    received: 1,
    meta: {},
    lastTouched: Date.now(),
});
assert.strictEqual(r.pruneStaleBuffers(60000), 1, 'prunes only stale');
assert.ok(r._parts.has('fresh'), 'keeps fresh');
assert.ok(!r._parts.has('stale'), 'drops stale');

function assertWired(src, label) {
    assert.ok(/pruneStaleBuffers\s*\(\s*MSG_REASSEMBLER_TTL_MS\s*\)/.test(src), label + ' interval calls prune');
    assert.ok(/MSG_REASSEMBLER_TTL_MS\s*=\s*60\s*\*\s*(1000|1e3)/.test(src), label + ' 60s TTL');
    assert.ok(/MSG_REASSEMBLER_PRUNE_MS\s*=\s*15\s*\*\s*(1000|1e3)/.test(src), label + ' 15s sweep');
    assert.ok(/msgReassemblerPruneTimer\.unref/.test(src), label + ' unref timer');
    assert.ok(/activeCameraSockets/.test(src), label + ' walks active sockets');
}

assertWired(server, 'server');
assertWired(runJs, 'run');
assert.ok(/pruneStaleBuffers/.test(runJs), 'run bundled reassembler has prune');

console.log('[ok] verify-sec-msg-reassembler-ttl-v1');
