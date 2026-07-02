/**
 * Per-device geofence (circle or polygon) — same shape as Sentryq mobility desk.
 */

function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pointInPolygon(lat, lng, ring) {
    if (!Array.isArray(ring) || ring.length < 3 || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = Number(ring[i].lng);
        const yi = Number(ring[i].lat);
        const xj = Number(ring[j].lng);
        const yj = Number(ring[j].lat);
        if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) continue;
        const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-9) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function normalize(g) {
    if (g == null || typeof g !== 'object') return null;
    if (String(g.mode) === 'circle') {
        const centerLat = Number(g.centerLat);
        const centerLng = Number(g.centerLng);
        const radiusM = Number(g.radiusM);
        if (Number.isFinite(centerLat) && Number.isFinite(centerLng) && radiusM > 0 && radiusM <= 500000) {
            return { mode: 'circle', centerLat, centerLng, radiusM };
        }
        return null;
    }
    if (String(g.mode) === 'polygon' && Array.isArray(g.ring)) {
        const ring = g.ring
            .map((p) => ({ lat: Number(p && p.lat), lng: Number(p && p.lng) }))
            .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        if (ring.length >= 3) return { mode: 'polygon', ring };
    }
    return null;
}

function containsPoint(lat, lon, geofence) {
    const gf = normalize(geofence);
    if (!gf || !Number.isFinite(lat) || !Number.isFinite(lon)) return true;
    if (gf.mode === 'circle') {
        return haversineMeters(lat, lon, gf.centerLat, gf.centerLng) <= gf.radiusM;
    }
    if (gf.mode === 'polygon') return pointInPolygon(lat, lon, gf.ring);
    return true;
}

module.exports = {
    normalize,
    containsPoint,
    haversineMeters,
};
