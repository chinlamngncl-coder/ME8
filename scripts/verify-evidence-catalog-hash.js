'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

if (process.argv[2] === '--child') {
    (async () => {
        const dir = process.argv[3];
        const baseUrl = String(process.env.FM_CATALOG_DB_URL || '').trim();
        if (!baseUrl) throw new Error('FM_CATALOG_DB_URL is required');
        const schema = 'me8_evidence_hash_' + crypto.randomBytes(6).toString('hex');
        const admin = new Client({ connectionString: baseUrl, connectionTimeoutMillis: 5000 });
        await admin.connect();
        await admin.query('CREATE SCHEMA "' + schema + '"');
        const schemaUrl = new URL(baseUrl);
        schemaUrl.searchParams.set('options', '-csearch_path=' + schema);
        process.env.FM_CATALOG_MODE = 'postgres_required';
        process.env.FM_CATALOG_DB_URL = schemaUrl.toString();
        const siteDb = require('../lib/siteDb');
        const evidenceRegistry = require('../lib/evidenceRegistry');
        try {
        await siteDb.init(dir);
        const sha256 = 'a'.repeat(64);
        await siteDb.upsertEvidenceFile({
            id: 'EV-HASH-TEST',
            source: 'manual_forensic',
            storageTier: 'local',
            relativePath: 'admitted/2026/07/22/test.mp4',
            fileName: 'forensic-test.mp4',
            byteSize: 128,
            sha256,
            uploadedAt: new Date().toISOString(),
        });
        assert.strictEqual((await siteDb.getEvidenceFile('EV-HASH-TEST')).sha256, sha256);
        assert.strictEqual((await siteDb.listEvidenceFiles(10))[0].sha256, sha256);
        assert.strictEqual((await siteDb.listEvidenceFilesPage({ page: 1, pageSize: 10 })).files[0].sha256, sha256);
        const ftpRoot = path.join(dir, 'ftp');
        fs.mkdirSync(ftpRoot, { recursive: true });
        const mediaPath = path.join(ftpRoot, 'camera.mp4');
        const media = Buffer.alloc(128, 0);
        media.writeUInt32BE(24, 0);
        media.write('ftyp', 4, 'ascii');
        media.write('isom', 8, 'ascii');
        media.write('catalog hash contract', 32, 'ascii');
        fs.writeFileSync(mediaPath, media);
        const mediaSha256 = crypto.createHash('sha256').update(media).digest('hex');
        evidenceRegistry.init(dir, { ftpRoot });
        await assert.rejects(
            evidenceRegistry.registerFromUpload({ fullPath: mediaPath, rootDir: ftpRoot }),
            /verified SHA-256/
        );
        const registeredId = await evidenceRegistry.registerFromUpload({
            fullPath: mediaPath,
            rootDir: ftpRoot,
            originalFileName: 'camera.mp4',
            sha256: mediaSha256,
        });
        assert.strictEqual((await siteDb.getEvidenceFile(registeredId)).sha256, mediaSha256);
        const legacyPath = path.join(ftpRoot, 'legacy.mp4');
        fs.writeFileSync(legacyPath, media);
        await siteDb.upsertEvidenceFile({
            id: 'EV-LEGACY',
            source: 'dock_ftp',
            storageTier: 'local',
            relativePath: 'legacy.mp4',
            fileName: 'original-legacy-name.mp4',
            byteSize: media.length,
            deviceId: 'DEVICE-1',
            operatorName: 'Officer One',
            uploadedAt: '2026-01-02T03:04:05.000Z',
            peerIp: '192.0.2.10',
            syncStatus: 'synced',
            createdAt: '2026-01-02T03:04:05.000Z',
        });
        await evidenceRegistry.scanFtpRoot(10);
        const legacy = await siteDb.getEvidenceFile('EV-LEGACY');
        assert.strictEqual(legacy.fileName, 'original-legacy-name.mp4');
        assert.strictEqual(legacy.source, 'dock_ftp');
        assert.strictEqual(legacy.deviceId, 'DEVICE-1');
        assert.strictEqual(legacy.operatorName, 'Officer One');
        assert.strictEqual(legacy.uploadedAt, '2026-01-02T03:04:05.000Z');
        assert.strictEqual(legacy.peerIp, '192.0.2.10');
        assert.match(legacy.sha256, /^[0-9a-f]{64}$/);
        const verified = await evidenceRegistry.verifyCatalogIntegrity(10);
        assert.strictEqual(verified.matched, 2);
        media[media.length - 1] = 1;
        fs.writeFileSync(mediaPath, media);
        const tampered = await evidenceRegistry.verifyCatalogIntegrity(10);
        assert.strictEqual(tampered.mismatched, 1);
        } finally {
            await siteDb.close();
            await admin.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
            await admin.end();
        }
        process.exit(0);
    })().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

if (process.argv[2] !== '--child') {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-evidence-hash-'));
    try {
        const child = spawnSync(process.execPath, [__filename, '--child', sandbox], {
            encoding: 'utf8',
        });
        if (child.status !== 0) {
            process.stderr.write(child.stdout || '');
            process.stderr.write(child.stderr || '');
            process.exit(child.status || 1);
        }
        console.log('PASS verify-evidence-catalog-hash');
    } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
    }
}
