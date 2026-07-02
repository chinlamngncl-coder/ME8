/**
 * Settings administration hub — fleet table, health tiles, embedded Server Config panels.
 */
(function (global) {
    'use strict';

    var pollTimer = null;
    var fleetMetaById = Object.create(null);
    var socketBound = false;
    var configMounted = false;

    var MAIN_TO_ADMIN = {
        server: 'network',
        bwc: 'devices',
        groups: 'groups',
        dashboard: 'users',
        firmware: 'advanced',
        usb: 'advanced',
        cloud: 'advanced',
        diagnostics: 'advanced',
        lab: 'advanced',
    };

    var ADMIN_TO_MAIN = {
        overview: null,
        devices: 'bwc',
        groups: 'groups',
        network: 'server',
        users: 'dashboard',
        audit: null,
        advanced: 'firmware',
    };

    var ADVANCED_TABS = ['firmware', 'usb', 'cloud', 'diagnostics', 'lab'];
    var GATED_ADMIN_TABS = ['devices', 'groups', 'network', 'users', 'advanced'];

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function groupColorForDevice(camId, mapGroup) {
        var lk = global.dispatchGroupLookup || {};
        if (camId && lk.byDevice && lk.byDevice[camId] && lk.byDevice[camId].color) {
            return lk.byDevice[camId].color;
        }
        var gk = String(mapGroup || '').toLowerCase();
        if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
            return lk.byName[gk].color;
        }
        return '#64748b';
    }

    function formatUptime(sec) {
        var n = Math.max(0, Math.floor(Number(sec) || 0));
        if (n < 60) return n + 's';
        if (n < 3600) return Math.floor(n / 60) + 'm ' + (n % 60) + 's';
        var h = Math.floor(n / 3600);
        var m = Math.floor((n % 3600) / 60);
        return h + 'h ' + m + 'm';
    }

    function formatLastSeen(ts) {
        var n = Number(ts) || 0;
        if (!n) return '—';
        var sec = Math.floor((Date.now() - n) / 1000);
        if (sec < 15) return tr('adminHub.lastSeenNow');
        if (sec < 60) return tr('adminHub.lastSeenSecAgo', { n: sec });
        if (sec < 3600) return tr('adminHub.lastSeenMinAgo', { n: Math.floor(sec / 60) });
        if (sec < 86400) return tr('adminHub.lastSeenHrAgo', { n: Math.floor(sec / 3600) });
        return tr('adminHub.lastSeenDayAgo', { n: Math.floor(sec / 86400) });
    }

    function isSettingsVisible() {
        var v = document.getElementById('app-view-server');
        return !!(v && !v.hidden);
    }

    function canManageServerUi() {
        var row = document.getElementById('server-setup-row');
        return !!(row && !row.hidden);
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setHealthFleet(online, total) {
        setText('admin-health-fleet-val', online + ' / ' + total);
    }

    function setHealthSip(ready) {
        var el = document.getElementById('admin-health-sip-val');
        if (!el) return;
        el.textContent = ready ? tr('adminHub.healthSipReady') : tr('adminHub.healthSipDown');
        el.classList.toggle('ok', !!ready);
        el.classList.toggle('warn', !ready);
    }

    function ingestFleetMeta(fleet) {
        fleetMetaById = Object.create(null);
        (fleet || []).forEach(function (m) {
            if (!m || !m.id) return;
            fleetMetaById[m.id] = {
                online: !!(m.online || m.status === '1'),
                lastSeen: m.lastSeen || 0,
                mapGroup: m.mapGroup || '',
                name: m.name || '',
            };
        });
    }

    function deviceOnline(deviceId) {
        if (global.FleetUi && FleetUi.isDeviceOnline) {
            return FleetUi.isDeviceOnline(deviceId);
        }
        var meta = fleetMetaById[deviceId];
        return !!(meta && meta.online);
    }

    function buildFleetRows() {
        var registry = [];
        if (global.BwcDevices && BwcDevices.listDevices) {
            registry = BwcDevices.listDevices().filter(function (d) {
                return d && d.deviceId && (d.status || 'active') !== 'retired';
            });
        }
        if (!registry.length) {
            return Object.keys(fleetMetaById).map(function (id) {
                var meta = fleetMetaById[id];
                return {
                    deviceId: id,
                    operatorName: meta.name || id,
                    mapGroup: meta.mapGroup || '',
                };
            });
        }
        return registry.slice();
    }

    function renderFleetTable() {
        var tbody = document.getElementById('admin-fleet-tbody');
        var summary = document.getElementById('admin-fleet-summary');
        if (!tbody) return;

        var rows = buildFleetRows();
        rows.sort(function (a, b) {
            var oa = deviceOnline(a.deviceId) ? 1 : 0;
            var ob = deviceOnline(b.deviceId) ? 1 : 0;
            if (oa !== ob) return ob - oa;
            return String(a.operatorName || a.deviceId).localeCompare(String(b.operatorName || b.deviceId));
        });

        if (summary) {
            var online = rows.filter(function (d) { return deviceOnline(d.deviceId); }).length;
            summary.textContent = tr('adminHub.fleetSummary', { online: online, total: rows.length });
        }

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="hint">' + esc(tr('adminHub.noDevices')) + '</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (d) {
            var id = d.deviceId;
            var on = deviceOnline(id);
            var meta = fleetMetaById[id] || {};
            var group = d.mapGroup || meta.mapGroup || '';
            var color = groupColorForDevice(id, group);
            var lastSeen = meta.lastSeen || 0;
            return '<tr>' +
                '<td><span class="admin-fleet-dot' + (on ? ' on' : '') + '" title="' + esc(on ? tr('fleet.statusOnline') : tr('fleet.statusOffline')) + '"></span></td>' +
                '<td><span class="admin-fleet-group-swatch" style="background:' + esc(color) + '" title="' + esc(group || tr('fleet.groupUngrouped')) + '"></span></td>' +
                '<td><strong>' + esc(d.operatorName || meta.name || '—') + '</strong><br><span class="admin-fleet-id">' + esc(id) + '</span></td>' +
                '<td>' + esc(group || '—') + '</td>' +
                '<td class="admin-fleet-last">' + esc(formatLastSeen(lastSeen)) + '</td>' +
                '</tr>';
        }).join('');
    }

    async function refreshHealth() {
        var hadDashboard = false;
        try {
            var res = await fetch('/api/health', { credentials: 'same-origin' });
            var data = await res.json();
            if (data && data.uptimeSec != null) {
                setText('admin-health-uptime-val', formatUptime(data.uptimeSec));
            }
            if (data && data.dashboard) {
                hadDashboard = true;
                setHealthFleet(data.dashboard.fleetOnline, data.dashboard.fleetConfigured);
                setHealthSip(data.dashboard.sipReady);
            }
        } catch (_) { /* ignore */ }

        try {
            var fr = await fetch('/api/fleet', { credentials: 'same-origin' });
            var fd = await fr.json();
            ingestFleetMeta(fd && fd.fleet);
            if (!hadDashboard) {
                var fleet = fd.fleet || [];
                var online = fleet.filter(function (m) { return m && (m.online || m.status === '1'); }).length;
                setHealthFleet(online, fleet.length);
            }
            renderFleetTable();
        } catch (_) { /* ignore */ }
    }

    function adminTabFromMain(mainTab) {
        return MAIN_TO_ADMIN[mainTab] || 'network';
    }

    function selectAdminTab(adminTab, skipMainTab) {
        var radio = document.getElementById('admin-hub-radio-' + adminTab);
        if (radio) radio.checked = true;
        if (!skipMainTab && ADMIN_TO_MAIN[adminTab] && global.ServerSetup && ServerSetup.setMainTab) {
            ServerSetup.setMainTab(ADMIN_TO_MAIN[adminTab], { fromAdminNav: true });
        }
        if (adminTab === 'devices') renderFleetTable();
    }

    function setAdvancedSubPanel(tab) {
        ADVANCED_TABS.forEach(function (id) {
            var panel = document.getElementById('ss-panel-' + id);
            if (panel) panel.classList.toggle('active', id === tab);
            var btn = document.getElementById('admin-advanced-tab-' + id);
            if (btn) btn.classList.toggle('active', id === tab);
        });
    }

    function syncAdvancedTabVisibility() {
        ['firmware', 'usb', 'cloud', 'diagnostics', 'lab'].forEach(function (id) {
            var legacy = document.getElementById('ss-main-tab-' + id);
            var btn = document.getElementById('admin-advanced-tab-' + id);
            if (btn && legacy) btn.hidden = legacy.hidden;
        });
    }

    function updateManageSectionsVisibility() {
        var can = canManageServerUi();
        ['admin-devices-edit-section', 'admin-panel-devices-mount', 'admin-devices-footer'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.hidden = !can;
        });
        var advNav = document.getElementById('admin-nav-advanced');
        if (advNav) advNav.hidden = !can;
    }

    function adminTabNeedsGate(adminTab) {
        return GATED_ADMIN_TABS.indexOf(adminTab) >= 0 && canManageServerUi();
    }

    function withConfigGate(adminTab, fn) {
        if (!adminTabNeedsGate(adminTab) || !global.ServerSetup || !ServerSetup.requireConfigGate) {
            fn();
            return;
        }
        ServerSetup.requireConfigGate(fn);
    }

    function mountPanel(panelId, mountId) {
        var mount = document.getElementById(mountId);
        var panel = document.getElementById(panelId);
        if (!mount || !panel || panel.parentElement === mount) return;
        panel.classList.add('admin-embedded-panel', 'active');
        mount.appendChild(panel);
    }

    function mountConfigPanels() {
        if (configMounted) return;
        configMounted = true;
        document.body.classList.add('admin-config-embedded');

        var banner = document.getElementById('ss-readonly-banner');
        var networkMount = document.getElementById('admin-panel-network-mount');
        if (banner && networkMount) networkMount.insertBefore(banner, networkMount.firstChild);

        mountPanel('ss-panel-server', 'admin-panel-network-mount');
        mountPanel('ss-panel-bwc', 'admin-panel-devices-mount');
        mountPanel('ss-panel-groups', 'admin-panel-groups-mount');
        mountPanel('ss-panel-dashboard', 'admin-panel-users-mount');

        var advMount = document.getElementById('admin-panel-advanced-mount');
        ADVANCED_TABS.forEach(function (tab) {
            var panel = document.getElementById('ss-panel-' + tab);
            if (panel && advMount) {
                panel.classList.add('admin-advanced-subpanel');
                panel.classList.toggle('active', tab === 'firmware');
                advMount.appendChild(panel);
            }
        });

        var techUnlock = document.getElementById('ss-tech-unlock');
        var advPanel = document.getElementById('admin-panel-advanced');
        if (techUnlock && advPanel) advPanel.appendChild(techUnlock);

        var saveServer = document.getElementById('server-setup-save');
        var networkFooter = document.getElementById('admin-network-footer');
        if (saveServer && networkFooter) networkFooter.appendChild(saveServer);

        var saveBwc = document.getElementById('ss-save-bwc-list');
        var devicesFooter = document.getElementById('admin-devices-footer');
        if (saveBwc && devicesFooter) devicesFooter.appendChild(saveBwc);

        if (global.ServerSetup && ServerSetup.neutralizeLegacyModalShell) {
            ServerSetup.neutralizeLegacyModalShell();
        } else {
            var backdrop = document.getElementById('server-setup-backdrop');
            if (backdrop) backdrop.hidden = true;
        }
        if (global.ServerSetup && ServerSetup.reenableEmbeddedControls) {
            ServerSetup.reenableEmbeddedControls();
        }

        syncAdvancedTabVisibility();
        updateManageSectionsVisibility();
    }

    function selectDefaultTab() {
        var devicesRadio = document.getElementById('admin-hub-radio-devices');
        var overviewRadio = document.getElementById('admin-hub-radio-overview');
        if (canManageServerUi() && devicesRadio) {
            withConfigGate('devices', function () {
                devicesRadio.checked = true;
                if (global.ServerSetup && ServerSetup.setMainTab) {
                    ServerSetup.setMainTab('bwc', { fromAdminNav: true });
                }
                updateManageSectionsVisibility();
            });
        } else if (overviewRadio) {
            overviewRadio.checked = true;
        }
        updateManageSectionsVisibility();
    }

    function onConfigOpen(mainTab) {
        mountConfigPanels();
        selectAdminTab(adminTabFromMain(mainTab || 'server'), true);
        if (global.ServerSetup && ServerSetup.setMainTab) {
            ServerSetup.setMainTab(mainTab || 'server', { fromAdminNav: true });
        }
    }

    function stopPoll() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function startPoll() {
        stopPoll();
        pollTimer = setInterval(function () {
            if (!isSettingsVisible()) {
                stopPoll();
                return;
            }
            refreshHealth();
        }, 15000);
    }

    function bindSocket() {
        if (socketBound) return;
        var socket = global.__mobilityDashboardSocket;
        if (!socket || !socket.on) return;
        socketBound = true;
        socket.on('fleet-roster', function (fleet) {
            ingestFleetMeta(fleet);
            if (isSettingsVisible()) renderFleetTable();
        });
        socket.on('device-offline', function () {
            if (isSettingsVisible()) renderFleetTable();
        });
    }

    function bindUi() {
        mountConfigPanels();

        document.querySelectorAll('input[name="admin-hub-panel"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (!radio.checked) return;
                var adminTab = radio.id.replace('admin-hub-radio-', '');
                if (adminTab === 'audit' || adminTab === 'overview') return;
                if (ADMIN_TO_MAIN[adminTab] && global.ServerSetup && ServerSetup.setMainTab) {
                    ServerSetup.setMainTab(ADMIN_TO_MAIN[adminTab], { fromAdminNav: true });
                }
                if (adminTab === 'devices') renderFleetTable();
            });
        });

        document.querySelectorAll('label[for^="admin-hub-radio-"]').forEach(function (label) {
            label.addEventListener('click', function (e) {
                var adminTab = (label.getAttribute('for') || '').replace('admin-hub-radio-', '');
                if (!adminTab || adminTab === 'audit' || adminTab === 'overview') return;
                if (!adminTabNeedsGate(adminTab)) return;
                e.preventDefault();
                withConfigGate(adminTab, function () {
                    selectAdminTab(adminTab, false);
                });
            });
        });

        ADVANCED_TABS.forEach(function (tab) {
            var btn = document.getElementById('admin-advanced-tab-' + tab);
            if (!btn) return;
            btn.addEventListener('click', function () {
                withConfigGate('advanced', function () {
                    selectAdminTab('advanced', true);
                    var open = function () {
                        setAdvancedSubPanel(tab);
                        if (global.ServerSetup && ServerSetup.setMainTab) {
                            ServerSetup.setMainTab(tab, { fromAdminNav: true });
                        }
                    };
                    if (tab === 'diagnostics' || tab === 'lab') {
                        if (global.ServerSetup && ServerSetup.runWithTechAccess) {
                            ServerSetup.runWithTechAccess(open);
                        } else if (global.TechDiagnostics && TechDiagnostics.requireTech) {
                            TechDiagnostics.requireTech(open);
                        } else {
                            open();
                        }
                    } else {
                        open();
                    }
                });
            });
        });

        var refreshBtn = document.getElementById('admin-fleet-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                refreshHealth();
            });
        }

        var auditOpen = document.getElementById('admin-audit-open-trail');
        if (auditOpen) {
            auditOpen.addEventListener('click', function () {
                if (global.EvidenceManager && EvidenceManager.showTab) {
                    EvidenceManager.showTab('audit-trail');
                }
            });
        }
    }

    function init() {
        bindUi();
        bindSocket();
    }

    function onShow() {
        mountConfigPanels();
        if (global.ServerSetup && ServerSetup.reenableEmbeddedControls) {
            ServerSetup.reenableEmbeddedControls();
        }
        bindSocket();
        selectDefaultTab();
        updateManageSectionsVisibility();
        syncAdvancedTabVisibility();
        if (global.BwcDevices && BwcDevices.load) {
            BwcDevices.load().then(function () {
                refreshHealth();
            }).catch(function () {
                refreshHealth();
            });
        } else {
            refreshHealth();
        }
        startPoll();
    }

    global.AdminHub = {
        init: init,
        onShow: onShow,
        refresh: refreshHealth,
        onConfigOpen: onConfigOpen,
        selectAdminTab: selectAdminTab,
        adminTabFromMain: adminTabFromMain,
        setAdvancedSubPanel: setAdvancedSubPanel,
        syncAdvancedTabVisibility: syncAdvancedTabVisibility,
        updateManageSectionsVisibility: updateManageSectionsVisibility,
        mountConfigPanels: mountConfigPanels,
    };
})(window);
