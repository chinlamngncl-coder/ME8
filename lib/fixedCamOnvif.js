const { Cam } = require('onvif/promises');

const CACHE_TTL_MS = 5 * 60 * 1000;
const streamCache = new Map();

function cameraHost(rawHost) {
    const raw = String(rawHost || '').trim();
    if (!raw) throw new Error('ONVIF camera host is required');
    if (!/^https?:\/\//i.test(raw)) return raw;
    return new URL(raw).hostname;
}

function withCredentials(rawUri, username, password) {
    const parsed = new URL(String(rawUri || '').trim());
    if (!parsed.username && username) parsed.username = String(username);
    if (!parsed.password && password) parsed.password = String(password);
    return parsed.toString();
}

async function resolveStreamUri(camera) {
    if (!camera || !camera.id || !camera.onvif) throw new Error('ONVIF camera registration is incomplete');
    const cached = streamCache.get(camera.id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;
    const config = camera.onvif;
    const client = new Cam({
        hostname: cameraHost(config.host),
        port: parseInt(config.port, 10) || 80,
        username: String(config.user || ''),
        password: String(config.password || ''),
        path: String(config.devicePath || '/onvif/device_service'),
        timeout: 12000,
        preserveAddress: true,
    });
    await client.connect();
    const stream = await client.getStreamUri({ protocol: 'RTSP' });
    const rawUri = stream && (stream.uri || stream.Uri);
    if (!rawUri) throw new Error('ONVIF camera returned no RTSP stream URI');
    const resolved = {
        uri: withCredentials(rawUri, config.user, config.password),
        at: Date.now(),
        media2: !!client.media2Support,
    };
    streamCache.set(camera.id, resolved);
    return resolved;
}

async function resolveRegisteredStreamUri(camera) {
    if (!camera) throw new Error('Registered fixed camera is required');
    if (camera.streamSource === 'onvif') {
        try {
            return await resolveStreamUri(camera);
        } catch (err) {
            if (!String(camera.rtspUrl || '').trim()) throw err;
        }
    }
    const raw = String(camera.rtspUrl || '').trim();
    if (!raw) throw new Error('Registered fixed camera has no RTSP stream URL');
    const onvif = camera.onvif || {};
    return {
        uri: withCredentials(raw, onvif.user, onvif.password),
        at: Date.now(),
        fallback: camera.streamSource === 'onvif',
    };
}

function clearCamera(id) {
    if (id) streamCache.delete(String(id));
}

module.exports = {
    resolveStreamUri,
    resolveRegisteredStreamUri,
    clearCamera,
};
