/**
 * FR watchlist gallery — metadata + embeddings (not folder-scan find).
 * Photos under storage/fr-blacklist/photos/; index JSON beside.
 * Grades: poi < monitoring < suspect < blacklist (operational watch levels).
 * mob-fr-gallery-re-enroll-migrate: backup + re-embed for engine dim changes.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_ENTRIES = parseInt(process.env.FM_FR_BLACKLIST_MAX || '5000', 10) || 5000;

const LIST_STATUSES = ['poi', 'monitoring', 'suspect', 'blacklist'];
const REASON_CODES = ['theft', 'assault', 'trespass', 'fraud', 'suspicious', 'investigation', 'other'];

let rootDir = null;
let indexPath = null;
let photosDir = null;

function init(storageDir) {
    rootDir = path.join(storageDir, 'fr-blacklist');
    indexPath = path.join(rootDir, 'index.json');
    photosDir = path.join(rootDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });
    if (!fs.existsSync(indexPath)) {
        writeIndex({ version: 1, entries: [] });
    }
}

function readIndex() {
    try {
        const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        if (!raw || !Array.isArray(raw.entries)) return { version: 1, entries: [] };
        return raw;
    } catch (_) {
        return { version: 1, entries: [] };
    }
}

function writeIndex(data) {
    const tmp = indexPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, indexPath);
}

function activeCount(entries) {
    return entries.filter((e) => e && e.enabled !== false).length;
}

/** Legacy rows without listStatus → blacklist (do not silently soften). */
function normalizeListStatus(v, forLegacy) {
    const s = String(v || '').trim().toLowerCase();
    if (LIST_STATUSES.indexOf(s) >= 0) return s;
    return forLegacy ? 'blacklist' : 'suspect';
}

function normalizeReasonCode(v) {
    const s = String(v || '').trim().toLowerCase();
    if (REASON_CODES.indexOf(s) >= 0) return s;
    return 'other';
}

function normalizeSamples(e) {
    const raw = Array.isArray(e && e.samples) ? e.samples : [];
    const out = raw.filter((s) => (
        s && Array.isArray(s.embedding) && s.embedding.length >= 64 && s.enabled !== false
    ));
    if (!out.length && e && Array.isArray(e.embedding) && e.embedding.length >= 64) {
        out.push({
            sampleId: 'primary',
            source: e.enrollSource || 'primary',
            embedding: e.embedding,
            model: e.model || '',
            engine: e.engine || '',
            photoFile: e.photoFile || null,
            cropFile: e.sourceCropFile || null,
            createdAt: e.enrolledAt || null,
            createdBy: e.enrolledBy || '',
            enabled: true,
        });
    }
    return out;
}

function publicSamples(e) {
    return normalizeSamples(e).map((s) => ({
        sampleId: s.sampleId,
        source: s.source || 'sample',
        photoFile: s.photoFile || null,
        cropFile: s.cropFile || null,
        engine: s.engine || '',
        model: s.model || '',
        dims: Array.isArray(s.embedding) ? s.embedding.length : 0,
        createdAt: s.createdAt || '',
        createdBy: s.createdBy || '',
        enabled: s.enabled !== false,
    }));
}

function publicEntry(e) {
    if (!e) return null;
    const listStatus = normalizeListStatus(e.listStatus, true);
    const reasonCode = normalizeReasonCode(e.reasonCode || (e.listStatus ? 'other' : 'other'));
    return {
        id: e.id,
        displayName: e.displayName,
        idNumber: e.idNumber || '',
        notes: e.notes || '',
        listStatus,
        reasonCode,
        reasonOther: e.reasonOther || '',
        lastSeen: e.lastSeen || '',
        lastIncident: e.lastIncident || '',
        enabled: e.enabled !== false,
        model: e.model,
        engine: e.engine || '',
        enrolledAt: e.enrolledAt,
        enrolledBy: e.enrolledBy || '',
        reEmbeddedAt: e.reEmbeddedAt || '',
        photoFile: e.photoFile || null,
        dims: Array.isArray(e.embedding) ? e.embedding.length : 0,
        samples: publicSamples(e),
        sampleCount: publicSamples(e).length,
    };
}

/** Copy index.json beside itself for rollback (photos untouched). */
function backupIndex(label) {
    if (!indexPath || !fs.existsSync(indexPath)) {
        return { ok: false, code: 'fr.not_found' };
    }
    const safe = String(label || 'backup').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48) || 'backup';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(rootDir, 'index.' + safe + '-' + stamp + '.json');
    fs.copyFileSync(indexPath, dest);
    return { ok: true, backupPath: dest, backupFile: path.basename(dest) };
}

