/**
 * HELP-ABOUT-CENTER-V1 \u2014 in-product Help & About under Settings.
 * License activate/expiry stays in Settings ops \u2014 not here.
 * Stable legal page remains /legal-notices.html.
 */
(function (global) {
    'use strict';

    function tr(key, fallback) {
        if (global.I18n && I18n.t) {
            var s = I18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback != null ? fallback : key;
    }

    function setOpen(open) {
        var home = document.getElementById('server-settings-home');
        var help = document.getElementById('server-help-about-workspace');
        var config = document.getElementById('server-config-workspace');
        if (open && config) config.hidden = true;
        if (home) home.hidden = !!open;
        if (help) help.hidden = !open;
        if (open) loadBuild();
        else if (global.SettingsHub && SettingsHub.onShow) SettingsHub.onShow();
    }

    function loadBuild() {
        var el = document.getElementById('help-about-build');
        if (!el) return;
        fetch('/api/health', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (j) {
                var build = j && (j.buildId || j.version || j.appVersion);
                el.textContent = build ? String(build) : tr('server.helpAbout.versionUnknown', 'Unavailable');
            })
            .catch(function () {
                el.textContent = tr('server.helpAbout.versionUnknown', 'Unavailable');
            });
    }

    function bind() {
        var openBtn = document.getElementById('server-help-about-open');
        if (openBtn) openBtn.addEventListener('click', function () { setOpen(true); });
        var backBtn = document.getElementById('server-help-about-back');
        if (backBtn) backBtn.addEventListener('click', function () { setOpen(false); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    global.HelpAbout = {
        open: function () { setOpen(true); },
        close: function () { setOpen(false); },
        isOpen: function () {
            var help = document.getElementById('server-help-about-workspace');
            return !!(help && !help.hidden);
        },
    };
})(typeof window !== 'undefined' ? window : globalThis);
