#!/usr/bin/env node
/**
 * USER-CIRCLE-BATCH-OPEN-V1 — static verify
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fails = [];

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

function must(rel, re, label) {
    const t = read(rel);
    if (!re.test(t)) fails.push(label + ' — missing in ' + rel);
}

must('public/js/fleet-ui.js', /CIRCLE_OPEN_CAP\s*=\s*8/, 'CIRCLE_OPEN_CAP=8');
must('public/js/fleet-ui.js', /me8\.userCircles\.v1/, 'localStorage key');
must('public/js/fleet-ui.js', /function openActiveCircle/, 'openActiveCircle');
must('public/js/fleet-ui.js', /function openBatchLivePins/, 'openBatchLivePins');
must('public/js/fleet-ui.js', /openedWallFull/, 'overflow toast key');
must('public/js/fleet-ui.js', /openAllLivePins/, 'reuses VideoWall.openAllLivePins');
must('public/index.html', /fleet-circle-box/, 'circle UI box');
must('public/index.html', /fleet-circle-open/, 'Open Circle button');
must('public/index.html', /user-circle-batch-open-v1/, 'fleet-ui cache bust');
must('public/locales/en.json', /"fleet\.circle\.open"/, 'en i18n');
must('public/locales/zh.json', /"fleet\.circle\.open"/, 'zh i18n');

if (fails.length) {
    console.error('FAIL USER-CIRCLE-BATCH-OPEN-V1');
    fails.forEach(function (f) { console.error(' - ' + f); });
    process.exit(1);
}
console.log('OK USER-CIRCLE-BATCH-OPEN-V1');
