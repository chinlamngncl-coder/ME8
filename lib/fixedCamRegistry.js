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

function normalizeStreamRoles(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        live:   String(r.live   || '').trim(),
        record: String(r.record || '').trim(),
        remote: String(r.remote || '').trim(),
    };
}

function normalizeStreamRolePref(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    function one(v) {
        const s = String(v || 'auto').trim().toLowerCase();
        if (s === 'main' || s === 'mainstream' || s === 'force_main' || s === 'forcemain') return 'main';
        if (s === 'sub' || s === 'substream' || s === 'dual' || s === 'force_sub' || s === 'forcesub') return 'sub';
        /* auto / inherit / blank → inherit site policy */
        return 'auto';
    }
    return {
        live: one(r.live),
        record: one(r.record),
        remote: one(r.remote),
    };
}

/**
 * Auto-map GetProfiles → Main (highest) / Sub (lowest usable live codec).
 * @returns {{ main: string|null, sub: string|null }}
 */
function buildAutoMap(camera) {
    const profiles = Array.isArray(camera && camera.streamProfiles) ? camera.streamProfiles : [];
    if (!profiles.length) return { main: null, sub: null };
    const pix = function (p) {
        return (p.resolution && p.resolution.width * p.resolution.height) || 0;
    };
    const encOf = function (p) {
        return String((p && p.encoding) || '').toUpperCase();
    };
    const isMjpeg = function (p) {
        const e = encOf(p);
        return e === 'MJPEG' || e === 'JPEG';
    };
    const isLiveOk = function (p) {
        const e = encOf(p);
        return e === 'H264' || e === 'H265' || e === 'HEVC' || e === 'UNKNOWN' || e === '';
    };
    const sorted = profiles.slice().sort(function (a, b) { return pix(a) - pix(b); });
    const main = sorted[sorted.length - 1];
    const livePool = sorted.filter(isLiveOk);
    const pool = livePool.length ? livePool : sorted.filter(function (p) { return !isMjpeg(p); });
    const use = pool.length ? pool : sorted;
    const sub = use[0];
    return {
        main: (main && main.token) || null,
        sub: (sub && sub.token) || null,
    };
}

/**
 * Step 1 — which role (main|sub) for a channel.
 * Cam Force Main/Sub → else site policy; Live auto = grid Sub / focus Main (ephemeral).
 */
function resolveMappedRole(camera, channel, opts) {
    const key = String(channel || 'live').trim();
    const pref = normalizeStreamRolePref(camera && camera.streamRolePref);
    const site = (opts && opts.sitePolicy) || {};
    const viewMode = (opts && opts.viewMode) === 'focus' ? 'focus' : 'grid';

    if (key === 'record') {
        if (pref.record === 'main' || pref.record === 'sub') return pref.record;
        const sr = String(site.record || 'main').toLowerCase();
        return sr === 'sub' ? 'sub' : 'main';
    }

    /* live / remote */
    const camLive = key === 'remote' ? pref.remote : pref.live;
    if (camLive === 'main' || camLive === 'sub') return camLive;
    const siteLive = String(site.live || 'auto').toLowerCase();
    if (siteLive === 'main') return 'main';
    if (siteLive === 'sub') return 'sub';
    /* site auto: focus → Main, grid → Sub (view-only; not persisted) */
    return viewMode === 'focus' ? 'main' : 'sub';
}

