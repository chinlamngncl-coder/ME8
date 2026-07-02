#!/usr/bin/env node
/**
 * MOB-APPLY translate-manuals-full — verify localized manuals are not English copies.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'locales');
const EN_MARKERS = [
  '**Audience:** Dispatchers, supervisors',
  '## Table of contents',
  'This guide walks through **every tab**',
  '**Pair with:** **Quick Guide** (install) · **User Manual**',
];

const checks = [
  ['fil', 'user-fil.md'],
  ['fil', 'config-fil.md'],
  ['ko', 'user-ko.md'],
  ['ko', 'config-ko.md'],
  ['th', 'user-th.md'],
  ['th', 'config-th.md'],
  ['id', 'user-id.md'],
  ['id', 'config-id.md'],
  ['zh', 'user-zh.md'],
  ['zh', 'config-zh.md'],
];

let failed = false;
for (const [lang, file] of checks) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    console.error('MISSING', file);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n').length;
  if (lines < 150) {
    console.error('TOO SHORT', file, lines, 'lines');
    failed = true;
  }
  for (const m of EN_MARKERS) {
    if (text.includes(m)) {
      console.error('ENGLISH LEAK', file, 'contains:', m.slice(0, 40));
      failed = true;
    }
  }
  console.log('OK', lang, file, lines, 'lines');
}
process.exit(failed ? 1 : 0);
