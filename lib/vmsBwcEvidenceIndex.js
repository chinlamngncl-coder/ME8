'use strict';
/**
 * VMS-INVESTIGATION-BWC-EVIDENCE-INDEX-V1 / BWC-SOS-INDEXER-V1 (Pile B)
 * Definitive identity: <FTP_ROOT>/<serial|deviceId>/... (+ evidence catalog).
 * Indexes MP4s into vms_recording_segments for any registered BWC — no lab hardcodes.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');
const evidenceRegistry = require('./evidenceRegistry');
const vmsVolumeRegistry = require('./vmsVolumeRegistry');
const dockFtpIngestWatch = require('./dockFtpIngestWatch');
const log = require('./fleetLog');

const VIDEO_RE = /\.(mp4|mov|avi|mkv|ts|m4v|3gp|flv|wmv|ps)$/i;
const SKIP_DIR = new Set(['quarantine', 'restored', 'tmp', 'temp', '.tmp']);
const INDEX_COOLDOWN_MS = 20000;
const MAX_FILES_PER_CAM = 800;

const lastIndexAt = new Map();

function segIdForPath(absPath) {
    const h = crypto.createHash('sha256').update(String(absPath)).digest('hex').slice(0, 28);
    return 'bwc-ev-' + h;
}

function segIdForEvidence(evidenceId) {
    return 'bwc-ev-' + String(evidenceId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

function guessTimes(fileName, uploadedAt, mtimeMs, sizeBytes) {
    let startMs = Date.parse(uploadedAt);
    if (!Number.isFinite(startMs) && Number.isFinite(mtimeMs)) startMs = mtimeMs;
    if (!Number.isFinite(startMs)) startMs = Date.now();
    const base = path.basename(String(fileName || ''));
    const m = base.match(/(20\d{2})(\d{2})(\d{2})[_\-T]?(\d{2})(\d{2})(\d{2})/);
    if (m) {
        const local = new Date(
            Number(m[1]), Number(m[2]) - 1, Number(m[3]),
            Number(m[4]), Number(m[5]), Number(m[6]), 0
        );
        if (Number.isFinite(local.getTime())) startMs = local.getTime();
    }
    let durMs = 5 * 60 * 1000;
    const sz = Number(sizeBytes) || 0;
    if (sz > 0) {
        /* rough bitrate floor — keep segment drawable without ffprobe */
        durMs = Math.min(2 * 60 * 60 * 1000, Math.max(30 * 1000, Math.round(sz / 40000)));
    }
    return {
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(startMs + durMs).toISOString(),
    };
}

async function resolveAliases(camId) {
    const id = String(camId || '').trim();
    const aliases = new Set();
    if (!id) return [];
    aliases.add(id);
    try {
        const byId = await siteDb.findDevice(id);
        if (byId) {
            if (byId.deviceId) aliases.add(String(byId.deviceId).trim());
            if (byId.serialNo) aliases.add(String(byId.serialNo).trim());
        }
    } catch (_) { /* ignore */ }
    try {
        const { rows } = await siteDb.query(
            `SELECT device_id, serial_no FROM bwc_devices
             WHERE device_id = $1
                OR LOWER(COALESCE(serial_no,'')) = LOWER($1)`,
            [id]
        );
        rows.forEach((r) => {
            if (r.device_id) aliases.add(String(r.device_id).trim());
            if (r.serial_no) aliases.add(String(r.serial_no).trim());
        });
    } catch (_) { /* ignore */ }
    return Array.from(aliases).filter(Boolean);
}

async function ensureBwcIngestVolume() {
    await vmsVolumeRegistry.ensureTable();
    let row = await vmsVolumeRegistry.getRawByRole('bwc-ingest');
    if (row && row.id) return row;
    const ftpRoot = typeof evidenceRegistry.getFtpRoot === 'function'
        ? evidenceRegistry.getFtpRoot()
        : null;
    if (!ftpRoot) {
        throw new Error('Evidence FTP root is not configured');
    }
    try {
        fs.mkdirSync(ftpRoot, { recursive: true });
    } catch (_) { /* ignore */ }
    const created = await vmsVolumeRegistry.add({
        name: 'BWC Dock Ingest',
        role: 'bwc-ingest',
        mount_path: path.resolve(ftpRoot),
        tier_type: 'local_edge',
        notes: 'tier:edge-nvme auto-bwc-evidence-index',
        enabled: true,
    });
    row = await vmsVolumeRegistry.getRawById(created.id);
    return row;
}

