const net = require('net');

const dgram = require('dgram');

const path = require('path');

const fs = require('fs');

const { spawn } = require('child_process');

const hdaMedia = require('./hdaMediaProtocol');

const sdpMedia = require('./sdpMedia');

const { resolveFfmpegPath } = require('./resolveFfmpeg');

const { createPsG711Extractor, alawToPcm16 } = require('./psG711Audio');

const log = require('./fleetLog');

const livePool = require('./liveStreamPool');

const MULTI_LIVE = process.env.FM_MULTI_LIVE !== '0';



const VIDEO_UDP_PORT = 40130;

const FFMPEG_UDP_PORT = 40133;

const AUDIO_UDP_PORT = 40132;

const MEDIA_TCP_PORT = 40131;

const LIVE_PROBE_BYTES = 524288;
const LIVE_ANALYZE_US = 500000;



let ffmpegProcess = null;

let ffmpegPath = null;

let rtpForwardSocket = null;
let rtpListenSocket = null;

let tcpMediaServer = null;

let activeMedia = { transport: 'udp', mode: 'video' };

let rtpPacketsSeen = 0;

let ffmpegAttached = false;
let audioWss = null;
let audioG711Extractor = null;
let audioWsBytes = 0;

const MEDIA_AUDIO_ENABLED = process.env.FM_MEDIA_AUDIO !== '0';
const AUDIO_PRIME_MS = parseInt(process.env.FM_AUDIO_PRIME_MS || '500', 10);
const AUDIO_PRIME_MIN_BYTES = parseInt(process.env.FM_AUDIO_PRIME_MIN_BYTES || '32768', 10);
const AUDIO_PRIME_MAX_PACKETS = 2048;
const WS_VIDEO_SOFT_DROP_BYTES = 4 * 1024 * 1024;
const WS_VIDEO_HARD_EVICT_BYTES = 16 * 1024 * 1024;
const WS_AUDIO_SOFT_DROP_BYTES = 512 * 1024;
const WS_AUDIO_HARD_EVICT_BYTES = 2 * 1024 * 1024;

let audioPrimeBuffer = [];
let audioPrimeBytes = 0;
let audioSidecarReady = false;
let audioPrimeTimer = null;
let audioBootPending = null;

let udpWatchTimer = null;
let tcpWatchTimer = null;
let tcpFeedSeen = false;
let activeDialog = null;
let activeCallDialog = null;
let callAudioListenSocket = null;
let callAudioTcpServer = null;
let callAudioTcpSocket = null;
let callAudioTcpBuf = Buffer.alloc(0);
let callAudioTcpFramed = true;
let callAudioPacketsSeen = 0;
/** Last inbound/outbound voice dialog per cam — used when platform BYE failed (404). */
const lastVoiceDialogByCam = new Map();
let callTxPacketsSeen = 0;
let callRemoteAudio = null;
let callRtpSeq = 0;
let callRtpTs = 0;
const CALL_RTP_SSRC = 0x43414c31;
let dashboardStreamActive = false;
let pendingInviteOpts = null;
let reinviteTimer = null;
let sosFallbackTimer = null;
let sosInviteRtpBaseline = 0;
let onVideoDecodeCb = null;
let pipeInputFormat = 'mpeg';
let pipeDecodeWatch = null;
let pipeDecoded = false;
let pipeFallbackFormats = [];
let pipeFallbackIndex = 0;

function clearAudioPrime() {
    if (audioPrimeTimer) {
        clearTimeout(audioPrimeTimer);
        audioPrimeTimer = null;
    }
    audioPrimeBuffer = [];
    audioPrimeBytes = 0;
    audioSidecarReady = false;
    audioBootPending = null;
}

function feedAudioPayload(payload) {
    if (!audioSidecarReady || !audioG711Extractor) return;
    const pcm = audioG711Extractor.feed(payload);
    broadcastAudioPcm(pcm);
}

function sendVideoWs(client, data, camId) {
    if (!client || client.readyState !== 1) return 'skip';
    const buf = client.bufferedAmount || 0;
    if (buf > WS_VIDEO_HARD_EVICT_BYTES) {
        log.media.warn('slow viewer evicted', { camId: camId || 'mediaSession', bufferedAmount: buf });
        try { client.terminate(); } catch (_) { /* ignore */ }
        return 'evict';
    }
    if (buf > WS_VIDEO_SOFT_DROP_BYTES) return 'drop';
    try { client.send(data); } catch (_) { /* ignore */ }
    return 'sent';
}

function sendAudioWs(client, pcm, camId) {
    if (!client || client.readyState !== 1) return 'skip';
    const buf = client.bufferedAmount || 0;
    if (buf > WS_AUDIO_HARD_EVICT_BYTES) {
        log.media.warn('slow audio viewer evicted', { camId: camId || 'mediaSession', bufferedAmount: buf });
        try { client.terminate(); } catch (_) { /* ignore */ }
        return 'evict';
    }
    if (buf > WS_AUDIO_SOFT_DROP_BYTES) return 'drop';
    try { client.send(pcm); } catch (_) { /* ignore */ }
    return 'sent';
}

function broadcastAudioPcm(pcm) {
    if (!pcm || !pcm.length || !audioWss) return;
    const prev = audioWsBytes;
    audioWsBytes += pcm.length;
    if (prev === 0) {
        log.media.info('audio ws first chunk', { bytes: pcm.length, clients: audioWss.clients.size });
    }
    audioWss.clients.forEach((client) => {
        sendAudioWs(client, pcm, 'mediaSession');
    });
}

function bootAudioSidecar(force) {
    if (audioSidecarReady || !audioBootPending || !MEDIA_AUDIO_ENABLED) return;
    if (!force && audioPrimeBytes < AUDIO_PRIME_MIN_BYTES) return;
    if (audioPrimeTimer) {
        clearTimeout(audioPrimeTimer);
        audioPrimeTimer = null;
    }
    audioSidecarReady = true;
    audioWsBytes = 0;
    audioG711Extractor = createPsG711Extractor();
    const batch = audioPrimeBuffer.splice(0);
    const primedBytes = audioPrimeBytes;
    audioPrimeBytes = 0;
    log.media.info('audio g711 pipeline started', {
        packets: batch.length,
        bytes: primedBytes,
        forced: !!force,
    });
    batch.forEach(feedAudioPayload);
}

function tryBootAudioSidecarEarly() {
    if (audioSidecarReady || !audioBootPending) return;
    if (audioPrimeBytes >= AUDIO_PRIME_MIN_BYTES) bootAudioSidecar(false);
}

function scheduleAudioSidecarBoot(baseDir, inputFormat) {
    clearAudioPrime();
    stopAudioPipelineOnly();
    audioBootPending = { baseDir, inputFormat };
    audioPrimeTimer = setTimeout(() => bootAudioSidecar(true), AUDIO_PRIME_MS);
}

function clearPipeDecodeWatch() {
    if (pipeDecodeWatch) {
        clearTimeout(pipeDecodeWatch);
        pipeDecodeWatch = null;
    }
}

function buildPipeFallbacks(primary) {
    const seen = new Set();
    const out = [];
    const add = (label) => {
        const d = ffmpegDemuxFormat(label);
        if (!seen.has(d)) {
            seen.add(d);
            out.push(label);
        }
    };
    add(primary);
    add('mpeg');
    add('h264');
    add('mpegts');
    return out;
}

function setOnVideoDecode(cb) {
    onVideoDecodeCb = typeof cb === 'function' ? cb : null;
    livePool.setOnVideoDecode(onVideoDecodeCb);
}

function setAudioFocusCamId(camId) {
    if (MULTI_LIVE) livePool.setAudioFocusCamId(camId);
}

function attachStreamClient(ws, camId) {
    if (MULTI_LIVE) livePool.attachStreamClient(ws, camId);
}

function attachLegacyStreamClient(ws, wss) {
    if (MULTI_LIVE) livePool.attachLegacyStreamClient(ws);
    else if (wss) attachFfmpegToWs(wss);
}

function countActiveStreams() {
    return MULTI_LIVE ? livePool.countActive() : (isStreamingForCam(getWatchingCamId()) ? 1 : 0);
}

function getPorts() {

    return { VIDEO_UDP_PORT, AUDIO_UDP_PORT, MEDIA_TCP_PORT };

}



function ensureRtpForwarder(host) {

    if (rtpForwardSocket) return rtpForwardSocket;

    rtpForwardSocket = dgram.createSocket('udp4');

    rtpForwardSocket.on('error', (err) => log.media.err('rtp forwarder', err.message));

    return rtpForwardSocket;

}



