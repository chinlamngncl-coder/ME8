'use strict';

/**
 * ANALYTICS-EVIDENCE-MKDIR-BOOT-V1
 * Packaging proof: create relative storage/ analytics evidence dirs on boot
 * so on-prem install never crashes for missing folders.
 * Windows-first paths under {BASE}/storage — not /var/mobility_evidence.
 * No destructive cleanup. License generator untouched.
 */

const fs = require('fs');
const path = require('path');

const ANPR_REL_DIRS = [
    'anpr-live-crops',
    'anpr-track-macros',
    'anpr-plate-lists',
    'anpr-temp',
];

function ensureDir(absPath) {
    try {
        fs.mkdirSync(absPath, { recursive: true });
        return { path: absPath, ok: true };
    } catch (err) {
        return {
            path: absPath,
            ok: false,
            error: err && err.message ? String(err.message).slice(0, 160) : 'mkdir_failed',
        };
    }
}

/**
 * @param {object} opts
 * @param {string} opts.storageDir — ME8 storage root (…/storage)
 * @param {string} [opts.frRoot] — FR workspace root (defaults to storageDir)
 * @param {function} [opts.ensureFrLayout] — frStorageWorkspace.ensureManagedLayout
 * @returns {{ ok: boolean, created: string[], errors: object[] }}
 */
function ensureAnalyticsEvidenceDirs(opts) {
    const storageDir = path.resolve((opts && opts.storageDir) || path.join(__dirname, '..', 'storage'));
    const frRoot = path.resolve((opts && opts.frRoot) || storageDir);
    const created = [];
    const errors = [];

    const storageRoot = ensureDir(storageDir);
    if (!storageRoot.ok) errors.push(storageRoot);
    else created.push(storageDir);

    ANPR_REL_DIRS.forEach((name) => {
        const abs = path.join(storageDir, name);
        const r = ensureDir(abs);
        if (!r.ok) errors.push(r);
        else created.push(abs);
    });

    /* FR crops ledger subfolder used by snap ledger */
    const frCrops = ensureDir(path.join(frRoot, 'fr-snap-ledger', 'crops'));
    if (!frCrops.ok) errors.push(frCrops);
    else created.push(frCrops.path);

    if (typeof (opts && opts.ensureFrLayout) === 'function') {
        try {
            opts.ensureFrLayout(frRoot);
            created.push(frRoot);
        } catch (err) {
            errors.push({
                path: frRoot,
                ok: false,
                error: err && err.message ? String(err.message).slice(0, 160) : 'fr_layout_failed',
            });
        }
    } else {
        const frRootMk = ensureDir(frRoot);
        if (!frRootMk.ok) errors.push(frRootMk);
    }

    return { ok: errors.length === 0, created, errors };
}

module.exports = {
    ANPR_REL_DIRS,
    ensureAnalyticsEvidenceDirs,
    ensureDir,
};
