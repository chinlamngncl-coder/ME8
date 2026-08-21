'use strict';
/**
 * VMS Step 2 — Continuous NAS Writer (Main Stream)
 *
 * For each fixed camera with a configured fixed-archive volume:
 *   - Resolves the main-stream RTSP URI via fixedCamOnvif (highest-res profile)
 *   - Spawns a dedicated FFmpeg process using -c copy -f segment (no transcode)
 *   - Indexes each completed segment into vms_recording_segments via stderr parsing
 *   - Auto-restarts with exponential backoff (30 s → 60 s → 120 s) on crash
 *
 * Pipeline separation guarantee:
 *   This module is ONLY called for fixed cameras (sourceType: 'fixed-rtsp').
 *   It never touches BWC sessions, WVP/ZLM, or liveStreamPool BWC state.
 *
 * Gap detection agreement (locked with Google):
 *   We do NOT write "gap rows" on crash (dying-gasp failure).
 *   The playback API computes gaps at query time:
 *     if Segment[n].start_at - Segment[n-1].end_at > FM_VMS_GAP_THRESHOLD_MS → grey gap
 *   A NULL end_at + age > (segment_time + grace) = crash gap.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const siteDb             = require('./siteDb');
const log                = require('./fleetLog');
const { resolveFfmpegPath } = require('./resolveFfmpeg');

const SEGMENT_TIME_S    = parseInt(process.env.FM_VMS_SEGMENT_TIME_S    || '300',  10); // 5 min
const BACKOFF_MAX_MS    = parseInt(process.env.FM_VMS_BACKOFF_MAX_MS    || '120000', 10);
const BACKOFF_INIT_MS   = parseInt(process.env.FM_VMS_BACKOFF_INIT_MS   || '30000',  10);
/* Regex that matches FFmpeg verbose output when a new segment file is opened */
const RE_SEGMENT_OPEN   = /Opening '(.+?)' for writing/;

/** @type {Map<string, NasSession>} */
const nasSessions = new Map();

/**
 * @typedef {Object} NasSession
 * @property {string}      camId
 * @property {string}      volumeId
 * @property {string}      segDir        - absolute directory on NAS (server-only)
 * @property {object}      camera        - full registry record (server-only)
 * @property {ChildProcess|null} process
 * @property {string|null} openSegmentId - DB id of currently recording segment
 * @property {string|null} openSegmentPath
 * @property {number}      backoffMs
 * @property {ReturnType<typeof setTimeout>|null} restartTimer
 * @property {boolean}     stopped       - true = intentional stop, do not restart
 */

function makeSegId() {
    return 'seg-' + crypto.randomBytes(6).toString('hex');
}

/* ── DB helpers (server-side only, paths never sent to client) ─────────────── */

async function dbOpenSegment(camId, volumeId, filePath) {
    const id = makeSegId();
    await siteDb.query(
        `INSERT INTO vms_recording_segments
         (id, cam_id, volume_id, start_at, end_at, file_path, file_size_bytes, status)
         VALUES ($1,$2,$3,$4,NULL,$5,NULL,'recording')`,
        [id, camId, volumeId, new Date().toISOString(), filePath]
    );
    return id;
}

async function dbCloseSegment(segmentId, filePath) {
    let sizeBytes = null;
    try {
        const st = fs.statSync(filePath);
        sizeBytes = st.size;
    } catch (_) { /* file may still be flushing */ }
    await siteDb.query(
        `UPDATE vms_recording_segments
         SET end_at = $1, file_size_bytes = $2, status = 'complete'
         WHERE id = $3`,
        [new Date().toISOString(), sizeBytes, segmentId]
    );
}

/* ── Profile / URI resolution ──────────────────────────────────────────────── */

