/**
 * Per-camera live stream sessions — one ffmpeg + RTP listener + WS fan-out each.
 * Audio uses Node G711 on the focused cam only (not extra ffmpegs).
 */
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const sdpMedia = require('./sdpMedia');
const { resolveFfmpegPath } = require('./resolveFfmpeg');
const { createPsG711Extractor } = require('./psG711Audio');
const { loadLimits, assertConcurrentLive } = require('./platformLimits');
const log = require('./fleetLog');

const LIVE_PROBE_BYTES = 524288;
const LIVE_ANALYZE_US = 500000;
const PORT_BASE = parseInt(process.env.FM_LIVE_PORT_BASE || '40140', 10);
const PORT_STRIDE = parseInt(process.env.FM_LIVE_PORT_STRIDE || '4', 10);
const MEDIA_AUDIO_ENABLED = process.env.FM_MEDIA_AUDIO !== '0';
const AUDIO_PRIME_MS = parseInt(process.env.FM_AUDIO_PRIME_MS || '500', 10);
const AUDIO_PRIME_MIN_BYTES = parseInt(process.env.FM_AUDIO_PRIME_MIN_BYTES || '32768', 10);
const AUDIO_PRIME_MAX_PACKETS = 2048;
const INVITE_IN_FLIGHT_MS = parseInt(process.env.FM_INVITE_IN_FLIGHT_MS || '12000', 10) || 12000;
const STOP_INVITE_COOLDOWN_MS = parseInt(process.env.FM_STOP_INVITE_COOLDOWN_MS || '600', 10) || 600;
const RECENTLY_STOPPED_TTL_MS = 5000;

let ffmpegPath = null;
const recentlyStoppedAt = new Map();
/** Deferred invite after stop_cooldown — dashboard often restarts live within 600 ms. */
const cooldownRetryByCam = new Map();
setInterval(() => {
    const cutoff = Date.now() - RECENTLY_STOPPED_TTL_MS;
    for (const [camId, ts] of recentlyStoppedAt) {
        if (ts < cutoff) recentlyStoppedAt.delete(camId);
    }
}, 30000).unref();
let audioWss = null;
let onVideoDecodeCb = null;
let onVoicePcmCb = null;
let onStreamStopCb = null;
let audioFocusCamId = null;

const sessions = new Map();
const usedSlots = new Set();
const pendingClients = new Map();

function maxDashboardStreams() {
    const n = parseInt(process.env.FM_DASHBOARD_MAX_STREAMS || '16', 10);
    if (!Number.isFinite(n) || n < 6) return 6;
    return Math.min(16, n);
}

function maxSlots() {
    return Math.min(loadLimits().maxConcurrentLive, 128);
}

function portsForSlot(slot) {
    const base = PORT_BASE + slot * PORT_STRIDE;
    return { videoPort: base, audioPort: base + 1 };
}

function allocSlot() {
    for (let i = 0; i < maxSlots(); i += 1) {
        if (!usedSlots.has(i)) {
            usedSlots.add(i);
            return i;
        }
    }
    return -1;
}

function freeSlot(slot) {
    if (slot >= 0) usedSlots.delete(slot);
}

function createSession(camId) {
    const slot = allocSlot();
    if (slot < 0) throw new Error('No free live stream port slots');
    const ports = portsForSlot(slot);
    return {
        camId,
        slot,
        videoPort: ports.videoPort,
        audioPort: ports.audioPort,
        activeDialog: null,
        inviteInFlightSince: 0,
        ffmpegProcess: null,
        ffmpegAttached: false,
        rtpListenSocket: null,
        wssClients: new Set(),
        pendingInviteOpts: null,
        dashboardActive: false,
        rtpPacketsSeen: 0,
        pipeDecoded: false,
        pipeInputFormat: 'mpeg',
        activeMedia: { transport: 'udp', mode: 'video' },
        audioG711Extractor: null,
        audioSidecarReady: false,
        audioPrimeBuffer: [],
        audioPrimeBytes: 0,
        audioBootPending: null,
        audioPrimeTimer: null,
        reinviteTimer: null,
        sosFallbackTimer: null,
        sosInviteRtpBaseline: 0,
        udpWatchTimer: null,
        pipeDecodeWatch: null,
        pipeFallbackFormats: [],
        pipeFallbackIndex: 0,
        wsBytes: 0,
    };
}

