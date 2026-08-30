/**
 * Fixed camera PostgreSQL catalog — ONVIF passwords stored as vault AES-256-GCM envelopes.
 */
'use strict';

const siteDb = require('./siteDb');
const secretsVaultCrypto = require('./secretsVaultCrypto');
const { fixedCamId } = require('./secureId');

function encryptOnvifPassword(storageDir, password) {
    const plain = String(password == null ? '' : password);
    if (!plain) return '';
    const envelope = secretsVaultCrypto.encryptSecretsObject(storageDir, { onvifPassword: plain });
    return JSON.stringify(envelope);
}

function decryptOnvifPassword(storageDir, encJson) {
    const raw = String(encJson || '').trim();
    if (!raw) return '';
    try {
        const envelope = JSON.parse(raw);
        if (!secretsVaultCrypto.isEncryptedEnvelope(envelope)) return '';
        const obj = secretsVaultCrypto.decryptSecretsObject(storageDir, envelope);
        return String((obj && obj.onvifPassword) || '');
    } catch (_) {
        return '';
    }
}

function rowFromCam(cam, storageDir) {
    const onvif = cam.onvif || {};
    const password = onvif.password != null ? String(onvif.password) : '';
    const transport = String(
        cam.streamTransport || cam.stream_transport || onvif.rtspTransport || 'tcp'
    ).toLowerCase() === 'udp' ? 'udp' : 'tcp';
    return {
        id: String(cam.id || fixedCamId()),
        name: String(cam.name || '').trim(),
        lat: Number(cam.lat) || 0,
        lng: Number(cam.lng) || 0,
        zone: String(cam.zone || '').trim(),
        map_icon: String(cam.mapIcon || 'fixed'),
        stream_source: String(cam.streamSource || 'none'),
        stream_transport: transport,
        rtsp_url: String(cam.rtspUrl || '').trim(),
        onvif_host: String(onvif.host || '').trim(),
        onvif_port: parseInt(onvif.port, 10) || 80,
        onvif_user: String(onvif.user || '').trim(),
        onvif_password_enc: encryptOnvifPassword(storageDir, password),
        onvif_device_path: String(onvif.devicePath || '/onvif/device_service').trim(),
        onvif_rtsp_transport: transport,
        ptz_enabled: !!cam.ptzEnabled,
        enabled: cam.enabled !== false,
        notes: String(cam.notes || '').trim(),
        parent_nvr_id: cam.parentNvrId != null ? String(cam.parentNvrId).trim() || null
            : (cam.parent_nvr_id != null ? String(cam.parent_nvr_id).trim() || null : null),
        nvr_channel_index: cam.nvrChannelIndex != null && Number.isFinite(parseInt(cam.nvrChannelIndex, 10))
            ? parseInt(cam.nvrChannelIndex, 10)
            : (cam.nvr_channel_index != null && Number.isFinite(parseInt(cam.nvr_channel_index, 10))
                ? parseInt(cam.nvr_channel_index, 10) : null),
    };
}

async function upsertFixedCamera(cam, storageDir, client) {
    if (!siteDb.isReady()) throw new Error('PostgreSQL catalog is not initialized');
    const row = rowFromCam(cam, storageDir);
    await siteDb.query(`
        INSERT INTO fixed_cameras (
            id, name, lat, lng, zone, map_icon, stream_source, stream_transport, rtsp_url,
            onvif_host, onvif_port, onvif_user, onvif_password_enc, onvif_device_path,
            onvif_rtsp_transport, ptz_enabled, enabled, notes, parent_nvr_id, nvr_channel_index,
            created_at, updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,
            $10,$11,$12,$13,$14,
            $15,$16,$17,$18,$19,$20, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            zone = EXCLUDED.zone,
            map_icon = EXCLUDED.map_icon,
            stream_source = EXCLUDED.stream_source,
            stream_transport = EXCLUDED.stream_transport,
            rtsp_url = EXCLUDED.rtsp_url,
            onvif_host = EXCLUDED.onvif_host,
            onvif_port = EXCLUDED.onvif_port,
            onvif_user = EXCLUDED.onvif_user,
            onvif_password_enc = CASE
                WHEN EXCLUDED.onvif_password_enc = '' THEN fixed_cameras.onvif_password_enc
                ELSE EXCLUDED.onvif_password_enc
            END,
            onvif_device_path = EXCLUDED.onvif_device_path,
            onvif_rtsp_transport = EXCLUDED.onvif_rtsp_transport,
            ptz_enabled = EXCLUDED.ptz_enabled,
            enabled = EXCLUDED.enabled,
            notes = EXCLUDED.notes,
            parent_nvr_id = EXCLUDED.parent_nvr_id,
            nvr_channel_index = EXCLUDED.nvr_channel_index,
            updated_at = NOW()
    `, [
        row.id, row.name, row.lat, row.lng, row.zone, row.map_icon, row.stream_source, row.stream_transport, row.rtsp_url,
        row.onvif_host, row.onvif_port, row.onvif_user, row.onvif_password_enc, row.onvif_device_path,
        row.onvif_rtsp_transport, row.ptz_enabled, row.enabled, row.notes, row.parent_nvr_id, row.nvr_channel_index,
    ], client);
    return row.id;
}

async function upsertFixedCameras(cams, storageDir) {
    const ids = [];
    for (let i = 0; i < (cams || []).length; i++) {
        ids.push(await upsertFixedCamera(cams[i], storageDir));
    }
    return ids;
}

async function deleteFixedCamera(id) {
    if (!siteDb.isReady()) return false;
    const r = await siteDb.query('DELETE FROM fixed_cameras WHERE id = $1', [String(id)]);
    return r.rowCount > 0;
}

async function listFixedCameras(storageDir, opts) {
    if (!siteDb.isReady()) return [];
    const includeSecrets = !!(opts && opts.includeSecrets);
    const r = await siteDb.query('SELECT * FROM fixed_cameras ORDER BY name ASC, id ASC');
    return r.rows.map(function (row) {
        const password = includeSecrets
            ? decryptOnvifPassword(storageDir, row.onvif_password_enc)
            : '';
        return {
            id: row.id,
            name: row.name,
            lat: Number(row.lat) || 0,
            lng: Number(row.lng) || 0,
            zone: row.zone || '',
            mapIcon: row.map_icon || 'fixed',
            streamSource: row.stream_source || 'none',
            streamTransport: row.stream_transport || row.onvif_rtsp_transport || 'tcp',
            rtspUrl: row.rtsp_url || '',
            onvif: {
                host: row.onvif_host || '',
                port: Number(row.onvif_port) || 80,
                user: row.onvif_user || '',
                password: password,
                devicePath: row.onvif_device_path || '/onvif/device_service',
                rtspTransport: row.stream_transport || row.onvif_rtsp_transport || 'tcp',
            },
            ptzEnabled: !!row.ptz_enabled,
            enabled: row.enabled !== false,
            notes: row.notes || '',
            parentNvrId: row.parent_nvr_id || null,
            nvrChannelIndex: row.nvr_channel_index != null ? Number(row.nvr_channel_index) : null,
            passwordStored: !!(row.onvif_password_enc && String(row.onvif_password_enc).trim()),
        };
    });
}

module.exports = {
    encryptOnvifPassword,
    decryptOnvifPassword,
    upsertFixedCamera,
    upsertFixedCameras,
    deleteFixedCamera,
    listFixedCameras,
};
