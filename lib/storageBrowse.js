/**
 * Server-side folder browser for evidence storage settings (super-admin only).
 */
const fs = require('fs');
const path = require('path');
const storagePaths = require('./storagePaths');
const frStorageWorkspace = require('./frStorageWorkspace');

function isWindowsDriveRoot(p) {
    return /^[A-Za-z]:\\?$/.test(String(p || '').trim());
}

function normalizeBrowsePath(input, baseDir) {
    if (input == null || input === '' || input === '__roots__') return null;
    const raw = String(input).trim();
    if (!raw) return null;
    if (/^[A-Za-z]:$/.test(raw)) return raw + ':\\';
    const norm = path.normalize(raw);
    if (path.isAbsolute(norm)) return norm;
    return path.normalize(path.join(baseDir, norm));
}

function listRoots(baseDir) {
    const roots = [];
    const appRoot = path.normalize(baseDir);
    roots.push({
        name: path.basename(appRoot) || 'Mobility',
        path: appRoot,
        hint: 'App install folder',
    });
    if (process.platform === 'win32') {
        for (let code = 65; code <= 90; code++) {
            const letter = String.fromCharCode(code);
            const drive = letter + ':\\';
            try {
                fs.accessSync(drive, fs.constants.R_OK);
                roots.push({ name: letter + ':', path: drive, hint: 'Local disk' });
            } catch (_) { /* skip */ }
        }
    } else {
        ['/', '/mnt', '/media'].forEach(function (p) {
            try {
                if (fs.existsSync(p)) roots.push({ name: p, path: path.normalize(p), hint: 'System path' });
            } catch (_) { /* skip */ }
        });
    }
    return roots;
}

function parentPath(cwd) {
    if (!cwd) return null;
    if (process.platform === 'win32' && isWindowsDriveRoot(cwd)) return '__roots__';
    const parent = path.dirname(cwd);
    if (parent === cwd) return '__roots__';
    return parent;
}

function listDirectory(baseDir, requestedPath) {
    const cwd = normalizeBrowsePath(requestedPath, baseDir);
    if (!cwd) {
        return {
            mode: 'roots',
            cwd: null,
            cwdLabel: '',
            parent: null,
            parentIsRoots: false,
            valueForSettings: '',
            entries: listRoots(baseDir).map(function (r) {
                return { name: r.name, path: r.path, hint: r.hint || '', type: 'dir' };
            }),
        };
    }
    if (!fs.existsSync(cwd)) throw new Error('Folder not found on this server');
    const st = fs.statSync(cwd);
    if (!st.isDirectory()) throw new Error('Path is not a folder');

    const entries = [];
    let readErr = null;
    try {
        for (const name of fs.readdirSync(cwd)) {
            if (name === '.' || name === '..') continue;
            const full = path.join(cwd, name);
            try {
                if (fs.statSync(full).isDirectory()) {
                    entries.push({ name: name, path: full, type: 'dir' });
                }
            } catch (_) { /* skip unreadable */ }
        }
    } catch (err) {
        readErr = err.message || 'Cannot read folder';
    }
    entries.sort(function (a, b) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const parent = parentPath(cwd);
    return {
        mode: 'dir',
        cwd: cwd,
        cwdLabel: storagePaths.displayPath(cwd, baseDir),
        parent: parent === '__roots__' ? '' : parent,
        parentIsRoots: parent === '__roots__',
        valueForSettings: storagePaths.displayPath(cwd, baseDir),
        readError: readErr,
        entries: entries,
    };
}

function resolveStartPath(baseDir, settings, kind) {
    if (kind === 'ftp') return storagePaths.resolveFtpRoot(baseDir, settings);
    if (kind === 'live') return storagePaths.resolveLiveCaptureRoot(baseDir, settings);
    if (kind === 'nas') {
        const raw = storagePaths.resolveNasMountPath(settings);
        return raw ? storagePaths.resolveNasPath(baseDir, raw) : null;
    }
    if (kind === 'fr') {
        return frStorageWorkspace.resolveRoot(baseDir, path.join(baseDir, 'storage'), settings);
    }
    return null;
}

module.exports = {
    listDirectory: listDirectory,
    resolveStartPath: resolveStartPath,
};
