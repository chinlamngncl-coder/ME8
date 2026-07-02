'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));
const techJs = fs.readFileSync(path.join(root, 'public', 'js', 'tech-diagnostics.js'), 'utf8');
const techAccess = fs.readFileSync(path.join(root, 'lib', 'techAccess.js'), 'utf8');

const banned = [/FM_/i, /\.env/i, /restart\s+fleet/i];
let fail = 0;

function check(label, ok) {
    if (!ok) {
        console.error('FAIL:', label);
        fail++;
    }
}

const notConfigured = en['tech.notConfigured'] || '';
banned.forEach(function (re) {
    check('en tech.notConfigured must not match ' + re, !re.test(notConfigured));
});
check('en tech.notConfigured is set', notConfigured.length > 20);

const errorStrings = techAccess.match(/error:\s*'([^']+)'/g) || [];
errorStrings.forEach(function (line) {
    banned.forEach(function (re) {
        check('techAccess API error must not match ' + re + ': ' + line, !re.test(line));
    });
});

check('tech-diagnostics has techUserMessage', techJs.includes('function techUserMessage'));
check('tech-diagnostics does not alert raw err.message on login', !/errEl\.textContent = err\.message/.test(techJs));

if (fail) process.exit(1);
console.log('tech-copy-enterprise verify OK');
