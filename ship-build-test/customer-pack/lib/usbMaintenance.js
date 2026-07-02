/**
 * Command-room USB maintenance — super admin only, local Windows desk PC.
 * Spawns bundled adb; does not touch SIP / live video / SOS.
 */
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execFileAsync = util.promisify(execFile);

const DEFAULT_TOOL_DIR = 'C:\\Program Files (x86)\\Company\\BWC Tool V2.04.04';
const ADB_TIMEOUT_MS = 45000;

const DESTRUCTIVE_ACTIONS = new Set(['clear-media']);

function baseDir() {
    return path.join(__dirname, '..');
}

function vendorUsbDir() {
    return path.join(baseDir(), 'vendor', 'usb-maintenance');
}

function resolveAdbPath() {
    const envPath = (process.env.FM_USB_ADB_PATH || '').trim();
    if (envPath && fs.existsSync(envPath)) return envPath;

    const vendorCandidates = [
        path.join(vendorUsbDir(), 'dsjadb.exe'),
        path.join(vendorUsbDir(), 'adb.exe'),
    ];
    for (let i = 0; i < vendorCandidates.length; i++) {
        if (fs.existsSync(vendorCandidates[i])) return vendorCandidates[i];
    }

    const toolDir = resolveToolDir();
    if (toolDir) {
        const dsj = path.join(toolDir, 'dsjadb.exe');
        if (fs.existsSync(dsj)) return dsj;
    }

    return null;
}

function resolveToolDir() {
    const envDir = (process.env.FM_USB_TOOL_DIR || '').trim();
    if (envDir && fs.existsSync(envDir)) return envDir;
    if (fs.existsSync(DEFAULT_TOOL_DIR)) return DEFAULT_TOOL_DIR;
    const bundled = vendorUsbDir();
    if (fs.existsSync(path.join(bundled, 'SettingToolEx.exe'))) return bundled;
    return null;
}

function isSupportedPlatform() {
    return process.platform === 'win32';
}

function parseDevices(stdout) {
    const lines = String(stdout || '').split(/\r?\n/);
    const devices = [];
    lines.forEach((line) => {
        const m = line.match(/^([^\s]+)\s+(device|offline|unauthorized|authorizing)\b/i);
        if (!m) return;
        const serial = m[1];
        if (serial === 'List' || serial.indexOf('*') >= 0) return;
        devices.push({
            serial,
            state: m[2].toLowerCase(),
        });
    });
    return devices;
}

async function runAdb(args, opts) {
    opts = opts || {};
    const adbPath = resolveAdbPath();
    if (!adbPath) {
        const err = new Error('ADB not found — set FM_USB_ADB_PATH or copy adb to vendor/usb-maintenance/');
        err.code = 'ADB_MISSING';
        throw err;
    }
    const fullArgs = args.slice();
    const timeout = opts.timeoutMs || ADB_TIMEOUT_MS;
    const result = await execFileAsync(adbPath, fullArgs, {
        timeout,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
    });
    return {
        stdout: (result.stdout || '').trim(),
        stderr: (result.stderr || '').trim(),
    };
}

async function listDevices() {
    if (!isSupportedPlatform()) {
        return { ok: true, platform: process.platform, supported: false, devices: [] };
    }
    const out = await runAdb(['devices', '-l']);
    return {
        ok: true,
        platform: process.platform,
        supported: true,
        devices: parseDevices(out.stdout),
        raw: out.stdout,
    };
}

async function adbShell(serial, command) {
    const args = serial ? ['-s', serial, 'shell', command] : ['shell', command];
    return runAdb(args);
}

async function getDeviceInfo(serial) {
    const props = [
        'ro.product.model',
        'ro.product.manufacturer',
        'ro.serialno',
        'ro.build.version.release',
    ];
    const info = {};
    for (let i = 0; i < props.length; i++) {
        const key = props[i];
        try {
            const out = await adbShell(serial, `getprop ${key}`);
            info[key] = out.stdout || '—';
        } catch (err) {
            info[key] = '—';
        }
    }
    return info;
}

function clearMediaCommands() {
    const raw = (process.env.FM_USB_CLEAR_SHELL || '').trim();
    if (!raw) return [];
    return raw.split(';;').map((s) => s.trim()).filter(Boolean);
}

async function runClearMedia(serial) {
    const commands = clearMediaCommands();
    if (!commands.length) {
        const err = new Error(
            'Clear-media command not configured — set FM_USB_CLEAR_SHELL in .env (ask manufacturer for the adb shell command)',
        );
        err.code = 'CLEAR_NOT_CONFIGURED';
        throw err;
    }
    const steps = [];
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const out = await adbShell(serial, cmd);
        steps.push({ command: cmd, stdout: out.stdout, stderr: out.stderr });
    }
    return { steps };
}

async function runAction(action, serial, opts) {
    opts = opts || {};
    const act = String(action || '').trim();
    if (!act) throw new Error('action required');

    if (act === 'refresh') {
        return listDevices();
    }
    if (!serial) throw new Error('USB device serial required');

    if (act === 'device-info') {
        const info = await getDeviceInfo(serial);
        return { ok: true, action: act, serial, info };
    }
    if (act === 'clear-media') {
        const result = await runClearMedia(serial);
        return { ok: true, action: act, serial, result };
    }

    throw new Error(`Unknown action: ${act}`);
}

function launchVendorTool() {
    const toolDir = resolveToolDir();
    if (!toolDir) {
        const err = new Error('BWC tool not found — set FM_USB_TOOL_DIR or install vendor tool');
        err.code = 'TOOL_MISSING';
        throw err;
    }
    const exe = path.join(toolDir, 'SettingToolEx.exe');
    if (!fs.existsSync(exe)) {
        const err = new Error('SettingToolEx.exe not found in tool directory');
        err.code = 'TOOL_MISSING';
        throw err;
    }
    const child = spawn(exe, [], {
        cwd: toolDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
    });
    child.unref();
    return { ok: true, launched: true, path: exe };
}

function getStatusPublic() {
    const adbPath = resolveAdbPath();
    const toolDir = resolveToolDir();
    const clearConfigured = clearMediaCommands().length > 0;
    return {
        supported: isSupportedPlatform(),
        platform: process.platform,
        adbFound: !!adbPath,
        adbPath: adbPath || null,
        toolDir: toolDir || null,
        toolExeFound: !!(toolDir && fs.existsSync(path.join(toolDir, 'SettingToolEx.exe'))),
        clearMediaConfigured: clearConfigured,
        vendorBundleDir: vendorUsbDir(),
        actions: [
            { id: 'refresh', label: 'Refresh USB list', destructive: false },
            { id: 'device-info', label: 'Read device info', destructive: false },
            { id: 'clear-media', label: 'Clear device media (configured shell)', destructive: true, configured: clearConfigured },
        ],
    };
}

module.exports = {
    isSupportedPlatform,
    resolveAdbPath,
    resolveToolDir,
    listDevices,
    runAction,
    launchVendorTool,
    getStatusPublic,
    DESTRUCTIVE_ACTIONS,
};
