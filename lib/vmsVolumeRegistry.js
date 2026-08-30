'use strict';
/**
 * VMS Step 1 — Storage Volume Manager
 *
 * Manages physical storage mounts (SAN LUNs, RAID arrays, local dirs).
 * mount_path is NEVER returned to the client — only role labels are exposed.
 *
 * Roles:
 *   bwc-ingest     — FTP/dock ingest target for BWC uploads
 *   fixed-archive  — Continuous NAS writer target for fixed camera segments
 *   ai-feed        — Third-stream target for AI analytics (future)
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');
const siteDb = require('./siteDb');
const log    = require('./fleetLog');

const VALID_ROLES = ['bwc-ingest', 'fixed-archive', 'ai-feed'];
const VALID_TIERS = ['local_edge', 'nvr_hdd', 'nas_archive'];

function normalizeTierType(raw, role, notes) {
    const t = String(raw || '').trim().toLowerCase();
    if (VALID_TIERS.indexOf(t) >= 0) return t;
    const notesStr = String(notes || '');
    if (/tier:edge-nvme/i.test(notesStr) || role === 'bwc-ingest') return 'local_edge';
    if (/tier:nvr-local/i.test(notesStr)) return 'nvr_hdd';
    return 'nas_archive';
}

let ensurePromise = null;

/** Create table if missing (covers catalogs that never ran migration 018+). */
async function ensureTable() {
    if (!ensurePromise) {
        ensurePromise = (async () => {
            await siteDb.query(`
                CREATE TABLE IF NOT EXISTS vms_storage_volumes (
                    id               TEXT    PRIMARY KEY,
                    name             TEXT    NOT NULL,
                    role             TEXT    NOT NULL CHECK (role IN ('bwc-ingest', 'fixed-archive', 'ai-feed')),
                    mount_path       TEXT    NOT NULL,
                    capacity_gb      INTEGER,
                    threshold_pct    INTEGER NOT NULL DEFAULT 85,
                    retention_days   INTEGER,
                    enabled          BOOLEAN NOT NULL DEFAULT TRUE,
                    notes            TEXT    NOT NULL DEFAULT '',
                    tier_type        TEXT    NOT NULL DEFAULT 'nas_archive',
                    created_at       TEXT    NOT NULL,
                    updated_at       TEXT    NOT NULL
                )
            `);
            await siteDb.query(
                `ALTER TABLE vms_storage_volumes ADD COLUMN IF NOT EXISTS tier_type TEXT NOT NULL DEFAULT 'nas_archive'`
            );
            await siteDb.query(
                `CREATE INDEX IF NOT EXISTS vms_storage_volumes_role_idx ON vms_storage_volumes (role)`
            );
        })().catch((err) => {
            ensurePromise = null;
            throw err;
        });
    }
    return ensurePromise;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function makeId() {
    return 'vol-' + crypto.randomBytes(6).toString('hex');
}

function nowIso() {
    return new Date().toISOString();
}

/**
 * Safe client payload — strips mount_path and any absolute filesystem info.
 * Clients only see: id, name, role, capacity_gb, threshold_pct,
 * retention_days, enabled, notes, created_at, updated_at.
 */
function toClientView(row) {
    if (!row) return null;
    return {
        id:             row.id,
        name:           row.name,
        role:           row.role,
        capacity_gb:    row.capacity_gb,
        threshold_pct:  row.threshold_pct,
        retention_days: row.retention_days,
        enabled:        row.enabled,
        notes:          row.notes,
        tier_type:      normalizeTierType(row.tier_type, row.role, row.notes),
        created_at:     row.created_at,
        updated_at:     row.updated_at,
    };
}

/* ── CRUD ─────────────────────────────────────────────────────────────────── */

async function list() {
    try {
        await ensureTable();
        const { rows } = await siteDb.query(
            `SELECT * FROM vms_storage_volumes ORDER BY created_at ASC`
        );
        return rows.map(toClientView);
    } catch (err) {
        log.web.warn('[vms-volumes] list failed', { error: err && err.message });
        return [];
    }
}

async function getById(id) {
    const { rows } = await siteDb.query(
        `SELECT * FROM vms_storage_volumes WHERE id = $1`, [id]
    );
    return rows[0] || null;
}

/** Returns the raw row (including mount_path) — server-side use only. */
async function getRawById(id) {
    const { rows } = await siteDb.query(
        `SELECT * FROM vms_storage_volumes WHERE id = $1`, [id]
    );
    return rows[0] || null;
}

/** Returns the raw row for a given role (first enabled match). */
async function getRawByRole(role) {
    const { rows } = await siteDb.query(
        `SELECT * FROM vms_storage_volumes WHERE role = $1 AND enabled = TRUE ORDER BY created_at ASC LIMIT 1`,
        [role]
    );
    return rows[0] || null;
}

async function add(data) {
    await ensureTable();
    const id   = makeId();
    const now  = nowIso();
    const role = VALID_ROLES.includes(data.role) ? data.role : null;
    if (!role)        throw new Error('Invalid volume role');
    if (!data.name)   throw new Error('Volume name is required');
    if (!data.mount_path) throw new Error('Mount path is required');

    const tierType = normalizeTierType(
        data.tier_type || data.tierType,
        role,
        data.notes
    );

    const { rows } = await siteDb.query(
        `INSERT INTO vms_storage_volumes
         (id, name, role, mount_path, capacity_gb, threshold_pct, retention_days, enabled, notes, tier_type, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
            id,
            String(data.name).trim(),
            role,
            String(data.mount_path).trim(),
            parseInt(data.capacity_gb, 10) || null,
            Math.min(100, Math.max(50, parseInt(data.threshold_pct, 10) || 85)),
            parseInt(data.retention_days, 10) || null,
            data.enabled !== false,
            String(data.notes || '').trim(),
            tierType,
            now,
            now,
        ]
    );
    log.web.info('[vms-volume] added', { id, role, name: data.name });
    return toClientView(rows[0]);
}

async function update(id, data) {
    const existing = await getRawById(id);
    if (!existing) return null;
    const now = nowIso();

    const role = data.role != null
        ? (VALID_ROLES.includes(data.role) ? data.role : existing.role)
        : existing.role;

    const tierType = normalizeTierType(
        data.tier_type != null ? data.tier_type : (data.tierType != null ? data.tierType : existing.tier_type),
        role,
        data.notes != null ? data.notes : existing.notes
    );

    const { rows } = await siteDb.query(
        `UPDATE vms_storage_volumes SET
            name            = $1,
            role            = $2,
            mount_path      = $3,
            capacity_gb     = $4,
            threshold_pct   = $5,
            retention_days  = $6,
            enabled         = $7,
            notes           = $8,
            tier_type       = $9,
            updated_at      = $10
         WHERE id = $11
         RETURNING *`,
        [
            String(data.name  != null ? data.name  : existing.name).trim(),
            role,
            String(data.mount_path != null ? data.mount_path : existing.mount_path).trim(),
            data.capacity_gb   != null ? (parseInt(data.capacity_gb, 10) || null)  : existing.capacity_gb,
            data.threshold_pct != null ? Math.min(100, Math.max(50, parseInt(data.threshold_pct, 10) || 85)) : existing.threshold_pct,
            data.retention_days != null ? (parseInt(data.retention_days, 10) || null) : existing.retention_days,
            data.enabled != null ? !!data.enabled : existing.enabled,
            String(data.notes  != null ? data.notes  : existing.notes).trim(),
            tierType,
            now,
            id,
        ]
    );
    log.web.info('[vms-volume] updated', { id, role });
    return toClientView(rows[0]);
}

async function remove(id) {
    const { rowCount } = await siteDb.query(
        `DELETE FROM vms_storage_volumes WHERE id = $1`, [id]
    );
    if (rowCount > 0) log.web.info('[vms-volume] removed', { id });
    return rowCount > 0;
}

/* ── Path Probe (write-test) ──────────────────────────────────────────────── */

/**
 * Verifies a mount path before it is saved:
 *   1. Path exists and is a directory
 *   2. Server process can write a temp file to it
 *   3. Measures write throughput (64 KB test block)
 *   4. Returns disk usage via statvfs
 *
 * Result never includes the raw path in fields returned to the client.
 */
async function probeMount(mountPath) {
    const mp = String(mountPath || '').trim();
    if (!mp) return { ok: false, reason: 'Mount path is required' };

    /* 1. Existence check */
    let stat;
    try {
        stat = fs.statSync(mp);
    } catch (_) {
        return { ok: false, reason: 'Path does not exist or is not accessible' };
    }
    if (!stat.isDirectory()) {
        return { ok: false, reason: 'Path exists but is not a directory' };
    }

    /* 2. Write-test */
    const tmpFile = path.join(mp, '.vms-probe-' + crypto.randomBytes(4).toString('hex') + '.tmp');
    const testData = Buffer.alloc(65536, 0xAB); // 64 KB
    const t0 = Date.now();
    try {
        fs.writeFileSync(tmpFile, testData);
        fs.unlinkSync(tmpFile);
    } catch (writeErr) {
        return { ok: false, reason: 'Path is not writable: ' + (writeErr.code || 'write error') };
    }
    const writeMs = Date.now() - t0;

    /* 3. Disk space (best-effort — not all platforms support statvfs) */
    let freeGb = null;
    let totalGb = null;
    try {
        // Node 18.15+ / Node 20+
        const space = fs.statfsSync(mp);
        freeGb  = Math.floor((space.bfree  * space.bsize) / (1024 ** 3));
        totalGb = Math.floor((space.blocks * space.bsize) / (1024 ** 3));
    } catch (_) { /* non-fatal — statvfs not available on all Windows versions */ }

    log.web.info('[vms-probe] path verified', { writeMs, freeGb, totalGb });
    return {
        ok:       true,
        writeMs:  writeMs,
        freeGb:   freeGb,
        totalGb:  totalGb,
        usedPct:  (freeGb != null && totalGb != null && totalGb > 0)
                    ? Math.round(((totalGb - freeGb) / totalGb) * 100)
                    : null,
    };
}

module.exports = {
    list,
    getById,
    getRawById,
    getRawByRole,
    add,
    update,
    remove,
    probeMount,
    ensureTable,
    VALID_ROLES,
    toClientView,
};
