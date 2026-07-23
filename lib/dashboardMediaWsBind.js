'use strict';

/**
 * WSS-VIDEO-AUDIO-SOCKETS-V1
 * Same-origin /ws/video + /ws/audio on dashboard HTTP/HTTPS,
 * plus legacy listeners on FM_VIDEO_WS_PORT / FM_AUDIO_WS_PORT.
 */

const http = require('http');
const WebSocket = require('ws');

function pathnameOf(req) {
    const raw = String((req && req.url) || '/');
    try {
        return new URL(raw, 'http://127.0.0.1').pathname || '/';
    } catch (_) {
        return raw.split('?')[0] || '/';
    }
}

/**
 * @param {{
 *   videoWsPort: number,
 *   audioWsPort: number,
 *   onVideoConnection: function(import('ws'), import('http').IncomingMessage): void,
 *   onAudioConnection: function(import('ws'), import('http').IncomingMessage): void,
 *   log?: { media?: { err?: Function, info?: Function } },
 * }} opts
 */
function createDashboardMediaWs(opts) {
    const videoWsPort = opts.videoWsPort;
    const audioWsPort = opts.audioWsPort;
    const onVideoConnection = opts.onVideoConnection;
    const onAudioConnection = opts.onAudioConnection;
    const log = opts.log || {};

    const wss = new WebSocket.Server({ noServer: true });
    const audioWss = new WebSocket.Server({ noServer: true });
    wss.on('connection', onVideoConnection);
    audioWss.on('connection', onAudioConnection);
    audioWss.on('error', (err) => {
        if (log.media && typeof log.media.err === 'function') {
            log.media.err('audio ws listener error', err && err.message ? err.message : String(err));
        }
    });

    function upgradeTo(wssTarget, req, socket, head) {
        wssTarget.handleUpgrade(req, socket, head, (ws) => {
            wssTarget.emit('connection', ws, req);
        });
    }

    /**
     * @param {import('http').Server|import('https').Server|null|undefined} server
     * @param {{ forceVideo?: boolean, forceAudio?: boolean }} [mode]
     */
    function bindUpgrade(server, mode) {
        if (!server || typeof server.on !== 'function') return;
        const forceVideo = !!(mode && mode.forceVideo);
        const forceAudio = !!(mode && mode.forceAudio);
        server.on('upgrade', (req, socket, head) => {
            try {
                if (forceVideo) {
                    upgradeTo(wss, req, socket, head);
                    return;
                }
                if (forceAudio) {
                    upgradeTo(audioWss, req, socket, head);
                    return;
                }
                const p = pathnameOf(req);
                if (p === '/ws/video') {
                    upgradeTo(wss, req, socket, head);
                    return;
                }
                if (p === '/ws/audio') {
                    upgradeTo(audioWss, req, socket, head);
                    return;
                }
                // Leave /socket.io (and anything else) for Socket.IO / other handlers.
            } catch (err) {
                try { socket.destroy(); } catch (_) { /* ignore */ }
                if (log.media && typeof log.media.err === 'function') {
                    log.media.err('media ws upgrade failed', err && err.message ? err.message : String(err));
                }
            }
        });
    }

    const legacyVideoHttp = http.createServer((req, res) => {
        res.writeHead(426, { 'Content-Type': 'text/plain' });
        res.end('Video WebSocket port — use ws(s)://host/ws/video on the dashboard port, or ws:// on this port.');
    });
    legacyVideoHttp.on('error', (err) => {
        if (log.media && typeof log.media.err === 'function') {
            log.media.err('legacy video ws http error', err && err.message ? err.message : String(err));
        }
    });
    legacyVideoHttp.listen(videoWsPort, '0.0.0.0');
    bindUpgrade(legacyVideoHttp, { forceVideo: true });

    const legacyAudioHttp = http.createServer((req, res) => {
        res.writeHead(426, { 'Content-Type': 'text/plain' });
        res.end('Audio WebSocket port — use ws(s)://host/ws/audio on the dashboard port, or ws:// on this port.');
    });
    legacyAudioHttp.on('error', (err) => {
        if (log.media && typeof log.media.err === 'function') {
            log.media.err('legacy audio ws http error', err && err.message ? err.message : String(err));
        }
    });
    legacyAudioHttp.listen(audioWsPort, '0.0.0.0');
    bindUpgrade(legacyAudioHttp, { forceAudio: true });

    return {
        wss,
        audioWss,
        bindUpgrade,
        legacyVideoHttp,
        legacyAudioHttp,
    };
}

module.exports = {
    createDashboardMediaWs,
    pathnameOf,
};
