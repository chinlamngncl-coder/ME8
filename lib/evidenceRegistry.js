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
let archiveRoot = null;
let storageDirRef = null;

function displayNameForUpload(opts) {
    const raw = (opts && opts.fileName) || path.basename((opts && opts.fullPath) || '');
    return path.basename(String(raw || '')).replace(/\.tmp$/i, '');
}

function init(storageDir, opts) {
    siteDb.init(storageDir);
    storageDirRef = storageDir;
    ftpRoot = (opts && opts.ftpRoot) || path.join(storageDir, 'ftp-uploads');
    liveCaptureRoot = (opts && opts.liveCaptureRoot) || null;
    archiveRoot = (opts && opts.archiveRoot) || path.join(storageDir, 'evidence-archive');
    try { fs.mkdirSync(archiveRoot, { recursive: true }); } catch (_) { /* ignore */ }
}

function setArchiveRoot(dir) {
    if (!dir) return;
    archiveRoot = dir;
    try { fs.mkdirSync(archiveRoot, { recursive: true }); } catch (_) { /* ignore */ }
}

function getArchiveRoot() {
    return archiveRoot;
}

function evidenceRootFor(file) {
    if (file && String(file.storageTier || '') === 'archived' && archiveRoot) return archiveRoot;
    if (file && file.source === 'live_server' && liveCaptureRoot) return liveCaptureRoot;
    return ftpRoot;
}

function isArchivedFile(file) {
    return !!(file && String(file.storageTier || '') === 'archived');
}

function newFileId() {
    return 'EV-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex');
}

function newDownloadId() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return 'DL-' + stamp + '-' + crypto.randomBytes(4).toString('hex');
}

function safeRelative(root, fullPath) {
    const rootAbs = path.resolve(root);
    const fullAbs = path.resolve(fullPath);
    const rel = path.relative(rootAbs, fullAbs).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return rel;
}

