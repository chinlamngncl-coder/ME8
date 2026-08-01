/**
 * ANPR capture history — persistent Search & History store (PostgreSQL).
 * One row per finalized Track ID emit (macro + micro crops + MMR + GPS).
 */
'use strict';

const crypto = require('crypto');
const siteDb = require('./siteDb');

function newId() {
    return 'anprcap_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function vehicleTypeOf(tick) {
    const t = String((tick && (tick.vehicleLabel || tick.vehicleType)) || '').toLowerCase();
    if (t.indexOf('motor') >= 0 || t === 'motorcycle' || t === 'bike') return 'Motorcycle';
    if (t.indexOf('truck') >= 0 || t === 'lorry') return 'Truck';
    if (t.indexOf('bus') >= 0) return 'Bus';
    if (t.indexOf('car') >= 0 || t === 'automobile') return 'Car';
    if (t) return t.charAt(0).toUpperCase() + t.slice(1);
    return '';
}

/**
 * Persist a finalized live/offline capture tick.
 * @returns {Promise<object|null>}
 */
async function record(tick) {
    if (!tick || !siteDb.isReady()) return null;
    const id = newId();
    const now = new Date().toISOString();
    const capturedAt = tick.at || now;
    const row = {
        id,
        captured_at: capturedAt,
        cam_id: String(tick.camId || ''),
        device_label: String(tick.deviceLabel || tick.camId || ''),
        plate: tick.unclear ? null : (tick.plate || null),
        plate_compact: tick.unclear ? null : (tick.plateCompact || null),
        unclear: !!tick.unclear,
        review_status: tick.reviewStatus || (tick.unclear ? 'Unclear / Manual Review' : null),
        vehicle_type: vehicleTypeOf(tick),
        make: tick.make || (tick.mmr && tick.mmr.make) || null,
        model: tick.model || (tick.mmr && tick.mmr.model) || null,
        color: tick.color || (tick.mmr && tick.mmr.color) || null,
        mmr_text: tick.mmrText || null,
        vehicle_url: tick.vehicleUrl || null,
        crop_url: tick.cropUrl || null,
        user_id: tick.userId || tick.username || null,
        bwc_id: tick.bwcId || tick.camId || null,
        macro_path: tick.macroPath || null,
        micro_path: tick.microPath || null,
        track_id: tick.trackId != null ? String(tick.trackId) : null,
        seq_no: tick.seq != null ? Number(tick.seq) : null,
        confidence: tick.confidence != null ? Number(tick.confidence) : null,
        sharpness: tick.sharpness != null ? Number(tick.sharpness) : null,
        motion: tick.motion || null,
        lat: tick.lat != null ? Number(tick.lat) : null,
        lon: tick.lon != null ? Number(tick.lon) : null,
        gps_at: tick.gpsAt || null,
        source: tick.source || 'live',
        payload_json: JSON.stringify(tick),
        created_at: now,
    };
    try {
        await siteDb.query(`
            INSERT INTO anpr_capture_history (
                id, captured_at, cam_id, device_label, plate, plate_compact, unclear, review_status,
                vehicle_type, make, model, color, mmr_text, vehicle_url, crop_url, track_id, seq_no,
                confidence, sharpness, motion, lat, lon, gps_at, source, payload_json, created_at,
                user_id, bwc_id, macro_path, micro_path
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,
                $9,$10,$11,$12,$13,$14,$15,$16,$17,
                $18,$19,$20,$21,$22,$23,$24,$25,$26,
                $27,$28,$29,$30
            )
        `, [
            row.id, row.captured_at, row.cam_id, row.device_label, row.plate, row.plate_compact,
            row.unclear, row.review_status, row.vehicle_type, row.make, row.model, row.color,
            row.mmr_text, row.vehicle_url, row.crop_url, row.track_id, row.seq_no,
            row.confidence, row.sharpness, row.motion, row.lat, row.lon, row.gps_at,
            row.source, row.payload_json, row.created_at,
            row.user_id, row.bwc_id, row.macro_path, row.micro_path,
        ]);
        return publicRow(row);
    } catch (err) {
        return null;
    }
}

