/**
 * Operation map overlay — SQLite persistence (Phase A).
 * Isolated from BWC registry / SOS / live video.
 */
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
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

function openDb() {
    if (!siteDb.isReady()) return null;
    return new DatabaseSync(siteDb.dbPath());
}

function init(storageDir) {
    siteDb.init(storageDir);
    if (!siteDb.isReady()) return false;
    const db = openDb();
    if (!db) return false;
    db.exec(`
        CREATE TABLE IF NOT EXISTS operations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            dispatch_group_id TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            created_by TEXT,
            activated_at TEXT,
            activated_by TEXT,
            closed_at TEXT,
            closed_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status, updated_at DESC);

        CREATE TABLE IF NOT EXISTS overlay_pins (
            id TEXT PRIMARY KEY,
            operation_id TEXT NOT NULL,
            pin_type TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            body TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            link_url TEXT,
            dispatch_group_id TEXT,
            color TEXT,
            visible INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            created_by TEXT,
            FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_overlay_op ON overlay_pins(operation_id, visible);
    `);
    db.close();
    ready = true;
    return true;
}

function isReady() {
    return ready && siteDb.isReady();
}

function rowToOperation(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        status: row.status,
        dispatchGroupId: row.dispatch_group_id || null,
        notes: row.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by || null,
        activatedAt: row.activated_at || null,
        activatedBy: row.activated_by || null,
        closedAt: row.closed_at || null,
        closedBy: row.closed_by || null,
    };
}

function rowToPin(row) {
    if (!row) return null;
    return {
        id: row.id,
        operationId: row.operation_id,
        pinType: row.pin_type,
        title: row.title || '',
        body: row.body || '',
        lat: row.lat,
        lon: row.lon,
        linkUrl: row.link_url || null,
        dispatchGroupId: row.dispatch_group_id || null,
        color: row.color || null,
        visible: !!row.visible,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by || null,
    };
}

function listOperations(filter) {
    const db = openDb();
    if (!db) return [];
    try {
        const status = filter && filter.status ? String(filter.status).trim() : '';
        let rows;
        if (status && OP_STATUSES.includes(status)) {
            rows = db.prepare(
                'SELECT * FROM operations WHERE status = ? ORDER BY updated_at DESC'
            ).all(status);
        } else {
            rows = db.prepare('SELECT * FROM operations ORDER BY updated_at DESC').all();
        }
        return rows.map(rowToOperation);
    } finally {
        db.close();
    }
}

function getOperation(id) {
    const db = openDb();
    if (!db || !id) return null;
    try {
        const row = db.prepare('SELECT * FROM operations WHERE id = ?').get(String(id).trim());
        return rowToOperation(row);
    } finally {
        db.close();
    }
}

