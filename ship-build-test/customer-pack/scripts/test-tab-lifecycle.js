'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const lifecycle = fs.readFileSync(path.join(root, 'public', 'js', 'tab-lifecycle.js'), 'utf8');
const manager = fs.readFileSync(path.join(root, 'public', 'js', 'evidence-manager.js'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'public', 'js', 'evidence-hub.js'), 'utf8');

const checks = [
    [index.includes('tab-lifecycle.js?v=20260701-tab-lifecycle'), 'index.html loads tab-lifecycle.js'],
    [index.indexOf('tab-lifecycle.js') < index.indexOf('evidence-manager.js'), 'tab-lifecycle before evidence-manager'],
    [lifecycle.includes('shouldLoad') && lifecycle.includes('markLoaded') && lifecycle.includes('60000'), 'tab-lifecycle API'],
    [manager.includes('tabShouldLoad') && manager.includes('TabLifecycle.shouldLoad'), 'evidence-manager uses TabLifecycle'],
    [manager.includes('EvidenceHub.onShow({ force: loadData })'), 'evidence hub sticky onShow'],
    [hub.includes('panelWarm') && hub.includes('skipRefresh') && hub.includes('onShow(opts)'), 'evidence-hub panel sticky'],
];

let fail = 0;
checks.forEach(function (pair) {
    if (!pair[0]) {
        console.error('FAIL:', pair[1]);
        fail++;
    }
});

if (fail) process.exit(1);
console.log('tab-lifecycle verify OK', { checks: checks.length });
