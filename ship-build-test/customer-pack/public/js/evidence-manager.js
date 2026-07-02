/**
 * Evidence & docking — top nav tab (FTP dock settings + evidence catalog).
 */
(function (global) {
    let canEvidenceDownload = false;
    let evidenceExpiry = null;
    let onEvidenceView = false;
    let sessionPerms = null;
    let sessionRole = null;
    let vcLazyBooted = false;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function opMsg(data, err) {
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data);
        if (data && data.errorKey) return tr(data.errorKey);
        if (data && data.error) return data.error;
        return tr('errors.generic');
    }

    function throwOpErr(data) {
        throw global.OperatorErrorVoice
            ? OperatorErrorVoice.attach(new Error('op'), data)
            : new Error(opMsg(data));
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function fmtBytes(n) {
        const b = parseInt(n, 10) || 0;
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fmtTime(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString();
        } catch (_) {
            return iso;
        }
    }

    function applyPermissions(perms, role) {
        sessionPerms = perms || null;
        sessionRole = role || null;
        canEvidenceDownload = !!(perms && perms.evidenceDownload);
        evidenceExpiry = perms && perms.evidenceDownloadExpiresAt ? perms.evidenceDownloadExpiresAt : null;
        if (global.EvidenceHub && EvidenceHub.applyPermissions) {
            EvidenceHub.applyPermissions(perms, role);
        }
        if (global.ConferenceHub && ConferenceHub.applyPermissions) {
            ConferenceHub.applyPermissions(perms, role);
        }
        if (global.AuditTrailHub && AuditTrailHub.applyPermissions) {
            AuditTrailHub.applyPermissions(perms);
        }
        const banner = document.getElementById('evidence-perm-banner');
        if (banner && !global.EvidenceHub) {
            if (!canEvidenceDownload) {
                banner.hidden = false;
                banner.textContent = evidenceExpiry
                    ? 'Evidence download grant expired (' + evidenceExpiry + ').'
                    : 'Evidence download not granted for your account.';
            } else {
                banner.hidden = true;
            }
        }
        if (onEvidenceView) loadCatalog();
    }

    function syncVcSession() {
        if (!sessionPerms || !global.ConferenceHub || !ConferenceHub.applyPermissions) return;
        ConferenceHub.applyPermissions(sessionPerms, sessionRole);
    }

    function showVcLoadingHint() {
        const picker = document.getElementById('vc-room-picker');
        if (!picker || (global.ConferenceHub && global.LivekitClient)) return;
        picker.innerHTML = '<p class="hint">' + tr('common.loading') + '</p>';
    }

    async function renderPathValidation(validation, installerNote) {
        function mark(el, ok, okKey, badKey) {
            if (!el) return;
            if (ok === null) {
                el.textContent = '';
                el.className = 'ev-path-status';
                return;
            }
            const msg = global.I18n && I18n.t
                ? I18n.t(ok ? okKey : badKey)
                : (ok ? 'Folder OK' : 'Folder missing');
            el.textContent = (ok ? '✓ ' : '✗ ') + msg;
            el.className = 'ev-path-status ' + (ok ? 'ev-path-ok' : 'ev-path-bad');
        }
        const v = validation || {};
        mark(document.getElementById('ss-evidence-live-valid'), v.liveCapture, 'evidence.pathValid', 'evidence.pathMissing');
        mark(document.getElementById('ss-evidence-nas-valid'), v.nas, 'evidence.pathValid', 'evidence.pathMissing');
        const noteEl = document.getElementById('ss-evidence-installer-note');
        const primaryEl = document.getElementById('ss-evidence-archive-primary');
        if (noteEl) {
            const isNas = primaryEl && primaryEl.value === 'nas';
            noteEl.hidden = !isNas;
            if (installerNote && isNas) noteEl.textContent = installerNote;
        }
    }

    async function loadEvidencePaths() {
        if (global.EvidenceStorageUi && EvidenceStorageUi.refresh) {
            return EvidenceStorageUi.refresh();
        }
        const enabledEl = document.getElementById('ss-evidence-live-enabled');
        const pathEl = document.getElementById('ss-evidence-live-path');
        const folderEl = document.getElementById('ss-evidence-live-folder');
        const nasEl = document.getElementById('ss-evidence-nas-path');
        const noteEl = document.getElementById('ss-evidence-dock-note');
        const primaryEl = document.getElementById('ss-evidence-archive-primary');
        const saveBtn = document.getElementById('ss-save-evidence-settings');
        try {
            const res = await fetch('/api/evidence-settings');
            const data = await res.json();
            if (!res.ok || !data.ok) return;
            const ev = data.evidence || {};
            if (enabledEl) enabledEl.checked = !!ev.liveCaptureEnabled;
            if (pathEl) pathEl.value = ev.liveCapturePath || 'evidence/live-capture';
            if (nasEl) nasEl.value = ev.nasMountPath || '';
            if (noteEl) noteEl.value = ev.dockFtpTargetNote || '';
            if (primaryEl) primaryEl.value = ev.archivePrimary === 'nas' ? 'nas' : 'local';
            if (folderEl) folderEl.textContent = data.liveCaptureLabel || '—';
            await renderPathValidation(data.pathValidation, data.installerNote);
        } catch (_) { /* ignore */ }
        if (saveBtn) {
            saveBtn.disabled = !(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer());
        }
        const readOnly = !(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer());
        [enabledEl, pathEl, nasEl, noteEl, primaryEl].forEach(function (el) {
            if (el) el.disabled = readOnly;
        });
    }

    async function saveEvidencePaths() {
        if (!(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer())) {
            alert('Super admin required to save evidence paths.');
            return;
        }
        const enabledEl = document.getElementById('ss-evidence-live-enabled');
        const pathEl = document.getElementById('ss-evidence-live-path');
        const nasEl = document.getElementById('ss-evidence-nas-path');
        const noteEl = document.getElementById('ss-evidence-dock-note');
        const primaryEl = document.getElementById('ss-evidence-archive-primary');
        try {
            const evidenceBody = {
                evidence: {
                    archivePrimary: primaryEl ? primaryEl.value : 'local',
                    liveCaptureEnabled: !!(enabledEl && enabledEl.checked),
                    liveCapturePath: pathEl ? pathEl.value.trim() : '',
                    nasMountPath: nasEl ? nasEl.value.trim() : '',
                    dockFtpTargetNote: noteEl ? noteEl.value.trim() : '',
                    ftpUploadPath: (document.getElementById('ss-ftp-upload-path') || {}).value
                        ? String(document.getElementById('ss-ftp-upload-path').value).trim() : '',
                },
            };
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify(evidenceBody)
                : evidenceBody;
            const res = await fetch('/api/evidence-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            const folderEl = document.getElementById('ss-evidence-live-folder');
            if (folderEl && data.liveCaptureLabel) folderEl.textContent = data.liveCaptureLabel;
            await renderPathValidation(data.pathValidation, data.installerNote);
            if (typeof global.loadStoragePaths === 'function') global.loadStoragePaths();
            alert('Evidence paths saved.');
        } catch (err) {
            alert(opMsg(err.opPayload || err.catalogPayload, err));
        }
    }

    async function refreshDockPanel() {
        if (global.ServerSetup && ServerSetup.refreshDockPanel) {
            await ServerSetup.refreshDockPanel();
        }
    }

    async function loadCatalog() {
        if (global.EvidenceHub && EvidenceHub.refreshCatalog) {
            return EvidenceHub.refreshCatalog();
        }
        const tbody = document.getElementById('evidence-tbody');
        const meta = document.getElementById('evidence-meta');
        if (!tbody) return;
        if (!canEvidenceDownload) {
            tbody.innerHTML = '<tr><td colspan="6" class="hint">—</td></tr>';
            if (meta) meta.textContent = '';
            return;
        }
        tbody.innerHTML = '<tr><td colspan="6" class="hint">Loading…</td></tr>';
        try {
            const res = await fetch('/api/evidence/catalog?limit=200');
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            const files = data.files || [];
            if (meta) meta.textContent = files.length ? (files.length + ' file(s)') : '';
            if (!files.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="hint">—</td></tr>';
                return;
            }
            tbody.innerHTML = files.map(function (f) {
                return '<tr data-file-id="' + esc(f.id) + '">'
                    + '<td><code>' + esc(f.id) + '</code></td>'
                    + '<td>' + esc(f.fileName) + '<br><span class="hint">' + fmtBytes(f.byteSize) + '</span></td>'
                    + '<td>' + esc(f.operatorName || '—') + '</td>'
                    + '<td>' + esc(fmtTime(f.uploadedAt)) + '</td>'
                    + '<td>' + esc(f.storageTier || f.source || 'local') + '</td>'
                    + '<td><button type="button" class="btn btn-action btn-sm evidence-dl-btn" data-file-id="' + esc(f.id) + '">Download</button></td>'
                    + '</tr>';
            }).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="6" class="hint">' + esc(opMsg(err.opPayload || err.catalogPayload, err)) + '</td></tr>';
            if (meta) meta.textContent = '';
        }
    }

    async function requestDownload(fileId, btn) {
        if (!canEvidenceDownload || !fileId) return;
        if (btn) btn.disabled = true;
        try {
            const res = await fetch('/api/evidence/request-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: fileId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOpErr(data);
            const dl = data.download;
            if (!dl || !dl.downloadUrl) throw new Error('No download URL');
            alert('Download ID: ' + dl.downloadId);
            window.location.href = dl.downloadUrl;
        } catch (err) {
            alert(opMsg(err.opPayload || err.catalogPayload, err));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function tabShouldLoad(tab, opts) {
        opts = opts || {};
        if (opts.force) return true;
        if (opts.auditMode === 'kill_switch' || opts.auditMode === 'geofence') return true;
        if (!global.TabLifecycle) return true;
        return TabLifecycle.shouldLoad(tab);
    }

    function showTab(tab, opts) {
        opts = opts || {};
        const loadData = tabShouldLoad(tab, opts);
        const ops = document.getElementById('app-view-ops');
        const ev = document.getElementById('app-view-evidence');
        const conf = document.getElementById('app-view-conference');
        const audit = document.getElementById('app-view-audit-trail');
        const srv = document.getElementById('app-view-server');
        const cw = document.getElementById('app-view-command-wall');
        const cs = document.getElementById('app-view-centre-summary');
        const btnOps = document.getElementById('nav-tab-ops');
        const btnEv = document.getElementById('nav-tab-evidence');
        const btnConf = document.getElementById('nav-tab-conference');
        const btnAudit = document.getElementById('nav-tab-audit-trail');
        const btnSrv = document.getElementById('nav-tab-server');
        const btnCw = document.getElementById('nav-tab-command-wall');
        const btnCs = document.getElementById('nav-tab-centre-summary');
        const navTools = document.getElementById('video-wall-nav-tools');
        if (navTools) navTools.hidden = tab !== 'ops';
        onEvidenceView = tab === 'evidence';
        if (ops) ops.hidden = tab !== 'ops';
        if (ev) ev.hidden = tab !== 'evidence';
        if (conf) conf.hidden = tab !== 'conference';
        if (audit) audit.hidden = tab !== 'audit-trail';
        if (srv) srv.hidden = tab !== 'server';
        if (cw) cw.hidden = tab !== 'command-wall';
        if (cs) cs.hidden = tab !== 'centre-summary';
        if (btnOps) btnOps.classList.toggle('active', tab === 'ops');
        if (btnEv) btnEv.classList.toggle('active', tab === 'evidence');
        if (btnConf) btnConf.classList.toggle('active', tab === 'conference');
        if (btnAudit) btnAudit.classList.toggle('active', tab === 'audit-trail');
        if (btnSrv) btnSrv.classList.toggle('active', tab === 'server');
        if (btnCw) btnCw.classList.toggle('active', tab === 'command-wall');
        if (btnCs) btnCs.classList.toggle('active', tab === 'centre-summary');
        if (tab === 'evidence') {
            if (loadData) {
                refreshDockPanel();
                loadEvidencePaths();
            }
            if (global.EvidenceHub && EvidenceHub.onShow) EvidenceHub.onShow({ force: loadData });
            else if (loadData) loadCatalog();
        }
        if (tab === 'conference') {
            const showVc = function (forceRefresh) {
                syncVcSession();
                if (global.ConferenceHub && ConferenceHub.onShow) {
                    ConferenceHub.onShow({ force: !!forceRefresh });
                }
            };
            if (global.VcLazy && VcLazy.ensure) {
                const firstLazyBoot = !vcLazyBooted && !(global.ConferenceHub && global.LivekitClient);
                if (firstLazyBoot) showVcLoadingHint();
                VcLazy.ensure().then(function () {
                    vcLazyBooted = true;
                    showVc(firstLazyBoot || loadData);
                }).catch(function (err) {
                    console.error('VC load failed', err);
                    alert(tr('conference.clientNotLoaded'));
                });
            } else {
                showVc(loadData);
            }
        }
        if (tab === 'audit-trail') {
            const presetForce = opts.auditMode === 'kill_switch' || opts.auditMode === 'geofence';
            const auditForce = loadData || presetForce;
            if (global.AuditTrailHub) {
                if (opts.auditMode === 'kill_switch' && AuditTrailHub.onShowForMode) {
                    AuditTrailHub.onShowForMode('kill_switch', { force: auditForce });
                } else if (opts.auditMode === 'geofence' && AuditTrailHub.onShowForMode) {
                    AuditTrailHub.onShowForMode('geofence', { force: auditForce });
                } else if (opts.auditMode === 'all' && AuditTrailHub.onShowForMode) {
                    AuditTrailHub.onShowForMode('all', { force: auditForce });
                } else if (AuditTrailHub.onShow) {
                    AuditTrailHub.onShow({ force: loadData });
                }
            }
        }
        if (tab === 'command-wall' && global.CommandWall && global.CommandWall.init) {
            global.CommandWall.init(global.__mobilityDashboardSocket);
            if (global.TabLifecycle) TabLifecycle.markLoaded('command-wall');
        }
        if (tab === 'centre-summary' && global.CentreSummary && global.CentreSummary.init) {
            global.CentreSummary.init({ force: loadData });
            if (typeof I18n !== 'undefined' && I18n.scheduleApply) {
                I18n.scheduleApply(cs);
            }
        }
        if (tab === 'server' && global.SettingsHub && SettingsHub.onShow) {
            SettingsHub.onShow({ force: loadData });
        }
        if (tab !== 'server' && global.ServerSetup && ServerSetup.closeConfig) {
            const ws = document.getElementById('server-config-workspace');
            if (ws && !ws.hidden) ServerSetup.closeConfig();
        }
        if (tab === 'ops' && global.FleetUi && FleetUi.refreshLayout) {
            requestAnimationFrame(function () { FleetUi.refreshLayout(); });
        }
        if (tab === 'ops' && loadData && global.OpsCwAwareness && OpsCwAwareness.refresh) {
            OpsCwAwareness.refresh();
        }
        if (tab === 'ops' && loadData && global.TabLifecycle) TabLifecycle.markLoaded('ops');
    }

    function init() {
        const btnOps = document.getElementById('nav-tab-ops');
        const btnEv = document.getElementById('nav-tab-evidence');
        const btnSrv = document.getElementById('nav-tab-server');
        const btnCw = document.getElementById('nav-tab-command-wall');
        const btnCs = document.getElementById('nav-tab-centre-summary');
        const btnConf = document.getElementById('nav-tab-conference');
        const btnAudit = document.getElementById('nav-tab-audit-trail');
        const btnAuditServer = document.getElementById('server-open-audit-trail');
        const refresh = document.getElementById('evidence-refresh');
        const saveEvidence = document.getElementById('ev-storage-save');
        const saveEvidenceLegacy = document.getElementById('ss-save-evidence-settings');
        const tbody = document.getElementById('evidence-tbody');
        if (btnOps) btnOps.addEventListener('click', function () { showTab('ops'); });
        if (btnEv) btnEv.addEventListener('click', function () { showTab('evidence'); });
        if (btnConf) btnConf.addEventListener('click', function () { showTab('conference'); });
        if (btnAudit) btnAudit.addEventListener('click', function () { showTab('audit-trail'); });
        if (btnAuditServer) btnAuditServer.addEventListener('click', function () { showTab('audit-trail'); });
        if (btnSrv) btnSrv.addEventListener('click', function () { showTab('server'); });
        if (btnCw) btnCw.addEventListener('click', function () { showTab('command-wall'); });
        if (btnCs) btnCs.addEventListener('click', function () { showTab('centre-summary'); });
        if (refresh) refresh.addEventListener('click', function () {
            if (global.TabLifecycle) TabLifecycle.invalidate('evidence');
            if (global.EvidenceHub && EvidenceHub.refreshCurrentPanel) EvidenceHub.refreshCurrentPanel(true);
            else loadCatalog();
        });
        if (saveEvidenceLegacy) saveEvidenceLegacy.addEventListener('click', function () { saveEvidencePaths(); });
        const primaryEl = document.getElementById('ss-evidence-archive-primary');
        if (primaryEl && !global.EvidenceStorageUi) {
            primaryEl.addEventListener('change', function () {
                renderPathValidation(null, null);
                const noteEl = document.getElementById('ss-evidence-installer-note');
                if (noteEl) noteEl.hidden = primaryEl.value !== 'network';
            });
        }
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const btn = e.target.closest('.evidence-dl-btn');
                if (!btn) return;
                if (global.EvidenceHub && EvidenceHub.requestDownload) {
                    EvidenceHub.requestDownload(btn.getAttribute('data-file-id'), btn);
                } else {
                    requestDownload(btn.getAttribute('data-file-id'), btn);
                }
            });
        }
        if (global.EvidenceHub && EvidenceHub.bindUi) EvidenceHub.bindUi();
        if (global.EvidenceStorageUi && EvidenceStorageUi.bindUi) EvidenceStorageUi.bindUi();
        if (global.AuditTrailHub && AuditTrailHub.bindUi) AuditTrailHub.bindUi();
        if (global.SettingsHub && SettingsHub.init) SettingsHub.init();
        if (global.socket) {
            global.socket.on('ftp-upload', function () {
                if (onEvidenceView) loadCatalog();
            });
        }
    }

    global.EvidenceManager = {
        init: init,
        applyPermissions: applyPermissions,
        refresh: loadCatalog,
        showTab: showTab,
        loadEvidencePaths: loadEvidencePaths,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
