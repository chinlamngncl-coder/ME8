// mob-health-plain — simple System OK / Not OK in header (polls /api/health)
(function () {
    'use strict';

    var POLL_MS = 15000;
    var el = null;
    var timer = null;

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
            ? tr('healthPlain.notOkReason', 'System not OK — {reason}', { reason: plain })
            : tr('healthPlain.notOk', 'System not OK');
        el.title = tr('healthPlain.notOkTitle', 'Something core is down. Check Settings or restart lab Start.');
    }

    function refresh() {
        fetch('/api/health', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(paint)
            .catch(function () {
                paint({ ok: false, degraded: true, reasons: ['http'] });
            });
    }

    function start() {
        el = document.getElementById('header-system-health');
        if (!el) return;
        el.hidden = false;
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
