/**
 * All registered BWCs (unlimited). Map group + operator live here — not on video wall slots.
 */
const fs = require('fs');
const path = require('path');
const geofence = require('./geofence');
const siteDb = require('./siteDb');

function normalizeDevice(row) {
    const gf = Object.prototype.hasOwnProperty.call(row || {}, 'geofence')
        ? geofence.normalize(row.geofence)
        : undefined;
    const out = {
        deviceId: String(row.deviceId || '').trim(),
        operatorName: String(row.operatorName || '').trim(),
        mapGroup: String(row.mapGroup || '').trim(),
        userName: String(row.userName || '').trim(),
        password: String(row.password || ''),
        protocol: String(row.protocol || 'sip').toLowerCase() === 'onvif' ? 'onvif' : 'sip',
    };
    if (gf !== undefined) out.geofence = gf;
    return out;
}

function normalize(data) {
    const seen = new Set();
    const devices = [];
    (data && Array.isArray(data.devices) ? data.devices : []).forEach((row) => {
        const d = normalizeDevice(row);
        if (!d.deviceId || seen.has(d.deviceId)) return;
        seen.add(d.deviceId);
        devices.push(d);
    });
    return { devices };
}

function read(filePath) {
    if (siteDb.isReady()) {
        return { devices: siteDb.listDevices() };
    }
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return normalize(data);
        }
    } catch (_) {
        /* ignore */
    }
    return { devices: [] };
}

function write(filePath, data) {
    const next = normalize(data);
    if (siteDb.isReady()) {
        siteDb.saveDevices(next.devices);
        if (filePath) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            siteDb.exportToJson(filePath);
        }
        return next;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf8');
    return next;
}

function findById(data, deviceId) {
    const id = String(deviceId || '').trim();
    if (!id) return null;
    if (siteDb.isReady()) return siteDb.findDevice(id);
    return (data.devices || []).find((d) => d.deviceId === id) || null;
}

/** One-time import from legacy video-channels.json rows when bwc-devices is empty. */
function migrateFromChannels(filePath, channels) {
    const existing = read(filePath);
    if (existing.devices.length) return existing;
    const devices = [];
    const seen = new Set();
    (channels || []).forEach((ch) => {
        const id = ch && ch.deviceId ? String(ch.deviceId).trim() : '';
        if (!id || seen.has(id)) return;
        seen.add(id);
        devices.push(normalizeDevice({
            deviceId: id,
            operatorName: ch.operatorName,
            mapGroup: ch.mapGroup,
            userName: ch.userName,
            password: ch.password,
            protocol: ch.protocol,
        }));
    });
    if (!devices.length) return existing;
    return write(filePath, { devices });
}

module.exports = {
    read,
    write,
    findById,
    migrateFromChannels,
    normalize,
    normalizeDevice,
};
