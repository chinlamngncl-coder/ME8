'use strict';

/**
 * Bunyan-shaped logger for ftp-srv — routes all lines through fleet.log (site timezone).
 */
function createFtpSrvLogger(fleetLog) {
    function write(level, arg1, arg2) {
        let message = '';
        let detail;
        if (arg1 instanceof Error) {
            message = arg2 != null ? String(arg2) : arg1.message;
            detail = { err: arg1.message, stack: arg1.stack };
        } else if (typeof arg1 === 'object' && arg1 !== null) {
            detail = arg1;
            message = arg2 != null ? String(arg2) : (arg1.msg || 'ftp-srv');
        } else {
            message = arg1 != null ? String(arg1) : '';
            if (arg2 !== undefined && arg2 !== null) detail = arg2;
        }
        const ch = fleetLog.ftp;
        if (level === 'error') ch.err(message, detail);
        else if (level === 'warn') ch.warn(message, detail);
        else if (level === 'trace' || level === 'debug') ch.trace(message, detail);
        else ch.info(message, detail);
    }

    const logger = {
        child() { return logger; },
        trace: (a, b) => write('trace', a, b),
        debug: (a, b) => write('debug', a, b),
        info: (a, b) => write('info', a, b),
        warn: (a, b) => write('warn', a, b),
        error: (a, b) => write('error', a, b),
    };
    return logger;
}

module.exports = { createFtpSrvLogger };
