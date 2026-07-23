/**
 * DOCK-BAY-TITLE-ENCODING-V1 — full public/ UI mojibake repair.
 * Replaces CP1252-misdecoded UTF-8 sequences with correct Unicode,
 * then hardens HTML (outside script/style) to entities so Windows re-saves do not re-rot.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'baseline', 'pack', 'dist', 'build', 'vendor', 'android', 'bench',
]);

/** Mojibake trigram/bigram (code points as stored) → correct Unicode char */
const MOJ_TO_CHAR = [
  // — em dash (201× in index.html)
  [[0xe2, 0x20ac, 0x201d], '\u2014'],
  // – en dash
  [[0xe2, 0x20ac, 0x201c], '\u2013'],
  // … ellipsis
  [[0xe2, 0x20ac, 0xa6], '\u2026'],
  // ’ right single
  [[0xe2, 0x20ac, 0x2122], '\u2019'],
  // ‹ ›
  [[0xe2, 0x20ac, 0xb9], '\u2039'],
  [[0xe2, 0x20ac, 0xba], '\u203a'],
  // →
  [[0xe2, 0x2020, 0x2019], '\u2192'],
  // ↗
  [[0xe2, 0x2020, 0x2014], '\u2197'],
  // ↩
  [[0xe2, 0x2020, 0xba], '\u21ba'],
  // − minus (âˆ’)
  [[0xe2, 0x2c6, 0x2019], '\u2212'],
  // ◀
  [[0xe2, 0x2014, 0x20ac], '\u25c0'],
  // ▸
  [[0xe2, 0x2013, 0xb8], '\u25b8'],
  // ▣
  [[0xe2, 0x2013, 0xa3], '\u25a3'],
  // ▦
  [[0xe2, 0x2013, 0xa6], '\u25a6'],
  // ◒
  [[0xe2, 0x2014, 0x2019], '\u25d2'],
  // ◆
  [[0xe2, 0x2014, 0x2020], '\u25c6'],
  // ✥ (âœ¥)
  [[0xe2, 0x153, 0xa5], '\u2725'],
  // × (Ã— stored as U+00C3 U+2014)
  [[0xc3, 0x2014], '\u00d7'],
];

const CHAR_TO_ENTITY = [
  ['\u2014', '&mdash;'],
  ['\u2013', '&ndash;'],
  ['\u2026', '&hellip;'],
  ['\u2019', '&rsquo;'],
  ['\u2018', '&lsquo;'],
  ['\u2039', '&lsaquo;'],
  ['\u203a', '&rsaquo;'],
  ['\u2192', '&rarr;'],
  ['\u2197', '&nearr;'],
  ['\u21ba', '&#8629;'],
  ['\u2212', '&minus;'],
  ['\u00d7', '&times;'],
  ['\u00b7', '&middot;'],
  ['\u25c0', '&#9664;'],
  ['\u25b8', '&#9656;'],
  ['\u25a3', '&#9635;'],
  ['\u25a6', '&#9638;'],
  ['\u25d2', '&#9682;'],
  ['\u25c6', '&#9670;'],
  ['\u2725', '&#10021;'],
];

const CHAR_TO_JS_ESC = {
  '\u2014': '\\u2014',
  '\u2013': '\\u2013',
  '\u2026': '\\u2026',
  '\u2019': '\\u2019',
  '\u2018': '\\u2018',
  '\u2192': '\\u2192',
  '\u2197': '\\u2197',
  '\u21ba': '\\u21BA',
  '\u2212': '\\u2212',
  '\u00d7': '\\u00D7',
  '\u00b7': '\\u00B7',
  '\u25c0': '\\u25C0',
  '\u25b8': '\\u25B8',
  '\u25a3': '\\u25A3',
  '\u25a6': '\\u25A6',
  '\u25d2': '\\u25D2',
  '\u25c6': '\\u25C6',
  '\u2725': '\\u2725',
  '\u2039': '\\u2039',
  '\u203a': '\\u203A',
};

