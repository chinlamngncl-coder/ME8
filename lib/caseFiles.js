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
        .replace(/<script[\s\S]*?<\/script>/gi, '\n')
        .replace(/<style[\s\S]*?<\/style>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
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

async function enrichEvidenceLinks(links) {
    return Promise.all((links || []).map(async function (link) {
        const file = await evidenceRegistry.getFile(link.evidenceFileId);
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
    }));
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

async function list(opts) {
    opts = opts || {};
    const bounds = periodBounds(opts.period);
    const from = opts.from || bounds.from;
    const to = opts.to || bounds.to;
    const rows = await siteDb.listCaseFiles(opts.limit || 200, {
        q: opts.q,
        status: opts.status,
        from: from,
        to: to,
    });
    return Promise.all(rows.map(async function (row) {
        return Object.assign({}, row, {
            evidenceCount: await siteDb.countCaseFileEvidence(row.id),
        });
    }));
}

async function getDetail(id) {
    const row = await siteDb.getCaseFile(id);
    if (!row) return null;
    const links = await enrichEvidenceLinks(await siteDb.listCaseFileEvidence(id));
    let exhibits = [];
    try {
        exhibits = await siteDb.listCaseExhibits(id);
    } catch (_) {
        exhibits = [];
    }
    return {
        caseFile: row,
        evidence: links,
        exhibits: exhibits,
    };
}

async function create(input, session) {
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
        opsCaseId: input.opsCaseId ? String(input.opsCaseId).trim() : null,
        narrative: String(input.narrative || ''),
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        updatedBy: actor,
    };
    await siteDb.insertCaseFile(row);
    if (input.evidenceFileId) {
        const file = await evidenceRegistry.getFile(input.evidenceFileId);
        if (file) await siteDb.linkCaseFileEvidence(row.id, input.evidenceFileId, actor);
    }
    return getDetail(row.id);
}

async function findExistingBySource(input) {
    const sourceKey = String((input && input.opsCaseId) || (input && input.sourceKey) || '').trim();
    const sosId = String((input && input.sosIncidentId) || '').trim();
    if (sourceKey) {
        const byKey = await siteDb.findCaseFileByOpsCaseId(sourceKey);
        if (byKey) return byKey;
    }
    if (sosId) {
        const bySos = await siteDb.findCaseFileBySosIncidentId(sosId);
        if (bySos) return bySos;
    }
    return null;
}

async function ensureOpen(input, session) {
    const existing = await findExistingBySource(input);
    if (existing) return { created: false, detail: await getDetail(existing.id) };
    const detail = await create(Object.assign({}, input, { status: 'open' }), session);
    return { created: true, detail: detail };
}

async function createFromSos(incidentId, session, sosIncidents) {
    if (!incidentId) throw new Error('SOS incident ID required');
    const dash = sosIncidents.getDashboard(500, 365);
    const entries = (dash && dash.entries) ? dash.entries : [];
    const hit = entries.find(function (e) {
        return e && (e.id === incidentId || e.incidentId === incidentId);
    }) || {};
    const wired = await ensureFromSos(Object.assign({}, hit, {
        id: incidentId,
        note: String(hit.note || '').trim(),
    }), session);
    return wired.detail;
}

async function ensureFromSos(entry, session) {
    if (!entry || !entry.id) return null;
    const incidentId = String(entry.id);
    const title = entry.operatorName
        ? ('SOS — ' + String(entry.operatorName).trim())
        : ('SOS — ' + incidentId);
    const wired = await ensureOpen({
        title: title.slice(0, 200),
        officerName: entry.operatorName || '',
        deviceId: entry.cameraId || entry.deviceId || '',
        sosIncidentId: incidentId,
        opsCaseId: 'SO:' + incidentId,
        narrative: String(entry.note || '').trim(),
    }, session);
    /* SOS-SA-REPORT-HANDOFF-V1 — ownership exhibit once when case first opens */
    try {
        const cf = wired && wired.detail && wired.detail.caseFile;
        if (wired && wired.created && cf && cf.id) {
            const who = actorLabel(session) || (session && session.username) || 'operator';
            const uname = (session && session.username) ? String(session.username) : '';
            await addCaseExhibit(cf.id, {
                exhibitType: 'sos_ownership',
                title: ('Case Owner — ' + who).slice(0, 200),
                content: 'owning:' + uname + '\nMaster SOS case owner for compile.',
                fileUrl: '',
            }, session);
        }
    } catch (_) { /* ownership exhibit best-effort */ }
    return wired;
}

async function contributeTeamHandoff(input, session, sosIncidents) {
    const body = input && typeof input === 'object' ? input : {};
    const sosId = String(body.sosIncidentId || '').trim();
    const note = String(body.note || '').trim();
    if (!sosId) {
        const err = new Error('SOS incident ID required');
        err.status = 400;
        throw err;
    }
    if (!note) {
        const err = new Error('Handoff note required');
        err.status = 400;
        throw err;
    }
    if (note.length > 8000) {
        const err = new Error('Handoff note too large');
        err.status = 400;
        throw err;
    }
    let caseRow = await siteDb.findCaseFileBySosIncidentId(sosId);
    if (!caseRow) {
        const wired = await ensureFromSos({ id: sosId, note: '' }, session);
        caseRow = wired && wired.detail && wired.detail.caseFile;
    }
    if (!caseRow || !caseRow.id) {
        const err = new Error('Case file not found for SOS');
        err.status = 404;
        throw err;
    }
    const actor = actorLabel(session);
    const uname = session && session.username ? String(session.username) : '';
    const evidenceIds = Array.isArray(body.evidenceFileIds)
        ? body.evidenceFileIds.map(String).filter(Boolean).slice(0, 20)
        : [];
    for (let i = 0; i < evidenceIds.length; i += 1) {
        try {
            await linkEvidence(caseRow.id, evidenceIds[i], session);
        } catch (_) { /* skip missing / already linked */ }
    }
    const fileUrl = evidenceIds[0]
        ? ('/api/evidence/preview/' + encodeURIComponent(evidenceIds[0]))
        : '';
    await addCaseExhibit(caseRow.id, {
        exhibitType: 'team_handoff',
        title: ('Team handoff — ' + (actor || uname || 'operator')).slice(0, 200),
        content: 'by:' + uname + '\n' + note,
        fileUrl: fileUrl,
    }, session);
    if (sosIncidents && typeof sosIncidents.addContribution === 'function') {
        sosIncidents.addContribution(sosId, {
            at: new Date().toISOString(),
            username: uname,
            displayName: actor,
            note: note.slice(0, 2000),
            evidenceFileIds: evidenceIds,
            caseId: caseRow.id,
        });
    }
    return getDetail(caseRow.id);
}

async function ensureFromWeaponHit(hit, session) {
    if (!hit || !hit.hitId) return null;
    const hitId = String(hit.hitId).trim();
    const cam = hit.cameraId || hit.camId || '';
    const title = hit.deviceName
        ? ('Weapon — ' + String(hit.deviceName).trim())
        : ('Weapon — ' + (cam || hitId));
    return ensureOpen({
        title: title.slice(0, 200),
        deviceId: String(cam).trim(),
        opsCaseId: 'WD:' + hitId,
        narrative: '',
    }, session);
}

function clientSafeApiUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.indexOf('/api/') === 0) return s;
    return '';
}

