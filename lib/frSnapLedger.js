/**
 * FR snap ledger — durable face crops + index (cam, time, score, GPS).
 * mob-fr-snap-ledger: rail is ephemeral (8 cards); this is forensic memory for map/BWC trace.
 * mob-fr-snap-retention-raise: production hot defaults + capacity warn % (fleet-wide).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** Fleet-wide hot store (all BWCs). Env overrides for site policy. */
const MAX_ENTRIES = Math.max(1000, Math.min(200000, parseInt(process.env.FM_FR_SNAP_LEDGER_MAX || '50000', 10) || 50000));
const MAX_AGE_DAYS = Math.max(1, Math.min(730, parseInt(process.env.FM_FR_SNAP_LEDGER_DAYS || '90', 10) || 90));
const MAX_AGE_MS = MAX_AGE_DAYS * 86400000;
const MAX_GB = Math.max(0.5, Math.min(500, parseFloat(process.env.FM_FR_SNAP_LEDGER_GB || '5') || 5));
const MAX_BYTES = Math.floor(MAX_GB * 1024 * 1024 * 1024);
const WARN_PCT = Math.max(50, Math.min(99, parseInt(process.env.FM_FR_SNAP_LEDGER_WARN_PCT || '80', 10) || 80));
const CRITICAL_PCT = Math.max(WARN_PCT, Math.min(100, parseInt(process.env.FM_FR_SNAP_LEDGER_CRITICAL_PCT || '95', 10) || 95));

let baseDir = null;
let cropsDir = null;
let indexPath = null;
/** @type {object[]} oldest → newest */
let entries = [];
let appendsSincePrune = 0;
let getGpsFn = null;
let cachedBytes = 0;
let cachedBytesAt = 0;

function init(storageDir, options) {
    const opts = options || {};
    baseDir = path.join(storageDir, 'fr-snap-ledger');
    cropsDir = path.join(baseDir, 'crops');
    indexPath = path.join(baseDir, 'index.jsonl');
    getGpsFn = typeof opts.getGps === 'function' ? opts.getGps : null;
    try { fs.mkdirSync(cropsDir, { recursive: true }); } catch (_) { /* ignore */ }
    loadIndex();
    refreshBytes(true);
    prune(true);
}

function setGetGps(fn) {
    getGpsFn = typeof fn === 'function' ? fn : null;
}

function loadIndex() {
    entries = [];
    if (!indexPath || !fs.existsSync(indexPath)) return;
    try {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            try {
                const row = JSON.parse(line);
                if (row && row.id && row.cropFile) entries.push(row);
            } catch (_) { /* skip bad line */ }
        }
    } catch (_) {
        entries = [];
    }
}

function rewriteIndex() {
    if (!indexPath) return;
    const tmp = indexPath + '.tmp';
    const body = entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
    fs.writeFileSync(tmp, body, 'utf8');
    fs.renameSync(tmp, indexPath);
}

function refreshBytes(force) {
    if (!cropsDir) {
        cachedBytes = 0;
        return 0;
    }
    const now = Date.now();
    if (!force && cachedBytesAt && (now - cachedBytesAt) < 30000) return cachedBytes;
    let total = 0;
    try {
        const files = fs.readdirSync(cropsDir);
        for (let i = 0; i < files.length; i++) {
            if (!/\.jpe?g$/i.test(files[i])) continue;
            try {
                total += fs.statSync(path.join(cropsDir, files[i])).size || 0;
            } catch (_) { /* ignore */ }
        }
    } catch (_) {
        total = cachedBytes;
    }
    cachedBytes = total;
    cachedBytesAt = now;
    return cachedBytes;
}

function resolveGps(camId) {
    if (!getGpsFn) return { lat: null, lon: null, gpsAt: null };
    try {
        const g = getGpsFn(camId);
        if (g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lon))) {
            return {
                lat: Number(g.lat),
                lon: Number(g.lon),
                gpsAt: g.at != null ? g.at : null,
            };
        }
    } catch (_) { /* ignore */ }
    return { lat: null, lon: null, gpsAt: null };
}

function cropUrl(fileName) {
    if (!fileName) return null;
    return '/api/analytics/fr/snap/' + encodeURIComponent(fileName);
}

/**
 * Persist one snap (jpeg buffer or base64) + metadata.
 * @returns {object|null} ledger entry
 */
