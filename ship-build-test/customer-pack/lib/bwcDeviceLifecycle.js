'use strict';

/** BWC registry hygiene — canonical SIP IDs, lifecycle states, stale cleanup (VMS industry pattern). */
const STATUS_ACTIVE = 'active';
const STATUS_INACTIVE = 'inactive';
const STATUS_RETIRED = 'retired';

const SIP_DEVICE_ID_RE = /^3402\d{16,}$/;

const MS_DAY = 86400000;

function envInt(name, fallback) {
    const n = parseInt(process.env[name] || String(fallback), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

const POLICY = {
    inactiveDays: envInt('FM_BWC_INACTIVE_DAYS', 90),
    retireDays: envInt('FM_BWC_RETIRE_DAYS', 180),
    ghostPurgeDays: envInt('FM_BWC_GHOST_PURGE_DAYS', 7),
    protectDays: envInt('FM_BWC_PROTECT_DAYS', 30),
    autoRetire: process.env.FM_AUTO_RETIRE === '1',
    hygieneMs: envInt('FM_BWC_HYGIENE_MS', 24 * 60 * 60 * 1000),
};

function nowIso() {
    return new Date().toISOString();
}

function isValidCanonicalId(deviceId) {
    return SIP_DEVICE_ID_RE.test(String(deviceId || '').trim());
}

function normalizeStatus(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (v === STATUS_INACTIVE || v === STATUS_RETIRED) return v;
    return STATUS_ACTIVE;
}

function isOperational(device) {
    return normalizeStatus(device && device.status) !== STATUS_RETIRED;
}

function pickLifecycle(row, prev) {
    const now = nowIso();
    const prevName = prev && String(prev.operatorName || '').trim();
    const nextName = String((row && row.operatorName) || '').trim();
    let operatorHistory = Array.isArray(row && row.operatorHistory)
        ? row.operatorHistory.slice()
        : (prev && Array.isArray(prev.operatorHistory) ? prev.operatorHistory.slice() : []);
    if (nextName && prevName && nextName !== prevName) {
        operatorHistory.push({ name: prevName, at: now });
        if (operatorHistory.length > 20) operatorHistory = operatorHistory.slice(-20);
    }
    return {
        status: normalizeStatus(row && row.status != null ? row.status : (prev && prev.status)),
        firstSeenAt: String((row && row.firstSeenAt) || (prev && prev.firstSeenAt) || '').trim(),
        lastSeenAt: String((row && row.lastSeenAt) || (prev && prev.lastSeenAt) || '').trim(),
        lastGpsAt: String((row && row.lastGpsAt) || (prev && prev.lastGpsAt) || '').trim(),
        retiredAt: String((row && row.retiredAt) || (prev && prev.retiredAt) || '').trim(),
        retiredReason: String((row && row.retiredReason) || (prev && prev.retiredReason) || '').trim(),
        operatorHistory,
    };
}

function mergeLifecycleIntoDevice(row, prev) {
    const lc = pickLifecycle(row, prev);
    return Object.assign({}, row, lc);
}

function touchSeen(device, ts) {
    if (!device) return device;
    const t = ts || nowIso();
    if (!device.firstSeenAt) device.firstSeenAt = t;
    device.lastSeenAt = t;
    if (normalizeStatus(device.status) === STATUS_INACTIVE) {
        device.status = STATUS_ACTIVE;
        device.retiredAt = '';
        device.retiredReason = '';
    }
    return device;
}

function touchGps(device, ts) {
    if (!device) return device;
    device.lastGpsAt = ts || nowIso();
    return device;
}

function retireDevice(device, reason) {
    if (!device) return device;
    device.status = STATUS_RETIRED;
    device.retiredAt = nowIso();
    device.retiredReason = String(reason || 'admin').trim() || 'admin';
    return device;
}

function restoreDevice(device) {
    if (!device) return device;
    device.status = STATUS_ACTIVE;
    device.retiredAt = '';
    device.retiredReason = '';
    device.lastSeenAt = nowIso();
    return device;
}

function parseTs(iso) {
    if (!iso) return 0;
    const n = Date.parse(iso);
    return Number.isFinite(n) ? n : 0;
}

function buildProtectContext(opts) {
    const now = opts && opts.now ? opts.now : Date.now();
    return {
        now,
        online: opts && opts.onlineIds ? new Set(opts.onlineIds) : new Set(),
        openSos: opts && opts.openSosIds ? new Set(opts.openSosIds) : new Set(),
        live: opts && opts.liveIds ? new Set(opts.liveIds) : new Set(),
        protectMs: POLICY.protectDays * MS_DAY,
        inactiveMs: POLICY.inactiveDays * MS_DAY,
        retireMs: POLICY.retireDays * MS_DAY,
        ghostMs: POLICY.ghostPurgeDays * MS_DAY,
    };
}

function isProtected(device, ctx) {
    if (!device || !device.deviceId) return false;
    const id = device.deviceId;
    if (ctx.online.has(id)) return true;
    if (ctx.openSos.has(id)) return true;
    if (ctx.live.has(id)) return true;
    const lastSeen = parseTs(device.lastSeenAt);
    if (lastSeen && (ctx.now - lastSeen) < ctx.protectMs) return true;
    return false;
}

function shouldShowOnMap(device, ctx) {
    if (!device || !device.deviceId || !isValidCanonicalId(device.deviceId)) return false;
    const st = normalizeStatus(device.status);
    if (st === STATUS_RETIRED) return false;
    const id = device.deviceId;
    if (ctx.openSos && ctx.openSos.has(id)) return true;
    if (ctx.pinned && ctx.pinned.has(id)) return true;
    if (ctx.online && ctx.online.has(id)) return true;
    if (st === STATUS_INACTIVE) return false;
    if (ctx.offlineConfigured && ctx.offlineConfigured.has(id)) return true;
    return false;
}

function ipFromContactUri(uri) {
    if (!uri) return null;
    const m = String(uri).match(/@([0-9.]+)/);
    return m ? m[1] : null;
}

function findCanonicalIdForIp(ip, camIdByIp, devices) {
    if (!ip) return null;
    const mapped = camIdByIp && camIdByIp[ip];
    if (mapped && isValidCanonicalId(mapped)) return mapped;
    if (!devices) return null;
    const row = (devices || []).find((d) => {
        if (!d || !isValidCanonicalId(d.deviceId) || !isOperational(d)) return false;
        return false;
    });
    return row ? row.deviceId : null;
}

function registerAdmission(camId, contactUri, camIdByIp, devices) {
    const id = String(camId || '').trim();
    if (!isValidCanonicalId(id)) {
        return { accept: false, reason: 'invalid_id_format', camId: id };
    }
    const ip = ipFromContactUri(contactUri);
    if (ip && camIdByIp && camIdByIp[ip]) {
        const existing = camIdByIp[ip];
        if (existing !== id && isValidCanonicalId(existing)) {
            const known = (devices || []).some((d) => d.deviceId === existing && isOperational(d));
            if (known) {
                return { accept: true, camId: id, duplicateIp: ip, existingId: existing };
            }
        }
    }
    return { accept: true, camId: id };
}

function purgeCachesForId(lastGps, contacts, deviceId) {
    if (lastGps && Object.prototype.hasOwnProperty.call(lastGps, deviceId)) {
        delete lastGps[deviceId];
    }
    if (contacts && Object.prototype.hasOwnProperty.call(contacts, deviceId)) {
        delete contacts[deviceId];
    }
}

function runHygiene(input) {
    const ctx = buildProtectContext(input);
    const actions = [];
    let devices = (input.devices || []).map((d) => Object.assign({}, d));

    const lastGps = Object.assign({}, input.lastGps || {});
    const contacts = Object.assign({}, input.contacts || {});

    Object.keys(lastGps).forEach((id) => {
        if (isValidCanonicalId(id)) return;
        if (ctx.online.has(id)) return;
        delete lastGps[id];
        actions.push({ type: 'purge_gps', deviceId: id, reason: 'invalid_id' });
    });

    Object.keys(contacts).forEach((id) => {
        if (isValidCanonicalId(id)) return;
        if (ctx.online.has(id)) return;
        delete contacts[id];
        actions.push({ type: 'purge_contact', deviceId: id, reason: 'invalid_id' });
    });

    devices = devices.filter((d) => {
        if (!d || !d.deviceId) return false;
        if (isValidCanonicalId(d.deviceId)) return true;
        if (ctx.online.has(d.deviceId)) return true;
        purgeCachesForId(lastGps, contacts, d.deviceId);
        actions.push({ type: 'purge_registry', deviceId: d.deviceId, reason: 'invalid_id' });
        return false;
    });

    devices.forEach((d) => {
        if (normalizeStatus(d.status) === STATUS_RETIRED) {
            if (!isProtected(d, ctx)) {
                purgeCachesForId(lastGps, contacts, d.deviceId);
            }
            return;
        }
        if (isProtected(d, ctx)) return;

        const lastSeen = parseTs(d.lastSeenAt);
        if (!lastSeen) return;

        if ((ctx.now - lastSeen) >= ctx.inactiveMs && normalizeStatus(d.status) === STATUS_ACTIVE) {
            d.status = STATUS_INACTIVE;
            actions.push({ type: 'inactive', deviceId: d.deviceId });
        }

        if (POLICY.autoRetire
            && (ctx.now - lastSeen) >= ctx.retireMs
            && normalizeStatus(d.status) === STATUS_INACTIVE) {
            retireDevice(d, 'auto_stale');
            purgeCachesForId(lastGps, contacts, d.deviceId);
            actions.push({ type: 'retire', deviceId: d.deviceId, reason: 'auto_stale' });
        }
    });

    return { devices, lastGps, contacts, actions, policy: POLICY };
}

function lifecyclePayload(device) {
    if (!device) return null;
    return {
        status: normalizeStatus(device.status),
        firstSeenAt: device.firstSeenAt || null,
        lastSeenAt: device.lastSeenAt || null,
        lastGpsAt: device.lastGpsAt || null,
        retiredAt: device.retiredAt || null,
        retiredReason: device.retiredReason || null,
        operatorHistory: device.operatorHistory || [],
    };
}

function packLifecycleJson(device) {
    return JSON.stringify(lifecyclePayload(device) || {});
}

function unpackLifecycleJson(raw) {
    if (!raw) return {};
    try {
        const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return pickLifecycle(o, null);
    } catch (_) {
        return pickLifecycle(null, null);
    }
}

module.exports = {
    STATUS_ACTIVE,
    STATUS_INACTIVE,
    STATUS_RETIRED,
    POLICY,
    SIP_DEVICE_ID_RE,
    isValidCanonicalId,
    normalizeStatus,
    isOperational,
    mergeLifecycleIntoDevice,
    pickLifecycle,
    touchSeen,
    touchGps,
    retireDevice,
    restoreDevice,
    buildProtectContext,
    isProtected,
    shouldShowOnMap,
    registerAdmission,
    runHygiene,
    purgeCachesForId,
    lifecyclePayload,
    packLifecycleJson,
    unpackLifecycleJson,
    ipFromContactUri,
};
