'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const runJsPath = path.join(root, 'run.js');
assert.ok(fs.existsSync(runJsPath), 'run.js must exist at repo root for ship parity');

const source = fs.readFileSync(runJsPath, 'utf8');

assert.doesNotMatch(source, /process kept alive/, 'ship run.js must exit on fatal errors');
assert.doesNotMatch(source, /var _loginAttempts\s*=/, 'ship run.js must not use unbounded login Map');
assert.doesNotMatch(
    source,
    /['"]call-id['"]\s*:\s*(?:['"]conf-['"]\s*\+\s*)?Math\.random/,
    'ship run.js must not generate SIP Call-ID with Math.random',
);

assert.match(source, /installFatalProcessPolicy/, 'ship run.js must include fatal exit policy');
assert.match(source, /exiting for supervisor restart/, 'ship run.js must log fatal exit reason');
assert.match(source, /createLoginRateLimiter/, 'ship run.js must include login LRU limiter');
assert.match(source, /maxEntries:\s*5e3|maxEntries:\s*5000/, 'ship run.js must cap login limiter entries');
assert.match(source, /createSipCallId/, 'ship run.js must include SIP crypto Call-ID helpers');
assert.match(source, /sos_acknowledged/, 'ship run.js must end SOS group call on ACK');

execFileSync(process.execPath, ['--check', runJsPath], { stdio: 'pipe' });

console.log('Ship run.js security parity verification passed.');
