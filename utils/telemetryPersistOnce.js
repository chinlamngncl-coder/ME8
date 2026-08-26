'use strict';
/**
 * telemetryPersistOnce.js — Advanced Telemetry Engine child process.
 * Blocking INSERT of Heuristic Trace Analysis into system_anomalies.
 * Invoked via spawnSync from telemetryRecorder.persistFatalBlocking so the parent
 * can wait for PostgreSQL before process.exit.
 *
 * Usage: node telemetryPersistOnce.js <path-to-json-payload>
 */
const fs = require('fs');
const { Client } = require('pg');

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        process.stderr.write('telemetryPersistOnce: missing payload path\n');
        process.exit(2);
    }
    let row;
    try {
        row = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        process.stderr.write('telemetryPersistOnce: bad payload: ' + (err && err.message) + '\n');
        process.exit(3);
    }

    const connectionString = String(process.env.FM_CATALOG_DB_URL || '').trim();
    if (!connectionString) {
        process.stderr.write('telemetryPersistOnce: FM_CATALOG_DB_URL missing\n');
        process.exit(4);
    }

    const client = new Client({
        connectionString,
        connectionTimeoutMillis: 5000,
        query_timeout: 8000,
        statement_timeout: 8000,
        application_name: 'mobility-axiom-telemetry-persist',
    });

    try {
        await client.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_anomalies (
                id            TEXT PRIMARY KEY,
                timestamp     TEXT NOT NULL,
                component     TEXT NOT NULL,
                error_trace   TEXT,
                redacted_logs TEXT NOT NULL DEFAULT ''
            )
        `);
        await client.query(
            `INSERT INTO system_anomalies (id, timestamp, component, error_trace, redacted_logs)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [
                String(row.id || ''),
                String(row.timestamp || new Date().toISOString()),
                String(row.component || 'fatal'),
                row.error_trace != null ? String(row.error_trace) : null,
                String(row.redacted_logs || ''),
            ]
        );
        await client.end();
        process.exit(0);
    } catch (err) {
        try { await client.end(); } catch (_) { /* ignore */ }
        process.stderr.write('telemetryPersistOnce: ' + (err && err.message ? err.message : String(err)) + '\n');
        process.exit(5);
    }
}

main();
