/**
 * Server Config — deployment, LAN/WAN network, SIP/ONVIF, users.
 */
(function (global) {
    let lastDeploymentMode = 'lan';

    const MODE_LABEL_FALLBACKS = {
        'server.mode.lab': 'Lab',
        'server.mode.lan': 'LAN server',
        'server.mode.cloud': 'Cloud / VPS',
        'server.mode.hybrid': 'Hybrid (cloud ops + site LAN)',
    };

    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) {
            const s = I18n.t(key, params);
            if (s !== key) return s;
        }
        if (MODE_LABEL_FALLBACKS[key]) return MODE_LABEL_FALLBACKS[key];
        return key;
    }

    function opMsg(data, err, fallbackKey) {
        if (global.OperatorUI) return OperatorUI.opMsg(data, err, fallbackKey);
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data, fallbackKey);
        return tr(fallbackKey || 'errors.generic');
    }

    function throwOpErr(data) {
        throw global.OperatorErrorVoice
            ? OperatorErrorVoice.attach(new Error('op'), data)
            : new Error(opMsg(data));
    }

    function isUsernameExistsPayload(payload) {
        if (!payload) return false;
        if (payload.errorKey === 'errors.userExists') return true;
        return /already exists/i.test(String(payload.error || ''));
    }

    let activeProtocol = 'sip';
    let lastBwcDeviceSummary = null;
    let canManageServer = false;
    let canManageUsers = false;
    let lastRuntime = null;
    let lastSiteTimezones = [];
    let lastSiteTimePreview = '';
    let bwcRegisterManual = false;
    let activeMainTab = 'server';
    let activeDashSubTab = 'operators';
    let layoutOverride = null;
    const TAB_LAYOUT = {
        server: 'compact',
        groups: 'wide',
        firmware: 'wide',
        diagnostics: 'wide',
        lab: 'wide',
        dashboard: 'admin',
        bwc: 'admin',
        cloud: 'admin',
        usb: 'admin',
    };
    const ADVANCED_TABS = ['firmware', 'usb', 'cloud', 'diagnostics', 'lab'];
    const PRIMARY_TABS = ['server', 'bwc', 'groups', 'dashboard'];
    const NETWORK_SECTION_IDS = [
        'ss-section-deployment',
        'ss-section-resilience',
        'ss-section-lan',
        'ss-section-wan',
        'ss-section-operator',
        'ss-section-site-time',
        'ss-section-dock-link',
        'ss-section-bwc-register',
        'ss-section-protocol',
    ];
    let networkSectionScrollBound = false;
    let cachedDispatchGroups = [];
    let dockFolderPath = '';
    let resetPwdUserId = null;
    let uiBound = false;
    let creatingUser = false;
    let cachedSettingsData = null;
    let loadInFlight = null;
    const tabExtrasLoaded = Object.create(null);

    function isConfigUnlocked() {
        return global.AuthReverify && AuthReverify.isValid && AuthReverify.isValid();
    }

    const SETTINGS_MODAL_IDS = [
        'ss-gate-backdrop',
        'ss-reset-pwd-backdrop',
        'ss-tech-gate-backdrop',
        'ss-tech-provision-backdrop',
    ];
    let settingsNavLockUntil = 0;
    let techAccessInFlight = false;

    function isSettingsModalVisible() {
        return SETTINGS_MODAL_IDS.some(function (id) {
            const el = document.getElementById(id);
            return el && !el.hidden;
        });
    }

    function trySettingsNavLock() {
        const now = Date.now();
        if (now < settingsNavLockUntil) return false;
        if (isSettingsModalVisible()) return false;
        settingsNavLockUntil = now + 600;
        return true;
    }

    function releaseAllSettingsOverlays() {
        if (global.AuthReverify && AuthReverify.dismissGate) AuthReverify.dismissGate();
        const resetBd = document.getElementById('ss-reset-pwd-backdrop');
        if (resetBd) {
            resetBd.hidden = true;
            setModalA11y('ss-reset-pwd-backdrop', false);
        }
        if (global.TechDiagnostics && TechDiagnostics.dismissTechGate) {
            TechDiagnostics.dismissTechGate({});
        }
        dismissTechProvision({});
    }

    function setDiagnosticsFlowHints(active, phase) {
        const dashHint = document.getElementById('ss-gate-diagnostics-hint');
        const techHint = document.getElementById('ss-tech-gate-step-hint');
        if (dashHint) dashHint.hidden = !(active && phase === 'dashboard');
        if (techHint) techHint.hidden = !(active && phase === 'tech');
    }

    function showGate(onSuccess, onCancel) {
        if (global.AuthReverify && AuthReverify.isPromptOpen && AuthReverify.isPromptOpen()) {
            if (global.AdminActionBus) AdminActionBus.focusOpenGate();
            return;
        }
        if (global.AuthReverify && AuthReverify.promptModal) {
            AuthReverify.promptModal()
                .then(function () { if (onSuccess) onSuccess(); })
                .catch(function () {
                    setDiagnosticsFlowHints(false);
                    if (onCancel) onCancel();
                    else if (global.AdminActionBus && AdminActionBus.isBusy()) AdminActionBus.end();
                });
            return;
        }
        if (onSuccess) onSuccess();
    }

    function setModalA11y(backdropId, show) {
        const backdrop = document.getElementById(backdropId);
        if (!backdrop) return;
        if ('inert' in backdrop) backdrop.inert = !show;
        backdrop.setAttribute('aria-hidden', show ? 'false' : 'true');
        backdrop.querySelectorAll('input[type="password"], input[data-field="password"]').forEach((inp) => {
            inp.tabIndex = show ? 0 : -1;
            inp.disabled = !show;
        });
    }

    function openResetPwdDialog(userId) {
        resetPwdUserId = userId;
        const backdrop = document.getElementById('ss-reset-pwd-backdrop');
        const newEl = document.getElementById('ss-reset-new-pass');
        const adminEl = document.getElementById('ss-reset-admin-pass');
        const errEl = document.getElementById('ss-reset-pwd-error');
        if (!backdrop || !newEl || !adminEl) return;
        newEl.value = '';
        adminEl.value = '';
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        backdrop.hidden = false;
        setModalA11y('ss-reset-pwd-backdrop', true);
        setTimeout(function () { newEl.focus(); }, 50);
    }

    function closeResetPwdDialog() {
        resetPwdUserId = null;
        const backdrop = document.getElementById('ss-reset-pwd-backdrop');
        if (backdrop) {
            backdrop.hidden = true;
            setModalA11y('ss-reset-pwd-backdrop', false);
        }
    }

    const DEPLOYMENT_HINT_KEYS = {
        lab: 'server.deploymentHint.lab',
        lan: 'server.deploymentHint.lan',
        cloud: 'server.deploymentHint.cloud',
        hybrid: 'server.deploymentHint.hybrid',
    };

    const MODE_LABEL_KEYS = {
        lab: 'server.mode.lab',
        lan: 'server.mode.lan',
        cloud: 'server.mode.cloud',
        hybrid: 'server.mode.hybrid',
    };

    function clearNewOperatorForm() {
        const u = document.getElementById('ss-new-user');
        const p = document.getElementById('ss-new-pass');
        const a = document.getElementById('ss-new-admin-pass');
        if (u) u.value = '';
        if (p) p.value = '';
        if (a) a.value = '';
    }

    function isAdvancedTab(tab) {
        return ADVANCED_TABS.indexOf(tab) >= 0;
    }

    function updateMaintenanceNavVisibility() {
        let any = false;
        ADVANCED_TABS.forEach(function (id) {
            const btn = document.getElementById('ss-main-tab-' + id);
            if (btn && !btn.hidden) any = true;
        });
        const maint = document.getElementById('ss-config-nav-maint');
        if (maint) maint.hidden = !any;
        return any;
    }

    function syncSidebarNav() {
        PRIMARY_TABS.concat(ADVANCED_TABS).forEach(function (id) {
            const btn = document.getElementById('ss-main-tab-' + id);
            if (btn) btn.classList.toggle('active', id === activeMainTab);
        });
    }

    function syncAdvancedNav() {
        updateMaintenanceNavVisibility();
        syncSidebarNav();
    }

    function defaultLayoutForTab(tab) {
        return TAB_LAYOUT[tab] || 'compact';
    }

    function maxLayoutForTab(tab) {
        return tab === 'server' ? 'wide' : 'admin';
    }

    function resolvePanelLayout(tab) {
        const def = defaultLayoutForTab(tab);
        if (layoutOverride === 'max') return maxLayoutForTab(tab);
        return def;
    }

    function applyPanelLayout(tab) {
        tab = tab || activeMainTab;
        const panel = document.getElementById('server-setup-panel');
        if (!panel) return;
        const mode = resolvePanelLayout(tab);
        panel.classList.remove('ss-layout-compact', 'ss-layout-wide', 'ss-layout-admin');
        panel.classList.add('ss-layout-' + mode);
        const globalHint = document.getElementById('ss-global-setup-hint');
        if (globalHint) globalHint.hidden = tab !== 'server';
    }

    function togglePanelLayout() {
        const tab = activeMainTab;
        const def = defaultLayoutForTab(tab);
        const current = resolvePanelLayout(tab);
        if (current === def) {
            layoutOverride = 'max';
        } else {
            layoutOverride = null;
        }
        try {
            sessionStorage.setItem('ss_layout_override', layoutOverride || '');
        } catch (_) { /* ignore */ }
        applyPanelLayout(tab);
    }

    function loadLayoutPref() {
        try {
            const v = sessionStorage.getItem('ss_layout_override');
            layoutOverride = v === 'max' ? 'max' : null;
        } catch (_) {
            layoutOverride = null;
        }
    }

    function setMainTab(tab) {
        activeMainTab = (tab === 'bwc' || tab === 'dashboard' || tab === 'groups' || isAdvancedTab(tab)) ? tab : 'server';
        ['server', 'bwc', 'groups', 'firmware', 'dashboard', 'usb', 'diagnostics', 'lab', 'cloud'].forEach(function (id) {
            const panel = document.getElementById('ss-panel-' + id);
            if (panel) panel.classList.toggle('active', id === activeMainTab);
        });
        syncSidebarNav();
        if (activeMainTab === 'dashboard') {
            clearNewOperatorForm();
            applyDashboardAuthLayout();
            if (global.VoiceAlerts && VoiceAlerts.loadPolicy) {
                VoiceAlerts.loadPolicy();
            }
        }
        if (activeMainTab === 'groups' && global.DispatchGroupsAdmin && DispatchGroupsAdmin.load) {
            DispatchGroupsAdmin.load().catch(function () { /* ignore */ });
        }
        if (activeMainTab === 'firmware' && global.FirmwareOtaAdmin && FirmwareOtaAdmin.load) {
            FirmwareOtaAdmin.load().catch(function () { /* ignore */ });
        }
        if (activeMainTab === 'diagnostics' && global.TechDiagnostics && TechDiagnostics.onTabShown) {
            TechDiagnostics.onTabShown();
        }
        if (activeMainTab === 'lab' && global.LabSecurity && LabSecurity.onTabShown) {
            LabSecurity.onTabShown();
        }
        if (activeMainTab === 'cloud' && global.CloudDeployment && CloudDeployment.onTabShown) {
            CloudDeployment.onTabShown();
        }
        if (activeMainTab === 'usb' && global.UsbMaintenance && UsbMaintenance.onTabShown) {
            UsbMaintenance.onTabShown();
        } else if (global.UsbMaintenance && UsbMaintenance.onTabHidden) {
            UsbMaintenance.onTabHidden();
        }
        applyPanelLayout(activeMainTab);
        if (activeMainTab === 'server') {
            setActiveNetworkSectionNav('ss-section-deployment');
        }
        const saveServer = document.getElementById('server-setup-save');
        const saveBwc = document.getElementById('ss-save-bwc-list');
        if (saveServer) saveServer.hidden = activeMainTab !== 'server';
        const saveCloud = document.getElementById('cd-save');
        if (saveCloud) saveCloud.hidden = activeMainTab !== 'cloud';
        if (saveBwc) saveBwc.hidden = activeMainTab !== 'bwc' || !canManageServer;
        const ftpPathInput = document.getElementById('ss-ftp-upload-path');
        if (ftpPathInput) ftpPathInput.disabled = !canManageServer;
        if (activeMainTab === 'bwc' && global.BwcDevices && BwcDevices.buildEmbeddedTable) {
            if (global.BwcDevices.refreshGroupOptions) {
                global.BwcDevices.refreshGroupOptions().then(function () {
                    BwcDevices.buildEmbeddedTable();
                }).catch(function () { BwcDevices.buildEmbeddedTable(); });
            } else {
                BwcDevices.buildEmbeddedTable();
            }
        }
        const workspace = document.getElementById('server-config-workspace');
        if (workspace && !workspace.hidden) {
            loadTabExtras(activeMainTab).catch(function () { /* ignore */ });
        }
    }

    function fillDockPanel() {
        const hostEl = document.getElementById('display-server-host');
        const hostFromSidebar = hostEl && hostEl.textContent && hostEl.textContent !== '—' ? hostEl.textContent : '';
        const settings = readForm();
        const host = hostFromSidebar || settings.publicHost || '—';
        if (document.getElementById('ss-ftp-host') && host !== '—') {
            document.getElementById('ss-ftp-host').value = host;
        }
        const folderEl = document.getElementById('ss-dock-folder');
        if (folderEl) folderEl.textContent = dockFolderPath || 'storage/ftp-uploads';
    }

    async function loadDockFolder() {
        try {
            const res = await fetch('/api/storage');
            const data = await res.json();
            dockFolderPath = data.ftpLabel || data.ftp || '';
        } catch (_) {
            dockFolderPath = '';
        }
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function setProtocolTab(protocol) {
        activeProtocol = protocol === 'onvif' ? 'onvif' : 'sip';
        document.getElementById('ss-tab-sip').classList.toggle('active', activeProtocol === 'sip');
        document.getElementById('ss-tab-onvif').classList.toggle('active', activeProtocol === 'onvif');
        document.getElementById('ss-panel-sip').classList.toggle('active', activeProtocol === 'sip');
        document.getElementById('ss-panel-onvif').classList.toggle('active', activeProtocol === 'onvif');
        fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
    }

    function passwordChecklistLabel(bwc) {
        if (!bwc) return '—';
        if (bwc.passwordStatus === 'configured') return tr('server.secrets.configured');
        if (bwc.passwordStatus === 'pending') return tr('server.secrets.pendingSave');
        if (bwc.passwordStatus === 'missing') return tr('server.secrets.notSet');
        return tr('server.secrets.notSet');
    }

    function buildPreviewChecklist() {
        const body = readForm();
        const host = body.publicHost;
        const sipPassEl = document.getElementById('ss-password');
        const onvifPassEl = document.getElementById('ss-onvif-pass');
        const sipPassPending = !!(sipPassEl && sipPassEl.value);
        const onvifPassPending = !!(onvifPassEl && onvifPassEl.value);
        if (activeProtocol === 'onvif') {
            return {
                protocol: 'ONVIF / RTSP',
                serverHost: host,
                port: String(body.onvif.port),
                user: body.onvif.user,
                passwordStatus: onvifPassPending ? 'pending'
                    : ((onvifPassEl && onvifPassEl.dataset.configured === '1') ? 'configured' : 'missing'),
                path: body.onvif.devicePath,
                rtspUrl: body.onvif.rtspUrl || tr('server.preview.rtspUnset'),
                rtspTransport: body.onvif.rtspTransport,
            };
        }
        return {
            protocol: 'SIP',
            sipServer: host,
            sipPort: String(body.sip.sipPort),
            serverId: body.sip.platformId,
            realm: body.sip.realm,
            passwordStatus: sipPassPending ? 'pending'
                : ((sipPassEl && sipPassEl.dataset.configured === '1') ? 'configured' : 'missing'),
            messageServer: 'ws://' + host + ':' + body.sip.msgWsPort,
            mediaTransport: body.sip.mediaTransport,
        };
    }

    function fillBwcChecklist(bwc, deviceSummary) {
        const dl = document.getElementById('server-setup-bwc');
        if (!dl || !bwc) return;
        let html = '<dt style="margin-top:0">' + tr('server.checklist.protocol') + '</dt><dd>' + esc(bwc.protocol) + '</dd>';
        if (bwc.protocol && bwc.protocol.indexOf('ONVIF') >= 0) {
            html += '<dt>' + tr('server.checklist.host') + '</dt><dd>' + esc(bwc.serverHost) + '</dd>';
            html += '<dt>' + tr('server.checklist.port') + '</dt><dd>' + esc(bwc.port) + '</dd>';
            html += '<dt>' + tr('server.checklist.user') + '</dt><dd>' + esc(bwc.user) + '</dd>';
            html += '<dt>' + tr('server.checklist.password') + '</dt><dd>' + esc(passwordChecklistLabel(bwc)) + '</dd>';
            html += '<dt>' + tr('server.checklist.path') + '</dt><dd>' + esc(bwc.path) + '</dd>';
            html += '<dt>' + tr('server.checklist.rtspUrl') + '</dt><dd>' + esc(bwc.rtspUrl) + '</dd>';
            html += '<dt>' + tr('server.checklist.rtspTransport') + '</dt><dd>' + esc(bwc.rtspTransport) + '</dd>';
        } else {
            html += '<dt>' + tr('server.checklist.sipServer') + '</dt><dd>' + esc(bwc.sipServer) + '</dd>';
            html += '<dt>' + tr('server.checklist.sipPort') + '</dt><dd>' + esc(bwc.sipPort) + '</dd>';
            html += '<dt>' + tr('server.checklist.serverId') + '</dt><dd>' + esc(bwc.serverId) + '</dd>';
            html += '<dt>' + tr('server.checklist.realm') + '</dt><dd>' + esc(bwc.realm) + '</dd>';
            html += '<dt>' + tr('server.checklist.password') + '</dt><dd>' + esc(passwordChecklistLabel(bwc)) + '</dd>';
            html += '<dt>' + tr('server.checklist.messageServer') + '</dt><dd>' + esc(bwc.messageServer) + '</dd>';
            html += '<dt>' + tr('server.checklist.media') + '</dt><dd>' + esc(bwc.mediaTransport) + '</dd>';
        }
        if (deviceSummary && deviceSummary.count) {
            html += '<dt style="margin-top:8px">' + tr('server.checklist.yourBwcs') + '</dt><dd>' + tr('server.checklist.deviceCount', { n: deviceSummary.count }) + '</dd>';
            (deviceSummary.devices || []).slice(0, 6).forEach((d) => {
                const line = (d.operatorName ? esc(d.operatorName) : esc(tr('fleet.bwcShort', { suffix: String(d.deviceId).slice(-4) })))
                    + (d.mapGroup ? ' <span style="color:#94a3b8">(' + esc(d.mapGroup) + ')</span>' : '');
                html += '<dt></dt><dd style="font-size:11px">' + line + '</dd>';
            });
            if (deviceSummary.count > 6) {
                html += '<dt></dt><dd style="color:#64748b;font-size:10px">' + tr('server.checklist.more', { n: deviceSummary.count - 6 }) + '</dd>';
            }
        } else {
            html += '<dt style="margin-top:8px">' + tr('server.checklist.yourBwcs') + '</dt><dd style="color:#64748b">' + tr('server.checklist.none') + '</dd>';
        }
        dl.innerHTML = html;
    }

    function applyReadOnlyMode() {
        const panel = document.getElementById('server-setup-panel');
        const banner = document.getElementById('ss-readonly-banner');
        const saveBtn = document.getElementById('server-setup-save');
        if (panel) panel.dataset.ssReadonly = canManageServer ? '0' : '1';
        if (banner) banner.hidden = canManageServer;
        if (saveBtn) saveBtn.hidden = !canManageServer;
        const saveResilience = document.getElementById('ss-save-resilience');
        if (saveResilience) saveResilience.hidden = !canManageServer;
        const resNode = document.getElementById('ss-resilience-node-id');
        const resPeer = document.getElementById('ss-resilience-peer-url');
        if (resNode) resNode.disabled = !canManageServer;
        if (resPeer) resPeer.disabled = !canManageServer;
        const siteTzEl = document.getElementById('ss-site-timezone');
        if (siteTzEl) siteTzEl.disabled = !canManageServer;
        const ftpPathInput = document.getElementById('ss-ftp-upload-path');
        if (ftpPathInput) ftpPathInput.disabled = !canManageServer;
        const saveBwc = document.getElementById('ss-save-bwc-list');
        if (saveBwc) saveBwc.hidden = activeMainTab !== 'bwc' || !canManageServer;
        const tabFirmware = document.getElementById('ss-main-tab-firmware');
        if (tabFirmware) tabFirmware.hidden = !canManageServer;
        const tabCloud = document.getElementById('ss-main-tab-cloud');
        if (tabCloud) tabCloud.hidden = !canManageServer;
        const tabUsb = document.getElementById('ss-main-tab-usb');
        if (tabUsb) tabUsb.hidden = !canManageServer;
        if (!canManageServer && (activeMainTab === 'firmware' || activeMainTab === 'cloud' || activeMainTab === 'usb')) {
            activeMainTab = 'server';
        }
        updateMaintenanceNavVisibility();
        if (isAdvancedTab(activeMainTab)) {
            const btn = document.getElementById('ss-main-tab-' + activeMainTab);
            if (!btn || btn.hidden) activeMainTab = 'server';
        }
        syncSidebarNav();
        applyDashboardAuthLayout();
    }

    function setDashSubTab(tab) {
        if (!canManageUsers) return;
        activeDashSubTab = tab === 'me' ? 'me' : 'operators';
        ['operators', 'me'].forEach(function (id) {
            const btn = document.getElementById('ss-dash-sub-' + id);
            if (btn) btn.classList.toggle('active', id === activeDashSubTab);
        });
        applyDashboardAuthLayout();
        if (activeDashSubTab === 'me') loadMyAccount().catch(function () { /* ignore */ });
    }

    function applyDashboardAuthLayout() {
        const onDash = activeMainTab === 'dashboard';
        const subtabs = document.getElementById('ss-dash-subtabs');
        const usersSection = document.getElementById('ss-users-section');
        const mySection = document.getElementById('ss-my-account-section');
        const voiceSection = document.getElementById('ss-voice-alerts-section');
        const smtpSection = document.getElementById('ss-smtp-section');
        if (smtpSection) smtpSection.hidden = !onDash || !canManageServer;
        if (voiceSection) voiceSection.hidden = !onDash || !canManageServer;
        if (onDash && canManageServer && global.PlatformSmtp && global.PlatformSmtp.load) {
            global.PlatformSmtp.load().catch(function () { /* ignore */ });
        }
        if (canManageUsers) {
            if (subtabs) subtabs.hidden = !onDash;
            if (usersSection) usersSection.hidden = !onDash || activeDashSubTab !== 'operators';
            if (mySection) mySection.hidden = !onDash || activeDashSubTab !== 'me';
        } else {
            if (subtabs) subtabs.hidden = true;
            if (usersSection) usersSection.hidden = true;
            if (mySection) mySection.hidden = !onDash;
        }
    }

    function permYesNo(val) {
        return val ? tr('common.yes') : tr('common.no');
    }

    function permDate(val) {
        return val ? String(val).slice(0, 10) : '—';
    }

    async function loadMyAccount() {
        const res = await fetch('/api/users/me');
        const data = await res.json();
        if (!res.ok || !data.ok || !data.user) return;
        const u = data.user;
        const p = u.permissions || {};
        const el = document.getElementById('ss-my-account-info');
        if (!el) return;
        const roleLabel = u.role === 'super_admin' ? tr('role.superAdmin') : tr('role.operator');
        el.innerHTML = '<dt>' + tr('server.users.colUser') + '</dt><dd>' + esc(u.username) + '</dd>'
            + '<dt>User ID</dt><dd><code>' + esc(u.id) + '</code></dd>'
            + '<dt>' + tr('server.users.colRole') + '</dt><dd>' + roleLabel + '</dd>'
            + '<dt>' + tr('server.users.colSignInFrom') + '</dt><dd>' + permDate(p.signInStartsAt) + '</dd>'
            + '<dt>' + tr('server.users.colSignInExpiry') + '</dt><dd>' + permDate(p.signInExpiresAt) + '</dd>'
            + '<dt>' + tr('server.users.colRemoteControl') + '</dt><dd>' + permYesNo(p.mapDeviceControl) + '</dd>'
            + '<dt>' + tr('server.users.colKillSwitch') + '</dt><dd>' + permYesNo(p.deviceKillSwitch) + '</dd>'
            + '<dt>' + tr('server.users.colGeofence') + '</dt><dd>' + permYesNo(p.geofenceControl) + '</dd>'
            + '<dt>' + tr('server.users.colClearMapPins') + '</dt><dd>' + permYesNo(p.clearMapPins) + '</dd>'
            + '<dt>' + tr('server.users.colEvidenceView') + '</dt><dd>' + permYesNo(p.evidenceView || p.evidenceDownload) + '</dd>'
            + '<dt>' + tr('server.users.colEvidence') + '</dt><dd>' + permYesNo(p.evidenceDownload) + '</dd>'
            + '<dt>' + tr('server.users.colEvidenceExport') + '</dt><dd>' + permYesNo(p.evidenceExport) + '</dd>'
            + '<dt>' + tr('server.users.colEvidenceEdit') + '</dt><dd>' + permYesNo(p.evidenceEdit) + '</dd>'
            + '<dt>' + tr('server.users.colDockAdmin') + '</dt><dd>' + permYesNo(p.dockAdmin) + '</dd>'
            + '<dt>' + tr('server.users.colConferenceView') + '</dt><dd>' + permYesNo(p.conferenceView || p.conferenceJoin) + '</dd>'
            + '<dt>' + tr('server.users.colConferenceJoin') + '</dt><dd>' + permYesNo(p.conferenceJoin) + '</dd>'
            + '<dt>' + tr('server.users.colConferenceHost') + '</dt><dd>' + permYesNo(p.conferenceHost) + '</dd>'
            + '<dt>' + tr('server.users.colConferenceRecord') + '</dt><dd>' + permYesNo(p.conferenceRecord) + '</dd>'
            + '<dt>' + tr('server.users.colAuditView') + '</dt><dd>' + permYesNo(p.auditView || p.auditExport) + '</dd>'
            + '<dt>' + tr('server.users.colAuditExport') + '</dt><dd>' + permYesNo(p.auditExport) + '</dd>'
            + '<dt>' + tr('server.users.colExpiry') + '</dt><dd>' + permDate(p.evidenceDownloadExpiresAt) + '</dd>';
        renderRecoveryEmailMyAccount(u);
    }

    function renderRecoveryEmailMyAccount(u) {
        const statusEl = document.getElementById('ss-recovery-email-status');
        const inputEl = document.getElementById('ss-recovery-email-input');
        const resendBtn = document.getElementById('ss-recovery-email-resend');
        const msgEl = document.getElementById('ss-recovery-email-msg');
        if (!statusEl) return;
        if (msgEl) msgEl.textContent = '';
        const email = u.recoveryEmail || '';
        if (u.recoveryEmailVerified) {
            statusEl.textContent = tr('recoveryEmail.verifiedStatus', { email: email });
            if (resendBtn) resendBtn.hidden = true;
        } else if (u.recoveryEmailPending && email) {
            statusEl.textContent = tr('recoveryEmail.pendingStatus', { email: email });
            if (resendBtn) resendBtn.hidden = false;
        } else {
            statusEl.textContent = tr('recoveryEmail.notSet');
            if (resendBtn) resendBtn.hidden = true;
        }
        if (inputEl && email) inputEl.value = email;
    }

    async function sendRecoveryEmailFromSettings(isResend) {
        const msgEl = document.getElementById('ss-recovery-email-msg');
        const inputEl = document.getElementById('ss-recovery-email-input');
        const email = inputEl ? inputEl.value.trim() : '';
        const url = isResend ? '/api/auth/recovery-email/resend' : '/api/auth/recovery-email/request';
        const body = isResend ? '{}' : JSON.stringify({ email: email });
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOpErr(data);
        if (msgEl) {
            msgEl.textContent = isResend
                ? tr('recoveryEmail.resent', { email: data.recoveryEmail || email })
                : tr('recoveryEmail.sent', { email: data.recoveryEmail || email });
        }
        const resendBtn = document.getElementById('ss-recovery-email-resend');
        if (resendBtn) resendBtn.hidden = false;
        await loadMyAccount();
    }

    async function refreshDeviceSummary() {
        const el = document.getElementById('ss-device-summary');
        if (!el) return;
        try {
            if (global.BwcDevices && BwcDevices.load) await BwcDevices.load();
            const all = global.BwcDevices && BwcDevices.deviceCount ? BwcDevices.deviceCount() : 0;
            if (global.VideoConfig && VideoConfig.load) await VideoConfig.load();
            const wall = global.VideoConfig && VideoConfig.configuredDeviceCount
                ? VideoConfig.configuredDeviceCount()
                : 0;
            el.textContent = all
                ? ('Device Summary · ' + all + ' registered · ' + wall + ' on video wall')
                : 'Device Summary · no devices registered';
        } catch (_) {
            el.textContent = 'Device Summary';
        }
    }

    function updateDeploymentHint(mode) {
        const el = document.getElementById('ss-deployment-hint');
        if (!el) return;
        el.textContent = tr(DEPLOYMENT_HINT_KEYS[mode] || DEPLOYMENT_HINT_KEYS.lan);
    }

    function updateDeploymentSections(mode) {
        const lan = document.getElementById('ss-section-lan');
        const wan = document.getElementById('ss-section-wan');
        if (lan) lan.hidden = mode === 'cloud';
        if (wan) wan.hidden = mode === 'lab';
        updateNetworkSectionNav();
    }

    function setActiveNetworkSectionNav(sectionId) {
        document.querySelectorAll('#ss-network-section-nav [data-ss-section]').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-ss-section') === sectionId);
        });
    }

    function updateNetworkSectionNav() {
        const nav = document.getElementById('ss-network-section-nav');
        if (!nav) return;
        nav.querySelectorAll('[data-ss-section]').forEach(function (btn) {
            const targetId = btn.getAttribute('data-ss-section');
            const section = document.getElementById(targetId);
            btn.hidden = !!(section && section.hidden);
        });
    }

    function scrollToNetworkSection(sectionId) {
        const scrollEl = document.getElementById('ss-panel-scroll');
        const section = document.getElementById(sectionId);
        if (!scrollEl || !section || section.hidden) return;
        const scrollRect = scrollEl.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const top = sectionRect.top - scrollRect.top + scrollEl.scrollTop - 44;
        scrollEl.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        setActiveNetworkSectionNav(sectionId);
    }

    function syncNetworkSectionNavHighlight() {
        if (activeMainTab !== 'server') return;
        const scrollEl = document.getElementById('ss-panel-scroll');
        if (!scrollEl) return;
        const marker = scrollEl.getBoundingClientRect().top + 56;
        let current = NETWORK_SECTION_IDS[0];
        NETWORK_SECTION_IDS.forEach(function (id) {
            const section = document.getElementById(id);
            if (!section || section.hidden) return;
            if (section.getBoundingClientRect().top <= marker) current = id;
        });
        setActiveNetworkSectionNav(current);
    }

    function bindNetworkSectionNav() {
        const nav = document.getElementById('ss-network-section-nav');
        if (!nav || nav._ssBound) return;
        nav._ssBound = true;
        nav.querySelectorAll('[data-ss-section]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                scrollToNetworkSection(btn.getAttribute('data-ss-section'));
            });
        });
        const scrollEl = document.getElementById('ss-panel-scroll');
        if (scrollEl && !networkSectionScrollBound) {
            networkSectionScrollBound = true;
            scrollEl.addEventListener('scroll', function () {
                if (activeMainTab === 'server') syncNetworkSectionNavHighlight();
            }, { passive: true });
        }
    }

    function updateSidebarDeployment(mode) {
        if (mode) lastDeploymentMode = mode;
        const el = document.getElementById('display-deployment-mode');
        if (!el) return;
        el.textContent = tr(MODE_LABEL_KEYS[lastDeploymentMode] || MODE_LABEL_KEYS.lan);
    }

    function suggestedOperatorUrl(host) {
        const port = (lastRuntime && lastRuntime.httpPort) || 3888;
        const h = host || document.getElementById('ss-lan-server-ip').value.trim()
            || document.getElementById('ss-public-host').value.trim();
        if (!h) return '';
        return 'http://' + h + ':' + port;
    }

    function deriveNetworkAccess(mode) {
        if (mode === 'cloud') return 'cloud-fixed';
        if (mode === 'hybrid') return 'vpn';
        return 'lan-static';
    }

    function syncBwcRegisterFromNetwork(force) {
        if (bwcRegisterManual && !force) return;
        const mode = document.getElementById('ss-deployment-mode').value;
        const lanIp = document.getElementById('ss-lan-server-ip').value.trim();
        const wanIp = document.getElementById('ss-wan-public-ip').value.trim();
        const vpn = document.getElementById('ss-wan-vpn').value.trim();
        let next = '';
        if (mode === 'cloud') next = wanIp || lanIp;
        else if (mode === 'hybrid') next = vpn || wanIp || lanIp;
        else next = lanIp;
        if (!next) return;
        document.getElementById('ss-public-host').value = next;
    }

    function maybeSuggestOperatorUrl() {
        const mode = document.getElementById('ss-deployment-mode').value;
        if (mode === 'cloud' || mode === 'hybrid') return;
        const urlEl = document.getElementById('ss-operator-url');
        const suggested = suggestedOperatorUrl();
        if (!suggested) return;
        if (!urlEl.value.trim() || urlEl.dataset.auto === '1') {
            urlEl.value = suggested;
            urlEl.dataset.auto = '1';
        }
    }

    function applyNetworkForm(network, publicHost) {
        const net = network || {};
        const lan = net.lan || {};
        const wan = net.wan || {};
        document.getElementById('ss-lan-ip-mode').value = lan.ipMode === 'dhcp' ? 'dhcp' : 'static';
        document.getElementById('ss-lan-server-ip').value = lan.serverIp || publicHost || '';
        document.getElementById('ss-lan-subnet').value = lan.subnetMask || '255.255.255.0';
        document.getElementById('ss-lan-gateway').value = lan.gateway || '';
        document.getElementById('ss-lan-dns1').value = lan.dns1 || '';
        document.getElementById('ss-lan-dns2').value = lan.dns2 || '';
        document.getElementById('ss-lan-hostname').value = lan.hostname || '';
        document.getElementById('ss-wan-public-ip').value = wan.publicIp || '';
        document.getElementById('ss-wan-ddns').value = wan.ddnsHostname || '';
        document.getElementById('ss-wan-vpn').value = wan.vpnEndpoint || '';
        document.getElementById('ss-wan-router').value = wan.routerGateway || '';
    }

    function readNetworkForm() {
        return {
            lan: {
                ipMode: document.getElementById('ss-lan-ip-mode').value === 'dhcp' ? 'dhcp' : 'static',
                serverIp: document.getElementById('ss-lan-server-ip').value.trim(),
                subnetMask: document.getElementById('ss-lan-subnet').value.trim() || '255.255.255.0',
                gateway: document.getElementById('ss-lan-gateway').value.trim(),
                dns1: document.getElementById('ss-lan-dns1').value.trim(),
                dns2: document.getElementById('ss-lan-dns2').value.trim(),
                hostname: document.getElementById('ss-lan-hostname').value.trim(),
            },
            wan: {
                publicIp: document.getElementById('ss-wan-public-ip').value.trim(),
                ddnsHostname: document.getElementById('ss-wan-ddns').value.trim(),
                vpnEndpoint: document.getElementById('ss-wan-vpn').value.trim(),
                routerGateway: document.getElementById('ss-wan-router').value.trim(),
            },
        };
    }

    function resolvePublicHost(mode, network, explicit) {
        if (explicit) return explicit;
        const lan = network.lan || {};
        const wan = network.wan || {};
        if (mode === 'cloud') return wan.publicIp || lan.serverIp || '';
        if (mode === 'hybrid') return wan.vpnEndpoint || wan.publicIp || lan.serverIp || '';
        return lan.serverIp || wan.publicIp || '';
    }

    let siteTimePreviewTimer = null;

    function updateSiteTimePreview(preview) {
        const el = document.getElementById('ss-site-time-preview');
        if (!el) return;
        const tz = (document.getElementById('ss-site-timezone') || {}).value || 'Asia/Singapore';
        const sample = preview || lastSiteTimePreview || previewSiteTimeLocal();
        el.textContent = tr('server.siteTimezoneHint', { sample }) + ' · ' + tz;
    }

    function startSiteTimePreviewTick() {
        if (siteTimePreviewTimer) clearInterval(siteTimePreviewTimer);
        siteTimePreviewTimer = setInterval(function () {
            updateSiteTimePreview(previewSiteTimeLocal());
        }, 1000);
    }

    function previewSiteTimeLocal() {
        const el = document.getElementById('ss-site-timezone');
        const tz = (el && el.value) || 'Asia/Singapore';
        try {
            return new Intl.DateTimeFormat(undefined, {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(new Date());
        } catch (_) {
            return '—';
        }
    }

    function openEvidenceStorage() {
        setOpen(false);
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('evidence');
        }
        window.setTimeout(function () {
            const btn = document.getElementById('ev-nav-storage') || document.querySelector('.evidence-hub-nav-btn[data-panel="settings"]');
            if (btn) btn.click();
        }, 80);
    }

    function fillTimezoneSelect(selected, zones) {
        const el = document.getElementById('ss-site-timezone');
        if (!el) return;
        const list = zones && zones.length ? zones : lastSiteTimezones;
        el.innerHTML = '';
        list.forEach((z) => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = tr(z.labelKey) !== z.labelKey ? tr(z.labelKey) : z.id;
            el.appendChild(opt);
        });
        const tz = selected || (list[0] && list[0].id) || 'Asia/Singapore';
        if ([...el.options].some((o) => o.value === tz)) el.value = tz;
    }

    function applyForm(settings) {
        const s = settings || {};
        const dep = s.deployment || {};
        const sip = s.sip || {};
        const onvif = s.onvif || {};
        const mode = dep.mode || 'lan';
        document.getElementById('ss-deployment-mode').value = mode;
        updateDeploymentHint(mode);
        updateDeploymentSections(mode);
        document.getElementById('ss-tenant-name').value = dep.tenantName || '';
        const siteTz = (s.site && s.site.timezone) || 'Asia/Singapore';
        fillTimezoneSelect(siteTz, lastSiteTimezones);
        updateSiteTimePreview(lastSiteTimePreview);
        applyNetworkForm(s.network, s.publicHost);
        document.getElementById('ss-public-host').value = s.publicHost || '';
        bwcRegisterManual = false;
        const operatorUrlEl = document.getElementById('ss-operator-url');
        operatorUrlEl.value = dep.operatorUrl || '';
        operatorUrlEl.dataset.auto = operatorUrlEl.value && operatorUrlEl.value === suggestedOperatorUrl(s.publicHost) ? '1' : '0';
        document.getElementById('ss-bind-host').value = s.bindHost || '0.0.0.0';
        document.getElementById('ss-sip-port').value = sip.sipPort || 5060;
        document.getElementById('ss-platform-id').value = sip.platformId || '';
        document.getElementById('ss-realm').value = sip.realm || '';
        const sipPassEl = document.getElementById('ss-password');
        const sipAltEl = document.getElementById('ss-password-alt');
        const onvifPassEl = document.getElementById('ss-onvif-pass');
        if (sipPassEl) {
            sipPassEl.value = '';
            sipPassEl.dataset.configured = sip.passwordConfigured ? '1' : '0';
        }
        if (sipAltEl) {
            sipAltEl.value = '';
            sipAltEl.dataset.configured = sip.passwordAltConfigured ? '1' : '0';
        }
        if (onvifPassEl) {
            onvifPassEl.value = '';
            onvifPassEl.dataset.configured = onvif.passwordConfigured ? '1' : '0';
        }
        document.getElementById('ss-media-transport').value = sip.mediaTransport === 'tcp' ? 'tcp' : 'udp';
        document.getElementById('ss-onvif-port').value = onvif.port || 80;
        document.getElementById('ss-onvif-user').value = onvif.user || '';
        document.getElementById('ss-onvif-path').value = onvif.devicePath || '/onvif/device_service';
        document.getElementById('ss-rtsp-url').value = onvif.rtspUrl || '';
        document.getElementById('ss-rtsp-transport').value = onvif.rtspTransport === 'udp' ? 'udp' : 'tcp';
        const dock = s.docking || {};
        const ftpPathEl = document.getElementById('ss-ftp-upload-path');
        if (ftpPathEl) ftpPathEl.value = dock.ftpUploadPath || '';
        setProtocolTab(s.activeProtocol || 'sip');
        const hostEl = document.getElementById('display-server-host');
        if (hostEl) hostEl.textContent = s.publicHost || '—';
        const displayOperatorEl = document.getElementById('display-operator-url');
        if (displayOperatorEl) displayOperatorEl.textContent = dep.operatorUrl || s.publicHost || '—';
        updateSidebarDeployment(mode);
        const portEl = document.getElementById('ss-runtime-http-port');
        if (portEl && lastRuntime && lastRuntime.httpPort) portEl.textContent = String(lastRuntime.httpPort);
    }

    function readForm() {
        const mode = document.getElementById('ss-deployment-mode').value;
        const network = readNetworkForm();
        const explicit = document.getElementById('ss-public-host').value.trim();
        const publicHost = resolvePublicHost(mode, network, explicit);
        return {
            publicHost: publicHost,
            bindHost: document.getElementById('ss-bind-host').value.trim() || '0.0.0.0',
            network: network,
            deployment: {
                mode: mode,
                networkAccess: deriveNetworkAccess(mode),
                operatorUrl: document.getElementById('ss-operator-url').value.trim(),
                tenantName: document.getElementById('ss-tenant-name').value.trim(),
            },
            site: {
                timezone: (document.getElementById('ss-site-timezone') || {}).value || 'Asia/Singapore',
            },
            activeProtocol: activeProtocol,
            bwcRegistration: { operatorName: '', deviceId: '', userName: '', password: '' },
            sip: Object.assign({
                sipPort: parseInt(document.getElementById('ss-sip-port').value, 10) || 5060,
                platformId: document.getElementById('ss-platform-id').value.trim(),
                realm: document.getElementById('ss-realm').value.trim(),
                mediaTransport: document.getElementById('ss-media-transport').value,
                msgWsPort: 6000,
            }, (function () {
                const p = document.getElementById('ss-password').value;
                const a = document.getElementById('ss-password-alt').value;
                const patch = {};
                if (p) patch.password = p;
                if (a) patch.passwordAlt = a;
                return patch;
            })()),
            onvif: Object.assign({
                port: parseInt(document.getElementById('ss-onvif-port').value, 10) || 80,
                user: document.getElementById('ss-onvif-user').value.trim(),
                devicePath: document.getElementById('ss-onvif-path').value.trim() || '/onvif/device_service',
                rtspUrl: document.getElementById('ss-rtsp-url').value.trim(),
                rtspTransport: document.getElementById('ss-rtsp-transport').value,
            }, (function () {
                const p = document.getElementById('ss-onvif-pass').value;
                return p ? { password: p } : {};
            })()),
            docking: {
                ftpUploadPath: (document.getElementById('ss-ftp-upload-path') || {}).value
                    ? document.getElementById('ss-ftp-upload-path').value.trim()
                    : '',
            },
        };
    }

    function clearConfigUnlocked() {
        if (global.AuthReverify && AuthReverify.clear) AuthReverify.clear();
    }

    function setOpen(open) {
        if (open && global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('server');
        }
        const home = document.getElementById('server-settings-home');
        const workspace = document.getElementById('server-config-workspace');
        if (home) home.hidden = !!open;
        if (workspace) workspace.hidden = !open;
        if (open) {
            loadLayoutPref();
            applyPanelLayout(activeMainTab);
        } else {
            if (global.SettingsHub && SettingsHub.onShow) SettingsHub.onShow();
        }
    }

    function permAllBadge() {
        return '<span class="ss-perm-badge-all">' + esc(tr('server.users.permAll')) + '</span>';
    }

    function permCheck(className, checked) {
        return '<label class="ss-perm-check"><input type="checkbox" class="' + className + '"' + (checked ? ' checked' : '') + '></label>';
    }

    function permCell(isSuper, className, checked) {
        return isSuper ? permAllBadge() : permCheck(className, !!checked);
    }

    function permCellTd(isSuper, className, checked) {
        const cls = isSuper ? 'ss-perm-col ss-perm-all' : 'ss-perm-col';
        return '<td class="' + cls + '">' + permCell(isSuper, className, checked) + '</td>';
    }

    function permKillSwitchCellTd(checked) {
        return '<td class="ss-perm-col">' + permCheck('ss-user-kill-switch', !!checked) + '</td>';
    }

    function renderDispatchGroupsCell(u) {
        if (u.role === 'super_admin') {
            return permAllBadge();
        }
        const perms = u.permissions || {};
        const assigned = new Set(u.assignedGroupIds || []);
        const seeAll = !!perms.seeAllDispatchGroups;
        const seeAllLabel = tr('server.users.seeAllGroups');
        let html = '<div class="ss-user-see-all-groups-wrap"><label class="ss-perm-check">'
            + '<input type="checkbox" class="ss-user-see-all-groups"' + (seeAll ? ' checked' : '') + '> '
            + esc(seeAllLabel) + '</label></div>';
        if (!cachedDispatchGroups.length) {
            html += '<span class="setup-hint">' + tr('server.users.noGroupsYet') + '</span>';
            return html;
        }
        html += '<div class="ss-user-dispatch-grps"' + (seeAll ? ' hidden' : '') + '>';
        cachedDispatchGroups.forEach(function (g) {
            if (!g || !g.id) return;
            html += '<label class="ss-dispatch-grp-check"><input type="checkbox" class="ss-user-dispatch-grp" value="'
                + esc(g.id) + '"' + (assigned.has(g.id) ? ' checked' : '') + (seeAll ? ' disabled' : '') + '> '
                + esc(g.name || g.id) + '</label>';
        });
        html += '</div>';
        return html;
    }

    async function loadUsers() {
        if (!canManageUsers) return;
        if (global.DispatchGroupsAdmin && DispatchGroupsAdmin.fetchGroups) {
            try {
                cachedDispatchGroups = await DispatchGroupsAdmin.fetchGroups();
            } catch (_) {
                cachedDispatchGroups = [];
            }
        }
        const res = await fetch('/api/users');
        const data = await res.json();
        if (!res.ok || !data.ok) throwOpErr(data);
        const countEl = document.getElementById('ss-superadmin-count');
        if (countEl && data.superAdminCount != null) {
            countEl.textContent = tr('server.users.superAdminCount', {
                count: data.superAdminCount,
                max: data.maxSuperAdmins || 5,
            });
        }
        const roleSelect = document.getElementById('ss-new-role');
        if (roleSelect && data.maxSuperAdmins != null && data.superAdminCount >= data.maxSuperAdmins) {
            roleSelect.querySelector('option[value="super_admin"]').disabled = true;
        } else if (roleSelect) {
            const opt = roleSelect.querySelector('option[value="super_admin"]');
            if (opt) opt.disabled = false;
        }
        const tbody = document.getElementById('ss-users-body');
        if (!tbody) return;
        tbody.innerHTML = (data.users || []).map((u) => {
            const isSuper = u.role === 'super_admin';
            const perms = u.permissions || {};
            const roleCell = isSuper
                ? ('<span class="ss-role-badge-ui">' + tr('role.superAdmin') + '</span>')
                : ('<span class="ss-role-badge-ui operator">' + tr('role.operator') + '</span>');
            const signInFromVal = (!isSuper && perms.signInStartsAt)
                ? String(perms.signInStartsAt).slice(0, 10) : '';
            const signInVal = (!isSuper && perms.signInExpiresAt)
                ? String(perms.signInExpiresAt).slice(0, 10) : '';
            const expVal = (!isSuper && perms.evidenceDownloadExpiresAt)
                ? String(perms.evidenceDownloadExpiresAt).slice(0, 10) : '';
            const dashCell = isSuper
                ? '<span class="ss-perm-na">—</span>'
                : ('<input type="date" class="ss-user-signin-from"' +
                    (signInFromVal ? ' value="' + esc(signInFromVal) + '"' : '') + ' title="' + tr('server.users.colSignInFrom') + '">');
            const signInCell = isSuper
                ? '<span class="ss-perm-na">—</span>'
                : ('<input type="date" class="ss-user-signin-exp"' +
                    (signInVal ? ' value="' + esc(signInVal) + '"' : '') + ' title="' + tr('server.users.colSignInExpiry') + '">');
            const expCell = isSuper
                ? '<span class="ss-perm-na">—</span>'
                : ('<input type="date" class="ss-user-evidence-exp"' +
                    (expVal ? ' value="' + esc(expVal) + '"' : '') + ' title="' + tr('server.users.expiryHint') + '">');
            const actionsCell = isSuper
                ? ('<button type="button" class="ss-user-reset" title="' + tr('server.users.setPassword') + '">' + tr('server.users.setPassword') + '</button>')
                : ('<div class="ss-user-actions">'
                    + '<button type="button" class="ss-user-save" disabled title="' + tr('server.users.saveRow') + '">' + tr('server.users.saveRow') + '</button>'
                    + '<button type="button" class="ss-user-reset" title="' + tr('server.users.setPassword') + '">' + tr('server.users.setPassword') + '</button>'
                    + '<button type="button" class="ss-user-remove" title="' + tr('server.users.remove') + '">' + tr('server.users.remove') + '</button>'
                    + '</div>');
            return '<tr' + (isSuper ? ' class="ss-user-row-super"' : '') + ' data-user-id="' + esc(u.id) + '" data-username="' + esc(u.username) + '">'
                + '<td class="ss-sticky-user">' + esc(u.username)
                + (u.displayName ? '<br><span class="hint">' + esc(u.displayName) + '</span>' : '')
                + (u.contactNote ? '<br><span class="hint">' + esc(u.contactNote) + '</span>' : '')
                + '</td>'
                + '<td class="ss-user-id"><code>' + esc(u.id) + '</code></td>'
                + '<td>' + roleCell + '</td>'
                + '<td>' + dashCell + '</td>'
                + '<td>' + signInCell + '</td>'
                + permCellTd(isSuper, 'ss-user-map-control', perms.mapDeviceControl)
                + permKillSwitchCellTd(perms.deviceKillSwitch)
                + permCellTd(isSuper, 'ss-user-geofence', perms.geofenceControl)
                + permCellTd(isSuper, 'ss-user-clear-map-pins', perms.clearMapPins)
                + permCellTd(isSuper, 'ss-user-evidence-view', perms.evidenceView || perms.evidenceDownload)
                + permCellTd(isSuper, 'ss-user-evidence-dl', perms.evidenceDownload)
                + permCellTd(isSuper, 'ss-user-evidence-export', perms.evidenceExport)
                + permCellTd(isSuper, 'ss-user-evidence-edit', perms.evidenceEdit)
                + permCellTd(isSuper, 'ss-user-dock-admin', perms.dockAdmin)
                + permCellTd(isSuper, 'ss-user-conference-view', perms.conferenceView || perms.conferenceJoin)
                + permCellTd(isSuper, 'ss-user-conference-join', perms.conferenceJoin)
                + permCellTd(isSuper, 'ss-user-conference-host', perms.conferenceHost)
                + permCellTd(isSuper, 'ss-user-conference-record', perms.conferenceRecord)
                + permCellTd(isSuper, 'ss-user-conference-bwc', perms.conferenceBwcShare)
                + permCellTd(isSuper, 'ss-user-conference-cross', perms.conferenceCrossGroup)
                + permCellTd(isSuper, 'ss-user-audit-view', perms.auditView || perms.auditExport)
                + permCellTd(isSuper, 'ss-user-audit-export', perms.auditExport)
                + '<td>' + expCell + '</td>'
                + '<td class="' + (isSuper ? 'ss-perm-col ss-perm-all' : 'ss-dispatch-grps-col') + '">' + renderDispatchGroupsCell(u) + '</td>'
                + '<td>' + actionsCell + '</td></tr>';
        }).join('');
        wireUserDatePickers(tbody);
    }

    function wireUserDatePickers(root) {
        if (!root) return;
        root.querySelectorAll('.ss-user-signin-from, .ss-user-signin-exp, .ss-user-evidence-exp').forEach(function (el) {
            if (el.dataset.datePickerWired) return;
            el.dataset.datePickerWired = '1';
            el.addEventListener('click', function () {
                if (typeof el.showPicker === 'function') {
                    try { el.showPicker(); } catch (_) { /* browser may block without user gesture */ }
                }
            });
        });
    }

    function highlightUserRow(username) {
        const tbody = document.getElementById('ss-users-body');
        if (!tbody || !username) return;
        const row = Array.from(tbody.querySelectorAll('tr')).find(function (r) {
            return r.getAttribute('data-username') === username;
        });
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('ss-user-exists-highlight');
        setTimeout(function () { row.classList.remove('ss-user-exists-highlight'); }, 5000);
    }

    function markUserRowDirty(row) {
        if (!row) return;
        row.classList.add('ss-user-dirty');
        const saveBtn = row.querySelector('.ss-user-save');
        if (saveBtn) saveBtn.disabled = false;
    }

    function clearUserRowDirty(row) {
        if (!row) return;
        row.classList.remove('ss-user-dirty');
        const saveBtn = row.querySelector('.ss-user-save');
        if (saveBtn) saveBtn.disabled = true;
    }

    function readRowPermissions(row) {
        if (!row) return {};
        const mapEl = row.querySelector('.ss-user-map-control');
        const killSwitchEl = row.querySelector('.ss-user-kill-switch');
        const gfEl = row.querySelector('.ss-user-geofence');
        const clearPinsEl = row.querySelector('.ss-user-clear-map-pins');
        const evViewEl = row.querySelector('.ss-user-evidence-view');
        const evEl = row.querySelector('.ss-user-evidence-dl');
        const evExportEl = row.querySelector('.ss-user-evidence-export');
        const evEditEl = row.querySelector('.ss-user-evidence-edit');
        const dockAdminEl = row.querySelector('.ss-user-dock-admin');
        const vcViewEl = row.querySelector('.ss-user-conference-view');
        const vcJoinEl = row.querySelector('.ss-user-conference-join');
        const vcHostEl = row.querySelector('.ss-user-conference-host');
        const vcRecEl = row.querySelector('.ss-user-conference-record');
        const vcBwcEl = row.querySelector('.ss-user-conference-bwc');
        const vcCrossEl = row.querySelector('.ss-user-conference-cross');
        const auditViewEl = row.querySelector('.ss-user-audit-view');
        const auditExportEl = row.querySelector('.ss-user-audit-export');
        const signInFromEl = row.querySelector('.ss-user-signin-from');
        const signInEl = row.querySelector('.ss-user-signin-exp');
        const expEl = row.querySelector('.ss-user-evidence-exp');
        const seeAllEl = row.querySelector('.ss-user-see-all-groups');
        return {
            mapDeviceControl: !!(mapEl && mapEl.checked),
            deviceKillSwitch: !!(killSwitchEl && killSwitchEl.checked),
            geofenceControl: !!(gfEl && gfEl.checked),
            clearMapPins: !!(clearPinsEl && clearPinsEl.checked),
            evidenceView: !!(evViewEl && evViewEl.checked),
            evidenceDownload: !!(evEl && evEl.checked),
            evidenceExport: !!(evExportEl && evExportEl.checked),
            evidenceEdit: !!(evEditEl && evEditEl.checked),
            dockAdmin: !!(dockAdminEl && dockAdminEl.checked),
            conferenceView: !!(vcViewEl && vcViewEl.checked),
            conferenceJoin: !!(vcJoinEl && vcJoinEl.checked),
            conferenceHost: !!(vcHostEl && vcHostEl.checked),
            conferenceRecord: !!(vcRecEl && vcRecEl.checked),
            conferenceBwcShare: !!(vcBwcEl && vcBwcEl.checked),
            conferenceCrossGroup: !!(vcCrossEl && vcCrossEl.checked),
            auditView: !!(auditViewEl && auditViewEl.checked),
            auditExport: !!(auditExportEl && auditExportEl.checked),
            signInStartsAt: signInFromEl && signInFromEl.value ? signInFromEl.value : null,
            signInExpiresAt: signInEl && signInEl.value ? signInEl.value : null,
            evidenceDownloadExpiresAt: expEl && expEl.value ? expEl.value : null,
            seeAllDispatchGroups: !!(seeAllEl && seeAllEl.checked),
        };
    }

    function readRowAssignedGroupIds(row) {
        if (!row) return [];
        const seeAllEl = row.querySelector('.ss-user-see-all-groups');
        if (seeAllEl && seeAllEl.checked) return [];
        const ids = [];
        row.querySelectorAll('.ss-user-dispatch-grp:checked').forEach(function (cb) {
            if (cb.value) ids.push(cb.value);
        });
        return ids;
    }

    async function saveUserRow(userId, patch) {
        const body = global.AuthReverify && AuthReverify.withReverify
            ? await AuthReverify.withReverify(patch)
            : patch;
        const res = await fetch('/api/users/' + encodeURIComponent(userId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOpErr(data);
        return data.user;
    }

    async function saveUserPermissions(userId, permissions) {
        return saveUserRow(userId, { permissions: permissions });
    }

    async function loadSiteResilience() {
        const nodeEl = document.getElementById('ss-resilience-node-id');
        const peerEl = document.getElementById('ss-resilience-peer-url');
        const localEl = document.getElementById('ss-resilience-local');
        const peerStatEl = document.getElementById('ss-resilience-peer');
        try {
            const res = await fetch('/api/site-resilience', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) return;
            if (nodeEl) nodeEl.value = data.nodeId || 'site-a';
            if (peerEl) peerEl.value = data.peerUrl || '';
            if (localEl) {
                localEl.textContent = 'OK — ' + (data.uptimeSec || 0) + 's';
                localEl.className = 'ss-resilience-ok';
            }
            if (peerStatEl) {
                if (!data.peerUrl) {
                    peerStatEl.textContent = '—';
                    peerStatEl.className = '';
                } else if (data.peerReachable) {
                    peerStatEl.textContent = tr('resilience.peerOk');
                    peerStatEl.className = 'ss-resilience-ok';
                } else {
                    peerStatEl.textContent = tr('resilience.peerDown');
                    peerStatEl.className = 'ss-resilience-bad';
                }
            }
        } catch (_) { /* ignore */ }
    }

    async function saveSiteResilience() {
        if (!canManageServer) return;
        const nodeEl = document.getElementById('ss-resilience-node-id');
        const peerEl = document.getElementById('ss-resilience-peer-url');
        try {
            const res = await fetch('/api/site-resilience', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodeId: nodeEl ? nodeEl.value.trim() : 'site-a',
                    peerUrl: peerEl ? peerEl.value.trim() : '',
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            await loadSiteResilience();
            alert(tr('resilience.saved'));
        } catch (err) {
            alert(opMsg(err.opPayload || err.catalogPayload, err));
        }
    }

    function applySettingsPayload(data) {
        if (!data) return;
        if (data.session) {
            canManageServer = !!data.session.canManageServer;
            canManageUsers = !!data.session.canManageUsers;
        }
        if (global.PasswordPolicyUi && data.session && data.session.role) {
            PasswordPolicyUi.loadPolicyHint('ss-dash-password-policy-hint', data.session.role).then(function (policy) {
                if (policy) {
                    PasswordPolicyUi.applyMinLength(['#ss-dash-pass-new', '#ss-dash-pass-confirm'], policy.minLength);
                }
            });
        }
        const newRoleEl = document.getElementById('ss-new-role');
        if (newRoleEl && global.PasswordPolicyUi && !newRoleEl._policyBound) {
            newRoleEl._policyBound = true;
            const syncNewUserMin = function () {
                fetch('/api/auth/password-policy', { credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (payload) {
                        if (!payload || !payload.ok || !payload.policy) return;
                        const min = newRoleEl.value === 'super_admin'
                            ? payload.policy.minLengthSuperAdmin
                            : payload.policy.minLengthOperator;
                        PasswordPolicyUi.applyMinLength(['#ss-new-pass'], min);
                    })
                    .catch(function () { /* ignore */ });
            };
            newRoleEl.addEventListener('change', syncNewUserMin);
            syncNewUserMin();
        }
        lastRuntime = data.runtime || null;
        lastSiteTimezones = data.siteTimezones || [];
        lastSiteTimePreview = data.siteTimePreview || '';
        if (data.siteTimezone) window.siteTimezone = data.siteTimezone;
        applyForm(data.settings || {});
        startSiteTimePreviewTick();
        lastBwcDeviceSummary = data.bwcDevices || null;
        fillBwcChecklist(data.bwc || buildPreviewChecklist(), lastBwcDeviceSummary);
        applyReadOnlyMode();
    }

    function clearTabExtrasCache() {
        Object.keys(tabExtrasLoaded).forEach(function (k) { delete tabExtrasLoaded[k]; });
    }

    async function loadTabExtras(tab, opts) {
        opts = opts || {};
        const force = !!opts.force;
        tab = tab || activeMainTab;
        const tasks = [];
        if (tab === 'server' && (force || !tabExtrasLoaded.server)) {
            tabExtrasLoaded.server = true;
            tasks.push(loadSiteResilience());
            tasks.push(refreshDeviceSummary());
            tasks.push(loadDockFolder().then(fillDockPanel));
        }
        if (tab === 'bwc' && (force || !tabExtrasLoaded.bwc)) {
            tabExtrasLoaded.bwc = true;
            tasks.push((async function () {
                if (global.BwcDevices && BwcDevices.buildEmbeddedTable) BwcDevices.buildEmbeddedTable();
            })());
        }
        if (tab === 'dashboard' && (force || !tabExtrasLoaded.dashboard)) {
            tabExtrasLoaded.dashboard = true;
            if (canManageUsers) {
                tasks.push(loadUsers().catch(function () { /* ignore */ }));
            } else {
                tasks.push(loadMyAccount().catch(function () { /* ignore */ }));
            }
        }
        if (!tasks.length) return;
        await Promise.all(tasks);
        if (tab === 'dashboard') applyDashboardAuthLayout();
    }

    async function loadCore() {
        if (global.SessionBus && SessionBus.peekSettings) {
            const warm = SessionBus.peekSettings();
            if (warm && warm.settings) {
                cachedSettingsData = warm;
                applySettingsPayload(warm);
                return warm;
            }
        }
        if (global.SessionBus && SessionBus.getSettings) {
            const data = await SessionBus.getSettings();
            if (data && data.settings) {
                cachedSettingsData = data;
                applySettingsPayload(data);
                return data;
            }
        }
        const res = await fetch('/api/server-settings');
        const data = await res.json();
        cachedSettingsData = data;
        applySettingsPayload(data);
        return data;
    }

    function scheduleSettingsRefresh(tab, opts) {
        opts = opts || {};
        const run = function () {
            return loadCore().then(function () {
                if (opts.tabExtras === false) return null;
                return loadTabExtras(tab || activeMainTab, { force: !!opts.force });
            });
        };
        if (loadInFlight) {
            loadInFlight = loadInFlight.then(run).catch(function () { /* ignore */ });
            return loadInFlight;
        }
        loadInFlight = run().catch(function () { /* ignore */ }).finally(function () {
            loadInFlight = null;
        });
        return loadInFlight;
    }

    function openConfigPanel(mainTab) {
        activeMainTab = mainTab || 'server';
        if (cachedSettingsData) {
            applySettingsPayload(cachedSettingsData);
        } else if (global.SessionBus && SessionBus.peekSettings) {
            const warm = SessionBus.peekSettings();
            if (warm && warm.settings) {
                cachedSettingsData = warm;
                applySettingsPayload(warm);
            }
        }
        setOpen(true);
        setMainTab(activeMainTab);
        if (global.AdminActionBus) AdminActionBus.setConfigLoading(true);
        scheduleSettingsRefresh(activeMainTab, { force: !cachedSettingsData })
            .finally(function () {
                if (global.AdminActionBus) {
                    AdminActionBus.setConfigLoading(false);
                    if (AdminActionBus.isBusy()) AdminActionBus.end();
                }
                setDiagnosticsFlowHints(false);
            });
    }

    async function load() {
        clearTabExtrasCache();
        await loadCore();
        setMainTab(activeMainTab);
        await loadTabExtras(activeMainTab, { force: true });
        applyDashboardAuthLayout();
        const curPass = document.getElementById('ss-dash-pass-current');
        const newPass = document.getElementById('ss-dash-pass-new');
        const confirmPass = document.getElementById('ss-dash-pass-confirm');
        if (curPass) curPass.value = '';
        if (newPass) newPass.value = '';
        if (confirmPass) confirmPass.value = '';
        clearNewOperatorForm();
    }

    function bindUi() {
        if (uiBound) return;
        uiBound = true;
        document.getElementById('server-setup-cancel').addEventListener('click', () => setOpen(false));
        const backBtn = document.getElementById('server-setup-back');
        if (backBtn) backBtn.addEventListener('click', () => setOpen(false));
        const layoutToggle = document.getElementById('ss-layout-toggle');
        if (layoutToggle) layoutToggle.addEventListener('click', togglePanelLayout);
        loadLayoutPref();
        const gateCancel = document.getElementById('ss-gate-cancel');
        const gateSubmit = document.getElementById('ss-gate-submit');
        const gateBackdrop = document.getElementById('ss-gate-backdrop');
        if (gateCancel) {
            gateCancel.addEventListener('click', function () {
                if (gateBackdrop) {
                    gateBackdrop.hidden = true;
                    setModalA11y('ss-gate-backdrop', false);
                }
            });
        }
        if (gateSubmit) {
            gateSubmit.addEventListener('click', function () {
                if (gateBackdrop && typeof gateBackdrop._ssGateSubmit === 'function') gateBackdrop._ssGateSubmit();
            });
        }
        bindTechProvisionUi();
        const resetCancel = document.getElementById('ss-reset-pwd-cancel');
        const resetSubmit = document.getElementById('ss-reset-pwd-submit');
        const resetNewEl = document.getElementById('ss-reset-new-pass');
        const resetAdminEl = document.getElementById('ss-reset-admin-pass');
        const resetPwdBusy = global.AuthFormBusy ? AuthFormBusy.create({
            fields: [resetNewEl, resetAdminEl].filter(Boolean),
            submitBtn: resetSubmit,
            cancelBtns: [resetCancel].filter(Boolean),
            busyLabel: tr('common.saving'),
        }) : null;
        if (resetCancel) resetCancel.addEventListener('click', function () {
            if (resetPwdBusy && resetPwdBusy.isBusy()) return;
            closeResetPwdDialog();
        });
        if (resetSubmit) {
            resetSubmit.addEventListener('click', async () => {
                if (resetPwdBusy && resetPwdBusy.isBusy()) return;
                if (!resetPwdUserId) return;
                const newPass = resetNewEl ? resetNewEl.value : '';
                const adminPass = resetAdminEl ? resetAdminEl.value : '';
                const errEl = document.getElementById('ss-reset-pwd-error');
                if (!newPass || !adminPass) {
                    if (errEl) { errEl.textContent = tr('server.users.passwordBothRequired'); errEl.hidden = false; }
                    return;
                }
                if (resetPwdBusy) resetPwdBusy.setBusy(true);
                try {
                    const res = await fetch('/api/users/' + encodeURIComponent(resetPwdUserId), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: newPass, adminPassword: adminPass }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.ok) throwOpErr(data);
                    if (resetPwdBusy) resetPwdBusy.setBusy(false);
                    closeResetPwdDialog();
                    alert(tr('server.alert.passwordUpdated'));
                } catch (err) {
                    if (errEl) { errEl.textContent = opMsg(err.opPayload || err.catalogPayload, err); errEl.hidden = false; }
                    if (resetPwdBusy) resetPwdBusy.setBusy(false);
                    if (resetAdminEl) resetAdminEl.focus();
                }
            });
        }
        document.getElementById('ss-tab-sip').addEventListener('click', () => setProtocolTab('sip'));
        document.getElementById('ss-tab-onvif').addEventListener('click', () => setProtocolTab('onvif'));
        bindNetworkSectionNav();
        document.getElementById('ss-deployment-mode').addEventListener('change', (e) => {
            const mode = e.target.value;
            updateDeploymentHint(mode);
            updateDeploymentSections(mode);
            syncBwcRegisterFromNetwork(true);
            maybeSuggestOperatorUrl();
            updateSidebarDeployment(mode);
            fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
        });
        ['ss-lan-server-ip', 'ss-wan-public-ip', 'ss-wan-vpn'].forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', function () {
                syncBwcRegisterFromNetwork(false);
                maybeSuggestOperatorUrl();
                fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
            });
        });
        document.getElementById('ss-public-host').addEventListener('input', function () {
            bwcRegisterManual = true;
            fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
        });
        document.getElementById('ss-operator-url').addEventListener('input', (e) => {
            e.target.dataset.auto = '0';
        });

        document.getElementById('ss-main-tab-server').addEventListener('click', () => setMainTab('server'));
        document.getElementById('ss-main-tab-bwc').addEventListener('click', () => setMainTab('bwc'));
        const tabGroups = document.getElementById('ss-main-tab-groups');
        if (tabGroups) tabGroups.addEventListener('click', () => setMainTab('groups'));
        const tabUsb = document.getElementById('ss-main-tab-usb');
        if (tabUsb) tabUsb.addEventListener('click', () => setMainTab('usb'));
        const tabFirmware = document.getElementById('ss-main-tab-firmware');
        if (tabFirmware) tabFirmware.addEventListener('click', () => setMainTab('firmware'));
        document.getElementById('ss-main-tab-dashboard').addEventListener('click', () => setMainTab('dashboard'));
        const tabCloud = document.getElementById('ss-main-tab-cloud');
        if (tabCloud && !tabCloud._ssBound) {
            tabCloud._ssBound = true;
            tabCloud.addEventListener('click', () => setMainTab('cloud'));
        }
        if (global.FirmwareOtaAdmin && FirmwareOtaAdmin.init) FirmwareOtaAdmin.init();
        const subOps = document.getElementById('ss-dash-sub-operators');
        const subMe = document.getElementById('ss-dash-sub-me');
        if (subOps) subOps.addEventListener('click', () => setDashSubTab('operators'));
        if (subMe) subMe.addEventListener('click', () => setDashSubTab('me'));

        const openEvidenceStorageBtn = document.getElementById('ss-open-evidence-storage');
        if (openEvidenceStorageBtn) openEvidenceStorageBtn.addEventListener('click', openEvidenceStorage);

        const siteTzSelect = document.getElementById('ss-site-timezone');
        if (siteTzSelect) {
            siteTzSelect.addEventListener('change', function () {
                updateSiteTimePreview(previewSiteTimeLocal());
            });
        }

        const saveResilienceBtn = document.getElementById('ss-save-resilience');
        if (saveResilienceBtn) {
            saveResilienceBtn.addEventListener('click', function () { saveSiteResilience(); });
        }

        const openBwc = null;
        const openDevices = document.getElementById('ss-open-video-config');
        const dlTpl = document.getElementById('ss-download-device-csv');
        const impCsv = document.getElementById('ss-import-device-csv');
        const csvFile = document.getElementById('ss-device-csv-file');
        const addBwcRow = document.getElementById('ss-bwc-add-row');
        const expBwcCsv = document.getElementById('ss-bwc-export-csv');
        const saveBwcList = document.getElementById('ss-save-bwc-list');
        if (addBwcRow) {
            addBwcRow.addEventListener('click', () => {
                if (global.BwcDevices && BwcDevices.addEmbeddedRow) BwcDevices.addEmbeddedRow();
            });
        }
        if (expBwcCsv) {
            expBwcCsv.addEventListener('click', () => {
                if (global.BwcDevices && BwcDevices.exportCsv) BwcDevices.exportCsv();
            });
        }
        if (saveBwcList) {
            saveBwcList.addEventListener('click', async () => {
                if (!canManageServer || !global.BwcDevices || !BwcDevices.saveEmbeddedList) return;
                try {
                    const n = await BwcDevices.saveEmbeddedList();
                    await refreshDeviceSummary();
                    fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
                    alert(tr('server.alert.imported', { n: n }));
                } catch (err) {
                    alert(opMsg(err.opPayload || err.catalogPayload, err));
                }
            });
        }
        if (openDevices) {
            openDevices.addEventListener('click', () => {
                setOpen(false);
                if (global.VideoConfig && VideoConfig.openPanel) VideoConfig.openPanel();
            });
        }
        if (dlTpl) {
            dlTpl.addEventListener('click', () => {
                if (global.BwcDevices && BwcDevices.downloadCsvTemplate) BwcDevices.downloadCsvTemplate();
            });
        }
        if (impCsv && csvFile) {
            impCsv.addEventListener('click', () => csvFile.click());
            csvFile.addEventListener('change', async () => {
                const file = csvFile.files && csvFile.files[0];
                csvFile.value = '';
                if (!file || !global.BwcDevices || !BwcDevices.importCsvFile) return;
                try {
                    const n = await BwcDevices.importCsvFile(file);
                    await refreshDeviceSummary();
                    fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
                    alert(tr('server.alert.imported', { n: n }));
                } catch (err) {
                    alert(opMsg(err.opPayload || err.catalogPayload, err));
                }
            });
        }

        document.getElementById('ss-change-pass').addEventListener('click', async () => {
            try {
                const res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentPassword: document.getElementById('ss-dash-pass-current').value,
                        newPassword: document.getElementById('ss-dash-pass-new').value,
                        confirmPassword: document.getElementById('ss-dash-pass-confirm').value,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throwOpErr(data);
                document.getElementById('ss-dash-pass-current').value = '';
                document.getElementById('ss-dash-pass-new').value = '';
                document.getElementById('ss-dash-pass-confirm').value = '';
                alert(tr('server.alert.passwordUpdated'));
            } catch (err) {
                alert(opMsg(err.opPayload || err.catalogPayload, err));
            }
        });

        const recoverySendBtn = document.getElementById('ss-recovery-email-send');
        if (recoverySendBtn) {
            recoverySendBtn.addEventListener('click', async () => {
                try {
                    await sendRecoveryEmailFromSettings(false);
                } catch (err) {
                    const msgEl = document.getElementById('ss-recovery-email-msg');
                    if (msgEl) msgEl.textContent = opMsg(err.opPayload || err.catalogPayload, err);
                }
            });
        }
        const recoveryResendBtn = document.getElementById('ss-recovery-email-resend');
        if (recoveryResendBtn) {
            recoveryResendBtn.addEventListener('click', async () => {
                try {
                    await sendRecoveryEmailFromSettings(true);
                } catch (err) {
                    const msgEl = document.getElementById('ss-recovery-email-msg');
                    if (msgEl) msgEl.textContent = opMsg(err.opPayload || err.catalogPayload, err);
                }
            });
        }

        document.getElementById('ss-add-user').addEventListener('click', async () => {
            if (!canManageUsers || creatingUser) return;
            const username = document.getElementById('ss-new-user').value.trim();
            const addBtn = document.getElementById('ss-add-user');
            creatingUser = true;
            if (addBtn) addBtn.disabled = true;
            try {
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        password: document.getElementById('ss-new-pass').value,
                        adminPassword: document.getElementById('ss-new-admin-pass').value,
                        role: (document.getElementById('ss-new-role') || {}).value || 'operator',
                        displayName: (document.getElementById('ss-new-display-name') || {}).value.trim(),
                        contactNote: (document.getElementById('ss-new-contact-note') || {}).value.trim(),
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throwOpErr(data);
                const createdName = (data.user && data.user.username) || username;
                document.getElementById('ss-new-user').value = '';
                document.getElementById('ss-new-pass').value = '';
                document.getElementById('ss-new-admin-pass').value = '';
                if (document.getElementById('ss-new-display-name')) document.getElementById('ss-new-display-name').value = '';
                if (document.getElementById('ss-new-contact-note')) document.getElementById('ss-new-contact-note').value = '';
                try {
                    await loadUsers();
                } catch (_) { /* user saved — table refresh failed */ }
                alert(tr('server.alert.userCreated', { name: createdName }));
            } catch (err) {
                const payload = err.opPayload || err.catalogPayload;
                if (isUsernameExistsPayload(payload)) {
                    highlightUserRow(username);
                    alert(tr('server.alert.userExists', { name: username }));
                    return;
                }
                alert(opMsg(payload, err));
            } finally {
                creatingUser = false;
                if (addBtn) addBtn.disabled = false;
            }
        });

        document.getElementById('ss-users-body').addEventListener('change', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            if (e.target.matches('.ss-user-map-control') || e.target.matches('.ss-user-kill-switch')
                || e.target.matches('.ss-user-geofence')
                || e.target.matches('.ss-user-clear-map-pins') || e.target.matches('.ss-user-evidence-view')
                || e.target.matches('.ss-user-evidence-dl') || e.target.matches('.ss-user-evidence-export')
                || e.target.matches('.ss-user-evidence-edit')                 || e.target.matches('.ss-user-dock-admin')
                || e.target.matches('.ss-user-conference-view') || e.target.matches('.ss-user-conference-join')
                || e.target.matches('.ss-user-conference-host') || e.target.matches('.ss-user-conference-record')
                || e.target.matches('.ss-user-conference-bwc') || e.target.matches('.ss-user-conference-cross')
                || e.target.matches('.ss-user-audit-view') || e.target.matches('.ss-user-audit-export')
                || e.target.matches('.ss-user-signin-from')
                || e.target.matches('.ss-user-signin-exp') || e.target.matches('.ss-user-evidence-exp')
                || e.target.matches('.ss-user-see-all-groups') || e.target.matches('.ss-user-dispatch-grp')) {
                if (e.target.matches('.ss-user-see-all-groups')) {
                    const grpBox = row.querySelector('.ss-user-dispatch-grps');
                    const seeAll = e.target.checked;
                    if (grpBox) grpBox.hidden = seeAll;
                    row.querySelectorAll('.ss-user-dispatch-grp').forEach(function (cb) {
                        cb.disabled = seeAll;
                        if (seeAll) cb.checked = false;
                    });
                }
                markUserRowDirty(row);
            }
        });

        document.getElementById('ss-users-body').addEventListener('input', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            if (e.target.matches('.ss-user-signin-from') || e.target.matches('.ss-user-signin-exp')
                || e.target.matches('.ss-user-evidence-exp')) {
                markUserRowDirty(row);
            }
        });

        document.getElementById('ss-users-body').addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row && row.getAttribute('data-user-id');
            if (!id) return;
            if (e.target.matches('.ss-user-save')) {
                const name = row.getAttribute('data-username') || id;
                const btn = e.target;
                btn.disabled = true;
                try {
                    await saveUserRow(id, {
                        permissions: readRowPermissions(row),
                        assignedGroupIds: readRowAssignedGroupIds(row),
                    });
                    clearUserRowDirty(row);
                    alert(tr('server.users.saved', { name: name }));
                } catch (err) {
                    alert(opMsg(err.opPayload || err.catalogPayload, err));
                    await loadUsers();
                }
                return;
            }
            if (e.target.matches('.ss-user-remove')) {
                const name = row.getAttribute('data-username') || id;
                if (!window.confirm(tr('server.users.removeConfirm', { name: name }))) return;
                try {
                    const body = global.AuthReverify && AuthReverify.withReverify
                        ? await AuthReverify.withReverify({ active: false })
                        : { active: false };
                    const res = await fetch('/api/users/' + encodeURIComponent(id), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.ok) throwOpErr(data);
                    await loadUsers();
                    alert(tr('server.users.removed', { name: name }));
                } catch (err) {
                    alert(opMsg(err.opPayload || err.catalogPayload, err));
                }
                return;
            }
            if (e.target.matches('.ss-user-reset')) {
                openResetPwdDialog(id);
            }
        });

        document.getElementById('server-setup-save').addEventListener('click', async () => {
            if (!canManageServer) return;
            const formBody = readForm();
            if (!formBody.publicHost) {
                alert(tr('server.error.hostRequired'));
                return;
            }
            if (/[a-zA-Z]/.test(formBody.publicHost)) {
                alert(tr('server.error.ipv4Only'));
                return;
            }
            try {
                const payload = global.AuthReverify && AuthReverify.withReverify
                    ? await AuthReverify.withReverify(formBody)
                    : formBody;
                const res = await fetch('/api/server-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!data.ok) throwOpErr(data);
                if (data.siteTimePreview) lastSiteTimePreview = data.siteTimePreview;
                applyForm(data.settings);
                updateSiteTimePreview(lastSiteTimePreview);
                fillBwcChecklist(data.bwc, lastBwcDeviceSummary);
                cachedSettingsData = null;
                if (global.SessionBus && SessionBus.invalidateSettings) SessionBus.invalidateSettings();
                clearTabExtrasCache();
                setOpen(false);
                alert(tr('server.alert.saved'));
            } catch (err) {
                alert(opMsg(err.opPayload || err.catalogPayload, err));
            }
        });

        document.querySelectorAll('#server-setup-panel input, #server-setup-panel select').forEach((el) => {
            el.addEventListener('input', () => fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary));
        });
        window.addEventListener('fm-i18n-changed', () => {
            fillBwcChecklist(buildPreviewChecklist(), lastBwcDeviceSummary);
            const modeEl = document.getElementById('ss-deployment-mode');
            updateDeploymentHint(modeEl ? modeEl.value : lastDeploymentMode);
            updateSidebarDeployment(lastDeploymentMode);
            fillTimezoneSelect(
                (document.getElementById('ss-site-timezone') || {}).value,
                lastSiteTimezones
            );
            updateSiteTimePreview(lastSiteTimePreview);
            refreshDeviceSummary();
            if (canManageUsers) loadUsers().catch(() => { /* ignore */ });
        });
    }

    function openUsersGrant() {
        openConfigPanel('dashboard');
        activeDashSubTab = 'operators';
        setDashSubTab('operators');
        scheduleSettingsRefresh('dashboard', { force: true }).then(function () {
            if (!canManageUsers) {
                alert(tr('map.permGrantSteps'));
                return;
            }
            const section = document.getElementById('ss-users-section');
            if (!section) return;
            section.hidden = false;
            window.setTimeout(function () {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                section.classList.add('ss-highlight-grant');
                window.setTimeout(function () { section.classList.remove('ss-highlight-grant'); }, 2600);
            }, 120);
        });
    }

    async function refreshDockPanel() {
        await loadDockFolder();
        fillDockPanel();
    }

    function applySession(data) {
        if (!data || !data.ok) return;
        canManageServer = !!data.canManageServer;
        canManageUsers = !!data.canManageUsers;
    }

    function ensureCanManageServer() {
        if (canManageServer) return Promise.resolve(true);
        const load = (global.SessionBus && SessionBus.get)
            ? SessionBus.get()
            : fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
        return load
            .then(function (data) {
                applySession(data);
                return !!(data && data.ok && data.canManageServer);
            })
            .catch(function () { return false; });
    }

    function onTechGateCancel() {
        setOpen(false);
    }

    function setTechProvisionA11y(show) {
        const backdrop = document.getElementById('ss-tech-provision-backdrop');
        const pinEl = document.getElementById('ss-tech-provision-pin');
        const pin2El = document.getElementById('ss-tech-provision-pin2');
        if (!backdrop) return;
        backdrop.removeAttribute('inert');
        backdrop.inert = false;
        backdrop.setAttribute('aria-hidden', show ? 'false' : 'true');
        [pinEl, pin2El].forEach(function (inp) {
            if (!inp) return;
            if (show) {
                inp.disabled = false;
                inp.readOnly = false;
                inp.removeAttribute('disabled');
                inp.removeAttribute('readonly');
                inp.tabIndex = 0;
            } else {
                inp.disabled = true;
                inp.tabIndex = -1;
            }
        });
    }

    function hideModalsForTechProvision() {
        if (global.AuthReverify && AuthReverify.dismissGate) AuthReverify.dismissGate();
        ['ss-tech-gate-backdrop', 'ss-reset-pwd-backdrop'].forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.hidden = true;
            if (id === 'ss-reset-pwd-backdrop') setModalA11y(id, false);
        });
        if (global.TechDiagnostics && TechDiagnostics.dismissTechGate) {
            TechDiagnostics.dismissTechGate({});
        }
    }

    let techProvisionEsc = null;

    function dismissTechProvision(opts) {
        opts = opts || {};
        const backdrop = document.getElementById('ss-tech-provision-backdrop');
        if (backdrop) backdrop.hidden = true;
        setTechProvisionA11y(false);
        if (techProvisionEsc) {
            document.removeEventListener('keydown', techProvisionEsc);
            techProvisionEsc = null;
        }
        if (opts.onCancel) opts.onCancel();
    }

    function showTechProvision(onSuccess, opts) {
        opts = opts || {};
        const backdrop = document.getElementById('ss-tech-provision-backdrop');
        const pinEl = document.getElementById('ss-tech-provision-pin');
        const pin2El = document.getElementById('ss-tech-provision-pin2');
        const errEl = document.getElementById('ss-tech-provision-error');
        if (!backdrop || !pinEl || !pin2El) {
            if (onSuccess) onSuccess();
            return;
        }
        if (!backdrop.hidden) {
            pinEl.focus();
            return;
        }
        pinEl.value = '';
        pin2El.value = '';
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        hideModalsForTechProvision();
        backdrop.hidden = false;
        setTechProvisionA11y(true);

        const cancel = function () {
            if (backdrop._techProvisionBusy && backdrop._techProvisionBusy.isBusy()) return;
            dismissTechProvision({ onCancel: opts.onCancel || onTechGateCancel });
        };

        const provSubmitBtn = document.getElementById('ss-tech-provision-submit');
        const provCancelBtn = document.getElementById('ss-tech-provision-cancel');
        const provisionBusy = global.AuthFormBusy ? AuthFormBusy.create({
            fields: [pinEl, pin2El],
            submitBtn: provSubmitBtn,
            cancelBtns: [provCancelBtn],
            busyLabel: tr('common.saving'),
        }) : null;
        backdrop._techProvisionBusy = provisionBusy;

        const submit = async function () {
            if (provisionBusy && provisionBusy.isBusy()) return;
            const pin = pinEl.value.trim();
            const pinConfirm = pin2El.value.trim();
            if (pin.length < 12) {
                if (errEl) {
                    errEl.textContent = tr('tech.provision.pinTooShort');
                    errEl.hidden = false;
                }
                return;
            }
            if (pin !== pinConfirm) {
                if (errEl) {
                    errEl.textContent = tr('tech.provision.pinMismatch');
                    errEl.hidden = false;
                }
                return;
            }
            if (provisionBusy) provisionBusy.setBusy(true);
            try {
                let body = { pin: pin, pinConfirm: pinConfirm };
                if (global.AuthReverify && AuthReverify.withReverify) {
                    body = await AuthReverify.withReverify(body);
                }
                const res = await fetch('/api/tech/provision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify(body),
                });
                const data = await res.json().catch(function () { return {}; });
                if (!res.ok || !data.ok) {
                    const key = data && data.errorKey;
                    throw new Error(key ? tr(key) : tr('tech.provision.failed'));
                }
                if (provisionBusy) provisionBusy.setBusy(false);
                dismissTechProvision({});
                if (global.TechDiagnostics && TechDiagnostics.checkSession) {
                    await TechDiagnostics.checkSession();
                }
                if (onSuccess) onSuccess();
            } catch (err) {
                if (err && err.message === 'cancelled') {
                    if (provisionBusy) provisionBusy.setBusy(false);
                    cancel();
                    return;
                }
                if (errEl) {
                    errEl.textContent = (err && err.message) || tr('tech.provision.failed');
                    errEl.hidden = false;
                }
                if (provisionBusy) provisionBusy.setBusy(false);
                pinEl.focus();
            }
        };

        backdrop._techProvisionSubmit = submit;
        backdrop._techProvisionCancel = cancel;
        pinEl.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            }
        };
        pin2El.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            }
        };
        techProvisionEsc = function (e) {
            if (e.key === 'Escape') {
                if (backdrop._techProvisionBusy && backdrop._techProvisionBusy.isBusy()) return;
                e.preventDefault();
                cancel();
            }
        };
        document.addEventListener('keydown', techProvisionEsc);
        setTimeout(function () { pinEl.focus(); }, 50);
    }

    function bindTechProvisionUi() {
        const backdrop = document.getElementById('ss-tech-provision-backdrop');
        const cancelBtn = document.getElementById('ss-tech-provision-cancel');
        const submitBtn = document.getElementById('ss-tech-provision-submit');
        if (cancelBtn && backdrop && !cancelBtn._ssTechProvBound) {
            cancelBtn._ssTechProvBound = true;
            cancelBtn.addEventListener('click', function () {
                if (typeof backdrop._techProvisionCancel === 'function') backdrop._techProvisionCancel();
            });
        }
        if (submitBtn && backdrop && !submitBtn._ssTechProvBound) {
            submitBtn._ssTechProvBound = true;
            submitBtn.addEventListener('click', function () {
                if (typeof backdrop._techProvisionSubmit === 'function') backdrop._techProvisionSubmit();
            });
        }
    }

    function fetchTechSession() {
        return fetch('/api/tech/session', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .catch(function () { return {}; });
    }

    function runWithTechAccess(onReady, opts) {
        opts = opts || {};
        if (techAccessInFlight) {
            if (global.AdminActionBus) {
                AdminActionBus.toast(tr('adminAction.wait'));
                AdminActionBus.focusOpenGate();
            }
            return;
        }
        if (!global.TechDiagnostics || !TechDiagnostics.requireTech) {
            alert(tr('errors.generic'));
            if (global.AdminActionBus && AdminActionBus.isBusy()) AdminActionBus.end();
            return;
        }
        if (TechDiagnostics.isAuthenticated && TechDiagnostics.isAuthenticated()) {
            if (onReady) onReady();
            return;
        }
        techAccessInFlight = true;
        fetchTechSession().then(function (data) {
            if (data && data.configured === false) {
                showTechProvision(function () {
                    TechDiagnostics.requireTech(onReady, opts);
                }, { onCancel: opts.onCancel || onTechGateCancel });
                return;
            }
            TechDiagnostics.requireTech(onReady, opts);
        }).finally(function () {
            techAccessInFlight = false;
        });
    }

    function bindSettingsAsideClicks() {
        const aside = document.getElementById('server-settings-home');
        if (!aside || aside._ssAsideBound) return;
        aside._ssAsideBound = true;
        aside.addEventListener('click', function (e) {
            const btn = e.target.closest('#server-setup-open');
            if (!btn || btn.disabled) return;
            e.preventDefault();
            openConfigTab('server', { sourceBtn: btn });
        });
    }

    function openConfigTab(tab, opts) {
        opts = opts || {};
        if (!canManageServer) {
            if (global.AdminActionBus) AdminActionBus.toast(tr('adminAction.adminRequired'));
            return;
        }
        if (global.AdminActionBus) {
            if (!AdminActionBus.begin({ sourceBtn: opts.sourceBtn || null })) return;
        } else if (!trySettingsNavLock()) {
            return;
        }
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('server');
        }
        const mainTab = tab || 'server';
        const needsTech = mainTab === 'diagnostics' || mainTab === 'lab';

        const finishCancel = function () {
            setDiagnosticsFlowHints(false);
            if (global.AdminActionBus && AdminActionBus.isBusy()) AdminActionBus.end();
        };

        const doOpen = function () {
            openConfigPanel(mainTab);
        };

        const afterDashboardGate = function () {
            if (needsTech) {
                setDiagnosticsFlowHints(true, 'tech');
                runWithTechAccess(doOpen, {
                    onCancel: function () {
                        onTechGateCancel();
                        finishCancel();
                    },
                });
                return;
            }
            setDiagnosticsFlowHints(false);
            doOpen();
        };

        if (isConfigUnlocked()) {
            afterDashboardGate();
            return;
        }
        if (needsTech) setDiagnosticsFlowHints(true, 'dashboard');
        showGate(afterDashboardGate, finishCancel);
    }

    function init() {
        if (global.DispatchGroupsAdmin && DispatchGroupsAdmin.init) DispatchGroupsAdmin.init();
        if (global.TechDiagnostics && TechDiagnostics.bindUi) TechDiagnostics.bindUi();
        if (global.LabSecurity && LabSecurity.bindUi) LabSecurity.bindUi();
        if (global.CloudDeployment && CloudDeployment.bindUi) CloudDeployment.bindUi();
        if (global.UsbMaintenance && UsbMaintenance.bindUi) UsbMaintenance.bindUi();
        bindUi();
        bindSettingsAsideClicks();
        setModalA11y('ss-gate-backdrop', false);
        setModalA11y('ss-reset-pwd-backdrop', false);
        setModalA11y('ss-tech-gate-backdrop', false);
        setTechProvisionA11y(false);
        if (global.SessionBus && SessionBus.get) {
            SessionBus.get().then(function (data) {
                if (data && data.ok) applySession(data);
                if (data && data.ok && SessionBus.warmSettings) SessionBus.warmSettings();
            }).catch(function () { /* ignore */ });
        }
    }

    global.ServerSetup = {
        init: init,
        load: load,
        reloadSettings: function (opts) {
            opts = opts || {};
            if (opts.force) {
                clearTabExtrasCache();
                return load();
            }
            return scheduleSettingsRefresh(activeMainTab);
        },
        refreshDeviceSummary: refreshDeviceSummary,
        setMainTab: setMainTab,
        openUsersGrant: openUsersGrant,
        refreshDockPanel: refreshDockPanel,
        openConfigTab: openConfigTab,
        runWithTechAccess: runWithTechAccess,
        trySettingsNavLock: trySettingsNavLock,
        releaseAllSettingsOverlays: releaseAllSettingsOverlays,
        applySession: applySession,
        bindSettingsAsideClicks: bindSettingsAsideClicks,
        closeConfig: function () { setOpen(false); },
        openEvidenceStorage: openEvidenceStorage,
        syncAdvancedNav: syncAdvancedNav,
        canManageServer: function () { return canManageServer; },
    };
})(window);
