'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const trial = fs.readFileSync(path.join(ROOT, 'baseline/2026-06-19-trial-v1/public/index.html'), 'utf8');
let out = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

if (!out.includes('id="ss-panel-usb"')) {
    const s = trial.indexOf('<div id="ss-panel-usb"');
    const e = trial.indexOf('<button type="button" id="ss-tech-unlock"', s);
    const block = trial.slice(s, e);
    out = out.replace(
        '<button type="button" id="ss-tech-unlock" hidden>',
        block.trim() + '\n\n            <button type="button" id="ss-tech-unlock" hidden>'
    );
    fs.writeFileSync(path.join(ROOT, 'public/index.html'), out);
    console.log('Inserted USB + cloud panels');
} else {
    console.log('USB panel already present');
}
