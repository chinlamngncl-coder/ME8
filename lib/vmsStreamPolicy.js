'use strict';
/**
 * VMS-SITE-STREAM-POLICY-V1 — site Live / Record defaults.
 * Live: auto | main | sub  (auto = grid Sub, focus Main — view-time only)
 * Record continuous: main | sub
 */

const siteDb = require('./siteDb');

const SETTING_KEY = 'vmsStreamPolicy';
const DEFAULTS = Object.freeze({
    live: 'auto',
    record: 'main',
});

function normalizeLive(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'main' || s === 'sub' || s === 'auto') return s;
    return DEFAULTS.live;
}

function normalizeRecord(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'main' || s === 'sub') return s;
    return DEFAULTS.record;
}

function normalize(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        live: normalizeLive(r.live),
        record: normalizeRecord(r.record),
    };
}

async function get() {
    if (!siteDb.isReady()) return Object.assign({}, DEFAULTS);
    try {
        const raw = await siteDb.getSetting(SETTING_KEY, DEFAULTS);
        return normalize(raw);
    } catch (_) {
        return Object.assign({}, DEFAULTS);
    }
}

async function set(patch) {
    const prev = await get();
    const next = normalize({
        live: patch && patch.live != null ? patch.live : prev.live,
        record: patch && patch.record != null ? patch.record : prev.record,
    });
    if (!siteDb.isReady()) {
        const err = new Error('PostgreSQL catalog is required to save stream policy.');
        err.status = 503;
        throw err;
    }
    await siteDb.setSetting(SETTING_KEY, next);
    return next;
}

module.exports = {
    SETTING_KEY,
    DEFAULTS,
    normalize,
    normalizeLive,
    normalizeRecord,
    get,
    set,
};