async function resolveMainStreamUri(camera) {
    const profiles = Array.isArray(camera.streamProfiles) ? camera.streamProfiles : [];
    let mainToken = null;
    try {
        const fixedCamRegistry = require('./fixedCamRegistry');
        const vmsStreamPolicy = require('./vmsStreamPolicy');
        const sitePolicy = await vmsStreamPolicy.get();
        if (typeof fixedCamRegistry.resolveRoleProfileToken === 'function') {
            mainToken = fixedCamRegistry.resolveRoleProfileToken(camera, 'record', { sitePolicy: sitePolicy });
        }
    } catch (_) { /* ignore */ }
    if (!mainToken && profiles.length > 0) {
        const sorted = [...profiles].sort((a, b) => {
            const pa = (a.resolution && a.resolution.width * a.resolution.height) || 0;
            const pb = (b.resolution && b.resolution.width * b.resolution.height) || 0;
            return pb - pa; // descending — highest res first
        });
        mainToken = sorted[0].token || null;
    }
    /* lazy require to avoid top-level circular dep */
    const fixedCamOnvif = require('./fixedCamOnvif');
    const resolved = await fixedCamOnvif.resolveStreamUri(camera, mainToken);
    return { uri: resolved.uri, transport: resolved.streamTransport || 'tcp' };
}

/* ── Writer lifecycle ──────────────────────────────────────────────────────── */

