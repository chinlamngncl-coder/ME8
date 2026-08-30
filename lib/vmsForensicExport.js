/**
 * VMS forensic clip export (-c copy) + frame capture (VMS-STABILITY-AND-TOOLS-V2).
 * file_path never returned to client — only download URLs under /api/vms/forensic/...
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const siteDb = require('./siteDb');
const resolveFfmpeg = require('./resolveFfmpeg');
const log = require('./fleetLog');

let exportsRoot = null;

function init(storageDir) {
    exportsRoot = path.join(storageDir, 'vms-forensic-exports');
    try { fs.mkdirSync(exportsRoot, { recursive: true }); } catch (_e) { /* ignore */ }
}

function assertReady() {
    if (!siteDb.isReady()) throw new Error('Catalog database is not ready.');
    if (!exportsRoot) throw new Error('Forensic export storage is not initialized.');
}

function runFfmpeg(args, timeoutMs) {
    return new Promise(function (resolve, reject) {
        const bin = resolveFfmpeg.resolveFfmpegPath();
        const child = spawn(bin, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        let errBuf = '';
        const timer = setTimeout(function () {
            try { child.kill('SIGKILL'); } catch (_e) { /* ignore */ }
            reject(new Error('FFmpeg timed out.'));
        }, timeoutMs || 300000);
        child.stderr.on('data', function (c) { errBuf += String(c); if (errBuf.length > 8000) errBuf = errBuf.slice(-4000); });
        child.on('error', function (err) {
            clearTimeout(timer);
            reject(err);
        });
        child.on('close', function (code) {
            clearTimeout(timer);
            if (code === 0) resolve();
            else reject(new Error('FFmpeg failed (exit ' + code + ').'));
        });
    });
}

async function findSegmentCovering(camId, atMs) {
    const atIso = new Date(atMs).toISOString();
    const { rows } = await siteDb.query(
        `SELECT id, file_path, start_at, end_at, status
         FROM vms_recording_segments
         WHERE cam_id = $1
           AND start_at <= $2
           AND (end_at >= $2 OR end_at IS NULL)
           AND status NOT IN ('unavailable')
         ORDER BY start_at DESC
         LIMIT 1`,
        [String(camId), atIso]
    );
    return rows[0] || null;
}

async function loadAlarmsInRange(camId, fromIso, toIso) {
    const { rows } = await siteDb.query(
        `SELECT id, event_type, occurred_at, note
         FROM vms_alarm_markers
         WHERE cam_id = $1
           AND occurred_at >= $2
           AND occurred_at <= $3
         ORDER BY occurred_at ASC`,
        [String(camId), fromIso, toIso]
    );
    return rows || [];
}

/**
 * Trim MP4 with stream copy; write JSON sidecar from alarm markers.
 * @returns {{ exportId, downloadUrl, sidecarUrl, fileName, byteSize }}
 */
async function exportClip(camId, markInMs, markOutMs) {
    assertReady();
    const cam = String(camId || '').trim();
    const inMs = Number(markInMs);
    const outMs = Number(markOutMs);
    if (!cam) throw new Error('camId required');
    if (!Number.isFinite(inMs) || !Number.isFinite(outMs) || outMs <= inMs) {
        throw new Error('Mark In and Mark Out are required (Out must be after In).');
    }
    if ((outMs - inMs) < 1000) throw new Error('Clip must be at least 1 second.');

    const seg = await findSegmentCovering(cam, inMs);
    if (!seg || !seg.file_path) throw new Error('No recording covers the Mark In time.');
    if (seg.status === 'recording') {
        throw new Error('Segment is still recording. Wait until the clip is finalized.');
    }
    try {
        const st = fs.statSync(seg.file_path);
        if (!st.isFile() || st.size < 1024) throw new Error('empty');
    } catch (_e) {
        throw new Error('Recording file is missing on storage.');
    }

    const segStart = Date.parse(seg.start_at);
    const ss = Math.max(0, (inMs - segStart) / 1000);
    const dur = (outMs - inMs) / 1000;
    const exportId = 'vfx-' + crypto.randomBytes(6).toString('hex');
    const dir = path.join(exportsRoot, exportId);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = cam.replace(/[^\w.-]+/g, '_') + '_' + exportId + '.mp4';
    const outMp4 = path.join(dir, fileName);
    const sidecarName = fileName.replace(/\.mp4$/i, '') + '.json';
    const outJson = path.join(dir, sidecarName);

    const fromIso = new Date(inMs).toISOString();
    const toIso = new Date(outMs).toISOString();
    const alarms = await loadAlarmsInRange(cam, fromIso, toIso);
    const sidecar = {
        camId: cam,
        markIn: fromIso,
        markOut: toIso,
        segmentId: seg.id,
        exportedAt: new Date().toISOString(),
        alarms: alarms,
    };
    fs.writeFileSync(outJson, JSON.stringify(sidecar, null, 2), 'utf8');

    await runFfmpeg([
        '-y',
        '-ss', String(ss),
        '-i', seg.file_path,
        '-t', String(dur),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        '-movflags', '+faststart',
        outMp4,
    ], 300000);

    let byteSize = 0;
    try { byteSize = fs.statSync(outMp4).size; } catch (_e) { /* ignore */ }
    if (byteSize < 512) {
        try { fs.unlinkSync(outMp4); } catch (_e2) { /* ignore */ }
        throw new Error('Exported clip was empty. Try a longer In/Out range.');
    }

    log.media.info('[vms-forensic] export clip', { camId: cam, exportId, byteSize });
    let sourceSha256 = '';
    try {
        sourceSha256 = await sha256File(seg.file_path);
    } catch (_e) {
        sourceSha256 = '';
    }
    let clipSha256 = '';
    try {
        clipSha256 = await sha256File(outMp4);
    } catch (_e2) {
        clipSha256 = '';
    }
    return {
        exportId: exportId,
        fileName: fileName,
        byteSize: byteSize,
        downloadUrl: '/api/vms/forensic/' + encodeURIComponent(exportId) + '/clip',
        sidecarUrl: '/api/vms/forensic/' + encodeURIComponent(exportId) + '/sidecar',
        alarmCount: alarms.length,
        sourceSha256: sourceSha256,
        clipSha256: clipSha256,
        dir: dir,
        mp4Path: outMp4,
        fromIso: fromIso,
        toIso: toIso,
    };
}

/**
 * High-res JPEG at absolute timestamp via FFmpeg frame extract from recording.
 */
async function captureFrame(camId, atMs) {
    assertReady();
    const cam = String(camId || '').trim();
    const t = Number(atMs);
    if (!cam) throw new Error('camId required');
    if (!Number.isFinite(t)) throw new Error('Timestamp required.');

    const seg = await findSegmentCovering(cam, t);
    if (!seg || !seg.file_path) throw new Error('No recording covers this timestamp.');
    if (seg.status === 'recording') {
        throw new Error('Segment is still recording.');
    }
    try {
        const st = fs.statSync(seg.file_path);
        if (!st.isFile() || st.size < 1024) throw new Error('empty');
    } catch (_e) {
        throw new Error('Recording file is missing on storage.');
    }

    const segStart = Date.parse(seg.start_at);
    const ss = Math.max(0, (t - segStart) / 1000);
    const exportId = 'vfs-' + crypto.randomBytes(6).toString('hex');
    const dir = path.join(exportsRoot, exportId);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = cam.replace(/[^\w.-]+/g, '_') + '_' + exportId + '.jpg';
    const outJpg = path.join(dir, fileName);

    await runFfmpeg([
        '-y',
        '-ss', String(ss),
        '-i', seg.file_path,
        '-frames:v', '1',
        '-q:v', '2',
        outJpg,
    ], 60000);

    let byteSize = 0;
    try { byteSize = fs.statSync(outJpg).size; } catch (_e) { /* ignore */ }
    if (byteSize < 64) {
        try { fs.unlinkSync(outJpg); } catch (_e2) { /* ignore */ }
        throw new Error('Could not capture a frame at this time.');
    }

    log.media.info('[vms-forensic] capture frame', { camId: cam, exportId, byteSize });
    return {
        exportId: exportId,
        fileName: fileName,
        byteSize: byteSize,
        downloadUrl: '/api/vms/forensic/' + encodeURIComponent(exportId) + '/frame',
        at: new Date(t).toISOString(),
    };
}

function resolveExportFile(exportId, kind) {
    assertReady();
    const id = String(exportId || '').trim();
    if (!/^vf[xs]-[a-f0-9]+$/i.test(id)) return null;
    const dir = path.join(exportsRoot, id);
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    let name = null;
    if (kind === 'clip') name = files.find(function (f) { return /\.mp4$/i.test(f); });
    else if (kind === 'sidecar') name = files.find(function (f) { return /\.json$/i.test(f); });
    else if (kind === 'frame') name = files.find(function (f) { return /\.jpe?g$/i.test(f); });
    else if (kind === 'zip') name = files.find(function (f) { return /\.zip$/i.test(f); });
    if (!name) return null;
    const full = path.join(dir, name);
    const normRoot = path.normalize(exportsRoot);
    if (!path.normalize(full).startsWith(normRoot)) return null;
    return { path: full, fileName: name };
}

function sha256File(filePath) {
    return new Promise(function (resolve, reject) {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', function (chunk) { hash.update(chunk); });
        stream.on('end', function () { resolve(hash.digest('hex')); });
    });
}

/**
 * Trim clip, write audit_ledger.txt, stream AES-256 password ZIP to res.
 * opts: { camId, markInMs, markOutMs, password, userId, username }
 */
async function streamSecureExportZip(res, opts) {
    assertReady();
    const password = String((opts && opts.password) || '');
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
    }
    const clip = await exportClip(
        opts && opts.camId,
        opts && opts.markInMs,
        opts && opts.markOutMs
    );
    const ledger = [
        'Secure Evidence Export — Audit Ledger',
        'exportedAt=' + new Date().toISOString(),
        'userId=' + String((opts && opts.userId) || ''),
        'username=' + String((opts && opts.username) || ''),
        'camId=' + String(opts && opts.camId || ''),
        'markIn=' + String(clip.fromIso || ''),
        'markOut=' + String(clip.toIso || ''),
        'sourceSha256=' + String(clip.sourceSha256 || ''),
        'clipSha256=' + String(clip.clipSha256 || ''),
        'exportId=' + String(clip.exportId || ''),
        'clipFile=' + String(clip.fileName || ''),
    ].join('\n') + '\n';

    const ledgerPath = path.join(clip.dir, 'audit_ledger.txt');
    fs.writeFileSync(ledgerPath, ledger, 'utf8');

    const Archiver = require('archiver');
    const ZipEncrypted = require('archiver-zip-encrypted');
    try {
        Archiver.registerFormat('zip-encrypted', ZipEncrypted);
    } catch (_reg) { /* already registered */ }

    const zipName = String(clip.fileName || 'evidence').replace(/\.mp4$/i, '') + '-secure.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="' + zipName.replace(/"/g, '') + '"');
    res.setHeader('X-Export-Id', String(clip.exportId || ''));
    res.setHeader('X-Alarm-Count', String(clip.alarmCount || 0));

    const archive = Archiver.create('zip-encrypted', {
        zlib: { level: 5 },
        encryptionMethod: 'aes256',
        password: password,
    });
    archive.on('error', function (err) {
        try {
            if (!res.headersSent) res.status(500).json({ ok: false, error: 'Export package failed.' });
            else res.end();
        } catch (_e) { /* ignore */ }
        log.media.warn('[vms-forensic] secure zip error', { message: String(err && err.message || err) });
    });
    archive.pipe(res);
    archive.file(clip.mp4Path, { name: clip.fileName });
    archive.file(ledgerPath, { name: 'audit_ledger.txt' });
    await archive.finalize();
    log.media.info('[vms-forensic] secure zip streamed', { exportId: clip.exportId });
    return { exportId: clip.exportId, fileName: zipName, alarmCount: clip.alarmCount };
}

module.exports = {
    init,
    exportClip,
    captureFrame,
    resolveExportFile,
    streamSecureExportZip,
};
