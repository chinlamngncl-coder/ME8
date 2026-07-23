'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function readPackage(packageName) {
    return JSON.parse(fs.readFileSync(require.resolve(packageName + '/package.json'), 'utf8'));
}

function versionAtLeast(actual, minimum) {
    const current = String(actual).split('.').map(Number);
    const floor = String(minimum).split('.').map(Number);
    for (let i = 0; i < Math.max(current.length, floor.length); i++) {
        const left = current[i] || 0;
        const right = floor[i] || 0;
        if (left !== right) return left > right;
    }
    return true;
}

const minimumVersions = {
    'body-parser': '1.20.6',
    'brace-expansion': '1.1.16',
    tar: '7.5.20',
};

for (const [packageName, minimum] of Object.entries(minimumVersions)) {
    const installed = readPackage(packageName);
    assert(
        versionAtLeast(installed.version, minimum),
        `${packageName} ${installed.version} is below security floor ${minimum}`,
    );
}

const ftpPackagePath = require.resolve('ftp-srv/package.json');
const ftpRequire = createRequire(ftpPackagePath);
const ftpIp = ftpRequire('ip');
const ftpIpEntry = ftpRequire.resolve('ip');
const ftpIpPackagePath = path.resolve(ftpIpEntry, '..', '..', '..', 'package.json');
const ftpIpPackage = JSON.parse(fs.readFileSync(ftpIpPackagePath, 'utf8'));

assert.strictEqual(
    ftpIpPackage.name,
    '@webpod/ip',
    'ftp-srv must resolve ip to the maintained @webpod/ip replacement',
);
assert.strictEqual(typeof ftpIp.isEqual, 'function');
assert.strictEqual(ftpIp.isEqual('192.168.1.8', '192.168.1.8'), true);
assert.strictEqual(ftpIp.isEqual('::ffff:192.168.1.8', '192.168.1.8'), true);
assert.strictEqual(ftpIp.isEqual('192.168.1.8', '192.168.1.9'), false);

const FtpSrv = require('ftp-srv');
assert.strictEqual(typeof FtpSrv, 'function', 'ftp-srv must remain loadable');

console.log('Production dependency security verification passed.');
