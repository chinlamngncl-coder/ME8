'use strict';

/**
 * Async port-bind retry — EADDRINUSE wait 1s × 5 before fatal Glass Fortress exit.
 */

const { glassFortress } = require('./glassFortressLog');

const DEFAULT_RETRIES = 5;
const DEFAULT_DELAY_MS = 1000;

function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * @param {import('net').Server} server
 * @param {number} port
 * @param {string} host
 * @param {{ retries?: number, delayMs?: number, label?: string }} [opts]
 */
function listenWithRetry(server, port, host, opts) {
    const o = opts || {};
    const retries = Number.isFinite(o.retries) ? o.retries : DEFAULT_RETRIES;
    const delayMs = Number.isFinite(o.delayMs) ? o.delayMs : DEFAULT_DELAY_MS;
    const label = o.label || ('port ' + port);

    return new Promise(function (resolve, reject) {
        let attempt = 0;

        function tryListen() {
            attempt += 1;
            const onError = function (err) {
                server.removeListener('listening', onListening);
                const code = err && err.code ? String(err.code) : '';
                if (code === 'EADDRINUSE' && attempt < retries) {
                    console.warn('[listen-retry] ' + label + ' EADDRINUSE — retry ' + attempt + '/' + retries + ' in ' + delayMs + 'ms');
                    setTimeout(tryListen, delayMs);
                    return;
                }
                if (code === 'EADDRINUSE') {
                    glassFortress(
                        'Cannot bind ' + label + ' after ' + retries + ' attempts (EADDRINUSE).',
                        'Another process is already using TCP port ' + port + '.',
                        'Windows: run  netstat -ano | findstr :' + port + '  then Task Manager end that PID. '
                            + 'Linux: run  sudo lsof -i :' + port + '  or  ss -lptn \'sport = :' + port + '\'  and stop the conflicting app. Then restart ME8.'
                    );
                }
                reject(err);
            };
            const onListening = function () {
                server.removeListener('error', onError);
                resolve(server);
            };
            server.once('error', onError);
            server.once('listening', onListening);
            try {
                server.listen(port, host);
            } catch (err) {
                server.removeListener('error', onError);
                server.removeListener('listening', onListening);
                reject(err);
            }
        }

        tryListen();
    });
}

module.exports = {
    listenWithRetry,
    sleep,
    DEFAULT_RETRIES,
    DEFAULT_DELAY_MS,
};
