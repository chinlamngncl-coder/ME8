/**
 * LiveKit (open-source WebRTC SFU) — tokens, ingress, egress recording.
 * Isolated from SOS / dashboard JSMpeg live path.
 */
const path = require('path');
const fs = require('fs');
const conferenceConfig = require('./conferenceConfig');
const {
    AccessToken,
    IngressClient,
    IngressInput,
    EgressClient,
    EncodedFileType,
    RoomServiceClient,
} = require('livekit-server-sdk');

function isLocalLivekitHost(url) {
    return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(String(url || ''));
}

function toWsUrl(raw) {
    return String(raw || '').trim().replace(/^http/i, 'ws').replace(/\/$/, '');
}

/**
 * URL phones/browsers use. Server API may stay on 127.0.0.1; clients must get a reachable host.
 * Priority: FM_LIVEKIT_PUBLIC_WS → saved settings → site HOST → non-localhost only.
 */
function resolveClientWsUrl(cfg, apiUrl) {
    const port = String((cfg && cfg.publicHttpPort) || process.env.FM_LIVEKIT_PUBLIC_PORT || '7880').trim();
    const fromEnv = toWsUrl(process.env.FM_LIVEKIT_PUBLIC_WS || process.env.FM_LIVEKIT_CLIENT_WS || '');
    const fromCfg = toWsUrl(cfg && cfg.publicWsUrl);
    const siteHost = String((cfg && cfg.siteHost) || process.env.HOST || process.env.FM_GB28181_PUBLIC_HOST || '').trim();
    const fromSite = siteHost && !isLocalLivekitHost(siteHost)
        ? ('ws://' + siteHost + ':' + port)
        : '';
    const candidates = [fromEnv, fromCfg, fromSite].filter(Boolean);
    const reachable = candidates.find(function (u) { return !isLocalLivekitHost(u); });
    if (reachable) return reachable;
    if (fromEnv) return fromEnv;
    if (fromCfg) return fromCfg;
    if (fromSite) return fromSite;
    return toWsUrl(apiUrl) || 'ws://127.0.0.1:7880';
}