function getSession(camId) {
    return camId ? sessions.get(camId) || null : null;
}

function countActive() {
    return sessions.size;
}

function listCamIds() {
    return [...sessions.keys()];
}

function setAudioWss(wss) {
    audioWss = wss;
}

function setOnVideoDecode(cb) {
    onVideoDecodeCb = typeof cb === 'function' ? cb : null;
}

function setOnVoicePcm(cb) {
    onVoicePcmCb = typeof cb === 'function' ? cb : null;
}

function setOnStreamStop(cb) {
    onStreamStopCb = typeof cb === 'function' ? cb : null;
}

function setAudioFocusCamId(camId) {
    audioFocusCamId = camId || null;
}

function getAudioFocusCamId() {
    return audioFocusCamId;
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

function clearSessionAudio(session) {
    if (session.audioPrimeTimer) {
        clearTimeout(session.audioPrimeTimer);
        session.audioPrimeTimer = null;
    }
    session.audioPrimeBuffer = [];
    session.audioPrimeBytes = 0;
    session.audioSidecarReady = false;
    session.audioBootPending = null;
    if (session.audioG711Extractor) {
        session.audioG711Extractor.reset();
        session.audioG711Extractor = null;
    }
}

function broadcastAudioPcm(pcm) {
    if (!pcm || !pcm.length || !audioWss) return;
    audioWss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(pcm);
    });
}

function feedSessionAudio(session, payload) {
    if (!session.audioSidecarReady || !session.audioG711Extractor) return;
    const pcm = session.audioG711Extractor.feed(payload);
    if (pcm && pcm.length && onVoicePcmCb) {
        try { onVoicePcmCb(session.camId, pcm); } catch (_) { /* ignore */ }
    }
    if (session.camId !== audioFocusCamId) return;
    broadcastAudioPcm(pcm);
}

function bootSessionAudio(session, force) {
    if (session.audioSidecarReady || !session.audioBootPending || !MEDIA_AUDIO_ENABLED) return;
    if (!force && session.audioPrimeBytes < AUDIO_PRIME_MIN_BYTES) return;
    if (session.audioPrimeTimer) {
        clearTimeout(session.audioPrimeTimer);
        session.audioPrimeTimer = null;
    }
    session.audioSidecarReady = true;
    session.audioG711Extractor = createPsG711Extractor();
    const batch = session.audioPrimeBuffer.splice(0);
    session.audioPrimeBytes = 0;
    log.media.info('pool audio g711 started', { camId: session.camId, packets: batch.length, forced: !!force });
    batch.forEach((p) => feedSessionAudio(session, p));
}

function tryBootSessionAudioEarly(session) {
    if (session.audioSidecarReady || !session.audioBootPending) return;
    if (session.audioPrimeBytes >= AUDIO_PRIME_MIN_BYTES) bootSessionAudio(session, false);
}

function scheduleSessionAudioBoot(session, baseDir, inputFormat) {
    clearSessionAudio(session);
    session.audioBootPending = { baseDir, inputFormat };
    session.audioPrimeTimer = setTimeout(() => bootSessionAudio(session, true), AUDIO_PRIME_MS);
}

function writeSessionPipePayload(session, payload) {
    const proc = session.ffmpegProcess;
    if (proc && proc.stdin && !proc.stdin.destroyed) {
        try { proc.stdin.write(payload); } catch (_) { /* ignore */ }
    }
    if (!MEDIA_AUDIO_ENABLED) return;
    if (session.audioSidecarReady) {
        feedSessionAudio(session, payload);
        return;
    }
    if (session.audioBootPending && session.audioPrimeBuffer.length < AUDIO_PRIME_MAX_PACKETS) {
        session.audioPrimeBuffer.push(payload);
        session.audioPrimeBytes += payload.length;
        tryBootSessionAudioEarly(session);
    }
}

