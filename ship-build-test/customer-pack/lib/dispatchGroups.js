/**
 * Dispatch map groups — named teams, pin colours, CSV import, BWC sync.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CSV_HEADER = 'group_name,pin_color,nickname,device_id,dashboard_username';

/** Same order as Map groups UI swatches (dispatch-groups-admin.js PRESET_COLORS). */
const PRESET_COLORS = [
    '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444',
    '#06b6d4', '#ec4899', '#eab308', '#6366f1', '#14b8a6',
];

const COLOR_NAME_ALIASES = {
    green: 0,
    blue: 1,
    amber: 2,
    purple: 3,
    red: 4,
    cyan: 5,
    pink: 6,
    yellow: 7,
    indigo: 8,
    teal: 9,
};

let groupsPath = null;

function newGroupId() {
    return 'grp_' + crypto.randomBytes(6).toString('hex');
}

function normalizeColor(raw, fallbackIdx) {
    const s = String(raw || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        const r = s[1]; const g = s[2]; const b = s[3];
        return ('#' + r + r + g + g + b + b).toLowerCase();
    }
    if (s) {
        if (/^(?:[1-9]|10)$/.test(s)) {
            const n = parseInt(s, 10);
            if (n >= 1 && n <= PRESET_COLORS.length) return PRESET_COLORS[n - 1];
        }
        const alias = COLOR_NAME_ALIASES[s.toLowerCase()];
        if (alias != null) return PRESET_COLORS[alias];
    }
    const idx = typeof fallbackIdx === 'number' ? fallbackIdx : 0;
    return PRESET_COLORS[Math.abs(idx) % PRESET_COLORS.length];
}

function normalizeMember(row) {
    const nickname = String((row && row.nickname) || '').trim();
    const deviceId = String((row && row.deviceId) || '').trim();
    const dashboardUsername = String((row && row.dashboardUsername) || '').trim() || null;
    if (!nickname && !deviceId) return null;
    return { nickname, deviceId, dashboardUsername };
}

function normalizeGroup(raw, colorIdx) {
    const g = raw && typeof raw === 'object' ? raw : {};
    const name = String(g.name || '').trim();
    if (!name) return null;
    const members = [];
    const seenDev = new Set();
    (Array.isArray(g.members) ? g.members : []).forEach((m) => {
        const row = normalizeMember(m);
        if (!row) return;
        if (row.deviceId && seenDev.has(row.deviceId)) return;
        if (row.deviceId) seenDev.add(row.deviceId);
        members.push(row);
    });
    return {
        id: String(g.id || newGroupId()).trim() || newGroupId(),
        name,
        color: normalizeColor(g.color, colorIdx),
        members,
    };
}

function readFile() {
    try {
        if (groupsPath && fs.existsSync(groupsPath)) {
            const data = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
            if (Array.isArray(data.groups)) {
                return data.groups
                    .map((g, i) => normalizeGroup(g, i))
                    .filter(Boolean);
            }
        }
    } catch (_) { /* ignore */ }
    return [];
}

function writeFile(groups) {
    if (!groupsPath) return [];
    const next = (groups || []).map((g, i) => normalizeGroup(g, i)).filter(Boolean);
    fs.mkdirSync(path.dirname(groupsPath), { recursive: true });
    fs.writeFileSync(groupsPath, JSON.stringify({ groups: next }, null, 2), 'utf8');
    return next;
}

function init(storageDir) {
    groupsPath = path.join(storageDir, 'dispatch-groups.json');
    if (!fs.existsSync(groupsPath)) writeFile([]);
}

function listGroups() {
    return readFile();
}

function getGroup(id) {
    const gid = String(id || '').trim();
    return readFile().find((g) => g.id === gid) || null;
}

