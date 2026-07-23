'use strict';

/**
 * Durable site catalog backed exclusively by PostgreSQL.
 *
 * Every durable API is asynchronous. Runtime presence remains in memory and
 * SQLite is intentionally not imported here.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { Pool, types } = require('pg');
const siteTime = require('./siteTime');

types.setTypeParser(20, (value) => {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value;
});

const execFileAsync = promisify(execFile);
let pool = null;
let storageDir = null;
let lastHealthCheck = null;
let initPromise = null;
const runtimeState = new Map();

function requirePool() {
    if (!pool) throw new Error('PostgreSQL catalog is not initialized');
    return pool;
}

async function query(sql, params, client) {
    return (client || requirePool()).query(sql, params || []);
}

async function transaction(work) {
    const client = await requirePool().connect();
    try {
        await client.query('BEGIN');
        const value = await work(client);
        await client.query('COMMIT');
        return value;
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) { /* best effort */ }
        throw err;
    } finally {
        client.release();
    }
}

function isReady() {
    return !!pool;
}

async function init(dir) {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        const mode = String(process.env.FM_CATALOG_MODE || '').trim().toLowerCase();
        if (mode !== 'postgres_required') {
            throw new Error('FM_CATALOG_MODE=postgres_required is mandatory; SQLite runtime is retired');
        }
        if (process.env.FM_CATALOG_ALLOW_SQLITE_QUEUE === '1') {
            throw new Error('SQLite catalog queue is forbidden after PostgreSQL cutover');
        }
        const connectionString = String(process.env.FM_CATALOG_DB_URL || '').trim();
        if (!connectionString) throw new Error('FM_CATALOG_DB_URL is required');
        storageDir = dir || storageDir || path.join(__dirname, '..', 'storage');
        const candidate = new Pool({
            connectionString,
            connectionTimeoutMillis: Math.max(1000, parseInt(process.env.FM_CATALOG_CONNECT_TIMEOUT_MS, 10) || 5000),
            query_timeout: Math.max(1000, parseInt(process.env.FM_CATALOG_QUERY_TIMEOUT_MS, 10) || 15000),
            statement_timeout: Math.max(1000, parseInt(process.env.FM_CATALOG_QUERY_TIMEOUT_MS, 10) || 15000),
            max: Math.min(30, Math.max(2, parseInt(process.env.FM_CATALOG_POOL_MAX, 10) || 10)),
            application_name: 'mobility-axiom-catalog',
        });
        candidate.on('error', (err) => {
            lastHealthCheck = {
                ok: false,
                engine: 'postgresql',
                checkedAtMs: Date.now(),
                error: err && err.message ? err.message : String(err),
            };
            console.error('[catalog] PostgreSQL pool error:', lastHealthCheck.error);
        });
        try {
            const client = await candidate.connect();
            try {
                await client.query("SET TIME ZONE 'UTC'");
                const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '001_catalog_primary.sql');
                await client.query(fs.readFileSync(migrationPath, 'utf8'));
                const check = await client.query(
                    'SELECT current_database() AS database, MAX(version) AS schema_version FROM schema_migrations GROUP BY current_database()'
                );
                if (!check.rows[0] || Number(check.rows[0].schema_version) < 1) {
                    throw new Error('PostgreSQL catalog schema migration did not complete');
                }
            } finally {
                client.release();
            }
            pool = candidate;
            lastHealthCheck = null;
            return pool;
        } catch (err) {
            await candidate.end().catch(() => {});
            throw err;
        }
    })();
    try {
        return await initPromise;
    } catch (err) {
        initPromise = null;
        pool = null;
        throw err;
    }
}

async function close() {
    const current = pool;
    pool = null;
    initPromise = null;
    lastHealthCheck = null;
    storageDir = null;
    if (current) await current.end();
}

async function healthCheck(maxAgeMs) {
    const maxAge = Number.isFinite(maxAgeMs) ? Math.max(0, maxAgeMs) : 30000;
    if (lastHealthCheck && Date.now() - lastHealthCheck.checkedAtMs < maxAge) {
        return Object.assign({}, lastHealthCheck);
    }
    const result = { ok: false, engine: 'postgresql', checkedAtMs: Date.now(), error: null };
    try {
        const r = await query(
            'SELECT current_database() AS database, MAX(version) AS schema_version FROM schema_migrations GROUP BY current_database()'
        );
        const row = r.rows[0];
        result.database = row ? row.database : null;
        result.schemaVersion = row ? Number(row.schema_version || 0) : 0;
        result.ok = result.schemaVersion >= 1;
        if (!result.ok) result.error = 'PostgreSQL catalog schema is not ready';
    } catch (err) {
        result.error = err && err.message ? err.message : String(err);
    }
    lastHealthCheck = result;
    return Object.assign({}, result);
}

function dbPath() {
    return null;
}

function catalogDb() {
    return pool;
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
        try { out.geofence = JSON.parse(row.geofence_json); } catch (_) { /* ignore invalid legacy JSON */ }
    }
    return out;
}

async function listDevices() {
    const r = await query('SELECT * FROM bwc_devices ORDER BY operator_name, device_id');
    return r.rows.map(rowToDevice);
}

async function saveDevices(devices) {
    const now = new Date().toISOString();
    await transaction(async (client) => {
        await query('DELETE FROM bwc_devices', [], client);
        for (const d of devices) {
            await query(`
                INSERT INTO bwc_devices (
                    device_id, operator_name, map_group, user_name, password, protocol,
                    geofence_json, created_at, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `, [
                d.deviceId, d.operatorName || '', d.mapGroup || '', d.userName || '', d.password || '',
                d.protocol === 'onvif' ? 'onvif' : 'sip',
                d.geofence != null ? JSON.stringify(d.geofence) : null, now, now,
            ], client);
        }
    });
    return listDevices();
}

async function findDevice(deviceId) {
    if (!deviceId) return null;
    const r = await query('SELECT * FROM bwc_devices WHERE device_id = $1', [String(deviceId).trim()]);
    return rowToDevice(r.rows[0]);
}