function stopSessionFfmpegOnly(session) {
    if (session.pipeDecodeWatch) {
        clearTimeout(session.pipeDecodeWatch);
        session.pipeDecodeWatch = null;
    }
    session.ffmpegAttached = false;
    if (session.ffmpegProcess) {
        try {
            if (session.ffmpegProcess.stdin && !session.ffmpegProcess.stdin.destroyed) {
                session.ffmpegProcess.stdin.end();
            }
        } catch (_) { /* ignore */ }
        try { session.ffmpegProcess.kill('SIGINT'); } catch (_) { /* ignore */ }
        session.ffmpegProcess = null;
    }
}

function closeSessionRtp(session) {
    if (session.rtpListenSocket) {
        try { session.rtpListenSocket.close(); } catch (_) { /* ignore */ }
        session.rtpListenSocket = null;
    }
}

function clearSessionUdpWatch(session) {
    if (session.udpWatchTimer) {
        clearTimeout(session.udpWatchTimer);
        session.udpWatchTimer = null;
    }
}

function clearSessionReinvite(session) {
    if (session.reinviteTimer) {
        clearTimeout(session.reinviteTimer);
        session.reinviteTimer = null;
    }
    if (session.sosFallbackTimer) {
        clearTimeout(session.sosFallbackTimer);
        session.sosFallbackTimer = null;
    }
}

function attachSessionFfmpegToWs(session) {
    const proc = session.ffmpegProcess;
    if (!proc || session.ffmpegAttached) return;
    session.ffmpegAttached = true;
    session.wsBytes = 0;
    proc.stdout.on('data', (data) => {
        session.wsBytes += data.length;
        if (session.wsBytes === data.length) {
            log.media.info('pool ws first chunk', { camId: session.camId, bytes: data.length, clients: session.wssClients.size });
            tryBootSessionAudioEarly(session);
            if (onVideoDecodeCb) {
                try { onVideoDecodeCb(session.camId); } catch (_) { /* ignore */ }
            }
        }
        session.wssClients.forEach((client) => {
            if (client.readyState === 1) client.send(data);
        });
    });
    log.media.info('pool ws bridge attached', { camId: session.camId, clients: session.wssClients.size });
}

