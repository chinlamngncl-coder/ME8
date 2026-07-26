#!/usr/bin/env node
'use strict';

/**
 * Build protected ship runtime:
 *  - esbuild-bundle server.js + all local lib/* into one run.js (minified)
 *  - licenseManager / platformLicense land inside the bundle (not as readable .js files)
 *  - Stage dist layout with assets separated from the runtime blob
 *
 * Does NOT use pkg.exe for this MOB — native deps (pg, ioredis, node-llama-cpp, onvif)
 * stay as external node_modules next to the bundle (same as current PH-KR packs).
 *
 * Usage:
 *   node scripts/build-ship-protected.js [appRoot] [outDir]
 *   npm run build:ship
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const appRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const outDir = path.resolve(process.argv[3] || path.join(appRoot, 'ship-build', 'protected'));
const entry = path.join(appRoot, 'server.js');
const rootRunJs = path.join(appRoot, 'run.js');

if (!fs.existsSync(entry)) {
    console.error('server.js not found:', entry);
    process.exit(1);
}

function rmrf(p) {
    if (!fs.existsSync(p)) return;
    fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function copyDirFiltered(src, dest, skipNames) {
    const skip = new Set(skipNames || []);
    ensureDir(dest);
    for (const name of fs.readdirSync(src)) {
        if (skip.has(name)) continue;
        const from = path.join(src, name);
        const to = path.join(dest, name);
        const st = fs.statSync(from);
        if (st.isDirectory()) copyDirFiltered(from, to, skip);
        else fs.copyFileSync(from, to);
    }
}

console.log('[build:ship] appRoot=', appRoot);
console.log('[build:ship] outDir =', outDir);

rmrf(outDir);
ensureDir(outDir);

const tmpBundle = path.join(appRoot, '.ship-protected-bundle.tmp.js');
try { fs.unlinkSync(tmpBundle); } catch (_) { /* ignore */ }

/* Minified Node 22 bundle — local modules (incl. licenseManager) inlined; npm pkgs external */
const cmd = [
    'npx --yes esbuild',
    JSON.stringify(entry),
    '--bundle --platform=node --target=node22 --packages=external',
    '--minify',
    '--legal-comments=none',
    '--outfile=' + JSON.stringify(tmpBundle),
    '--log-level=warning',
].join(' ');

try {
    execSync(cmd, { stdio: 'inherit', cwd: appRoot, shell: true });
} catch (_) {
    console.error('[build:ship] esbuild failed');
    process.exit(1);
}

if (!fs.existsSync(tmpBundle)) {
    console.error('[build:ship] bundle missing');
    process.exit(1);
}

const runJsOut = path.join(outDir, 'run.js');
fs.copyFileSync(tmpBundle, runJsOut);
fs.copyFileSync(tmpBundle, rootRunJs);
try { fs.unlinkSync(tmpBundle); } catch (_) { /* ignore */ }

const bundleKb = Math.round(fs.statSync(runJsOut).size / 1024);
console.log('[build:ship] runtime blob:', runJsOut, '(' + bundleKb + ' KB)');
console.log('[build:ship] refreshed repo run.js for ship parity');

/* Optional second pass: obfuscate string-heavy license markers inside blob (conservative). */
const obfuscate = String(process.env.FM_SHIP_OBFUSCATE || '').trim() === '1';
if (obfuscate) {
    console.log('[build:ship] FM_SHIP_OBFUSCATE=1 — running javascript-obfuscator (conservative)…');
    const obfTmp = path.join(outDir, 'run.obf.tmp.js');
    const obf = spawnSync(
        'npx',
        [
            '--yes', 'javascript-obfuscator',
            runJsOut,
            '--output', obfTmp,
            '--compact', 'true',
            '--control-flow-flattening', 'false',
            '--dead-code-injection', 'false',
            '--string-array', 'true',
            '--string-array-threshold', '0.75',
            '--self-defending', 'false',
            '--identifier-names-generator', 'hexadecimal',
        ],
        { cwd: appRoot, shell: true, encoding: 'utf8' },
    );
    if (obf.status !== 0) {
        console.warn('[build:ship] obfuscator skipped/failed — keeping minified bundle');
        if (obf.stderr) console.warn(obf.stderr.slice(0, 500));
    } else if (fs.existsSync(obfTmp)) {
        fs.copyFileSync(obfTmp, runJsOut);
        fs.copyFileSync(obfTmp, rootRunJs);
        try { fs.unlinkSync(obfTmp); } catch (_) { /* ignore */ }
        console.log('[build:ship] obfuscated runtime written');
    }
}

