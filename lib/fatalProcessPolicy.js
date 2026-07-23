'use strict';

const DEFAULT_EXIT_DELAY_MS = 25;

function isBrokenOutputPipe(err) {
    return Boolean(err && err.code === 'EPIPE' && err.syscall === 'write');
}

function installFatalProcessPolicy(options = {}) {
    const processObject = options.processObject || process;
    const logger = options.log;
    const schedule = options.schedule || setTimeout;
    const exitDelayMs = Number.isFinite(options.exitDelayMs)
        ? Math.max(0, options.exitDelayMs)
        : DEFAULT_EXIT_DELAY_MS;
    let exiting = false;

    function writeFallback(kind, value) {
        try {
            const message = value && value.message ? value.message : String(value || '');
            processObject.stderr.write(`Fatal ${kind}: ${message}\n`);
        } catch (_) {
            // The process is already terminating; do not recurse through logging.
        }
    }

    function terminate(kind, value) {
        if (isBrokenOutputPipe(value)) return false;
        if (exiting) return false;
        exiting = true;

        const detail = {
            message: value && value.message ? value.message : String(value),
        };
        if (value && value.stack) {
            detail.stack = String(value.stack).split('\n').slice(0, 6).join(' | ');
        }

        try {
            if (!logger || !logger.web || typeof logger.web.err !== 'function') {
                throw new Error('fatal logger unavailable');
            }
            logger.web.err(`${kind} — exiting for supervisor restart`, detail);
        } catch (_) {
            writeFallback(kind, value);
        }

        processObject.exitCode = 1;
        const timer = schedule(() => processObject.exit(1), exitDelayMs);
        if (timer && typeof timer.unref === 'function') timer.unref();
        return true;
    }

    const onUncaughtException = (err) => terminate('uncaughtException', err);
    const onUnhandledRejection = (reason) => terminate('unhandledRejection', reason);

    processObject.on('uncaughtException', onUncaughtException);
    processObject.on('unhandledRejection', onUnhandledRejection);

    return {
        onUncaughtException,
        onUnhandledRejection,
        isExiting: () => exiting,
    };
}

module.exports = {
    DEFAULT_EXIT_DELAY_MS,
    isBrokenOutputPipe,
    installFatalProcessPolicy,
};
