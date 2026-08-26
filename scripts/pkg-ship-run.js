'use strict';

/**
 * Compile esbuild run.js → me8-server.exe via @yao-pkg/pkg (Windows ship).
 * Usage: node scripts/pkg-ship-run.js [run.js] [out.exe]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const runJs = path.resolve(process.argv[2] || path.join(root, 'run.js'));
const outExe = path.resolve(process.argv[3] || path.join(root, 'ship-build', 'protected', process.platform === 'win32' ? 'me8-server.exe' : 'me8-server'));
const target = process.argv[4] || (process.platform === 'win32' ? 'node18-win-x64' : 'node18-linux-x64');
const pkgConfig = process.argv[5] || path.join(root, 'scripts', 'pkg-ship-runjs.json');

if (!fs.existsSync(runJs)) {
    console.error('[pkg-ship] run.js missing:', runJs);
    process.exit(1);
}

function resolvePkgBin() {
    const local = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'pkg.cmd' : 'pkg');
    if (fs.existsSync(local)) return { cmd: local, argsPrefix: [] };
    return { cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', argsPrefix: ['--yes', '@yao-pkg/pkg'] };
}

fs.mkdirSync(path.dirname(outExe), { recursive: true });
const pkg = resolvePkgBin();
const args = pkg.argsPrefix.concat([
    runJs,
    '--targets', target,
    '--output', outExe,
    '--config', pkgConfig,
]);
console.log('[pkg-ship]', pkg.cmd, args.join(' '));
const r = spawnSync(pkg.cmd, args, { cwd: root, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32' });
if (r.status !== 0) {
    console.error('[pkg-ship] pkg failed. Install: npm i -D @yao-pkg/pkg');
    process.exit(r.status || 1);
}
if (!fs.existsSync(outExe)) {
    console.error('[pkg-ship] output missing:', outExe);
    process.exit(1);
}
console.log('[pkg-ship] wrote', outExe, '(' + Math.round(fs.statSync(outExe).size / 1024 / 1024) + ' MB)');
