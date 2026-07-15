/**
 * Offline video → capped ffmpeg JPEGs → represent-probe → crop rail / watchlist match.
 * One job at a time. Does not touch live watch slots or ops pin layout.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { resolveFfmpegPath } = require('./resolveFfmpeg');
const frSidecarClient = require('./frSidecarClient');
const frBlacklist = require('./frBlacklist');
const { alertTierFor, shouldInterruptOperators } = require('./frAlertTier');

const MAX_BYTES = Math.max(10, parseInt(process.env.FM_FR_OFFLINE_MAX_MB || '200', 10) || 200) * 1024 * 1024;
const MAX_DURATION_SEC = Math.max(10, parseInt(process.env.FM_FR_OFFLINE_MAX_SEC || '120', 10) || 120);
const SAMPLE_FPS = Math.max(0.25, Math.min(2, parseFloat(process.env.FM_FR_OFFLINE_FPS || '1') || 1));
const MAX_FRAMES = Math.max(5, Math.min(120, parseInt(process.env.FM_FR_OFFLINE_MAX_FRAMES || '60', 10) || 60));
const MATCH_MIN = Math.max(70, Math.min(99, parseInt(process.env.FM_FR_MATCH_MIN || '75', 10) || 75));
const HIT_DEDUPE_MS = 45000;
const ALERT_TIER_ENABLED = process.env.FM_FR_ALERT_TIER !== '0';
/** mob-fr-offline-crop-play-at — keep source video for Play from crop */
const MEDIA_RETAIN_MS = Math.max(60, parseInt(process.env.FM_FR_OFFLINE_RETAIN_SEC || '1800', 10) || 1800) * 1000;

let deps = null;
let cropsDir = null;
let workRoot = null;
/** @type {null | object} */
let activeJob = null;
let mediaRetainTimer = null;
const lastHitAt = new Map();

function init(options) {
    deps = options || {};
    const storageDir = deps.storageDir || path.join(__dirname, '..', 'storage');
    cropsDir = deps.cropsDir || path.join(storageDir, 'fr-live-crops');
    workRoot = path.join(storageDir, 'fr-offline-tmp');
    try { fs.mkdirSync(cropsDir, { recursive: true }); } catch (_) { /* ignore */ }
    try { fs.mkdirSync(workRoot, { recursive: true }); } catch (_) { /* ignore */ }
}

function allowExt(name) {
    return /\.(mp4|mov|webm|mkv)$/i.test(String(name || ''));
}

function jobPublic(job) {
    if (!job) return null;
    const mediaOk = !!(job.videoPath && !job.mediaPurged && fs.existsSync(job.videoPath));
    return {
        jobId: job.jobId,
        status: job.status,
        fileName: job.fileName,
        framesTotal: job.framesTotal,
        framesDone: job.framesDone,
        facesFound: job.facesFound,
        matches: job.matches,
        error: job.error || null,
        message: job.message || null,
        cancelRequested: !!job.cancelRequested,
        at: job.at,
        finishedAt: job.finishedAt || null,
        playAvailable: mediaOk,
        sampleFps: SAMPLE_FPS,
    };
}

function getStatus() {
    return jobPublic(activeJob);
}

function saveCropB64(b64) {
    if (!b64 || !cropsDir) return null;
    try {
        const raw = Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ''), 'base64');
        if (raw.length < 80) return null;
        const name = 'crop-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex') + '.jpg';
        fs.writeFileSync(path.join(cropsDir, name), raw);
        try {
            const files = fs.readdirSync(cropsDir).filter((f) => f.endsWith('.jpg')).sort();
            while (files.length > 120) {
                const old = files.shift();
                try { fs.unlinkSync(path.join(cropsDir, old)); } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
        return name;
    } catch (_) {
        return null;
    }
}

function cropUrl(fileName) {
    if (!fileName) return null;
    return '/api/analytics/fr/crop/' + encodeURIComponent(fileName);
}

