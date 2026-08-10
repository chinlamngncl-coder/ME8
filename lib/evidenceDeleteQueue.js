/**
 * EVIDENCE-DELETE-QUEUE-7D-V1 — Delete → queued 7 days → Restore or purge.
 * Never instant wipe of Library media.
 */
const fs = require('fs');
const path = require('path');

const QUEUE_DAYS = 7;
const QUEUE_MS = QUEUE_DAYS * 24 * 60 * 60 * 1000;

let storePath = null;

function init(storageDir) {
    storePath = path.join(storageDir, 'evidence-delete-queue.json');
    if (!fs.existsSync(storePath)) {
        writeStore({ version: 1, items: [] });
    }
}

function readStore() {
    try {
        const raw = fs.readFileSync(storePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.items)) return data;
    } catch (_) { /* empty */ }
    return { version: 1, items: [] };
}

function writeStore(data) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
}

function list() {
    return readStore().items.slice().sort(function (a, b) {
        return String(a.purgeAt || '').localeCompare(String(b.purgeAt || ''));
    });
}

function get(evidenceFileId) {
    const id = String(evidenceFileId || '').trim();
    if (!id) return null;
    return readStore().items.find(function (it) {
        return it && String(it.evidenceFileId) === id;
    }) || null;
}

function upsertItem(item) {
    const store = readStore();
    const id = String(item.evidenceFileId);
    const idx = store.items.findIndex(function (it) {
        return it && String(it.evidenceFileId) === id;
    });
    if (idx >= 0) store.items[idx] = item;
    else store.items.push(item);
    writeStore(store);
    return item;
}

function remove(evidenceFileId) {
    const id = String(evidenceFileId || '').trim();
    const store = readStore();
    const before = store.items.length;
    store.items = store.items.filter(function (it) {
        return !(it && String(it.evidenceFileId) === id);
    });
    if (store.items.length === before) return false;
    writeStore(store);
    return true;
}

function dueItems(nowMs) {
    const now = nowMs != null ? nowMs : Date.now();
    return list().filter(function (it) {
        const t = Date.parse(it && it.purgeAt);
        return Number.isFinite(t) && t <= now;
    });
}

function buildQueueItem(file, actor, previousTier) {
    const now = new Date();
    const purge = new Date(now.getTime() + QUEUE_MS);
    return {
        evidenceFileId: file.id,
        fileName: file.fileName || null,
        deviceId: file.deviceId || null,
        operatorName: file.operatorName || null,
        previousTier: previousTier || 'local',
        queuedAt: now.toISOString(),
        purgeAt: purge.toISOString(),
        queuedBy: actor || null,
        queueDays: QUEUE_DAYS,
    };
}

module.exports = {
    QUEUE_DAYS: QUEUE_DAYS,
    QUEUE_MS: QUEUE_MS,
    init: init,
    list: list,
    get: get,
    upsertItem: upsertItem,
    remove: remove,
    dueItems: dueItems,
    buildQueueItem: buildQueueItem,
};