async function upsertSegment(row) {
    const existingPath = await siteDb.query(
        `SELECT id FROM vms_recording_segments WHERE file_path = $1 LIMIT 1`,
        [row.filePath]
    );
    if (existingPath.rows[0]) {
        await siteDb.query(
            `UPDATE vms_recording_segments
             SET cam_id = $1, start_at = $2, end_at = $3, status = $4,
                 file_size_bytes = $5, volume_id = $6
             WHERE id = $7`,
            [
                row.camId, row.startAt, row.endAt, row.status,
                row.sizeBytes, row.volumeId, existingPath.rows[0].id,
            ]
        );
        return existingPath.rows[0].id;
    }
    await siteDb.query(
        `INSERT INTO vms_recording_segments
         (id, cam_id, volume_id, start_at, end_at, file_path, file_size_bytes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET
           cam_id = EXCLUDED.cam_id,
           start_at = EXCLUDED.start_at,
           end_at = EXCLUDED.end_at,
           file_path = EXCLUDED.file_path,
           file_size_bytes = EXCLUDED.file_size_bytes,
           status = EXCLUDED.status,
           volume_id = EXCLUDED.volume_id`,
        [
            row.id, row.camId, row.volumeId, row.startAt, row.endAt,
            row.filePath, row.sizeBytes, row.status,
        ]
    );
    return row.id;
}

async function indexCatalogVideos(camId, aliases, volumeId) {
    let upserted = 0;
    const aliasArr = aliases.slice(0, 24);
    if (!aliasArr.length) return 0;
    const likeParams = aliasArr.map((a) => String(a).replace(/[%_]/g, '') + '/%');
    const { rows } = await siteDb.query(
        `SELECT id, device_id, relative_path, file_name, byte_size, uploaded_at, created_at, source, storage_tier
         FROM evidence_files
         WHERE COALESCE(storage_tier,'local') NOT IN ('queued_delete')
           AND (
             device_id = ANY($1::text[])
             OR relative_path ILIKE ANY($2::text[])
           )
         ORDER BY uploaded_at DESC NULLS LAST
         LIMIT $3`,
        [aliasArr, likeParams, MAX_FILES_PER_CAM]
    );
    for (const r of rows) {
        const name = r.file_name || r.relative_path || '';
        if (!VIDEO_RE.test(name) && !VIDEO_RE.test(String(r.relative_path || ''))) continue;
        const file = await evidenceRegistry.getFile(r.id);
        const abs = file ? evidenceRegistry.resolveFilePath(file) : null;
        if (!abs || !fs.existsSync(abs)) continue;
        let size = Number(r.byte_size) || 0;
        let mtimeMs = null;
        try {
            const st = fs.statSync(abs);
            size = size || st.size;
            mtimeMs = st.mtimeMs;
        } catch (_) { /* ignore */ }
        const times = guessTimes(name, r.uploaded_at || r.created_at, mtimeMs, size);
        await upsertSegment({
            id: segIdForEvidence(r.id),
            camId,
            volumeId,
            startAt: times.startAt,
            endAt: times.endAt,
            filePath: abs,
            sizeBytes: size || null,
            status: 'complete',
        });
        upserted += 1;
    }
    return upserted;
}

