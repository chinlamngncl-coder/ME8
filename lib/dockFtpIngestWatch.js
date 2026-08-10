/**
 * DOCK-FTP-AUTO-INGEST-WATCH-V1
 * DOCK-KEY-RESOLVE-SERIAL-V1 — folder key may be Fleet serial → map to Device ID.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const evidenceRegistry = require('./evidenceRegistry');
const evidenceIngestGate = require('./evidenceIngestGate');
const evidenceUploadSafeName = require('./evidenceUploadSafeName');

const SKIP_DIR = new Set([
    String(evidenceIngestGate.QUARANTINE_DIR || '.evidence-quarantine').toLowerCase(),
    'admitted',
    '.tmp',
    'tmp',
    'temp',
]);

const INCOMPLETE_RE = /\.(tmp|partial|part|!qb|crdownload|download)$/i;
/** Long numeric network ids in path (lab / legacy folders). */
const LONG_NUMERIC_ID_RE = /(?:^|[^0-9])(\d{20})(?:[^0-9]|$)/;

let ftpRoot = null;
let log = null;
let onAdmitted = null;
/** Optional (rawFolderKey) => deviceId | null */
let resolveDeviceKey = null;
let timer = null;
let tickBusy = false;
/** rel -> { size, mtimeMs, stableHits } */
const pendingStable = new Map();
const recentlyAdmitted = new Map();
const RECENT_TTL_MS = 10 * 60 * 1000;

function watchEnabled() {
    const raw = String(process.env.FM_DOCK_FTP_WATCH || '1').trim().toLowerCase();
    return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no');
}

function intervalMs() {
    const n = parseInt(process.env.FM_DOCK_FTP_WATCH_MS || '15000', 10);
    return Number.isFinite(n) && n >= 3000 ? n : 15000;
}

/**
 * Raw folder/filename key from relative path (serial sticker folder or network id).
 */
function parseFolderKeyFromRel(relPath) {
    const rel = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!rel) return null;
    const parts = rel.split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i += 1) {
        const seg = parts[i];
        if (SKIP_DIR.has(seg.toLowerCase())) continue;
        const m = String(seg).match(LONG_NUMERIC_ID_RE);
        if (m) return m[1];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(seg)
            && /^[A-Za-z0-9_-]{3,64}$/.test(seg)) {
            return seg;
        }
    }
    const base = parts[parts.length - 1] || '';
    const fromName = base.match(LONG_NUMERIC_ID_RE);
    if (fromName) return fromName[1];
    if (parts.length >= 2) {
        const folder = parts[0];
        if (!SKIP_DIR.has(folder.toLowerCase())
            && !/^\d{4}-\d{2}-\d{2}$/.test(folder)
            && /^[A-Za-z0-9_-]{3,64}$/.test(folder)) {
            return folder;
        }
    }
    return null;
}

/**
 * Resolve folder key → Device ID (serial map when resolveDeviceKey is configured).
 */
function parseDeviceIdFromRel(relPath) {
    const raw = parseFolderKeyFromRel(relPath);
    if (!raw) return null;
    if (typeof resolveDeviceKey === 'function') {
        try {
            const mapped = resolveDeviceKey(raw);
            if (mapped) return String(mapped).trim();
        } catch (_) { /* ignore */ }
    }
    return raw;
}

function setRoot(root) {
    ftpRoot = root ? path.resolve(root) : null;
}

function configure(opts) {
    if (opts && opts.log) log = opts.log;
    if (opts && typeof opts.onAdmitted === 'function') onAdmitted = opts.onAdmitted;
    if (opts && typeof opts.resolveDeviceKey === 'function') resolveDeviceKey = opts.resolveDeviceKey;
    if (opts && opts.ftpRoot) setRoot(opts.ftpRoot);
}

function safeRel(full) {
    if (!ftpRoot || !full) return null;
    const rootAbs = path.resolve(ftpRoot);
    const fullAbs = path.resolve(full);
    const rel = path.relative(rootAbs, fullAbs).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return rel;
}

function walkFiles(dir, out, max) {
    if (out.length >= max) return;
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
        return;
    }
    for (const ent of entries) {
        if (out.length >= max) return;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (SKIP_DIR.has(String(ent.name).toLowerCase())) continue;
            walkFiles(full, out, max);
            continue;
        }
        if (!ent.isFile()) continue;
        if (INCOMPLETE_RE.test(ent.name)) continue;
        try {
            evidenceUploadSafeName.safeExtension(ent.name);
        } catch (_) {
            continue;
        }
        const rel = safeRel(full);
        if (!rel) continue;
        out.push({ full, rel });
    }
}

function pruneRecent(now) {
    recentlyAdmitted.forEach((at, key) => {
        if (now - at > RECENT_TTL_MS) recentlyAdmitted.delete(key);
    });
}

