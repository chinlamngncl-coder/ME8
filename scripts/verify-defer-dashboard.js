'use strict';
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const bootPath = path.join(__dirname, '..', 'public', 'js', 'dashboard-boot.js');
const html = fs.readFileSync(indexPath, 'utf8');

const deferCount = (html.match(/<script defer src="/g) || []).length;
const blockingSrc = (html.match(/<script src="/g) || []).length;
const bootLast = /dashboard-boot\.js\?v=20260701-revert-boot"><\/script>\s*<\/body>/i.test(html);

if (deferCount > 0) {
    console.error('FAIL: defer scripts remain:', deferCount);
    process.exit(1);
}
if (blockingSrc < 45) {
    console.error('FAIL: expected 45+ blocking script tags, got', blockingSrc);
    process.exit(1);
}
if (html.includes('var global = window')) {
    console.error('FAIL: inline boot in index.html — use dashboard-boot.js');
    process.exit(1);
}
if (!bootLast) {
    console.error('FAIL: dashboard-boot.js must be last blocking script before </body>');
    process.exit(1);
}
if (!fs.existsSync(bootPath) || fs.statSync(bootPath).size < 100000) {
    console.error('FAIL: dashboard-boot.js missing or too small');
    process.exit(1);
}

console.log('blocking boot verify OK', { blockingSrc, indexKb: Math.round(html.length / 1024) });
