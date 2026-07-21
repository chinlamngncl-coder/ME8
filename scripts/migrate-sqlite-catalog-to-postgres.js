#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { Client, types } = require('pg');

types.setTypeParser(20, (value) => {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value;
});

const ROOT = path.join(__dirname, '..');
const ACTIVE_TABLES = [
    'site_settings',
    'bwc_devices',
    'evidence_files',
    'case_files',
    'operations',
    'audit_log',
    'bwc_messages',
    'gps_track_points',
    'evidence_meta',
    'evidence_attachments',
    'evidence_exports',
    'evidence_downloads',
    'evidence_secure_exports',
    'case_file_evidence',
    'overlay_pins',
];
const TABLE_ORDER = {
    site_settings: ['key'],
    bwc_devices: ['device_id'],
    evidence_files: ['id'],
    case_files: ['id'],
    operations: ['id'],
    audit_log: ['id'],
    bwc_messages: ['id'],
    gps_track_points: ['id'],
    evidence_meta: ['evidence_file_id'],
    evidence_attachments: ['id'],
    evidence_exports: ['export_id'],
    evidence_downloads: ['download_id'],
    evidence_secure_exports: ['request_id'],
    case_file_evidence: ['case_file_id', 'evidence_file_id'],
    overlay_pins: ['id'],
};
const AUTO_ID_TABLES = ['audit_log', 'bwc_messages', 'gps_track_points'];

