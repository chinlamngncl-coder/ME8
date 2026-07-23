'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    isBrokenOutputPipe,
    installFatalProcessPolicy,
} = require('../lib/fatalProcessPolicy');

function createFakeProcess() {
    const fake = new EventEmitter();
    fake.exitCode = 0;
    fake.exitCalls = [];
    fake.stderrLines = [];
    fake.stderr = {
        write: (line) => fake.stderrLines.push(String(line)),
    };
    fake.exit = (code) => fake.exitCalls.push(code);
    return fake;
}

const logs = [];
const timers = [];
const fake = createFakeProcess();
const policy = installFatalProcessPolicy({
    processObject: fake,
    log: { web: { err: (message, detail) => logs.push({ message, detail }) } },
    schedule: (fn, delay) => {
        timers.push({ fn, delay, unrefCalled: false });
        return {
            unref() {
                timers[timers.length - 1].unrefCalled = true;
            },
        };
    },
    exitDelayMs: 10,
});

fake.emit('uncaughtException', new Error('fatal unit probe'));
assert.strictEqual(policy.isExiting(), true);
assert.strictEqual(fake.exitCode, 1);
assert.strictEqual(logs.length, 1);
assert.match(logs[0].message, /exiting for supervisor restart/);
assert.strictEqual(timers.length, 1);
assert.strictEqual(timers[0].delay, 10);
assert.strictEqual(timers[0].unrefCalled, true);
timers[0].fn();
assert.deepStrictEqual(fake.exitCalls, [1]);

fake.emit('unhandledRejection', new Error('duplicate fatal probe'));
assert.strictEqual(logs.length, 1, 'a second fatal event must not schedule another exit');
assert.strictEqual(timers.length, 1);

const epipe = Object.assign(new Error('broken output'), { code: 'EPIPE', syscall: 'write' });
assert.strictEqual(isBrokenOutputPipe(epipe), true);
const epipeProcess = createFakeProcess();
const epipeTimers = [];
installFatalProcessPolicy({
    processObject: epipeProcess,
    log: { web: { err: () => assert.fail('EPIPE must not recurse through logging') } },
    schedule: (fn) => epipeTimers.push(fn),
});
epipeProcess.emit('uncaughtException', epipe);
assert.strictEqual(epipeProcess.exitCode, 0);
assert.strictEqual(epipeTimers.length, 0);

function runFatalChild(trigger) {
    const root = path.resolve(__dirname, '..');
    const script = [
        "const policy = require('./lib/fatalProcessPolicy');",
        "policy.installFatalProcessPolicy({ log: { web: { err: (message) => process.stderr.write(message + '\\n') } } });",
        "setInterval(() => {}, 1000);",
        trigger,
    ].join(' ');
    return spawnSync(process.execPath, ['-e', script], {
        cwd: root,
        encoding: 'utf8',
        timeout: 5000,
    });
}

const uncaughtChild = runFatalChild("setImmediate(() => { throw new Error('uncaught child probe'); });");
assert.strictEqual(uncaughtChild.status, 1);
assert.match(uncaughtChild.stderr, /uncaughtException — exiting for supervisor restart/);

const rejectionChild = runFatalChild("Promise.reject(new Error('rejection child probe'));");
assert.strictEqual(rejectionChild.status, 1);
assert.match(rejectionChild.stderr, /unhandledRejection — exiting for supervisor restart/);

for (const relativePath of [
    'scripts/me8-ship/Install-UbitronC2-Service.ps1',
    'scripts/me8-ship/Invoke-UbitronServiceUpgrade.ps1',
]) {
    const content = require('fs').readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
    assert.match(content, /sc\.exe failure \$ServiceName reset= 86400 actions= restart\/5000\/restart\/15000\/none\/0/);
    assert.match(content, /sc\.exe failureflag \$ServiceName 1/);
}

console.log('Fatal process policy verification passed.');
