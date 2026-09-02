/**
 * Server-side evidence capture while live.
 * VMS-SOS-HQ-CAPTURE-WVP-WITH-AUDIO-V1:
 *  - WVP/FLV SOS path records MP4 with audio (ffmpeg pull)
 *  - Classic pool tee also keeps audio when present
 *  - Ack does NOT stop HQ capture; stop-live / hard-stop finalizes
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const liveStreamPool = require('./liveStreamPool');
const storagePaths = require('./storagePaths');
const evidenceRegistry = require('./evidenceRegistry');
const evidenceIngestGate = require('./evidenceIngestGate');
const evidenceCrypto = require('./evidenceCrypto');
const serverSettings = require('./serverSettings');
const { resolveFfmpegPath } = require('./resolveFfmpeg');
const log = require('./fleetLog');

let baseDir = null;
let storageDir = null;
let sosIncidentsMod = null;
/** camId → { full, rel, fileName, root, startedAt, incidentId, sosAuto, mode, child? } */
const active = new Map();
/** SOS-MULTI-BWC-HQ-RECORD-V1 — camId → { incidentId, alarmCamId } while SOS response pack active */
const sosPackByCam = new Map();

function wireSosIncidents(si) {
    sosIncidentsMod = si || null;
}

function registerSosCapturePack(alarmCamId, camIds, incidentId) {
    const alarmId = String(alarmCamId || '').trim();
    const ids = Array.isArray(camIds) ? camIds.map((id) => String(id || '').trim()).filter(Boolean) : [];
    const pack = new Set(ids);
    if (alarmId) pack.add(alarmId);
    let resolvedIncident = incidentId || null;
    if (!resolvedIncident && sosIncidentsMod && alarmId) {
        const open = sosIncidentsMod.getOpenAlarms().find((e) => e && e.cameraId === alarmId);
        if (open) resolvedIncident = open.id;
        else if (typeof sosIncidentsMod.findLatestAlarmForCam === 'function') {
            const latest = sosIncidentsMod.findLatestAlarmForCam(alarmId);
            if (latest) resolvedIncident = latest.id;
        }
    }
    /* Drop prior pack rows for this alarm */
    [...sosPackByCam.entries()].forEach(([cam, meta]) => {
        if (meta && meta.alarmCamId === alarmId) sosPackByCam.delete(cam);
    });
    pack.forEach((camId) => {
        sosPackByCam.set(camId, { incidentId: resolvedIncident || null, alarmCamId: alarmId || camId });
    });
    if (sosIncidentsMod && typeof sosIncidentsMod.setResponseCamIds === 'function' && (resolvedIncident || alarmId)) {
        try {
            sosIncidentsMod.setResponseCamIds(resolvedIncident || alarmId, [...pack]);
        } catch (_) { /* optional persist */ }
    }
    return [...pack];
}

/** OPS-HQ-RECORD-SOS-ONLY-V1 — arm one cam into SOS HQ pack without wiping siblings. */
function armSosCaptureCam(camId, alarmCamId, incidentId) {
    const id = String(camId || '').trim();
    if (!id) return false;
    const alarmId = String(alarmCamId || camId || '').trim() || id;
    let resolvedIncident = incidentId || null;
    if (!resolvedIncident && sosIncidentsMod && alarmId) {
        const open = sosIncidentsMod.getOpenAlarms().find((e) => e && e.cameraId === alarmId);
        if (open) resolvedIncident = open.id;
    }
    const prev = sosPackByCam.get(id);
    sosPackByCam.set(id, {
        incidentId: resolvedIncident || (prev && prev.incidentId) || null,
        alarmCamId: alarmId,
    });
    return true;
}

function clearSosCapturePack(alarmCamId) {
    const alarmId = String(alarmCamId || '').trim();
    if (!alarmId) {
        sosPackByCam.clear();
        return;
    }
    [...sosPackByCam.entries()].forEach(([cam, meta]) => {
        if (meta && meta.alarmCamId === alarmId) sosPackByCam.delete(cam);
    });
}

function resolveIncidentId(camId, explicitId) {
    if (explicitId) return explicitId;
    if (!camId) return null;
    const id = String(camId).trim();
    if (sosIncidentsMod) {
        const open = sosIncidentsMod.getOpenAlarms().find((e) => e && e.cameraId === id);
        if (open) return open.id;
        if (typeof sosIncidentsMod.findIncidentIdForResponseCam === 'function') {
            const viaPack = sosIncidentsMod.findIncidentIdForResponseCam(id);
            if (viaPack) return viaPack;
        }
    }
    const pack = sosPackByCam.get(id);
    return pack && pack.incidentId ? pack.incidentId : null;
}

