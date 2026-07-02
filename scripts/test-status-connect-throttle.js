'use strict';
const fs = require('fs');
const path = require('path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

const checks = [
    [server.includes("FM_LOGIN_REPLAY_STAGGER_BASE_MS || '400'"), 'login replay stagger base defaults to trial 400ms'],
    [server.includes("FM_LOGIN_REPLAY_STAGGER_STEP_MS || '300'"), 'login replay stagger step defaults to trial 300ms'],
    [server.includes('replayCachedTelemetryToSocket'), 'replay cached telemetry to socket on connect'],
    [server.includes('maybeQueryGpsForDevice(d.id, { force: true })'), 'GPS replay uses force:true when missing'],
    [server.includes('queryDeviceStatus(d.id, { force: true })'), 'status replay uses force:true for all online'],
    [!server.includes('LOGIN_REPLAY_STATUS_FORCE_MAX'), 'no login replay force cap (trial parity)'],
    [!server.includes('hasCachedDeviceTelemetry(d.id)) return'), 'no skip when cache hit in replay loop'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

if (fail) process.exit(1);
console.log('login-replay-trial-speed verify OK');
