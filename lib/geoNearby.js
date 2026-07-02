'use strict';

const EARTH_RADIUS_M = 6371000;

function haversineM(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {Array<{cameraId:string,lat:number,lon:number,online?:boolean,name?:string}>} devices
 */
function findNearby(devices, centerLat, centerLon, radiusM, opts) {
    opts = opts || {};
    const exclude = opts.excludeCamId ? String(opts.excludeCamId) : '';
    const onlineOnly = opts.onlineOnly !== false;
    const out = [];
    (devices || []).forEach((d) => {
        const camId = String(d.cameraId || d.id || '');
        if (!camId || camId === exclude) return;
        if (d.lat == null || d.lon == null) return;
        const lat = parseFloat(d.lat);
        const lon = parseFloat(d.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return;
        if (onlineOnly && d.online === false) return;
        const distanceM = haversineM(centerLat, centerLon, lat, lon);
        if (distanceM > radiusM) return;
        out.push({
            cameraId: camId,
            lat,
            lon,
            distanceM: Math.round(distanceM),
            name: d.name || camId,
            online: d.online !== false,
        });
    });
    out.sort((a, b) => a.distanceM - b.distanceM);
    return out;
}

module.exports = { haversineM, findNearby };
