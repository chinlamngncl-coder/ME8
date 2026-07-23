'use strict';

/**
 * DASHBOARD-HTTPS-LAN-V1 — static verify (no live Fleet required).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

const serverJs = read('server.js');
assert.ok(/require\(['"]https['"]\)/.test(serverJs), 'server.js must require https');
assert.ok(/require\(['"].\/lib\/dashboardTls['"]\)/.test(serverJs), 'server.js must use lib/dashboardTls');
assert.ok(/FM_HTTPS_ENABLED/.test(serverJs) || /dashboardTls\.envFlag/.test(serverJs), 'HTTPS enable path present');
assert.ok(/https\.createServer/.test(serverJs), 'https.createServer must exist');
assert.ok(/io\.attach\(httpsServer\)/.test(serverJs), 'Socket.IO must attach to HTTPS server');
assert.ok(/dashboard https listening/.test(serverJs), 'HTTPS listen log present');
assert.ok(/http\.createServer\(app\)/.test(serverJs), 'HTTP fallback must remain');

assert.ok(fs.existsSync(path.join(root, 'lib', 'dashboardTls.js')), 'lib/dashboardTls.js');
assert.ok(fs.existsSync(path.join(root, 'scripts', 'ensure-lab-dashboard-tls-certs.js')), 'ensure script');

const gitignore = read('.gitignore');
assert.ok(/certs\/lab-dashboard\//.test(gitignore), '.gitignore must ignore lab-dashboard certs');

const envEx = read('.env.example');
assert.ok(/FM_HTTPS_ENABLED/.test(envEx), '.env.example documents FM_HTTPS_ENABLED');
assert.ok(/FM_HTTPS_PORT/.test(envEx), '.env.example documents FM_HTTPS_PORT');

const me8Ex = read('.env.me8.example');
assert.ok(/FM_HTTPS_ENABLED/.test(me8Ex), '.env.me8.example documents FM_HTTPS_ENABLED');

const tls = require('../lib/dashboardTls');
const prevHttps = process.env.FM_HTTPS_ENABLED;
delete process.env.FM_HTTPS_ENABLED;
const off = tls.resolveFromEnv({ httpPort: 3988, baseDir: root });
assert.strictEqual(off.enabled, false, 'default resolve is disabled without env');
if (prevHttps != null) process.env.FM_HTTPS_ENABLED = prevHttps;

console.log('[ok] verify-dashboard-https-lan');
