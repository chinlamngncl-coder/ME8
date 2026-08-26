'use strict';
/**
 * VMS Court Package Export Engine — Step 6
 *
 * generateCourtPackage(caseId, actorUserId) → { zipPath, zipSha256, manifest }
 *
 * Legal requirements enforced:
 *   1. -ss is placed AFTER -i (frame-accurate seek, not keyframe seek).
 *   2. Every exported MP4 and snapshot receives a SHA-256 hash.
 *   3. manifest.txt lists all files + hashes.
 *   4. Audit log entry (tamper-evident) records actor + caseId + ZIP hash.
 *
 * No third-party zip library required — uses the same zero-dep builder from
 * caseCourtExport.js for small-to-medium packages. For large video exports
 * the files are written to a temp dir first, then read back for zipping.
 * (Future: replace buildZip with a streaming archiver for >4 GB packages.)
 */

const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const crypto  = require('crypto');
const { spawn } = require('child_process');
const siteDb  = require('./siteDb');
const log     = require('./fleetLog');
const auditLog = require('./auditLog');

/* ── Reuse zero-dep ZIP builder from sibling module ─────────────────────────── */
/* buildZip is not exported by caseCourtExport — inline a thin wrapper here.    */

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xFFFF, 0); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }

function buildZip(entries) {
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const locals = []; const centrals = []; let offset = 0;
    for (const ent of entries) {
        const name = Buffer.from(String(ent.name || 'file'), 'utf8');
        const data = Buffer.isBuffer(ent.data) ? ent.data : Buffer.from(ent.data || '');
        const crc  = crc32(data);
        const local = Buffer.concat([
            Buffer.from([0x50,0x4b,0x03,0x04]), u16(20), u16(0x0800), u16(0),
            u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length),
            u16(name.length), u16(0), name, data,
        ]);
        const central = Buffer.concat([
            Buffer.from([0x50,0x4b,0x01,0x02]), u16(20), u16(20), u16(0x0800), u16(0),
            u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length),
            u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
        ]);
        locals.push(local); centrals.push(central); offset += local.length;
    }
    const cb = Buffer.concat(centrals);
    const eocd = Buffer.concat([
        Buffer.from([0x50,0x4b,0x05,0x06]), u16(0), u16(0),
        u16(entries.length), u16(entries.length), u32(cb.length), u32(offset), u16(0),
    ]);
    return Buffer.concat([...locals, cb, eocd]);
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (d) => hash.update(d));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

function sha256Buffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function safeFileName(s) {
    return String(s || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 60) || 'file';
}

function nowIso() { return new Date().toISOString(); }

