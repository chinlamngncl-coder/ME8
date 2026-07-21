/**
 * Conference room state — 3 rooms, 8 seats, recordings metadata.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOM_DEFS = Object.freeze([
    { id: 'room-1', slot: 1, labelKey: 'conference.room1' },
    { id: 'room-2', slot: 2, labelKey: 'conference.room2' },
    { id: 'room-3', slot: 3, labelKey: 'conference.room3' },
]);

const MAX_SEATS = 8;
const MAX_BWC_INGRESS = 4;

function normalizeRoom(room) {
    if (!room) return room;
    if (!Array.isArray(room.bwcIngressList)) {
        room.bwcIngressList = room.bwcIngress ? [room.bwcIngress] : [];
    }
    if (!Array.isArray(room.fixedCameraIngressList)) room.fixedCameraIngressList = [];
    return room;
}

function bwcIngressList(room) {
    return normalizeRoom(room).bwcIngressList || [];
}

function fixedCameraIngressList(room) {
    return normalizeRoom(room).fixedCameraIngressList || [];
}

let storePath = null;
let recordingsDir = null;

function init(storageDir) {
    storePath = path.join(storageDir, 'conference-state.json');
    recordingsDir = path.join(storageDir, 'conference-recordings');
    fs.mkdirSync(recordingsDir, { recursive: true });
    if (!fs.existsSync(storePath)) {
        writeStore(defaultStore());
    }
}

function defaultStore() {
    const rooms = {};
    ROOM_DEFS.forEach(function (r) {
        rooms[r.id] = {
            id: r.id,
            active: false,
            hostUserId: null,
            hostUsername: null,
            dispatchGroupId: null,
            recording: null,
            bwcIngressList: [],
            fixedCameraIngressList: [],
            seats: [],
            guests: [],
            startedAt: null,
            updatedAt: null,
            floor: {
                mutedAll: false,
                allowedSpeakers: [],
                speakRequests: [],
            },
        };
    });
    return { rooms, recordings: [] };
}

function readStore() {
    try {
        const raw = fs.readFileSync(storePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && data.rooms) return data;
    } catch (_) { /* empty */ }
    return defaultStore();
}

function writeStore(data) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
}

function livekitRoomName(roomId) {
    return 'mobility-' + roomId;
}

function newRecordingId() {
    return 'VCREC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex');
}

function getRoom(roomId) {
    const data = readStore();
    const room = data.rooms[roomId] || null;
    return room ? normalizeRoom(Object.assign({}, room)) : null;
}

function listRooms() {
    return ROOM_DEFS.map(function (def) {
        const r = getRoom(def.id) || {};
        return Object.assign({}, def, r);
    });
}

function countSeats(room) {
    if (!room) return 0;
    return (room.seats || []).length;
}

function upsertRoom(roomId, patch) {
    const data = readStore();
    const base = data.rooms[roomId] || defaultStore().rooms[roomId];
    const merged = Object.assign({}, base, patch, {
        id: roomId,
        updatedAt: new Date().toISOString(),
    });
    normalizeRoom(merged);
    if (patch && (patch.bwcIngressList !== undefined || patch.bwcIngress === null)) {
        delete merged.bwcIngress;
    }
    data.rooms[roomId] = merged;
    writeStore(data);
    return normalizeRoom(Object.assign({}, data.rooms[roomId]));
}

function addRecording(rec) {
    const data = readStore();
    data.recordings.unshift(rec);
    data.recordings = data.recordings.slice(0, 500);
    writeStore(data);
    return rec;
}

function updateRecording(recordingId, patch) {
    const data = readStore();
    const idx = data.recordings.findIndex(function (r) { return r.id === recordingId; });
    if (idx < 0) return null;
    data.recordings[idx] = Object.assign({}, data.recordings[idx], patch);
    writeStore(data);
    return data.recordings[idx];
}

function listRecordings(limit) {
    const data = readStore();
    return (data.recordings || []).slice(0, limit || 100);
}

function getRecording(recordingId) {
    return listRecordings(500).find(function (r) { return r.id === recordingId; }) || null;
}

function recordingsRoot() {
    return recordingsDir;
}

function deleteRecording(recordingId) {
    const data = readStore();
    const idx = (data.recordings || []).findIndex(function (r) { return r.id === recordingId; });
    if (idx < 0) return null;
    const rec = data.recordings[idx];
    data.recordings.splice(idx, 1);
    writeStore(data);
    return rec;
}

module.exports = {
    ROOM_DEFS,
    MAX_SEATS,
    MAX_BWC_INGRESS,
    bwcIngressList,
    fixedCameraIngressList,
    init,
    livekitRoomName,
    newRecordingId,
    getRoom,
    listRooms,
    countSeats,
    upsertRoom,
    addRecording,
    updateRecording,
    listRecordings,
    getRecording,
    recordingsRoot,
    deleteRecording,
};
