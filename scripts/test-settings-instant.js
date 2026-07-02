'use strict';
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'server-setup.js'), 'utf8');

const checks = [
    [src.includes('function openConfigPanel'), 'openConfigPanel'],
    [src.includes('cachedSettingsData'), 'session cache'],
    [src.includes('loadTabExtras'), 'lazy tab extras'],
    [src.includes('scheduleSettingsRefresh'), 'background refresh'],
    [!src.includes('await load();\n                setOpen(true)'), 'no await load before setOpen in open handler'],
    [!/return load\(\)\.catch/.test(src.split('function init')[1].split('global.ServerSetup')[0]), 'init does not block on full load'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

if (fail) process.exit(1);
console.log('settings-instant verify OK');
