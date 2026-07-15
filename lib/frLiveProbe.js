/**
 * Grab one JPEG still from an active live pool stream via local mpeg1 WS + ffmpeg.
 * Does not touch the wall decode pipe — attaches as an extra WS client.
 *
 * mob-fr-capture-grab-tune: shorter windows + fail-fast no-data.
 * mob-fr-grab-warm-gate: do NOT start GRAB_MS until first WS bytes
 *   (fixes “encoder before EOF” when stream is live in UI but pipe warms late).
 * mob-fr-snap-grab-faster: tighter defaults after warm-gate (900/200/800) —
 *   Recent felt sluggish with 1800ms×3 grabs under heavier ONNX pack.
 */
'use strict';

const { spawn } = require('child_process');
const WebSocket = require('ws');
const { resolveFfmpegPath } = require('./resolveFfmpeg');

function clampInt(raw, fallback, min, max) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

/** Collect window after first WS bytes. Override with FM_FR_GRAB_MS. */
const GRAB_MS = clampInt(process.env.FM_FR_GRAB_MS, 900, 400, 5000);
/** After ending stdin / closing WS — wait for ffmpeg jpeg flush. */
const EOF_MS = clampInt(process.env.FM_FR_GRAB_EOF_MS, 200, 80, 1200);
/** Fail if no mpeg bytes arrived from pool WS (warm wait). */
const NO_DATA_MS = clampInt(process.env.FM_FR_GRAB_NO_DATA_MS, 800, 200, 4000);

/**
 * @param {string} camId
 * @param {number} videoWsPort
 * @returns {Promise<Buffer>}
 */
function grabJpeg(camId, videoWsPort) {
    const id = String(camId || '').trim();
    const port = parseInt(videoWsPort, 10);
    if (!id || !port) {
        return Promise.reject(new Error('camId and videoWsPort required'));
    }

    return new Promise((resolve, reject) => {
        let settled = false;
        const chunks = [];
        let gotWsData = false;
        const ffmpegPath = resolveFfmpegPath();
        let ff;
        let ws;
        let noDataTimer = null;
        let mainTimer = null;

        const finish = (err, buf) => {
            if (settled) return;
            settled = true;
            if (noDataTimer) clearTimeout(noDataTimer);
            if (mainTimer) clearTimeout(mainTimer);
            try { if (ws) ws.close(); } catch (_) { /* ignore */ }
            try {
                if (ff && ff.stdin && !ff.stdin.destroyed) ff.stdin.end();
            } catch (_) { /* ignore */ }
            try { if (ff) ff.kill('SIGKILL'); } catch (_) { /* ignore */ }
            if (err) reject(err);
            else resolve(buf);
        };

        const beginCollectWindow = () => {
            if (mainTimer || settled) return;
            /* mob-fr-grab-warm-gate — clock starts at first byte, not WS open */
            mainTimer = setTimeout(() => {
                try {
                    if (ff.stdin && !ff.stdin.destroyed) ff.stdin.end();
                } catch (_) { /* ignore */ }
                try { if (ws) ws.close(); } catch (_) { /* ignore */ }
                setTimeout(() => {
                    if (!settled) {
                        const buf = Buffer.concat(chunks);
                        if (buf.length > 200) finish(null, buf);
                        else finish(new Error(gotWsData ? 'fr grab timeout' : 'fr grab: no stream data'));
                    }
                }, EOF_MS);
            }, GRAB_MS);
        };

        try {
            ff = spawn(ffmpegPath, [
                '-hide_banner', '-loglevel', 'error',
                '-fflags', '+genpts+discardcorrupt+nobuffer',
                '-flags', 'low_delay',
                '-probesize', '262144',
                '-analyzeduration', '200000',
                '-f', 'mpegts',
                '-i', 'pipe:0',
                '-frames:v', '1',
                '-q:v', '3',
                '-f', 'image2',
                'pipe:1',
            ], {
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch (err) {
            reject(err);
            return;
        }

        ff.stdout.on('data', (d) => { chunks.push(d); });
        let errTail = '';
        ff.stderr.on('data', (d) => {
            errTail = (errTail + String(d)).slice(-400);
        });

        ff.on('error', (err) => finish(err));
        ff.on('close', () => {
            const buf = Buffer.concat(chunks);
            if (buf.length > 200) finish(null, buf);
            else if (!settled) finish(new Error(errTail || 'fr grab: no jpeg'));
        });

        const url = 'ws://127.0.0.1:' + port + '/?camId=' + encodeURIComponent(id);
        try {
            ws = new WebSocket(url);
        } catch (err) {
            finish(err);
            return;
        }

        ws.on('open', () => {
            noDataTimer = setTimeout(() => {
                if (!settled && !gotWsData) {
                    finish(new Error('fr grab: no stream data'));
                }
            }, NO_DATA_MS);
        });
        ws.on('message', (data) => {
            if (settled) return;
            const first = !gotWsData;
            gotWsData = true;
            if (first && noDataTimer) {
                clearTimeout(noDataTimer);
                noDataTimer = null;
            }
            try {
                if (ff.stdin && !ff.stdin.destroyed) {
                    ff.stdin.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
                }
            } catch (_) { /* ignore */ }
            if (first) beginCollectWindow();
        });
        ws.on('error', (err) => finish(err || new Error('fr grab: ws error')));
        ws.on('close', () => {
            try {
                if (ff.stdin && !ff.stdin.destroyed) ff.stdin.end();
            } catch (_) { /* ignore */ }
        });
    });
}

module.exports = { grabJpeg, GRAB_MS, EOF_MS, NO_DATA_MS };