function startSessionFfmpegPipe(session, baseDir, opts = {}) {
    const { mode = 'video', inputFormat = 'mpeg' } = opts;
    stopSessionFfmpegOnly(session);
    if (mode === 'audio') return null;
    if (!ffmpegPath) ffmpegPath = resolveFfmpegPath();
    session.baseDir = baseDir;
    const demux = ffmpegDemuxFormat(inputFormat);
    session.pipeInputFormat = demux;
    const ffArgs = [
        '-hide_banner', '-loglevel', 'warning',
        '-fflags', '+genpts+discardcorrupt+nobuffer',
        '-probesize', String(LIVE_PROBE_BYTES),
        '-analyzeduration', String(LIVE_ANALYZE_US),
        '-f', demux,
        '-i', 'pipe:0',
    ];
    if (session.liveCapturePath) {
        ffArgs.push(
            '-map', '0:v',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
            '-an', '-movflags', '+faststart', '-y', session.liveCapturePath,
        );
    }
    ffArgs.push(
        '-map', '0:v',
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', '640x480',
        '-b:v', '1200k',
        '-r', '25',
        '-bf', '0',
        '-an',
        '-',
    );
    try {
        session.ffmpegProcess = spawn(ffmpegPath, ffArgs, {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch (err) {
        log.media.err('pool ffmpeg spawn failed', { camId: session.camId, message: err.message });
        return null;
    }
    session.ffmpegProcess.on('error', (err) => {
        log.media.err('pool ffmpeg error', { camId: session.camId, message: err.message });
    });
    if (session.ffmpegProcess.stdin) {
        session.ffmpegProcess.stdin.on('error', () => { /* ignore */ });
    }
    let loggedFrame = false;
    session.ffmpegProcess.stderr.on('data', (chunk) => {
        const line = chunk.toString().trim();
        if (!loggedFrame && /frame=\s*\d+/i.test(line)) {
            loggedFrame = true;
            session.pipeDecoded = true;
            if (session.pipeDecodeWatch) {
                clearTimeout(session.pipeDecodeWatch);
                session.pipeDecodeWatch = null;
            }
            log.media.info('pool ffmpeg decoding', { camId: session.camId, line: line.slice(0, 120) });
            tryBootSessionAudioEarly(session);
            if (onVideoDecodeCb) {
                try { onVideoDecodeCb(session.camId); } catch (_) { /* ignore */ }
            }
        }
    });
    session.ffmpegProcess.on('exit', (code, signal) => {
        log.media.info('pool ffmpeg exit', { camId: session.camId, code, signal: signal || null });
        session.ffmpegProcess = null;
        session.ffmpegAttached = false;
    });
    attachSessionFfmpegToWs(session);
    return session.ffmpegProcess;
}

function scheduleSessionPipeDecodeFallback(session, baseDir, bootPipe) {
    if (session.pipeDecodeWatch) clearTimeout(session.pipeDecodeWatch);
    session.pipeDecodeWatch = setTimeout(() => {
        if (session.pipeDecoded || session.activeMedia.transport !== 'udp') return;
        session.pipeFallbackIndex += 1;
        if (session.pipeFallbackIndex >= session.pipeFallbackFormats.length) {
            log.media.warn('pool decode failed', { camId: session.camId, tried: session.pipeFallbackFormats });
            return;
        }
        const next = session.pipeFallbackFormats[session.pipeFallbackIndex];
        log.media.info('pool decode fallback', { camId: session.camId, format: next });
        bootPipe(next, true);
        scheduleSessionPipeDecodeFallback(session, baseDir, bootPipe);
    }, 4500);
}

function beginSessionUdpMedia(session, baseDir, mode) {
    session.activeMedia = { transport: 'udp', mode: mode || 'video' };
    closeSessionRtp(session);
    stopSessionFfmpegOnly(session);
    clearSessionAudio(session);
    session.pipeDecoded = false;
    session.pipeFallbackIndex = 0;
    session.pipeFallbackFormats = [];
    session.rtpPacketsSeen = 0;

    let pipeStarted = false;
    const pendingPayloads = [];

    const bootPipe = (inputFormat, forceSwitch) => {
        const want = ffmpegDemuxFormat(inputFormat);
        if (pipeStarted && want === session.pipeInputFormat && !forceSwitch) return;
        if (pipeStarted) {
            stopSessionFfmpegOnly(session);
            clearSessionAudio(session);
        }
        pipeStarted = true;
        session.pipeDecoded = false;
        startSessionFfmpegPipe(session, baseDir, { mode: session.activeMedia.mode, inputFormat: want });
        scheduleSessionAudioBoot(session, baseDir, want);
        pendingPayloads.splice(0).forEach((p) => writeSessionPipePayload(session, p));
    };

    session.rtpListenSocket = dgram.createSocket('udp4');
    session.rtpListenSocket.on('error', (err) => {
        log.media.err('pool rtp listen', { camId: session.camId, message: err.message });
    });
    session.rtpListenSocket.on('message', (msg, rinfo) => {
        const payload = msg.subarray(rtpPayloadOffset(msg));
        session.rtpPacketsSeen += 1;
        if (session.rtpPacketsSeen === 1) {
            const fmt = detectRtpVideoFormat(msg);
            log.media.info('pool rtp received', {
                camId: session.camId,
                port: session.videoPort,
                from: rinfo.address,
                format: fmt,
            });
            if (!session.pipeFallbackFormats.length) {
                session.pipeFallbackFormats = [fmt, 'mpeg', 'h264', 'mpegts'];
            }
            bootPipe(fmt, false);
            session.pipeDecoded = true;
            scheduleSessionPipeDecodeFallback(session, baseDir, bootPipe);
        }
        if (!pipeStarted) {
            if (pendingPayloads.length < 512) pendingPayloads.push(payload);
            return;
        }
        writeSessionPipePayload(session, payload);
        notifyRtpMirrors(session.camId, msg, rinfo);
    });
    session.rtpListenSocket.bind(session.videoPort, '0.0.0.0', () => {
        log.media.info('pool rtp listening', { camId: session.camId, port: session.videoPort });
    });
}

function captureSessionDialog(session, inviteRequest, response) {
    session.activeDialog = {
        uri: inviteRequest.uri,
        callId: response.headers['call-id'],
        from: response.headers.from,
        to: response.headers.to,
        inviteCseq: response.headers.cseq && response.headers.cseq.seq,
    };
}

function endSessionCall(sip, session, done) {
    clearSessionUdpWatch(session);
    clearSessionReinvite(session);
    if (!session.activeDialog) {
        closeSessionRtp(session);
        stopSessionFfmpegOnly(session);
        clearSessionAudio(session);
        if (done) done();
        return;
    }
    const dlg = session.activeDialog;
    session.activeDialog = null;
    const byeSeq = (parseInt(dlg.inviteCseq, 10) || 1) + 1;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        closeSessionRtp(session);
        stopSessionFfmpegOnly(session);
        clearSessionAudio(session);
        if (done) setTimeout(done, 300);
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
    }, () => finish());
    setTimeout(finish, 1500);
}

function scheduleSessionUdpWatch(session, onNoRtp, timeoutMs) {
    clearSessionUdpWatch(session);
    const baseline = session.rtpPacketsSeen;
    const waitMs = typeof timeoutMs === 'number' ? timeoutMs : 8000;
    session.udpWatchTimer = setTimeout(() => {
        if (session.activeMedia.transport !== 'udp') return;
        if (session.rtpPacketsSeen > baseline) return;
        log.media.warn('pool no rtp', { camId: session.camId, port: session.videoPort, waitMs });
        if (onNoRtp) onNoRtp();
    }, waitMs);
}

function sendSessionInvite(sip, session, opts) {
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
        baseDir,
    } = opts;

    const inviteTransport = transport || 'udp';
    const inviteSdp = sdpMedia.buildInviteSdp({
        host,
        serverId,
        mode: mode || 'video',
        transport: inviteTransport,
        videoPort: session.videoPort,
        audioPort: session.audioPort,
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
            subject: sdpMedia.buildInviteSubject(camId, serverId),
            'content-type': 'application/sdp',
            'content-length': inviteSdp.length,
        },
        content: inviteSdp,
    };

    session.inviteInFlightSince = Date.now();
    log.media.info('pool invite sending', { camId, port: session.videoPort, transport: inviteTransport });

    sip.send(request, (response) => {
        if (response.status >= 100 && response.status < 200) return;
        if (response.status === 200) {
            session.inviteInFlightSince = 0;
            captureSessionDialog(session, request, response);
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
                session.activeMedia = { transport: parsed.transport, mode: mode || parsed.mode };
                log.media.info('pool answer', { camId, transport: parsed.transport, videoPort: session.videoPort });
                if (parsed.transport === 'udp') {
                    beginSessionUdpMedia(session, baseDir, session.activeMedia.mode);
                    if (onNoRtp) {
                        const udpWait = opts.sosReinvite ? 2200 : 8000;
                        scheduleSessionUdpWatch(session, onNoRtp, udpWait);
                    }
                }
                if (onAnswer) onAnswer(response, session.activeMedia);
            } else if (onAnswer) {
                onAnswer(response, null);
            }
            return;
        }
        if (response.status >= 300) {
            session.inviteInFlightSince = 0;
            session.activeDialog = null;
            if (onAnswer) onAnswer(response, null);
        }
    });
}

