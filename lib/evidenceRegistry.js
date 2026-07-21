/**
 * Dock / NAS / cloud evidence catalog + audited download IDs.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');
const evidenceIngestGate = require('./evidenceIngestGate');
const evidenceUploadSafeName = require('./evidenceUploadSafeName');

const DOWNLOAD_TOKEN_MS = 15 * 60 * 1000;
const VIDEO_EXT = /\.(mp4|mov|avi|mkv|ts|m4v|3gp|flv|wmv|ps)$/i;

let ftpRoot = null;
let liveCaptureRoot = null;
let archiveRoot = null;
let storageDirRef = null;

function displayNameForUpload(opts) {
    const raw = (opts && (opts.originalFileName || opts.fileName))
        || path.basename((opts && opts.fullPath) || '');
    return path.basename(String(raw || '').replace(/\\/g, '/'))
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/\.tmp$/i, '')
        .slice(0, 240);
}

function init(storageDir, opts) {
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
        if (!safeRelative(rootAbs, full)) continue;
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
        if (safeRelative(rootAbs, full) && fs.existsSync(full)) {
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
        sha256: file.sha256 || null,
        deviceId: file.deviceId || null,
        operatorName: file.operatorName || null,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        peerIp: file.peerIp || null,
        syncStatus: file.syncStatus || 'synced',
    }).catch((err) => console.error('[evidence-registry] path repair persistence failed:', err.message));
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
        if (safeRelative(rootAbs, norm) && fs.existsSync(norm)) {
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
    setImmediate(async () => {
        try {
            const row = await siteDb.getEvidenceFile(id);
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

async function registerFromUpload(opts) {
    if (!siteDb.isReady() || !opts || !opts.fullPath) return null;
    if (!/^[0-9a-f]{64}$/i.test(String(opts.sha256 || ''))) {
        throw new Error('Evidence cannot enter the catalog without a verified SHA-256 hash');
    }
    const root = opts.rootDir || ftpRoot;
    const onDisk = resolveOnDiskForRegister(root, opts);
    if (!onDisk || !onDisk.relativePath) return null;
    const rel = onDisk.relativePath;
    let existing = await siteDb.findEvidenceByRelative(rel);
    if (!existing) {
        for (const variant of cleanedRelativeVariants(rel)) {
            existing = await siteDb.findEvidenceByRelative(variant);
            if (existing) break;
        }
    }
    const id = existing ? existing.id : newFileId();
    const now = new Date().toISOString();
    await siteDb.upsertEvidenceFile({
        id,
        source: opts.source || (existing && existing.source) || 'dock_ftp',
        storageTier: opts.storageTier || (existing && existing.storage_tier) || 'local',
        relativePath: rel,
        fileName: opts.originalFileName
            ? displayNameForUpload(Object.assign({}, opts, { fullPath: onDisk.fullPath }))
            : ((existing && existing.file_name)
                || displayNameForUpload(Object.assign({}, opts, { fullPath: onDisk.fullPath }))),
        byteSize: opts.byteSize != null ? Number(opts.byteSize) || 0 : (onDisk.byteSize || 0),
        sha256: String(opts.sha256).toLowerCase(),
        deviceId: opts.deviceId || (existing && existing.device_id) || null,
        operatorName: opts.operatorName || (existing && existing.operator_name) || null,
        peerIp: opts.peer || (existing && existing.peer_ip) || null,
        uploadedAt: (existing && existing.uploaded_at) || now,
        syncStatus: (existing && existing.sync_status) || 'synced',
        createdAt: existing && existing.created_at ? existing.created_at : now,
    });
    deferRepairFile(id);
    return id;
}

async function scanFtpRoot(limit, onAdmitted) {
    if (!ftpRoot || !fs.existsSync(ftpRoot)) return 0;
    const files = [];
    const max = Math.min(500, parseInt(limit, 10) || 200);
    function walk(dir) {
        if (files.length >= max) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (_) {
            return;
        }
        entries.forEach((ent) => {
            if (files.length >= max) return;
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                if (ent.name === evidenceIngestGate.QUARANTINE_DIR) return;
                walk(full);
                return;
            }
            try {
                evidenceUploadSafeName.safeExtension(ent.name);
                const rel = safeRelative(ftpRoot, full);
                if (rel) files.push({ full, rel });
            } catch (_) { /* unsupported files never enter the catalog */ }
        });
    }
    walk(ftpRoot);
    let count = 0;
    for (const item of files) {
        const full = item.full;
        const existing = await siteDb.findEvidenceByRelative(item.rel);
        try {
            const inspected = await evidenceIngestGate.inspectFile({
                rootDir: ftpRoot,
                fullPath: full,
                originalFileName: path.basename(full),
            });
            const evidenceId = await registerFromUpload({
                fullPath: full,
                fileName: path.basename(full),
                rootDir: ftpRoot,
                sha256: inspected.sha256,
                byteSize: inspected.byteSize,
                source: existing && existing.source || 'dock_ftp',
            });
            if (typeof onAdmitted === 'function') {
                onAdmitted({
                    evidenceId,
                    fullPath: full,
                    sha256: inspected.sha256,
                    byteSize: inspected.byteSize,
                    detectedType: inspected.detectedType,
                    source: existing ? 'legacy_hash_upgrade' : 'legacy_scan',
                });
            }
            count += 1;
        } catch (_) { /* legacy file remains untouched but is not admitted */ }
    }
    return count;
}

