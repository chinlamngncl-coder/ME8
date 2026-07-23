/**
 * Pass 2 — residual mojibake + sequences partially broken by pass-1 harden.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const file = path.join(ROOT, 'public', 'index.html');

let s = fs.readFileSync(file, 'utf8');
const bom = s.charCodeAt(0) === 0xfeff;
if (bom) s = s.slice(1);

const reps = [
  // Broken by pass-1 (entity/escape ate middle of trigram)
  ['â‡\\u2019', '\\u21D2'],           // ⇒ in script comment
  ['âŒ&ndash;', '&#8982;'],          // ⌖ map pick
  ['â&ndash;\u0081', '&#9601;'],     // ▁ minimize (U+0081 was 0x81)
  ['â&ndash;', '&#9601;'],          // same if  is U+0081 as char

  // Intact residuals
  [String.fromCodePoint(0xe2, 0x20ac, 0x153), '&ldquo;'], // “
  [String.fromCodePoint(0xe2, 0x20ac, 0x9d), '&rdquo;'],   // ”
  [String.fromCodePoint(0xe2, 0x2020, 0x90), '&larr;'],    // ←
  [String.fromCodePoint(0xe2, 0xa0, 0xbf), '\\u283F'],     // ⠿ grip (in CSS — use unicode escape)
  [String.fromCodePoint(0xe2, 0x2c6, 0xaa), '\\u222A'],    // ∪ in script
  [String.fromCodePoint(0xe2, 0x153, 0x2022), '&#10005;'], // ✕

  // Wrong entity for reset arrow U+21BA
  ['&#8629;', '&#8634;'],
];

// CSS content grips: if we insert \u283F as JS-style it won't work in CSS.
// For style blocks use the CSS unicode escape \283F
reps[reps.findIndex((r) => r[1] === '\\u283F')] = [
  String.fromCodePoint(0xe2, 0xa0, 0xbf),
  '\\283F',
];

let hits = 0;
const detail = {};
for (const [from, to] of reps) {
  if (!from || !s.includes(from)) continue;
  const n = s.split(from).length - 1;
  s = s.split(from).join(to);
  hits += n;
  detail[JSON.stringify(from) + '→' + to] = n;
}

fs.writeFileSync(file, (bom ? '\ufeff' : '') + s, 'utf8');
console.log(JSON.stringify({ hits, detail }, null, 2));

// Residual e2 scan
const freq = new Map();
for (let i = 0; i < s.length - 2; i++) {
  if (s.codePointAt(i) !== 0xe2) continue;
  // Skip if this is start of a real UTF-8 multibyte already decoded — U+00E2 is Latin â
  const key = [s.codePointAt(i), s.codePointAt(i + 1), s.codePointAt(i + 2)]
    .map((x) => (x == null ? '' : x.toString(16)))
    .join('-');
  freq.set(key, (freq.get(key) || 0) + 1);
}
console.log('remaining e2 trigrams', [...freq.entries()].sort((a, b) => b[1] - a[1]));
