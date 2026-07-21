'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const evidenceUploadSafeName = require('./evidenceUploadSafeName');
const evidenceCrypto = require('./evidenceCrypto');

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const QUARANTINE_DIR = '.evidence-quarantine';
const ADMITTED_DIR = 'admitted';

const TYPE_EXTENSIONS = {
    jpeg: new Set(['.jpg', '.jpeg']),
    png: new Set(['.png']),
    gif: new Set(['.gif']),
    webp: new Set(['.webp']),
    bmp: new Set(['.bmp']),
    pdf: new Set(['.pdf']),
    iso_bmff: new Set(['.mp4', '.mov', '.m4v', '.3gp']),
    avi: new Set(['.avi']),
    matroska: new Set(['.mkv']),
    mpeg_ts: new Set(['.ts', '.dat', '.bin']),
    mpeg_ps: new Set(['.ps', '.dat', '.bin']),
    annex_b: new Set(['.h264', '.h265', '.dat', '.bin']),
    flv: new Set(['.flv']),
    asf: new Set(['.wmv']),
};

function assertInside(rootDir, candidatePath) {
    const candidate = evidenceUploadSafeName.assertPathInsideRoot(rootDir, candidatePath);
    try {
        const realRoot = fs.realpathSync(rootDir);
        const realCandidate = fs.realpathSync(candidate);
        evidenceUploadSafeName.assertPathInsideRoot(realRoot, realCandidate);
    } catch (err) {
        if (err && err.code === 'ENOENT') return candidate;
        throw err;
    }
    return candidate;
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function pendingDir(rootDir) {
    return ensureDir(path.join(path.resolve(rootDir), QUARANTINE_DIR, 'pending'));
}

function rejectedDir(rootDir) {
    const day = new Date().toISOString().slice(0, 10);
    return ensureDir(path.join(path.resolve(rootDir), QUARANTINE_DIR, 'rejected', day));
}

function admittedDir(rootDir) {
    const now = new Date();
    return ensureDir(path.join(
        path.resolve(rootDir),
        ADMITTED_DIR,
        String(now.getUTCFullYear()),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        String(now.getUTCDate()).padStart(2, '0')
    ));
}

function isManagedInternalPath(rootDir, fullPath) {
    const rel = path.relative(path.resolve(rootDir), path.resolve(fullPath));
    const first = rel.split(path.sep)[0];
    return first === QUARANTINE_DIR;
}

function classifySignature(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
    if (buf[0] === 0x4d && buf[1] === 0x5a) return 'executable';
    if (buf[0] === 0x7f && buf.slice(1, 4).toString('ascii') === 'ELF') return 'executable';
    if (buf.slice(0, 2).toString('ascii') === '#!') return 'script';
    const magic32 = buf.readUInt32BE(0);
    if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe].includes(magic32)) return 'executable';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.slice(0, 6).toString('ascii') === 'GIF87a' || buf.slice(0, 6).toString('ascii') === 'GIF89a') return 'gif';
    if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
    if (buf.slice(0, 2).toString('ascii') === 'BM') return 'bmp';
    if (buf.slice(0, 5).toString('ascii') === '%PDF-') return 'pdf';
    if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') return 'iso_bmff';
    if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'AVI ') return 'avi';
    if (buf.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'matroska';
    if (buf.slice(0, 3).toString('ascii') === 'FLV') return 'flv';
    if (buf.slice(0, 16).equals(Buffer.from([
        0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11,
        0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
    ]))) return 'asf';
    if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0xba) return 'mpeg_ps';
    if (buf.length >= 377 && buf[0] === 0x47 && buf[188] === 0x47 && buf[376] === 0x47) return 'mpeg_ts';
    if ((buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01)
        || (buf.length >= 5 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x01)) {
        return 'annex_b';
    }
    if (buf[0] === 0x50 && buf[1] === 0x4b) return 'archive';
    return null;
}

function sha256File(fullPath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(fullPath);
        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

function inspectContentStream(fullPath, prefixLimit) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const prefixParts = [];
        let prefixBytes = 0;
        let byteSize = 0;
        let stream;
        try {
            stream = evidenceCrypto.createPlainReadStream(fullPath);
        } catch (err) {
            reject(err);
            return;
        }
        stream.on('error', reject);
        stream.on('data', (chunk) => {
            hash.update(chunk);
            byteSize += chunk.length;
            if (prefixBytes < prefixLimit) {
                const take = Math.min(chunk.length, prefixLimit - prefixBytes);
                prefixParts.push(chunk.subarray(0, take));
                prefixBytes += take;
            }
        });
        stream.on('end', () => resolve({
            prefix: Buffer.concat(prefixParts),
            byteSize,
            sha256: hash.digest('hex'),
        }));
    });
}

