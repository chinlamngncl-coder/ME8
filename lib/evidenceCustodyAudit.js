/**
 * Evidence custody trail — per-file audit history from mobility.db audit_log.
 * Does not invent delete/move actors; only records actions the application actually performs.
 */
const siteDb = require('./siteDb');
const auditLog = require('./auditLog');
const auditActionLabels = require('./auditActionLabels');

const CUSTODY_LIMIT = 30;

function parseDetail(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
}

async function listForFile(fileId, limit) {
    if (!siteDb.isReady() || !fileId) return { rows: [], unavailable: false };
    const id = String(fileId);
    const n = Math.min(50, Math.max(1, parseInt(limit, 10) || CUSTODY_LIMIT));
    const likeFile = '%"fileId":"' + id.replace(/"/g, '') + '"%';
    const likeEv = '%"evidenceFileId":"' + id.replace(/"/g, '') + '"%';
    let rows;
    try {
        rows = await siteDb.queryAuditForEvidenceFile(id, likeFile, likeEv, n);
    } catch (err) {
        console.warn('[evidence-custody] audit read failed:', err && err.message ? err.message : err);
        return { rows: [], unavailable: true };
    }
    return {
        unavailable: false,
        rows: rows.map(function (row) {
            const detail = parseDetail(row.detail_json);
            return {
                id: row.id,
                ts: row.ts,
                actor: row.actor,
                role: row.role,
                action: row.action,
                label: auditActionLabels.formatAction(row.action),
                target: row.target,
                clientIp: row.client_ip,
                summary: auditActionLabels.formatDetailSummary(row.action, detail),
            };
        }),
    };
}

async function recordMissingObserved(req, file) {
    if (!file || !file.id) return false;
    try {
        await auditLog.recordFromRequest(req, 'evidence.storage_missing_observed', {
            target: file.id,
            detail: {
                fileId: file.id,
                fileName: file.fileName || null,
                relativePath: file.relativePath || null,
            },
        });
        return true;
    } catch (err) {
        console.warn('[evidence-custody] missing observed audit failed:', err && err.message ? err.message : err);
        return false;
    }
}

module.exports = {
    listForFile,
    recordMissingObserved,
    CUSTODY_LIMIT,
};
