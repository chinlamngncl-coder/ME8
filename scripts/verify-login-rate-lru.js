'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const labSecurity = require('../lib/labSecurity');
const {
    MAX_KEY_LENGTH,
    clientKey,
    createLoginRateLimiter,
} = require('../lib/loginRateLimiter');

function responseProbe() {
    return {
        statusCode: null,
        headers: {},
        body: null,
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

function request(limiter, ip) {
    const res = responseProbe();
    let nextCalled = false;
    limiter.middleware({ ip, socket: { remoteAddress: '127.0.0.1' } }, res, () => {
        nextCalled = true;
    });
    return { res, nextCalled };
}

let clock = 0;
const limiter = createLoginRateLimiter({
    maxAttempts: 10,
    windowMs: 900000,
    blockMs: 900000,
    maxEntries: 3,
    now: () => clock,
});

for (let i = 0; i < 10; i++) {
    assert.strictEqual(request(limiter, '192.0.2.1').nextCalled, true);
}
const blocked = request(limiter, '192.0.2.1');
assert.strictEqual(blocked.nextCalled, false);
assert.strictEqual(blocked.res.statusCode, 429);
assert.strictEqual(blocked.res.headers['Retry-After'], 900);

clock = 900001;
assert.strictEqual(request(limiter, '192.0.2.1').nextCalled, true, 'expired block must reset');

request(limiter, '192.0.2.2');
request(limiter, '192.0.2.3');
request(limiter, '192.0.2.1'); // touch as most recently used
request(limiter, '192.0.2.4');
assert.strictEqual(limiter.size(), 3);
assert.strictEqual(limiter.has('192.0.2.1'), true);
assert.strictEqual(limiter.has('192.0.2.2'), false, 'oldest entry must be evicted');

const floodLimiter = createLoginRateLimiter({ maxEntries: 5000 });
for (let i = 0; i < 20000; i++) {
    request(floodLimiter, `2001:db8::${i.toString(16)}`);
}
assert.strictEqual(floodLimiter.size(), 5000, 'unique-IP flood must remain bounded');

const oversizedKey = 'x'.repeat(MAX_KEY_LENGTH * 2);
assert.strictEqual(clientKey({ ip: oversizedKey }).length, MAX_KEY_LENGTH);
assert.strictEqual(clientKey({ socket: { remoteAddress: '198.51.100.8' } }), '198.51.100.8');
assert.strictEqual(labSecurity.defaults().trustProxy, false, 'untrusted forwarded IPs must be disabled by default');

clock += 900001;
limiter.prune();
assert.strictEqual(limiter.size(), 0, 'expired inactive records must be pruned');

const serverSource = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
assert.match(serverSource, /createLoginRateLimiter\(\{[\s\S]*?maxEntries:\s*5000/);
assert.doesNotMatch(serverSource, /const\s+_loginAttempts\s*=\s*new Map/);

console.log('Login rate limiter LRU verification passed.');
