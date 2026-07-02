'use strict';
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(/<script src="/g, '<script defer src="');

const anchor = '    <script defer src="/js/command-centre.js?v=20260624-llm-two-hints"></script>\n';
const bootTag = '    <script defer src="/js/dashboard-boot.js?v=20260701-defer-scripts"></script>\n';
const idx = html.indexOf(anchor);
if (idx < 0) throw new Error('command-centre anchor missing');

const inlineStart = html.indexOf('    <script>\n        var global = window;', idx);
const inlineEnd = html.lastIndexOf('    </script>\n</body>');
if (inlineStart < 0 || inlineEnd < 0) throw new Error('inline boot block missing');

html = html.slice(0, inlineStart) + bootTag + html.slice(inlineEnd + '    </script>\n'.length);
fs.writeFileSync(indexPath, html);
console.log('index.html defer apply OK');
