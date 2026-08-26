/**
 * Task 3.4 + MOB-APPLY LICENSE-TACTICAL-BASIC-COMMAND-V1
 * Consume GET /api/license/entitlements — grey locked nav / Overwatch (not whole Tactical).
 * Lab open (no license.lic): all features enabled.
 */
(function (global) {
    'use strict';

    var CACHE = null;
    var FETCH_P = null;

    function featureOn(ent, name) {
        if (!ent) return true;
        if (ent.labOpen) return true;
        if (!ent.licensed) return !ent.airgapRequired;
        var f = ent.features || {};
        return !!f[name];
    }

    function applyUpgradeBadge(el, locked, moduleLabel) {
        if (!el) return;
        var existing = el.querySelector('.lic-premium-badge');
        if (!locked) {
            if (existing) existing.remove();
            el.classList.remove('lic-feature-locked', 'lic-feature-premium');
            el.removeAttribute('aria-disabled');
            el.removeAttribute('data-lic-premium');
            if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                el.disabled = false;
            }
            return;
        }
        el.classList.add('lic-feature-premium');
        el.classList.remove('lic-feature-locked');
        el.setAttribute('data-lic-premium', '1');
        el.removeAttribute('aria-disabled');
        if (el.tagName === 'BUTTON') el.disabled = false;
        if (!existing) {
            var badge = document.createElement('span');
            badge.className = 'lic-premium-badge';
            badge.textContent = '\uD83D\uDD12 Premium';
            badge.title = 'Premium capability — contact your representative to activate';
            el.appendChild(badge);
        }
        bindPremiumUpsellClick(el, moduleLabel || 'this module');
    }

    function ensureUpsellModal() {
        var backdrop = document.getElementById('lic-upsell-backdrop');
        if (backdrop) return backdrop;
        backdrop = document.createElement('div');
        backdrop.id = 'lic-upsell-backdrop';
        backdrop.className = 'lic-upsell-backdrop';
        backdrop.hidden = true;
        backdrop.innerHTML =
            '<div class="lic-upsell-card" role="dialog" aria-modal="true" aria-labelledby="lic-upsell-title">' +
            '<button type="button" class="lic-upsell-close" aria-label="Close">&times;</button>' +
            '<div class="lic-upsell-icon" aria-hidden="true">\u2728</div>' +
            '<h4 id="lic-upsell-title">Expand your capacity</h4>' +
            '<p id="lic-upsell-message"></p>' +
            '<button type="button" class="btn-secondary lic-upsell-dismiss">Got it</button>' +
            '</div>';
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) hideUpsellModal();
        });
        backdrop.querySelector('.lic-upsell-close').addEventListener('click', hideUpsellModal);
        backdrop.querySelector('.lic-upsell-dismiss').addEventListener('click', hideUpsellModal);
        return backdrop;
    }

    function showUpsellModal(opts) {
        opts = opts || {};
        var backdrop = ensureUpsellModal();
        var titleEl = document.getElementById('lic-upsell-title');
        var msgEl = document.getElementById('lic-upsell-message');
        var card = backdrop.querySelector('.lic-upsell-card');
        if (titleEl) titleEl.textContent = opts.title || 'Expand your capacity';
        if (msgEl) msgEl.textContent = opts.message || '';
        if (card) {
            card.classList.remove('lic-upsell-info', 'lic-upsell-amber');
            card.classList.add(opts.theme === 'amber' ? 'lic-upsell-amber' : 'lic-upsell-info');
        }
        backdrop.hidden = false;
    }

    function hideUpsellModal() {
        var backdrop = document.getElementById('lic-upsell-backdrop');
        if (backdrop) backdrop.hidden = true;
    }

    var LIMIT_UPSELL_FALLBACK = {
        users: {
            title: 'Capacity Full',
            message: 'All operator accounts are currently in use. Please contact your Ubitron Global partner to expand your system capacity.',
        },
        devices: {
            title: 'Device Capacity Full',
            message: 'All device licenses are currently in use. Please contact your Ubitron Global partner to expand your deployment limit.',
        },
        module: {
            title: 'Module Unavailable',
            message: 'This feature is not included in your current tier. Please contact your Ubitron Global partner to unlock this module.',
        },
        maps: {
            title: 'Capacity Reached',
            message: 'You have utilized your maximum allocation for this tier. Please contact your Ubitron Global partner to scale your infrastructure.',
        },
    };

    function trUpsell(key, fallback) {
        if (global.I18n && typeof I18n.t === 'function') {
            var s = I18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback;
    }

    function showLimitUpsell(context) {
        var ctx = String(context || 'users').trim();
        if (!LIMIT_UPSELL_FALLBACK[ctx]) ctx = 'users';
        var fb = LIMIT_UPSELL_FALLBACK[ctx];
        showUpsellModal({
            title: trUpsell('license.upsell.' + ctx + '.title', fb.title),
            message: trUpsell('license.upsell.' + ctx + '.message', fb.message),
            theme: 'info',
        });
    }

    function tryHandleLimitResponse(res, data) {
        if (!data || data.error !== 'limit_reached') return false;
        showLimitUpsell(data.context || 'users');
        return true;
    }

    function showModuleUpsell(moduleName) {
        void moduleName;
        showLimitUpsell('module');
    }

    function bindPremiumUpsellClick(el, moduleLabel) {
        if (!el || el._licPremiumBound) return;
        el._licPremiumBound = true;
        el.addEventListener('click', function (e) {
            if (!el.getAttribute('data-lic-premium')) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            showModuleUpsell(moduleLabel);
        }, true);
    }

    function tacticalPermOk() {
        if (global.__fmDashboardRole === 'super_admin') return true;
        return !!global.__fmTacticalView;
    }

    function applyNavLocks(ent) {
        if (!ent) ent = CACHE;
        var tactical = document.getElementById('nav-tab-tactical');
        var analytics = document.getElementById('nav-tab-analytics');
        var conference = document.getElementById('nav-tab-conference');
        var cad = document.getElementById('nav-tab-cad');
        var permOk = tacticalPermOk();
        var licOk = featureOn(ent, 'tacticalOverwatch');
        if (tactical) {
            if (!permOk) {
                applyUpgradeBadge(tactical, false);
                tactical.hidden = true;
            } else {
                tactical.hidden = false;
                applyUpgradeBadge(tactical, !licOk, 'Tactical Overwatch');
            }
        }
        var axOn = featureOn(ent, 'analyticsFr') || featureOn(ent, 'analytics');
        applyUpgradeBadge(analytics, !axOn, 'Analytics');
        applyUpgradeBadge(conference, !featureOn(ent, 'videoConference'), 'Video Conference');
        applyUpgradeBadge(cad, !featureOn(ent, 'cadIntegration'), 'CAD / RMS');

        /* Overwatch is Command-only */
        var owBtn = document.getElementById('ax-tactical-ar-open');
        var owLocked = !featureOn(ent, 'tacticalOverwatch');
        applyUpgradeBadge(owBtn, owLocked, 'Tactical Overwatch');
        if (owLocked && owBtn && global.TacticalAr && typeof global.TacticalAr.close === 'function') {
            try { global.TacticalAr.close(); } catch (_) { /* ignore */ }
        }

        var addBtn = document.getElementById('fc-btn-add')
            || document.querySelector('#fixed-cams-dlg .fc-btn-accent');
        var importBtn = document.getElementById('fc-btn-import')
            || document.querySelector('#fixed-cams-dlg [data-fc-import]');
        if (ent && ent.licensed && ent.maxFixedCameras != null) {
            void addBtn;
            void importBtn;
        }
    }

    function applyBanner(ent) {
        var bar = document.getElementById('lic-entitlements-banner');
        if (!bar) {
            var nav = document.querySelector('.top-nav') || document.getElementById('top-bar');
            bar = document.createElement('div');
            bar.id = 'lic-entitlements-banner';
            bar.className = 'lic-entitlements-banner';
            bar.hidden = true;
            if (nav && nav.parentNode) nav.parentNode.insertBefore(bar, nav.nextSibling);
            else document.body.insertBefore(bar, document.body.firstChild);
        }
        if (!ent || ent.labOpen) {
            bar.hidden = true;
            bar.textContent = '';
            return;
        }
        if (ent.licensed) {
            bar.hidden = false;
            bar.className = 'lic-entitlements-banner lic-entitlements-ok';
            var cams = ent.maxFixedCameras != null ? ent.maxFixedCameras : '—';
            var bwc = ent.maxBwcDevices != null ? ent.maxBwcDevices : '—';
            var pin = ent.tacticalPinLiveCap != null ? ent.tacticalPinLiveCap : '—';
            var plan = ent.tacticalPlan === 'command'
                ? 'Plan: Command Tactical'
                : (ent.tacticalPlan === 'basic' ? 'Plan: Basic Tactical' : 'Plan: Tactical');
            var ow = featureOn(ent, 'tacticalOverwatch') ? 'Overwatch: On' : 'Overwatch: Off';
            var _fmtDate = (typeof fmtDate === 'function') ? fmtDate : function (s) { return String(s || '—'); };
            bar.textContent = 'License: ' + (ent.customerName || 'Licensed')
                + ' · Expires ' + _fmtDate(ent.expiryDate || '')
                + ' · Fixed Cameras ' + cams
                + ' · BWC ' + bwc
                + ' · ' + plan
                + ' · Pin Live ' + pin
                + ' · ' + ow;
            return;
        }
        if (ent.airgapRequired) {
            bar.hidden = false;
            bar.className = 'lic-entitlements-banner lic-entitlements-warn';
            bar.textContent = 'License missing or invalid — contact vendor for Upgrade License.';
        } else {
            bar.hidden = true;
        }
    }

    function canManageLicenseActions() {
        if (global.__fmDashboardRole === 'super_admin') return true;
        if (global.__fmCanManageServer) return true;
        return false;
    }

    function downloadFingerprint() {
        var a = document.createElement('a');
        a.href = '/api/license/fingerprint';
        a.download = 'ubitron-request.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function injectEntitlementsCardActions() {
        if (!canManageLicenseActions()) return;
        var head = document.querySelector('#cd-entitlements .cd-entitlement-head');
        if (!head) return;
        if (head.querySelector('.lic-fingerprint-actions')) return;

        var wrap = document.createElement('div');
        wrap.className = 'lic-fingerprint-actions';
        wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-left:auto;align-items:center;';

        var btnFp = document.createElement('button');
        btnFp.type = 'button';
        btnFp.className = 'btn-secondary';
        btnFp.textContent = 'Export System Fingerprint';
        btnFp.addEventListener('click', function () {
            downloadFingerprint();
        });

        var btnMig = document.createElement('button');
        btnMig.type = 'button';
        btnMig.className = 'btn-secondary';
        btnMig.textContent = 'Apply for Migration';
        btnMig.addEventListener('click', function () {
            var confirmed = global.confirm(
                'Migration Export\n\n' +
                'This will export a fingerprint for your new server.\n' +
                'Your current server license will be set to self-destruct in 30 days.\n\n' +
                'Continue?'
            );
            if (confirmed) downloadFingerprint();
        });

        wrap.appendChild(btnFp);
        wrap.appendChild(btnMig);
        head.appendChild(wrap);
    }

    function ensureEntitlementsCardObserver() {
        var el = document.getElementById('cd-entitlements');
        if (!el || el._licFpObs) return;
        el._licFpObs = true;
        var obs = new MutationObserver(function () {
            injectEntitlementsCardActions();
        });
        obs.observe(el, { childList: true, subtree: true });
        injectEntitlementsCardActions();
    }

    function applyAll(ent) {
        CACHE = ent;
        applyBanner(ent);
        applyNavLocks(ent);
        ensureEntitlementsCardObserver();
        injectEntitlementsCardActions();
        try {
            global.dispatchEvent(new CustomEvent('license-entitlements', { detail: ent }));
        } catch (_) { /* IE ignore */ }
    }

    function fetchEntitlements(force) {
        if (CACHE && !force) return Promise.resolve(CACHE);
        if (FETCH_P && !force) return FETCH_P;
        FETCH_P = fetch('/api/license/entitlements', { credentials: 'same-origin' })
            .then(function (r) {
                if (r.status === 401) return null;
                return r.json();
            })
            .then(function (data) {
                FETCH_P = null;
                if (!data || !data.ok || !data.entitlements) return null;
                applyAll(data.entitlements);
                return data.entitlements;
            })
            .catch(function () {
                FETCH_P = null;
                return null;
            });
        return FETCH_P;
    }

    function hasFeature(name) {
        return featureOn(CACHE, name);
    }

    function getCached() {
        return CACHE;
    }

    function getTacticalPinLiveCap() {
        if (!CACHE || CACHE.labOpen) return null;
        if (CACHE.tacticalPinLiveCap == null) return 8;
        return CACHE.tacticalPinLiveCap;
    }

    global.LicenseEntitlementsUi = {
        refresh: function () { return fetchEntitlements(true); },
        load: function () { return fetchEntitlements(false); },
        hasFeature: hasFeature,
        getCached: getCached,
        getTacticalPinLiveCap: getTacticalPinLiveCap,
        applyNavLocks: function () { applyNavLocks(CACHE); },
        showUpsell: showUpsellModal,
        showLimitUpsell: showLimitUpsell,
        tryHandleLimitResponse: tryHandleLimitResponse,
        hideUpsell: hideUpsellModal,
    };

    function boot() {
        fetchEntitlements(false);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : global);
