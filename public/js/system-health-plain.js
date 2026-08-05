// mob-health-plain — header System OK/Not OK + GLOBAL server heartbeat banner
(function () {
    'use strict';

    /** Global fleet heartbeat — 3s (zombie SPA guard when Node is down). */
    var POLL_MS = 3000;
    var el = null;
    var banner = null;
    var timer = null;
    var isServerOnline = true;
    var inFlight = false;

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

    function reasonPlain(code) {
        var map = {
            http: tr('healthPlain.reason.http', 'Dashboard'),
            sip: tr('healthPlain.reason.sip', 'Cameras / signaling'),
            ptt: tr('healthPlain.reason.ptt', 'Push-to-talk'),
            pool: tr('healthPlain.reason.pool', 'Live video'),
        };
        return map[code] || String(code || '');
    }

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
            '<span class="ax-global-server-banner-icon" aria-hidden="true">' +
            '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" ' +
            'd="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' +
            '</svg></span>' +
            '<span class="ax-global-server-banner-text">' +
            tr(
                'healthPlain.serverLost',
                'CRITICAL SYSTEM ALERT: MAIN SERVER CONNECTION LOST. RECONNECTING...'
            ) +
            '</span>';
        if (document.body) {
            document.body.insertBefore(banner, document.body.firstChild);
        }
        return banner;
    }

    function setServerOnline(online) {
        isServerOnline = !!online;
        ensureBanner();
        if (banner) banner.hidden = isServerOnline;
        document.documentElement.classList.toggle('ax-server-offline', !isServerOnline);
    }

    function paint(data) {
        if (!el) return;
        var ok = !!(data && data.ok && !data.degraded);
        el.classList.remove('ok', 'bad', 'warn');
        if (ok) {
            el.classList.add('ok');
            el.textContent = tr('healthPlain.ok', 'System OK');
            el.title = tr('healthPlain.okTitle', 'Dashboard, cameras, talk, and live video look ready.');
            return;
        }
        var reasons = (data && Array.isArray(data.reasons)) ? data.reasons : [];
        var plain = reasons.map(reasonPlain).filter(Boolean).join(', ');
        el.classList.add('bad');
        el.textContent = plain
            ? tr('healthPlain.notOkReason', 'System not OK \u2014 {reason}', { reason: plain })
            : tr('healthPlain.notOk', 'System not OK');
        el.title = tr('healthPlain.notOkTitle', 'Something core is down. Check Settings or restart lab Start.');
    }

    function refresh() {
        if (inFlight) return;
        inFlight = true;
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var abortTimer = null;
        if (ctrl) {
            abortTimer = setTimeout(function () {
                try { ctrl.abort(); } catch (e) { /* ignore */ }
            }, 2500);
        }
        fetch('/api/health', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: ctrl ? ctrl.signal : undefined,
            cache: 'no-store',
        })
            .then(function (r) {
                /* Any HTTP answer = Node is alive (200 OK or 503 degraded still means server up). */
                if (!r || typeof r.status !== 'number') {
                    setServerOnline(false);
                    paint({ ok: false, degraded: true, reasons: ['http'] });
                    return null;
                }
                setServerOnline(true);
                return r.json().catch(function () {
                    return { ok: r.ok, degraded: !r.ok, reasons: r.ok ? [] : ['http'] };
                });
            })
            .then(function (data) {
                if (data) paint(data);
            })
            .catch(function () {
                setServerOnline(false);
                paint({ ok: false, degraded: true, reasons: ['http'] });
            })
            .finally(function () {
                if (abortTimer) clearTimeout(abortTimer);
                inFlight = false;
            });
    }

    function start() {
        el = document.getElementById('header-system-health');
        if (el) el.hidden = false;
        ensureBanner();
        setServerOnline(true);
        refresh();
        if (timer) clearInterval(timer);
        timer = setInterval(refresh, POLL_MS);
        document.addEventListener('fm-i18n-changed', refresh);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
