/**
 * Server Config \u2014 deployment, LAN/WAN network, SIP/ONVIF, users.
 * + MOB-APPLY DYNAMIC-FRONTEND-UI-V1 (DEPLOYMENT_MODE chrome + SSL scaffold)
 */
(function (global) {
    let lastDeploymentMode = 'lan';
    let saasDeploymentMode = 'on_prem';

    const MODE_LABEL_FALLBACKS = {
        'server.mode.lab': 'Lab',
        'server.mode.lan': 'LAN server',
        'server.mode.cloud': 'Cloud / VPS',
        'server.mode.hybrid': 'Hybrid (cloud ops + site LAN)',
        'server.users.colClearMapPins': 'Clear Map Pins',
        'server.users.addNewAdminOperator': 'Add New Admin / Operator',
        'server.dashSub.addAccount': 'Add New Admin / Operator',
        'server.dashSub.usersAuthority': 'Users and Authority',
        'server.dashSub.siteSecurity': 'Site security',
        'server.tab.dashboard': 'Dashboard Authentication',
        'server.users.loginUsername': 'Login Username',
        'server.users.usernameRequired': 'Login username is required.',
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

    function tryLicenseLimitUpsell(res, data) {
        if (global.LicenseEntitlementsUi && typeof LicenseEntitlementsUi.tryHandleLimitResponse === 'function') {
            return LicenseEntitlementsUi.tryHandleLimitResponse(res, data);
        }
        return false;
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
    let activeMainTab = 'infrastructure';
    let activeDashSubTab = 'add';
    let activeFleetSubTab = 'wireless';
    let activeInfraSubTab = 'network';
    let infraTabsReorganized = false;
    let layoutOverride = null;
    const TAB_LAYOUT = {
        infrastructure: 'wide',
        server: 'wide',
        groups: 'wide',
        firmware: 'wide',
        diagnostics: 'wide',
        lab: 'wide',
        dashboard: 'admin',
        fleet: 'admin',
        security: 'admin',
        bwc: 'admin',
        cloud: 'admin',
        usb: 'admin',
    };
    const PILLAR_TABS = ['infrastructure', 'fleet', 'security', 'diagnostics'];
    const PILLAR_PANELS = {
        infrastructure: ['server'],
        fleet: ['bwc'],
        security: ['dashboard'],
        diagnostics: ['diagnostics'],
    };
    const ADVANCED_TABS = ['firmware', 'usb', 'cloud', 'diagnostics', 'lab'];
    const PRIMARY_TABS = ['infrastructure', 'fleet', 'security'];
    const NETWORK_SECTION_IDS = [
        'ss-phase-identity',
        'ss-phase-networking',
        'ss-phase-access',
        'ss-phase-storage',
        'ss-phase-resiliency',
        'ss-phase-diagnostics',
    ];
    let lastSiteReadiness = null;
    let networkSectionScrollBound = false;
    let cachedDispatchGroups = [];
    let dockFolderPath = '';
    let resetPwdUserId = null;
    let lastUsersList = [];
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

    function syncPasswordFieldLabels(policy) {
        const min = (policy && policy.minLength) || 12;
        const example = (policy && policy.example) || (global.PasswordPolicyUi && PasswordPolicyUi.DEFAULT_EXAMPLE) || 'Ab12cd34!@#$';
        const addLabel = document.querySelector('#ss-users-section [data-i18n="server.users.password"]');
        const resetLabel = document.querySelector('label[for="ss-reset-new-pass"] span');
        const text = tr('server.users.passwordMin', { min: min });
        const resetText = tr('server.users.newPasswordMin', { min: min });
        if (addLabel) addLabel.textContent = text;
        if (resetLabel) resetLabel.textContent = resetText;
        const hintNew = document.getElementById('ss-new-pass-policy-hint');
        const hintReset = document.getElementById('ss-reset-pwd-policy-hint');
        if (global.PasswordPolicyUi && PasswordPolicyUi.policyHintText) {
            const line = PasswordPolicyUi.policyHintText(policy || { minLength: min, example: example });
            if (hintNew) hintNew.textContent = line;
            if (hintReset) hintReset.textContent = line;
        }
        if (global.PasswordPolicyUi && PasswordPolicyUi.applyMinLength) {
            PasswordPolicyUi.applyMinLength(['#ss-new-pass', '#ss-reset-new-pass'], min);
        }
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
        const target = (lastUsersList || []).find(function (u) { return u && String(u.id) === String(userId); });
        const role = target && target.role ? target.role : 'operator';
        if (global.PasswordPolicyUi && PasswordPolicyUi.loadPolicyHint) {
            PasswordPolicyUi.loadPolicyHint('ss-reset-pwd-policy-hint', role).then(function (policy) {
                syncPasswordFieldLabels(policy);
            });
        } else {
            syncPasswordFieldLabels({ minLength: 12, example: 'Ab12cd34!@#$' });
        }
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

    function resolvePillar(tab) {
        const t = String(tab || '');
        if (t === 'infrastructure' || t === 'server' || t === 'cloud') return 'infrastructure';
        if (t === 'fleet' || t === 'bwc' || t === 'firmware' || t === 'usb' || t === 'fixed' || t === 'docks') return 'fleet';
        if (t === 'security' || t === 'dashboard' || t === 'groups' || t === 'lab') return 'security';
        if (t === 'diagnostics') return 'diagnostics';
        return 'infrastructure';
    }

    function panelsForPillar(pillar) {
        const list = (PILLAR_PANELS[pillar] || ['server']).slice();
        if (pillar === 'fleet' && !canManageServer) return ['bwc'];
        if (pillar === 'infrastructure' && !canManageServer) return ['server'];
        if (pillar === 'security' && !canManageServer) return ['dashboard'];
        return list;
    }

    function updateMaintenanceNavVisibility() {
        const diag = document.getElementById('ss-main-tab-diagnostics');
        if (diag) diag.hidden = !canManageServer;
        return canManageServer;
    }

    function syncSidebarNav() {
        const pillar = resolvePillar(activeMainTab);
        PILLAR_TABS.forEach(function (id) {
            const btn = document.getElementById('ss-main-tab-' + id);
            if (btn) btn.classList.toggle('active', id === pillar);
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
        if (globalHint) globalHint.hidden = resolvePillar(tab) !== 'infrastructure';
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
        var next = resolvePillar(tab);
        if (saasDeploymentMode === 'cloud_leased' && next === 'infrastructure') next = 'fleet';
        activeMainTab = next;
        const visible = panelsForPillar(next);
        ['server', 'bwc', 'groups', 'firmware', 'dashboard', 'usb', 'diagnostics', 'lab', 'cloud', 'fixed', 'docks'].forEach(function (id) {
            const panel = document.getElementById('ss-panel-' + id);
            if (panel) panel.classList.toggle('active', visible.indexOf(id) >= 0);
        });
        syncSidebarNav();
        applyDashboardAuthLayout();
        applyFleetSubTabLayout();
        applyInfraSubTabLayout();
        var workspaceEl = document.getElementById('server-config-workspace');
        if (workspaceEl) workspaceEl.setAttribute('data-ss-pillar', next);
        if (visible.indexOf('dashboard') >= 0) {
            clearNewOperatorForm();
            if (global.VoiceAlerts && VoiceAlerts.loadPolicy) {
                VoiceAlerts.loadPolicy();
            }
        }
        if (visible.indexOf('groups') >= 0 && global.DispatchGroupsAdmin && DispatchGroupsAdmin.load) {
            DispatchGroupsAdmin.load().catch(function () { /* ignore */ });
        }
        if (visible.indexOf('firmware') >= 0 && global.FirmwareOtaAdmin && FirmwareOtaAdmin.load) {
            FirmwareOtaAdmin.load().catch(function () { /* ignore */ });
        }
        if (visible.indexOf('diagnostics') >= 0 && global.TechDiagnostics && TechDiagnostics.onTabShown) {
            TechDiagnostics.onTabShown();
            loadSiteReadiness().catch(function () { /* ignore */ });
        }
        if (visible.indexOf('lab') >= 0 && global.LabSecurity && LabSecurity.onTabShown) {
            LabSecurity.onTabShown();
        }
        if (visible.indexOf('cloud') >= 0 && global.CloudDeployment && CloudDeployment.onTabShown) {
            CloudDeployment.onTabShown();
        }
        if (visible.indexOf('usb') >= 0 && global.UsbMaintenance && UsbMaintenance.onTabShown) {
            UsbMaintenance.onTabShown();
        } else if (global.UsbMaintenance && UsbMaintenance.onTabHidden) {
            UsbMaintenance.onTabHidden();
        }
        applyPanelLayout(activeMainTab);
        if (next === 'infrastructure') {
            if (global.CloudDeployment && CloudDeployment.loadOverview) {
                CloudDeployment.loadOverview().catch(function () { /* ignore */ });
            }
        }
        const saveServer = document.getElementById('server-setup-save');
        const saveBwc = document.getElementById('ss-save-bwc-list');
        if (saveServer) saveServer.hidden = next !== 'infrastructure';
        const saveCloud = document.getElementById('cd-save');
        if (saveCloud) saveCloud.hidden = next !== 'infrastructure';
        if (saveBwc) saveBwc.hidden = next !== 'fleet' || activeFleetSubTab !== 'wireless' || !canManageServer;
        const ftpPathInput = document.getElementById('ss-ftp-upload-path');
        if (ftpPathInput) ftpPathInput.disabled = !canManageServer;
        if (next === 'fleet' && activeFleetSubTab === 'wireless' && global.BwcDevices && BwcDevices.buildEmbeddedTable) {
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
        const hostFromSidebar = hostEl && hostEl.textContent && hostEl.textContent !== '\u2014' ? hostEl.textContent : '';
        const settings = readForm();
        const host = hostFromSidebar || settings.publicHost || '\u2014';
        if (document.getElementById('ss-ftp-host') && host !== '\u2014') {
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
        if (!bwc) return '\u2014';
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
            html += '<dt>' + tr('server.checklist.yourBwcs') + '</dt><dd>' + tr('server.checklist.deviceCount', { n: deviceSummary.count }) + '</dd>';
        } else {
            html += '<dt>' + tr('server.checklist.yourBwcs') + '</dt><dd>' + tr('server.checklist.none') + '</dd>';
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
        const saveProd = document.getElementById('ss-save-production-access');
        if (saveProd) saveProd.hidden = !canManageServer;
        const trustProxyEl = document.getElementById('ss-trust-proxy');
        if (trustProxyEl) trustProxyEl.disabled = !canManageServer;
        const copyOpUrl = document.getElementById('ss-copy-operator-url');
        if (copyOpUrl) copyOpUrl.disabled = false;
        const resNode = document.getElementById('ss-resilience-node-id');
        const resPeer = document.getElementById('ss-resilience-peer-url');
        if (resNode) resNode.disabled = !canManageServer;
        if (resPeer) resPeer.disabled = !canManageServer;
        const siteTzEl = document.getElementById('ss-site-timezone');
        if (siteTzEl) siteTzEl.disabled = !canManageServer;
        const ftpPathInput = document.getElementById('ss-ftp-upload-path');
        if (ftpPathInput) ftpPathInput.disabled = !canManageServer;
        const saveBwc = document.getElementById('ss-save-bwc-list');
        if (saveBwc) saveBwc.hidden = resolvePillar(activeMainTab) !== 'fleet' || !canManageServer;
        const tabDiagnostics = document.getElementById('ss-main-tab-diagnostics');
        if (tabDiagnostics) tabDiagnostics.hidden = !canManageServer;
        if (!canManageServer && resolvePillar(activeMainTab) === 'diagnostics') {
            activeMainTab = 'infrastructure';
        }
        updateMaintenanceNavVisibility();
        if (resolvePillar(activeMainTab) === 'diagnostics') {
            const btn = document.getElementById('ss-main-tab-diagnostics');
            if (!btn || btn.hidden) activeMainTab = 'infrastructure';
        }
        syncSidebarNav();
        applyDashboardAuthLayout();
    }

    function setDashSubTab(tab) {
        if (!canManageUsers && tab !== 'me' && tab !== 'site' && tab !== 'groups' && tab !== 'lab') return;
        if (tab === 'me') activeDashSubTab = 'me';
        else if (tab === 'site') activeDashSubTab = canManageServer ? 'site' : 'add';
        else if (tab === 'users' || tab === 'operators') activeDashSubTab = canManageUsers ? 'users' : 'me';
        else if (tab === 'add') activeDashSubTab = canManageUsers ? 'add' : 'me';
        else if (tab === 'groups') activeDashSubTab = (canManageUsers || canManageServer) ? 'groups' : 'me';
        else if (tab === 'lab') activeDashSubTab = canManageServer ? 'lab' : (canManageUsers ? 'add' : 'me');
        else activeDashSubTab = canManageUsers ? 'add' : 'me';
        ['add', 'users', 'site', 'me', 'groups', 'lab'].forEach(function (id) {
            const btn = document.getElementById('ss-dash-sub-' + id);
            if (btn) btn.classList.toggle('active', id === activeDashSubTab);
        });
        applyDashboardAuthLayout();
        if (activeDashSubTab === 'me') loadMyAccount().catch(function () { /* ignore */ });
        if (activeDashSubTab === 'users') loadUsers().catch(function () { /* ignore */ });
        if (activeDashSubTab === 'groups' && global.DispatchGroupsAdmin && DispatchGroupsAdmin.load) {
            DispatchGroupsAdmin.load().catch(function () { /* ignore */ });
        }
        if (activeDashSubTab === 'lab' && global.LabSecurity && LabSecurity.onTabShown) {
            LabSecurity.onTabShown();
        }
    }

    function setFleetSubTab(tab) {
        const allowed = { wireless: 1, fixed: 1, nvr: 1, docks: 1, firmware: 1, usb: 1 };
        if (!allowed[tab]) tab = 'wireless';
        if ((tab === 'firmware' || tab === 'usb') && !canManageServer) tab = 'wireless';
        activeFleetSubTab = tab;
        applyFleetSubTabLayout();
        if (tab === 'wireless' && global.BwcDevices && BwcDevices.buildEmbeddedTable) {
            if (global.BwcDevices.refreshGroupOptions) {
                global.BwcDevices.refreshGroupOptions().then(function () {
                    BwcDevices.buildEmbeddedTable();
                }).catch(function () { BwcDevices.buildEmbeddedTable(); });
            } else {
                BwcDevices.buildEmbeddedTable();
            }
        }
        if (tab === 'firmware' && global.FirmwareOtaAdmin && FirmwareOtaAdmin.load) {
            FirmwareOtaAdmin.load().catch(function () { /* ignore */ });
        }
        if (tab === 'usb' && global.UsbMaintenance && UsbMaintenance.onTabShown) {
            UsbMaintenance.onTabShown();
        } else if (global.UsbMaintenance && UsbMaintenance.onTabHidden) {
            UsbMaintenance.onTabHidden();
        }
        if (tab === 'docks' && global.EvidenceHub && EvidenceHub.refreshDocks) {
            EvidenceHub.refreshDocks();
        }
        if (tab === 'fixed') {
            if (global.FixedCamsUi && FixedCamsUi.showInPanel) FixedCamsUi.showInPanel();
        } else if (global.FixedCamsUi && FixedCamsUi.hideInPanel) {
            FixedCamsUi.hideInPanel();
        }
        if (tab === 'nvr') {
            if (global.SettingsNvr && SettingsNvr.showInPanel) SettingsNvr.showInPanel();
        } else if (global.SettingsNvr && SettingsNvr.hideInPanel) {
            SettingsNvr.hideInPanel();
        }
        const saveBwc = document.getElementById('ss-save-bwc-list');
        if (saveBwc) saveBwc.hidden = resolvePillar(activeMainTab) !== 'fleet' || tab !== 'wireless' || !canManageServer;
    }

    function applyFleetSubTabLayout() {
        const onFleet = resolvePillar(activeMainTab) === 'fleet';
        const subtabs = document.getElementById('ss-fleet-subtabs');
        if (subtabs) subtabs.hidden = !onFleet;
        const showId = onFleet ? ({
            wireless: 'bwc',
            fixed: 'fixed',
            nvr: 'nvr',
            docks: 'docks',
            firmware: 'firmware',
            usb: 'usb',
        }[activeFleetSubTab] || 'bwc') : '';
        ['bwc', 'firmware', 'usb', 'fixed', 'nvr', 'docks'].forEach(function (id) {
            const panel = document.getElementById('ss-panel-' + id);
            if (!panel) return;
            const on = id === showId;
            panel.hidden = !on;
            panel.classList.toggle('active', on);
        });
        ['wireless', 'fixed', 'nvr', 'docks', 'firmware', 'usb'].forEach(function (id) {
            const btn = document.getElementById('ss-fleet-sub-' + id);
            if (btn) btn.classList.toggle('active', onFleet && id === activeFleetSubTab);
        });
        const fwBtn = document.getElementById('ss-fleet-sub-firmware');
        const usbBtn = document.getElementById('ss-fleet-sub-usb');
        if (fwBtn) fwBtn.hidden = !canManageServer;
        if (usbBtn) usbBtn.hidden = !canManageServer;
        const saveBwc = document.getElementById('ss-save-bwc-list');
        if (saveBwc) saveBwc.hidden = !onFleet || activeFleetSubTab !== 'wireless' || !canManageServer;
        if (!onFleet) {
            if (global.FixedCamsUi && FixedCamsUi.hideInPanel) FixedCamsUi.hideInPanel();
            if (global.SettingsNvr && SettingsNvr.hideInPanel) SettingsNvr.hideInPanel();
        }
    }

    const INFRA_TAB_SECTIONS = {
        identity: ['ss-infra-site-identity', 'ss-section-deployment', 'ss-section-site-time', 'ss-infra-verification', 'cd-entitlements'],
        network: ['ss-infra-public-access', 'ss-section-lan', 'ss-section-wan', 'ss-section-production', 'ss-section-ssl'],
        routing: ['ss-section-bwc-register', 'ss-section-operator', 'ss-section-dock-link', 'ss-section-vms-volumes', 'ss-section-protocol'],
        advanced: ['ss-section-command-displays', 'ss-phase-resiliency', 'ss-infra-firewall', 'ss-infra-notes'],
    };

    function infraPaneShell(tabId) {
        const pane = document.getElementById('ss-infra-pane-' + tabId);
        if (!pane) return null;
        return pane.querySelector('.ss-infra-pane-shell') || pane;
    }

    function pinEntitlementsCardBottom() {
        const shell = infraPaneShell('identity');
        const ent = document.getElementById('cd-entitlements');
        if (shell && ent && ent.parentNode === shell) shell.appendChild(ent);
    }

    function reorganizeInfraTabs() {
        Object.keys(INFRA_TAB_SECTIONS).forEach(function (tabId) {
            const shell = infraPaneShell(tabId);
            if (!shell) return;
            INFRA_TAB_SECTIONS[tabId].forEach(function (sectionId) {
                const el = document.getElementById(sectionId);
                if (el && el.parentNode !== shell) shell.appendChild(el);
            });
        });
        infraTabsReorganized = true;
        pinEntitlementsCardBottom();
    }

    function setInfraSubTab(tab) {
        const allowed = { identity: 1, network: 1, routing: 1, advanced: 1 };
        if (!allowed[tab]) tab = 'identity';
        activeInfraSubTab = tab;
        applyInfraSubTabLayout();
        if (tab === 'identity' && global.CloudDeployment && CloudDeployment.onTabShown) {
            CloudDeployment.onTabShown();
        }
    }

    function applyInfraSubTabLayout() {
        const onInfra = resolvePillar(activeMainTab) === 'infrastructure';
        const serverPanel = document.getElementById('ss-panel-server');
        const subtabs = document.getElementById('ss-infra-subtabs');
        const tabbed = document.getElementById('ss-infra-tabbed');
        const showInfra = onInfra && serverPanel && serverPanel.classList.contains('active');
        if (subtabs) subtabs.hidden = !showInfra;
        if (tabbed) tabbed.hidden = !showInfra;
        if (showInfra) reorganizeInfraTabs();
        ['identity', 'network', 'routing', 'advanced'].forEach(function (id) {
            const pane = document.getElementById('ss-infra-pane-' + id);
            if (pane) pane.hidden = !(showInfra && activeInfraSubTab === id);
            const btn = document.getElementById('ss-infra-sub-' + id);
            if (btn) btn.classList.toggle('active', showInfra && activeInfraSubTab === id);
        });
        const cloudPanel = document.getElementById('ss-panel-cloud');
        if (serverPanel) serverPanel.hidden = false;
        if (cloudPanel) {
            cloudPanel.hidden = true;
            cloudPanel.classList.remove('active');
        }
        if (showInfra) {
            NETWORK_SECTION_IDS.forEach(function (pid) {
                const ph = document.getElementById(pid);
                if (ph) ph.hidden = true;
            });
            pinEntitlementsCardBottom();
            if (activeInfraSubTab === 'identity' && global.CloudDeployment && CloudDeployment.onTabShown) {
                CloudDeployment.onTabShown();
            }
        } else if (serverPanel) {
            NETWORK_SECTION_IDS.forEach(function (pid) {
                const ph = document.getElementById(pid);
                if (ph) ph.hidden = false;
            });
        }
    }

    function openFleetDocks() {
        setOpen(true);
        setMainTab('fleet');
        setFleetSubTab('docks');
    }

    function applyDashboardAuthLayout() {
        const onDash = resolvePillar(activeMainTab) === 'security';
        const subtabs = document.getElementById('ss-dash-subtabs');
        const usersSection = document.getElementById('ss-users-section');
        const addSection = document.getElementById('ss-users-add-section');
        const listSection = document.getElementById('ss-users-list-section');
        const mySection = document.getElementById('ss-my-account-section');
        const siteSection = document.getElementById('ss-site-security-section');
        const voiceSection = document.getElementById('ss-voice-alerts-section');
        const smtpSection = document.getElementById('ss-smtp-section');
        const techPinSection = document.getElementById('ss-tech-pin-section');
        const tonesSection = document.getElementById('ss-alert-tones-section');
        const siteTabBtn = document.getElementById('ss-dash-sub-site');
        const addTabBtn = document.getElementById('ss-dash-sub-add');
        const usersTabBtn = document.getElementById('ss-dash-sub-users');
        const groupsTabBtn = document.getElementById('ss-dash-sub-groups');
        const labTabBtn = document.getElementById('ss-dash-sub-lab');
        const dashPanel = document.getElementById('ss-panel-dashboard');
        const groupsPanel = document.getElementById('ss-panel-groups');
        const labPanel = document.getElementById('ss-panel-lab');

        const onSite = onDash && canManageServer && activeDashSubTab === 'site';
        const onGroups = onDash && activeDashSubTab === 'groups';
        const onLab = onDash && activeDashSubTab === 'lab';
        if (siteTabBtn) siteTabBtn.hidden = !canManageServer;
        if (addTabBtn) addTabBtn.hidden = !canManageUsers;
        if (usersTabBtn) usersTabBtn.hidden = !canManageUsers;
        if (groupsTabBtn) groupsTabBtn.hidden = !(canManageUsers || canManageServer);
        if (labTabBtn) {
            labTabBtn.hidden = !canManageServer;
            labTabBtn.textContent = String(labTabBtn.textContent || '').replace(/^[\s\u00a0\u200b]+/, '').trim();
        }
        if (dashPanel) {
            const showDash = onDash && !onLab && !onGroups;
            dashPanel.hidden = !showDash;
            dashPanel.classList.toggle('active', showDash);
        }
        if (groupsPanel) {
            groupsPanel.hidden = !onGroups;
            groupsPanel.classList.toggle('active', onGroups);
        }
        if (labPanel) {
            labPanel.hidden = !onLab;
            labPanel.classList.toggle('active', onLab);
        }

        if (siteSection) siteSection.hidden = !onSite;
        if (smtpSection) smtpSection.hidden = !onSite;
        if (techPinSection) techPinSection.hidden = !onSite;
        if (voiceSection) voiceSection.hidden = !onSite;
        if (tonesSection) tonesSection.hidden = !onSite;
        if (onSite && global.PlatformSmtp && global.PlatformSmtp.load) {
            global.PlatformSmtp.load().catch(function () { /* ignore */ });
        }
        if (onSite) refreshTechPinStatus();

        if (canManageUsers || canManageServer) {
            if (subtabs) subtabs.hidden = !onDash;
        } else if (subtabs) {
            subtabs.hidden = true;
        }

        if (canManageUsers) {
            const onAddOrUsers = onDash && (activeDashSubTab === 'add' || activeDashSubTab === 'users');
            if (usersSection) usersSection.hidden = !onAddOrUsers;
            if (addSection) addSection.hidden = !onDash || activeDashSubTab !== 'add';
            if (listSection) listSection.hidden = !onDash || activeDashSubTab !== 'users';
            if (mySection) mySection.hidden = !onDash || activeDashSubTab !== 'me';
        } else {
            if (usersSection) usersSection.hidden = true;
            if (addSection) addSection.hidden = true;
            if (listSection) listSection.hidden = true;
            if (mySection) mySection.hidden = !onDash;
        }
    }

    function permYesNo(val) {
        return val ? tr('common.yes') : tr('common.no');
    }

    function permDate(val) {
        return val ? String(val).slice(0, 10) : '\u2014';
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
            + '<dt>' + tr('server.users.colEvidenceLifecycle') + '</dt><dd>' + permYesNo(p.evidenceLifecycle) + '</dd>'
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
                ? ('Device Summary \u00B7 ' + all + ' registered \u00B7 ' + wall + ' on video wall')
                : 'Device Summary \u00B7 no devices registered';
        } catch (_) {
            el.textContent = 'Device Summary';
        }
    }

    function updateDeploymentHint(mode) {
        const el = document.getElementById('ss-deployment-hint');
        if (!el) return;
        el.textContent = tr(DEPLOYMENT_HINT_KEYS[mode] || DEPLOYMENT_HINT_KEYS.lan);
    }

    function updateOperatorTlsBadge() {
        const badge = document.getElementById('ss-operator-tls-badge');
        const urlEl = document.getElementById('ss-operator-url');
        if (!badge || !urlEl) return;
        const raw = String(urlEl.value || '').trim().toLowerCase();
        badge.classList.remove('is-https', 'is-http', 'is-empty');
        if (!raw) {
            badge.classList.add('is-empty');
            badge.textContent = tr('server.tlsBadge.empty');
            return;
        }
        if (raw.indexOf('https://') === 0) {
            badge.classList.add('is-https');
            badge.textContent = tr('server.tlsBadge.https');
            return;
        }
        badge.classList.add('is-http');
        badge.textContent = tr('server.tlsBadge.http');
    }

    function syncTrustProxyCheckbox(checked) {
        const ss = document.getElementById('ss-trust-proxy');
        const lab = document.getElementById('lab-trust-proxy');
        if (ss) ss.checked = !!checked;
        if (lab) lab.checked = !!checked;
    }

    function readinessDetailToProxyUiKey(detailKey) {
        const map = {
            'server.readiness.production.passProxy': 'server.proxyReadiness.passProxy',
            'server.readiness.production.passDirect': 'server.proxyReadiness.passDirect',
            'server.readiness.production.passDirectOff': 'server.proxyReadiness.passDirectOff',
            'server.readiness.production.needTrustBehindProxy': 'server.proxyReadiness.warnNeedTrust',
            'server.readiness.production.trustOnWithoutHttps': 'server.proxyReadiness.warnTrustHttp',
            'server.readiness.production.https': 'server.proxyReadiness.warnHttps',
        };
        return map[detailKey] || detailKey;
    }

    function renderProxyReadiness(readiness) {
        const el = document.getElementById('ss-proxy-readiness');
        if (!el) return;
        if (!readiness || !readiness.detailKey) {
            el.className = 'ss-proxy-readiness';
            el.innerHTML = '';
            return;
        }
        const ok = readiness.status === 'ok';
        const label = ok
            ? tr('server.proxyReadiness.passLabel')
            : tr('server.proxyReadiness.warnLabel');
        const detail = tr(readinessDetailToProxyUiKey(readiness.detailKey));
        el.className = 'ss-proxy-readiness ' + (ok ? 'is-pass' : 'is-warn');
        el.innerHTML = '<strong>' + esc(label) + '</strong>' + esc(detail);
    }

    async function loadProductionAccess() {
        const status = document.getElementById('ss-production-access-status');
        try {
            const result = global.OperatorUI && OperatorUI.fetchOpJson
                ? await OperatorUI.fetchOpJson('/api/production-access', { credentials: 'same-origin' }, 'server.productionAccess.loadFailed')
                : null;
            if (result) {
                if (!result.ok) {
                    if (status) {
                        status.className = 'setup-hint is-error';
                        status.textContent = opMsg(result.data, result._err, result.errorKey);
                    }
                    return;
                }
                syncTrustProxyCheckbox(!!result.data.trustProxy);
                renderProxyReadiness(result.data.readiness);
                if (status) {
                    status.className = 'setup-hint';
                    status.textContent = '';
                }
                return;
            }
            const res = await fetch('/api/production-access', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            syncTrustProxyCheckbox(!!data.trustProxy);
            renderProxyReadiness(data.readiness);
            if (status) {
                status.className = 'setup-hint';
                status.textContent = '';
            }
        } catch (err) {
            console.warn('[production-access]', err);
            if (status) {
                status.className = 'setup-hint is-error';
                status.textContent = opMsg(null, err, 'server.productionAccess.loadFailed');
            }
        }
    }

    async function saveProductionAccess() {
        if (!canManageServer) return;
        const status = document.getElementById('ss-production-access-status');
        const trustEl = document.getElementById('ss-trust-proxy');
        const saveBtn = document.getElementById('ss-save-production-access');
        if (saveBtn) saveBtn.disabled = true;
        if (status) {
            status.className = 'setup-hint';
            status.textContent = tr('common.saving') || 'Saving\u2026';
        }
        try {
            const body = { trustProxy: !!(trustEl && trustEl.checked) };
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify(body)
                : body;
            const res = await fetch('/api/production-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            const on = !!data.trustProxy;
            syncTrustProxyCheckbox(on);
            renderProxyReadiness(data.readiness);
            if (status) {
                status.className = 'setup-hint is-saved';
                status.textContent = on
                    ? tr('server.productionAccess.savedOn')
                    : tr('server.productionAccess.savedOff');
            }
            loadSiteReadiness();
            setTimeout(function () {
                if (!status) return;
                const keepOn = tr('server.productionAccess.savedOn');
                const keepOff = tr('server.productionAccess.savedOff');
                if (status.textContent === keepOn || status.textContent === keepOff) {
                    status.className = 'setup-hint';
                    status.textContent = '';
                }
            }, 8000);
        } catch (err) {
            if (status) {
                status.className = 'setup-hint is-error';
                status.textContent = opMsg(err.opPayload || err.catalogPayload, err, 'server.productionAccess.saveFailed');
            }
        } finally {
            if (saveBtn) saveBtn.disabled = !canManageServer;
        }
    }

    function renderSiteReadiness(readiness) {
        const el = document.getElementById('ss-site-readiness');
        if (!el) return;
        lastSiteReadiness = readiness || null;
        if (!readiness) {
            el.innerHTML = '';
            return;
        }
        const pct = readiness.readyPct || 0;
        let rows = '';
        (readiness.items || []).forEach(function (item) {
            const status = item.status || 'fail';
            const rowCls = status === 'ok' ? ' ok' : (status === 'warn' ? ' warn' : '');
            const label = tr(item.labelKey);
            const detail = tr(item.detailKey, item.detailParams || {});
            rows +=
                '<div class="lab-readiness-row' + rowCls + ' ss-readiness-row" data-ss-readiness-id="' + esc(item.id) + '" role="button" tabindex="0">' +
                '<span class="lab-readiness-dot" aria-hidden="true"></span>' +
                '<div class="ss-readiness-row-body"><strong>' + esc(label) + '</strong>' +
                '<p class="setup-hint" style="margin:2px 0 0">' + esc(detail) + '</p></div>' +
                '<span class="ss-readiness-fix">' + esc(tr('server.readiness.fix')) + '</span></div>';
        });
        el.innerHTML =
            '<div class="lab-readiness-score"><strong>' + pct + '%</strong> ' +
            esc(tr('server.readiness.score')) + ' (' +
            esc(String(readiness.score)) + '/' + esc(String(readiness.total)) + ')</div>' +
            '<div class="lab-readiness-bar"><span style="width:' + pct + '%"></span></div>' +
            rows;
    }

    function followReadinessLink(link) {
        if (!link) return;
        if (link.action === 'openAudit') {
            if (global.EvidenceManager && EvidenceManager.showTab) {
                EvidenceManager.showTab('audit-trail');
            }
            return;
        }
        if (link.action === 'evidenceStorage') {
            openEvidenceStorage();
            return;
        }
        if (link.tab && link.tab !== activeMainTab) setMainTab(link.tab);
        if (link.dashSub) setDashSubTab(link.dashSub);
        if (link.section) {
            window.setTimeout(function () { scrollToNetworkSection(link.section); }, link.tab ? 120 : 0);
        }
    }

    async function loadSiteReadiness() {
        if (!canManageServer) return;
        const el = document.getElementById('ss-site-readiness');
        if (!el) return;
        try {
            const result = global.OperatorUI && OperatorUI.fetchOpJson
                ? await OperatorUI.fetchOpJson('/api/site-readiness', { credentials: 'same-origin' }, 'server.readiness.loadFailed')
                : null;
            if (result) {
                if (!result.ok) {
                    el.innerHTML = '<p class="setup-hint">' + esc(opMsg(result.data, result._err, result.errorKey)) + '</p>';
                    return;
                }
                renderSiteReadiness(result.data.readiness);
                return;
            }
            const res = await fetch('/api/site-readiness', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            renderSiteReadiness(data.readiness);
        } catch (err) {
            console.warn('[site-readiness]', err);
            el.innerHTML = '<p class="setup-hint">' + esc(opMsg(null, err, 'server.readiness.loadFailed')) + '</p>';
        }
    }

    async function copyOperatorPortalUrl() {
        const urlEl = document.getElementById('ss-operator-url');
        const status = document.getElementById('ss-production-access-status');
        const url = urlEl ? String(urlEl.value || '').trim() : '';
        if (!url) {
            alert(tr('server.copyOperatorUrl.empty'));
            return;
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                urlEl.focus();
                urlEl.select();
                document.execCommand('copy');
            }
            if (status) {
                status.textContent = tr('server.copyOperatorUrl.done');
                setTimeout(function () {
                    if (status && status.textContent === tr('server.copyOperatorUrl.done')) status.textContent = '';
                }, 2500);
            }
        } catch (err) {
            alert(tr('server.copyOperatorUrl.failed'));
        }
    }

    function updateDeploymentSections(mode) {
        const lan = document.getElementById('ss-section-lan');
        const wan = document.getElementById('ss-section-wan');
        if (lan) lan.hidden = mode === 'cloud' || saasDeploymentMode === 'cloud_leased';
        if (wan) wan.hidden = mode === 'lab' || saasDeploymentMode === 'cloud_leased';
        updateNetworkSectionNav();
    }

    /**
     * SaaS dual mode: cloud_leased hides Server / Network / Inbound infra chrome.
     * Flag from GET /api/server-settings → DEPLOYMENT_MODE (env or license).
     */
    function applySaasDeploymentChrome(mode) {
        const next = String(mode || 'on_prem').toLowerCase().replace(/-/g, '_');
        saasDeploymentMode = (next === 'cloud_leased') ? 'cloud_leased' : 'on_prem';
        const panel = document.getElementById('server-setup-panel');
        if (panel) panel.setAttribute('data-deployment-mode', saasDeploymentMode);

        document.querySelectorAll('[data-ss-saas-hide="cloud_leased"]').forEach(function (el) {
            const hide = saasDeploymentMode === 'cloud_leased';
            if (hide) {
                el.hidden = true;
                el.setAttribute('hidden', '');
            } else if (el.id === 'ss-main-tab-infrastructure' || el.id === 'ss-panel-server'
                || el.classList.contains('ss-inbound-checklist-card')
                || el.getAttribute('data-ss-section') === 'ss-section-lan'
                || el.getAttribute('data-ss-section') === 'ss-section-wan'
                || el.id === 'ss-section-lan'
                || el.id === 'ss-section-wan') {
                /* LAN/WAN may stay hidden via updateDeploymentSections — only clear SaaS hide */
                if (el.id === 'ss-main-tab-infrastructure' || el.id === 'ss-panel-server'
                    || el.classList.contains('ss-inbound-checklist-card')) {
                    el.hidden = false;
                    el.removeAttribute('hidden');
                }
            }
        });

        document.querySelectorAll('[data-ss-saas-onprem-only="1"]').forEach(function (el) {
            const show = saasDeploymentMode === 'on_prem';
            el.hidden = !show;
            if (show) el.removeAttribute('hidden');
            else el.setAttribute('hidden', '');
        });

        if (saasDeploymentMode === 'cloud_leased' && resolvePillar(activeMainTab) === 'infrastructure') {
            setMainTab('fleet');
        }
        if (saasDeploymentMode === 'on_prem') {
            updateDeploymentSections(lastDeploymentMode);
        }
        updateNetworkSectionNav();
        syncSidebarNav();
        updateMaintenanceNavVisibility();
    }

    function resolveSaasDeploymentMode(data) {
        if (!data) return 'on_prem';
        if (data.saasDeployment && data.saasDeployment.deploymentMode) {
            return data.saasDeployment.deploymentMode;
        }
        if (data.DEPLOYMENT_MODE) return data.DEPLOYMENT_MODE;
        if (data.deploymentMode === 'cloud_leased' || data.deploymentMode === 'on_prem') {
            return data.deploymentMode;
        }
        return 'on_prem';
    }

    function bindSslScaffold() {
        const cert = document.getElementById('ss-ssl-cert');
        const key = document.getElementById('ss-ssl-key');
        const status = document.getElementById('ss-ssl-status');
        function refreshSslStatus() {
            if (!status) return;
            const cName = cert && cert.files && cert.files[0] ? cert.files[0].name : '';
            const kName = key && key.files && key.files[0] ? key.files[0].name : '';
            if (!cName && !kName) {
                status.textContent = '';
                return;
            }
            status.textContent = tr('server.ssl.selected', {
                cert: cName || '—',
                key: kName || '—',
            });
            if (status.textContent === 'server.ssl.selected') {
                status.textContent = 'Selected: ' + (cName || '—') + ' / ' + (kName || '—')
                    + ' (upload save comes in a later MOB)';
            }
        }
        if (cert && !cert._sslBound) {
            cert._sslBound = true;
            cert.addEventListener('change', refreshSslStatus);
        }
        if (key && !key._sslBound) {
            key._sslBound = true;
            key.addEventListener('change', refreshSslStatus);
        }
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
                if (resolvePillar(activeMainTab) === 'infrastructure') syncNetworkSectionNavHighlight();
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
            updateOperatorTlsBadge();
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
        el.textContent = tr('server.siteTimezoneHint', { sample }) + ' \u00B7 ' + tz;
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
            return '\u2014';
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

    function openCommandWallFromSettings() {
        setOpen(false);
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('command-wall', { panel: 'display' });
            return;
        }
        window.open('/command-wall.html', 'mobility-command-wall', 'noopener,noreferrer');
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
        updateOperatorTlsBadge();
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
        if (hostEl) hostEl.textContent = s.publicHost || '\u2014';
        const displayOperatorEl = document.getElementById('display-operator-url');
        if (displayOperatorEl) displayOperatorEl.textContent = dep.operatorUrl || s.publicHost || '\u2014';
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
        const help = document.getElementById('server-help-about-workspace');
        if (help) help.hidden = true;
        if (home) home.hidden = !!open;
        if (workspace) workspace.hidden = !open;
        if (open) {
            loadLayoutPref();
            applyPanelLayout(activeMainTab);
        } else {
            if (global.SettingsHub && SettingsHub.onShow) SettingsHub.onShow();
        }
    }

    /** Expand Ops video-wall drawer so VideoConfig overlay is visible (same KEY as drawer init). */
    function expandOpsVideoWallDrawer() {
        const stage = document.getElementById('center-stage');
        if (!stage) return;
        stage.classList.remove('video-wall-collapsed');
        try { localStorage.setItem('mobility-video-wall-collapsed', '0'); } catch (_) { /* ignore */ }
        const btn = document.getElementById('video-wall-collapse-toggle');
        if (btn) {
            btn.textContent = '\u25B6';
            btn.setAttribute('aria-expanded', 'true');
            btn.title = 'Hide video panels';
            btn.setAttribute('aria-label', btn.title);
        }
        try { window.dispatchEvent(new Event('resize')); } catch (_) { /* ignore */ }
    }

    /** Settings BWCs → honest panel assign (not live wall / Command Wall). */
    function openWallPanelAssignFromSettings() {
        setOpen(false);
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('ops');
        }
        expandOpsVideoWallDrawer();
        const openAssign = function () {
            if (global.VideoConfig && VideoConfig.openPanel) VideoConfig.openPanel();
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () { requestAnimationFrame(openAssign); });
        } else {
            setTimeout(openAssign, 50);
        }
    }

    function permAllBadge() {
        return '<span class="ss-perm-badge-all">' + esc(tr('server.users.permAll')) + '</span>';
    }

    /** Matches lib/dispatchScope.scopeForUser \u2014 all stations = super_admin / see-all; else assigned only. */
    function userIsAllStationsScope(u) {
        if (!u) return false;
        if (u.role === 'super_admin') return true;
        const perms = u.permissions || {};
        if (perms.seeAllDispatchGroups) return true;
        if (u.assignedGroupIds === undefined || u.assignedGroupIds === null) return true;
        return false;
    }

    function hierarchyScopeBadgeHtml(u) {
        if (userIsAllStationsScope(u)) {
            return '<span class="ss-scope-badge ss-scope-all" title="' + esc(tr('server.users.scopeCorporateHint')) + '">'
                + esc(tr('server.users.scopeCorporate')) + '</span>';
        }
        return '<span class="ss-scope-badge ss-scope-station" title="' + esc(tr('server.users.scopeStationHint')) + '">'
            + esc(tr('server.users.scopeStation')) + '</span>';
    }

    /** USERS-AUTHORITY-FILTER-V1 — search blob for username / name / contact / id / group names. */
    function userFilterSearchBlob(u) {
        const parts = [
            u && u.username,
            u && u.displayName,
            u && u.contactNote,
            u && u.id,
        ];
        const ids = (u && u.assignedGroupIds) || [];
        const groups = cachedDispatchGroups || [];
        ids.forEach(function (gid) {
            const g = groups.find(function (x) { return x && String(x.id) === String(gid); });
            if (g && g.name) parts.push(g.name);
            parts.push(gid);
        });
        return parts.filter(Boolean).join(' ').toLowerCase();
    }

    function applyUsersListFilter() {
        const listRoot = document.getElementById('ss-users-body');
        const emptyEl = document.getElementById('ss-users-filter-empty');
        if (!listRoot) return;
        const qEl = document.getElementById('ss-users-filter-q');
        const roleEl = document.getElementById('ss-users-filter-role');
        const scopeEl = document.getElementById('ss-users-filter-scope');
        const q = String(qEl && qEl.value || '').trim().toLowerCase();
        const role = String(roleEl && roleEl.value || '');
        const scope = String(scopeEl && scopeEl.value || '');
        const rows = listRoot.querySelectorAll('tr[data-user-id]');
        let visible = 0;
        rows.forEach(function (row) {
            const roleOk = !role || row.getAttribute('data-role') === role;
            const scopeOk = !scope || row.getAttribute('data-scope') === scope;
            const hay = String(row.getAttribute('data-search') || '');
            const qOk = !q || hay.indexOf(q) !== -1;
            const show = roleOk && scopeOk && qOk;
            row.hidden = !show;
            if (show) visible += 1;
        });
        if (emptyEl) emptyEl.hidden = !(rows.length > 0 && visible === 0);
    }

    function bindUsersListFilter() {
        if (bindUsersListFilter._bound) return;
        const qEl = document.getElementById('ss-users-filter-q');
        const roleEl = document.getElementById('ss-users-filter-role');
        const scopeEl = document.getElementById('ss-users-filter-scope');
        if (!qEl && !roleEl && !scopeEl) return;
        bindUsersListFilter._bound = true;
        const run = function () { applyUsersListFilter(); };
        if (qEl) {
            qEl.addEventListener('input', run);
            qEl.addEventListener('search', run);
        }
        if (roleEl) roleEl.addEventListener('change', run);
        if (scopeEl) scopeEl.addEventListener('change', run);
    }

    function permCheck(className, checked) {
        return '<label class="ss-perm-check"><input type="checkbox" class="' + className + '"' + (checked ? ' checked' : '') + '></label>';
    }

    function permCheckLabeled(className, checked, labelText) {
        return '<label class="ss-perm-check"><input type="checkbox" class="' + className + '"'
            + (checked ? ' checked' : '') + '><span class="ss-perm-slider" aria-hidden="true"></span><span>'
            + esc(labelText) + '</span></label>';
    }

    function permField(isSuper, className, checked, labelKey) {
        const labelText = tr(labelKey);
        return '<div class="ss-perm-col">' + permCheckLabeled(className, isSuper ? true : !!checked, labelText) + '</div>';
    }

    function permKillSwitchField(checked) {
        return '<div class="ss-perm-col">'
            + permCheckLabeled('ss-user-kill-switch', !!checked, tr('server.users.colKillSwitch'))
            + '</div>';
    }

    function closestUserRow(el) {
        return el && el.closest ? el.closest('[data-user-id]') : null;
    }

    function dispatchGroupPinColor(g) {
        const c = g && g.color != null ? String(g.color).trim() : '';
        if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
        return '#22c55e';
    }

    function renderDispatchGroupsCell(u) {
        /* Super admin: All badge only — no station-group checklist. */
        if (u.role === 'super_admin') {
            return '<div class="ss-dispatch-cell ss-dispatch-cell--super">' + permAllBadge() + '</div>';
        }
        /* Operator: assign by live Map group colour + name (no hardcoded chips). */
        const perms = u.permissions || {};
        const assigned = new Set(u.assignedGroupIds || []);
        const seeAll = !!perms.seeAllDispatchGroups;
        const seeAllLabel = tr('server.users.seeAllGroups');
        let html = '<div class="ss-dispatch-cell ss-dispatch-cell--operator">'
            + '<label class="ss-dispatch-row ss-dispatch-see-all">'
            + '<input type="checkbox" class="ss-user-see-all-groups"' + (seeAll ? ' checked' : '') + '>'
            + '<span class="ss-dispatch-row-text">' + esc(seeAllLabel) + '</span></label>';
        if (!cachedDispatchGroups.length) {
            html += '<span class="setup-hint">' + tr('server.users.noGroupsYet') + '</span></div>';
            return html;
        }
        html += '<div class="ss-user-dispatch-grps"' + (seeAll ? ' hidden' : '') + '>'
            + '<div class="ss-dispatch-head">'
            + '<span class="ss-dispatch-section-title">' + esc(tr('server.users.dispatchAssignLabel')) + '</span>'
            + '<button type="button" class="ss-dispatch-jump-groups">'
            + esc(tr('server.users.jumpToMapGroups')) + '</button>'
            + '</div>'
            + '<div class="ss-dispatch-chips">';
        cachedDispatchGroups.forEach(function (g) {
            if (!g || !g.id) return;
            const pin = dispatchGroupPinColor(g);
            const name = g.name || g.id;
            html += '<label class="ss-dispatch-row ss-dispatch-chip">'
                + '<input type="checkbox" class="ss-user-dispatch-grp" value="'
                + esc(g.id) + '"' + (assigned.has(g.id) ? ' checked' : '') + (seeAll ? ' disabled' : '') + '>'
                + '<span class="ss-group-dot ss-dispatch-pin" style="background:' + esc(pin) + '" aria-hidden="true"></span>'
                + '<span class="ss-dispatch-row-text">' + esc(name) + '</span></label>';
        });
        html += '</div></div></div>';
        return html;
    }

    function permAcc(title, innerHtml) {
        return '<details class="ss-user-acc" open><summary><span>' + esc(title)
            + '</span><span class="ss-user-acc-hint"></span></summary><div class="ss-user-acc-body">'
            + '<label class="ss-perm-check ss-perm-select-all-row"><input type="checkbox" class="ss-user-perm-select-all">'
            + '<span class="ss-perm-slider" aria-hidden="true"></span><span>'
            + esc(tr('common.selectAll') || 'Select all') + '</span></label>'
            + innerHtml + '</div></details>';
    }

    function clearOpenUserRow() {
        const listRoot = document.getElementById('ss-users-body');
        if (!listRoot) return;
        listRoot.querySelectorAll('tr.ss-user-row-open').forEach(function (r) {
            r.classList.remove('ss-user-row-open');
        });
    }

    function markOpenUserRow(userId) {
        clearOpenUserRow();
        if (!userId) return;
        const row = document.querySelector('#ss-users-body tr[data-user-id="' + userId + '"]');
        if (row) row.classList.add('ss-user-row-open');
    }

    function syncPermSelectAll(acc) {
        if (!acc) return;
        const master = acc.querySelector('.ss-user-perm-select-all');
        const boxes = acc.querySelectorAll('.ss-user-acc-body input[type="checkbox"]:not(.ss-user-perm-select-all)');
        if (!master || !boxes.length) return;
        let n = 0;
        boxes.forEach(function (cb) { if (cb.checked) n += 1; });
        master.checked = n === boxes.length;
        master.indeterminate = n > 0 && n < boxes.length;
    }

    function closeUserDrawer() {
        const drawer = document.getElementById('ss-user-drawer');
        if (drawer) drawer.hidden = true;
        const panel = document.getElementById('ss-user-drawer-panel');
        if (panel) {
            panel.removeAttribute('data-user-id');
            panel.removeAttribute('data-username');
        }
        clearOpenUserRow();
    }

    function renderUserDrawerInner(u) {
        const isSuper = u.role === 'super_admin';
        const perms = u.permissions || {};
        const roleLabel = isSuper ? tr('role.superAdmin') : tr('role.operator');
        const signInFromVal = (!isSuper && perms.signInStartsAt) ? String(perms.signInStartsAt).slice(0, 10) : '';
        const signInVal = (!isSuper && perms.signInExpiresAt) ? String(perms.signInExpiresAt).slice(0, 10) : '';
        const expVal = (!isSuper && perms.evidenceDownloadExpiresAt) ? String(perms.evidenceDownloadExpiresAt).slice(0, 10) : '';
        const dashCell = isSuper
            ? '<span class="ss-perm-na">\u2014</span>'
            : ('<input type="date" class="ss-user-signin-from enterprise-form-control"'
                + (signInFromVal ? ' value="' + esc(signInFromVal) + '"' : '') + '>');
        const signInCell = isSuper
            ? '<span class="ss-perm-na">\u2014</span>'
            : ('<input type="date" class="ss-user-signin-exp enterprise-form-control"'
                + (signInVal ? ' value="' + esc(signInVal) + '"' : '') + '>');
        const expCell = isSuper
            ? '<span class="ss-perm-na">\u2014</span>'
            : ('<input type="date" class="ss-user-evidence-exp enterprise-form-control"'
                + (expVal ? ' value="' + esc(expVal) + '"' : '') + '>');
        const identity = '<div class="enterprise-form-grid ss-user-drawer-grid">'
            + '<label><span>' + esc(tr('server.users.loginUsername') || 'Username') + '</span>'
            + '<input type="text" class="ss-user-username enterprise-form-control" autocomplete="off" spellcheck="false" value="' + esc(u.username) + '"></label>'
            + '<label><span>' + esc(tr('server.users.displayName')) + '</span>'
            + '<input type="text" class="ss-user-display-name enterprise-form-control" autocomplete="off" value="'
            + esc(u.displayName || '') + '"></label>'
            + '<label><span>' + esc(tr('server.users.colRole')) + '</span>'
            + '<select class="enterprise-form-control" disabled>'
            + '<option selected>' + esc(roleLabel) + '</option></select></label>'
            + '<label><span>' + esc(tr('server.users.contactNote')) + '</span>'
            + '<input type="text" class="ss-user-contact-note enterprise-form-control" autocomplete="off" value="'
            + esc(u.contactNote || '') + '"></label>'
            + '<label class="' + (isSuper ? 'ss-perm-col ss-perm-all' : 'ss-dispatch-grps-col') + '">'
            + '<span>' + esc(tr('server.users.filterScope')) + '</span>'
            + renderDispatchGroupsCell(u) + '</label>'
            + '<label><span>' + esc(tr('server.users.colSignInFrom')) + '</span>' + dashCell + '</label>'
            + '<label><span>' + esc(tr('server.users.colSignInExpiry')) + '</span>' + signInCell + '</label>'
            + '<label><span>' + esc(tr('server.users.colExpiry')) + '</span>' + expCell + '</label>'
            + '</div>';
        const acc = permAcc('Operations',
                permField(isSuper, 'ss-user-map-control', perms.mapDeviceControl, 'server.users.colRemoteControl')
                + permKillSwitchField(perms.deviceKillSwitch)
                + permField(isSuper, 'ss-user-geofence', perms.geofenceControl, 'server.users.colGeofence')
                + permField(isSuper, 'ss-user-clear-map-pins', perms.clearMapPins, 'server.users.colClearMapPins')
                + permField(isSuper, 'ss-user-overlay-view', perms.overlayView || perms.overlayEdit, 'server.users.colOverlayView')
                + permField(isSuper, 'ss-user-overlay-edit', perms.overlayEdit, 'server.users.colOverlayEdit'))
            + permAcc('Tactical',
                permField(isSuper, 'ss-user-ai-alerts', perms.aiAlerts, 'server.users.colAiAlerts')
                + permField(isSuper, 'ss-user-tactical-view', perms.tacticalView, 'server.users.colTacticalView')
                + permField(isSuper, 'ss-user-blueprint-manage', perms.blueprintManage, 'server.users.colBlueprintManage'))
            + permAcc('Evidence',
                permField(isSuper, 'ss-user-evidence-view', perms.evidenceView || perms.evidenceDownload, 'server.users.colEvidenceView')
                + permField(isSuper, 'ss-user-evidence-dl', perms.evidenceDownload, 'server.users.colEvidence')
                + permField(isSuper, 'ss-user-evidence-export', perms.evidenceExport, 'server.users.colEvidenceExport')
                + permField(isSuper, 'ss-user-evidence-edit', perms.evidenceEdit, 'server.users.colEvidenceEdit')
                + permField(isSuper, 'ss-user-evidence-lifecycle', perms.evidenceLifecycle, 'server.users.colEvidenceLifecycle')
                + permField(isSuper, 'ss-user-dock-admin', perms.dockAdmin, 'server.users.colDockAdmin'))
            + permAcc('Video Conference',
                permField(isSuper, 'ss-user-conference-view', perms.conferenceView || perms.conferenceJoin, 'server.users.colConferenceView')
                + permField(isSuper, 'ss-user-conference-join', perms.conferenceJoin, 'server.users.colConferenceJoin')
                + permField(isSuper, 'ss-user-conference-host', perms.conferenceHost, 'server.users.colConferenceHost')
                + permField(isSuper, 'ss-user-conference-record', perms.conferenceRecord, 'server.users.colConferenceRecord')
                + permField(isSuper, 'ss-user-conference-bwc', perms.conferenceBwcShare, 'server.users.colConferenceBwc')
                + permField(isSuper, 'ss-user-conference-cross', perms.conferenceCrossGroup, 'server.users.colConferenceCross'));
        return identity + acc;
    }

    function openUserDrawer(userId) {
        const u = (lastUsersList || []).find(function (x) { return x && x.id === userId; });
        const drawer = document.getElementById('ss-user-drawer');
        const panel = document.getElementById('ss-user-drawer-panel');
        const body = document.getElementById('ss-user-drawer-body');
        const title = document.getElementById('ss-user-drawer-title');
        if (!u || !drawer || !panel || !body) return;
        panel.setAttribute('data-user-id', u.id);
        panel.setAttribute('data-username', u.username);
        panel.setAttribute('data-role', u.role === 'super_admin' ? 'super_admin' : 'operator');
        const isSuper = u.role === 'super_admin';
        const roleLabel = isSuper ? tr('role.superAdmin') : tr('role.operator');
        if (title) title.textContent = (u.username || 'Configure');
        const roleEl = document.getElementById('ss-user-drawer-role');
        if (roleEl) {
            roleEl.hidden = false;
            roleEl.textContent = roleLabel;
            roleEl.setAttribute('data-role', isSuper ? 'super_admin' : 'operator');
        }
        body.innerHTML = renderUserDrawerInner(u);
        body.scrollTop = 0;
        markOpenUserRow(u.id);
        body.querySelectorAll('.ss-user-acc').forEach(syncPermSelectAll);
        const rm = panel.querySelector('.ss-user-remove');
        if (rm) rm.hidden = u.role === 'super_admin';
        drawer.hidden = false;
        wireUserDatePickers(body);
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
        lastUsersList = data.users || [];
        const listRoot = document.getElementById('ss-users-body');
        if (!listRoot) return;
        listRoot.innerHTML = (data.users || []).map(function (u) {
            const isSuper = u.role === 'super_admin';
            const roleLabel = isSuper ? tr('role.superAdmin') : tr('role.operator');
            const stations = userIsAllStationsScope(u)
                ? tr('server.users.scopeCorporate')
                : tr('server.users.scopeStation');
            return '<tr data-user-id="' + esc(u.id) + '" data-username="' + esc(u.username)
                + '" data-role="' + esc(isSuper ? 'super_admin' : 'operator')
                + '" data-scope="' + (userIsAllStationsScope(u) ? 'all' : 'assigned')
                + '" data-search="' + esc(userFilterSearchBlob(u)) + '">'
                + '<td>' + esc(u.username) + '</td>'
                + '<td>' + esc(u.displayName || '\u2014') + '</td>'
                + '<td>' + esc(roleLabel) + '</td>'
                + '<td>' + esc(stations) + '</td>'
                + '<td><button type="button" class="btn btn-action btn-sm ss-user-configure">Configure</button></td>'
                + '</tr>';
        }).join('');
        bindUsersListFilter();
        applyUsersListFilter();
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
        const listRoot = document.getElementById('ss-users-body');
        if (!listRoot || !username) return;
        const row = Array.from(listRoot.querySelectorAll('[data-username]')).find(function (r) {
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
        const evLifeEl = row.querySelector('.ss-user-evidence-lifecycle');
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
            overlayView: !!(row.querySelector('.ss-user-overlay-view') && row.querySelector('.ss-user-overlay-view').checked),
            overlayEdit: !!(row.querySelector('.ss-user-overlay-edit') && row.querySelector('.ss-user-overlay-edit').checked),
            tacticalView: !!(row.querySelector('.ss-user-tactical-view') && row.querySelector('.ss-user-tactical-view').checked),
            aiAlerts: !!(row.querySelector('.ss-user-ai-alerts') && row.querySelector('.ss-user-ai-alerts').checked),
            blueprintManage: !!(row.querySelector('.ss-user-blueprint-manage') && row.querySelector('.ss-user-blueprint-manage').checked),
            evidenceView: !!(evViewEl && evViewEl.checked),
            evidenceTriageAccess: (function () {
                var prev = (lastUsersList || []).find(function (u) { return u && u.id === (row.getAttribute('data-user-id') || ''); });
                return !!(prev && prev.permissions && prev.permissions.evidenceTriageAccess);
            })(),
            evidenceDownload: !!(evEl && evEl.checked),
            evidenceExport: !!(evExportEl && evExportEl.checked),
            evidenceEdit: !!(evEditEl && evEditEl.checked),
            evidenceLifecycle: !!(evLifeEl && evLifeEl.checked),
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

    function readRowProfile(row) {
        if (!row) return {};
        const userEl = row.querySelector('.ss-user-username');
        const displayEl = row.querySelector('.ss-user-display-name');
        const contactEl = row.querySelector('.ss-user-contact-note');
        return {
            username: userEl ? String(userEl.value || '').trim() : '',
            displayName: displayEl ? String(displayEl.value || '').trim() : '',
            contactNote: contactEl ? String(contactEl.value || '').trim() : '',
        };
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
                localEl.textContent = 'OK \u2014 ' + (data.uptimeSec || 0) + 's';
                localEl.className = 'ss-resilience-ok';
            }
            if (peerStatEl) {
                if (!data.peerUrl) {
                    peerStatEl.textContent = '\u2014';
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
                    syncPasswordFieldLabels(policy);
                }
            });
        }
        const newRoleEl = document.getElementById('ss-new-role');
        if (newRoleEl && global.PasswordPolicyUi && !newRoleEl._policyBound) {
            newRoleEl._policyBound = true;
            const syncNewUserMin = function () {
                PasswordPolicyUi.loadPolicyHint('ss-new-pass-policy-hint', newRoleEl.value || 'operator').then(function (policy) {
                    syncPasswordFieldLabels(policy);
                });
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
        applySaasDeploymentChrome(resolveSaasDeploymentMode(data));
        applyReadOnlyMode();
    }

    function clearTabExtrasCache() {
        Object.keys(tabExtrasLoaded).forEach(function (k) { delete tabExtrasLoaded[k]; });
    }

    async function loadTabExtras(tab, opts) {
        opts = opts || {};
        const force = !!opts.force;
        tab = resolvePillar(tab || activeMainTab);
        const tasks = [];
        if (tab === 'infrastructure' && (force || !tabExtrasLoaded.server)) {
            tabExtrasLoaded.server = true;
            tasks.push(loadSiteResilience());
            tasks.push(loadProductionAccess());
            tasks.push(refreshDeviceSummary());
            tasks.push(loadDockFolder().then(fillDockPanel));
        }
        if (tab === 'fleet' && (force || !tabExtrasLoaded.bwc)) {
            tabExtrasLoaded.bwc = true;
            tasks.push((async function () {
                if (global.BwcDevices && BwcDevices.buildEmbeddedTable) BwcDevices.buildEmbeddedTable();
            })());
        }
        if (tab === 'security' && (force || !tabExtrasLoaded.dashboard)) {
            tabExtrasLoaded.dashboard = true;
            if (canManageUsers) {
                tasks.push(loadUsers().catch(function () { /* ignore */ }));
            } else {
                tasks.push(loadMyAccount().catch(function () { /* ignore */ }));
            }
        }
        if (tab === 'diagnostics' && (force || !tabExtrasLoaded.diagnostics)) {
            tabExtrasLoaded.diagnostics = true;
            tasks.push(loadSiteReadiness());
        }
        if (!tasks.length) return;
        await Promise.all(tasks);
        if (tab === 'security') applyDashboardAuthLayout();
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
        activeMainTab = resolvePillar(mainTab || 'infrastructure');
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
        bindSslScaffold();
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
            updateOperatorTlsBadge();
        });
        const copyOpBtn = document.getElementById('ss-copy-operator-url');
        if (copyOpBtn) copyOpBtn.addEventListener('click', function () { copyOperatorPortalUrl(); });
        const refreshReadinessBtn = document.getElementById('ss-refresh-readiness');
        if (refreshReadinessBtn) refreshReadinessBtn.addEventListener('click', function () {
            loadSiteReadiness();
            loadProductionAccess();
        });
        const saveProdBtn = document.getElementById('ss-save-production-access');
        if (saveProdBtn) saveProdBtn.addEventListener('click', function () { saveProductionAccess(); });
        const readinessRoot = document.getElementById('ss-site-readiness');
        if (readinessRoot && !readinessRoot._ssBound) {
            readinessRoot._ssBound = true;
            readinessRoot.addEventListener('click', function (e) {
                const row = e.target.closest('[data-ss-readiness-id]');
                if (!row || !lastSiteReadiness) return;
                const id = row.getAttribute('data-ss-readiness-id');
                const item = (lastSiteReadiness.items || []).find(function (it) { return it.id === id; });
                if (item && item.link) followReadinessLink(item.link);
            });
            readinessRoot.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const row = e.target.closest('[data-ss-readiness-id]');
                if (!row) return;
                e.preventDefault();
                row.click();
            });
        }
        document.getElementById('ss-main-tab-infrastructure').addEventListener('click', () => setMainTab('infrastructure'));
        document.getElementById('ss-main-tab-fleet').addEventListener('click', () => setMainTab('fleet'));
        const tabSecurity = document.getElementById('ss-main-tab-security');
        if (tabSecurity) tabSecurity.addEventListener('click', () => setMainTab('security'));
        const tabDiagnostics = document.getElementById('ss-main-tab-diagnostics');
        if (tabDiagnostics) {
            tabDiagnostics.addEventListener('click', function () {
                runWithTechAccess(function () { setMainTab('diagnostics'); });
            });
        }
        if (global.FirmwareOtaAdmin && FirmwareOtaAdmin.init) FirmwareOtaAdmin.init();
        const subAdd = document.getElementById('ss-dash-sub-add');
        const subUsers = document.getElementById('ss-dash-sub-users');
        const subSite = document.getElementById('ss-dash-sub-site');
        const subMe = document.getElementById('ss-dash-sub-me');
        const subGroups = document.getElementById('ss-dash-sub-groups');
        const subLab = document.getElementById('ss-dash-sub-lab');
        if (subAdd) subAdd.addEventListener('click', () => setDashSubTab('add'));
        if (subUsers) subUsers.addEventListener('click', () => setDashSubTab('users'));
        if (subSite) subSite.addEventListener('click', () => setDashSubTab('site'));
        if (subMe) subMe.addEventListener('click', () => setDashSubTab('me'));
        if (subGroups) subGroups.addEventListener('click', () => setDashSubTab('groups'));
        if (subLab) subLab.addEventListener('click', () => setDashSubTab('lab'));
        const fleetWireless = document.getElementById('ss-fleet-sub-wireless');
        const fleetFixed = document.getElementById('ss-fleet-sub-fixed');
        const fleetNvr = document.getElementById('ss-fleet-sub-nvr');
        const fleetDocks = document.getElementById('ss-fleet-sub-docks');
        const fleetFw = document.getElementById('ss-fleet-sub-firmware');
        const fleetUsb = document.getElementById('ss-fleet-sub-usb');
        if (fleetWireless) fleetWireless.addEventListener('click', () => setFleetSubTab('wireless'));
        if (fleetFixed) fleetFixed.addEventListener('click', () => setFleetSubTab('fixed'));
        if (fleetNvr) fleetNvr.addEventListener('click', () => setFleetSubTab('nvr'));
        if (fleetDocks) fleetDocks.addEventListener('click', () => setFleetSubTab('docks'));
        if (fleetFw) fleetFw.addEventListener('click', () => setFleetSubTab('firmware'));
        if (fleetUsb) fleetUsb.addEventListener('click', () => setFleetSubTab('usb'));
        ['identity', 'network', 'routing', 'advanced'].forEach(function (id) {
            const btn = document.getElementById('ss-infra-sub-' + id);
            if (btn) btn.addEventListener('click', function () { setInfraSubTab(id); });
        });

        const openEvidenceStorageBtn = document.getElementById('ss-open-evidence-storage');
        if (openEvidenceStorageBtn) openEvidenceStorageBtn.addEventListener('click', openEvidenceStorage);
        const openCommandWallBtn = document.getElementById('ss-open-command-wall');
        if (openCommandWallBtn) openCommandWallBtn.addEventListener('click', openCommandWallFromSettings);

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
                openWallPanelAssignFromSettings();
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
                var roleVal = (document.getElementById('ss-new-role') || {}).value || 'operator';
                var createBody = {
                    username: username,
                    password: document.getElementById('ss-new-pass').value,
                    adminPassword: document.getElementById('ss-new-admin-pass').value,
                    role: roleVal === 'commander' ? 'operator' : roleVal,
                    displayName: (document.getElementById('ss-new-display-name') || {}).value.trim(),
                    contactNote: (document.getElementById('ss-new-contact-note') || {}).value.trim(),
                };
                if (roleVal === 'commander') {
                    createBody.permissions = {
                        evidenceTriageAccess: true,
                        evidenceView: true,
                        evidenceDownload: true,
                    };
                }
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(createBody),
                });
                const data = await res.json();
                if (tryLicenseLimitUpsell(res, data)) return;
                if (!res.ok || !data.ok) throwOpErr(data);
                const createdName = (data.user && data.user.username) || username;
                document.getElementById('ss-new-user').value = '';
                document.getElementById('ss-new-pass').value = '';
                document.getElementById('ss-new-admin-pass').value = '';
                if (document.getElementById('ss-new-display-name')) document.getElementById('ss-new-display-name').value = '';
                if (document.getElementById('ss-new-contact-note')) document.getElementById('ss-new-contact-note').value = '';
                try {
                    await loadUsers();
                } catch (_) { /* user saved \u2014 table refresh failed */ }
                setDashSubTab('users');
                window.setTimeout(function () { highlightUserRow(createdName); }, 80);
                alert(tr('server.alert.userCreated', { name: createdName }));
            } catch (err) {
                const payload = err.opPayload || err.catalogPayload;
                if (isUsernameExistsPayload(payload)) {
                    setDashSubTab('users');
                    window.setTimeout(function () { highlightUserRow(username); }, 80);
                    alert(tr('server.alert.userExists', { name: username }));
                    return;
                }
                alert(opMsg(payload, err));
            } finally {
                creatingUser = false;
                if (addBtn) addBtn.disabled = false;
            }
        });

        const usersHost = document.getElementById('ss-panel-users') || document.getElementById('ss-users-body');
        const userEditHosts = [usersHost, document.getElementById('ss-user-drawer')].filter(Boolean);
        userEditHosts.forEach(function (host) {
        host.addEventListener('change', (e) => {
            const row = closestUserRow(e.target);
            if (!row) return;
            if (e.target.matches('.ss-user-perm-select-all')) {
                const acc = e.target.closest('.ss-user-acc');
                const on = e.target.checked;
                if (acc) {
                    acc.querySelectorAll('.ss-user-acc-body input[type="checkbox"]:not(.ss-user-perm-select-all)').forEach(function (cb) {
                        cb.checked = on;
                    });
                }
                markUserRowDirty(row);
                return;
            }
            if (e.target.matches('.ss-user-map-control') || e.target.matches('.ss-user-kill-switch')
                || e.target.matches('.ss-user-geofence')
                || e.target.matches('.ss-user-clear-map-pins')
                || e.target.matches('.ss-user-overlay-view') || e.target.matches('.ss-user-overlay-edit')
                || e.target.matches('.ss-user-ai-alerts')
                || e.target.matches('.ss-user-tactical-view') || e.target.matches('.ss-user-blueprint-manage')
                || e.target.matches('.ss-user-evidence-view')
                || e.target.matches('.ss-user-evidence-dl') || e.target.matches('.ss-user-evidence-export')
                || e.target.matches('.ss-user-evidence-edit') || e.target.matches('.ss-user-evidence-lifecycle')
                || e.target.matches('.ss-user-dock-admin')
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
                const acc = e.target.closest('.ss-user-acc');
                if (acc) syncPermSelectAll(acc);
            }
        });

        host.addEventListener('input', (e) => {
            const row = closestUserRow(e.target);
            if (!row) return;
            if (e.target.matches('.ss-user-signin-from') || e.target.matches('.ss-user-signin-exp')
                || e.target.matches('.ss-user-evidence-exp')
                || e.target.matches('.ss-user-username')
                || e.target.matches('.ss-user-display-name')
                || e.target.matches('.ss-user-contact-note')) {
                markUserRowDirty(row);
            }
        });

        host.addEventListener('click', async (e) => {
            if (e.target.closest && e.target.closest('#ss-user-drawer-close')) {
                e.preventDefault();
                closeUserDrawer();
                return;
            }
            if (e.target.id === 'ss-user-drawer-backdrop') {
                closeUserDrawer();
                return;
            }
            const cfgBtn = e.target.closest && e.target.closest('.ss-user-configure');
            if (cfgBtn) {
                const tr = cfgBtn.closest('[data-user-id]');
                if (tr) openUserDrawer(tr.getAttribute('data-user-id'));
                return;
            }
            const jumpBtn = e.target.closest && e.target.closest('.ss-dispatch-jump-groups');
            if (jumpBtn) {
                e.preventDefault();
                setMainTab('security');
                setDashSubTab('groups');
                return;
            }
            const row = closestUserRow(e.target);
            const id = row && row.getAttribute('data-user-id');
            if (!id) return;
            if (e.target.matches('.ss-user-save')) {
                const profile = readRowProfile(row);
                if (!profile.username) {
                    alert(tr('server.users.usernameRequired'));
                    return;
                }
                const name = profile.username || row.getAttribute('data-username') || id;
                const btn = e.target;
                btn.disabled = true;
                try {
                    await saveUserRow(id, {
                        username: profile.username,
                        displayName: profile.displayName,
                        contactNote: profile.contactNote,
                        permissions: readRowPermissions(row),
                        assignedGroupIds: readRowAssignedGroupIds(row),
                    });
                    clearUserRowDirty(row);
                    row.setAttribute('data-username', profile.username);
                    closeUserDrawer();
                    await loadUsers();
                    alert(tr('server.users.saved', { name: name }));
                } catch (err) {
                    alert(opMsg(err.opPayload || err.catalogPayload, err));
                    btn.disabled = false;
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
                    closeUserDrawer();
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
                loadProductionAccess();
                loadSiteReadiness();
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
            updateOperatorTlsBadge();
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
        activeDashSubTab = 'users';
        setDashSubTab('users');
        scheduleSettingsRefresh('dashboard', { force: true }).then(function () {
            if (!canManageUsers) {
                alert(tr('map.permGrantSteps'));
                return;
            }
            const section = document.getElementById('ss-users-list-section')
                || document.getElementById('ss-users-section');
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
        pinEl.type = 'password';
        pin2El.type = 'password';
        document.querySelectorAll('[data-ss-pass-toggle="ss-tech-provision-pin"],[data-ss-pass-toggle="ss-tech-provision-pin2"]').forEach(function (btn) {
            btn.setAttribute('aria-pressed', 'false');
            btn.textContent = tr('common.showPassword');
        });
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        hideModalsForTechProvision();
        backdrop.hidden = false;
        setTechProvisionA11y(true);

        const cancel = function () {
            // Always allow Cancel \u2014 never leave operator stuck on Saving\u2026
            if (provisionBusy && provisionBusy.isBusy()) provisionBusy.setBusy(false);
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
            if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
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

            // 1) Login password FIRST (visible) \u2014 never set Saving\u2026 before reverify.
            // Hide PIN dialog so Confirm password is not buried underneath.
            if (global.AuthReverify && AuthReverify.clear) AuthReverify.clear();
            backdrop.hidden = true;
            setTechProvisionA11y(false);

            let body = { pin: pin, pinConfirm: pinConfirm };
            try {
                if (global.AuthReverify && AuthReverify.withReverify) {
                    body = await AuthReverify.withReverify(body);
                }
            } catch (err) {
                // Password cancel / fail \u2192 return to PIN form (do not wipe entries).
                backdrop.hidden = false;
                setTechProvisionA11y(true);
                if (err && err.message === 'cancelled') {
                    pinEl.focus();
                    return;
                }
                if (errEl) {
                    errEl.textContent = (err && err.message) || tr('tech.provision.failed');
                    errEl.hidden = false;
                }
                pinEl.focus();
                return;
            }

            // 2) Only now show Saving\u2026 and POST.
            backdrop.hidden = false;
            setTechProvisionA11y(true);
            if (provisionBusy) provisionBusy.setBusy(true);
            try {
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
                refreshTechPinStatus();
                const msgEl = document.getElementById('ss-tech-pin-msg');
                if (msgEl) msgEl.textContent = tr('tech.provision.saved');
                if (global.TechDiagnostics && TechDiagnostics.checkSession) {
                    await TechDiagnostics.checkSession();
                }
                if (onSuccess) onSuccess();
            } catch (err) {
                if (provisionBusy) provisionBusy.setBusy(false);
                backdrop.hidden = false;
                setTechProvisionA11y(true);
                if (err && err.message === 'cancelled') {
                    pinEl.focus();
                    return;
                }
                if (errEl) {
                    errEl.textContent = (err && err.message) || tr('tech.provision.failed');
                    errEl.hidden = false;
                }
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
                e.preventDefault();
                cancel();
            }
        };
        document.addEventListener('keydown', techProvisionEsc);
        setTimeout(function () { pinEl.focus(); }, 50);
    }

    function bindPasswordToggles() {
        if (!document._ssPwClipBound) {
            document._ssPwClipBound = true;
            function ssBlockPwClip(e) {
                const t = e.target;
                if (!t || t.tagName !== 'INPUT') return;
                if (t.type === 'password' || (t.closest && t.closest('.ss-pass-field'))) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            document.addEventListener('copy', ssBlockPwClip, true);
            document.addEventListener('cut', ssBlockPwClip, true);
            document.addEventListener('paste', ssBlockPwClip, true);
        }
        document.querySelectorAll('[data-ss-pass-toggle]').forEach(function (btn) {
            if (btn._ssPassBound) return;
            btn._ssPassBound = true;
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-ss-pass-toggle');
                const inp = id ? document.getElementById(id) : null;
                if (!inp) return;
                const show = inp.type === 'password';
                inp.type = show ? 'text' : 'password';
                btn.setAttribute('aria-pressed', show ? 'true' : 'false');
                btn.textContent = tr(show ? 'common.hidePassword' : 'common.showPassword');
            });
            const id = btn.getAttribute('data-ss-pass-toggle');
            const inp = id ? document.getElementById(id) : null;
            if (inp && !inp._ssClipBound) {
                inp._ssClipBound = true;
                ['copy', 'cut', 'paste'].forEach(function (ev) {
                    inp.addEventListener(ev, function (e) { e.preventDefault(); return false; });
                });
            }
        });
    }

    function bindTechProvisionUi() {
        bindPasswordToggles();
        const form = document.getElementById('ss-tech-provision-form');
        const backdrop = document.getElementById('ss-tech-provision-backdrop');
        const cancelBtn = document.getElementById('ss-tech-provision-cancel');
        if (form && backdrop && !form._ssTechProvBound) {
            form._ssTechProvBound = true;
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                if (typeof backdrop._techProvisionSubmit === 'function') backdrop._techProvisionSubmit();
            });
        }
        if (cancelBtn && backdrop && !cancelBtn._ssTechProvBound) {
            cancelBtn._ssTechProvBound = true;
            cancelBtn.addEventListener('click', function () {
                if (typeof backdrop._techProvisionCancel === 'function') backdrop._techProvisionCancel();
            });
        }
        const setBtn = document.getElementById('ss-tech-pin-set');
        if (setBtn && !setBtn._ssTechPinBound) {
            setBtn._ssTechPinBound = true;
            setBtn.addEventListener('click', function () {
                if (!canManageServer) return;
                const msgEl = document.getElementById('ss-tech-pin-msg');
                if (msgEl) msgEl.textContent = '';
                showTechProvision(function () {
                    refreshTechPinStatus();
                }, {});
            });
        }
        const gateReset = document.getElementById('ss-tech-gate-reset-pin');
        if (gateReset && !gateReset._ssTechPinBound) {
            gateReset._ssTechPinBound = true;
            gateReset.addEventListener('click', function () {
                if (!canManageServer) {
                    if (global.AdminActionBus) AdminActionBus.toast(tr('adminAction.adminRequired'));
                    return;
                }
                // Close Step 2 unlock gate, then open set/reset (still requires login re-verify).
                if (global.TechDiagnostics && TechDiagnostics.dismissTechGate) {
                    TechDiagnostics.dismissTechGate({});
                } else {
                    const gate = document.getElementById('ss-tech-gate-backdrop');
                    if (gate) gate.hidden = true;
                }
                showTechProvision(function () {
                    refreshTechPinStatus();
                    if (global.AdminActionBus) AdminActionBus.toast(tr('tech.provision.saved'));
                }, { onCancel: function () { /* stay in Server Config */ } });
            });
        }
    }

    function refreshTechPinStatus() {
        const statusEl = document.getElementById('ss-tech-pin-status');
        const setBtn = document.getElementById('ss-tech-pin-set');
        if (!statusEl) return;
        statusEl.textContent = '\u2026';
        fetch('/api/tech/provision/status', { credentials: 'same-origin' })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (data) {
                if (data && data.configured) {
                    statusEl.textContent = tr('tech.adminPin.statusSet');
                    if (setBtn) setBtn.textContent = tr('tech.adminPin.resetBtn');
                } else {
                    statusEl.textContent = tr('tech.adminPin.statusNotSet');
                    if (setBtn) setBtn.textContent = tr('tech.adminPin.setBtn');
                }
            })
            .catch(function () {
                statusEl.textContent = tr('tech.adminPin.statusUnknown');
            });
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
            openConfigTab('infrastructure', { sourceBtn: btn });
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
        const mainTab = resolvePillar(tab || 'infrastructure');
        const needsTech = mainTab === 'diagnostics';

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
        showTechProvision: showTechProvision,
        refreshTechPinStatus: refreshTechPinStatus,
        trySettingsNavLock: trySettingsNavLock,
        releaseAllSettingsOverlays: releaseAllSettingsOverlays,
        applySession: applySession,
        bindSettingsAsideClicks: bindSettingsAsideClicks,
        closeConfig: function () { setOpen(false); },
        openEvidenceStorage: openEvidenceStorage,
        openFleetDocks: openFleetDocks,
        syncAdvancedNav: syncAdvancedNav,
        canManageServer: function () { return canManageServer; },
    };
})(window);
