'use strict';

const DEFAULT_MAX_ENTRIES = 5000;
const MAX_KEY_LENGTH = 128;

function clientKey(req) {
    const candidate = req && (req.ip || (req.socket && req.socket.remoteAddress));
    const normalized = String(candidate || 'unknown').trim();
    return (normalized || 'unknown').slice(0, MAX_KEY_LENGTH);
}

function createLoginRateLimiter(options = {}) {
    const maxAttempts = Number.isInteger(options.maxAttempts) ? options.maxAttempts : 10;
    const windowMs = Number.isFinite(options.windowMs) ? options.windowMs : 15 * 60 * 1000;
    const blockMs = Number.isFinite(options.blockMs) ? options.blockMs : 15 * 60 * 1000;
    const maxEntries = Number.isInteger(options.maxEntries)
        ? Math.max(1, options.maxEntries)
        : DEFAULT_MAX_ENTRIES;
    const now = typeof options.now === 'function' ? options.now : Date.now;
    const records = new Map();

    function touch(key, record) {
        records.delete(key);
        records.set(key, record);
    }

    function prune(at = now()) {
        for (const [key, record] of records) {
            if (record.blockedUntil <= at && at - record.firstAt > windowMs) {
                records.delete(key);
            }
        }
        return records.size;
    }

    function reserveEntry(at) {
        if (records.size < maxEntries) return;
        prune(at);
        while (records.size >= maxEntries) {
            const oldestKey = records.keys().next().value;
            records.delete(oldestKey);
        }
    }

    function middleware(req, res, next) {
        const key = clientKey(req);
        const at = now();
        let record = records.get(key);

        if (!record) {
            reserveEntry(at);
            record = { count: 0, firstAt: at, blockedUntil: 0 };
        } else if (record.blockedUntil <= at && at - record.firstAt > windowMs) {
            record.count = 0;
            record.firstAt = at;
            record.blockedUntil = 0;
        }

        if (record.blockedUntil > at) {
            touch(key, record);
            res.setHeader('Retry-After', Math.ceil((record.blockedUntil - at) / 1000));
            return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
        }

        record.count += 1;
        if (record.count > maxAttempts) {
            record.blockedUntil = at + blockMs;
            touch(key, record);
            res.setHeader('Retry-After', Math.ceil(blockMs / 1000));
            return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
        }

        touch(key, record);
        return next();
    }

    return {
        middleware,
        prune,
        size: () => records.size,
        has: (key) => records.has(String(key)),
        maxEntries,
    };
}

module.exports = {
    DEFAULT_MAX_ENTRIES,
    MAX_KEY_LENGTH,
    clientKey,
    createLoginRateLimiter,
};