function insertOperation(row) {
    const db = openDb();
    if (!db) throw new Error('Database not ready');
    try {
        db.prepare(`
            INSERT INTO operations (
                id, title, status, dispatch_group_id, notes,
                created_at, updated_at, created_by,
                activated_at, activated_by, closed_at, closed_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            row.id,
            row.title,
            row.status,
            row.dispatchGroupId || null,
            row.notes || '',
            row.createdAt,
            row.updatedAt,
            row.createdBy || null,
            row.activatedAt || null,
            row.activatedBy || null,
            row.closedAt || null,
            row.closedBy || null
        );
        return getOperation(row.id);
    } finally {
        db.close();
    }
}

function updateOperationRow(id, patch) {
    const db = openDb();
    if (!db) throw new Error('Database not ready');
    const cur = getOperation(id);
    if (!cur) return null;
    const next = Object.assign({}, cur, patch, {
        updatedAt: nowIso(),
    });
    try {
        db.prepare(`
            UPDATE operations SET
                title = ?, status = ?, dispatch_group_id = ?, notes = ?,
                updated_at = ?, activated_at = ?, activated_by = ?,
                closed_at = ?, closed_by = ?
            WHERE id = ?
        `).run(
            next.title,
            next.status,
            next.dispatchGroupId || null,
            next.notes || '',
            next.updatedAt,
            next.activatedAt || null,
            next.activatedBy || null,
            next.closedAt || null,
            next.closedBy || null,
            id
        );
        return getOperation(id);
    } finally {
        db.close();
    }
}

function countPins(operationId) {
    const db = openDb();
    if (!db) return 0;
    try {
        const row = db.prepare(
            'SELECT COUNT(*) AS n FROM overlay_pins WHERE operation_id = ?'
        ).get(operationId);
        return row ? row.n : 0;
    } finally {
        db.close();
    }
}

function listPins(operationId, opts) {
    const db = openDb();
    if (!db || !operationId) return [];
    const visibleOnly = opts && opts.visibleOnly;
    try {
        let sql = 'SELECT * FROM overlay_pins WHERE operation_id = ?';
        const params = [operationId];
        if (visibleOnly) {
            sql += ' AND visible = 1';
        }
        sql += ' ORDER BY created_at ASC';
        return db.prepare(sql).all(...params).map(rowToPin);
    } finally {
        db.close();
    }
}

function listActiveVisiblePins() {
    const db = openDb();
    if (!db) return [];
    try {
        const rows = db.prepare(`
            SELECT p.* FROM overlay_pins p
            INNER JOIN operations o ON o.id = p.operation_id
            WHERE o.status = 'active' AND p.visible = 1
            ORDER BY p.created_at ASC
        `).all();
        return rows.map(rowToPin);
    } finally {
        db.close();
    }
}

function getPin(id) {
    const db = openDb();
    if (!db || !id) return null;
    try {
        const row = db.prepare('SELECT * FROM overlay_pins WHERE id = ?').get(String(id).trim());
        return rowToPin(row);
    } finally {
        db.close();
    }
}

function insertPin(row) {
    const db = openDb();
    if (!db) throw new Error('Database not ready');
    try {
        db.prepare(`
            INSERT INTO overlay_pins (
                id, operation_id, pin_type, title, body, lat, lon,
                link_url, dispatch_group_id, color, visible,
                created_at, updated_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            row.id,
            row.operationId,
            row.pinType,
            row.title || '',
            row.body || '',
            row.lat,
            row.lon,
            row.linkUrl || null,
            row.dispatchGroupId || null,
            row.color || null,
            row.visible ? 1 : 0,
            row.createdAt,
            row.updatedAt,
            row.createdBy || null
        );
        return getPin(row.id);
    } finally {
        db.close();
    }
}

function updatePinRow(id, patch) {
    const db = openDb();
    if (!db) throw new Error('Database not ready');
    const cur = getPin(id);
    if (!cur) return null;
    const next = Object.assign({}, cur, patch, { updatedAt: nowIso() });
    try {
        db.prepare(`
            UPDATE overlay_pins SET
                pin_type = ?, title = ?, body = ?, lat = ?, lon = ?,
                link_url = ?, dispatch_group_id = ?, color = ?, visible = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            next.pinType,
            next.title || '',
            next.body || '',
            next.lat,
            next.lon,
            next.linkUrl || null,
            next.dispatchGroupId || null,
            next.color || null,
            next.visible ? 1 : 0,
            next.updatedAt,
            id
        );
        return getPin(id);
    } finally {
        db.close();
    }
}

function hideAllPinsForOperation(operationId) {
    const db = openDb();
    if (!db) return;
    try {
        db.prepare(
            'UPDATE overlay_pins SET visible = 0, updated_at = ? WHERE operation_id = ?'
        ).run(nowIso(), operationId);
    } finally {
        db.close();
    }
}

function deletePin(id) {
    const db = openDb();
    if (!db) return false;
    try {
        const r = db.prepare('DELETE FROM overlay_pins WHERE id = ?').run(String(id).trim());
        return r.changes > 0;
    } finally {
        db.close();
    }
}

module.exports = {
    MAX_PINS_PER_OPERATION,
    PIN_TYPES_V1,
    PIN_TYPES_ALL,
    OP_STATUSES,
    newId,
    init,
    isReady,
    listOperations,
    getOperation,
    insertOperation,
    updateOperationRow,
    countPins,
    listPins,
    listActiveVisiblePins,
    getPin,
    insertPin,
    updatePinRow,
    hideAllPinsForOperation,
    deletePin,
};