async function verifyCatalogIntegrity(limit) {
    const rows = await siteDb.listEvidenceFiles(Math.min(500, parseInt(limit, 10) || 200));
    const result = { checked: 0, matched: 0, mismatched: 0, unverified: 0, failures: [] };
    for (const file of rows) {
        if (!file.sha256) {
            result.unverified += 1;
            continue;
        }
        const root = evidenceRootFor(file);
        const rel = root && normalizeCatalogRelative(root, file.relativePath);
        const candidate = rel && path.join(root, rel);
        const fullPath = candidate && safeRelative(root, candidate) ? candidate : null;
        if (!fullPath || !fs.existsSync(fullPath)) {
            result.unverified += 1;
            continue;
        }
        try {
            const inspected = await evidenceIngestGate.inspectFile({
                rootDir: root,
                fullPath,
                originalFileName: file.fileName,
            });
            result.checked += 1;
            if (inspected.sha256.toLowerCase() === String(file.sha256).toLowerCase()) {
                result.matched += 1;
            } else {
                result.mismatched += 1;
                result.failures.push({
                    evidenceId: file.id,
                    expectedSha256: file.sha256,
                    actualSha256: inspected.sha256,
                });
            }
        } catch (err) {
            result.unverified += 1;
            result.failures.push({
                evidenceId: file.id,
                error: String(err && err.message || err).slice(0, 200),
            });
        }
    }
    return result;
}

async function listCatalog(limit) {
    const files = (await siteDb.listEvidenceFiles(limit)).map(decorateFileRow);
    const tagMap = await siteDb.listEvidenceTagsByFileId(Math.max(files.length * 2, 500));
    return files.map(function (f) {
        return Object.assign({}, f, { tags: tagMap[f.id] || [] });
    });
}

