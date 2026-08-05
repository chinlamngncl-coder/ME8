/**
 * ANPR plate match lists — Milestone-style plate numbers + grades.
 * ANPR-PLATE-LISTS-V1 — not face embeddings; mirror FR watchlist CRUD shape only.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_ENTRIES = parseInt(process.env.FM_ANPR_PLATE_LIST_MAX || '10000', 10) || 10000;
const LIST_STATUSES = ['suspicious', 'wanted', 'blacklist'];
const REASON_CODES = ['theft', 'assault', 'trespass', 'fraud', 'suspicious', 'investigation', 'other'];

let rootDir = null;
let indexPath = null;

function init(storageDir) {
    rootDir = path.join(storageDir, 'anpr-plate-lists');
    indexPath = path.join(rootDir, 'index.json');
    fs.mkdirSync(rootDir, { recursive: true });
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

function compactPlate(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeListStatus(v, forLegacy) {
    const s = String(v || '').trim().toLowerCase();
    if (LIST_STATUSES.indexOf(s) >= 0) return s;
    return forLegacy ? 'blacklist' : 'suspicious';
}

function normalizeReasonCode(v) {
    const s = String(v || '').trim().toLowerCase();
    if (REASON_CODES.indexOf(s) >= 0) return s;
    return 'other';
}

    function publicEntry(e) {
    if (!e) return null;
    return {
        id: e.id,
        plate: e.plate || '',
        plateCompact: e.plateCompact || compactPlate(e.plate),
        displayName: e.displayName || '',
        idNumber: e.idNumber || '',
        notes: e.notes || '',
        listStatus: normalizeListStatus(e.listStatus, true),
        reasonCode: normalizeReasonCode(e.reasonCode),
        reasonOther: e.reasonOther || '',
        registeredMake: e.registeredMake || '',
        registeredModel: e.registeredModel || '',
        registeredColor: e.registeredColor || '',
        lastSeen: e.lastSeen || '',
        lastIncident: e.lastIncident || '',
        enabled: e.enabled !== false,
        enrolledAt: e.enrolledAt || '',
        enrolledBy: e.enrolledBy || '',
    };
}

function list(opts) {
    opts = opts || {};
    const q = String(opts.q || '').trim().toLowerCase();
    const qCompact = compactPlate(opts.q || '');
    const grade = opts.listStatus ? normalizeListStatus(opts.listStatus, false) : '';
    const enabledOnly = !!opts.enabledOnly;
    const idx = readIndex();
    let rows = (idx.entries || []).map(publicEntry).filter(Boolean);
    if (enabledOnly) rows = rows.filter((e) => e.enabled);
    if (grade && LIST_STATUSES.indexOf(grade) >= 0) {
        rows = rows.filter((e) => e.listStatus === grade);
    }
    if (q || qCompact) {
        rows = rows.filter((e) => {
            const hay = [
                e.plate, e.plateCompact, e.displayName, e.idNumber, e.notes,
            ].join(' ').toLowerCase();
            if (q && hay.indexOf(q) >= 0) return true;
            if (qCompact && e.plateCompact.indexOf(qCompact) >= 0) return true;
            return false;
        });
    }
    rows.sort((a, b) => String(b.enrolledAt || '').localeCompare(String(a.enrolledAt || '')));
    return {
        ok: true,
        count: rows.length,
        max: MAX_ENTRIES,
        entries: rows,
    };
}

function get(id) {
    const want = String(id || '').trim();
    if (!want) return null;
    const idx = readIndex();
    const e = (idx.entries || []).find((x) => x && x.id === want);
    return publicEntry(e);
}

function enroll(fields) {
    fields = fields || {};
    const plateRaw = String(fields.plate || '').trim();
    const plateCompact = compactPlate(plateRaw || fields.plateCompact);
    if (!plateCompact || plateCompact.length < 3) {
        return { ok: false, code: 'anpr.need_plate', message: 'Enter a plate number.' };
    }
    const idx = readIndex();
    const active = (idx.entries || []).filter((e) => e && e.enabled !== false);
    if (active.length >= MAX_ENTRIES) {
        return { ok: false, code: 'anpr.list_full', message: 'Plate list is full.' };
    }
    const dup = (idx.entries || []).find((e) => (
        e && e.enabled !== false && compactPlate(e.plateCompact || e.plate) === plateCompact
    ));
    if (dup) {
        return { ok: false, code: 'anpr.plate_exists', message: 'That plate is already on a list.', existingId: dup.id };
    }
    const entry = {
        id: 'anp-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
        plate: plateRaw || plateCompact,
        plateCompact,
        displayName: String(fields.displayName || '').trim().slice(0, 120),
        idNumber: String(fields.idNumber || '').trim().slice(0, 64),
        notes: String(fields.notes || '').trim().slice(0, 500),
        listStatus: normalizeListStatus(fields.listStatus, false),
        reasonCode: normalizeReasonCode(fields.reasonCode),
        reasonOther: String(fields.reasonOther || '').trim().slice(0, 200),
        registeredMake: String(fields.registeredMake || fields.make || '').trim().slice(0, 64),
        registeredModel: String(fields.registeredModel || fields.model || '').trim().slice(0, 64),
        registeredColor: String(fields.registeredColor || fields.color || '').trim().slice(0, 32),
        lastSeen: String(fields.lastSeen || '').trim().slice(0, 200),
        lastIncident: String(fields.lastIncident || '').trim().slice(0, 200),
        enabled: true,
        enrolledAt: new Date().toISOString(),
        enrolledBy: String(fields.enrolledBy || '').trim().slice(0, 80),
    };
    idx.entries = idx.entries || [];
    idx.entries.push(entry);
    writeIndex(idx);
    return { ok: true, entry: publicEntry(entry) };
}

function setEnabled(id, enabled) {
    const want = String(id || '').trim();
    const idx = readIndex();
    const e = (idx.entries || []).find((x) => x && x.id === want);
    if (!e) return { ok: false, code: 'anpr.not_found' };
    e.enabled = !!enabled;
    writeIndex(idx);
    return { ok: true, entry: publicEntry(e) };
}

function remove(id) {
    const want = String(id || '').trim();
    const idx = readIndex();
    const before = (idx.entries || []).length;
    idx.entries = (idx.entries || []).filter((x) => !(x && x.id === want));
    if (idx.entries.length === before) return { ok: false, code: 'anpr.not_found' };
    writeIndex(idx);
    return { ok: true };
}

/**
 * Exact compact match (V1). Return shape mirrors frBlacklist.matchProbe contract lightly.
 */
