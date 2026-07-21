'use strict';

const crypto = require('crypto');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set([
    '.mp4', '.avi', '.mov', '.mkv', '.m4v', '.3gp', '.flv', '.wmv',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf',
    '.bin', '.h264', '.h265', '.ts', '.ps', '.dat',
]);

function safeExtension(originalName) {
    const raw = String(originalName || '');
    if (!raw || raw.indexOf('\0') >= 0 || /[\u0000-\u001f\u007f]/.test(raw)) {
        throw new Error('File name is not permitted');
    }
    const ext = path.extname(raw).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('File type not permitted');
    return ext;
}

function buildSafeFileName(originalName, uuidFactory) {
    const ext = safeExtension(originalName);
    const makeUuid = typeof uuidFactory === 'function' ? uuidFactory : crypto.randomUUID;
    const uuid = String(makeUuid()).toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)) {
        throw new Error('Secure upload identifier generation failed');
    }
    return 'ev-' + uuid + ext;
}

function assertPathInsideRoot(rootDir, candidatePath) {
    const root = path.resolve(String(rootDir || ''));
    const candidate = path.resolve(String(candidatePath || ''));
    const relative = path.relative(root, candidate);
    if (!rootDir || !candidatePath || !relative
        || relative === '..'
        || relative.startsWith('..' + path.sep)
        || path.isAbsolute(relative)) {
        throw new Error('Evidence upload path escaped its storage root');
    }
    return candidate;
}

function safeOriginalDisplayName(originalName) {
    const raw = String(originalName || '').replace(/\\/g, '/');
    const base = path.posix.basename(raw).replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return (base || 'evidence').slice(0, 240);
}

module.exports = {
    ALLOWED_EXTENSIONS,
    safeExtension,
    buildSafeFileName,
    assertPathInsideRoot,
    safeOriginalDisplayName,
};
