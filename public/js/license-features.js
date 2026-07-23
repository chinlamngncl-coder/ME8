/**
 * Client-side license feature gate.
 *
 * Fetches /api/license-features after login and caches the result.
 * Modules check LicenseFeatures.isEnabled('fr') etc. before showing UI.
 * The server never exposes env key names \u2014 only plain booleans arrive here.
 */
(function (global) {
    var _features = { fr: false, anpr: false, redaction: false };
    var _ready = false;
    var _callbacks = [];

    function isEnabled(name) {
        return _features[name] === true;
    }

    function get() {
        return Object.assign({}, _features);
    }

    function onReady(cb) {
        if (_ready) { cb(_features); return; }
        _callbacks.push(cb);
    }

    function _resolve(features) {
        _features = features || _features;
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