/**
 * Re-represent every gallery photo via opts.representPath (active sidecar).
 * Skips entries already tagged with the same engine (unless force).
 * Failures leave the prior embedding; progress is written after each success.
 *
 * @param {{ representPath: Function, engine: string, model?: string, force?: boolean }} opts
 */
async function migrateEmbeddings(opts) {
    opts = opts || {};
    const representPath = opts.representPath;
    const engine = String(opts.engine || '').trim().toLowerCase();
    const model = opts.model || process.env.FM_FR_MODEL || 'Facenet';
    const force = !!opts.force;
    if (typeof representPath !== 'function' || !engine) {
        return { ok: false, code: 'fr.failed' };
    }
    const bak = backupIndex('pre-' + engine);
    if (!bak.ok) return bak;

    const idx = readIndex();
    const migrated = [];
    const skipped = [];
    const failed = [];

    for (let i = 0; i < idx.entries.length; i++) {
        const e = idx.entries[i];
        if (!e || !e.id) continue;
        const samples = normalizeSamples(e);
        if (!samples.length) {
            failed.push({
                id: e.id,
                displayName: e.displayName || '',
                error: 'photo_missing',
            });
            continue;
        }
        e.samples = samples;
        let touched = false;
        let entryFailed = 0;
        let entrySkipped = 0;
        for (let j = 0; j < e.samples.length; j++) {
            const s = e.samples[j];
            const prevEngine = String(s.engine || e.engine || '').trim().toLowerCase();
            if (!force && prevEngine === engine && Array.isArray(s.embedding) && s.embedding.length >= 64) {
                entrySkipped += 1;
                continue;
            }
            const photo = s.photoFile ? path.join(photosDir, s.photoFile) : photoAbsolutePath(e);
            if (!photo || !fs.existsSync(photo)) {
                entryFailed += 1;
                failed.push({
                    id: e.id,
                    sampleId: s.sampleId || '',
                    displayName: e.displayName || '',
                    error: 'photo_missing',
                });
                continue;
            }
            let rep;
            try {
                rep = await representPath(photo, model);
            } catch (err) {
                entryFailed += 1;
                failed.push({
                    id: e.id,
                    sampleId: s.sampleId || '',
                    displayName: e.displayName || '',
                    error: String(err && err.message || err).slice(0, 200),
                });
                continue;
            }
            if (!rep || rep.ok === false || !Array.isArray(rep.embedding) || rep.embedding.length < 64) {
                entryFailed += 1;
                failed.push({
                    id: e.id,
                    sampleId: s.sampleId || '',
                    displayName: e.displayName || '',
                    error: (rep && (rep.error || rep.code || rep.message)) || 'represent_failed',
                    gate: (rep && rep.gate) || null,
                });
                continue;
            }
            s.embedding = rep.embedding;
            s.model = rep.model || model;
            s.engine = engine;
            s.reEmbeddedAt = new Date().toISOString();
            if (j === 0) {
                e.embedding = rep.embedding;
                e.model = s.model;
                e.engine = engine;
                e.photoFile = s.photoFile || e.photoFile || null;
            }
            touched = true;
        }
        if (touched) {
            e.reEmbeddedAt = new Date().toISOString();
            writeIndex(idx);
            migrated.push({
                id: e.id,
                displayName: e.displayName || '',
                dims: Array.isArray(e.embedding) ? e.embedding.length : 0,
                model: e.model,
                samples: e.samples.length,
            });
        } else if (entrySkipped && !entryFailed) {
            skipped.push({
                id: e.id,
                displayName: e.displayName || '',
                reason: 'already_engine',
                dims: Array.isArray(e.embedding) ? e.embedding.length : 0,
                samples: e.samples.length,
            });
        }
    }

    return {
        ok: true,
        engine,
        backupPath: bak.backupPath,
        backupFile: bak.backupFile,
        total: idx.entries.length,
        migrated: migrated.length,
        skipped: skipped.length,
        failed: failed.length,
        details: { migrated, skipped, failed },
    };
}