async function deviceCount() {
    const r = await query('SELECT COUNT(*) AS n FROM bwc_devices');
    return Number(r.rows[0].n || 0);
}

async function migrateFromJson(jsonPath) {
    if (!jsonPath || !fs.existsSync(jsonPath)) return { imported: 0 };
    if (await deviceCount() > 0) return { imported: 0, skipped: 'db-not-empty' };
    let data;
    try { data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (_) {
        return { imported: 0, error: 'json-read-failed' };
    }
    const devices = (data.devices || []).filter((d) => d && d.deviceId).map((d) => ({
        deviceId: String(d.deviceId).trim(),
        operatorName: d.operatorName,
        mapGroup: d.mapGroup,
        userName: d.userName,
        password: d.password,
        protocol: d.protocol,
        geofence: d.geofence,
    }));
    if (!devices.length) return { imported: 0 };
    await saveDevices(devices);
    return { imported: devices.length };
}

async function exportToJson(jsonPath) {
    const devices = await listDevices();
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify({ devices }, null, 2), 'utf8');
    return devices.length;
}

async function appendAudit(entry) {
    const ts = siteTime.formatEvidence(new Date());
    const r = await query(`
        INSERT INTO audit_log (ts, actor, role, action, target, detail_json, client_ip)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [
        ts, entry.actor || null, entry.role || null, String(entry.action || 'unknown'),
        entry.target != null ? String(entry.target) : null,
        entry.detail != null ? JSON.stringify(entry.detail) : null,
        entry.clientIp || entry.ip || null,
    ]);
    return { id: r.rows[0].id, ts };
}

function auditWhere(opts) {
    const conditions = [];
    const params = [];
    const add = (sql, value) => {
        params.push(value);
        conditions.push(sql.replace('$?', '$' + params.length));
    };
    if (opts.since) add('ts >= $?', String(opts.since));
    if (opts.until) add('ts <= $?', String(opts.until));
    if (opts.actor) add("LOWER(COALESCE(actor,'')) LIKE $?", '%' + String(opts.actor).trim().toLowerCase() + '%');
    if (Array.isArray(opts.actions) && opts.actions.length) {
        const safe = opts.actions.map((a) => String(a || '').trim()).filter(Boolean);
        if (safe.length) add('action = ANY($?::text[])', safe);
    } else if (opts.action) add('action = $?', String(opts.action).trim());
    if (opts.category) {
        const cat = String(opts.category).trim().replace(/[^a-z0-9._-]/gi, '');
        if (cat) {
            let pattern = cat + '%';
            if (cat === 'dispatch') pattern = 'dispatch_groups%';
            else if (cat === 'lab') pattern = 'lab_security%';
            else if (cat === 'cloud') pattern = 'cloud_deployment%';
            else if (cat === 'users') pattern = 'user.%';
            add('action LIKE $?', pattern);
        }
    }
    if (opts.q) {
        params.push('%' + String(opts.q).trim().toLowerCase() + '%');
        const p = '$' + params.length;
        conditions.push(`(LOWER(COALESCE(actor,'')) LIKE ${p} OR LOWER(COALESCE(target,'')) LIKE ${p}
            OR LOWER(action) LIKE ${p} OR LOWER(COALESCE(detail_json,'')) LIKE ${p})`);
    }
    return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
}

async function queryAudit(opts) {
    opts = opts || {};
    const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 100, 1), 10000);
    const offset = Math.max(parseInt(opts.offset, 10) || 0, 0);
    const built = auditWhere(opts);
    const count = await query('SELECT COUNT(*) AS n FROM audit_log ' + built.where, built.params);
    const params = built.params.concat([limit, offset]);
    const rows = await query(`
        SELECT id, ts, actor, role, action, target, detail_json, client_ip
        FROM audit_log ${built.where} ORDER BY ts DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return { rows: rows.rows, total: Number(count.rows[0].n || 0) };
}

async function listAudit(opts) {
    return (await queryAudit(opts)).rows;
}

async function queryAuditForEvidenceFile(fileId, likeFileId, likeEvidenceFileId, limit) {
    if (!fileId) return [];
    const n = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));
    const r = await query(`
        SELECT id, ts, actor, role, action, target, detail_json, client_ip
        FROM audit_log
        WHERE action LIKE 'evidence.%'
          AND (target = $1 OR detail_json LIKE $2 OR detail_json LIKE $3)
        ORDER BY ts DESC LIMIT $4
    `, [String(fileId), likeFileId, likeEvidenceFileId, n]);
    return r.rows;
}

async function listDistinctAuditActions() {
    return (await query('SELECT DISTINCT action FROM audit_log ORDER BY action ASC')).rows.map((r) => r.action);
}

async function countAudit() {
    return Number((await query('SELECT COUNT(*) AS n FROM audit_log')).rows[0].n || 0);
}

async function auditLogReadable() {
    try { await countAudit(); return true; } catch (_) { return false; }
}

async function repairAuditLog() {
    return { ok: false, error: 'Runtime repair is retired. Use the verified offline PostgreSQL salvage migrator.' };
}

async function setSetting(key, value) {
    await query(`
        INSERT INTO site_settings (key, value_json, updated_at) VALUES ($1,$2,$3)
        ON CONFLICT(key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at
    `, [String(key), JSON.stringify(value), new Date().toISOString()]);
}

async function getSetting(key, fallback) {
    const r = await query('SELECT value_json FROM site_settings WHERE key = $1', [String(key)]);
    if (!r.rows[0]) return fallback;
    try { return JSON.parse(r.rows[0].value_json); } catch (_) { return fallback; }
}

function listRecentOnline(maxAgeMs) {
    const cutoff = Date.now() - Math.max(0, parseInt(maxAgeMs, 10) || 0);
    return [...runtimeState.values()]
        .filter((row) => row.online === 1 || row.last_seen >= cutoff)
        .sort((a, b) => b.last_seen - a.last_seen);
}