function closeRtpListener() {
    if (rtpListenSocket) {
        try { rtpListenSocket.close(); } catch (_) { /* ignore */ }
        rtpListenSocket = null;
    }
}

function rtpPayloadOffset(rtpBuf) {
    if (!rtpBuf || rtpBuf.length < 12) return 12;
    const cc = rtpBuf[0] & 0x0f;
    let off = 12 + cc * 4;
    if ((rtpBuf[0] & 0x10) && off + 4 <= rtpBuf.length) {
        const extLen = rtpBuf.readUInt16BE(off + 2);
        off += 4 + extLen * 4;
    }
    return Math.min(off, rtpBuf.length);
}

function detectRtpVideoFormat(rtpBuf) {
    const payload = rtpBuf.subarray(rtpPayloadOffset(rtpBuf));
    if (payload.length < 4) return 'mpeg';
    let sc = -1;
    if (payload[0] === 0x00 && payload[1] === 0x00 && payload[2] === 0x01) sc = 3;
    else if (payload.length >= 5 && payload[0] === 0x00 && payload[1] === 0x00
        && payload[2] === 0x00 && payload[3] === 0x01) sc = 4;
    if (sc >= 0 && sc < payload.length) {
        const b = payload[sc];
        if (b === 0xba || b === 0xe0 || b === 0xbd || b === 0xbb) return 'mpeg';
        if (b === 0x67 || b === 0x68 || b === 0x65 || b === 0x61 || (b & 0x7f) === 0x67) return 'h264';
    }
    if (payload[0] === 0x47) return 'mpegts';
    for (let j = 188; j + 188 <= payload.length; j += 188) {
        if (payload[j] === 0x47) return 'mpegts';
    }
    return 'mpeg';
}

function ffmpegDemuxFormat(fmt) {
    if (fmt === 'mpegts' || fmt === 'ts') return 'mpegts';
    if (fmt === 'h264') return 'h264';
    return 'mpeg';
}

function startRtpListener(devicePort, ffmpegPort, host, hooks = {}) {
    if (rtpListenSocket) return;
    rtpPacketsSeen = 0;
    rtpListenSocket = dgram.createSocket('udp4');
    rtpListenSocket.on('error', (err) => log.media.err('rtp listen', err.message));
    rtpListenSocket.on('message', (msg, rinfo) => {
        const payload = msg.subarray(rtpPayloadOffset(msg));
        rtpPacketsSeen += 1;
        if (rtpPacketsSeen === 1) {
            const fmt = detectRtpVideoFormat(msg);
            log.media.info('rtp received', {
                devicePort,
                from: rinfo.address,
                bytes: msg.length,
                payloadBytes: payload.length,
                format: fmt,
                head: payload.subarray(0, 8).toString('hex'),
            });
            if (hooks.onFirstPacket) hooks.onFirstPacket(msg, fmt);
        }
        if (hooks.onRtpPayload) hooks.onRtpPayload(payload);
        else if (ffmpegPort) forwardRtp(host, ffmpegPort, msg);
    });
    rtpListenSocket.bind(devicePort, '0.0.0.0', () => {
        log.media.info('rtp listening', { devicePort, forwardTo: ffmpegPort });
    });
}

function forwardRtp(host, port, rtpBuf) {
    if (!rtpBuf || !rtpBuf.length) return;
    ensureRtpForwarder(host).send(rtpBuf, port, host);
}

function describeTcpAudio(audio) {
    if (!audio) return { codec: 'unknown' };
    const map = { 1: 'pcm', 2: 'pcma', 3: 'pcmu' };
    const codec = map[audio.nFormat] || `format_${audio.nFormat}`;
    return {
        codec,
        hint: audio.nFormat === 1 ? 'pcm_or_wav_payload' : codec,
        nBits: audio.nBits,
        nChannel: audio.nChannel,
        nSampleRate: audio.nSampleRate,
    };
}

function describeTcpAudioPayload(lpData) {
    if (!lpData || !lpData.length) return { kind: 'empty' };
    const head = lpData.subarray(0, Math.min(12, lpData.length)).toString('hex');
    if (lpData.length >= 4 && lpData[0] === 0x52 && lpData[1] === 0x49 && lpData[2] === 0x46 && lpData[3] === 0x46) {
        return { kind: 'wav_riff', head };
    }
    if (lpData.length >= 12 && (lpData[0] & 0xc0) === 0x80) {
        return { kind: 'rtp_wrapped', head, payloadType: lpData[1] & 0x7f };
    }
    return { kind: 'raw', head };
}



function clearUdpWatch() {

    if (udpWatchTimer) {

        clearTimeout(udpWatchTimer);

        udpWatchTimer = null;

    }

}

function clearTcpWatch() {
    if (tcpWatchTimer) {
        clearTimeout(tcpWatchTimer);
        tcpWatchTimer = null;
    }
}

function clearSosFallbackReinvite() {
    if (sosFallbackTimer) {
        clearTimeout(sosFallbackTimer);
        sosFallbackTimer = null;
    }
}

function clearReinviteTimer() {
    if (reinviteTimer) {
        clearTimeout(reinviteTimer);
        reinviteTimer = null;
    }
    clearSosFallbackReinvite();
}

function sosStreamRecovered() {
    if (!ffmpegProcess) return false;
    if (pipeDecoded) return true;
    return rtpPacketsSeen > sosInviteRtpBaseline;
}

function scheduleTcpWatch(onNoTcp) {
    clearTcpWatch();
    const baseline = tcpFeedSeen;
    tcpWatchTimer = setTimeout(() => {
        if (activeMedia.transport !== 'tcp') return;
        if (tcpFeedSeen !== baseline) return;
        log.media.warn('no tcp feed', {
            port: MEDIA_TCP_PORT,
            hint: 'BWC must connect TCP to ' + MEDIA_TCP_PORT + ' or use FM_MEDIA_TRANSPORT=udp',
        });
        if (onNoTcp) onNoTcp();
    }, 8000);
}

function captureCallDialog(inviteRequest, response, camId, opts) {
    const inboundUas = !!(opts && opts.inboundUas);
    const dlgFrom = inboundUas ? response.headers.to : response.headers.from;
    const dlgTo = inboundUas ? response.headers.from : response.headers.to;
    let uri = inviteRequest.uri;
    if (inboundUas) {
        const contacts = inviteRequest.headers.contact;
        const contact = Array.isArray(contacts) ? contacts[0] : contacts;
        if (contact && contact.uri) uri = contact.uri;
        else if (inviteRequest.headers.from && inviteRequest.headers.from.uri) {
            uri = inviteRequest.headers.from.uri;
        }
    }
    activeCallDialog = {
        uri,
        callId: response.headers['call-id'],
        from: dlgFrom,
        to: dlgTo,
        inviteCseq: inviteRequest.headers.cseq && inviteRequest.headers.cseq.seq,
        camId: camId || null,
        inboundUas,
    };
    if (camId) lastVoiceDialogByCam.set(camId, Object.assign({}, activeCallDialog));
}

let callKeepaliveTimer = null;

function clearCallKeepalive() {
    if (callKeepaliveTimer) {
        clearInterval(callKeepaliveTimer);
        callKeepaliveTimer = null;
    }
}

function callAudioTxReady() {
    if (!activeCallDialog) return false;
    if (activeMedia.transport === 'tcp') {
        const tcpUp = !!(callAudioTcpSocket && !callAudioTcpSocket.destroyed);
        return tcpUp || !!callRemoteAudio;
    }
    return !!callRemoteAudio;
}

/** Punch symmetric RTP — many BWCs send audio only after receiving platform RTP first. */
function startCallAudioRtpKeepalive() {
    clearCallKeepalive();
    if (!callAudioTxReady()) return;
    const silence = Buffer.alloc(160, 0xD5);
    let sent = 0;
    const tick = () => {
        if (!activeCallDialog) {
            clearCallKeepalive();
            return;
        }
        if (!callAudioTxReady()) return;
        sendVoiceCallAudio(silence);
        sent += 1;
        if (sent >= 75) clearCallKeepalive();
    };
    tick();
    callKeepaliveTimer = setInterval(tick, 20);
}

let voiceDuplexWatchTimer = null;

function clearVoiceDuplexWatch() {
    if (voiceDuplexWatchTimer) {
        clearTimeout(voiceDuplexWatchTimer);
        voiceDuplexWatchTimer = null;
    }
}

