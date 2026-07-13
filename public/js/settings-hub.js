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
        licenseExpiry: null,
        deploymentMode: '',
        firmwareCount: 0,
        healthDegraded: false,
        healthReasons: [],
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

    function paint() {
        renderStrip();
        renderCards();
        updateManageButtons();
    }

    function healthReasonLabel(code) {
        var plainKey = 'healthPlain.reason.' + String(code || '');
        var plain = tr(plainKey);
        if (plain && plain !== plainKey) return plain;
        var key = 'settingsHub.strip.reason.' + String(code || '');
        var label = tr(key);
        return label !== key ? label : String(code || 'degraded');
    }

    function renderStrip() {
        if (snapshot.healthDegraded) {
            var reasonJoin = snapshot.healthReasons.length
                ? snapshot.healthReasons.map(healthReasonLabel).join(', ')
                : tr('healthPlain.notOk');
            setText('settings-val-system', tr('healthPlain.notOkReason', { reason: reasonJoin }));
            setChipState('settings-chip-system', 'bad');
        } else {
            setText('settings-val-system', tr('healthPlain.ok'));
            setChipState('settings-chip-system', snapshot.uptimeSec > 0 ? 'ok' : '');
        }

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
                var expLabel = snapshot.licenseExpiry
                    ? tr('settingsHub.strip.licenseOk') + ' · exp ' + snapshot.licenseExpiry
                    : tr('settingsHub.strip.licenseOk');
                setText('settings-val-license', expLabel);
                setChipState('settings-chip-license', 'ok');
            } else if (snapshot.licenseValid === false) {
                setText('settings-val-license', tr('settingsHub.strip.licenseIssue'));
                setChipState('settings-chip-license', 'bad');
            } else {
                setText('settings-val-license', '—');
                setChipState('settings-chip-license', '');
            }
        }

        var uptimeText = formatUptime(snapshot.uptimeSec);
        var uptimeChip = document.getElementById('settings-chip-uptime');
        if (snapshot.healthDegraded) {
            var reasonText = snapshot.healthReasons.length
                ? healthReasonLabel(snapshot.healthReasons[0])
                : tr('settingsHub.strip.degraded');
            uptimeText = tr('settingsHub.strip.degradedShort', { reason: reasonText });
            if (snapshot.uptimeSec > 0) {
                uptimeText += ' · ' + formatUptime(snapshot.uptimeSec);
            }
            if (uptimeChip) {
                uptimeChip.title = snapshot.healthReasons.map(healthReasonLabel).join(' · ');
            }
            setChipState('settings-chip-uptime', 'warn');
        } else {
            if (uptimeChip) uptimeChip.removeAttribute('title');
            setChipState('settings-chip-uptime', snapshot.uptimeSec > 0 ? 'ok' : '');
        }
        setText('settings-val-uptime', uptimeText);
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

    function applyWarmSettings(sdata) {
        if (!sdata) return;
        if (sdata.runtime) snapshot.ftpEnabled = !!sdata.runtime.ftpEnabled;
        if (sdata.bwcDevices) snapshot.bwcRegistered = sdata.bwcDevices.count || 0;
        if (sdata.settings && sdata.settings.deployment) {
            var mode = sdata.settings.deployment.mode || 'lan';
            var modeKey = 'server.mode.' + mode;
            var modeLabel = tr(modeKey);
            snapshot.deploymentMode = modeLabel !== modeKey ? modeLabel : mode;
        }
        paint();
    }

    function fetchJson(url) {
        return fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });
    }

    async function refresh(opts) {
        opts = opts || {};
        if (!isSettingsVisible()) return;

        paint();

        var admin = session.canManageServer;

        if (global.SessionBus && SessionBus.peekSettings) {
            applyWarmSettings(SessionBus.peekSettings());
        }

        var healthFleet = await Promise.all([
            fetchJson('/api/health'),
            fetchJson('/api/fleet'),
        ]);
        var hdata = healthFleet[0];
        if (hdata) {
            if (hdata.uptimeSec != null) snapshot.uptimeSec = hdata.uptimeSec;
            snapshot.healthDegraded = !!hdata.degraded;
            snapshot.healthReasons = Array.isArray(hdata.reasons) ? hdata.reasons.slice() : [];
        }
        var fdata = healthFleet[1];
        if (fdata && fdata.fleet) {
            var fleet = fdata.fleet;
            snapshot.fleetTotal = fleet.length;
            snapshot.fleetOnline = fleet.filter(function (m) {
                return m && (m.online || m.status === '1');
            }).length;
        }
        paint();

        if (!admin) {
            if (!snapshot.bwcRegistered) snapshot.bwcRegistered = snapshot.fleetTotal;
            paint();
            if (global.TabLifecycle) TabLifecycle.markLoaded('server');
            return;
        }

        var settingsPromise = (global.SessionBus && SessionBus.getSettings)
            ? SessionBus.getSettings()
            : fetchJson('/api/server-settings');

        var adminCore = await Promise.all([
            settingsPromise,
            fetchJson('/api/platform/status'),
        ]);

        var sdata = adminCore[0];
        if (sdata) applyWarmSettings(sdata);

        var pdata = adminCore[1];
        if (pdata) {
            if (pdata.license) {
                snapshot.licenseValid = !!pdata.license.valid;
                if (pdata.license.expiresAt) {
                    snapshot.licenseExpiry = pdata.license.expiresAt.slice(0, 10);
                }
            }
            if (pdata.usage && pdata.usage.bwcDevices != null && !snapshot.bwcRegistered) {
                snapshot.bwcRegistered = pdata.usage.bwcDevices;
            }
        }
        paint();

        if (opts.includeFirmware) {
            var odata = await fetchJson('/api/firmware-ota/status');
            if (odata && odata.fleet && odata.fleet.length) {
                snapshot.firmwareCount = odata.fleet.length;
            }
            paint();
        }

        if (global.TabLifecycle) TabLifecycle.markLoaded('server');
    }

    function openCentreSummary() {
        if (!centreSummaryAvailable()) {
            if (global.EvidenceManager && EvidenceManager.showTab) EvidenceManager.showTab('ops');
            return;
        }
        if (global.EvidenceManager && EvidenceManager.showTab) EvidenceManager.showTab('centre-summary');
    }

    function runAction(action, sourceBtn) {
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
        if (!session.canManageServer) {
            if (global.AdminActionBus) AdminActionBus.toast(tr('adminAction.adminRequired'));
            return;
        }
        var tab = 'server';
        if (action === 'onboarding' || action === 'assets') tab = 'bwc';
        else if (action === 'config') tab = 'server';
        else if (action === 'monitor') tab = 'diagnostics';
        else if (action === 'firmware') tab = 'firmware';

        var launch = function () {
            if (!global.ServerSetup || !ServerSetup.openConfigTab) {
                if (global.AdminActionBus) AdminActionBus.toast(tr('adminAction.toolsLoading'));
                return;
            }
            ServerSetup.openConfigTab(tab, { sourceBtn: sourceBtn || null });
        };

        if (global.AdminActionBus && AdminActionBus.waitForServerSetup) {
            AdminActionBus.waitForServerSetup().then(function (ok) {
                if (!ok) {
                    AdminActionBus.toast(tr('adminAction.toolsLoading'));
                    return;
                }
                launch();
            });
            return;
        }
        launch();
    }

    function bindUi() {
        var grid = document.getElementById('settings-lifecycle-grid');
        if (grid && !grid._settingsBound) {
            grid._settingsBound = true;
            grid.addEventListener('click', function (e) {
                var btn = e.target.closest('.settings-lifecycle-open');
                if (!btn || btn.hidden || btn.disabled) return;
                var card = btn.closest('[data-settings-action]');
                if (!card) return;
                runAction(card.getAttribute('data-settings-action'), btn);
            });
        }
    }

    function applySession(data) {
        if (!data) return;
        session.canManageServer = !!data.canManageServer;
        session.auditView = !!(data.permissions && (data.permissions.auditView || data.permissions.auditExport));
        session.role = data.role || '';
        updateManageButtons();
        if (isSettingsVisible()) {
            paint();
            refresh();
        }
    }

    function onShow(opts) {
        opts = opts || {};
        paint();
        if (!opts.force && global.TabLifecycle && !TabLifecycle.shouldLoad('server')) return;
        refresh(opts);
    }

    function init() {
        bindUi();
        if (global.SessionBus && SessionBus.get) {
            SessionBus.get().then(function (data) {
                if (data) applySession(data);
            }).catch(function () { /* ignore */ });
        }
    }

    global.SettingsHub = {
        init: init,
        onShow: onShow,
        refresh: refresh,
        applySession: applySession,
        paint: paint,
    };
}(window));