async function admitOne(item) {
    const existing = await require('./siteDb').findEvidenceByRelative(item.rel);
    if (existing) {
        recentlyAdmitted.set(item.rel, Date.now());
        return null;
    }
    const inspected = await evidenceIngestGate.inspectFile({
        rootDir: ftpRoot,
        fullPath: item.full,
        originalFileName: path.basename(item.full),
    });
    const folderKey = parseFolderKeyFromRel(item.rel);
    const deviceId = parseDeviceIdFromRel(item.rel);
    let mtimeIso = null;
    try {
        mtimeIso = new Date(fs.statSync(item.full).mtimeMs).toISOString();
    } catch (_) { /* ignore */ }
    const evidenceId = await evidenceRegistry.registerFromUpload({
        fullPath: item.full,
        fileName: path.basename(item.full),
        rootDir: ftpRoot,
        sha256: inspected.sha256,
        byteSize: inspected.byteSize,
        source: 'dock_ftp',
        deviceId: deviceId || null,
    });
    if (!evidenceId) return null;
    recentlyAdmitted.set(item.rel, Date.now());
    const payload = {
        evidenceId,
        fullPath: item.full,
        relativePath: item.rel,
        sha256: inspected.sha256,
        byteSize: inspected.byteSize,
        detectedType: inspected.detectedType,
        folderKey: folderKey || null,
        deviceId: deviceId || null,
        fileMtime: mtimeIso,
        source: 'dock_ftp_watch',
    };
    if (typeof onAdmitted === 'function') {
        try {
            onAdmitted(payload);
        } catch (_) { /* ignore */ }
    }
    return payload;
}

async function tick() {
    if (tickBusy || !ftpRoot || !watchEnabled()) return;
    if (!fs.existsSync(ftpRoot)) return;
    tickBusy = true;
    const now = Date.now();
    pruneRecent(now);
    try {
        const files = [];
        walkFiles(ftpRoot, files, 300);
        const stillPending = new Set();
        for (const item of files) {
            if (recentlyAdmitted.has(item.rel)) continue;
            let st;
            try {
                st = fs.statSync(item.full);
            } catch (_) {
                continue;
            }
            if (!st.isFile() || !(st.size > 0)) continue;
            stillPending.add(item.rel);
            const prev = pendingStable.get(item.rel);
            if (!prev || prev.size !== st.size || prev.mtimeMs !== st.mtimeMs) {
                pendingStable.set(item.rel, { size: st.size, mtimeMs: st.mtimeMs, stableHits: 1, full: item.full, rel: item.rel });
                continue;
            }
            prev.stableHits += 1;
            if (prev.stableHits < 2) continue;
            pendingStable.delete(item.rel);
            try {
                const admitted = await admitOne(item);
                if (admitted && log) {
                    log.web.info('dock FTP auto-ingest', {
                        evidenceId: admitted.evidenceId,
                        deviceId: admitted.deviceId,
                        folderKey: admitted.folderKey || null,
                        rel: admitted.relativePath,
                        byteSize: admitted.byteSize,
                    });
                }
            } catch (err) {
                if (log) {
                    log.web.warn('dock FTP auto-ingest skipped', {
                        rel: item.rel,
                        message: err && err.message ? err.message : String(err),
                    });
                }
            }
        }
        pendingStable.forEach((_, key) => {
            if (!stillPending.has(key)) pendingStable.delete(key);
        });
    } finally {
        tickBusy = false;
    }
}

function start(opts) {
    configure(opts || {});
    stop();
    if (!watchEnabled()) {
        if (log) log.web.info('dock FTP auto-ingest watch disabled', { env: 'FM_DOCK_FTP_WATCH' });
        return { ok: false, reason: 'disabled' };
    }
    if (!ftpRoot) {
        if (log) log.web.warn('dock FTP auto-ingest watch skipped — no ftp root');
        return { ok: false, reason: 'no_root' };
    }
    const ms = intervalMs();
    timer = setInterval(() => {
        tick().catch((err) => {
            if (log) log.web.warn('dock FTP auto-ingest tick failed', { message: err.message });
        });
    }, ms);
    if (typeof timer.unref === 'function') timer.unref();
    if (log) log.web.info('dock FTP auto-ingest watch started', { ftpRoot, intervalMs: ms });
    setTimeout(() => {
        tick().catch(() => {});
    }, 2500);
    return { ok: true, ftpRoot, intervalMs: ms };
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function status() {
    return {
        enabled: watchEnabled(),
        running: !!timer,
        ftpRoot,
        intervalMs: intervalMs(),
        pendingStable: pendingStable.size,
    };
}

module.exports = {
    parseFolderKeyFromRel,
    parseDeviceIdFromRel,
    configure,
    setRoot,
    start,
    stop,
    tick,
    status,
};
