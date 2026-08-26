'use strict';
/**
 * VMS Step 4 — Site and Zone Registry
 *
 * Sites → Zones hierarchy for the Spatial Entity Tree.
 * map_image_path: absolute path — stored in DB, never sent to client.
 * Operators fetch the floor plan image via /api/vms/zones/:id/map-image.
 */

const crypto  = require('crypto');
const siteDb  = require('./siteDb');
const log     = require('./fleetLog');

function makeId(prefix) {
    return (prefix || 'id') + '-' + crypto.randomBytes(6).toString('hex');
}
function nowIso() { return new Date().toISOString(); }

/* ── Safe client views (strip server-only fields) ──────────────────────────── */

function siteToClient(row) {
    if (!row) return null;
    return { id: row.id, name: row.name, notes: row.notes,
             created_at: row.created_at, updated_at: row.updated_at };
}

function zoneToClient(row) {
    if (!row) return null;
    return {
        id:             row.id,
        site_id:        row.site_id,
        name:           row.name,
        hasFloorPlan:   !!(row.map_image_path),
        map_image_name: row.map_image_name || null,
        notes:          row.notes,
        created_at:     row.created_at,
        updated_at:     row.updated_at,
    };
}

/* ── Sites ──────────────────────────────────────────────────────────────────── */

async function listSites() {
    const { rows } = await siteDb.query(
        `SELECT * FROM vms_sites ORDER BY name ASC`
    );
    return rows.map(siteToClient);
}

async function getSiteById(id) {
    const { rows } = await siteDb.query(
        `SELECT * FROM vms_sites WHERE id = $1`, [id]
    );
    return siteToClient(rows[0]);
}

async function addSite(data) {
    const id  = makeId('site');
    const now = nowIso();
    const { rows } = await siteDb.query(
        `INSERT INTO vms_sites (id, name, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$4) RETURNING *`,
        [id, String(data.name || '').trim(), String(data.notes || '').trim(), now]
    );
    log.web.info('[vms-zone] site added', { id });
    return siteToClient(rows[0]);
}

async function updateSite(id, data) {
    const { rows } = await siteDb.query(
        `UPDATE vms_sites SET name=$1, notes=$2, updated_at=$3 WHERE id=$4 RETURNING *`,
        [String(data.name || '').trim(), String(data.notes || '').trim(), nowIso(), id]
    );
    return siteToClient(rows[0]);
}

async function removeSite(id) {
    const { rowCount } = await siteDb.query(`DELETE FROM vms_sites WHERE id=$1`, [id]);
    return rowCount > 0;
}

/* ── Zones ──────────────────────────────────────────────────────────────────── */

async function listZones(siteId) {
    const sql = siteId
        ? `SELECT * FROM vms_zones WHERE site_id=$1 ORDER BY name ASC`
        : `SELECT * FROM vms_zones ORDER BY name ASC`;
    const { rows } = await siteDb.query(sql, siteId ? [siteId] : []);
    return rows.map(zoneToClient);
}

async function getZoneById(id) {
    const { rows } = await siteDb.query(
        `SELECT * FROM vms_zones WHERE id=$1`, [id]
    );
    return rows[0] || null; // raw row (includes map_image_path server-side)
}

async function addZone(data) {
    const id  = makeId('zone');
    const now = nowIso();
    const { rows } = await siteDb.query(
        `INSERT INTO vms_zones (id, site_id, name, map_image_path, map_image_name, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [
            id,
            String(data.site_id || '').trim(),
            String(data.name    || '').trim(),
            data.map_image_path  ? String(data.map_image_path).trim()  : null,
            data.map_image_name  ? String(data.map_image_name).trim()  : null,
            String(data.notes   || '').trim(),
            now,
        ]
    );
    log.web.info('[vms-zone] zone added', { id, site_id: data.site_id });
    return zoneToClient(rows[0]);
}

async function updateZone(id, data) {
    const existing = await getZoneById(id);
    if (!existing) return null;
    const { rows } = await siteDb.query(
        `UPDATE vms_zones SET
            name            = $1,
            map_image_path  = $2,
            map_image_name  = $3,
            notes           = $4,
            updated_at      = $5
         WHERE id = $6 RETURNING *`,
        [
            String(data.name != null ? data.name : existing.name).trim(),
            data.map_image_path  != null ? String(data.map_image_path).trim()  : existing.map_image_path,
            data.map_image_name  != null ? String(data.map_image_name).trim()  : existing.map_image_name,
            String(data.notes    != null ? data.notes : existing.notes).trim(),
            nowIso(),
            id,
        ]
    );
    return zoneToClient(rows[0]);
}

async function removeZone(id) {
    const { rowCount } = await siteDb.query(`DELETE FROM vms_zones WHERE id=$1`, [id]);
    return rowCount > 0;
}

module.exports = {
    listSites, getSiteById, addSite, updateSite, removeSite,
    listZones, getZoneById, addZone, updateZone, removeZone,
    zoneToClient, siteToClient,
};
