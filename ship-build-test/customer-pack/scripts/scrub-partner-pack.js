#!/usr/bin/env node
/**
 * Partner delivery scrub — strip internal paths, lab IDs, vendor tooling refs.
 * Usage: node scripts/scrub-partner-pack.js <dir> [<dir2> ...]
 * Exits 1 if forbidden strings remain after scrub.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const roots = process.argv.slice(2).filter((a) => a && !a.startsWith('-'));
if (!roots.length) {
  console.error('Usage: node scrub-partner-pack.js <pack-dir> [...]');
  process.exit(2);
}

const TEXT_EXT = new Set([
  '.js', '.json', '.md', '.html', '.htm', '.txt', '.bat', '.ps1', '.example', '.env', '.csv', '.yaml', '.yml',
]);

const REPLACEMENTS = [
  [/MobilityC2-VENDOR-IMPORTANT\\\\OperationsPortal/g, 'Contact your Mobility Axiom vendor'],
  [/MobilityC2-VENDOR-IMPORTANT[\\/]LicenseIssuer/g, 'your Mobility Axiom vendor'],
  [/MobilityC2-VENDOR-IMPORTANT[\\/]OperationsPortal/g, 'vendor operations portal (provided separately)'],
  [/MobilityC2-VENDOR-IMPORTANT/g, 'Mobility Axiom vendor'],
  [/C:\\\\Users\\\\user\\\\Desktop\\\\SaaS Mobility/g, ''],
  [/C:\\Users\\user\\Desktop\\SaaS Mobility/g, ''],
  [/C:\\\\Users\\\\user\\\\Desktop\\\\MobilityC2-VENDOR-IMPORTANT[^'"]*/g, ''],
  [/C:\\Users\\user\\Desktop\\MobilityC2-VENDOR-IMPORTANT[^\s'"]*/g, ''],
  [/docs[\\/]LICENSE-OPERATIONS\.md/g, 'vendor product documentation'],
  [/docs[\\/]google-feedback-discussion[^\s'"]*/g, 'vendor documentation'],
  [/North patrol,green,Chin,34020000001329000008/g, 'Patrol A,green,Officer A,34020000002000000001'],
  [/North patrol,1,Lee,34020000001329000009/g, 'Patrol A,1,Officer B,34020000002000000002'],
  [/South team,blue,Pat,34020000001329000010/g, 'Patrol B,blue,Officer C,34020000002000000003'],
  [/East unit,#a855f7,Sam,34020000001329000011/g, 'Patrol C,#a855f7,Officer D,34020000002000000004'],
  [/34020000001329000008/g, '34020000002000000001'],
  [/34020000001329000009/g, '34020000002000000002'],
  [/34020000001329000010/g, '34020000002000000003'],
  [/34020000001329000011/g, '34020000002000000004'],
  [/10A01000822E82BFC00/g, '00000000000000000001'],
  [/BUILD-CHINA-OFFLINE-TILES\.ps1/g, 'vendor support'],
  [/Offline map pack missing — run vendor support/g, 'Offline map tiles not installed — contact your vendor'],
  [/Fleet Backend/gi, 'Mobility Axiom'],
  [/FleetBackend/g, 'Mobility Axiom'],
  [/trial-gold-\d+\.\d+/g, 'trial delivery'],
  [/FM_SEED_BWC_NICKNAME=Chin/g, 'FM_SEED_BWC_NICKNAME=Officer'],
  [/mapGroup: 'North patrol'/g, "mapGroup: 'Patrol group A'"],
  [/names like "KK" and longer names like "Chin" or "John"/g, 'names like "Alex" or "John"'],
  [
    /<code>Mobility Axiom vendor\\OperationsPortal<\/code>/g,
    '<span>Contact your Mobility Axiom vendor</span>',
  ],
  [/Offline map pack missing — run vendor support/g, 'Offline map tiles not installed — contact your vendor'],
  [/<code>customers\.template\.csv<\/code>/g, 'Provided by your vendor'],
  [/<code>node tools\/noc-poll-sites\.js[^<]*<\/code>/g, 'Contact your vendor for central monitoring'],
  [
    /# FM_LICENSE_REQUIRED=0\s+# internal dev only — skip license check/g,
    '# FM_LICENSE_REQUIRED=1   # set 0 only for vendor-approved lab bypass',
  ],
  [
    /# Required when FM_RENTAL_MODE=1\. Issued from your Mobility Axiom vendor \(NOT this server\)\./g,
    '# Required when FM_RENTAL_MODE=1. Issued by your Mobility Axiom vendor (not generated on this server).',
  ],
];

const FORBIDDEN = [
  'MobilityC2-VENDOR-IMPORTANT',
  'LicenseIssuer',
  'LICENSE-OPERATIONS',
  'SaaS Mobility',
  'Users\\user\\Desktop',
  'Users\\\\user\\\\Desktop',
  'BUILD-CHINA-OFFLINE-TILES',
  '340200000013290000',
  '10A01000822E82BFC00',
  'trial-gold-',
  'FleetBackend',
  ',Chin,',
  'North patrol,green,Chin',
  'google-feedback-discussion',
  'issue-license.js',
  'generate-license-keys',
];

function walkFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walkFiles(p, out);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (TEXT_EXT.has(ext) || ent.name === '.env.example') out.push(p);
    }
  }
}

function scrubFile(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  const before = raw;
  for (const [re, rep] of REPLACEMENTS) raw = raw.replace(re, rep);
  if (raw !== before) fs.writeFileSync(filePath, raw, 'utf8');
  return raw;
}

let hits = 0;
for (const root of roots) {
  const abs = path.resolve(root);
  const files = [];
  walkFiles(abs, files);
  for (const f of files) scrubFile(f);
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    for (const needle of FORBIDDEN) {
      if (content.includes(needle)) {
        console.error('[FORBIDDEN]', needle, 'in', path.relative(abs, f));
        hits++;
      }
    }
  }
}

if (hits) {
  console.error(`Partner scrub FAILED — ${hits} forbidden string hit(s)`);
  process.exit(1);
}
console.log('Partner scrub OK —', roots.map((r) => path.resolve(r)).join(', '));
