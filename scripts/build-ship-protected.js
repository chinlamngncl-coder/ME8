#!/usr/bin/env node
'use strict';

/**
 * Master 1-click customer runtime (not trial PH-KR):
 * esbuild → pkg me8-server.exe; PyInstaller FR/ANPR/Weapon engines.
 * Usage: npm run build:ship
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
try { fs.unlinkSync(path.join(appRoot, 'anpr-poller-child.js')); } catch (_) { /* ignore */ }
try { fs.unlinkSync(path.join(appRoot, 'anpr-ingest-service.js')); } catch (_) { /* ignore */ }

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

/* ANPR isolate/ingest — compile to bin/*.exe later; never leave readable .js in the release folder. */
const anprChildTmp = path.join(appRoot, '.ship-anpr-child.tmp.js');
const anprIngestTmp = path.join(appRoot, '.ship-anpr-ingest.tmp.js');
function bundleNodeEntry(entry, tmpOut) {
    if (!fs.existsSync(entry)) return false;
    const cmd = [
        'npx --yes esbuild',
        JSON.stringify(entry),
        '--bundle --platform=node --target=node22 --packages=external',
        '--minify',
        '--legal-comments=none',
        '--outfile=' + JSON.stringify(tmpOut),
        '--log-level=warning',
    ].join(' ');
    execSync(cmd, { stdio: 'inherit', cwd: appRoot, shell: true });
    return fs.existsSync(tmpOut);
}
try {
    const anprChildEntry = path.join(appRoot, 'lib', 'anprLivePollerChild.js');
    if (fs.existsSync(anprChildEntry)) {
        bundleNodeEntry(anprChildEntry, anprChildTmp);
        console.log('[build:ship] anpr poller bundle ready (exe next)');
    }
} catch (_) {
    console.error('[build:ship] FAIL anpr poller bundle');
    process.exit(1);
}
try {
    const anprIngestEntry = path.join(appRoot, 'lib', 'anprIngestServiceMain.js');
    if (fs.existsSync(anprIngestEntry)) {
        bundleNodeEntry(anprIngestEntry, anprIngestTmp);
        console.log('[build:ship] anpr ingest bundle ready (exe next)');
    }
} catch (_) {
    console.error('[build:ship] FAIL anpr ingest bundle');
    process.exit(1);
}

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

/* package.json for customer runtime — start the compiled exe */
const pkg = {
    name: 'ubitron-mobility-axiom',
    private: true,
    main: process.platform === 'win32' ? 'me8-server.exe' : 'me8-server',
    scripts: {},
};
pkg.scripts.start = pkg.main;
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
try { fs.unlinkSync(path.join(outDir, 'keys', 'license-private.pem')); } catch (_) { /* ignore */ }
rmrf(path.join(outDir, 'tools'));

ensureDir(path.join(outDir, 'storage'));
fs.writeFileSync(
    path.join(outDir, 'storage', 'README.txt'),
    'Customer runtime data. Place signed license.lic and platform-license.json here.\n',
);

/* Compiled engines only — do not copy raw .py sidecars into the customer folder. */
const sorterSrc = path.join(appRoot, 'bin', 'Ubitron_Sorter.exe');
if (fs.existsSync(sorterSrc)) {
    ensureDir(path.join(outDir, 'bin'));
    fs.copyFileSync(sorterSrc, path.join(outDir, 'bin', 'Ubitron_Sorter.exe'));
}
/* Redaction is compiled to bin/redaction-engine.exe — never copy raw .py. */

/* Pointers for ops — binaries stay OUTSIDE the JS blob */
const ASSETS_NOTE = `# Master 1-pack runtime (compiled)

\`\`\`
ship-build/protected/
  me8-server.exe      ← pkg of esbuild blob (license gates inside)
  bin/fr-engine.exe
  bin/anpr-engine.exe
  bin/weapon-engine.exe
  bin/redaction-engine.exe
  bin/anpr-poller.exe
  bin/anpr-ingest.exe
  public/             ← UI only
  keys/               ← public key only
  storage/            ← license.lic + platform-license.json
\`\`\`

## Forbidden in customer app dir

- server.js, run.js, lib/, raw FR/ANPR/Weapon/redaction .py
- anpr-poller-child.js, anpr-ingest-service.js
- license-private.pem, tools/

## Start

me8-server.exe
`;

fs.writeFileSync(path.join(outDir, 'ASSETS.md'), ASSETS_NOTE);

const runSrc = fs.readFileSync(runJsOut, 'utf8');
const hasLicenseGate = /LICENSE EXPIRED OR INVALID/.test(runSrc);
const hasServerJsLeak = /\.\/lib\/licenseManager/.test(runSrc);
if (!hasLicenseGate) {
    console.error('[build:ship] FAIL: LICENSE EXPIRED OR INVALID string missing from bundle');
    process.exit(1);
}

