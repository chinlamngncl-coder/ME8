'use strict';
const fs = require('fs');
const path = require('path');

const setup = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'server-setup.js'), 'utf8');
const tech = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'tech-diagnostics.js'), 'utf8');

const checks = [
    [setup.includes('function setTechProvisionA11y'), 'dedicated provision a11y without inert trap'],
    [setup.includes('hideModalsForTechProvision'), 'hides competing modals before provision'],
    [setup.includes('runWithTechAccess(openPanel'), 'openConfigTab uses provision gate'],
    [setup.includes('runWithTechAccess: runWithTechAccess'), 'exported on ServerSetup'],
    [tech.includes('ServerSetup.runWithTechAccess'), 'tech-diagnostics routes through provision'],
    [fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'lab-security.js'), 'utf8').includes('runWithTechAccess'), 'lab tab routes through provision'],
    [!setup.includes('showTechProvision(openDiag'), 'openTechDiagnostics uses shared helper only'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

if (fail) process.exit(1);
console.log('tech-provision-routes verify OK');