function walkVideoFiles(dirAbs, out, max) {
    if (out.length >= max) return;
    let entries;
    try {
        entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch (_) {
        return;
    }
    for (const ent of entries) {
        if (out.length >= max) return;
        const full = path.join(dirAbs, ent.name);
        if (ent.isDirectory()) {
            if (SKIP_DIR.has(String(ent.name).toLowerCase())) continue;
            walkVideoFiles(full, out, max);
            continue;
        }
        if (!ent.isFile()) continue;
        if (!VIDEO_RE.test(ent.name)) continue;
        out.push(full);
    }
}

async function indexDiskFolders(camId, aliases, volumeId, ftpRoot) {
    if (!ftpRoot || !fs.existsSync(ftpRoot)) return 0;
    let upserted = 0;
    const rootAbs = path.resolve(ftpRoot);
    for (const alias of aliases) {
        const folder = path.join(rootAbs, alias);
        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) continue;
        const files = [];
        walkVideoFiles(folder, files, MAX_FILES_PER_CAM);
        for (const abs of files) {
            let size = 0;
            let mtimeMs = null;
            try {
                const st = fs.statSync(abs);
                size = st.size;
                mtimeMs = st.mtimeMs;
            } catch (_) { continue; }
            const times = guessTimes(path.basename(abs), null, mtimeMs, size);
            await upsertSegment({
                id: segIdForPath(abs),
                camId,
                volumeId,
                startAt: times.startAt,
                endAt: times.endAt,
                filePath: abs,
                sizeBytes: size || null,
                status: 'complete',
            });
            upserted += 1;
        }
    }
    /* Folders named by serial when camId is network device id (or reverse) */
    try {
        const top = fs.readdirSync(rootAbs, { withFileTypes: true });
        for (const ent of top) {
            if (!ent.isDirectory() || SKIP_DIR.has(ent.name.toLowerCase())) continue;
            if (aliases.indexOf(ent.name) >= 0) continue; /* already walked as alias folder */
            let mapped = null;
            try {
                mapped = dockFtpIngestWatch.parseDeviceIdFromRel(ent.name + '/clip.mp4');
            } catch (_) { mapped = null; }
            const mappedStr = mapped ? String(mapped).trim() : '';
            if (!mappedStr || aliases.indexOf(mappedStr) < 0) continue;
            const folder = path.join(rootAbs, ent.name);
            const files = [];
            walkVideoFiles(folder, files, MAX_FILES_PER_CAM);
            for (const abs of files) {
                let size = 0;
                let mtimeMs = null;
                try {
                    const st = fs.statSync(abs);
                    size = st.size;
                    mtimeMs = st.mtimeMs;
                } catch (_) { continue; }
                const times = guessTimes(path.basename(abs), null, mtimeMs, size);
                await upsertSegment({
                    id: segIdForPath(abs),
                    camId,
                    volumeId,
                    startAt: times.startAt,
                    endAt: times.endAt,
                    filePath: abs,
                    sizeBytes: size || null,
                    status: 'complete',
                });
                upserted += 1;
            }
        }
    } catch (_) { /* ignore */ }
    return upserted;
}

/**
 * Index evidence/FTP videos for one or more camera/device ids into VMS segments.
 * @returns {{ ok: boolean, indexed: number, cams: number }}
 */
async function indexForCamIds(camIds, opts) {
    opts = opts || {};
    const ids = (Array.isArray(camIds) ? camIds : [camIds])
        .map((c) => String(c || '').trim())
        .filter(Boolean)
        .slice(0, 24);
    if (!ids.length || !siteDb.isReady()) {
        return { ok: true, indexed: 0, cams: 0 };
    }
    const force = !!opts.force;
    const now = Date.now();
    const todo = ids.filter((id) => {
        if (force) return true;
        const last = lastIndexAt.get(id) || 0;
        return (now - last) >= INDEX_COOLDOWN_MS;
    });
    if (!todo.length) return { ok: true, indexed: 0, cams: 0, skipped: 'cooldown' };

    let volume;
    try {
        volume = await ensureBwcIngestVolume();
    } catch (err) {
        log.web.warn('[vms-bwc-evidence-index] volume unavailable', { error: err && err.message });
        return { ok: false, indexed: 0, cams: 0, error: 'volume' };
    }
    const volumeId = volume.id;
    const ftpRoot = volume.mount_path
        || (typeof evidenceRegistry.getFtpRoot === 'function' ? evidenceRegistry.getFtpRoot() : null);

    let indexed = 0;
    for (const camId of todo) {
        try {
            const aliases = await resolveAliases(camId);
            indexed += await indexCatalogVideos(camId, aliases, volumeId);
            indexed += await indexDiskFolders(camId, aliases, volumeId, ftpRoot);
            lastIndexAt.set(camId, Date.now());
        } catch (err) {
            log.web.warn('[vms-bwc-evidence-index] cam failed', {
                camId,
                error: err && err.message,
            });
        }
    }
    return { ok: true, indexed, cams: todo.length };
}

module.exports = {
    indexForCamIds,
    resolveAliases,
    ensureBwcIngestVolume,
};
