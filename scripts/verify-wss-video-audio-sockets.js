'use strict';

/**
 * WSS-VIDEO-AUDIO-SOCKETS-V1 — static verify
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const root = path.join(__dirname, '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

const serverJs = read('server.js');
assert.ok(/dashboardMediaWsBind/.test(serverJs), 'server.js uses dashboardMediaWsBind');
assert.ok(/bindUpgrade\(server\)/.test(serverJs), 'binds upgrade on HTTP server');
assert.ok(/bindUpgrade\(httpsServer\)/.test(serverJs), 'binds upgrade on HTTPS server');

const helper = read('public/js/dashboard-ws-url.js');
assert.ok(/\/ws\/video/.test(helper), 'client helper has /ws/video');
assert.ok(/\/ws\/audio/.test(helper), 'client helper has /ws/audio');
assert.ok(/wss:/.test(helper), 'client helper uses wss on https');

const vw = read('public/js/video-wall.js');
assert.ok(/DashboardWsUrl/.test(vw), 'video-wall uses DashboardWsUrl');

const index = read('public/index.html');
assert.ok(/dashboard-ws-url\.js\?v=20260723-wss-video-audio-sockets-v1/.test(index), 'index loads dashboard-ws-url');

const bind = require('../lib/dashboardMediaWsBind');
let videoHits = 0;
let audioHits = 0;
const media = bind.createDashboardMediaWs({
    videoWsPort: 39191,
    audioWsPort: 39192,
    onVideoConnection: function () { videoHits += 1; },
    onAudioConnection: function () { audioHits += 1; },
});

const appServer = http.createServer((req, res) => {
    res.end('ok');
});
media.bindUpgrade(appServer);

function waitListen(server) {
    return new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve(server.address().port));
        server.on('error', reject);
    });
}

(async function main() {
    const port = await waitListen(appServer);
    await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://127.0.0.1:' + port + '/ws/video?camId=test');
        ws.on('open', () => { ws.close(); resolve(); });
        ws.on('error', reject);
    });
    await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://127.0.0.1:' + port + '/ws/audio');
        ws.on('open', () => { ws.close(); resolve(); });
        ws.on('error', reject);
    });
    assert.ok(videoHits >= 1, 'video upgrade hit');
    assert.ok(audioHits >= 1, 'audio upgrade hit');

    // TLS same-origin path
    const tls = require('../lib/dashboardTls');
    process.env.FM_HTTPS_ENABLED = '1';
    const cfg = tls.resolveFromEnv({ httpPort: 3988, baseDir: root });
    assert.ok(cfg.ready, 'lab certs ready for https smoke: ' + cfg.reason);
    let httpsVideo = 0;
    const media2 = bind.createDashboardMediaWs({
        videoWsPort: 39193,
        audioWsPort: 39194,
        onVideoConnection: function () { httpsVideo += 1; },
        onAudioConnection: function () {},
    });
    const hs = https.createServer(cfg.httpsOptions, (req, res) => res.end('ok'));
    media2.bindUpgrade(hs);
    const sp = await waitListen(hs);
    await new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://127.0.0.1:' + sp + '/ws/video?camId=https', {
            rejectUnauthorized: false,
        });
        ws.on('open', () => { ws.close(); resolve(); });
        ws.on('error', reject);
    });
    assert.ok(httpsVideo >= 1, 'https wss video upgrade hit');

    appServer.close();
    hs.close();
    try { media.legacyVideoHttp.close(); } catch (_) { /* ignore */ }
    try { media.legacyAudioHttp.close(); } catch (_) { /* ignore */ }
    try { media2.legacyVideoHttp.close(); } catch (_) { /* ignore */ }
    try { media2.legacyAudioHttp.close(); } catch (_) { /* ignore */ }

    console.log('[ok] verify-wss-video-audio-sockets');
})().catch((err) => {
    console.error('[fail]', err && err.message ? err.message : err);
    process.exit(1);
});
