/**
 * WALL-AUDIO-PATH-V1 — wall unmute listen under WVP video handoff.
 * Fleet INVITE (mediaSession G.711 sidecar) is skipped when handoff ON.
 * Pull ZLM FLV audio with ffmpeg → pcm_s16le 8kHz → same audio WSS as classic listen.
 */
'use strict';

const { spawn } = require('child_process');
const { resolveFfmpegPath } = require('./resolveFfmpeg');
const log = require('./fleetLog');

/** camId → { proc, url } */
const sessions = new Map();
let focusCamId = null;
let pushPcm = null;

function setPushPcm(fn) {
    pushPcm = typeof fn === 'function' ? fn : null;
}

function setFocus(camId) {
    const id = String(camId || '').trim() || null;
    focusCamId = id;
    if (id) {
        sessions.forEach(function (_, other) {
            if (other !== id) stopListen(other);
        });
    }
}

function getFocus() {
    return focusCamId;
}

function localPullUrl(upstreamFlv) {
    const raw = String(upstreamFlv || '').trim();
    if (!raw || !/^https?:\/\//i.test(raw)) return null;
    try {
        const u = new URL(raw);
        /* Server-side pull: prefer loopback to ZLM-mapped host port */
        if (u.hostname === 'localhost' || /^127\./.test(u.hostname)
            || /^192\.168\./.test(u.hostname) || /^10\./.test(u.hostname)) {
            u.hostname = '127.0.0.1';
        }
        return u.toString();
    } catch (_) {
        return raw;
    }
}

function stopListen(camId) {
    const id = String(camId || '').trim();
    if (!id) return;
    const s = sessions.get(id);
    if (!s) return;
    sessions.delete(id);
    try {
        if (s.proc && !s.proc.killed) {
            s.proc.kill('SIGTERM');
        }
    } catch (_) { /* ignore */ }
    log.media.info('wvp wall listen stop', { camId: id, path: 'wall-audio-path-v1' });
}

function stopAll() {
    Array.from(sessions.keys()).forEach(stopListen);
}

function ensureListen(camId, upstreamFlv) {
    const id = String(camId || '').trim();
    if (!id) return { ok: false, reason: 'camId_required' };
    const url = localPullUrl(upstreamFlv);
    if (!url) return { ok: false, reason: 'no_upstream_flv' };

    focusCamId = id;
    sessions.forEach(function (_, other) {
        if (other !== id) stopListen(other);
    });

    const cur = sessions.get(id);
    if (cur && cur.url === url && cur.proc && !cur.proc.killed) {
        return { ok: true, reused: true };
    }
    if (cur) stopListen(id);

    const ffmpegPath = resolveFfmpegPath();
    const args = [
        '-hide_banner', '-loglevel', 'warning',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-i', url,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '8000',
        '-ac', '1',
        '-f', 's16le',
        '-',
    ];
    let proc;
    try {
        proc = spawn(ffmpegPath, args, { windowsHide: true });
    } catch (err) {
        log.media.warn('wvp wall listen spawn fail', {
            camId: id,
            message: err && err.message ? err.message : String(err),
            path: 'wall-audio-path-v1',
        });
        return { ok: false, reason: 'ffmpeg_spawn_fail' };
    }

    sessions.set(id, { proc: proc, url: url, bytes: 0 });
    log.media.info('wvp wall listen start', {
        camId: id,
        flvHost: (url.match(/^https?:\/\/([^/]+)/i) || [])[1] || null,
        path: 'wall-audio-path-v1',
    });

    proc.stdout.on('data', function (chunk) {
        if (!chunk || !chunk.length) return;
        if (focusCamId && focusCamId !== id) return;
        const s = sessions.get(id);
        if (!s) return;
        s.bytes += chunk.length;
        if (s.bytes === chunk.length) {
            log.media.info('wvp wall listen first pcm', {
                camId: id,
                bytes: chunk.length,
                path: 'wall-audio-path-v1',
            });
        }
        if (pushPcm) {
            try { pushPcm(chunk); } catch (_) { /* ignore */ }
        }
    });

    let errBuf = '';
    proc.stderr.on('data', function (c) {
        errBuf += String(c);
        if (errBuf.length > 800) errBuf = errBuf.slice(-800);
    });

    proc.on('error', function (err) {
        log.media.warn('wvp wall listen ffmpeg error', {
            camId: id,
            message: err && err.message ? err.message : String(err),
            path: 'wall-audio-path-v1',
        });
    });

    proc.on('close', function (code) {
        const still = sessions.get(id);
        if (still && still.proc === proc) sessions.delete(id);
        if (code && code !== 0) {
            log.media.warn('wvp wall listen ffmpeg exit', {
                camId: id,
                code: code,
                stderr: errBuf.slice(0, 240),
                path: 'wall-audio-path-v1',
            });
        }
    });

    return { ok: true, reused: false };
}

module.exports = {
    setPushPcm,
    setFocus,
    getFocus,
    ensureListen,
    stopListen,
    stopAll,
};
