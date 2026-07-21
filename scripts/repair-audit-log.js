#!/usr/bin/env node
/**
 * OFFLINE legacy SQLite audit inspection only. The service must be stopped.
 * PostgreSQL runtime repair is intentionally not performed here.
 * Usage: node scripts/repair-audit-log.js [storageDir] [importFromDb]
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

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

let db;
let result;
try {
    db = new DatabaseSync(path.join(storageDir, 'mobility.db'), { readOnly: true });
    const row = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get();
    result = {
        ok: true,
        offline: true,
        readable: true,
        count: Number(row && row.n || 0),
        action: 'No repair needed. Use migrate-sqlite-catalog-to-postgres.js for catalog salvage.',
    };
} catch (err) {
    result = {
        ok: false,
        offline: true,
        readable: false,
        error: err && err.message ? err.message : String(err),
        action: 'Run the verified SQLite-to-PostgreSQL salvage migrator; do not start runtime SQLite.',
    };
} finally {
    if (db) db.close();
}
console.log(JSON.stringify(Object.assign({ storageDir: storageDir, importFrom: importFrom }, result), null, 2));
process.exit(result.ok ? 0 : 1);
