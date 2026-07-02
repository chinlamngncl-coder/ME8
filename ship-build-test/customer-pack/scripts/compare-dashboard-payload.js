'use strict';
const fs = require('fs');
const path = require('path');

function audit(root, label) {
    const index = path.join(root, 'public/index.html');
    if (!fs.existsSync(index)) {
        console.log(label, 'NO index');
        return null;
    }
    const html = fs.readFileSync(index, 'utf8');
    const jsDir = path.join(root, 'public/js');
    let jsCount = 0;
    let jsKb = 0;
    if (fs.existsSync(jsDir)) {
        fs.readdirSync(jsDir).forEach((f) => {
            jsCount += 1;
            jsKb += fs.statSync(path.join(jsDir, f)).size;
        });
    }
    return {
        label,
        indexKb: Math.round(html.length / 1024),
        scriptTags: (html.match(/<script[^>]+src=/g) || []).length,
        defer: (html.match(/script defer/g) || []).length,
        cdn: (html.match(/unpkg|jsdelivr/g) || []).length,
        jsFiles: jsCount,
        jsFolderKb: Math.round(jsKb),
        hasBoot: html.includes('dashboard-boot'),
        inlineBoot: html.includes('var global = window'),
        me8Only: {
            authReverify: html.includes('auth-reverify'),
            passwordPolicy: html.includes('password-policy-ui'),
            totpEnroll: fs.existsSync(path.join(root, 'public/enroll-totp.html')),
        },
    };
}

const roots = [
    ['ME8', 'C:/Users/user/Desktop/Enterprise Mobility/ME8'],
    ['SaaS Mobility (trial gold app)', 'C:/Users/user/Desktop/Enterprise Mobility/SaaS Mobility'],
    ['trial-gold snapshot', 'C:/Users/user/Desktop/Enterprise Mobility/Lab-8BWC-v2/baseline/2026-06-22-trial-gold'],
    ['Lab-8BWC-v2 live', 'C:/Users/user/Desktop/Enterprise Mobility/Lab-8BWC-v2'],
];

roots.forEach(([label, root]) => {
    const r = audit(root, label);
    if (r) console.log(JSON.stringify(r));
});
