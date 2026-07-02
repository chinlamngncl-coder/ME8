'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const trial = fs.readFileSync(path.join(ROOT, 'baseline/2026-06-19-trial-v1/public/index.html'), 'utf8');
let out = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

function extractBetween(html, startMark, endMark) {
    const s = html.indexOf(startMark);
    const e = html.indexOf(endMark, s);
    if (s < 0 || e < 0) throw new Error('Missing: ' + startMark.slice(0, 60));
    return html.slice(s, e);
}

if (!out.includes('id="app-view-conference"')) {
    const auditBlock = extractBetween(trial, '<div id="app-view-audit-trail" hidden>', '<div id="app-view-command-wall" hidden>');
    const confBlock = extractBetween(trial, '<div id="app-view-conference" hidden>', '<div id="app-view-evidence" hidden>');
    out = out.replace(
        '<div id="app-view-evidence" hidden>',
        auditBlock.trim() + '\n\n    ' + confBlock.trim() + '\n\n    <div id="app-view-evidence" hidden>'
    );
    fs.writeFileSync(path.join(ROOT, 'public/index.html'), out);
    console.log('Inserted audit + conference views');
} else {
    console.log('Conference view already present');
}

// Remove bogus applySessionPermissions if present
out = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
if (out.includes('applySessionPermissions')) {
    out = out.replace(/\s*if \(window\.ServerSetup && ServerSetup\.applySessionPermissions\) \{\s*ServerSetup\.applySessionPermissions\(perms\);\s*\}/, '');
    fs.writeFileSync(path.join(ROOT, 'public/index.html'), out);
    console.log('Removed applySessionPermissions hook');
}
