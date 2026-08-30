/**
 * NVR device + channel registry (PG). Passwords stored as vault AES-256-GCM envelopes.
 * NVR-DEVICE-REGISTRY-V1 — parent NVR row; channels optionally link to fixed_cameras.
 */
'use strict';

const siteDb = require('./siteDb');
const secretsVaultCrypto = require('./secretsVaultCrypto');
const { nvrDeviceId } = require('./secureId');
const licenseManager = require('./licenseManager');
const fixedCamRegistry = require('./fixedCamRegistry');
const fixedCamCatalogPg = require('./fixedCamCatalogPg');

function FixedPoolCapacityError(message) {
    const err = new Error(message || 'Device capacity full.');
    err.code = 'LIMIT_REACHED';
    err.name = 'FixedPoolCapacityError';
    return err;
}

function encryptNvrPassword(storageDir, password) {
    const plain = String(password == null ? '' : password);
    if (!plain) return '';
    const envelope = secretsVaultCrypto.encryptSecretsObject(storageDir, { nvrPassword: plain });
    return JSON.stringify(envelope);
}

function decryptNvrPassword(storageDir, encJson) {
    const raw = String(encJson || '').trim();
    if (!raw) return '';
    try {
        const envelope = JSON.parse(raw);
        if (!secretsVaultCrypto.isEncryptedEnvelope(envelope)) return '';
        const obj = secretsVaultCrypto.decryptSecretsObject(storageDir, envelope);
        return String((obj && obj.nvrPassword) || '');
    } catch (_) {
        return '';
    }
}

function normalizeProtocol(v) {
    return String(v || '').trim().toLowerCase() === 'rtsp_template' ? 'rtsp_template' : 'onvif';
}

function normalizeTransport(v) {
    return String(v || '').trim().toLowerCase() === 'udp' ? 'udp' : 'tcp';
}

function rowFromBody(body, storageDir, existingId) {
    const b = body || {};
    const password = b.password != null ? String(b.password) : '';
    return {
        id: String(existingId || b.id || nvrDeviceId()).trim(),
        name: String(b.name || '').trim(),
        vendor: String(b.vendor || '').trim(),
        host: String(b.host || '').trim(),
        http_port: parseInt(b.httpPort != null ? b.httpPort : b.http_port, 10) || 80,
        rtsp_port: parseInt(b.rtspPort != null ? b.rtspPort : b.rtsp_port, 10) || 554,
        username: String(b.username != null ? b.username : b.user || '').trim(),
        password_enc: encryptNvrPassword(storageDir, password),
        protocol: normalizeProtocol(b.protocol),
        onvif_device_path: String(
            b.onvifDevicePath != null ? b.onvifDevicePath : b.onvif_device_path || '/onvif/device_service'
        ).trim() || '/onvif/device_service',
        rtsp_transport: normalizeTransport(b.rtspTransport != null ? b.rtspTransport : b.rtsp_transport),
        rtsp_url_template: String(
            b.rtspUrlTemplate != null ? b.rtspUrlTemplate : b.rtsp_url_template || ''
        ).trim(),
        enabled: b.enabled !== false,
        notes: String(b.notes || '').trim(),
    };
}

function deviceToApi(row, storageDir, opts) {
    const includeSecrets = !!(opts && opts.includeSecrets);
    const password = includeSecrets ? decryptNvrPassword(storageDir, row.password_enc) : '';
    return {
        id: row.id,
        name: row.name || '',
        vendor: row.vendor || '',
        host: row.host || '',
        httpPort: Number(row.http_port) || 80,
        rtspPort: Number(row.rtsp_port) || 554,
        username: row.username || '',
        password: password,
        passwordStored: !!(row.password_enc && String(row.password_enc).trim()),
        protocol: row.protocol || 'onvif',
        onvifDevicePath: row.onvif_device_path || '/onvif/device_service',
        rtspTransport: row.rtsp_transport || 'tcp',
        rtspUrlTemplate: row.rtsp_url_template || '',
        enabled: row.enabled !== false,
        notes: row.notes || '',
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

function channelToApi(row) {
    return {
        nvrId: row.nvr_id,
        channelIndex: Number(row.channel_index),
        fixedCameraId: row.fixed_camera_id || null,
        onvifProfileToken: row.onvif_profile_token || '',
        name: row.name || '',
        enabled: row.enabled !== false,
    };
}

function countEnabledChannels(channels) {
    const list = Array.isArray(channels) ? channels : [];
    let n = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].enabled !== false) n += 1;
    }
    return n;
}

