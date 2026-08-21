'use strict';
/**
 * VMS-FIXED-CSV-ENROLL-V1 — human CSV enroll for fixed cams (Ops outdoor XOR VMS indoor).
 * Zone_Name resolved by name (no auto-create). Queued ONVIF profile discover (max 5).
 */

const fixedCamRegistry = require('./fixedCamRegistry');
const fixedCamOnvif = require('./fixedCamOnvif');
const vmsZoneRegistry = require('./vmsZoneRegistry');
const log = require('./fleetLog');

const DISCOVER_CONCURRENCY = 5;

function normKey(k) {
    return String(k || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

function rowMap(row) {
    const m = {};
    Object.keys(row || {}).forEach(function (k) {
        m[normKey(k)] = String(row[k] != null ? row[k] : '').trim();
    });
    return m;
}

function parseAction(raw) {
    const a = String(raw || 'create').trim().toLowerCase();
    if (a === 'update') return 'update';
    if (a === 'overwrite') return 'overwrite';
    return 'create';
}

function parsePlacement(raw) {
    const p = String(raw || 'outdoor').trim().toLowerCase();
    return p === 'indoor' ? 'indoor' : 'outdoor';
}

function parseStreamPref(raw) {
    const v = String(raw || 'auto').trim().toLowerCase();
    if (v === 'main' || v === 'mainstream') return 'main';
    if (v === 'sub' || v === 'substream' || v === 'dual') return 'sub';
    return 'auto';
}

function findByIp(ip) {
    const host = String(ip || '').trim().toLowerCase();
    if (!host) return null;
    return fixedCamRegistry.list().find(function (c) {
        const h = c && c.onvif && String(c.onvif.host || '').trim().toLowerCase();
        return h === host;
    }) || null;
}

async function resolveZoneIdByName(zoneName) {
    const want = String(zoneName || '').trim().toLowerCase();
    if (!want) return { ok: true, zoneId: null };
    let zones = [];
    try {
        zones = await vmsZoneRegistry.listZones(null);
    } catch (err) {
        return { ok: false, error: 'Zone list unavailable' };
    }
    const hit = (zones || []).find(function (z) {
        return String(z.name || '').trim().toLowerCase() === want;
    });
    if (!hit) return { ok: false, error: 'Zone_Missing:' + zoneName };
    return { ok: true, zoneId: hit.id };
}

function buildPayloadFromRow(m, zoneId) {
    const placement = parsePlacement(m.placement);
    const ip = m.ipaddress || m.onvifip || m.onvifhost || '';
    const port = parseInt(m.port || m.onvifport || '80', 10) || 80;
    const user = m.username || m.onvifusername || m.onvifuser || '';
    const pass = m.password || m.onvifpassword || '';
    const transport = String(m.streamtransport || m.rtsptransport || 'tcp').toLowerCase() === 'udp' ? 'udp' : 'tcp';
    const ptz = String(m.ptzcapable || m.ptzenabled || '').toLowerCase() === 'true';

    const payload = {
        name: m.name || '',
        placementMode: placement,
        streamSource: ip ? 'onvif' : (m.streamurl || m.rtspurl ? 'rtsp' : 'none'),
        streamTransport: transport,
        onvif: {
            host: ip,
            port: port,
            user: user,
            password: pass,
            devicePath: m.onvifpath || m.devicepath || '/onvif/device_service',
            rtspTransport: transport,
        },
        rtspUrl: m.streamurl || m.rtspurl || '',
        ptzEnabled: ptz,
        mapIcon: ptz ? 'ptz' : (m.mapicon || 'fixed'),
        enabled: String(m.enabled || 'true').toLowerCase() !== 'false',
        notes: m.notes || '',
        zone: m.zone || '',
        streamRolePref: {
            live: parseStreamPref(m.livestream),
            record: parseStreamPref(m.recordstream),
            remote: parseStreamPref(m.lowbandwidth || m.remotestream),
        },
        streamRoles: { live: '', record: '', remote: '' },
    };

    if (placement === 'outdoor') {
        const lat = m.lat !== '' && m.lat != null ? parseFloat(m.lat) : null;
        const lng = m.lng !== '' && m.lng != null ? parseFloat(m.lng) : null;
        payload.lat = lat != null && !Number.isNaN(lat) ? lat : null;
        payload.lng = lng != null && !Number.isNaN(lng) ? lng : null;
        payload.zone_id = null;
        payload.map_x = null;
        payload.map_y = null;
    } else {
        payload.lat = null;
        payload.lng = null;
        payload.zone_id = zoneId || null;
        const mx = m.mapx !== '' && m.mapx != null ? parseFloat(m.mapx) : null;
        const my = m.mapy !== '' && m.mapy != null ? parseFloat(m.mapy) : null;
        payload.map_x = mx != null && !Number.isNaN(mx) ? mx : null;
        payload.map_y = my != null && !Number.isNaN(my) ? my : null;
    }
    return payload;
}

function validateRow(m, action) {
    if (!m.name) return 'Name is required';
    const ip = m.ipaddress || m.onvifip || m.onvifhost || '';
    if (!ip && !(m.streamurl || m.rtspurl)) return 'IP_Address or StreamUrl is required';
    if (action === 'create' && ip && !m.password && !m.onvifpassword) {
        /* password strongly recommended; allow empty for open cams */
    }
    const placement = parsePlacement(m.placement);
    if (placement === 'indoor' && !(m.zonename || m.zone_name)) {
        return 'Indoor requires Zone_Name';
    }
    if (placement === 'outdoor' && (m.zonename || m.mapx || m.mapy)) {
        /* XOR: ignore indoor fields — already cleared in buildPayload */
    }
    if (placement === 'indoor' && (m.lat || m.lng)) {
        /* XOR: ignore outdoor coords in buildPayload */
    }
    return null;
}

/**
 * Apply CSV rows. Returns { ok, results[], receiptRows[], created, updated, failed }.
 */
async function enrollFromCsvRows(rows) {
    const results = [];
    const toDiscover = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += 1) {
        const raw = rows[i];
        const m = rowMap(raw);
        const action = parseAction(m.importaction || m.action);
        const receipt = Object.assign({}, raw);
        const line = { row: i + 2, action: action, name: m.name || '', ip: m.ipaddress || m.onvifip || m.onvifhost || '' };

        const verr = validateRow(m, action);
        if (verr) {
            failed += 1;
            line.status = 'Validation_Failed';
            line.detail = verr;
            receipt.Status = line.status;
            receipt.Detail = verr;
            results.push(line);
            continue;
        }

        const placement = parsePlacement(m.placement);
        let zoneId = null;
        if (placement === 'indoor') {
            const zr = await resolveZoneIdByName(m.zonename || m.zone_name || '');
            if (!zr.ok) {
                failed += 1;
                line.status = 'Zone_Missing';
                line.detail = zr.error || 'Zone not found';
                receipt.Status = line.status;
                receipt.Detail = line.detail;
                results.push(line);
                continue;
            }
            zoneId = zr.zoneId;
        }

        const ip = m.ipaddress || m.onvifip || m.onvifhost || '';
        const existing = ip ? findByIp(ip) : null;
        const payload = buildPayloadFromRow(m, zoneId);

        try {
            if (action === 'create') {
                if (existing) {
                    failed += 1;
                    line.status = 'Duplicate';
                    line.detail = 'IP already registered; use Update or Overwrite';
                    receipt.Status = line.status;
                    receipt.Detail = line.detail;
                    results.push(line);
                    continue;
                }
                const cam = fixedCamRegistry.add(payload);
                created += 1;
                line.status = 'OK';
                line.cameraId = cam.id;
                line.detail = 'Created';
                if (cam.streamSource === 'onvif' && cam.onvif && cam.onvif.host) {
                    toDiscover.push(cam.id);
                }
            } else if (action === 'update' || action === 'overwrite') {
                if (!existing) {
                    failed += 1;
                    line.status = 'Not_Found';
                    line.detail = 'No camera with this IP; use Create';
                    receipt.Status = line.status;
                    receipt.Detail = line.detail;
                    results.push(line);
                    continue;
                }
                if (action === 'update' && (!payload.onvif.password)) {
                    payload.onvif.password = (existing.onvif && existing.onvif.password) || '';
                }
                if (action === 'update') {
                    payload.streamProfiles = existing.streamProfiles || [];
                    if (!m.livestream && !m.recordstream) {
                        payload.streamRolePref = existing.streamRolePref || payload.streamRolePref;
                    }
                }
                const cam = fixedCamRegistry.update(existing.id, payload);
                updated += 1;
                line.status = 'OK';
                line.cameraId = cam.id;
                line.detail = action === 'overwrite' ? 'Overwritten' : 'Updated';
                if (cam.streamSource === 'onvif' && cam.onvif && cam.onvif.host) {
                    toDiscover.push(cam.id);
                }
            }
            receipt.Status = line.status;
            receipt.Detail = line.detail;
            receipt.CameraId = line.cameraId || '';
            results.push(line);
        } catch (err) {
            failed += 1;
            line.status = 'Error';
            line.detail = (err && err.message) ? String(err.message) : 'Import failed';
            receipt.Status = line.status;
            receipt.Detail = line.detail;
            results.push(line);
        }
    }

    const discoverResults = await runDiscoverQueue(toDiscover);
    discoverResults.forEach(function (d) {
        const hit = results.find(function (r) { return r.cameraId === d.cameraId; });
        if (!hit) return;
        if (d.status !== 'OK') {
            hit.discover = d.status;
            hit.detail = (hit.detail || '') + '; Discover:' + d.status;
        } else {
            hit.discover = 'OK';
            hit.profiles = d.count || 0;
        }
    });

    results.forEach(function (line) {
        /* sync discover onto receipt via CameraId match later in caller */
    });

    return {
        ok: failed === 0 || (created + updated) > 0,
        created: created,
        updated: updated,
        failed: failed,
        results: results,
        discoverQueued: toDiscover.length,
    };
}

async function discoverOne(camId) {
    const camera = fixedCamRegistry.getById(camId);
    if (!camera || !camera.onvif || !camera.onvif.host) {
        return { cameraId: camId, status: 'Skip', count: 0 };
    }
    try {
        const probe = await fixedCamOnvif.authenticateAndProbe(camera);
        const profiles = Array.isArray(probe.streamProfiles) ? probe.streamProfiles : [];
        if (profiles.length) {
            fixedCamRegistry.saveProfiles(camId, profiles);
            applyStreamPrefsAfterDiscover(camId, profiles);
        }
        try {
            if (probe.client && typeof probe.client.removeAllListeners === 'function') {
                probe.client.removeAllListeners();
            }
        } catch (_) { /* ignore */ }
        return { cameraId: camId, status: 'OK', count: profiles.length };
    } catch (err) {
        const msg = String((err && err.message) || '');
        const status = /auth|password|401|403/i.test(msg) ? 'Auth_Failed' : 'Timeout';
        log.web.warn('fixed-cam csv discover failed', { camId, status, err: msg });
        return { cameraId: camId, status: status, count: 0, detail: msg };
    }
}

function applyStreamPrefsAfterDiscover(camId, profiles) {
    const cam = fixedCamRegistry.getById(camId);
    if (!cam) return;
    const pref = cam.streamRolePref || {};
    /* Auto-map lives in registry; only persist prefs — not raw tokens unless Advanced */
    fixedCamRegistry.update(camId, {
        streamProfiles: profiles,
        streamRolePref: pref,
        streamRoles: cam.streamAdvancedOverride ? (cam.streamRoles || {}) : { live: '', record: '', remote: '' },
    });
}

async function runDiscoverQueue(ids) {
    const unique = [];
    const seen = Object.create(null);
    (ids || []).forEach(function (id) {
        if (!id || seen[id]) return;
        seen[id] = true;
        unique.push(id);
    });
    const out = [];
    let i = 0;
    async function worker() {
        while (i < unique.length) {
            const idx = i;
            i += 1;
            out[idx] = await discoverOne(unique[idx]);
        }
    }
    const n = Math.min(DISCOVER_CONCURRENCY, Math.max(1, unique.length));
    const workers = [];
    for (let w = 0; w < n; w += 1) workers.push(worker());
    await Promise.all(workers);
    return out;
}

function receiptCsv(originalRows, results) {
    const byRow = Object.create(null);
    (results || []).forEach(function (r) {
        byRow[r.row] = r;
    });
    if (!originalRows || !originalRows.length) {
        return 'Status,Detail,CameraId\n';
    }
    const headers = Object.keys(originalRows[0] || {});
    if (headers.indexOf('Status') < 0) headers.push('Status');
    if (headers.indexOf('Detail') < 0) headers.push('Detail');
    if (headers.indexOf('CameraId') < 0) headers.push('CameraId');
    if (headers.indexOf('Discover') < 0) headers.push('Discover');

    function esc(v) {
        const s = String(v == null ? '' : v);
        if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    const lines = [headers.join(',')];
    originalRows.forEach(function (row, idx) {
        const r = byRow[idx + 2] || {};
        const obj = Object.assign({}, row, {
            Status: r.status || '',
            Detail: r.detail || '',
            CameraId: r.cameraId || '',
            Discover: r.discover || '',
        });
        lines.push(headers.map(function (h) { return esc(obj[h]); }).join(','));
    });
    return lines.join('\r\n');
}

module.exports = {
    enrollFromCsvRows,
    receiptCsv,
    DISCOVER_CONCURRENCY,
};