async function spawnWriter(nasSession) {
    if (nasSession.stopped) return;

    const { camera, camId, volumeId, segDir } = nasSession;
    let mainUri, transport;
    try {
        ({ uri: mainUri, transport } = await resolveMainStreamUri(camera));
    } catch (err) {
        log.media.warn('[nas-writer] cannot resolve main-stream URI', {
            camId, error: err.message,
        });
        scheduleRestart(nasSession);
        return;
    }

    try { fs.mkdirSync(segDir, { recursive: true }); } catch (_) { /* ignore */ }

    const ffmpegPath = resolveFfmpegPath();
    const segPattern = path.join(segDir, '%Y%m%dT%H%M%S.mp4');
    const ffArgs = [
        '-hide_banner',
        '-loglevel',      'verbose',  // needed to detect segment transitions in stderr
        '-rtsp_transport', transport,
        '-fflags',         '+genpts+discardcorrupt',
        '-i',              mainUri,
        '-c',              'copy',
        '-f',              'segment',
        '-segment_time',   String(SEGMENT_TIME_S),
        '-segment_format', 'mp4',
        '-reset_timestamps', '1',
        '-strftime',       '1',
        segPattern,
    ];

    const proc = spawn(ffmpegPath, ffArgs, {
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    nasSession.process = proc;

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => {
        stderrBuf += chunk.toString();
        let nl;
        while ((nl = stderrBuf.indexOf('\n')) !== -1) {
            const line = stderrBuf.slice(0, nl);
            stderrBuf = stderrBuf.slice(nl + 1);
            handleFfmpegLine(nasSession, line);
        }
    });

    proc.on('error', (err) => {
        log.media.err('[nas-writer] ffmpeg error', { camId, error: err.message });
    });

    proc.on('exit', (code, signal) => {
        nasSession.process = null;
        /* Close the last open segment on exit — graceful only */
        if (nasSession.openSegmentId && nasSession.openSegmentPath) {
            const sid  = nasSession.openSegmentId;
            const spath = nasSession.openSegmentPath;
            nasSession.openSegmentId   = null;
            nasSession.openSegmentPath = null;
            dbCloseSegment(sid, spath).catch((err) => {
                log.media.warn('[nas-writer] failed to close final segment', {
                    camId, segmentId: sid, error: err.message,
                });
            });
        }
        if (!nasSession.stopped) {
            log.media.warn('[nas-writer] ffmpeg exited unexpectedly', { camId, code, signal });
            scheduleRestart(nasSession);
        } else {
            log.media.info('[nas-writer] ffmpeg stopped cleanly', { camId });
        }
    });

    log.media.info('[nas-writer] started', {
        camId, volumeId, segDir, transport, segmentTimeSec: SEGMENT_TIME_S,
    });
}

/**
 * Parse FFmpeg verbose stderr line for segment transitions.
 * Regex matches: Opening '/path/to/file.mp4' for writing
 */
function handleFfmpegLine(nasSession, line) {
    const m = RE_SEGMENT_OPEN.exec(line);
    if (!m) return;
    const newPath = m[1];
    /* Close previous segment */
    if (nasSession.openSegmentId && nasSession.openSegmentPath) {
        const prevId   = nasSession.openSegmentId;
        const prevPath = nasSession.openSegmentPath;
        dbCloseSegment(prevId, prevPath).catch((err) => {
            log.media.warn('[nas-writer] segment close failed', {
                camId: nasSession.camId, segmentId: prevId, error: err.message,
            });
        });
    }
    /* Open new segment */
    nasSession.openSegmentPath = newPath;
    nasSession.openSegmentId   = null;
    dbOpenSegment(nasSession.camId, nasSession.volumeId, newPath).then((id) => {
        nasSession.openSegmentId = id;
        log.media.info('[nas-writer] segment opened', {
            camId: nasSession.camId, segmentId: id,
        });
    }).catch((err) => {
        log.media.warn('[nas-writer] segment open failed', {
            camId: nasSession.camId, error: err.message,
        });
    });
}

function scheduleRestart(nasSession) {
    if (nasSession.stopped) return;
    const delay = nasSession.backoffMs;
    log.media.info('[nas-writer] restart scheduled', {
        camId: nasSession.camId, delayMs: delay,
    });
    nasSession.restartTimer = setTimeout(() => {
        if (nasSession.stopped) return;
        /* Increase backoff for next crash, capped at max */
        nasSession.backoffMs = Math.min(nasSession.backoffMs * 2, BACKOFF_MAX_MS);
        spawnWriter(nasSession).catch((err) => {
            log.media.warn('[nas-writer] restart failed', {
                camId: nasSession.camId, error: err.message,
            });
            scheduleRestart(nasSession);
        });
    }, delay);
}

/* ── Public API ────────────────────────────────────────────────────────────── */

/**
 * Start the NAS writer for a fixed camera.
 * No-op if: no fixed-archive volume configured, or writer already running.
 */
async function start(camId, camera) {
    if (nasSessions.has(camId)) return; // already running

    const vmsVolumeRegistry = require('./vmsVolumeRegistry');
    const vol = await vmsVolumeRegistry.getRawByRole('fixed-archive');
    if (!vol) {
        log.media.info('[nas-writer] no fixed-archive volume configured — skipping', { camId });
        return;
    }

    const segDir = path.join(vol.mount_path, 'fixed-cam', String(camId));
    /** @type {NasSession} */
    const nasSession = {
        camId,
        volumeId:          vol.id,
        segDir,
        camera,
        process:           null,
        openSegmentId:     null,
        openSegmentPath:   null,
        backoffMs:         BACKOFF_INIT_MS,
        restartTimer:      null,
        stopped:           false,
    };
    nasSessions.set(camId, nasSession);
    await spawnWriter(nasSession);
}

/**
 * Stop the NAS writer for a camera (called on stream stop or graceful shutdown).
 * Closes the open segment in DB before killing FFmpeg.
 */
function stop(camId) {
    const nasSession = nasSessions.get(String(camId));
    if (!nasSession) return;
    nasSession.stopped = true;
    if (nasSession.restartTimer) {
        clearTimeout(nasSession.restartTimer);
        nasSession.restartTimer = null;
    }
    if (nasSession.process) {
        try { nasSession.process.kill('SIGTERM'); } catch (_) { /* ignore */ }
    }
    nasSessions.delete(String(camId));
    log.media.info('[nas-writer] stop requested', { camId });
}

/** Stop all NAS writers — called on server SIGTERM. */
function stopAll() {
    for (const camId of nasSessions.keys()) {
        stop(camId);
    }
}

/** List active NAS writer camera IDs (for health endpoints). */
function listActive() {
    return Array.from(nasSessions.keys());
}

module.exports = { start, stop, stopAll, listActive };
