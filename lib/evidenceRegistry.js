/**
 * Dock / NAS / cloud evidence catalog + audited download IDs.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');

const DOWNLOAD_TOKEN_MS = 15 * 60 * 1000;
const VIDEO_EXT = /\.(mp4|mov|avi|mkv|ts|m4v|3gp|flv|wmv|ps)$/i;

let ftpRoot = null;
let liveCaptureRoot = null;

function displayNameForUpload(opts) {
    const raw = (opts && opts.fileName) || path.basename((opts && opts.fullPath) || '');
    return path.basename(String(raw || '')).replace(/\.tmp$/i, '');
}

function init(storageDir, opts) {
    siteDb.init(storageDir);
    ftpRoot = (opts && opts.ftpRoot) || path.join(storageDir, 'ftp-uploads');
    liveCaptureRoot = (opts && opts.liveCaptureRoot) || null;
}

function evidenceRootFor(file) {
    if (file && file.source === 'live_server' && liveCaptureRoot) return liveCaptureRoot;
    return ftpRoot;
}

function newFileId() {
    return 'EV-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex');
}

function newDownloadId() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return 'DL-' + stamp + '-' + crypto.randomBytes(4).toString('hex');
}

function safeRelative(root, fullPath) {
    const rel = path.relative(root, fullPath).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..')) return null;
    return rel;
}

function cleanedRelativeVariants(rel) {
    const base = String(rel || '').replace(/\\/g, '/');
    const variants = [base];
    const noTmp = base.replace(/\.tmp$/i, '');
    if (noTmp !== base) variants.push(noTmp);
    return variants;
}

function repairIndexedPath(file) {
    const root = evidenceRootFor(file);
    if (!root || !file) return null;
    for (const rel of cleanedRelativeVariants(file.relativePath)) {
        const full = path.normalize(path.join(root, rel));
        if (full.startsWith(path.normalize(root)) && fs.existsSync(full)) {
            return { fullPath: full, relativePath: rel, fileName: displayNameForUpload({ fileName: file.fileName, fullPath: full }) };
        }
    }
    return null;
}

function fileStorageStatus(file) {
    if (!file) return { available: false, code: 'missing' };
    const root = evidenceRootFor(file);
    if (!root) return { available: false, code: 'missing' };
    const full = path.normalize(path.join(root, file.relativePath || ''));
    if (full.startsWith(path.normalize(root)) && fs.existsSync(full)) {
        return { available: true, code: 'available' };
    }
    const repaired = repairIndexedPath(file);
    if (repaired) return { available: true, code: 'available', repaired: true };
    return { available: false, code: 'missing' };
}

function decorateFileRow(file) {
    const status = fileStorageStatus(file);
    return Object.assign({}, file, {
        storageAvailable: !!status.available,
        storageStatus: status.code,
        storageRepaired: !!status.repaired,
    });
}

function resolveFilePath(file) {
    if (!file) return null;
    const root = evidenceRootFor(file);
    if (!root) return null;
    const full = path.join(root, file.relativePath);
    const norm = path.normalize(full);
    if (!norm.startsWith(path.normalize(root))) return null;
    if (!fs.existsSync(norm)) {
        const repaired = repairIndexedPath(file);
        if (!repaired) return null;
        let byteSize = file.byteSize || 0;
        try { byteSize = fs.statSync(repaired.fullPath).size; } catch (_) { /* ignore */ }
        siteDb.upsertEvidenceFile({
            id: file.id,
            source: file.source || 'dock_ftp',
            storageTier: file.storageTier || 'local',
            relativePath: repaired.relativePath,
            fileName: repaired.fileName,
            byteSize,
            deviceId: file.deviceId || null,
            operatorName: file.operatorName || null,
            uploadedAt: file.uploadedAt || new Date().toISOString(),
            peerIp: file.peerIp || null,
            syncStatus: file.syncStatus || 'synced',
        });
        return repaired.fullPath;
    }
    return norm;
}

function registerLiveCapture(opts) {
    return registerFromUpload(Object.assign({}, opts, {
        source: 'live_server',
        storageTier: 'local',
        rootDir: opts.rootDir || liveCaptureRoot || ftpRoot,
    }));
}

