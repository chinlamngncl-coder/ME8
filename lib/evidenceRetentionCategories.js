/**
 * EVIDENCE-RETENTION-CATEGORIES-V1 — Super admin category defs (name + days / until manual).
 * Assign-to-file and delete queue = later MOBs.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let storePath = null;

const DEFAULTS = [
    { id: 'RC-DEFAULT-90', name: 'Standard (90 days)', mode: 'days', days: 90 },
    { id: 'RC-DEFAULT-365', name: 'Long (1 year)', mode: 'days', days: 365 },
    { id: 'RC-DEFAULT-MANUAL', name: 'Until manually deleted', mode: 'until_manual', days: null },
];

function init(storageDir) {
    storePath = path.join(storageDir, 'evidence-retention-categories.json');
    if (!fs.existsSync(storePath)) {
        writeStore({
            version: 1,
            categories: DEFAULTS.map(function (d) {
                return Object.assign({}, d, {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    updatedBy: 'system',
                });
            }),
        });
    }
}

function readStore() {
    try {
        const raw = fs.readFileSync(storePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.categories)) return data;
    } catch (_) { /* empty */ }
    return { version: 1, categories: [] };
}

function writeStore(data) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
}

function newId() {
    return 'RC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex');
}

function publicCategory(c) {
    if (!c) return null;
    const mode = c.mode === 'until_manual' ? 'until_manual' : 'days';
    let days = null;
    if (mode === 'days') {
        days = Math.max(1, parseInt(c.days, 10) || 1);
    }
    return {
        id: c.id,
        name: String(c.name || '').trim() || 'Untitled',
        mode: mode,
        days: days,
        createdAt: c.createdAt || null,
        updatedAt: c.updatedAt || null,
        updatedBy: c.updatedBy || null,
    };
}

function list() {
    return readStore().categories.map(publicCategory).filter(Boolean);
}

function get(id) {
    const hit = readStore().categories.find(function (c) {
        return c && String(c.id) === String(id);
    });
    return publicCategory(hit);
}

function create(input, actor) {
    const name = String((input && input.name) || '').trim();
    if (!name) {
        const err = new Error('Category name required');
        err.status = 400;
        throw err;
    }
    const mode = (input && input.mode) === 'until_manual' ? 'until_manual' : 'days';
    let days = null;
    if (mode === 'days') {
        days = Math.max(1, parseInt(input && input.days, 10) || 0);
        if (!days) {
            const err = new Error('Days required (1 or more), or choose Until manually deleted');
            err.status = 400;
            throw err;
        }
    }
    const now = new Date().toISOString();
    const row = {
        id: newId(),
        name: name.slice(0, 120),
        mode: mode,
        days: days,
        createdAt: now,
        updatedAt: now,
        updatedBy: actor || null,
    };
    const store = readStore();
    store.categories.push(row);
    writeStore(store);
    return publicCategory(row);
}

function update(id, input, actor) {
    const store = readStore();
    const idx = store.categories.findIndex(function (c) {
        return c && String(c.id) === String(id);
    });
    if (idx < 0) {
        const err = new Error('Category not found');
        err.status = 404;
        throw err;
    }
    const row = Object.assign({}, store.categories[idx]);
    if (input && input.name != null) {
        const name = String(input.name).trim();
        if (!name) {
            const err = new Error('Category name required');
            err.status = 400;
            throw err;
        }
        row.name = name.slice(0, 120);
    }
    if (input && input.mode != null) {
        row.mode = input.mode === 'until_manual' ? 'until_manual' : 'days';
    }
    if (row.mode === 'until_manual') {
        row.days = null;
    } else if (input && input.days != null) {
        row.days = Math.max(1, parseInt(input.days, 10) || 1);
    } else if (row.days == null) {
        row.days = 90;
    }
    row.updatedAt = new Date().toISOString();
    row.updatedBy = actor || null;
    store.categories[idx] = row;
    writeStore(store);
    return publicCategory(row);
}

function remove(id) {
    const store = readStore();
    const before = store.categories.length;
    store.categories = store.categories.filter(function (c) {
        return !(c && String(c.id) === String(id));
    });
    if (store.categories.length === before) {
        const err = new Error('Category not found');
        err.status = 404;
        throw err;
    }
    writeStore(store);
    return { ok: true, id: String(id) };
}

module.exports = {
    init: init,
    list: list,
    get: get,
    create: create,
    update: update,
    remove: remove,
};
