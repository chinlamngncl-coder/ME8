'use strict';
const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');

function around(label, needle) {
  const i = s.indexOf(needle);
  if (i < 0) { console.log(label, 'MISSING'); return; }
  const sub = s.slice(i, i + needle.length + 40);
  console.log(label, JSON.stringify(sub));
  console.log('  cps', [...sub.slice(0, 60)].map((c) => 'U+' + c.codePointAt(0).toString(16)).join(' '));
}

around('dock', 'id="ev-dock-bay-title">');
around('reset', 'map-pin-stack-hud-reset');
around('collapse', 'Hide fleet panel">');
around('fr-stop', 'Stop this tile">');
around('preset', 'preset24">');
around('curly', 'Rebuild offline');
around('leftarr', 'fc-close-btn');

console.log('&#8629;', (s.match(/&#8629;/g) || []).length);
console.log('&mdash; dock', /id="ev-dock-bay-title">[^<]*/.exec(s)[0]);

// remaining U+00E2 trigrams
const freq = new Map();
for (let i = 0; i < s.length - 2; i++) {
  if (s.codePointAt(i) !== 0xe2) continue;
  const key = [s.codePointAt(i), s.codePointAt(i + 1), s.codePointAt(i + 2)].map((x) => x.toString(16)).join('-');
  freq.set(key, (freq.get(key) || 0) + 1);
}
console.log('remaining e2 trigrams', [...freq.entries()].sort((a, b) => b[1] - a[1]));
