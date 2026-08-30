/**
 * Global fetch wrapper — appends client tzOffset to any URL with ?date=YYYY-MM-DD.
 * Load early (before dashboard API calls).
 */
(function (global) {
    'use strict';
    if (global.__axiomTzFetchInstalled) return;
    global.__axiomTzFetchInstalled = true;

    var nativeFetch = global.fetch;
    if (typeof nativeFetch !== 'function') return;

    function withTzOffset(url) {
        var s = String(url || '');
        if (!/[?&]date=\d{4}-\d{2}-\d{2}/.test(s)) return s;
        if (/[?&]tzOffset=/.test(s)) return s;
        var sep = s.indexOf('?') >= 0 ? '&' : '?';
        return s + sep + 'tzOffset=' + encodeURIComponent(String(new Date().getTimezoneOffset()));
    }

    global.fetch = function (input, init) {
        try {
            if (typeof input === 'string') {
                input = withTzOffset(input);
            } else if (input && typeof Request !== 'undefined' && input instanceof Request) {
                var next = withTzOffset(input.url);
                if (next !== input.url) input = new Request(next, input);
            }
        } catch (_e) { /* fall through */ }
        return nativeFetch.call(global, input, init);
    };

    global.AxiomTz = {
        offsetMinutes: function () { return new Date().getTimezoneOffset(); },
        appendToUrl: withTzOffset,
    };
})(typeof window !== 'undefined' ? window : global);
