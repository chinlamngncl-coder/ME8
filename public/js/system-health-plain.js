// Server-dead hard gate: banner + System not OK; after outage → login only
(function () {
    'use strict';

    window.__AXIOM_SERVER_HB = true;

    var FORCE_KEY = 'ax_force_relogin';
    var POLL_MS = 1500;
    var el = null;
    var gate = null;
    var timer = null;
    var lockedOffline = false;
    var deadStreak = 0;
    var inFlight = false;
    var blockersBound = false;
    var redirecting = false;

    function tr(key, fallback, params) {
        try {
            if (window.I18n && I18n.t) {
                var s = I18n.t(key, params);
                if (s && s !== key) return s;
            }
        } catch (e) { /* ignore */ }
        var out = fallback || key;
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(function (p) {
                out = String(out).replace(new RegExp('\\{' + p + '\\}', 'g'), String(params[p]));
            });
        }
        return out;
    }

    function markForceRelogin() {
        try { localStorage.setItem(FORCE_KEY, '1'); } catch (e) { /* ignore */ }
    }

    function mustForceRelogin() {
        try { return localStorage.getItem(FORCE_KEY) === '1'; } catch (e) { return false; }
    }

    function goLogin() {
        if (redirecting) return;
        redirecting = true;
        markForceRelogin();
        try { window.__AXIOM_ALLOW_NAV = true; } catch (e0) { /* ignore */ }
        try {
            if (gate) {
                var msgEl = gate.querySelector('.ax-server-dead-gate-msg');
                if (msgEl) {
                    msgEl.textContent = tr(
                        'healthPlain.serverBackBody',
                        'Server is back. Opening Login…'
                    );
                }
            }
        } catch (e1) { /* ignore */ }
        try { window.location.replace('/login.html'); } catch (e2) {
            try { window.location.href = '/login.html'; } catch (e3) { /* ignore */ }
        }
    }

    /* Enterprise: after any outage lock, never reopen ops until fresh login */
    (function bootForceRelogin() {
        if (!mustForceRelogin()) return;
        var path = String(location.pathname || '');
        if (path.indexOf('login') >= 0) return;
        if (path.indexOf('must-change') >= 0 || path.indexOf('enroll-totp') >= 0 || path.indexOf('recovery-email') >= 0) return;
        goLogin();
    })();

    function ensureGate() {
        gate = document.getElementById('ax-server-dead-gate');
        if (gate) return gate;
        gate = document.createElement('div');
        gate.id = 'ax-server-dead-gate';
        gate.className = 'ax-server-dead-gate';
        gate.setAttribute('role', 'alertdialog');
        gate.setAttribute('aria-modal', 'true');
        gate.setAttribute('aria-live', 'assertive');
        gate.hidden = true;
        gate.innerHTML =
            '<div class="ax-server-dead-gate-card">' +
            '<div class="ax-server-dead-gate-icon" aria-hidden="true">' +
            '<svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" ' +
            'd="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' +
            '</svg></div>' +
            '<h2 class="ax-server-dead-gate-title"></h2>' +
            '<p class="ax-server-dead-gate-msg"></p>' +
            '<button type="button" class="btn-primary ax-server-dead-gate-reload" id="ax-server-dead-reload"></button>' +
            '</div>';
        (document.body || document.documentElement).appendChild(gate);
        var btn = gate.querySelector('#ax-server-dead-reload');
        if (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                /* Always login — never reload into a zombie ops session */
                goLogin();
            });
        }
        return gate;
    }

    function paintGate() {
        ensureGate();
        if (!gate) return;
        var titleEl = gate.querySelector('.ax-server-dead-gate-title');
        var msgEl = gate.querySelector('.ax-server-dead-gate-msg');
        var btn = gate.querySelector('#ax-server-dead-reload');
        if (titleEl) titleEl.textContent = tr('healthPlain.serverLostTitle', 'Server Connection Lost');
        if (msgEl) {
            msgEl.textContent = tr(
                'healthPlain.serverLostBody',
                'The Ubitron Axiom server is down or restarting. This page will open Login when the server is back. Contact your administrator if it does not.'
            );
        }
        if (btn) btn.textContent = tr('healthPlain.reloadPage', 'Go to Login');
        gate.hidden = !lockedOffline;
    }

    function paintHeaderDead() {
        el = el || document.getElementById('header-system-health');
        if (!el) return;
        el.hidden = false;
        el.classList.remove('ok', 'warn');
        el.classList.add('bad');
        el.textContent = tr('healthPlain.notOk', 'System not OK');
        el.title = tr('healthPlain.serverLostTitle', 'Server Connection Lost');
    }

    function bindBlockers() {
        if (blockersBound) return;
        blockersBound = true;
        function allowReloadChord(e) {
            if (!e) return false;
            if (e.key === 'F5') return true;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) return true;
            return false;
        }
        function block(e) {
            if (!lockedOffline) return;
            var t = e.target;
            if (t && t.closest && t.closest('#ax-server-dead-reload')) return;
            if (e.type === 'keydown' && allowReloadChord(e)) {
                e.preventDefault();
                e.stopPropagation();
                goLogin();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        }
        ['click', 'mousedown', 'mouseup', 'pointerdown', 'touchstart', 'keydown', 'keyup', 'submit', 'contextmenu'].forEach(function (type) {
            document.addEventListener(type, block, true);
            window.addEventListener(type, block, true);
        });
    }

    function lockGate() {
        if (redirecting) return;
        lockedOffline = true;
        markForceRelogin();
        bindBlockers();
        ensureGate();
        paintGate();
        paintHeaderDead();
        document.documentElement.classList.add('ax-server-offline');
        if (document.body) document.body.classList.add('ax-server-offline');
        try {
            document.documentElement.style.pointerEvents = 'none';
            if (gate) gate.style.pointerEvents = 'auto';
        } catch (e) { /* ignore */ }
        /* Best-effort kill cookie while server still briefly reachable */
        try {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' }).catch(function () {});
        } catch (e2) { /* ignore */ }
    }

    function onDead() {
        /* LOGIN-FORCE-RELOGIN-NO-BOUNCE-V1 — one slow Ops parse / one failed fetch is not an outage */
        if (document.readyState !== 'complete') return;
        deadStreak += 1;
        if (deadStreak < 2) return;
        lockGate();
    }

    function onAlive(data) {
        deadStreak = 0;
        if (lockedOffline || mustForceRelogin()) {
            goLogin();
            return;
        }
        el = el || document.getElementById('header-system-health');
        if (!el) return;
        el.hidden = false;
        var ok = !!(data && data.ok && !data.degraded);
        el.classList.remove('ok', 'bad', 'warn');
        if (ok) {
            el.classList.add('ok');
            el.textContent = tr('healthPlain.ok', 'System OK');
            return;
        }
        el.classList.add('bad');
        el.textContent = tr('healthPlain.notOk', 'System not OK');
    }

    function ping() {
        if (inFlight || redirecting) return;
        if (mustForceRelogin() && !lockedOffline) {
            goLogin();
            return;
        }
        inFlight = true;
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var abortTimer = setTimeout(function () {
            try { if (ctrl) ctrl.abort(); } catch (e) { /* ignore */ }
            inFlight = false;
            onDead();
        }, 1800);
        fetch('/api/health?_=' + String(Date.now()), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: ctrl ? ctrl.signal : undefined,
            cache: 'no-store',
        })
            .then(function (r) {
                if (!r || typeof r.status !== 'number') { onDead(); return; }
                if (r.status === 502 || r.status === 504) { onDead(); return; }
                if (r.status === 503) {
                    return r.json().then(function (data) {
                        onAlive(data || { ok: false, degraded: true });
                    }).catch(function () { onDead(); });
                }
                if (r.status >= 200 && r.status < 300) {
                    return r.json().then(function (data) { onAlive(data); })
                        .catch(function () { onAlive({ ok: true }); });
                }
                onDead();
            })
            .catch(function () { onDead(); })
            .finally(function () {
                clearTimeout(abortTimer);
                inFlight = false;
            });
    }

    function wrapFetch() {
        var orig = window.fetch;
        if (!orig || orig.__axServerGate) return;
        function wrapped() {
            return orig.apply(this, arguments).catch(function (err) {
                throw err;
            });
        }
        wrapped.__axServerGate = true;
        window.fetch = wrapped;
    }

    function start() {
        if (redirecting) return;
        el = document.getElementById('header-system-health');
        if (el) el.hidden = false;
        ensureGate();
        wrapFetch();
        var legacy = document.getElementById('ax-global-server-banner');
        if (legacy) legacy.hidden = true;
        ping();
        if (timer) clearInterval(timer);
        timer = setInterval(ping, POLL_MS);
        window.addEventListener('offline', onDead);
        window.addEventListener('pageshow', function () {
            if (mustForceRelogin()) goLogin();
        });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) ping();
        });
        document.addEventListener('fm-i18n-changed', function () {
            if (lockedOffline) { paintGate(); paintHeaderDead(); }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
