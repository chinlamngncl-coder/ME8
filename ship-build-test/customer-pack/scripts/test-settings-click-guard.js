'use strict';
const fs = require('fs');
const path = require('path');

const setup = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'server-setup.js'), 'utf8');
const reverify = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'auth-reverify.js'), 'utf8');
const hub = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'settings-hub.js'), 'utf8');
const tech = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'tech-diagnostics.js'), 'utf8');

const checks = [
    [setup.includes('function trySettingsNavLock'), 'nav click lock'],
    [setup.includes('function releaseAllSettingsOverlays'), 'release all overlays'],
    [setup.includes('isSettingsModalVisible'), 'modal visibility check'],
    [setup.includes('techAccessInFlight'), 'tech access in-flight guard'],
    [reverify.includes('function dismissGate'), 'auth gate dismiss'],
    [reverify.includes('isPromptOpen'), 'auth gate prompt state'],
    [hub.includes('trySettingsNavLock'), 'settings hub uses lock'],
    [tech.includes('dismissTechGate: dismissTechGate'), 'tech gate dismiss export'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

require('child_process').execSync('node --check "' + path.join(__dirname, '..', 'public', 'js', 'server-setup.js') + '"', { stdio: 'pipe' });

if (fail) process.exit(1);
console.log('settings-click-guard verify OK');