function arg(name, fallback) {
    const index = process.argv.indexOf(name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function has(name) {
    return process.argv.includes(name);
}

function sha256File(filePath) {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024 * 1024);
    try {
        let bytes;
        do {
            bytes = fs.readSync(fd, buffer, 0, buffer.length, null);
            if (bytes) hash.update(buffer.subarray(0, bytes));
        } while (bytes);
    } finally {
        fs.closeSync(fd);
    }
    return hash.digest('hex');
}

function serviceIsStopped() {
    if (process.platform !== 'win32') return true;
    const result = childProcess.spawnSync('sc.exe', ['query', 'UbitronC2'], {
        encoding: 'utf8',
        windowsHide: true,
    });
    if (result.status !== 0) return true;
    return /STATE\s*:\s*\d+\s+STOPPED/i.test(result.stdout);
}

function snapshotSource(source, outputRoot) {
    const migrationId = new Date().toISOString().replace(/[:.]/g, '-')
        + '-' + crypto.randomBytes(4).toString('hex');
    const runDir = path.join(outputRoot, migrationId);
    const sourceDir = path.join(runDir, 'sqlite-source');
    fs.mkdirSync(sourceDir, { recursive: true });
    const copied = {};
    [
        ['db', source],
        ['wal', source + '-wal'],
        ['shm', source + '-shm'],
    ].forEach(([key, sourcePath]) => {
        if (!fs.existsSync(sourcePath)) return;
        const destination = path.join(sourceDir, path.basename(sourcePath));
        fs.copyFileSync(sourcePath, destination, fs.constants.COPYFILE_EXCL);
        copied[key] = {
            path: destination,
            bytes: fs.statSync(destination).size,
            sha256: sha256File(destination),
        };
    });
    if (!copied.db) throw new Error('SQLite source database is missing');
    return { migrationId, runDir, copied };
}

function tableInfo(sqlite, table) {
    return sqlite.prepare('PRAGMA table_info("' + table.replace(/"/g, '""') + '")').all();
}

function canonicalValue(value, declaredType) {
    if (value == null) return 'N';
    if (Buffer.isBuffer(value)) return 'B' + value.length + ':' + value.toString('hex');
    const type = String(declaredType || '').toUpperCase();
    if (/INT/.test(type)) return 'I:' + String(value);
    if (/REAL|FLOA|DOUB|NUMERIC|DECIMAL/.test(type)) {
        return 'F:' + Number(value).toPrecision(17);
    }
    const text = String(value);
    return 'S' + Buffer.byteLength(text, 'utf8') + ':' + text;
}

function canonicalHash(rows, columns) {
    const hash = crypto.createHash('sha256');
    rows.forEach((row) => {
        columns.forEach((column) => {
            hash.update(column.name);
            hash.update('=');
            hash.update(canonicalValue(row[column.name], column.type));
            hash.update('\n');
        });
        hash.update('--\n');
    });
    return hash.digest('hex');
}

function auditSemanticHash(row) {
    const hash = crypto.createHash('sha256');
    ['ts', 'actor', 'role', 'action', 'target', 'detail_json', 'client_ip'].forEach((key) => {
        hash.update(key + '=' + canonicalValue(row[key], 'TEXT') + '\n');
    });
    return hash.digest('hex');
}

function readActiveTable(sqlite, table) {
    const order = TABLE_ORDER[table].map((column) => '"' + column + '"').join(', ');
    const rows = sqlite.prepare('SELECT * FROM "' + table + '" ORDER BY ' + order).all();
    return {
        columns: tableInfo(sqlite, table),
        rows,
    };
}

function maxAuditBadId(sqlite) {
    try {
        const row = sqlite.prepare(
            "SELECT seq FROM sqlite_sequence WHERE name = 'audit_log_bad'",
        ).get();
        if (row && Number.isInteger(Number(row.seq))) return Number(row.seq);
    } catch (_) { /* fall through */ }
    return 100000;
}

function salvageAuditBad(sqlite, activeRows) {
    const existing = new Set(activeRows.map(auditSemanticHash));
    const recovered = [];
    const duplicates = [];
    const unreadableIds = [];
    const maxId = maxAuditBadId(sqlite);
    let emptyTail = 0;
    for (let id = 1; id <= maxId; id += 1) {
        try {
            const row = sqlite.prepare('SELECT * FROM audit_log_bad WHERE id = ?').get(id);
            if (!row) {
                emptyTail += 1;
                if (maxId === 100000 && emptyTail >= 2000) break;
                continue;
            }
            emptyTail = 0;
            const semantic = auditSemanticHash(row);
            if (existing.has(semantic)) {
                duplicates.push(id);
                continue;
            }
            existing.add(semantic);
            recovered.push(row);
        } catch (_) {
            unreadableIds.push(id);
        }
    }
    return { recovered, duplicates, unreadableIds, maxId };
}

async function targetIsEmpty(client) {
    for (const table of ACTIVE_TABLES) {
        const result = await client.query('SELECT COUNT(*)::BIGINT AS n FROM "' + table + '"');
        if (Number(result.rows[0].n) > 0) return false;
    }
    return true;
}

async function insertRows(client, table, columns, rows, provenance) {
    if (!rows.length) return;
    const names = columns.map((column) => column.name);
    for (const row of rows) {
        const insertNames = names.slice();
        const values = names.map((name) => row[name] === undefined ? null : row[name]);
        if (table === 'audit_log' && provenance) {
            insertNames.push('migration_source', 'migration_source_id');
            values.push(provenance, row.id);
            if (provenance === 'audit_log_bad') {
                const idIndex = insertNames.indexOf('id');
                insertNames.splice(idIndex, 1);
                values.splice(idIndex, 1);
            }
        }
        const placeholders = values.map((_, index) => '$' + (index + 1));
        await client.query(
            'INSERT INTO "' + table + '" ('
                + insertNames.map((name) => '"' + name + '"').join(', ')
                + ') VALUES (' + placeholders.join(', ') + ')',
            values,
        );
    }
}

async function readTargetRows(client, table, columns, provenance) {
    const names = columns.map((column) => '"' + column.name + '"').join(', ');
    const order = TABLE_ORDER[table].map((column) => '"' + column + '"').join(', ');
    const where = table === 'audit_log' && provenance
        ? ' WHERE migration_source = $1'
        : '';
    const result = await client.query(
        'SELECT ' + names + ' FROM "' + table + '"' + where + ' ORDER BY ' + order,
        where ? [provenance] : [],
    );
    return result.rows;
}

async function setSequences(client) {
    for (const table of AUTO_ID_TABLES) {
        await client.query(
            "SELECT setval(pg_get_serial_sequence($1, 'id'), "
                + "COALESCE((SELECT MAX(id) FROM \"" + table + "\"), 1), "
                + "EXISTS(SELECT 1 FROM \"" + table + "\"))",
            [table],
        );
    }
}

async function main() {
    const source = path.resolve(arg('--source', path.join(ROOT, 'storage', 'mobility.db')));
    const outputRoot = path.resolve(arg(
        '--output',
        path.join(ROOT, 'storage', 'catalog-migrations'),
    ));
    const connectionString = arg('--postgres-url', process.env.FM_CATALOG_DB_URL || '');
    const allowRunning = has('--allow-running-source');
    const acceptUnreadableAudit = has('--accept-unreadable-audit-archive');
    if (!connectionString) throw new Error('FM_CATALOG_DB_URL or --postgres-url is required');
    if (!allowRunning && !serviceIsStopped()) {
        throw new Error('UbitronC2 must be stopped before the SQLite source snapshot is taken');
    }

    const snapshot = snapshotSource(source, outputRoot);
    const sqlite = new DatabaseSync(snapshot.copied.db.path, { readOnly: true });
    const manifest = {
        migrationId: snapshot.migrationId,
        startedAt: new Date().toISOString(),
        source: snapshot.copied,
        activeTables: {},
        retiredTables: {},
        status: 'reading-source',
    };
    const sourceData = {};
    try {
        const discovered = sqlite.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        ).all().map((row) => row.name);
        const allowed = new Set([...ACTIVE_TABLES, 'bwc_runtime', 'audit_log_bad', 'sqlite_sequence']);
        const unknown = discovered.filter((name) => !allowed.has(name));
        if (unknown.length) throw new Error('Unknown SQLite tables require mapping: ' + unknown.join(', '));
        if (discovered.includes('bwc_runtime')) {
            const runtimeCount = sqlite.prepare('SELECT COUNT(*) AS n FROM bwc_runtime').get();
            manifest.retiredTables.bwc_runtime = {
                rowsNotMigrated: Number(runtimeCount && runtimeCount.n || 0),
                reason: 'ephemeral-presence-rebuilt-in-memory',
            };
        }

        for (const table of ACTIVE_TABLES) {
            if (!discovered.includes(table)) throw new Error('Required SQLite table missing: ' + table);
            const data = readActiveTable(sqlite, table);
            sourceData[table] = data;
            manifest.activeTables[table] = {
                rows: data.rows.length,
                hash: canonicalHash(data.rows, data.columns),
            };
        }

        if (discovered.includes('audit_log_bad')) {
            const salvage = salvageAuditBad(sqlite, sourceData.audit_log.rows);
            manifest.retiredTables.audit_log_bad = {
                recoveredDistinct: salvage.recovered.length,
                duplicateRows: salvage.duplicates.length,
                unreadableIds: salvage.unreadableIds,
                scannedToId: salvage.maxId,
            };
            sourceData.audit_log_bad = {
                columns: tableInfo(sqlite, 'audit_log_bad'),
                rows: salvage.recovered,
            };
            if (salvage.unreadableIds.length && !acceptUnreadableAudit) {
                throw new Error(
                    'Retired audit archive has ' + salvage.unreadableIds.length
                    + ' unreadable row IDs. Re-run only with an approved '
                    + '--accept-unreadable-audit-archive exception.',
                );
            }
        }
    } finally {
        sqlite.close();
    }

    const client = new Client({
        connectionString,
        connectionTimeoutMillis: 5000,
        statement_timeout: 60000,
        application_name: 'mobility-axiom-sqlite-salvage',
    });
    await client.connect();
    try {
        const schema = fs.readFileSync(
            path.join(ROOT, 'db', 'migrations', '001_catalog_primary.sql'),
            'utf8',
        );
        await client.query(schema);
        const prior = await client.query(
            'SELECT migration_id FROM catalog_migration_runs WHERE source_sha256 = $1',
            [snapshot.copied.db.sha256],
        );
        if (prior.rows.length) {
            manifest.status = 'already-migrated';
            manifest.priorMigrationId = prior.rows[0].migration_id;
        } else {
            if (!await targetIsEmpty(client)) {
                throw new Error('PostgreSQL catalog is not empty; refusing destructive replacement');
            }
            await client.query('BEGIN');
            try {
                for (const table of ACTIVE_TABLES) {
                    await insertRows(
                        client,
                        table,
                        sourceData[table].columns,
                        sourceData[table].rows,
                        table === 'audit_log' ? 'audit_log' : null,
                    );
                    const targetRows = await readTargetRows(
                        client,
                        table,
                        sourceData[table].columns,
                        table === 'audit_log' ? 'audit_log' : null,
                    );
                    const targetHash = canonicalHash(targetRows, sourceData[table].columns);
                    manifest.activeTables[table].targetRows = targetRows.length;
                    manifest.activeTables[table].targetHash = targetHash;
                    if (targetRows.length !== sourceData[table].rows.length
                        || targetHash !== manifest.activeTables[table].hash) {
                        throw new Error('Source/target verification failed for ' + table);
                    }
                }
                if (sourceData.audit_log_bad && sourceData.audit_log_bad.rows.length) {
                    await client.query(
                        "SELECT setval(pg_get_serial_sequence('audit_log', 'id'), "
                        + "COALESCE((SELECT MAX(id) FROM audit_log), 1), "
                        + "EXISTS(SELECT 1 FROM audit_log))",
                    );
                    await insertRows(
                        client,
                        'audit_log',
                        sourceData.audit_log_bad.columns,
                        sourceData.audit_log_bad.rows,
                        'audit_log_bad',
                    );
                }
                await setSequences(client);
                manifest.status = 'verified';
                manifest.completedAt = new Date().toISOString();
                await client.query(
                    `INSERT INTO catalog_migration_runs (
                        migration_id, source_sha256, source_wal_sha256, source_shm_sha256,
                        source_path, started_at, completed_at, manifest_json
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        snapshot.migrationId,
                        snapshot.copied.db.sha256,
                        snapshot.copied.wal ? snapshot.copied.wal.sha256 : null,
                        snapshot.copied.shm ? snapshot.copied.shm.sha256 : null,
                        snapshot.copied.db.path,
                        manifest.startedAt,
                        manifest.completedAt,
                        JSON.stringify(manifest),
                    ],
                );
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }
    } finally {
        await client.end();
    }

    const manifestPath = path.join(snapshot.runDir, 'migration-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', {
        encoding: 'utf8',
        flag: 'wx',
    });
    process.stdout.write(JSON.stringify({
        ok: true,
        migrationId: snapshot.migrationId,
        status: manifest.status,
        manifestPath,
        activeTables: manifest.activeTables,
        retiredTables: manifest.retiredTables,
    }, null, 2) + '\n');
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
