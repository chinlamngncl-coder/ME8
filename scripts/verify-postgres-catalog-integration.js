'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const baseUrl = String(process.env.FM_CATALOG_DB_URL || '').trim();
if (!baseUrl) throw new Error('FM_CATALOG_DB_URL is required');

const schema = 'me8_catalog_test_' + crypto.randomBytes(6).toString('hex');
const admin = new Client({ connectionString: baseUrl, connectionTimeoutMillis: 5000 });
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-pg-catalog-'));

function schemaUrl() {
    const url = new URL(baseUrl);
    url.searchParams.set('options', '-csearch_path=' + schema);
    return url.toString();
}

(async () => {
    await admin.connect();
    await admin.query('CREATE SCHEMA "' + schema + '"');
    process.env.FM_CATALOG_MODE = 'postgres_required';
    process.env.FM_CATALOG_DB_URL = schemaUrl();
    const siteDb = require('../lib/siteDb');
    try {
        await siteDb.init(storage);
        assert.strictEqual((await siteDb.healthCheck(0)).ok, true);
        assert.strictEqual(fs.existsSync(path.join(storage, 'mobility.db')), false);

        await siteDb.setSetting('integration', { ok: true });
        assert.deepStrictEqual(await siteDb.getSetting('integration'), { ok: true });

        await siteDb.saveDevices([{ deviceId: 'test-1', operatorName: 'Officer', protocol: 'sip' }]);
        assert.strictEqual((await siteDb.findDevice('test-1')).operatorName, 'Officer');
        assert.strictEqual(await siteDb.deviceCount(), 1);

        const audit = await siteDb.appendAudit({ action: 'integration.write', detail: { ok: true } });
        assert.ok(audit.id);
        assert.strictEqual((await siteDb.queryAudit({ action: 'integration.write' })).total, 1);

        const gpsId = await siteDb.appendGpsTrackPoint({ deviceId: 'test-1', lat: 1, lon: 2 });
        assert.ok(gpsId);
        assert.strictEqual((await siteDb.queryGpsTrackRoute(
            'test-1', '2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z', 10
        )).length, 1);

        const now = new Date().toISOString();
        await siteDb.upsertEvidenceFile({
            id: 'ev-1', relativePath: 'ev-1.mp4', fileName: 'ev-1.mp4',
            byteSize: 10, uploadedAt: now, createdAt: now,
        });
        await siteDb.insertCaseFile({
            id: 'case-1', title: 'Case', createdAt: now, updatedAt: now,
        });
        await siteDb.linkCaseFileEvidence('case-1', 'ev-1', 'tester');
        assert.strictEqual(await siteDb.countCaseFileEvidence('case-1'), 1);
        await siteDb.deleteCaseFile('case-1');
        assert.strictEqual(await siteDb.countCaseFileEvidence('case-1'), 0);

        let rolledBack = false;
        try {
            await siteDb.transaction(async (client) => {
                await client.query(
                    'INSERT INTO site_settings (key,value_json,updated_at) VALUES ($1,$2,$3)',
                    ['rollback-test', '{}', now]
                );
                throw new Error('rollback');
            });
        } catch (err) {
            rolledBack = err.message === 'rollback';
        }
        assert.strictEqual(rolledBack, true);
        assert.strictEqual(await siteDb.getSetting('rollback-test', null), null);

        let timerFired = false;
        const timer = setTimeout(() => { timerFired = true; }, 25);
        await siteDb.catalogDb().query('SELECT pg_sleep(0.25)');
        clearTimeout(timer);
        assert.strictEqual(timerFired, true, 'delayed PostgreSQL query must not block the event loop');

        console.log('PostgreSQL catalog CRUD, transaction, and responsiveness verification passed.');
    } finally {
        await siteDb.close();
        await admin.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
        await admin.end();
        fs.rmSync(storage, { recursive: true, force: true });
    }
})().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
