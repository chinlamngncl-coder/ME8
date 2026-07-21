'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.FM_SECRETS_MASTER_KEY = '11'.repeat(32);
const evidenceIngestGate = require('../lib/evidenceIngestGate');
const evidenceUploadSafeName = require('../lib/evidenceUploadSafeName');
const evidenceCrypto = require('../lib/evidenceCrypto');

function mp4Bytes() {
    const out = Buffer.alloc(128, 0);
    out.writeUInt32BE(24, 0);
    out.write('ftyp', 4, 'ascii');
    out.write('isom', 8, 'ascii');
    out.write('ME8 deterministic evidence', 32, 'ascii');
    return out;
}

async function main() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-ingest-gate-'));
    try {
        const expectedHash = crypto.createHash('sha256').update(mp4Bytes()).digest('hex');
        const incoming = path.join(root, 'officer-original.mp4');
        fs.writeFileSync(incoming, mp4Bytes());
        const admitted = await evidenceIngestGate.admitFile({
            rootDir: root,
            fullPath: incoming,
            originalFileName: '..\\outside\\Officer A.mp4',
            source: 'manual_forensic',
        });
        assert.strictEqual(admitted.originalFileName, 'Officer A.mp4');
        assert.strictEqual(admitted.detectedType, 'iso_bmff');
        assert.strictEqual(admitted.sha256, expectedHash);
        assert.match(admitted.fileName, /^ev-[0-9a-f-]{36}\.mp4$/);
        assert(admitted.relativePath.startsWith('admitted/'));
        assert(fs.existsSync(admitted.fullPath));
        assert(!fs.existsSync(incoming));

        const inspected = await evidenceIngestGate.inspectFile({
            rootDir: root,
            fullPath: admitted.fullPath,
            originalFileName: 'Officer A.mp4',
        });
        assert.strictEqual(inspected.sha256, expectedHash);
        assert(fs.existsSync(admitted.fullPath), 'inspection must not rename existing evidence');
        evidenceCrypto.init(root);
        await evidenceCrypto.encryptFileInPlace(admitted.fullPath);
        assert.strictEqual(evidenceCrypto.isEncryptedFile(admitted.fullPath), true);
        const encryptedInspection = await evidenceIngestGate.inspectFile({
            rootDir: root,
            fullPath: admitted.fullPath,
            originalFileName: 'Officer A.mp4',
        });
        assert.strictEqual(encryptedInspection.sha256, expectedHash);
        assert(evidenceCrypto.decryptToBuffer(admitted.fullPath).equals(mp4Bytes()));

        const disguisedExe = path.join(root, 'camera.mp4');
        fs.writeFileSync(disguisedExe, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(126)]));
        await assert.rejects(
            evidenceIngestGate.admitFile({
                rootDir: root,
                fullPath: disguisedExe,
                originalFileName: 'camera.mp4',
                source: 'dock_ftp',
            }),
            /Executable or archive content/
        );
        assert(!fs.existsSync(disguisedExe));
        const rejectedRoot = path.join(root, evidenceIngestGate.QUARANTINE_DIR, 'rejected');
        assert(fs.existsSync(rejectedRoot));

        const mismatch = path.join(root, 'fake.jpg');
        fs.writeFileSync(mismatch, Buffer.from('%PDF-1.7\nnot a jpeg'));
        await assert.rejects(
            evidenceIngestGate.admitFile({
                rootDir: root,
                fullPath: mismatch,
                originalFileName: 'fake.jpg',
                source: 'https_upload',
            }),
            /extension does not match/
        );

        assert.throws(() => evidenceUploadSafeName.safeExtension('archive.zip'), /type not permitted/i);
        assert.strictEqual(evidenceIngestGate.classifySignature(mp4Bytes()), 'iso_bmff');
        assert.strictEqual(
            evidenceIngestGate.classifySignature(Buffer.concat([Buffer.from('PK'), Buffer.alloc(20)])),
            'archive'
        );
        console.log('PASS verify-evidence-ingest-gate');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
