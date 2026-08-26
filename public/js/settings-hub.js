/**
 * Settings landing \u2014 health strip + device lifecycle navigator (read-only + links).
 */
(function (global) {
    'use strict';

    var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    /** Format an ISO date string (YYYY-MM-DD or full ISO) → "01 Jan 2026". Falls back to raw string. */
    function fmtDate(iso) {
        if (!iso) return '—';
        var s = String(iso).slice(0, 10);
        var parts = s.split('-');
        if (parts.length !== 3) return s;
        var y = parts[0], m = parseInt(parts[1], 10) - 1, d = parts[2];
        var mon = MONTHS_SHORT[m];
        if (!mon) return s;
        return d + ' ' + mon + ' ' + y;
    }
    /**
     * Format an ISO datetime string → "01 Jan 2026, 14:35"
     * Works with full ISO (2026-08-19T14:35:00Z), space-separated, or date-only.
     */
    function fmtDateTime(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) {
                // fallback: try replacing space with T
                d = new Date(String(iso).replace(' ', 'T'));
            }
            if (isNaN(d.getTime())) return String(iso).slice(0, 19).replace('T', ' ');
            var day   = ('0' + d.getDate()).slice(-2);
            var mon   = MONTHS_SHORT[d.getMonth()];
            var year  = d.getFullYear();
            var hh    = ('0' + d.getHours()).slice(-2);
            var mm    = ('0' + d.getMinutes()).slice(-2);
            return day + ' ' + mon + ' ' + year + ', ' + hh + ':' + mm;
        } catch (_) {
            return String(iso).slice(0, 16).replace('T', ' ');
        }
    }
    /* Expose so other modules can reuse */
    global.fmtDate     = fmtDate;
    global.fmtDateTime = fmtDateTime;

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
            if (action === 'alarms') {
                btn.hidden = !centreSummaryAvailable();
                return;
            }
            if (action === 'fleet' || action === 'infrastructure' || action === 'security') {
                btn.hidden = !can;
            }
        });

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
                    ? tr('settingsHub.strip.licenseOk') + ' \u00B7 exp ' + fmtDate(snapshot.licenseExpiry)
                    : tr('settingsHub.strip.licenseOk');
                setText('settings-val-license', expLabel);
                setChipState('settings-chip-license', 'ok');
            } else if (snapshot.licenseValid === false) {
                setText('settings-val-license', tr('settingsHub.strip.licenseIssue'));
                setChipState('settings-chip-license', 'bad');
            } else {
                setText('settings-val-license', '\u2014');
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
                uptimeText += ' \u00B7 ' + formatUptime(snapshot.uptimeSec);
            }
            if (uptimeChip) {
                uptimeChip.title = snapshot.healthReasons.map(healthReasonLabel).join(' \u00B7 ');
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
        setText('settings-status-fleet', tr('settingsHub.status.fleet', {
            registered: reg,
            online: online,
        }));
        setText('settings-status-infrastructure', snapshot.deploymentMode
            ? tr('settingsHub.status.configMode', { mode: snapshot.deploymentMode })
            : tr('settingsHub.status.configGeneric'));
        setText('settings-status-security', tr('settingsHub.status.security'));
        setText('settings-status-alarms', centreSummaryAvailable()
            ? tr('settingsHub.status.faultsCentre')
            : tr('settingsHub.status.faultsOps'));
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
        if (action === 'alarms') {
            openCentreSummary();
            return;
        }
        if (!session.canManageServer) {
            if (global.AdminActionBus) AdminActionBus.toast(tr('adminAction.adminRequired'));
            return;
        }
        var tab = 'infrastructure';
        if (action === 'fleet') tab = 'fleet';
        else if (action === 'security') tab = 'security';
        else if (action === 'infrastructure') tab = 'infrastructure';

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
