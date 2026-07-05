#!/usr/bin/env node
/**
 * Super admin break-glass recovery — ship desk / partner only (mob-me8-super-admin-recovery).
 * Clears TOTP and/or sets a temporary password so the admin can sign in and re-enroll.
 */
'use strict';

const path = require('path');
const fs = require('fs');

const appRoot = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(appRoot, '.env') });

const siteDb = require('../../lib/siteDb');
const dashboardAuth = require('../../lib/dashboardAuth');
const auditLog = require('../../lib/auditLog');

const storageDir = path.join(appRoot, 'storage');

function usage() {
    console.log(`ME8 super admin recovery (ship desk only)

Usage:
  node scripts/me8-ship/super-admin-recovery.js --list
  node scripts/me8-ship/super-admin-recovery.js --username global --reset-totp
  node scripts/me8-ship/super-admin-recovery.js --username global --reset-password --temp-password "TempPass2026!x"
  node scripts/me8-ship/super-admin-recovery.js --username global --reset-all --temp-password "TempPass2026!x"

Options:
  --list              List super admins (TOTP status only — no secrets)
  --username <name>   Target super admin username
  --reset-totp        Clear authenticator — user re-enrolls at next login
  --reset-password    Set temporary password (must change on next login)
  --reset-all         Both TOTP clear + temporary password
  --temp-password <p> Required with --reset-password or --reset-all
  --actor <name>      Audit label (default: ship-desk)
  --yes               Skip confirmation prompt (automation only)
`);
}

function parseArgs(argv) {
    const out = {
        list: false,
        username: '',
        resetTotp: false,
        resetPassword: false,
        tempPassword: '',
        actor: 'ship-desk',
        yes: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--list') out.list = true;
        else if (a === '--reset-totp') out.resetTotp = true;
        else if (a === '--reset-password') out.resetPassword = true;
        else if (a === '--reset-all') { out.resetTotp = true; out.resetPassword = true; }
        else if (a === '--yes') out.yes = true;
        else if (a === '--username' && argv[i + 1]) out.username = String(argv[++i]).trim();
        else if (a === '--temp-password' && argv[i + 1]) out.tempPassword = String(argv[++i]);
        else if (a === '--actor' && argv[i + 1]) out.actor = String(argv[++i]).trim();
        else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
        else {
            console.error('Unknown argument:', a);
            usage();
            process.exit(1);
        }
    }
    return out;
}

function confirm(message) {
    return new Promise(function (resolve) {
        process.stdout.write(message + ' Type YES to continue: ');
        let buf = '';
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', function (chunk) {
            buf += chunk;
            resolve(String(buf).trim().toUpperCase() === 'YES');
        });
    });
}

async function main() {
    const args = parseArgs(process.argv);
    if (!fs.existsSync(path.join(appRoot, 'server.js'))) {
        console.error('Not an ME8 app root:', appRoot);
        process.exit(1);
    }
    siteDb.init(storageDir);
    dashboardAuth.init(storageDir);

    if (args.list) {
        const rows = dashboardAuth.listSuperAdminsRecoveryStatus();
        if (!rows.length) {
            console.log('No active super admin accounts found.');
            process.exit(0);
        }
        console.log('Super admin accounts:');
        rows.forEach(function (r) {
            console.log('  -', r.username,
                '| totp:', r.totpEnabled ? 'on' : 'off',
                '| backup codes left:', r.backupCodesRemaining,
                '| must change password:', r.mustChangePassword ? 'yes' : 'no');
        });
        process.exit(0);
    }

    if (!args.username) {
        usage();
        process.exit(1);
    }
    if (!args.resetTotp && !args.resetPassword) {
        console.error('Specify --reset-totp, --reset-password, or --reset-all');
        process.exit(1);
    }
    if (args.resetPassword && !args.tempPassword) {
        console.error('--temp-password is required for password reset');
        process.exit(1);
    }

    if (!args.yes) {
        const actions = [];
        if (args.resetTotp) actions.push('clear authenticator');
        if (args.resetPassword) actions.push('set temporary password');
        const ok = await confirm(
            'Break-glass recovery for "' + args.username + '" will ' + actions.join(' and ') + '.'
        );
        if (!ok) {
            console.log('Cancelled.');
            process.exit(1);
        }
    }

    let totpOut = null;
    let pwdOut = null;

    if (args.resetTotp) {
        totpOut = dashboardAuth.resetSuperAdminTotpByUsername(args.username);
        auditLog.record('user.totp_reset', {
            actor: args.actor,
            target: totpOut.username,
            detail: { via: 'ship_recovery_cli' },
        });
        console.log('TOTP cleared for', totpOut.username, '— re-enroll at next login.');
    }
    if (args.resetPassword) {
        pwdOut = dashboardAuth.resetSuperAdminPasswordForRecovery(args.username, args.tempPassword);
        auditLog.record('user.password_recovery', {
            actor: args.actor,
            target: pwdOut.username,
            detail: { via: 'ship_recovery_cli', mustChangePassword: true },
        });
        console.log('Temporary password set for', pwdOut.username, '— must change on next login.');
        console.log('Give the temp password to the admin once (phone/handoff), then discard your copy.');
    }

    console.log('RECOVERY OK — restart not required. Admin can sign in now.');
    process.exit(0);
}

main().catch(function (err) {
    console.error('RECOVERY FAIL:', err.message || err);
    process.exit(1);
});