function matchProbe(plateOrCompact) {
    const needle = compactPlate(plateOrCompact);
    if (!needle) {
        return { ok: true, match: null, scorePct: null, candidates: 0 };
    }
    const idx = readIndex();
    let candidates = 0;
    let best = null;
    for (let i = 0; i < (idx.entries || []).length; i++) {
        const e = idx.entries[i];
        if (!e || e.enabled === false) continue;
        const c = compactPlate(e.plateCompact || e.plate);
        if (!c) continue;
        candidates += 1;
        if (c === needle) {
            best = e;
            break;
        }
    }
    if (!best) {
        return { ok: true, match: null, scorePct: null, candidates };
    }
    return {
        ok: true,
        match: publicEntry(best),
        scorePct: 100,
        candidates,
    };
}

/**
 * Compare list-registered Make/Model/Color vs visual MMR. Subtle UI only.
 * @returns {{ mismatch: boolean, detail: string }|null}
 */
function mmrMismatch(listEntry, mmr) {
    if (!listEntry || !mmr) return null;
    const regMake = String(listEntry.registeredMake || '').trim();
    const regModel = String(listEntry.registeredModel || '').trim();
    const regColor = String(listEntry.registeredColor || '').trim();
    if (!regMake && !regModel && !regColor) return null;
    const visMake = String(mmr.make || '').trim();
    const visModel = String(mmr.model || '').trim();
    const visColor = String(mmr.color || '').trim();
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const parts = [];
    let bad = false;
    if (regMake && visMake && visMake.toLowerCase() !== 'unknown' && norm(regMake) !== norm(visMake)) {
        bad = true;
        parts.push('Make: ' + regMake + ' vs ' + visMake);
    }
    if (regModel && visModel && visModel.toLowerCase() !== 'unknown' && norm(regModel) !== norm(visModel)) {
        bad = true;
        parts.push('Model: ' + regModel + ' vs ' + visModel);
    }
    if (regColor && visColor && visColor.toLowerCase() !== 'unknown' && norm(regColor) !== norm(visColor)) {
        bad = true;
        parts.push('Color: ' + regColor + ' vs ' + visColor);
    }
    if (!bad) return { mismatch: false, detail: '' };
    const regLine = [regColor, regMake, regModel].filter(Boolean).join(' ') || '—';
    const visLine = [visColor, visMake, visModel].filter(Boolean).join(' ') || '—';
    return {
        mismatch: true,
        detail: 'Registered: ' + regLine + ' | Visual: ' + visLine,
        parts,
    };
}

module.exports = {
    init,
    list,
    get,
    enroll,
    setEnabled,
    remove,
    matchProbe,
    mmrMismatch,
    compactPlate,
    LIST_STATUSES,
    REASON_CODES,
    MAX_ENTRIES,
};
