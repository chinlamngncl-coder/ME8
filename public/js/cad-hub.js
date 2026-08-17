/**
 * CAD / RMS hub — Module Locked upsell when features.cadIntegration is off.
 */
(function (global) {
    'use strict';

    var lastIncidents = [];
    var upsellToastTimer = null;

    function cadLicensed() {
        if (global.LicenseFeatures && LicenseFeatures.isEnabled) {
            return !!LicenseFeatures.isEnabled('cadIntegration');
        }
        if (global.LicenseEntitlementsUi && LicenseEntitlementsUi.hasFeature) {
            return !!LicenseEntitlementsUi.hasFeature('cadIntegration');
        }
        return false;
    }

    function setPadlock(locked) {
        var panel = document.getElementById('cad-panel');
        var overlay = document.getElementById('cad-license-overlay');
        var body = document.getElementById('cad-hub-body');
        if (panel) panel.classList.toggle('cad-premium-locked', !!locked);
        if (overlay) overlay.hidden = !locked;
        if (body) {
            body.hidden = !!locked;
            body.setAttribute('aria-disabled', locked ? 'true' : 'false');
            var controls = body.querySelectorAll('button, input, select, textarea');
            for (var i = 0; i < controls.length; i++) {
                controls[i].disabled = !!locked;
            }
        }
    }

    function renderIncidents(list) {
        var tbody = document.getElementById('cad-incidents-tbody');
        if (!tbody) return;
        var rows = Array.isArray(list) ? list : [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="hint">No CAD incidents.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(function (inc) {
            return '<tr>'
                + '<td>' + esc(inc.id) + '</td>'
                + '<td>' + esc(inc.priority) + '</td>'
                + '<td>' + esc(inc.status) + '</td>'
                + '<td>' + esc(inc.summary) + '</td>'
                + '<td>' + esc((inc.units || []).join(', ')) + '</td>'
                + '</tr>';
        }).join('');
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function loadIncidents() {
        /* CAD/RMS stays a premium upsell surface until cadIntegration ships. */
        setPadlock(true);
        return Promise.resolve();
    }

    function onShow(opts) {
        void opts;
        if (global.LicenseFeatures && LicenseFeatures.fetch) {
            LicenseFeatures.fetch().then(function () { loadIncidents(); });
        } else {
            loadIncidents();
        }
    }

    function bindUi() {
        var refresh = document.getElementById('cad-refresh-btn');
        if (refresh) {
            refresh.addEventListener('click', function () { loadIncidents(); });
        }
        var upsell = document.getElementById('cad-upsell-btn');
        if (upsell) {
            upsell.addEventListener('click', function () {
                var toast = document.getElementById('cad-upsell-toast');
                if (!toast) return;
                toast.textContent = 'Contact Administrator';
                toast.hidden = false;
                if (upsellToastTimer) clearTimeout(upsellToastTimer);
                upsellToastTimer = setTimeout(function () {
                    toast.hidden = true;
                }, 3200);
            });
        }
    }

    global.CadHub = {
        onShow: onShow,
        bindUi: bindUi,
        refresh: loadIncidents,
        isLicensed: cadLicensed,
    };
})(typeof window !== 'undefined' ? window : global);
