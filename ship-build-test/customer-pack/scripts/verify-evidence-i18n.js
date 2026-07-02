'use strict';
/**
 * Verify Evidence & Docking i18n — no raw dotted keys in UI.
 * Run: node scripts/verify-evidence-i18n.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'public', 'locales');
const LANGS = ['en', 'ko', 'th', 'id', 'fil'];

const locales = {};
LANGS.forEach(function (l) {
    locales[l] = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, l + '.json'), 'utf8'));
});

function scanFile(rel, patterns) {
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const keys = new Set();
    patterns.forEach(function (re) {
        let m;
        const r = new RegExp(re.source, re.flags);
        while ((m = r.exec(s))) keys.add(m[1]);
    });
    return keys;
}

function isEvidenceKey(k) {
    return k.startsWith('evidence.')
        || k.startsWith('evidenceHub.')
        || k.startsWith('server.dock.')
        || /^server\.users\.col(Evidence|DockAdmin)/.test(k)
        || k === 'common.save'
        || k === 'common.cancel'
        || k === 'nav.evidenceDocking';
}

const used = new Set();
scanFile('public/js/evidence-hub.js', [/tr\('([^']+)'/g]).forEach(function (k) {
    if (isEvidenceKey(k)) used.add(k);
});
scanFile('public/js/evidence-manager.js', [/tr\('([^']+)'/g]).forEach(function (k) {
    if (isEvidenceKey(k)) used.add(k);
});

const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const evMatch = html.match(/id="app-view-evidence"[\s\S]*?id="bwc-devices-backdrop"/);
if (evMatch) {
    const b = evMatch[0];
    [/data-i18n="([^"]+)"/g, /data-i18n-placeholder="([^"]+)"/g].forEach(function (re) {
        let m;
        while ((m = re.exec(b))) {
            if (isEvidenceKey(m[1])) used.add(m[1]);
        }
    });
}
['server.users.colEvidenceView', 'server.users.colEvidenceExport', 'server.users.colEvidenceEdit', 'server.users.colDockAdmin']
    .forEach(function (k) { used.add(k); });

const usedList = [...used].sort();
let failed = false;

console.log('Evidence & Docking i18n keys:', usedList.length);

usedList.forEach(function (k) {
    if (!locales.en[k]) {
        console.error('MISSING IN en.json:', k);
        failed = true;
    }
    if (locales.en[k] === k) {
        console.error('en.json value equals raw key:', k);
        failed = true;
    }
});

LANGS.forEach(function (lang) {
    const missing = usedList.filter(function (k) { return !locales[lang][k]; });
    if (missing.length) {
        console.error(lang + ' missing:', missing.join(', '));
        failed = true;
    }
    usedList.forEach(function (k) {
        if (locales[lang][k] === k) {
            console.error(lang + ' value equals raw key:', k);
            failed = true;
        }
    });
});

if (failed) {
    console.error('\nverify-evidence-i18n: FAILED');
    process.exit(1);
}
console.log('verify-evidence-i18n: OK — no raw key leaks for Evidence & Docking');