/** Offline External Reviewer page — local SHA-256 vs manifest (no install). */
function buildViewEvidenceHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evidence Package Verify</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;line-height:1.45}
label{display:flex;flex-direction:column;gap:6px;margin:12px 0;max-width:420px}
input,textarea,button{font:inherit}
textarea{min-height:120px;max-width:100%}
#status{margin-top:12px;font-weight:600}
.match{color:#2a7a45}.mismatch{color:#b33}
code{word-break:break-all}
</style>
</head>
<body>
<h1>Evidence Package Verify</h1>
<p>Offline check for an External Reviewer. Select a media file from this package and compare its SHA-256 to the line in <code>manifest.txt</code>. Nothing is uploaded.</p>
<label>Media file (.mp4 or image)
<input type="file" id="media" accept="video/*,image/*">
</label>
<label>Expected SHA-256 (from manifest.txt)
<input type="text" id="expected" maxlength="128" placeholder="64 hex characters" autocomplete="off">
</label>
<button type="button" id="run">Verify</button>
<p id="status" aria-live="polite"></p>
<p id="computed"></p>
<script>
(function(){
  function hex(buf){var u=new Uint8Array(buf),s='';for(var i=0;i<u.length;i++)s+=(u[i]<16?'0':'')+u[i].toString(16);return s;}
  function norm(s){return String(s||'').trim().toLowerCase().replace(/^sha-?256\\s*:?\\s*/i,'').replace(/\\s+/g,'');}
  document.getElementById('run').onclick=async function(){
    var st=document.getElementById('status'), out=document.getElementById('computed');
    st.className='';st.textContent='';out.textContent='';
    var f=document.getElementById('media').files[0];
    var exp=norm(document.getElementById('expected').value);
    if(!f){st.textContent='Choose a media file.';return;}
    if(exp && !/^[0-9a-f]{64}$/.test(exp)){st.textContent='Expected hash must be 64 hex characters.';return;}
    if(!window.crypto||!crypto.subtle){st.textContent='This browser cannot hash locally.';return;}
    st.textContent='Hashing…';
    try{
      var dig=await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
      var got=hex(dig);
      out.innerHTML='Computed: <code>'+got+'</code>';
      if(!exp){st.textContent='Hash ready — paste expected SHA-256 to compare.';return;}
      if(got===exp){st.className='match';st.textContent='MATCH';}
      else{st.className='mismatch';st.textContent='MISMATCH';}
    }catch(e){st.textContent='Verify failed.';}
  };
})();
</script>
</body>
</html>`;
}

/**
 * Transcode a fixed-camera segment (or a trimmed clip) to package-ready MP4.
 *
 * Frame-accurate seek: -ss and -t are placed AFTER -i so FFmpeg decodes from
 * the beginning of the container to the precise start frame (legal requirement).
 *
 * @param {string} inputPath  Absolute path to the source MP4 segment.
 * @param {string} outputPath Absolute path for the transcoded MP4.
 * @param {number|null} startSec Clip start offset in seconds (null = from beginning).
 * @param {number|null} durationSec Clip duration in seconds (null = to end of file).
 * @returns {Promise<void>}
 */
function transcodeClip(inputPath, outputPath, startSec, durationSec) {
    return new Promise((resolve, reject) => {
        const args = ['-y', '-i', inputPath];

        /* -ss and -t AFTER -i for frame-accurate seek (legal requirement) */
        if (startSec != null && startSec > 0) {
            args.push('-ss', String(startSec.toFixed(3)));
        }
        if (durationSec != null && durationSec > 0) {
            args.push('-t', String(durationSec.toFixed(3)));
        }

        args.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',          // near-lossless quality for court evidence
            '-c:a', 'aac',
            '-movflags', '+faststart',
            '-map_metadata', '-1', // strip camera-embedded metadata (chain-of-custody clean)
            outputPath
        );

        log.media.info('[vms-export] ffmpeg transcode start', { outputPath });
        const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        ff.stderr.on('data', (d) => { stderr += d.toString(); });
        ff.on('error', (err) => reject(new Error('FFmpeg not found: ' + err.message)));
        ff.on('close', (code) => {
            if (code === 0) {
                log.media.info('[vms-export] ffmpeg transcode done', { outputPath });
                resolve();
            } else {
                reject(new Error('FFmpeg exited ' + code + ': ' + stderr.slice(-400)));
            }
        });
    });
}

/* ── Core export function ────────────────────────────────────────────────────── */

/**
 * Generate a court-ready ZIP package for a VMS incident case.
 *
 * @param {string} caseId       vms_incident_cases.id
 * @param {string} actorUserId  Dashboard username performing the export (for audit)
 * @returns {Promise<{ zipBuffer: Buffer, zipSha256: string, manifest: string }>}
 */
async function generateCourtPackage(caseId, actorUserId) {
    if (!caseId) throw new Error('caseId required');

    /* 1 — Load case header */
    const { rows: caseRows } = await siteDb.query(
        `SELECT * FROM vms_incident_cases WHERE id = $1`, [caseId]
    );
    if (!caseRows.length) throw new Error('Case not found: ' + caseId);
    const incidentCase = caseRows[0];

    /* 2 — Load all case items ordered chronologically */
    const { rows: items } = await siteDb.query(
        `SELECT ci.*, vrs.file_path, vrs.start_at AS seg_start, vrs.status AS seg_status
         FROM vms_case_items ci
         LEFT JOIN vms_recording_segments vrs ON (ci.source_type = 'fixed' AND ci.source_id = vrs.id)
         WHERE ci.case_id = $1
         ORDER BY ci.added_at ASC`,
        [caseId]
    );

    const tmpDir = path.join(os.tmpdir(), 'vms-export-' + caseId.slice(0, 12) + '-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const manifestLines = [
        'MOBILITY AXIOM — EVIDENCE PACKAGE',
        'Case:       ' + incidentCase.title,
        'Case ID:    ' + caseId,
        'Exported:   ' + nowIso(),
        'Exported by:' + (actorUserId || 'unknown'),
        '',
        'FILE                                                      SHA-256',
        '─'.repeat(90),
    ];

    const zipEntries = [];
    const errors     = [];

    /* 3 — Process each case item */
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let meta = {};
        try { meta = JSON.parse(item.metadata_json || '{}'); } catch (_) { /* ignore */ }

        /* ── Fixed camera video clip ───────────────────────────────────────── */
        if (item.source_type === 'fixed') {
            if (item.seg_status === 'recording') {
                errors.push('Item ' + item.id + ': segment still recording — skipped');
                continue;
            }
            if (!item.file_path || !fs.existsSync(item.file_path)) {
                errors.push('Item ' + item.id + ': source file missing — skipped');
                continue;
            }

            /* Calculate trim offsets relative to segment start */
            let startSec    = null;
            let durationSec = null;
            if (item.start_at && item.seg_start) {
                const segStartMs  = new Date(item.seg_start).getTime();
                const clipStartMs = new Date(item.start_at).getTime();
                startSec = Math.max(0, (clipStartMs - segStartMs) / 1000);
            }
            if (item.start_at && item.end_at) {
                durationSec = Math.max(0.1,
                    (new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 1000);
            }

            const label    = safeFileName(meta.camName || ('Fixed_' + (i + 1)));
            const outName  = 'Video/' + label + '_clip_' + (i + 1) + '.mp4';
            const outPath  = path.join(tmpDir, 'clip_' + (i + 1) + '.mp4');

            try {
                await transcodeClip(item.file_path, outPath, startSec, durationSec);
                const hash = await sha256File(outPath);
                const data = fs.readFileSync(outPath);
                zipEntries.push({ name: outName, data });
                manifestLines.push(outName.padEnd(55) + hash);
            } catch (err) {
                errors.push('Item ' + item.id + ' transcode failed: ' + err.message);
            } finally {
                try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) { /* ignore */ }
            }
        }

        /* ── BWC evidence clip (already stored as evidence_file) ─────────── */
        else if (item.source_type === 'bwc') {
            /* BWC clips reference evidence_files by source_id.
             * They are already in court-ready format — copy directly. */
            const { rows: evRows } = await siteDb.query(
                `SELECT relative_path, file_name FROM evidence_files WHERE id = $1`, [item.source_id]
            );
            if (!evRows.length) { errors.push('BWC item ' + item.id + ': not found'); continue; }
            const rel     = evRows[0].relative_path;
            const absPath = path.join(process.env.STORAGE_DIR || 'storage', rel);
            if (!fs.existsSync(absPath)) {
                errors.push('BWC item ' + item.id + ': file missing'); continue;
            }
            const data    = fs.readFileSync(absPath);
            const hash    = sha256Buffer(data);
            const outName = 'BWC/' + safeFileName(evRows[0].file_name || item.source_id);
            zipEntries.push({ name: outName, data });
            manifestLines.push(outName.padEnd(55) + hash);
            try {
                const retentionHold = require('./evidenceRetentionHold');
                await retentionHold.applyRetentionHold(String(item.source_id || ''), 'evidence_package');
            } catch (_) { /* hold best-effort */ }
        }

        /* ── ANPR snapshot ───────────────────────────────────────────────── */
        else if (item.source_type === 'anpr') {
            const snapPath = meta.cropPath || null;
            if (!snapPath || !fs.existsSync(snapPath)) {
                errors.push('ANPR item ' + item.id + ': snapshot missing'); continue;
            }
            const data    = fs.readFileSync(snapPath);
            const hash    = sha256Buffer(data);
            const plate   = safeFileName(meta.plate || item.source_id);
            const outName = 'ANPR/Plate_' + plate + '_' + (i + 1) + path.extname(snapPath);
            zipEntries.push({ name: outName, data });
            manifestLines.push(outName.padEnd(55) + hash);
        }

        /* ── Officer note (plain text) ───────────────────────────────────── */
        else if (item.source_type === 'note') {
            const noteText = meta.body || meta.text || '';
            const data     = Buffer.from(noteText, 'utf8');
            const hash     = sha256Buffer(data);
            const outName  = 'Notes/Note_' + (i + 1) + '.txt';
            zipEntries.push({ name: outName, data });
            manifestLines.push(outName.padEnd(55) + hash);
        }
    }

    /* 4 — Append any non-fatal errors to manifest */
    if (errors.length) {
        manifestLines.push('', '── EXPORT WARNINGS ──────────────────────────────────────────────────────────');
        errors.forEach((e) => manifestLines.push('  ' + e));
    }

    manifestLines.push('', '── END OF MANIFEST ──────────────────────────────────────────────────────────');
    const manifestText = manifestLines.join('\n');
    const manifestBuf  = Buffer.from(manifestText, 'utf8');
    const manifestHash = sha256Buffer(manifestBuf);
    zipEntries.push({ name: 'manifest.txt', data: manifestBuf });

    /* HOW-TO-VERIFY — Evidence Hub Package Verify + offline View-Evidence.html */
    zipEntries.push({
        name: 'HOW-TO-VERIFY.txt',
        data: Buffer.from(
            [
                'MOBILITY AXIOM — HOW TO VERIFY THIS PACKAGE',
                '',
                'On the server (operator):',
                '1. Evidence and Docking → Evidence Package Verify.',
                '2. Prefer Package ID verify (server hashes its copy — no re-upload).',
                '3. Or choose this ZIP locally and paste Expected SHA-256.',
                '4. MATCH = bytes unchanged. MISMATCH = package was altered.',
                '',
                'Offline (External Reviewer, no install):',
                '1. Open View-Evidence.html from this ZIP in a browser.',
                '2. Select a media file and paste its SHA-256 from manifest.txt.',
                '',
                'Integrity uses SHA-256. Per-file hashes are listed in manifest.txt.',
                '',
            ].join('\n'),
            'utf8'
        ),
    });
    zipEntries.push({
        name: 'View-Evidence.html',
        data: Buffer.from(buildViewEvidenceHtml(), 'utf8'),
    });

    /* 5 — Build ZIP */
    // TODO (Pre-Ship Block): Implement AES-256 password encryption for Court ZIP exports once BWC/Dock AES architecture is finalized.
    const zipBuffer = buildZip(zipEntries);
    const zipSha256 = sha256Buffer(zipBuffer);

    /* 6 — Audit log entry (unalterable — INSERT only, never UPDATE/DELETE) */
    try {
        await auditLog.record('vms.evidence_package_export', {
            caseId,
            caseTitle:   incidentCase.title,
            actor:       actorUserId || 'unknown',
            itemCount:   items.length,
            manifestSha: manifestHash,
            zipSha256,
            exportedAt:  nowIso(),
        });
    } catch (logErr) {
        /* Audit failure is logged server-side but must not block delivery */
        log.web.error('[vms-export] AUDIT LOG FAILED — export delivered but not recorded', {
            caseId, zipSha256, error: logErr.message,
        });
    }

    /* 7 — Mark case as exported */
    await siteDb.query(
        `UPDATE vms_incident_cases SET status = 'exported', updated_at = $1 WHERE id = $2`,
        [nowIso(), caseId]
    );

    /* Clean up temp dir */
    try { fs.rmdirSync(tmpDir, { recursive: true }); } catch (_) { /* ignore */ }

    return { zipBuffer, zipSha256, manifest: manifestText, manifestSha: manifestHash };
}

module.exports = {
    generateCourtPackage: generateCourtPackage,
    generateEvidencePackage: generateCourtPackage,
    buildViewEvidenceHtml: buildViewEvidenceHtml,
};
