/**
 * In-memory device registry (all BWCs that have registered on this server).
 * Operator names are merged from storage/video-channels.json when available.
 */

const fs = require('fs');

const devices = {};
let operatorByDeviceId = {};
let mapGroupByDeviceId = {};
let configuredDeviceIds = {};

const HQ_ENTRY = {
    name: 'Headquarters (Command)',
    id: '10A01000822E82BFC00',
    pnumber: '00002',
    status: '1',
    ertId: '11100000002',
};

function defaultRecord(camId) {
    return {
        id: camId,
        name: displayName(camId),
        status: '0',
        online: false,
        lastSeen: 0,
        lastHeartbeat: null,
        pnumber: '00001',
        ertId: '11100000001',
        telemetry: null,
    };
}

function displayName(camId) {
    if (!camId) return 'Unknown BWC';
    const op = operatorByDeviceId[camId];
    if (op) return op;
    if (camId.length > 8) return `BWC #${camId.slice(-4)}`;
    return `BWC ${camId}`;
}

function refreshOperatorNames(channelsPath) {
    if (!channelsPath) return;
    try {
        if (!fs.existsSync(channelsPath)) return;
        const data = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
        const channels = data && data.channels;
        if (!Array.isArray(channels)) return;
        channels.forEach((ch) => {
            const id = ch && ch.deviceId ? String(ch.deviceId).trim() : '';
            const name = ch && ch.operatorName ? String(ch.operatorName).trim() : '';
            if (id && name && !operatorByDeviceId[id]) operatorByDeviceId[id] = name;
        });
    } catch (_) {
        /* ignore */
    }
}

function syncConfiguredDevices(bwcData) {
    if (!bwcData || !Array.isArray(bwcData.devices)) return;
    bwcData.devices.forEach((d) => {
        const id = d && d.deviceId ? String(d.deviceId).trim() : '';
        if (!id || id === HQ_ENTRY.id) return;
        const rec = ensure(id);
        rec.name = displayName(id);
    });
}

/** Operator + map group from bwc-devices.json (primary), with video-channels fallback for names. */
function refreshDeviceMeta(bwcData, channelsPath) {
    operatorByDeviceId = {};
    mapGroupByDeviceId = {};
    configuredDeviceIds = {};
    refreshOperatorNames(channelsPath);
    if (bwcData && Array.isArray(bwcData.devices)) {
        bwcData.devices.forEach((d) => {
            const id = d && d.deviceId ? String(d.deviceId).trim() : '';
            if (!id) return;
            configuredDeviceIds[id] = true;
            if (d.operatorName) operatorByDeviceId[id] = String(d.operatorName).trim();
            if (d.mapGroup) mapGroupByDeviceId[id] = String(d.mapGroup).trim();
        });
    }
    syncConfiguredDevices(bwcData);
    Object.keys(devices).forEach((id) => {
        devices[id].name = displayName(id);
    });
}

function getMapGroup(camId) {
    if (!camId) return '';
    return mapGroupByDeviceId[camId] || '';
}

function ensure(camId) {
    if (!camId) return null;
    if (!devices[camId]) devices[camId] = defaultRecord(camId);
    return devices[camId];
}

function markOnline(camId) {
    const rec = ensure(camId);
    if (!rec) return;
    const now = Date.now();
    rec.online = true;
    rec.status = '1';
    rec.lastSeen = now;
    rec.lastHeartbeat = now;
    rec.name = displayName(camId);
}

function touch(camId) {
    const rec = ensure(camId);
    if (!rec) return;
    const now = Date.now();
    rec.lastSeen = now;
    if (rec.online) rec.lastHeartbeat = now;
}

function markOffline(camId) {
    const rec = ensure(camId);
    if (!rec) return;
    rec.online = false;
    rec.status = '0';
}

function updateTelemetry(camId, payload) {
    const rec = ensure(camId);
    if (!rec || !payload) return;
    rec.telemetry = {
        battery: payload.battery,
        signal: payload.signal,
        recording: payload.recording,
        audio: payload.audio,
        callstate: payload.callstate,
        volume: payload.volume,
        appversion: payload.appversion,
    };
    rec.lastSeen = Date.now();
}

function hasOnline() {
    return Object.keys(devices).some((id) => devices[id].online);
}

function firstOnlineId() {
    const ids = Object.keys(devices).filter((id) => devices[id].online);
    return ids.length ? ids[0] : null;
}

function findStale(maxAgeMs) {
    const now = Date.now();
    return Object.keys(devices).filter((id) => {
        const rec = devices[id];
        return rec.online && rec.lastSeen > 0 && now - rec.lastSeen > maxAgeMs;
    });
}

function toDashboardMember(rec) {
    const tel = rec.telemetry || {};
    return {
        id: rec.id,
        name: rec.name,
        status: rec.status,
        online: rec.online,
        lastSeen: rec.lastSeen,
        lastHeartbeat: rec.lastHeartbeat,
        pnumber: rec.pnumber,
        ertId: rec.ertId,
        mapGroup: getMapGroup(rec.id) || '',
        configured: !!configuredDeviceIds[rec.id],
        battery: tel.battery,
        signal: tel.signal,
        recording: tel.recording,
    };
}

function getDashboardRoster() {
    return Object.keys(devices)
        .map((id) => toDashboardMember(devices[id]))
        .sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return (b.lastSeen || 0) - (a.lastSeen || 0);
        });
}

/** PTT / OnlineStatus device list: registered BWCs + HQ. */
function getPttRoster(activeCamId, activeOnline) {
    const list = getDashboardRoster()
        .filter((d) => d.online || d.id === activeCamId)
        .map((d) => ({
            name: d.online ? d.name : d.name + ' (Offline)',
            id: d.id,
            pnumber: d.pnumber || '00001',
            status: d.online ? '1' : '0',
            ertId: d.ertId || '11100000001',
        }));
    if (activeCamId && !devices[activeCamId]) {
        list.unshift({
            name: activeOnline !== false ? displayName(activeCamId) : displayName(activeCamId) + ' (Offline)',
            id: activeCamId,
            pnumber: '00001',
            status: activeOnline !== false ? '1' : '0',
            ertId: '11100000001',
        });
    }
    if (!list.some((d) => d.id === HQ_ENTRY.id)) list.push({ ...HQ_ENTRY });
    return list;
}

module.exports = {
    refreshOperatorNames,
    refreshDeviceMeta,
    getMapGroup,
    markOnline,
    touch,
    markOffline,
    updateTelemetry,
    hasOnline,
    firstOnlineId,
    findStale,
    getDashboardRoster,
    getPttRoster,
    displayName,
};
