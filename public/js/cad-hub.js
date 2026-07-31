/**
 * CAD / RMS hub — FOMO padlock when features.cadIntegration is off.
 * MOB-APPLY 8.3-UNIFY-LICENSE-AND-CAD-MODULE-FINAL
 */
(function (global) {
    'use strict';

    var lastIncidents = [];

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
        var statusEl = document.getElementById('cad-status-line');
        if (!cadLicensed()) {
            setPadlock(true);
            if (statusEl) statusEl.textContent = 'Premium license required for CAD/RMS.';
            renderIncidents([]);
            return Promise.resolve();
        }
        setPadlock(false);
        if (statusEl) statusEl.textContent = 'Loading CAD incidents…';
        return fetch('/api/cad/incidents', { credentials: 'same-origin' })
            .then(function (r) {
                if (r.status === 403) {
                    setPadlock(true);
                    if (statusEl) statusEl.textContent = 'Premium License Required';
                    return null;
                }
                if (!r.ok) throw new Error('CAD request failed');
                return r.json();
            })
            .then(function (data) {
                if (!data) return;
                lastIncidents = data.incidents || [];
                renderIncidents(lastIncidents);
                if (statusEl) {
                    statusEl.textContent = 'Linked · ' + lastIncidents.length + ' incident(s)';
                }
            })
            .catch(function () {
                if (statusEl) statusEl.textContent = 'Unable to reach CAD bridge.';
            });
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
    }

    global.CadHub = {
        onShow: onShow,
        bindUi: bindUi,
        refresh: loadIncidents,
        isLicensed: cadLicensed,
    };
})(typeof window !== 'undefined' ? window : global);
