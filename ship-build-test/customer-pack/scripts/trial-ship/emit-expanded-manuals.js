#!/usr/bin/env node
/**
 * Writes expanded User + Configuration manuals to manuals-src/{lang}/
 * Run: node scripts/trial-ship/emit-expanded-manuals.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'manuals-src');

function w(lang, name, body) {
  const dir = path.join(ROOT, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body.trimEnd() + '\n', 'utf8');
}

// Load section bodies from companion files if present, else use built-in EN
const { execSync } = require('child_process');
execSync('node "' + path.join(__dirname, 'manuals-expanded', 'build-localized.js') + '"', { stdio: 'inherit' });

const enUser = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'user-en.md'), 'utf8');
const enConfig = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'config-en.md'), 'utf8');
const filUser = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'user-fil.md'), 'utf8');
const filConfig = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'config-fil.md'), 'utf8');
const koUser = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'user-ko.md'), 'utf8');
const thUser = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'user-th.md'), 'utf8');
const idUser = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'user-id.md'), 'utf8');
const zhUser = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'user-zh.md'), 'utf8');
const koConfig = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'config-ko.md'), 'utf8');
const thConfig = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'config-th.md'), 'utf8');
const idConfig = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'config-id.md'), 'utf8');
const zhConfig = fs.readFileSync(path.join(__dirname, 'manuals-expanded', 'config-zh.md'), 'utf8');

const langs = [
  ['en', enUser, enConfig],
  ['fil', filUser, filConfig],
  ['ko', koUser, koConfig],
  ['th', thUser, thConfig],
  ['id', idUser, idConfig],
  ['zh', zhUser, zhConfig],
];
for (const [lang, user, config] of langs) {
  w(lang, 'User-Manual.md', user);
  w(lang, 'Configuration-Manual.md', config);
}

console.log('Expanded manuals written to', ROOT);
