/**
 * Real ONVIF client for fixed cameras (Profile S / T / G / M + PTZ + Events).
 *
 * Library: npm `onvif` (agsh/onvif) — SOAP Device/Media/PTZ/Events.
 *   const { Cam } = require('onvif');
 *   const { Cam: CamPromises } = require('onvif/promises');
 *
 * Task 2.5 hardening:
 *   - SetSystemDateAndTime when camera clock drifts (anti-replay)
 *   - Pull-Point event subscriptions (motion / line / tamper → console)
 *   - Profile M (Analytics) detection for future AI metadata
 */
'use strict';

const { Cam } = require('onvif');
const { Cam: CamPromises } = require('onvif/promises');

const CACHE_TTL_MS = 5 * 60 * 1000;
const CLOCK_DRIFT_SYNC_MS = Math.max(500, parseInt(process.env.FM_ONVIF_CLOCK_DRIFT_MS, 10) || 2000);
const streamCache = new Map();
const ptzSessionCache = new Map();
/** @type {Map<string, { client: object, cameraId: string, startedAt: number }>} */
const eventSubs = new Map();

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

function normalizeTransport(raw) {
    return String(raw || 'tcp').toLowerCase() === 'udp' ? 'udp' : 'tcp';
}

function resolveStreamTransport(camera) {
    if (!camera) return 'tcp';
    if (camera.streamTransport) return normalizeTransport(camera.streamTransport);
    if (camera.stream_transport) return normalizeTransport(camera.stream_transport);
    if (camera.onvif && camera.onvif.rtspTransport) return normalizeTransport(camera.onvif.rtspTransport);
    return 'tcp';
}

function onvifOptionsFromCamera(camera) {
    const config = (camera && camera.onvif) || camera || {};
    const host = cameraHost(config.host);
    return {
        hostname: host,
        port: parseInt(config.port, 10) || 80,
        username: String(config.user || ''),
        password: String(config.password || ''),
        path: String(config.devicePath || '/onvif/device_service'),
        timeout: 12000,
        preserveAddress: true,
    };
}

function getSystemDateAndTime(client) {
    return new Promise(function (resolve, reject) {
        if (!client || typeof client.getSystemDateAndTime !== 'function') {
            reject(new Error('ONVIF getSystemDateAndTime not available'));
            return;
        }
        client.getSystemDateAndTime(function (err, time) {
            if (err) reject(err);
            else resolve(time instanceof Date ? time : new Date(time));
        });
    });
}

function setSystemDateAndTime(client, dateTime) {
    return new Promise(function (resolve, reject) {
        if (!client || typeof client.setSystemDateAndTime !== 'function') {
            reject(new Error('ONVIF setSystemDateAndTime not available'));
            return;
        }
        const when = dateTime instanceof Date ? dateTime : new Date();
        client.setSystemDateAndTime({
            dateTimeType: 'Manual',
            daylightSavings: false,
            dateTime: when,
        }, function (err, time) {
            if (err) reject(err);
            else resolve(time instanceof Date ? time : when);
        });
    });
}

/**
 * Anti-replay: if camera UTC clock drifts beyond threshold, push Node server time via SetSystemDateAndTime.
 */
async function syncCameraClock(client, opts) {
    const threshold = (opts && opts.driftMs != null) ? Number(opts.driftMs) : CLOCK_DRIFT_SYNC_MS;
    const before = await getSystemDateAndTime(client);
    const serverNow = new Date();
    const driftMs = before.getTime() - serverNow.getTime();
    const abs = Math.abs(driftMs);
    if (!Number.isFinite(abs) || abs <= threshold) {
        return {
            synced: false,
            driftMs: driftMs,
            thresholdMs: threshold,
            cameraTime: before.toISOString(),
            serverTime: serverNow.toISOString(),
        };
    }
    const after = await setSystemDateAndTime(client, serverNow);
    return {
        synced: true,
        driftMs: driftMs,
        thresholdMs: threshold,
        cameraTimeBefore: before.toISOString(),
        cameraTimeAfter: after instanceof Date ? after.toISOString() : serverNow.toISOString(),
        serverTime: serverNow.toISOString(),
    };
}

/**
 * Authenticate (WS-UsernameToken via library) and connect, then clock-sync.
 */