function newExhibitId() {
    return 'EXH-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex');
}

async function addCaseExhibit(caseId, input, session) {
    const cid = String(caseId || '').trim();
    if (!cid) return null;
    const row = await siteDb.insertCaseExhibit({
        id: newExhibitId(),
        caseId: cid,
        exhibitType: input.exhibitType,
        title: input.title || '',
        content: input.content || '',
        fileUrl: clientSafeApiUrl(input.fileUrl),
        createdAt: new Date().toISOString(),
    });
    try {
        const retentionHold = require('./evidenceRetentionHold');
        await retentionHold.applyRetentionHoldFromExhibitUrl(input.fileUrl, 'case_exhibit');
    } catch (_) { /* hold best-effort */ }
    return row;
}

async function attachHitExhibit(caseId, hit, session, exhibitType) {
    const hitId = String((hit && hit.hitId) || '').trim();
    if (!caseId || !hitId) return;
    let existing = [];
    try {
        existing = await siteDb.listCaseExhibits(caseId);
    } catch (_) {
        existing = [];
    }
    const marker = 'hit:' + hitId;
    if (existing.some(function (e) { return String(e.content || '').indexOf(marker) === 0; })) return;
    const who = (hit.displayName || hit.plate || '').trim();
    const score = hit.scorePct != null ? (String(hit.scorePct) + '%') : '';
    const title = exhibitType === 'anpr_hit'
        ? ('Plate ' + (hit.plate || who || hitId))
        : ('Face ' + (who || hitId));
    const bits = [who, score].filter(Boolean);
    await addCaseExhibit(caseId, {
        exhibitType: exhibitType,
        title: title.slice(0, 200),
        content: marker + (bits.length ? ('\n' + bits.join(' · ')) : ''),
        fileUrl: hit.cropUrl || hit.photoUrl || hit.vehicleUrl || '',
    }, session);
}

