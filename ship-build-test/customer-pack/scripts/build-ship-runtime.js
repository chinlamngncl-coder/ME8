#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const outFile = path.resolve(process.argv[3] || path.join(appRoot, 'run.js'));
const entry = path.join(appRoot, 'server.js');

if (!fs.existsSync(entry)) {
  console.error('server.js not found:', entry);
  process.exit(1);
}

const tmpOut = path.join(appRoot, '.ship-run-build.tmp.js');
const cmd = [
  'npx --yes esbuild',
  JSON.stringify(entry),
  '--bundle --platform=node --target=node20 --packages=external',
  '--outfile=' + JSON.stringify(tmpOut),
  '--log-level=warning',
].join(' ');

try {
  execSync(cmd, { stdio: 'inherit', cwd: appRoot, shell: true });
} catch (e) {
  process.exit(1);
}

if (!fs.existsSync(tmpOut)) {
  console.error('bundle failed');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.copyFileSync(tmpOut, outFile);
try { fs.unlinkSync(tmpOut); } catch (_) { /* ignore */ }

console.log('ship runtime:', outFile, '(' + Math.round(fs.statSync(outFile).size / 1024) + ' KB)');
