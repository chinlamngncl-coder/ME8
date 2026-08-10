/**
 * OPS-CASE-SERVER-STORE-V1
 * API-only case files under storage/ops-cases/{day}/…
 * UI desk / wire-from-Weapon|FR|ANPR|SOS = later APPLYs.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dashboardAuth = require('./dashboardAuth');

const FAMILIES = Object.freeze({ SOS: 'SOS', ANALYTICS: 'ANALYTICS' });
const TYPES = Object.freeze({
    SOS: 'SOS',
    FR: 'FR',
    ANPR: 'ANPR',
    WEAPON: 'WEAPON',
});
const PREFIX = Object.freeze({
    SOS: 'SO',
    FR: 'FR',
    ANPR: 'AN',
    WEAPON: 'WD',
});
const STATUSES = Object.freeze({
    OPEN: 'open',
    ACK_ONLY: 'ack_only',
    HAS_NOTES: 'has_notes',
    AMENDED: 'amended',
    REVIEWED: 'reviewed',
    ARCHIVED: 'archived',
});

let rootDir = null;

function init(storageDir) {
    rootDir = path.join(storageDir, 'ops-cases');
    ensureDir(rootDir);
}

function getRootDir() {
    return rootDir;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function dayStamp(isoOrDate) {
    const d = isoOrDate ? new Date(isoOrDate) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
}

function normalizeType(raw) {
    const t = String(raw || '').trim().toUpperCase();
    if (t === 'SOS' || t === 'SO') return TYPES.SOS;
    if (t === 'FR') return TYPES.FR;
    if (t === 'ANPR' || t === 'AN' || t === 'PLATE') return TYPES.ANPR;
    if (t === 'WEAPON' || t === 'WD' || t === 'GUN') return TYPES.WEAPON;
    return '';
}

function familyForType(type) {
    return type === TYPES.SOS ? FAMILIES.SOS : FAMILIES.ANALYTICS;
}

function caseDirFor(day, type) {
    const fam = familyForType(type);
    if (fam === FAMILIES.SOS) return path.join(rootDir, day, 'SOS');
    return path.join(rootDir, day, 'ANALYTICS', type);
}

function caseFilePath(day, type, caseId) {
    return path.join(caseDirFor(day, type), caseId + '.json');
}

function newCaseId(type, atIso) {
    const prefix = PREFIX[type] || 'CX';
    const day = dayStamp(atIso).replace(/-/g, '');
    const short = crypto.randomBytes(3).toString('hex');
    return prefix + '-' + day + '-' + short;
}

function newNoteId() {
    return 'n-' + crypto.randomBytes(4).toString('hex');
}

function actorName(actor) {
    if (!actor) return 'system';
    if (typeof actor === 'string') return actor.trim() || 'system';
    return String(actor.username || actor.name || 'system').trim() || 'system';
}

function isSuperAdminActor(actor) {
    if (!actor) return false;
    if (actor === true) return true;
    const role = actor.role != null ? actor.role : actor;
    return dashboardAuth.normalizeRole(role) === 'super_admin';
}

function activeNotes(caseObj) {
    return (caseObj.notes || []).filter((n) => n && !n.deletedAt);
}

function deriveStatus(caseObj) {
    /* OPS-CASE-ARCHIVE-HIDE-V1 — archived is a real flag on disk, not a UI-only filter */
    if (caseObj.archivedAt) {
        return STATUSES.ARCHIVED;
    }
    if (caseObj.statusForced === STATUSES.REVIEWED || caseObj.reviewedAt) {
        return STATUSES.REVIEWED;
    }
    /* SOS-CASE-ON-RAISE-V1 — case exists before Ack */
    if (caseObj.openUntilAck === true) {
        if (activeNotes(caseObj).length > 0) return STATUSES.HAS_NOTES;
        return STATUSES.OPEN;
    }
    const notes = caseObj.notes || [];
    const amended = notes.some((n) => n && (n.editedAt || n.deletedAt));
    if (amended) return STATUSES.AMENDED;
    if (activeNotes(caseObj).length > 0) return STATUSES.HAS_NOTES;
    return STATUSES.ACK_ONLY;
}

function touch(caseObj, actor, action, detail) {
    const at = new Date().toISOString();
    const by = actorName(actor);
    caseObj.rev = Math.max(1, (parseInt(caseObj.rev, 10) || 0) + 1);
    caseObj.status = deriveStatus(caseObj);
    caseObj.lastTouch = { at, by, action: String(action || ''), rev: caseObj.rev };
    if (!Array.isArray(caseObj.audit)) caseObj.audit = [];
    caseObj.audit.push({
        at,
        by,
        action: String(action || ''),
        rev: caseObj.rev,
        detail: detail && typeof detail === 'object' ? detail : (detail ? { text: String(detail).slice(0, 200) } : null),
    });
    if (caseObj.audit.length > 200) caseObj.audit = caseObj.audit.slice(-200);
    return caseObj;
}