function memberDeviceIds(groupId) {
    const g = getGroup(groupId);
    if (!g) return [];
    const seen = new Set();
    const out = [];
    (g.members || []).forEach((m) => {
        const id = String((m && m.deviceId) || '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(id);
    });
    return out;
}

function saveGroups(groups) {
    return writeFile(groups);
}

function upsertGroup(patch) {
    const groups = readFile();
    const normalized = normalizeGroup(patch, groups.length);
    if (!normalized) throw new Error('Group name is required');
    const idx = groups.findIndex((g) => g.id === normalized.id);
    if (groups.some((g, i) => i !== idx && g.name.toLowerCase() === normalized.name.toLowerCase())) {
        throw new Error('A group with this name already exists');
    }
    if (idx >= 0) groups[idx] = normalized;
    else groups.push(normalized);
    return writeFile(groups);
}

function deleteGroup(id) {
    const gid = String(id || '').trim();
    const groups = readFile().filter((g) => g.id !== gid);
    if (groups.length === readFile().length) throw new Error('Group not found');
    return writeFile(groups);
}

function buildLookup(groups) {
    const byDevice = {};
    const byName = {};
    (groups || []).forEach((g) => {
        byName[g.name.toLowerCase()] = { id: g.id, name: g.name, color: g.color };
        (g.members || []).forEach((m) => {
            if (!m.deviceId) return;
            byDevice[m.deviceId] = {
                groupId: g.id,
                groupName: g.name,
                color: g.color,
                nickname: m.nickname,
            };
        });
    });
    return { byDevice, byName, groups };
}

function syncGroupsToBwcDevices(bwcData, groups) {
    const next = bwcDevicesClone(bwcData);
    const deviceIndex = new Map();
    next.devices.forEach((d, i) => { if (d.deviceId) deviceIndex.set(d.deviceId, i); });

    (groups || []).forEach((g) => {
        (g.members || []).forEach((m) => {
            if (!m.deviceId) return;
            let idx = deviceIndex.get(m.deviceId);
            if (idx === undefined) {
                next.devices.push({
                    deviceId: m.deviceId,
                    operatorName: m.nickname || '',
                    mapGroup: g.name,
                    userName: '',
                    password: '',
                    protocol: 'sip',
                });
                idx = next.devices.length - 1;
                deviceIndex.set(m.deviceId, idx);
            } else {
                const row = Object.assign({}, next.devices[idx]);
                if (m.nickname) row.operatorName = m.nickname;
                row.mapGroup = g.name;
                next.devices[idx] = row;
            }
        });
    });
    return next;
}

function bwcDevicesClone(data) {
    const devices = (data && Array.isArray(data.devices) ? data.devices : []).map((d) => Object.assign({}, d));
    return { devices };
}

function parseCsv(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
    const col = (names) => {
        for (let i = 0; i < names.length; i++) {
            const idx = header.indexOf(names[i]);
            if (idx >= 0) return idx;
        }
        return -1;
    };
    const iName = col(['group_name', 'groupname', 'group']);
    const iColor = col(['pin_color', 'color', 'pincolor']);
    const iNick = col(['nickname', 'officer', 'name']);
    const iDev = col(['device_id', 'deviceid', 'device']);
    const iUser = col(['dashboard_username', 'dashboarduser', 'username']);
    if (iName < 0 || iNick < 0) {
        throw new Error('CSV must include group_name and nickname columns');
    }
    const rows = [];
    for (let r = 1; r < lines.length; r++) {
        const parts = splitCsvLine(lines[r]);
        if (!parts.length) continue;
        const groupName = (parts[iName] || '').trim();
        const nickname = (parts[iNick] || '').trim();
        if (!groupName || !nickname) continue;
        rows.push({
            groupName,
            color: iColor >= 0 ? (parts[iColor] || '').trim() : '',
            nickname,
            deviceId: iDev >= 0 ? (parts[iDev] || '').trim() : '',
            dashboardUsername: iUser >= 0 ? (parts[iUser] || '').trim() : '',
        });
    }
    return rows;
}

function splitCsvLine(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === ',' && !inQ) { out.push(cur); cur = ''; continue; }
        cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
}

function importCsvRows(rows) {
    const grouped = new Map();
    let colorIdx = 0;
    (rows || []).forEach((row) => {
        const key = row.groupName.toLowerCase();
        if (!grouped.has(key)) {
            grouped.set(key, {
                id: newGroupId(),
                name: row.groupName,
                color: normalizeColor(row.color, colorIdx++),
                members: [],
            });
        }
        const g = grouped.get(key);
        if (row.color) g.color = normalizeColor(row.color, colorIdx);
        const member = normalizeMember({
            nickname: row.nickname,
            deviceId: row.deviceId,
            dashboardUsername: row.dashboardUsername,
        });
        if (member) g.members.push(member);
    });
    const groups = Array.from(grouped.values()).filter((g) => g.members.length);
    return writeFile(groups);
}

function csvTemplate() {
    return CSV_HEADER + '\n'
        + 'North patrol,green,Chin,34020000001329000008,\n'
        + 'North patrol,1,Lee,34020000001329000009,lee_ops\n'
        + 'South team,blue,Pat,34020000001329000010,\n'
        + 'East unit,#a855f7,Sam,34020000001329000011,\n';
}

function publicGroupsPayload(groups, onlineDeviceIds) {
    const online = new Set(onlineDeviceIds || []);
    return (groups || []).map((g) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        memberCount: (g.members || []).length,
        members: (g.members || []).map((m) => ({
            nickname: m.nickname,
            deviceId: m.deviceId,
            dashboardUsername: m.dashboardUsername,
            online: m.deviceId ? online.has(m.deviceId) : false,
        })),
    }));
}

module.exports = {
    init,
    listGroups,
    getGroup,
    memberDeviceIds,
    saveGroups,
    upsertGroup,
    deleteGroup,
    buildLookup,
    syncGroupsToBwcDevices,
    parseCsv,
    importCsvRows,
    csvTemplate,
    publicGroupsPayload,
    normalizeColor,
    PRESET_COLORS,
    COLOR_NAME_ALIASES,
    CSV_HEADER,
};
