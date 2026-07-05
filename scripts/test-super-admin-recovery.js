'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const siteDb = require('../lib/siteDb');
const dashboardAuth = require('../lib/dashboardAuth');
const dashboardTotp = require('../lib/dashboardTotp');

const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-recovery-test-'));
siteDb.init(storage);
dashboardAuth.init(storage);

const created = dashboardAuth.createUser({
    username: 'recovery-admin',
    password: 'RecoveryTest2026!x',
    role: 'super_admin',
});
dashboardAuth.enableUserTotp(
    created.id,
    dashboardTotp.totpAuth.generateSecret(),
    dashboardTotp.totpAuth.generateBackupCodes()
);

const before = dashboardAuth.listSuperAdminsRecoveryStatus();
const row = before.find((r) => r.username === 'recovery-admin');
if (!row || !row.totpEnabled) throw new Error('setup failed');

dashboardAuth.resetSuperAdminTotpByUsername('recovery-admin');
const afterTotp = dashboardAuth.listSuperAdminsRecoveryStatus()
    .find((r) => r.username === 'recovery-admin');
if (afterTotp.totpEnabled) throw new Error('totp not cleared');

dashboardAuth.resetSuperAdminPasswordForRecovery('recovery-admin', 'TempRecovery2026!y');
const login = dashboardAuth.verifyLoginUser('recovery-admin', 'TempRecovery2026!y');
if (!login || !login.mustChangePassword) throw new Error('recovery password / must-change failed');

try { fs.rmSync(storage, { recursive: true, force: true }); } catch (_) { /* ignore */ }
console.log('super-admin-recovery test OK');