function writeCase(caseObj) {
    if (!rootDir || !caseObj || !caseObj.caseId) throw new Error('ops case store not ready');
    const day = caseObj.day || dayStamp(caseObj.closedAt || caseObj.createdAt);
    const type = normalizeType(caseObj.type);
    if (!type) throw new Error('invalid case type');
    caseObj.day = day;
    caseObj.type = type;
    caseObj.family = familyForType(type);
    caseObj.status = deriveStatus(caseObj);
    const dir = caseDirFor(day, type);
    ensureDir(dir);
    const full = caseFilePath(day, type, caseObj.caseId);
    const tmp = full + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(caseObj, null, 2), 'utf8');
    fs.renameSync(tmp, full);
    return caseObj;
}

function readCaseFile(fullPath) {
    try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const obj = JSON.parse(raw);
        if (!obj || !obj.caseId) return null;
        obj.status = deriveStatus(obj);
        return obj;
    } catch (_) {
        return null;
    }
}

function findCasePathById(caseId) {
    const id = String(caseId || '').trim();
    if (!id || !rootDir || !fs.existsSync(rootDir)) return null;
    const days = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
        .map((d) => d.name);
    for (let i = 0; i < days.length; i += 1) {
        const day = days[i];
        const candidates = [
            path.join(rootDir, day, 'SOS', id + '.json'),
            path.join(rootDir, day, 'ANALYTICS', 'FR', id + '.json'),
            path.join(rootDir, day, 'ANALYTICS', 'ANPR', id + '.json'),
            path.join(rootDir, day, 'ANALYTICS', 'WEAPON', id + '.json'),
        ];
        for (let j = 0; j < candidates.length; j += 1) {
            if (fs.existsSync(candidates[j])) return candidates[j];
        }
    }
    return null;
}

function getCase(caseId) {
    const full = findCasePathById(caseId);
    if (!full) return null;
    return readCaseFile(full);
}

function walkCaseFiles(maxFiles) {
    const out = [];
    const limit = Math.max(1, Math.min(5000, parseInt(maxFiles, 10) || 2000));
    if (!rootDir || !fs.existsSync(rootDir)) return out;
    const days = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
        .map((d) => d.name)
        .sort()
        .reverse();
    function pushDir(dir) {
        if (out.length >= limit || !fs.existsSync(dir)) return;
        let entries;
        try {
            entries = fs.readdirSync(dir);
        } catch (_) {
            return;
        }
        entries.forEach((name) => {
            if (out.length >= limit) return;
            if (!name.endsWith('.json') || name.endsWith('.tmp')) return;
            out.push(path.join(dir, name));
        });
    }
    days.forEach((day) => {
        if (out.length >= limit) return;
        pushDir(path.join(rootDir, day, 'SOS'));
        pushDir(path.join(rootDir, day, 'ANALYTICS', 'FR'));
        pushDir(path.join(rootDir, day, 'ANALYTICS', 'ANPR'));
        pushDir(path.join(rootDir, day, 'ANALYTICS', 'WEAPON'));
    });
    return out;
}

function publicCase(caseObj) {
    if (!caseObj) return null;
    const notes = (caseObj.notes || []).filter((n) => n && !n.deletedAt).map((n) => ({
        id: n.id,
        text: n.text,
        at: n.at,
        by: n.by,
        editedAt: n.editedAt || null,
        editedBy: n.editedBy || null,
    }));
    return {
        caseId: caseObj.caseId,
        family: caseObj.family,
        type: caseObj.type,
        day: caseObj.day,
        rev: caseObj.rev || 1,
        status: deriveStatus(caseObj),
        cameraId: caseObj.cameraId || null,
        kind: caseObj.kind || null,
        title: caseObj.title || null,
        closedAt: caseObj.closedAt || caseObj.createdAt || null,
        closedBy: caseObj.closedBy || null,
        createdAt: caseObj.createdAt || null,
        createdBy: caseObj.createdBy || null,
        reviewedAt: caseObj.reviewedAt || null,
        reviewedBy: caseObj.reviewedBy || null,
        archived: !!caseObj.archivedAt,
        archivedAt: caseObj.archivedAt || null,
        archivedBy: caseObj.archivedBy || null,
        refs: caseObj.refs || {},
        evidenceLinks: Array.isArray(caseObj.evidenceLinks) ? caseObj.evidenceLinks : [],
        notes,
        noteCount: notes.length,
        lastTouch: caseObj.lastTouch || null,
        audit: Array.isArray(caseObj.audit) ? caseObj.audit.slice(-50) : [],
    };
}

