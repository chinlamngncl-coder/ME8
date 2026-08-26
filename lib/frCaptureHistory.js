/**
 * FR capture history — Postgres audit log for face crops (paths + user/BWC).
 */
'use strict';

const crypto = require('crypto');
const siteDb = require('./siteDb');

function newId() {
    return 'frcap_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

async function record(entry) {
    if (!entry || !siteDb.isReady()) return null;
    const id = entry.id || newId();
    const now = new Date().toISOString();
    const row = {
        id,
        captured_at: entry.at || now,
        user_id: entry.userId || entry.username || null,
        bwc_id: entry.bwcId || entry.camId || '',
        device_label: entry.deviceLabel || entry.camId || '',
        display_name: entry.displayName || null,
        score_pct: entry.scorePct != null ? Number(entry.scorePct) : null,
        match: !!entry.match,
        hit_id: entry.hitId || null,
        blacklist_id: entry.blacklistId || null,
        macro_path: entry.macroPath || null,
        micro_path: entry.microPath || entry.rel || entry.cropFile || null,
        crop_url: entry.cropUrl || null,
        lat: entry.lat != null ? Number(entry.lat) : null,
        lon: entry.lon != null ? Number(entry.lon) : null,
        gps_at: entry.gpsAt || null,
        source: entry.source || 'live',
        payload_json: JSON.stringify(entry),
        created_at: now,
    };
    try {
        await siteDb.query(`
            INSERT INTO fr_capture_history (
                id, captured_at, user_id, bwc_id, device_label, display_name, score_pct, match,
                hit_id, blacklist_id, macro_path, micro_path, crop_url, lat, lon, gps_at,
                source, payload_json, created_at
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,
                $9,$10,$11,$12,$13,$14,$15,$16,
                $17,$18,$19
            )
        `, [
            row.id, row.captured_at, row.user_id, row.bwc_id, row.device_label, row.display_name,
            row.score_pct, row.match, row.hit_id, row.blacklist_id, row.macro_path, row.micro_path,
            row.crop_url, row.lat, row.lon, row.gps_at, row.source, row.payload_json, row.created_at,
        ]);
        return row;
    } catch (_) {
        return null;
    }
}

async function search(opts) {
    opts = opts || {};
    if (!siteDb.isReady()) {
        return { ok: false, error: 'catalog_not_ready', entries: [], total: 0 };
    }
    const limit = Math.max(1, Math.min(50, parseInt(opts.limit, 10) || 24));
    const offset = Math.max(0, parseInt(opts.offset, 10) || 0);
    const where = [];
    const params = [];
    let i = 1;
    const userId = String(opts.userId || opts.username || '').trim();
    if (userId) {
        where.push(`user_id = $${i}`);
        params.push(userId);
        i += 1;
    }
    const bwcId = String(opts.bwcId || opts.camId || '').trim();
    if (bwcId) {
        where.push(`(bwc_id = $${i} OR device_label = $${i})`);
        params.push(bwcId);
        i += 1;
    }
    if (opts.from) {
        where.push(`captured_at >= $${i}`);
        params.push(String(opts.from));
        i += 1;
    }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    try {
        const countR = await siteDb.query(
            `SELECT COUNT(*)::int AS n FROM fr_capture_history ${whereSql}`,
            params
        );
        const total = Number(countR.rows[0] && countR.rows[0].n) || 0;
        const listR = await siteDb.query(
            `SELECT * FROM fr_capture_history ${whereSql}
             ORDER BY captured_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            params.concat([limit, offset])
        );
        return { ok: true, total, limit, offset, entries: listR.rows || [], hasMore: offset + limit < total };
    } catch (err) {
        return {
            ok: false,
            error: String(err && err.message || err).slice(0, 160),
            entries: [],
            total: 0,
        };
    }
}

module.exports = { record, search };
