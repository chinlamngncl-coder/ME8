'use strict';

/**
 * Offline patch-package verifier (Tier-3 / Ubitron staff).
 * Checks ZIP or extracted folder against manifest.json — does not apply patches.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCHEMA = 'ubitron.patch.v1';
const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const HARD_DENY = [
    'public/js/video-wall.js',
    'lib/pttServer.js',
    'lib/sipServer.js',
    'lib/psG711Audio.js',
    'license-private.pem',
    'tools/generate-license.js',
    'storage/license.lic',
];

const DENY_NAME_RE = /(^|\/)\.env($|\.)|(^|\/)license-private\.pem$|\.pem$/i;

function normPath(p) {
    return String(p || '')
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/+/g, '/')
        .trim();
}

function isUnsafePath(rel) {
    const p = normPath(rel);
    if (!p) return true;
    if (p.startsWith('/') || /^[a-zA-Z]:/.test(p) || p.startsWith('//')) return true;
    if (p.split('/').some((part) => part === '..' || part === '')) return true;
    if (/^me8-internal\//i.test(p) || /^\.cursor\//.test(p) || /^baseline\//i.test(p)) return true;
    return false;
}

function sha256File(filePath) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
}

function listFilesRecursive(rootDir) {
    const out = [];
    function walk(dir) {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            const st = fs.statSync(full);
            if (st.isDirectory()) walk(full);
            else if (st.isFile()) out.push(full);
        }
    }
    walk(rootDir);
    return out;
}

function findManifestDir(extractedRoot) {
    const direct = path.join(extractedRoot, 'manifest.json');
    if (fs.existsSync(direct)) return extractedRoot;
    const entries = fs.readdirSync(extractedRoot);
    for (const name of entries) {
        const full = path.join(extractedRoot, name);
        if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'manifest.json'))) {
            return full;
        }
    }
    return null;
}

function extractZipToTemp(zipPath) {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'ubitron-patch-'));
    if (process.platform === 'win32') {
        const cmd = 'Expand-Archive -LiteralPath '
            + JSON.stringify(zipPath)
            + ' -DestinationPath '
            + JSON.stringify(dest)
            + ' -Force';
        const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], {
            windowsHide: true,
            encoding: 'utf8',
            timeout: 60000,
        });
        if (r.status !== 0) {
            try { fs.rmSync(dest, { recursive: true, force: true }); } catch (_) { /* ignore */ }
            throw new Error('Could not open patch ZIP');
        }
        return dest;
    }
    try { fs.rmSync(dest, { recursive: true, force: true }); } catch (_) { /* ignore */ }
    throw new Error('Patch ZIP verify needs Windows Expand-Archive on this host');
}

/**
 * @param {string} packageRoot absolute path to folder containing manifest.json
 * @returns {{ pass: boolean, errors: string[], warnings: string[], ticketId: string|null }}
 */
function verifyExtractedPackage(packageRoot) {
    const errors = [];
    const warnings = [];
    let ticketId = null;

    const manifestPath = path.join(packageRoot, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        return { pass: false, errors: ['Missing manifest.json'], warnings, ticketId };
    }

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (_) {
        return { pass: false, errors: ['manifest.json is not valid JSON'], warnings, ticketId };
    }

    if (!manifest || manifest.schema !== SCHEMA) {
        errors.push('manifest schema must be ' + SCHEMA);
    }
    ticketId = manifest && manifest.ticketId ? String(manifest.ticketId) : null;
    const files = Array.isArray(manifest.files) ? manifest.files : null;
    if (!files || !files.length) {
        errors.push('manifest.files must list at least one file');
    }

    const allowLocked = !!(manifest && manifest.allowLockedCores);
    const filesRoot = fs.existsSync(path.join(packageRoot, 'files'))
        ? path.join(packageRoot, 'files')
        : packageRoot;

    const listed = new Map();
    if (files) {
        files.forEach((entry, idx) => {
            const rel = normPath(entry && entry.path);
            if (!rel || isUnsafePath(rel)) {
                errors.push('Unsafe or empty path at files[' + idx + ']');
                return;
            }
            if (HARD_DENY.indexOf(rel) >= 0 && !allowLocked) {
                errors.push('Forbidden path (locked core): ' + rel);
            }
            if (DENY_NAME_RE.test(rel)) {
                errors.push('Forbidden file type: ' + rel);
            }
            if (listed.has(rel)) {
                errors.push('Duplicate path in manifest: ' + rel);
            }
            listed.set(rel, entry);
        });
    }

    if (files && errors.length === 0) {
        const onDisk = listFilesRecursive(filesRoot)
            .map((full) => ({
                full,
                rel: normPath(path.relative(filesRoot, full)),
            }))
            .filter((row) => row.rel && row.rel !== 'manifest.json');

        const diskMap = new Map(onDisk.map((r) => [r.rel, r.full]));

        listed.forEach((entry, rel) => {
            const full = diskMap.get(rel);
            if (!full) {
                errors.push('Listed file missing in package: ' + rel);
                return;
            }
            let st;
            try {
                st = fs.statSync(full);
            } catch (_) {
                errors.push('Cannot read: ' + rel);
                return;
            }
            if (st.size > MAX_FILE_BYTES) {
                errors.push('File too large: ' + rel);
                return;
            }
            if (entry.bytes != null && Number(entry.bytes) !== st.size) {
                errors.push('Size mismatch: ' + rel);
            }
            const want = String(entry.sha256 || '').trim().toLowerCase();
            if (!want || !/^[0-9a-f]{64}$/.test(want)) {
                errors.push('Missing or bad sha256 for: ' + rel);
                return;
            }
            const got = sha256File(full);
            if (got !== want) {
                errors.push('Hash mismatch: ' + rel);
            }
            diskMap.delete(rel);
        });

        diskMap.forEach((_, rel) => {
            if (rel === 'manifest.json' || rel === 'SHA256SUMS.txt' || rel === 'README-INTERNAL.txt') return;
            errors.push('Extra file not in manifest: ' + rel);
        });
    }

    if (allowLocked) {
        warnings.push('allowLockedCores is set — human must confirm locked cores before overwrite');
    }

    return {
        pass: errors.length === 0,
        errors,
        warnings,
        ticketId,
    };
}

