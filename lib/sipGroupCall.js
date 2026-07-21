'use strict';

const crypto = require('crypto');
const dgram = require('dgram');
const sdpMedia = require('./sdpMedia');
const { alawToPcm16, pcm16ToAlaw } = require('./psG711Audio');

const FRAME_BYTES = 160;
const FRAME_MS = 20;
const SILENCE = Buffer.alloc(FRAME_BYTES, 0xD5);
const MAX_PARTICIPANTS = 8;
const MAX_AUDIO_QUEUE_FRAMES = 10;
const DEFAULT_RTP_BASE = 40400;
const INVITE_TIMEOUT_MS = 15000;

function uniqueCamIds(values) {
    const seen = new Set();
    const out = [];
    (values || []).forEach((value) => {
        const id = String(value || '').trim();
        if (!id || seen.has(id) || out.length >= MAX_PARTICIPANTS) return;
        seen.add(id);
        out.push(id);
    });
    return out;
}

function rtpPayloadOffset(packet) {
    if (!packet || packet.length < 12) return packet ? packet.length : 0;
    const cc = packet[0] & 0x0F;
    let off = 12 + (cc * 4);
    if ((packet[0] & 0x10) && off + 4 <= packet.length) {
        const extWords = packet.readUInt16BE(off + 2);
        off += 4 + (extWords * 4);
    }
    return Math.min(off, packet.length);
}

function normalizeFrame(frame) {
    if (!frame || !frame.length) return Buffer.from(SILENCE);
    if (frame.length === FRAME_BYTES) return Buffer.from(frame);
    if (frame.length > FRAME_BYTES) return Buffer.from(frame.subarray(0, FRAME_BYTES));
    const out = Buffer.from(SILENCE);
    Buffer.from(frame).copy(out);
    return out;
}

function splitAlawFrames(payload) {
    const out = [];
    if (!payload || !payload.length) return out;
    for (let off = 0; off < payload.length; off += FRAME_BYTES) {
        out.push(normalizeFrame(payload.subarray(off, off + FRAME_BYTES)));
    }
    return out;
}

function mixAlawFrames(frames) {
    const usable = (frames || []).filter((frame) => frame && frame.length);
    if (!usable.length) return Buffer.from(SILENCE);
    if (usable.length === 1) return normalizeFrame(usable[0]);
    const decoded = usable.map((frame) => alawToPcm16(normalizeFrame(frame)));
    const pcm = Buffer.alloc(FRAME_BYTES * 2);
    const scale = 1 / Math.sqrt(decoded.length);
    for (let sample = 0; sample < FRAME_BYTES; sample += 1) {
        let sum = 0;
        decoded.forEach((buf) => { sum += buf.readInt16LE(sample * 2); });
        const mixed = Math.max(-32768, Math.min(32767, Math.round(sum * scale)));
        pcm.writeInt16LE(mixed, sample * 2);
    }
    return pcm16ToAlaw(pcm);
}

function buildRtpPcmaFrame(alawPayload, seq, timestamp, ssrc) {
    const header = Buffer.alloc(12);
    header[0] = 0x80;
    header[1] = 8;
    header.writeUInt16BE(seq & 0xFFFF, 2);
    header.writeUInt32BE(timestamp >>> 0, 4);
    header.writeUInt32BE(ssrc >>> 0, 8);
    return Buffer.concat([header, normalizeFrame(alawPayload)]);
}

function buildSosAlertFrames() {
    const sampleRate = 8000;
    const durationMs = 5000;
    const totalSamples = Math.round(sampleRate * durationMs / 1000);
    const pcm = Buffer.alloc(totalSamples * 2);
    const pulses = [
        { start: 0.00, end: 0.48, hz: 620 },
        { start: 0.68, end: 1.16, hz: 980 },
        { start: 1.36, end: 2.02, hz: 620 },
        { start: 2.50, end: 2.98, hz: 620 },
        { start: 3.18, end: 3.66, hz: 980 },
        { start: 3.86, end: 4.52, hz: 620 },
    ];
    for (let i = 0; i < totalSamples; i += 1) {
        const t = i / sampleRate;
        let value = 0;
        for (let p = 0; p < pulses.length; p += 1) {
            const pulse = pulses[p];
            if (t >= pulse.start && t < pulse.end) {
                const local = t - pulse.start;
                const fade = Math.min(1, local / 0.025, (pulse.end - t) / 0.025);
                value = Math.sin(2 * Math.PI * pulse.hz * local) * 11500 * Math.max(0, fade);
                break;
            }
        }
        pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value))), i * 2);
    }
    return splitAlawFrames(pcm16ToAlaw(pcm));
}