function connectCam(onvifConfig, callback) {
    const opts = onvifOptionsFromCamera({ onvif: onvifConfig });
    const client = new Cam(Object.assign({}, opts, { autoconnect: false }));
    client.connect(function (err) {
        if (err) return callback(err);
        syncCameraClock(client).then(function (clock) {
            client._me8ClockSync = clock;
            callback(null, client, clock);
        }).catch(function (syncErr) {
            /* Non-fatal: some cameras deny SetSystemDateAndTime; keep session */
            client._me8ClockSync = { synced: false, error: syncErr && syncErr.message };
            callback(null, client, client._me8ClockSync);
        });
    });
}

function connectCamAsync(onvifConfig) {
    return new Promise(function (resolve, reject) {
        connectCam(onvifConfig, function (err, client) {
            if (err) reject(err);
            else resolve(client);
        });
    });
}

/**
 * Explicit GetCapabilities after auth — Profile S / T / G / M detection.
 */
function getCapabilities(client) {
    return new Promise(function (resolve, reject) {
        if (!client || typeof client.getCapabilities !== 'function') {
            reject(new Error('ONVIF getCapabilities not available'));
            return;
        }
        client.getCapabilities(function (err, capabilities) {
            if (err) reject(err);
            else resolve(capabilities || client.capabilities || {});
        });
    });
}

function capabilityHas(caps, names) {
    if (!caps || typeof caps !== 'object') return false;
    for (let i = 0; i < names.length; i++) {
        const n = names[i];
        if (caps[n] != null) return true;
        const lower = n.charAt(0).toLowerCase() + n.slice(1);
        if (caps[lower] != null) return true;
    }
    if (caps.Extension && typeof caps.Extension === 'object') {
        for (let j = 0; j < names.length; j++) {
            if (caps.Extension[names[j]] != null) return true;
        }
    }
    if (caps.device && typeof caps.device === 'object') {
        for (let k = 0; k < names.length; k++) {
            if (caps.device[names[k]] != null) return true;
        }
    }
    return false;
}

/**
 * Map GetCapabilities to ONVIF profile hints.
 * Profile S — streaming / PTZ (Media + PTZ)
 * Profile T — advanced streaming (Media2)
 * Profile G — edge recording / replay / search
 * Profile M — analytics / metadata (AI groundwork) — Access C/A/D ignored
 */
function detectProfiles(capabilities, client) {
    const caps = capabilities || (client && client.capabilities) || {};
    const media2 = !!(client && client.media2Support)
        || capabilityHas(caps, ['Media2', 'media2']);
    const ptz = capabilityHas(caps, ['PTZ', 'ptz'])
        || !!(client && client.uri && client.uri.ptz);
    const media = capabilityHas(caps, ['Media', 'media'])
        || !!(client && client.uri && client.uri.media);
    const recording = capabilityHas(caps, ['Recording', 'Replay', 'Search', 'recording', 'replay', 'search']);
    const events = capabilityHas(caps, ['Events', 'Event', 'events', 'event'])
        || !!(client && client.uri && client.uri.events);
    /* Profile M — Analytics / AnalyticsDevice / metadata streaming */
    const analytics = capabilityHas(caps, [
        'Analytics', 'AnalyticsDevice', 'analytics', 'analyticsDevice',
        'RuleEngine', 'Metadata', 'metadata',
    ]) || !!(client && client.uri && (client.uri.analytics || client.uri.analyticsDevice));
    return {
        profileS: media || ptz,
        profileT: media2,
        profileG: recording,
        profileM: analytics,
        hasPtz: ptz,
        hasMedia: media,
        hasMedia2: media2,
        hasRecording: recording,
        hasEvents: events,
        hasAnalytics: analytics,
        rawKeys: Object.keys(caps || {}),
    };
}

/**
 * Full probe: authenticate → clock sync → GetCapabilities → profile flags.
 */
