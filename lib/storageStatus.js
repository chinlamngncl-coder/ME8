/**
 * Storage + PostgreSQL catalog health, evidence paths, NAS validation.
 */
const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');
const storagePaths = require('./storagePaths');

function dirSizeBytes(root, maxFiles) {
    if (!root || !fs.existsSync(root)) return { bytes: 0, fileCount: 0, truncated: false };
    let bytes = 0;
    let fileCount = 0;
    const cap = Math.min(50000, Math.max(100, parseInt(maxFiles, 10) || 8000));
    let truncated = false;
    function walk(dir) {
        if (truncated) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (_) {
            return;
        }
        entries.forEach(function (ent) {
            if (truncated) return;
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                walk(full);
                return;
            }
            fileCount += 1;
            if (fileCount > cap) {
                truncated = true;
                return;
            }
            try {
                bytes += fs.statSync(full).size;
            } catch (_) { /* ignore */ }
        });
    }
    walk(root);
    return { bytes: bytes, fileCount: fileCount, truncated: truncated };
}

function pathValidation(baseDir, settings) {
    const ftpRoot = storagePaths.resolveFtpRoot(baseDir, settings);
    const lcRoot = storagePaths.resolveLiveCaptureRoot(baseDir, settings);
    const nasRaw = settings.evidence && settings.evidence.nasMountPath
        ? String(settings.evidence.nasMountPath).trim()
        : '';
    const nasPath = storagePaths.resolveNasPath(baseDir, nasRaw);
    const archivePrimary = storagePaths.normalizeArchivePrimary(
        settings.evidence && settings.evidence.archivePrimary
    );
    return {
        ftp: storagePaths.pathExistsOnDisk(ftpRoot),
        ftpDetail: storagePaths.testPathAccess(ftpRoot),
        liveCapture: storagePaths.pathExistsOnDisk(lcRoot),
        liveCaptureDetail: storagePaths.testPathAccess(lcRoot),
        nas: nasRaw ? storagePaths.pathExistsOnDisk(nasPath) : null,
        nasDetail: nasRaw ? storagePaths.testPathAccess(nasPath) : null,
        archivePrimary: archivePrimary,
        networkArchive: archivePrimary === 'network',
    };
}

async function buildStatus(baseDir, storageDir, settings, opts) {
    opts = opts || {};
    const ftpRoot = storagePaths.resolveFtpRoot(baseDir, settings);
    const lcRoot = storagePaths.resolveLiveCaptureRoot(baseDir, settings);
    const nasRaw = storagePaths.resolveNasMountPath(settings);
    const nasPath = storagePaths.resolveNasPath(baseDir, nasRaw);
    const validation = pathValidation(baseDir, settings);
    const catalog = siteDb.isReady() ? await siteDb.getDatabaseStats() : null;
    const ftpScan = opts.includeDiskScan ? dirSizeBytes(ftpRoot, 8000) : null;
    const backupDir = path.join(storageDir, 'backups');
    let backupCount = 0;
    let latestBackup = null;
    try {
        if (fs.existsSync(backupDir)) {
            const files = fs.readdirSync(backupDir).filter(function (f) { return /\.pgdump$/i.test(f); });
            backupCount = files.length;
            if (files.length) {
                files.sort();
                latestBackup = files[files.length - 1];
            }
        }
    } catch (_) { /* ignore */ }
    return {
        ok: true,
        catalog: catalog,
        paths: {
            ftpRoot: ftpRoot,
            ftpLabel: storagePaths.displayPath(ftpRoot, baseDir),
            liveCaptureRoot: lcRoot,
            liveCaptureLabel: storagePaths.displayPath(lcRoot, baseDir),
            nasMountPath: nasRaw,
            nasPath: nasPath,
            storageDir: storageDir,
        },
        validation: validation,
        diskScan: ftpScan,
        backups: {
            dir: backupDir,
            count: backupCount,
            latest: latestBackup,
        },
        notes: {
            catalogEngine: 'postgresql',
            backupFormat: '.pgdump',
            videoOnDisk: 'Evidence video files stay on local disk or NAS; PostgreSQL holds catalog metadata.',
        },
    };
}

module.exports = {
    buildStatus,
    pathValidation,
    dirSizeBytes,
};
