/**
 * Resolve storage folder paths (install-relative default or admin-configured).
 * IP SAN / NAS: IT mounts iSCSI/NFS/SMB on this host; Mobility writes to the mount path.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_FTP_REL = path.join('storage', 'ftp-uploads');
const DEFAULT_LIVE_CAPTURE_REL = path.join('storage', 'evidence', 'live-capture');
const NETWORK_SUB = {
    ftp: path.join('mobility', 'ftp-ingest'),
    liveCapture: path.join('mobility', 'live-capture'),
    archive: path.join('mobility', 'archive'),
};

function isNetworkArchive(settings) {
    const p = settings && settings.evidence && settings.evidence.archivePrimary;
    return p === 'nas' || p === 'san' || p === 'network';
}

function normalizeArchivePrimary(raw) {
    const p = String(raw || 'local').trim().toLowerCase();
    if (p === 'nas' || p === 'san' || p === 'network') return 'network';
    return 'local';
}

function resolveConfiguredPath(baseDir, configured, defaultRel) {
    const raw = configured ? String(configured).trim() : '';
    if (!raw) return path.normalize(path.join(baseDir, defaultRel));
    if (path.isAbsolute(raw)) return path.normalize(raw);
    return path.normalize(path.join(baseDir, raw));
}

function resolveNasMountPath(settings) {
    const configured = settings && settings.evidence && settings.evidence.nasMountPath
        ? String(settings.evidence.nasMountPath).trim()
        : '';
    return configured || null;
}

function resolveNasPath(baseDir, nasMountPath) {
    const raw = nasMountPath ? String(nasMountPath).trim() : '';
    if (!raw) return null;
    if (path.isAbsolute(raw)) return path.normalize(raw);
    return path.normalize(path.join(baseDir, raw));
}

function resolveArchiveMount(baseDir, settings) {
    if (!isNetworkArchive(settings)) return null;
    return resolveNasPath(baseDir, resolveNasMountPath(settings));
}

function recommendedNetworkPaths(mountPath) {
    if (!mountPath) return null;
    const root = path.normalize(String(mountPath).trim());
    return {
        mount: root,
        ftp: path.join(root, NETWORK_SUB.ftp),
        liveCapture: path.join(root, NETWORK_SUB.liveCapture),
        archive: path.join(root, NETWORK_SUB.archive),
    };
}

function pathExistsOnDisk(fullPath) {
    if (!fullPath) return false;
    try {
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    } catch (_) {
        return false;
    }
}

function testPathAccess(fullPath) {
    const out = { path: fullPath, exists: false, writable: false, error: null };
    if (!fullPath) {
        out.error = 'Path is empty';
        return out;
    }
    try {
        out.exists = fs.existsSync(fullPath);
        if (!out.exists) {
            out.error = 'Folder not found on this server';
            return out;
        }
        const st = fs.statSync(fullPath);
        if (!st.isDirectory()) {
            out.error = 'Path is not a folder';
            return out;
        }
        fs.accessSync(fullPath, fs.constants.W_OK);
        out.writable = true;
    } catch (err) {
        out.error = err.code === 'ENOENT' ? 'Folder not found on this server' : (err.message || 'Access denied');
        if (out.exists && !out.writable) out.error = 'Folder exists but is not writable by Mobility';
    }
    return out;
}

function testWriteLifecycle(fullPath) {
    const out = { path: fullPath, writable: false, error: null };
    if (!fullPath) {
        out.error = 'Path is empty';
        return out;
    }
    const token = crypto.randomBytes(8).toString('hex');
    const first = path.join(fullPath, '.mobility-write-' + token + '.tmp');
    const second = first + '.renamed';
    try {
        fs.mkdirSync(fullPath, { recursive: true });
        fs.writeFileSync(first, token, { flag: 'wx' });
        if (fs.readFileSync(first, 'utf8') !== token) throw new Error('write verification failed');
        fs.renameSync(first, second);
        fs.unlinkSync(second);
        out.writable = true;
    } catch (err) {
        out.error = err && err.message ? err.message : 'Storage write lifecycle failed';
    } finally {
        try { fs.unlinkSync(first); } catch (_) { /* cleanup */ }
        try { fs.unlinkSync(second); } catch (_) { /* cleanup */ }
    }
    return out;
}

function resolveFtpRoot(baseDir, settings) {
    const envRoot = (process.env.FM_FTP_ROOT || '').trim();
    const configured = settings && settings.docking && settings.docking.ftpUploadPath
        ? String(settings.docking.ftpUploadPath).trim()
        : '';
    const raw = envRoot || configured;
    if (raw) {
        if (path.isAbsolute(raw)) return path.normalize(raw);
        return path.normalize(path.join(baseDir, raw));
    }
    const mount = resolveArchiveMount(baseDir, settings);
    if (mount) {
        const rec = recommendedNetworkPaths(mount);
        if (rec && rec.ftp) return rec.ftp;
    }
    return path.normalize(path.join(baseDir, DEFAULT_FTP_REL));
}

function resolveLiveCaptureRoot(baseDir, settings) {
    const envRoot = (process.env.FM_LIVE_CAPTURE_ROOT || '').trim();
    const configured = settings && settings.evidence && settings.evidence.liveCapturePath
        ? String(settings.evidence.liveCapturePath).trim()
        : '';
    const raw = envRoot || configured;
    if (raw) return resolveConfiguredPath(baseDir, raw, DEFAULT_LIVE_CAPTURE_REL);
    const mount = resolveArchiveMount(baseDir, settings);
    if (mount) {
        const rec = recommendedNetworkPaths(mount);
        if (rec && rec.liveCapture) return rec.liveCapture;
    }
    return resolveConfiguredPath(baseDir, '', DEFAULT_LIVE_CAPTURE_REL);
}

function displayPath(fullPath, baseDir) {
    if (!fullPath) return '—';
    const normBase = path.normalize(baseDir);
    const normFull = path.normalize(fullPath);
    const rel = path.relative(normBase, normFull);
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
        return rel.split(path.sep).join('/');
    }
    return normFull;
}

function ensureDir(dir) {
    if (!dir) return;
    fs.mkdirSync(dir, { recursive: true });
}

function ensureNetworkLayout(baseDir, settings) {
    const mount = resolveArchiveMount(baseDir, settings);
    if (!mount) return { ok: false, error: 'Network mount path not set' };
    const rec = recommendedNetworkPaths(mount);
    if (!rec) return { ok: false, error: 'Invalid mount path' };
    [rec.ftp, rec.liveCapture, rec.archive].forEach(function (d) { ensureDir(d); });
    return { ok: true, paths: rec };
}

module.exports = {
    DEFAULT_FTP_REL,
    DEFAULT_LIVE_CAPTURE_REL,
    NETWORK_SUB,
    isNetworkArchive,
    normalizeArchivePrimary,
    resolveFtpRoot,
    resolveLiveCaptureRoot,
    resolveNasMountPath,
    resolveNasPath,
    resolveArchiveMount,
    recommendedNetworkPaths,
    pathExistsOnDisk,
    testPathAccess,
    testWriteLifecycle,
    displayPath,
    ensureDir,
    ensureNetworkLayout,
};
