'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createRedisRuntime, newestByTs } = require('../lib/redisRuntime');

function createFakeRedis() {
    const hashes = Object.create(null);
    return {
        async hset(key, field, value) {
            if (!hashes[key]) hashes[key] = Object.create(null);
            hashes[key][field] = String(value);
            return 1;
        },
        async hgetall(key) {
            return Object.assign({}, hashes[key] || {});
        },
        async ping() {
            return 'PONG';
        },
        _hashes: hashes,
    };
}

async function main() {
    assert.deepStrictEqual(
        newestByTs({ lat: 1, lon: 2, at: 100 }, { lat: 3, lon: 4, at: 200 }),
        { lat: 3, lon: 4, at: 200 },
        'newer remote wins'
    );
    assert.deepStrictEqual(
        newestByTs({ lat: 1, lon: 2, at: 300 }, { lat: 3, lon: 4, at: 200 }),
        { lat: 1, lon: 2, at: 300 },
        'newer local wins'
    );

    const off = createRedisRuntime({ url: '', log: null });
    assert.strictEqual(off.snapshot().mode, 'off');
    assert.strictEqual(off.snapshot().configured, false);
    await off.start();
    assert.strictEqual(off.snapshot().mode, 'off');
    off.writeGps('cam1', { lat: 1, lon: 2, at: 1 });
    assert.deepStrictEqual(await off.hydrateGps({}), { merged: 0 });

    const fake = createFakeRedis();
    const ready = createRedisRuntime({
        url: 'redis://127.0.0.1:6379',
        keyPrefix: 'test:',
        Redis: null,
        log: null,
    });
    ready._setClientForTests(fake);
    assert.strictEqual(ready.snapshot().mode, 'ready');

    ready.writeGps('34020000001320000001', { lat: 1.1, lon: 2.2, at: 50 });
    ready.writeContact('34020000001320000001', 'sip:cam@192.168.1.10:5060');
    ready.writeOnline('34020000001320000001', { online: true, lastSeen: 50, lastIp: '192.168.1.10' });

    await new Promise((r) => setTimeout(r, 20));

    const gpsMem = { '34020000001320000001': { lat: 9, lon: 9, at: 10 } };
    const gpsHydrate = await ready.hydrateGps(gpsMem);
    assert.strictEqual(gpsHydrate.merged, 1);
    assert.strictEqual(gpsMem['34020000001320000001'].lat, 1.1);

    const contactMem = {};
    const contactHydrate = await ready.hydrateContact(contactMem);
    assert.strictEqual(contactHydrate.merged, 1);
    assert.ok(String(contactMem['34020000001320000001']).includes('192.168.1.10'));

    let onlineApplied = null;
    const onlineHydrate = await ready.hydrateOnline((id, patch) => {
        onlineApplied = { id, patch };
    });
    assert.strictEqual(onlineHydrate.merged, 1);
    assert.strictEqual(onlineApplied.id, '34020000001320000001');
    assert.strictEqual(onlineApplied.patch.online, true);

    const boom = createRedisRuntime({
        url: 'redis://127.0.0.1:6379',
        keyPrefix: 'boom:',
        Redis: null,
        log: null,
    });
    boom._setClientForTests({
        async hset() {
            throw new Error('valkey down');
        },
        async hgetall() {
            throw new Error('valkey down');
        },
    });
    boom.writeGps('camX', { lat: 1, lon: 2, at: 1 });
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(boom.snapshot().mode, 'degraded');
    assert.strictEqual(boom.snapshot().degraded, true);
    const emptyHydrate = await boom.hydrateGps({ camX: { lat: 1, lon: 2, at: 1 } });
    assert.strictEqual(emptyHydrate.merged, 0);
    assert.strictEqual(boom.snapshot().mode, 'degraded');

    const missingCtor = createRedisRuntime({
        url: 'redis://127.0.0.1:6379',
        Redis: null,
        log: null,
    });
    await missingCtor.start();
    assert.strictEqual(missingCtor.snapshot().mode, 'degraded');

    const enterpriseEnv = require('../lib/enterpriseEnv');
    const status = enterpriseEnv.publicEnterpriseStatus({}, path.join(__dirname, '..'));
    assert.strictEqual(status.wired, true);
    assert.strictEqual(status.redisRuntime, true);
    assert.strictEqual(status.redisConfigured, false);

    const redisSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'redisRuntime.js'), 'utf8');
    assert.ok(redisSrc.includes('cache_degraded'));
    assert.ok(redisSrc.includes('Never blocks'));

    const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.ok(serverSrc.includes("require('./lib/redisRuntime')"));
    assert.ok(serverSrc.includes('body.cache = redisRuntime.snapshot()'));
    assert.ok(serverSrc.includes('redisRuntime.writeGps'));
    assert.ok(serverSrc.includes('redisRuntime.writeContact'));
    assert.ok(serverSrc.includes('wireRedisOnlineDualWrite'));

    const pkg = require('../package.json');
    assert.ok(pkg.dependencies && pkg.dependencies.ioredis, 'ioredis must be a production dependency');

    const legal = fs.readFileSync(path.join(__dirname, '..', 'public', 'legal-notices.html'), 'utf8');
    assert.ok(/ioredis/i.test(legal), 'legal notices must list ioredis');

    console.log('verify-valkey-fleet-runtime-state-degrade: PASS');
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
