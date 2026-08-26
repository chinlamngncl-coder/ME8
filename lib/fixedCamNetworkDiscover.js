'use strict';
/**
 * VMS-NETWORK-DISCOVER-V1 — CIDR-primary ONVIF scanner (WS-Discovery optional).
 * Light probe only; GetProfiles queued after Add to VMS.
 */

const crypto = require('crypto');
const { Discovery } = require('onvif');
const fixedCamOnvif = require('./fixedCamOnvif');
const fixedCamRegistry = require('./fixedCamRegistry');
const log = require('./fleetLog');

const MAX_HOSTS = 512;
const CONCURRENCY = 5;
const PROBE_TIMEOUT_MS = 5000;

/** @type {null|{ id: string, status: string, ... }} */
let activeJob = null;

function ipToInt(ip) {
    const p = String(ip || '').trim().split('.').map(function (n) { return parseInt(n, 10); });
    if (p.length !== 4 || p.some(function (n) { return !Number.isFinite(n) || n < 0 || n > 255; })) {
        return null;
    }
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

function intToIp(n) {
    return [
        (n >>> 24) & 255,
        (n >>> 16) & 255,
        (n >>> 8) & 255,
        n & 255,
    ].join('.');
}

/**
 * Expand CIDR (a.b.c.d/nn), range (a.b.c.d-a.b.c.e), or single IP.
 * Caps at MAX_HOSTS. Excludes network/broadcast for /24+ when practical.
 */
function expandTargets(raw) {
    const s = String(raw || '').trim();
    if (!s) throw Object.assign(new Error('Target range is required'), { status: 400 });

    if (s.indexOf('/') >= 0) {
        const parts = s.split('/');
        const base = ipToInt(parts[0]);
        const prefix = parseInt(parts[1], 10);
        if (base == null || !Number.isFinite(prefix) || prefix < 23 || prefix > 32) {
            throw Object.assign(
                new Error('CIDR must be /23–/32 (max 512 hosts). Larger ranges are blocked.'),
                { status: 400 }
            );
        }
        const hostBits = 32 - prefix;
        const size = Math.pow(2, hostBits);
        if (size > MAX_HOSTS) {
            throw Object.assign(new Error('Range exceeds ' + MAX_HOSTS + ' hosts'), { status: 400 });
        }
        const mask = size === 0 ? 0xffffffff : (0xffffffff << hostBits) >>> 0;
        const network = (base & mask) >>> 0;
        const out = [];
        const start = prefix <= 30 ? network + 1 : network;
        const end = prefix <= 30 ? network + size - 2 : network + size - 1;
        for (let n = start; n <= end; n += 1) {
            out.push(intToIp(n >>> 0));
            if (out.length > MAX_HOSTS) {
                throw Object.assign(new Error('Range exceeds ' + MAX_HOSTS + ' hosts'), { status: 400 });
            }
        }
        if (!out.length) out.push(intToIp(network));
        return out;
    }

    if (s.indexOf('-') >= 0) {
        const bits = s.split('-');
        const a = ipToInt(bits[0]);
        const b = ipToInt(bits[1]);
        if (a == null || b == null || b < a) {
            throw Object.assign(new Error('Invalid IP range'), { status: 400 });
        }
        if ((b - a + 1) > MAX_HOSTS) {
            throw Object.assign(new Error('Range exceeds ' + MAX_HOSTS + ' hosts'), { status: 400 });
        }
        const out = [];
        for (let n = a; n <= b; n += 1) out.push(intToIp(n >>> 0));
        return out;
    }

    const one = ipToInt(s);
    if (one == null) throw Object.assign(new Error('Invalid IP or CIDR'), { status: 400 });
    return [intToIp(one)];
}

function findByIp(ip) {
    const host = String(ip || '').trim().toLowerCase();
    if (!host) return null;
    return fixedCamRegistry.list().find(function (c) {
        const h = c && c.onvif && String(c.onvif.host || '').trim().toLowerCase();
        return h === host;
    }) || null;
}

function getActiveJob() {
    return activeJob;
}

function jobPublicView(job) {
    if (!job) return null;
    return {
        id: job.id,
        status: job.status,
        method: job.method,
        scanned: job.scanned,
        total: job.total,
        found: job.found,
        timeouts: job.timeouts,
        results: job.results,
        error: job.error || '',
        startedAt: job.startedAt,
        finishedAt: job.finishedAt || null,
    };
}

async function runWsDiscoveryHosts() {
    return new Promise(function (resolve) {
        const hosts = [];
        const seen = Object.create(null);
        let settled = false;
        const timer = setTimeout(function () {
            if (settled) return;
            settled = true;
            resolve(hosts);
        }, 6000);
        try {
            Discovery.probe(function (err, cams) {
                if (settled) return;
                if (err || !Array.isArray(cams)) {
                    settled = true;
                    clearTimeout(timer);
                    return resolve(hosts);
                }
                cams.forEach(function (cam) {
                    const h = cam && (cam.hostname || cam.host || (cam.xaddrs && cam.xaddrs[0]));
                    let host = '';
                    if (typeof h === 'string' && h.indexOf('://') >= 0) {
                        try { host = new URL(h).hostname; } catch (_) { host = ''; }
                    } else {
                        host = String(h || '').trim();
                    }
                    if (!host || seen[host]) return;
                    seen[host] = true;
                    hosts.push(host);
                });
                settled = true;
                clearTimeout(timer);
                resolve(hosts);
            });
        } catch (_) {
            clearTimeout(timer);
            if (!settled) {
                settled = true;
                resolve(hosts);
            }
        }
    });
}

async function startScan(opts) {
    if (activeJob && (activeJob.status === 'running' || activeJob.status === 'starting')) {
        const err = new Error('Scan already running');
        err.status = 409;
        throw err;
    }
    const method = String((opts && opts.method) || 'cidr').toLowerCase() === 'ws'
        ? 'ws'
        : 'cidr';
    const user = String((opts && opts.username) || (opts && opts.user) || '');
    const password = String((opts && opts.password) || '');
    const port = parseInt(opts && opts.port, 10) || 80;
    const devicePath = String((opts && opts.devicePath) || '/onvif/device_service');

    let hosts = [];
    if (method === 'ws') {
        hosts = await runWsDiscoveryHosts();
        if (!hosts.length) {
            /* empty is OK — UI explains VLAN multicast */
        }
    } else {
        hosts = expandTargets(opts && (opts.range || opts.target || opts.cidr));
    }
    if (hosts.length > MAX_HOSTS) {
        const err = new Error('Range exceeds ' + MAX_HOSTS + ' hosts');
        err.status = 400;
        throw err;
    }

    const id = 'scan-' + crypto.randomBytes(6).toString('hex');
    activeJob = {
        id: id,
        status: 'running',
        method: method,
        scanned: 0,
        total: hosts.length,
        found: 0,
        timeouts: 0,
        results: [],
        error: '',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        auth: { user: user, password: password, port: port, devicePath: devicePath },
    };

    setImmediate(function () {
        runProbeQueue(activeJob, hosts).catch(function (err) {
            if (activeJob && activeJob.id === id) {
                activeJob.status = 'error';
                activeJob.error = (err && err.message) ? String(err.message) : 'Scan failed';
                activeJob.finishedAt = new Date().toISOString();
            }
            log.web.warn('fixed-cam network discover failed', { err: err && err.message });
        });
    });

    return jobPublicView(activeJob);
}

async function runProbeQueue(job, hosts) {
    let i = 0;
    async function worker() {
        while (i < hosts.length) {
            if (!activeJob || activeJob.id !== job.id) return;
            const idx = i;
            i += 1;
            const host = hosts[idx];
            const existing = findByIp(host);
            const probe = await fixedCamOnvif.lightNetworkProbe({
                host: host,
                port: job.auth.port,
                user: job.auth.user,
                password: job.auth.password,
                devicePath: job.auth.devicePath,
                timeoutMs: PROBE_TIMEOUT_MS,
            });
            job.scanned += 1;
            if (probe.status === 'Timeout') {
                job.timeouts += 1;
                /* do not list pure timeouts — progress only */
            } else {
                const row = {
                    ip: host,
                    port: job.auth.port,
                    name: probe.name || host,
                    manufacturer: probe.manufacturer || '',
                    model: probe.model || '',
                    mac: probe.mac || '',
                    status: existing ? 'Already_Exists' : probe.status,
                    cameraId: existing ? existing.id : '',
                    authOk: probe.status === 'Ready',
                    update: false,
                };
                if (probe.status === 'Auth_Failed') {
                    row.status = existing ? 'Already_Exists' : 'Auth_Failed';
                    row.authOk = false;
                }
                job.results.push(row);
                job.found = job.results.length;
            }
        }
    }
    const n = Math.min(CONCURRENCY, Math.max(1, hosts.length));
    const workers = [];
    for (let w = 0; w < n; w += 1) workers.push(worker());
    await Promise.all(workers);
    if (activeJob && activeJob.id === job.id) {
        job.status = 'done';
        job.finishedAt = new Date().toISOString();
    }
}

/**
 * Commit selected discovery rows → registry, then queue GetProfiles.
 */
async function commitSelection(body) {
    const rows = Array.isArray(body && body.selected) ? body.selected : [];
    const job = activeJob;
    const auth = (body && body.auth) || (job && job.auth) || {};
    const user = String(auth.user || auth.username || '');
    const password = String(auth.password || '');
    const port = parseInt(auth.port, 10) || 80;
    const devicePath = String(auth.devicePath || '/onvif/device_service');

    const created = [];
    const updated = [];
    const skipped = [];
    const failed = [];
    const toDiscover = [];

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i] || {};
        const ip = String(row.ip || '').trim();
        if (!ip) continue;
        const doUpdate = !!row.update;
        const existing = findByIp(ip);
        const status = String(row.status || '');

        if (status === 'Auth_Failed' && !existing) {
            failed.push({ ip: ip, detail: 'Auth_Failed' });
            continue;
        }
        if (existing && !doUpdate) {
            skipped.push({ ip: ip, cameraId: existing.id });
            continue;
        }
        if (!existing && status === 'Already_Exists') {
            skipped.push({ ip: ip });
            continue;
        }

        const payload = {
            name: String(row.name || ip).trim() || ip,
            placementMode: 'outdoor',
            lat: null,
            lng: null,
            zone_id: null,
            map_x: null,
            map_y: null,
            streamSource: 'onvif',
            streamTransport: 'tcp',
            onvif: {
                host: ip,
                port: port,
                user: user,
                password: password,
                devicePath: devicePath,
                rtspTransport: 'tcp',
            },
            streamRolePref: { live: 'auto', record: 'auto', remote: 'auto' },
            streamRoles: { live: '', record: '', remote: '' },
            streamAdvancedOverride: false,
            enabled: true,
            ptzEnabled: false,
            mapIcon: 'fixed',
            notes: '',
        };

        try {
            if (existing && doUpdate) {
                if (!password) {
                    payload.onvif.password = (existing.onvif && existing.onvif.password) || '';
                }
                payload.streamProfiles = existing.streamProfiles || [];
                payload.streamRolePref = existing.streamRolePref || payload.streamRolePref;
                const cam = fixedCamRegistry.update(existing.id, payload);
                updated.push(cam.id);
                toDiscover.push(cam.id);
            } else {
                const cam = fixedCamRegistry.add(payload);
                created.push(cam.id);
                toDiscover.push(cam.id);
            }
        } catch (err) {
            failed.push({ ip: ip, detail: (err && err.message) || 'Save failed' });
        }
    }

    /* Queue GetProfiles after Add — same concurrency as CSV */
    setImmediate(function () {
        queueProfileDiscover(toDiscover).catch(function (err) {
            log.web.warn('discover post-add GetProfiles failed', { err: err && err.message });
        });
    });

    return {
        ok: true,
        created: created.length,
        updated: updated.length,
        skipped: skipped.length,
        failed: failed.length,
        profileQueue: toDiscover.length,
        createdIds: created,
        updatedIds: updated,
        failedRows: failed,
    };
}

