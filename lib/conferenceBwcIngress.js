/**
 * BWC → LiveKit RTMP ingress — isolated from dashboard live wall / SOS pool.
 */
const dgram = require('dgram');
const { spawn } = require('child_process');
const sdpMedia = require('./sdpMedia');
const { resolveFfmpegPath } = require('./resolveFfmpeg');
const {
    detectRtpVideoFormat,
    ffmpegDemuxFormat,
    rtpPayloadBytes,
    buildConferenceFallbackFormats,
} = require('./rtpVideoFormat');
const log = require('./fleetLog');

const PORT_BASE = parseInt(process.env.FM_CONFERENCE_RTP_BASE || '40200', 10);
/** Legacy offset — ffmpeg now uses stdin pipe; port kept for logs / compatibility. */
const FFMPEG_PORT_OFFSET = parseInt(process.env.FM_CONFERENCE_FFMPEG_PORT_OFFSET || '1000', 10);
const LIVE_PROBE_BYTES = 524288;
const LIVE_ANALYZE_US = 500000;
const BOOT_PACKET_MIN = 1;
const FALLBACK_MS = 20000;
const FFMPEG_EXIT_RETRY_MAX = 3;
const sessions = new Map();
let deps = null;
let ffmpegPath = null;
let onRemoteStop = null;

function init(injected) {
    deps = injected || {};
    onRemoteStop = deps.onRemoteStop || null;
    ffmpegPath = resolveFfmpegPath(deps.baseDir);
}

function allocPort() {
    const used = new Set();
    sessions.forEach(function (s) { used.add(s.videoPort); });
    for (let p = PORT_BASE; p < PORT_BASE + 200; p += 2) {
        if (!used.has(p)) return p;
    }
    throw new Error('No free conference RTP port');
}

function ffmpegPortFor(videoPort) {
    return videoPort + FFMPEG_PORT_OFFSET;
}

/** Pool-aligned demux list — MPEG-PS uses mpeg only (see rtpVideoFormat). */
function buildIngressFallbackFormats(detected) {
    return buildConferenceFallbackFormats(detected);
}

function isMpegPsFormat(fmt) {
    return ffmpegDemuxFormat(fmt || 'mpeg') === 'mpeg';
}

function markPipeDecoded(session, demux, line) {
    if (session.pipeDecoded) return;
    const ok = /frame=\s*\d+/i.test(line)
        || /\bfps=\s*\d/i.test(line)
        || /Output #0/i.test(line)
        || /:\s*Video:/i.test(line);
    if (!ok) return;
    session.pipeDecoded = true;
    if (session.pipeDecodeWatch) {
        clearTimeout(session.pipeDecodeWatch);
        session.pipeDecodeWatch = null;
    }
    log.media.info('conference bwc ffmpeg decoding', {
        camId: session.camId,
        format: demux,
        line: line.slice(0, 120),
    });
}

function stopFfmpegOnly(session) {
    session.ffmpegGen = (session.ffmpegGen || 0) + 1;
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
        try { session.ffmpegProcess.kill('SIGTERM'); } catch (_) { /* ignore */ }
        session.ffmpegProcess = null;
    }
}

function writePipePayload(session, payload) {
    const proc = session.ffmpegProcess;
    if (!proc || !proc.stdin || proc.stdin.destroyed || !payload || !payload.length) return;
    try {
        proc.stdin.write(payload);
    } catch (_) { /* ignore */ }
}

