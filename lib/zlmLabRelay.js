/**
 * Gate B WS→ZLM lab relay — downstream consumer of pool MPEG-TS WebSocket.
 * Does NOT import liveStreamPool. If relay dies, dashboard wall is unaffected.
 */
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { resolveFfmpegPath } = require('./resolveFfmpeg');
const zlmIngestLab = require('./zlmIngestLab');
const log = require('./fleetLog');

/** camId → relay state */
const relays = new Map();

function buildWsUrl(camId, opts) {
    const host = (opts && opts.host) || process.env.HOST || '127.0.0.1';
    const port = (opts && opts.videoWsPort) || parseInt(process.env.FM_VIDEO_WS_PORT || '3989', 10);
    return 'ws://' + host + ':' + port + '/?camId=' + encodeURIComponent(camId);
}

function getState(camId) {
    camId = String(camId || '').trim();
    const st = relays.get(camId);
    if (!st) return null;
    return {
        camId,
        streamId: st.streamId,
        bytes: st.bytes,
        publishing: !!(st.ffmpeg && !st.ffmpeg.killed && st.firstFrameAt && !st.stopped),
        firstFrameAt: st.firstFrameAt || null,
        startedAt: st.startedAt,
        wsUrl: st.wsUrl,
        rtmpUrl: st.rtmpUrl,
        error: st.error || null,
    };
}

function listStates() {
    return Array.from(relays.keys()).map((camId) => getState(camId)).filter(Boolean);
}

function stopRelay(camId) {
    camId = String(camId || '').trim();
    const st = relays.get(camId);
    if (!st) return { ok: true, stopped: false };

    st.stopped = true;
    if (st.ws) {
        try { st.ws.close(); } catch (_) { /* ignore */ }
    }
    if (st.ffmpeg && st.ffmpeg.stdin && !st.ffmpeg.stdin.destroyed) {
        try { st.ffmpeg.stdin.end(); } catch (_) { /* ignore */ }
    }
    if (st.ffmpeg) {
        try { st.ffmpeg.kill('SIGINT'); } catch (_) { /* ignore */ }
    }
    relays.delete(camId);
    log.media.info('zlm relay stopped', {
        camId,
        streamId: st.streamId,
        bytes: st.bytes,
        droppedChunks: st.droppedChunks || 0,
    });
    return { ok: true, stopped: true, camId, bytes: st.bytes };
}

function startRelay(camId, opts) {
    camId = String(camId || '').trim();
    if (!camId) return Promise.reject(new Error('camId required'));
    if (!zlmIngestLab.isEnabled()) {
        return Promise.reject(new Error('FM_ZLM_ENABLED=0 — enable ZLM in .env for lab bench'));
    }

    const existing = relays.get(camId);
    if (existing && getState(camId) && getState(camId).publishing) {
        return Promise.resolve(getState(camId));
    }
    if (existing) stopRelay(camId);

    return zlmIngestLab.healthCheck(true).then((health) => {
        if (!health.ok) {
            throw new Error('ZLM unhealthy: ' + (health.reason || 'unknown'));
        }

        const streamId = zlmIngestLab.streamIdForCam(camId);
        const rtmpUrl = zlmIngestLab.rtmpPublishUrl(streamId);
        const wsUrl = buildWsUrl(camId, opts);
        const ffmpegPath = resolveFfmpegPath();

        const st = {
            camId,
            streamId,
            wsUrl,
            rtmpUrl,
            bytes: 0,
            droppedChunks: 0,
            stdinBackpressure: false,
            firstFrameAt: null,
            startedAt: Date.now(),
            stopped: false,
            error: null,
            ws: null,
            ffmpeg: null,
        };
        relays.set(camId, st);

        const ffArgs = [
            '-hide_banner', '-loglevel', 'warning',
            '-fflags', '+genpts+discardcorrupt+nobuffer',
            '-flags', 'low_delay',
            '-probesize', '32768',
            '-analyzeduration', '200000',
            '-f', 'mpegts',
            '-i', 'pipe:0',
            // Pool WS is mpeg1video in MPEG-TS (JSMpeg path) — FLV/RTMP needs H.264, not copy.
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
            '-g', '15', '-keyint_min', '15', '-sc_threshold', '0', '-bf', '0',
            '-pix_fmt', 'yuv420p',
            '-an',
            '-flush_packets', '1',
            '-muxdelay', '0',
            '-muxpreload', '0',
            '-f', 'flv',
            rtmpUrl,
        ];

        let ffmpeg;
        try {
            ffmpeg = spawn(ffmpegPath, ffArgs, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
        } catch (err) {
            relays.delete(camId);
            throw new Error('relay ffmpeg spawn failed: ' + err.message);
        }
        st.ffmpeg = ffmpeg;

        ffmpeg.stderr.on('data', (chunk) => {
            const line = chunk.toString().trim();
            if (line && /error|failed/i.test(line)) {
                log.media.warn('zlm relay ffmpeg', { camId, line: line.slice(0, 160) });
            }
        });

        ffmpeg.on('exit', (code, signal) => {
            if (!st.stopped) {
                st.error = 'ffmpeg_exit_' + (code != null ? code : signal || 'unknown');
                log.media.warn('zlm relay ffmpeg exit', { camId, code, signal: signal || null });
            }
            if (st.ws) {
                try { st.ws.close(); } catch (_) { /* ignore */ }
            }
        });

        if (ffmpeg.stdin) {
            ffmpeg.stdin.on('error', () => { /* ignore */ });
        }

        const ws = new WebSocket(wsUrl);
        st.ws = ws;

        ws.on('open', () => {
            log.media.info('zlm relay ws connected', { camId, wsUrl });
        });

        ws.on('message', (data) => {
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            if (!buf.length) return;
            if (st.stdinBackpressure) {
                st.droppedChunks += 1;
                return;
            }
            st.bytes += buf.length;
            if (!st.firstFrameAt) {
                st.firstFrameAt = Date.now();
                log.media.info('zlm relay first frame', { camId, streamId, bytes: buf.length, rtmpUrl });
            }
            if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
                try {
                    const ok = ffmpeg.stdin.write(buf);
                    if (!ok) {
                        st.stdinBackpressure = true;
                        ffmpeg.stdin.once('drain', () => {
                            st.stdinBackpressure = false;
                        });
                    }
                } catch (err) {
                    st.error = err.message;
                }
            }
        });

        ws.on('error', (err) => {
            st.error = err.message;
            log.media.warn('zlm relay ws error', { camId, message: err.message });
        });

        ws.on('close', () => {
            if (!st.stopped) {
                log.media.info('zlm relay ws closed', { camId, bytes: st.bytes });
                stopRelay(camId);
            }
        });

        return new Promise((resolve) => {
            const deadline = Date.now() + 12000;
            const tick = () => {
                if (st.firstFrameAt) {
                    resolve(getState(camId));
                    return;
                }
                if (st.error || st.stopped) {
                    resolve(getState(camId));
                    return;
                }
                if (Date.now() > deadline) {
                    st.error = 'relay_first_frame_timeout';
                    resolve(getState(camId));
                    return;
                }
                setTimeout(tick, 250);
            };
            tick();
        });
    });
}

module.exports = {
    buildWsUrl,
    getState,
    listStates,
    start: startRelay,
    stop: stopRelay,
    isPublishing(camId) {
        const st = getState(camId);
        return !!(st && st.publishing);
    },
};
