/**
 * MOB-APPLY-FLEET-VOICE-ADAPTER-UPLINK-V1
 * + MOB-APPLY-FLEET-VOICE-UPLINK-RESTART-STABLE-V1
 * Push operator G.711 A-law into ZLM broadcast/{stream} via FFmpeg RTMP
 * so WVP can RTP to the BWC (sign=md5(pushKey)).
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const log = require('./fleetLog');

const ROOT = path.join(__dirname, '..');
const FFMPEG = path.join(ROOT, 'vendor', 'ffmpeg-lgpl', 'ffmpeg.exe');

/** camId → { proc, app, stream, bytes, startedAt } */
const sessions = new Map();

function md5(s) {
    return crypto.createHash('md5').update(String(s), 'utf8').digest('hex');
}

function rtmpBase() {
    return String(process.env.FM_WVP_ZLM_RTMP || 'rtmp://127.0.0.1:19355').replace(/\/$/, '');
}

function resolveFfmpeg() {
    const fromEnv = String(process.env.FM_FFMPEG || '').trim();
    if (fromEnv) return fromEnv;
    return FFMPEG;
}

/**
 * @param {string} pushKey
 * @param {string} app
 * @param {string} stream
 */
function buildPublishUrl(pushKey, app, stream) {
    const sign = md5(String(pushKey || '').trim());
    if (!sign || !app || !stream) return null;
    return rtmpBase() + '/' + encodeURIComponent(app) + '/' + encodeURIComponent(stream)
        + '?sign=' + sign;
}

/**
 * Start FFmpeg alaw→RTMP publish for one cam.
 * @param {string} camId
 * @param {{ app: string, stream: string, pushKey: string }} opts
 */
function start(camId, opts) {
    opts = opts || {};
    const id = String(camId || '').trim();
    if (!id) return { ok: false, reason: 'camId_required' };
    stop(id);
    const url = buildPublishUrl(opts.pushKey, opts.app, opts.stream);
    if (!url) return { ok: false, reason: 'missing_app_stream_or_pushKey' };

    const ff = resolveFfmpeg();
    const args = [
        '-hide_banner', '-loglevel', 'error',
        '-f', 'alaw', '-ar', '8000', '-ac', '1', '-i', 'pipe:0',
        '-c:a', 'pcm_alaw', '-ar', '8000', '-ac', '1',
        '-f', 'flv', url,
    ];
    let proc;
    try {
        proc = spawn(ff, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    } catch (err) {
        log.ptt.warn('wvp voice uplink spawn failed', {
            camId: id,
            message: err && err.message ? err.message : String(err),
        });
        return { ok: false, reason: 'ffmpeg_spawn_failed' };
    }

    const st = {
        proc,
        app: opts.app,
        stream: opts.stream,
        bytes: 0,
        startedAt: Date.now(),
        dead: false,
    };
    sessions.set(id, st);

    if (proc.stdin) {
        proc.stdin.on('error', function () { st.dead = true; });
    }
    proc.stderr.on('data', function (chunk) {
        const line = String(chunk || '').trim();
        if (line) {
            log.ptt.warn('wvp voice uplink ffmpeg', { camId: id, line: line.slice(0, 200) });
        }
    });
    proc.on('exit', function (code, signal) {
        st.dead = true;
        const cur = sessions.get(id);
        if (cur && cur.proc === proc) sessions.delete(id);
        log.ptt.info('wvp voice uplink exit', {
            camId: id,
            code: code == null ? null : code,
            signal: signal || null,
            bytes: st.bytes,
        });
    });

    log.ptt.info('wvp voice uplink start', {
        camId: id,
        app: opts.app,
        stream: opts.stream,
        rtmp: rtmpBase(),
        path: 'wvp-fleet-voice-adapter-uplink',
    });
    return { ok: true, url: url.replace(/\?sign=.*/, '?sign=***') };
}

function writeAlaw(camId, buf) {
    const id = String(camId || '').trim();
    const st = sessions.get(id);
    if (!st || st.dead || !st.proc || !st.proc.stdin || !buf || !buf.length) return false;
    try {
        const ok = st.proc.stdin.write(buf);
        st.bytes += buf.length;
        return ok !== false;
    } catch (_) {
        st.dead = true;
        return false;
    }
}

function stop(camId) {
    const id = String(camId || '').trim();
    const st = sessions.get(id);
    if (!st) return { ok: true, stopped: false };
    sessions.delete(id);
    st.dead = true;
    try {
        if (st.proc.stdin) st.proc.stdin.end();
    } catch (_) { /* ignore */ }
    try {
        st.proc.kill('SIGTERM');
    } catch (_) { /* ignore */ }
    log.ptt.info('wvp voice uplink stop', {
        camId: id,
        bytes: st.bytes,
        path: 'wvp-fleet-voice-adapter-uplink',
    });
    return { ok: true, stopped: true };
}

/**
 * End stdin, wait briefly for clean exit, then SIGTERM if needed.
 * Reduces ZLM publisher sticky-slot races on rapid restart.
 */
function stopAsync(camId) {
    const id = String(camId || '').trim();
    const st = sessions.get(id);
    if (!st) return Promise.resolve({ ok: true, stopped: false });
    sessions.delete(id);
    st.dead = true;
    const proc = st.proc;
    const bytes = st.bytes;
    return new Promise(function (resolve) {
        let done = false;
        function finish() {
            if (done) return;
            done = true;
            log.ptt.info('wvp voice uplink stop', {
                camId: id,
                bytes,
                path: 'wvp-fleet-voice-restart-stable',
            });
            resolve({ ok: true, stopped: true });
        }
        const timer = setTimeout(function () {
            try { proc.kill('SIGTERM'); } catch (_) { /* ignore */ }
            finish();
        }, 600);
        proc.once('exit', function () {
            clearTimeout(timer);
            finish();
        });
        try {
            if (proc.stdin) proc.stdin.end();
            else proc.kill('SIGTERM');
        } catch (_) {
            try { proc.kill('SIGTERM'); } catch (_2) { /* ignore */ }
            clearTimeout(timer);
            finish();
        }
    });
}

function stopAll() {
    [...sessions.keys()].forEach(stop);
}

function isActive(camId) {
    const st = sessions.get(String(camId || '').trim());
    return !!(st && !st.dead);
}

module.exports = {
    md5,
    buildPublishUrl,
    start,
    writeAlaw,
    stop,
    stopAsync,
    stopAll,
    isActive,
};
