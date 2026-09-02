/**
 * SOS-IP-NEAR-LINK-RECORD-V1 — nearest fixed/IP cams for an SOS + link VMS segment IDs.
 * Same ME8 server only. Does not start 14 live tiles.
 */
'use strict';

const fixedCamRegistry = require('./fixedCamRegistry');
const geofence = require('./geofence');
const siteDb = require('./siteDb');
const log = require('./fleetLog');

const FIXED_LIMIT = 4;

function listNearestFixed(origin, radiusM, limit) {
    if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) return [];
    const radius = Math.max(50, Math.min(5000, Number(radiusM) || 500));
    const maxN = Math.min(FIXED_LIMIT, Math.max(1, parseInt(limit, 10) || FIXED_LIMIT));
    let hits = [];
    try {
        hits = fixedCamRegistry.findWithinRadius(origin.lat, origin.lon, radius / 1000) || [];
    } catch (_) {
        hits = [];
    }
    return hits.map(function (c) {
        const lat = Number(c.lat);
        const lon = Number(c.lng != null ? c.lng : c.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat === 0 && lon === 0) return null;
        const dist = geofence.haversineMeters(origin.lat, origin.lon, lat, lon);
        if (!Number.isFinite(dist) || dist > radius) return null;
        return {
            cameraId: String(c.id || ''),
            name: String(c.name || c.id || ''),
            type: c.ptzEnabled ? 'PTZ' : 'Fixed',
            ptzEnabled: !!c.ptzEnabled,
            lat: lat,
            lon: lon,
            distanceM: Math.round(dist),
        };
    }).filter(function (c) {
        return c && c.cameraId;
    }).sort(function (a, b) {
        return a.distanceM - b.distanceM;
    }).slice(0, maxN);
}

async function findCoveringSegmentId(camId, atIso) {
    const id = String(camId || '').trim();
    if (!id || !siteDb.isReady()) return null;
    const at = atIso || new Date().toISOString();
    try {
        const { rows } = await siteDb.query(
            `SELECT id FROM vms_recording_segments
             WHERE cam_id = $1
               AND start_at <= $2
               AND (end_at IS NULL OR end_at >= $2)
             ORDER BY start_at DESC
             LIMIT 1`,
            [id, at]
        );
        if (rows && rows[0] && rows[0].id) return String(rows[0].id);
    } catch (err) {
        if (log && log.web) {
            log.web.warn('sos nearby fixed segment lookup failed', {
                camId: id,
                message: err && err.message ? err.message : String(err),
            });
        }
    }
    return null;
}

/**
 * Build link rows for SOS case (≤4). Optionally ensure NAS writer is running.
 */
async function buildLinksForSos(origin, radiusM, atIso, opts) {
    const cams = listNearestFixed(origin, radiusM, FIXED_LIMIT);
    const ensureNas = !(opts && opts.ensureNas === false);
    const links = [];
    for (const cam of cams) {
        let segmentId = null;
        try {
            segmentId = await findCoveringSegmentId(cam.cameraId, atIso);
        } catch (_) { segmentId = null; }
        if (ensureNas && !segmentId) {
            try {
                const vmsNasWriter = require('./vmsNasWriter');
                const camera = fixedCamRegistry.getById(cam.cameraId);
                if (camera && typeof vmsNasWriter.start === 'function') {
                    await vmsNasWriter.start(cam.cameraId, camera);
                    segmentId = await findCoveringSegmentId(cam.cameraId, atIso);
                }
            } catch (_) { /* NAS optional */ }
        }
        links.push({
            cameraId: cam.cameraId,
            name: cam.name,
            type: cam.type,
            ptzEnabled: !!cam.ptzEnabled,
            distanceM: cam.distanceM,
            segmentId: segmentId,
            streamUrl: segmentId
                ? ('/api/vms/segments/' + encodeURIComponent(segmentId) + '/stream')
                : null,
            linkedAt: new Date().toISOString(),
            path: 'sos-ip-near-link-record-v1',
        });
    }
    return links;
}

module.exports = {
    FIXED_LIMIT,
    listNearestFixed,
    findCoveringSegmentId,
    buildLinksForSos,
};
