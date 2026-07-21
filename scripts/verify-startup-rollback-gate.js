'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const preflight = path.join(__dirname, 'startup-preflight.js');
const platformHealth = require('../lib/platformHealth');

function runPreflight(storageRoot) {
    const run = childProcess.spawnSync(process.execPath, [
        preflight,
        '--app-root', root,
        '--storage-root', storageRoot,
        '--json',
    ], { cwd: root, encoding: 'utf8', windowsHide: true });
    return {
        status: run.status,
        report: JSON.parse(run.stdout),
        stderr: run.stderr,
    };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-rollback-verify-'));
try {
    const cleanStorage = path.join(tempRoot, 'clean-storage');
    const clean = runPreflight(cleanStorage);
    assert.strictEqual(clean.status, 0, clean.stderr || clean.report.error);
    assert.strictEqual(clean.report.ok, true, 'clean installation preflight must pass');
    assert.ok(clean.report.checks.some((check) => check.name === 'database-migration-probe' && check.ok));
    assert.ok(clean.report.checks.some((check) => check.name === 'postgres-connectivity' && check.ok));
    assert.ok(clean.report.checks.some((check) => check.name === 'isolated-sip-ready' && check.ok));

    const badStorage = path.join(tempRoot, 'bad-storage');
    fs.mkdirSync(badStorage, { recursive: true });
    fs.writeFileSync(path.join(badStorage, 'server-settings.json'), '{broken-json', 'utf8');
    const rejected = runPreflight(badStorage);
    assert.notStrictEqual(rejected.status, 0, 'invalid candidate configuration must be blocked');
    assert.strictEqual(rejected.report.ok, false);
    assert.match(rejected.report.error, /JSON|Unexpected/i);

    const transactionSource = fs.readFileSync(
        path.join(__dirname, 'me8-ship', 'Invoke-UbitronServiceUpgrade.ps1'),
        'utf8',
    );
    const stopAt = transactionSource.indexOf('Stop-UbitronService');
    const backupAt = transactionSource.indexOf('New-PostgresSnapshot', stopAt);
    const cutoverAt = transactionSource.indexOf("Set-NssmValue 'AppDirectory' $CandidateRoot", backupAt);
    const healthAt = transactionSource.indexOf('Wait-StableHealth -Root $CandidateRoot', cutoverAt);
    const restoreAt = transactionSource.indexOf('Restore-PostgresSnapshot', healthAt);
    assert.ok(stopAt >= 0 && backupAt > stopAt && cutoverAt > backupAt && healthAt > cutoverAt && restoreAt > healthAt,
        'transaction must stop, snapshot, cut over, verify, then retain an automatic rollback path');
    assert.match(transactionSource, /InjectFailurePhase/,
        'transaction must retain deterministic failure injection for field acceptance testing');
    assert.match(transactionSource, /restart\/5000\/restart\/15000\/none\/0/,
        'service recovery must be bounded instead of an unlimited restart loop');

    const healthy = platformHealth.evaluatePublicHealth({
        sipListenerReady: true,
        httpListenerReady: true,
        mediaBridgeReady: true,
        pttEnabled: true,
        databaseReady: true,
        storageWritable: true,
        adminServiceStatusSnapshot() { return { pttPortStatus: true }; },
    });
    assert.strictEqual(healthy.ok, true);
    const badDatabase = platformHealth.evaluatePublicHealth({
        sipListenerReady: true,
        httpListenerReady: true,
        mediaBridgeReady: true,
        pttEnabled: false,
        databaseReady: false,
        storageWritable: true,
        adminServiceStatusSnapshot() { return {}; },
    });
    assert.deepStrictEqual(badDatabase.reasons, ['database']);

    console.log('Startup preflight and rollback gate verification passed.');
} finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
}