function touchRuntime(deviceId, patch) {
    const id = String(deviceId || '').trim();
    if (!id) return;
    const prev = runtimeState.get(id);
    runtimeState.set(id, {
        device_id: id,
        online: patch.online != null ? (patch.online ? 1 : 0) : (prev ? prev.online : 0),
        last_seen: patch.lastSeen != null ? patch.lastSeen : (prev ? prev.last_seen : 0),
        last_ip: patch.lastIp != null ? patch.lastIp : (prev ? prev.last_ip : null),
        ptt_online: patch.pttOnline != null ? (patch.pttOnline ? 1 : 0) : (prev ? prev.ptt_online : 0),
        updated_at: new Date().toISOString(),
    });
}

function mapEvidenceFileRow(row) {
    if (!row) return null;
    return {
        id: row.id, source: row.source, storageTier: row.storage_tier, relativePath: row.relative_path,
        fileName: row.file_name, byteSize: row.byte_size, sha256: row.sha256, deviceId: row.device_id,
        operatorName: row.operator_name, uploadedAt: row.uploaded_at, peerIp: row.peer_ip,
        syncStatus: row.sync_status,
    };
}

async function upsertEvidenceFile(row) {
    if (!row || !row.id) return null;
    const now = new Date().toISOString();
    await query(`
        INSERT INTO evidence_files (
            id, source, storage_tier, relative_path, file_name, byte_size, sha256,
            device_id, operator_name, uploaded_at, peer_ip, sync_status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT(id) DO UPDATE SET
            source=EXCLUDED.source, storage_tier=EXCLUDED.storage_tier, relative_path=EXCLUDED.relative_path,
            file_name=EXCLUDED.file_name, byte_size=EXCLUDED.byte_size, sha256=EXCLUDED.sha256,
            device_id=EXCLUDED.device_id, operator_name=EXCLUDED.operator_name, uploaded_at=EXCLUDED.uploaded_at,
            peer_ip=EXCLUDED.peer_ip, sync_status=EXCLUDED.sync_status
    `, [
        row.id, row.source || 'dock_ftp', row.storageTier || 'local', row.relativePath, row.fileName,
        row.byteSize || 0, row.sha256 || null, row.deviceId || null, row.operatorName || null,
        row.uploadedAt || now, row.peerIp || null, row.syncStatus || 'synced', row.createdAt || now,
    ]);
    return row.id;
}

async function findEvidenceByRelative(relativePath) {
    const r = await query('SELECT * FROM evidence_files WHERE relative_path = $1', [relativePath]);
    return r.rows[0] || null;
}

async function getEvidenceFile(id) {
    if (!id) return null;
    return mapEvidenceFileRow((await query('SELECT * FROM evidence_files WHERE id = $1', [String(id)])).rows[0]);
}

async function listEvidenceFiles(limit) {
    const n = Math.min(5000, Math.max(1, parseInt(limit, 10) || 100));
    return (await query(`
        SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT $1
    `, [n])).rows.map(mapEvidenceFileRow);
}

async function listEvidenceFilesPage(opts) {
    opts = opts || {};
    const pageSize = Math.min(100, Math.max(10, parseInt(opts.pageSize, 10) || 50));
    let page = Math.max(1, parseInt(opts.page, 10) || 1);
    const statusRaw = String(opts.status == null ? 'active' : opts.status).toLowerCase();
    const status = ['active', 'archived', 'all'].includes(statusRaw) ? statusRaw : 'active';
    const params = [];
    const where = [];
    let joins = '';
    if (opts.tag) {
        joins = ' INNER JOIN evidence_meta em ON em.evidence_file_id = ef.id ';
        params.push('%' + String(opts.tag).trim().toLowerCase().replace(/[%_]/g, '') + '%');
        where.push(`LOWER(COALESCE(em.tags_json,'')) LIKE $${params.length}`);
    }
    if (status === 'archived') where.push("COALESCE(ef.storage_tier,'local') = 'archived'");
    if (status === 'active') where.push("COALESCE(ef.storage_tier,'local') != 'archived'");
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const count = await query('SELECT COUNT(*) AS n FROM evidence_files ef' + joins + whereSql, params);
    const total = Number(count.rows[0].n || 0);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(page, pageCount);
    const offset = (page - 1) * pageSize;
    const paged = params.concat([pageSize, offset]);
    const rows = await query(`
        SELECT ef.* FROM evidence_files ef ${joins} ${whereSql}
        ORDER BY ef.uploaded_at DESC LIMIT $${paged.length - 1} OFFSET $${paged.length}
    `, paged);
    return { files: rows.rows.map(mapEvidenceFileRow), total, page, pageSize, pageCount };
}

