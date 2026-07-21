'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const startupSip = require('sip');
const {
    create,
    uniqueCamIds,
    buildRtpPcmaFrame,
    buildSosAlertFrames,
    mixAlawFrames,
    FRAME_BYTES,
} = require('../lib/sipGroupCall');

class MockUdpSocket extends EventEmitter {
    constructor(registry) {
        super();
        this.registry = registry;
        this.sent = [];
        this.closed = false;
        this.port = null;
    }

    bind(port, _host, callback) {
        this.port = port;
        this.registry.set(port, this);
        setImmediate(callback);
    }

    send(packet, port, host) {
        this.sent.push({ packet: Buffer.from(packet), port, host });
    }

    close() {
        this.closed = true;
        if (this.port != null) this.registry.delete(this.port);
    }
}

async function main() {
    const udpSockets = new Map();
    const sipRequests = [];
    const mixedAudio = [];
    const states = [];
    let remotePort = 51000;
    const mockSip = {
        send(request, callback) {
            sipRequests.push(request);
            if (request.method !== 'INVITE' || typeof callback !== 'function') return;
            callback({ status: 180, headers: {} });
            const port = remotePort++;
            const okResponse = {
                status: 200,
                headers: {
                    to: { uri: request.headers.to.uri, params: { tag: 'bwc' + port } },
                    from: request.headers.from,
                    'call-id': request.headers['call-id'],
                    cseq: { method: 'INVITE', seq: 1 },
                },
                content: 'v=0\r\nc=IN IP4 192.168.1.90\r\nm=audio ' + port
                    + ' RTP/AVP 8\r\na=sendrecv\r\na=rtpmap:8 PCMA/8000\r\n',
            };
            callback(okResponse);
            callback(okResponse);
        },
    };
    const quietLog = {
        media: { info() {}, warn() {} },
        sip: { info() {}, warn() {} },
    };
    assert.strictEqual(typeof startupSip.send, 'undefined',
        'installed SIP package exposes send only after sip.start');
    const deferredEngine = create({
        sip: startupSip,
        dgram: { createSocket() { throw new Error('must not open RTP before SIP is ready'); } },
        log: quietLog,
        host: '192.168.1.38',
        realm: '3402000000',
        serverId: '34020000002000000001',
        sipPort: 5062,
    });
    assert.strictEqual(deferredEngine.snapshot().active, false,
        'group engine construction must not require a started SIP listener');
    await assert.rejects(
        deferredEngine.start({
            camIds: ['A'],
            getContactUri() { return 'sip:A@192.168.1.9:5060'; },
        }),
        /SIP transport is not ready/,
        'operator call attempt must fail safely until SIP startup completes',
    );
    assert.strictEqual(deferredEngine.snapshot().active, false);

    const engine = create({
        sip: mockSip,
        dgram: {
            createSocket() { return new MockUdpSocket(udpSockets); },
        },
        log: quietLog,
        host: '192.168.1.38',
        realm: '3402000000',
        serverId: '34020000002000000001',
        sipPort: 5062,
        rtpBase: 40200,
        onState(state) { states.push(state); },
        onMixedPcm(pcm, meta) { mixedAudio.push({ pcm, meta }); },
    });

    assert.deepStrictEqual(
        uniqueCamIds(['A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']),
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        'group call must deduplicate and cap membership at eight',
    );
    assert.strictEqual(buildSosAlertFrames().length, 250, 'SOS tone must last 5 seconds');

    const source = Buffer.alloc(FRAME_BYTES, 0xAA);
    assert.deepStrictEqual(mixAlawFrames([source]), source, 'one source must not be attenuated');
    const rtp = buildRtpPcmaFrame(source, 7, 320, 99);
    assert.strictEqual(rtp.length, 172);
    assert.strictEqual(rtp[1] & 0x7F, 8);

    const started = await engine.start({
        alarmCamId: 'A',
        camIds: ['A', 'B', 'C'],
        ownerSocketId: 'operator-1',
        getContactUri(camId) { return 'sip:' + camId + '@192.168.1.9:5060'; },
    });
    assert.strictEqual(started.active, true);
    assert.strictEqual(started.connected, 3);
    assert.strictEqual(started.ownerSocketId, 'operator-1');
    assert.deepStrictEqual([...udpSockets.keys()], [40200, 40201, 40202]);

    const invites = sipRequests.filter((request) => request.method === 'INVITE');
    assert.strictEqual(invites.length, 3);
    assert.strictEqual(sipRequests.filter((request) => request.method === 'BYE').length, 0,
        'retransmitted SIP 200 must be ACKed without ending a connected leg');
    invites.forEach((invite, index) => {
        assert.ok(/^m=audio 4020[0-2]/m.test(invite.content), 'each member needs a unique RTP port');
        assert.strictEqual(/^m=video/im.test(invite.content), false, 'group Call must never request video');
        assert.strictEqual(Object.prototype.hasOwnProperty.call(invite.headers, 'subject'), false,
            'Phone profile must omit Subject');
        assert.ok(invite.content.includes('s=Phone'));
        assert.ok(invite.content.includes('a=sendrecv'));
        assert.ok(invite.content.includes('m=audio ' + (40200 + index)));
    });

    await new Promise((resolve) => setTimeout(resolve, 70));
    udpSockets.forEach((socket) => {
        assert.ok(socket.sent.length > 0, 'connected members must receive paced SOS tone RTP');
    });

    assert.strictEqual(engine.sendHqAlaw(Buffer.alloc(160, 0xD5)), true);
    const inbound = buildRtpPcmaFrame(Buffer.alloc(160, 0xA6), 1, 0, 1234);
    udpSockets.get(40200).emit('message', inbound, { address: '192.168.1.91', port: 52001 });
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.ok(mixedAudio.length > 0, 'HQ must receive mixed field audio');
    assert.deepStrictEqual(mixedAudio[mixedAudio.length - 1].meta.sources, ['A']);
    assert.strictEqual(mixedAudio[mixedAudio.length - 1].pcm.length, 320);

    const stateBeforeBye = engine.snapshot();
    const aCallId = sipRequests.find((request) => (
        request.method === 'INVITE' && request.headers.to.uri.indexOf('A@') >= 0
    )).headers['call-id'];
    assert.strictEqual(engine.onRemoteBye(aCallId), 'A');
    assert.strictEqual(engine.isParticipant('A'), false);
    assert.strictEqual(engine.isParticipant('B'), true);
    assert.ok(stateBeforeBye.participants.some((row) => row.camId === 'A'));

    assert.strictEqual(engine.stop('verify'), true);
    assert.strictEqual(engine.snapshot().active, false);
    assert.ok(sipRequests.filter((request) => request.method === 'BYE').length >= 2);
    assert.strictEqual(states[states.length - 1].active, false);

    console.log('SOS group SIP call verification passed.');
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
