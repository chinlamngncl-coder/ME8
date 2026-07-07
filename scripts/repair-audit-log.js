#!/usr/bin/env node
/**
 * Repair corrupted mobility.db audit_log table only (evidence index untouched).
 * Usage: node scripts/repair-audit-log.js [storageDir] [importFromDb]
 */
const fs = require('fs');
const path = require('path');
const siteDb = require('../lib/siteDb');

const storageDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'storage'));
const defaultImport = path.join(
    path.dirname(storageDir),
    '..',
    'Lab-8BWC-v2',
    'storage',
    'backups',
    'mobility-2026-06-18T16-31-24-937Z.db'
);
const importFrom = process.argv[3]
    ? path.resolve(process.argv[3])
    : (fs.existsSync(defaultImport) ? defaultImport : null);

if (!fs.existsSync(path.join(storageDir, 'mobility.db'))) {
    console.error('mobility.db not found under', storageDir);
    process.exit(1);
}

siteDb.init(storageDir);
const result = siteDb.repairAuditLog({ importFrom: importFrom });
console.log(JSON.stringify(Object.assign({ storageDir: storageDir, importFrom: importFrom }, result), null, 2));
process.exit(result.ok ? 0 : 1);
