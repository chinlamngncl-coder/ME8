'use strict';
/**
 * VMS-INVESTIGATION-ALARM-EVENT-PREVIEW-V1
 * Resolve a public snapshot URL for an Investigation alarm pin.
 * Never returns OS absolute paths — only /api/… or /sos-media/… .
 */
const path = require('path');
const siteDb = require('./siteDb');

const WINDOW_MS = 4000;

function publicMediaUrl(raw, kind) {
    const u = String(raw || '').trim();
    if (!u) return null;
    if (u.startsWith('/api/') || u.startsWith('/sos-media/')) return u.split('?')[0];
    if (/^[a-zA-Z]:[\\/]/.test(u) || u.startsWith('\\\\') || u.startsWith('file:')) {
        const base = path.basename(u);
        if (!/^[\w.-]+\.(jpe?g|png|webp)$/i.test(base)) return null;
        if (kind === 'fr') return '/api/analytics/fr/crop/' + encodeURIComponent(base);
        if (kind === 'anpr') return '/api/analytics/anpr/crop/' + encodeURIComponent(base);
        return null;
    }
    if (/^[\w.-]+\.(jpe?g|png|webp)$/i.test(u)) {
        if (kind === 'fr') return '/api/analytics/fr/crop/' + encodeURIComponent(u);
        if (kind === 'anpr') return '/api/analytics/anpr/crop/' + encodeURIComponent(u);
    }
    return null;
}

function noteKind(note, eventType) {
    const n = String(note || '');
    const t = String(eventType || '').toLowerCase();
    if (t === 'sos' || n.indexOf('SOS') === 0) return 'sos';
    if (t === 'anpr' || n.indexOf('ANPR') === 0) return 'anpr';
    if (n.indexOf('Weapon') === 0) return 'weapon';
    if (n.indexOf('FR') === 0 || t === 'analytics') return 'fr';
    return t || 'other';
}

async function resolveFr(camId, atMs) {
    if (!siteDb.isReady() || !Number.isFinite(atMs)) return null;
    const fromIso = new Date(atMs - WINDOW_MS).toISOString();
    const toIso = new Date(atMs + WINDOW_MS).toISOString();
    try {
        const { rows } = await siteDb.query(
            `SELECT crop_url, micro_path, captured_at
             FROM fr_capture_history
             WHERE match = TRUE
               AND captured_at >= $1 AND captured_at <= $2
               AND (bwc_id = $3 OR device_label = $3)
             ORDER BY captured_at ASC
             LIMIT 12`,
            [fromIso, toIso, String(camId)]
        );
        let best = null;
        let bestDelta = Infinity;
        (rows || []).forEach((r) => {
            const t = Date.parse(r.captured_at);
            if (!Number.isFinite(t)) return;
            const d = Math.abs(t - atMs);
            if (d < bestDelta) {
                bestDelta = d;
                best = r;
            }
        });
        if (!best) return null;
        return publicMediaUrl(best.crop_url, 'fr') || publicMediaUrl(best.micro_path, 'fr');
    } catch (_) {
        return null;
    }
}

async function resolveAnpr(camId, atMs) {
    if (!siteDb.isReady() || !Number.isFinite(atMs)) return null;
    const fromIso = new Date(atMs - WINDOW_MS).toISOString();
    const toIso = new Date(atMs + WINDOW_MS).toISOString();
    try {
        const { rows } = await siteDb.query(
            `SELECT crop_url, vehicle_url, captured_at
             FROM anpr_capture_history
             WHERE captured_at >= $1 AND captured_at <= $2
               AND (cam_id = $3 OR bwc_id = $3)
             ORDER BY captured_at ASC
             LIMIT 12`,
            [fromIso, toIso, String(camId)]
        );
        let best = null;
        let bestDelta = Infinity;
        (rows || []).forEach((r) => {
            const t = Date.parse(r.captured_at);
            if (!Number.isFinite(t)) return;
            const d = Math.abs(t - atMs);
            if (d < bestDelta) {
                bestDelta = d;
                best = r;
            }
        });
        if (!best) return null;
        return publicMediaUrl(best.crop_url, 'anpr') || publicMediaUrl(best.vehicle_url, 'anpr');
    } catch (_) {
        return null;
    }
}

async function resolveSos(camId, atMs) {
    let sosIncidents;
    try {
        sosIncidents = require('./sosIncidents');
    } catch (_) {
        return null;
    }
    if (!sosIncidents || typeof sosIncidents.getLedgerEntries !== 'function') return null;
    let list = [];
    try {
        list = sosIncidents.getLedgerEntries() || [];
    } catch (_) {
        return null;
    }
    let best = null;
    let bestDelta = Infinity;
    const cam = String(camId || '');
    list.forEach((e) => {
        if (!e) return;
        const id = String(e.cameraId || e.deviceId || e.bwcId || e.camId || '').trim();
        if (cam && id && id !== cam) return;
        const t = Date.parse(e.startedAt || e.alarmAt || e.at || e.createdAt || '');
        if (!Number.isFinite(t)) return;
        const d = Math.abs(t - atMs);
        if (d <= 120000 && d < bestDelta) {
            bestDelta = d;
            best = e;
        }
    });
    if (!best) return null;
    const snap = snapshotPublicUrlFromEntry(best);
    return publicMediaUrl(snap, 'sos');
}

function snapshotPublicUrlFromEntry(entry) {
    if (!entry) return null;
    if (entry.snapshot && String(entry.snapshot).startsWith('/')) return entry.snapshot;
    if (entry.folderRel) {
        return '/sos-media/' + String(entry.folderRel).replace(/\\/g, '/') + '/snapshot.jpg';
    }
    return null;
}

/**
 * @returns {Promise<{ previewUrl: string|null, mediaKind: string, hasSnapshot: boolean }>}
 */
async function resolvePreview(opts) {
    const camId = String((opts && opts.camId) || '').trim();
    const atMs = Date.parse((opts && opts.occurredAt) || '');
    const kind = noteKind(opts && opts.note, opts && opts.eventType);
    let previewUrl = null;
    if (kind === 'fr' || kind === 'analytics') previewUrl = await resolveFr(camId, atMs);
    else if (kind === 'anpr') previewUrl = await resolveAnpr(camId, atMs);
    else if (kind === 'sos') previewUrl = await resolveSos(camId, atMs);
    /* weapon: no reliable PG still in V1 */
    return {
        previewUrl: previewUrl || null,
        mediaKind: kind,
        hasSnapshot: !!previewUrl,
    };
}

module.exports = {
    resolvePreview,
    publicMediaUrl,
};
