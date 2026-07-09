'use strict';

const GEOCODE_DEFAULT = 'https://nominatim.openstreetmap.org/search';
const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 120;
const MAX_RESULTS = 5;
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;

function geocodeDisabled() {
    return String(process.env.FM_MAP_GEOCODE_DISABLED || '').trim() === '1';
}

function offlineOnlyDeploy() {
    return String(process.env.FM_MAP_OFFLINE_ONLY || '').trim() === '1';
}

function fail(status, errorKey, message) {
    const err = new Error(message || errorKey);
    err.status = status;
    err.errorKey = errorKey;
    throw err;
}

function normalizeQuery(raw) {
    const q = String(raw || '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (q.length < MIN_QUERY_LEN) fail(400, 'map.placeSearch.queryTooShort');
    if (q.length > MAX_QUERY_LEN) fail(400, 'map.placeSearch.queryTooLong');
    return q;
}

function zoomForResult(row) {
    const t = String(row.type || '').toLowerCase();
    if (t === 'country') return 6;
    if (t === 'state' || t === 'region' || t === 'county') return 8;
    if (t === 'city' || t === 'town' || t === 'village' || t === 'municipality') return 11;
    if (t === 'suburb' || t === 'neighbourhood' || t === 'quarter') return 13;
    return 14;
}

function buildUrl(query) {
    const custom = String(process.env.FM_MAP_GEOCODE_URL || '').trim();
    if (custom && custom.includes('{q}')) {
        return custom.replace(/\{q\}/g, encodeURIComponent(query));
    }
    const root = custom || GEOCODE_DEFAULT;
    const u = new URL(root);
    if (!custom) {
        u.searchParams.set('q', query);
        u.searchParams.set('format', 'json');
        u.searchParams.set('limit', String(MAX_RESULTS));
        u.searchParams.set('addressdetails', '0');
    } else if (!u.searchParams.has('q')) {
        u.searchParams.set('q', query);
    }
    return u.toString();
}

function mapRows(rows) {
    return (rows || []).slice(0, MAX_RESULTS).map(function (row) {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
            lat: lat,
            lon: lon,
            label: String(row.display_name || row.name || '').trim() || (lat + ', ' + lon),
            zoom: zoomForResult(row),
            type: row.type || null,
        };
    }).filter(Boolean);
}

async function search(rawQuery) {
    if (geocodeDisabled() || offlineOnlyDeploy()) {
        fail(403, 'map.placeSearch.offline');
    }
    const query = normalizeQuery(rawQuery);
    const now = Date.now();
    if (now - lastRequestAt < MIN_INTERVAL_MS) {
        fail(429, 'map.placeSearch.rateLimited');
    }
    lastRequestAt = now;

    const url = buildUrl(query);
    const ua = String(process.env.FM_MAP_GEOCODE_UA || '').trim()
        || 'Ubitron-MobilityC2/1.0 (fleet dispatch map search)';

    let res;
    try {
        const opts = {
            headers: {
                Accept: 'application/json',
                'User-Agent': ua,
            },
        };
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            opts.signal = AbortSignal.timeout(8000);
        }
        res = await fetch(url, opts);
    } catch (_) {
        fail(502, 'map.placeSearch.failed');
    }

    if (!res.ok) {
        fail(res.status >= 500 ? 502 : 400, 'map.placeSearch.failed');
    }

    let data;
    try {
        data = await res.json();
    } catch (_) {
        fail(502, 'map.placeSearch.failed');
    }

    const results = mapRows(Array.isArray(data) ? data : (data && data.results));
    if (!results.length) fail(404, 'map.placeSearch.noResults');

    return { query: query, results: results };
}

module.exports = {
    search,
};
