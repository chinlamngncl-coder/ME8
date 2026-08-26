/**
 * Disk-pressure FIFO — if the storage volume is above 95% used,
 * delete oldest unprotected evidence until at or below 85%.
 * Never deletes files on a case/incident, exhibit, Evidence Package lock, or Retention Hold.
 */
'use strict';

const fs = require('fs');
const evidenceRegistry = require('./evidenceRegistry');
const siteDb = require('./siteDb');

const TRIGGER_PCT = 95;
const TARGET_PCT = 85;
const MAX_PURGE_PER_RUN = 25;

function volumeStats(root) {
    if (!root) return null;
    try {
        const st = fs.statfsSync(root);
        const bsize = Number(st.bsize) || 0;
        const totalBytes = Number(st.blocks) * bsize;
        const freeBytes = Number(st.bavail != null ? st.bavail : st.bfree) * bsize;
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        const usedPct = totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;
        return { totalBytes: totalBytes, usedBytes: usedBytes, freeBytes: freeBytes, usedPct: usedPct };
    } catch (_) {
        return null;
    }
}

function isRetentionHold(meta) {
    const tags = meta && Array.isArray(meta.tags) ? meta.tags : [];
    for (let i = 0; i < tags.length; i++) {
        if (/retention-?hold|case.?hold|hold|keep.?forever|until.?manual/i.test(String(tags[i] || ''))) return true;
    }
    return false;
}

async function isProtected(fileId) {
    const id = String(fileId || '').trim();
    if (!id) return true;
    try {
        const caseIds = await siteDb.listCaseFileIdsByEvidence(id);
        if (caseIds && caseIds.length) return true;
    } catch (_) { /* catalog */ }
    try {
        const exh = await siteDb.query(
            'SELECT 1 AS n FROM case_exhibits WHERE file_url LIKE $1 LIMIT 1',
            ['%/api/evidence/preview/' + id + '%']
        );
        if (exh.rows && exh.rows[0]) return true;
    } catch (_) { /* table optional */ }
    try {
        const exp = await siteDb.query(
            'SELECT 1 AS n FROM evidence_secure_exports WHERE evidence_file_id=$1 AND status IN ($2,$3) LIMIT 1',
            [id, 'pending', 'approved']
        );
        if (exp.rows && exp.rows[0]) return true;
    } catch (_) { /* ignore */ }
    try {
        const meta = await siteDb.getEvidenceMeta(id);
        if (isRetentionHold(meta)) return true;
    } catch (_) { /* ignore */ }
    try {
        const file = await siteDb.getEvidenceFile(id);
        if (file && file.isPriority) return true;
    } catch (_) { /* ignore */ }
    return false;
}

async function run(storageDir, log) {
    if (!siteDb.isReady()) {
        return { ok: false, reason: 'catalog_unavailable' };
    }
    const vol = volumeStats(storageDir);
    if (!vol || !(vol.totalBytes > 0)) {
        return { ok: false, reason: 'volume_unknown' };
    }
    if (vol.usedPct <= TRIGGER_PCT) {
        return { ok: true, skipped: true, usedPct: vol.usedPct };
    }
    const cutoff = new Date().toISOString();
    const candidates = await siteDb.listActiveEvidenceUploadedBefore(cutoff, 80);
    let purged = 0;
    let skipped = 0;
    let usedPct = vol.usedPct;
    for (let i = 0; i < candidates.length && purged < MAX_PURGE_PER_RUN; i++) {
        const file = candidates[i];
        if (!file || !file.id) continue;
        if (await isProtected(file.id)) {
            skipped += 1;
            continue;
        }
        try {
            await evidenceRegistry.purgeFileNow(file.id);
            purged += 1;
        } catch (_) {
            skipped += 1;
            continue;
        }
        const next = volumeStats(storageDir);
        if (next) usedPct = next.usedPct;
        if (usedPct <= TARGET_PCT) break;
    }
    if (log && log.web) {
        log.web.info('disk-pressure fifo', { usedPct: usedPct, purged: purged, skipped: skipped });
    }
    return { ok: true, usedPct: usedPct, purged: purged, skipped: skipped };
}

module.exports = {
    run: run,
    volumeStats: volumeStats,
    TRIGGER_PCT: TRIGGER_PCT,
    TARGET_PCT: TARGET_PCT,
};