function list(opts) {
    opts = opts || {};
    const idx = readIndex();
    let entries = idx.entries.slice();
    if (opts.enabledOnly) entries = entries.filter((e) => e.enabled !== false);
    const grade = String(opts.listStatus || opts.grade || '').trim().toLowerCase();
    if (grade && LIST_STATUSES.indexOf(grade) >= 0) {
        entries = entries.filter((e) => normalizeListStatus(e.listStatus, true) === grade);
    }
    const q = String(opts.q || '').trim().toLowerCase();
    if (q) {
        entries = entries.filter((e) => {
            const pub = publicEntry(e);
            const hay = [
                pub.displayName, pub.idNumber, pub.notes, pub.lastSeen, pub.lastIncident,
                pub.listStatus, pub.reasonCode, pub.reasonOther,
            ].join(' ').toLowerCase();
            return hay.indexOf(q) >= 0;
        });
    }
    entries.sort((a, b) => String(b.enrolledAt || '').localeCompare(String(a.enrolledAt || '')));
    return {
        ok: true,
        max: MAX_ENTRIES,
        count: activeCount(idx.entries),
        total: idx.entries.length,
        entries: entries.map(publicEntry),
    };
}

function get(id) {
    const idx = readIndex();
    const e = idx.entries.find((x) => x.id === id);
    return e ? publicEntry(e) : null;
}

function getWithEmbedding(id) {
    const idx = readIndex();
    return idx.entries.find((x) => x.id === id) || null;
}

/**
 * @param {object} opts displayName, idNumber, notes, listStatus, reasonCode, reasonOther,
 *   lastSeen, lastIncident, embedding, model, photoPath, enrolledBy
 */
function enroll(opts) {
    const displayName = String(opts.displayName || '').trim();
    if (!displayName) {
        return { ok: false, code: 'fr.need_name' };
    }
    if (!Array.isArray(opts.embedding) || opts.embedding.length < 64) {
        return { ok: false, code: 'fr.failed' };
    }
    const idx = readIndex();
    if (activeCount(idx.entries) >= MAX_ENTRIES) {
        return { ok: false, code: 'fr.blacklist_full' };
    }
    const id = 'frb-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
    let photoFile = null;
    if (opts.photoPath && fs.existsSync(opts.photoPath)) {
        const ext = path.extname(opts.photoPath).toLowerCase() || '.jpg';
        photoFile = id + ext;
        fs.copyFileSync(opts.photoPath, path.join(photosDir, photoFile));
    }
    const reasonCode = normalizeReasonCode(opts.reasonCode);
    const entry = {
        id,
        displayName,
        idNumber: String(opts.idNumber || '').trim().slice(0, 64),
        notes: String(opts.notes || '').trim().slice(0, 500),
        listStatus: normalizeListStatus(opts.listStatus, false),
        reasonCode,
        reasonOther: reasonCode === 'other' ? String(opts.reasonOther || '').trim().slice(0, 200) : '',
        lastSeen: String(opts.lastSeen || '').trim().slice(0, 200),
        lastIncident: String(opts.lastIncident || '').trim().slice(0, 200),
        enabled: true,
        model: opts.model || 'Facenet',
        engine: String(opts.engine || '').trim().toLowerCase() || '',
        embedding: opts.embedding,
        photoFile,
        samples: [{
            sampleId: 'frsmp-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
            source: opts.enrollSource || 'primary',
            embedding: opts.embedding,
            model: opts.model || 'Facenet',
            engine: String(opts.engine || '').trim().toLowerCase() || '',
            photoFile,
            cropFile: opts.sourceCropFile || null,
            qualityScore: opts.qualityScore != null ? Number(opts.qualityScore) : null,
            createdAt: new Date().toISOString(),
            createdBy: String(opts.enrolledBy || '').slice(0, 80),
            enabled: true,
        }],
        enrolledAt: new Date().toISOString(),
        enrolledBy: String(opts.enrolledBy || '').slice(0, 80),
    };
    idx.entries.push(entry);
    writeIndex(idx);
    return { ok: true, entry: publicEntry(entry) };
}

function addSample(id, opts) {
    opts = opts || {};
    if (!Array.isArray(opts.embedding) || opts.embedding.length < 64) {
        return { ok: false, code: 'fr.failed' };
    }
    const idx = readIndex();
    const e = idx.entries.find((x) => x.id === id);
    if (!e) return { ok: false, code: 'fr.not_found' };
    if (!Array.isArray(e.samples)) e.samples = normalizeSamples(e);
    const sampleId = 'frsmp-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex');
    let photoFile = null;
    if (opts.photoPath && fs.existsSync(opts.photoPath)) {
        const ext = path.extname(opts.photoPath).toLowerCase() || '.jpg';
        photoFile = e.id + '-' + sampleId + ext;
        fs.copyFileSync(opts.photoPath, path.join(photosDir, photoFile));
    }
    const sample = {
        sampleId,
        source: opts.source || 'recent-face',
        embedding: opts.embedding,
        model: opts.model || e.model || 'Facenet',
        engine: String(opts.engine || e.engine || '').trim().toLowerCase(),
        photoFile,
        cropFile: opts.cropFile || null,
        qualityScore: opts.qualityScore != null ? Number(opts.qualityScore) : null,
        createdAt: new Date().toISOString(),
        createdBy: String(opts.createdBy || '').slice(0, 80),
        enabled: true,
    };
    e.samples.push(sample);
    writeIndex(idx);
    return { ok: true, entry: publicEntry(e), sample: publicSamples(e).find((s) => s.sampleId === sampleId) };
}

