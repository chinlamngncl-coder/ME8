/**
 * ANPR plate read — MOB-601 sidecar (YOLO11 + OpenCV + PaddleOCR + regex + ≥80% floor).
 * Tesseract.js is no longer the ship path.
 */
const anprSidecarClient = require('./anprSidecarClient');

async function health() {
    if (anprSidecarClient.isAutoStartEnabled()) {
        return anprSidecarClient.ensureReady();
    }
    return anprSidecarClient.health();
}

/**
 * @param {string} absPath
 * @param {{ region?: string, skipYolo?: boolean }} [opts]
 */
async function readPath(absPath, opts) {
    return anprSidecarClient.readPath(absPath, opts || {});
}

module.exports = {
    health,
    readPath,
};