function isInviteInFlight(camId) {
    const session = sessions.get(camId);
    if (!session || !session.dashboardActive) return false;
    if (session.activeDialog) return true;
    const since = session.inviteInFlightSince;
    return !!(since && Date.now() - since < INVITE_IN_FLIGHT_MS);
}

function clearCooldownRetry(camId) {
    const id = camId ? String(camId).trim() : '';
    if (!id) return;
    const entry = cooldownRetryByCam.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    cooldownRetryByCam.delete(id);
}

function scheduleCooldownRetry(sip, camId, opts, stoppedAt) {
    const id = String(camId).trim();
    if (!id || !sip || !opts) return;
    clearCooldownRetry(id);
    const delayMs = Math.max(25, (stoppedAt + STOP_INVITE_COOLDOWN_MS) - Date.now() + 20);
    log.media.info('pool invite deferred', { camId: id, reason: 'stop_cooldown', retryMs: delayMs });
    const timer = setTimeout(() => {
        cooldownRetryByCam.delete(id);
        const session = sessions.get(id);
        if (session && !session.dashboardActive) return;
        if (session && session.activeDialog && session.ffmpegProcess) return;
        const stillStoppedAt = recentlyStoppedAt.get(id);
        if (stillStoppedAt && Date.now() - stillStoppedAt < STOP_INVITE_COOLDOWN_MS) {
            scheduleCooldownRetry(sip, id, opts, stillStoppedAt);
            return;
        }
        log.media.info('pool invite retry', { camId: id, reason: 'stop_cooldown' });
        sendInviteWithFallback(sip, opts);
    }, delayMs);
    if (typeof timer.unref === 'function') timer.unref();
    cooldownRetryByCam.set(id, { timer, opts, sip });
}