/** Count selectively provisioned channels (enabled only) — empty/unchecked do not consume slots. */
function countConfiguredChannels(channels) {
    const list = Array.isArray(channels) ? channels : [];
    let n = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].enabled !== false) n += 1;
    }
    return n;
}

/**
 * Unified fixed pool — ALL configured fixed cameras (enabled or not)
 * + unlinked nvr_channels (configured but not yet provisioned as a fixed cam).
 * When excludeNvrId is set (replace path), that NVR's children/channels are omitted
 * so the caller can add the full replacement set.
 */
async function countFixedPoolUsed(excludeNvrId) {
    assertReady();
    const cams = fixedCamRegistry.list();
    let n = 0;
    for (let i = 0; i < cams.length; i++) {
        const c = cams[i];
        if (excludeNvrId && String(c.parentNvrId || '') === String(excludeNvrId)) continue;
        n += 1;
    }
    let sql = `SELECT COUNT(*)::int AS n FROM nvr_channels
               WHERE (fixed_camera_id IS NULL OR TRIM(fixed_camera_id) = '')`;
    const params = [];
    if (excludeNvrId) {
        sql += ' AND nvr_id <> $1';
        params.push(String(excludeNvrId));
    }
    try {
        const r = await siteDb.query(sql, params);
        n += (r.rows[0] && r.rows[0].n) || 0;
    } catch (_e) {
        /* table may be mid-migrate — count fixed cams only */
    }
    return n;
}

/**
 * Pre-flight: deny when Current + New > Max (proposed total must be <= max).
 * For create (nvrId null): New = all channels in payload.
 * For replace (nvrId set): Current excludes that NVR; New = full replacement channel count.
 */
async function assertNvrChannelCapacity(nvrId, channels) {
    const addCount = countConfiguredChannels(channels);
    if (addCount < 1 && !nvrId) return { ok: true, allowed: true, current: 0, max: null };
    const current = await countFixedPoolUsed(nvrId || null);
    const proposed = current + addCount;
    const check = licenseManager.checkFixedCamLimit(proposed);
    if (!check.allowed) {
        throw FixedPoolCapacityError('Fixed camera pool limit reached.');
    }
    return check;
}

async function getFixedPoolCapacitySummary(excludeNvrId) {
    const used = await countFixedPoolUsed(excludeNvrId || null);
    const check = licenseManager.checkFixedCamLimit(used);
    return {
        used: used,
        max: check.max,
        remaining: check.remaining,
        unlimited: !!check.unlimited,
    };
}

function snapshotFixedCamJson() {
    return JSON.parse(JSON.stringify(fixedCamRegistry.list() || []));
}

async function restoreFixedCamJson(snapshot, storageDir) {
    const snap = Array.isArray(snapshot) ? snapshot : [];
    const snapIds = {};
    snap.forEach(function (c) { if (c && c.id) snapIds[String(c.id)] = true; });
    const before = fixedCamRegistry.list() || [];
    fixedCamRegistry.replaceAll(snap);
    /* Best-effort: remove PG rows created after snapshot */
    for (let i = 0; i < before.length; i++) {
        const id = before[i] && before[i].id;
        if (!id || snapIds[String(id)]) continue;
        try { await fixedCamCatalogPg.deleteFixedCamera(id); } catch (_e) { /* ignore */ }
    }
}

