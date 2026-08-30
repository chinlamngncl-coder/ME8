/**
 * Platform date bounds from ?date=YYYY-MM-DD + ?tzOffset= (JS getTimezoneOffset minutes).
 * Replaces strict UTC midnight for calendar-day queries.
 */
'use strict';

/**
 * @param {object} query — req.query
 * @returns {{ date: string, tzOffset: number, from: string, to: string, fromMs: number, toMs: number }|null}
 */
function resolveDateQueryBounds(query) {
    const q = query || {};
    const dateQ = String(q.date || '').trim();
    if (!dateQ || !/^\d{4}-\d{2}-\d{2}$/.test(dateQ)) return null;

    let tz = parseInt(q.tzOffset, 10);
    if (!Number.isFinite(tz)) tz = 0;
    /* JS offset range ≈ ±14h; clamp abuse */
    tz = Math.max(-840, Math.min(840, tz));

    const parts = dateQ.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (!y || !m || !d) return null;

    /* Local midnight = UTC midnight of that calendar label + tzOffset minutes */
    const fromMs = Date.UTC(y, m - 1, d) + tz * 60000;
    const toMs = fromMs + 86400000 - 1;
    return {
        date: dateQ,
        tzOffset: tz,
        from: new Date(fromMs).toISOString(),
        to: new Date(toMs).toISOString(),
        fromMs: fromMs,
        toMs: toMs,
    };
}

/** Express middleware — attaches req.dateBounds when ?date= is present. */
function attachDateBounds(req, _res, next) {
    try {
        if (req.query && req.query.date) {
            const b = resolveDateQueryBounds(req.query);
            if (b) req.dateBounds = b;
        }
    } catch (_e) { /* ignore */ }
    next();
}

module.exports = {
    resolveDateQueryBounds,
    attachDateBounds,
};