function fromCps(cps) {
  return String.fromCodePoint(...cps);
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(html|js|json)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function decodeMojibake(text) {
  let out = text;
  let hits = 0;
  const detail = {};
  // Longest first (all length 3 except times length 2 — already ordered)
  for (const [cps, ch] of MOJ_TO_CHAR) {
    const from = fromCps(cps);
    if (!out.includes(from)) continue;
    const n = out.split(from).length - 1;
    out = out.split(from).join(ch);
    hits += n;
    detail[cps.map((c) => c.toString(16)).join('-') + '→' + ch] = n;
  }
  return { out, hits, detail };
}

/** Harden HTML outside script/style: unicode → entities. Inside script: unicode → \u escapes. */
function hardenHtml(text) {
  const parts = [];
  const re = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
  let last = 0;
  let m;
  let hits = 0;
  while ((m = re.exec(text)) !== null) {
    // HTML chunk before this block
    const htmlChunk = text.slice(last, m.index);
    const { text: h, n } = entityHarden(htmlChunk);
    hits += n;
    parts.push(h);

    if (m[1] != null) {
      // script
      const { text: js, n: n2 } = jsEscapeHarden(m[2]);
      hits += n2;
      parts.push(m[1], js, m[3]);
    } else {
      // style — keep real unicode (CSS understands UTF-8); optional css escapes skipped
      parts.push(m[4], m[5], m[6]);
    }
    last = m.index + m[0].length;
  }
  const { text: tail, n } = entityHarden(text.slice(last));
  hits += n;
  parts.push(tail);
  return { out: parts.join(''), hits };
}

function entityHarden(chunk) {
  let text = chunk;
  let n = 0;
  for (const [ch, ent] of CHAR_TO_ENTITY) {
    if (!text.includes(ch)) continue;
    const c = text.split(ch).length - 1;
    text = text.split(ch).join(ent);
    n += c;
  }
  return { text, n };
}

function jsEscapeHarden(chunk) {
  let text = chunk;
  let n = 0;
  for (const [ch, esc] of Object.entries(CHAR_TO_JS_ESC)) {
    if (!text.includes(ch)) continue;
    const c = text.split(ch).length - 1;
    // Insert the escape as source text (backslash-u-XXXX)
    text = text.split(ch).join(esc.replace(/\\\\/g, '\\'));
    // CHAR_TO_JS_ESC values are like '\\u2014' in JS source meaning \u2014 in file
    n += c;
  }
  // Fix: Object.entries values are the string \u2014 (one backslash). split/join inserts that.
  return { text, n };
}

function hardenJsFile(text) {
  // Prefer \u escapes for the same set (survives encoding rot)
  return jsEscapeHarden(text);
}

function hardenJsonFile(text) {
  // JSON must keep real Unicode (or \u in JSON). Real Unicode is fine in UTF-8 JSON.
  return { text, n: 0 };
}

function main() {
  const files = walk(path.join(ROOT, 'public'));
  const report = [];
  let total = 0;

  for (const f of files) {
    const raw = fs.readFileSync(f);
    let text = raw.toString('utf8');
    const bom = text.charCodeAt(0) === 0xfeff;
    if (bom) text = text.slice(1);

    const dec = decodeMojibake(text);
    let out = dec.out;
    let hardenHits = 0;

    if (/\.html$/i.test(f)) {
      const h = hardenHtml(out);
      out = h.out;
      hardenHits = h.hits;
    } else if (/\.js$/i.test(f)) {
      const h = hardenJsFile(out);
      out = h.text;
      hardenHits = h.n;
    } else if (/\.json$/i.test(f)) {
      const h = hardenJsonFile(out);
      out = h.text;
      hardenHits = h.n;
    }

    const hits = dec.hits + hardenHits;
    if (hits === 0) continue;

    fs.writeFileSync(f, (bom ? '\ufeff' : '') + out, 'utf8');
    total += hits;
    report.push({
      rel: path.relative(ROOT, f).replace(/\\/g, '/'),
      mojibake: dec.hits,
      harden: hardenHits,
      detail: dec.detail,
    });
  }

  // Residual scan: any U+00E2 still looking like mojibake lead?
  const residual = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    let e2 = 0;
    for (const c of s) if (c.codePointAt(0) === 0xe2) e2++;
    // Count remaining classic em-dash mojibake
    const bad = fromCps([0xe2, 0x20ac, 0x201d]);
    const left = s.split(bad).length - 1;
    if (left > 0 || e2 > 50) {
      residual.push({
        rel: path.relative(ROOT, f).replace(/\\/g, '/'),
        remainingEmMoj: left,
        u00e2: e2,
      });
    }
  }

  console.log(JSON.stringify({ total, filesChanged: report.length, report, residual }, null, 2));
}

main();