function parseChannelBody(b) {
    const channelIndex = parseInt(b.channelIndex != null ? b.channelIndex : b.channel_index, 10);
    if (!Number.isFinite(channelIndex) || channelIndex < 0) {
        throw new Error('channelIndex must be a non-negative integer.');
    }
    const fixedCameraIdRaw = b.fixedCameraId != null ? b.fixedCameraId : b.fixed_camera_id;
    const fixedCameraId = fixedCameraIdRaw != null && String(fixedCameraIdRaw).trim()
        ? String(fixedCameraIdRaw).trim()
        : null;
    return {
        channelIndex: channelIndex,
        fixedCameraId: fixedCameraId,
        name: String(b.name || '').trim(),
        onvifProfileToken: String(
            b.onvifProfileToken != null ? b.onvifProfileToken : b.onvif_profile_token || ''
        ).trim(),
        enabled: b.enabled !== false,
    };
}

async function removeProvisionedCamera(camId, storageDir) {
    const id = String(camId || '').trim();
    if (!id) return;
    fixedCamRegistry.remove(id);
    if (siteDb.isReady()) {
        try { await fixedCamCatalogPg.deleteFixedCamera(id); } catch (_) { /* ignore */ }
    }
}

/** Auto-register enabled NVR channel as a fixed camera (unchecked/disabled = no slot). */
async function provisionFixedCameraForChannel(nvrRow, storageDir, channelBody, passwordPlain, client) {
    const ch = parseChannelBody(channelBody);
    const channelName = ch.name || ('Channel ' + (ch.channelIndex + 1));
    const nvrName = String(nvrRow.name || nvrRow.host || 'NVR').trim();
    let camId = ch.fixedCameraId;
    const existing = camId ? fixedCamRegistry.getById(camId) : null;

    if (!ch.enabled) {
        if (existing) {
            await removeProvisionedCamera(camId, storageDir);
        }
        return null;
    }

    const camData = {
        name: channelName,
        streamSource: 'onvif',
        streamTransport: nvrRow.rtsp_transport || 'tcp',
        enabled: true,
        parentNvrId: String(nvrRow.id),
        nvrChannelIndex: ch.channelIndex,
        onvif: {
            host: nvrRow.host || '',
            port: Number(nvrRow.http_port) || 80,
            user: nvrRow.username || '',
            password: String(passwordPlain || ''),
            devicePath: nvrRow.onvif_device_path || '/onvif/device_service',
            rtspTransport: nvrRow.rtsp_transport || 'tcp',
        },
        notes: 'Auto-registered from ' + nvrName,
    };
    if (ch.onvifProfileToken) {
        camData.streamRoles = { live: ch.onvifProfileToken, record: ch.onvifProfileToken };
    }

    let saved;
    if (existing) {
        saved = fixedCamRegistry.update(camId, camData);
    } else {
        saved = fixedCamRegistry.add(camData);
        camId = saved.id;
    }
    if (camId && siteDb.isReady()) {
        await fixedCamCatalogPg.upsertFixedCamera(
            fixedCamRegistry.getById(camId) || saved,
            storageDir,
            client || null
        );
    }
    return camId || null;
}

async function resolveChannelsWithProvision(nvrRow, storageDir, channels, passwordPlain, client) {
    const list = Array.isArray(channels) ? channels : [];
    const resolved = [];
    for (let i = 0; i < list.length; i++) {
        const parsed = parseChannelBody(list[i]);
        const camId = await provisionFixedCameraForChannel(
            nvrRow, storageDir, parsed, passwordPlain, client
        );
        resolved.push({
            channelIndex: parsed.channelIndex,
            fixedCameraId: camId,
            name: parsed.name || ('Channel ' + (parsed.channelIndex + 1)),
            onvifProfileToken: parsed.onvifProfileToken,
            enabled: parsed.enabled,
        });
    }
    return resolved;
}

async function purgeOrphanProvisionedCameras(nvrId, keepChannelIndexes, storageDir) {
    const old = await listChannels(nvrId);
    const keep = {};
    (keepChannelIndexes || []).forEach(function (idx) { keep[String(idx)] = true; });
    for (let i = 0; i < old.length; i++) {
        const ch = old[i];
        if (keep[String(ch.channelIndex)]) continue;
        if (ch.fixedCameraId) await removeProvisionedCamera(ch.fixedCameraId, storageDir);
    }
}

