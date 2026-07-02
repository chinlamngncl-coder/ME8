'use strict';
const fs = require('fs');
const snapPath = 'C:/Users/user/Desktop/Enterprise Mobility/Lab-8BWC-v2/baseline/2026-06-30-8wc-v2/public/index.html';
const me8Path = 'C:/Users/user/Desktop/Enterprise Mobility/ME8/public/index.html';
const snap = fs.readFileSync(snapPath, 'utf8');
const me8 = fs.readFileSync(me8Path, 'utf8');
const snapStart = snap.indexOf('    <script src="/vendor/jsmpeg.min.js"></script>');
const snapEnd = snap.indexOf('</body>');
let scripts = snap.slice(snapStart, snapEnd);

scripts = scripts.replace(
    '    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n    <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>',
    '    <script src="/vendor/leaflet/leaflet.js?v=20260701-vendor-local"></script>\n    <script src="/vendor/markercluster/leaflet.markercluster.js?v=20260701-vendor-local"></script>'
);
scripts = scripts.replace(/\n    <script src="https:\/\/cdn\.jsdelivr\.net\/npm\/livekit-client[^<]+<\/script>/, '');
scripts = scripts.replace(/\n    <script src="\/js\/conference-layout\.js[^<]+<\/script>/, '');
scripts = scripts.replace(/\n    <script src="\/js\/conference-hub\.js[^<]+<\/script>/, '');

const enterpriseGlue = [
    '    <script src="/js/auth-form-busy.js?v=20260702-restore-8wc-v2"></script>',
    '    <script src="/js/auth-reverify.js?v=20260702-restore-8wc-v2"></script>',
    '    <script src="/js/password-policy-ui.js"></script>',
    '    <script src="/js/tab-lifecycle.js?v=20260702-restore-8wc-v2"></script>',
].join('\n') + '\n';

scripts = scripts.replace(
    '    <script src="/js/server-setup.js?v=20260630-user-create-fix"></script>',
    enterpriseGlue + '    <script src="/js/server-setup.js?v=20260702-restore-8wc-v2"></script>'
);
scripts = scripts.replace(/settings-hub\.js\?v=[^"]+/, 'settings-hub.js?v=20260702-restore-8wc-v2');
scripts = scripts.replace(/tech-diagnostics\.js\?v=[^"]+/, 'tech-diagnostics.js?v=20260702-restore-8wc-v2');
scripts = scripts.replace(/evidence-manager\.js\?v=[^"]+/, 'evidence-manager.js?v=20260702-restore-8wc-v2');
scripts = scripts.replace(/video-wall\.js\?v=[^"]+/, 'video-wall.js?v=20260702-restore-8wc-v2');
scripts = scripts.replace(/i18n\.js\?v=[^"]+/, 'i18n.js?v=20260702-restore-8wc-v2');

const header = '    <!-- mob-me8-restore-8wc-v2-ops: v2 inline ops boot + ME8 enterprise glue; VC via vc-lazy -->\n';
const vcLazy = '    <script defer src="/js/vc-lazy.js?v=20260702-restore-8wc-v2"></script>\n';
const newTail = header + scripts + vcLazy;

const cutStart = me8.indexOf('    <!-- mob-me8-ops-first-boot');
const cutAlt = me8.indexOf('    <script src="/vendor/jsmpeg.min.js"></script>');
const start = cutStart >= 0 ? cutStart : cutAlt;
const bodyEnd = me8.indexOf('</body>');
if (start < 0 || bodyEnd < 0) {
    console.error('cut markers not found', start, bodyEnd);
    process.exit(1);
}
const out = me8.slice(0, start) + newTail + me8.slice(bodyEnd);
fs.writeFileSync(me8Path, out);
console.log('OK index.html tail', newTail.length, 'bytes');
