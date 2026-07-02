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

const cssBlock = extractBetween(trial,
    '#app-view-conference { flex: 1;',
    '#app-view-server { flex: 1;');
const cssVoice = extractBetween(trial,
    '#server-setup-panel label.ss-voice-check {',
    '#server-setup-panel input, #server-setup-panel select {');
const cssUsersExtra = extractBetween(trial,
    '.ss-users-table { width: 100%; min-width: 2140px;',
    '#geofence-toolbar.no-geofence-perm {');

if (!out.includes('#app-view-conference {')) {
    out = out.replace(
        '#app-view-evidence[hidden] { display: none !important; }',
        '#app-view-evidence[hidden] { display: none !important; }\n        ' + cssBlock.trim()
    );
}
if (!out.includes('label.ss-voice-check')) {
    out = out.replace(
        '#server-setup-panel label { display: block;',
        cssVoice.trim() + '\n        #server-setup-panel label { display: block;'
    );
}
out = out.replace(
    '.ss-users-table { width: 100%; min-width: 1000px; border-collapse: collapse; font-size: 11px; margin: 0; }',
    cssUsersExtra.trim()
);

if (!out.includes('nav-tab-conference')) {
    out = out.replace(
        '<button type="button" id="nav-tab-evidence"',
        '<button type="button" id="nav-tab-conference" data-i18n="nav.videoConference">Video Conference</button>\n        <button type="button" id="nav-tab-evidence"'
    );
}

if (out.includes('ss-voice-enabled') && out.includes('app-view-server') && out.includes('voiceAlerts.config.title')) {
    const serverView = extractBetween(trial, '<div id="app-view-server" hidden>', '<div id="app-view-audit-trail" hidden>');
    out = out.replace(/<div id="app-view-server" hidden>[\s\S]*?(?=<div id="app-view-command-wall" hidden>)/,
        serverView.trim() + '\n\n    ');
}

if (!out.includes('id="app-view-conference"')) {
    const auditBlock = extractBetween(trial, '<div id="app-view-audit-trail" hidden>', '<div id="app-view-command-wall" hidden>');
    const confBlock = extractBetween(trial, '<div id="app-view-conference" hidden>', '<div id="app-view-evidence" hidden>');
    out = out.replace('<div id="app-view-evidence" hidden>', auditBlock.trim() + '\n\n    ' + confBlock.trim() + '\n\n    <div id="app-view-evidence" hidden>');
}

if (!out.includes('evidence-hub-nav')) {
    const evBlock = extractBetween(trial, '<div id="app-view-evidence" hidden>', '<div id="ss-gate-backdrop" hidden>');
    const evStart = out.indexOf('<div id="app-view-evidence" hidden>');
    const evEnd = out.indexOf('<div id="ss-gate-backdrop" hidden>', evStart);
    if (evStart >= 0 && evEnd > evStart) {
        out = out.slice(0, evStart) + evBlock.trim() + '\n\n    ' + out.slice(evEnd);
    }
}

if (!out.includes('ss-voice-alerts-section')) {
    const dashPanel = extractBetween(trial, '<div id="ss-panel-dashboard" class="ss-main-panel">', '<div id="ss-panel-groups" class="ss-main-panel">');
    const dashStart = out.indexOf('<div id="ss-panel-dashboard" class="ss-main-panel">');
    const dashEnd = out.indexOf('<div id="ss-panel-groups" class="ss-main-panel">', dashStart);
    if (dashStart >= 0 && dashEnd > dashStart) {
        out = out.slice(0, dashStart) + dashPanel.trim() + '\n\n            ' + out.slice(dashEnd);
    }
}

if (!out.includes('ss-main-tab-usb')) {
    out = out.replace(
        '<button type="button" id="ss-main-tab-dashboard" data-i18n="server.tab.dashboard">Dashboard Auth</button>',
        '<button type="button" id="ss-main-tab-dashboard" data-i18n="server.tab.dashboard">Dashboard Auth</button>\n                <button type="button" id="ss-main-tab-usb" hidden data-i18n="server.tab.usbMaint">USB maintenance</button>\n                <button type="button" id="ss-main-tab-cloud" hidden data-i18n="server.tab.cloud">Cloud Deployment</button>'
    );
}

if (!out.includes('ss-panel-usb')) {
    const usbCloud = extractBetween(trial, '<div id="ss-panel-usb" class="ss-main-panel">', '<button type="button" id="ss-tech-unlock" hidden>');
    out = out.replace('<button type="button" id="ss-tech-unlock" hidden>', usbCloud.trim() + '\n\n            <button type="button" id="ss-tech-unlock" hidden>');
}

const scriptNeedles = [
    ['livekit-client', '<script src="https://cdn.jsdelivr.net/npm/livekit-client@2.9.9/dist/livekit-client.umd.min.js"></script>'],
    ['conference-layout.js', '<script src="/js/conference-layout.js?v=20260618-vclayout"></script>'],
    ['conference-hub.js', '<script src="/js/conference-hub.js?v=20260618-vclayout"></script>'],
    ['audit-trail-hub.js', '<script src="/js/audit-trail-hub.js?v=20260612-at1"></script>'],
    ['evidence-storage-ui.js', '<script src="/js/evidence-storage-ui.js?v=20260618-san"></script>'],
    ['evidence-hub.js', '<script src="/js/evidence-hub.js?v=20260618-san"></script>'],
    ['usb-maintenance.js', '<script src="/js/usb-maintenance.js?v=20260609-usb2"></script>'],
    ['cloud-deployment.js', '<script src="/js/cloud-deployment.js?v=20260609-cloud"></script>'],
];
for (const [needle, tag] of scriptNeedles) {
    if (!out.includes(needle)) {
        out = out.replace('<script src="/js/ptt-rx.js"></script>', '<script src="/js/ptt-rx.js"></script>\n    ' + tag);
    }
}
out = out.replace('<script src="/js/evidence-manager.js"></script>', '<script src="/js/evidence-manager.js?v=20260609-evhub"></script>');
out = out.replace('<script src="/js/evidence-manager.js?v=20260609-evhub"></script>\n    <script src="/js/evidence-manager.js?v=20260609-evhub"></script>', '<script src="/js/evidence-manager.js?v=20260609-evhub"></script>');

if (!out.includes('ConferenceHub.applyPermissions')) {
    out = out.replace(
        'if (window.EvidenceManager && EvidenceManager.applyPermissions) {\n                EvidenceManager.applyPermissions(perms);\n            }',
        'if (window.EvidenceManager && EvidenceManager.applyPermissions) {\n                EvidenceManager.applyPermissions(perms);\n            }\n            if (window.ConferenceHub && ConferenceHub.applyPermissions) {\n                ConferenceHub.applyPermissions(perms);\n            }\n            if (window.AuditTrailHub && AuditTrailHub.applyPermissions) {\n                AuditTrailHub.applyPermissions(perms);\n            }\n            if (window.ServerSetup && ServerSetup.applySessionPermissions) {\n                ServerSetup.applySessionPermissions(perms);\n            }'
    );
}

if (!out.includes('ConferenceHub.bindUi')) {
    out = out.replace(
        "if (typeof ServerSetup !== 'undefined' && ServerSetup.init) ServerSetup.init();",
        "if (typeof ServerSetup !== 'undefined' && ServerSetup.init) ServerSetup.init();\n        if (typeof ConferenceHub !== 'undefined' && ConferenceHub.bindUi) ConferenceHub.bindUi();"
    );
}

fs.writeFileSync(path.join(ROOT, 'public/index.html'), out);
console.log('Restored trial UI into index.html (' + out.length + ' bytes)');