function record(opts) {
    if (!cropsDir || !opts) return null;
    const camId = String(opts.camId || '').trim();
    if (!camId) return null;

    let buf = opts.buffer || null;
    if (!buf && opts.jpegB64) {
        try {
            buf = Buffer.from(String(opts.jpegB64).replace(/^data:image\/\w+;base64,/, ''), 'base64');
        } catch (_) {
            return null;
        }
    }
    if (!buf || buf.length < 80) return null;

    const id = 'frs-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
    const cropFile = id + '.jpg';
    try {
        fs.writeFileSync(path.join(cropsDir, cropFile), buf);
    } catch (_) {
        return null;
    }

    const gps = resolveGps(camId);
    const entry = {
        id,
        camId,
        deviceLabel: String(opts.deviceLabel || camId),
        at: opts.at || new Date().toISOString(),
        cropFile,
        cropUrl: cropUrl(cropFile),
        scorePct: Number(opts.scorePct) || 0,
        match: !!opts.match,
        hitId: opts.hitId || null,
        blacklistId: opts.blacklistId || null,
        displayName: opts.displayName || null,
        sharpness: opts.sharpness != null ? Number(opts.sharpness) : null,
        lat: gps.lat,
        lon: gps.lon,
        gpsAt: gps.gpsAt,
        source: opts.source || 'live',
        rolling: !!opts.rolling,
        bestFrame: !!opts.bestFrame,
    };

    try {
        fs.appendFileSync(indexPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_) {
        try { fs.unlinkSync(path.join(cropsDir, cropFile)); } catch (__) { /* ignore */ }
        return null;
    }
    entries.push(entry);
    cachedBytes += buf.length;
    cachedBytesAt = Date.now();
    appendsSincePrune += 1;
    if (appendsSincePrune >= 40 || entries.length > MAX_ENTRIES || cachedBytes > MAX_BYTES) prune(false);
    return entry;
}

function prune(force) {
    if (!cropsDir) return;
    const bytes = refreshBytes(!!force);
    const overCount = entries.length > MAX_ENTRIES;
    const overBytes = bytes > MAX_BYTES;
    if (!force && appendsSincePrune < 40 && !overCount && !overBytes) {
        /* still age-prune occasionally */
        const oldest = entries[0];
        const oldT = oldest ? Date.parse(oldest.at) || 0 : 0;
        if (!(oldT > 0 && oldT < Date.now() - MAX_AGE_MS)) return;
    }
    appendsSincePrune = 0;
    const cutoff = Date.now() - MAX_AGE_MS;
    const kept = [];
    const drop = [];
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const t = Date.parse(e.at) || 0;
        if (t > 0 && t < cutoff) drop.push(e);
        else kept.push(e);
    }
    while (kept.length > MAX_ENTRIES) {
        drop.push(kept.shift());
    }
    /* Byte cap: drop oldest until under MAX_BYTES (estimate via refresh after deletes) */
    let needBytePass = overBytes || bytes > MAX_BYTES;
    if (!drop.length && kept.length === entries.length && !needBytePass) {
        entries = kept;
        return;
    }
    for (let i = 0; i < drop.length; i++) {
        const f = drop[i] && drop[i].cropFile;
        if (!f) continue;
        try { fs.unlinkSync(path.join(cropsDir, path.basename(String(f)))); } catch (_) { /* ignore */ }
    }
    entries = kept;
    let curBytes = refreshBytes(true);
    while (entries.length && curBytes > MAX_BYTES) {
        const old = entries.shift();
        if (old && old.cropFile) {
            try { fs.unlinkSync(path.join(cropsDir, path.basename(String(old.cropFile)))); } catch (_) { /* ignore */ }
        }
        curBytes = refreshBytes(true);
    }
    try { rewriteIndex(); } catch (_) { /* ignore */ }
}

/**
 * @param {object} [q]
 * @param {string} [q.camId]
 * @param {number} [q.limit]
 * @param {string} [q.before] ISO — exclusive upper bound on `at`
 * @param {boolean} [q.matchOnly]
 */
function list(q) {
    const query = q || {};
    const limit = Math.max(1, Math.min(500, parseInt(query.limit, 10) || 50));
    const camId = query.camId ? String(query.camId).trim() : '';
    const before = query.before ? String(query.before) : '';
    const matchOnly = !!query.matchOnly;
    const out = [];
    for (let i = entries.length - 1; i >= 0 && out.length < limit; i--) {
        const e = entries[i];
        if (camId && e.camId !== camId) continue;
        if (before && String(e.at) >= before) continue;
        if (matchOnly && !e.match) continue;
        out.push(e);
    }
    return out;
}

function cropAbsolutePath(fileName) {
    if (!cropsDir || !fileName) return null;
    const safe = path.basename(String(fileName));
    if (!/^frs-[\w-]+\.jpe?g$/i.test(safe) && !/\.jpe?g$/i.test(safe)) return null;
    if (!/\.jpe?g$/i.test(safe)) return null;
    const p = path.join(cropsDir, safe);
    return fs.existsSync(p) ? p : null;
}

function capacity() {
    const bytes = refreshBytes(false);
    const pctCount = MAX_ENTRIES > 0 ? (entries.length / MAX_ENTRIES) * 100 : 0;
    const pctBytes = MAX_BYTES > 0 ? (bytes / MAX_BYTES) * 100 : 0;
    const pct = Math.max(pctCount, pctBytes);
    let level = 'ok';
    if (pct >= CRITICAL_PCT) level = 'critical';
    else if (pct >= WARN_PCT) level = 'warn';
    return {
        level,
        pct: Math.round(pct * 10) / 10,
        pctCount: Math.round(pctCount * 10) / 10,
        pctBytes: Math.round(pctBytes * 10) / 10,
        warnPct: WARN_PCT,
        criticalPct: CRITICAL_PCT,
        bytes,
        maxBytes: MAX_BYTES,
        maxGb: MAX_GB,
        note: level === 'ok'
            ? null
            : (level === 'warn'
                ? 'FR snap hot store near capacity — configure archive (FTP/NAS) before prune loss'
                : 'FR snap hot store critical — archive urgently; oldest will prune'),
    };
}

function stats() {
    const cap = capacity();
    return {
        count: entries.length,
        max: MAX_ENTRIES,
        maxAgeDays: MAX_AGE_DAYS,
        maxGb: MAX_GB,
        bytes: cap.bytes,
        maxBytes: MAX_BYTES,
        capacity: cap,
        scope: 'fleet',
        dir: baseDir,
    };
}

module.exports = {
    init,
    setGetGps,
    record,
    list,
    cropAbsolutePath,
    cropUrl,
    prune,
    stats,
    capacity,
    MAX_ENTRIES,
    MAX_AGE_DAYS,
    MAX_GB,
    WARN_PCT,
    CRITICAL_PCT,
};
