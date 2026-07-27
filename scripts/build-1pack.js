'use strict';

/**
 * Cross-platform 1-Pack bundler (pkg).
 * Outputs:
 *   dist/windows-x64/me8-server.exe  (+ plugins/)
 *   dist/linux-x64/me8-server        (+ plugins/)
 *
 * Native C++ / plugins: ship beside the binary in ./plugins (not packed into the exe).
 * Requires: npm i -D @yao-pkg/pkg   (or npx @yao-pkg/pkg)
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
        '  ./me8-server            Full boot when license valid; else Setup UI',
        '  ./me8-server --safe-mode',
        '  ./me8-server --reset-license',
        '',
        'Place 3rd-party C++ AI binaries in ./plugins/ (loaded externally — not inside the exe).',
        'Keep .env beside the executable. SETUP_PORT default 3988 (localhost only).',
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
    const pkg = resolvePkgBin();
    const entry = path.join(root, 'bin', 'me8-server.js');
    const output = path.join(outDir, outName);
    const args = pkg.argsPrefix.concat([
        entry,
        '--targets', nodeTarget,
        '--output', output,
        /* assets for setup UI + TLS helper scripts */
        '--config', path.join(root, 'scripts', 'pkg-1pack.json'),
    ]);
    console.log('[build-1pack]', pkg.cmd, args.join(' '));
    const r = spawnSync(pkg.cmd, args, { cwd: root, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32' });
    if (r.status !== 0) {
        throw new Error('pkg failed for ' + nodeTarget + ' (status ' + r.status + '). Install: npm i -D @yao-pkg/pkg');
    }
}

function main() {
    ensureDir(distRoot);
    const only = process.argv.includes('--linux')
        ? 'linux'
        : (process.argv.includes('--windows') ? 'windows' : 'all');

    /* Prefer current Node LTS line for pkg targets */
    if (only === 'all' || only === 'windows') {
        buildTarget('node18-win-x64', path.join(distRoot, 'windows-x64'), 'me8-server.exe');
    }
    if (only === 'all' || only === 'linux') {
        buildTarget('node18-linux-x64', path.join(distRoot, 'linux-x64'), 'me8-server');
    }
    console.log('[build-1pack] Done. Artifacts under dist/');
}

main();