/* package.json for customer runtime — start = node run.js */
const shipPkgPath = path.join(appRoot, 'scripts', 'me8-ship', 'ph-kr-ship', 'package.ship.json');
const pkg = fs.existsSync(shipPkgPath)
    ? JSON.parse(fs.readFileSync(shipPkgPath, 'utf8'))
    : {
        name: 'ubitron-mobility-axiom',
        private: true,
        main: 'run.js',
        scripts: { start: 'node run.js' },
    };
pkg.main = 'run.js';
pkg.scripts = Object.assign({}, pkg.scripts || {}, { start: 'node run.js' });
/* Sync production deps from root package.json where possible */
try {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
    pkg.dependencies = Object.assign({}, rootPkg.dependencies || {});
    delete pkg.dependencies['node-llama-cpp']; /* optional LLM — ship separately if needed */
} catch (_) { /* keep ship pkg deps */ }
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

/* Separated assets (not inside the JS blob) */
const publicSrc = path.join(appRoot, 'public');
if (fs.existsSync(publicSrc)) {
    console.log('[build:ship] copying public/ assets…');
    copyDirFiltered(publicSrc, path.join(outDir, 'public'), ['node_modules']);
}

const keysSrc = path.join(appRoot, 'keys');
ensureDir(path.join(outDir, 'keys'));
if (fs.existsSync(path.join(keysSrc, 'license-public.pem'))) {
    fs.copyFileSync(
        path.join(keysSrc, 'license-public.pem'),
        path.join(outDir, 'keys', 'license-public.pem'),
    );
} else {
    /* Embed note — public key may come from licenseVerifyKey inside bundle */
    fs.writeFileSync(
        path.join(outDir, 'keys', 'README.txt'),
        'Place license-public.pem here if not embedded in run.js.\nNever place license-private.pem in a customer pack.\n',
    );
}

ensureDir(path.join(outDir, 'storage'));
fs.writeFileSync(
    path.join(outDir, 'storage', 'README.txt'),
    'Customer runtime data. Place signed license.lic and platform-license.json here.\n',
);

/* Pointers for ops — binaries stay OUTSIDE the JS blob */
const ASSETS_NOTE = `# Protected ship runtime layout

\`\`\`
ship-build/protected/
  run.js              ← minified esbuild bundle (licenseManager inside; no lib/*.js)
  package.json        ← start: node run.js ; npm deps listed (external)
  public/             ← static UI (HTML/CSS/JS) — separate from server blob
  keys/               ← public key only
  storage/            ← license.lic + site data (not compiled)
  ASSETS.md           ← this file
\`\`\`

## Separated (not compiled into run.js)

| Asset | Where in full customer zip |
|-------|----------------------------|
| node_modules/ | Next to run.js (npm install / pack copy) |
| public/ | UI static files |
| docker/ ZLM / WVP / LiveKit | Compose + images — separate |
| vendor/ffmpeg, vendor/llm | Separate binaries |
| storage/license.lic | Signed entitlement file |

## Forbidden in customer app dir

- server.js, lib/, tools/generate-license.js private keys
- license-private.pem
- .env with lab secrets (use ship .env template)

## Start

\`\`\`
node run.js
\`\`\`

Or full pack: Start Ubitron.bat → node run.js
`;

fs.writeFileSync(path.join(outDir, 'ASSETS.md'), ASSETS_NOTE);

const runSrc = fs.readFileSync(runJsOut, 'utf8');
const hasLicenseGate = /LICENSE EXPIRED OR INVALID/.test(runSrc);
const hasServerJsLeak = /\.\/lib\/licenseManager/.test(runSrc);
const manifest = {
    builtAt: new Date().toISOString(),
    appRoot: appRoot,
    outDir: outDir,
    runtime: 'run.js',
    bundler: 'esbuild',
    minify: true,
    obfuscate: obfuscate,
    bundleBytes: fs.statSync(runJsOut).size,
    licenseGateStringPresent: hasLicenseGate,
    relativeRequireLicenseManagerAbsent: !hasServerJsLeak,
    layout: {
        runtime: 'run.js',
        assets: ['public/', 'keys/', 'storage/'],
        externalNative: ['node_modules/', 'docker/', 'vendor/'],
        notShipped: ['server.js', 'lib/', 'tools/ private keys'],
    },
};

fs.writeFileSync(path.join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');

if (!hasLicenseGate) {
    console.error('[build:ship] FAIL: LICENSE EXPIRED OR INVALID string missing from bundle');
    process.exit(1);
}

console.log('[build:ship] MANIFEST:', path.join(outDir, 'MANIFEST.json'));
console.log('[build:ship] OK — distribution package staged');
