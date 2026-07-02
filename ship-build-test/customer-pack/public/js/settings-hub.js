/**
 * Settings landing — health strip + device lifecycle navigator (read-only + links).
 */
(function (global) {
    'use strict';

    var session = {
        canManageServer: false,
        auditView: false,
        role: '',
    };

    var snapshot = {
        fleetOnline: 0,
        fleetTotal: 0,
        bwcRegistered: 0,
        ftpEnabled: false,
        uptimeSec: 0,
        licenseValid: null,
        deploymentMode: '',
        firmwareCount: 0,
    };

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return String(key || '').split('.').pop() || key;
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatUptime(sec) {
        var n = Math.max(0, Math.floor(Number(sec) || 0));
        if (n < 60) return n + 's';
        if (n < 3600) return Math.floor(n / 60) + 'm';
        var h = Math.floor(n / 3600);
        var m = Math.floor((n % 3600) / 60);
        return h + 'h ' + m + 'm';
    }

    function isSettingsVisible() {
        var v = document.getElementById('app-view-server');
        return !!(v && !v.hidden);
    }

    function centreSummaryAvailable() {
        var tab = document.getElementById('nav-tab-centre-summary');
        return !!(tab && !tab.hidden);
    }

    function updateManageButtons() {
        var can = session.canManageServer;
        document.querySelectorAll('.settings-lifecycle-card').forEach(function (card) {
            var action = card.getAttribute('data-settings-action');
            var btn = card.querySelector('.settings-lifecycle-open');
            if (!btn) return;
            if (action === 'faults') {
                btn.hidden = !centreSummaryAvailable();
                return;
            }
            if (action === 'monitor') {
                btn.hidden = !can;
                return;
            }
            if (action === 'firmware' || action === 'onboarding' || action === 'assets'
                || action === 'config' || action === 'maintenance') {
                btn.hidden = !can;
            }
        });
        var firmwareCard = document.querySelector('.settings-lifecycle-card[data-settings-action="firmware"]');
        if (firmwareCard) firmwareCard.hidden = !can;

        var ftpChip = document.getElementById('settings-chip-ftp');
        var licChip = document.getElementById('settings-chip-license');
        if (ftpChip) ftpChip.hidden = !can;
        if (licChip) licChip.hidden = !can;

        var auditRow = document.getElementById('server-audit-row');
        if (auditRow) auditRow.hidden = !session.auditView;
    }

    function setChipState(chipId, state) {
        var el = document.getElementById(chipId);
        if (!el) return;
        el.classList.remove('ok', 'warn', 'bad');
        if (state) el.classList.add(state);
    }

    function renderStrip() {
        setText('settings-val-fleet', tr('settingsHub.strip.fleetVal', {
            online: snapshot.fleetOnline,
            total: snapshot.fleetTotal,
        }));
        setChipState('settings-chip-fleet', snapshot.fleetTotal && snapshot.fleetOnline === snapshot.fleetTotal
            ? 'ok'
            : (snapshot.fleetOnline > 0 ? 'warn' : ''));

        if (session.canManageServer) {
            setText('settings-val-ftp', snapshot.ftpEnabled
                ? tr('server.dock.running')
                : tr('server.dock.stopped'));
            setChipState('settings-chip-ftp', snapshot.ftpEnabled ? 'ok' : 'warn');

            if (snapshot.licenseValid === true) {
                setText('settings-val-license', tr('settingsHub.strip.licenseOk'));
                setChipState('settings-chip-license', 'ok');
            } else if (snapshot.licenseValid === false) {
                setText('settings-val-license', tr('settingsHub.strip.licenseIssue'));
                setChipState('settings-chip-license', 'bad');
            } else {
                setText('settings-val-license', '—');
                setChipState('settings-chip-license', '');
            }
        }

        setText('settings-val-uptime', formatUptime(snapshot.uptimeSec));
    }

    function renderCards() {
        var reg = snapshot.bwcRegistered || snapshot.fleetTotal;
        var online = snapshot.fleetOnline;
        setText('settings-status-onboarding', tr('settingsHub.status.onboarding', {
            registered: reg,
            online: online,
        }));
        setText('settings-status-assets', tr('settingsHub.status.assets', {
            count: reg,
        }));
        setText('settings-status-config', snapshot.deploymentMode
            ? tr('settingsHub.status.configMode', { mode: snapshot.deploymentMode })
            : tr('settingsHub.status.configGeneric'));
        setText('settings-status-maintenance', snapshot.ftpEnabled
            ? tr('settingsHub.status.maintenanceFtpOn')
            : tr('settingsHub.status.maintenanceFtpOff'));
        setText('settings-status-faults', centreSummaryAvailable()
            ? tr('settingsHub.status.faultsCentre')
            : tr('settingsHub.status.faultsOps'));
        setText('settings-status-monitor', session.canManageServer
            ? tr('settingsHub.status.monitorAdmin')
            : tr('settingsHub.status.monitorOps'));
        setText('settings-status-firmware', session.canManageServer
            ? tr('settingsHub.status.firmwarePlanning')
            : '—');
    }

    async function refresh() {
        if (!isSettingsVisible()) return;

        function fetchJson(url) {
            return fetch(url, { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .catch(function () { return null; });
        }

        var admin = session.canManageServer;
        var results = await Promise.all([
            fetchJson('/api/health'),
            fetchJson('/api/fleet'),
            admin ? fetchJson('/api/server-settings') : null,
            admin ? fetchJson('/api/platform/status') : null,
            admin ? fetchJson('/api/firmware-ota/status') : null,
        ]);

        var hdata = results[0];
        if (hdata && hdata.uptimeSec != null) snapshot.uptimeSec = hdata.uptimeSec;

        var fdata = results[1];
        if (fdata && fdata.fleet) {
            var fleet = fdata.fleet;
            snapshot.fleetTotal = fleet.length;
            snapshot.fleetOnline = fleet.filter(function (m) {
                return m && (m.online || m.status === '1');
            }).length;
        }

        if (admin) {
            var sdata = results[2];
            if (sdata) {
                if (sdata.runtime) snapshot.ftpEnabled = !!sdata.runtime.ftpEnabled;
                if (sdata.bwcDevices) snapshot.bwcRegistered = sdata.bwcDevices.count || 0;
                if (sdata.settings && sdata.settings.deployment) {
                    var mode = sdata.settings.deployment.mode || 'lan';
                    var modeKey = 'server.mode.' + mode;
                    var modeLabel = tr(modeKey);
                    snapshot.deploymentMode = modeLabel !== modeKey ? modeLabel : mode;
                }
            }

            var pdata = results[3];
            if (pdata) {
                if (pdata.license) snapshot.licenseValid = !!pdata.license.valid;
                if (pdata.usage && pdata.usage.bwcDevices != null && !snapshot.bwcRegistered) {
                    snapshot.bwcRegistered = pdata.usage.bwcDevices;
                }
            }

            var odata = results[4];
            if (odata && odata.fleet && odata.fleet.length) {
                snapshot.firmwareCount = odata.fleet.length;
            }
        } else if (!snapshot.bwcRegistered) {
            snapshot.bwcRegistered = snapshot.fleetTotal;
        }

        renderStrip();
        renderCards();
        updateManageButtons();
        if (global.TabLifecycle) TabLifecycle.markLoaded('server');
    }

    function openCentreSummary() {
        if (!centreSummaryAvailable()) {
            if (global.EvidenceManager && EvidenceManager.showTab) EvidenceManager.showTab('ops');
            return;
        }
        if (global.EvidenceManager && EvidenceManager.showTab) EvidenceManager.showTab('centre-summary');
    }

    function runAction(action) {
        if (action === 'faults') {
            openCentreSummary();
            return;
        }
        if (action === 'maintenance') {
            if (global.ServerSetup && ServerSetup.openEvidenceStorage) {
                ServerSetup.openEvidenceStorage();
            } else if (global.EvidenceManager && EvidenceManager.showTab) {
                EvidenceManager.showTab('evidence');
            }
            return;
        }
        if (!session.canManageServer || !global.ServerSetup || !ServerSetup.openConfigTab) return;
        if (global.ServerSetup.trySettingsNavLock && !global.ServerSetup.trySettingsNavLock()) return;
        var tab = 'server';
        if (action === 'onboarding' || action === 'assets') tab = 'bwc';
        else if (action === 'config') tab = 'server';
        else if (action === 'monitor') tab = 'diagnostics';
        else if (action === 'firmware') tab = 'firmware';
        ServerSetup.openConfigTab(tab);
    }

    function bindUi() {
        var grid = document.getElementById('settings-lifecycle-grid');
        if (grid && !grid._settingsBound) {
            grid._settingsBound = true;
            grid.addEventListener('click', function (e) {
                var btn = e.target.closest('.settings-lifecycle-open');
                if (!btn || btn.hidden) return;
                var card = btn.closest('[data-settings-action]');
                if (!card) return;
                runAction(card.getAttribute('data-settings-action'));
            });
        }
    }

    function applySession(data) {
        if (!data) return;
        session.canManageServer = !!data.canManageServer;
        session.auditView = !!(data.permissions && (data.permissions.auditView || data.permissions.auditExport));
        session.role = data.role || '';
        updateManageButtons();
        if (isSettingsVisible()) refresh();
    }

    function onShow(opts) {
        opts = opts || {};
        if (!opts.force && global.TabLifecycle && !TabLifecycle.shouldLoad('server')) return;
        refresh();
    }

    function init() {
        bindUi();
        fetch('/api/auth/session', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.ok) applySession(data);
            })
            .catch(function () { /* ignore */ });
    }

    global.SettingsHub = {
        init: init,
        onShow: onShow,
        refresh: refresh,
        applySession: applySession,
    };
}(window));
