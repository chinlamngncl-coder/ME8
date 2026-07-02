#!/usr/bin/env node
/**
 * Render trial manuals (Markdown) to HTML + PDF.
 * Usage:
 *   node scripts/trial-ship/render-manuals-html-pdf.js
 *   node scripts/trial-ship/render-manuals-html-pdf.js --root docs/trial-ship/manuals-cn
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const outArg = process.argv.indexOf('--root');
const MANUAL_ROOT = outArg >= 0
  ? path.resolve(ROOT, process.argv[outArg + 1])
  : path.join(ROOT, 'docs', 'trial-ship', 'manuals');

const DOCS = ['Quick-Guide.md', 'User-Manual.md', 'Configuration-Manual.md'];

const CSS = `
body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 920px; margin: 2rem auto; padding: 0 1.5rem 3rem; line-height: 1.55; color: #1e293b; }
h1 { font-size: 1.75rem; border-bottom: 2px solid #0f172a; padding-bottom: 0.35rem; }
h2 { font-size: 1.25rem; margin-top: 1.75rem; color: #0f172a; }
h3 { font-size: 1.05rem; margin-top: 1.25rem; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.92rem; }
th, td { border: 1px solid #cbd5e1; padding: 0.45rem 0.65rem; text-align: left; vertical-align: top; }
th { background: #f1f5f9; }
code { background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
ul, ol { padding-left: 1.4rem; }
@media print { body { max-width: none; margin: 0; } }
`;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function mdToHtmlBody(md) {
  return execSync('npx --yes marked', {
    input: md,
    encoding: 'utf8',
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function wrapHtml(title, bodyHtml, lang) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>${CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function fileUri(absPath) {
  return 'file:///' + path.resolve(absPath).replace(/\\/g, '/');
}

function htmlToPdf(chrome, htmlPath, pdfPath) {
  const uri = fileUri(htmlPath);
  execSync(
    `"${chrome}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${uri}"`,
    { stdio: 'pipe', timeout: 120000 }
  );
}

function renderMdFile(mdPath, chrome) {
  const md = fs.readFileSync(mdPath, 'utf8');
  const base = path.basename(mdPath, '.md');
  const dir = path.dirname(mdPath);
  const lang = path.basename(dir);
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : base;

  const bodyHtml = mdToHtmlBody(md);
  const htmlPath = path.join(dir, base + '.html');
  fs.writeFileSync(htmlPath, wrapHtml(title, bodyHtml, lang), 'utf8');

  const pdfPath = path.join(dir, base + '.pdf');
  if (chrome) {
    htmlToPdf(chrome, htmlPath, pdfPath);
    return { html: htmlPath, pdf: pdfPath };
  }
  return { html: htmlPath, pdf: null };
}

if (!fs.existsSync(MANUAL_ROOT)) {
  console.error('Manual root not found:', MANUAL_ROOT);
  process.exit(1);
}

const chrome = findChrome();
if (!chrome) console.warn('Chrome/Edge not found — HTML only.');

let count = 0;
const langs = fs.readdirSync(MANUAL_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const lang of langs) {
  for (const doc of DOCS) {
    const mdPath = path.join(MANUAL_ROOT, lang, doc);
    if (!fs.existsSync(mdPath)) continue;
    const out = renderMdFile(mdPath, chrome);
    console.log('OK', lang, doc, '->', path.basename(out.html), out.pdf ? '+ PDF' : '(HTML only)');
    count += 1;
  }
}

console.log('Rendered', count, 'manual(s) under', MANUAL_ROOT);
