/**
 * Fixed camera registry — stores street/building IP cameras with GPS coordinates.
 * Each camera has its own ONVIF or RTSP config, independent of the global ONVIF setting.
 */

const fs   = require('fs');
const path = require('path');
const { fixedCamId } = require('./secureId');

let STORAGE_DIR = path.join(__dirname, '..', 'storage');

function filePath() {
    return path.join(STORAGE_DIR, 'fixed-cams.json');
}

function init(storageDir) {
    STORAGE_DIR = storageDir;
}

function load() {
    try {
        const f = filePath();
        if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (_) {}
    return [];
}

function save(cams) {
    fs.writeFileSync(filePath(), JSON.stringify(cams, null, 2), 'utf8');
}

function makeId() {
    /* SEC-NONSIP-ID-CRYPTO-RANDOM-V1 */
    return fixedCamId();
}

const VALID_SOURCES = ['onvif', 'rtsp', 'none'];
const VALID_MAP_ICONS = ['fixed', 'dome', 'ptz', 'traffic', 'building'];

function buildCam(existingId, data) {
    const onvif = data.onvif || {};
    return {
        id:           existingId || makeId(),
        name:         String(data.name         || '').trim(),
        lat:          parseFloat(data.lat)      || 0,
        lng:          parseFloat(data.lng)      || 0,
        zone:         String(data.zone         || '').trim(),
        mapIcon:      VALID_MAP_ICONS.includes(data.mapIcon) ? data.mapIcon : 'fixed',
        streamSource: VALID_SOURCES.includes(data.streamSource) ? data.streamSource : 'none',
        onvif: {
            host:         String(onvif.host        || '').trim(),
            port:         parseInt(onvif.port, 10) || 80,
            user:         String(onvif.user        || '').trim(),
            password:     String(onvif.password    != null ? onvif.password : ''),
            devicePath:   String(onvif.devicePath  || '/onvif/device_service').trim(),
            rtspTransport: String(onvif.rtspTransport || 'tcp').toLowerCase() === 'udp' ? 'udp' : 'tcp',
        },
        rtspUrl:    String(data.rtspUrl    || '').trim(),
        ptzEnabled: !!(data.ptzEnabled),
        enabled:    data.enabled !== false,
        notes:      String(data.notes || '').trim(),
    };
}

function list() {
    return load();
}

function listEnabled() {
    return load().filter(c => c.enabled);
}

function getById(id) {
    return load().find(c => c.id === id) || null;
}

function add(data) {
    const cams = load();
    const cam  = buildCam(null, data);
    cams.push(cam);
    save(cams);
    return cam;
}

function update(id, data) {
    const cams = load();
    const idx  = cams.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const merged  = { ...cams[idx], ...data, onvif: { ...cams[idx].onvif, ...(data.onvif || {}) } };
    const updated = buildCam(id, merged);
    cams[idx] = updated;
    save(cams);
    return updated;
}

function remove(id) {
    const cams = load();
    const idx  = cams.findIndex(c => c.id === id);
    if (idx === -1) return false;
    cams.splice(idx, 1);
    save(cams);
    return true;
}

/**
 * Find cams within `radiusKm` of a GPS point.
 * Uses Haversine formula.
 */
function findWithinRadius(lat, lng, radiusKm) {
    const R   = 6371;
    const lat1 = lat * Math.PI / 180;
    return load().filter(c => {
        if (!c.enabled) return false;
        const lat2 = c.lat * Math.PI / 180;
        const dLat = (c.lat - lat) * Math.PI / 180;
        const dLng = (c.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= radiusKm;
    });
}

/**
 * Import an array of plain-object rows from CSV.
 * Accepted column names (case-insensitive): Name, Lat, Lng, Zone, MapIcon, StreamSource,
 * OnvifHost, OnvifPort, OnvifUser, OnvifPassword, OnvifPath, RtspTransport,
 * StreamUrl, PtzEnabled, Enabled, Notes
 */
function importRows(rows) {
    const cams     = load();
    const imported = [];
    for (const row of rows) {
        const norm = {};
        for (const [k, v] of Object.entries(row)) norm[k.toLowerCase()] = v;
        const cam = buildCam(null, {
            name:         norm.name         || '',
            lat:          norm.lat          || 0,
            lng:          norm.lng          || 0,
            zone:         norm.zone         || '',
            mapIcon:      norm.mapicon      || 'fixed',
            streamSource: norm.streamsource || 'none',
            onvif: {
                host:         norm.onvifhost     || '',
                port:         norm.onvifport     || 80,
                user:         norm.onvifuser     || '',
                password:     norm.onvifpassword || '',
                devicePath:   norm.onvifpath     || '/onvif/device_service',
                rtspTransport: norm.rtsptransport || 'tcp',
            },
            rtspUrl:    norm.streamurl || norm.rtspurl || '',
            ptzEnabled: String(norm.ptzenabled  || '').toLowerCase() === 'true',
            enabled:    String(norm.enabled     || 'true').toLowerCase() !== 'false',
            notes:      norm.notes || '',
        });
        cams.push(cam);
        imported.push(cam);
    }
    save(cams);
    return imported;
}

module.exports = { init, list, listEnabled, getById, add, update, remove, findWithinRadius, importRows };
