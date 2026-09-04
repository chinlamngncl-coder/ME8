'use strict';
/* JSON-STORE-SINGLE-WRITER-V1 — shared helper for small JSON side-stores.
   Same contract as the SOS ledger writer (MOB 3): in-memory cache is the source of
   truth; every disk write is unique temp + rename (a crash can never leave a torn
   file, and a torn/partial read can never wipe the store on the next write). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function atomicWriteJsonSync(filePath, data, indent) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    try {
        fs.writeFileSync(tmp, JSON.stringify(data, null, indent == null ? 2 : indent), 'utf8');
        fs.renameSync(tmp, filePath);
    } catch (err) {
        try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        throw err;
    }
}

/* createStore({ path, parse, fallback, indent })
   - path():   returns the current file path (stores may set it at init)
   - parse(j): validate parsed JSON → store value, or null to use fallback()
   - read():   cached value (loads from disk once per path)
   - write(v): cache + atomic write (sync, same timing as before)
   - reset():  drop cache (call from init when the path changes) */
function createStore(opts) {
    let cache;
    let cachePath = null;
    function currentPath() { return typeof opts.path === 'function' ? opts.path() : opts.path; }
    function read() {
        const p = currentPath();
        if (cache !== undefined && cachePath === p) return cache;
        let val = null;
        try {
            if (p && fs.existsSync(p)) {
                const raw = fs.readFileSync(p, 'utf8');
                if (raw) val = opts.parse(JSON.parse(raw));
            }
        } catch (_) { val = null; }
        cache = val == null ? opts.fallback() : val;
        cachePath = p;
        return cache;
    }
    function write(value) {
        const p = currentPath();
        if (!p) return value;
        cache = value;
        cachePath = p;
        atomicWriteJsonSync(p, value, opts.indent);
        return value;
    }
    function reset() { cache = undefined; cachePath = null; }
    return { read, write, reset };
}

module.exports = { atomicWriteJsonSync, createStore };
