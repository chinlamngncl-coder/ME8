'use strict';

const assert = require('assert');
const pttServerModule = require('../lib/pttServer');
const { create } = require('../lib/pttFieldGroupRelay');

async function main() {
    let clock = 1000;
    const online = new Set(['A', 'B', 'C', 'D', 'SLOW']);
    const writes = [];
    const mockPttServer = {
        isDevicePttOnline(camId) {
            return online.has(camId);
        },
        sendPttAudioToDevice(camId, frame, opts) {
            writes.push({ camId, bytes: frame.length, opts });
            return camId !== 'SLOW';
        },
    };
    const quietLog = {
        ptt: {
            info() {},
            warn() {},
        },
    };
    const relay = create({
        pttServer: mockPttServer,
        log: quietLog,
        now: () => clock,
        floorStaleMs: 1200,
        maxWritableBytes: 4096,
    });
    const frame = Buffer.alloc(160, 0xD5);

    assert.strictEqual(relay.setDispatchTeam('dispatch-1', ['A', 'B', 'C']), true);
    let result = relay.onPttRxAlaw('A', frame);
    assert.strictEqual(result.relayed, true);
    assert.deepStrictEqual(result.targets, ['B', 'C']);
    assert.strictEqual(writes.some((row) => row.camId === 'A'), false, 'source must never receive its own audio');
    assert.ok(writes.every((row) => row.bytes === 160), 'relay must preserve 160-byte A-law frames');
    assert.ok(writes.every((row) => row.opts.maxWritableBytes === 4096), 'relay must bound writable queues');

    writes.length = 0;
    online.delete('C');
    clock += 20;
    result = relay.onPttRxAlaw('A', frame);
    assert.deepStrictEqual(result.targets, ['B'], 'offline peers must be skipped');

    writes.length = 0;
    clock += 20;
    result = relay.onPttRxAlaw('B', frame);
    assert.strictEqual(result.reason, 'field_floor', 'second field speaker must not steal the floor');
    assert.strictEqual(writes.length, 0);

    relay.onPttRxState('A', false);
    online.add('C');
    clock += 20;
    result = relay.onPttRxAlaw('B', frame);
    assert.deepStrictEqual(result.targets, ['A', 'C'], 'floor must pass after source idle');

    writes.length = 0;
    relay.beginHqFloor('hq-socket', ['A', 'B', 'C']);
    clock += 20;
    result = relay.onPttRxAlaw('B', frame);
    assert.strictEqual(result.reason, 'hq_floor', 'HQ hold must preempt field relay');
    assert.strictEqual(writes.length, 0);
    relay.endHqFloor('hq-socket');

    relay.onPttRxState('B', false);
    assert.strictEqual(relay.setSosTeam('alarm-A', ['A', 'D']), true);
    writes.length = 0;
    clock += 20;
    result = relay.onPttRxAlaw('A', frame);
    assert.strictEqual(result.team, 'sos:alarm-A', 'SOS membership must take precedence over dispatch');
    assert.deepStrictEqual(result.targets, ['D']);

    relay.clearSosTeam('alarm-A');
    relay.onPttRxState('A', false);
    writes.length = 0;
    relay.onPttRxAlaw('A', frame);
    clock += 1300;
    result = relay.onPttRxAlaw('B', frame);
    assert.strictEqual(result.reason, 'relayed', 'stale field floors must release automatically');
    assert.ok(result.targets.includes('A'));
    relay.onPttRxState('B', false);

    relay.setSosTeam('alarm-slow', ['A', 'SLOW']);
    writes.length = 0;
    clock += 20;
    result = relay.onPttRxAlaw('A', frame);
    assert.strictEqual(result.reason, 'no_online_peers', 'backpressured targets must be dropped');
    assert.strictEqual(relay.snapshot().counters.sendDrops, 1);

    relay.clearAllSosTeams();
    relay.clearDispatchTeam();
    result = relay.onPttRxAlaw('A', frame);
    assert.strictEqual(result.reason, 'no_active_team', 'always-on Fleet roster must not be relayed');

    const rawFrames = [];
    const pcmFrames = [];
    const rxStates = [];
    pttServerModule.handleInboundPttAudio('A', Buffer.alloc(200, 0xD5), {
        onPttRxState(camId, active) { rxStates.push({ camId, active }); },
        onPttRxAlaw(camId, raw) { rawFrames.push({ camId, raw }); },
        onPttRxAudio(camId, pcm) { pcmFrames.push({ camId, pcm }); },
        log: quietLog,
    });
    assert.deepStrictEqual(rawFrames.map((row) => row.raw.length), [160, 160],
        'raw callback must normalize inbound audio into 160-byte frames');
    assert.deepStrictEqual(pcmFrames.map((row) => row.pcm.length), [320, 80],
        'existing dashboard PCM path must remain unchanged');
    assert.deepStrictEqual(rxStates[0], { camId: 'A', active: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.deepStrictEqual(rxStates[rxStates.length - 1], { camId: 'A', active: false });

    console.log('PTT field group relay verification passed.');
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
