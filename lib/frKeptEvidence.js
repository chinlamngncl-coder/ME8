/**
 * FR kept evidence packs — operator Keep for investigation (not a second UI tab).
 * mob-fr-snap-keep-evidence-pack: storage/fr-kept/{id}.jpg + {id}.json (+ index.jsonl)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let baseDir = null;
let indexPath = null;
let dispositionLogPath = null;

const HOLD_STATUSES = ['open', 'cleared', 'linked', 'discarded'];
const CLEAR_REASONS = ['false_positive', 'known_cleared', 'duplicate', 'other'];

function init(storageDir) {
    baseDir = path.join(storageDir, 'fr-kept');
    indexPath = path.join(baseDir, 'index.jsonl');
    dispositionLogPath = path.join(baseDir, 'disposition.jsonl');
    try { fs.mkdirSync(baseDir, { recursive: true }); } catch (_) { /* ignore */ }
    ensureReadme();
}

function ensureReadme() {
    if (!baseDir) return;
    const readme = path.join(baseDir, 'README.txt');
    if (fs.existsSync(readme)) return;
    try {
        fs.writeFileSync(
            readme,
            [
                'Ubitron FR — kept snapshots for investigation',
                '',
                'Each Keep creates:',
                '  {id}.jpg   — face / scene crop',
                '  {id}.json  — cam, time, GPS, score, labels',
                '',
                'index.jsonl lists all keeps (one JSON object per line).',
                'Open Evidence → Investigation holds in the console to browse keeps.',
                'Open this folder on the server (IT) to copy files into a case.',
                '',
            ].join('\n'),
            'utf8'
        );
    } catch (_) { /* ignore */ }
}

function folderHint() {
    return baseDir || 'storage/fr-kept';
}

function absoluteDir() {
    return baseDir;
}

/**
 * @param {object} opts
 * @param {Buffer} [opts.buffer]
 * @param {string} [opts.jpegB64]
 * @returns {{ ok: boolean, id?: string, folderHint?: string, jsonFile?: string, jpgFile?: string, error?: string }}
 */
function keep(opts) {
    if (!baseDir) {
        return { ok: false, error: 'not_initialized' };
    }
    opts = opts || {};
    let buf = opts.buffer || null;
    if (!buf && opts.jpegB64) {
        try {
            buf = Buffer.from(String(opts.jpegB64).replace(/^data:image\/\w+;base64,/, ''), 'base64');
        } catch (_) {
            return { ok: false, error: 'bad_image' };
        }
    }
    if (!buf || buf.length < 80) {
        return { ok: false, error: 'bad_image' };
    }

    const id = 'frk-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
    const jpgFile = id + '.jpg';
    const jsonFile = id + '.json';
    const meta = {
        id,
        keptAt: new Date().toISOString(),
        camId: String(opts.camId || '').trim() || null,
        deviceLabel: opts.deviceLabel != null ? String(opts.deviceLabel) : null,
        at: opts.at || null,
        lat: Number.isFinite(Number(opts.lat)) ? Number(opts.lat) : null,
        lon: Number.isFinite(Number(opts.lon)) ? Number(opts.lon) : null,
        scorePct: opts.scorePct != null && Number.isFinite(Number(opts.scorePct))
            ? Number(opts.scorePct)
            : null,
        match: !!opts.match,
        displayName: opts.displayName != null ? String(opts.displayName) : null,
        blacklistId: opts.blacklistId || null,
        hitId: opts.hitId || null,
        source: opts.source || 'operator-keep',
        jpgFile,
        jsonFile,
        folderHint: folderHint(),
        status: 'open',
    };

    try {
        fs.writeFileSync(path.join(baseDir, jpgFile), buf);
        fs.writeFileSync(path.join(baseDir, jsonFile), JSON.stringify(meta, null, 2), 'utf8');
        fs.appendFileSync(indexPath, JSON.stringify(meta) + '\n', 'utf8');
    } catch (err) {
        try { fs.unlinkSync(path.join(baseDir, jpgFile)); } catch (_) { /* ignore */ }
        try { fs.unlinkSync(path.join(baseDir, jsonFile)); } catch (_) { /* ignore */ }
        return { ok: false, error: String(err && err.message || err).slice(0, 120) };
    }

    return {
        ok: true,
        id,
        folderHint: folderHint(),
        jpgFile,
        jsonFile,
        meta,
    };
}

function normalizeStatus(row) {
    const s = String((row && row.status) || 'open').toLowerCase();
    return HOLD_STATUSES.includes(s) ? s : 'open';
}

function readJsonMeta(id) {
    if (!baseDir || !id) return null;
    const jp = path.join(baseDir, String(id) + '.json');
    try {
        if (fs.existsSync(jp)) return JSON.parse(fs.readFileSync(jp, 'utf8'));
    } catch (_) { /* ignore */ }
    return null;
}

function writeJsonMeta(meta) {
    if (!baseDir || !meta || !meta.id) return false;
    try {
        fs.writeFileSync(path.join(baseDir, meta.id + '.json'), JSON.stringify(meta, null, 2), 'utf8');
        return true;
    } catch (_) {
        return false;
    }
}