async function insertChannelRows(nvrId, resolved, client) {
    for (let i = 0; i < resolved.length; i++) {
        const ch = resolved[i];
        await siteDb.query(`
            INSERT INTO nvr_channels (
                nvr_id, channel_index, fixed_camera_id, onvif_profile_token, name, enabled
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            String(nvrId), ch.channelIndex, ch.fixedCameraId, ch.onvifProfileToken, ch.name, ch.enabled,
        ], client);
    }
}

function assertReady() {
    if (!siteDb.isReady()) throw new Error('PostgreSQL catalog is not initialized');
}

async function listDevices(storageDir, opts) {
    assertReady();
    const r = await siteDb.query('SELECT * FROM nvr_devices ORDER BY name ASC, id ASC');
    return r.rows.map(function (row) {
        return deviceToApi(row, storageDir, opts);
    });
}

async function getDevice(id, storageDir, opts) {
    assertReady();
    const r = await siteDb.query('SELECT * FROM nvr_devices WHERE id = $1', [String(id)]);
    if (!r.rows[0]) return null;
    const device = deviceToApi(r.rows[0], storageDir, opts);
    device.channels = await listChannels(id);
    return device;
}

async function createDevice(body, storageDir) {
    assertReady();
    const row = rowFromBody(body, storageDir, null);
    if (!row.name) throw new Error('NVR name is required.');
    if (!row.host) throw new Error('NVR host is required.');
    await siteDb.query(`
        INSERT INTO nvr_devices (
            id, name, vendor, host, http_port, rtsp_port, username, password_enc,
            protocol, onvif_device_path, rtsp_transport, rtsp_url_template,
            enabled, notes, created_at, updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,
            $9,$10,$11,$12,
            $13,$14, NOW(), NOW()
        )
    `, [
        row.id, row.name, row.vendor, row.host, row.http_port, row.rtsp_port, row.username, row.password_enc,
        row.protocol, row.onvif_device_path, row.rtsp_transport, row.rtsp_url_template,
        row.enabled, row.notes,
    ]);
    return getDevice(row.id, storageDir, { includeSecrets: false });
}

/** Create NVR + channels atomically — JSON + PG; roll back JSON if PG fails. */
async function createDeviceWithChannels(body, channels, storageDir) {
    assertReady();
    const list = Array.isArray(channels) ? channels : [];
    await assertNvrChannelCapacity(null, list);
    const row = rowFromBody(body, storageDir, null);
    if (!row.name) throw new Error('NVR name is required.');
    if (!row.host) throw new Error('NVR host is required.');
    const passwordPlain = body && body.password != null
        ? String(body.password)
        : decryptNvrPassword(storageDir, row.password_enc);

    const snap = snapshotFixedCamJson();
    try {
        await siteDb.transaction(async function (client) {
            await siteDb.query(`
                INSERT INTO nvr_devices (
                    id, name, vendor, host, http_port, rtsp_port, username, password_enc,
                    protocol, onvif_device_path, rtsp_transport, rtsp_url_template,
                    enabled, notes, created_at, updated_at
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,
                    $9,$10,$11,$12,
                    $13,$14, NOW(), NOW()
                )
            `, [
                row.id, row.name, row.vendor, row.host, row.http_port, row.rtsp_port, row.username, row.password_enc,
                row.protocol, row.onvif_device_path, row.rtsp_transport, row.rtsp_url_template,
                row.enabled, row.notes,
            ], client);
            if (list.length) {
                const resolved = await resolveChannelsWithProvision(
                    row, storageDir, list, passwordPlain, client
                );
                await insertChannelRows(row.id, resolved, client);
            }
        });
    } catch (err) {
        await restoreFixedCamJson(snap, storageDir);
        throw err;
    }
    return getDevice(row.id, storageDir, { includeSecrets: false });
}

async function updateDevice(id, body, storageDir) {
    assertReady();
    const existing = await siteDb.query('SELECT * FROM nvr_devices WHERE id = $1', [String(id)]);
    if (!existing.rows[0]) return null;
    const row = rowFromBody(body, storageDir, String(id));
    if (!row.name) throw new Error('NVR name is required.');
    if (!row.host) throw new Error('NVR host is required.');
    await siteDb.query(`
        UPDATE nvr_devices SET
            name = $2,
            vendor = $3,
            host = $4,
            http_port = $5,
            rtsp_port = $6,
            username = $7,
            password_enc = CASE
                WHEN $8 = '' THEN nvr_devices.password_enc
                ELSE $8
            END,
            protocol = $9,
            onvif_device_path = $10,
            rtsp_transport = $11,
            rtsp_url_template = $12,
            enabled = $13,
            notes = $14,
            updated_at = NOW()
        WHERE id = $1
    `, [
        row.id, row.name, row.vendor, row.host, row.http_port, row.rtsp_port, row.username, row.password_enc,
        row.protocol, row.onvif_device_path, row.rtsp_transport, row.rtsp_url_template,
        row.enabled, row.notes,
    ]);
    return getDevice(row.id, storageDir, { includeSecrets: false });
}

async function deleteDevice(id, storageDir) {
    assertReady();
    const channels = await listChannels(id);
    for (let i = 0; i < channels.length; i++) {
        if (channels[i].fixedCameraId) {
            await removeProvisionedCamera(channels[i].fixedCameraId, storageDir);
        }
    }
    const r = await siteDb.query('DELETE FROM nvr_devices WHERE id = $1', [String(id)]);
    return r.rowCount > 0;
}

async function listChannels(nvrId) {
    assertReady();
    const r = await siteDb.query(
        'SELECT * FROM nvr_channels WHERE nvr_id = $1 ORDER BY channel_index ASC',
        [String(nvrId)]
    );
    return r.rows.map(channelToApi);
}

async function upsertChannel(nvrId, body, storageDir) {
    assertReady();
    const b = body || {};
    const channelIndex = parseInt(b.channelIndex != null ? b.channelIndex : b.channel_index, 10);
    if (!Number.isFinite(channelIndex) || channelIndex < 0) {
        throw new Error('channelIndex must be a non-negative integer.');
    }
    const parent = await siteDb.query('SELECT id FROM nvr_devices WHERE id = $1', [String(nvrId)]);
    if (!parent.rows[0]) throw new Error('NVR device not found.');

    const existing = await siteDb.query(
        'SELECT * FROM nvr_channels WHERE nvr_id = $1 AND channel_index = $2',
        [String(nvrId), channelIndex]
    );
    const prev = existing.rows[0] || null;
    const fixedCameraIdRaw = b.fixedCameraId != null ? b.fixedCameraId : b.fixed_camera_id;
    let fixedCameraId = fixedCameraIdRaw != null && String(fixedCameraIdRaw).trim()
        ? String(fixedCameraIdRaw).trim()
        : (prev && prev.fixed_camera_id ? String(prev.fixed_camera_id) : null);
    const name = String(b.name != null ? b.name : ((prev && prev.name) || '')).trim();
    const onvifProfileToken = String(
        b.onvifProfileToken != null ? b.onvifProfileToken
            : (b.onvif_profile_token != null ? b.onvif_profile_token
                : ((prev && prev.onvif_profile_token) || ''))
    ).trim();
    const enabled = b.enabled !== false;

    /* Capacity gate: new configured channel without an existing fixed cam → Current + 1 > Max? */
    const alreadyCounted = !!(fixedCameraId && fixedCamRegistry.getById(fixedCameraId));
    const needsSlot = !alreadyCounted && (!prev || !prev.fixed_camera_id);
    if (needsSlot) {
        const used = await countFixedPoolUsed(null);
        const check = licenseManager.checkFixedCamLimit(used + 1);
        if (!check.allowed) {
            throw FixedPoolCapacityError('Fixed camera pool limit reached.');
        }
    }

    await siteDb.query(`
        INSERT INTO nvr_channels (
            nvr_id, channel_index, fixed_camera_id, onvif_profile_token, name, enabled
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (nvr_id, channel_index) DO UPDATE SET
            fixed_camera_id = EXCLUDED.fixed_camera_id,
            onvif_profile_token = EXCLUDED.onvif_profile_token,
            name = EXCLUDED.name,
            enabled = EXCLUDED.enabled
    `, [String(nvrId), channelIndex, fixedCameraId, onvifProfileToken, name, enabled]);
    return channelToApi({
        nvr_id: String(nvrId),
        channel_index: channelIndex,
        fixed_camera_id: fixedCameraId,
        onvif_profile_token: onvifProfileToken,
        name: name,
        enabled: enabled,
    });
}

/** Replace all channels — atomic JSON+PG; roll back JSON if PG fails. */
async function replaceChannels(nvrId, channels, storageDir) {
    assertReady();
    const parent = await siteDb.query('SELECT * FROM nvr_devices WHERE id = $1', [String(nvrId)]);
    if (!parent.rows[0]) throw new Error('NVR device not found.');
    const nvrRow = parent.rows[0];
    const list = Array.isArray(channels) ? channels : [];
    await assertNvrChannelCapacity(String(nvrId), list);
    const passwordPlain = await getDevicePasswordPlain(nvrId, storageDir);

    const snap = snapshotFixedCamJson();
    try {
        /* Remove orphaned children from JSON before rebuild (inside try so rollback restores) */
        await purgeOrphanProvisionedCameras(
            nvrId,
            list.map(function (b) {
                return parseInt(b.channelIndex != null ? b.channelIndex : b.channel_index, 10);
            }),
            storageDir
        );
        await siteDb.transaction(async function (client) {
            await siteDb.query('DELETE FROM nvr_channels WHERE nvr_id = $1', [String(nvrId)], client);
            if (list.length) {
                const resolved = await resolveChannelsWithProvision(
                    nvrRow, storageDir, list, passwordPlain || '', client
                );
                await insertChannelRows(nvrId, resolved, client);
            }
        });
    } catch (err) {
        await restoreFixedCamJson(snap, storageDir);
        throw err;
    }
    return listChannels(nvrId);
}

async function renameChannel(nvrId, channelIndex, name, storageDir) {
    assertReady();
    const idx = parseInt(channelIndex, 10);
    if (!Number.isFinite(idx) || idx < 0) throw new Error('Invalid channel index.');
    const label = String(name || '').trim();
    if (!label) throw new Error('Channel name is required.');
    const r = await siteDb.query(
        'SELECT * FROM nvr_channels WHERE nvr_id = $1 AND channel_index = $2',
        [String(nvrId), idx]
    );
    if (!r.rows[0]) throw new Error('Channel not found.');
    await siteDb.query(
        'UPDATE nvr_channels SET name = $3 WHERE nvr_id = $1 AND channel_index = $2',
        [String(nvrId), idx, label]
    );
    const camId = r.rows[0].fixed_camera_id;
    if (camId) {
        fixedCamRegistry.update(String(camId), { name: label });
        if (siteDb.isReady()) {
            const cam = fixedCamRegistry.getById(String(camId));
            if (cam) await fixedCamCatalogPg.upsertFixedCamera(cam, storageDir);
        }
    }
    const updated = Object.assign({}, r.rows[0], { name: label });
    return channelToApi(updated);
}

async function listDevicesTree(storageDir) {
    assertReady();
    const devices = await listDevices(storageDir);
    const tree = [];
    for (let i = 0; i < devices.length; i++) {
        const full = await getDevice(devices[i].id, storageDir, { includeSecrets: false });
        if (!full) continue;
        tree.push({
            id: full.id,
            type: 'nvr',
            name: full.name || full.host || full.id,
            host: full.host || '',
            enabled: full.enabled !== false,
            children: (full.channels || []).map(function (ch) {
                return {
                    type: 'channel',
                    nvrId: full.id,
                    channelIndex: ch.channelIndex,
                    name: ch.name || ('Channel ' + (ch.channelIndex + 1)),
                    fixedCameraId: ch.fixedCameraId || null,
                    enabled: ch.enabled !== false,
                };
            }),
        });
    }
    return tree;
}

async function deleteChannel(nvrId, channelIndex) {
    assertReady();
    const idx = parseInt(channelIndex, 10);
    if (!Number.isFinite(idx)) throw new Error('Invalid channel index.');
    const r = await siteDb.query(
        'DELETE FROM nvr_channels WHERE nvr_id = $1 AND channel_index = $2',
        [String(nvrId), idx]
    );
    return r.rowCount > 0;
}

/** Resolve vault password for server-side ONVIF/RTSP use only — never send to client. */
async function getDevicePasswordPlain(id, storageDir) {
    assertReady();
    const r = await siteDb.query('SELECT password_enc FROM nvr_devices WHERE id = $1', [String(id)]);
    if (!r.rows[0]) return null;
    return decryptNvrPassword(storageDir, r.rows[0].password_enc);
}

/**
 * Startup: V1 NVRs with channels but no fixed_camera_id → silently provision children.
 * Does not force operators to re-save. Skips when capacity would be exceeded (logs warning).
 */
async function ensureLegacyNvrChildrenProvisioned(storageDir) {
    if (!siteDb.isReady()) return { ok: false, provisioned: 0 };
    assertReady();
    const devices = await listDevices(storageDir);
    let provisioned = 0;
    let skipped = 0;
    for (let d = 0; d < devices.length; d++) {
        const full = await getDevice(devices[d].id, storageDir, { includeSecrets: true });
        if (!full) continue;
        const channels = full.channels || [];
        const need = channels.filter(function (ch) {
            return ch.enabled !== false && !ch.fixedCameraId;
        });
        if (!need.length) continue;
        try {
            await assertNvrChannelCapacity(String(full.id), channels);
        } catch (capErr) {
            if (capErr && capErr.code === 'LIMIT_REACHED') {
                skipped += need.length;
                continue;
            }
            throw capErr;
        }
        const parentRow = {
            id: full.id,
            name: full.name,
            host: full.host,
            http_port: full.httpPort,
            username: full.username,
            onvif_device_path: full.onvifDevicePath,
            rtsp_transport: full.rtspTransport,
        };
        const passwordPlain = full.password || (await getDevicePasswordPlain(full.id, storageDir)) || '';
        const snap = snapshotFixedCamJson();
        try {
            await siteDb.transaction(async function (client) {
                for (let i = 0; i < need.length; i++) {
                    const ch = need[i];
                    const camId = await provisionFixedCameraForChannel(
                        parentRow, storageDir, ch, passwordPlain, client
                    );
                    if (!camId) continue;
                    await siteDb.query(
                        `UPDATE nvr_channels SET fixed_camera_id = $3
                         WHERE nvr_id = $1 AND channel_index = $2`,
                        [String(full.id), ch.channelIndex, camId],
                        client
                    );
                    provisioned += 1;
                }
            });
        } catch (err) {
            await restoreFixedCamJson(snap, storageDir);
            throw err;
        }
    }
    return { ok: true, provisioned: provisioned, skippedCapacity: skipped };
}

module.exports = {
    encryptNvrPassword,
    decryptNvrPassword,
    listDevices,
    listDevicesTree,
    getDevice,
    createDevice,
    createDeviceWithChannels,
    updateDevice,
    deleteDevice,
    listChannels,
    upsertChannel,
    replaceChannels,
    renameChannel,
    deleteChannel,
    getDevicePasswordPlain,
    ensureLegacyNvrChildrenProvisioned,
    countFixedPoolUsed,
    countEnabledChannels,
    assertNvrChannelCapacity,
    getFixedPoolCapacitySummary,
    FixedPoolCapacityError,
};
