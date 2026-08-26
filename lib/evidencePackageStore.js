'use strict';

/**
 * EVIDENCE-PACKAGE-API-V1 — persist Evidence Package ZIPs under storage for
 * zero-upload verify (server hashes its own disk copy).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOLD_TAG = 'retention-hold';

function packagesRoot(storageDir) {
    const root = path.join(String(storageDir || 'storage'), 'evidence-packages');
    fs.mkdirSync(root, { recursive: true });
    return root;
}

function newPackageId() {
    return 'pkg_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function metaPath(root, packageId) {
    return path.join(root, packageId + '.json');
}

function zipPath(root, packageId) {
    return path.join(root, packageId + '.zip');
}

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (d) => hash.update(d));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * @param {{ storageDir: string, zipBuffer: Buffer, zipSha256: string, caseId?: string, manifestSha?: string, actor?: string }} opts
 */
function savePackage(opts) {
    const root = packagesRoot(opts.storageDir);
    const packageId = newPackageId();
    const zPath = zipPath(root, packageId);
    const mPath = metaPath(root, packageId);
    fs.writeFileSync(zPath, opts.zipBuffer);
    const meta = {
        packageId,
        caseId: opts.caseId || null,
        zipSha256: String(opts.zipSha256 || '').toLowerCase(),
        manifestSha: opts.manifestSha || null,
        actor: opts.actor || null,
        createdAt: new Date().toISOString(),
        byteSize: opts.zipBuffer.length,
        holdTag: HOLD_TAG,
    };
    fs.writeFileSync(mPath, JSON.stringify(meta, null, 2), 'utf8');
    return meta;
}

function listPackages(storageDir, limit) {
    const root = packagesRoot(storageDir);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));
    const names = fs.readdirSync(root).filter((n) => n.endsWith('.json'));
    const rows = [];
    for (let i = 0; i < names.length; i++) {
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(root, names[i]), 'utf8'));
            if (meta && meta.packageId) rows.push(meta);
        } catch (_) { /* skip */ }
    }
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return rows.slice(0, lim);
}

/**
 * Zero-upload verify: hash ZIP already on disk; compare to stored expected SHA-256.
 */
async function verifyPackageOnDisk(storageDir, packageId) {
    const id = String(packageId || '').trim();
    if (!id || !/^pkg_[a-z0-9_]+$/i.test(id)) {
        const err = new Error('Invalid package id');
        err.code = 'bad_id';
        throw err;
    }
    const root = packagesRoot(storageDir);
    const mPath = metaPath(root, id);
    const zPath = zipPath(root, id);
    if (!fs.existsSync(mPath) || !fs.existsSync(zPath)) {
        const err = new Error('Package not found');
        err.code = 'not_found';
        throw err;
    }
    const meta = JSON.parse(fs.readFileSync(mPath, 'utf8'));
    const expected = String(meta.zipSha256 || '').toLowerCase();
    const computed = (await sha256File(zPath)).toLowerCase();
    const match = !!(expected && computed && expected === computed);
    return {
        ok: true,
        packageId: id,
        match,
        status: match ? 'MATCH' : 'MISMATCH',
        expectedSha256: expected,
        computedSha256: computed,
        caseId: meta.caseId || null,
        createdAt: meta.createdAt || null,
        byteSize: meta.byteSize || null,
    };
}

module.exports = {
    HOLD_TAG,
    packagesRoot,
    newPackageId,
    savePackage,
    listPackages,
    verifyPackageOnDisk,
    sha256File,
};
