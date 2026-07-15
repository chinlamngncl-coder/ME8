/**
 * ZLM process — lab health + pack spawn (mvp-zlm-in-pack).
 * Spawns vendor/zlmediakit/MediaServer.exe when FM_ZLM_SPAWN=1 and binary exists.
 * Never touches liveStreamPool. Missing binary = skip (wall keeps FFmpeg path).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlmIngestLab = require('./zlmIngestLab');
const log = require('./fleetLog');

const ROOT = path.join(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'vendor', 'zlmediakit');
const WIN_EXE = path.join(VENDOR_DIR, 'MediaServer.exe');
const CONFIG_INI = path.join(VENDOR_DIR, 'config.ini');

let child = null;
let starting = null;

function isLabEnabled() {
    return String(process.env.FM_LAB_ZLM || '').trim() === '1';
}

function isPackMode() {
    return String(process.env.FM_ZLM_PACK || '').trim() === '1'
        || String(process.env.FM_ZLM_SPAWN || '').trim() === '1';
}

function isSpawnEnabled() {
    return String(process.env.FM_ZLM_SPAWN || '').trim() === '1'
        || String(process.env.FM_ZLM_PACK || '').trim() === '1';
}

function isConfigured() {
    return zlmIngestLab.isEnabled();
}

function packBinaryPath() {
    if (process.platform === 'win32' && fs.existsSync(WIN_EXE)) return WIN_EXE;
    const linuxBin = path.join(VENDOR_DIR, 'MediaServer');
    if (process.platform !== 'win32' && fs.existsSync(linuxBin)) return linuxBin;
    return null;
}

function hasPackBinary() {
    return !!packBinaryPath();
}

function getPublicStatus() {
    return {
        labEnabled: isLabEnabled(),
        packMode: isPackMode(),
        spawnEnabled: isSpawnEnabled(),
        packBinary: hasPackBinary(),
        childRunning: !!(child && child.exitCode == null && !child.killed),
        zlm: zlmIngestLab.getStatus(),
    };
}

async function healthCheck(force) {
    if (!zlmIngestLab.isEnabled()) {
        return { ok: false, reason: 'zlm_disabled', checkedAt: Date.now() };
    }
    return zlmIngestLab.healthCheck(force);
}

function isHealthy() {
    return zlmIngestLab.isEnabled() && zlmIngestLab.isHealthy();
}

function stopChild() {
    if (!child) return { ok: true, stopped: false };
    const c = child;
    child = null;
    try { c.kill(); } catch (_) { /* ignore */ }
    log.media.info('zlm pack child stop requested');
    return { ok: true, stopped: true };
}

function startChild() {
    if (child && child.exitCode == null && !child.killed) {
        return Promise.resolve({ ok: true, started: false, reason: 'already_running' });
    }
    if (starting) return starting;

    const bin = packBinaryPath();
    if (!bin) {
        return Promise.resolve({
            ok: false,
            reason: 'pack_binary_missing',
            hint: 'Run scripts\\INSTALL-ZLM-PACK.ps1 -SourceDir <windows MediaServer folder>',
        });
    }
    if (!fs.existsSync(CONFIG_INI)) {
        const example = path.join(VENDOR_DIR, 'config.ini.example');
        if (fs.existsSync(example)) {
            try { fs.copyFileSync(example, CONFIG_INI); } catch (_) { /* ignore */ }
        }
    }

    starting = new Promise((resolve) => {
        try {
            const args = [];
            if (fs.existsSync(CONFIG_INI)) {
                args.push('-c', CONFIG_INI);
            }
            log.media.info('zlm pack child spawn', { bin, cwd: VENDOR_DIR });
            child = spawn(bin, args, {
                cwd: VENDOR_DIR,
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: process.env,
            });
            child.stdout.on('data', (buf) => {
                const line = String(buf || '').trim();
                if (line) log.media.trace('zlm child', { line: line.slice(0, 200) });
            });
            child.stderr.on('data', (buf) => {
                const line = String(buf || '').trim();
                if (line) log.media.info('zlm child err', { line: line.slice(0, 200) });
            });
            child.on('exit', (code, signal) => {
                log.media.info('zlm pack child exit', { code, signal });
                child = null;
            });
            child.on('error', (err) => {
                log.media.warn('zlm pack child error', { message: err && err.message });
                child = null;
            });
            resolve({ ok: true, started: true, bin });
        } catch (err) {
            child = null;
            resolve({ ok: false, reason: err && err.message });
        } finally {
            starting = null;
        }
    });
    return starting;
}

/** Boot hook: spawn pack binary if enabled; else lab Docker may already be up. */
async function ensureStarted() {
    if (!zlmIngestLab.isEnabled()) {
        log.media.info('zlm skipped — FM_ZLM_ENABLED=0');
        return { ok: false, reason: 'zlm_disabled' };
    }

    const healthyNow = await healthCheck(true);
    if (healthyNow && healthyNow.ok) {
        log.media.info('zlm already healthy (external or prior)', getPublicStatus());
        return { ok: true, reason: 'already_healthy', ...getPublicStatus() };
    }

    if (!isSpawnEnabled()) {
        log.media.info('zlm spawn off — set FM_ZLM_SPAWN=1 or FM_ZLM_PACK=1 for pack binary', {
            packBinary: hasPackBinary(),
        });
        return { ok: false, reason: 'spawn_disabled', ...getPublicStatus() };
    }

    const started = await startChild();
    if (!started.ok) {
        log.media.info('zlm pack spawn skipped', started);
        return started;
    }

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        const h = await healthCheck(true);
        if (h && h.ok) {
            log.media.info('zlm pack child healthy', getPublicStatus());
            return { ok: true, reason: 'spawned_healthy', ...getPublicStatus() };
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    log.media.warn('zlm pack child started but health not ready yet', getPublicStatus());
    return { ok: false, reason: 'spawned_unhealthy', ...getPublicStatus() };
}

async function warmup() {
    if (isSpawnEnabled() || isPackMode()) {
        return ensureStarted();
    }
    if (!isLabEnabled()) {
        log.media.info('zlm lab gate B disabled — set FM_LAB_ZLM=1 for test bench, or FM_ZLM_PACK=1 for pack');
        return { ok: false, reason: 'lab_disabled' };
    }
    if (!zlmIngestLab.isEnabled()) {
        log.media.info('zlm lab skipped — FM_ZLM_ENABLED=0');
        return { ok: false, reason: 'zlm_disabled' };
    }
    log.media.info('zlm lab warmup', zlmIngestLab.getConfigPublic());
    return healthCheck(true);
}

module.exports = {
    isLabEnabled,
    isPackMode,
    isSpawnEnabled,
    isConfigured,
    isHealthy,
    hasPackBinary,
    getPublicStatus,
    healthCheck,
    warmup,
    ensureStarted,
    startChild,
    stopChild,
};
