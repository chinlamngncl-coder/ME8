/**
 * DOCK-IDENTITY-FIRST-SETUP-HINT-V1 — Super admin dock serial checklist (once / remind).
 * Serial lives: Settings → BWCs → Serial column (after Officer).
 */
(function (global) {
    'use strict';

    var SESSION_HIDE_KEY = 'dock-identity-setup-hide-v1';
    var bound = false;

    function tr(key, fallback) {
        try {
            if (global.I18n && typeof I18n.t === 'function') {
                var v = I18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback != null ? fallback : key;
    }

    function isSuperAdmin() {
        return global.__fmDashboardRole === 'super_admin';
    }

    function sessionHidden() {
        try {
            return !!(global.sessionStorage && sessionStorage.getItem(SESSION_HIDE_KEY) === '1');
        } catch (_) {
            return false;
        }
    }

    function setSessionHidden() {
        try {
            if (global.sessionStorage) sessionStorage.setItem(SESSION_HIDE_KEY, '1');
        } catch (_) { /* ignore */ }
    }

    function bannerEl() {
        return document.getElementById('dock-identity-setup-banner');
    }

    function setVisible(show) {
        var el = bannerEl();
        if (el) el.hidden = !show;
    }

    function openBwcs() {
        try {
            if (global.EvidenceManager && EvidenceManager.showTab) {
                EvidenceManager.showTab('server');
            } else {
                var btn = document.getElementById('nav-tab-server');
                if (btn) btn.click();
            }
        } catch (_) { /* ignore */ }
        setTimeout(function () {
            try {
                if (global.ServerSetup && typeof ServerSetup.setMainTab === 'function') {
                    ServerSetup.setMainTab('bwc');
                } else {
                    var tab = document.getElementById('ss-main-tab-bwc');
                    if (tab) tab.click();
                }
            } catch (_) { /* ignore */ }
        }, 150);
    }

    async function postAction(action) {
        var res = await fetch('/api/dock-identity-setup', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ action: action }),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'save failed');
        return data;
    }

    async function refresh() {
        if (!isSuperAdmin()) {
            setVisible(false);
            return;
        }
        if (sessionHidden()) {
            setVisible(false);
            return;
        }
        try {
            var res = await fetch('/api/dock-identity-setup', { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok || !data.show) {
                setVisible(false);
                return;
            }
            var countEl = document.getElementById('dock-identity-setup-count');
            if (countEl) {
                countEl.textContent = String(data.missingSerialCount || 0);
            }
            setVisible(true);
        } catch (_) {
            setVisible(false);
        }
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        var openBtn = document.getElementById('dock-identity-setup-open-bwc');
        var doneBtn = document.getElementById('dock-identity-setup-done');
        var remindBtn = document.getElementById('dock-identity-setup-remind');
        if (openBtn) openBtn.addEventListener('click', openBwcs);
        if (doneBtn) {
            doneBtn.addEventListener('click', function () {
                postAction('done').then(function () {
                    setSessionHidden();
                    setVisible(false);
                }).catch(function () { /* quiet */ });
            });
        }
        if (remindBtn) {
            remindBtn.addEventListener('click', function () {
                postAction('remind').then(function () {
                    setSessionHidden();
                    setVisible(false);
                }).catch(function () {
                    setSessionHidden();
                    setVisible(false);
                });
            });
        }
    }

    function onShow() {
        if (!bannerEl()) return;
        bindUi();
        refresh();
    }

    global.DockIdentitySetup = {
        onShow: onShow,
        openBwcs: openBwcs,
        whereSerial: function () {
            return tr('dockIdentity.whereSerial', 'Settings → BWCs → Serial column (after Officer)');
        },
    };
})(typeof window !== 'undefined' ? window : global);
