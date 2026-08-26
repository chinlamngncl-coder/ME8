'use strict';

/**
 * Master 1-Pack: compiled me8-server + AI engine exes.
 * Not a trial zip. License.lic / platform-license.json sit beside the exe.
 *
 *   dist/windows-x64/me8-server.exe
 *   dist/windows-x64/bin/fr-engine.exe (etc)
 *
 * Usage: npm run build:1pack
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const distRoot = path.join(root, 'dist');

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function writeReadme(dir, platform) {
    const text = [
        'ME8 1-Pack (' + platform + ')',
        '',
        '  ./me8-server.exe        Compiled server. Place signed license.lic in ./storage/',
        '  ./bin/fr-engine.exe     Face engine (always present; analytics routes still licensed)',
        '  ./bin/anpr-engine.exe',
        '  ./bin/weapon-engine.exe',
        '',
        'Keep .env beside the executable. Do not ship server.js, run.js, lib/, or raw .py.',
        '',
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'README-1PACK.txt'), text);
}

function copyPluginsStub(dir) {
    const plugins = path.join(dir, 'plugins');
    ensureDir(plugins);
    if (!fs.existsSync(path.join(plugins, '.gitkeep'))) {
        fs.writeFileSync(path.join(plugins, '.gitkeep'), '');
    }
    fs.writeFileSync(
        path.join(plugins, 'README.txt'),
        'Drop external C++ AI / native plugin binaries here. The 1-Pack executable does not embed them.\n'
    );
}

function resolvePkgBin() {
    const local = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'pkg.cmd' : 'pkg');
    if (fs.existsSync(local)) return { cmd: local, argsPrefix: [] };
    return { cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', argsPrefix: ['--yes', '@yao-pkg/pkg'] };
}

function buildTarget(nodeTarget, outDir, outName) {
    ensureDir(outDir);
    copyPluginsStub(outDir);
    writeReadme(outDir, path.basename(outDir));
    const runJs = path.join(root, 'run.js');
    if (!fs.existsSync(runJs)) {
        throw new Error('run.js missing — build-ship-runtime must run first');
    }
    const output = path.join(outDir, outName);
    const r = spawnSync(process.execPath, [
        path.join(root, 'scripts', 'pkg-ship-run.js'),
        runJs,
        output,
        nodeTarget,
    ], { cwd: root, stdio: 'inherit', windowsHide: true, shell: false });
    if (r.status !== 0) {
        throw new Error('pkg failed for ' + nodeTarget + ' (status ' + r.status + '). Install: npm i -D @yao-pkg/pkg');
    }
}

function main() {
    ensureDir(distRoot);
    console.log('[build-1pack] esbuild run.js (license code inside blob)…');
    const bundle = spawnSync(process.execPath, [
        path.join(root, 'scripts', 'build-ship-runtime.js'),
        root,
        path.join(root, 'run.js'),
        '--minify',
    ], { cwd: root, stdio: 'inherit', windowsHide: true, shell: false });
    if (bundle.status !== 0) {
        throw new Error('build-ship-runtime failed');
    }

    const only = process.argv.includes('--linux')
        ? 'linux'
        : (process.argv.includes('--windows') ? 'windows' : 'all');

    if (only === 'all' || only === 'windows') {
        buildTarget('node18-win-x64', path.join(distRoot, 'windows-x64'), 'me8-server.exe');
        if (process.platform === 'win32') {
            const engineBin = path.join(distRoot, 'windows-x64', 'bin');
            console.log('[build-1pack] PyInstaller engines…');
            const pyi = spawnSync('powershell', [
                '-NoProfile', '-ExecutionPolicy', 'Bypass',
                '-File', path.join(root, 'scripts', 'build-ship-pyengines.ps1'),
                '-AppRoot', root,
                '-OutBin', engineBin,
            ], { cwd: root, stdio: 'inherit', windowsHide: true, shell: false });
            if (pyi.status !== 0) {
                throw new Error('PyInstaller failed — 1-pack cannot ship raw Python');
            }
        }
    }
    if (only === 'all' || only === 'linux') {
        buildTarget('node18-linux-x64', path.join(distRoot, 'linux-x64'), 'me8-server');
    }
    console.log('[build-1pack] Done. Customer runs dist/windows-x64/me8-server.exe with license.lic in storage/');
}

main();