/**
 * Verify a .zip on disk. Cleans temp extract always.
 * @param {string} zipPath
 */
function verifyZipFile(zipPath) {
    let st;
    try {
        st = fs.statSync(zipPath);
    } catch (_) {
        return { pass: false, errors: ['ZIP not found'], warnings: [], ticketId: null };
    }
    if (!st.isFile() || st.size <= 0) {
        return { pass: false, errors: ['ZIP empty'], warnings: [], ticketId: null };
    }
    if (st.size > MAX_ZIP_BYTES) {
        return { pass: false, errors: ['ZIP exceeds 20 MB limit'], warnings: [], ticketId: null };
    }

    let tempRoot = null;
    try {
        tempRoot = extractZipToTemp(zipPath);
        const pkgRoot = findManifestDir(tempRoot);
        if (!pkgRoot) {
            return { pass: false, errors: ['ZIP has no manifest.json'], warnings: [], ticketId: null };
        }
        return verifyExtractedPackage(pkgRoot);
    } catch (err) {
        return {
            pass: false,
            errors: [err && err.message ? err.message : 'ZIP verify failed'],
            warnings: [],
            ticketId: null,
        };
    } finally {
        if (tempRoot) {
            try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch (_) { /* ignore */ }
        }
    }
}

/**
 * Verify zip bytes from upload (writes temp file then verifies).
 * @param {Buffer} buf
 * @param {string} [originalName]
 */
function looksLikeZip(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 4
        && buf[0] === 0x50 && buf[1] === 0x4b
        && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07);
}

function detectWrongPayload(buf, originalName) {
    const name = String(originalName || '').toLowerCase();
    if (name.indexOf('telemetry-bundle') >= 0 || name.indexOf('diagnostic') >= 0) {
        return 'This is a diagnostic export, not a Ubitron patch package. Patch ZIP must include manifest.json from Ubitron.';
    }
    if (!looksLikeZip(buf)) {
        try {
            const text = buf.slice(0, Math.min(buf.length, 64 * 1024)).toString('utf8').trim();
            if (text.charAt(0) === '{' || text.charAt(0) === '[') {
                const doc = JSON.parse(text);
                if (doc && doc.schema === 'ubitron.telemetry.bundle.v1') {
                    return 'This file is the diagnostic telemetry export (JSON). Patch Check needs a Ubitron patch ZIP with manifest.json — not the export bundle.';
                }
                return 'This is JSON, not a patch ZIP. Use a .zip that contains manifest.json.';
            }
        } catch (_) { /* fall through */ }
        return 'File is not a valid ZIP (PK header missing). Re-export/re-zip the patch package; do not rename .json to .zip.';
    }
    return null;
}

function verifyZipBuffer(buf, originalName) {
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
        return { pass: false, errors: ['Empty upload'], warnings: [], ticketId: null };
    }
    if (buf.length > MAX_ZIP_BYTES) {
        return { pass: false, errors: ['ZIP exceeds 20 MB limit'], warnings: [], ticketId: null };
    }
    const wrong = detectWrongPayload(buf, originalName);
    if (wrong) {
        return { pass: false, errors: [wrong], warnings: [], ticketId: null };
    }
    const tmp = path.join(os.tmpdir(), 'ubitron-patch-upload-' + Date.now() + '.zip');
    try {
        fs.writeFileSync(tmp, buf);
        const result = verifyZipFile(tmp);
        if (!result.pass && result.errors && result.errors.some((e) => /no manifest\.json/i.test(e))) {
            result.errors = [
                'ZIP opened, but this is not a Ubitron patch package (missing manifest.json). Diagnostic export ZIPs will always FAIL here.',
            ].concat(result.errors);
        }
        return result;
    } finally {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
}

module.exports = {
    SCHEMA,
    MAX_ZIP_BYTES,
    HARD_DENY,
    verifyExtractedPackage,
    verifyZipFile,
    verifyZipBuffer,
};
