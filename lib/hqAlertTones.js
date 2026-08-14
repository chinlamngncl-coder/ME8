'use strict';

const fs = require('fs');
const path = require('path');

const SLOTS = ['sos', 'analytics'];
const MAX_BYTES = 500 * 1024;
const ALLOWED_EXT = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
};

function tonesDir(storageDir) {
    return path.join(storageDir, 'hq-alert-tones');
}

function metaPath(storageDir) {
    return path.join(tonesDir(storageDir), 'meta.json');
}

function ensureDir(storageDir) {
    const dir = tonesDir(storageDir);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function defaultMeta() {
    return {
        sosMode: 'default',
        analyticsMode: 'default',
        sosFile: null,
        analyticsFile: null,
        sosOriginalName: '',
        analyticsOriginalName: '',
        updatedAt: null,
    };
}

function readMeta(storageDir) {
    try {
        const raw = fs.readFileSync(metaPath(storageDir), 'utf8');
        const j = JSON.parse(raw);
        return {
            sosMode: j.sosMode === 'custom' ? 'custom' : 'default',
            analyticsMode: j.analyticsMode === 'custom' ? 'custom' : 'default',
            sosFile: j.sosFile && typeof j.sosFile === 'string' ? j.sosFile : null,
            analyticsFile: j.analyticsFile && typeof j.analyticsFile === 'string' ? j.analyticsFile : null,
            sosOriginalName: String(j.sosOriginalName || ''),
            analyticsOriginalName: String(j.analyticsOriginalName || ''),
            updatedAt: j.updatedAt || null,
        };
    } catch (_) {
        return defaultMeta();
    }
}

function writeMeta(storageDir, meta) {
    ensureDir(storageDir);
    const next = Object.assign(defaultMeta(), meta || {}, { updatedAt: new Date().toISOString() });
    fs.writeFileSync(metaPath(storageDir), JSON.stringify(next, null, 2));
    return next;
}

function extOfName(name) {
    const ext = path.extname(String(name || '')).toLowerCase();
    return ALLOWED_EXT[ext] ? ext : null;
}

function resolveSlotFile(storageDir, slot) {
    const s = String(slot || '').toLowerCase();
    if (SLOTS.indexOf(s) < 0) return null;
    const meta = readMeta(storageDir);
    const fileKey = s === 'sos' ? 'sosFile' : 'analyticsFile';
    const modeKey = s === 'sos' ? 'sosMode' : 'analyticsMode';
    if (meta[modeKey] !== 'custom' || !meta[fileKey]) return null;
    const dir = tonesDir(storageDir);
    const full = path.resolve(dir, meta[fileKey]);
    if (!full.startsWith(path.resolve(dir))) return null;
    if (!fs.existsSync(full)) return null;
    return {
        path: full,
        contentType: ALLOWED_EXT[path.extname(full).toLowerCase()] || 'application/octet-stream',
        originalName: s === 'sos' ? meta.sosOriginalName : meta.analyticsOriginalName,
    };
}

function saveSlotUpload(storageDir, slot, file) {
    const s = String(slot || '').toLowerCase();
    if (SLOTS.indexOf(s) < 0) {
        const err = new Error('Invalid tone slot');
        err.status = 400;
        throw err;
    }
    if (!file || !file.buffer) {
        const err = new Error('Missing audio file');
        err.status = 400;
        throw err;
    }
    if (file.size > MAX_BYTES) {
        const err = new Error('Tone file too large (max 500 KB)');
        err.status = 400;
        throw err;
    }
    const ext = extOfName(file.originalname);
    if (!ext) {
        const err = new Error('Use mp3, wav, ogg, or webm');
        err.status = 400;
        throw err;
    }
    const dir = ensureDir(storageDir);
    const meta = readMeta(storageDir);
    const prevKey = s === 'sos' ? 'sosFile' : 'analyticsFile';
    if (meta[prevKey]) {
        try { fs.unlinkSync(path.join(dir, meta[prevKey])); } catch (_) { /* ignore */ }
    }
    const safeName = s + ext;
    fs.writeFileSync(path.join(dir, safeName), file.buffer);
    if (s === 'sos') {
        meta.sosMode = 'custom';
        meta.sosFile = safeName;
        meta.sosOriginalName = String(file.originalname || safeName).slice(0, 120);
    } else {
        meta.analyticsMode = 'custom';
        meta.analyticsFile = safeName;
        meta.analyticsOriginalName = String(file.originalname || safeName).slice(0, 120);
    }
    return writeMeta(storageDir, meta);
}

function clearSlot(storageDir, slot) {
    const s = String(slot || '').toLowerCase();
    if (SLOTS.indexOf(s) < 0) {
        const err = new Error('Invalid tone slot');
        err.status = 400;
        throw err;
    }
    const dir = ensureDir(storageDir);
    const meta = readMeta(storageDir);
    const fileKey = s === 'sos' ? 'sosFile' : 'analyticsFile';
    if (meta[fileKey]) {
        try { fs.unlinkSync(path.join(dir, meta[fileKey])); } catch (_) { /* ignore */ }
    }
    if (s === 'sos') {
        meta.sosMode = 'default';
        meta.sosFile = null;
        meta.sosOriginalName = '';
    } else {
        meta.analyticsMode = 'default';
        meta.analyticsFile = null;
        meta.analyticsOriginalName = '';
    }
    return writeMeta(storageDir, meta);
}

function saveModes(storageDir, body) {
    const meta = readMeta(storageDir);
    if (body && (body.sosMode === 'default' || body.sosMode === 'custom')) {
        meta.sosMode = body.sosMode;
        if (meta.sosMode === 'custom' && !meta.sosFile) meta.sosMode = 'default';
    }
    if (body && (body.analyticsMode === 'default' || body.analyticsMode === 'custom')) {
        meta.analyticsMode = body.analyticsMode;
        if (meta.analyticsMode === 'custom' && !meta.analyticsFile) meta.analyticsMode = 'default';
    }
    return writeMeta(storageDir, meta);
}

function publicMeta(storageDir) {
    const m = readMeta(storageDir);
    return {
        sosMode: m.sosMode,
        analyticsMode: m.analyticsMode,
        sosOriginalName: m.sosOriginalName,
        analyticsOriginalName: m.analyticsOriginalName,
        sosHasFile: !!(m.sosFile && fs.existsSync(path.join(tonesDir(storageDir), m.sosFile))),
        analyticsHasFile: !!(m.analyticsFile && fs.existsSync(path.join(tonesDir(storageDir), m.analyticsFile))),
        updatedAt: m.updatedAt,
    };
}

module.exports = {
    SLOTS,
    MAX_BYTES,
    ensureDir,
    readMeta,
    writeMeta,
    publicMeta,
    resolveSlotFile,
    saveSlotUpload,
    clearSlot,
    saveModes,
};