async function insertEvidenceDownload(row) {
    if (!row || !row.downloadId) return null;
    await query(`
        INSERT INTO evidence_downloads (
            download_id,evidence_file_id,actor,user_id,role,requested_at,token_expires_at,consumed_at,client_ip
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [row.downloadId, row.evidenceFileId, row.actor || null, row.userId || null, row.role || null,
        row.requestedAt, row.tokenExpiresAt, row.consumedAt || null, row.clientIp || null]);
    return row.downloadId;
}

function mapDownload(row) {
    if (!row) return null;
    return {
        downloadId: row.download_id, evidenceFileId: row.evidence_file_id, actor: row.actor,
        userId: row.user_id, role: row.role, requestedAt: row.requested_at,
        tokenExpiresAt: row.token_expires_at, consumedAt: row.consumed_at, clientIp: row.client_ip,
    };
}

async function getEvidenceDownload(id) {
    return mapDownload((await query('SELECT * FROM evidence_downloads WHERE download_id=$1', [String(id)])).rows[0]);
}
async function markEvidenceDownloadConsumed(id) {
    await query('UPDATE evidence_downloads SET consumed_at=$1 WHERE download_id=$2', [new Date().toISOString(), String(id)]);
}
async function listEvidenceDownloads(limit) {
    const n = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    return (await query(`
        SELECT d.download_id,d.evidence_file_id,d.actor,d.user_id,d.requested_at,
               d.token_expires_at,d.consumed_at,f.file_name
        FROM evidence_downloads d LEFT JOIN evidence_files f ON f.id=d.evidence_file_id
        ORDER BY d.requested_at DESC LIMIT $1
    `, [n])).rows;
}

async function appendBwcMessage(row) {
    if (!row || !row.deviceId) return null;
    const createdAt = new Date().toISOString();
    const r = await query(`
        INSERT INTO bwc_messages (device_id,direction,text,msg_time,msg_type,msg_level,sender_name,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [String(row.deviceId), row.direction === 'out' ? 'out' : 'in', String(row.text == null ? '' : row.text),
        row.msgTime || null, row.msgType == null ? null : parseInt(row.msgType, 10),
        row.msgLevel == null ? null : parseInt(row.msgLevel, 10), row.senderName || null, createdAt]);
    return { id: r.rows[0].id, createdAt };
}

async function listBwcMessages(deviceId, limit, sinceHours) {
    if (!deviceId) return [];
    const n = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const hours = sinceHours == null ? null : parseInt(sinceHours, 10);
    const params = [String(deviceId)];
    let since = '';
    if (hours > 0) {
        params.push(new Date(Date.now() - hours * 3600000).toISOString());
        since = ' AND created_at >= $2';
    }
    params.push(n);
    return (await query(`
        SELECT id,device_id AS "deviceId",direction,text,msg_time AS "msgTime",msg_type AS "msgType",
               msg_level AS "msgLevel",sender_name AS "senderName",created_at AS "createdAt"
        FROM bwc_messages WHERE device_id=$1 ${since} ORDER BY id ASC LIMIT $${params.length}
    `, params)).rows;
}

async function listBwcMessageThreads(limit, sinceHours) {
    const n = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const hours = sinceHours == null ? null : parseInt(sinceHours, 10);
    const params = [];
    let since = '';
    if (hours > 0) {
        params.push(new Date(Date.now() - hours * 3600000).toISOString());
        since = ` WHERE created_at >= $1`;
    }
    params.push(n);
    return (await query(`
        SELECT m.device_id AS "deviceId",m.direction,m.text,m.msg_time AS "msgTime",
               m.sender_name AS "senderName",m.created_at AS "createdAt",t.msg_count AS "msgCount"
        FROM bwc_messages m INNER JOIN (
            SELECT device_id,MAX(id) AS last_id,COUNT(*) AS msg_count FROM bwc_messages
            ${since} GROUP BY device_id
        ) t ON m.device_id=t.device_id AND m.id=t.last_id
        ORDER BY m.id DESC LIMIT $${params.length}
    `, params)).rows;
}

async function clearBwcMessagesForDevice(id) {
    return (await query('DELETE FROM bwc_messages WHERE device_id=$1', [String(id)])).rowCount;
}
async function clearAllBwcMessages() {
    return (await query('DELETE FROM bwc_messages')).rowCount;
}
async function purgeBwcMessagesOlderThanDays(days) {
    const d = Math.max(parseInt(days, 10) || 30, 1);
    return (await query('DELETE FROM bwc_messages WHERE created_at < $1', [
        new Date(Date.now() - d * 86400000).toISOString(),
    ])).rowCount;
}

function parseTagsJson(raw) {
    try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed.map((t) => String(t || '').trim()).filter(Boolean) : [];
    } catch (_) { return []; }
}

function mapMeta(row) {
    if (!row) return null;
    return {
        evidenceFileId: row.evidence_file_id, notes: row.notes || '', sosIncidentId: row.sos_incident_id || null,
        trimStartSec: row.trim_start_sec == null ? null : row.trim_start_sec,
        trimEndSec: row.trim_end_sec == null ? null : row.trim_end_sec, dockId: row.dock_id || null,
        dockBay: row.dock_bay == null ? null : row.dock_bay, tags: parseTagsJson(row.tags_json),
        updatedAt: row.updated_at, updatedBy: row.updated_by,
    };
}
async function getEvidenceMeta(id) {
    return mapMeta((await query('SELECT * FROM evidence_meta WHERE evidence_file_id=$1', [String(id)])).rows[0]);
}
async function upsertEvidenceMeta(row) {
    if (!row || !row.evidenceFileId) return null;
    await query(`
        INSERT INTO evidence_meta (
            evidence_file_id,notes,sos_incident_id,trim_start_sec,trim_end_sec,dock_id,dock_bay,tags_json,updated_at,updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT(evidence_file_id) DO UPDATE SET notes=EXCLUDED.notes,sos_incident_id=EXCLUDED.sos_incident_id,
            trim_start_sec=EXCLUDED.trim_start_sec,trim_end_sec=EXCLUDED.trim_end_sec,dock_id=EXCLUDED.dock_id,
            dock_bay=EXCLUDED.dock_bay,tags_json=EXCLUDED.tags_json,updated_at=EXCLUDED.updated_at,
            updated_by=EXCLUDED.updated_by
    `, [row.evidenceFileId, row.notes == null ? '' : String(row.notes), row.sosIncidentId || null,
        row.trimStartSec == null ? null : Number(row.trimStartSec), row.trimEndSec == null ? null : Number(row.trimEndSec),
        row.dockId || null, row.dockBay == null ? null : parseInt(row.dockBay, 10),
        Array.isArray(row.tags) ? JSON.stringify(row.tags) : String(row.tagsJson == null ? '[]' : row.tagsJson),
        row.updatedAt || new Date().toISOString(), row.updatedBy || null]);
    return row.evidenceFileId;
}
async function listEvidenceTagsByFileId(limit) {
    const n = Math.min(Math.max(parseInt(limit, 10) || 2000, 1), 5000);
    const rows = (await query(`
        SELECT evidence_file_id,tags_json FROM evidence_meta
        WHERE tags_json IS NOT NULL AND tags_json NOT IN ('','[]') LIMIT $1
    `, [n])).rows;
    const out = {};
    rows.forEach((row) => {
        const tags = parseTagsJson(row.tags_json);
        if (tags.length) out[row.evidence_file_id] = tags;
    });
    return out;
}