async function ensureFromFrHit(hit, session) {
    if (!hit || !hit.hitId) return null;
    const kindRaw = String(hit.kind || '').trim().toLowerCase();
    if (hit.anpr === true || kindRaw === 'anpr') {
        throw new Error('ANPR hits use from-anpr');
    }
    const hitId = String(hit.hitId).trim();
    const cam = hit.cameraId || hit.camId || '';
    const label = hit.displayName || hit.deviceLabel || hit.deviceName;
    const title = label
        ? ('FR — ' + String(label).trim())
        : ('FR — ' + (cam || hitId));
    const wired = await ensureOpen({
        title: title.slice(0, 200),
        officerName: hit.displayName || '',
        deviceId: String(cam).trim(),
        opsCaseId: 'FR:' + hitId,
        narrative: '',
    }, session);
    if (wired && wired.detail && wired.detail.caseFile) {
        await attachHitExhibit(wired.detail.caseFile.id, hit, session, 'fr_hit');
        return { created: wired.created, detail: await getDetail(wired.detail.caseFile.id) };
    }
    return wired;
}

async function ensureFromAnprHit(hit, session) {
    if (!hit || !hit.hitId) return null;
    const kindRaw = String(hit.kind || '').trim().toLowerCase();
    const isAnpr = hit.anpr === true || kindRaw === 'anpr';
    if (!isAnpr) throw new Error('FR hits use from-fr');
    const hitId = String(hit.hitId).trim();
    const cam = hit.cameraId || hit.camId || '';
    const plate = hit.plate || hit.displayName || '';
    const title = plate ? ('ANPR — ' + String(plate).trim()) : ('ANPR — ' + (cam || hitId));
    const wired = await ensureOpen({
        title: title.slice(0, 200),
        deviceId: String(cam).trim(),
        opsCaseId: 'AN:' + hitId,
        narrative: plate ? ('Plate ' + String(plate).trim()) : '',
    }, session);
    if (wired && wired.detail && wired.detail.caseFile) {
        await attachHitExhibit(wired.detail.caseFile.id, hit, session, 'anpr_hit');
        return { created: wired.created, detail: await getDetail(wired.detail.caseFile.id) };
    }
    return wired;
}

/** CASE-FILE-CONTINUE-FROM-OPS-CASE-V1 — seed Case File from Ops Case desk. */
async function createFromOpsCase(opsCase, session) {
    if (!opsCase || !opsCase.caseId) throw new Error('Ops case required');
    const caseId = String(opsCase.caseId).trim();
    const existing = await siteDb.findCaseFileByOpsCaseId(caseId);
    if (existing) return getDetail(existing.id);

    const notes = Array.isArray(opsCase.notes) ? opsCase.notes : [];
    const narrative = notes.map(function (n) {
        if (!n || !n.text) return '';
        const who = n.by || '—';
        const when = n.at ? String(n.at).slice(0, 19).replace('T', ' ') : '';
        return '[' + when + ' · ' + who + ']\n' + String(n.text);
    }).filter(Boolean).join('\n\n').slice(0, 12000);

    const refs = opsCase.refs || {};
    const kind = opsCase.kind || opsCase.type || '';
    const titleBase = String(opsCase.title || '').trim();
    const title = titleBase
        || ((kind ? (kind + ' — ') : '') + caseId);

    let detail = await create({
        title: title.slice(0, 200),
        deviceId: String(opsCase.cameraId || '').trim(),
        sosIncidentId: refs.sosIncidentId ? String(refs.sosIncidentId).trim() : null,
        opsCaseId: caseId,
        narrative: narrative,
    }, session);

    const evLinks = Array.isArray(opsCase.evidenceLinks) ? opsCase.evidenceLinks : [];
    for (let i = 0; i < evLinks.length; i++) {
        const fid = evLinks[i] && evLinks[i].evidenceFileId;
        if (!fid) continue;
        try {
            detail = await linkEvidence(detail.caseFile.id, fid, session);
        } catch (_) { /* skip missing / duplicate */ }
    }
    return detail;
}

async function update(id, input, session) {
    const existing = await siteDb.getCaseFile(id);
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
    if (input.opsCaseId != null) {
        patch.opsCaseId = input.opsCaseId ? String(input.opsCaseId).trim() : null;
    }
    if (input.narrative != null) patch.narrative = String(input.narrative);
    await siteDb.updateCaseFile(id, patch);
    return getDetail(id);
}