/** OPS-CASE-BIND-EVIDENCE-V1 — links only (Library file ids); media stays on Storage/FTP. */
function ensureEvidenceLinks(c) {
    if (!c) return;
    if (!Array.isArray(c.evidenceLinks)) c.evidenceLinks = [];
}

function promoteRefsToEvidenceLinks(c, by) {
    ensureEvidenceLinks(c);
    const refs = c.refs || {};
    const candidates = [
        { id: refs.serverRecordingEvidenceId, source: 'sos_server_rec' },
        { id: refs.deviceRecordingEvidenceId, source: 'sos_device_rec' },
    ];
    let changed = false;
    candidates.forEach((cand) => {
        const fid = cand.id != null ? String(cand.id).trim() : '';
        if (!fid) return;
        if (c.evidenceLinks.some((l) => l && String(l.evidenceFileId) === fid)) return;
        c.evidenceLinks.push({
            evidenceFileId: fid,
            linkedAt: new Date().toISOString(),
            linkedBy: by || 'system',
            source: cand.source,
        });
        changed = true;
    });
    return changed;
}

function linkEvidence(caseId, evidenceFileId, actor, canSeeCam, meta) {
    const fid = String(evidenceFileId || '').trim();
    if (!fid) {
        const err = new Error('evidenceFileId required');
        err.status = 400;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    ensureEvidenceLinks(c);
    if (c.evidenceLinks.some((l) => l && String(l.evidenceFileId) === fid)) {
        return publicCase(c);
    }
    const by = actorName(actor);
    c.evidenceLinks.push({
        evidenceFileId: fid,
        linkedAt: new Date().toISOString(),
        linkedBy: by,
        source: (meta && meta.source) ? String(meta.source).slice(0, 40) : 'manual',
        fileName: (meta && meta.fileName) ? String(meta.fileName).slice(0, 240) : null,
    });
    touch(c, actor, 'evidence.link', { evidenceFileId: fid });
    writeCase(c);
    return publicCase(c);
}

function unlinkEvidence(caseId, evidenceFileId, actor, canSeeCam) {
    const fid = String(evidenceFileId || '').trim();
    if (!fid) {
        const err = new Error('evidenceFileId required');
        err.status = 400;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    ensureEvidenceLinks(c);
    const before = c.evidenceLinks.length;
    c.evidenceLinks = c.evidenceLinks.filter((l) => !(l && String(l.evidenceFileId) === fid));
    if (c.evidenceLinks.length === before) {
        return publicCase(c);
    }
    touch(c, actor, 'evidence.unlink', { evidenceFileId: fid });
    writeCase(c);
    return publicCase(c);
}

/**
 * Create case (system). Used by later wire APPLYs and lab create API.
 */
function createCase(opts, actor) {
    const type = normalizeType(opts && opts.type);
    if (!type) {
        const err = new Error('type required (SOS|FR|ANPR|WEAPON)');
        err.status = 400;
        throw err;
    }
    const at = (opts && opts.closedAt) || (opts && opts.at) || new Date().toISOString();
    const day = dayStamp(at);
    const caseId = (opts && opts.caseId && String(opts.caseId).trim()) || newCaseId(type, at);
    if (findCasePathById(caseId)) {
        const err = new Error('caseId already exists');
        err.status = 409;
        throw err;
    }
    const by = actorName(actor);
    let caseObj = {
        caseId,
        family: familyForType(type),
        type,
        day,
        rev: 0,
        status: STATUSES.ACK_ONLY,
        openUntilAck: !!(opts && opts.openUntilAck),
        cameraId: opts.cameraId ? String(opts.cameraId).trim() : null,
        kind: opts.kind ? String(opts.kind).trim().slice(0, 120) : null,
        title: opts.title ? String(opts.title).trim().slice(0, 200) : null,
        closedAt: at,
        closedBy: opts.closedBy ? String(opts.closedBy).trim() : by,
        createdAt: new Date().toISOString(),
        createdBy: by,
        refs: opts.refs && typeof opts.refs === 'object' ? opts.refs : {},
        evidenceLinks: [],
        notes: [],
        audit: [],
        lastTouch: null,
    };
    if (opts.noteText && String(opts.noteText).trim()) {
        caseObj.notes.push({
            id: newNoteId(),
            text: String(opts.noteText).trim().slice(0, 4000),
            at: new Date().toISOString(),
            by,
        });
    }
    promoteRefsToEvidenceLinks(caseObj, by);
    touch(caseObj, actor, 'case.create', { type, cameraId: caseObj.cameraId });
    writeCase(caseObj);
    return publicCase(caseObj);
}

function listCases(query, canSeeCam) {
    const q = query || {};
    const days = Math.max(1, Math.min(90, parseInt(q.days, 10) || 14));
    const limit = Math.max(1, Math.min(200, parseInt(q.limit, 10) || 50));
    const typeFilter = q.type ? normalizeType(q.type) : '';
    const familyFilter = String(q.family || '').trim().toUpperCase();
    const statusFilter = String(q.status || '').trim().toLowerCase();
    const ackAgeH = q.ackOnlyAgeHours != null ? parseFloat(q.ackOnlyAgeHours) : null;
    const oldestFirst = !!q.oldestFirst || (ackAgeH != null && Number.isFinite(ackAgeH));
    /* active (default) | archived | all — real archivedAt on JSON, not client-only hide */
    const archiveMode = String(q.archive || 'active').trim().toLowerCase();

    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    const now = Date.now();
    let rows = [];
    walkCaseFiles(3000).forEach((full) => {
        const c = readCaseFile(full);
        if (!c) return;
        const t = Date.parse(c.closedAt || c.createdAt || c.day || '');
        if (Number.isFinite(t) && t < cutoff) return;
        if (typeFilter && c.type !== typeFilter) return;
        if (familyFilter === 'SOS' && c.family !== FAMILIES.SOS) return;
        if (familyFilter === 'ANALYTICS' && c.family !== FAMILIES.ANALYTICS) return;
        if (typeof canSeeCam === 'function' && c.cameraId && !canSeeCam(c.cameraId)) return;
        const isArchived = !!c.archivedAt;
        if (archiveMode === 'archived') {
            if (!isArchived) return;
        } else if (archiveMode === 'all') {
            /* include both */
        } else {
            /* active / default */
            if (isArchived) return;
        }
        const status = deriveStatus(c);
        if (statusFilter && statusFilter !== 'all' && status !== statusFilter) return;
        if (ackAgeH != null && Number.isFinite(ackAgeH)) {
            if (status !== STATUSES.ACK_ONLY) return;
            const ageH = (now - (Number.isFinite(t) ? t : now)) / 3600000;
            if (ageH < ackAgeH) return;
        }
        rows.push(publicCase(c));
    });

    rows.sort((a, b) => {
        const ta = Date.parse(a.closedAt || a.createdAt || 0) || 0;
        const tb = Date.parse(b.closedAt || b.createdAt || 0) || 0;
        return oldestFirst ? ta - tb : tb - ta;
    });
    const total = rows.length;
    rows = rows.slice(0, limit);
    return { ok: true, cases: rows, total, days, limit, archive: archiveMode === 'archived' || archiveMode === 'all' ? archiveMode : 'active' };
}

function assertCanSee(caseObj, canSeeCam) {
    if (!caseObj) return;
    if (typeof canSeeCam === 'function' && caseObj.cameraId && !canSeeCam(caseObj.cameraId)) {
        const err = new Error('Case not in your dispatch scope');
        err.status = 403;
        throw err;
    }
}

function getPublic(caseId, canSeeCam) {
    const c = getCase(caseId);
    if (!c) return null;
    assertCanSee(c, canSeeCam);
    return publicCase(c);
}

/**
 * OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1 — copy lat/lon from SOS ledger onto case refs when missing.
 * Persists so next open works without re-lookup.
 */
function attachGpsFromSos(caseId, sosEntry, actor, canSeeCam) {
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    if (!c.refs) c.refs = {};
    const lat = sosEntry && sosEntry.lat != null ? sosEntry.lat : null;
    const lon = sosEntry && sosEntry.lon != null ? sosEntry.lon : null;
    if (lat == null && lon == null) {
        return publicCase(c);
    }
    let changed = false;
    if (c.refs.lat == null && lat != null) {
        c.refs.lat = lat;
        changed = true;
    }
    if (c.refs.lon == null && lon != null) {
        c.refs.lon = lon;
        changed = true;
    }
    if (!changed) return publicCase(c);
    touch(c, actor || { username: 'system' }, 'gps.from_sos', {
        sosIncidentId: c.refs.sosIncidentId || (sosEntry && sosEntry.id) || null,
        lat: c.refs.lat,
        lon: c.refs.lon,
    });
    writeCase(c);
    return publicCase(c);
}

function addNote(caseId, text, actor, canSeeCam) {
    const body = String(text || '').trim();
    if (!body) {
        const err = new Error('note text required');
        err.status = 400;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    if (!Array.isArray(c.notes)) c.notes = [];
    const note = {
        id: newNoteId(),
        text: body.slice(0, 4000),
        at: new Date().toISOString(),
        by: actorName(actor),
    };
    c.notes.push(note);
    touch(c, actor, 'note.add', { noteId: note.id, snippet: note.text.slice(0, 80) });
    writeCase(c);
    return publicCase(c);
}

function editNote(caseId, noteId, text, actor, canSeeCam) {
    if (!isSuperAdminActor(actor)) {
        const err = new Error('Super admin required to edit past notes');
        err.status = 403;
        throw err;
    }
    const body = String(text || '').trim();
    if (!body) {
        const err = new Error('note text required');
        err.status = 400;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    const note = (c.notes || []).find((n) => n && n.id === noteId && !n.deletedAt);
    if (!note) {
        const err = new Error('Note not found');
        err.status = 404;
        throw err;
    }
    note.text = body.slice(0, 4000);
    note.editedAt = new Date().toISOString();
    note.editedBy = actorName(actor);
    touch(c, actor, 'note.edit', { noteId, snippet: note.text.slice(0, 80) });
    writeCase(c);
    return publicCase(c);
}

function deleteNote(caseId, noteId, actor, canSeeCam) {
    if (!isSuperAdminActor(actor)) {
        const err = new Error('Super admin required to delete past notes');
        err.status = 403;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    const note = (c.notes || []).find((n) => n && n.id === noteId && !n.deletedAt);
    if (!note) {
        const err = new Error('Note not found');
        err.status = 404;
        throw err;
    }
    note.deletedAt = new Date().toISOString();
    note.deletedBy = actorName(actor);
    touch(c, actor, 'note.delete', { noteId });
    writeCase(c);
    return publicCase(c);
}

function markReviewed(caseId, actor, canSeeCam) {
    if (!isSuperAdminActor(actor)) {
        const err = new Error('Super admin required to mark reviewed');
        err.status = 403;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    if (c.archivedAt) {
        const err = new Error('Restore from archive before marking reviewed');
        err.status = 400;
        throw err;
    }
    c.reviewedAt = new Date().toISOString();
    c.reviewedBy = actorName(actor);
    c.statusForced = STATUSES.REVIEWED;
    touch(c, actor, 'case.reviewed', null);
    writeCase(c);
    return publicCase(c);
}

/**
 * OPS-CASE-ARCHIVE-HIDE-V1 — soft archive: keep JSON + links on disk; hide from default list.
 * Super admin only. Does NOT delete Library media.
 */
function archiveCase(caseId, actor, canSeeCam) {
    if (!isSuperAdminActor(actor)) {
        const err = new Error('Super admin required to archive cases');
        err.status = 403;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    if (c.archivedAt) {
        return publicCase(c);
    }
    const by = actorName(actor);
    c.archivedAt = new Date().toISOString();
    c.archivedBy = by;
    touch(c, actor, 'case.archive', { archivedAt: c.archivedAt });
    writeCase(c);
    return publicCase(c);
}

/** CASE-FILE-CONTINUE-FROM-OPS-CASE-V1 — remember linked Case File on Ops Case JSON. */
function setLinkedCaseFile(caseId, caseFileId, caseFileTitle, actor, canSeeCam) {
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    if (!c.refs || typeof c.refs !== 'object') c.refs = {};
    const cfId = String(caseFileId || '').trim();
    if (!cfId) {
        const err = new Error('case file id required');
        err.status = 400;
        throw err;
    }
    c.refs.linkedCaseFileId = cfId;
    c.refs.linkedCaseFileTitle = String(caseFileTitle || '').trim() || null;
    touch(c, actor, 'casefile.link', { caseFileId: cfId });
    writeCase(c);
    return publicCase(c);
}

function unarchiveCase(caseId, actor, canSeeCam) {
    if (!isSuperAdminActor(actor)) {
        const err = new Error('Super admin required to restore archived cases');
        err.status = 403;
        throw err;
    }
    const c = getCase(caseId);
    if (!c) {
        const err = new Error('Case not found');
        err.status = 404;
        throw err;
    }
    assertCanSee(c, canSeeCam);
    if (!c.archivedAt) {
        return publicCase(c);
    }
    const prev = { archivedAt: c.archivedAt, archivedBy: c.archivedBy };
    delete c.archivedAt;
    delete c.archivedBy;
    touch(c, actor, 'case.unarchive', prev);
    writeCase(c);
    return publicCase(c);
}

/** Find SOS ops case linked to a ledger incident id (idempotent wire). */
function findBySosIncidentId(sosIncidentId) {
    const id = String(sosIncidentId || '').trim();
    if (!id || !rootDir) return null;
    const files = walkCaseFiles(3000);
    for (let i = 0; i < files.length; i += 1) {
        const c = readCaseFile(files[i]);
        if (!c || c.family !== FAMILIES.SOS) continue;
        const ref = c.refs && c.refs.sosIncidentId != null ? String(c.refs.sosIncidentId) : '';
        if (ref && ref === id) return c;
    }
    return null;
}

/**
 * SOS-CASE-ON-RAISE-V1 — ensure SO- case when SOS/fall fires (before Ack).
 * Idempotent with ensureFromSosAck (same sosIncidentId → one case).
 */
function ensureFromSosRaise(entry, actor) {
    if (!entry || !entry.id) return null;
    const existing = findBySosIncidentId(entry.id);
    if (existing) {
        return { ok: true, created: false, case: publicCase(existing) };
    }
    const raisedAt = entry.at || new Date().toISOString();
    const created = createCase({
        type: TYPES.SOS,
        cameraId: entry.cameraId || null,
        kind: entry.alarmKind || 'SOS',
        title: entry.operatorName ? String(entry.operatorName).trim().slice(0, 200) : null,
        closedAt: raisedAt,
        closedBy: 'system',
        openUntilAck: true,
        noteText: null,
        refs: {
            sosIncidentId: String(entry.id),
            sosAcknowledged: false,
            alarmTime: entry.alarmTime || null,
            raisedAt,
            serverRecordingEvidenceId: entry.serverRecordingEvidenceId || null,
            deviceRecordingEvidenceId: entry.deviceRecordingEvidenceId || null,
            /* OPS-CASE-OPEN-DESK-V1 — pin when GPS present on raise */
            lat: entry.lat != null ? entry.lat : null,
            lon: entry.lon != null ? entry.lon : null,
        },
    }, actor || { username: 'system' });
    return { ok: true, created: true, case: created };
}

/**
 * OPS-CASE-SOS-WIRE-V1 — on SOS Ack, ensure one SO- case linked to ledger id.
 * Empty ack note → status Ack only (ack_only). Non-empty SOS note seeds first case note → Has notes.
 * If case already exists from raise → clear openUntilAck and apply Ack (same caseId).
 */
function ensureFromSosAck(entry, actor) {
    if (!entry || !entry.id) return null;
    const existing = findBySosIncidentId(entry.id);
    if (existing) {
        const note = String(entry.note || '').trim();
        let changed = false;
        if (existing.openUntilAck) {
            existing.openUntilAck = false;
            changed = true;
        }
        if (!existing.refs) existing.refs = {};
        if (existing.refs.sosAcknowledged !== true) {
            existing.refs.sosAcknowledged = true;
            changed = true;
        }
        if (entry.serverRecordingEvidenceId && !existing.refs.serverRecordingEvidenceId) {
            existing.refs.serverRecordingEvidenceId = entry.serverRecordingEvidenceId;
            changed = true;
        }
        if (entry.deviceRecordingEvidenceId && !existing.refs.deviceRecordingEvidenceId) {
            existing.refs.deviceRecordingEvidenceId = entry.deviceRecordingEvidenceId;
            changed = true;
        }
        if (entry.lat != null && existing.refs.lat == null) {
            existing.refs.lat = entry.lat;
            changed = true;
        }
        if (entry.lon != null && existing.refs.lon == null) {
            existing.refs.lon = entry.lon;
            changed = true;
        }
        if (note && activeNotes(existing).length === 0) {
            if (!Array.isArray(existing.notes)) existing.notes = [];
            existing.notes.push({
                id: newNoteId(),
                text: note.slice(0, 4000),
                at: entry.ackAt || new Date().toISOString(),
                by: actorName(actor),
            });
            changed = true;
        }
        if (promoteRefsToEvidenceLinks(existing, actorName(actor))) changed = true;
        if (changed) {
            existing.closedBy = actorName(actor);
            existing.closedAt = entry.ackAt || entry.at || existing.closedAt || new Date().toISOString();
            touch(existing, actor, 'sos.ack', { sosIncidentId: entry.id });
            writeCase(existing);
        }
        return { ok: true, created: false, case: publicCase(existing), acked: changed };
    }
    const note = String(entry.note || '').trim();
    const closedAt = entry.ackAt || entry.at || new Date().toISOString();
    const created = createCase({
        type: TYPES.SOS,
        cameraId: entry.cameraId || null,
        kind: entry.alarmKind || 'SOS',
        closedAt,
        closedBy: actorName(actor),
        openUntilAck: false,
        noteText: note || null,
        refs: {
            sosIncidentId: String(entry.id),
            sosAcknowledged: true,
            alarmTime: entry.alarmTime || null,
            serverRecordingEvidenceId: entry.serverRecordingEvidenceId || null,
            deviceRecordingEvidenceId: entry.deviceRecordingEvidenceId || null,
            lat: entry.lat != null ? entry.lat : null,
            lon: entry.lon != null ? entry.lon : null,
        },
    }, actor);
    return { ok: true, created: true, case: created };
}

/** Find WEAPON ops case linked to a live hit id (idempotent wire). */
function findByWeaponHitId(weaponHitId) {
    const id = String(weaponHitId || '').trim();
    if (!id || !rootDir) return null;
    const files = walkCaseFiles(3000);
    for (let i = 0; i < files.length; i += 1) {
        const c = readCaseFile(files[i]);
        if (!c || c.type !== TYPES.WEAPON) continue;
        const ref = c.refs && c.refs.weaponHitId != null ? String(c.refs.weaponHitId) : '';
        if (ref && ref === id) return c;
    }
    return null;
}

function weaponCaseIdFromHit(hit) {
    const at = (hit && (hit.at || hit.closedAt)) || new Date().toISOString();
    const short = String((hit && hit.hitId) || 'x').replace(/[^a-zA-Z0-9]+/g, '').slice(-12) || 'x';
    return 'WD-' + dayStamp(at).replace(/-/g, '') + '-' + short;
}

/**
 * OPS-CASE-WEAPON-MIGRATE-V1 — on Ack / dismiss / overflow, ensure one WD- case.
 * No note on wire → Ack only. Notes only via Cases desk API afterward.
 */
function ensureFromWeaponHit(hit, actor) {
    if (!hit || !hit.hitId) return null;
    const hitId = String(hit.hitId).trim();
    const existing = findByWeaponHitId(hitId);
    if (existing) {
        return { ok: true, created: false, case: publicCase(existing) };
    }
    const closedAtRaw = hit.closedAt || hit.at || new Date().toISOString();
    const closedAt = typeof closedAtRaw === 'number'
        ? new Date(closedAtRaw).toISOString()
        : String(closedAtRaw);
    let caseId = hit.caseId ? String(hit.caseId).trim() : weaponCaseIdFromHit(hit);
    if (findCasePathById(caseId)) {
        caseId = newCaseId(TYPES.WEAPON, closedAt);
    }
    const created = createCase({
        type: TYPES.WEAPON,
        caseId,
        cameraId: hit.cameraId || hit.camId || null,
        kind: hit.kind || hit.cls || 'weapon',
        title: hit.deviceName ? String(hit.deviceName).trim().slice(0, 200) : null,
        closedAt,
        closedBy: actorName(actor),
        noteText: null,
        refs: {
            weaponHitId: hitId,
            cropFile: hit.cropFile || null,
            conf: hit.conf != null ? hit.conf : null,
            closedReason: hit.closedReason || hit.reason || 'ack',
            deviceName: hit.deviceName || null,
        },
    }, actor);
    return { ok: true, created: true, case: created };
}

/** Find FR ops case linked to a live hit id (idempotent wire). */
function findByFrHitId(frHitId) {
    const id = String(frHitId || '').trim();
    if (!id || !rootDir) return null;
    const files = walkCaseFiles(3000);
    for (let i = 0; i < files.length; i += 1) {
        const c = readCaseFile(files[i]);
        if (!c || c.type !== TYPES.FR) continue;
        const ref = c.refs && c.refs.frHitId != null ? String(c.refs.frHitId) : '';
        if (ref && ref === id) return c;
    }
    return null;
}

function frCaseIdFromHit(hit) {
    const at = (hit && (hit.at || hit.closedAt)) || new Date().toISOString();
    const short = String((hit && hit.hitId) || 'x').replace(/[^a-zA-Z0-9]+/g, '').slice(-12) || 'x';
    return 'FR-' + dayStamp(at).replace(/-/g, '') + '-' + short;
}

/**
 * OPS-CASE-FR-WIRE-V1 — on FR Ack / dismiss, ensure one FR- case.
 * No note on wire → Ack only. ANPR hits are not handled here.
 */
function ensureFromFrHit(hit, actor) {
    if (!hit || !hit.hitId) return null;
    const kindRaw = String(hit.kind || '').trim().toLowerCase();
    if (hit.anpr === true || kindRaw === 'anpr') {
        const err = new Error('ANPR hits use OPS-CASE-ANPR-WIRE');
        err.status = 400;
        throw err;
    }
    const hitId = String(hit.hitId).trim();
    const existing = findByFrHitId(hitId);
    if (existing) {
        return { ok: true, created: false, case: publicCase(existing) };
    }
    const closedAtRaw = hit.closedAt || hit.at || new Date().toISOString();
    const closedAt = typeof closedAtRaw === 'number'
        ? new Date(closedAtRaw).toISOString()
        : String(closedAtRaw);
    let caseId = hit.caseId ? String(hit.caseId).trim() : frCaseIdFromHit(hit);
    if (findCasePathById(caseId)) {
        caseId = newCaseId(TYPES.FR, closedAt);
    }
    const listStatus = hit.listStatus || null;
    const created = createCase({
        type: TYPES.FR,
        caseId,
        cameraId: hit.cameraId || hit.camId || null,
        kind: listStatus || hit.kind || 'fr',
        title: hit.displayName || hit.deviceLabel || hit.deviceName || null,
        closedAt,
        closedBy: actorName(actor),
        noteText: null,
        refs: {
            frHitId: hitId,
            blacklistId: hit.blacklistId || hit.listId || null,
            scorePct: hit.scorePct != null ? hit.scorePct : null,
            listStatus: listStatus,
            cropUrl: hit.cropUrl || null,
            closedReason: hit.closedReason || hit.reason || 'ack',
            deviceLabel: hit.deviceLabel || hit.deviceName || null,
        },
    }, actor);
    return { ok: true, created: true, case: created };
}

/** Find ANPR ops case linked to a live hit id (idempotent wire). */
function findByAnprHitId(anprHitId) {
    const id = String(anprHitId || '').trim();
    if (!id || !rootDir) return null;
    const files = walkCaseFiles(3000);
    for (let i = 0; i < files.length; i += 1) {
        const c = readCaseFile(files[i]);
        if (!c || c.type !== TYPES.ANPR) continue;
        const ref = c.refs && c.refs.anprHitId != null ? String(c.refs.anprHitId) : '';
        if (ref && ref === id) return c;
    }
    return null;
}

function anprCaseIdFromHit(hit) {
    const at = (hit && (hit.at || hit.closedAt)) || new Date().toISOString();
    const short = String((hit && hit.hitId) || 'x').replace(/[^a-zA-Z0-9]+/g, '').slice(-12) || 'x';
    return 'AN-' + dayStamp(at).replace(/-/g, '') + '-' + short;
}

/**
 * OPS-CASE-ANPR-WIRE-V1 — on ANPR Ack / dismiss, ensure one AN- case.
 * No note on wire → Ack only. FR hits are not handled here.
 */
function ensureFromAnprHit(hit, actor) {
    if (!hit || !hit.hitId) return null;
    const kindRaw = String(hit.kind || '').trim().toLowerCase();
    const isAnpr = hit.anpr === true || kindRaw === 'anpr';
    if (!isAnpr) {
        const err = new Error('FR hits use OPS-CASE-FR-WIRE');
        err.status = 400;
        throw err;
    }
    const hitId = String(hit.hitId).trim();
    const existing = findByAnprHitId(hitId);
    if (existing) {
        return { ok: true, created: false, case: publicCase(existing) };
    }
    const closedAtRaw = hit.closedAt || hit.at || new Date().toISOString();
    const closedAt = typeof closedAtRaw === 'number'
        ? new Date(closedAtRaw).toISOString()
        : String(closedAtRaw);
    let caseId = hit.caseId ? String(hit.caseId).trim() : anprCaseIdFromHit(hit);
    if (findCasePathById(caseId)) {
        caseId = newCaseId(TYPES.ANPR, closedAt);
    }
    const plate = hit.plate || hit.displayName || null;
    const listStatus = hit.listStatus || null;
    const created = createCase({
        type: TYPES.ANPR,
        caseId,
        cameraId: hit.cameraId || hit.camId || null,
        kind: listStatus || 'anpr',
        title: plate ? String(plate).trim().slice(0, 200) : null,
        closedAt,
        closedBy: actorName(actor),
        noteText: null,
        refs: {
            anprHitId: hitId,
            plate: plate,
            blacklistId: hit.blacklistId || hit.listId || null,
            listStatus: listStatus,
            scorePct: hit.scorePct != null ? hit.scorePct : null,
            cropUrl: hit.cropUrl || hit.vehicleUrl || hit.photoUrl || null,
            closedReason: hit.closedReason || hit.reason || 'ack',
            deviceLabel: hit.deviceLabel || hit.deviceName || null,
            reasonCode: hit.reasonCode || null,
        },
    }, actor);
    return { ok: true, created: true, case: created };
}

module.exports = {
    FAMILIES,
    TYPES,
    STATUSES,
    init,
    getRootDir,
    createCase,
    listCases,
    getCase,
    getPublic,
    attachGpsFromSos,
    addNote,
    editNote,
    deleteNote,
    markReviewed,
    findBySosIncidentId,
    ensureFromSosRaise,
    ensureFromSosAck,
    findByWeaponHitId,
    ensureFromWeaponHit,
    findByFrHitId,
    ensureFromFrHit,
    findByAnprHitId,
    ensureFromAnprHit,
    linkEvidence,
    unlinkEvidence,
    archiveCase,
    unarchiveCase,
    setLinkedCaseFile,
    newCaseId,
    deriveStatus,
    publicCase,
};