async function authenticateAndProbe(camera) {
    if (!camera || !camera.onvif || !camera.onvif.host) {
        throw new Error('ONVIF host is not configured');
    }
    const client = await connectCamAsync(camera.onvif);
    const clock = client._me8ClockSync || null;
    const capabilities = await getCapabilities(client);
    const profiles = detectProfiles(capabilities, client);
    const profileToken = client.activeSource && client.activeSource.profileToken
        ? String(client.activeSource.profileToken)
        : null;
    /* Phase 1a — enumerate all media profiles (main + sub + any extra) */
    const streamProfiles = await fetchMediaProfiles(client);
    return {
        ok: true,
        hostname: cameraHost(camera.onvif.host),
        port: parseInt(camera.onvif.port, 10) || 80,
        profileToken: profileToken,
        profiles: profiles,
        streamProfiles: streamProfiles,
        clock: clock,
        streamTransport: resolveStreamTransport(camera),
        capabilities: capabilities,
        client: client,
    };
}

/**
 * Fetch all media profiles from the camera and return a clean, normalised array.
 * Each entry: { token, name, resolution: { width, height }, encoding }
 * Non-fatal: if the camera does not support getProfiles, returns [].
 */
function fetchMediaProfiles(client) {
    return new Promise(function (resolve) {
        if (!client || typeof client.getProfiles !== 'function') {
            return resolve([]);
        }
        client.getProfiles(function (err, rawProfiles) {
            if (err || !Array.isArray(rawProfiles)) return resolve([]);
            const profiles = rawProfiles.map(function (p) {
                const token  = String(p.$ && p.$.token ? p.$.token : (p.token || ''));
                const name   = String(p.name || p.Name || token);
                const vsc    = p.videoEncoderConfiguration || p.VideoEncoderConfiguration || {};
                const res    = vsc.resolution || vsc.Resolution || {};
                const width  = parseInt(res.width  || res.Width,  10) || 0;
                const height = parseInt(res.height || res.Height, 10) || 0;
                const encRaw = String(
                    vsc.encoding || vsc.Encoding || ''
                ).toUpperCase();
                let enc = encRaw;
                if (!enc) {
                    if (vsc.h265 || vsc.H265) enc = 'H265';
                    else if (vsc.jpeg || vsc.JPEG || vsc.mjpeg || vsc.MJPEG) enc = 'MJPEG';
                    else if (vsc.mpeg4 || vsc.MPEG4) enc = 'MPEG4';
                    else if (vsc.h264 || vsc.H264) enc = 'H264';
                }
                if (enc === 'JPEG') enc = 'MJPEG';
                if (enc === 'HEVC') enc = 'H265';
                return { token, name, resolution: { width, height }, encoding: enc || 'UNKNOWN' };
            }).filter(function (p) { return p.token; });
            resolve(profiles);
        });
    });
}

function profileTokenOf(client, explicit) {
    if (explicit) return String(explicit);
    if (client && client.activeSource && client.activeSource.profileToken) {
        return String(client.activeSource.profileToken);
    }
    throw new Error('ONVIF camera returned no media/PTZ profile token');
}

function setPreset(client, presetName, opts) {
    const name = String(presetName || '').trim();
    if (!name) return Promise.reject(new Error('presetName required'));
    const options = opts || {};
    const profileToken = profileTokenOf(client, options.profileToken);
    return new Promise(function (resolve, reject) {
        if (typeof client.setPreset !== 'function') {
            reject(new Error('ONVIF setPreset not available'));
            return;
        }
        const payload = { profileToken: profileToken, presetName: name };
        if (options.presetToken) payload.presetToken = String(options.presetToken);
        client.setPreset(payload, function (err, data, xml) {
            if (err) {
                reject(err);
                return;
            }
            let token = '';
            try {
                const resp = data && (data.setPresetResponse || data.SetPresetResponse);
                token = String(
                    (resp && (resp.presetToken || resp.PresetToken))
                    || (options.presetToken)
                    || name
                );
            } catch (_) {
                token = String(options.presetToken || name);
            }
            resolve({ presetToken: token, presetName: name, xml: xml || null });
        });
    });
}

function gotoPreset(client, presetToken, opts) {
    const token = String(presetToken || '').trim();
    if (!token) return Promise.reject(new Error('presetToken required'));
    const options = opts || {};
    const profileToken = profileTokenOf(client, options.profileToken);
    return new Promise(function (resolve, reject) {
        if (typeof client.gotoPreset !== 'function') {
            reject(new Error('ONVIF gotoPreset not available'));
            return;
        }
        client.gotoPreset({
            profileToken: profileToken,
            preset: token,
            speed: options.speed,
        }, function (err, data, xml) {
            if (err) reject(err);
            else resolve({ ok: true, presetToken: token, xml: xml || null });
        });
    });
}

