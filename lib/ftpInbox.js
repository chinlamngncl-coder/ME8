/**
 * FTP upload inbox — list files under configured FTP root (dock serial folders).
 * Staging browser for super-admin; does not admit into Evidence Library.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const evidenceIngestGate = require('./evidenceIngestGate');
const siteDb = require('./siteDb');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v']);
const AUDIO_EXT = new Set(['.mp3', '.wav', '.aac', '.m4a', '.ogg']);
const SKIP_LIST_NAME = new Set(['manifest.json']);

function kindFromExt(ext) {
    const e = String(ext || '').toLowerCase();
    if (IMAGE_EXT.has(e)) return 'image';
    if (VIDEO_EXT.has(e)) return 'video';
    if (AUDIO_EXT.has(e)) return 'audio';
    return 'file';
}

function isSidecarName(name) {
    const n = String(name || '').toLowerCase();
    if (SKIP_LIST_NAME.has(n)) return true;
    if (n.endsWith('.sha256')) return true;
    if (n.endsWith('.gps.json')) return true;
    return false;
}

function safeRelUnderRoot(ftpRoot, relRaw) {
    const root = path.resolve(ftpRoot);
    const rel = String(relRaw || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!rel || rel.includes('..')) return null;
    const abs = path.resolve(root, rel);
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (abs !== root && !abs.startsWith(rootWithSep)) return null;
    return { abs, rel: path.relative(root, abs).replace(/\\/g, '/') };
}

function catalogRelVariants(rel) {
    const n = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const out = [];
    function add(x) {
        if (x && out.indexOf(x) < 0) out.push(x);
    }
    add(n);
    add(n.replace(/\.tmp$/i, ''));
    const stripped = n.replace(/^(?:.*\/)?ftp-uploads\//i, '');
    add(stripped);
    add(stripped.replace(/\.tmp$/i, ''));
    return out;
}

/** True if this FTP-relative path is already an Evidence Library row. */
async function isInLibraryCatalog(rel) {
    if (!siteDb.isReady()) {
        const err = new Error('catalog_unavailable');
        err.code = 'catalog_unavailable';
        throw err;
    }
    const variants = catalogRelVariants(rel);
    for (let i = 0; i < variants.length; i++) {
        const row = await siteDb.findEvidenceByRelative(variants[i]);
        if (row) return true;
    }
    return false;
}

function officerForSerial(bwcDevicesMod, devicesData, serial) {
    const key = String(serial || '').trim();
    if (!key) {
        return { deviceId: null, officerName: null, mapGroup: null };
    }
    if (!bwcDevicesMod || !devicesData) {
        return { deviceId: key, officerName: null, mapGroup: null };
    }
    let rec = null;
    try {
        rec = bwcDevicesMod.findById(devicesData, key);
    } catch (_) { rec = null; }
    if (!rec && typeof bwcDevicesMod.findBySerial === 'function') {
        try {
            rec = bwcDevicesMod.findBySerial(devicesData, key);
        } catch (_) { rec = null; }
    }
    if (rec) {
        return {
            deviceId: rec.deviceId || key,
            officerName: rec.operatorName || rec.userName || null,
            serialNo: rec.serialNo || null,
            mapGroup: rec.mapGroup || null,
        };
    }
    return { deviceId: key, officerName: null, mapGroup: null };
}

function loadManifestMap(dirAbs) {
    const out = Object.create(null);
    const manPath = path.join(dirAbs, 'manifest.json');
    if (!fs.existsSync(manPath)) return out;
    try {
        const raw = JSON.parse(fs.readFileSync(manPath, 'utf8'));
        if (raw && raw.files && typeof raw.files === 'object') {
            Object.keys(raw.files).forEach((k) => {
                const v = raw.files[k];
                const hash = typeof v === 'string' ? v : (v && (v.sha256 || v.hash));
                if (hash) out[String(k)] = String(hash).toLowerCase().replace(/[^0-9a-f]/g, '');
            });
        }
        const entries = Array.isArray(raw) ? raw : (raw && raw.entries);
        if (Array.isArray(entries)) {
            entries.forEach((e) => {
                if (!e) return;
                const name = e.name || e.file || e.fileName;
                const hash = e.sha256 || e.hash;
                if (name && hash) out[String(name)] = String(hash).toLowerCase().replace(/[^0-9a-f]/g, '');
            });
        }
    } catch (_) { /* ignore bad manifest */ }
    return out;
}

