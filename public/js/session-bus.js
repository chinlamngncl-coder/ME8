/**
 * Single session + settings warm cache \u2014 one fetch per dashboard load.
 */
(function (global) {
    'use strict';

    var sessionCache = null;
    var sessionInflight = null;
    var settingsCache = null;
    var settingsInflight = null;

    function getSession() {
        if (sessionCache) return Promise.resolve(sessionCache);
        if (!sessionInflight) {
            sessionInflight = fetch('/api/auth/session', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    sessionCache = data;
                    return data;
                })
                .catch(function () {
                    sessionCache = null;
                    return null;
                })
                .finally(function () {
                    sessionInflight = null;
                });
        }
        return sessionInflight;
    }

    function warmSettings() {
        if (settingsCache) return Promise.resolve(settingsCache);
        if (!settingsInflight) {
            settingsInflight = fetch('/api/server-settings', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    settingsCache = data;
                    return data;
                })
                .catch(function () {
                    return null;
                })
                .finally(function () {
                    settingsInflight = null;
                });
        }
        return settingsInflight;
    }

    function getSettings() {
        if (settingsCache) return Promise.resolve(settingsCache);
        return warmSettings();
    }

    function peekSession() {
        return sessionCache;
    }

    function peekSettings() {
        return settingsCache;
    }

    function invalidateSettings() {
        settingsCache = null;
        settingsInflight = null;
    }

    global.SessionBus = {
        get: getSession,
        warmSettings: warmSettings,
        getSettings: getSettings,
        peek: peekSession,
        peekSettings: peekSettings,
        invalidateSettings: invalidateSettings,
    };
}(typeof window !== 'undefined' ? window : this));