function sendInviteWithFallback(sip, opts) {
    const camId = opts && opts.camId;
    if (!camId) throw new Error('pool invite requires camId');

    const sosPull = !!(opts && opts.sosServerPull);
    if (!sosPull) {
        const stoppedAt = recentlyStoppedAt.get(camId);
        if (stoppedAt && Date.now() - stoppedAt < STOP_INVITE_COOLDOWN_MS) {
            log.media.info('pool invite skipped', { camId, reason: 'stop_cooldown' });
            scheduleCooldownRetry(sip, camId, opts, stoppedAt);
            return;
        }
        if (isInviteInFlight(camId)) {
            log.media.info('pool invite skipped', { camId, reason: 'invite_in_flight' });
            return;
        }
    }

    clearCooldownRetry(camId);

    let session = sessions.get(camId);
    if (!session) {
        if (sessions.size >= maxDashboardStreams()) {
            throw new Error('Max ' + maxDashboardStreams() + ' simultaneous live streams');
        }
        assertConcurrentLive(sessions.size + 1);
        session = createSession(camId);
        sessions.set(camId, session);
        adoptPendingClients(session);
    }

    session.dashboardActive = true;
    session.pendingInviteOpts = opts;
    if (!audioFocusCamId) audioFocusCamId = camId;

    const runInvite = (transport, onNoMedia) => {
        sendSessionInvite(sip, session, { ...opts, transport, onNoRtp: onNoMedia });
    };

    const startPrimary = () => {
        runInvite('udp', () => {
            log.media.info('pool retry invite tcp', { camId });
            endSessionCall(sip, session, () => runInvite('tcp', null));
        });
    };

    if (session.activeDialog) {
        endSessionCall(sip, session, startPrimary);
    } else {
        closeSessionRtp(session);
        stopSessionFfmpegOnly(session);
        startPrimary();
    }
}

