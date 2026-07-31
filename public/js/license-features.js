/**
 * Client-side license feature gate.
 *
 * Fetches /api/license-features after login and caches the result.
 * Modules check LicenseFeatures.isEnabled('analyticsFr') etc. before showing UI.
 * Legacy aliases: fr → analyticsFr, anpr → analyticsAnpr.
 * The server never exposes env key names — only plain booleans arrive here.
 */
(function (global) {
    var _features = {
        ptt: false,
        redaction: false,
        analyticsFr: false,
        analyticsAnpr: false,
        analyticsWeapon: false,
        videoConference: false,
        tacticalOverwatch: false,
        cadIntegration: false,
        fr: false,
        anpr: false,
    };
    var _ready = false;
    var _callbacks = [];

    var ALIASES = { fr: 'analyticsFr', anpr: 'analyticsAnpr' };

    function resolveName(name) {
        var raw = String(name || '').trim();
        if (!raw) return '';
        return ALIASES[raw] || raw;
    }

    function isEnabled(name) {
        var key = resolveName(name);
        return _features[key] === true;
    }

    function get() {
        return Object.assign({}, _features);
    }

    function onReady(cb) {
        if (_ready) { cb(_features); return; }
        _callbacks.push(cb);
    }

    function _resolve(features) {
        _features = Object.assign({}, _features, features || {});
        if (_features.analyticsFr == null && _features.fr != null) {
            _features.analyticsFr = !!_features.fr;
        }
        if (_features.analyticsAnpr == null && _features.anpr != null) {
            _features.analyticsAnpr = !!_features.anpr;
        }
        _features.fr = !!_features.analyticsFr;
        _features.anpr = !!_features.analyticsAnpr;
        _ready = true;
        _callbacks.forEach(function (cb) {
            try { cb(_features); } catch (_) { /* ignore */ }
        });
        _callbacks = [];
    }

    async function fetch() {
        try {
            var res = await window.fetch('/api/license-features', { credentials: 'same-origin' });
            if (!res.ok) { _resolve(_features); return; }
            var data = await res.json();
            if (data && data.features) _resolve(data.features);
            else _resolve(_features);
        } catch (_) {
            _resolve(_features);
        }
    }

    global.LicenseFeatures = { isEnabled: isEnabled, get: get, onReady: onReady, fetch: fetch };
})(window);
