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

function init(storageDir) {
    baseDir = path.join(storageDir, 'fr-kept');
    indexPath = path.join(baseDir, 'index.jsonl');
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
    return 'storage/fr-kept';
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

function readIndexEntries() {
    const out = [];
    if (!indexPath || !fs.existsSync(indexPath)) return out;
    try {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            try {
                const row = JSON.parse(line);
                if (row && row.id) out.push(row);
            } catch (_) { /* skip */ }
        }
    } catch (_) { /* ignore */ }
    return out;
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
    rows.sort(function (a, b) {
        const ta = Date.parse(a.keptAt || a.at || 0) || 0;
        const tb = Date.parse(b.keptAt || b.at || 0) || 0;
        return tb - ta;
    });
    const limit = Math.max(1, Math.min(500, parseInt(opts.limit, 10) || 100));
    return rows.slice(0, limit).map(function (r) {
        return Object.assign({}, r, {
            thumbUrl: r.id ? ('/api/analytics/fr/kept/' + encodeURIComponent(r.id) + '/jpg') : null,
            folderHint: folderHint(),
        });
    });
}

function getById(id) {
    const want = String(id || '').trim();
    if (!want || !/^frk-[a-z0-9]+-[a-f0-9]+$/i.test(want)) return null;
    const rows = readIndexEntries();
    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i] && rows[i].id === want) return rows[i];
    }
    if (!baseDir) return null;
    const jp = path.join(baseDir, want + '.json');
    try {
        if (fs.existsSync(jp)) return JSON.parse(fs.readFileSync(jp, 'utf8'));
    } catch (_) { /* ignore */ }
    return null;
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
    jpgAbsolutePath,
    folderHint,
    absoluteDir,
};
