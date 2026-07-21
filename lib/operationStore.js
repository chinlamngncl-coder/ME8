'use strict';

const crypto = require('crypto');
const siteDb = require('./siteDb');

const MAX_PINS_PER_OPERATION = 50;
const PIN_TYPES_V1 = ['note', 'rally', 'hazard', 'link'];
const PIN_TYPES_ALL = ['note', 'rally', 'hazard', 'link', 'camera'];
const OP_STATUSES = ['draft', 'active', 'closed', 'archived'];
let ready = false;

function newId(prefix) {
    return prefix + '_' + crypto.randomBytes(8).toString('hex');
}
function nowIso() {
    return new Date().toISOString();
}
function db() {
    const value = siteDb.catalogDb();
    if (!value) throw new Error('PostgreSQL catalog is not ready');
    return value;
}
async function init() {
    if (!siteDb.isReady()) throw new Error('PostgreSQL catalog is not ready');
    ready = true;
    return true;
}
function isReady() {
    return ready && siteDb.isReady();
}
function rowToOperation(row) {
    if (!row) return null;
    return {
        id: row.id, title: row.title, status: row.status, dispatchGroupId: row.dispatch_group_id || null,
        notes: row.notes || '', createdAt: row.created_at, updatedAt: row.updated_at,
        createdBy: row.created_by || null, activatedAt: row.activated_at || null,
        activatedBy: row.activated_by || null, closedAt: row.closed_at || null,
        closedBy: row.closed_by || null,
    };
}
function rowToPin(row) {
    if (!row) return null;
    return {
        id: row.id, operationId: row.operation_id, pinType: row.pin_type, title: row.title || '',
        body: row.body || '', lat: row.lat, lon: row.lon, linkUrl: row.link_url || null,
        dispatchGroupId: row.dispatch_group_id || null, color: row.color || null,
        visible: !!row.visible, createdAt: row.created_at, updatedAt: row.updated_at,
        createdBy: row.created_by || null,
    };
}
async function listOperations(filter) {
    const status = filter && OP_STATUSES.includes(filter.status) ? String(filter.status) : null;
    const result = status
        ? await db().query('SELECT * FROM operations WHERE status=$1 ORDER BY updated_at DESC', [status])
        : await db().query('SELECT * FROM operations ORDER BY updated_at DESC');
    return result.rows.map(rowToOperation);
}
async function getOperation(id) {
    if (!id) return null;
    return rowToOperation((await db().query('SELECT * FROM operations WHERE id=$1', [String(id).trim()])).rows[0]);
}
async function insertOperation(row) {
    const r = await db().query(`
        INSERT INTO operations (
            id,title,status,dispatch_group_id,notes,created_at,updated_at,created_by,
            activated_at,activated_by,closed_at,closed_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [row.id, row.title, row.status, row.dispatchGroupId || null, row.notes || '', row.createdAt,
        row.updatedAt, row.createdBy || null, row.activatedAt || null, row.activatedBy || null,
        row.closedAt || null, row.closedBy || null]);
    return rowToOperation(r.rows[0]);
}
async function updateOperationRow(id, patch) {
    const cur = await getOperation(id);
    if (!cur) return null;
    const next = Object.assign({}, cur, patch, { updatedAt: nowIso() });
    const r = await db().query(`
        UPDATE operations SET title=$1,status=$2,dispatch_group_id=$3,notes=$4,updated_at=$5,
            activated_at=$6,activated_by=$7,closed_at=$8,closed_by=$9
        WHERE id=$10 RETURNING *
    `, [next.title, next.status, next.dispatchGroupId || null, next.notes || '', next.updatedAt,
        next.activatedAt || null, next.activatedBy || null, next.closedAt || null,
        next.closedBy || null, String(id)]);
    return rowToOperation(r.rows[0]);
}
async function countPins(operationId) {
    return Number((await db().query(
        'SELECT COUNT(*) AS n FROM overlay_pins WHERE operation_id=$1', [operationId]
    )).rows[0].n || 0);
}
async function listPins(operationId, opts) {
    if (!operationId) return [];
    const result = await db().query(`
        SELECT * FROM overlay_pins WHERE operation_id=$1
        ${opts && opts.visibleOnly ? 'AND visible=1' : ''} ORDER BY created_at ASC
    `, [operationId]);
    return result.rows.map(rowToPin);
}
async function listActiveVisiblePins() {
    return (await db().query(`
        SELECT p.* FROM overlay_pins p INNER JOIN operations o ON o.id=p.operation_id
        WHERE o.status='active' AND p.visible=1 ORDER BY p.created_at ASC
    `)).rows.map(rowToPin);
}
async function getPin(id) {
    if (!id) return null;
    return rowToPin((await db().query('SELECT * FROM overlay_pins WHERE id=$1', [String(id).trim()])).rows[0]);
}
async function insertPin(row) {
    const r = await db().query(`
        INSERT INTO overlay_pins (
            id,operation_id,pin_type,title,body,lat,lon,link_url,dispatch_group_id,color,
            visible,created_at,updated_at,created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
    `, [row.id, row.operationId, row.pinType, row.title || '', row.body || '', row.lat, row.lon,
        row.linkUrl || null, row.dispatchGroupId || null, row.color || null, row.visible ? 1 : 0,
        row.createdAt, row.updatedAt, row.createdBy || null]);
    return rowToPin(r.rows[0]);
}
async function updatePinRow(id, patch) {
    const cur = await getPin(id);
    if (!cur) return null;
    const next = Object.assign({}, cur, patch, { updatedAt: nowIso() });
    const r = await db().query(`
        UPDATE overlay_pins SET pin_type=$1,title=$2,body=$3,lat=$4,lon=$5,link_url=$6,
            dispatch_group_id=$7,color=$8,visible=$9,updated_at=$10 WHERE id=$11 RETURNING *
    `, [next.pinType, next.title || '', next.body || '', next.lat, next.lon, next.linkUrl || null,
        next.dispatchGroupId || null, next.color || null, next.visible ? 1 : 0, next.updatedAt, String(id)]);
    return rowToPin(r.rows[0]);
}
async function hideAllPinsForOperation(operationId) {
    await db().query(
        'UPDATE overlay_pins SET visible=0,updated_at=$1 WHERE operation_id=$2',
        [nowIso(), operationId]
    );
}
async function deletePin(id) {
    return (await db().query('DELETE FROM overlay_pins WHERE id=$1', [String(id).trim()])).rowCount > 0;
}

module.exports = {
    MAX_PINS_PER_OPERATION, PIN_TYPES_V1, PIN_TYPES_ALL, OP_STATUSES, newId, init, isReady,
    listOperations, getOperation, insertOperation, updateOperationRow, countPins, listPins,
    listActiveVisiblePins, getPin, insertPin, updatePinRow, hideAllPinsForOperation, deletePin,
};
