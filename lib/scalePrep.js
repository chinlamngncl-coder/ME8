/**
 * Phase A scale prep — debounced async cache writes, GPS emit batching, FTP used-file shield.
 * Opt-in via env (FM_USE_CACHE_DEBOUNCE=1). ME8 ship template enables by default; unset = legacy sync writes.
 */
'use strict';

function parseNonNegativeInt(val, fallback) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function createDebouncedWriter(writeFn, debounceMs) {
    const runWrite = () => Promise.resolve().then(() => writeFn());

    if (!debounceMs || debounceMs <= 0) {
        return {
            schedule: () => { runWrite().catch(() => {}); },
            flush: () => runWrite(),
            cancelPending: () => {},
        };
    }
    let timer = null;
    let dirty = false;
    let writeChain = Promise.resolve();

    function enqueueWrite() {
        dirty = false;
        writeChain = writeChain.then(() => runWrite()).catch(() => {});
        return writeChain;
    }

    function flush() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (!dirty) return writeChain;
        return enqueueWrite();
    }

    function schedule() {
        dirty = true;
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            if (!dirty) return;
            enqueueWrite().finally(() => {
                if (dirty) schedule();
            });
        }, debounceMs);
    }

    function cancelPending() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        dirty = false;
    }

    return { schedule, flush, cancelPending };
}

class FtpUsedShield {
    constructor(opts) {
        opts = opts || {};
        this.max = parseNonNegativeInt(opts.max, 50000) || 50000;
        this.ttlMs = parseNonNegativeInt(opts.ttlMs, 86400000) || 86400000;
        this.entries = new Map();
    }

    _sweep() {
        const now = Date.now();
        for (const [name, at] of this.entries) {
            if (now - at > this.ttlMs) this.entries.delete(name);
        }
        while (this.entries.size > this.max) {
            const oldest = this.entries.keys().next().value;
            this.entries.delete(oldest);
        }
    }

    has(name) {
        if (!name) return false;
        this._sweep();
        return this.entries.has(String(name));
    }

    add(name) {
        if (!name) return;
        this._sweep();
        this.entries.set(String(name), Date.now());
    }
}

function createGpsEmitBatcher(emitOneFn, batchMs) {
    if (!batchMs || batchMs <= 0) {
        return function push(camId, lat, lon) {
            emitOneFn(camId, lat, lon);
        };
    }
    const pending = new Map();
    let timer = null;
    function flush() {
        timer = null;
        const batch = Array.from(pending.entries());
        pending.clear();
        for (let i = 0; i < batch.length; i += 1) {
            const entry = batch[i];
            const coords = entry[1];
            emitOneFn(entry[0], coords.lat, coords.lon);
        }
    }
    return function push(camId, lat, lon) {
        if (!camId) return;
        pending.set(String(camId), { lat, lon });
        if (!timer) timer = setTimeout(flush, batchMs);
    };
}

function loadScalePrepEnv() {
    const useDebounce = process.env.FM_USE_CACHE_DEBOUNCE === '1';
    return {
        gpsCacheDebounceMs: useDebounce
            ? parseNonNegativeInt(process.env.FM_GPS_CACHE_DEBOUNCE_MS, 2000)
            : 0,
        contactCacheDebounceMs: useDebounce
            ? parseNonNegativeInt(process.env.FM_CONTACT_CACHE_DEBOUNCE_MS, 2000)
            : 0,
        gpsEmitBatchMs: parseNonNegativeInt(process.env.FM_GPS_EMIT_BATCH_MS, 0),
        ftpUsedMax: parseNonNegativeInt(process.env.FM_FTP_USED_FILES_MAX, 50000),
        ftpUsedTtlMs: parseNonNegativeInt(process.env.FM_FTP_USED_FILES_TTL_MS, 86400000),
    };
}

module.exports = {
    createDebouncedWriter,
    FtpUsedShield,
    createGpsEmitBatcher,
    loadScalePrepEnv,
};
