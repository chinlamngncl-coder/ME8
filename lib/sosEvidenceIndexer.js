'use strict';
/**
 * Pile C — SOS / live-capture indexer (VMS-INVESTIGATION-BWC-SOS-INDEXER-V1)
 * Primary: storage/sos-incidents/ledger.json (cameraId, at, recording local files).
 * Fallback: incident.json → incident.txt → folder suffix.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');
const vmsVolumeRegistry = require('./vmsVolumeRegistry');
const evidenceRegistry = require('./evidenceRegistry');
const sosIncidents = require('./sosIncidents');
const log = require('./fleetLog');

const VIDEO_RE = /\.(mp4|mov|avi|mkv|ts|m4v|3gp|flv|wmv|ps)$/i;
const INDEX_COOLDOWN_MS = 20000;
const lastIndexAt = new Map();

function segIdForPath(absPath) {
    const h = crypto.createHash('sha256').update('sos:' + String(absPath)).digest('hex').slice(0, 28);
    return 'sos-ev-' + h;
}

async function ensureVolume() {
    await vmsVolumeRegistry.ensureTable();
    let row = await vmsVolumeRegistry.getRawByRole('bwc-ingest');
    if (row && row.id) return row;
    const ftpRoot = typeof evidenceRegistry.getFtpRoot === 'function'
        ? evidenceRegistry.getFtpRoot()
        : null;
    const mount = ftpRoot || (sosIncidents.getBaseDir && sosIncidents.getBaseDir()) || null;
    if (!mount) throw new Error('No storage root for SOS index volume');
    try { fs.mkdirSync(mount, { recursive: true }); } catch (_) { /* ignore */ }
    const created = await vmsVolumeRegistry.add({
        name: 'BWC Dock Ingest',
        role: 'bwc-ingest',
        mount_path: path.resolve(mount),
        tier_type: 'local_edge',
        notes: 'tier:edge-nvme auto-sos-evidence-index',
        enabled: true,
    });
    return vmsVolumeRegistry.getRawById(created.id);
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

function parseDeviceFromIncidentTxt(txt) {
    const m = String(txt || '').match(/BWC device ID:\s*(.+)/i);
    if (!m) return null;
    const id = String(m[1] || '').trim();
    if (!id || id === '—') return null;
    return id;
}

function parseDeviceFromFolderRel(folderRel) {
    const base = path.basename(String(folderRel || '').replace(/\\/g, '/'));
    if (!base) return null;
    const parts = base.split('_').filter(Boolean);
    if (!parts.length) return null;
    let last = parts[parts.length - 1];
    if (/^[a-f0-9]{6,8}$/i.test(last) && parts.length >= 2) {
        last = parts[parts.length - 2];
    }
    last = String(last || '').trim();
    return last && last !== 'unknown' ? last : null;
}

function readIncidentJson(dirAbs) {
    const p = path.join(dirAbs, 'incident.json');
    if (!fs.existsSync(p)) return null;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (_) {
        return null;
    }
}

function resolveAliasesSync(camId, devicesById) {
    const id = String(camId || '').trim();
    const out = new Set([id]);
    if (!id) return out;
    const d = devicesById.get(id.toLowerCase());
    if (d) {
        if (d.deviceId) out.add(String(d.deviceId).trim());
        if (d.serialNo) out.add(String(d.serialNo).trim());
    }
    devicesById.forEach((row) => {
        if (String(row.serialNo || '').toLowerCase() === id.toLowerCase()) {
            out.add(String(row.deviceId).trim());
            if (row.serialNo) out.add(String(row.serialNo).trim());
        }
    });
    return out;
}

async function indexFile(absPath, camId, triggerIso, volumeId) {
    if (!absPath || !fs.existsSync(absPath) || !VIDEO_RE.test(absPath)) return false;
    let size = 0;
    let mtimeMs = null;
    try {
        const st = fs.statSync(absPath);
        size = st.size;
        mtimeMs = st.mtimeMs;
    } catch (_) {
        return false;
    }
    let startMs = Date.parse(triggerIso);
    if (!Number.isFinite(startMs) && Number.isFinite(mtimeMs)) startMs = mtimeMs;
    if (!Number.isFinite(startMs)) startMs = Date.now();
    const durMs = size > 0
        ? Math.min(2 * 60 * 60 * 1000, Math.max(30 * 1000, Math.round(size / 40000)))
        : 5 * 60 * 1000;
    await upsertSegment({
        id: segIdForPath(absPath),
        camId,
        volumeId,
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(startMs + durMs).toISOString(),
        filePath: absPath,
        sizeBytes: size || null,
        status: 'complete',
    });
    return true;
}

