/**
 * Site database — SQLite registry + audit (Phase 1).
 * Uses Node built-in node:sqlite (no extra npm dependency).
 */
const fs = require('fs');
const path = require('path');
const siteTime = require('./siteTime');
const { DatabaseSync } = require('node:sqlite');

let db = null;
let storageDir = null;

function isReady() {
    return !!db;
}

function dbPath() {
    return path.join(storageDir || path.join(__dirname, '..', 'storage'), 'mobility.db');
}

function init(dir) {
    if (db) return db;
    storageDir = dir || storageDir;
    fs.mkdirSync(storageDir, { recursive: true });
    db = new DatabaseSync(dbPath());
    db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS bwc_devices (
            device_id TEXT PRIMARY KEY,
            operator_name TEXT NOT NULL DEFAULT '',
            map_group TEXT NOT NULL DEFAULT '',
            user_name TEXT NOT NULL DEFAULT '',
            password TEXT NOT NULL DEFAULT '',
            protocol TEXT NOT NULL DEFAULT 'sip',
            geofence_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bwc_map_group ON bwc_devices(map_group);

        CREATE TABLE IF NOT EXISTS bwc_runtime (
            device_id TEXT PRIMARY KEY,
            online INTEGER NOT NULL DEFAULT 0,
            last_seen INTEGER NOT NULL DEFAULT 0,
            last_ip TEXT,
            ptt_online INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            actor TEXT,
            role TEXT,
            action TEXT NOT NULL,
            target TEXT,
            detail_json TEXT,
            client_ip TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);

        CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS evidence_files (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL DEFAULT 'dock_ftp',
            storage_tier TEXT NOT NULL DEFAULT 'local',
            relative_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            byte_size INTEGER NOT NULL DEFAULT 0,
            sha256 TEXT,
            device_id TEXT,
            operator_name TEXT,
            uploaded_at TEXT NOT NULL,
            peer_ip TEXT,
            sync_status TEXT NOT NULL DEFAULT 'synced',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_uploaded ON evidence_files(uploaded_at DESC);

        CREATE TABLE IF NOT EXISTS evidence_downloads (
            download_id TEXT PRIMARY KEY,
            evidence_file_id TEXT NOT NULL,
            actor TEXT,
            user_id TEXT,
            role TEXT,
            requested_at TEXT NOT NULL,
            token_expires_at TEXT NOT NULL,
            consumed_at TEXT,
            client_ip TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_dl_ts ON evidence_downloads(requested_at DESC);

        CREATE TABLE IF NOT EXISTS bwc_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
            text TEXT NOT NULL,
            msg_time TEXT,
            msg_type INTEGER,
            msg_level INTEGER,
            sender_name TEXT,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bwc_messages_device ON bwc_messages(device_id, id DESC);

        CREATE TABLE IF NOT EXISTS evidence_meta (
            evidence_file_id TEXT PRIMARY KEY,
            notes TEXT,
            sos_incident_id TEXT,
            trim_start_sec REAL,
            trim_end_sec REAL,
            dock_id TEXT,
            dock_bay INTEGER,
            updated_at TEXT,
            updated_by TEXT
        );

        CREATE TABLE IF NOT EXISTS evidence_attachments (
            id TEXT PRIMARY KEY,
            evidence_file_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'photo',
            byte_size INTEGER NOT NULL DEFAULT 0,
            uploaded_at TEXT NOT NULL,
            uploaded_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_attach_file ON evidence_attachments(evidence_file_id);

        CREATE TABLE IF NOT EXISTS evidence_exports (
            export_id TEXT PRIMARY KEY,
            evidence_file_id TEXT NOT NULL,
            export_type TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            byte_size INTEGER NOT NULL DEFAULT 0,
            actor TEXT,
            user_id TEXT,
            created_at TEXT NOT NULL,
            meta_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_exports_file ON evidence_exports(evidence_file_id DESC);

        CREATE TABLE IF NOT EXISTS evidence_secure_exports (
            request_id TEXT PRIMARY KEY,
            evidence_file_id TEXT NOT NULL,
            requested_by TEXT,
            requester_user_id TEXT,
            requester_role TEXT,
            reason TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            requested_at TEXT NOT NULL,
            reviewed_by TEXT,
            reviewer_user_id TEXT,
            reviewed_at TEXT,
            deny_reason TEXT,
            encrypted_path TEXT,
            encrypted_file_name TEXT,
            byte_size INTEGER NOT NULL DEFAULT 0,
            download_expires_at TEXT,
            consumed_at TEXT,
            client_ip TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_secure_status ON evidence_secure_exports(status, requested_at DESC);

        CREATE TABLE IF NOT EXISTS gps_track_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            recorded_at TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            source TEXT NOT NULL DEFAULT 'sip'
        );
        CREATE INDEX IF NOT EXISTS idx_gps_track_device_time ON gps_track_points(device_id, recorded_at);

        CREATE TABLE IF NOT EXISTS case_files (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            officer_name TEXT,
            device_id TEXT,
            sos_incident_id TEXT,
            narrative TEXT,
            created_at TEXT NOT NULL,
            created_by TEXT,
            updated_at TEXT NOT NULL,
            updated_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_case_files_updated ON case_files(updated_at DESC);

        CREATE TABLE IF NOT EXISTS case_file_evidence (
            case_file_id TEXT NOT NULL,
            evidence_file_id TEXT NOT NULL,
            linked_at TEXT NOT NULL,
            linked_by TEXT,
            PRIMARY KEY (case_file_id, evidence_file_id)
        );
        CREATE INDEX IF NOT EXISTS idx_case_file_evidence_case ON case_file_evidence(case_file_id);
    `);
    return db;
}

function rowToDevice(row) {
    if (!row) return null;
    const out = {
        deviceId: row.device_id,
        operatorName: row.operator_name || '',
        mapGroup: row.map_group || '',
        userName: row.user_name || '',
        password: row.password || '',
        protocol: row.protocol === 'onvif' ? 'onvif' : 'sip',
    };
    if (row.geofence_json) {
        try {
            out.geofence = JSON.parse(row.geofence_json);
        } catch (_) { /* ignore */ }
    }
    return out;
}

function listDevices() {
    if (!db) return [];
    return db.prepare('SELECT * FROM bwc_devices ORDER BY operator_name, device_id').all().map(rowToDevice);
}

function saveDevices(devices) {
    if (!db) return [];
    const now = new Date().toISOString();
    const del = db.prepare('DELETE FROM bwc_devices');
    const ins = db.prepare(`
        INSERT INTO bwc_devices (
            device_id, operator_name, map_group, user_name, password, protocol,
            geofence_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    db.exec('BEGIN');
    try {
        del.run();
        devices.forEach((d) => {
            ins.run(
                d.deviceId,
                d.operatorName || '',
                d.mapGroup || '',
                d.userName || '',
                d.password || '',
                d.protocol === 'onvif' ? 'onvif' : 'sip',
                d.geofence != null ? JSON.stringify(d.geofence) : null,
                now,
                now
            );
        });
        db.exec('COMMIT');
    } catch (err) {
        try { db.exec('ROLLBACK'); } catch (_) { /* ignore */ }
        throw err;
    }
    return listDevices();
}

function findDevice(deviceId) {
    if (!db || !deviceId) return null;
    const row = db.prepare('SELECT * FROM bwc_devices WHERE device_id = ?').get(String(deviceId).trim());
    return rowToDevice(row);
}

function deviceCount() {
    if (!db) return 0;
    return db.prepare('SELECT COUNT(*) AS n FROM bwc_devices').get().n;
}

function migrateFromJson(jsonPath) {
    if (!db || !jsonPath || !fs.existsSync(jsonPath)) return { imported: 0 };
    if (deviceCount() > 0) return { imported: 0, skipped: 'db-not-empty' };
    let data;
    try {
        data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (_) {
        return { imported: 0, error: 'json-read-failed' };
    }
    const devices = (data.devices || []).filter((d) => d && d.deviceId);
    if (!devices.length) return { imported: 0 };
    saveDevices(devices.map((d) => ({
        deviceId: String(d.deviceId).trim(),
        operatorName: d.operatorName,
        mapGroup: d.mapGroup,
        userName: d.userName,
        password: d.password,
        protocol: d.protocol,
        geofence: d.geofence,
    })));
    return { imported: devices.length };
}

function exportToJson(jsonPath) {
    const devices = listDevices();
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify({ devices }, null, 2), 'utf8');
    return devices.length;
}

function appendAudit(entry) {
    if (!db) return null;
    const ts = siteTime.formatEvidence(new Date());
    const detail = entry.detail != null ? JSON.stringify(entry.detail) : null;
    const info = db.prepare(`
        INSERT INTO audit_log (ts, actor, role, action, target, detail_json, client_ip)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        ts,
        entry.actor || null,
        entry.role || null,
        String(entry.action || 'unknown'),
        entry.target != null ? String(entry.target) : null,
        detail,
        entry.clientIp || entry.ip || null
    );
    return { id: info.lastInsertRowid, ts };
}

function listAudit(opts) {
    return queryAudit(opts).rows;
}

function queryAudit(opts) {
    if (!db) return { rows: [], total: 0 };
    opts = opts || {};
    const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 100, 1), 500);
    const offset = Math.max(parseInt(opts.offset, 10) || 0, 0);
    const conditions = [];
    const params = [];

    if (opts.since) {
        conditions.push('ts >= ?');
        params.push(String(opts.since));
    }
    if (opts.until) {
        conditions.push('ts <= ?');
        params.push(String(opts.until));
    }
    if (opts.actor) {
        conditions.push('LOWER(COALESCE(actor, \'\')) LIKE ?');
        params.push('%' + String(opts.actor).trim().toLowerCase() + '%');
    }
    if (opts.actions && Array.isArray(opts.actions) && opts.actions.length) {
        const safe = opts.actions.map(function (a) { return String(a || '').trim(); }).filter(Boolean);
        if (safe.length) {
            conditions.push('action IN (' + safe.map(function () { return '?'; }).join(', ') + ')');
            safe.forEach(function (a) { params.push(a); });
        }
    } else if (opts.action) {
        conditions.push('action = ?');
        params.push(String(opts.action).trim());
    }
    if (opts.category) {
        const cat = String(opts.category).trim().replace(/[^a-z0-9._-]/gi, '');
        if (cat) {
            let pattern = cat + '%';
            if (cat === 'dispatch') pattern = 'dispatch_groups%';
            else if (cat === 'lab') pattern = 'lab_security%';
            else if (cat === 'cloud') pattern = 'cloud_deployment%';
            else if (cat === 'users') pattern = 'user.%';
            conditions.push('action LIKE ?');
            params.push(pattern);
        }
    }
    if (opts.q) {
        const q = '%' + String(opts.q).trim().toLowerCase() + '%';
        conditions.push('(LOWER(COALESCE(actor, \'\')) LIKE ? OR LOWER(COALESCE(target, \'\')) LIKE ? OR LOWER(action) LIKE ? OR LOWER(COALESCE(detail_json, \'\')) LIKE ?)');
        params.push(q, q, q, q);
    }

    const where = conditions.length ? ('WHERE ' + conditions.join(' AND ')) : '';
    const totalRow = db.prepare('SELECT COUNT(*) AS n FROM audit_log ' + where).get(...params);
    const total = totalRow ? totalRow.n : 0;
    const rows = db.prepare(`
        SELECT id, ts, actor, role, action, target, detail_json, client_ip
        FROM audit_log ${where} ORDER BY ts DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    return { rows, total };
}

function queryAuditForEvidenceFile(fileId, likeFileId, likeEvidenceFileId, limit) {
    if (!db || !fileId) return [];
    const n = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));
    return db.prepare(`
        SELECT id, ts, actor, role, action, target, detail_json, client_ip
        FROM audit_log
        WHERE action LIKE 'evidence.%'
          AND (target = ? OR detail_json LIKE ? OR detail_json LIKE ?)
        ORDER BY ts DESC
        LIMIT ?
    `).all(String(fileId), likeFileId, likeEvidenceFileId, n);
}

function listDistinctAuditActions() {
    if (!db) return [];
    return db.prepare('SELECT DISTINCT action FROM audit_log ORDER BY action ASC').all()
        .map(function (r) { return r.action; });
}

function countAudit() {
    if (!db) return 0;
    const row = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get();
    return row ? row.n : 0;
}

function auditLogReadable() {
    if (!db) return false;
    try {
        db.prepare('SELECT COUNT(*) AS n FROM audit_log').get();
        return true;
    } catch (_) {
        return false;
    }
}

function recreateAuditLogTable() {
    if (!db) throw new Error('Database not ready');
    if (auditLogReadable()) return;
    try {
        db.exec('ALTER TABLE audit_log RENAME TO audit_log_bad');
    } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (!/no such table/i.test(msg)) throw err;
    }
    db.exec('DROP TABLE IF EXISTS audit_log_fresh');
    db.exec(`
        CREATE TABLE audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            actor TEXT,
            role TEXT,
            action TEXT NOT NULL,
            target TEXT,
            detail_json TEXT,
            client_ip TEXT
        );
        CREATE INDEX idx_audit_ts ON audit_log(ts DESC);
    `);
}

/**
 * Repair corrupted audit_log only — evidence_files and other tables are untouched.
 * Optional importFrom: path to a mobility.db with a readable audit_log (best-effort history).
 */
function repairAuditLog(opts) {
    opts = opts || {};
    if (!db) return { ok: false, error: 'Database not ready' };
    if (auditLogReadable()) {
        return { ok: true, skipped: true, count: countAudit() };
    }
    try {
        try { db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch (_) { /* best-effort */ }
        recreateAuditLogTable();
        let imported = 0;
        const importFrom = opts.importFrom ? String(opts.importFrom) : '';
        if (importFrom && fs.existsSync(importFrom)) {
            const src = new DatabaseSync(importFrom);
            try {
                src.prepare('SELECT COUNT(*) AS n FROM audit_log').get();
                const rows = src.prepare(`
                    SELECT ts, actor, role, action, target, detail_json, client_ip
                    FROM audit_log ORDER BY id ASC
                `).all();
                const ins = db.prepare(`
                    INSERT INTO audit_log (ts, actor, role, action, target, detail_json, client_ip)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    ins.run(
                        row.ts,
                        row.actor,
                        row.role,
                        row.action,
                        row.target,
                        row.detail_json,
                        row.client_ip
                    );
                }
                imported = rows.length;
            } finally {
                src.close();
            }
        }
        return { ok: true, recreated: true, imported: imported, count: countAudit() };
    } catch (err) {
        return {
            ok: false,
            error: err && err.message ? err.message : String(err),
        };
    }
}

function setSetting(key, value) {
    if (!db) return;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO site_settings (key, value_json, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run(String(key), JSON.stringify(value), now);
}

function getSetting(key, fallback) {
    if (!db) return fallback;
    const row = db.prepare('SELECT value_json FROM site_settings WHERE key = ?').get(String(key));
    if (!row) return fallback;
    try {
        return JSON.parse(row.value_json);
    } catch (_) {
        return fallback;
    }
}

function listRecentOnline(maxAgeMs) {
    if (!db) return [];
    const cutoff = Date.now() - Math.max(0, parseInt(maxAgeMs, 10) || 0);
    return db.prepare(`
        SELECT device_id, online, last_seen, last_ip
        FROM bwc_runtime
        WHERE online = 1 OR last_seen >= ?
        ORDER BY last_seen DESC
    `).all(cutoff);
}

function touchRuntime(deviceId, patch) {
    if (!db || !deviceId) return;
    const id = String(deviceId).trim();
    const now = new Date().toISOString();
    const prev = db.prepare('SELECT * FROM bwc_runtime WHERE device_id = ?').get(id);
    const online = patch.online != null ? (patch.online ? 1 : 0) : (prev ? prev.online : 0);
    const lastSeen = patch.lastSeen != null ? patch.lastSeen : (prev ? prev.last_seen : 0);
    const lastIp = patch.lastIp != null ? patch.lastIp : (prev ? prev.last_ip : null);
    const ptt = patch.pttOnline != null ? (patch.pttOnline ? 1 : 0) : (prev ? prev.ptt_online : 0);
    db.prepare(`
        INSERT INTO bwc_runtime (device_id, online, last_seen, last_ip, ptt_online, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET
            online = excluded.online,
            last_seen = excluded.last_seen,
            last_ip = excluded.last_ip,
            ptt_online = excluded.ptt_online,
            updated_at = excluded.updated_at
    `).run(id, online, lastSeen, lastIp, ptt, now);
}

function upsertEvidenceFile(row) {
    if (!db || !row || !row.id) return null;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO evidence_files (
            id, source, storage_tier, relative_path, file_name, byte_size, sha256,
            device_id, operator_name, uploaded_at, peer_ip, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            source = excluded.source,
            storage_tier = excluded.storage_tier,
            relative_path = excluded.relative_path,
            file_name = excluded.file_name,
            byte_size = excluded.byte_size,
            sha256 = excluded.sha256,
            device_id = excluded.device_id,
            operator_name = excluded.operator_name,
            uploaded_at = excluded.uploaded_at,
            peer_ip = excluded.peer_ip,
            sync_status = excluded.sync_status
    `).run(
        row.id,
        row.source || 'dock_ftp',
        row.storageTier || 'local',
        row.relativePath,
        row.fileName,
        row.byteSize || 0,
        row.sha256 || null,
        row.deviceId || null,
        row.operatorName || null,
        row.uploadedAt || now,
        row.peerIp || null,
        row.syncStatus || 'synced',
        row.createdAt || now
    );
    return row.id;
}

function findEvidenceByRelative(relativePath) {
    if (!db) return null;
    return db.prepare('SELECT * FROM evidence_files WHERE relative_path = ?').get(relativePath);
}

function getEvidenceFile(id) {
    if (!db || !id) return null;
    const row = db.prepare('SELECT * FROM evidence_files WHERE id = ?').get(String(id));
    if (!row) return null;
    return {
        id: row.id,
        source: row.source,
        storageTier: row.storage_tier,
        relativePath: row.relative_path,
        fileName: row.file_name,
        byteSize: row.byte_size,
        deviceId: row.device_id,
        operatorName: row.operator_name,
        uploadedAt: row.uploaded_at,
        peerIp: row.peer_ip,
        syncStatus: row.sync_status,
    };
}

function listEvidenceFiles(limit) {
    if (!db) return [];
    const n = Math.min(5000, Math.max(1, parseInt(limit, 10) || 100));
    return db.prepare(`
        SELECT id, source, storage_tier, relative_path, file_name, byte_size,
               device_id, operator_name, uploaded_at, peer_ip, sync_status
        FROM evidence_files ORDER BY uploaded_at DESC LIMIT ?
    `).all(n).map((row) => ({
        id: row.id,
        source: row.source,
        storageTier: row.storage_tier,
        relativePath: row.relative_path,
        fileName: row.file_name,
        byteSize: row.byte_size,
        deviceId: row.device_id,
        operatorName: row.operator_name,
        uploadedAt: row.uploaded_at,
        peerIp: row.peer_ip,
        syncStatus: row.sync_status,
    }));
}

function insertEvidenceDownload(row) {
    if (!db || !row || !row.downloadId) return null;
    db.prepare(`
        INSERT INTO evidence_downloads (
            download_id, evidence_file_id, actor, user_id, role,
            requested_at, token_expires_at, consumed_at, client_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        row.downloadId,
        row.evidenceFileId,
        row.actor || null,
        row.userId || null,
        row.role || null,
        row.requestedAt,
        row.tokenExpiresAt,
        row.consumedAt || null,
        row.clientIp || null
    );
    return row.downloadId;
}

function getEvidenceDownload(downloadId) {
    if (!db || !downloadId) return null;
    const row = db.prepare('SELECT * FROM evidence_downloads WHERE download_id = ?').get(String(downloadId));
    if (!row) return null;
    return {
        downloadId: row.download_id,
        evidenceFileId: row.evidence_file_id,
        actor: row.actor,
        userId: row.user_id,
        role: row.role,
        requestedAt: row.requested_at,
        tokenExpiresAt: row.token_expires_at,
        consumedAt: row.consumed_at,
        clientIp: row.client_ip,
    };
}

function markEvidenceDownloadConsumed(downloadId) {
    if (!db || !downloadId) return;
    db.prepare('UPDATE evidence_downloads SET consumed_at = ? WHERE download_id = ?')
        .run(new Date().toISOString(), String(downloadId));
}

function listEvidenceDownloads(limit) {
    if (!db) return [];
    const n = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    return db.prepare(`
        SELECT d.download_id, d.evidence_file_id, d.actor, d.user_id, d.requested_at,
               d.token_expires_at, d.consumed_at, f.file_name
        FROM evidence_downloads d
        LEFT JOIN evidence_files f ON f.id = d.evidence_file_id
        ORDER BY d.requested_at DESC LIMIT ?
    `).all(n);
}

function appendBwcMessage(row) {
    if (!db || !row || !row.deviceId) return null;
    const now = new Date().toISOString();
    const info = db.prepare(`
        INSERT INTO bwc_messages (device_id, direction, text, msg_time, msg_type, msg_level, sender_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        String(row.deviceId),
        row.direction === 'out' ? 'out' : 'in',
        String(row.text != null ? row.text : ''),
        row.msgTime || null,
        row.msgType != null ? parseInt(row.msgType, 10) : null,
        row.msgLevel != null ? parseInt(row.msgLevel, 10) : null,
        row.senderName || null,
        now
    );
    return { id: info.lastInsertRowid, createdAt: now };
}

function listBwcMessages(deviceId, limit, sinceHours) {
    if (!db || !deviceId) return [];
    const n = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const hours = sinceHours != null ? parseInt(sinceHours, 10) : null;
    if (hours != null && hours > 0) {
        const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
        return db.prepare(`
            SELECT id, device_id AS deviceId, direction, text, msg_time AS msgTime,
                   msg_type AS msgType, msg_level AS msgLevel, sender_name AS senderName, created_at AS createdAt
            FROM bwc_messages WHERE device_id = ? AND created_at >= ? ORDER BY id ASC LIMIT ?
        `).all(String(deviceId), since, n);
    }
    return db.prepare(`
        SELECT id, device_id AS deviceId, direction, text, msg_time AS msgTime,
               msg_type AS msgType, msg_level AS msgLevel, sender_name AS senderName, created_at AS createdAt
        FROM bwc_messages WHERE device_id = ? ORDER BY id ASC LIMIT ?
    `).all(String(deviceId), n);
}

function listBwcMessageThreads(limit, sinceHours) {
    if (!db) return [];
    const n = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const hours = sinceHours != null ? parseInt(sinceHours, 10) : null;
    const sinceClause = hours != null && hours > 0
        ? ' AND created_at >= ?'
        : '';
    const since = hours != null && hours > 0
        ? new Date(Date.now() - hours * 3600 * 1000).toISOString()
        : null;
    const sql = `
        SELECT m.device_id AS deviceId, m.direction, m.text, m.msg_time AS msgTime,
               m.sender_name AS senderName, m.created_at AS createdAt, t.msg_count AS msgCount
        FROM bwc_messages m
        INNER JOIN (
            SELECT device_id, MAX(id) AS last_id, COUNT(*) AS msg_count
            FROM bwc_messages WHERE 1=1${sinceClause} GROUP BY device_id
        ) t ON m.device_id = t.device_id AND m.id = t.last_id
        ORDER BY m.id DESC LIMIT ?
    `;
    if (since) return db.prepare(sql).all(since, n);
    return db.prepare(sql).all(n);
}

function clearBwcMessagesForDevice(deviceId) {
    if (!db || !deviceId) return 0;
    const info = db.prepare('DELETE FROM bwc_messages WHERE device_id = ?').run(String(deviceId));
    return info.changes || 0;
}

function clearAllBwcMessages() {
    if (!db) return 0;
    const info = db.prepare('DELETE FROM bwc_messages').run();
    return info.changes || 0;
}

function purgeBwcMessagesOlderThanDays(days) {
    if (!db) return 0;
    const d = Math.max(parseInt(days, 10) || 30, 1);
    const since = new Date(Date.now() - d * 86400 * 1000).toISOString();
    const info = db.prepare('DELETE FROM bwc_messages WHERE created_at < ?').run(since);
    return info.changes || 0;
}

function getEvidenceMeta(evidenceFileId) {
    if (!db || !evidenceFileId) return null;
    const row = db.prepare('SELECT * FROM evidence_meta WHERE evidence_file_id = ?').get(String(evidenceFileId));
    if (!row) return null;
    return {
        evidenceFileId: row.evidence_file_id,
        notes: row.notes || '',
        sosIncidentId: row.sos_incident_id || null,
        trimStartSec: row.trim_start_sec != null ? row.trim_start_sec : null,
        trimEndSec: row.trim_end_sec != null ? row.trim_end_sec : null,
        dockId: row.dock_id || null,
        dockBay: row.dock_bay != null ? row.dock_bay : null,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
    };
}

function upsertEvidenceMeta(row) {
    if (!db || !row || !row.evidenceFileId) return null;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO evidence_meta (
            evidence_file_id, notes, sos_incident_id, trim_start_sec, trim_end_sec,
            dock_id, dock_bay, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(evidence_file_id) DO UPDATE SET
            notes = excluded.notes,
            sos_incident_id = excluded.sos_incident_id,
            trim_start_sec = excluded.trim_start_sec,
            trim_end_sec = excluded.trim_end_sec,
            dock_id = excluded.dock_id,
            dock_bay = excluded.dock_bay,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
    `).run(
        row.evidenceFileId,
        row.notes != null ? String(row.notes) : '',
        row.sosIncidentId || null,
        row.trimStartSec != null ? Number(row.trimStartSec) : null,
        row.trimEndSec != null ? Number(row.trimEndSec) : null,
        row.dockId || null,
        row.dockBay != null ? parseInt(row.dockBay, 10) : null,
        row.updatedAt || now,
        row.updatedBy || null
    );
    return row.evidenceFileId;
}

function listEvidenceAttachments(evidenceFileId) {
    if (!db || !evidenceFileId) return [];
    return db.prepare(`
        SELECT id, evidence_file_id, file_name, relative_path, kind, byte_size, uploaded_at, uploaded_by
        FROM evidence_attachments WHERE evidence_file_id = ? ORDER BY uploaded_at DESC
    `).all(String(evidenceFileId)).map(function (row) {
        return {
            id: row.id,
            evidenceFileId: row.evidence_file_id,
            fileName: row.file_name,
            relativePath: row.relative_path,
            kind: row.kind,
            byteSize: row.byte_size,
            uploadedAt: row.uploaded_at,
            uploadedBy: row.uploaded_by,
        };
    });
}

function insertEvidenceAttachment(row) {
    if (!db || !row || !row.id) return null;
    db.prepare(`
        INSERT INTO evidence_attachments (
            id, evidence_file_id, file_name, relative_path, kind, byte_size, uploaded_at, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        row.id,
        row.evidenceFileId,
        row.fileName,
        row.relativePath,
        row.kind || 'photo',
        row.byteSize || 0,
        row.uploadedAt || new Date().toISOString(),
        row.uploadedBy || null
    );
    return row.id;
}

function getEvidenceAttachment(id) {
    if (!db || !id) return null;
    const row = db.prepare('SELECT * FROM evidence_attachments WHERE id = ?').get(String(id));
    if (!row) return null;
    return {
        id: row.id,
        evidenceFileId: row.evidence_file_id,
        fileName: row.file_name,
        relativePath: row.relative_path,
        kind: row.kind,
        byteSize: row.byte_size,
        uploadedAt: row.uploaded_at,
        uploadedBy: row.uploaded_by,
    };
}

function insertEvidenceExport(row) {
    if (!db || !row || !row.exportId) return null;
    db.prepare(`
        INSERT INTO evidence_exports (
            export_id, evidence_file_id, export_type, relative_path, file_name,
            byte_size, actor, user_id, created_at, meta_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        row.exportId,
        row.evidenceFileId,
        row.exportType || 'trim',
        row.relativePath,
        row.fileName,
        row.byteSize || 0,
        row.actor || null,
        row.userId || null,
        row.createdAt || new Date().toISOString(),
        row.metaJson || null
    );
    return row.exportId;
}

function mapExportRow(row) {
    let meta = null;
    if (row.meta_json) {
        try { meta = JSON.parse(row.meta_json); } catch (_) { meta = null; }
    }
    return {
        exportId: row.export_id,
        evidenceFileId: row.evidence_file_id,
        exportType: row.export_type,
        fileName: row.file_name,
        byteSize: row.byte_size,
        createdAt: row.created_at,
        actor: row.actor,
        meta: meta,
    };
}

function listEvidenceExports(evidenceFileId, limit) {
    if (!db) return [];
    const n = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const cols = `export_id, evidence_file_id, export_type, file_name, byte_size, created_at, actor, meta_json`;
    if (evidenceFileId) {
        return db.prepare(`
            SELECT ${cols}
            FROM evidence_exports WHERE evidence_file_id = ? ORDER BY created_at DESC LIMIT ?
        `).all(String(evidenceFileId), n).map(mapExportRow);
    }
    return db.prepare(`
        SELECT ${cols}
        FROM evidence_exports ORDER BY created_at DESC LIMIT ?
    `).all(n).map(mapExportRow);
}

function updateEvidenceExportMeta(exportId, metaJson) {
    if (!db || !exportId) return false;
    const json = typeof metaJson === 'string' ? metaJson : JSON.stringify(metaJson || {});
    db.prepare('UPDATE evidence_exports SET meta_json = ? WHERE export_id = ?').run(json, String(exportId));
    return true;
}

function getEvidenceExport(exportId) {
    if (!db || !exportId) return null;
    const row = db.prepare('SELECT * FROM evidence_exports WHERE export_id = ?').get(String(exportId));
    if (!row) return null;
    return {
        exportId: row.export_id,
        evidenceFileId: row.evidence_file_id,
        exportType: row.export_type,
        relativePath: row.relative_path,
        fileName: row.file_name,
        byteSize: row.byte_size,
        actor: row.actor,
        userId: row.user_id,
        createdAt: row.created_at,
        metaJson: row.meta_json,
    };
}

function mapSecureExportRow(row) {
    return {
        requestId: row.request_id,
        evidenceFileId: row.evidence_file_id,
        requestedBy: row.requested_by,
        requesterUserId: row.requester_user_id,
        requesterRole: row.requester_role,
        reason: row.reason,
        status: row.status,
        requestedAt: row.requested_at,
        reviewedBy: row.reviewed_by,
        reviewerUserId: row.reviewer_user_id,
        reviewedAt: row.reviewed_at,
        denyReason: row.deny_reason,
        encryptedPath: row.encrypted_path,
        encryptedFileName: row.encrypted_file_name,
        byteSize: row.byte_size,
        downloadExpiresAt: row.download_expires_at,
        consumedAt: row.consumed_at,
        clientIp: row.client_ip,
    };
}

function insertSecureExportRequest(row) {
    if (!db || !row || !row.requestId) return null;
    db.prepare(`
        INSERT INTO evidence_secure_exports (
            request_id, evidence_file_id, requested_by, requester_user_id, requester_role,
            reason, status, requested_at, client_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        row.requestId,
        row.evidenceFileId,
        row.requestedBy || null,
        row.requesterUserId || null,
        row.requesterRole || null,
        row.reason || null,
        row.status || 'pending',
        row.requestedAt || new Date().toISOString(),
        row.clientIp || null
    );
    return row.requestId;
}

function getSecureExportRequest(requestId) {
    if (!db || !requestId) return null;
    const row = db.prepare('SELECT * FROM evidence_secure_exports WHERE request_id = ?').get(String(requestId));
    return row ? mapSecureExportRow(row) : null;
}

function listSecureExportRequests(opts) {
    if (!db) return [];
    const n = Math.min(200, Math.max(1, parseInt(opts && opts.limit, 10) || 50));
    const status = opts && opts.status ? String(opts.status) : null;
    if (status) {
        return db.prepare(`
            SELECT * FROM evidence_secure_exports WHERE status = ? ORDER BY requested_at DESC LIMIT ?
        `).all(status, n).map(mapSecureExportRow);
    }
    return db.prepare(`
        SELECT * FROM evidence_secure_exports ORDER BY requested_at DESC LIMIT ?
    `).all(n).map(mapSecureExportRow);
}

function updateSecureExportRequest(requestId, patch) {
    if (!db || !requestId || !patch) return null;
    const fields = [];
    const vals = [];
    const map = {
        status: 'status',
        reviewedBy: 'reviewed_by',
        reviewerUserId: 'reviewer_user_id',
        reviewedAt: 'reviewed_at',
        denyReason: 'deny_reason',
        encryptedPath: 'encrypted_path',
        encryptedFileName: 'encrypted_file_name',
        byteSize: 'byte_size',
        downloadExpiresAt: 'download_expires_at',
        consumedAt: 'consumed_at',
    };
    Object.keys(map).forEach((k) => {
        if (patch[k] !== undefined) {
            fields.push(map[k] + ' = ?');
            vals.push(patch[k]);
        }
    });
    if (!fields.length) return getSecureExportRequest(requestId);
    vals.push(String(requestId));
    db.prepare('UPDATE evidence_secure_exports SET ' + fields.join(', ') + ' WHERE request_id = ?').run(...vals);
    return getSecureExportRequest(requestId);
}

function countPendingSecureExportsForUser(userId, fileId) {
    if (!db || !userId || !fileId) return 0;
    const row = db.prepare(`
        SELECT COUNT(*) AS n FROM evidence_secure_exports
        WHERE requester_user_id = ? AND evidence_file_id = ? AND status = 'pending'
    `).get(String(userId), String(fileId));
    return row ? row.n : 0;
}

function getDatabaseStats() {
    if (!db) return null;
    const evidence = db.prepare(`
        SELECT COUNT(*) AS fileCount, COALESCE(SUM(byte_size), 0) AS totalBytes
        FROM evidence_files
    `).get();
    const downloadCount = db.prepare('SELECT COUNT(*) AS n FROM evidence_downloads').get();
    const auditCount = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get();
    const bwcCount = db.prepare('SELECT COUNT(*) AS n FROM bwc_devices').get();
    let dbFileBytes = 0;
    let walFileBytes = 0;
    try {
        const p = dbPath();
        if (fs.existsSync(p)) dbFileBytes = fs.statSync(p).size;
        const wal = p + '-wal';
        if (fs.existsSync(wal)) walFileBytes = fs.statSync(wal).size;
    } catch (_) { /* ignore */ }
    return {
        engine: 'sqlite',
        dbPath: dbPath(),
        evidenceFileCount: evidence.fileCount || 0,
        evidenceTotalBytes: evidence.totalBytes || 0,
        evidenceDownloadCount: downloadCount.n || 0,
        auditLogCount: auditCount.n || 0,
        bwcDeviceCount: bwcCount.n || 0,
        dbFileBytes: dbFileBytes,
        walFileBytes: walFileBytes,
    };
}

function runMaintenance(opts) {
    if (!db) return { ok: false, error: 'Database not ready' };
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    if (opts && opts.vacuum) {
        db.exec('VACUUM;');
    }
    return { ok: true, vacuum: !!(opts && opts.vacuum) };
}

function backupDatabase(destDir) {
    if (!db) return { ok: false, error: 'Database not ready' };
    const src = dbPath();
    if (!fs.existsSync(src)) return { ok: false, error: 'Database file missing' };
    try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (_) { /* best-effort before copy */ }
    fs.mkdirSync(destDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(destDir, 'mobility-' + stamp + '.db');
    fs.copyFileSync(src, dest);
    return { ok: true, path: dest, bytes: fs.statSync(dest).size };
}

function appendGpsTrackPoint(row) {
    if (!db || !row || !row.deviceId) return null;
    const la = parseFloat(row.lat);
    const lo = parseFloat(row.lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    const ts = row.recordedAt || new Date().toISOString();
    const r = db.prepare(`
        INSERT INTO gps_track_points (device_id, recorded_at, lat, lon, source)
        VALUES (?, ?, ?, ?, ?)
    `).run(String(row.deviceId).trim(), ts, la, lo, row.source || 'sip');
    return r.lastInsertRowid;
}

function queryGpsTrackRoute(deviceId, fromIso, toIso, limit) {
    if (!db || !deviceId) return [];
    const n = Math.min(50000, Math.max(1, parseInt(limit, 10) || 10000));
    return db.prepare(`
        SELECT id, device_id, recorded_at, lat, lon, source
        FROM gps_track_points
        WHERE device_id = ? AND recorded_at >= ? AND recorded_at <= ?
        ORDER BY recorded_at ASC
        LIMIT ?
    `).all(String(deviceId).trim(), fromIso, toIso, n).map((row) => ({
        id: row.id,
        deviceId: row.device_id,
        recordedAt: row.recorded_at,
        lat: row.lat,
        lon: row.lon,
        source: row.source,
    }));
}

function purgeGpsTrackOlderThan(cutoffIso) {
    if (!db || !cutoffIso) return 0;
    const r = db.prepare('DELETE FROM gps_track_points WHERE recorded_at < ?').run(cutoffIso);
    return r.changes || 0;
}

function listEvidenceForDeviceWindow(deviceId, fromIso, toIso, limit) {
    if (!db || !deviceId) return [];
    const n = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    return db.prepare(`
        SELECT id, file_name, device_id, operator_name, uploaded_at, byte_size, source
        FROM evidence_files
        WHERE device_id = ? AND uploaded_at >= ? AND uploaded_at <= ?
        ORDER BY uploaded_at ASC
        LIMIT ?
    `).all(String(deviceId).trim(), fromIso, toIso, n).map((row) => ({
        id: row.id,
        fileName: row.file_name,
        deviceId: row.device_id,
        operatorName: row.operator_name,
        uploadedAt: row.uploaded_at,
        byteSize: row.byte_size,
        source: row.source,
    }));
}

function findEvidenceNearTime(deviceId, pointIso, windowMs) {
    if (!db || !deviceId || !pointIso) return null;
    const ms = Math.max(60000, parseInt(windowMs, 10) || 900000);
    const t = new Date(pointIso).getTime();
    if (!Number.isFinite(t)) return null;
    const from = new Date(t - ms).toISOString();
    const to = new Date(t + ms).toISOString();
    const rows = listEvidenceForDeviceWindow(deviceId, from, to, 20);
    if (!rows.length) return null;
    let best = rows[0];
    let bestD = Math.abs(new Date(best.uploadedAt).getTime() - t);
    rows.forEach((r) => {
        const d = Math.abs(new Date(r.uploadedAt).getTime() - t);
        if (d < bestD) {
            bestD = d;
            best = r;
        }
    });
    return best;
}

function rowToCaseFile(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        status: row.status || 'open',
        officerName: row.officer_name || '',
        deviceId: row.device_id || '',
        sosIncidentId: row.sos_incident_id || null,
        narrative: row.narrative || '',
        createdAt: row.created_at,
        createdBy: row.created_by || null,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by || null,
    };
}

function listCaseFiles(limit, filters) {
    if (!db) return [];
    const cap = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const f = filters || {};
    let sql = 'SELECT * FROM case_files WHERE 1=1';
    const params = [];
    if (f.status === 'open' || f.status === 'closed') {
        sql += ' AND status = ?';
        params.push(f.status);
    }
    if (f.from) {
        sql += ' AND updated_at >= ?';
        params.push(String(f.from));
    }
    if (f.to) {
        sql += ' AND updated_at <= ?';
        params.push(String(f.to));
    }
    if (f.q) {
        const q = '%' + String(f.q).trim().replace(/%/g, '') + '%';
        sql += ' AND (id LIKE ? OR title LIKE ? OR officer_name LIKE ? OR device_id LIKE ? OR sos_incident_id LIKE ? OR narrative LIKE ?)';
        params.push(q, q, q, q, q, q);
    }
    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(cap);
    return db.prepare(sql).all(...params).map(rowToCaseFile);
}

function getCaseFile(id) {
    if (!db || !id) return null;
    return rowToCaseFile(db.prepare('SELECT * FROM case_files WHERE id = ?').get(String(id)));
}

function insertCaseFile(row) {
    if (!db || !row || !row.id) return null;
    db.prepare(`
        INSERT INTO case_files (
            id, title, status, officer_name, device_id, sos_incident_id, narrative,
            created_at, created_by, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        row.id,
        row.title,
        row.status || 'open',
        row.officerName || '',
        row.deviceId || '',
        row.sosIncidentId || null,
        row.narrative || '',
        row.createdAt,
        row.createdBy || null,
        row.updatedAt,
        row.updatedBy || null
    );
    return row.id;
}

function updateCaseFile(id, patch) {
    if (!db || !id) return null;
    const existing = getCaseFile(id);
    if (!existing) return null;
    const next = Object.assign({}, existing, patch || {});
    const now = new Date().toISOString();
    db.prepare(`
        UPDATE case_files SET
            title = ?,
            status = ?,
            officer_name = ?,
            device_id = ?,
            sos_incident_id = ?,
            narrative = ?,
            updated_at = ?,
            updated_by = ?
        WHERE id = ?
    `).run(
        next.title,
        next.status || 'open',
        next.officerName || '',
        next.deviceId || '',
        next.sosIncidentId || null,
        next.narrative || '',
        patch.updatedAt || now,
        patch.updatedBy || next.updatedBy || null,
        String(id)
    );
    return getCaseFile(id);
}

function listCaseFileEvidence(caseFileId) {
    if (!db || !caseFileId) return [];
    return db.prepare(`
        SELECT case_file_id, evidence_file_id, linked_at, linked_by
        FROM case_file_evidence WHERE case_file_id = ? ORDER BY linked_at DESC
    `).all(String(caseFileId)).map(function (row) {
        return {
            caseFileId: row.case_file_id,
            evidenceFileId: row.evidence_file_id,
            linkedAt: row.linked_at,
            linkedBy: row.linked_by,
        };
    });
}

function linkCaseFileEvidence(caseFileId, evidenceFileId, linkedBy) {
    if (!db || !caseFileId || !evidenceFileId) return false;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO case_file_evidence (case_file_id, evidence_file_id, linked_at, linked_by)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(case_file_id, evidence_file_id) DO UPDATE SET linked_at = excluded.linked_at
    `).run(String(caseFileId), String(evidenceFileId), now, linkedBy || null);
    return true;
}

function unlinkCaseFileEvidence(caseFileId, evidenceFileId) {
    if (!db || !caseFileId || !evidenceFileId) return 0;
    const info = db.prepare(`
        DELETE FROM case_file_evidence WHERE case_file_id = ? AND evidence_file_id = ?
    `).run(String(caseFileId), String(evidenceFileId));
    return info.changes || 0;
}

function countCaseFileEvidence(caseFileId) {
    if (!db || !caseFileId) return 0;
    const row = db.prepare('SELECT COUNT(*) AS n FROM case_file_evidence WHERE case_file_id = ?').get(String(caseFileId));
    return row ? row.n : 0;
}

function deleteCaseFile(id) {
    if (!db || !id) return null;
    const existing = getCaseFile(id);
    if (!existing) return null;
    const links = listCaseFileEvidence(id);
    db.prepare('DELETE FROM case_file_evidence WHERE case_file_id = ?').run(String(id));
    const info = db.prepare('DELETE FROM case_files WHERE id = ?').run(String(id));
    if (!info.changes) return null;
    return { caseFile: existing, evidenceLinks: links };
}

module.exports = {
    init,
    isReady,
    dbPath,
    listDevices,
    saveDevices,
    findDevice,
    deviceCount,
    migrateFromJson,
    exportToJson,
    appendAudit,
    listAudit,
    queryAudit,
    queryAuditForEvidenceFile,
    listDistinctAuditActions,
    countAudit,
    auditLogReadable,
    repairAuditLog,
    setSetting,
    getSetting,
    listRecentOnline,
    touchRuntime,
    upsertEvidenceFile,
    findEvidenceByRelative,
    getEvidenceFile,
    listEvidenceFiles,
    insertEvidenceDownload,
    getEvidenceDownload,
    markEvidenceDownloadConsumed,
    listEvidenceDownloads,
    appendBwcMessage,
    listBwcMessages,
    listBwcMessageThreads,
    clearBwcMessagesForDevice,
    clearAllBwcMessages,
    purgeBwcMessagesOlderThanDays,
    getEvidenceMeta,
    upsertEvidenceMeta,
    listEvidenceAttachments,
    insertEvidenceAttachment,
    getEvidenceAttachment,
    insertEvidenceExport,
    updateEvidenceExportMeta,
    listEvidenceExports,
    getEvidenceExport,
    insertSecureExportRequest,
    getSecureExportRequest,
    listSecureExportRequests,
    updateSecureExportRequest,
    countPendingSecureExportsForUser,
    getDatabaseStats,
    runMaintenance,
    backupDatabase,
    appendGpsTrackPoint,
    queryGpsTrackRoute,
    purgeGpsTrackOlderThan,
    listEvidenceForDeviceWindow,
    findEvidenceNearTime,
    listCaseFiles,
    getCaseFile,
    insertCaseFile,
    updateCaseFile,
    listCaseFileEvidence,
    linkCaseFileEvidence,
    unlinkCaseFileEvidence,
    countCaseFileEvidence,
    deleteCaseFile,
};