function setEnabled(id, enabled) {
    const idx = readIndex();
    const e = idx.entries.find((x) => x.id === id);
    if (!e) return { ok: false, code: 'fr.not_found' };
    e.enabled = !!enabled;
    writeIndex(idx);
    return { ok: true, entry: publicEntry(e) };
}

function remove(id) {
    const idx = readIndex();
    const i = idx.entries.findIndex((x) => x.id === id);
    if (i < 0) return { ok: false, code: 'fr.not_found' };
    const [e] = idx.entries.splice(i, 1);
    writeIndex(idx);
    if (e.photoFile) {
        try { fs.unlinkSync(path.join(photosDir, e.photoFile)); } catch (_) { /* ignore */ }
    }
    (Array.isArray(e.samples) ? e.samples : []).forEach((s) => {
        if (s && s.photoFile && s.photoFile !== e.photoFile) {
            try { fs.unlinkSync(path.join(photosDir, s.photoFile)); } catch (_) { /* ignore */ }
        }
    });
    return { ok: true };
}

function photoAbsolutePath(entryOrId) {
    const e = typeof entryOrId === 'string' ? getWithEmbedding(entryOrId) : entryOrId;
    if (!e || !e.photoFile) return null;
    const p = path.join(photosDir, e.photoFile);
    return fs.existsSync(p) ? p : null;
}

function samplePhotoAbsolutePath(entryId, sampleId) {
    const e = getWithEmbedding(entryId);
    if (!e) return null;
    const sample = publicSamples(e).find((s) => s.sampleId === sampleId);
    if (!sample || !sample.photoFile) return null;
    const p = path.join(photosDir, sample.photoFile);
    return fs.existsSync(p) ? p : null;
}

/** Cosine similarity 0..1 for later 1:N (enroll stores vectors now). */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        const x = Number(a[i]);
        const y = Number(b[i]);
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    if (na <= 0 || nb <= 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * 1:N against enabled gallery entries.
 * @returns {{ ok: true, match: null|object, scorePct: number, candidates: number }}
 */
function matchProbe(embedding, opts) {
    opts = opts || {};
    const minPct = Math.max(70, Math.min(99, Number(opts.minScorePct) || 75));
    if (!Array.isArray(embedding) || embedding.length < 64) {
        return { ok: false, code: 'fr.failed' };
    }
    const idx = readIndex();
    let best = null;
    let bestSample = null;
    let bestPct = 0;
    let candidates = 0;
    for (let i = 0; i < idx.entries.length; i++) {
        const e = idx.entries[i];
        if (!e || e.enabled === false) continue;
        const samples = normalizeSamples(e);
        for (let j = 0; j < samples.length; j++) {
            const s = samples[j];
            if (!Array.isArray(s.embedding) || s.embedding.length !== embedding.length) continue;
            candidates += 1;
            const sim = cosineSimilarity(embedding, s.embedding);
            const pct = Math.round(sim * 1000) / 10;
            if (pct > bestPct) {
                bestPct = pct;
                best = e;
                bestSample = s;
            }
        }
    }
    if (!best || bestPct < minPct) {
        return { ok: true, match: null, scorePct: bestPct, candidates, minScorePct: minPct };
    }
    return {
        ok: true,
        match: publicEntry(best),
        matchedSample: bestSample ? {
            sampleId: bestSample.sampleId,
            source: bestSample.source || '',
            cropFile: bestSample.cropFile || null,
        } : null,
        scorePct: bestPct,
        candidates,
        minScorePct: minPct,
    };
}

module.exports = {
    init,
    list,
    get,
    getWithEmbedding,
    enroll,
    addSample,
    setEnabled,
    remove,
    photoAbsolutePath,
    samplePhotoAbsolutePath,
    cosineSimilarity,
    matchProbe,
    backupIndex,
    migrateEmbeddings,
    normalizeListStatus,
    normalizeReasonCode,
    LIST_STATUSES,
    REASON_CODES,
    MAX_ENTRIES,
};
