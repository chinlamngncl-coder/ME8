/**
 * All registered BWCs (unlimited). Map group + operator live here — not on video wall slots.
 */
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

async function read(filePath) {
    if (!siteDb.isReady()) throw new Error('PostgreSQL catalog is not ready');
    return { devices: await siteDb.listDevices() };
}

async function write(filePath, data) {
    const next = normalize(data);
    if (!siteDb.isReady()) throw new Error('PostgreSQL catalog is not ready');
    await siteDb.saveDevices(next.devices);
    return next;
}

function findById(data, deviceId) {
    const id = String(deviceId || '').trim();
    if (!id) return null;
    const rows = data && Array.isArray(data.devices) ? data.devices : [];
    return rows.find((row) => row && String(row.deviceId || '').trim() === id) || null;
}

/** One-time import from legacy video-channels.json rows when bwc-devices is empty. */
async function migrateFromChannels(filePath, channels) {
    const existing = await read(filePath);
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
