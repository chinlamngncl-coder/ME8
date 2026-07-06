#!/usr/bin/env node
/**
 * Gate B standalone relay CLI — subscribes to pool WS, pushes FLV to ZLM RTMP.
 * Usage: node scripts/lab/zlm-ws-relay.js --camId=34020000001329000008
 * Requires: live already on dashboard; FM_ZLM_ENABLED=1; ZLM sidecar running.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const zlmLabRelay = require('../../lib/zlmLabRelay');
const zlmProcess = require('../../lib/zlmProcess');

function readArg(name) {
    const prefix = '--' + name + '=';
    const hit = process.argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length).trim() : '';
}

const camId = readArg('camId') || String(process.env.FM_SEED_BWC_ID || '').trim();
if (!camId) {
    console.error('Usage: node scripts/lab/zlm-ws-relay.js --camId=<deviceId>');
    process.exit(1);
}

if (!zlmProcess.isLabEnabled()) {
    console.warn('FM_LAB_ZLM is not 1 — lab API routes disabled; relay CLI still runs.');
}

const host = process.env.HOST || '127.0.0.1';
const videoWsPort = parseInt(process.env.FM_VIDEO_WS_PORT || '3989', 10);

console.log('Starting ZLM WS relay for', camId, '→ ws://' + host + ':' + videoWsPort);

zlmLabRelay.start(camId, { host, videoWsPort })
    .then((state) => {
        console.log('Relay state:', JSON.stringify(state, null, 2));
        if (!state || !state.publishing) {
            console.error('Relay did not reach first frame — is live video running on the dashboard?');
            process.exit(2);
        }
        console.log('Relay running. Ctrl+C to stop.');
    })
    .catch((err) => {
        console.error('Relay failed:', err.message);
        process.exit(1);
    });

process.on('SIGINT', () => {
    zlmLabRelay.stop(camId);
    process.exit(0);
});