function getPresets(client, opts) {
    const options = opts || {};
    const profileToken = profileTokenOf(client, options.profileToken);
    return new Promise(function (resolve, reject) {
        if (typeof client.getPresets !== 'function') {
            reject(new Error('ONVIF getPresets not available'));
            return;
        }
        client.getPresets({ profileToken: profileToken }, function (err, presets) {
            if (err) reject(err);
            else resolve(presets || {});
        });
    });
}

function topicText(message) {
    if (!message) return '';
    if (typeof message.topic === 'string') return message.topic;
    if (message.topic && typeof message.topic._ === 'string') return message.topic._;
    if (message.topic && message.topic.$ && message.topic.$.Dialect) {
        try { return JSON.stringify(message.topic); } catch (_) { /* fall */ }
    }
    try { return JSON.stringify(message.topic || message); } catch (_) { return ''; }
}

function classifyOnvifEvent(message) {
    const topic = topicText(message).toLowerCase();
    const blob = topic + ' ' + (function () {
        try { return JSON.stringify(message).toLowerCase(); } catch (_) { return ''; }
    })();
    let kind = 'other';
    if (/motion|cellmotion|vmmd|ruledetection.*motion/.test(blob)) kind = 'motion';
    else if (/linecrossing|line.?cross|tripwire|crossed/.test(blob)) kind = 'line_crossing';
    else if (/tamper|tampering|cover|defocus|scene.?change/.test(blob)) kind = 'tamper';
    else if (/intrusion|loiter|object.?left|abandoned/.test(blob)) kind = 'analytics';
    return { kind: kind, topic: topicText(message) };
}

function defaultEventLogger(cameraId, parsed, message, xml) {
    const line = '[onvif-event] cam=' + cameraId
        + ' kind=' + parsed.kind
        + ' topic=' + (parsed.topic || '(none)');
    try {
        console.log(line, {
            message: message,
            xmlPreview: xml ? String(xml).slice(0, 400) : null,
        });
    } catch (_) {
        console.log(line);
    }
}

/**
 * Create Pull-Point subscription and listen for camera alerts.
 * Library auto-loops PullMessages while an 'event' listener is attached.
 */
async function startEventSubscription(camera, opts) {
    if (!camera || !camera.id) throw new Error('Camera required');
    const cameraId = String(camera.id);
    if (eventSubs.has(cameraId)) {
        return { ok: true, cameraId: cameraId, already: true };
    }
    if (!camera.onvif || !camera.onvif.host) throw new Error('ONVIF host is not configured');
    const client = await connectCamAsync(camera.onvif);
    if (typeof client.createPullPointSubscription !== 'function') {
        throw new Error('ONVIF CreatePullPointSubscription not available on this device');
    }
    const onEvent = (opts && typeof opts.onEvent === 'function')
        ? opts.onEvent
        : function (parsed, message, xml) { defaultEventLogger(cameraId, parsed, message, xml); };
    const onError = (opts && typeof opts.onError === 'function')
        ? opts.onError
        : function (err) {
            console.warn('[onvif-event] cam=' + cameraId + ' error', err && err.message ? err.message : err);
        };

    function handler(message, xml) {
        const parsed = classifyOnvifEvent(message);
        try { onEvent(parsed, message, xml); } catch (_) { /* ignore listener errors */ }
    }
    function errHandler(err) {
        try { onError(err); } catch (_) { /* ignore */ }
    }

    client.on('event', handler);
    client.on('eventsError', errHandler);
    /* Attaching 'event' listener triggers Cam#_eventRequest → CreatePullPointSubscription */
    eventSubs.set(cameraId, {
        client: client,
        cameraId: cameraId,
        startedAt: Date.now(),
        handler: handler,
        errHandler: errHandler,
    });
    return { ok: true, cameraId: cameraId, already: false };
}

