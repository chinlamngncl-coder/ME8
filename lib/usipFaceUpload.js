/**
 * SDK-USIP-FACEUPLOAD-INGEST-V1 — BWC FaceUpload receive + store only.
 * POST /image/v1/FaceUpload (multipart). Matching / AES = later MOBs.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png']);

let uploadRoot = null;
let logRef = null;

function init(opts) {
    const o = opts || {};
    const base = o.root || o.storageDir;
    if (!base) throw new Error('usipFaceUpload.init requires root');
    uploadRoot = path.join(path.resolve(base), 'usip-face-upload');
    logRef = o.log || null;
    try { fs.mkdirSync(uploadRoot, { recursive: true }); } catch (_) { /* ignore */ }
    return uploadRoot;
}

function getRoot() {
    return uploadRoot;
}

function safeDeviceId(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 32) return null;
    return digits;
}

function safeFileName(raw) {
    const base = path.basename(String(raw || 'capture.jpg').replace(/\\/g, '/'));
    const cleaned = base.replace(/[^\w.\-()+ ]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!cleaned || cleaned === '.' || cleaned === '..') return 'capture.jpg';
    if (!/\.(jpe?g|png)$/i.test(cleaned)) return cleaned + '.jpg';
    return cleaned;
}

function dateFolderFromTime(timeStr) {
    const s = String(timeStr || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + m[2] + m[3];
    const d = new Date();
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return '' + y + mo + day;
}

function mimeOk(mime, originalName) {
    const m = String(mime || '').toLowerCase().trim();
    if (ALLOWED_MIME.has(m)) return true;
    return /\.(jpe?g|png)$/i.test(String(originalName || ''));
}

/**
 * @param {object} fields - req.body string fields
 * @param {{ buffer: Buffer, mimetype?: string, originalname?: string, size?: number }|null} imageFile
 * @param {{ buffer: Buffer, mimetype?: string, originalname?: string, size?: number }|null} relFile
 */
function ingest(fields, imageFile, relFile) {
    if (!uploadRoot) {
        return { ok: false, status: 503, body: { success: false, data: null, msg: 'face_upload_not_ready' } };
    }
    const f = fields || {};
    const deviceId = safeDeviceId(f.DeviceID);
    if (!deviceId) {
        return { ok: false, status: 400, body: { success: false, data: null, msg: 'bad_DeviceID' } };
    }
    const filename = safeFileName(f.filename || (imageFile && imageFile.originalname));
    const timeStr = String(f.Time || '').trim() || new Date().toISOString().slice(0, 19);
    if (!imageFile || !imageFile.buffer || !imageFile.buffer.length) {
        return { ok: false, status: 400, body: { success: false, data: null, msg: 'image_required' } };
    }
    if (imageFile.buffer.length > MAX_IMAGE_BYTES) {
        return { ok: false, status: 413, body: { success: false, data: null, msg: 'image_too_large' } };
    }
    if (!mimeOk(imageFile.mimetype, imageFile.originalname || filename)) {
        return { ok: false, status: 400, body: { success: false, data: null, msg: 'bad_image_type' } };
    }

    const day = dateFolderFromTime(timeStr);
    const relDir = path.join(deviceId, day);
    const absDir = path.join(uploadRoot, relDir);
    fs.mkdirSync(absDir, { recursive: true });

    const absImage = path.join(absDir, filename);
    if (!absImage.startsWith(path.resolve(uploadRoot) + path.sep) && absImage !== path.resolve(uploadRoot)) {
        return { ok: false, status: 400, body: { success: false, data: null, msg: 'path_rejected' } };
    }
    fs.writeFileSync(absImage, imageFile.buffer);

    let relFileName = '';
    if (relFile && relFile.buffer && relFile.buffer.length) {
        if (relFile.buffer.length <= MAX_IMAGE_BYTES && mimeOk(relFile.mimetype, relFile.originalname)) {
            relFileName = safeFileName(relFile.originalname || ('rel-' + filename));
            const absRel = path.join(absDir, relFileName);
            if (absRel.startsWith(path.resolve(uploadRoot) + path.sep)) {
                fs.writeFileSync(absRel, relFile.buffer);
            } else {
                relFileName = '';
            }
        }
    }

    const filePathLabel = deviceId + '/' + day + '/' + filename;
    const meta = {
        DeviceID: deviceId,
        Time: timeStr,
        Longitude: String(f.Longitude != null ? f.Longitude : ''),
        Latitude: String(f.Latitude != null ? f.Latitude : ''),
        pos_time: f.pos_time != null && f.pos_time !== '' ? Number(f.pos_time) || f.pos_time : '',
        police_number: String(f.police_number != null ? f.police_number : ''),
        sex: String(f.sex != null ? f.sex : ''),
        age: String(f.age != null ? f.age : ''),
        ext1: String(f.ext1 != null ? f.ext1 : ''),
        ext2: String(f.ext2 != null ? f.ext2 : ''),
        ext3: String(f.ext3 != null ? f.ext3 : ''),
        filename: filename,
        file_path: filePathLabel,
        rel_file: relFileName,
        size: imageFile.buffer.length,
        receivedAt: new Date().toISOString(),
        path: 'SDK-USIP-FACEUPLOAD-INGEST-V1',
    };
    try {
        fs.writeFileSync(absImage + '.json', JSON.stringify(meta, null, 2), 'utf8');
    } catch (_) { /* ignore sidecar */ }

    if (logRef && logRef.media && typeof logRef.media.info === 'function') {
        logRef.media.info('usip face upload stored', {
            deviceId: deviceId,
            size: meta.size,
            file_path: filePathLabel,
            path: 'SDK-USIP-FACEUPLOAD-INGEST-V1',
        });
    }

    return {
        ok: true,
        status: 200,
        body: {
            success: true,
            data: {
                DeviceID: meta.DeviceID,
                Time: meta.Time,
                Longitude: meta.Longitude,
                Latitude: meta.Latitude,
                pos_time: meta.pos_time,
                police_number: meta.police_number,
                sex: meta.sex,
                age: meta.age,
                ext1: meta.ext1,
                ext2: meta.ext2,
                ext3: meta.ext3,
                filename: meta.filename,
                file_path: meta.file_path,
                rel_file: meta.rel_file,
                size: meta.size,
            },
            msg: 'succeed',
        },
    };
}

module.exports = {
    init,
    getRoot,
    ingest,
    MAX_IMAGE_BYTES,
};