function mapAttachment(row) {
    if (!row) return null;
    return {
        id: row.id, evidenceFileId: row.evidence_file_id, fileName: row.file_name,
        relativePath: row.relative_path, kind: row.kind, byteSize: row.byte_size,
        uploadedAt: row.uploaded_at, uploadedBy: row.uploaded_by,
    };
}
async function listEvidenceAttachments(id) {
    return (await query(`
        SELECT * FROM evidence_attachments WHERE evidence_file_id=$1 ORDER BY uploaded_at DESC
    `, [String(id)])).rows.map(mapAttachment);
}
async function insertEvidenceAttachment(row) {
    await query(`
        INSERT INTO evidence_attachments (id,evidence_file_id,file_name,relative_path,kind,byte_size,uploaded_at,uploaded_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [row.id, row.evidenceFileId, row.fileName, row.relativePath, row.kind || 'photo', row.byteSize || 0,
        row.uploadedAt || new Date().toISOString(), row.uploadedBy || null]);
    return row.id;
}
async function getEvidenceAttachment(id) {
    return mapAttachment((await query('SELECT * FROM evidence_attachments WHERE id=$1', [String(id)])).rows[0]);
}

function mapExportRow(row) {
    if (!row) return null;
    let meta = null;
    try { meta = row.meta_json ? JSON.parse(row.meta_json) : null; } catch (_) { /* ignore */ }
    return {
        exportId: row.export_id, evidenceFileId: row.evidence_file_id, exportType: row.export_type,
        relativePath: row.relative_path, fileName: row.file_name, byteSize: row.byte_size,
        createdAt: row.created_at, actor: row.actor, userId: row.user_id, meta, metaJson: row.meta_json,
    };
}
async function insertEvidenceExport(row) {
    await query(`
        INSERT INTO evidence_exports (
            export_id,evidence_file_id,export_type,relative_path,file_name,byte_size,actor,user_id,created_at,meta_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [row.exportId, row.evidenceFileId, row.exportType || 'trim', row.relativePath, row.fileName,
        row.byteSize || 0, row.actor || null, row.userId || null, row.createdAt || new Date().toISOString(),
        row.metaJson || null]);
    return row.exportId;
}
async function listEvidenceExports(evidenceFileId, limit) {
    const n = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const params = evidenceFileId ? [String(evidenceFileId), n] : [n];
    return (await query(`
        SELECT * FROM evidence_exports ${evidenceFileId ? 'WHERE evidence_file_id=$1' : ''}
        ORDER BY created_at DESC LIMIT $${params.length}
    `, params)).rows.map(mapExportRow);
}
async function getEvidenceExport(id) {
    return mapExportRow((await query('SELECT * FROM evidence_exports WHERE export_id=$1', [String(id)])).rows[0]);
}
async function updateEvidenceExportMeta(id, meta) {
    const r = await query('UPDATE evidence_exports SET meta_json=$1 WHERE export_id=$2', [
        typeof meta === 'string' ? meta : JSON.stringify(meta || {}), String(id),
    ]);
    return r.rowCount > 0;
}
async function deleteEvidenceExport(id) {
    return (await query('DELETE FROM evidence_exports WHERE export_id=$1', [String(id)])).rowCount > 0;
}
/** REDACT-PRIOR-EXPORTS-CLEANUP-V1 — non-finalized redact rows for one evidence file. */
async function listNonFinalizedRedactExports(evidenceFileId) {
    if (!evidenceFileId) return [];
    return (await query(`
        SELECT * FROM evidence_exports
        WHERE evidence_file_id=$1 AND export_type='redact'
          AND COALESCE(NULLIF(meta_json,'')::jsonb->>'status','') <> 'finalized'
        ORDER BY created_at DESC
    `, [String(evidenceFileId)])).rows.map(mapExportRow);
}
/** REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1 — finalized redact rows for one evidence file. */
async function listFinalizedRedactExports(evidenceFileId) {
    if (!evidenceFileId) return [];
    return (await query(`
        SELECT * FROM evidence_exports
        WHERE evidence_file_id=$1 AND export_type='redact'
          AND COALESCE(NULLIF(meta_json,'')::jsonb->>'status','') = 'finalized'
        ORDER BY created_at DESC
    `, [String(evidenceFileId)])).rows.map(mapExportRow);
}
/** PRIOR-TRIM-LABEL-AND-REMOVE-V1 — trim rows for one evidence file. */
async function listTrimExports(evidenceFileId) {
    if (!evidenceFileId) return [];
    return (await query(`
        SELECT * FROM evidence_exports
        WHERE evidence_file_id=$1 AND export_type='trim'
        ORDER BY created_at DESC
    `, [String(evidenceFileId)])).rows.map(mapExportRow);
}
async function listRedactedEvidenceExportsPage(opts) {
    opts = opts || {};
    const pageSize = Math.min(100, Math.max(1, parseInt(opts.pageSize, 10) || 50));
    let page = Math.max(1, parseInt(opts.page, 10) || 1);
    const statusRaw = String(opts.status || 'finalized').toLowerCase();
    const status = ['pending', 'all'].includes(statusRaw) ? statusRaw : 'finalized';
    const where = ["e.export_type='redact'"];
    const params = [];
    const addLike = (sql, value) => { params.push(value); where.push(sql.replace(/\$\?/g, '$' + params.length)); };
    if (status === 'finalized') where.push("COALESCE(NULLIF(e.meta_json,'')::jsonb->>'status','')='finalized'");
    if (status === 'pending') where.push("COALESCE(NULLIF(e.meta_json,'')::jsonb->>'status','')!='finalized'");
    if (opts.from) addLike("COALESCE(NULLIF(e.meta_json,'')::jsonb->>'finalizedAt',e.created_at) >= $?", String(opts.from));
    if (opts.to) addLike("COALESCE(NULLIF(e.meta_json,'')::jsonb->>'finalizedAt',e.created_at) <= $?", String(opts.to));
    if (opts.q) {
        params.push('%' + String(opts.q).toLowerCase().replace(/[%_]/g, '') + '%');
        const p = '$' + params.length;
        where.push(`(LOWER(e.file_name) LIKE ${p} OR LOWER(e.export_id) LIKE ${p}
            OR LOWER(COALESCE(f.file_name,'')) LIKE ${p} OR LOWER(COALESCE(f.operator_name,'')) LIKE ${p}
            OR LOWER(COALESCE(f.device_id,'')) LIKE ${p} OR LOWER(COALESCE(e.actor,'')) LIKE ${p})`);
    }
    if (opts.tag) addLike("LOWER(COALESCE(m.tags_json,'')) LIKE $?", '%' + String(opts.tag).toLowerCase().replace(/[%_]/g, '') + '%');
    const from = ` FROM evidence_exports e LEFT JOIN evidence_files f ON f.id=e.evidence_file_id
        LEFT JOIN evidence_meta m ON m.evidence_file_id=e.evidence_file_id WHERE ${where.join(' AND ')}`;
    const total = Number((await query('SELECT COUNT(*) AS n' + from, params)).rows[0].n || 0);
    const pageCount = total ? Math.ceil(total / pageSize) : 0;
    if (pageCount) page = Math.min(page, pageCount);
    const offset = (page - 1) * pageSize;
    const paged = params.concat([pageSize, offset]);
    const rows = (await query(`
        SELECT e.*,f.file_name AS source_file_name,f.device_id AS source_device_id,
               f.operator_name AS source_operator_name,f.uploaded_at AS source_uploaded_at,m.tags_json AS source_tags_json
        ${from}
        ORDER BY COALESCE(NULLIF(e.meta_json,'')::jsonb->>'finalizedAt',e.created_at) DESC
        LIMIT $${paged.length - 1} OFFSET $${paged.length}
    `, paged)).rows;
    return {
        exports: rows.map((row) => {
            const base = mapExportRow(row);
            return Object.assign({}, base, {
                sourceFileName: row.source_file_name || (base.meta && base.meta.sourceFileName) || null,
                sourceDeviceId: row.source_device_id || null, sourceOfficer: row.source_operator_name || null,
                sourceUploadedAt: row.source_uploaded_at || null, sourceTags: parseTagsJson(row.source_tags_json),
                whenAt: (base.meta && base.meta.finalizedAt) || base.createdAt,
                status: (base.meta && base.meta.status) || 'pending',
                downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(base.exportId),
            });
        }),
        total, page, pageSize, pageCount, status,
    };
}

function mapSecureExportRow(row) {
    if (!row) return null;
    return {
        requestId: row.request_id, evidenceFileId: row.evidence_file_id, requestedBy: row.requested_by,
        requesterUserId: row.requester_user_id, requesterRole: row.requester_role, reason: row.reason,
        status: row.status, requestedAt: row.requested_at, reviewedBy: row.reviewed_by,
        reviewerUserId: row.reviewer_user_id, reviewedAt: row.reviewed_at, denyReason: row.deny_reason,
        encryptedPath: row.encrypted_path, encryptedFileName: row.encrypted_file_name,
        byteSize: row.byte_size, downloadExpiresAt: row.download_expires_at,
        consumedAt: row.consumed_at, clientIp: row.client_ip,
    };
}
async function insertSecureExportRequest(row) {
    await query(`
        INSERT INTO evidence_secure_exports (
            request_id,evidence_file_id,requested_by,requester_user_id,requester_role,reason,status,requested_at,client_ip
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [row.requestId, row.evidenceFileId, row.requestedBy || null, row.requesterUserId || null,
        row.requesterRole || null, row.reason || null, row.status || 'pending',
        row.requestedAt || new Date().toISOString(), row.clientIp || null]);
    return row.requestId;
}
async function getSecureExportRequest(id) {
    return mapSecureExportRow((await query('SELECT * FROM evidence_secure_exports WHERE request_id=$1', [String(id)])).rows[0]);
}
async function listSecureExportRequests(opts) {
    const n = Math.min(200, Math.max(1, parseInt(opts && opts.limit, 10) || 50));
    const status = opts && opts.status ? String(opts.status) : null;
    const params = status ? [status, n] : [n];
    return (await query(`
        SELECT * FROM evidence_secure_exports ${status ? 'WHERE status=$1' : ''}
        ORDER BY requested_at DESC LIMIT $${params.length}
    `, params)).rows.map(mapSecureExportRow);
}
async function updateSecureExportRequest(id, patch) {
    const map = {
        status: 'status', reviewedBy: 'reviewed_by', reviewerUserId: 'reviewer_user_id',
        reviewedAt: 'reviewed_at', denyReason: 'deny_reason', encryptedPath: 'encrypted_path',
        encryptedFileName: 'encrypted_file_name', byteSize: 'byte_size',
        downloadExpiresAt: 'download_expires_at', consumedAt: 'consumed_at',
    };
    const fields = [];
    const values = [];
    Object.keys(map).forEach((key) => {
        if (patch && patch[key] !== undefined) {
            values.push(patch[key]);
            fields.push(map[key] + '=$' + values.length);
        }
    });
    if (fields.length) {
        values.push(String(id));
        await query(`UPDATE evidence_secure_exports SET ${fields.join(',')} WHERE request_id=$${values.length}`, values);
    }
    return getSecureExportRequest(id);
}
async function countPendingSecureExportsForUser(userId, fileId) {
    const r = await query(`
        SELECT COUNT(*) AS n FROM evidence_secure_exports
        WHERE requester_user_id=$1 AND evidence_file_id=$2 AND status='pending'
    `, [String(userId), String(fileId)]);
    return Number(r.rows[0].n || 0);
}

async function getDatabaseStats() {
    const r = await query(`
        SELECT
          (SELECT COUNT(*) FROM evidence_files) AS file_count,
          (SELECT COALESCE(SUM(byte_size),0) FROM evidence_files) AS total_bytes,
          (SELECT COUNT(*) FROM evidence_downloads) AS download_count,
          (SELECT COUNT(*) FROM audit_log) AS audit_count,
          (SELECT COUNT(*) FROM bwc_devices) AS bwc_count,
          pg_database_size(current_database()) AS database_bytes
    `);
    const row = r.rows[0];
    return {
        engine: 'postgresql', dbPath: null, evidenceFileCount: Number(row.file_count || 0),
        evidenceTotalBytes: Number(row.total_bytes || 0), evidenceDownloadCount: Number(row.download_count || 0),
        auditLogCount: Number(row.audit_count || 0), bwcDeviceCount: Number(row.bwc_count || 0),
        dbFileBytes: Number(row.database_bytes || 0), walFileBytes: 0, backupExtension: '.pgdump',
    };
}
async function runMaintenance(opts) {
    await query(opts && opts.vacuum ? 'VACUUM (ANALYZE)' : 'ANALYZE');
    return { ok: true, vacuum: !!(opts && opts.vacuum) };
}
async function backupDatabase(destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, 'mobility-' + new Date().toISOString().replace(/[:.]/g, '-') + '.pgdump');
    const container = String(process.env.FM_POSTGRES_CONTAINER || 'mobility-postgres').trim();
    const user = String(process.env.FM_POSTGRES_USER || 'mobility').trim();
    const database = String(process.env.FM_POSTGRES_DB || 'mobility').trim();
    const remote = '/tmp/' + path.basename(dest);
    try {
        await execFileAsync('docker', [
            'exec', container, 'pg_dump', '--username', user, '--dbname', database,
            '--format', 'custom', '--file', remote,
        ], { windowsHide: true });
        await execFileAsync('docker', ['exec', container, 'pg_restore', '--list', remote], { windowsHide: true });
        await execFileAsync('docker', ['cp', container + ':' + remote, dest], { windowsHide: true });
        if (!fs.existsSync(dest) || fs.statSync(dest).size < 64) throw new Error('pg_dump output is empty');
        return { ok: true, engine: 'postgresql', path: dest, bytes: fs.statSync(dest).size };
    } catch (err) {
        try { fs.unlinkSync(dest); } catch (_) { /* ignore */ }
        return { ok: false, error: err && err.message ? err.message : String(err) };
    } finally {
        await execFileAsync('docker', ['exec', container, 'rm', '-f', remote], { windowsHide: true }).catch(() => {});
    }
}

async function appendGpsTrackPoint(row) {
    const lat = parseFloat(row && row.lat);
    const lon = parseFloat(row && row.lon);
    if (!row || !row.deviceId || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const r = await query(`
        INSERT INTO gps_track_points (device_id,recorded_at,lat,lon,source)
        VALUES ($1,$2,$3,$4,$5) RETURNING id
    `, [String(row.deviceId).trim(), row.recordedAt || new Date().toISOString(), lat, lon, row.source || 'sip']);
    return r.rows[0].id;
}
async function queryGpsTrackRoute(deviceId, fromIso, toIso, limit) {
    const n = Math.min(50000, Math.max(1, parseInt(limit, 10) || 10000));
    return (await query(`
        SELECT id,device_id,recorded_at,lat,lon,source FROM gps_track_points
        WHERE device_id=$1 AND recorded_at >= $2 AND recorded_at <= $3
        ORDER BY recorded_at ASC LIMIT $4
    `, [String(deviceId).trim(), fromIso, toIso, n])).rows.map((row) => ({
        id: row.id, deviceId: row.device_id, recordedAt: row.recorded_at,
        lat: row.lat, lon: row.lon, source: row.source,
    }));
}
async function purgeGpsTrackOlderThan(cutoffIso) {
    return (await query('DELETE FROM gps_track_points WHERE recorded_at < $1', [cutoffIso])).rowCount;
}
async function listEvidenceForDeviceWindow(deviceId, fromIso, toIso, limit) {
    const n = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    return (await query(`
        SELECT id,file_name,device_id,operator_name,uploaded_at,byte_size,source FROM evidence_files
        WHERE device_id=$1 AND uploaded_at >= $2 AND uploaded_at <= $3
        ORDER BY uploaded_at ASC LIMIT $4
    `, [String(deviceId).trim(), fromIso, toIso, n])).rows.map((row) => ({
        id: row.id, fileName: row.file_name, deviceId: row.device_id, operatorName: row.operator_name,
        uploadedAt: row.uploaded_at, byteSize: row.byte_size, source: row.source,
    }));
}
async function findEvidenceNearTime(deviceId, pointIso, windowMs) {
    const t = new Date(pointIso).getTime();
    if (!deviceId || !Number.isFinite(t)) return null;
    const ms = Math.max(60000, parseInt(windowMs, 10) || 900000);
    const rows = await listEvidenceForDeviceWindow(
        deviceId, new Date(t - ms).toISOString(), new Date(t + ms).toISOString(), 20
    );
    return rows.reduce((best, row) => {
        if (!best) return row;
        return Math.abs(new Date(row.uploadedAt).getTime() - t)
            < Math.abs(new Date(best.uploadedAt).getTime() - t) ? row : best;
    }, null);
}

function rowToCaseFile(row) {
    if (!row) return null;
    return {
        id: row.id, title: row.title, status: row.status || 'open', officerName: row.officer_name || '',
        deviceId: row.device_id || '', sosIncidentId: row.sos_incident_id || null, narrative: row.narrative || '',
        createdAt: row.created_at, createdBy: row.created_by || null, updatedAt: row.updated_at,
        updatedBy: row.updated_by || null,
    };
}
async function listCaseFiles(limit, filters) {
    const cap = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const f = filters || {};
    const where = [];
    const params = [];
    const add = (sql, value) => { params.push(value); where.push(sql.replace(/\$\?/g, '$' + params.length)); };
    if (['open', 'closed'].includes(f.status)) add('status=$?', f.status);
    if (f.from) add('updated_at >= $?', String(f.from));
    if (f.to) add('updated_at <= $?', String(f.to));
    if (f.q) {
        params.push('%' + String(f.q).trim().replace(/[%_]/g, '') + '%');
        const p = '$' + params.length;
        where.push(`(id ILIKE ${p} OR title ILIKE ${p} OR officer_name ILIKE ${p}
            OR device_id ILIKE ${p} OR sos_incident_id ILIKE ${p} OR narrative ILIKE ${p})`);
    }
    params.push(cap);
    return (await query(`
        SELECT * FROM case_files ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY updated_at DESC LIMIT $${params.length}
    `, params)).rows.map(rowToCaseFile);
}
async function getCaseFile(id) {
    return rowToCaseFile((await query('SELECT * FROM case_files WHERE id=$1', [String(id)])).rows[0]);
}
async function insertCaseFile(row) {
    await query(`
        INSERT INTO case_files (
            id,title,status,officer_name,device_id,sos_incident_id,narrative,created_at,created_by,updated_at,updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [row.id, row.title, row.status || 'open', row.officerName || '', row.deviceId || '',
        row.sosIncidentId || null, row.narrative || '', row.createdAt, row.createdBy || null,
        row.updatedAt, row.updatedBy || null]);
    return row.id;
}
async function updateCaseFile(id, patch) {
    const existing = await getCaseFile(id);
    if (!existing) return null;
    const next = Object.assign({}, existing, patch || {});
    await query(`
        UPDATE case_files SET title=$1,status=$2,officer_name=$3,device_id=$4,sos_incident_id=$5,
            narrative=$6,updated_at=$7,updated_by=$8 WHERE id=$9
    `, [next.title, next.status || 'open', next.officerName || '', next.deviceId || '',
        next.sosIncidentId || null, next.narrative || '', patch.updatedAt || new Date().toISOString(),
        patch.updatedBy || next.updatedBy || null, String(id)]);
    return getCaseFile(id);
}
async function listCaseFileEvidence(id) {
    return (await query(`
        SELECT case_file_id,evidence_file_id,linked_at,linked_by FROM case_file_evidence
        WHERE case_file_id=$1 ORDER BY linked_at DESC
    `, [String(id)])).rows.map((row) => ({
        caseFileId: row.case_file_id, evidenceFileId: row.evidence_file_id,
        linkedAt: row.linked_at, linkedBy: row.linked_by,
    }));
}
async function linkCaseFileEvidence(caseId, evidenceId, linkedBy) {
    await query(`
        INSERT INTO case_file_evidence (case_file_id,evidence_file_id,linked_at,linked_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT(case_file_id,evidence_file_id) DO UPDATE SET linked_at=EXCLUDED.linked_at,linked_by=EXCLUDED.linked_by
    `, [String(caseId), String(evidenceId), new Date().toISOString(), linkedBy || null]);
    return true;
}
async function unlinkCaseFileEvidence(caseId, evidenceId) {
    return (await query(`
        DELETE FROM case_file_evidence WHERE case_file_id=$1 AND evidence_file_id=$2
    `, [String(caseId), String(evidenceId)])).rowCount;
}
async function countCaseFileEvidence(id) {
    return Number((await query('SELECT COUNT(*) AS n FROM case_file_evidence WHERE case_file_id=$1', [String(id)])).rows[0].n || 0);
}
async function deleteCaseFile(id) {
    return transaction(async (client) => {
        const existing = rowToCaseFile((await query('SELECT * FROM case_files WHERE id=$1', [String(id)], client)).rows[0]);
        if (!existing) return null;
        const links = (await query('SELECT * FROM case_file_evidence WHERE case_file_id=$1', [String(id)], client)).rows;
        await query('DELETE FROM case_file_evidence WHERE case_file_id=$1', [String(id)], client);
        const removed = await query('DELETE FROM case_files WHERE id=$1', [String(id)], client);
        return removed.rowCount ? { caseFile: existing, evidenceLinks: links } : null;
    });
}

module.exports = {
    init, isReady, close, healthCheck, dbPath, catalogDb, transaction,
    listDevices, saveDevices, findDevice, deviceCount, migrateFromJson, exportToJson,
    appendAudit, listAudit, queryAudit, queryAuditForEvidenceFile, listDistinctAuditActions,
    countAudit, auditLogReadable, repairAuditLog, setSetting, getSetting,
    listRecentOnline, touchRuntime, upsertEvidenceFile, findEvidenceByRelative,
    getEvidenceFile, listEvidenceFiles, listEvidenceFilesPage, insertEvidenceDownload,
    getEvidenceDownload, markEvidenceDownloadConsumed, listEvidenceDownloads,
    appendBwcMessage, listBwcMessages, listBwcMessageThreads, clearBwcMessagesForDevice,
    clearAllBwcMessages, purgeBwcMessagesOlderThanDays, getEvidenceMeta, upsertEvidenceMeta,
    listEvidenceTagsByFileId, listEvidenceAttachments, insertEvidenceAttachment,
    getEvidenceAttachment, insertEvidenceExport, updateEvidenceExportMeta,
    listEvidenceExports, listRedactedEvidenceExportsPage, getEvidenceExport,
    deleteEvidenceExport, listNonFinalizedRedactExports, listFinalizedRedactExports, listTrimExports, insertSecureExportRequest, getSecureExportRequest,
    listSecureExportRequests, updateSecureExportRequest, countPendingSecureExportsForUser,
    getDatabaseStats, runMaintenance, backupDatabase, appendGpsTrackPoint,
    queryGpsTrackRoute, purgeGpsTrackOlderThan, listEvidenceForDeviceWindow,
    findEvidenceNearTime, listCaseFiles, getCaseFile, insertCaseFile, updateCaseFile,
    listCaseFileEvidence, linkCaseFileEvidence, unlinkCaseFileEvidence,
    countCaseFileEvidence, deleteCaseFile,
};