/** Log hardware/duplex alert if BWC never sends return audio after connect. */
function scheduleVoiceDuplexWatch(camId, waitMs) {
    clearVoiceDuplexWatch();
    const id = String(camId || '').trim();
    if (!id) return;
    const delay = waitMs != null ? waitMs : 12000;
    voiceDuplexWatchTimer = setTimeout(() => {
        voiceDuplexWatchTimer = null;
        if (!isVoiceCallActiveForCam(id)) return;
        if (callAudioPacketsSeen > 0) return;
        log.media.warn('voice call duplex alert', {
            camId: id,
            reason: 'no_rx_from_bwc',
            hint: 'check_device_audio_routing_or_use_outbound_talk_profile',
        });
    }, delay);
}

function noteCallAudioTcpFraming(chunk) {
    if (!chunk || chunk.length < 4) return;
    if ((chunk[0] & 0xc0) === 0x80) {
        callAudioTcpFramed = false;
        return;
    }
    const lenBe = chunk.readUInt16BE(0);
    if (lenBe >= 12 && lenBe <= 4096 && chunk.length >= 2 + lenBe && (chunk[2] & 0xc0) === 0x80) {
        callAudioTcpFramed = true;
    }
}

function setupIntercomAudioAfterAnswer(parsed, response, host) {
    const remote = sdpMedia.parseRemoteAudioEndpoint(response.content || '');
    activeMedia = { transport: parsed.transport, mode: 'audio' };
    if (parsed.transport === 'tcp') {
        if (remote.host && remote.port) setCallRemoteAudio(remote.host, remote.port);
        beginIntercomAudioTcp(host, () => startCallAudioRtpKeepalive());
    } else {
        if (remote.host && remote.port) setCallRemoteAudio(remote.host, remote.port);
        beginIntercomAudioRtp(host, () => startCallAudioRtpKeepalive());
    }
}

function stopIntercomAudioListener() {
    clearCallKeepalive();
    if (callAudioListenSocket) {
        try { callAudioListenSocket.close(); } catch (_) { /* ignore */ }
        callAudioListenSocket = null;
    }
    if (callAudioTcpSocket) {
        try { callAudioTcpSocket.destroy(); } catch (_) { /* ignore */ }
        callAudioTcpSocket = null;
    }
    if (callAudioTcpServer) {
        try { callAudioTcpServer.close(); } catch (_) { /* ignore */ }
        callAudioTcpServer = null;
    }
    callAudioTcpBuf = Buffer.alloc(0);
    callAudioTcpFramed = true;
    callAudioPacketsSeen = 0;
}

function handleCallAudioRtpPacket(msg) {
    const payload = msg.subarray(rtpPayloadOffset(msg));
    if (!payload.length) return;
    callAudioPacketsSeen += 1;
    if (callAudioPacketsSeen === 1) {
        log.media.info('call audio rtp', {
            port: AUDIO_UDP_PORT,
            transport: activeMedia.transport,
            bytes: msg.length,
            payloadBytes: payload.length,
            pt: msg.length >= 2 ? (msg[1] & 0x7f) : null,
        });
        startCallAudioRtpKeepalive();
    }
    const pcm = alawToPcm16(payload);
    broadcastAudioPcm(pcm);
}

function drainCallAudioTcpBuf() {
    let stalled = 0;
    while (callAudioTcpBuf.length >= 2 && stalled < 4) {
        const before = callAudioTcpBuf.length;

        if (callAudioTcpBuf[0] === 0x24 && callAudioTcpBuf.length >= 4) {
            const len = callAudioTcpBuf.readUInt16BE(2);
            if (len >= 12 && len <= 4096 && callAudioTcpBuf.length >= 4 + len) {
                handleCallAudioRtpPacket(callAudioTcpBuf.subarray(4, 4 + len));
                callAudioTcpBuf = callAudioTcpBuf.subarray(4 + len);
                continue;
            }
        }

        const lenBe = callAudioTcpBuf.readUInt16BE(0);
        if (lenBe >= 12 && lenBe <= 4096 && callAudioTcpBuf.length >= 2 + lenBe) {
            handleCallAudioRtpPacket(callAudioTcpBuf.subarray(2, 2 + lenBe));
            callAudioTcpBuf = callAudioTcpBuf.subarray(2 + lenBe);
            continue;
        }

        const lenLe = callAudioTcpBuf.readUInt16LE(0);
        if (lenLe >= 12 && lenLe <= 4096 && callAudioTcpBuf.length >= 2 + lenLe) {
            handleCallAudioRtpPacket(callAudioTcpBuf.subarray(2, 2 + lenLe));
            callAudioTcpBuf = callAudioTcpBuf.subarray(2 + lenLe);
            continue;
        }

        if ((callAudioTcpBuf[0] & 0xc0) === 0x80) {
            const off = rtpPayloadOffset(callAudioTcpBuf);
            const pktLen = Math.min(callAudioTcpBuf.length, off + 160);
            if (callAudioTcpBuf.length >= 12) {
                handleCallAudioRtpPacket(callAudioTcpBuf.subarray(0, pktLen));
                callAudioTcpBuf = callAudioTcpBuf.subarray(pktLen);
                continue;
            }
        }

        if (callAudioTcpBuf.length === before) {
            stalled += 1;
            if (callAudioTcpBuf.length > 65536) {
                log.media.warn('call audio tcp buf overflow', { bytes: callAudioTcpBuf.length });
                callAudioTcpBuf = Buffer.alloc(0);
            }
            break;
        }
    }
}

function writeCallAudioTcpRtp(rtp) {
    if (!callAudioTcpSocket || callAudioTcpSocket.destroyed) return false;
    try {
        if (callAudioTcpFramed) {
            const frame = Buffer.alloc(2 + rtp.length);
            frame.writeUInt16BE(rtp.length, 0);
            rtp.copy(frame, 2);
            callAudioTcpSocket.write(frame);
        } else {
            callAudioTcpSocket.write(rtp);
        }
        return true;
    } catch (_) {
        return false;
    }
}

function clearCallAudioTx() {
    callRemoteAudio = null;
    callRtpSeq = 0;
    callRtpTs = 0;
    callTxPacketsSeen = 0;
}

function setCallRemoteAudio(host, port) {
    if (host && port > 0) {
        callRemoteAudio = { host: String(host).trim(), port };
    } else {
        callRemoteAudio = null;
    }
}

function ensureCallTxSocket() {
    /* TX uses callAudioListenSocket (bound AUDIO_UDP_PORT) so BWC sees port 40132. */
    return callAudioListenSocket;
}

function learnCallRemoteFromRtp(rinfo, source) {
    if (!rinfo || !rinfo.address || !rinfo.port) return;
    const host = String(rinfo.address).trim();
    const port = rinfo.port;
    if (!host || port <= 0) return;
    const prev = callRemoteAudio;
    setCallRemoteAudio(host, port);
    if (!prev || prev.host !== host || prev.port !== port) {
        log.media.info('voice call tx target', {
            host,
            port,
            source: source || 'rtp',
            prev: prev ? { host: prev.host, port: prev.port } : null,
        });
    }
}

function buildRtpPcmaFrame(alawPayload, seq, ts) {
    const hdr = Buffer.alloc(12);
    hdr[0] = 0x80;
    hdr[1] = 8;
    hdr.writeUInt16BE(seq & 0xffff, 2);
    hdr.writeUInt32BE(ts >>> 0, 4);
    hdr.writeUInt32BE(CALL_RTP_SSRC, 8);
    return Buffer.concat([hdr, alawPayload]);
}

function beginIntercomAudioRtp(host, onReady) {
    stopIntercomAudioListener();
    if (!MEDIA_AUDIO_ENABLED) {
        if (onReady) onReady();
        return;
    }
    callAudioListenSocket = dgram.createSocket('udp4');
    callAudioListenSocket.on('error', (err) => log.media.err('call audio listen', err.message));
    callAudioListenSocket.on('message', (msg, rinfo) => {
        if (callAudioPacketsSeen === 0) learnCallRemoteFromRtp(rinfo, 'first-rx');
        handleCallAudioRtpPacket(msg);
    });
    callAudioListenSocket.bind(AUDIO_UDP_PORT, '0.0.0.0', () => {
        log.media.info('call audio listening', { port: AUDIO_UDP_PORT, host, transport: 'udp' });
        if (onReady) onReady();
    });
}

