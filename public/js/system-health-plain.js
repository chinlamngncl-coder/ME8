// HEALTH-GATE-NO-STALE-FLASH-V1 — no lock while hidden / ping in flight; ping first on return
(function () {
    'use strict';

    window.__AXIOM_SERVER_HB = true;

    var FORCE_KEY = 'ax_force_relogin';
    var POLL_MS = 3000;
    var LOCK_AFTER_MS = 30000;
    var ABORT_MS = 22000;
    var SOS_BYPASS_MS = 60000;
    var el = null;
    var gate = null;
    var timer = null;
    var lockedOffline = false;
    var inFlight = false;
    var blockersBound = false;
    var lastSuccess = Date.now();
    var sosBypassUntil = 0;

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

    function mustForceRelogin() {
        try { return localStorage.getItem(FORCE_KEY) === '1'; } catch (e) { return false; }
    }

    function onSosAlarm() {
        sosBypassUntil = Date.now() + SOS_BYPASS_MS;
    }

    function bindSosAlarmSocket() {
        try {
            if (typeof io === 'undefined') return;
            var managers = io.managers;
            if (!managers || typeof managers.forEach !== 'function') return;
            managers.forEach(function (manager) {
                var sock = manager && manager.nsps && manager.nsps['/'];
                if (sock && !sock.__axSosHealthBypass) {
                    sock.__axSosHealthBypass = true;
                    sock.on('sos-alarm', onSosAlarm);
                }
            });
        } catch (e) { /* ignore */ }
    }

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
                unlockGate();
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
                'The Ubitron Axiom server is not responding. Stay on this page. Use Continue when it is back.'
            );
        }
        if (btn) btn.textContent = tr('healthPlain.reloadPage', 'Continue');
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
        lockedOffline = true;
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
    }

    function unlockGate() {
        lockedOffline = false;
        try { localStorage.removeItem(FORCE_KEY); } catch (e) { /* ignore */ }
        if (gate) gate.hidden = true;
        document.documentElement.classList.remove('ax-server-offline');
        if (document.body) document.body.classList.remove('ax-server-offline');
        try { document.documentElement.style.pointerEvents = ''; } catch (e2) { /* ignore */ }
    }

    function watchdogTick() {
        bindSosAlarmSocket();
        if (typeof document !== 'undefined' && document.hidden) return;
        if (inFlight) return;
        if (Date.now() < sosBypassUntil) return;
        if (Date.now() - lastSuccess < LOCK_AFTER_MS) return;
        lockGate();
    }

    function pingAfterVisible() {
        lastSuccess = Date.now();
        ping();
    }

    function markAlive() {
        lastSuccess = Date.now();
        if (lockedOffline || mustForceRelogin()) unlockGate();
    }

    function paintHeaderFromHealth(data) {
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

    function onAlive(data) {
        markAlive();
        paintHeaderFromHealth(data);
    }

    function ping() {
        if (inFlight) return;
        inFlight = true;
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var abortTimer = setTimeout(function () {
            try { if (ctrl) ctrl.abort(); } catch (e) { /* ignore */ }
        }, ABORT_MS);
        fetch('/api/health?_=' + String(Date.now()), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: ctrl ? ctrl.signal : undefined,
            cache: 'no-store',
        })
            .then(function (r) {
                if (!r || typeof r.status !== 'number') return;
                if (r.status === 503) {
                    return r.json().then(function (data) {
                        onAlive(data || { ok: false, degraded: true });
                    }).catch(function () { markAlive(); });
                }
                if (r.status >= 200 && r.status < 300) {
                    return r.json().then(function (data) { onAlive(data); })
                        .catch(function () { markAlive(); paintHeaderFromHealth({ ok: true }); });
                }
            })
            .catch(function () { /* abort / network — watchdog only */ })
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
        lastSuccess = Date.now();
        el = document.getElementById('header-system-health');
        if (el) el.hidden = false;
        ensureGate();
        wrapFetch();
        var legacy = document.getElementById('ax-global-server-banner');
        if (legacy) legacy.hidden = true;
        bindSosAlarmSocket();
        ping();
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
            ping();
            watchdogTick();
        }, POLL_MS);
        window.addEventListener('pageshow', function () {
            if (!document.hidden) pingAfterVisible();
        });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) pingAfterVisible();
        });
        document.addEventListener('fm-i18n-changed', function () {
            if (lockedOffline) { paintGate(); paintHeaderDead(); }
        });
        document.addEventListener('sos-alarm', onSosAlarm);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