function expectedHashForFile(dirAbs, name) {
    const man = loadManifestMap(dirAbs);
    if (man[name]) return man[name];
    const side = path.join(dirAbs, name + '.sha256');
    if (fs.existsSync(side)) {
        try {
            const t = fs.readFileSync(side, 'utf8').trim().split(/\s+/)[0];
            if (/^[0-9a-f]{64}$/i.test(t)) return t.toLowerCase();
        } catch (_) { /* ignore */ }
    }
    return null;
}

function readGpsSidecar(dirAbs, name) {
    const candidates = [
        path.join(dirAbs, name + '.gps.json'),
        path.join(dirAbs, name.replace(/\.[^.]+$/, '') + '.gps.json'),
        path.join(dirAbs, name + '.json'),
    ];
    for (const p of candidates) {
        if (!fs.existsSync(p)) continue;
        try {
            const j = JSON.parse(fs.readFileSync(p, 'utf8'));
            const lat = Number(j.lat != null ? j.lat : (j.latitude != null ? j.latitude : (j.gps && j.gps.lat)));
            const lon = Number(j.lon != null ? j.lon : (j.lng != null ? j.lng : (j.longitude != null ? j.longitude : (j.gps && j.gps.lon))));
            if (Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)) {
                return { lat, lon };
            }
        } catch (_) { /* ignore */ }
    }
    return null;
}

/**
 * Existing integrity check: compare file bytes to dock manifest / sidecar hash
 * via evidenceIngestGate.sha256File.
 */
async function verifyAgainstManifest(abs, expectedHex) {
    if (!expectedHex || !/^[0-9a-f]{64}$/i.test(expectedHex)) {
        return { integrityVerified: null, integrityStatus: 'no_manifest' };
    }
    try {
        const actual = await evidenceIngestGate.sha256File(abs);
        const ok = String(actual || '').toLowerCase() === String(expectedHex).toLowerCase();
        return {
            integrityVerified: ok,
            integrityStatus: ok ? 'verified' : 'mismatch',
        };
    } catch (_) {
        return { integrityVerified: false, integrityStatus: 'check_failed' };
    }
}

function buildRow(base, extras) {
    return Object.assign({}, base, extras || {});
}

const LIBRARY_TRIAGE_TAG = 'ax-officer-triage';

async function listLibraryTriage(opts) {
    if (!siteDb.isReady()) return [];
    const session = (opts && opts.session) || {};
    const role = String(session.role || session.dashboardRole || '').toLowerCase();
    const isAdmin = role === 'super_admin';
    const keys = isAdmin ? [] : [session.username, session.displayName].filter(Boolean);
    let files = [];
    try {
        files = await siteDb.listEvidenceFilesByTag(LIBRARY_TRIAGE_TAG, {
            officerKeys: keys,
            limit: 200,
        });
    } catch (_) {
        return [];
    }
    return files.map((file) => {
        const name = file.fileName || file.id;
        const kind = kindFromExt(path.extname(name));
        const preview = '/api/evidence/preview/' + encodeURIComponent(file.id);
        return buildRow({
            id: file.id,
            evidenceFileId: file.id,
            name: name,
            path: '',
            rel: file.id,
            fromLibrary: true,
            source: 'library',
            deviceId: file.deviceId || '',
            serial: file.deviceId || '',
            officerName: file.operatorName || '',
            assignedOfficer: file.operatorName || '',
            mapGroup: '',
            size: file.byteSize || 0,
            mtimeMs: file.uploadedAt ? Date.parse(file.uploadedAt) : 0,
            uploadedAt: file.uploadedAt || '',
            kind: kind,
            mediaType: kind,
            url: preview,
            thumbUrl: kind === 'image' ? preview : '',
            isImage: kind === 'image',
            isVideo: kind === 'video',
        });
    });
}

