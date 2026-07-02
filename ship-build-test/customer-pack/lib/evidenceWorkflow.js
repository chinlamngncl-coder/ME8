/**
 * Evidence detail, trim export, attachments, SOS linkage — no live/SOS path changes.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);
const siteDb = require('./siteDb');
const evidenceRegistry = require('./evidenceRegistry');
const resolveFfmpeg = require('./resolveFfmpeg');

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;

let attachmentsRoot = null;
let exportsRoot = null;

function init(storageDir) {
    attachmentsRoot = path.join(storageDir, 'evidence-attachments');
    exportsRoot = path.join(storageDir, 'evidence-exports');
    fs.mkdirSync(attachmentsRoot, { recursive: true });
    fs.mkdirSync(exportsRoot, { recursive: true });
}

function newAttachmentId() {
    return 'ATT-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex');
}

function newExportId() {
    return 'EXP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '')
        + '-' + crypto.randomBytes(4).toString('hex');
}

function attachmentAbs(rel) {
    const full = path.normalize(path.join(attachmentsRoot, rel));
    if (!full.startsWith(path.normalize(attachmentsRoot))) return null;
    return full;
}

function exportAbs(rel) {
    const full = path.normalize(path.join(exportsRoot, rel));
    if (!full.startsWith(path.normalize(exportsRoot))) return null;
    return full;
}

function getDetail(fileId, sosLookup) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) return null;
    const meta = siteDb.getEvidenceMeta(fileId) || {
        evidenceFileId: fileId,
        notes: '',
        sosIncidentId: null,
        trimStartSec: null,
        trimEndSec: null,
        dockId: null,
        dockBay: null,
    };
    const attachments = siteDb.listEvidenceAttachments(fileId);
    const exports = siteDb.listEvidenceExports(fileId, 20);
    let sos = null;
    if (meta.sosIncidentId && sosLookup) {
        sos = sosLookup(meta.sosIncidentId);
    }
    return {
        file: file,
        meta: meta,
        attachments: attachments,
        exports: exports,
        sos: sos,
        previewUrl: '/api/evidence/preview/' + encodeURIComponent(fileId),
    };
}

function updateMeta(fileId, patch, actor) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const prev = siteDb.getEvidenceMeta(fileId) || { evidenceFileId: fileId };
    const next = {
        evidenceFileId: fileId,
        notes: patch.notes != null ? String(patch.notes) : (prev.notes || ''),
        sosIncidentId: patch.sosIncidentId !== undefined ? (patch.sosIncidentId || null) : prev.sosIncidentId,
        trimStartSec: patch.trimStartSec !== undefined ? patch.trimStartSec : prev.trimStartSec,
        trimEndSec: patch.trimEndSec !== undefined ? patch.trimEndSec : prev.trimEndSec,
        dockId: patch.dockId !== undefined ? (patch.dockId || null) : prev.dockId,
        dockBay: patch.dockBay !== undefined ? patch.dockBay : prev.dockBay,
        updatedBy: actor && actor.username ? actor.username : null,
    };
    siteDb.upsertEvidenceMeta(next);
    return siteDb.getEvidenceMeta(fileId);
}

function saveAttachment(fileId, originalName, buffer, actor) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    if (!buffer || !buffer.length) throw new Error('Empty file');
    const safeName = String(originalName || 'photo.jpg').replace(/[<>:"/\\|?*]/g, '_').slice(0, 120);
    if (!IMAGE_EXT.test(safeName)) throw new Error('Only image files (JPEG, PNG, etc.) are allowed');
    const id = newAttachmentId();
    const rel = path.join(fileId, id + '_' + safeName).replace(/\\/g, '/');
    const abs = attachmentAbs(rel);
    if (!abs) throw new Error('Invalid attachment path');
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffer);
    siteDb.insertEvidenceAttachment({
        id: id,
        evidenceFileId: fileId,
        fileName: safeName,
        relativePath: rel,
        kind: 'photo',
        byteSize: buffer.length,
        uploadedBy: actor && actor.username ? actor.username : null,
    });
    return siteDb.getEvidenceAttachment(id);
}

function resolveAttachmentStream(attachmentId) {
    const att = siteDb.getEvidenceAttachment(attachmentId);
    if (!att) return null;
    const abs = attachmentAbs(att.relativePath);
    if (!abs || !fs.existsSync(abs)) return null;
    return { att: att, fullPath: abs };
}

async function probeDuration(fullPath) {
    const ff = resolveFfmpeg.resolveFfmpegPath();
    try {
        const out = await execFileAsync(ff, [
            '-i', fullPath,
            '-hide_banner',
        ], { timeout: 15000, windowsHide: true });
        return parseDurationFromFfmpegErr(out.stderr || out.stdout || '');
    } catch (err) {
        const text = (err.stderr || err.stdout || err.message || '').toString();
        return parseDurationFromFfmpegErr(text);
    }
}

function parseDurationFromFfmpegErr(text) {
    const m = String(text).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!m) return null;
    return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3]);
}

function resolveFilePath(file) {
    if (!file) return null;
    const root = evidenceRootFor(file);
    if (!root) return null;
    const full = path.join(root, file.relativePath);
    const norm = path.normalize(full);
    if (!norm.startsWith(path.normalize(root))) return null;
    if (!fs.existsSync(norm)) return null;
    return norm;
}

async function runTrimExport(fileId, opts, actor) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const inputPath = evidenceRegistry.resolveFilePath(file);
    if (!inputPath) throw new Error('Source file missing on storage');

    let startSec = opts.trimStartSec != null ? Number(opts.trimStartSec) : 0;
    let endSec = opts.trimEndSec != null ? Number(opts.trimEndSec) : null;
    if (Number.isNaN(startSec) || startSec < 0) startSec = 0;

    const duration = await probeDuration(inputPath);
    if (duration != null) {
        if (endSec == null || Number.isNaN(endSec)) endSec = duration;
        if (endSec <= startSec) throw new Error('Trim end must be after start');
        if (endSec > duration) endSec = duration;
    } else if (endSec == null || Number.isNaN(endSec)) {
        throw new Error('Could not detect duration — set trim end time');
    }

    const exportId = newExportId();
    const base = path.basename(file.fileName, path.extname(file.fileName));
    const outName = base + '_trim_' + exportId.slice(-6) + '.mp4';
    const rel = path.join(fileId, exportId + '_' + outName).replace(/\\/g, '/');
    const outPath = exportAbs(rel);
    if (!outPath) throw new Error('Invalid export path');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const ff = resolveFfmpeg.resolveFfmpegPath();
    const args = ['-y', '-ss', String(startSec), '-to', String(endSec), '-i', inputPath, '-c', 'copy', outPath];
    await execFileAsync(ff, args, { timeout: 600000, windowsHide: true, maxBuffer: 1024 * 1024 });

    let byteSize = 0;
    try { byteSize = fs.statSync(outPath).size; } catch (_) { /* ignore */ }

    const metaJson = JSON.stringify({
        trimStartSec: startSec,
        trimEndSec: endSec,
        sourceFileId: fileId,
        sourceFileName: file.fileName,
    });

    siteDb.insertEvidenceExport({
        exportId: exportId,
        evidenceFileId: fileId,
        exportType: 'trim',
        relativePath: rel,
        fileName: outName,
        byteSize: byteSize,
        actor: actor && actor.username ? actor.username : null,
        userId: actor && actor.userId ? actor.userId : null,
        metaJson: metaJson,
    });

    siteDb.upsertEvidenceMeta({
        evidenceFileId: fileId,
        trimStartSec: startSec,
        trimEndSec: endSec,
        notes: opts.notes != null ? String(opts.notes) : (siteDb.getEvidenceMeta(fileId) || {}).notes,
        sosIncidentId: opts.sosIncidentId !== undefined ? opts.sosIncidentId : (siteDb.getEvidenceMeta(fileId) || {}).sosIncidentId,
        updatedBy: actor && actor.username ? actor.username : null,
    });

    return {
        exportId: exportId,
        fileName: outName,
        byteSize: byteSize,
        downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
        trimStartSec: startSec,
        trimEndSec: endSec,
    };
}

