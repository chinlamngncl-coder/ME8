'use strict';
const fs = require('fs');
const path = require('path');

const tech = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'tech-diagnostics.js'), 'utf8');
const setup = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'server-setup.js'), 'utf8');

const checks = [
    [tech.includes('dismissTechGate'), 'dismissTechGate'],
    [tech.includes("e.key === 'Escape'"), 'Escape closes tech gate'],
    [tech.includes('opts.onCancel'), 'onCancel callback'],
    [setup.includes('openConfigTab') && setup.includes('runWithTechAccess(openPanel'), 'diagnostics via openConfigTab'],
    [setup.includes('onTechGateCancel'), 'cancel returns to settings home'],
    [setup.includes('openConfigPanel') && setup.includes('requireTech(openPanel, { onCancel: onTechGateCancel })'), 'config after tech unlock only'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

if (fail) process.exit(1);
console.log('tech-gate-escape verify OK');