function clientWsUrlFromRequest(req, c) {
    c = c || readConfig();
    if (!isLocalLivekitHost(c.url)) return c.wsUrl;
    const hostHeader = req && (req.headers['x-forwarded-host'] || req.headers.host);
    if (!hostHeader) return null;
    const hostOnly = String(hostHeader).split(',')[0].trim().split(':')[0];
    if (!hostOnly || hostOnly === 'localhost' || hostOnly === '127.0.0.1') return null;
    const port = String(process.env.FM_LIVEKIT_PUBLIC_PORT || '7880').trim();
    const secure = !!(req && (req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'));
    return (secure ? 'wss' : 'ws') + '://' + hostOnly + ':' + port;
}

function readConfig() {
    const cfg = conferenceConfig.getRuntime ? conferenceConfig.getRuntime() : null;
    const url = String((cfg && cfg.apiUrl) || process.env.FM_LIVEKIT_URL || '').trim().replace(/\/$/, '');
    const apiKey = String((cfg && cfg.apiKey) || process.env.FM_LIVEKIT_API_KEY || '').trim();
    const apiSecret = String((cfg && cfg.apiSecret) || process.env.FM_LIVEKIT_API_SECRET || '').trim();
    const clientWs = resolveClientWsUrl(cfg, url);
    return {
        url,
        apiKey,
        apiSecret,
        wsUrl: url.replace(/^http/, 'ws'),
        clientWsUrl: clientWs,
        enabled: !!(url && apiKey && apiSecret),
        turnUrl: String((cfg && cfg.turnUrl) || process.env.FM_LIVEKIT_TURN_URL || '').trim(),
        edgeUrl: String((cfg && cfg.edgeUrl) || process.env.FM_LIVEKIT_EDGE_URL || '').trim(),
        iceNodeIp: (cfg && cfg.iceNodeIp) || null,
        deployMode: (cfg && cfg.deployMode) || null,
    };
}

/** WebSocket URL clients (browser / phone) use — not the server-side API URL. */
function clientWsUrlForRequest(req) {
    const c = readConfig();
    if (c.clientWsUrl && !isLocalLivekitHost(c.clientWsUrl)) return c.clientWsUrl;
    const fromRequest = clientWsUrlFromRequest(req, c);
    if (fromRequest) return fromRequest;
    return c.clientWsUrl || c.wsUrl;
}


function isEnabled() {
    return readConfig().enabled;
}

function publicStatus() {
    const c = readConfig();
    return {
        enabled: c.enabled,
        url: c.enabled ? c.url : null,
        wsUrl: c.enabled ? c.wsUrl : null,
        clientWsUrl: c.enabled ? c.clientWsUrl : null,
        iceNodeIp: c.iceNodeIp || null,
        deployMode: c.deployMode || null,
        turnUrl: c.turnUrl || null,
        edgeUrl: c.edgeUrl || null,
        openSource: 'WebRTC SFU (Apache-2.0)',
        docsUrl: 'https://docs.livekit.io',
    };
}

function roomService() {
    const c = readConfig();
    if (!c.enabled) throw new Error('LiveKit is not configured (FM_LIVEKIT_URL, FM_LIVEKIT_API_KEY, FM_LIVEKIT_API_SECRET)');
    return new RoomServiceClient(c.url, c.apiKey, c.apiSecret);
}

function ingressClient() {
    const c = readConfig();
    if (!c.enabled) throw new Error('LiveKit is not configured');
    return new IngressClient(c.url, c.apiKey, c.apiSecret);
}

function egressClient() {
    const c = readConfig();
    if (!c.enabled) throw new Error('LiveKit is not configured');
    return new EgressClient(c.url, c.apiKey, c.apiSecret);
}

async function ensureRoom(roomName) {
    const svc = roomService();
    try {
        await svc.createRoom({
            name: roomName,
            emptyTimeout: 600,
            maxParticipants: 12,
        });
    } catch (err) {
        if (!/already exists/i.test(String(err.message || ''))) throw err;
    }
}

async function buildToken(opts) {
    const c = readConfig();
    if (!c.enabled) throw new Error('LiveKit is not configured');
    const {
        roomName,
        identity,
        name,
        metadata,
        canPublish = true,
        canSubscribe = true,
        canPublishData = true,
        hidden = false,
    } = opts || {};
    if (!roomName || !identity) throw new Error('roomName and identity required');
    const at = new AccessToken(c.apiKey, c.apiSecret, {
        identity: String(identity),
        name: name ? String(name) : String(identity),
        metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: !!canPublish,
        canSubscribe: !!canSubscribe,
        canPublishData: !!canPublishData,
        hidden: !!hidden,
    });
    return await at.toJwt();
}

async function createBwcIngress(roomName, camId, displayName) {
    await ensureRoom(roomName);
    const client = ingressClient();
    let info;
    try {
        info = await client.createIngress(IngressInput.RTMP_INPUT, {
            name: 'bwc-' + camId,
            roomName,
            participantIdentity: 'bwc-' + camId,
            participantName: displayName || ('BWC ' + camId),
            enableTranscoding: true,
        });
    } catch (err) {
        const msg = String(err && err.message || err);
        if (/redis required|ingress not connected/i.test(msg)) {
            throw new Error('BWC live share is not enabled on this LiveKit server. For people-only meetings, use Join room — ignore Add BWC.');
        }
        throw err;
    }
    const url = info.url || info.streamUrl || '';
    const streamKey = info.streamKey || info.stream_key || '';
    const rtmpUrl = url && streamKey
        ? (url.endsWith('/') ? url + streamKey : url + '/' + streamKey)
        : (url && !streamKey ? url : '');
    if (!rtmpUrl) {
        throw new Error('LiveKit Ingress is not running — run scripts\\START-LIVEKIT.ps1 (starts the ingress container), then try Add to Room again.');
    }
    return {
        ingressId: info.ingressId,
        roomName,
        rtmpUrl,
        url,
        streamKey,
    };
}

async function deleteIngress(ingressId) {
    if (!ingressId) return;
    try {
        await ingressClient().deleteIngress(ingressId);
    } catch (_) { /* ignore */ }
}

async function startRoomCompositeEgress(roomName, recordingId, recordingsDir) {
    fs.mkdirSync(recordingsDir, { recursive: true });
    const hostPath = path.join(recordingsDir, recordingId + '.mp4');
    const prefix = String(process.env.FM_LIVEKIT_EGRESS_PATH || '/recordings').replace(/\\/g, '/').replace(/\/$/, '');
    const egressFile = prefix + '/' + recordingId + '.mp4';
    const client = egressClient();
    let info;
    try {
        info = await client.startRoomCompositeEgress(roomName, {
            file: {
                fileType: EncodedFileType.MP4,
                filepath: egressFile,
            },
        });
    } catch (err) {
        const msg = String(err && err.message || err);
        if (/503|unavailable|egress|redis/i.test(msg)) {
            throw new Error('Recording service not running — run scripts/START-LIVEKIT.ps1 (includes egress), then try Record again.');
        }
        throw err;
    }
    return {
        egressId: info.egressId || info.egress_id,
        filePath: hostPath,
    };
}

async function stopEgress(egressId) {
    if (!egressId) return null;
    try {
        return await egressClient().stopEgress(egressId);
    } catch (_) {
        return null;
    }
}

async function listParticipants(roomName) {
    try {
        return await roomService().listParticipants(roomName);
    } catch (_) {
        return [];
    }
}

async function sendRoomData(roomName, payload) {
    const svc = roomService();
    const buf = Buffer.from(JSON.stringify(payload || {}), 'utf8');
    await svc.sendData(roomName, buf, 1, {});
}

/** Notify clients then tear down the LiveKit room (End room / briefing shutdown). */
async function shutdownRoom(roomName, meta) {
    if (!roomName) return { ok: false, reason: 'no_room' };
    const c = readConfig();
    if (!c.enabled) return { ok: false, reason: 'livekit_disabled' };
    const payload = Object.assign({ type: 'vc-room-ended' }, meta || {});
    try {
        await sendRoomData(roomName, payload);
    } catch (_) { /* room may already be empty */ }
    const svc = roomService();
    try {
        await svc.deleteRoom(roomName);
        return { ok: true, deleted: true };
    } catch (err) {
        try {
            const res = await svc.listParticipants(roomName);
            const list = participantList(res);
            for (const p of list) {
                try {
                    await svc.removeParticipant(roomName, p.identity);
                } catch (_) { /* ignore */ }
            }
            return { ok: true, participantsRemoved: list.length };
        } catch (_) {
            return { ok: false, reason: String((err && err.message) || err) };
        }
    }
}

function trackIsAudioPublished(t) {
    if (!t || !t.sid) return false;
    const typeNum = typeof t.type === 'number' ? t.type : parseInt(t.type, 10);
    if (typeNum === 0) return true;
    const typeStr = String(t.type || '').toUpperCase();
    if (typeStr === 'AUDIO') return true;
    const sourceStr = String(t.source || '').toUpperCase();
    if (sourceStr === 'MICROPHONE' || sourceStr === 'SCREEN_SHARE_AUDIO') return true;
    const mime = String(t.mimeType || t.mime_type || '').toLowerCase();
    if (mime.indexOf('audio') >= 0) return true;
    const name = String(t.name || '').toLowerCase();
    return name.indexOf('audio') >= 0;
}

/** Mute or unmute a participant's microphone / ingress audio track(s). */
async function setParticipantMicMuted(roomName, identity, muted) {
    const svc = roomService();
    const res = await svc.listParticipants(roomName);
    const list = (res && res.participants) ? res.participants : [];
    const p = list.find(function (x) { return String(x.identity) === String(identity); });
    if (!p) return { ok: false, reason: 'not_in_room' };
    let changed = 0;
    for (const t of (p.tracks || [])) {
        if (!trackIsAudioPublished(t)) continue;
        const wantMute = !!muted;
        if (!!t.muted !== wantMute) {
            await svc.mutePublishedTrack(roomName, identity, t.sid, wantMute);
            changed += 1;
        }
    }
    return { ok: true, changed: changed };
}

/** LiveKit mutePublishedTrack for BWC ingress participant (identity bwc-{camId}). */
async function setBwcIngressAudioMuted(roomName, camId, muted) {
    const id = String(camId || '').trim();
    if (!id) return { ok: false, reason: 'camId_required' };
    return setParticipantMicMuted(roomName, 'bwc-' + id, muted);
}

function participantList(res) {
    if (Array.isArray(res)) return res;
    return (res && res.participants) ? res.participants : [];
}

/** Mute all remote microphone tracks except identities in skipIdentities. */
async function muteAllRemoteAudio(roomName, skipIdentities) {
    const skip = new Set((skipIdentities || []).map(String));
    const svc = roomService();
    const res = await svc.listParticipants(roomName);
    const list = participantList(res);
    let muted = 0;
    for (const p of list) {
        if (skip.has(String(p.identity))) continue;
        for (const t of (p.tracks || [])) {
            if (!trackIsAudioPublished(t) || t.muted) continue;
            await svc.mutePublishedTrack(roomName, p.identity, t.sid, true);
            muted += 1;
        }
    }
    try {
        await sendRoomData(roomName, { type: 'vc-mute-all' });
    } catch (_) { /* optional sync packet */ }
    return { muted: muted };
}

module.exports = {
    readConfig,
    isEnabled,
    publicStatus,
    ensureRoom,
    buildToken,
    createBwcIngress,
    deleteIngress,
    startRoomCompositeEgress,
    stopEgress,
    listParticipants,
    muteAllRemoteAudio,
    sendRoomData,
    shutdownRoom,
    setParticipantMicMuted,
    setBwcIngressAudioMuted,
    clientWsUrlForRequest,
    isLocalLivekitHost,
};