function setLiveCaptureRecording(camId, filePath) {
    const session = sessions.get(camId);
    if (!session) throw new Error('No active live stream for this BWC');
    if (!session.baseDir) throw new Error('Live stream not ready for server recording');
    const nextPath = filePath ? String(filePath) : null;
    const stopping = !!session.liveCapturePath && !nextPath;
    session.liveCapturePath = nextPath;
    const inputFormat = session.pipeInputFormat || 'mpeg';
    const mode = (session.activeMedia && session.activeMedia.mode) || 'video';
    if (stopping) {
        stopSessionFfmpegOnly(session);
        setTimeout(() => {
            if (!sessions.has(camId)) return;
            startSessionFfmpegPipe(session, session.baseDir, { mode, inputFormat });
        }, 450);
        return;
    }
    startSessionFfmpegPipe(session, session.baseDir, { mode, inputFormat });
}

function isLiveCaptureRecording(camId) {
    const session = sessions.get(camId);
    return !!(session && session.liveCapturePath);
}

function stopStreamForCam(sip, camId) {
    clearCooldownRetry(camId);
    const session = sessions.get(camId);
    if (!session) {
        pendingClients.delete(camId);
        return Promise.resolve();
    }
    session.dashboardActive = false;
    session.pendingInviteOpts = null;
    clearSessionReinvite(session);
    return new Promise((resolve) => {
        endSessionCall(sip, session, () => {
            if (onStreamStopCb) {
                try { onStreamStopCb(camId, session.liveCapturePath); } catch (_) { /* ignore */ }
            }
            sessions.delete(camId);
            freeSlot(session.slot);
            if (audioFocusCamId === camId) {
                audioFocusCamId = listCamIds()[0] || null;
            }
            recentlyStoppedAt.set(camId, Date.now());
            log.media.info('pool stream stopped', { camId });
            resolve();
        });
    });
}

function stopAllStreams(sip) {
    const ids = listCamIds();
    return Promise.all(ids.map((id) => stopStreamForCam(sip, id))).then(() => {});
}

function isDashboardWatchingCam(camId) {
    const session = sessions.get(camId);
    return !!(session && session.dashboardActive);
}

function isStreamingForCam(camId) {
    const session = sessions.get(camId);
    if (!session || !session.dashboardActive) return false;
    return !!(session.activeDialog && session.ffmpegProcess);
}

function getWatchingCamId() {
    if (audioFocusCamId && sessions.has(audioFocusCamId)) return audioFocusCamId;
    return listCamIds()[0] || null;
}

function adoptPendingClients(session) {
    const pending = pendingClients.get(session.camId);
    if (!pending || !pending.size) return;
    pending.forEach((ws) => session.wssClients.add(ws));
    pendingClients.delete(session.camId);
    log.media.info('pool ws clients adopted', { camId: session.camId, count: session.wssClients.size });
}

function attachStreamClient(ws, camId) {
    const session = sessions.get(camId);
    if (!session) {
        if (!pendingClients.has(camId)) pendingClients.set(camId, new Set());
        pendingClients.get(camId).add(ws);
        ws.on('close', () => {
            const set = pendingClients.get(camId);
            if (set) set.delete(ws);
        });
        ws.on('error', () => {
            const set = pendingClients.get(camId);
            if (set) set.delete(ws);
        });
        log.media.info('pool ws client queued', { camId });
        return;
    }
    session.wssClients.add(ws);
    ws.on('close', () => session.wssClients.delete(ws));
    ws.on('error', () => session.wssClients.delete(ws));
    log.media.info('pool ws client attached', { camId, clients: session.wssClients.size });
}

function attachLegacyStreamClient(ws) {
    const camId = getWatchingCamId();
    if (camId) attachStreamClient(ws, camId);
    else ws.close();
}

function sessionStreamRecovered(session) {
    if (!session.ffmpegProcess) return false;
    if (session.pipeDecoded) return true;
    return session.rtpPacketsSeen > session.sosInviteRtpBaseline;
}

