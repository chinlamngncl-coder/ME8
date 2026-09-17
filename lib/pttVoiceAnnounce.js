'use strict';
/* PTT-VOICE-ANNOUNCE-RESPONDERS-V1 — spoken dispatch to the nearest PTT-online helper BWCs on SOS.
   Disc: docs/MOB-DISC-PTT-VOICE-ANNOUNCE-RESPONDERS-V1-20260904.md
   - Pre-recorded 8 kHz PCM16 WAV clips only (assets/ptt-announce/<locale>/meta.json; storage override).
   - Alarm BWC is NEVER a target unless announceToAlarmCam === true.
   - Delivery = pttServer.sendPttAudioToDevice (locked cores untouched); floor = pttFieldGroupRelay HQ floor.
   - Fail-open: any error → log + skip. Never blocks the SOS path.
   Config: storage/ptt-announce/config.json { enabled, locale, topN, radiusM, onRaise, onAck, onRepeat,
   announceToAlarmCam, buckets:[100,300,1000], maxFixAgeMs } or env FM_PTT_VOICE_ANNOUNCE=1. */

const fs = require('fs');
const path = require('path');
const geoNearby = require('./geoNearby');
const psG711Audio = require('./psG711Audio');

const FRAME_BYTES = 160; // 20 ms A-law @ 8 kHz
const FRAME_MS = 20;
const FLOOR_RETRY = 3;
const FLOOR_RETRY_GAP_MS = 2000;

const DEFAULTS = {
    enabled: false,
    locale: 'en',
    topN: 3,
    radiusM: 2000,
    onRaise: true,
    onAck: true,
    onRepeat: false,
    announceToAlarmCam: false,
    buckets: [100, 300, 1000],
    maxFixAgeMs: 10 * 60 * 1000,
};

let deps = null;
let cfg = Object.assign({}, DEFAULTS);
let clipCache = null; // { locale, clips: { key: alawBuffer } }
const done = new Set(); // incidentId|event|target
const active = new Map(); // incidentId → true while a play loop runs

function configure(options) {
    deps = options || {};
    reloadConfig();
}

function warn(msg, extra) {
    try { deps && deps.log && deps.log.ptt && deps.log.ptt.warn(msg, extra || {}); } catch (_) { /* ignore */ }
}
function info(msg, extra) {
    try { deps && deps.log && deps.log.ptt && deps.log.ptt.info(msg, extra || {}); } catch (_) { /* ignore */ }
}

function reloadConfig() {
    const next = Object.assign({}, DEFAULTS);
    try {
        const p = path.join(deps.storageDir, 'ptt-announce', 'config.json');
        if (fs.existsSync(p)) Object.assign(next, JSON.parse(fs.readFileSync(p, 'utf8')) || {});
    } catch (e) {
        warn('ptt voice announce config unreadable — defaults', {});
    }
    if (String(process.env.FM_PTT_VOICE_ANNOUNCE || '') === '1') next.enabled = true;
    if (!Array.isArray(next.buckets) || next.buckets.length !== 3) next.buckets = DEFAULTS.buckets.slice();
    next.topN = Math.max(1, Math.min(10, Number(next.topN) || DEFAULTS.topN));
    next.radiusM = Math.max(50, Number(next.radiusM) || DEFAULTS.radiusM);
    cfg = next;
    clipCache = null;
}

/* ---- WAV → A-law -------------------------------------------------------------------------- */