function beginIntercomAudioTcp(host, onReady) {
    stopIntercomAudioListener();
    if (!MEDIA_AUDIO_ENABLED) {
        if (onReady) onReady();
        return;
    }
    callAudioTcpFramed = false;
    const ready = { tcp: false, udp: false };
    const maybeReady = () => {
        if (ready.tcp && ready.udp && onReady) onReady();
    };

    callAudioListenSocket = dgram.createSocket('udp4');
    callAudioListenSocket.on('error', (err) => log.media.err('call audio listen udp', err.message));
    callAudioListenSocket.on('message', (msg, rinfo) => {
        if (callAudioPacketsSeen === 0) learnCallRemoteFromRtp(rinfo, 'first-rx-udp');
        handleCallAudioRtpPacket(msg);
    });
    callAudioListenSocket.bind(AUDIO_UDP_PORT, '0.0.0.0', () => {
        ready.udp = true;
        maybeReady();
    });

    callAudioTcpServer = net.createServer((socket) => {
        if (callAudioTcpSocket) {
            try { callAudioTcpSocket.destroy(); } catch (_) { /* ignore */ }
        }
        callAudioTcpSocket = socket;
        callAudioTcpBuf = Buffer.alloc(0);
        log.media.info('call audio tcp connected', {
            peer: `${socket.remoteAddress}:${socket.remotePort}`,
            port: AUDIO_UDP_PORT,
        });
        socket.on('data', (chunk) => {
            if (!socket._callAudioTcpLogged) {
                socket._callAudioTcpLogged = true;
                noteCallAudioTcpFraming(chunk);
                log.media.info('call audio tcp first bytes', {
                    peer: `${socket.remoteAddress}:${socket.remotePort}`,
                    bytes: chunk.length,
                    framed: callAudioTcpFramed,
                    hex: chunk.subarray(0, Math.min(48, chunk.length)).toString('hex'),
                });
            }
            callAudioTcpBuf = Buffer.concat([callAudioTcpBuf, chunk]);
            drainCallAudioTcpBuf();
        });
        socket.on('close', () => {
            if (callAudioTcpSocket === socket) callAudioTcpSocket = null;
        });
        socket.on('error', (err) => log.media.err('call audio tcp', err.message));
        startCallAudioRtpKeepalive();
    });
    callAudioTcpServer.on('error', (err) => log.media.err('call audio tcp listen', err.message));
    callAudioTcpServer.listen(AUDIO_UDP_PORT, '0.0.0.0', () => {
        log.media.info('call audio listening', { port: AUDIO_UDP_PORT, host, transport: 'tcp+udp' });
        ready.tcp = true;
        maybeReady();
    });
}

function isVoiceCallActive() {
    return !!activeCallDialog;
}

function isVoiceCallActiveForCam(camId) {
    return !!(activeCallDialog && camId && activeCallDialog.camId === camId);
}

function getVoiceCallCamId() {
    return activeCallDialog && activeCallDialog.camId ? activeCallDialog.camId : null;
}

function sendByeForDialog(sip, dlg, label, done) {
    if (!sip || !dlg) {
        if (done) done();
        return;
    }
    const byeSeq = (parseInt(dlg.inviteCseq, 10) || 1) + 1;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        if (done) done();
    };
    sip.send({
        method: 'BYE',
        uri: dlg.uri,
        headers: {
            to: dlg.to,
            from: dlg.from,
            'call-id': dlg.callId,
            cseq: { method: 'BYE', seq: byeSeq },
        },
    }, (res) => {
        log.sip.info(label || 'voice call bye', { status: res && res.status, camId: dlg.camId });
        finish();
    });
    setTimeout(finish, 800);
}

function endVoiceCallOnly(sip, done) {
    clearVoiceDuplexWatch();
    stopIntercomAudioListener();
    clearCallAudioTx();
    if (!activeCallDialog) {
        if (done) done();
        return;
    }
    const dlg = activeCallDialog;
    activeCallDialog = null;
    if (dlg.camId) lastVoiceDialogByCam.delete(dlg.camId);
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        log.media.info('voice call ended', { camId: dlg.camId });
        if (done) setTimeout(done, 200);
    };
    if (!sip) {
        finish();
        return;
    }
    sendByeForDialog(sip, dlg, 'voice call bye', finish);
}

function teardownVoiceCallForCam(sip, camId, done) {
    if (activeCallDialog && activeCallDialog.camId === camId) {
        endVoiceCallOnly(sip, done);
        return;
    }
    const stale = lastVoiceDialogByCam.get(camId);
    if (stale && sip) {
        lastVoiceDialogByCam.delete(camId);
        log.media.info('voice call stale bye', { camId });
        sendByeForDialog(sip, stale, 'voice call bye stale', done);
        return;
    }
    if (done) done();
}

function sendVoiceCallInvite(sip, opts) {
    if (!opts || !opts.preserveVideo) {
        sendInviteWithFallback(sip, opts);
        return;
    }
    if (activeCallDialog) {
        endVoiceCallOnly(sip, () => sendVoiceCallInvite(sip, opts));
        return;
    }
    sendInvite(sip, {
        ...opts,
        mode: 'audio',
        transport: 'udp',
        preserveVideo: true,
    });
}

function startAudioOnlyVoiceCall(sip, opts) {
    if (!opts || !opts.camId || !opts.cameraContactUri) {
        if (opts && opts.onFailed) opts.onFailed('Missing device contact');
        return;
    }
    const { onConnected, onFailed, camId } = opts;

    const finishFail = (msg) => {
        if (onFailed) onFailed(msg);
    };

    const onAnswer = (response, negotiated) => {
        if (response.status === 200 && negotiated && negotiated.voiceCall) {
            if (onConnected) onConnected(camId);
            return;
        }
        let msg = 'Voice call failed';
        if (response.status === 486) msg = 'BWC busy';
        else if (response.status) msg = 'Voice call failed (' + response.status + ')';
        finishFail(msg);
    };

    const runInvite = (transport) => {
        sendInvite(sip, {
            ...opts,
            mode: 'audio',
            audioOnlyCall: true,
            transport,
            onAnswer,
        });
    };

    const startPrimary = () => {
        runInvite('udp');
    };

    const begin = () => {
        if (activeCallDialog) {
            endVoiceCallOnly(sip, startPrimary);
            return;
        }
        if (activeDialog) {
            endActiveCall(sip, startPrimary);
            return;
        }
        startPrimary();
    };

    begin();
}

/** Platform-initiated Talk INVITE — full-duplex without Broadcast dial-back. */
function startOutboundTalkCall(sip, opts) {
    if (!opts || !opts.camId || !opts.cameraContactUri) {
        if (opts && opts.onFailed) opts.onFailed('Missing device contact');
        return;
    }
    const { onConnected, onFailed, camId } = opts;

    const finishFail = (msg) => {
        if (onFailed) onFailed(msg);
    };

    const onAnswer = (response, negotiated) => {
        if (response.status === 200 && negotiated && negotiated.voiceCall) {
            scheduleVoiceDuplexWatch(camId);
            if (onConnected) onConnected(camId);
            return;
        }
        let msg = 'Voice call failed';
        if (response.status === 486) msg = 'BWC busy';
        else if (response.status) msg = 'Voice call failed (' + response.status + ')';
        finishFail(msg);
    };

    const runInvite = (transport) => {
        sendInvite(sip, {
            ...opts,
            mode: 'audio',
            audioOnlyCall: true,
            useTalkSubject: true,
            sessionName: 'Talk',
            transport,
            onAnswer,
        });
    };

    const startPrimary = () => runInvite('udp');

    const begin = () => {
        if (activeCallDialog) {
            endVoiceCallOnly(sip, startPrimary);
            return;
        }
        if (activeDialog) {
            endActiveCall(sip, startPrimary);
            return;
        }
        startPrimary();
    };

    begin();
}