function collectEntryFiles(baseDir, entry) {
    const files = [];
    const rel = entry.folderRel || '';
    if (!rel) return files;
    const dir = path.join(baseDir, rel);
    const names = [
        entry.serverRecordingLocalFile,
        entry.deviceRecordingLocalFile,
        'server-recording.mp4',
        'device-recording.mp4',
        'clip.mp4',
    ].filter(Boolean);
    const seen = new Set();
    names.forEach((n) => {
        const abs = path.join(dir, path.basename(String(n)));
        if (seen.has(abs)) return;
        seen.add(abs);
        if (fs.existsSync(abs)) files.push(abs);
    });
    try {
        fs.readdirSync(dir).forEach((name) => {
            if (!VIDEO_RE.test(name)) return;
            const abs = path.join(dir, name);
            if (seen.has(abs)) return;
            seen.add(abs);
            if (fs.existsSync(abs)) files.push(abs);
        });
    } catch (_) { /* ignore */ }
    return files;
}

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
        return (now - (lastIndexAt.get(id) || 0)) >= INDEX_COOLDOWN_MS;
    });
    if (!todo.length) return { ok: true, indexed: 0, cams: 0, skipped: 'cooldown' };

    const baseDir = sosIncidents.getBaseDir && sosIncidents.getBaseDir();
    if (!baseDir || !fs.existsSync(baseDir)) {
        return { ok: true, indexed: 0, cams: 0, skipped: 'no-sos-root' };
    }

    let volume;
    try {
        volume = await ensureVolume();
    } catch (err) {
        log.web.warn('[sos-evidence-index] volume unavailable', { error: err && err.message });
        return { ok: false, indexed: 0, cams: 0, error: 'volume' };
    }
    const volumeId = volume.id;

    let devices = [];
    try {
        devices = await siteDb.listDevices();
    } catch (_) { devices = []; }
    const devicesById = new Map();
    devices.forEach((d) => {
        if (d && d.deviceId) devicesById.set(String(d.deviceId).toLowerCase(), d);
        if (d && d.serialNo) devicesById.set(String(d.serialNo).toLowerCase(), d);
    });

    const want = new Set();
    todo.forEach((id) => {
        resolveAliasesSync(id, devicesById).forEach((a) => want.add(String(a).toLowerCase()));
    });

    let entries = [];
    try {
        entries = typeof sosIncidents.getLedgerEntries === 'function'
            ? sosIncidents.getLedgerEntries()
            : [];
    } catch (_) { entries = []; }

    let indexed = 0;
    for (const entry of entries) {
        if (!entry || entry.kind !== 'alarm') continue;
        let deviceId = entry.cameraId ? String(entry.cameraId).trim() : '';
        const trigger = entry.at || entry.alarmTime || null;
        const dir = entry.folderRel ? path.join(baseDir, entry.folderRel) : null;

        if ((!deviceId || !want.has(deviceId.toLowerCase())) && dir && fs.existsSync(dir)) {
            const j = readIncidentJson(dir);
            if (j && (j.deviceId || j.cameraId)) {
                deviceId = String(j.deviceId || j.cameraId).trim();
            }
        }
        if ((!deviceId || !want.has(deviceId.toLowerCase())) && dir) {
            try {
                const txt = fs.readFileSync(path.join(dir, 'incident.txt'), 'utf8');
                const fromTxt = parseDeviceFromIncidentTxt(txt);
                if (fromTxt) deviceId = fromTxt;
            } catch (_) { /* ignore */ }
        }
        if ((!deviceId || !want.has(deviceId.toLowerCase())) && entry.folderRel) {
            const fromFolder = parseDeviceFromFolderRel(entry.folderRel);
            if (fromFolder) deviceId = fromFolder;
        }
        if (!deviceId || !want.has(deviceId.toLowerCase())) continue;

        const files = collectEntryFiles(baseDir, entry);
        for (const abs of files) {
            try {
                if (await indexFile(abs, deviceId, trigger, volumeId)) indexed += 1;
            } catch (err) {
                log.web.warn('[sos-evidence-index] file failed', {
                    error: err && err.message,
                });
            }
        }
    }

    /* Fallback walk: date folders missing from ledger */
    try {
        const dates = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const dEnt of dates) {
            if (!dEnt.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(dEnt.name)) continue;
            const dayDir = path.join(baseDir, dEnt.name);
            let kids;
            try { kids = fs.readdirSync(dayDir, { withFileTypes: true }); } catch (_) { continue; }
            for (const k of kids) {
                if (!k.isDirectory()) continue;
                const folderRel = dEnt.name + '/' + k.name;
                const dirAbs = path.join(dayDir, k.name);
                let deviceId = null;
                let trigger = null;
                const j = readIncidentJson(dirAbs);
                if (j) {
                    deviceId = String(j.deviceId || j.cameraId || '').trim() || null;
                    trigger = j.triggerTime || j.at || null;
                }
                if (!deviceId) {
                    try {
                        deviceId = parseDeviceFromIncidentTxt(
                            fs.readFileSync(path.join(dirAbs, 'incident.txt'), 'utf8')
                        );
                    } catch (_) { /* ignore */ }
                }
                if (!deviceId) deviceId = parseDeviceFromFolderRel(folderRel);
                if (!deviceId || !want.has(deviceId.toLowerCase())) continue;
                const fakeEntry = {
                    folderRel,
                    serverRecordingLocalFile: null,
                    deviceRecordingLocalFile: null,
                };
                const files = collectEntryFiles(baseDir, fakeEntry);
                for (const abs of files) {
                    try {
                        if (await indexFile(abs, deviceId, trigger, volumeId)) indexed += 1;
                    } catch (_) { /* ignore */ }
                }
            }
        }
    } catch (_) { /* ignore */ }

    todo.forEach((id) => lastIndexAt.set(id, Date.now()));
    return { ok: true, indexed, cams: todo.length };
}

module.exports = {
    indexForCamIds,
};