function rmTree(dir) {
    try {
        if (!dir || !fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach((f) => {
            const p = path.join(dir, f);
            try {
                if (fs.statSync(p).isDirectory()) rmTree(p);
                else fs.unlinkSync(p);
            } catch (_) { /* ignore */ }
        });
        fs.rmdirSync(dir);
    } catch (_) { /* ignore */ }
}

function extractFrames(videoPath, outDir, job) {
    return new Promise((resolve, reject) => {
        const ffmpegPath = resolveFfmpegPath();
        const pattern = path.join(outDir, 'frame-%04d.jpg');
        const args = [
            '-hide_banner', '-loglevel', 'error',
            '-t', String(MAX_DURATION_SEC),
            '-i', videoPath,
            '-vf', 'fps=' + SAMPLE_FPS,
            '-frames:v', String(MAX_FRAMES),
            '-q:v', '3',
            '-y',
            pattern,
        ];
        let errTail = '';
        let ff;
        try {
            ff = spawn(ffmpegPath, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        } catch (err) {
            reject(err);
            return;
        }
        job.ff = ff;
        ff.stderr.on('data', (d) => {
            errTail = (errTail + String(d)).slice(-500);
        });
        ff.on('error', (err) => {
            job.ff = null;
            reject(err);
        });
        ff.on('close', (code) => {
            job.ff = null;
            if (job.cancelRequested) {
                reject(new Error('cancelled'));
                return;
            }
            if (code !== 0 && code != null) {
                reject(new Error(errTail || ('ffmpeg exit ' + code)));
                return;
            }
            let frames = [];
            try {
                frames = fs.readdirSync(outDir)
                    .filter((f) => /^frame-\d+\.jpe?g$/i.test(f))
                    .sort()
                    .map((f) => path.join(outDir, f));
            } catch (_) { /* ignore */ }
            resolve(frames);
        });
    });
}

async function probeFrame(job, framePath, index) {
    if (job.cancelRequested) return;
    const label = 'offline:' + (job.fileName || 'video') + '#' + (index + 1);
    const rep = await frSidecarClient.representProbePath(framePath);
    job.framesDone += 1;
    if (!rep || !rep.ok) {
        // mob-fr-probe-quality-gate: skip mush / tiny — no rail card
        if (rep && (rep.error === 'quality_blur' || rep.error === 'face_too_small'
            || rep.error === 'face_clipped' || rep.error === 'face_composition')) {
            return;
        }
        if (deps && deps.emit) {
            deps.emit('fr-crop-tick', {
                camId: label,
                at: new Date().toISOString(),
                faces: 0,
                match: false,
                lat: null,
                lon: null,
                gpsAt: null,
                source: 'offline-video',
                jobId: job.jobId,
            }, null);
        }
        return;
    }
    const faces = rep.faceCount || 1;
    job.facesFound += faces;
    const cropFile = saveCropB64(rep.cropJpegB64);
    const matched = frBlacklist.matchProbe(rep.embedding, { minScorePct: job.threshold });
    /* mob-fr-offline-crop-play-at — every face crop gets tSec (not hit-only) */
    const tSec = Math.max(0, Math.round((index / SAMPLE_FPS) * 10) / 10);
    const tick = {
        camId: label,
        deviceLabel: job.fileName || 'Offline video',
        at: new Date().toISOString(),
        faces: faces,
        cropUrl: cropUrl(cropFile),
        scorePct: matched.scorePct || 0,
        match: !!(matched.match),
        displayName: matched.match ? matched.match.displayName : null,
        blacklistId: matched.match ? matched.match.id : null,
        sharpness: rep.sharpness != null ? rep.sharpness : null,
        lat: null,
        lon: null,
        gpsAt: null,
        source: 'offline-video',
        jobId: job.jobId,
        frameIndex: index + 1,
        tSec: tSec,
        playUrl: '/api/analytics/fr/offline-video/' + encodeURIComponent(job.jobId) + '/media',
    };
    if (deps && deps.emit) deps.emit('fr-crop-tick', tick, null);

    if (matched.match) {
        job.matches += 1;
        const listStatus = matched.match.listStatus || 'blacklist';
        const tier = ALERT_TIER_ENABLED ? alertTierFor(listStatus) : 'high';
        tick.listStatus = listStatus;
        tick.alertTier = tier;
        tick.match = true;
        tick.displayName = matched.match.displayName;
        tick.blacklistId = matched.match.id;
        const dedupeKey = 'offline:' + matched.match.id;
        const now = Date.now();
        if (!lastHitAt.has(dedupeKey) || now - lastHitAt.get(dedupeKey) >= HIT_DEDUPE_MS) {
            lastHitAt.set(dedupeKey, now);
            const hit = {
                hitId: 'frh-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
                camId: label,
                deviceLabel: job.fileName || 'Offline video',
                blacklistId: matched.match.id,
                displayName: matched.match.displayName,
                idNumber: matched.match.idNumber || '',
                listStatus,
                alertTier: tier,
                reasonCode: matched.match.reasonCode || 'other',
                reasonOther: matched.match.reasonOther || '',
                lastSeen: matched.match.lastSeen || '',
                lastIncident: matched.match.lastIncident || '',
                notes: matched.match.notes || '',
                scorePct: matched.scorePct,
                threshold: matched.minScorePct,
                cropUrl: tick.cropUrl,
                photoUrl: '/api/analytics/fr/blacklist/' + encodeURIComponent(matched.match.id) + '/photo',
                at: tick.at,
                source: 'offline-video',
            };
            if (shouldInterruptOperators(tier)) {
                if (deps && deps.emit) deps.emit('fr-blacklist-hit', hit, null);
                if (deps && deps.onHit) {
                    try { deps.onHit(hit); } catch (_) { /* ignore */ }
                }
            }
        }
    }
}

async function runJob(job) {
    job.status = 'extracting';
    job.message = 'Sampling frames from video…';
    const framesDir = path.join(job.workDir, 'frames');
    try { fs.mkdirSync(framesDir, { recursive: true }); } catch (_) { /* ignore */ }
    let frames;
    try {
        frames = await extractFrames(job.videoPath, framesDir, job);
    } catch (err) {
        if (job.cancelRequested || String(err && err.message) === 'cancelled') {
            job.status = 'cancelled';
            job.message = 'Cancelled';
            job.finishedAt = new Date().toISOString();
            return;
        }
        job.status = 'error';
        job.error = 'extract_failed';
        job.message = 'Could not read that video. Use MP4, MOV, or WebM.';
        job.finishedAt = new Date().toISOString();
        return;
    }
    if (job.cancelRequested) {
        job.status = 'cancelled';
        job.message = 'Cancelled';
        job.finishedAt = new Date().toISOString();
        return;
    }
    if (!frames.length) {
        job.status = 'error';
        job.error = 'no_frames';
        job.message = 'No frames could be sampled from that video.';
        job.finishedAt = new Date().toISOString();
        return;
    }
    job.framesTotal = frames.length;
    job.status = 'probing';
    job.message = 'Looking for faces…';
    for (let i = 0; i < frames.length; i++) {
        if (job.cancelRequested) break;
        try {
            await probeFrame(job, frames[i], i);
        } catch (_) { /* continue */ }
        job.message = 'Frame ' + (i + 1) + ' of ' + frames.length;
    }
    if (job.cancelRequested) {
        job.status = 'cancelled';
        job.message = 'Cancelled';
    } else {
        job.status = 'done';
        job.message = job.facesFound
            ? ('Done — ' + job.facesFound + ' face crop(s), ' + job.matches + ' match(es)')
            : 'Done — no faces found in sampled frames';
    }
    job.finishedAt = new Date().toISOString();
}

function purgeJobMedia(job) {
    if (!job || !job.workDir) return;
    try { rmTree(job.workDir); } catch (_) { /* ignore */ }
    job.mediaPurged = true;
}

function scheduleMediaRetain(job) {
    if (mediaRetainTimer) {
        clearTimeout(mediaRetainTimer);
        mediaRetainTimer = null;
    }
    if (!job || !job.workDir) return;
    mediaRetainTimer = setTimeout(function () {
        mediaRetainTimer = null;
        purgeJobMedia(job);
    }, MEDIA_RETAIN_MS);
}

function getMediaAbsolutePath(jobId) {
    const want = String(jobId || '').trim();
    if (!want || !activeJob || activeJob.jobId !== want) return null;
    if (activeJob.mediaPurged) return null;
    const p = activeJob.videoPath;
    try {
        if (p && fs.existsSync(p)) return p;
    } catch (_) { /* ignore */ }
    return null;
}

function startJob(opts) {
    if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'extracting' || activeJob.status === 'probing')) {
        return { ok: false, error: 'busy', message: 'An offline video job is already running. Cancel it or wait.' };
    }
    if (mediaRetainTimer) {
        clearTimeout(mediaRetainTimer);
        mediaRetainTimer = null;
    }
    if (activeJob && activeJob.workDir) {
        purgeJobMedia(activeJob);
    }
    const videoPath = opts && opts.videoPath;
    const fileName = String((opts && opts.fileName) || path.basename(videoPath || '') || 'video').slice(0, 120);
    if (!videoPath || !fs.existsSync(videoPath)) {
        return { ok: false, error: 'missing', message: 'Video upload missing.' };
    }
    const st = fs.statSync(videoPath);
    if (st.size > MAX_BYTES) {
        try { fs.unlinkSync(videoPath); } catch (_) { /* ignore */ }
        return { ok: false, error: 'too_large', message: 'Video is too large (max ' + Math.round(MAX_BYTES / (1024 * 1024)) + ' MB).' };
    }
    if (!allowExt(fileName) && !allowExt(videoPath)) {
        try { fs.unlinkSync(videoPath); } catch (_) { /* ignore */ }
        return { ok: false, error: 'bad_type', message: 'Use MP4, MOV, WebM, or MKV.' };
    }
    const jobId = 'frv-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex');
    const workDir = path.join(workRoot, jobId);
    try { fs.mkdirSync(workDir, { recursive: true }); } catch (_) { /* ignore */ }
    const ext = path.extname(fileName || videoPath) || '.mp4';
    const dest = path.join(workDir, 'source' + ext);
    try {
        fs.renameSync(videoPath, dest);
    } catch (_) {
        try { fs.copyFileSync(videoPath, dest); fs.unlinkSync(videoPath); } catch (e2) {
            return { ok: false, error: 'store_failed', message: 'Could not store upload.' };
        }
    }
    const thr = Math.max(70, Math.min(99, Number(opts && opts.threshold) || MATCH_MIN));
    const job = {
        jobId,
        status: 'queued',
        fileName,
        videoPath: dest,
        workDir,
        threshold: thr,
        framesTotal: 0,
        framesDone: 0,
        facesFound: 0,
        matches: 0,
        cancelRequested: false,
        ff: null,
        error: null,
        message: 'Queued…',
        at: new Date().toISOString(),
        finishedAt: null,
        mediaPurged: false,
    };
    activeJob = job;
    setImmediate(() => {
        runJob(job).finally(() => {
            try {
                if (job.ff) job.ff.kill('SIGKILL');
            } catch (_) { /* ignore */ }
            /* mob-fr-offline-crop-play-at — retain source for Play; purge on timer / next job */
            scheduleMediaRetain(job);
        });
    });
    return { ok: true, job: jobPublic(job) };
}

function cancelJob() {
    if (!activeJob) return { ok: true, job: null };
    if (activeJob.status === 'done' || activeJob.status === 'error' || activeJob.status === 'cancelled') {
        return { ok: true, job: jobPublic(activeJob) };
    }
    activeJob.cancelRequested = true;
    activeJob.message = 'Cancelling…';
    try {
        if (activeJob.ff) activeJob.ff.kill('SIGKILL');
    } catch (_) { /* ignore */ }
    return { ok: true, job: jobPublic(activeJob) };
}

module.exports = {
    init,
    startJob,
    cancelJob,
    getStatus,
    getMediaAbsolutePath,
    allowExt,
    MAX_BYTES,
    MAX_DURATION_SEC,
    MAX_FRAMES,
    SAMPLE_FPS,
};
