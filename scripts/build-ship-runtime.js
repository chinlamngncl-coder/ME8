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
const minify = String(process.env.FM_SHIP_MINIFY || '').trim() === '1' || process.argv.includes('--minify');
const cmd = [
  'npx --yes esbuild',
  JSON.stringify(entry),
  '--bundle --platform=node --target=node22 --packages=external',
  minify ? '--minify --legal-comments=none' : '',
  '--outfile=' + JSON.stringify(tmpOut),
  '--log-level=warning',
].filter(Boolean).join(' ');

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

/* ANPR-POLLER-ISOLATE — sibling child bundle next to run.js (1-click pack; no lib/) */
const childEntry = path.join(appRoot, 'lib', 'anprLivePollerChild.js');
const childOut = path.join(path.dirname(outFile), 'anpr-poller-child.js');
if (fs.existsSync(childEntry)) {
    const childTmp = path.join(appRoot, '.ship-anpr-child.tmp.js');
    const childCmd = [
        'npx --yes esbuild',
        JSON.stringify(childEntry),
        '--bundle --platform=node --target=node22 --packages=external',
        minify ? '--minify --legal-comments=none' : '',
        '--outfile=' + JSON.stringify(childTmp),
        '--log-level=warning',
    ].filter(Boolean).join(' ');
    try {
        execSync(childCmd, { stdio: 'inherit', cwd: appRoot, shell: true });
        if (fs.existsSync(childTmp)) {
            fs.copyFileSync(childTmp, childOut);
            try { fs.unlinkSync(childTmp); } catch (_) { /* ignore */ }
            console.log('ship anpr child:', childOut, '(' + Math.round(fs.statSync(childOut).size / 1024) + ' KB)');
        }
    } catch (e) {
        console.error('WARN: anpr-poller-child.js bundle failed — isolate needs sibling next to run.js');
    }
}

/* ANPR-INGEST-EXTERNAL-SERVICE — sibling ingest service beside run.js */
const ingestEntry = path.join(appRoot, 'lib', 'anprIngestServiceMain.js');
const ingestOut = path.join(path.dirname(outFile), 'anpr-ingest-service.js');
if (fs.existsSync(ingestEntry)) {
    const ingestTmp = path.join(appRoot, '.ship-anpr-ingest.tmp.js');
    const ingestCmd = [
        'npx --yes esbuild',
        JSON.stringify(ingestEntry),
        '--bundle --platform=node --target=node22 --packages=external',
        minify ? '--minify --legal-comments=none' : '',
        '--outfile=' + JSON.stringify(ingestTmp),
        '--log-level=warning',
    ].filter(Boolean).join(' ');
    try {
        execSync(ingestCmd, { stdio: 'inherit', cwd: appRoot, shell: true });
        if (fs.existsSync(ingestTmp)) {
            fs.copyFileSync(ingestTmp, ingestOut);
            try { fs.unlinkSync(ingestTmp); } catch (_) { /* ignore */ }
            console.log('ship anpr ingest:', ingestOut, '(' + Math.round(fs.statSync(ingestOut).size / 1024) + ' KB)');
        }
    } catch (e) {
        console.error('WARN: anpr-ingest-service.js bundle failed');
    }
}