function appendDispositionLog(entry) {
    if (!dispositionLogPath) return;
    try {
        fs.appendFileSync(dispositionLogPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_) { /* ignore */ }
}

function enrichRow(row) {
    if (!row || !row.id) return row;
    const disk = readJsonMeta(row.id);
    const merged = Object.assign({}, row, disk || {});
    merged.status = normalizeStatus(merged);
    return merged;
}

function readIndexEntries() {
    const byId = Object.create(null);
    if (!indexPath || !fs.existsSync(indexPath)) return [];
    try {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            try {
                const row = JSON.parse(line);
                if (row && row.id) byId[row.id] = row;
            } catch (_) { /* skip */ }
        }
    } catch (_) { /* ignore */ }
    return Object.keys(byId).map(function (id) { return enrichRow(byId[id]); });
}

/**
 * Newest first.
 * @param {{ limit?: number, camId?: string }} [opts]
 */
function list(opts) {
    opts = opts || {};
    let rows = readIndexEntries();
    const camFilter = opts.camId ? String(opts.camId).trim() : '';
    if (camFilter) {
        rows = rows.filter(function (r) { return String(r.camId || '') === camFilter; });
    }
    const statusRaw = String(opts.status || 'open').toLowerCase();
    const statusFilter = statusRaw === 'all' ? 'all' : (HOLD_STATUSES.includes(statusRaw) ? statusRaw : 'open');
    if (statusFilter !== 'all') {
        rows = rows.filter(function (r) { return normalizeStatus(r) === statusFilter; });
    }
    rows.sort(function (a, b) {
        const ta = Date.parse(a.keptAt || a.at || 0) || 0;
        const tb = Date.parse(b.keptAt || b.at || 0) || 0;
        return tb - ta;
    });
    const limit = Math.max(1, Math.min(500, parseInt(opts.limit, 10) || 100));
    return rows.slice(0, limit).map(function (r) {
        return Object.assign({}, r, {
            status: normalizeStatus(r),
            thumbUrl: r.id ? ('/api/analytics/fr/kept/' + encodeURIComponent(r.id) + '/jpg') : null,
            folderHint: folderHint(),
        });
    });
}

function getById(id) {
    const want = String(id || '').trim();
    if (!want || !/^frk-[a-z0-9]+-[a-f0-9]+$/i.test(want)) return null;
    const disk = readJsonMeta(want);
    if (disk) return enrichRow(disk);
    const rows = readIndexEntries();
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].id === want) return rows[i];
    }
    return null;
}

/**
 * FR-HOLDS-DISPOSITION-STATUS-V1 — clear / discard hold; files stay on disk.
 */
function setDisposition(id, opts) {
    opts = opts || {};
    const want = String(id || '').trim();
    const nextStatus = String(opts.status || '').toLowerCase();
    if (!HOLD_STATUSES.includes(nextStatus) || nextStatus === 'open' || nextStatus === 'linked') {
        return { ok: false, error: 'invalid_status' };
    }
    const row = getById(want);
    if (!row) return { ok: false, error: 'not_found' };
    if (normalizeStatus(row) !== 'open') {
        return { ok: false, error: 'not_open' };
    }
    const reason = String(opts.reason || '').trim();
    if (nextStatus === 'cleared' && !CLEAR_REASONS.includes(reason)) {
        return { ok: false, error: 'reason_required' };
    }
    const note = String(opts.note || '').trim().slice(0, 240);
    const at = new Date().toISOString();
    const meta = Object.assign({}, row, {
        status: nextStatus,
        dispositionReason: reason || (nextStatus === 'discarded' ? 'discarded' : ''),
        dispositionNote: note || null,
        dispositionAt: at,
        dispositionBy: opts.actor || null,
    });
    if (!writeJsonMeta(meta)) return { ok: false, error: 'write_failed' };
    appendDispositionLog({
        id: meta.id,
        status: nextStatus,
        reason: meta.dispositionReason,
        note: meta.dispositionNote,
        at: at,
        actor: meta.dispositionBy,
        camId: meta.camId || null,
        displayName: meta.displayName || null,
    });
    return { ok: true, hold: enrichRow(meta) };
}

function jpgAbsolutePath(idOrFile) {
    if (!baseDir) return null;
    let name = String(idOrFile || '').trim();
    if (!name) return null;
    if (!/\.jpe?g$/i.test(name)) name = name + '.jpg';
    const base = path.basename(name);
    if (!/^frk-[a-z0-9]+-[a-f0-9]+\.jpe?g$/i.test(base)) return null;
    const p = path.join(baseDir, base);
    try {
        if (fs.existsSync(p)) return p;
    } catch (_) { /* ignore */ }
    return null;
}

module.exports = {
    init,
    keep,
    list,
    getById,
    setDisposition,
    jpgAbsolutePath,
    folderHint,
    absoluteDir,
    CLEAR_REASONS,
    HOLD_STATUSES,
    normalizeStatus,
};
