/**
 * Enterprise audit capture store — hierarchical JPEG + DB-ready paths.
 * Path: {BASE}/storage/{module}/{YYYY-MM-DD}/{username}/{bwc_name}/
 * module = anpr | fr
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let storageRoot = null;

function init(rootDir) {
    storageRoot = rootDir
        ? path.resolve(rootDir)
        : path.resolve(path.join(__dirname, '..', 'storage'));
    try { fs.mkdirSync(storageRoot, { recursive: true }); } catch (_) { /* ignore */ }
    return storageRoot;
}

function getStorageRoot() {
    if (!storageRoot) init(null);
    return storageRoot;
}

function safeSeg(s, fallback) {
    const v = String(s == null ? '' : s).trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
    return (v || fallback || 'unknown').slice(0, 64);
}

function dayStamp(isoOrDate) {
    let d;
    try {
        d = isoOrDate ? new Date(isoOrDate) : new Date();
        if (isNaN(d.getTime())) d = new Date();
    } catch (_) {
        d = new Date();
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

/**
 * @param {'anpr'|'fr'} moduleName
 * @param {{ username?: string, bwcName?: string, camId?: string, at?: string }} meta
 */
function captureDir(moduleName, meta) {
    meta = meta || {};
    const rawMod = String(moduleName || '').toLowerCase();
    const mod = (rawMod === 'fr' || rawMod.indexOf('fr-') === 0 || rawMod.indexOf('fr_') === 0)
        ? 'fr'
        : 'anpr';
    const day = dayStamp(meta.at);
    const user = safeSeg(meta.username || meta.userId || 'system', 'system');
    const bwc = safeSeg(meta.bwcName || meta.deviceLabel || meta.camId || 'bwc', 'bwc');
    const abs = path.join(getStorageRoot(), mod, day, user, bwc);
    try { fs.mkdirSync(abs, { recursive: true }); } catch (_) { /* ignore */ }
    return {
        abs,
        relDir: [mod, day, user, bwc].join('/'),
        day,
        username: user,
        bwcName: bwc,
        module: mod,
    };
}

function normalizeRel(rel) {
    const s = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!s || s.indexOf('..') >= 0) return null;
    if (!/^(anpr|fr)\//.test(s)) return null;
    if (!/\.jpe?g$/i.test(s)) return null;
    return s;
}

/**
 * Resolve a relative storage path under {BASE}/storage safely.
 */
function resolveRel(rel) {
    const safe = normalizeRel(rel);
    if (!safe) return null;
    const abs = path.resolve(getStorageRoot(), ...safe.split('/'));
    const root = path.resolve(getStorageRoot());
    if (abs !== root && !abs.startsWith(root + path.sep)) return null;
    try {
        if (!fs.existsSync(abs)) return null;
    } catch (_) {
        return null;
    }
    return abs;
}

/**
 * Save one JPEG into the hierarchy.
 * @param {'anpr'|'fr'} moduleName
 * @param {'macro'|'micro'} kind
 * @param {Buffer} jpegBuf
 * @param {object} meta
 * @returns {{ file: string, rel: string, abs: string, url: string, day: string, username: string, bwcName: string }|null}
 */
function saveJpeg(moduleName, kind, jpegBuf, meta) {
    if (!Buffer.isBuffer(jpegBuf) || jpegBuf.length < 80) return null;
    const k = kind === 'macro' ? 'macro' : 'micro';
    const dir = captureDir(moduleName, meta);
    const stamp = Date.now();
    const hex = crypto.randomBytes(3).toString('hex');
    const file = k + '_' + stamp + '_' + hex + '.jpg';
    const abs = path.join(dir.abs, file);
    try {
        fs.writeFileSync(abs, jpegBuf);
    } catch (_) {
        return null;
    }
    const rel = dir.relDir + '/' + file;
    const urlBase = dir.module === 'fr'
        ? '/api/analytics/fr/evidence?rel='
        : '/api/analytics/anpr/evidence?rel=';
    return {
        file,
        rel,
        abs,
        url: urlBase + encodeURIComponent(rel),
        day: dir.day,
        username: dir.username,
        bwcName: dir.bwcName,
        module: dir.module,
        kind: k,
    };
}

function saveJpegB64(moduleName, kind, b64, meta) {
    if (!b64 || typeof b64 !== 'string') return null;
    let buf;
    try {
        buf = Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ''), 'base64');
    } catch (_) {
        return null;
    }
    return saveJpeg(moduleName, kind, buf, meta);
}

/**
 * Dual-save macro (context) + micro (tight crop) for audit.
 */
function saveMacroMicro(moduleName, macroBufOrB64, microBufOrB64, meta) {
    const toBuf = (v) => {
        if (!v) return null;
        if (Buffer.isBuffer(v)) return v;
        if (typeof v === 'string') {
            try {
                return Buffer.from(String(v).replace(/^data:image\/\w+;base64,/, ''), 'base64');
            } catch (_) {
                return null;
            }
        }
        return null;
    };
    const macroBuf = toBuf(macroBufOrB64);
    const microBuf = toBuf(microBufOrB64);
    const macro = macroBuf ? saveJpeg(moduleName, 'macro', macroBuf, meta) : null;
    const micro = microBuf ? saveJpeg(moduleName, 'micro', microBuf, meta) : null;
    return { macro, micro };
}

module.exports = {
    init,
    getStorageRoot,
    safeSeg,
    dayStamp,
    captureDir,
    normalizeRel,
    resolveRel,
    saveJpeg,
    saveJpegB64,
    saveMacroMicro,
};