const exeName = process.platform === 'win32' ? 'me8-server.exe' : 'me8-server';
const exeOut = path.join(outDir, exeName);
const pkgTarget = process.platform === 'win32' ? 'node18-win-x64' : 'node18-linux-x64';
console.log('[build:ship] pkg', exeName);
const pkgR = spawnSync(process.execPath, [
    path.join(appRoot, 'scripts', 'pkg-ship-run.js'),
    runJsOut,
    exeOut,
    pkgTarget,
], { cwd: appRoot, stdio: 'inherit', windowsHide: true, shell: false });
if (pkgR.status !== 0) {
    console.error('[build:ship] pkg failed');
    process.exit(pkgR.status || 1);
}

if (process.platform === 'win32') {
    console.log('[build:ship] PyInstaller FR/ANPR/Weapon engines…');
    const pyi = spawnSync('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', path.join(appRoot, 'scripts', 'build-ship-pyengines.ps1'),
        '-AppRoot', appRoot,
        '-OutBin', path.join(outDir, 'bin'),
    ], { cwd: appRoot, stdio: 'inherit', windowsHide: true, shell: false });
    if (pyi.status !== 0) {
        console.error('[build:ship] PyInstaller failed — customer 1-pack cannot ship raw .py');
        process.exit(pyi.status || 1);
    }
}

function pkgChildExe(jsFile, exeOut) {
    if (!fs.existsSync(jsFile)) return;
    ensureDir(path.dirname(exeOut));
    const r = spawnSync(process.execPath, [
        path.join(appRoot, 'scripts', 'pkg-ship-run.js'),
        jsFile,
        exeOut,
        pkgTarget,
        path.join(appRoot, 'scripts', 'pkg-ship-child.json'),
    ], { cwd: appRoot, stdio: 'inherit', windowsHide: true, shell: false });
    try { fs.unlinkSync(jsFile); } catch (_) { /* ignore */ }
    if (r.status !== 0 || !fs.existsSync(exeOut)) {
        console.error('[build:ship] FAIL compiled child missing:', exeOut);
        process.exit(r.status || 1);
    }
    console.log('[build:ship] wrote', exeOut);
}

pkgChildExe(anprChildTmp, path.join(outDir, 'bin', process.platform === 'win32' ? 'anpr-poller.exe' : 'anpr-poller'));
pkgChildExe(anprIngestTmp, path.join(outDir, 'bin', process.platform === 'win32' ? 'anpr-ingest.exe' : 'anpr-ingest'));

try { fs.unlinkSync(runJsOut); } catch (_) { /* ignore */ }

function sealProtectedTree(rootDir) {
    const bannedFile = new Set([
        'license-private.pem',
        'generate-license.js',
        'anpr-poller-child.js',
        'anpr-ingest-service.js',
        'server.js',
        'run.js',
    ]);
    const bannedDir = new Set(['tools', 'redaction-track', 'lib']);
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        let names = [];
        try { names = fs.readdirSync(dir); } catch (_) { return; }
        names.forEach(function (name) {
            const p = path.join(dir, name);
            let st;
            try { st = fs.statSync(p); } catch (_) { return; }
            if (st.isDirectory()) {
                if (bannedDir.has(name)) {
                    console.log('[build:ship] seal rm dir', name);
                    rmrf(p);
                    return;
                }
                walk(p);
                return;
            }
            if (bannedFile.has(name) || /\.py$/i.test(name)) {
                console.log('[build:ship] seal rm', name);
                try { fs.unlinkSync(p); } catch (_) { /* ignore */ }
            }
        });
    }
    walk(rootDir);
}
sealProtectedTree(outDir);

const manifest = {
    builtAt: new Date().toISOString(),
    appRoot: appRoot,
    outDir: outDir,
    runtime: exeName,
    bundler: 'esbuild+pkg',
    minify: true,
    obfuscate: obfuscate,
    licenseGateStringPresent: hasLicenseGate,
    relativeRequireLicenseManagerAbsent: !hasServerJsLeak,
    layout: {
        runtime: exeName,
        engines: [
            'bin/fr-engine.exe',
            'bin/anpr-engine.exe',
            'bin/weapon-engine.exe',
            'bin/redaction-engine.exe',
            'bin/anpr-poller.exe',
            'bin/anpr-ingest.exe',
        ],
        assets: ['public/', 'keys/', 'storage/'],
        externalNative: ['node_modules/', 'docker/', 'vendor/'],
        notShipped: ['server.js', 'run.js', 'lib/', 'raw sidecar .py', 'tools/', 'license-private.pem', 'anpr-poller-child.js'],
    },
};

fs.writeFileSync(path.join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log('[build:ship] MANIFEST:', path.join(outDir, 'MANIFEST.json'));
console.log('[build:ship] OK — compiled 1-pack staged (me8-server + engines)');
