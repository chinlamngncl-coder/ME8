/**
 * Server-side evidence capture while live (ffmpeg tee on existing stream session).
 */
const fs = require('fs');
const path = require('path');
const liveStreamPool = require('./liveStreamPool');
const storagePaths = require('./storagePaths');
const evidenceRegistry = require('./evidenceRegistry');
const evidenceIngestGate = require('./evidenceIngestGate');
const evidenceCrypto = require('./evidenceCrypto');
const serverSettings = require('./serverSettings');
const log = require('./fleetLog');

let baseDir = null;
let storageDir = null;
let sosIncidentsMod = null;
const active = new Map();

function wireSosIncidents(si) {
    sosIncidentsMod = si || null;
}

function resolveIncidentId(camId, explicitId) {
    if (explicitId) return explicitId;
    if (!sosIncidentsMod || !camId) return null;
    const open = sosIncidentsMod.getOpenAlarms().find((e) => e.cameraId === camId);
    return open ? open.id : null;
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
    const deadline = Date.now() + (maxMs || 4000);
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
    const ok = await waitForFile(rec.full, 5000);
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
    const out = { camId, evidenceId, fileName: rec.fileName, relativePath: rec.rel };
    attachCaptureToIncident(camId, out, rec.full, rec.incidentId);
    return out;
}

function start(camId) {
    const ev = settings().evidence || {};
    if (!ev.liveCaptureEnabled) {
        throw new Error('Server live capture is disabled — enable it in Evidence & docking settings.');
    }
    if (!liveStreamPool.isStreamingForCam(camId)) {
        throw new Error('Start live video on this BWC first, then record to server.');
    }
    if (active.has(camId)) {
        throw new Error('Server recording already active for this BWC.');
    }
    const paths = newCapturePaths(camId);
    liveStreamPool.setLiveCaptureRecording(camId, paths.full);
    const rec = {
        full: paths.full,
        rel: paths.rel,
        fileName: paths.fileName,
        root: paths.root,
        startedAt: new Date().toISOString(),
    };
    active.set(camId, rec);
    return {
        camId,
        fileName: paths.fileName,
        relativePath: paths.rel,
        startedAt: rec.startedAt,
    };
}

function startForSos(camId) {
    const out = start(camId);
    const rec = active.get(camId);
    if (rec) {
        rec.sosAuto = true;
        rec.incidentId = resolveIncidentId(camId, null);
    }
    return out;
}

async function finalizeForSosAck(entry) {
    if (!entry || !entry.cameraId) return entry;
    const camId = entry.cameraId;
    const rec = active.get(camId);
    if (rec) rec.incidentId = entry.id;
    if (active.has(camId)) {
        await stop(camId);
    }
    if (sosIncidentsMod && entry.id) {
        return sosIncidentsMod.findEntryById(entry.id) || entry;
    }
    return entry;
}

async function stop(camId) {
    const rec = active.get(camId);
    if (!rec) throw new Error('No server recording active for this BWC.');
    active.delete(camId);
    liveStreamPool.setLiveCaptureRecording(camId, null);
    return registerCapture(camId, rec);
}

function onStreamStopped(camId) {
    const rec = active.get(camId);
    if (!rec) return;
    active.delete(camId);
    registerCapture(camId, rec).catch((err) => {
        log.web.warn('live capture finalize failed', { camId, message: err.message });
    });
}

function status(camId) {
    if (camId) {
        const rec = active.get(camId);
        return rec
            ? { recording: true, camId, fileName: rec.fileName, startedAt: rec.startedAt }
            : { recording: false, camId };
    }
    return {
        sessions: [...active.entries()].map(([id, rec]) => ({
            camId: id,
            fileName: rec.fileName,
            startedAt: rec.startedAt,
        })),
    };
}

module.exports = {
    init,
    start,
    startForSos,
    stop,
    status,
    onStreamStopped,
    captureRoot,
    wireSosIncidents,
    finalizeForSosAck,
};
