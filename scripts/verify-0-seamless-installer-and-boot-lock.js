'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

assert.ok(fs.existsSync(path.join(root, 'bin', 'me8-server.js')), 'entry');
assert.ok(fs.existsSync(path.join(root, 'public', 'setup-boot.html')), 'setup ui');
assert.ok(fs.existsSync(path.join(root, 'scripts', 'build-1pack.js')), 'build script');
assert.ok(fs.existsSync(path.join(root, 'scripts', 'pkg-1pack.json')), 'pkg config');

const cli = require(path.join(root, 'lib', 'seamlessCli'));
assert.deepStrictEqual(cli.parseArgv(['--reset-license']).resetLicense, true);
assert.deepStrictEqual(cli.parseArgv(['--safe-mode']).safeMode, true);

const gate = require(path.join(root, 'lib', 'localhostHttpGate'));
assert.ok(typeof gate.localhostHttpGate === 'function');
assert.ok(gate.remoteIsLocalhost({
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:13988' },
}));
assert.ok(!gate.remoteIsLocalhost({
    socket: { remoteAddress: '203.0.113.10' },
    headers: { host: 'example.com' },
}));

const hooks = require(path.join(root, 'lib', 'processGroupHooks'));
assert.ok(typeof hooks.installOrphanHooks === 'function');
assert.ok(typeof hooks.trackChild === 'function');

const setup = require(path.join(root, 'lib', 'setupOnlyServer'));
assert.strictEqual(setup.setupPort(), 13988);
assert.ok(typeof setup.clearActiveLicenses === 'function');
assert.ok(typeof setup.startSetupOnlyServer === 'function');

const pkgJson = JSON.parse(read('package.json'));
assert.ok(pkgJson.scripts['build:1pack']);
assert.ok(pkgJson.scripts['start:1pack']);

const serverJs = read('server.js');
assert.ok(serverJs.includes('localhostHttpGate'), 'server wires HTTP gate');
assert.ok(serverJs.includes('processGroupHooks'), 'server wires orphan hooks');

const envEx = read('.env.example');
assert.ok(envEx.includes('SETUP_PORT'), 'SETUP_PORT documented');

const me8 = read('bin/me8-server.js');
assert.ok(me8.includes('--reset-license'));
assert.ok(me8.includes('FM_SEAMLESS_BOOT_LOCK'));
assert.ok(me8.includes('lockEnvFile'));
assert.ok(me8.includes('applyFirewallIngress'));
assert.ok(me8.includes('process.stdout.isTTY'));
assert.ok(me8.includes('Enter a new Setup Port'));
assert.ok(me8.includes('SETUP_PORT='));
assert.ok(me8.includes('startSetupWithPortFallback'));

console.log('[ok] verify-0-seamless-installer-and-boot-lock');
