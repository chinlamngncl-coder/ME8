'use strict';
const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, '..', 'public', 'index.html');
const s = fs.readFileSync(f, 'utf8');

function showAround(label, needleAscii) {
  const idx = s.indexOf(needleAscii);
  if (idx < 0) {
    console.log(label, 'NOT FOUND near', needleAscii);
    return;
  }
  const start = Math.max(0, idx);
  const sub = s.slice(start, start + needleAscii.length + 20);
  const cps = [...sub].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase());
  console.log('\n' + label);
  console.log('JSON:', JSON.stringify(sub));
  console.log('CPS:', cps.join(' '));
}

showAround('dock-bay-title', 'id="ev-dock-bay-title">');
showAround('sidebar-collapse', 'id="sidebar-collapse-toggle"');
showAround('cw-popout', 'id="cw-btn-popout"');
showAround('fr-tile-stop', 'ax-fr-tile-stop"');
showAround('preset24', 'preset24">');
showAround('glyphs line', "const glyphs = {");
showAround('content tri', "content: '");

// Frequency of suspect leading â (U+00E2)
let e2 = 0;
for (const c of s) if (c.codePointAt(0) === 0xe2) e2++;
console.log('\nU+00E2 count', e2);

// Find unique 3-char sequences starting with U+00E2
const freq = new Map();
for (let i = 0; i < s.length - 2; i++) {
  if (s.codePointAt(i) !== 0xe2) continue;
  const a = s.codePointAt(i);
  const b = s.codePointAt(i + 1);
  const c = s.codePointAt(i + 2);
  // skip if a is part of a real multi-byte already decoded — these are BMP chars
  const key = [a, b, c].map((x) => x.toString(16)).join('-');
  freq.set(key, (freq.get(key) || 0) + 1);
}
const top = [...freq.entries()].sort((x, y) => y[1] - x[1]).slice(0, 40);
console.log('\nTop U+00E2 trigrams:');
for (const [k, n] of top) console.log(n, k);
