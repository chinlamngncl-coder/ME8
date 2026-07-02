'use strict';
const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const lazy = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'vc-lazy.js'), 'utf8');
const ev = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'evidence-manager.js'), 'utf8');

const checks = [
    [index.includes('vc-lazy.js'), 'index loads vc-lazy.js'],
    [!index.includes('livekit-client.umd.min.js'), 'LiveKit not in index.html'],
    [!index.includes('conference-hub.js') || index.indexOf('vc-lazy') >= 0, 'conference-hub deferred'],
    [lazy.includes('loadScript') && lazy.includes('ConferenceHub.bindUi'), 'vc-lazy loader'],
    [ev.includes('syncVcSession') && ev.includes('sessionPerms'), 'vc-lazy-fix syncs session perms after load'],
    [ev.includes('firstLazyBoot'), 'vc-lazy-fix forces refresh on first lazy boot'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

if (/<script[^>]+conference-hub\.js/.test(index)) {
    console.error('FAIL: conference-hub.js still blocking in index.html');
    fail++;
}

if (fail) process.exit(1);
console.log('vc-lazy verify OK');
