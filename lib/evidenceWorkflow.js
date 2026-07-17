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
const evidenceCustodyAudit = require('./evidenceCustodyAudit');
const os = require('os');
const resolveFfmpeg = require('./resolveFfmpeg');
const faceTrackSidecar = require('./faceTrackSidecar');

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;
const TAG_MAX_COUNT = 12;
const TAG_MAX_LEN = 32;
const TAG_ALLOWED_RE = /^[a-z0-9][a-z0-9_-]*$/;

let attachmentsRoot = null;
let exportsRoot = null;

function init(storageDir) {
    attachmentsRoot = path.join(storageDir, 'evidence-attachments');
    exportsRoot = path.join(storageDir, 'evidence-exports');
    fs.mkdirSync(attachmentsRoot, { recursive: true });
    fs.mkdirSync(exportsRoot, { recursive: true });
}

function normalizeTags(input) {
    let raw = [];
    if (Array.isArray(input)) {
        raw = input;
    } else if (input == null) {
        raw = [];
    } else {
        raw = String(input).split(/[,;\s]+/);
    }
    const seen = Object.create(null);
    const out = [];
    for (let i = 0; i < raw.length; i++) {
        const tag = String(raw[i] || '').trim().toLowerCase();
        if (!tag) continue;
        if (tag.length > TAG_MAX_LEN) {
            throw new Error('Each tag must be at most ' + TAG_MAX_LEN + ' characters');
        }
        if (!TAG_ALLOWED_RE.test(tag)) {
            throw new Error('Tags may use letters, numbers, hyphen, and underscore only');
        }
        if (seen[tag]) continue;
        seen[tag] = true;
        out.push(tag);
        if (out.length > TAG_MAX_COUNT) {
            throw new Error('At most ' + TAG_MAX_COUNT + ' tags per file');
        }
    }
    return out;
}

function resolveCryptoStatus(file) {
    if (!file || file.storageAvailable === false) return 'missing';
    const fullPath = evidenceRegistry.resolveFilePath(file);
    if (!fullPath) return 'missing';
    try {
        const evidenceCrypto = require('./evidenceCrypto');
        return evidenceCrypto.isEncryptedFile(fullPath) ? 'encrypted' : 'plaintext';
    } catch (_) {
        return 'plaintext';
    }
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
        tags: [],
        sosIncidentId: null,
        trimStartSec: null,
        trimEndSec: null,
        dockId: null,
        dockBay: null,
    };
    if (!Array.isArray(meta.tags)) meta.tags = [];
    const attachments = siteDb.listEvidenceAttachments(fileId);
    const exports = siteDb.listEvidenceExports(fileId, 20);
    let sos = null;
    if (meta.sosIncidentId && sosLookup) {
        sos = sosLookup(meta.sosIncidentId);
    }
    const custody = evidenceCustodyAudit.listForFile(fileId);
    return {
        file: Object.assign({}, file, { archived: evidenceRegistry.isArchivedFile(file) }),
        meta: meta,
        cryptoStatus: resolveCryptoStatus(file),
        archived: evidenceRegistry.isArchivedFile(file),
        attachments: attachments,
        exports: exports,
        sos: sos,
        previewUrl: '/api/evidence/preview/' + encodeURIComponent(fileId),
        storageAvailable: !!file.storageAvailable,
        storageStatus: file.storageStatus || 'available',
        custodyLog: custody.rows,
        custodyUnavailable: !!custody.unavailable,
    };
}

