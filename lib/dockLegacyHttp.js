/**
 * Legacy vendor HTTP GET adapter for physical docking stations.
 * Paths stay server-side only — never put OS paths in the JSON body.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const dockRegistry = require('./dockRegistry');
const ftpInbox = require('./ftpInbox');
const fleetRoster = require('./fleetRoster');

function qstr(q, key) {
    const raw = q && q[key] != null ? String(q[key]) : '';
    try {
        return decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
    } catch (_) {
        return raw.trim();
    }
}

function routeKey(q) {
    return String((q && q.r) || '').trim().replace(/^\/+/, '').toLowerCase();
}

function sendJson(res, status, body) {
    res.status(status).json(body);
}

function resolveFtpHit(ftpRoot, rawPath, fileName, deviceNumber) {
    const decoded = qstr({ p: rawPath }, 'p');
    const norm = decoded.replace(/\\/g, '/');
    const name = path.posix.basename(String(fileName || norm || '').replace(/\\/g, '/'));
    const rels = [];
    function add(rel) {
        const r = String(rel || '').replace(/^\/+/, '');
        if (r && rels.indexOf(r) < 0) rels.push(r);
    }
    if (norm && !/^[a-zA-Z]:/.test(norm) && norm.indexOf('//') !== 0) add(norm.replace(/^\/+/, ''));
    if (deviceNumber && name) add(String(deviceNumber) + '/' + name);
    if (name) add(name);
    for (let i = 0; i < rels.length; i++) {
        const hit = ftpInbox.safeRelUnderRoot(ftpRoot, rels[i]);
        if (hit && fs.existsSync(hit.abs)) return hit;
    }
    return null;
}

async function handleRegister(q) {
    const cloudKey = qstr(q, 'cloudKey');
    const dock = dockRegistry.upsertByCloudKey({
        cloudKey: cloudKey,
        displayName: qstr(q, 'station_name') || cloudKey,
        contactName: qstr(q, 'linkman'),
        contactPhone: qstr(q, 'phone'),
        notes: qstr(q, 'remark'),
        localPort: qstr(q, 'localport'),
        version: qstr(q, 'version'),
    });
    return { success: true, msg: String(dock.cloudKey || cloudKey) };
}

function handleInitUser(q) {
    const police = qstr(q, 'police_number');
    const fleet = fleetRoster.getFleetRoster(null, true) || [];
    const hit = fleet.find(function (d) {
        return String(d.pnumber || d.policeNumber || '') === police;
    });
    return {
        success: true,
        msg: { uid: hit ? String(hit.id || '1') : '1', police_number: police },
    };
}

async function handleReceive(q, deps) {
    const fileName = qstr(q, 'file_name');
    const deviceNumber = qstr(q, 'device_number');
    const ftpRoot = deps && deps.ftpRoot;
    const level = Number(qstr(q, 'level')) || 0;
    const important = Number(qstr(q, 'important')) || 0;
    const isPriority = level > 0 || important > 0;
    if (ftpRoot && typeof deps.onReceive === 'function') {
        const hit = resolveFtpHit(ftpRoot, qstr(q, 'path'), fileName, deviceNumber);
        if (hit) {
            await deps.onReceive({
                fullPath: hit.abs,
                fileName: fileName || path.posix.basename(hit.rel),
                originalFileName: (deviceNumber ? deviceNumber + '/' : '') + (fileName || path.posix.basename(hit.rel)),
                source: 'dock_ftp',
                deviceId: deviceNumber || null,
                isPriority: isPriority,
            });
        }
    }
    return { success: true, msg: 'success' };
}

function handleUpdatePort(q) {
    const cloudKey = qstr(q, 'cloudKey');
    const priority = qstr(q, 'priority_port') || '0';
    try {
        dockRegistry.touchByCloudKey(cloudKey, { priorityPort: priority });
    } catch (_) {
        if (cloudKey) {
            dockRegistry.upsertByCloudKey({
                cloudKey: cloudKey,
                displayName: cloudKey,
                priorityPort: priority,
            });
        }
    }
    return { success: true, msg: { priority_port: priority || '0' } };
}

async function handleGet(req, res, deps) {
    const q = (req && req.query) || {};
    const r = routeKey(q);
    try {
        if (r === 'third/register') {
            return sendJson(res, 200, await handleRegister(q));
        }
        if (r === 'third/inituser') {
            return sendJson(res, 200, handleInitUser(q));
        }
        if (r === 'third/receive') {
            return sendJson(res, 200, await handleReceive(q, deps || {}));
        }
        if (r === 'third/updateportinfo') {
            return sendJson(res, 200, handleUpdatePort(q));
        }
        return sendJson(res, 400, { success: false, msg: 'unknown' });
    } catch (_) {
        return sendJson(res, 400, { success: false, msg: 'failed' });
    }
}

module.exports = { handleGet };
