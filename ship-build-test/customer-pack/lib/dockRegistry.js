/**
 * Dock station registry — national sites, bay presets (single / 8 / 24).
 * Bay live state: mock until manufacturer SDK adapter is wired.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dockSdkAdapter = require('./dockSdkAdapter');

const BAY_PRESETS = Object.freeze({
    single: { count: 1, cols: 1, rows: 1, label: 'Single' },
    '8': { count: 8, cols: 4, rows: 2, label: '8-bay' },
    '24': { count: 24, cols: 6, rows: 4, label: '24-bay' },
});

let registryPath = null;

function init(storageDir) {
    registryPath = path.join(storageDir, 'dock-registry.json');
    if (!fs.existsSync(registryPath)) {
        writeStore({ docks: [] });
    }
}

function readStore() {
    try {
        const raw = fs.readFileSync(registryPath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.docks)) return data;
    } catch (_) { /* empty */ }
    return { docks: [] };
}

function writeStore(data) {
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, JSON.stringify(data, null, 2), 'utf8');
}

function newDockId() {
    return 'DOCK-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex');
}

function normalizeBayPreset(raw) {
    const s = String(raw || '8').trim().toLowerCase();
    if (s === 'single' || s === '1') return 'single';
    if (s === '24') return '24';
    return '8';
}

function normalizeDock(input, existing) {
    const now = new Date().toISOString();
    const base = existing ? Object.assign({}, existing) : {
        id: newDockId(),
        createdAt: now,
        status: 'offline',
        sdkConnected: false,
        linkState: 'pending',
        productCode: '',
        model: 'generic',
    };
    const patch = input || {};
    if (patch.displayName != null) base.displayName = String(patch.displayName).trim();
    if (patch.branchCode != null) base.branchCode = String(patch.branchCode).trim();
    if (patch.bayPreset != null) base.bayPreset = normalizeBayPreset(patch.bayPreset);
    if (patch.productCode != null) {
        base.productCode = dockSdkAdapter.normalizeProductCode(patch.productCode);
        base.model = dockSdkAdapter.modelFromProduct(base.productCode);
    }
    if (patch.model != null && !patch.productCode) {
        base.model = String(patch.model).trim() || 'generic';
    }
    if (patch.linkState != null) {
        const ls = String(patch.linkState).trim().toLowerCase();
        base.linkState = ls === 'online' || ls === 'offline' ? ls : 'pending';
    }
    if (patch.country != null) base.country = String(patch.country).trim();
    if (patch.province != null) base.province = String(patch.province).trim();
    if (patch.city != null) base.city = String(patch.city).trim();
    if (patch.siteName != null) base.siteName = String(patch.siteName).trim();
    if (patch.address != null) base.address = String(patch.address).trim();
    if (patch.responsibleUnit != null) base.responsibleUnit = String(patch.responsibleUnit).trim();
    if (patch.contactName != null) base.contactName = String(patch.contactName).trim();
    if (patch.contactPhone != null) base.contactPhone = String(patch.contactPhone).trim();
    if (patch.hostIp != null) base.hostIp = String(patch.hostIp).trim();
    if (patch.ftpSubfolder != null) base.ftpSubfolder = String(patch.ftpSubfolder).trim();
    if (patch.timezone != null) base.timezone = String(patch.timezone).trim();
    if (patch.notes != null) base.notes = String(patch.notes).trim();
    if (patch.status != null) base.status = String(patch.status).trim() || 'offline';
    if (!base.bayPreset) base.bayPreset = '8';
    if (!base.productCode) base.productCode = '';
    if (!base.model) base.model = dockSdkAdapter.modelFromProduct(base.productCode);
    if (!base.linkState) base.linkState = dockSdkAdapter.resolveLinkState(base);
    if (!base.displayName) base.displayName = base.branchCode || base.id;
    base.updatedAt = now;
    return base;
}

function listDocks() {
    return readStore().docks.slice().sort(function (a, b) {
        return String(a.displayName || '').localeCompare(String(b.displayName || ''));
    });
}

function getDock(id) {
    return listDocks().find(function (d) { return d.id === id; }) || null;
}

function createDock(input) {
    if (!String(input.branchCode || '').trim()) {
        throw new Error('Branch / station code is required');
    }
    if (!String(input.displayName || '').trim()) {
        throw new Error('Display name is required');
    }
    const store = readStore();
    const dock = normalizeDock(input, null);
    store.docks.push(dock);
    writeStore(store);
    return dock;
}

function updateDock(id, input) {
    const store = readStore();
    const idx = store.docks.findIndex(function (d) { return d.id === id; });
    if (idx < 0) throw new Error('Dock not found');
    store.docks[idx] = normalizeDock(input, store.docks[idx]);
    writeStore(store);
    return store.docks[idx];
}

function deleteDock(id) {
    const store = readStore();
    const before = store.docks.length;
    store.docks = store.docks.filter(function (d) { return d.id !== id; });
    if (store.docks.length === before) throw new Error('Dock not found');
    writeStore(store);
    return true;
}

/** Placeholder bay states until manufacturer SDK — enriches with FTP hints. */
function bayStatesForDock(dock, ftpHints) {
    const preset = BAY_PRESETS[dock.bayPreset] || BAY_PRESETS['8'];
    const hints = ftpHints && ftpHints[dock.id] ? ftpHints[dock.id] : {};
    const bays = [];
    for (let i = 1; i <= preset.count; i += 1) {
        const hint = hints[i] || hints[String(i)] || null;
        bays.push({
            bay: i,
            serial: hint && hint.serial ? hint.serial : null,
            assignee: hint && hint.operatorName ? hint.operatorName : null,
            state: hint && hint.state ? hint.state : 'empty',
            progress: hint && hint.progress != null ? hint.progress : null,
            lastEventAt: hint && hint.lastEventAt ? hint.lastEventAt : null,
        });
    }
    return {
        dockId: dock.id,
        bayPreset: dock.bayPreset,
        cols: preset.cols,
        rows: preset.rows,
        count: preset.count,
        sdkConnected: !!dock.sdkConnected,
        bays: bays,
    };
}

function presetInfo(preset) {
    return BAY_PRESETS[preset] || BAY_PRESETS['8'];
}

module.exports = {
    init,
    BAY_PRESETS,
    listDocks,
    getDock,
    createDock,
    updateDock,
    deleteDock,
    bayStatesForDock,
    presetInfo,
    normalizeBayPreset,
};