async function inspectFile(opts) {
    const rootDir = path.resolve(opts.rootDir);
    const fullPath = assertInside(rootDir, opts.fullPath);
    const originalFileName = evidenceUploadSafeName.safeOriginalDisplayName(
        opts.originalFileName || opts.fileName || path.basename(fullPath)
    );
    const extension = evidenceUploadSafeName.safeExtension(originalFileName);
    const stat = await fs.promises.lstat(fullPath);
    const maxBytes = Number(opts.maxBytes) > 0 ? Number(opts.maxBytes) : DEFAULT_MAX_BYTES;
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Evidence must be a regular file');
    if (stat.size <= 0) throw new Error('Evidence file is empty');
    if (stat.size > maxBytes) throw new Error('Evidence file exceeds the maximum permitted size');
    const content = await inspectContentStream(fullPath, 4096);
    const afterStat = await fs.promises.lstat(fullPath);
    if (afterStat.size !== stat.size || afterStat.mtimeMs !== stat.mtimeMs) {
        throw new Error('Evidence file changed while integrity checks were running');
    }
    const detectedType = classifySignature(content.prefix);
    if (!detectedType) throw new Error('Evidence file signature is not recognized');
    if (detectedType === 'executable' || detectedType === 'script' || detectedType === 'archive') {
        throw new Error('Executable or archive content is not permitted as evidence ingest');
    }
    const compatible = TYPE_EXTENSIONS[detectedType];
    if (!compatible || !compatible.has(extension)) {
        throw new Error('Evidence extension does not match its file signature');
    }
    return {
        fullPath,
        fileName: path.basename(fullPath),
        originalFileName,
        extension,
        detectedType,
        byteSize: content.byteSize,
        sha256: content.sha256,
    };
}

async function safeMove(fromPath, toPath) {
    ensureDir(path.dirname(toPath));
    try {
        await fs.promises.rename(fromPath, toPath);
    } catch (err) {
        if (err && err.code !== 'EXDEV') throw err;
        await fs.promises.copyFile(fromPath, toPath, fs.constants.COPYFILE_EXCL);
        await fs.promises.unlink(fromPath);
    }
}

async function moveToPending(rootDir, fullPath, extension) {
    const source = assertInside(rootDir, fullPath);
    const pendingRoot = pendingDir(rootDir);
    const relative = path.relative(pendingRoot, source);
    if (relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) {
        return source;
    }
    const pendingPath = path.join(pendingRoot, 'q-' + crypto.randomUUID() + extension);
    await safeMove(source, pendingPath);
    return pendingPath;
}

async function quarantineRejected(rootDir, pendingPath, originalFileName, err, source) {
    let rejectedPath = pendingPath;
    try {
        const destination = path.join(rejectedDir(rootDir), 'q-' + crypto.randomUUID() + '.blocked');
        await safeMove(pendingPath, destination);
        rejectedPath = destination;
        await fs.promises.writeFile(destination + '.json', JSON.stringify({
            rejectedAt: new Date().toISOString(),
            originalFileName: evidenceUploadSafeName.safeOriginalDisplayName(originalFileName),
            source: source || 'unknown',
            reason: String(err && err.message || err).slice(0, 240),
        }, null, 2), 'utf8');
    } catch (_) { /* preserve pending file if quarantine finalization fails */ }
    return rejectedPath;
}

async function admitFile(opts) {
    const rootDir = path.resolve(opts.rootDir);
    const originalFileName = evidenceUploadSafeName.safeOriginalDisplayName(
        opts.originalFileName || opts.fileName || path.basename(opts.fullPath)
    );
    let extension;
    try {
        extension = evidenceUploadSafeName.safeExtension(originalFileName);
    } catch (err) {
        const blockedPending = await moveToPending(rootDir, opts.fullPath, '.blocked');
        const rejectedPath = await quarantineRejected(rootDir, blockedPending, originalFileName, err, opts.source);
        err.quarantinedPath = rejectedPath;
        throw err;
    }
    const pendingPath = await moveToPending(rootDir, opts.fullPath, extension);
    try {
        const inspected = await inspectFile(Object.assign({}, opts, {
            rootDir,
            fullPath: pendingPath,
            originalFileName,
        }));
        const admittedName = evidenceUploadSafeName.buildSafeFileName(originalFileName);
        const destination = path.join(admittedDir(rootDir), admittedName);
        await safeMove(pendingPath, destination);
        return Object.assign({}, inspected, {
            fullPath: destination,
            fileName: admittedName,
            relativePath: path.relative(rootDir, destination).replace(/\\/g, '/'),
            source: opts.source || 'unknown',
        });
    } catch (err) {
        const rejectedPath = await quarantineRejected(rootDir, pendingPath, originalFileName, err, opts.source);
        err.quarantinedPath = rejectedPath;
        throw err;
    }
}

async function quarantineFile(opts) {
    const rootDir = path.resolve(opts.rootDir);
    const fullPath = assertInside(rootDir, opts.fullPath);
    return quarantineRejected(
        rootDir,
        fullPath,
        opts.originalFileName || opts.fileName || path.basename(fullPath),
        opts.error || new Error('Evidence admission failed'),
        opts.source
    );
}

module.exports = {
    DEFAULT_MAX_BYTES,
    QUARANTINE_DIR,
    ADMITTED_DIR,
    TYPE_EXTENSIONS,
    pendingDir,
    admittedDir,
    isManagedInternalPath,
    classifySignature,
    inspectFile,
    admitFile,
    quarantineFile,
    sha256File,
};