function registerFromUpload(opts) {
    if (!siteDb.isReady() || !opts || !opts.fullPath) return null;
    const root = opts.rootDir || ftpRoot;
    const rel = safeRelative(root, opts.fullPath);
    if (!rel) return null;
    let byteSize = 0;
    try {
        byteSize = fs.statSync(opts.fullPath).size;
    } catch (_) { /* ignore */ }
    const existing = siteDb.findEvidenceByRelative(rel);
    const id = existing ? existing.id : newFileId();
    const now = new Date().toISOString();
    siteDb.upsertEvidenceFile({
        id,
        source: opts.source || 'dock_ftp',
        storageTier: opts.storageTier || 'local',
        relativePath: rel,
        fileName: displayNameForUpload(opts),
        byteSize,
        deviceId: opts.deviceId || null,
        operatorName: opts.operatorName || null,
        peerIp: opts.peer || null,
        uploadedAt: now,
        syncStatus: 'synced',
        createdAt: existing && existing.created_at ? existing.created_at : now,
    });
    return id;
}

function scanFtpRoot(limit) {
    if (!ftpRoot || !fs.existsSync(ftpRoot)) return 0;
    let count = 0;
    const max = Math.min(500, parseInt(limit, 10) || 200);
    function walk(dir) {
        if (count >= max) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (_) {
            return;
        }
        entries.forEach((ent) => {
            if (count >= max) return;
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                walk(full);
                return;
            }
            if (!VIDEO_EXT.test(ent.name)) return;
            registerFromUpload({ fullPath: full, rootDir: ftpRoot });
            count += 1;
        });
    }
    walk(ftpRoot);
    return count;
}

function listCatalog(limit) {
    return siteDb.listEvidenceFiles(limit).map(decorateFileRow);
}

function repairCatalog(limit) {
    const rows = siteDb.listEvidenceFiles(limit || 2000);
    let checked = 0;
    let repaired = 0;
    let missing = 0;
    rows.forEach((file) => {
        checked += 1;
        const beforeRel = file.relativePath;
        const beforeName = file.fileName;
        const fullPath = resolveFilePath(file);
        if (!fullPath) {
            missing += 1;
            return;
        }
        const after = siteDb.getEvidenceFile(file.id);
        if (after && (after.relativePath !== beforeRel || after.fileName !== beforeName)) {
            repaired += 1;
        }
    });
    return { checked, repaired, missing };
}

function createDownloadRequest(session, fileId, clientIp) {
    const file = siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const fullPath = resolveFilePath(file);
    if (!fullPath) throw new Error('File missing on server storage');
    const now = new Date();
    const downloadId = newDownloadId();
    const tokenExpiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_MS).toISOString();
    siteDb.insertEvidenceDownload({
        downloadId,
        evidenceFileId: file.id,
        actor: session ? session.username : null,
        userId: session ? session.userId : null,
        role: session ? session.role : null,
        requestedAt: now.toISOString(),
        tokenExpiresAt,
        clientIp: clientIp || null,
    });
    return {
        downloadId,
        fileId: file.id,
        fileName: file.fileName,
        byteSize: file.byteSize,
        tokenExpiresAt,
        downloadUrl: '/api/evidence/stream/' + encodeURIComponent(downloadId),
    };
}

function resolveStreamDownload(downloadId, session) {
    const dl = siteDb.getEvidenceDownload(downloadId);
    if (!dl) return { error: 'Download record not found', status: 404 };
    if (session && dl.userId && session.userId !== dl.userId && session.role !== 'super_admin') {
        return { error: 'Download ID belongs to another user', status: 403 };
    }
    if (Date.parse(dl.tokenExpiresAt) < Date.now()) {
        return { error: 'Download link expired — request a new one', status: 410 };
    }
    const file = siteDb.getEvidenceFile(dl.evidenceFileId);
    if (!file) return { error: 'Evidence file not found', status: 404 };
    const fullPath = resolveFilePath(file);
    if (!fullPath) return { error: 'File missing on storage', status: 404 };
    return { dl, file, fullPath };
}

function markConsumed(downloadId) {
    siteDb.markEvidenceDownloadConsumed(downloadId);
}

module.exports = {
    init,
    registerFromUpload,
    registerLiveCapture,
    scanFtpRoot,
    repairCatalog,
    listCatalog,
    createDownloadRequest,
    resolveStreamDownload,
    markConsumed,
    getFile: (id) => {
        const file = siteDb.getEvidenceFile(id);
        return file ? decorateFileRow(file) : null;
    },
    listDownloads: (limit) => siteDb.listEvidenceDownloads(limit),
    resolveFilePath,
    fileStorageStatus,
    DOWNLOAD_TOKEN_MS,
    VIDEO_EXT,
};
