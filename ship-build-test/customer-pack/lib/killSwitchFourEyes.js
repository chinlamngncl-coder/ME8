'use strict';

const crypto = require('crypto');

const PENDING_TTL_MS = 5 * 60 * 1000;
const pending = new Map();

function newId() {
    return crypto.randomBytes(8).toString('hex');
}

function purgeExpired() {
    const now = Date.now();
    pending.forEach(function (row, id) {
        if (row.expiresAt <= now) pending.delete(id);
    });
}

function createRequest(row) {
    purgeExpired();
    const now = Date.now();
    const entry = {
        id: newId(),
        recordCmd: String(row.recordCmd || '').trim(),
        camId: String(row.camId || '').trim(),
        reason: String(row.reason || '').trim(),
        incidentId: String(row.incidentId || '').trim().slice(0, 80),
        requesterUserId: row.requesterUserId,
        requesterUsername: row.requesterUsername,
        requesterRole: row.requesterRole || null,
        requestedAt: new Date(now).toISOString(),
        expiresAt: now + PENDING_TTL_MS,
    };
    pending.set(entry.id, entry);
    return entry;
}

function getRequest(id) {
    purgeExpired();
    return pending.get(String(id || '').trim()) || null;
}

function removeRequest(id) {
    pending.delete(String(id || '').trim());
}

function listPending() {
    purgeExpired();
    return Array.from(pending.values()).sort(function (a, b) {
        return a.requestedAt.localeCompare(b.requestedAt);
    });
}

function publicView(row) {
    if (!row) return null;
    return {
        id: row.id,
        recordCmd: row.recordCmd,
        camId: row.camId,
        reason: row.reason,
        incidentId: row.incidentId || '',
        requesterUsername: row.requesterUsername,
        requestedAt: row.requestedAt,
        expiresAt: new Date(row.expiresAt).toISOString(),
    };
}

function listPublic() {
    return listPending().map(publicView);
}

module.exports = {
    PENDING_TTL_MS,
    createRequest,
    getRequest,
    removeRequest,
    listPending,
    listPublic,
    publicView,
};