async function attachAiReport(id, input, session) {
    const existing = await siteDb.getCaseFile(id);
    if (!existing) throw new Error('Case file not found');
    const body = input && typeof input === 'object' ? input : {};
    const text = String(body.text || '').trim();
    if (!text) throw new Error('Report text required');
    if (text.length > 20000) throw new Error('Report too large');
    const evidenceFileId = String(body.evidenceFileId || '').trim();
    if (evidenceFileId) {
        try {
            await linkEvidence(id, evidenceFileId, session);
        } catch (_) { /* already linked or missing */ }
    }
    const fileUrl = evidenceFileId
        ? ('/api/evidence/preview/' + encodeURIComponent(evidenceFileId))
        : '';
    await addCaseExhibit(id, {
        exhibitType: 'ai_report',
        title: 'AI analysis report',
        content: text,
        fileUrl: fileUrl,
    }, session);
    return getDetail(id);
}

async function attachGeospatialTrace(id, payload, session) {
    const existing = await siteDb.getCaseFile(id);
    if (!existing) throw new Error('Case file not found');
    const body = payload && typeof payload === 'object' ? payload : {};
    const nearby = Array.isArray(body.nearbyUnits) ? body.nearbyUnits.slice(0, 200).map(function (u) {
        if (!u || typeof u !== 'object') return null;
        return {
            deviceId: String(u.deviceId || '').trim(),
            recordedAt: u.recordedAt || null,
            lat: Number.isFinite(u.lat) ? u.lat : null,
            lon: Number.isFinite(u.lon) ? u.lon : null,
            driftMs: Number.isFinite(u.driftMs) ? u.driftMs : null,
        };
    }).filter(Boolean) : [];
    const snap = {
        attachedAt: new Date().toISOString(),
        attachedBy: actorLabel(session),
        at: body.at || null,
        deviceId: String(body.deviceId || existing.deviceId || '').trim(),
        mapBounds: body.mapBounds && typeof body.mapBounds === 'object' ? {
            north: body.mapBounds.north,
            south: body.mapBounds.south,
            east: body.mapBounds.east,
            west: body.mapBounds.west,
        } : null,
        telemetry: body.telemetry && typeof body.telemetry === 'object' ? body.telemetry : null,
        nearbyUnits: nearby,
    };
    const jsonText = JSON.stringify(snap);
    if (jsonText.length > 200000) throw new Error('Geospatial snapshot too large');
    await siteDb.setCaseFileGeospatial(id, jsonText, actorLabel(session));
    return getDetail(id);
}

async function linkEvidence(caseFileId, evidenceFileId, session) {
    const cf = await siteDb.getCaseFile(caseFileId);
    if (!cf) throw new Error('Case file not found');
    const file = await evidenceRegistry.getFile(evidenceFileId);
    if (!file) throw new Error('Evidence file not found');
    await siteDb.linkCaseFileEvidence(caseFileId, evidenceFileId, actorLabel(session));
    return getDetail(caseFileId);
}

async function listIdsByEvidenceFileId(evidenceFileId) {
    return siteDb.listCaseFileIdsByEvidence(evidenceFileId);
}

async function unlinkEvidence(caseFileId, evidenceFileId) {
    const cf = await siteDb.getCaseFile(caseFileId);
    if (!cf) throw new Error('Case file not found');
    await siteDb.unlinkCaseFileEvidence(caseFileId, evidenceFileId);
    return getDetail(caseFileId);
}

/**
 * Remove case file record and evidence links only — never deletes archived media on disk.
 */
async function remove(id) {
    const cf = await siteDb.getCaseFile(id);
    if (!cf) throw new Error('Case file not found');
    const links = await siteDb.listCaseFileEvidence(id);
    const evidenceIds = links.map(function (l) { return l.evidenceFileId; });
    const deleted = await siteDb.deleteCaseFile(id);
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
    ensureFromSos: ensureFromSos,
    contributeTeamHandoff: contributeTeamHandoff,
    ensureFromWeaponHit: ensureFromWeaponHit,
    ensureFromFrHit: ensureFromFrHit,
    ensureFromAnprHit: ensureFromAnprHit,
    createFromOpsCase: createFromOpsCase,
    update: update,
    attachAiReport: attachAiReport,
    attachGeospatialTrace: attachGeospatialTrace,
    linkEvidence: linkEvidence,
    listIdsByEvidenceFileId: listIdsByEvidenceFileId,
    unlinkEvidence: unlinkEvidence,
    remove: remove,
};
