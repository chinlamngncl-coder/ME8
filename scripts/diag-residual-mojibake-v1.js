'use strict';
const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');

function findTrigram(cps) {
  const from = String.fromCodePoint(...cps);
  let i = 0;
  const hits = [];
  while (true) {
    const j = s.indexOf(from, i);
    if (j < 0) break;
    hits.push(JSON.stringify(s.slice(Math.max(0, j - 30), j + 40)));
    i = j + 1;
  }
  return hits;
}

const targets = [
  [0xe2, 0xa0, 0xbf],
  [0xe2, 0x20ac, 0x153],
  [0xe2, 0x20ac, 0x9d],
  [0xe2, 0x2021, 0x5c],
  [0xe2, 0x2c6, 0xaa],
  [0xe2, 0x2020, 0x90],
  [0xe2, 0x152, 0x26],
  [0xe2, 0x153, 0x2022],
  [0xe2, 0x26, 0x6e],
];

for (const cps of targets) {
  const key = cps.map((c) => c.toString(16)).join('-');
  console.log('\n==', key);
  for (const h of findTrigram(cps)) console.log(h);
}
