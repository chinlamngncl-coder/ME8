'use strict';

/**
 * Track spawned children; force-kill on master exit / SIGTERM / SIGINT.
 */

const { spawn } = require('child_process');

const children = new Set();
let installed = false;

function trackChild(child) {
    if (!child || typeof child.kill !== 'function') return child;
    children.add(child);
    const clear = function () { children.delete(child); };
    child.once('exit', clear);
    child.once('error', clear);
    return child;
}

function killAll(signal) {
    const sig = signal || 'SIGTERM';
    children.forEach(function (child) {
        try {
            if (process.platform === 'win32' && child.pid) {
                spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
                    windowsHide: true,
                    stdio: 'ignore',
                });
            } else if (child.pid) {
                try { process.kill(-child.pid, sig); } catch (_) {
                    try { child.kill(sig); } catch (__) { /* ignore */ }
                }
            } else {
                child.kill(sig);
            }
        } catch (_) { /* ignore */ }
    });
    children.clear();
}

function installOrphanHooks() {
    if (installed) return;
    installed = true;
    const stop = function () { killAll('SIGTERM'); };
    process.once('exit', stop);
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    process.on('uncaughtException', function () { killAll('SIGKILL'); });
}

function trackedSpawn(command, args, options) {
    const opts = Object.assign({}, options || {});
    if (process.platform !== 'win32' && opts.detached == null) {
        opts.detached = true;
    }
    const child = spawn(command, args || [], opts);
    return trackChild(child);
}

module.exports = {
    trackChild,
    trackedSpawn,
    killAll,
    installOrphanHooks,
    childCount: function () { return children.size; },
};
