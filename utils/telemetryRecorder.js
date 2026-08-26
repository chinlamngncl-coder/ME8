'use strict';
/**
 * Advanced Telemetry Engine — 500-line redacted ring buffer + fatal persist.
 * Output stored as Heuristic Trace Analysis in system_anomalies (standard IT logging table name).
 *
 * Ring buffer stores ONLY redacted lines. Fatal path writes system_anomalies
 * via a blocking spawnSync child (utils/telemetryPersistOnce.js) before exit.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RING_MAX = 500;
const ring = [];

const APP_ROOT = process.pkg
    ? path.dirname(process.execPath)
    : path.join(__dirname, '..');

const STORAGE_DIR = path.join(APP_ROOT, 'storage');
const CRASH_DUMP_PATH = path.join(STORAGE_DIR, 'anomaly-crash-last.json');
const PERSIST_HELPER = path.join(__dirname, 'telemetryPersistOnce.js');

/**
 * Scrub secrets and absolute paths from a single log line (Heuristic Trace Analysis).
 * @param {string} line
 * @returns {string}
 */
function redactLogLine(line) {
    let s = String(line == null ? '' : line);

    // Bearer tokens
    s = s.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');

    // JWTs (header.payload.signature)
    s = s.replace(
        /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
        '[REDACTED_JWT]'
    );

    // password / secret fields in JSON-like payloads (run BEFORE bare key=value)
    s = s.replace(
        /("(?:password|passwd|pwd|pass|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)"\s*:\s*")([^"]*)(")/gi,
        '$1[REDACTED]$3'
    );

    // password / secret / token / api_key in query strings
    s = s.replace(
        /([?&](?:password|passwd|pwd|pass|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)=)[^&\s"'\\]+/gi,
        '$1[REDACTED]'
    );

    // bare key=value secrets (equals only — colon handled by JSON rule above)
    s = s.replace(
        /\b((?:password|passwd|pwd|pass|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*=\s*)([^\s&"',}\\]+)/gi,
        '$1[REDACTED]'
    );

    // Basic auth in URLs: user:pass@host
    s = s.replace(
        /(https?:\/\/)([^/\s:@]+):([^/\s@]+)@/gi,
        '$1$2:[REDACTED]@'
    );

    // Session / cookie fragments
    s = s.replace(
        /((?:^|[;\s])(?:connect\.sid|session(?:id)?|sid|auth[_-]?token)\s*=\s*)[^\s;&]+/gi,
        '$1[REDACTED]'
    );

    // Absolute Windows paths (drive letter)
    s = s.replace(/\b[A-Za-z]:\\[^\s"'|]+/g, '[REDACTED_PATH]');

    // Absolute UNC paths
    s = s.replace(/\\\\[^\s"'|]+/g, '[REDACTED_PATH]');

    // Absolute Unix paths commonly used on servers
    s = s.replace(
        /(?:\/(?:var|opt|home|usr|etc|tmp|root|data|mnt|srv)\/)[^\s"'|]+/g,
        '[REDACTED_PATH]'
    );

    return s;
}

/**
 * Push one log line into the Advanced Telemetry Engine ring (redacted). Prunes oldest when > 500.
 * @param {string} line
 */
function pushLine(line) {
    const redacted = redactLogLine(line);
    if (!redacted) return;
    ring.push({
        ts: new Date().toISOString(),
        line: redacted,
    });
    while (ring.length > RING_MAX) {
        ring.shift();
    }
}

/** @returns {string[]} Heuristic Trace Analysis lines only (oldest → newest) */
function getBufferLines() {
    return ring.map((e) => e.ts + ' ' + e.line);
}

/** @returns {number} */
function getBufferLength() {
    return ring.length;
}

/**
 * Blocking persist for Advanced Telemetry Engine fatal dump:
 * sync crash dump + spawnSync INSERT into system_anomalies.
 * @param {string} component  e.g. uncaughtException
 * @param {Error|string|*} err
 * @returns {{ ok: boolean, id: string, dbOk: boolean }}
 */
function persistFatalBlocking(component, err) {
    const stackRaw = (err && err.stack)
        ? String(err.stack)
        : String(err && err.message ? err.message : err);
    const row = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        component: String(component || 'fatal'),
        error_trace: redactLogLine(stackRaw),
        redacted_logs: getBufferLines().join('\n'),
    };

    try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.writeFileSync(CRASH_DUMP_PATH, JSON.stringify(row, null, 2), 'utf8');
    } catch (_) {
        // Disk may be full; still attempt DB child if possible.
    }

    let dbOk = false;
    try {
        if (!fs.existsSync(PERSIST_HELPER)) {
            return { ok: false, id: row.id, dbOk: false };
        }
        const result = spawnSync(
            process.execPath,
            [PERSIST_HELPER, CRASH_DUMP_PATH],
            {
                env: process.env,
                timeout: 12000,
                windowsHide: true,
                encoding: 'utf8',
            }
        );
        dbOk = result && result.status === 0;
    } catch (_) {
        dbOk = false;
    }

    return { ok: true, id: row.id, dbOk };
}

module.exports = {
    RING_MAX,
    redactLogLine,
    pushLine,
    getBufferLines,
    getBufferLength,
    persistFatalBlocking,
};
