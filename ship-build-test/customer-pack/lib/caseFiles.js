/**
 * Case Files — investigation workspace (field report + linked evidence).
 */
const crypto = require('crypto');
const fs = require('fs');
const siteDb = require('./siteDb');
const evidenceRegistry = require('./evidenceRegistry');

function newCaseId() {
    const d = new Date();
    const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
    return 'CF-' + stamp + '-' + crypto.randomBytes(3).toString('hex');
}

function actorLabel(session) {
    if (!session) return null;
    return session.displayName || session.username || session.userId || null;
}

function stripHtml(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function readSosNarrative(sosIncidents, incidentId) {
    if (!incidentId || !sosIncidents) return '';
    try {
        const reportPath = sosIncidents.getIncidentReportPath(incidentId);
        if (reportPath && fs.existsSync(reportPath)) {
            const raw = fs.readFileSync(reportPath, 'utf8');
            const text = stripHtml(raw);
            if (text) return text.slice(0, 12000);
        }
    } catch (_) { /* ignore */ }
    const dash = sosIncidents.getDashboard(500, 365);
    const entries = (dash && dash.entries) ? dash.entries : [];
    const hit = entries.find(function (e) {
        return e && (e.id === incidentId || e.incidentId === incidentId);
    });
    if (hit && hit.note) return String(hit.note).slice(0, 12000);
    return '';
}

function enrichEvidenceLinks(links) {
    return (links || []).map(function (link) {
        const file = evidenceRegistry.getFile(link.evidenceFileId);
        return {
            evidenceFileId: link.evidenceFileId,
            linkedAt: link.linkedAt,
            linkedBy: link.linkedBy,
            fileName: file ? file.fileName : null,
            operatorName: file ? file.operatorName : null,
            uploadedAt: file ? file.uploadedAt : null,
            byteSize: file ? file.byteSize : null,
            missing: !file,
        };
    });
}

function periodBounds(period) {
    if (!period || period === 'all') return { from: null, to: null };
    const now = new Date();
    const d = new Date(now);
    if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === '4weeks') d.setDate(d.getDate() - 28);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else if (period === '3months') d.setMonth(d.getMonth() - 3);
    else if (period === '6months') d.setMonth(d.getMonth() - 6);
    else if (period === 'year') d.setFullYear(d.getFullYear() - 1);
    else return { from: null, to: null };
    return { from: d.toISOString(), to: null };
}

function list(opts) {
    opts = opts || {};
    const bounds = periodBounds(opts.period);
    const from = opts.from || bounds.from;
    const to = opts.to || bounds.to;
    const rows = siteDb.listCaseFiles(opts.limit || 200, {
        q: opts.q,
        status: opts.status,
        from: from,
        to: to,
    });
    return rows.map(function (row) {
        return Object.assign({}, row, {
            evidenceCount: siteDb.countCaseFileEvidence(row.id),
        });
    });
}

function getDetail(id) {
    const row = siteDb.getCaseFile(id);
    if (!row) return null;
    const links = enrichEvidenceLinks(siteDb.listCaseFileEvidence(id));
    return {
        caseFile: row,
        evidence: links,
    };
}

function create(input, session) {
    if (!siteDb.isReady()) throw new Error('Database not ready');
    const now = new Date().toISOString();
    const actor = actorLabel(session);
    const title = String(input.title || '').trim() || 'Untitled case file';
    const row = {
        id: newCaseId(),
        title: title,
        status: input.status === 'closed' ? 'closed' : 'open',
        officerName: String(input.officerName || '').trim(),
        deviceId: String(input.deviceId || '').trim(),
        sosIncidentId: input.sosIncidentId ? String(input.sosIncidentId).trim() : null,
        narrative: String(input.narrative || ''),
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        updatedBy: actor,
    };
    siteDb.insertCaseFile(row);
    if (input.evidenceFileId) {
        const file = evidenceRegistry.getFile(input.evidenceFileId);
        if (file) siteDb.linkCaseFileEvidence(row.id, input.evidenceFileId, actor);
    }
    return getDetail(row.id);
}

function createFromSos(incidentId, session, sosIncidents) {
    if (!incidentId) throw new Error('SOS incident ID required');
    const dash = sosIncidents.getDashboard(500, 365);
    const entries = (dash && dash.entries) ? dash.entries : [];
    const hit = entries.find(function (e) {
        return e && (e.id === incidentId || e.incidentId === incidentId);
    });
    const narrative = readSosNarrative(sosIncidents, incidentId);
    const title = hit && hit.operatorName
        ? ('SOS — ' + hit.operatorName + ' — ' + (hit.at ? hit.at.slice(0, 10) : incidentId))
        : ('SOS incident ' + incidentId);
    return create({
        title: title,
        officerName: hit ? (hit.operatorName || '') : '',
        deviceId: hit ? (hit.cameraId || hit.deviceId || '') : '',
        sosIncidentId: incidentId,
        narrative: narrative,
    }, session);
}

function update(id, input, session) {
    const existing = siteDb.getCaseFile(id);
    if (!existing) throw new Error('Case file not found');
    const actor = actorLabel(session);
    const patch = {
        updatedBy: actor,
    };
    if (input.title != null) patch.title = String(input.title).trim() || existing.title;
    if (input.status != null) patch.status = input.status === 'closed' ? 'closed' : 'open';
    if (input.officerName != null) patch.officerName = String(input.officerName).trim();
    if (input.deviceId != null) patch.deviceId = String(input.deviceId).trim();
    if (input.sosIncidentId != null) {
        patch.sosIncidentId = input.sosIncidentId ? String(input.sosIncidentId).trim() : null;
    }
    if (input.narrative != null) patch.narrative = String(input.narrative);
    siteDb.updateCaseFile(id, patch);
    return getDetail(id);
}

function linkEvidence(caseFileId, evidenceFileId, session) {
    const cf = siteDb.getCaseFile(caseFileId);
    if (!cf) throw new Error('Case file not found');
    const file = evidenceRegistry.getFile(evidenceFileId);
    if (!file) throw new Error('Evidence file not found');
    siteDb.linkCaseFileEvidence(caseFileId, evidenceFileId, actorLabel(session));
    return getDetail(caseFileId);
}

function unlinkEvidence(caseFileId, evidenceFileId) {
    const cf = siteDb.getCaseFile(caseFileId);
    if (!cf) throw new Error('Case file not found');
    siteDb.unlinkCaseFileEvidence(caseFileId, evidenceFileId);
    return getDetail(caseFileId);
}

/**
 * Remove case file record and evidence links only — never deletes archived media on disk.
 */
function remove(id) {
    const cf = siteDb.getCaseFile(id);
    if (!cf) throw new Error('Case file not found');
    const links = siteDb.listCaseFileEvidence(id);
    const evidenceIds = links.map(function (l) { return l.evidenceFileId; });
    const deleted = siteDb.deleteCaseFile(id);
    if (!deleted) throw new Error('Case file not found');
    return {
        removed: deleted.caseFile,
        evidenceUnlinked: evidenceIds,
        evidenceFilesOnDiskPreserved: true,
    };
}

module.exports = {
    list: list,
    getDetail: getDetail,
    create: create,
    createFromSos: createFromSos,
    update: update,
    linkEvidence: linkEvidence,
    unlinkEvidence: unlinkEvidence,
    remove: remove,
};
