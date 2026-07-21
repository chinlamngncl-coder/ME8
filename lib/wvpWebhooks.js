/**
 * Compatibility shim — MOB-ARCH-REVERT-AND-UNIFY-EVENT-BUS
 * Prefer lib/wvpEventBus.js. Re-exports unified event-bus router.
 */
'use strict';

const wvpEventBus = require('./wvpEventBus');

module.exports = {
    createRouter: wvpEventBus.createRouter,
    requireTrustedWvpSource: wvpEventBus.requireTrustedWvpSource,
    SOCKET_EVENTS: wvpEventBus.SOCKET_EVENTS,
    ingest: wvpEventBus.ingest,
};
