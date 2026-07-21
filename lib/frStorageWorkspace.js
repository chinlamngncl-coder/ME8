'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PERSISTENT_DIRS = [
    'fr-blacklist',
    'fr-kept',
    'fr-snap-ledger',
];
const PERSISTENT_FILES = ['fr-settings.json'];
const TEMP_DIRS = [
    'fr-live-crops',
    'fr-verify-tmp',
    'fr-enroll-tmp',
    'fr-offline-tmp',
];
const MANAGED_DIRS = [...PERSISTENT_DIRS, ...TEMP_DIRS, 'fr-archive'];

function resolveRoot(baseDir, defaultStorageDir, settings) {
    const configured = String(
        settings && settings.frStorage && settings.frStorage.rootPath || ''
    ).trim();
    if (!configured) return path.resolve(defaultStorageDir);
    return path.isAbsolute(configured) ? path.normalize(configured) : path.resolve(baseDir, configured);
}

function layout(rootDir) {
    const root = path.resolve(rootDir);
    const dirs = {};
    MANAGED_DIRS.forEach((name) => { dirs[name] = path.join(root, name); });
    return {
        root,
        dirs,
        blacklistRoot: dirs['fr-blacklist'],
        keptRoot: dirs['fr-kept'],
        cropsRoot: dirs['fr-live-crops'],
        snapLedgerRoot: dirs['fr-snap-ledger'],
        verifyTemp: dirs['fr-verify-tmp'],
        enrollTemp: dirs['fr-enroll-tmp'],
        offlineTemp: dirs['fr-offline-tmp'],
        archiveRoot: dirs['fr-archive'],
    };
}

function testWritable(rootDir, create) {
    const root = path.resolve(rootDir);
    try {
        if (create) fs.mkdirSync(root, { recursive: true });
        if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
            return { ok: false, exists: false, writable: false, path: root, error: 'Folder not found' };
        }
        const marker = path.join(root, '.fr-write-test-' + crypto.randomBytes(6).toString('hex'));
        fs.writeFileSync(marker, 'ok', { encoding: 'utf8', flag: 'wx' });
        fs.unlinkSync(marker);
        return { ok: true, exists: true, writable: true, path: root, error: null };
    } catch (err) {
        return {
            ok: false,
            exists: fs.existsSync(root),
            writable: false,
            path: root,
            error: err && err.message ? err.message : 'Folder is not writable',
        };
    }
}

function ensureManagedLayout(rootDir) {
    const access = testWritable(rootDir, true);
    if (!access.ok) throw new Error('FR storage root is not writable: ' + access.error);
    const out = layout(rootDir);
    MANAGED_DIRS.forEach((name) => fs.mkdirSync(out.dirs[name], { recursive: true }));
    return out;
}

function persistentEntryHasData(entryPath) {
    try {
        const stat = fs.statSync(entryPath);
        return stat.isFile() || (stat.isDirectory() && fs.readdirSync(entryPath).length > 0);
    } catch (_) {
        return false;
    }
}

function verifyCopiedEntry(source, destination) {
    const sourceStat = fs.statSync(source);
    const destinationStat = fs.statSync(destination);
    if (sourceStat.isFile() !== destinationStat.isFile()
        || sourceStat.isDirectory() !== destinationStat.isDirectory()) {
        throw new Error('FR migration verification failed for ' + path.basename(source));
    }
    if (sourceStat.isFile()) {
        if (sourceStat.size !== destinationStat.size) {
            throw new Error('FR migration size mismatch for ' + path.basename(source));
        }
        return;
    }
    const sourceNames = fs.readdirSync(source).sort();
    const destinationNames = fs.readdirSync(destination).sort();
    if (sourceNames.length !== destinationNames.length
        || sourceNames.some((name, index) => name !== destinationNames[index])) {
        throw new Error('FR migration file list mismatch for ' + path.basename(source));
    }
    sourceNames.forEach((name) => {
        verifyCopiedEntry(path.join(source, name), path.join(destination, name));
    });
}

function prepareRootChange(oldRootDir, newRootDir) {
    const oldRoot = path.resolve(oldRootDir);
    const newRoot = path.resolve(newRootDir);
    const sameRoot = process.platform === 'win32'
        ? oldRoot.toLowerCase() === newRoot.toLowerCase()
        : oldRoot === newRoot;
    if (sameRoot) {
        return { changed: false, copied: [], workspace: ensureManagedLayout(newRoot) };
    }
    PERSISTENT_DIRS.forEach((name) => {
        const source = path.join(oldRoot, name);
        const relative = path.relative(source, newRoot);
        if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
            throw new Error('FR storage root cannot be inside the existing ' + name + ' folder');
        }
    });
    const access = testWritable(newRoot, true);
    if (!access.ok) throw new Error('FR storage root is not writable: ' + access.error);

    [...PERSISTENT_DIRS, ...PERSISTENT_FILES].forEach((name) => {
        const source = path.join(oldRoot, name);
        const destination = path.join(newRoot, name);
        if (persistentEntryHasData(source) && persistentEntryHasData(destination)) {
            throw new Error('FR destination already contains ' + name + '; choose an empty root');
        }
    });

    const staging = path.join(newRoot, '.fr-migrate-' + crypto.randomBytes(6).toString('hex'));
    const copied = [];
    try {
        fs.mkdirSync(staging, { recursive: false });
        [...PERSISTENT_DIRS, ...PERSISTENT_FILES].forEach((name) => {
            const source = path.join(oldRoot, name);
            if (!persistentEntryHasData(source)) return;
            const stagedDestination = path.join(staging, name);
            fs.cpSync(source, stagedDestination, { recursive: true, force: false, errorOnExist: true });
            verifyCopiedEntry(source, stagedDestination);
            copied.push(name);
        });
        copied.forEach((name) => {
            const destination = path.join(newRoot, name);
            if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
            fs.renameSync(path.join(staging, name), destination);
        });
    } catch (err) {
        try { fs.rmSync(staging, { recursive: true, force: true }); } catch (_) { /* ignore */ }
        throw err;
    }
    try { fs.rmSync(staging, { recursive: true, force: true }); } catch (_) { /* ignore */ }
    const workspace = ensureManagedLayout(newRoot);
    return { changed: true, copied, workspace };
}

module.exports = {
    PERSISTENT_DIRS,
    PERSISTENT_FILES,
    TEMP_DIRS,
    MANAGED_DIRS,
    resolveRoot,
    layout,
    testWritable,
    ensureManagedLayout,
    prepareRootChange,
};