function sendVoiceCallAudio(alawBuf) {
    if (!activeCallDialog || !alawBuf || !alawBuf.length) return false;
    const frameSize = 160;
    let off = 0;
    while (off < alawBuf.length) {
        const chunk = alawBuf.subarray(off, off + frameSize);
        if (!chunk.length) break;
        const rtp = buildRtpPcmaFrame(chunk, callRtpSeq, callRtpTs);
        callRtpSeq = (callRtpSeq + 1) & 0xffff;
        callRtpTs = (callRtpTs + chunk.length) >>> 0;
        let sent = false;
        if (activeMedia.transport === 'tcp') {
            sent = writeCallAudioTcpRtp(rtp);
            if (callRemoteAudio) {
                const sock = ensureCallTxSocket();
                if (sock) {
                    try {
                        sock.send(rtp, callRemoteAudio.port, callRemoteAudio.host);
                        sent = true;
                    } catch (_) {
                        if (!sent) return false;
                    }
                }
            }
        } else if (callRemoteAudio) {
            const sock = ensureCallTxSocket();
            if (sock) {
                try {
                    sock.send(rtp, callRemoteAudio.port, callRemoteAudio.host);
                    sent = true;
                } catch (_) {
                    return false;
                }
            }
        }
        if (!sent) return false;
        callTxPacketsSeen += 1;
        if (callTxPacketsSeen === 1) {
            log.media.info('call audio tx first', {
                transport: activeMedia.transport,
                host: callRemoteAudio && callRemoteAudio.host,
                port: callRemoteAudio && callRemoteAudio.port,
                localPort: AUDIO_UDP_PORT,
                bytes: chunk.length,
            });
        }
        off += frameSize;
    }
    return true;
}

function captureDialog(inviteRequest, response) {
    activeDialog = {
        uri: inviteRequest.uri,
        callId: response.headers['call-id'],
        from: response.headers.from,
        to: response.headers.to,
        inviteCseq: response.headers.cseq && response.headers.cseq.seq,
    };
}

function endActiveCall(sip, done) {
    clearUdpWatch();
    clearTcpWatch();
    clearReinviteTimer();
    if (!activeDialog) {
        stopFfmpeg();
        if (done) done();
        return;
    }
    const dlg = activeDialog;
    activeDialog = null;
    const byeSeq = (parseInt(dlg.inviteCseq, 10) || 1) + 1;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        stopFfmpeg();
        if (done) setTimeout(done, 500);
    };
    sip.send({
        method: 'BYE',
        uri: dlg.uri,
        headers: {
            to: dlg.to,
            from: dlg.from,
            'call-id': dlg.callId,
            cseq: { method: 'BYE', seq: byeSeq },
        },
    }, (res) => {
        log.sip.info('bye sent', { status: res && res.status });
        finish();
    });
    setTimeout(finish, 1500);
}

function onRemoteBye(sip, callId) {
    if (activeCallDialog && callId && activeCallDialog.callId === callId) {
        stopIntercomAudioListener();
        clearCallAudioTx();
        const camId = activeCallDialog.camId;
        activeCallDialog = null;
        if (camId) lastVoiceDialogByCam.delete(camId);
        log.media.info('voice call ended', { camId, reason: 'remote_bye' });
        return camId || null;
    }
    if (MULTI_LIVE && callId && livePool.onRemoteBye(callId)) {
        return null;
    }
    activeDialog = null;
    clearUdpWatch();
    clearTcpWatch();
    stopFfmpeg();
    log.media.info('session ended', { reason: 'remote_bye' });
    clearReinviteTimer();
    return null;
}

function getWatchingCamId() {
    if (MULTI_LIVE && livePool.countActive() > 0) return livePool.getWatchingCamId();
    if (!dashboardStreamActive || !pendingInviteOpts) return null;
    return pendingInviteOpts.camId || null;
}

function setDashboardStreamActive(active, inviteOpts) {
    dashboardStreamActive = !!active;
    if (inviteOpts) pendingInviteOpts = inviteOpts;
    if (!active) {
        pendingInviteOpts = null;
        clearReinviteTimer();
    }
}

function isDashboardWatchingCam(camId) {
    if (!camId) return false;
    if (MULTI_LIVE && livePool.isDashboardWatchingCam(camId)) return true;
    return !!(dashboardStreamActive && pendingInviteOpts && pendingInviteOpts.camId === camId);
}

function isStreamingForCam(camId) {
    if (MULTI_LIVE && livePool.isDashboardWatchingCam(camId)) return livePool.isStreamingForCam(camId);
    if (!isDashboardWatchingCam(camId)) return false;
    return !!(activeDialog && ffmpegProcess);
}

function clearReinviteOnSos(camId) {
    if (MULTI_LIVE && camId) {
        livePool.clearReinviteOnSos(camId);
        return;
    }
    if (camId && isDashboardWatchingCam(camId)) {
        log.media.info('sos re-invite armed', { camId });
    }
}

function scheduleSosReinvite(sip, camIdArg) {
    if (MULTI_LIVE) {
        const id = camIdArg || getWatchingCamId();
        if (id) livePool.scheduleSosReinvite(sip, id);
        return;
    }
    clearReinviteTimer();
    if (!dashboardStreamActive || !pendingInviteOpts || !sip) return;
    const camId = pendingInviteOpts.camId;
    const quickMs = 750;
    const fallbackMs = 2100;
    pendingInviteOpts.sosReinvite = true;
    log.media.info('sos re-invite scheduled', { camId, quickMs, fallbackMs });

    const sendSosInvite = (phase) => {
        if (!dashboardStreamActive || !pendingInviteOpts) return;
        sosInviteRtpBaseline = rtpPacketsSeen;
        pipeDecoded = false;
        log.media.info('sos re-invite sending', { camId: pendingInviteOpts.camId, phase });
        sendInviteWithFallback(sip, { ...pendingInviteOpts, sosReinvite: true });
    };

    reinviteTimer = setTimeout(() => {
        reinviteTimer = null;
        if (!dashboardStreamActive || !pendingInviteOpts) return;
        sendSosInvite('quick');
        sosFallbackTimer = setTimeout(() => {
            sosFallbackTimer = null;
            if (!dashboardStreamActive || !pendingInviteOpts) return;
            if (sosStreamRecovered()) {
                log.media.info('sos re-invite fallback skipped', { camId, reason: 'stream recovered' });
                return;
            }
            log.media.info('sos re-invite fallback', { camId });
            endActiveCall(sip, () => sendSosInvite('fallback'));
        }, fallbackMs - quickMs);
    }, quickMs);
}

function stopMediaSession(sip, camId) {
    const finish = () => {
        if (MULTI_LIVE) {
            if (camId) return livePool.stopStreamForCam(sip, camId);
            if (livePool.countActive() > 0) return livePool.stopAllStreams(sip);
        }
        setDashboardStreamActive(false);
        if (activeMedia.transport === 'rtsp') {
            stopFfmpeg();
            activeMedia = { transport: 'udp', mode: 'video' };
            log.media.info('stream stopped', { reason: 'dashboard', transport: 'rtsp' });
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            endActiveCall(sip, () => {
                log.media.info('stream stopped', { reason: 'dashboard' });
                resolve();
            });
        });
    };
    if (activeCallDialog && (!camId || activeCallDialog.camId === camId)) {
        return new Promise((resolve) => {
            endVoiceCallOnly(sip, () => {
                Promise.resolve(finish()).then(resolve);
            });
        });
    }
    return finish();
}

function scheduleUdpWatch(onNoRtp, timeoutMs) {

    clearUdpWatch();

    const baseline = rtpPacketsSeen;

    const waitMs = typeof timeoutMs === 'number' ? timeoutMs : 8000;

    udpWatchTimer = setTimeout(() => {

        if (activeMedia.transport !== 'udp') return;

        if (rtpPacketsSeen > baseline) return;

        log.media.warn('no rtp on udp', {

            port: VIDEO_UDP_PORT,

            waitMs,

            hint: 'firewall UDP ' + VIDEO_UDP_PORT + ' or set FM_MEDIA_TRANSPORT=tcp on BWC and .env',

        });

        if (onNoRtp) onNoRtp();

    }, waitMs);

}



function stopFfmpegOnly() {
    clearPipeDecodeWatch();
    ffmpegAttached = false;
    if (ffmpegProcess) {
        try {
            if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                ffmpegProcess.stdin.end();
            }
        } catch (_) { /* ignore */ }
        try { ffmpegProcess.kill('SIGINT'); } catch (e) { /* ignore */ }
        ffmpegProcess = null;
    }
}

function stopAudioPipelineOnly() {
    clearAudioPrime();
    audioWsBytes = 0;
    if (audioG711Extractor) {
        audioG711Extractor.reset();
        audioG711Extractor = null;
    }
}

function stopFfmpeg() {
    clearUdpWatch();
    closeRtpListener();
    stopFfmpegOnly();
    stopAudioPipelineOnly();
}

function setAudioWss(wss) {
    audioWss = wss;
    livePool.setAudioWss(wss);
}



