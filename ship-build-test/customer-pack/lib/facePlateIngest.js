/**
 * Face / plate alerts via message service (PDF §12, page 27).
 * Images may arrive on WS:6000 (level 101/102) or via FTP on the BWC (configure on device).
 */

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ingestFromMessage(opts) {
    const { complete, cameraId, baseDir, log, emit } = opts;
    if (!complete || !complete.binary) return false;
    const level = complete.level;
    const FACE = 101;
    const PLATE = 102;
    if (level !== FACE && level !== PLATE) return false;
    if (complete.type !== 1) return false; // PICTURE

    const kind = level === FACE ? 'face' : 'plate';
    const ext1 = (complete.name || '').trim();
    const dir = path.join(baseDir, 'storage', 'face-plate');
    ensureDir(dir);

    const ext = path.extname(ext1) || '.jpg';
    const safe = `${Date.now()}_${String(cameraId || 'unknown').replace(/[^\w.-]/g, '_')}_${kind}${ext}`;
    const filePath = path.join(dir, safe);
    fs.writeFileSync(filePath, complete.binary);

    const payload = {
        cameraId,
        kind,
        ext1,
        file: safe,
        path: filePath,
        level,
        time: complete.time,
    };

    if (log) log.messaging.info('face/plate saved', { kind, ext1, file: safe, bytes: complete.binary.length });
    if (emit) emit('face-plate-alert', payload);
    return true;
}

module.exports = {
    ingestFromMessage,
};
