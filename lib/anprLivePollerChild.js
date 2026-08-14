'use strict';
/**
 * ANPR poller child entry — FM_ANPR_POLLER_CHILD=1
 * Runs grab/track/harvest off Fleet SIP main process.
 */
process.env.FM_ANPR_POLLER_CHILD = '1';
const runtime = require('./anprLivePollerRuntime');

process.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'init') {
        runtime.init({
            storageDir: msg.storageDir,
            videoWsPort: msg.videoWsPort,
        });
        return;
    }
    try {
        runtime.applyChildIpc(msg);
    } catch (err) {
        try {
            console.error('[anpr-child] ipc', err && err.message ? err.message : err);
        } catch (_) { /* ignore */ }
    }
});

try {
    console.log('[anpr-child] ready isolate=ANPR-POLLER-ISOLATE-WORKER-V1');
} catch (_) { /* ignore */ }
