'use strict';

/**
 * UTC epoch time anchor — detects large clock rollbacks (license expiry bypass).
 * Small rollbacks within GRACE_MS (NTP / DST) are allowed and the anchor is updated.
 */

const fs = require('fs');
const path = require('path');

const GRACE_MS = 2 * 60 * 60 * 1000; /* 2 hours */
const ANCHOR_FILENAME = 'time-anchor.json';

function anchorPathFor(storageDir) {
    return path.join(storageDir || path.join(__dirname, '..', 'storage'), ANCHOR_FILENAME);
}

function writeAnchor(filePath, utcMs) {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify({ lastUtcMs: utcMs }) + '\n', 'utf8');
    } catch (_) {
        /* non-fatal — caller already decided policy */
    }
}

/**
 * Validate monotonic UTC clock using Date.now() only (no local timezone math).
 * @returns {{ ok: boolean, code?: string, message?: string }}
 */
function validateTimeAnchor(opts) {
    const o = opts || {};
    const filePath = anchorPathFor(o.storageDir);
    const now = Date.now();

    try {
        let lastMs = null;
        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf8');
                const doc = JSON.parse(raw);
                const n = Number(doc && doc.lastUtcMs);
                if (Number.isFinite(n) && n > 0) lastMs = n;
            }
        } catch (_) {
            /* unreadable / first boot — treat as no anchor */
            lastMs = null;
        }

        if (lastMs == null) {
            writeAnchor(filePath, now);
            return { ok: true, code: 'ANCHOR_INIT' };
        }

        if (now < lastMs) {
            const rollbackMs = lastMs - now;
            if (rollbackMs > GRACE_MS) {
                return {
                    ok: false,
                    code: 'CLOCK_ROLLBACK_DETECTED',
                    message: 'System clock rolled back more than 2 hours (UTC anchor)',
                };
            }
            /* Routine NTP / DST correction within grace — allow and refresh anchor */
            writeAnchor(filePath, now);
            return { ok: true, code: 'ANCHOR_NTP_GRACE', rollbackMs: rollbackMs };
        }

        if (now > lastMs) {
            writeAnchor(filePath, now);
        }
        return { ok: true, code: 'ANCHOR_OK' };
    } catch (err) {
        /* Never crash boot — unreadable state: allow and seed anchor */
        writeAnchor(filePath, now);
        return {
            ok: true,
            code: 'ANCHOR_RECOVER',
            message: err && err.message ? err.message : String(err),
        };
    }
}

module.exports = {
    GRACE_MS,
    ANCHOR_FILENAME,
    anchorPathFor,
    validateTimeAnchor,
};
