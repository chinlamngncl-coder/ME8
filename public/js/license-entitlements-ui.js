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

    function applyUpgradeBadge(el, locked) {
        if (!el) return;
        var existing = el.querySelector('.lic-upgrade-badge');
        if (!locked) {
            if (existing) existing.remove();
            el.classList.remove('lic-feature-locked');
            el.removeAttribute('aria-disabled');
            if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                el.disabled = false;
            }
            return;
        }
        el.classList.add('lic-feature-locked');
        el.setAttribute('aria-disabled', 'true');
        if (el.tagName === 'BUTTON') el.disabled = true;
        if (!existing) {
            var badge = document.createElement('span');
            badge.className = 'lic-upgrade-badge';
            badge.textContent = 'Upgrade License';
            badge.title = 'Not included in the current license';
            el.appendChild(badge);
        }
    }

    function applyNavLocks(ent) {
        var tactical = document.getElementById('nav-tab-tactical');
        var analytics = document.getElementById('nav-tab-analytics');
        /* Basic + Command both have Tactical. Never grey the whole tab on Overwatch. */
        applyUpgradeBadge(tactical, false);
        applyUpgradeBadge(analytics, !featureOn(ent, 'analytics'));

        /* Overwatch is Command-only */
        var owBtn = document.getElementById('ax-tactical-ar-open');
        var owLocked = !featureOn(ent, 'tacticalOverwatch');
        applyUpgradeBadge(owBtn, owLocked);
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
                ? 'Command Tactical'
                : (ent.tacticalPlan === 'basic' ? 'Basic Tactical' : 'Tactical');
            var ow = featureOn(ent, 'tacticalOverwatch') ? 'Overwatch on' : 'Overwatch off';
            bar.textContent = 'License: ' + (ent.customerName || 'Licensed')
                + ' · expires ' + (ent.expiryDate || '—')
                + ' · fixed cams ' + cams
                + ' · BWC ' + bwc
                + ' · ' + plan
                + ' · pin live ' + pin
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

    function applyAll(ent) {
        CACHE = ent;
        applyBanner(ent);
        applyNavLocks(ent);
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
