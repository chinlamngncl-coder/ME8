/**
 * Grab one JPEG still from an active live pool stream via local mpeg1 WS + ffmpeg.
 * Does not touch the wall decode pipe — attaches as an extra WS client.
 */
'use strict';

const { spawn } = require('child_process');
const WebSocket = require('ws');
const { resolveFfmpegPath } = require('./resolveFfmpeg');

const GRAB_MS = parseInt(process.env.FM_FR_GRAB_MS || '3500', 10) || 3500;

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
        const ffmpegPath = resolveFfmpegPath();
        let ff;
        try {
            ff = spawn(ffmpegPath, [
                '-hide_banner', '-loglevel', 'error',
                '-fflags', '+genpts+discardcorrupt+nobuffer',
                '-probesize', '524288',
                '-analyzeduration', '500000',
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

        const finish = (err, buf) => {
            if (settled) return;
            settled = true;
            try { ws.close(); } catch (_) { /* ignore */ }
            try {
                if (ff.stdin && !ff.stdin.destroyed) ff.stdin.end();
            } catch (_) { /* ignore */ }
            try { ff.kill('SIGKILL'); } catch (_) { /* ignore */ }
            if (err) reject(err);
            else resolve(buf);
        };

        ff.on('error', (err) => finish(err));
        ff.on('close', () => {
            const buf = Buffer.concat(chunks);
            if (buf.length > 200) finish(null, buf);
            else finish(new Error(errTail || 'fr grab: no jpeg'));
        });

        const url = 'ws://127.0.0.1:' + port + '/?camId=' + encodeURIComponent(id);
        let ws;
        try {
            ws = new WebSocket(url);
        } catch (err) {
            finish(err);
            return;
        }

        ws.on('open', () => {
            /* wait for mpeg1 chunks */
        });
        ws.on('message', (data) => {
            if (settled) return;
            try {
                if (ff.stdin && !ff.stdin.destroyed) {
                    ff.stdin.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
                }
            } catch (_) { /* ignore */ }
        });
        ws.on('error', (err) => finish(err));
        ws.on('close', () => {
            try {
                if (ff.stdin && !ff.stdin.destroyed) ff.stdin.end();
            } catch (_) { /* ignore */ }
        });

        setTimeout(() => {
            try {
                if (ff.stdin && !ff.stdin.destroyed) ff.stdin.end();
            } catch (_) { /* ignore */ }
            try { ws.close(); } catch (_) { /* ignore */ }
            setTimeout(() => {
                if (!settled) {
                    const buf = Buffer.concat(chunks);
                    if (buf.length > 200) finish(null, buf);
                    else finish(new Error('fr grab timeout'));
                }
            }, 800);
        }, GRAB_MS);
    });
}

module.exports = { grabJpeg, GRAB_MS };