/** Strip absolute paths / stale ftp-uploads prefixes — catalog must store paths relative to evidence root. */
function normalizeCatalogRelative(root, stored) {
    if (!stored || !root) return null;
    const rootAbs = path.resolve(root);
    const rootSlash = rootAbs.replace(/\\/g, '/').replace(/\/$/, '');
    let s = String(stored).trim().replace(/\\/g, '/');
    const lower = s.toLowerCase();
    const rootLower = rootSlash.toLowerCase();
    if (lower.startsWith(rootLower + '/')) {
        s = s.slice(rootSlash.length + 1);
    } else if (/^[a-z]:\//i.test(s) || s.startsWith('//')) {
        const rel = safeRelative(rootAbs, path.resolve(s.replace(/\//g, path.sep)));
        return rel || null;
    }
    if (path.isAbsolute(s) || s.startsWith('..')) return null;
    return s || null;
}

function cleanedRelativeVariants(rel) {
    const base = String(rel || '').replace(/\\/g, '/');
    const variants = [base];
    const noTmp = base.replace(/\.tmp$/i, '');
    if (noTmp !== base) variants.push(noTmp);
    return variants;
}

function uploadPathCandidates(root, opts) {
    const rootAbs = path.resolve(root);
    const out = [];
    const add = (p) => {
        if (!p) return;
        const abs = path.resolve(p);
        if (!out.some((x) => x === abs)) out.push(abs);
    };
    if (opts && opts.fullPath) {
        add(opts.fullPath);
        const abs = path.resolve(opts.fullPath);
        if (/\.tmp$/i.test(abs)) add(abs.replace(/\.tmp$/i, ''));
    }
    if (opts && opts.fileName) {
        const raw = String(opts.fileName).replace(/\\/g, '/').replace(/^\/+/, '');
        add(path.join(rootAbs, path.basename(raw)));
        if (raw.includes('/')) {
            add(path.join(rootAbs, raw));
            if (/\.tmp$/i.test(raw)) add(path.join(rootAbs, raw.replace(/\.tmp$/i, '')));
        }
    }
    return out;
}

function resolveOnDiskForRegister(root, opts) {
    const rootAbs = path.resolve(root);
    for (const abs of uploadPathCandidates(rootAbs, opts)) {
        if (!fs.existsSync(abs)) continue;
        const rel = safeRelative(rootAbs, abs);
        if (!rel) continue;
        let byteSize = 0;
        try { byteSize = fs.statSync(abs).size; } catch (_) { /* ignore */ }
        return { fullPath: abs, relativePath: rel, byteSize };
    }
    if (!opts || !opts.fullPath) return null;
    const rel = safeRelative(rootAbs, path.resolve(opts.fullPath));
    if (!rel) return null;
    let byteSize = 0;
    try { byteSize = fs.statSync(path.resolve(opts.fullPath)).size; } catch (_) { /* ignore */ }
    return { fullPath: path.resolve(opts.fullPath), relativePath: rel, byteSize };
}

function repairIndexedPath(file) {
    const root = evidenceRootFor(file);
    if (!root || !file) return null;
    const normalized = normalizeCatalogRelative(root, file.relativePath);
    if (!normalized) return null;
    const rootAbs = path.resolve(root);
    for (const rel of cleanedRelativeVariants(normalized)) {
        const full = path.normalize(path.join(rootAbs, rel));
        const rootNorm = path.normalize(rootAbs);
        if (!full.startsWith(rootNorm)) continue;
        if (!fs.existsSync(full)) continue;
        return {
            fullPath: full,
            relativePath: rel,
            fileName: displayNameForUpload({ fileName: file.fileName, fullPath: full }),
        };
    }
    return null;
}

function fileStorageStatus(file) {
    if (!file) return { available: false, code: 'missing' };
    const root = evidenceRootFor(file);
    if (!root) return { available: false, code: 'missing' };
    const rootAbs = path.resolve(root);
    const rel = normalizeCatalogRelative(rootAbs, file.relativePath);
    if (rel) {
        const full = path.normalize(path.join(rootAbs, rel));
        if (full.startsWith(path.normalize(rootAbs)) && fs.existsSync(full)) {
            return { available: true, code: 'available' };
        }
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

function persistRepairedRow(file, repaired) {
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

function resolveFilePath(file) {
    if (!file) return null;
    const root = evidenceRootFor(file);
    if (!root) return null;
    const rootAbs = path.resolve(root);
    const rel = normalizeCatalogRelative(rootAbs, file.relativePath);
    if (rel) {
        const norm = path.normalize(path.join(rootAbs, rel));
        if (norm.startsWith(path.normalize(rootAbs)) && fs.existsSync(norm)) {
            if (rel !== file.relativePath || !(file.byteSize > 0)) {
                return persistRepairedRow(file, {
                    fullPath: norm,
                    relativePath: rel,
                    fileName: displayNameForUpload({ fileName: file.fileName, fullPath: norm }),
                });
            }
            return norm;
        }
    }
    const repaired = repairIndexedPath(file);
    if (!repaired) return null;
    return persistRepairedRow(file, repaired);
}

function deferRepairFile(id) {
    if (!id) return;
    setImmediate(() => {
        try {
            const row = siteDb.getEvidenceFile(id);
            if (row) resolveFilePath(row);
        } catch (_) { /* ignore */ }
    });
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
    const onDisk = resolveOnDiskForRegister(root, opts);
    if (!onDisk || !onDisk.relativePath) return null;
    const rel = onDisk.relativePath;
    const existing = siteDb.findEvidenceByRelative(rel)
        || cleanedRelativeVariants(rel).map((v) => siteDb.findEvidenceByRelative(v)).find(Boolean);
    const id = existing ? existing.id : newFileId();
    const now = new Date().toISOString();
    siteDb.upsertEvidenceFile({
        id,
        source: opts.source || 'dock_ftp',
        storageTier: opts.storageTier || 'local',
        relativePath: rel,
        fileName: displayNameForUpload(Object.assign({}, opts, { fullPath: onDisk.fullPath })),
        byteSize: onDisk.byteSize || 0,
        deviceId: opts.deviceId || null,
        operatorName: opts.operatorName || null,
        peerIp: opts.peer || null,
        uploadedAt: now,
        syncStatus: 'synced',
        createdAt: existing && existing.created_at ? existing.created_at : now,
    });
    deferRepairFile(id);
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
    const files = siteDb.listEvidenceFiles(limit).map(decorateFileRow);
    const tagMap = siteDb.listEvidenceTagsByFileId(Math.max(files.length * 2, 500));
    return files.map(function (f) {
        return Object.assign({}, f, { tags: tagMap[f.id] || [] });
    });
}

function listCatalogPage(opts) {
    const page = siteDb.listEvidenceFilesPage(opts || {});
    const tagMap = siteDb.listEvidenceTagsByFileId(Math.max(page.files.length * 4, 200));
    return {
        files: page.files.map(decorateFileRow).map(function (f) {
            return Object.assign({}, f, {
                tags: tagMap[f.id] || [],
                archived: isArchivedFile(f),
            });
        }),
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
        pageCount: page.pageCount,
    };
}

function safeMoveFile(fromPath, toPath) {
    fs.mkdirSync(path.dirname(toPath), { recursive: true });
    try {
        fs.renameSync(fromPath, toPath);
    } catch (err) {
        fs.copyFileSync(fromPath, toPath);
        fs.unlinkSync(fromPath);
    }
}

/** Move evidence blob to cold archive root; keep ID. Fail closed if move fails. */
function archiveFile(fileId, actor) {
    const file = siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    if (isArchivedFile(file)) throw new Error('Evidence file is already archived');
    if (!archiveRoot) throw new Error('Archive storage is not configured');
    const src = resolveFilePath(file);
    if (!src || !fs.existsSync(src)) throw new Error('File missing on server storage');
    const safeName = path.basename(String(file.fileName || 'evidence.bin')).replace(/[<>:"/\\|?*]/g, '_').slice(0, 180);
    const rel = path.join(file.id, safeName).replace(/\\/g, '/');
    const dest = path.join(archiveRoot, file.id, safeName);
    if (path.resolve(dest) === path.resolve(src)) {
        siteDb.upsertEvidenceFile(Object.assign({}, file, { storageTier: 'archived', relativePath: rel }));
        const same = decorateFileRow(siteDb.getEvidenceFile(fileId));
        return Object.assign({}, same, { archived: true });
    }
    try {
        safeMoveFile(src, dest);
    } catch (err) {
        throw new Error('Could not move file to archive: ' + (err && err.message ? err.message : 'unknown'));
    }
    if (!fs.existsSync(dest)) throw new Error('Archive move failed — file not found at destination');
    let byteSize = file.byteSize || 0;
    try { byteSize = fs.statSync(dest).size; } catch (_) { /* ignore */ }
    siteDb.upsertEvidenceFile(Object.assign({}, file, {
        storageTier: 'archived',
        relativePath: rel,
        byteSize: byteSize,
        syncStatus: 'synced',
    }));
    const prev = siteDb.getEvidenceMeta(fileId) || { evidenceFileId: fileId, tags: [] };
    siteDb.upsertEvidenceMeta(Object.assign({}, prev, {
        evidenceFileId: fileId,
        notes: prev.notes || '',
        tags: Array.isArray(prev.tags) ? prev.tags : [],
        updatedBy: actor && actor.username ? actor.username : null,
    }));
    const out = decorateFileRow(siteDb.getEvidenceFile(fileId));
    return Object.assign({}, out, { archived: true });
}

/** Move archived blob back under FTP root restored/; set tier local. */
function restoreFile(fileId, actor) {
    const file = siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    if (!isArchivedFile(file)) throw new Error('Evidence file is not archived');
    if (!ftpRoot) throw new Error('Evidence storage root is not configured');
    const src = resolveFilePath(file);
    if (!src || !fs.existsSync(src)) throw new Error('Archived file missing on server storage');
    const safeName = path.basename(String(file.fileName || 'evidence.bin')).replace(/[<>:"/\\|?*]/g, '_').slice(0, 180);
    const rel = path.join('restored', file.id, safeName).replace(/\\/g, '/');
    const dest = path.join(ftpRoot, 'restored', file.id, safeName);
    try {
        safeMoveFile(src, dest);
    } catch (err) {
        throw new Error('Could not restore file from archive: ' + (err && err.message ? err.message : 'unknown'));
    }
    if (!fs.existsSync(dest)) throw new Error('Restore failed — file not found at destination');
    let byteSize = file.byteSize || 0;
    try { byteSize = fs.statSync(dest).size; } catch (_) { /* ignore */ }
    siteDb.upsertEvidenceFile(Object.assign({}, file, {
        storageTier: 'local',
        source: file.source === 'live_server' ? 'dock_ftp' : (file.source || 'dock_ftp'),
        relativePath: rel,
        byteSize: byteSize,
        syncStatus: 'synced',
    }));
    const prev = siteDb.getEvidenceMeta(fileId) || { evidenceFileId: fileId, tags: [] };
    siteDb.upsertEvidenceMeta(Object.assign({}, prev, {
        evidenceFileId: fileId,
        notes: prev.notes || '',
        tags: Array.isArray(prev.tags) ? prev.tags : [],
        updatedBy: actor && actor.username ? actor.username : null,
    }));
    const restored = decorateFileRow(siteDb.getEvidenceFile(fileId));
    return Object.assign({}, restored, { archived: false });
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
    setArchiveRoot,
    getArchiveRoot,
    registerFromUpload,
    registerLiveCapture,
    scanFtpRoot,
    repairCatalog,
    listCatalog,
    listCatalogPage,
    archiveFile,
    restoreFile,
    isArchivedFile,
    createDownloadRequest,
    resolveStreamDownload,
    markConsumed,
    getFile: (id) => {
        const file = siteDb.getEvidenceFile(id);
        if (!file) return null;
        return Object.assign({}, decorateFileRow(file), { archived: isArchivedFile(file) });
    },
    listDownloads: (limit) => siteDb.listEvidenceDownloads(limit),
    resolveFilePath,
    fileStorageStatus,
    DOWNLOAD_TOKEN_MS,
    VIDEO_EXT,
};
