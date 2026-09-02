(function () {
    'use strict';

    /* SERVER-UP-AUTO-LOGIN-V1 — skip leave prompt for forced login redirect */
    window.addEventListener('beforeunload', function (e) {
        if (window.__AXIOM_ALLOW_NAV) return;
        e.preventDefault();
        e.returnValue = '';
    });

    /* Fallback only if system-health-plain.js did not load */
    function startHardGateFallback() {
        if (window.__AXIOM_SERVER_HB) return;
        window.__AXIOM_SERVER_HB = true;
        var locked = false;
        var inFlight = false;
        var redirecting = false;
        var gate = null;

        function goLogin() {
            if (redirecting) return;
            redirecting = true;
            try { window.__AXIOM_ALLOW_NAV = true; } catch (e0) { /* ignore */ }
            try { window.location.replace('/login.html'); } catch (e) {
                window.location.href = '/login.html';
            }
        }

        function ensureGate() {
            gate = document.getElementById('ax-server-dead-gate');
            if (gate) return gate;
            gate = document.createElement('div');
            gate.id = 'ax-server-dead-gate';
            gate.className = 'ax-server-dead-gate';
            gate.hidden = true;
            gate.innerHTML =
                '<div class="ax-server-dead-gate-card">' +
                '<h2 class="ax-server-dead-gate-title">Server Connection Lost</h2>' +
                '<p class="ax-server-dead-gate-msg">The Ubitron Axiom server is down or restarting. This page will open Login when the server is back. Contact your administrator if it does not.</p>' +
                '<button type="button" class="btn-primary ax-server-dead-gate-reload" id="ax-server-dead-reload">Go to Login</button>' +
                '</div>';
            (document.body || document.documentElement).appendChild(gate);
            var btn = gate.querySelector('#ax-server-dead-reload');
            if (btn) {
                btn.onclick = function (ev) {
                    ev.preventDefault();
                    try { localStorage.setItem('ax_force_relogin', '1'); } catch (e) {}
                    goLogin();
                };
            }
            return gate;
        }

        function lock() {
            locked = true;
            try { localStorage.setItem('ax_force_relogin', '1'); } catch (e) {}
            ensureGate();
            gate.hidden = false;
            document.documentElement.classList.add('ax-server-offline');
            document.documentElement.style.pointerEvents = 'none';
            if (gate) gate.style.pointerEvents = 'auto';
            function block(e) {
                if (!locked) return;
                if (e.target && e.target.closest && e.target.closest('#ax-server-dead-reload')) return;
                e.preventDefault();
                e.stopPropagation();
            }
            ['click', 'mousedown', 'keydown', 'submit'].forEach(function (t) {
                document.addEventListener(t, block, true);
            });
        }

        function ping() {
            if (inFlight || redirecting) return;
            inFlight = true;
            var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var t = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} inFlight = false; }, 2000);
            fetch('/api/health', { credentials: 'same-origin', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
                .then(function (r) {
                    if (!r || r.status === 502 || r.status === 504) { lock(); return; }
                    if (r.status === 503) {
                        return r.json().then(function () {
                            if (locked) goLogin();
                        }).catch(function () { lock(); });
                    }
                    if (r.status >= 200 && r.status < 300) {
                        if (locked) goLogin();
                        return;
                    }
                    lock();
                })
                .catch(function () { lock(); })
                .finally(function () { clearTimeout(t); inFlight = false; });
        }

        ensureGate();
        ping();
        setInterval(ping, 2000);
        window.addEventListener('offline', lock);
    }

    setTimeout(startHardGateFallback, 50);
})();