function writeRecvSdp(baseDir, videoPort, rtpFormat, opts = {}) {
    const { withAudio = false, audioPort = AUDIO_UDP_PORT } = opts;

    const localSdpPath = path.join(baseDir, 'storage', 'stream.sdp');

    const bindIp = '0.0.0.0';

    const rtpmap = rtpFormat === 'h264'
        ? 'a=rtpmap:96 H264/90000\r\na=fmtp:96 packetization-mode=1'
        : 'a=rtpmap:96 PS/90000';

    const lines = [
        'v=0',
        `o=- 0 0 IN IP4 ${bindIp}`,
        's=SIP',
        `c=IN IP4 ${bindIp}`,
        't=0 0',
        `m=video ${videoPort} RTP/AVP 96`,
        rtpmap,
        'a=recvonly',
    ];

    if (withAudio) {
        lines.push(
            `m=audio ${audioPort} RTP/AVP 8`,
            'a=rtpmap:8 PCMA/8000',
            'a=recvonly',
        );
    }

    lines.push('');

    const localSdpContent = lines.join('\r\n');

    fs.mkdirSync(path.dirname(localSdpPath), { recursive: true });

    fs.writeFileSync(localSdpPath, localSdpContent);

    return localSdpPath;

}



function startFfmpeg(host, baseDir, opts = {}) {

    const {
        mode = 'video',
        videoPort = FFMPEG_UDP_PORT,
        audioPort = AUDIO_UDP_PORT,
        rtpFormat = 'ps',
    } = opts;

    stopFfmpeg();

    if (mode === 'audio') {

        log.media.info('session audio-only', { pipeline: 'none' });

        return null;

    }

    const withAudio = mode === 'av';

    if (!ffmpegPath) ffmpegPath = resolveFfmpegPath();

    const localSdpPath = writeRecvSdp(baseDir, videoPort, rtpFormat, { withAudio, audioPort });

    const ffArgs = [
        '-hide_banner', '-loglevel', 'warning',
        '-protocol_whitelist', 'file,udp,rtp',
        '-fflags', '+genpts+discardcorrupt+nobuffer',
        '-analyzeduration', String(LIVE_ANALYZE_US),
        '-probesize', String(LIVE_PROBE_BYTES),
        '-i', localSdpPath,

        '-f', 'mpegts',

        '-codec:v', 'mpeg1video',

        '-s', '640x480',

        '-b:v', '1200k',

        '-r', '25',

        '-bf', '0',

    ];



    if (mode === 'av') {

        ffArgs.push('-codec:a', 'mp2', '-ar', '8000', '-ac', '1');

    } else {

        ffArgs.push('-an');

    }



    ffArgs.push('-');



    try {

        ffmpegProcess = spawn(ffmpegPath, ffArgs, { windowsHide: true });

    } catch (err) {

        log.media.err('ffmpeg spawn failed', { path: ffmpegPath, message: err.message });

        return null;

    }



    ffmpegProcess.on('error', (err) => {

        log.media.err('ffmpeg error', { path: ffmpegPath, message: err.message });

    });



    attachFfmpegStderrHandlers('sdp', { mode, videoPort, audioPort, withAudio, format: rtpFormat, sdp: localSdpPath });

    return ffmpegProcess;

}

function attachFfmpegStderrHandlers(kind, meta) {
    if (!ffmpegProcess) return;
    let loggedFrame = false;
    let stderrTail = '';
    ffmpegProcess.stderr.on('data', (chunk) => {
        const line = chunk.toString().trim();
        stderrTail = (stderrTail + '\n' + line).slice(-800);
        if (!loggedFrame && /frame=\s*\d+/i.test(line)) {
            loggedFrame = true;
            pipeDecoded = true;
            clearPipeDecodeWatch();
            log.media.info('ffmpeg decoding', { line: line.slice(0, 120) });
            tryBootAudioSidecarEarly();
            if (onVideoDecodeCb) {
                try { onVideoDecodeCb(); } catch (_) { /* ignore */ }
            }
        }
        if (/Stream #0:\d+.*Audio:/i.test(line)) {
            log.media.info('ffmpeg audio stream', { line: line.slice(0, 160) });
        }
        if (/error|failed|invalid|unable|no packet/i.test(line)) {
            log.media.warn('ffmpeg', line.slice(0, 280));
        }
    });
    ffmpegProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
            log.media.err('ffmpeg exit', { code, signal: signal || null, detail: stderrTail.slice(-400) });
        } else {
            log.media.info('ffmpeg exit', { code, signal: signal || null });
        }
        ffmpegProcess = null;
        ffmpegAttached = false;
    });
    log.media.info('ffmpeg started', { path: ffmpegPath, kind, ...meta });
}