/**
 * @param {object} opts
 * @param {string} opts.ftpRoot
 * @param {object} opts.bwcDevices module
 * @param {number} [opts.maxFiles]
 */
async function listInbox(opts) {
    const ftpRoot = opts && opts.ftpRoot ? String(opts.ftpRoot) : '';
    const maxFiles = Math.max(50, Math.min(2000, parseInt((opts && opts.maxFiles) || 500, 10) || 500));
    const files = [];
    if (!ftpRoot || !fs.existsSync(ftpRoot)) {
        const libOnly = await listLibraryTriage(opts);
        return {
            ok: true,
            files: libOnly,
            items: libOnly,
            count: libOnly.length,
        };
    }
    if (!siteDb.isReady()) {
        return {
            ok: false,
            error: 'catalog_unavailable',
            files: [],
            items: [],
            count: 0,
        };
    }

    let deviceDirs = [];
    try {
        deviceDirs = fs.readdirSync(ftpRoot, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
    } catch (err) {
        return {
            ok: false,
            error: 'ftp_read_failed',
            message: 'Could not read FTP uploads',
            files: [],
            items: [],
            count: 0,
        };
    }

    const walkDir = async (dirAbs, deviceId, relBase) => {
        let entries = [];
        try {
            entries = fs.readdirSync(dirAbs, { withFileTypes: true });
        } catch (_) {
            return;
        }
        for (const ent of entries) {
            if (files.length >= maxFiles) return;
            const name = ent.name;
            if (!name || name.startsWith('.')) continue;
            const abs = path.join(dirAbs, name);
            const rel = (relBase ? relBase + '/' : '') + name;
            if (ent.isDirectory()) {
                await walkDir(abs, deviceId, rel);
                continue;
            }
            if (!ent.isFile()) continue;
            if (isSidecarName(name)) continue;
            if (await isInLibraryCatalog(rel)) continue;
            let st;
            try { st = fs.statSync(abs); } catch (_) { continue; }
            const ext = path.extname(name);
            const kind = kindFromExt(ext);
            const officer = officerForSerial(opts.bwcDevices, opts.devicesData, deviceId);
            const id = crypto.createHash('sha1').update(rel).digest('hex').slice(0, 16);
            const fileUrl = '/api/ftp-inbox/file?rel=' + encodeURIComponent(rel);
            const gps = readGpsSidecar(dirAbs, name);
            const expected = expectedHashForFile(dirAbs, name);
            const integrity = await verifyAgainstManifest(abs, expected);
            files.push(buildRow({
                id,
                name,
                path: rel,
                rel,
                deviceId: officer.deviceId || deviceId,
                serial: deviceId,
                officerName: officer.officerName || '',
                assignedOfficer: officer.officerName || '',
                mapGroup: officer.mapGroup || '',
                size: st.size,
                mtimeMs: st.mtimeMs,
                uploadedAt: new Date(st.mtimeMs).toISOString(),
                kind,
                mediaType: kind,
                url: fileUrl,
                thumbUrl: kind === 'image' ? fileUrl : '',
                isImage: kind === 'image',
                isVideo: kind === 'video',
                lat: gps ? gps.lat : null,
                lon: gps ? gps.lon : null,
                hasGps: !!gps,
                integrityVerified: integrity.integrityVerified,
                integrityStatus: integrity.integrityStatus,
            }));
        }
    };

    for (const serial of deviceDirs) {
        if (files.length >= maxFiles) break;
        await walkDir(path.join(ftpRoot, serial), serial, serial);
    }

    try {
        const top = fs.readdirSync(ftpRoot, { withFileTypes: true });
        for (const ent of top) {
            if (files.length >= maxFiles) break;
            if (!ent.isFile()) continue;
            const name = ent.name;
            if (!name || name.startsWith('.') || isSidecarName(name)) continue;
            if (await isInLibraryCatalog(name)) continue;
            const abs = path.join(ftpRoot, name);
            let st;
            try { st = fs.statSync(abs); } catch (_) { continue; }
            const ext = path.extname(name);
            const kind = kindFromExt(ext);
            const id = crypto.createHash('sha1').update(name).digest('hex').slice(0, 16);
            const fileUrl = '/api/ftp-inbox/file?rel=' + encodeURIComponent(name);
            const gps = readGpsSidecar(ftpRoot, name);
            const expected = expectedHashForFile(ftpRoot, name);
            const integrity = await verifyAgainstManifest(abs, expected);
            files.push(buildRow({
                id,
                name,
                path: name,
                rel: name,
                deviceId: null,
                serial: null,
                officerName: '',
                assignedOfficer: '',
                mapGroup: '',
                size: st.size,
                mtimeMs: st.mtimeMs,
                uploadedAt: new Date(st.mtimeMs).toISOString(),
                kind,
                mediaType: kind,
                url: fileUrl,
                thumbUrl: kind === 'image' ? fileUrl : '',
                isImage: kind === 'image',
                isVideo: kind === 'video',
                lat: gps ? gps.lat : null,
                lon: gps ? gps.lon : null,
                hasGps: !!gps,
                integrityVerified: integrity.integrityVerified,
                integrityStatus: integrity.integrityStatus,
            }));
        }
    } catch (_) { /* ignore */ }

    const libRows = await listLibraryTriage(opts);
    libRows.forEach((row) => {
        if (files.length >= maxFiles) return;
        files.push(row);
    });

    files.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));

    return {
        ok: true,
        files,
        items: files,
        count: files.length,
    };
}

