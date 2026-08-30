'use strict';
/**
 * ANPR live control plane — ARCHITECTURE.md RULE 1–2.
 *
 * Default: FM_ANPR_NATIVE_INGEST=1
 *   Node = license + stream URL handshake + event poll (no ffmpeg grab).
 *   Python sidecar = cv2.VideoCapture + blur + 10s dedupe + OCR.
 *
 * Hatch: FM_ANPR_NATIVE_INGEST=0 → legacy in-process Node grab runtime.
 */
const runtime = require('./anprLivePollerRuntime');

const NATIVE = String(process.env.FM_ANPR_NATIVE_INGEST || '1').trim() !== '0';

if (!NATIVE) {
    module.exports = runtime;
    module.exports.notifyCamFlvReady = function () { /* hatch: no native watch */ };
} else {
    const anprSidecarClient = require('./anprSidecarClient');

let deps = null;
    /** @type {Map<string, { camIds: string[], flvByCam: Object, at: number }>} */
const watchBySocket = new Map();
    /** @type {Map<string, string>} camId → streamUrl last sent */
    const activeNative = new Map();
    /** @type {Map<string, number>} last skip-log ms per cam */
    const skipLogAt = new Map();
    let syncTimer = null;
    let eventTimer = null;

    function flvFromWatchSockets(camId) {
    const id = String(camId || '');
        if (!id) return null;
        let found = null;
        watchBySocket.forEach((row) => {
            if (found) return;
            const m = row && row.flvByCam;
            if (!m || typeof m !== 'object') return;
            const u = m[id];
            if (u && typeof u === 'string' && /^https?:\/\//i.test(u.trim())) {
                found = String(u).trim();
            }
        });
        return found;
    }

    function resolveWatchUrl(camId) {
        // Prefer per-cam URL from UI (tile already has handoff). Else read-only WVP map.
        // Never ensurePlay. Multi-BWC: each camId keeps its own URL.
        return flvFromWatchSockets(camId) || resolveFlv(camId);
}

function unionCamIds() {
    const seen = Object.create(null);
    const out = [];
    watchBySocket.forEach((row) => {
        (row.camIds || []).forEach((id) => {
            if (seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
    });
        return out.slice(0, runtime.MAX_CAMS || 4);
    }

    function logSkip(camId, reason) {
        const id = String(camId || '');
        const now = Date.now();
        const prev = skipLogAt.get(id) || 0;
        if (now - prev < 5000) return;
        skipLogAt.set(id, now);
        console.log('[anpr-native] skip watchStart', id, reason);
    }

    function resolveFlv(camId) {
        // READ-ONLY — never ensurePlay / startPlay from ANPR. WVP play is owned by
        // wall / live tile handoff. Stealing that path harms concurrent stream base.
        try {
            const wvp = require('./wvpVideoHandoff');
            if (wvp.isHandoffEnabled && wvp.isHandoffEnabled()
                && wvp.getUpstreamFlv) {
                const up = wvp.getUpstreamFlv(camId);
                if (up) return String(up);
        }
    } catch (_) { /* ignore */ }
        return null;
    }

    function isLicensed() {
        try {
            return !!(deps && deps.isAnprLicensed && deps.isAnprLicensed());
        } catch (_) {
                return false;
        }
    }

    async function syncNativeWatches() {
        if (!isLicensed()) {
            const ids = Array.from(activeNative.keys());
            for (let i = 0; i < ids.length; i++) {
                try { await anprSidecarClient.watchStop(ids[i]); } catch (_) { /* ignore */ }
                activeNative.delete(ids[i]);
            }
        return;
    }
        const want = unionCamIds();
        // Empty watch set → MUST kill every native capture/OCR thread (no early return).
        if (!want.length) {
            const ids = Array.from(activeNative.keys());
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                try {
                    console.log('[anpr-native] POST /watch/stop (no slots)', id);
                    await anprSidecarClient.watchStop(id);
        } catch (_) { /* ignore */ }
                activeNative.delete(id);
            }
            return;
        }
        const wantSet = Object.create(null);
        for (let i = 0; i < want.length; i++) {
            const id = want[i];
            wantSet[id] = true;
            const url = resolveWatchUrl(id);
            if (!url) {
                logSkip(id, 'no_upstream_flv');
                continue;
            }
            const prev = activeNative.get(id);
            if (prev === url) continue;
            try {
                console.log('[anpr-native] POST /watch/start', id, String(url).slice(0, 120));
                const r = await anprSidecarClient.watchStart(id, url, id);
                if (r && r.ok) {
                    activeNative.set(id, url);
                    console.log('[anpr-native] watchStart ok', id);
                } else {
                    console.log('[anpr-native] watchStart fail', id, r && (r.error || r.message) || r);
                }
            } catch (err) {
                console.log('[anpr-native] watchStart exc', id, String(err && err.message || err).slice(0, 120));
            }
        }
        const running = Array.from(activeNative.keys());
        for (let j = 0; j < running.length; j++) {
            const id = running[j];
            if (wantSet[id]) continue;
            try {
                console.log('[anpr-native] POST /watch/stop (removed from slots)', id);
                await anprSidecarClient.watchStop(id);
                } catch (_) { /* ignore */ }
            activeNative.delete(id);
        }
    }

    function eventToTick(ev) {
        if (!ev || ev.type !== 'anpr-hit') return null;
        /* STRUCTURAL ISOLATION: camera_* from stream metadata; plate_* from OCR only */
        const camId = String(ev.camera_id || ev.camId || '');
        let deviceName = camId;
        try {
            deviceName = deps && deps.deviceLabel
                ? String(deps.deviceLabel(camId) || camId)
                : String(ev.device_name || camId);
        } catch (_) { deviceName = String(ev.device_name || camId); }
        const plateText = (ev.plate_text != null && String(ev.plate_text).trim())
            ? String(ev.plate_text).trim()
            : ((ev.plateText != null && String(ev.plateText).trim())
                ? String(ev.plateText).trim()
                : ((ev.plate != null && String(ev.plate).trim()) ? String(ev.plate).trim() : null));
        const tick = {
            camera_id: camId,
        camId,
            device_name: deviceName,
            deviceLabel: deviceName,
            bwcUser: deviceName,
            at: ev.at || new Date().toISOString(),
            plate_text: plateText,
            plateText: plateText,
            plate: plateText,
            plateCompact: ev.plateCompact || null,
            confidence: ev.confidence != null ? Number(ev.confidence) : null,
            sharpness: ev.sharpness != null ? Number(ev.sharpness) : 0,
            vehicleLabel: ev.vehicleLabel || null,
            engine: ev.engine || 'native-ingest-v1',
            vehicleJpegB64: ev.vehicleJpegB64 || null,
        source: 'live',
            nativeIngest: true,
            unclear: false,
            trackId: 'native-' + camId,
        };
        try {
            if (deps && typeof deps.getGps === 'function') {
                const g = deps.getGps(camId);
                if (g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lon))) {
                    tick.lat = Number(g.lat);
                    tick.lon = Number(g.lon);
                    if (g.at != null) tick.gpsAt = g.at;
                }
            }
                } catch (_) { /* ignore */ }
        return tick;
    }

    async function pollNativeEvents() {
        if (!isLicensed()) return;
        let body;
        try {
            body = await anprSidecarClient.watchEvents(16);
        } catch (_) {
            return;
        }
        const events = body && Array.isArray(body.events) ? body.events : [];
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (!ev || ev.type !== 'anpr-hit') continue;
            const tick = eventToTick(ev);
            if (!tick) continue;
            try {
                if (tick.vehicleJpegB64 && typeof runtime.saveCropFromB64 === 'function') {
                    const saved = runtime.saveCropFromB64(tick.camId, tick.vehicleJpegB64, 'macro');
                    if (saved) {
                        tick.vehicleUrl = saved.cropUrl;
                        tick.macroCropUrl = saved.cropUrl;
                        tick.hasVehicle = true;
                    }
                }
                    } catch (_) { /* ignore */ }
            try {
                runtime.publishTick(tick);
                    } catch (_) { /* ignore */ }
                }
    }

    function init(options) {
        deps = options || {};
        runtime.init({
            storageDir: deps.storageDir,
            emit: deps.emit,
            onHit: deps.onHit,
            getGps: deps.getGps,
            deviceLabel: deps.deviceLabel,
            isAnprLicensed: deps.isAnprLicensed,
            log: deps.log,
        });
        try {
            if (deps.log) {
                deps.log.media.info('anpr ingest mode', {
                    mode: 'native-python',
                    path: 'ANPR-NATIVE-INGEST-PHASE1-V1',
                });
            }
                } catch (_) { /* ignore */ }
    }

    function start() {
        if (syncTimer) clearInterval(syncTimer);
        if (eventTimer) clearInterval(eventTimer);
        syncTimer = setInterval(() => {
            syncNativeWatches().catch(() => {});
        }, 1000);
        eventTimer = setInterval(() => {
            pollNativeEvents().catch(() => {});
        }, 500);
        syncNativeWatches().catch(() => {});
    }

    function stop() {
        if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
        if (eventTimer) { clearInterval(eventTimer); eventTimer = null; }
        const ids = Array.from(activeNative.keys());
        activeNative.clear();
        ids.forEach((id) => {
            anprSidecarClient.watchStop(id).catch(() => {});
        });
    }

    function notifyCamFlvReady(camId) {
        // Called after existing WVP handoff success (server.js). Read-only sync — no ensurePlay.
        const id = String(camId || '').trim();
        if (!id) return;
        console.log('[anpr-native] flv-ready nudge', id);
        syncNativeWatches().catch(() => {});
    }

    function setWatchSlots(socketId, camIds, flvByCam) {
        const sid = String(socketId || '');
        if (!sid) return;
        const cleaned = [];
        const seen = Object.create(null);
        (Array.isArray(camIds) ? camIds : []).forEach((c) => {
            const id = String(c || '').trim();
            if (!id || seen[id]) return;
            seen[id] = true;
            cleaned.push(id);
        });
        const flvMap = Object.create(null);
        const src = flvByCam && typeof flvByCam === 'object' ? flvByCam : null;
        if (src) {
            cleaned.forEach((id) => {
                const u = src[id];
                if (u && typeof u === 'string' && /^https?:\/\//i.test(String(u).trim())) {
                    flvMap[id] = String(u).trim();
                }
            });
        }
        if (!cleaned.length) watchBySocket.delete(sid);
        else {
            watchBySocket.set(sid, {
                camIds: cleaned.slice(0, runtime.MAX_CAMS || 4),
                flvByCam: flvMap,
                at: Date.now(),
            });
        }
        console.log(
            '[anpr-native] setWatchSlots',
            sid.slice(0, 12),
            cleaned,
            'flvMap',
            Object.keys(flvMap).length
        );
        syncNativeWatches().catch(() => {});
    }

    function clearSocket(socketId) {
        watchBySocket.delete(String(socketId || ''));
        syncNativeWatches().catch(() => {});
}

module.exports = {
    init,
    start,
    stop,
    setWatchSlots,
    clearSocket,
        notifyCamFlvReady,
        cropAbsolutePath: runtime.cropAbsolutePath,
        NATIVE: true,
        EXTERNAL: false,
        POLL_SEC: runtime.POLL_SEC,
        MAX_CAMS: runtime.MAX_CAMS,
        GRAB_MS: runtime.GRAB_MS,
        GRAB_MS_BUSY: runtime.GRAB_MS_BUSY,
        GRAB_BUDGET_MS: runtime.GRAB_BUDGET_MS,
        STALE_FRAME_MS: runtime.STALE_FRAME_MS,
        TRACK_EMIT_BLOCK_MS: runtime.TRACK_EMIT_BLOCK_MS,
        DWELL_UPDATE_MS: runtime.DWELL_UPDATE_MS,
        SHARP_EMIT_FM: runtime.SHARP_EMIT_FM,
    };
}