function publicRow(row) {
    if (!row) return null;
    let payload = null;
    try {
        payload = row.payload_json ? JSON.parse(row.payload_json) : null;
    } catch (_) { payload = null; }
    return {
        id: row.id,
        at: row.captured_at,
        camId: row.cam_id,
        deviceLabel: row.device_label,
        plate: row.plate,
        plateCompact: row.plate_compact,
        unclear: !!row.unclear,
        reviewStatus: row.review_status || null,
        vehicleType: row.vehicle_type || '',
        make: row.make,
        model: row.model,
        color: row.color,
        mmrText: row.mmr_text,
        vehicleUrl: row.vehicle_url,
        cropUrl: row.crop_url,
        trackId: row.track_id,
        seq: row.seq_no,
        confidence: row.confidence,
        sharpness: row.sharpness,
        motion: row.motion,
        lat: row.lat,
        lon: row.lon,
        gpsAt: row.gps_at,
        source: row.source,
        payload: payload,
    };
}

/**
 * @param {{ q?: string, vehicleType?: string, camId?: string, from?: string, to?: string, limit?: number, offset?: number }} opts
 */
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

    const q = String(opts.q || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (q) {
        where.push(`(UPPER(COALESCE(plate_compact,'')) LIKE $${i} OR UPPER(COALESCE(plate,'')) LIKE $${i} OR UPPER(COALESCE(device_label,'')) LIKE $${i})`);
        params.push('%' + q + '%');
        i += 1;
    }
    const vtype = String(opts.vehicleType || '').trim();
    if (vtype && vtype.toLowerCase() !== 'all') {
        where.push(`LOWER(COALESCE(vehicle_type,'')) = LOWER($${i})`);
        params.push(vtype);
        i += 1;
    }
    const camId = String(opts.camId || '').trim();
    if (camId) {
        where.push(`cam_id = $${i}`);
        params.push(camId);
        i += 1;
    }
    const userId = String(opts.userId || opts.username || '').trim();
    if (userId) {
        where.push(`user_id = $${i}`);
        params.push(userId);
        i += 1;
    }
    const bwcId = String(opts.bwcId || '').trim();
    if (bwcId) {
        where.push(`(bwc_id = $${i} OR cam_id = $${i})`);
        params.push(bwcId);
        i += 1;
    }
    if (opts.from) {
        where.push(`captured_at >= $${i}`);
        params.push(String(opts.from));
        i += 1;
    }
    if (opts.to) {
        where.push(`captured_at <= $${i}`);
        params.push(String(opts.to));
        i += 1;
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    try {
        const countR = await siteDb.query(
            `SELECT COUNT(*)::int AS n FROM anpr_capture_history ${whereSql}`,
            params
        );
        const total = Number(countR.rows[0] && countR.rows[0].n) || 0;
        const listParams = params.concat([limit, offset]);
        const listR = await siteDb.query(
            `SELECT * FROM anpr_capture_history ${whereSql}
             ORDER BY captured_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            listParams
        );
        return {
            ok: true,
            total,
            limit,
            offset,
            entries: (listR.rows || []).map(publicRow),
            hasMore: offset + limit < total,
        };
    } catch (err) {
        return {
            ok: false,
            error: String(err && err.message || err).slice(0, 160),
            entries: [],
            total: 0,
        };
    }
}

async function getById(id) {
    if (!siteDb.isReady() || !id) return null;
    try {
        const r = await siteDb.query('SELECT * FROM anpr_capture_history WHERE id = $1', [String(id)]);
        return publicRow(r.rows[0]);
    } catch (_) {
        return null;
    }
}

module.exports = {
    record,
    search,
    getById,
    vehicleTypeOf,
};
