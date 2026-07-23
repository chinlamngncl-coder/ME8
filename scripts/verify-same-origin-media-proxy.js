'use strict';

/**
 * SAME-ORIGIN-MEDIA-PROXY-V1 — static verify
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

process.env.HOST = process.env.HOST || '192.168.1.38';
process.env.FM_WVP_ZLM_HTTP_PORT = process.env.FM_WVP_ZLM_HTTP_PORT || '18088';

const m = require('../lib/sameOriginMedia');

assert.strictEqual(
    m.toBrowserFlvUrl('/api/lab/wvp/flv-stream?camId=a&labWvp=b'),
    '/api/lab/wvp/flv-stream?camId=a&labWvp=b'
);
assert.ok(
    m.toBrowserFlvUrl('http://192.168.1.38:18088/live/x.live.flv').indexOf('/api/lab/media/upstream-flv?u=') === 0
);
assert.strictEqual(
    m.toBrowserFlvUrl('http://192.168.1.38:3988/api/lab/wvp/flv-stream?x=1'),
    '/api/lab/wvp/flv-stream?x=1'
);
assert.strictEqual(m.isAllowlistedZlmUpstream('http://172.17.0.2:18088/x'), false);

const handoff = read('lib/wvpVideoHandoff.js');
assert.ok(!/host \+ ':3988'/.test(handoff) && !/host \+ ":3988"/.test(handoff), 'no hardcoded :3988 flv absolutize');
assert.ok(/sameOriginMedia/.test(handoff), 'handoff uses sameOriginMedia');

const serverJs = read('server.js');
assert.ok(/\/api\/lab\/media\/upstream-flv/.test(serverJs), 'upstream-flv route registered');

const zlm = read('lib/zlmIngestLab.js');
assert.ok(/FM_HTTPS_ENABLED/.test(zlm), 'HTTPS enables ZLM flv proxy');

const factory = read('public/js/live-player-factory.js');
assert.ok(/upstream-flv/.test(factory), 'player factory wraps raw http ZLM on https');

console.log('[ok] verify-same-origin-media-proxy');