function startFfmpegToRtmp(session, rtmpUrl, inputFormat) {
    stopFfmpegOnly(session);
    const gen = session.ffmpegGen;
    if (!ffmpegPath) ffmpegPath = resolveFfmpegPath(deps && deps.baseDir);
    const demux = ffmpegDemuxFormat(inputFormat || 'mpeg');
    session.pipeInputFormat = demux;
    const args = [
        '-hide_banner', '-loglevel', 'warning',
        '-fflags', '+genpts+discardcorrupt+nobuffer',
        '-probesize', String(LIVE_PROBE_BYTES),
        '-analyzeduration', String(LIVE_ANALYZE_US),
        '-f', demux,
        '-i', 'pipe:0',
        '-map', '0:v',
        // LGPL vendor ffmpeg has no libx264 — use libopenh264 (same as evidence trim/redact).
        '-c:v', 'libopenh264', '-b:v', '1500k', '-maxrate', '1500k', '-bufsize', '3000k',
        '-pix_fmt', 'yuv420p', '-g', '30',
        '-an',
        '-f', 'flv', rtmpUrl,
    ];
    session.ffmpegProcess = spawn(ffmpegPath, args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    session.ffmpegAttached = true;
    if (session.ffmpegProcess.stdin) {
        session.ffmpegProcess.stdin.on('error', function () { /* ignore */ });
    }
    session.ffmpegProcess.stderr.on('data', function (chunk) {
        const line = String(chunk).trim();
        markPipeDecoded(session, demux, line);
        if (line && /error/i.test(line)) {
            log.media.warn('conference ffmpeg', { camId: session.camId, msg: line.slice(0, 200) });
        }
    });
    session.ffmpegProcess.on('exit', function (code) {
        const camId = session.camId;
        if (session.ffmpegGen !== gen) return;
        if (!sessions.has(camId)) return;
        if (isMpegPsFormat(session.detectedFormat)) {
            session.ffmpegExitRetries = (session.ffmpegExitRetries || 0) + 1;
            if (session.ffmpegExitRetries <= FFMPEG_EXIT_RETRY_MAX) {
                log.media.warn('conference bwc ffmpeg exit — retry mpeg', {
                    camId, code, attempt: session.ffmpegExitRetries,
                });
                session.pipeDecoded = true;
                session.bootPipe('mpeg', true);
                return;
            }
        }
        log.media.warn('conference bwc ffmpeg exited — stopping session', { camId, code });
        stopSession(camId, { remote: false });
        if (onRemoteStop) {
            try { onRemoteStop(camId, { reason: 'ffmpeg_exit', code: code }); } catch (_) { /* ignore */ }
        }
    });
}

function schedulePipeDecodeFallback(session, bootPipe) {
    if (session.pipeDecodeWatch) clearTimeout(session.pipeDecodeWatch);
    session.pipeDecodeWatch = setTimeout(function () {
        if (session.pipeDecoded || !sessions.has(session.camId)) return;
        session.pipeFallbackIndex += 1;
        if (session.pipeFallbackIndex >= session.pipeFallbackFormats.length) {
            log.media.warn('conference bwc decode failed', {
                camId: session.camId,
                tried: session.pipeFallbackFormats,
            });
            stopSession(session.camId, { remote: false });
            if (onRemoteStop) {
                try {
                    onRemoteStop(session.camId, { reason: 'decode_failed' });
                } catch (_) { /* ignore */ }
            }
            return;
        }
        const next = session.pipeFallbackFormats[session.pipeFallbackIndex];
        log.media.info('conference bwc decode fallback', { camId: session.camId, format: next });
        bootPipe(next, true);
        schedulePipeDecodeFallback(session, bootPipe);
    }, FALLBACK_MS);
}

function handleRtpMessage(session, msg, rinfo) {
    if (session.rtpForwardPort && session.rtpForwardPort !== rinfo.port) return;
    const payload = rtpPayloadBytes(msg);
    session.rtpPacketsSeen += 1;
    if (session.rtpPacketsSeen === 1) {
        const fmt = detectRtpVideoFormat(msg);
        session.detectedFormat = fmt;
        if (!session.pipeFallbackFormats.length) {
            session.pipeFallbackFormats = buildIngressFallbackFormats(fmt);
        }
        log.media.info('conference bwc rtp received', {
            camId: session.camId,
            port: session.videoPort,
            from: rinfo.address,
            format: fmt,
            payloadBytes: payload.length,
            poolMirror: !!session.poolMirror,
        });
        session.bootPipe(fmt, false);
        if (isMpegPsFormat(fmt)) {
            session.pipeDecoded = true;
        } else {
            schedulePipeDecodeFallback(session, session.bootPipe);
        }
    }
    if (!session.pipeStarted) {
        if (session.pendingPayloads.length < 512) session.pendingPayloads.push(payload);
        return;
    }
    writePipePayload(session, payload);
}

function stopSession(camId, opts) {
    const session = sessions.get(camId);
    if (!session) return;
    if (session.rtpWatchdog) {
        clearTimeout(session.rtpWatchdog);
        session.rtpWatchdog = null;
    }
    stopFfmpegOnly(session);
    if (session.rtpSocket) {
        try { session.rtpSocket.close(); } catch (_) { /* ignore */ }
    }
    if (session.mirrorUnregister) {
        try { session.mirrorUnregister(); } catch (_) { /* ignore */ }
        session.mirrorUnregister = null;
    }
    if (session.mirrorForwardSock) {
        try { session.mirrorForwardSock.close(); } catch (_) { /* ignore */ }
    }
    if (session.activeDialog && deps.sip && !(opts && opts.remote)) {
        const dlg = session.activeDialog;
        deps.sip.send({
            method: 'BYE',
            uri: dlg.uri,
            headers: {
                to: dlg.to,
                from: dlg.from,
                'call-id': dlg.callId,
                cseq: { method: 'BYE', seq: (dlg.cseq || 1) + 1 },
            },
        });
    }
    sessions.delete(camId);
    log.media.info('conference bwc ingress stopped', { camId, remote: !!(opts && opts.remote) });
}

function captureDialog(session, request, response) {
    session.activeDialog = {
        uri: request.uri,
        to: response.headers.to,
        from: response.headers.from,
        callId: response.headers['call-id'],
        cseq: response.headers.cseq && response.headers.cseq.seq,
    };
}

function initSessionPipeState(session) {
    session.pendingPayloads = [];
    session.pipeStarted = false;
    session.detectedFormat = null;
    session.pipeFallbackFormats = [];
    session.pipeFallbackIndex = 0;
    session.pipeDecoded = false;
    session.pipeDecodeWatch = null;
    session.pipeInputFormat = null;
    session.ffmpegGen = 0;
    session.ffmpegExitRetries = 0;
    session.bootPipe = function (inputFormat, forceSwitch) {
        const want = ffmpegDemuxFormat(inputFormat);
        if (session.pipeStarted && want === session.pipeInputFormat && !forceSwitch) return;
        if (session.pipeStarted) stopFfmpegOnly(session);
        session.pipeStarted = true;
        session.pipeDecoded = false;
        session.ffmpegExitRetries = 0;
        startFfmpegToRtmp(session, session.rtmpUrl, want);
        session.pendingPayloads.splice(0).forEach(function (p) {
            writePipePayload(session, p);
        });
    };
}

function bindRtp(session) {
    return new Promise(function (resolve, reject) {
        initSessionPipeState(session);
        const sock = dgram.createSocket('udp4');
        session.rtpSocket = sock;
        sock.on('error', reject);
        sock.on('message', function (msg, rinfo) {
            handleRtpMessage(session, msg, rinfo);
        });
        sock.bind(session.videoPort, '0.0.0.0', function () {
            resolve();
        });
    });
}

function sendInvite(session, camId, contactUri) {
    const {
        realm, serverId, host, sipPort, sip,
    } = deps;
    const inviteSdp = sdpMedia.buildInviteSdp({
        host,
        serverId,
        mode: 'video',
        transport: 'udp',
        videoPort: session.videoPort,
        audioPort: session.videoPort + 1,
    });
    const request = {
        method: 'INVITE',
        uri: contactUri,
        headers: {
            to: { uri: 'sip:' + camId + '@' + realm },
            from: { uri: 'sip:' + serverId + '@' + realm, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': 'conf-' + Math.random().toString(36).substring(7),
            cseq: { method: 'INVITE', seq: 1 },
            contact: [{ uri: 'sip:' + serverId + '@' + host + ':' + sipPort }],
            subject: sdpMedia.buildInviteSubject(camId, serverId),
            'content-type': 'application/sdp',
            'content-length': inviteSdp.length,
        },
        content: inviteSdp,
    };
    return new Promise(function (resolve, reject) {
        sip.send(request, function (response) {
            if (response.status >= 100 && response.status < 200) return;
            if (response.status === 200) {
                captureDialog(session, request, response);
                sip.send({
                    method: 'ACK',
                    uri: contactUri,
                    headers: {
                        to: response.headers.to,
                        from: response.headers.from,
                        'call-id': response.headers['call-id'],
                        cseq: { method: 'ACK', seq: response.headers.cseq.seq },
                    },
                });
                resolve(session);
                return;
            }
            reject(new Error('BWC invite failed HTTP ' + response.status));
        });
    });
}

async function startFromPoolMirror(camId, rtmpUrl, registerMirror) {
    if (!registerMirror) throw new Error('Pool RTP mirror not available');
    if (!rtmpUrl) throw new Error('camId and rtmpUrl required');
    if (sessions.has(camId)) stopSession(camId);
    const forwardSock = dgram.createSocket('udp4');
    const session = {
        camId,
        videoPort: allocPort(),
        ffmpegPort: null,
        rtpSocket: null,
        ffmpegProcess: null,
        ffmpegAttached: false,
        rtpPacketsSeen: 0,
        rtmpUrl,
        activeDialog: null,
        rtpWatchdog: null,
        poolMirror: true,
        mirrorForwardSock: forwardSock,
        mirrorUnregister: null,
    };
    session.ffmpegPort = ffmpegPortFor(session.videoPort);
    sessions.set(camId, session);
    await bindRtp(session);
    session.mirrorUnregister = registerMirror(camId, function (msg) {
        try {
            forwardSock.send(msg, session.videoPort, '127.0.0.1');
        } catch (_) { /* ignore */ }
    });
    session.rtpWatchdog = setTimeout(function () {
        if (!sessions.has(camId)) return;
        if (session.rtpPacketsSeen === 0) {
            log.media.warn('conference bwc pool mirror: no RTP received, stopping session', { camId });
            stopSession(camId, { remote: false });
            if (onRemoteStop) {
                try { onRemoteStop(camId, { reason: 'rtp_timeout' }); } catch (_) { /* ignore */ }
            }
        }
    }, 20000);
    log.media.info('conference bwc pool mirror started', {
        camId, videoPort: session.videoPort, ffmpegPort: session.ffmpegPort,
    });
    return { camId, videoPort: session.videoPort, poolMirror: true };
}

async function start(camId, rtmpUrl) {
    if (!deps || !deps.sip) throw new Error('Conference BWC ingress not initialized');
    if (!camId || !rtmpUrl) throw new Error('camId and rtmpUrl required');
    if (sessions.has(camId)) stopSession(camId);
    const contactUri = deps.getContactUriForCam && deps.getContactUriForCam(camId);
    if (!contactUri) throw new Error('BWC not online or unknown camId');
    const session = {
        camId,
        videoPort: allocPort(),
        ffmpegPort: null,
        rtpSocket: null,
        ffmpegProcess: null,
        ffmpegAttached: false,
        rtpPacketsSeen: 0,
        rtmpUrl,
        activeDialog: null,
        rtpWatchdog: null,
    };
    session.ffmpegPort = ffmpegPortFor(session.videoPort);
    sessions.set(camId, session);
    await bindRtp(session);
    await sendInvite(session, camId, contactUri);
    session.rtpWatchdog = setTimeout(function () {
        if (!sessions.has(camId)) return;
        if (session.rtpPacketsSeen === 0) {
            log.media.warn('conference bwc rtp watchdog: no RTP received, stopping session', { camId });
            stopSession(camId, { remote: false });
            if (onRemoteStop) {
                try { onRemoteStop(camId, { reason: 'rtp_timeout' }); } catch (_) { /* ignore */ }
            }
        }
    }, 20000);
    log.media.info('conference bwc ingress started', {
        camId, videoPort: session.videoPort, ffmpegPort: session.ffmpegPort,
    });
    return { camId, videoPort: session.videoPort };
}

function isActive(camId) {
    return sessions.has(camId);
}

function isPoolMirror(camId) {
    const session = sessions.get(camId);
    return !!(session && session.poolMirror);
}

function onRemoteBye(callId) {
    if (!callId) return null;
    for (const [camId, session] of sessions) {
        if (session.activeDialog && session.activeDialog.callId === callId) {
            stopSession(camId, { remote: true });
            if (onRemoteStop) {
                try { onRemoteStop(camId, { reason: 'remote_bye' }); } catch (_) { /* ignore */ }
            }
            log.media.info('conference bwc remote bye', { camId });
            return camId;
        }
    }
    return null;
}

module.exports = {
    init,
    start,
    startFromPoolMirror,
    stop: stopSession,
    isActive,
    isPoolMirror,
    onRemoteBye,
};
