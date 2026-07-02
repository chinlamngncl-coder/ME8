#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const langs = ['fil', 'ko', 'th', 'id', 'zh'];
for (const lang of langs) {
  const src = path.join(DIR, 'locales', `user-${lang}.md`);
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(DIR, `user-${lang}.md`));
  const cfg = path.join(DIR, 'locales', `config-${lang}.md`);
  if (fs.existsSync(cfg)) fs.copyFileSync(cfg, path.join(DIR, `config-${lang}.md`));
}
require('child_process').execSync(`node "${path.join(DIR, 'verify-translations.js')}"`, { stdio: 'inherit' });
console.log('Localized user/config manuals copied from locales/');