async function listCatalogPage(opts) {
    const page = await siteDb.listEvidenceFilesPage(opts || {});
    const tagMap = await siteDb.listEvidenceTagsByFileId(Math.max(page.files.length * 4, 200));
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
async function archiveFile(fileId, actor) {
    const file = await siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    if (isArchivedFile(file)) throw new Error('Evidence file is already archived');
    if (!archiveRoot) throw new Error('Archive storage is not configured');
    const src = resolveFilePath(file);
    if (!src || !fs.existsSync(src)) throw new Error('File missing on server storage');
    const safeName = path.basename(src);
    const rel = path.join(file.id, safeName).replace(/\\/g, '/');
    const dest = path.join(archiveRoot, file.id, safeName);
    if (path.resolve(dest) === path.resolve(src)) {
        await siteDb.upsertEvidenceFile(Object.assign({}, file, { storageTier: 'archived', relativePath: rel }));
        const same = decorateFileRow(await siteDb.getEvidenceFile(fileId));
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
    await siteDb.upsertEvidenceFile(Object.assign({}, file, {
        storageTier: 'archived',
        relativePath: rel,
        byteSize: byteSize,
        syncStatus: 'synced',
    }));
    const prev = await siteDb.getEvidenceMeta(fileId) || { evidenceFileId: fileId, tags: [] };
    await siteDb.upsertEvidenceMeta(Object.assign({}, prev, {
        evidenceFileId: fileId,
        notes: prev.notes || '',
        tags: Array.isArray(prev.tags) ? prev.tags : [],
        updatedBy: actor && actor.username ? actor.username : null,
    }));
    const out = decorateFileRow(await siteDb.getEvidenceFile(fileId));
    return Object.assign({}, out, { archived: true });
}

/** Move archived blob back under FTP root restored/; set tier local. */
async function restoreFile(fileId, actor) {
    const file = await siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    if (!isArchivedFile(file)) throw new Error('Evidence file is not archived');
    if (!ftpRoot) throw new Error('Evidence storage root is not configured');
    const src = resolveFilePath(file);
    if (!src || !fs.existsSync(src)) throw new Error('Archived file missing on server storage');
    const safeName = path.basename(src);
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
    await siteDb.upsertEvidenceFile(Object.assign({}, file, {
        storageTier: 'local',
        source: file.source === 'live_server' ? 'dock_ftp' : (file.source || 'dock_ftp'),
        relativePath: rel,
        byteSize: byteSize,
        syncStatus: 'synced',
    }));
    const prev = await siteDb.getEvidenceMeta(fileId) || { evidenceFileId: fileId, tags: [] };
    await siteDb.upsertEvidenceMeta(Object.assign({}, prev, {
        evidenceFileId: fileId,
        notes: prev.notes || '',
        tags: Array.isArray(prev.tags) ? prev.tags : [],
        updatedBy: actor && actor.username ? actor.username : null,
    }));
    const restored = decorateFileRow(await siteDb.getEvidenceFile(fileId));
    return Object.assign({}, restored, { archived: false });
}

async function repairCatalog(limit) {
    const rows = await siteDb.listEvidenceFiles(limit || 2000);
    let checked = 0;
    let repaired = 0;
    let missing = 0;
    for (const file of rows) {
        checked += 1;
        const beforeRel = file.relativePath;
        const beforeName = file.fileName;
        const fullPath = resolveFilePath(file);
        if (!fullPath) {
            missing += 1;
            continue;
        }
        const after = await siteDb.getEvidenceFile(file.id);
        if (after && (after.relativePath !== beforeRel || after.fileName !== beforeName)) {
            repaired += 1;
        }
    }
    return { checked, repaired, missing };
}

async function createDownloadRequest(session, fileId, clientIp) {
    const file = await siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const fullPath = resolveFilePath(file);
    if (!fullPath) throw new Error('File missing on server storage');
    const now = new Date();
    const downloadId = newDownloadId();
    const tokenExpiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_MS).toISOString();
    await siteDb.insertEvidenceDownload({
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

async function resolveStreamDownload(downloadId, session) {
    const dl = await siteDb.getEvidenceDownload(downloadId);
    if (!dl) return { error: 'Download record not found', status: 404 };
    if (session && dl.userId && session.userId !== dl.userId && session.role !== 'super_admin') {
        return { error: 'Download ID belongs to another user', status: 403 };
    }
    if (Date.parse(dl.tokenExpiresAt) < Date.now()) {
        return { error: 'Download link expired — request a new one', status: 410 };
    }
    const file = await siteDb.getEvidenceFile(dl.evidenceFileId);
    if (!file) return { error: 'Evidence file not found', status: 404 };
    const fullPath = resolveFilePath(file);
    if (!fullPath) return { error: 'File missing on storage', status: 404 };
    return { dl, file, fullPath };
}

async function markConsumed(downloadId) {
    await siteDb.markEvidenceDownloadConsumed(downloadId);
}

module.exports = {
    init,
    setArchiveRoot,
    getArchiveRoot,
    registerFromUpload,
    registerLiveCapture,
    scanFtpRoot,
    verifyCatalogIntegrity,
    repairCatalog,
    listCatalog,
    listCatalogPage,
    archiveFile,
    restoreFile,
    isArchivedFile,
    createDownloadRequest,
    resolveStreamDownload,
    markConsumed,
    getFile: async (id) => {
        const file = await siteDb.getEvidenceFile(id);
        if (!file) return null;
        return Object.assign({}, decorateFileRow(file), { archived: isArchivedFile(file) });
    },
    listDownloads: (limit) => siteDb.listEvidenceDownloads(limit),
    resolveFilePath,
    fileStorageStatus,
    DOWNLOAD_TOKEN_MS,
    VIDEO_EXT,
};