function stopEventSubscription(cameraId) {
    const id = String(cameraId || '');
    const sub = eventSubs.get(id);
    if (!sub) return { ok: true, stopped: false };
    try {
        if (sub.client) {
            if (sub.handler) sub.client.removeListener('event', sub.handler);
            if (sub.errHandler) sub.client.removeListener('eventsError', sub.errHandler);
            if (typeof sub.client.unsubscribe === 'function') {
                try { sub.client.unsubscribe(function () { /* ignore */ }); } catch (_) { /* ignore */ }
            }
        }
    } catch (_) { /* ignore */ }
    eventSubs.delete(id);
    return { ok: true, stopped: true };
}

function listEventSubscriptions() {
    const out = [];
    eventSubs.forEach(function (sub, id) {
        out.push({ cameraId: id, startedAt: sub.startedAt });
    });
    return out;
}

/**
 * Phase 1b: accept optional profileToken for sub-stream / main-stream selection.
 * Cache key is camId when no token (default), camId:token when a specific profile is requested.
 * Falls back to camera default if profileToken is not provided.
 */
async function resolveStreamUri(camera, profileToken) {
    if (!camera || !camera.id || !camera.onvif) throw new Error('ONVIF camera registration is incomplete');
    const cacheKey = profileToken ? (camera.id + ':' + String(profileToken)) : camera.id;
    const cached = streamCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;
    const config = camera.onvif;
    const client = new CamPromises({
        hostname: cameraHost(config.host),
        port: parseInt(config.port, 10) || 80,
        username: String(config.user || ''),
        password: String(config.password || ''),
        path: String(config.devicePath || '/onvif/device_service'),
        timeout: 12000,
        preserveAddress: true,
    });
    await client.connect();
    try {
        await syncCameraClock(client);
    } catch (_) { /* non-fatal */ }
    const streamParams = { protocol: 'RTSP' };
    if (profileToken) streamParams.ProfileToken = String(profileToken);
    const stream = await client.getStreamUri(streamParams);
    const rawUri = stream && (stream.uri || stream.Uri);
    if (!rawUri) throw new Error('ONVIF camera returned no RTSP stream URI');
    const resolved = {
        uri: withCredentials(rawUri, config.user, config.password),
        at: Date.now(),
        media2: !!client.media2Support,
        streamTransport: resolveStreamTransport(camera),
        profileToken: profileToken || null,
    };
    streamCache.set(cacheKey, resolved);
    return resolved;
}

/**
 * Phase 1b: profileToken passed through to resolveStreamUri for sub/main stream selection.
 */
async function resolveRegisteredStreamUri(camera, profileToken) {
    if (!camera) throw new Error('Registered fixed camera is required');
    if (camera.streamSource === 'onvif') {
        try {
            return await resolveStreamUri(camera, profileToken || null);
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
        streamTransport: resolveStreamTransport(camera),
    };
}

async function getPtzSession(camera) {
    if (!camera || !camera.id) throw new Error('Camera required');
    const cached = ptzSessionCache.get(camera.id);
    if (cached && cached.client) return cached;
    const probe = await authenticateAndProbe(camera);
    if (!probe.profileToken) throw new Error('ONVIF camera returned no PTZ profile');
    const session = {
        client: probe.client,
        token: probe.profileToken,
        profiles: probe.profiles,
        clock: probe.clock,
        stopTimer: null,
        lastCommandAt: 0,
    };
    ptzSessionCache.set(camera.id, session);
    return session;
}

function clearPtzSession(id) {
    if (id) ptzSessionCache.delete(String(id));
}

function clearCamera(id) {
    if (id) {
        streamCache.delete(String(id));
        ptzSessionCache.delete(String(id));
        stopEventSubscription(id);
    }
}

module.exports = {
    Cam,
    CamPromises,
    connectCam,
    connectCamAsync,
    syncCameraClock,
    getSystemDateAndTime,
    setSystemDateAndTime,
    getCapabilities,
    detectProfiles,
    fetchMediaProfiles,
    authenticateAndProbe,
    setPreset,
    gotoPreset,
    getPresets,
    resolveStreamUri,
    resolveRegisteredStreamUri,
    resolveStreamTransport,
    normalizeTransport,
    getPtzSession,
    clearPtzSession,
    clearCamera,
    profileTokenOf,
    startEventSubscription,
    stopEventSubscription,
    listEventSubscriptions,
    classifyOnvifEvent,
};
