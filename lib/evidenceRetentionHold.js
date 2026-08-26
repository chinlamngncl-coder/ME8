'use strict';

/**
 * EVIDENCE-PACKAGE-API-V1 — Retention Hold on media linked to a Case File
 * or Evidence Package. Daily retention enqueue + disk-pressure FIFO must skip.
 */

const siteDb = require('./siteDb');
const { HOLD_TAG } = require('./evidencePackageStore');

function evidenceIdFromPreviewUrl(fileUrl) {
    const s = String(fileUrl || '');
    const m = /\/api\/evidence\/preview\/([^/?#]+)/i.exec(s);
    return m ? decodeURIComponent(m[1]) : '';
}

async function applyRetentionHold(evidenceFileId, reason) {
    const id = String(evidenceFileId || '').trim();
    if (!id || !siteDb.isReady()) return false;
    try {
        const prev = (await siteDb.getEvidenceMeta(id)) || { evidenceFileId: id, tags: [] };
        const tags = Array.isArray(prev.tags) ? prev.tags.slice() : [];
        if (!tags.some((t) => String(t).toLowerCase() === HOLD_TAG)) {
            tags.push(HOLD_TAG);
        }
        await siteDb.upsertEvidenceMeta(Object.assign({}, prev, {
            evidenceFileId: id,
            tags,
            notes: prev.notes || '',
            retentionHoldReason: reason || 'case_or_package',
            updatedBy: 'system-retention-hold',
        }));
        await siteDb.setEvidencePriority(id, true);
        return true;
    } catch (_) {
        return false;
    }
}

async function applyRetentionHoldFromExhibitUrl(fileUrl, reason) {
    const id = evidenceIdFromPreviewUrl(fileUrl);
    if (!id) return false;
    return applyRetentionHold(id, reason || 'case_exhibit');
}

module.exports = {
    HOLD_TAG,
    applyRetentionHold,
    applyRetentionHoldFromExhibitUrl,
    evidenceIdFromPreviewUrl,
};