function updateMeta(fileId, patch, actor) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const prev = siteDb.getEvidenceMeta(fileId) || { evidenceFileId: fileId, tags: [] };
    let tags = Array.isArray(prev.tags) ? prev.tags.slice() : [];
    if (patch.tags !== undefined) {
        tags = normalizeTags(patch.tags);
    }
    const next = {
        evidenceFileId: fileId,
        notes: patch.notes != null ? String(patch.notes) : (prev.notes || ''),
        sosIncidentId: patch.sosIncidentId !== undefined ? (patch.sosIncidentId || null) : prev.sosIncidentId,
        trimStartSec: patch.trimStartSec !== undefined ? patch.trimStartSec : prev.trimStartSec,
        trimEndSec: patch.trimEndSec !== undefined ? patch.trimEndSec : prev.trimEndSec,
        dockId: patch.dockId !== undefined ? (patch.dockId || null) : prev.dockId,
        dockBay: patch.dockBay !== undefined ? patch.dockBay : prev.dockBay,
        tags: tags,
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

function ffmpegRedactUserMessage(err) {
    const text = (err && (err.stderr || err.stdout || err.message) || '').toString();
    if (/no such filter|filter not found/i.test(text)) {
        return 'Video blur is not available on this server. Contact your IT administrator.';
    }
    if (/unknown encoder|disabled for libavcodec|could not find encoder/i.test(text)) {
        return 'Video encoding is not available on this server. Contact your IT administrator.';
    }
    if (/error opening input|invalid data found/i.test(text)) {
        return 'Could not read the source recording for redaction.';
    }
    return 'Redacted copy could not be created. Try fewer blur areas or contact your IT administrator.';
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

const MIN_TRIM_SECONDS = 1;

function ffmpegTrimUserMessage(err) {
    const text = (err && (err.stderr || err.stdout || err.message) || '').toString();
    if (/unknown encoder|disabled for libavcodec|could not find encoder/i.test(text)) {
        return 'Video encoding is not available on this server. Contact your IT administrator.';
    }
    if (/error opening input|invalid data found/i.test(text)) {
        return 'Could not read the source recording for trimming.';
    }
    return 'Trimmed clip could not be created. Check the start/end times or contact your IT administrator.';
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
        if (startSec >= duration) throw new Error('Trim start is beyond the end of the video');
        if (endSec > duration) endSec = duration;
    } else if (endSec == null || Number.isNaN(endSec)) {
        throw new Error('Could not detect duration — set the trim end time');
    }

    // Always validate the window (even when duration probe failed) so a
    // degenerate range can never reach ffmpeg and produce an empty file.
    if (endSec == null || Number.isNaN(endSec)) throw new Error('Set a valid trim end time');
    if (endSec <= startSec) throw new Error('Trim end must be after start');
    if ((endSec - startSec) < MIN_TRIM_SECONDS) {
        throw new Error('Trimmed clip must be at least ' + MIN_TRIM_SECONDS + ' seconds long');
    }

    const exportId = newExportId();
    const base = path.basename(file.fileName, path.extname(file.fileName));
    const outName = base + '_trim_' + exportId.slice(-6) + '.mp4';
    const rel = path.join(fileId, exportId + '_' + outName).replace(/\\/g, '/');
    const outPath = exportAbs(rel);
    if (!outPath) throw new Error('Invalid export path');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    // Re-encode (not stream copy) so the clip is frame-accurate, always starts
    // on a keyframe and plays everywhere (Windows Media Player, browsers).
    // libopenh264 + native aac are LGPL-clean and already in the shipped ffmpeg.
    const ff = resolveFfmpeg.resolveFfmpegPath();
    const args = [
        '-y',
        '-ss', String(startSec),
        '-i', inputPath,
        '-t', String(endSec - startSec),
        '-c:v', 'libopenh264',
        '-b:v', '4000k',
        '-fps_mode', 'cfr',
        '-g', '50',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outPath,
    ];
    try {
        await execFileAsync(ff, args, { timeout: 600000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    } catch (err) {
        try { fs.unlinkSync(outPath); } catch (_) { /* ignore */ }
        throw new Error(ffmpegTrimUserMessage(err));
    }

    let byteSize = 0;
    try { byteSize = fs.statSync(outPath).size; } catch (_) { /* ignore */ }
    // Reject empty / header-only outputs instead of registering a broken export.
    if (byteSize < 1024) {
        try { fs.unlinkSync(outPath); } catch (_) { /* ignore */ }
        throw new Error('Trimmed clip came out empty — try a longer range or a different start point');
    }

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

function parseExportMeta(row) {
    if (!row) return {};
    if (row.meta && typeof row.meta === 'object') return row.meta;
    if (row.metaJson) {
        try { return JSON.parse(row.metaJson); } catch (_) { return {}; }
    }
    return {};
}

function validateRedactRegions(regions) {
    if (!Array.isArray(regions) || !regions.length) {
        throw new Error('Mark at least one blur area');
    }
    const out = [];
    regions.forEach((r) => {
        const w = Math.round(Number(r.w) || 0);
        const h = Math.round(Number(r.h) || 0);
        const x = Math.max(0, Math.round(Number(r.x) || 0));
        const y = Math.max(0, Math.round(Number(r.y) || 0));
        if (w < 4 || h < 4) return;
        const t0 = Math.max(0, Number(r.t0) || 0);
        const t1 = Math.max(t0 + 0.1, Number(r.t1) || 999999);
        out.push({ x, y, w, h, t0, t1 });
    });
    if (!out.length) throw new Error('Mark at least one blur area');
    return out;
}

function buildRedactFilterComplex(regions) {
    const lines = [];
    let current = '0:v';
    regions.forEach((r, i) => {
        const isLast = i === regions.length - 1;
        const out = isLast ? 'vout' : `v${i + 1}`;
        lines.push(`[${current}]split[vb${i}][vs${i}]`);
        lines.push(`[vs${i}]crop=${r.w}:${r.h}:${r.x}:${r.y},gblur=sigma=20[vb${i}blur]`);
        lines.push(`[vb${i}][vb${i}blur]overlay=${r.x}:${r.y}:enable='between(t\\,${r.t0}\\,${r.t1})'[${out}]`);
        current = out;
    });
    return lines.join(';');
}

/** mob-evidence-redact-details-before-or-with-save-v1 — seed note fields from Save body. */
function normalizeRedactDraft(opts, actor) {
    opts = opts || {};
    const redactionReason = String(opts.redactionReason || '').trim();
    const visibleDescription = String(opts.visibleDescription || '').trim();
    const incidentNote = String(opts.incidentNote || '').trim();
    const hasReason = !!redactionReason;
    return {
        redactionReason: redactionReason || '',
        visibleDescription,
        incidentNote,
        status: hasReason ? 'draft' : 'pending_note',
        draftedBy: hasReason && actor && actor.username ? actor.username : null,
        draftedAt: hasReason ? new Date().toISOString() : null,
    };
}

async function applyRedaction(fileId, regions, actor, opts) {
    const file = evidenceRegistry.getFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const inputPath = evidenceRegistry.resolveFilePath(file);
    if (!inputPath) throw new Error('Source file missing on storage');

    const validRegions = validateRedactRegions(regions);
    const draft = normalizeRedactDraft(opts, actor);
    const exportId = newExportId();
    const base = path.basename(file.fileName, path.extname(file.fileName));
    const outName = base + '_redacted_' + exportId.slice(-6) + '.mp4';
    const rel = path.join(fileId, exportId + '_' + outName).replace(/\\/g, '/');
    const outPath = exportAbs(rel);
    if (!outPath) throw new Error('Invalid export path');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const filter = buildRedactFilterComplex(validRegions);
    const ff = resolveFfmpeg.resolveFfmpegPath();
    const args = [
        '-y', '-i', inputPath,
        '-filter_complex', filter,
        '-map', '[vout]',
        '-map', '0:a?',
        '-c:v', 'libopenh264',
        '-c:a', 'copy',
        outPath,
    ];
    try {
        await execFileAsync(ff, args, { timeout: 900000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    } catch (err) {
        throw new Error(ffmpegRedactUserMessage(err));
    }

    let byteSize = 0;
    try { byteSize = fs.statSync(outPath).size; } catch (_) { /* ignore */ }
    if (!byteSize) throw new Error('Redacted export failed — output file empty');

    const metaJson = JSON.stringify({
        sourceFileId: fileId,
        sourceFileName: file.fileName,
        regions: validRegions,
        mode: 'static-regions',
        status: draft.status,
        redactionReason: draft.redactionReason,
        visibleDescription: draft.visibleDescription,
        incidentNote: draft.incidentNote,
        draftedBy: draft.draftedBy,
        draftedAt: draft.draftedAt,
        finalizedBy: null,
        finalizedAt: null,
    });

    siteDb.insertEvidenceExport({
        exportId: exportId,
        evidenceFileId: fileId,
        exportType: 'redact',
        relativePath: rel,
        fileName: outName,
        byteSize: byteSize,
        actor: actor && actor.username ? actor.username : null,
        userId: actor && actor.userId ? actor.userId : null,
        metaJson: metaJson,
    });

    return {
        exportId: exportId,
        fileName: outName,
        byteSize: byteSize,
        downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
        regionCount: validRegions.length,
        mode: 'static-regions',
        meta: {
            redactionReason: draft.redactionReason,
            visibleDescription: draft.visibleDescription,
            incidentNote: draft.incidentNote,
            status: draft.status,
        },
    };
}

/**
 * mob-evidence-redact-face-follow-v1
 * Per-frame YuNet + IoU hold-tracker + tight ROI blur (sidecar), then mux
 * audio with bundled ffmpeg. Optional manualRegions applied after via FFmpeg.
 * Original evidence file is never modified.
 */
async function applyFaceFollowRedaction(fileId, actor, opts) {
    opts = opts || {};
    const file = evidenceRegistry.getFile(fileId);
    if (!file) throw new Error('Evidence file not found');
    const inputPath = evidenceRegistry.resolveFilePath(file);
    if (!inputPath) throw new Error('Source file missing on storage');
    const draft = normalizeRedactDraft(opts, actor);

    let manualRegions = [];
    if (opts.manualRegions && opts.manualRegions.length) {
        manualRegions = validateRedactRegions(opts.manualRegions);
    }

    const exportId = newExportId();
    const base = path.basename(file.fileName, path.extname(file.fileName));
    const outName = base + '_redacted_' + exportId.slice(-6) + '.mp4';
    const rel = path.join(fileId, exportId + '_' + outName).replace(/\\/g, '/');
    const outPath = exportAbs(rel);
    if (!outPath) throw new Error('Invalid export path');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-facefollow-'));
    const burnedPath = path.join(tmpDir, 'burned.mp4');
    const midPath = path.join(tmpDir, 'with-manual.mp4');

    try {
        const burn = await faceTrackSidecar.burnFaceFollow(inputPath, burnedPath, {
            score: opts.score != null ? opts.score : 0.72,
            pad: opts.pad != null ? opts.pad : 0.12,
            sigma: opts.sigma != null ? opts.sigma : 18,
            detectEvery: opts.detectEvery != null ? opts.detectEvery : 1,
            holdFrames: opts.holdFrames != null ? opts.holdFrames : 4,
            maxSeconds: opts.maxSeconds || 0,
            timeout: opts.timeout || 900000,
        });
        if (!burn || !burn.ok) {
            throw new Error((burn && burn.error) || 'Face-follow burn failed');
        }
        if (!fs.existsSync(burnedPath) || fs.statSync(burnedPath).size < 64) {
            throw new Error('Face-follow burn produced empty video');
        }

        const ff = resolveFfmpeg.resolveFfmpegPath();
        let videoForMux = burnedPath;

        if (manualRegions.length) {
            const filter = buildRedactFilterComplex(manualRegions);
            try {
                await execFileAsync(ff, [
                    '-y', '-i', burnedPath,
                    '-filter_complex', filter,
                    '-map', '[vout]',
                    '-an',
                    '-c:v', 'libopenh264',
                    midPath,
                ], { timeout: 900000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
            } catch (err) {
                throw new Error(ffmpegRedactUserMessage(err));
            }
            videoForMux = midPath;
        }

        try {
            await execFileAsync(ff, [
                '-y',
                '-i', videoForMux,
                '-i', inputPath,
                '-map', '0:v:0',
                '-map', '1:a?',
                '-c:v', 'libopenh264',
                '-c:a', 'copy',
                '-shortest',
                outPath,
            ], { timeout: 900000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        } catch (err) {
            throw new Error(ffmpegRedactUserMessage(err));
        }

        let byteSize = 0;
        try { byteSize = fs.statSync(outPath).size; } catch (_) { /* ignore */ }
        if (!byteSize) throw new Error('Redacted export failed — output file empty');

        const metaJson = JSON.stringify({
            sourceFileId: fileId,
            sourceFileName: file.fileName,
            mode: 'face-follow',
            faceFollow: {
                blurredFrames: burn.blurredFrames || 0,
                faceHits: burn.faceHits || 0,
                written: burn.written || 0,
                pad: burn.pad,
                score: burn.score,
                engine: burn.engine || 'seeta',
                detector: burn.detector || 'seeta_face_detector',
            },
            regions: manualRegions,
            status: draft.status,
            redactionReason: draft.redactionReason,
            visibleDescription: draft.visibleDescription,
            incidentNote: draft.incidentNote,
            draftedBy: draft.draftedBy,
            draftedAt: draft.draftedAt,
            finalizedBy: null,
            finalizedAt: null,
        });

        siteDb.insertEvidenceExport({
            exportId: exportId,
            evidenceFileId: fileId,
            exportType: 'redact',
            relativePath: rel,
            fileName: outName,
            byteSize: byteSize,
            actor: actor && actor.username ? actor.username : null,
            userId: actor && actor.userId ? actor.userId : null,
            metaJson: metaJson,
        });

        return {
            exportId: exportId,
            fileName: outName,
            byteSize: byteSize,
            downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
            regionCount: manualRegions.length,
            mode: 'face-follow',
            faceFollow: {
                blurredFrames: burn.blurredFrames || 0,
                faceHits: burn.faceHits || 0,
            },
            meta: {
                redactionReason: draft.redactionReason,
                visibleDescription: draft.visibleDescription,
                incidentNote: draft.incidentNote,
                status: draft.status,
            },
        };
    } finally {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (_) { /* ignore */ }
    }
}

function getRedactExport(exportId) {
    const row = siteDb.getEvidenceExport(exportId);
    if (!row || row.exportType !== 'redact') return null;
    return row;
}

function saveRedactNote(exportId, patch, actor) {
    const row = getRedactExport(exportId);
    if (!row) throw new Error('Redacted export not found');
    const meta = parseExportMeta(row);
    if (meta.status === 'finalized') throw new Error('Redacted export already finalized');
    const next = Object.assign({}, meta, {
        redactionReason: patch.redactionReason != null ? String(patch.redactionReason).trim() : (meta.redactionReason || ''),
        visibleDescription: patch.visibleDescription != null ? String(patch.visibleDescription).trim() : (meta.visibleDescription || ''),
        incidentNote: patch.incidentNote != null ? String(patch.incidentNote).trim() : (meta.incidentNote || ''),
        draftedBy: actor && actor.username ? actor.username : meta.draftedBy,
        draftedAt: new Date().toISOString(),
        status: 'draft',
    });
    siteDb.updateEvidenceExportMeta(exportId, next);
    return { exportId: exportId, meta: next };
}

function finalizeRedactExport(exportId, actor) {
    const row = getRedactExport(exportId);
    if (!row) throw new Error('Redacted export not found');
    const meta = parseExportMeta(row);
    if (!meta.redactionReason) throw new Error('Redaction reason required before finalize');
    if (!meta.visibleDescription && !meta.incidentNote) {
        throw new Error('Add a visible description or incident note before finalize');
    }
    const next = Object.assign({}, meta, {
        finalizedBy: actor && actor.username ? actor.username : null,
        finalizedAt: new Date().toISOString(),
        status: 'finalized',
    });
    siteDb.updateEvidenceExportMeta(exportId, next);
    return {
        exportId: exportId,
        fileName: row.fileName,
        downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
        meta: next,
    };
}

function resolveExportStream(exportId) {
    const row = siteDb.getEvidenceExport(exportId);
    if (!row) return null;
    const abs = exportAbs(row.relativePath);
    if (!abs || !fs.existsSync(abs)) return null;
    return { row: row, fullPath: abs };
}

/** Period helper aligned with caseFiles (week / 4weeks / month / …). */
function exportPeriodBounds(period) {
    if (!period || period === 'all') return { from: null, to: null };
    const now = new Date();
    const d = new Date(now);
    if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === '4weeks') d.setDate(d.getDate() - 28);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else if (period === '3months') d.setMonth(d.getMonth() - 3);
    else if (period === '6months') d.setMonth(d.getMonth() - 6);
    else if (period === 'year') d.setFullYear(d.getFullYear() - 1);
    else return { from: null, to: null };
    return { from: d.toISOString(), to: null };
}

/**
 * mob-evidence-redacted-exports-browser-v1
 * List redacted exports from the registry (not a raw disk browse).
 */
function listRedactedExports(opts) {
    opts = opts || {};
    const bounds = exportPeriodBounds(opts.period);
    return siteDb.listRedactedEvidenceExportsPage({
        status: opts.status,
        q: opts.q,
        tag: opts.tag,
        from: opts.from || bounds.from,
        to: opts.to || bounds.to,
        page: opts.page,
        pageSize: opts.pageSize || opts.limit,
    });
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
    applyRedaction,
    applyFaceFollowRedaction,
    saveRedactNote,
    finalizeRedactExport,
    getRedactExport,
    resolveExportStream,
    listRedactedExports,
    resolvePreviewPath,
    probeDuration,
    ftpHintsForDocks,
    attachmentsRoot: function () { return attachmentsRoot; },
    exportsRoot: function () { return exportsRoot; },
};