function wavToAlaw(buf) {
    if (!buf || buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return null;
    let off = 12;
    let fmt = null;
    let data = null;
    while (off + 8 <= buf.length) {
        const id = buf.toString('ascii', off, off + 4);
        const size = buf.readUInt32LE(off + 4);
        const body = off + 8;
        if (id === 'fmt ') {
            fmt = {
                format: buf.readUInt16LE(body),
                channels: buf.readUInt16LE(body + 2),
                rate: buf.readUInt32LE(body + 4),
                bits: buf.readUInt16LE(body + 14),
            };
        } else if (id === 'data') {
            data = buf.subarray(body, Math.min(buf.length, body + size));
        }
        off = body + size + (size % 2);
    }
    if (!fmt || !data) return null;
    if (fmt.format !== 1 || fmt.bits !== 16) return null;
    let pcm = data;
    if (fmt.channels === 2) {
        const mono = Buffer.alloc(Math.floor(data.length / 4) * 2);
        for (let i = 0; i < mono.length / 2; i++) {
            const l = data.readInt16LE(i * 4);
            const r = data.readInt16LE(i * 4 + 2);
            mono.writeInt16LE(Math.round((l + r) / 2), i * 2);
        }
        pcm = mono;
    } else if (fmt.channels !== 1) {
        return null;
    }
    if (fmt.rate !== 8000) {
        /* nearest-sample resample to 8 kHz — clips are speech, good enough */
        const n = Math.floor((pcm.length / 2) * 8000 / fmt.rate);
        const out = Buffer.alloc(n * 2);
        for (let i = 0; i < n; i++) {
            const src = Math.min(pcm.length / 2 - 1, Math.floor(i * fmt.rate / 8000));
            out.writeInt16LE(pcm.readInt16LE(src * 2), i * 2);
        }
        pcm = out;
    }
    if (pcm.length % 2) pcm = pcm.subarray(0, pcm.length - 1);
    return psG711Audio.pcm16ToAlaw(pcm);
}

function clipDirs(locale) {
    const dirs = [];
    if (deps.storageDir) dirs.push(path.join(deps.storageDir, 'ptt-announce', locale));
    if (deps.assetsDir) dirs.push(path.join(deps.assetsDir, 'ptt-announce', locale));
    return dirs;
}

function loadClips() {
    const locale = String(cfg.locale || 'en');
    if (clipCache && clipCache.locale === locale) return clipCache.clips;
    const clips = {};
    const dirs = clipDirs(locale);
    if (locale !== 'en') clipDirs('en').forEach((d) => dirs.push(d)); // fallback to en per key
    for (const dir of dirs) {
        let meta = null;
        try {
            const mp = path.join(dir, 'meta.json');
            if (fs.existsSync(mp)) meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
        } catch (_) { meta = null; }
        if (!meta) continue;
        Object.keys(meta).forEach((key) => {
            if (clips[key]) return; // first dir wins (storage override > assets)
            try {
                const fp = path.join(dir, String(meta[key]));
                if (!fs.existsSync(fp)) return;
                const alaw = wavToAlaw(fs.readFileSync(fp));
                if (alaw && alaw.length) clips[key] = alaw;
            } catch (_) { /* skip clip */ }
        });
    }
    clipCache = { locale, clips };
    info('ptt voice announce clips loaded', { locale, keys: Object.keys(clips).length });
    return clips;
}

/* ---- phrase --------------------------------------------------------------------------- */

function bucketKey(distanceM) {
    const b = cfg.buckets;
    if (distanceM < b[0]) return 'd_lt100';
    if (distanceM < b[1]) return 'd_lt300';
    if (distanceM < b[2]) return 'd_lt1000';
    return 'd_ge1000';
}

/* bearing from helper → alarm (which way the helper should head) */
function dirKey(fromLat, fromLon, toLat, toLon) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLon = toRad(toLon - fromLon);
    const y = Math.sin(dLon) * Math.cos(toRad(toLat));
    const x = Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat))
        - Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(dLon);
    const brg = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return 'dir_' + names[Math.round(brg / 45) % 8];
}

function composeAlaw(keys, clips) {
    const parts = [];
    keys.forEach((k) => { if (clips[k]) parts.push(clips[k], Buffer.alloc(FRAME_BYTES * 10, 0xD5)); /* 200 ms A-law silence */ });
    if (!parts.length) return null;
    let buf = Buffer.concat(parts);
    const pad = buf.length % FRAME_BYTES;
    if (pad) buf = Buffer.concat([buf, Buffer.alloc(FRAME_BYTES - pad, 0xD5)]);
    return buf;
}

/* ---- target pick ----------------------------------------------------------------------- */

function pickTargets(alarmCamId, lat, lon, event) {
    const now = Date.now();
    const candidates = [];
    const fixes = (deps.listGpsFixes && deps.listGpsFixes()) || [];
    fixes.forEach((f) => {
        if (!f || !f.cameraId) return;
        const id = String(f.cameraId);
        if (id === alarmCamId && !cfg.announceToAlarmCam) return;
        if (deps.isBwcCameraId && !deps.isBwcCameraId(id)) return;
        if (!deps.pttServer.isDevicePttOnline(id)) return;
        if (f.at && now - Number(f.at) > cfg.maxFixAgeMs) return;
        candidates.push({ cameraId: id, lat: f.lat, lon: f.lon });
    });
    let nearest = geoNearby.findNearby(candidates, lat, lon, cfg.radiusM, { onlineOnly: false });
    if (event === 'ack' && deps.pttFieldGroupRelay && deps.pttFieldGroupRelay.isCamInSosTeam) {
        nearest = nearest.filter((n) => deps.pttFieldGroupRelay.isCamInSosTeam(n.cameraId));
    }
    return nearest.slice(0, cfg.topN);
}

/* ---- play loop ------------------------------------------------------------------------- */

function acquireFloor(holderId, camIds, attempt, cb) {
    const r = deps.pttFieldGroupRelay.beginHqFloor(holderId, camIds);
    if (r && r.ok) return cb(true, attempt);
    if (attempt >= FLOOR_RETRY) return cb(false, attempt);
    setTimeout(() => acquireFloor(holderId, camIds, attempt + 1, cb), FLOOR_RETRY_GAP_MS);
    return null;
}