const SOS_ALERT_FRAMES = buildSosAlertFrames();

function create(options) {
    const opts = options || {};
    const sip = opts.sip;
    const log = opts.log;
    const udp = opts.dgram || dgram;
    const host = String(opts.host || '').trim();
    const realm = String(opts.realm || '').trim();
    const serverId = String(opts.serverId || '').trim();
    const sipPort = Number(opts.sipPort);
    const rtpBase = Number(opts.rtpBase) > 0 ? Number(opts.rtpBase) : DEFAULT_RTP_BASE;
    const onState = typeof opts.onState === 'function' ? opts.onState : function () {};
    const onMixedPcm = typeof opts.onMixedPcm === 'function' ? opts.onMixedPcm : function () {};
    let active = null;

    if (!sip) throw new Error('Group call requires SIP transport');
    if (!host || !realm || !serverId || !sipPort) throw new Error('Group call SIP identity is incomplete');

    function mediaLog(level, message, detail) {
        if (!log || !log.media || typeof log.media[level] !== 'function') return;
        log.media[level](message, detail);
    }

    function sipLog(level, message, detail) {
        if (!log || !log.sip || typeof log.sip[level] !== 'function') return;
        log.sip[level](message, detail);
    }

    function publicSession(session) {
        return {
            camId: session.camId,
            state: session.state,
            error: session.error || null,
            rtpPort: session.localPort,
            rxPackets: session.rxPackets,
            txPackets: session.txPackets,
            alerting: session.alertFrames.length > 0,
        };
    }

    function snapshot() {
        if (!active) return { active: false, phase: 'idle', participants: [] };
        const participants = [...active.sessions.values()].map(publicSession);
        const connected = participants.filter((row) => row.state === 'connected').length;
        const dialing = participants.filter((row) => row.state === 'dialing').length;
        return {
            active: true,
            callId: active.id,
            alarmCamId: active.alarmCamId,
            ownerSocketId: active.ownerSocketId,
            phase: connected > 0 ? 'connected' : (dialing > 0 ? 'dialing' : 'failed'),
            connected,
            total: participants.length,
            participants,
            startedAt: active.startedAt,
        };
    }

    function emitState() {
        try { onState(snapshot()); } catch (_) { /* state reporting cannot break calls */ }
    }

    function closeSessionSocket(session) {
        if (!session || !session.socket) return;
        try { session.socket.close(); } catch (_) { /* ignore */ }
        session.socket = null;
    }

    function clearSessionTimers(session) {
        if (session.inviteTimer) clearTimeout(session.inviteTimer);
        session.inviteTimer = null;
    }

    function sendCancel(session) {
        if (!session.request) return;
        try {
            sip.send({
                method: 'CANCEL',
                uri: session.request.uri,
                headers: {
                    to: session.request.headers.to,
                    from: session.request.headers.from,
                    'call-id': session.request.headers['call-id'],
                    cseq: { method: 'CANCEL', seq: session.request.headers.cseq.seq },
                },
            }, () => {});
        } catch (_) { /* ignore */ }
    }

    function sendBye(session) {
        if (!session.dialog) return;
        const dialog = session.dialog;
        try {
            sip.send({
                method: 'BYE',
                uri: dialog.uri,
                headers: {
                    to: dialog.to,
                    from: dialog.from,
                    'call-id': dialog.callId,
                    cseq: { method: 'BYE', seq: dialog.inviteCseq + 1 },
                },
            }, () => {});
        } catch (_) { /* ignore */ }
    }

    function stop(reason) {
        if (!active) return false;
        const call = active;
        active = null;
        if (call.mixTimer) clearInterval(call.mixTimer);
        call.sessions.forEach((session) => {
            clearSessionTimers(session);
            if (session.state === 'dialing') sendCancel(session);
            if (session.state === 'connected') sendBye(session);
            session.state = 'ended';
            closeSessionSocket(session);
        });
        mediaLog('info', 'SOS group call ended', {
            callId: call.id,
            reason: reason || 'ended',
            participants: call.sessions.size,
        });
        emitState();
        return true;
    }

    function sendFrame(session, alawFrame) {
        if (!active || !session || session.state !== 'connected'
            || !session.socket || !session.remoteHost || !session.remotePort) return false;
        const packet = buildRtpPcmaFrame(alawFrame, session.txSeq, session.txTimestamp, session.ssrc);
        session.txSeq = (session.txSeq + 1) & 0xFFFF;
        session.txTimestamp = (session.txTimestamp + FRAME_BYTES) >>> 0;
        try {
            session.socket.send(packet, session.remotePort, session.remoteHost);
            session.txPackets += 1;
            return true;
        } catch (_) {
            return false;
        }
    }

    function mixTick() {
        if (!active) return;
        const call = active;
        const connected = [...call.sessions.values()].filter((session) => session.state === 'connected');
        if (!connected.length) return;

        const sourceFrames = new Map();
        connected.forEach((session) => {
            const frame = session.rxQueue.length ? session.rxQueue.shift() : null;
            if (frame) sourceFrames.set(session.camId, frame);
        });
        const hasHqFrame = call.hqQueue.length > 0;
        const hqFrame = hasHqFrame ? call.hqQueue.shift() : null;

        if (sourceFrames.size > 0) {
            const hqMix = mixAlawFrames([...sourceFrames.values()]);
            try {
                onMixedPcm(alawToPcm16(hqMix), {
                    callId: call.id,
                    ownerSocketId: call.ownerSocketId,
                    sources: [...sourceFrames.keys()],
                });
            } catch (_) { /* browser audio cannot break field audio */ }
        }

        connected.forEach((target) => {
            if (target.alertFrames.length) {
                sendFrame(target, target.alertFrames.shift());
                if (!target.alertFrames.length) {
                    mediaLog('info', 'SOS group call tone complete', { camId: target.camId });
                    emitState();
                }
                return;
            }
            const mixInputs = hasHqFrame ? [hqFrame] : [];
            sourceFrames.forEach((frame, sourceCamId) => {
                if (sourceCamId !== target.camId) mixInputs.push(frame);
            });
            sendFrame(target, mixAlawFrames(mixInputs));
        });
    }

    function queueInbound(session, packet, rinfo) {
        if (!active || !session || session.state !== 'connected') return;
        const offset = rtpPayloadOffset(packet);
        if (offset >= packet.length) return;
        if (rinfo && rinfo.address && rinfo.port) {
            session.remoteHost = rinfo.address;
            session.remotePort = rinfo.port;
        }
        const frames = splitAlawFrames(packet.subarray(offset));
        frames.forEach((frame) => {
            if (session.rxQueue.length >= MAX_AUDIO_QUEUE_FRAMES) session.rxQueue.shift();
            session.rxQueue.push(frame);
        });
        session.rxPackets += 1;
    }

    function markFailed(session, error) {
        if (!session || session.state === 'ended') return;
        clearSessionTimers(session);
        session.state = 'failed';
        session.error = error || 'Call failed';
        closeSessionSocket(session);
        mediaLog('warn', 'SOS group call member failed', {
            camId: session.camId,
            error: session.error,
        });
        emitState();
        if (active && ![...active.sessions.values()].some((row) => (
            row.state === 'dialing' || row.state === 'binding' || row.state === 'connected'
        ))) {
            stop('no_members_connected');
        }
    }

    function handleInviteResponse(session, response) {
        if (!response || !response.status) return;
        if (response.status >= 100 && response.status < 200) {
            sipLog('info', 'SOS group invite provisional', {
                camId: session.camId,
                status: response.status,
            });
            return;
        }
        if (response.status !== 200) {
            markFailed(session, response.status === 486 ? 'BWC busy' : ('SIP ' + response.status));
            return;
        }

        try {
            sip.send({
                method: 'ACK',
                uri: session.contactUri,
                headers: {
                    to: response.headers.to,
                    from: response.headers.from,
                    'call-id': response.headers['call-id'],
                    cseq: { method: 'ACK', seq: response.headers.cseq.seq },
                },
            });
        } catch (_) { /* continue so a later BYE can clean up */ }

        if (session.state === 'connected' && session.dialog
            && session.dialog.callId === response.headers['call-id']) {
            return;
        }
        if (!active || session.state !== 'dialing') {
            const lateDialog = {
                uri: session.contactUri,
                to: response.headers.to,
                from: response.headers.from,
                callId: response.headers['call-id'],
                inviteCseq: response.headers.cseq.seq,
            };
            session.dialog = lateDialog;
            sendBye(session);
            closeSessionSocket(session);
            return;
        }

        const remote = sdpMedia.parseRemoteAudioEndpoint(response.content || '');
        if (!remote.host || !remote.port) {
            markFailed(session, 'No RTP endpoint in SIP answer');
            return;
        }
        clearSessionTimers(session);
        session.dialog = {
            uri: session.contactUri,
            to: response.headers.to,
            from: response.headers.from,
            callId: response.headers['call-id'],
            inviteCseq: response.headers.cseq.seq,
        };
        session.remoteHost = remote.host;
        session.remotePort = remote.port;
        session.state = 'connected';
        session.error = null;
        session.alertFrames = SOS_ALERT_FRAMES.map((frame) => Buffer.from(frame));
        mediaLog('info', 'SOS group call member connected', {
            camId: session.camId,
            localPort: session.localPort,
            remoteHost: session.remoteHost,
            remotePort: session.remotePort,
            toneMs: SOS_ALERT_FRAMES.length * FRAME_MS,
        });
        emitState();
    }

    function sendInvite(session) {
        const inviteSdp = sdpMedia.buildInviteSdp({
            host,
            serverId,
            mode: 'audio',
            transport: 'udp',
            audioPort: session.localPort,
            sessionName: 'Phone',
            audioDirection: 'both',
            voicePhone: true,
            includeTalkExtensions: false,
            privateHdaTcp: false,
        });
        const request = {
            method: 'INVITE',
            uri: session.contactUri,
            headers: {
                to: { uri: `sip:${session.camId}@${realm}` },
                from: {
                    uri: `sip:${serverId}@${realm}`,
                    params: { tag: crypto.randomBytes(4).toString('hex') },
                },
                'call-id': crypto.randomBytes(12).toString('hex'),
                cseq: { method: 'INVITE', seq: 1 },
                contact: [{ uri: `sip:${serverId}@${host}:${sipPort}` }],
                'content-type': 'application/sdp',
                'content-length': Buffer.byteLength(inviteSdp),
            },
            content: inviteSdp,
        };
        session.request = request;
        session.inviteTimer = setTimeout(() => {
            if (session.state === 'dialing') {
                sendCancel(session);
                markFailed(session, 'SIP timeout');
            }
        }, INVITE_TIMEOUT_MS);
        try {
            sip.send(request, (response) => handleInviteResponse(session, response));
        } catch (err) {
            markFailed(session, err && err.message ? err.message : 'SIP send failed');
        }
    }

    function openParticipantSocket(call, camId, index, contactUri) {
        return new Promise((resolve) => {
            const session = {
                camId,
                contactUri,
                localPort: rtpBase + index,
                socket: null,
                state: 'binding',
                error: null,
                request: null,
                dialog: null,
                inviteTimer: null,
                remoteHost: null,
                remotePort: null,
                rxQueue: [],
                alertFrames: [],
                rxPackets: 0,
                txPackets: 0,
                txSeq: crypto.randomBytes(2).readUInt16BE(0),
                txTimestamp: crypto.randomBytes(4).readUInt32BE(0),
                ssrc: crypto.randomBytes(4).readUInt32BE(0),
            };
            call.sessions.set(camId, session);
            const socket = udp.createSocket('udp4');
            session.socket = socket;
            socket.on('message', (packet, rinfo) => queueInbound(session, packet, rinfo));
            socket.on('error', (err) => {
                if (session.state === 'binding') {
                    markFailed(session, err && err.message ? err.message : 'RTP bind failed');
                    resolve(session);
                } else {
                    mediaLog('warn', 'SOS group RTP socket error', {
                        camId,
                        message: err && err.message,
                    });
                }
            });
            socket.bind(session.localPort, '0.0.0.0', () => {
                if (!active || active !== call) {
                    closeSessionSocket(session);
                    resolve(session);
                    return;
                }
                session.state = 'dialing';
                sendInvite(session);
                resolve(session);
            });
        });
    }

    async function start(startOptions) {
        const input = startOptions || {};
        if (active) throw new Error('A group call is already active');
        if (typeof sip.send !== 'function') {
            throw new Error('Group call SIP transport is not ready');
        }
        const camIds = uniqueCamIds(input.camIds);
        if (!camIds.length) throw new Error('No BWC selected for group call');
        const getContactUri = input.getContactUri;
        if (typeof getContactUri !== 'function') throw new Error('Group call contact resolver missing');

        const call = {
            id: 'sgc-' + crypto.randomBytes(6).toString('hex'),
            alarmCamId: String(input.alarmCamId || '').trim() || null,
            ownerSocketId: String(input.ownerSocketId || '').trim() || null,
            startedAt: Date.now(),
            sessions: new Map(),
            hqQueue: [],
            mixTimer: null,
        };
        active = call;
        const callable = camIds.map((camId) => ({ camId, contactUri: getContactUri(camId) }))
            .filter((row) => row.contactUri);
        if (!callable.length) {
            active = null;
            throw new Error('Selected BWCs are not SIP registered');
        }
        const missing = camIds.filter((camId) => !callable.some((row) => row.camId === camId));
        missing.forEach((camId) => {
            call.sessions.set(camId, {
                camId,
                state: 'failed',
                error: 'BWC not SIP registered',
                localPort: null,
                rxPackets: 0,
                txPackets: 0,
                alertFrames: [],
            });
        });
        emitState();
        await Promise.all(callable.map((row, index) => (
            openParticipantSocket(call, row.camId, index, row.contactUri)
        )));
        if (active === call) {
            call.mixTimer = setInterval(mixTick, FRAME_MS);
            mediaLog('info', 'SOS group call started', {
                callId: call.id,
                alarmCamId: call.alarmCamId,
                requested: camIds.length,
                callable: callable.length,
                rtpBase,
            });
            emitState();
        }
        return snapshot();
    }

    function sendHqAlaw(alawPayload) {
        if (!active || !alawPayload || !alawPayload.length) return false;
        splitAlawFrames(Buffer.from(alawPayload)).forEach((frame) => {
            if (active.hqQueue.length >= MAX_AUDIO_QUEUE_FRAMES) active.hqQueue.shift();
            active.hqQueue.push(frame);
        });
        return true;
    }

    function onRemoteBye(callId) {
        if (!active || !callId) return null;
        const session = [...active.sessions.values()].find((row) => (
            row.dialog && row.dialog.callId === callId
        ));
        if (!session) return null;
        clearSessionTimers(session);
        session.state = 'ended';
        session.error = null;
        closeSessionSocket(session);
        mediaLog('info', 'SOS group call member ended', { camId: session.camId });
        emitState();
        if (active && ![...active.sessions.values()].some((row) => (
            row.state === 'dialing' || row.state === 'binding' || row.state === 'connected'
        ))) {
            stop('all_members_ended');
        }
        return session.camId;
    }

    function isActive() {
        return !!active;
    }

    function isParticipant(camId) {
        const id = String(camId || '').trim();
        if (!active || !id) return false;
        const session = active.sessions.get(id);
        return !!(session && (session.state === 'dialing' || session.state === 'connected'));
    }

    function ownerSocketId() {
        return active ? active.ownerSocketId : null;
    }

    return {
        start,
        stop,
        sendHqAlaw,
        onRemoteBye,
        isActive,
        isParticipant,
        ownerSocketId,
        snapshot,
    };
}

module.exports = {
    create,
    uniqueCamIds,
    rtpPayloadOffset,
    normalizeFrame,
    splitAlawFrames,
    mixAlawFrames,
    buildRtpPcmaFrame,
    buildSosAlertFrames,
    MAX_PARTICIPANTS,
    FRAME_BYTES,
    FRAME_MS,
};
