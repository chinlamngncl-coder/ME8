/**
 * Bind GPS telemetry to Evidence Library videos so the 90-day track purge cannot drop it.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');

const VIDEO_EXT = /\.(mp4|mov|avi|mkv|ts|m4v|3gp|flv|wmv|ps|h264|h265)$/i;
/** Dock ingest time is the clip end (mtime/upload). Look back one day for the matching BWC track. */
const LOOKBACK_MS = 24 * 3600 * 1000;
const MAX_POINTS = 50000;

function isVideoName(name) {
    return VIDEO_EXT.test(String(name || ''));
}

function companionRelFor(relativePath) {
    const rel = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!rel) return null;
    const dir = path.posix.dirname(rel);
    const base = path.posix.basename(rel, path.posix.extname(rel));
    const next = (dir && dir !== '.') ? (dir + '/' + base + '.gps.json') : (base + '.gps.json');
    return next;
}

async function bindOnCatalog(opts) {
    if (!siteDb.isReady() || !opts || !opts.id) return { ok: false, reason: 'not_ready' };
    const fileName = opts.fileName || opts.relativePath || '';
    if (!isVideoName(fileName)) return { ok: true, skipped: 'not_video' };
    const deviceId = String(opts.deviceId || '').trim();
    if (!deviceId) return { ok: true, skipped: 'no_device' };
    const existing = await siteDb.getEvidenceGpsTrace(opts.id);
    if (existing) return { ok: true, skipped: 'already_locked', pointCount: existing.pointCount };
    const endMs = Date.parse(opts.uploadedAt || '') || Date.now();
    const toIso = new Date(endMs).toISOString();
    const fromIso = new Date(endMs - LOOKBACK_MS).toISOString();
    const points = await siteDb.queryGpsTrackRoute(deviceId, fromIso, toIso, MAX_POINTS);
    if (!points.length) return { ok: true, skipped: 'no_points' };
    const slim = points.map(function (p) {
        return {
            recordedAt: p.recordedAt,
            lat: p.lat,
            lon: p.lon,
            source: p.source || 'sip',
        };
    });
    const companionRel = companionRelFor(opts.relativePath);
    if (companionRel && opts.fullPath) {
        try {
            const dir = path.dirname(opts.fullPath);
            const dest = path.join(dir, path.basename(companionRel));
            const payload = {
                evidenceFileId: opts.id,
                deviceId: deviceId,
                fromIso: fromIso,
                toIso: toIso,
                locked: true,
                pointCount: slim.length,
                points: slim,
            };
            fs.writeFileSync(dest, JSON.stringify(payload), 'utf8');
        } catch (_) { /* catalog bind still proceeds in Postgres */ }
    }
    await siteDb.lockGpsTrackWindow(deviceId, fromIso, toIso);
    await siteDb.insertEvidenceGpsTrace({
        evidenceFileId: opts.id,
        deviceId: deviceId,
        fromIso: fromIso,
        toIso: toIso,
        pointCount: slim.length,
        pointsJson: JSON.stringify(slim),
        companionRel: companionRel,
        lockedAt: new Date().toISOString(),
    });
    return { ok: true, locked: true, pointCount: slim.length };
}

module.exports = {
    bindOnCatalog,
    isVideoName,
    companionRelFor,
};
