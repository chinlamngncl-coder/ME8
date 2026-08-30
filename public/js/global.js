(function () {
    'use strict';

    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        e.returnValue = '';
    });

    /**
     * V13 — global server heartbeat (zombie SPA guard).
     * Primary banner lives in system-health-plain.js; this starts only if that
     * script did not claim the interval (other pages / load-order gaps).
     */
    function startServerHeartbeatFallback() {
        if (window.__AXIOM_SERVER_HB) return;
        window.__AXIOM_SERVER_HB = true;

        var POLL_MS = 5000;
        var lockedOffline = false;
        var inFlight = false;
        var banner = null;

        function ensureBanner() {
            banner = document.getElementById('ax-global-server-banner');
            if (banner) return banner;
            banner = document.createElement('div');
            banner.id = 'ax-global-server-banner';
            banner.className = 'ax-global-server-banner';
            banner.setAttribute('role', 'alert');
            banner.setAttribute('aria-live', 'assertive');
            banner.hidden = true;
            banner.innerHTML =
                '<span class="ax-global-server-banner-text">Server Connection Lost. Reconnecting…</span>';
            if (document.body) {
                document.body.insertBefore(banner, document.body.firstChild);
            }
            return banner;
        }

        function setOffline() {
            if (lockedOffline) return;
            lockedOffline = true;
            ensureBanner();
            if (banner) {
                banner.hidden = false;
                banner.style.pointerEvents = 'auto';
            }
            try {
                document.documentElement.classList.add('ax-server-offline');
                document.documentElement.style.pointerEvents = 'none';
                if (banner) banner.style.pointerEvents = 'auto';
            } catch (e) { /* ignore */ }
        }

        function ping() {
            if (inFlight || lockedOffline) return;
            inFlight = true;
            fetch('/api/health', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            })
                .then(function (r) {
                    if (!r || typeof r.status !== 'number') {
                        setOffline();
                        return;
                    }
                    if (r.status === 502 || r.status === 504) {
                        setOffline();
                        return;
                    }
                    if (r.status === 503) {
                        return r.json().then(function () { /* Node answered (degraded OK) */ })
                            .catch(function () { setOffline(); });
                    }
                })
                .catch(function () {
                    setOffline();
                })
                .finally(function () {
                    inFlight = false;
                });
        }

        ensureBanner();
        ping();
        setInterval(ping, POLL_MS);
    }

    function bootHb() {
        setTimeout(startServerHeartbeatFallback, 50);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootHb);
    } else {
        bootHb();
    }
})();