function resolveExportStream(exportId) {
    const row = siteDb.getEvidenceExport(exportId);
    if (!row) return null;
    const abs = exportAbs(row.relativePath);
    if (!abs || !fs.existsSync(abs)) return null;
    return { row: row, fullPath: abs };
}

function resolvePreviewPath(fileId) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) return null;
    return evidenceRegistry.resolveFilePath(file);
}

/** Build FTP upload hints per dock from catalog + dock ftpSubfolder. */
function ftpHintsForDocks(docks, catalogFiles) {
    const hints = Object.create(null);
    (docks || []).forEach(function (dock) {
        hints[dock.id] = Object.create(null);
    });
    (catalogFiles || []).forEach(function (f) {
        const rel = f.relativePath || f.relative_path || '';
        (docks || []).forEach(function (dock) {
            const sub = (dock.ftpSubfolder || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
            if (!sub) return;
            if (rel.indexOf(sub + '/') !== 0 && rel !== sub) return;
            hints[dock.id][1] = {
                serial: f.deviceId || null,
                operatorName: f.operatorName || null,
                state: 'complete',
                progress: 100,
                lastEventAt: f.uploadedAt || null,
            };
        });
    });
    return hints;
}

module.exports = {
    init,
    getDetail,
    updateMeta,
    saveAttachment,
    resolveAttachmentStream,
    runTrimExport,
    resolveExportStream,
    resolvePreviewPath,
    probeDuration,
    ftpHintsForDocks,
    attachmentsRoot: function () { return attachmentsRoot; },
    exportsRoot: function () { return exportsRoot; },
};