function hasOpenSos(camId) {
    const id = String(camId || '').trim();
    if (!id) return false;
    if (resolveIncidentId(id, null)) return true;
    return sosPackByCam.has(id);
}

function attachCaptureToIncident(camId, result, sourceFullPath, incidentId) {
    if (!sosIncidentsMod || !result || !result.evidenceId) return;
    sosIncidentsMod.attachServerRecording({
        incidentId: resolveIncidentId(camId, incidentId),
        cameraId: camId,
        evidenceId: result.evidenceId,
        fileName: result.fileName,
        relativePath: result.relativePath,
        sourceFullPath: sourceFullPath || null,
    });
}

function init(opts) {
    baseDir = opts.baseDir;
    storageDir = opts.storageDir;
}

function settings() {
    return serverSettings.load(storageDir);
}

function captureRoot() {
    return storagePaths.resolveLiveCaptureRoot(baseDir, settings());
}

function newCapturePaths(camId) {
    const root = captureRoot();
    storagePaths.ensureDir(root);
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(root, camId, date);
    storagePaths.ensureDir(dir);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = camId + '_' + stamp + '.mp4';
    const full = path.join(dir, fileName);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    return { full, rel, fileName, root };
}

function waitForFile(fullPath, maxMs) {
    const deadline = Date.now() + (maxMs || 8000);
    return new Promise((resolve) => {
        const tick = () => {
            try {
                if (fs.existsSync(fullPath)) {
                    const st = fs.statSync(fullPath);
                    if (st.size > 0) {
                        resolve(true);
                        return;
                    }
                }
            } catch (_) { /* ignore */ }
            if (Date.now() >= deadline) {
                resolve(false);
                return;
            }
            setTimeout(tick, 200);
        };
        tick();
    });
}

async function registerCapture(camId, rec) {
    const ok = await waitForFile(rec.full, 8000);
    if (!ok) {
        log.web.warn('live capture file missing', { camId, path: rec.full });
        return { camId, evidenceId: null, fileName: rec.fileName, relativePath: rec.rel };
    }
    const inspected = await evidenceIngestGate.inspectFile({
        fullPath: rec.full,
        originalFileName: rec.fileName,
        rootDir: rec.root || captureRoot(),
        source: 'live_server',
    });
    await evidenceCrypto.encryptFileInPlace(rec.full);
    const evidenceId = await evidenceRegistry.registerLiveCapture({
        fullPath: rec.full,
        deviceId: camId,
        rootDir: rec.root || captureRoot(),
        sha256: inspected.sha256,
        byteSize: inspected.byteSize,
    });
    log.web.info('live capture registered', { camId, evidenceId, fileName: rec.fileName });
    /* VMS-INVESTIGATION-SOS-SEGMENT-LINK-V1 — Investigation timeline/play needs vms_recording_segments. */
    try {
        const sosEvidenceIndexer = require('./sosEvidenceIndexer');
        await sosEvidenceIndexer.indexLiveCaptureFile(camId, rec.full, {
            startAt: rec.startedAt,
            endAt: new Date().toISOString(),
            evidenceId,
        });
    } catch (err) {
        log.web.warn('live capture segment link failed', {
            camId,
            message: err && err.message ? err.message : String(err),
        });
    }
    const out = { camId, evidenceId, fileName: rec.fileName, relativePath: rec.rel };
    attachCaptureToIncident(camId, out, rec.full, rec.incidentId);
    return out;
}

function killWvpChild(rec) {
    if (!rec || !rec.child) return Promise.resolve();
    const child = rec.child;
    rec.child = null;
    return new Promise(function (resolve) {
        let done = false;
        const finish = function () {
            if (done) return;
            done = true;
            resolve();
        };
        try {
            child.once('exit', finish);
        } catch (_) {
            finish();
            return;
        }
        /* VMS-HQ-CAPTURE-MP4-FINALIZE-V1: graceful quit so muxer can write moov. */
        try {
            if (child.stdin && !child.stdin.destroyed) {
                child.stdin.write('q');
                child.stdin.end();
            } else {
                child.kill('SIGTERM');
            }
        } catch (_) {
            try { child.kill('SIGTERM'); } catch (__) { /* ignore */ }
        }
        setTimeout(function () {
            try { child.kill('SIGTERM'); } catch (_) { /* ignore */ }
        }, 2500);
        setTimeout(function () {
            try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
            finish();
        }, 10000);
    });
}

/**
 * Remux to a browser-playable MP4 (moov present, faststart).
 * Safe no-op if ffmpeg fails — fragmented empty_moov source may still play.
 */