function startFfmpegPipe(baseDir, opts = {}) {
    const { mode = 'video', inputFormat = 'mpeg' } = opts;
    stopFfmpegOnly();
    if (mode === 'audio') {
        log.media.info('session audio-only', { pipeline: 'none' });
        return null;
    }
    if (!ffmpegPath) ffmpegPath = resolveFfmpegPath();
    const demux = ffmpegDemuxFormat(inputFormat);
    pipeInputFormat = demux;
    const ffArgs = [
        '-hide_banner', '-loglevel', 'warning',
        '-fflags', '+genpts+discardcorrupt+nobuffer',
        '-probesize', String(LIVE_PROBE_BYTES),
        '-analyzeduration', String(LIVE_ANALYZE_US),
        '-f', demux,
        '-i', 'pipe:0',
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', '640x480',
        '-b:v', '1200k',
        '-r', '25',
        '-bf', '0',
        '-an',
        '-',
    ];
    try {
        ffmpegProcess = spawn(ffmpegPath, ffArgs, {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch (err) {
        log.media.err('ffmpeg pipe spawn failed', { path: ffmpegPath, message: err.message });
        return null;
    }
    ffmpegProcess.on('error', (err) => {
        log.media.err('ffmpeg error', { path: ffmpegPath, message: err.message });
    });
    if (ffmpegProcess.stdin) {
        ffmpegProcess.stdin.on('error', () => { /* ignore when process ends */ });
    }
    attachFfmpegStderrHandlers('pipe', { mode, inputFormat: demux });
    return ffmpegProcess;
}

function attachAudioFfmpegToWs() {
    /* audio uses Node G711 pipeline → broadcastAudioPcm; WS needs no ffmpeg attach */
}

function wireFfmpegStderr() {
    attachFfmpegStderrHandlers('rtsp', {});
}

function startRtspStream(rtspUrl, wss, baseDir, opts = {}) {
    stopFfmpeg();
    activeMedia = { transport: 'rtsp', mode: 'video' };
    if (!ffmpegPath) ffmpegPath = resolveFfmpegPath();
    const rtspTransport = opts.rtspTransport === 'udp' ? 'udp' : 'tcp';
    const ffArgs = [
        '-hide_banner', '-loglevel', 'warning',
        '-rtsp_transport', rtspTransport,
        '-fflags', '+genpts',
        '-i', rtspUrl,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', '640x480',
        '-b:v', '1200k',
        '-r', '25',
        '-bf', '0',
        '-an',
        '-',
    ];
    try {
        ffmpegProcess = spawn(ffmpegPath, ffArgs, { windowsHide: true });
    } catch (err) {
        log.media.err('ffmpeg rtsp spawn failed', { message: err.message });
        return null;
    }
    ffmpegProcess.on('error', (err) => {
        log.media.err('ffmpeg rtsp error', { message: err.message });
    });
    wireFfmpegStderr();
    attachFfmpegToWs(wss);
    log.media.info('ffmpeg rtsp started', { rtspTransport, url: rtspUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') });
    return ffmpegProcess;
}



function attachFfmpegToWs(wss) {

    const proc = ffmpegProcess;

    if (!proc || ffmpegAttached) return;

    ffmpegAttached = true;

    let wsBytes = 0;
    proc.stdout.on('data', (data) => {
        wsBytes += data.length;
        if (wsBytes === data.length) {
            log.media.info('ws first chunk', { bytes: data.length, clients: wss.clients.size });
            tryBootAudioSidecarEarly();
            if (onVideoDecodeCb) {
                try { onVideoDecodeCb(); } catch (_) { /* ignore */ }
            }
        }
        wss.clients.forEach((client) => {
            sendVideoWs(client, data, 'mediaSession');
        });
    });

    log.media.info('ws bridge attached', { clients: wss.clients.size });

}



function handleTcpSocket(socket, host, wss, baseDir) {

    let buffer = Buffer.alloc(0);

    let mediaApproved = false;

    let videoFrames = 0;

    let audioFrames = 0;

    let videoBytes = 0;



    socket.on('data', (chunk) => {

        buffer = Buffer.concat([buffer, chunk]);



        while (true) {

            const idx = hdaMedia.findMediaFlagIndex(buffer);

            if (idx < 0) {

                buffer = Buffer.alloc(0);

                break;

            }

            if (idx > 0) buffer = buffer.subarray(idx);

            const header = hdaMedia.readMediaHeader(buffer, 0);

            if (!header) break;



            buffer = buffer.subarray(header.frameSize);



            if (header.dwCMD === hdaMedia.CMD_MEDIA_INFO) {

                const info = hdaMedia.parseMediaInfo(header.lpData);

                socket.write(hdaMedia.buildOpenRet(0));

                mediaApproved = true;

                activeMedia.transport = 'tcp';

                const rtpFormat = info && info.video && info.video.nFormat === 0 ? 'h264' : 'ps';
                const hasAudio = !!(info && info.audio && info.audio.nFormat > 0);
                const ffmMode = (hasAudio || activeMedia.mode === 'av') ? 'av' : activeMedia.mode;
                log.media.info('tcp media info', {
                    camId: getWatchingCamId(),
                    mode: activeMedia.mode,
                    ffmMode,
                    video: info && info.video,
                    audio: describeTcpAudio(info && info.audio),
                    decodeAs: rtpFormat,
                });

                startFfmpeg(host, baseDir, {
                    mode: ffmMode,
                    videoPort: FFMPEG_UDP_PORT,
                    audioPort: AUDIO_UDP_PORT,
                    rtpFormat,
                });

                attachFfmpegToWs(wss);

            } else if (header.dwCMD === hdaMedia.CMD_VIDEO_DATA && mediaApproved) {

                videoFrames += 1;

                videoBytes += header.lpData.length;

                if (videoFrames === 1) log.media.info('tcp video data started', { bytes: header.lpData.length });

                forwardRtp(host, FFMPEG_UDP_PORT, header.lpData);

            } else if (header.dwCMD === hdaMedia.CMD_AUDIO_DATA && mediaApproved) {

                audioFrames += 1;

                if (audioFrames === 1) {
                    log.media.info('tcp audio data started', {
                        camId: getWatchingCamId(),
                        bytes: header.lpData.length,
                        ...describeTcpAudioPayload(header.lpData),
                    });
                } else if (audioFrames === 100) {
                    log.media.info('tcp audio flowing', {
                        camId: getWatchingCamId(),
                        frames: audioFrames,
                        port: MEDIA_TCP_PORT,
                    });
                }

                forwardRtp(host, AUDIO_UDP_PORT, header.lpData);

            } else if (!mediaApproved) {

                log.media.warn('tcp data before open', { cmd: header.dwCMD });

            } else {

                log.media.info('tcp frame', { cmd: header.dwCMD, bytes: header.nLength });

            }

        }

    });



    socket.on('close', () => {

        log.media.info('tcp disconnected', { videoFrames, audioFrames, videoBytes });

    });

    socket.on('error', (err) => log.media.err('tcp socket', err.message));

}



function startTcpMediaServer(host, wss, baseDir) {

    if (tcpMediaServer) return tcpMediaServer;

    tcpMediaServer = net.createServer((socket) => {

        tcpFeedSeen = true;
        clearTcpWatch();
        log.media.info('tcp connected', {
            peer: `${socket.remoteAddress}:${socket.remotePort}`,
            camId: getWatchingCamId(),
            liveWatch: dashboardStreamActive,
            mode: activeMedia.mode,
            port: MEDIA_TCP_PORT,
        });

        handleTcpSocket(socket, host, wss, baseDir);

    });

    tcpMediaServer.listen(MEDIA_TCP_PORT, '0.0.0.0', () => {

        log.media.info('tcp listening', { host, port: MEDIA_TCP_PORT });

    });

    return tcpMediaServer;

}



function writePipePayload(payload) {
    if (ffmpegProcess && ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
        try {
            ffmpegProcess.stdin.write(payload);
        } catch (_) { /* ignore */ }
    }
    if (!MEDIA_AUDIO_ENABLED) return;
    if (audioSidecarReady) {
        feedAudioPayload(payload);
        return;
    }
    if (audioBootPending && audioPrimeBuffer.length < AUDIO_PRIME_MAX_PACKETS) {
        audioPrimeBuffer.push(payload);
        audioPrimeBytes += payload.length;
        tryBootAudioSidecarEarly();
    }
}

function schedulePipeDecodeFallback(host, wss, baseDir, bootPipe) {
    clearPipeDecodeWatch();
    pipeDecodeWatch = setTimeout(() => {
        if (pipeDecoded || activeMedia.transport !== 'udp') return;
        pipeFallbackIndex += 1;
        if (pipeFallbackIndex >= pipeFallbackFormats.length) {
            log.media.warn('decode failed', { tried: pipeFallbackFormats });
            return;
        }
        const next = pipeFallbackFormats[pipeFallbackIndex];
        log.media.info('decode fallback', { format: next, index: pipeFallbackIndex });
        bootPipe(next, true);
        schedulePipeDecodeFallback(host, wss, baseDir, bootPipe);
    }, 4500);
}

function beginUdpMedia(host, wss, baseDir, mode) {
    activeMedia = { transport: 'udp', mode: mode || 'video' };
    closeRtpListener();
    stopFfmpegOnly();
    stopAudioPipelineOnly();
    pipeDecoded = false;
    pipeFallbackIndex = 0;
    pipeFallbackFormats = [];

    let pipeStarted = false;
    const pendingPayloads = [];

    const bootPipe = (inputFormat, forceSwitch) => {
        const want = ffmpegDemuxFormat(inputFormat);
        if (pipeStarted && want === pipeInputFormat && !forceSwitch) return;
        if (pipeStarted) {
            log.media.info('switching decoder', { from: pipeInputFormat, to: want });
            stopFfmpegOnly();
            stopAudioPipelineOnly();
        }
        pipeStarted = true;
        pipeDecoded = false;
        startFfmpegPipe(baseDir, { mode: activeMedia.mode, inputFormat: want });
        scheduleAudioSidecarBoot(baseDir, want);
        attachFfmpegToWs(wss);
        pendingPayloads.splice(0).forEach(writePipePayload);
    };

    startRtpListener(VIDEO_UDP_PORT, null, host, {
        onFirstPacket: (_msg, fmt) => {
            log.media.info('rtp pipe format', { detected: fmt });
            bootPipe(fmt, false);
            pipeDecoded = true;
            clearPipeDecodeWatch();
        },
        onRtpPayload: (payload) => {
            if (!pipeStarted) {
                if (pendingPayloads.length < 512) pendingPayloads.push(payload);
                return;
            }
            writePipePayload(payload);
        },
    });
}



function beginTcpMedia(host, wss, baseDir, mode) {

    activeMedia = { transport: 'tcp', mode: mode || 'video' };

    clearUdpWatch();
    tcpFeedSeen = false;

    startTcpMediaServer(host, wss, baseDir);

    log.media.info('awaiting tcp feed', { port: MEDIA_TCP_PORT });

}



function applyAnswerAndStartMedia(answerSdp, host, wss, baseDir, requestedMode) {

    const parsed = sdpMedia.parseInviteMode(answerSdp);

    const mode = requestedMode || parsed.mode;

    activeMedia = { transport: parsed.transport, mode };



    log.media.info('session negotiated', { mode, transport: parsed.transport });



    if (parsed.transport === 'tcp') {

        beginTcpMedia(host, wss, baseDir, mode);

    } else {

        beginUdpMedia(host, wss, baseDir, mode);

    }



    return activeMedia;

}



function sendInvite(sip, opts) {

    const {

        cameraContactUri,

        camId,

        realm,

        serverId,

        host,

        sipPort,

        mode,

        transport,

        onAnswer,

        onNoRtp,

    } = opts;



    const inviteTransport = transport || 'udp';

    const sessionName = opts.sessionName || 'Play';

    const inviteSdp = sdpMedia.buildInviteSdp({

        host,

        serverId,

        mode: mode || 'video',

        transport: inviteTransport,

        videoPort: VIDEO_UDP_PORT,

        audioPort: AUDIO_UDP_PORT,

        sessionName,

    });



    const request = {

        method: 'INVITE',

        uri: cameraContactUri,

        headers: {

            to: { uri: `sip:${camId}@${realm}` },

            from: { uri: `sip:${serverId}@${realm}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },

            'call-id': Math.random().toString(36).substring(7),

            cseq: { method: 'INVITE', seq: 1 },

            contact: [{ uri: `sip:${serverId}@${host}:${sipPort}` }],

            subject: opts.useTalkSubject
                ? sdpMedia.buildTalkInviteSubject(camId, serverId)
                : sdpMedia.buildInviteSubject(camId, serverId),

            'content-type': 'application/sdp',

            'content-length': inviteSdp.length,

        },

        content: inviteSdp,

    };



    log.media.info('invite sending', { camId, mode: mode || 'video', transport: inviteTransport });



    sip.send(request, (response) => {

        if (response.status >= 100 && response.status < 200) {

            log.sip.info('invite provisional', { status: response.status });

            return;

        }

        if (response.status === 200) {
            sip.send({
                method: 'ACK',
                uri: cameraContactUri,
                headers: {
                    to: response.headers.to,
                    from: response.headers.from,
                    'call-id': response.headers['call-id'],
                    cseq: { method: 'ACK', seq: response.headers.cseq.seq },
                },
            });
            if (response.content) {
                const parsed = sdpMedia.parseInviteMode(response.content);
                log.media.info('answer sdp', {
                    mode: parsed.mode,
                    transport: parsed.transport,
                    videoPort: parsed.videoPort,
                    audioPort: parsed.audioPort,
                    voiceCall: !!opts.preserveVideo,
                });
                if (opts.audioOnlyCall && opts.camId) {
                    captureCallDialog(request, response, opts.camId);
                    setupIntercomAudioAfterAnswer(parsed, response, host);
                    log.media.info('voice call audio-only connected', {
                        camId: opts.camId,
                        transport: parsed.transport,
                        talk: !!opts.useTalkSubject,
                    });
                    if (onAnswer) {
                        onAnswer(response, {
                            mode: 'audio',
                            transport: parsed.transport,
                            voiceCall: true,
                            audioOnly: true,
                        });
                    }
                    return;
                }
                if (opts.preserveVideo && opts.camId && isStreamingForCam(opts.camId)) {
                    captureCallDialog(request, response, opts.camId);
                    const remote = sdpMedia.parseRemoteAudioEndpoint(response.content);
                    if (parsed.transport === 'udp' && remote.host && remote.port) {
                        setCallRemoteAudio(remote.host, remote.port);
                        beginIntercomAudioRtp(host);
                        log.media.info('voice call tx ready', {
                            camId: opts.camId,
                            host: remote.host,
                            port: remote.port,
                        });
                    } else {
                        log.media.warn('voice call tx skipped', {
                            camId: opts.camId,
                            transport: parsed.transport,
                        });
                    }
                    log.media.info('voice call connected', { camId: opts.camId });
                    if (onAnswer) {
                        onAnswer(response, {
                            mode: 'audio',
                            transport: parsed.transport,
                            voiceCall: true,
                            preserveVideo: true,
                        });
                    }
                    return;
                }
                captureDialog(request, response);
                const negotiated = applyAnswerAndStartMedia(
                    response.content,
                    host,
                    opts.wss,
                    opts.baseDir,
                    mode
                );
                if (negotiated.transport === 'udp' && onNoRtp) {
                    const udpWait = opts.sosReinvite ? 2200 : 8000;
                    scheduleUdpWatch(onNoRtp, udpWait);
                }
                if (negotiated.transport === 'tcp' && onNoRtp) {
                    scheduleTcpWatch(onNoRtp);
                }
                if (onAnswer) onAnswer(response, negotiated);
            } else if (onAnswer) {
                onAnswer(response, null);
            }
            return;
        }

        if (response.status >= 300) {
            if (response.status === 486) {
                log.sip.warn('invite busy', { hint: 'waiting for previous session to clear' });
            }
            if (!opts.preserveVideo) activeDialog = null;
            if (onAnswer) onAnswer(response, null);
        }

    });



    return { inviteSdp, mode: mode || 'video', transport: inviteTransport };

}



function sendInviteWithFallback(sip, opts) {
    if (MULTI_LIVE && opts && opts.camId) {
        return livePool.sendInviteWithFallback(sip, opts);
    }
    const runInvite = (transport, onNoMedia) => {
        sendInvite(sip, { ...opts, transport, onNoRtp: onNoMedia });
    };
    const startPrimary = () => {
        runInvite('udp', () => {
            log.media.info('retry invite', { transport: 'tcp' });
            endActiveCall(sip, () => runInvite('tcp', null));
        });
    };
    if (activeDialog) {
        endActiveCall(sip, startPrimary);
    } else {
        stopFfmpeg();
        startPrimary();
    }
}



/** Answer device-initiated audio INVITE after SIP Broadcast (no platform INVITE). */
function replyToInboundVoiceCall(sip, request, host, serverId, camId) {
    const inviteSdp = request.content || '';
    const parsed = sdpMedia.parseInviteMode(inviteSdp);
    /* BWC often offers TCP/RTP in INVITE but sends PCMA on UDP for SIP Talk. */
    const answerTransport = parsed.transport === 'tcp' ? 'udp' : parsed.transport;
    const answerSdp = sdpMedia.buildAnswerSdp({
        host,
        serverId,
        mode: 'audio',
        transport: answerTransport,
        audioPort: AUDIO_UDP_PORT,
        audioDirection: 'both',
        sessionName: 'Talk',
    });

    activeMedia = { transport: answerTransport, mode: 'audio' };
    const remote = sdpMedia.parseRemoteAudioEndpoint(inviteSdp);
    if (remote.host && remote.port) {
        setCallRemoteAudio(remote.host, remote.port);
    }

    const sendAnswer = () => {
        const response = sip.makeResponse(request, 200, 'OK');
        response.headers['content-type'] = 'application/sdp';
        response.headers['content-length'] = answerSdp.length;
        response.content = answerSdp;
        sip.send(response);
        captureCallDialog(request, response, camId, { inboundUas: true });
        setTimeout(() => startCallAudioRtpKeepalive(), 500);
        scheduleVoiceDuplexWatch(camId);
        log.media.info('voice call inbound rx', {
            camId,
            host: remote.host,
            port: remote.port,
            mode: parsed.mode,
            inviteTransport: parsed.transport,
            answerTransport,
            invitePreview: inviteSdp.replace(/\r\n/g, ' ').trim().slice(0, 200),
            answerPreview: answerSdp.replace(/\r\n/g, ' ').trim().slice(0, 160),
        });
    };

    if (parsed.transport === 'tcp') {
        beginIntercomAudioTcp(host, sendAnswer);
    } else {
        beginIntercomAudioRtp(host, sendAnswer);
    }
    return parsed;
}

function replyToInboundInvite(sip, request, host, serverId, wss, baseDir) {

    const parsed = sdpMedia.parseInviteMode(request.content || '');

    const answerSdp = sdpMedia.buildAnswerSdp({

        host,

        serverId,

        mode: parsed.mode,

        transport: parsed.transport,

        videoPort: VIDEO_UDP_PORT,

        audioPort: AUDIO_UDP_PORT,

    });



    const response = sip.makeResponse(request, 200, 'OK');

    response.headers['content-type'] = 'application/sdp';

    response.headers['content-length'] = answerSdp.length;

    response.content = answerSdp;

    sip.send(response);



    applyAnswerAndStartMedia(answerSdp, host, wss, baseDir, parsed.mode);

    return parsed;

}



module.exports = {

    getPorts,

    sendInvite,

    sendInviteWithFallback,

    sendVoiceCallInvite,

    startAudioOnlyVoiceCall,

    startOutboundTalkCall,

    scheduleVoiceDuplexWatch,

    endVoiceCallOnly,

    teardownVoiceCallForCam,

    isVoiceCallActive,

    isVoiceCallActiveForCam,

    getVoiceCallCamId,

    sendVoiceCallAudio,

    endActiveCall,

    onRemoteBye,

    replyToInboundInvite,

    replyToInboundVoiceCall,

    applyAnswerAndStartMedia,

    beginUdpMedia,

    beginTcpMedia,

    startTcpMediaServer,

    stopFfmpeg,
    stopMediaSession,
    setDashboardStreamActive,
    setOnVideoDecode,
    isStreamingForCam,
    isDashboardWatchingCam,
    getWatchingCamId,
    clearReinviteOnSos,
    scheduleSosReinvite,
    attachFfmpegToWs,
    attachAudioFfmpegToWs,
    attachStreamClient,
    attachLegacyStreamClient,
    setAudioWss,
    setAudioFocusCamId,
    countActiveStreams,
    startRtspStream,

    VIDEO_UDP_PORT,

    AUDIO_UDP_PORT,

    MEDIA_TCP_PORT,

};