async function queueProfileDiscover(ids) {
    const unique = [];
    const seen = Object.create(null);
    (ids || []).forEach(function (id) {
        if (!id || seen[id]) return;
        seen[id] = true;
        unique.push(id);
    });
    let i = 0;
    async function worker() {
        while (i < unique.length) {
            const idx = i;
            i += 1;
            const camId = unique[idx];
            const cam = fixedCamRegistry.getById(camId);
            if (!cam || cam.streamSource !== 'onvif') continue;
            try {
                const probe = await fixedCamOnvif.authenticateAndProbe(cam);
                const profiles = Array.isArray(probe.streamProfiles) ? probe.streamProfiles : [];
                if (profiles.length) {
                    fixedCamRegistry.saveProfiles(camId, profiles);
                    fixedCamRegistry.update(camId, {
                        streamProfiles: profiles,
                        streamRoles: { live: '', record: '', remote: '' },
                    });
                }
                try {
                    if (probe.client && typeof probe.client.removeAllListeners === 'function') {
                        probe.client.removeAllListeners();
                    }
                } catch (_) { /* ignore */ }
            } catch (err) {
                log.web.warn('discover GetProfiles failed', { camId: camId, err: err && err.message });
            }
        }
    }
    const n = Math.min(CONCURRENCY, Math.max(1, unique.length));
    const workers = [];
    for (let w = 0; w < n; w += 1) workers.push(worker());
    await Promise.all(workers);
}

module.exports = {
    MAX_HOSTS,
    CONCURRENCY,
    expandTargets,
    startScan,
    getActiveJob,
    jobPublicView,
    commitSelection,
};