function buildCam(existingId, data) {
    const onvif = data.onvif || {};
    const transport = String(
        data.streamTransport
        || data.stream_transport
        || onvif.rtspTransport
        || 'tcp'
    ).toLowerCase() === 'udp' ? 'udp' : 'tcp';
    const placementMode = String(data.placementMode || data.placement_mode || 'outdoor').toLowerCase() === 'indoor'
        ? 'indoor' : 'outdoor';
    const latRaw = data.lat;
    const lngRaw = data.lng;
    const lat = (latRaw === '' || latRaw == null || Number.isNaN(parseFloat(latRaw)))
        ? null : parseFloat(latRaw);
    const lng = (lngRaw === '' || lngRaw == null || Number.isNaN(parseFloat(lngRaw)))
        ? null : parseFloat(lngRaw);
    const profile = String(data.onvifProfile || data.onvif_profile || onvif.profile || 'S').toUpperCase();
    const onvifProfile = ['S', 'T', 'M', 'G'].includes(profile) ? profile : 'S';
    return {
        id:           existingId || makeId(),
        name:         String(data.name         || '').trim(),
        placementMode,
        lat:          placementMode === 'outdoor' ? (lat != null ? lat : 0) : lat,
        lng:          placementMode === 'outdoor' ? (lng != null ? lng : 0) : lng,
        zone:         String(data.zone         || '').trim(),
        mapIcon:      VALID_MAP_ICONS.includes(data.mapIcon) ? data.mapIcon : 'fixed',
        streamSource: VALID_SOURCES.includes(data.streamSource) ? data.streamSource : 'none',
        streamTransport: transport,
        onvifProfile,
        anrEnabled: !!(data.anrEnabled || data.anr_enabled),
        onvif: {
            host:         String(onvif.host        || '').trim(),
            port:         parseInt(onvif.port, 10) || 80,
            user:         String(onvif.user        || '').trim(),
            password:     String(onvif.password    != null ? onvif.password : ''),
            devicePath:   String(onvif.devicePath  || '/onvif/device_service').trim(),
            rtspTransport: transport,
            profile:      onvifProfile,
        },
        rtspUrl:    String(data.rtspUrl    || '').trim(),
        ptzEnabled: !!(data.ptzEnabled),
        enabled:    data.enabled !== false,
        notes:      String(data.notes || '').trim(),
        /* Phase 1a VMS: media profile list from ONVIF getProfiles — preserved across updates */
        streamProfiles: Array.isArray(data.streamProfiles) ? data.streamProfiles : [],
        /* VMS stream roles — ONVIF profile tokens for Live / Record / Remote */
        streamRoles: normalizeStreamRoles(data.streamRoles),
        streamRolePref: normalizeStreamRolePref(data.streamRolePref),
        streamAdvancedOverride: !!(data.streamAdvancedOverride || data.stream_advanced_override),
        /* Phase 4 VMS: spatial tree placement */
        zone_id: placementMode === 'indoor'
            ? (String(data.zone_id || '').trim() || null)
            : null,
        map_x:   placementMode === 'indoor' && (data.map_x != null && Number.isFinite(+data.map_x))
                    ? Math.min(1, Math.max(0, +data.map_x)) : null,
        map_y:   placementMode === 'indoor' && (data.map_y != null && Number.isFinite(+data.map_y))
                    ? Math.min(1, Math.max(0, +data.map_y)) : null,
        parentNvrId: data.parentNvrId != null ? String(data.parentNvrId).trim() || null
            : (data.parent_nvr_id != null ? String(data.parent_nvr_id).trim() || null : null),
        nvrChannelIndex: data.nvrChannelIndex != null ? parseInt(data.nvrChannelIndex, 10)
            : (data.nvr_channel_index != null ? parseInt(data.nvr_channel_index, 10) : null),
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
    const prev = cams[idx];
    const incoming = data || {};
    const onvifIn = Object.assign({}, incoming.onvif || {});
    if (Object.prototype.hasOwnProperty.call(onvifIn, 'password') && String(onvifIn.password || '') === '') {
        onvifIn.password = (prev.onvif && prev.onvif.password) || '';
    }
    if (!Array.isArray(incoming.streamProfiles) || !incoming.streamProfiles.length) {
        incoming.streamProfiles = Array.isArray(prev.streamProfiles) ? prev.streamProfiles : [];
    }
    if (!incoming.streamRoles) {
        incoming.streamRoles = prev.streamRoles || {};
    }
    const merged  = { ...prev, ...incoming, onvif: { ...(prev.onvif || {}), ...onvifIn } };
    const updated = buildCam(id, merged);
    cams[idx] = updated;
    save(cams);
    return updated;
}

/**
 * Phase 1a VMS: persist the streamProfiles array returned by fixedCamOnvif.authenticateAndProbe()
 * without triggering a full buildCam rebuild (preserves all other fields verbatim).
 * @param {string} id  Camera ID
 * @param {Array}  profiles  Array of { token, name, resolution, encoding }
 * @returns {object|null} updated camera record, or null if not found
 */
function saveProfiles(id, profiles) {
    if (!id || !Array.isArray(profiles)) return null;
    const cams = load();
    const idx = cams.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cams[idx] = { ...cams[idx], streamProfiles: profiles };
    save(cams);
    return cams[idx];
}

/**
 * Two-step engine (VMS-SITE-STREAM-POLICY-V1):
 * 1) Resolve Main|Sub role (cam Force → site → auto grid/focus)
 * 2) Fetch token from GetProfiles auto-map
 * Advanced Override: raw streamRoles[channel] token bypasses both steps.
 * opts: { sitePolicy, viewMode: 'grid'|'focus' }
 */
function resolveRoleProfileToken(camera, role, opts) {
    const key = String(role || 'live').trim();
    const roles = normalizeStreamRoles(camera && camera.streamRoles);
    if (camera && camera.streamAdvancedOverride && roles[key]) {
        return roles[key];
    }
    const mapped = resolveMappedRole(camera, key, opts || {});
    const autoMap = buildAutoMap(camera);
    if (mapped === 'main') return autoMap.main || autoMap.sub;
    return autoMap.sub || autoMap.main;
}

function remove(id) {
    const cams = load();
    const idx  = cams.findIndex(c => c.id === id);
    if (idx === -1) return false;
    cams.splice(idx, 1);
    save(cams);
    return true;
}

/** Full replace for atomic NVR provision rollback. */
function replaceAll(cams) {
    save(Array.isArray(cams) ? cams : []);
    return load();
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
 * OnvifHost, OnvifPort, OnvifUser, OnvifPassword, OnvifPath, RtspTransport / StreamTransport,
 * StreamUrl, PtzEnabled, Enabled, Notes
 */
function importRows(rows) {
    const cams     = load();
    const imported = [];
    for (const row of rows) {
        const norm = {};
        for (const [k, v] of Object.entries(row)) norm[k.toLowerCase()] = v;
        const transport = norm.streamtransport || norm.rtsptransport || 'tcp';
        const cam = buildCam(null, {
            name:         norm.name         || '',
            lat:          norm.lat          || 0,
            lng:          norm.lng          || 0,
            zone:         norm.zone         || '',
            mapIcon:      norm.mapicon      || 'fixed',
            streamSource: norm.streamsource || 'none',
            streamTransport: transport,
            onvif: {
                host:         norm.onvifhost     || '',
                port:         norm.onvifport     || 80,
                user:         norm.onvifuser     || '',
                password:     norm.onvifpassword || '',
                devicePath:   norm.onvifpath     || '/onvif/device_service',
                rtspTransport: transport,
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

module.exports = {
    init, list, listEnabled, getById, add, update, remove, replaceAll, findWithinRadius, importRows, saveProfiles,
    resolveRoleProfileToken, resolveMappedRole, buildAutoMap,
    normalizeStreamRoles, normalizeStreamRolePref,
};