/**
 * Permanently remove uncataloged staging leftovers only.
 * Files already in Evidence Library are skipped (not unlinked).
 * @returns {Promise<{ ok: boolean, deleted: string[], failed: Array<{rel:string,error:string}>, count: number }>}
 */
async function purgeFiles(ftpRoot, rels) {
    if (!siteDb.isReady()) {
        return { ok: false, error: 'catalog_unavailable', deleted: [], failed: [], count: 0 };
    }
    const deleted = [];
    const failed = [];
    const list = Array.isArray(rels) ? rels : [];
    for (const raw of list) {
        const hit = safeRelUnderRoot(ftpRoot, raw);
        if (!hit) {
            failed.push({ rel: String(raw || ''), error: 'bad_path' });
            continue;
        }
        try {
            if (await isInLibraryCatalog(hit.rel)) {
                failed.push({ rel: hit.rel, error: 'in_library' });
                continue;
            }
            if (!fs.existsSync(hit.abs)) {
                failed.push({ rel: hit.rel, error: 'not_found' });
                continue;
            }
            const st = fs.lstatSync(hit.abs);
            if (!st.isFile()) {
                failed.push({ rel: hit.rel, error: 'not_file' });
                continue;
            }
            fs.unlinkSync(hit.abs);
            deleted.push(hit.rel);
            /* best-effort sidecar cleanup */
            [hit.abs + '.sha256', hit.abs + '.gps.json', hit.abs + '.json'].forEach((p) => {
                try { if (fs.existsSync(p) && fs.lstatSync(p).isFile()) fs.unlinkSync(p); } catch (_) { /* ignore */ }
            });
        } catch (err) {
            failed.push({ rel: hit.rel, error: 'delete_failed' });
        }
    }
    return { ok: true, deleted, failed, count: deleted.length };
}

module.exports = {
    listInbox,
    safeRelUnderRoot,
    kindFromExt,
    purgeFiles,
    verifyAgainstManifest,
};