function scheduleSosReinvite(sip, camId) {
    const session = sessions.get(camId);
    if (!session || !session.pendingInviteOpts || !sip) return;
    clearSessionReinvite(session);
    const quickMs = 750;
    const fallbackMs = 2100;
    log.media.info('pool sos re-invite scheduled', { camId, quickMs, fallbackMs });

    const sendSosInvite = (phase) => {
        if (!session.dashboardActive || !session.pendingInviteOpts) return;
        session.sosInviteRtpBaseline = session.rtpPacketsSeen;
        session.pipeDecoded = false;
        log.media.info('pool sos re-invite sending', { camId, phase });
        sendInviteWithFallback(sip, { ...session.pendingInviteOpts, sosReinvite: true });
    };

    session.reinviteTimer = setTimeout(() => {
        session.reinviteTimer = null;
        if (!session.dashboardActive) return;
        sendSosInvite('quick');
        session.sosFallbackTimer = setTimeout(() => {
            session.sosFallbackTimer = null;
            if (!session.dashboardActive) return;
            if (sessionStreamRecovered(session)) {
                log.media.info('pool sos fallback skipped', { camId, reason: 'recovered' });
                return;
            }
            endSessionCall(sip, session, () => sendSosInvite('fallback'));
        }, fallbackMs - quickMs);
    }, quickMs);
}

function clearReinviteOnSos(camId) {
    const session = sessions.get(camId);
    if (session) clearSessionReinvite(session);
}

function onRemoteBye(callId) {
    for (const [camId, session] of sessions) {
        if (session.activeDialog && session.activeDialog.callId === callId) {
            session.activeDialog = null;
            closeSessionRtp(session);
            stopSessionFfmpegOnly(session);
            clearSessionAudio(session);
            clearSessionReinvite(session);
            clearCooldownRetry(camId);
            /* Device end = end watching (toilet / privacy). Do NOT keep dashboardActive —
               that caused auto pool invite / “call back” while UI showed Stopped by BWC.
               Post-BYE SOS then gets startVideo:true (fresh pull) — correct. */
            session.dashboardActive = false;
            session.pendingInviteOpts = null;
            recentlyStoppedAt.set(camId, Date.now());
            log.media.info('pool remote bye', {
                camId,
                dashboardActive: false,
                reason: 'device_bye_clear_watching',
            });
            return camId;
        }
    }
    return null;
}

const rtpMirrorHandlers = new Map();

function registerRtpMirror(camId, handler) {
    const id = String(camId || '');
    if (!id || typeof handler !== 'function') return function () { /* noop */ };
    if (!rtpMirrorHandlers.has(id)) rtpMirrorHandlers.set(id, new Set());
    rtpMirrorHandlers.get(id).add(handler);
    return function unregister() {
        const set = rtpMirrorHandlers.get(id);
        if (!set) return;
        set.delete(handler);
        if (!set.size) rtpMirrorHandlers.delete(id);
    };
}

function notifyRtpMirrors(camId, msg, rinfo) {
    const set = rtpMirrorHandlers.get(String(camId || ''));
    if (!set || !set.size) return;
    set.forEach(function (fn) {
        try { fn(msg, rinfo); } catch (_) { /* ignore */ }
    });
}

module.exports = {
    countActive,
    listCamIds,
    getSession,
    registerRtpMirror,
    setAudioWss,
    setOnVideoDecode,
    setOnVoicePcm,
    setOnStreamStop,
    setLiveCaptureRecording,
    isLiveCaptureRecording,
    setAudioFocusCamId,
    getAudioFocusCamId,
    sendInviteWithFallback,
    stopStreamForCam,
    stopAllStreams,
    isDashboardWatchingCam,
    isStreamingForCam,
    isInviteInFlight,
    getWatchingCamId,
    attachStreamClient,
    attachLegacyStreamClient,
    scheduleSosReinvite,
    clearReinviteOnSos,
    onRemoteBye,
    PORT_BASE,
    PORT_STRIDE,
};
