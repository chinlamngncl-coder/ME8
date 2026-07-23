/**
 * ME8 dashboard tab lifecycle \u2014 sticky revisits, optional stale refresh (60s).
 */
(function (global) {
    'use strict';

    const STALE_MS = 60000;
    const tabs = Object.create(null);

    function shouldLoad(tab) {
        const s = tabs[tab];
        if (!s || !s.loadedAt) return true;
        return Date.now() - s.loadedAt > STALE_MS;
    }

    function markLoaded(tab) {
        if (!tab) return;
        tabs[tab] = { loadedAt: Date.now(), visited: true };
    }

    function invalidate(tab) {
        if (tab) {
            delete tabs[tab];
            return;
        }
        Object.keys(tabs).forEach(function (k) { delete tabs[k]; });
    }

    global.TabLifecycle = {
        STALE_MS: STALE_MS,
        shouldLoad: shouldLoad,
        markLoaded: markLoaded,
        invalidate: invalidate,
    };
}(typeof window !== 'undefined' ? window : this));