function playToTargets(incidentId, event, plan) {
    const holderId = 'announce:' + incidentId + ':' + event;
    const camIds = plan.map((p) => p.cameraId);
    const startedAt = Date.now();
    acquireFloor(holderId, camIds, 1, (ok, attempts) => {
        if (!ok) {
            warn('ptt voice announce dropped', { incidentId, event, targets: camIds, reason: 'floor_busy', attempts });
            active.delete(incidentId);
            return;
        }
        let recording = false;
        try {
            if (deps.pttEvidenceRecorder && deps.pttFieldGroupRelay.anyCamInPttEvidence(camIds)) {
                deps.pttEvidenceRecorder.beginHqTalk(holderId, camIds, 'Axiom announce');
                recording = true;
            }
        } catch (_) { recording = false; }
        const maxLen = plan.reduce((m, p) => Math.max(m, p.alaw.length), 0);
        const totalFrames = Math.ceil(maxLen / FRAME_BYTES);
        let off = 0;
        let ticks = 0;
        const clock0 = Date.now();
        const timer = setInterval(() => {
            try {
                /* wall-clock paced: Windows timers tick ~31 ms, so send every frame that is due (catch-up) */
                const dueFrames = Math.min(totalFrames, Math.floor((Date.now() - clock0) / FRAME_MS) + 1);
                while (off < maxLen && (off / FRAME_BYTES) < dueFrames) {
                    plan.forEach((p) => {
                        if (off >= p.alaw.length) return;
                        const frame = p.alaw.subarray(off, off + FRAME_BYTES);
                        deps.pttServer.sendPttAudioToDevice(p.cameraId, frame);
                        if (recording && p === plan[0]) deps.pttEvidenceRecorder.appendHqTalk(holderId, frame);
                    });
                    off += FRAME_BYTES;
                }
                ticks += 1;
                if (ticks % 30 === 0) deps.pttFieldGroupRelay.touchHqFloor(holderId);
                if (off >= maxLen) {
                    clearInterval(timer);
                    try { deps.pttFieldGroupRelay.endHqFloor(holderId); } catch (_) { /* ignore */ }
                    if (recording) { try { deps.pttEvidenceRecorder.endHqTalk(holderId); } catch (_) { /* ignore */ } }
                    active.delete(incidentId);
                    info('ptt voice announce', {
                        incidentId,
                        event,
                        targets: plan.map((p) => ({ camId: p.cameraId, distanceM: p.distanceM })),
                        durationMs: Date.now() - startedAt,
                        floorAttempts: attempts,
                        recorded: recording,
                    });
                    return;
                }
            } catch (e) {
                clearInterval(timer);
                try { deps.pttFieldGroupRelay.endHqFloor(holderId); } catch (_) { /* ignore */ }
                if (recording) { try { deps.pttEvidenceRecorder.endHqTalk(holderId); } catch (_) { /* ignore */ } }
                active.delete(incidentId);
                warn('ptt voice announce aborted', { incidentId, event });
            }
        }, FRAME_MS);
    });
}

/* ---- public ---------------------------------------------------------------------------- */

function announceSos(args) {
    try {
        if (!deps || !cfg.enabled) return false;
        const a = args || {};
        const event = String(a.event || 'raise');
        if (event === 'raise' && !cfg.onRaise) return false;
        if (event === 'ack' && !cfg.onAck) return false;
        if (event === 'repeat' && !cfg.onRepeat) return false;
        const incidentId = String(a.incidentId || '');
        const alarmCamId = String(a.alarmCamId || '');
        const lat = Number(a.lat);
        const lon = Number(a.lon);
        if (!incidentId || !alarmCamId || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            info('ptt voice announce skipped', { incidentId, event, reason: 'no_gps' });
            return false;
        }
        if (active.has(incidentId)) return false;
        const clips = loadClips();
        const targets = pickTargets(alarmCamId, lat, lon, event).filter((t) => {
            const key = incidentId + '|' + event + '|' + t.cameraId;
            if (done.has(key)) return false;
            done.add(key);
            return true;
        });
        if (!targets.length) {
            info('ptt voice announce skipped', { incidentId, event, reason: 'no_helper_online' });
            return false;
        }
        const plan = [];
        targets.forEach((t) => {
            const keys = event === 'ack'
                ? ['ack']
                : ['intro', bucketKey(t.distanceM), dirKey(t.lat, t.lon, lat, lon)];
            const alaw = composeAlaw(keys, clips);
            if (alaw) plan.push({ cameraId: t.cameraId, distanceM: t.distanceM, alaw });
        });
        if (!plan.length) {
            warn('ptt voice announce skipped', { incidentId, event, reason: 'no_clips', locale: cfg.locale });
            return false;
        }
        active.set(incidentId, true);
        playToTargets(incidentId, event, plan);
        return true;
    } catch (e) {
        warn('ptt voice announce error', { reason: e && e.code ? e.code : 'exception' });
        return false;
    }
}

function clearIncident(incidentId) {
    const id = String(incidentId || '');
    if (!id) return;
    for (const key of Array.from(done)) if (key.startsWith(id + '|')) done.delete(key);
}

module.exports = { configure, reloadConfig, announceSos, clearIncident };
