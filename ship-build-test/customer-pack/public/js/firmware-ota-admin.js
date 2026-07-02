/**
 * Server Config — Firmware OTA planning page (super admin).
 */
(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function fmtTime(ms) {
        if (!ms) return '—';
        try {
            return new Date(ms).toLocaleString();
        } catch (_) {
            return '—';
        }
    }

    function stepBadge(step) {
        const n = parseInt(step, 10);
        if (!n) return '';
        return '<span class="fw-ota-badge fw-ota-badge-active">' + esc(tr('firmware.step', { n: n })) + '</span>';
    }

    function profileStatusBadge(status) {
        const s = String(status || 'draft').toLowerCase();
        const label = s === 'ready' ? tr('firmware.status.ready') : tr('firmware.status.registered');
        const cls = s === 'ready' ? 'ready' : 'draft';
        return '<span class="fw-ota-pill fw-ota-pill-' + esc(cls) + '">' + esc(label) + '</span>';
    }

    function renderPhases(phases) {
        const el = document.getElementById('fw-ota-phases');
        if (!el) return;
        if (!phases || !phases.length) {
            el.innerHTML = '';
            return;
        }
        el.innerHTML = phases.map(function (p, i) {
            const step = p.step != null ? p.step : (i + 1);
            return '<div class="fw-ota-phase-card">'
                + '<div class="fw-ota-phase-head"><strong>' + esc(p.title) + '</strong>' + stepBadge(step) + '</div>'
                + '<p class="setup-hint" style="margin:6px 0 0">' + esc(p.detail) + '</p>'
                + '</div>';
        }).join('');
    }

    function renderProfiles(profiles) {
        const el = document.getElementById('fw-ota-profiles');
        if (!el) return;
        if (!profiles || !profiles.length) {
            el.innerHTML = '<p class="setup-hint">' + esc(tr('firmware.profiles.empty')) + '</p>';
            return;
        }
        el.innerHTML = '<table class="fw-ota-table"><thead><tr>'
            + '<th>' + esc(tr('firmware.col.vendor')) + '</th>'
            + '<th>' + esc(tr('firmware.col.model')) + '</th>'
            + '<th>' + esc(tr('firmware.col.protocol')) + '</th>'
            + '<th>' + esc(tr('firmware.col.target')) + '</th>'
            + '<th>' + esc(tr('firmware.col.status')) + '</th>'
            + '</tr></thead><tbody>'
            + profiles.map(function (p) {
                return '<tr>'
                    + '<td>' + esc(p.vendor) + '</td>'
                    + '<td>' + esc(p.model) + '<div class="fw-ota-sub">' + esc(p.id) + '</div></td>'
                    + '<td>' + esc(p.protocol) + '</td>'
                    + '<td>' + esc(p.targetVersion || '—') + '</td>'
                    + '<td>' + profileStatusBadge(p.status) + '</td>'
                    + '</tr>';
            }).join('')
            + '</tbody></table>';
    }

    function renderFleet(fleet) {
        const el = document.getElementById('fw-ota-fleet');
        if (!el) return;
        if (!fleet || !fleet.length) {
            el.innerHTML = '<p class="setup-hint">' + esc(tr('firmware.fleet.empty')) + '</p>';
            return;
        }
        el.innerHTML = '<table class="fw-ota-table"><thead><tr>'
            + '<th>' + esc(tr('firmware.col.officer')) + '</th>'
            + '<th>' + esc(tr('firmware.col.deviceId')) + '</th>'
            + '<th>' + esc(tr('firmware.col.group')) + '</th>'
            + '<th>' + esc(tr('firmware.col.version')) + '</th>'
            + '<th>' + esc(tr('firmware.col.profile')) + '</th>'
            + '<th>' + esc(tr('firmware.col.online')) + '</th>'
            + '</tr></thead><tbody>'
            + fleet.map(function (r) {
                const online = r.online
                    ? '<span class="fw-ota-online">' + esc(tr('common.yes')) + '</span>'
                    : '<span class="fw-ota-offline">' + esc(tr('common.no')) + '</span>';
                const profile = r.vendorProfileLabel
                    ? esc(r.vendorProfileLabel) + (r.otaReady ? ' ✓' : '')
                    : '<span class="fw-ota-muted">' + esc(tr('firmware.fleet.noProfile')) + '</span>';
                return '<tr>'
                    + '<td>' + esc(r.name) + '</td>'
                    + '<td class="fw-ota-mono">' + esc(r.deviceId) + '</td>'
                    + '<td>' + esc(r.mapGroup || '—') + '</td>'
                    + '<td>' + esc(r.appversion || tr('firmware.fleet.unknown')) + '</td>'
                    + '<td>' + profile + '</td>'
                    + '<td>' + online + '</td>'
                    + '</tr>';
            }).join('')
            + '</tbody></table>';
    }

    function renderSummary(data) {
        const s = data.summary || {};
        const el = document.getElementById('fw-ota-summary');
        if (!el) return;
        el.innerHTML = ''
            + '<div class="fw-ota-kpi"><span class="fw-ota-kpi-val">' + (s.registered || 0) + '</span><span class="fw-ota-kpi-lbl">' + esc(tr('firmware.kpi.registered')) + '</span></div>'
            + '<div class="fw-ota-kpi"><span class="fw-ota-kpi-val">' + (s.online || 0) + '</span><span class="fw-ota-kpi-lbl">' + esc(tr('firmware.kpi.online')) + '</span></div>'
            + '<div class="fw-ota-kpi"><span class="fw-ota-kpi-val">' + (s.reportedVersion || 0) + '</span><span class="fw-ota-kpi-lbl">' + esc(tr('firmware.kpi.reported')) + '</span></div>'
            + '<div class="fw-ota-kpi"><span class="fw-ota-kpi-val">' + (s.embeddedProfiles || 0) + '</span><span class="fw-ota-kpi-lbl">' + esc(tr('firmware.kpi.profiles')) + '</span></div>'
            + '<div class="fw-ota-kpi"><span class="fw-ota-kpi-val">' + (s.readyProfiles || 0) + '</span><span class="fw-ota-kpi-lbl">' + esc(tr('firmware.kpi.ready')) + '</span></div>';

        const versionsEl = document.getElementById('fw-ota-versions');
        if (versionsEl) {
            const versions = (s.distinctVersions || []);
            versionsEl.textContent = versions.length
                ? versions.join(' · ')
                : tr('firmware.versions.none');
        }

        const banner = document.getElementById('fw-ota-banner');
        if (banner) {
            banner.classList.toggle('fw-ota-banner-ready', !!(s.readyProfiles > 0));
            banner.textContent = data.message || tr('firmware.banner');
        }

        const altEl = document.getElementById('fw-ota-dock-note');
        if (altEl && data.alternatives) altEl.textContent = data.alternatives.docking || '';
    }

    async function load() {
        const res = await fetch('/api/firmware-ota/status');
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || tr('firmware.loadFailed'));
        renderSummary(data);
        renderPhases(data.phases);
        renderProfiles(data.vendorProfiles);
        renderFleet(data.fleet);
        return data;
    }

    function bindRefresh() {
        const btn = document.getElementById('fw-ota-refresh');
        if (!btn || btn._fwBound) return;
        btn._fwBound = true;
        btn.addEventListener('click', function () {
            load().catch(function (err) {
                alert(err.message || tr('firmware.loadFailed'));
            });
        });
    }

    function init() {
        bindRefresh();
    }

    global.FirmwareOtaAdmin = {
        init: init,
        load: load,
    };
})(typeof window !== 'undefined' ? window : global);