function remuxMp4ForPlayback(fullPath) {
    return new Promise(function (resolve) {
        try {
            if (!fullPath || !fs.existsSync(fullPath)) {
                resolve(false);
                return;
            }
            if (fs.statSync(fullPath).size < 64) {
                resolve(false);
                return;
            }
        } catch (_) {
            resolve(false);
            return;
        }
        const ff = resolveFfmpegPath();
        const tmp = fullPath + '.finalize-' + Date.now() + '.mp4';
        const args = [
            '-hide_banner', '-loglevel', 'error',
            '-i', fullPath,
            '-map', '0:v:0?',
            '-map', '0:a:0?',
            '-c', 'copy',
            '-movflags', '+faststart',
            '-y', tmp,
        ];
        let child;
        try {
            child = spawn(ff, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        } catch (_) {
            resolve(false);
            return;
        }
        const timer = setTimeout(function () {
            try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
        }, 90000);
        child.on('exit', function (code) {
            clearTimeout(timer);
            try {
                if (code === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 64) {
                    fs.copyFileSync(tmp, fullPath);
                    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
                    log.web.info('live capture mp4 finalized', { ok: true, mode: 'remux_faststart' });
                    resolve(true);
                    return;
                }
            } catch (err) {
                log.web.warn('live capture remux replace failed', {
                    message: err && err.message ? err.message : String(err),
                });
            }
            try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
            log.web.warn('live capture remux skipped — keeping source mux', { code: code });
            resolve(false);
        });
    });
}

async function stopAndRegister(camId, rec) {
    await killWvpChild(rec);
    try {
        await remuxMp4ForPlayback(rec.full);
    } catch (_) { /* non-fatal */ }
    return registerCapture(camId, rec);
}

/** WVP/FLV pull → MP4 with audio when present. */
function startWvpFromFlv(camId, flvUrl) {
    const id = String(camId || '').trim();
    const url = String(flvUrl || '').trim();
    if (!id || !url) throw new Error('WVP FLV URL required for server recording');
    if (active.has(id)) throw new Error('Server recording already active for this BWC.');
    const paths = newCapturePaths(id);
    const ff = resolveFfmpegPath();
    /* empty_moov: playable even if process dies mid-SOS; remux on stop adds faststart. */
    const args = [
        '-hide_banner', '-loglevel', 'warning',
        '-rw_timeout', '15000000',
        '-i', url,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '64k',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-y', paths.full,
    ];
    let child;
    try {
        child = spawn(ff, args, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    } catch (err) {
        throw new Error(err && err.message ? err.message : 'ffmpeg spawn failed');
    }
    if (child.stdin) {
        child.stdin.on('error', function () { /* ignore EPIPE on quit */ });
    }
    child.stderr.on('data', function (buf) {
        const line = String(buf || '').trim();
        if (line && /error|fail|invalid/i.test(line)) {
            log.web.warn('live capture ffmpeg', { camId: id, line: line.slice(0, 180) });
        }
    });
    child.on('error', function (err) {
        log.web.warn('live capture ffmpeg process error', {
            camId: id,
            message: err && err.message ? err.message : String(err),
        });
    });
    const rec = {
        full: paths.full,
        rel: paths.rel,
        fileName: paths.fileName,
        root: paths.root,
        startedAt: new Date().toISOString(),
        incidentId: resolveIncidentId(id, null),
        sosAuto: true,
        mode: 'wvp_flv',
        child: child,
    };
    active.set(id, rec);
    log.web.info('live capture wvp flv started', {
        camId: id,
        fileName: paths.fileName,
        path: 'wvp_flv_finalize_v1',
    });
    return {
        camId: id,
        fileName: paths.fileName,
        relativePath: paths.rel,
        startedAt: rec.startedAt,
        mode: 'wvp_flv',
    };
}

function start(camId) {
    const ev = settings().evidence || {};
    if (!ev.liveCaptureEnabled) {
        throw new Error('Server live capture is disabled — enable it in Evidence & docking settings.');
    }
    const id = String(camId || '').trim();
    if (!id) throw new Error('camId required');
    if (active.has(id)) {
        throw new Error('Server recording already active for this BWC.');
    }

    let handoff = null;
    try { handoff = require('./wvpVideoHandoff'); } catch (_) { /* optional */ }
    if (handoff && typeof handoff.isHandoffEnabled === 'function' && handoff.isHandoffEnabled()) {
        const up = typeof handoff.getUpstreamFlv === 'function' ? handoff.getUpstreamFlv(id) : null;
        if (up) return startWvpFromFlv(id, up);
    }

    if (!liveStreamPool.isStreamingForCam(id)) {
        throw new Error('Start live video on this BWC first, then record to server.');
    }
    const paths = newCapturePaths(id);
    liveStreamPool.setLiveCaptureRecording(id, paths.full);
    const rec = {
        full: paths.full,
        rel: paths.rel,
        fileName: paths.fileName,
        root: paths.root,
        startedAt: new Date().toISOString(),
        incidentId: resolveIncidentId(id, null),
        sosAuto: false,
        mode: 'pool_tee',
    };
    active.set(id, rec);
    return {
        camId: id,
        fileName: paths.fileName,
        relativePath: paths.rel,
        startedAt: rec.startedAt,
        mode: 'pool_tee',
    };
}

function startForSos(camId) {
    const out = start(camId);
    const rec = active.get(String(camId || '').trim());
    if (rec) {
        rec.sosAuto = true;
        rec.incidentId = resolveIncidentId(camId, null);
    }
    return out;
}

/**
 * OPS-HQ-RECORD-SOS-ONLY-V1 — HQ auto-record only for cams armed into sosPackByCam
 * (SOS raise / ack / + helpers). Open All, Play, fleet click live must NOT start HQ record
 * merely because an SOS is open. Default auto-on-SOS setting stays ON for real SOS packs.
 */
function tryAutoStartOnSosLive(camId) {
    const id = String(camId || '').trim();
    if (!id) return false;
    try {
        const ev = settings().evidence || {};
        if (!ev.liveCaptureEnabled || !ev.liveCaptureAutoOnSos) return false;
        if (active.has(id)) return true;
        if (!sosPackByCam.has(id)) {
            log.web.info('live capture auto SOS skipped (not SOS-armed)', {
                camId: id,
                path: 'ops-hq-record-sos-only-v1',
            });
            return false;
        }
        if (!hasOpenSos(id)) return false;
        startForSos(id);
        log.web.info('live capture auto-started on SOS', {
            camId: id,
            mode: (active.get(id) && active.get(id).mode) || null,
            path: 'sos-multi-bwc-hq-record-v1',
            incidentId: (active.get(id) && active.get(id).incidentId) || null,
            whoFired: 'sos_pack',
        });
        return true;
    } catch (err) {
        log.web.warn('live capture auto SOS skipped', {
            camId: id,
            message: err && err.message ? err.message : String(err),
        });
        return false;
    }
}

/**
 * Ack policy V1: do NOT stop HQ capture — only bind incident id.
 * Officer / stop-live ends the file.
 */
async function finalizeForSosAck(entry) {
    if (!entry || !entry.cameraId) return entry;
    const camId = entry.cameraId;
    const rec = active.get(camId);
    if (rec) {
        rec.incidentId = entry.id;
        log.web.info('live capture ack bind only (keep recording)', {
            camId: camId,
            incidentId: entry.id,
            mode: rec.mode || null,
        });
    }
    return entry;
}

async function stop(camId) {
    const id = String(camId || '').trim();
    const rec = active.get(id);
    if (!rec) throw new Error('No server recording active for this BWC.');
    active.delete(id);
    if (rec.mode === 'pool_tee') {
        try { liveStreamPool.setLiveCaptureRecording(id, null); } catch (_) { /* ignore */ }
    }
    return stopAndRegister(id, rec);
}

function onStreamStopped(camId) {
    const id = String(camId || '').trim();
    const rec = active.get(id);
    if (!rec) return;
    active.delete(id);
    if (rec.mode === 'pool_tee') {
        try { liveStreamPool.setLiveCaptureRecording(id, null); } catch (_) { /* ignore */ }
    }
    Promise.resolve()
        .then(function () { return stopAndRegister(id, rec); })
        .catch(function (err) {
            log.web.warn('live capture finalize failed', {
                camId: id,
                message: err && err.message ? err.message : String(err),
            });
        });
}

function status(camId) {
    if (camId) {
        const rec = active.get(camId);
        return rec
            ? {
                recording: true,
                camId: camId,
                fileName: rec.fileName,
                startedAt: rec.startedAt,
                mode: rec.mode || null,
            }
            : { recording: false, camId: camId };
    }
    return {
        sessions: [...active.entries()].map(([id, rec]) => ({
            camId: id,
            fileName: rec.fileName,
            startedAt: rec.startedAt,
            mode: rec.mode || null,
        })),
    };
}

module.exports = {
    init,
    start,
    startForSos,
    tryAutoStartOnSosLive,
    hasOpenSos,
    stop,
    status,
    onStreamStopped,
    captureRoot,
    wireSosIncidents,
    finalizeForSosAck,
    registerSosCapturePack,
    armSosCaptureCam,
    clearSosCapturePack,
};
