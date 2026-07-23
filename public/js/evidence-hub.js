/**
 * Evidence & Docking hub \u2014 docks (1 / 8 / 24-bay 6\u00D74), catalog, detail, trim export.
 * Isolated from live SOS / video paths.
 */
(function (global) {
    const perms = {
        view: false,
        download: false,
        export: false,
        edit: false,
        dockAdmin: false,
        superAdmin: false,
    };
    let secureExportEnabled = true;
    let dashboardRole = '';

    let currentPanel = 'overview';
    let currentDetailId = null;
    let catalogFocusExportQueue = false;
    let catalogPage = 1;
    let catalogStatus = 'active';
    const CATALOG_PAGE_SIZE = 50;
    let rxPage = 1;
    const RX_PAGE_SIZE = 50;
    let docksCache = [];
    let selectedDockId = null;
    const panelLoadedAt = Object.create(null);
    let panelLoadedDetailId = null;
    /* mob-evidence-save-meta-dirty-hint-v1 \u2014 snapshot at detail open */
    let detailMetaBaseline = null;

    function staleMs() {
        return (global.TabLifecycle && TabLifecycle.STALE_MS) || 60000;
    }

    function panelWarm(name, force, detailId) {
        if (force) return false;
        const t = panelLoadedAt[name];
        if (!t || (Date.now() - t >= staleMs())) return false;
        if (name === 'detail' && detailId && panelLoadedDetailId !== detailId) return false;
        return true;
    }

    function markPanelLoaded(name, detailId) {
        panelLoadedAt[name] = Date.now();
        if (name === 'detail' && detailId) panelLoadedDetailId = detailId;
        if (global.TabLifecycle) TabLifecycle.markLoaded('evidence');
    }

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return String(key || '').split('.').pop() || key;
    }

    function catalogMsg(data, err, fallbackKey) {
        if (global.OperatorUI) return OperatorUI.opMsg(data, err, fallbackKey);
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data, fallbackKey);
        return tr(fallbackKey || 'errors.generic');
    }

    function throwCatalogErr(data) {
        throw global.OperatorErrorVoice
            ? OperatorErrorVoice.attach(new Error('op'), data)
            : new Error(catalogMsg(data));
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function fmtBytes(n) {
        const b = parseInt(n, 10) || 0;
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fmtTime(iso) {
        if (!iso) return '\u2014';
        try { return new Date(iso).toLocaleString(); } catch (_) { return iso; }
    }

    function isImageEvidenceName(name) {
        return /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(name || ''));
    }

    function renderControlledPreview(file) {
        const isImage = isImageEvidenceName(file.fileName);
        const kind = isImage ? tr('evidenceHub.previewKindImage') : tr('evidenceHub.previewKindVideo');
        return '<div class="ev-preview-shell">'
            + '<div class="ev-preview-note">'
            + '<h4>' + tr('evidenceHub.previewLockedTitle') + '</h4>'
            + '<p>' + tr('evidenceHub.previewLockedBody', { kind: kind }) + '</p>'
            + '</div>'
            + '<div class="ev-preview-actions">'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-detail-open-preview">' + tr('evidenceHub.openPreview') + '</button>'
            + '</div>'
            + '<div class="ev-preview-stage" id="ev-preview-stage" hidden></div>'
            + '</div>';
    }

    function renderMissingPreview(detail) {
        return '<div class="ev-preview-shell">'
            + '<div class="ev-preview-note">'
            + '<h4>' + tr('evidenceHub.missingTitle') + '</h4>'
            + '<p>' + tr('evidenceHub.missingBody') + '</p>'
            + '</div>'
            + '</div>';
    }

    function mountPreview(fileName, previewUrl) {
        const host = document.getElementById('ev-preview-stage');
        if (!host) return;
        const isImage = isImageEvidenceName(fileName);
        host.innerHTML = isImage
            ? '<div class="ev-preview-stage-head"><button type="button" class="btn btn-ghost btn-sm" id="ev-detail-hide-preview">' + tr('common.close') + '</button></div>'
                + '<img id="ev-detail-player" alt="' + esc(fileName) + '" src="' + esc(previewUrl) + '">'
            : '<div class="ev-preview-stage-head"><button type="button" class="btn btn-ghost btn-sm" id="ev-detail-hide-preview">' + tr('common.close') + '</button></div>'
                + '<video id="ev-detail-player" controls playsinline src="' + esc(previewUrl) + '"></video>';
        host.hidden = false;
        const openBtn = document.getElementById('ev-detail-open-preview');
        if (openBtn) openBtn.hidden = true;
        const hideBtn = document.getElementById('ev-detail-hide-preview');
        if (hideBtn) hideBtn.addEventListener('click', function () {
            host.hidden = true;
            host.innerHTML = '';
            if (openBtn) openBtn.hidden = false;
        });
    }

    function applyPermissions(p, role) {
        p = p || {};
        if (role) dashboardRole = role;
        perms.view = !!(p.evidenceView || p.evidenceDownload);
        perms.download = !!p.evidenceDownload;
        perms.export = !!p.evidenceExport;
        perms.edit = !!p.evidenceEdit;
        perms.dockAdmin = !!p.dockAdmin;
        perms.superAdmin = dashboardRole === 'super_admin' || !!(p.mapDeviceControl && p.dockAdmin && p.evidenceExport);
        updatePermBanner();
        renderOverviewGuidance();
        if (global.CaseFilesUi && CaseFilesUi.applyPermissions) {
            CaseFilesUi.applyPermissions(p, dashboardRole);
        }
        const addDock = document.getElementById('ev-dock-add');
        if (addDock) addDock.hidden = !perms.dockAdmin;
        const navStorage = document.getElementById('ev-nav-storage');
        if (navStorage) navStorage.hidden = dashboardRole !== 'super_admin';
        const navDocks = document.getElementById('ev-nav-docks');
        if (navDocks) navDocks.hidden = !perms.dockAdmin && dashboardRole !== 'super_admin';
        const navRx = document.getElementById('ev-nav-redacted-exports');
        if (navRx) navRx.hidden = !perms.export && !perms.superAdmin;
        const forensicImport = document.getElementById('ev-forensic-import');
        if (forensicImport) forensicImport.hidden = !perms.superAdmin;
        if (dashboardRole !== 'super_admin' && currentPanel === 'settings') showPanel('overview');
        else if (currentPanel === 'approvals') showPanel('catalog', { focusExportQueue: true });
        else if (!perms.dockAdmin && dashboardRole !== 'super_admin' && currentPanel === 'docks') showPanel('overview');
        else if (!perms.export && !perms.superAdmin && currentPanel === 'redacted-exports') showPanel('overview');
        refreshSecureExportFlag();
        /* PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1 — force rebuild so Prior exports get SA actions. */
        if (document.getElementById('app-view-evidence') && !document.getElementById('app-view-evidence').hidden) {
            if (currentPanel === 'detail' && currentDetailId) {
                loadDetail(currentDetailId, true);
            } else {
                refreshCurrentPanel(true);
            }
        }
    }

    /** Prefer session role (same as Storage nav); heuristic fallback. */
    function isEvidenceSuperAdmin() {
        return dashboardRole === 'super_admin' || !!perms.superAdmin;
    }

    async function refreshSecureExportFlag() {
        if (!perms.superAdmin && !perms.download) return;
        try {
            if (perms.superAdmin) {
                const res = await fetch('/api/evidence/secure-export/queue?status=pending&limit=1', { credentials: 'same-origin' });
                const data = await res.json();
                if (res.ok && data.ok) secureExportEnabled = data.secureExportEnabled !== false;
            } else if (perms.download) {
                secureExportEnabled = true;
            }
        } catch (_) { /* keep default */ }
    }

    function updatePermBanner() {
        const el = document.getElementById('evidence-perm-banner');
        if (!el) return;
        if (!perms.view) {
            el.hidden = false;
            el.textContent = tr('evidenceHub.noViewPerm');
        } else {
            el.hidden = true;
        }
    }

    function guidanceLink(panel, labelKey, focus) {
        return '<button type="button" class="ev-guidance-link" data-ev-panel="' + esc(panel) + '"'
            + (focus ? ' data-ev-focus="' + esc(focus) + '"' : '') + '>'
            + esc(tr(labelKey)) + '</button>';
    }

    function renderOverviewGuidance(catalogDown) {
        const wrap = document.getElementById('ev-overview-guidance');
        if (!wrap) return;
        if (!perms.view) {
            wrap.hidden = true;
            return;
        }
        wrap.hidden = false;
        const lib = guidanceLink('catalog', 'evidenceHub.navCatalog');
        let body;
        let kicker = tr('evidenceHub.overviewGuidanceKicker');
        if (catalogDown && dashboardRole === 'super_admin') {
            kicker = tr('evidenceHub.overviewRecoveryKicker');
            body = tr('evidenceHub.overviewRecoveryAdmin', {
                storage: guidanceLink('settings', 'evidenceHub.navSettings'),
            });
        } else if (catalogDown) {
            wrap.hidden = true;
            return;
        } else if (dashboardRole === 'super_admin') {
            body = tr('evidenceHub.overviewGuidanceAdmin', {
                library: lib,
                storage: guidanceLink('settings', 'evidenceHub.navSettings'),
                exportQueue: guidanceLink('catalog', 'evidenceHub.libraryExportQueueLink', 'export-queue'),
            });
        } else {
            body = tr('evidenceHub.overviewGuidanceOperator', { library: lib });
        }
        wrap.innerHTML = '<span class="ev-overview-guidance-kicker">' + esc(kicker)
            + '</span><span class="ev-overview-guidance-body">' + body + '</span>';
        bindPanelJump(wrap);
    }

    function pathStatusHtml(ok) {
        if (ok === true) return '<span class="ev-path-ok">' + tr('evidenceHub.storageOk') + '</span>';
        if (ok === false) return '<span class="ev-path-bad">' + tr('evidenceHub.storageMissing') + '</span>';
        return esc(tr('evidenceHub.storageNotSet'));
    }

    function linkStatePill(linkState) {
        if (linkState === 'online') {
            return '<span class="ev-status-pill ev-status-ok">' + esc(tr('evidenceHub.dockLinkOnline')) + '</span>';
        }
        if (linkState === 'offline') {
            return '<span class="ev-status-pill ev-status-down">' + esc(tr('evidenceHub.dockLinkOffline')) + '</span>';
        }
        return '<span class="ev-status-pill ev-status-warn">' + esc(tr('evidenceHub.dockLinkPending')) + '</span>';
    }

    function dockModelLabel(d) {
        if (d.productCode === 'UB-DDS10') return tr('evidenceHub.dockModelDesk');
        if (d.productCode === 'UB-WMDS') return tr('evidenceHub.dockModelWall');
        if (d.model === 'desk') return tr('evidenceHub.dockModelDesk');
        if (d.model === 'wall') return tr('evidenceHub.dockModelWall');
        if (d.bayPreset) return d.bayPreset + '-bay';
        return '\u2014';
    }

    function fmtLastAuth(d) {
        if (d.lastAuthOfficer && d.lastAuthAt) {
            return esc(d.lastAuthOfficer) + '<br><span class="hint">' + esc(fmtTime(d.lastAuthAt)) + '</span>';
        }
        return '\u2014';
    }

    function renderIndexBanner(indexData) {
        if (indexData && indexData.available) return '';
        const msg = catalogMsg(indexData);
        let actions = '';
        if (dashboardRole === 'super_admin') {
            actions = '<div class="ev-overview-critical-actions">'
                + '<button type="button" class="btn btn-action btn-sm" data-ev-panel="settings">'
                + esc(tr('evidenceHub.openStorage')) + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm" id="ev-overview-backup">'
                + esc(tr('evidenceHub.storageBackupBtn')) + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm" id="ev-overview-maint">'
                + esc(tr('evidenceHub.storageMaintBtn')) + '</button>'
                + '<span id="ev-overview-action-msg" class="hint"></span>'
                + '</div>';
        }
        return '<div class="ev-overview-critical ev-overview-alert ev-overview-alert-warn" role="alert">'
            + '<div class="ev-overview-critical-main">'
            + '<strong class="ev-overview-critical-title">' + esc(tr('evidenceHub.indexUnavailableTitle')) + '</strong>'
            + '<p class="ev-overview-critical-body">' + esc(msg) + '</p>'
            + '</div>' + actions + '</div>';
    }

    function renderDockFleetTable(docks, totals, indexAvailable) {
        if (!docks || !docks.length) {
            return '<p class="setup-hint ev-overview-dock-empty">' + esc(tr('evidenceHub.noDocks')) + '</p>';
        }
        const rows = docks.map(function (d) {
            const baysLabel = indexAvailable
                ? (d.baysOccupied + ' / ' + d.bayCount)
                : tr('evidenceHub.unavailable');
            const uploadLabel = d.baysUploading > 0
                ? esc(tr('evidenceHub.dockUploadActive', { n: d.baysUploading }))
                : '\u2014';
            const loc = d.location || d.branchCode || '\u2014';
            return '<tr>'
                + '<td><strong>' + esc(d.displayName) + '</strong>'
                + (d.branchCode ? '<br><span class="hint">' + esc(d.branchCode) + '</span>' : '') + '</td>'
                + '<td>' + esc(dockModelLabel(d)) + '</td>'
                + '<td>' + esc(loc) + (d.hostIp ? '<br><span class="hint">' + esc(d.hostIp) + '</span>' : '') + '</td>'
                + '<td>' + linkStatePill(d.linkState || 'pending') + '</td>'
                + '<td>' + esc(baysLabel) + '</td>'
                + '<td>' + uploadLabel + '</td>'
                + '<td>' + fmtLastAuth(d) + '</td>'
                + '<td><button type="button" class="ev-overview-alert-link" data-ev-panel="docks">' + esc(tr('evidenceHub.dockManageLink')) + '</button></td>'
                + '</tr>';
        }).join('');
        const summary = tr('evidenceHub.dockFleetSummary', {
            up: totals.sitesOnline,
            down: totals.sitesOffline,
            bays: totals.baysOccupied,
            total: totals.baysTotal,
        });
        return '<p class="ev-overview-dock-summary hint">' + esc(summary) + '</p>'
            + '<div class="ev-overview-docks-scroll"><table class="ev-overview-docks-table">'
            + '<thead><tr>'
            + '<th>' + esc(tr('evidenceHub.dockColSite')) + '</th>'
            + '<th>' + esc(tr('evidenceHub.dockColModel')) + '</th>'
            + '<th>' + esc(tr('evidenceHub.dockColLocation')) + '</th>'
            + '<th>' + esc(tr('evidenceHub.dockColLink')) + '</th>'
            + '<th>' + esc(tr('evidenceHub.dockColBays')) + '</th>'
            + '<th>' + esc(tr('evidenceHub.dockColUploading')) + '</th>'
            + '<th>' + esc(tr('evidenceHub.dockColLastSignIn')) + '</th>'
            + '<th></th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
            + (docks.some(function (d) { return d.linkState === 'pending' || !d.sdkConnected; })
                ? '<p class="hint ev-overview-dock-note" style="margin-top:8px">' + esc(tr('evidenceHub.sdkPending')) + '</p>' : '');
    }

    function bindOverviewAdminActions(root) {
        if (dashboardRole !== 'super_admin' || !root) return;
        const backupBtn = root.querySelector('#ev-overview-backup');
        const maintBtn = root.querySelector('#ev-overview-maint');
        const msgEl = root.querySelector('#ev-overview-action-msg');
        if (backupBtn && !backupBtn._evBound) {
            backupBtn._evBound = true;
            backupBtn.addEventListener('click', async function () {
                backupBtn.disabled = true;
                if (msgEl) msgEl.textContent = tr('evidenceHub.loading');
                try {
                    const res = await fetch('/api/storage/backup', { method: 'POST', credentials: 'same-origin' });
                    const data = await res.json();
                    if (!res.ok || !data.ok) throwCatalogErr(data);
                    if (msgEl) msgEl.textContent = tr('evidenceHub.storageBackupDone') + ' ' + fmtBytes(data.bytes);
                    loadOverview();
                } catch (err) {
                    if (msgEl) msgEl.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
                } finally {
                    backupBtn.disabled = false;
                }
            });
        }
        if (maintBtn && !maintBtn._evBound) {
            maintBtn._evBound = true;
            maintBtn.addEventListener('click', async function () {
                maintBtn.disabled = true;
                if (msgEl) msgEl.textContent = tr('evidenceHub.loading');
                try {
                    const res = await fetch('/api/storage/maintenance', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json' },
                        body: '{}',
                    });
                    const data = await res.json();
                    if (!res.ok || !data.ok) throwCatalogErr(data);
                    if (msgEl) msgEl.textContent = tr('evidenceHub.storageMaintDone');
                    loadOverview();
                } catch (err) {
                    if (msgEl) msgEl.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
                } finally {
                    maintBtn.disabled = false;
                }
            });
        }
    }

    function showPanel(name, opts) {
        if (name === 'approvals') {
            name = 'catalog';
            opts = Object.assign({}, opts || {}, { focusExportQueue: true });
        }
        if (opts && opts.focusExportQueue) catalogFocusExportQueue = true;
        currentPanel = name;
        const evPanel = document.getElementById('evidence-panel');
        if (evPanel) {
            evPanel.classList.toggle('ev-detail-active', name === 'detail');
            evPanel.classList.toggle('ev-redact-active', name === 'redact');
            if (name !== 'redacted-exports') evPanel.classList.remove('ev-rx-few-rows');
        }
        /* DESTROY-SCROLL-LOCK-V1 \u2014 Storage needs document scroll to Evidence Index */
        try {
            document.documentElement.classList.toggle('ev-storage-scroll-unlock', name === 'settings');
        } catch (_) { /* ignore */ }
        document.querySelectorAll('.evidence-hub-panel').forEach(function (p) {
            p.hidden = p.id !== 'ev-panel-' + name;
        });
        document.querySelectorAll('.evidence-hub-nav-btn').forEach(function (btn) {
            /* redact has no nav chip \u2014 clear active like detail */
            btn.classList.toggle('active', btn.dataset.panel === name);
        });
        if (name === 'redact') {
            document.querySelectorAll('.evidence-hub-nav-btn').forEach(function (btn) {
                btn.classList.remove('active');
            });
        }
        if (opts && opts.skipRefresh) return;
        refreshCurrentPanel(!!(opts && opts.force));
    }

    function refreshCurrentPanel(force) {
        if (!perms.view) return;
        if (currentPanel === 'overview') {
            if (panelWarm('overview', force)) return;
            loadOverview(force);
        } else if (currentPanel === 'docks') {
            if (panelWarm('docks', force)) return;
            loadDocksList(force);
        } else if (currentPanel === 'catalog') {
            if (panelWarm('catalog', force)) return;
            loadCatalog(force);
        } else if (currentPanel === 'redacted-exports') {
            if (panelWarm('redacted-exports', force)) return;
            loadRedactedExports(force);
        } else if (currentPanel === 'settings') {
            if (panelWarm('settings', force)) return;
            if (global.EvidenceStorageUi && EvidenceStorageUi.refresh) EvidenceStorageUi.refresh();
            else if (global.EvidenceManager && EvidenceManager.loadEvidencePaths) EvidenceManager.loadEvidencePaths();
            markPanelLoaded('settings');
        } else if (currentPanel === 'route-trace') {
            if (panelWarm('route-trace', force)) return;
            if (global.RouteTrace && RouteTrace.onShow) RouteTrace.onShow({ force: true });
            markPanelLoaded('route-trace');
        } else if (currentPanel === 'case-files') {
            const warm = panelWarm('case-files', force);
            if (global.CaseFilesUi && CaseFilesUi.onShow) {
                CaseFilesUi.onShow({ force: !!force, warm: warm });
            }
            if (!warm) markPanelLoaded('case-files');
        } else if (currentPanel === 'investigation-holds') {
            if (panelWarm('investigation-holds', force)) return;
            if (global.FrKeptUi && FrKeptUi.onShow) FrKeptUi.onShow({ force: true });
            markPanelLoaded('investigation-holds');
        } else if (currentPanel === 'detail' && currentDetailId) {
            if (panelWarm('detail', force)) return;
            loadDetail(currentDetailId, force);
        } else if (currentPanel === 'redact') {
            markPanelLoaded('redact');
        }
    }

    function healthRow(label, valueHtml) {
        return '<div class="ev-health-row"><span class="ev-health-label">' + esc(label)
            + '</span><span class="ev-health-value">' + valueHtml + '</span></div>';
    }

    function bindPanelJump(root) {
        if (!root) return;
        root.querySelectorAll('[data-ev-panel]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const panel = btn.getAttribute('data-ev-panel');
                const focus = btn.getAttribute('data-ev-focus');
                if (!panel) return;
                showPanel(panel, focus === 'export-queue' ? { focusExportQueue: true } : undefined);
            });
        });
    }

    async function loadOverview(force) {
        const el = document.getElementById('ev-overview-stats');
        if (!el) return;
        if (!panelWarm('overview', force)) {
            el.innerHTML = '<p class="hint">' + tr('evidenceHub.loading') + '</p>';
        }
        try {
            const fetches = [
                fetch('/api/evidence/overview', { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
            ];
            if (dashboardRole === 'super_admin') {
                fetches.push(fetch('/api/evidence/secure-export/queue?status=pending&limit=200', { credentials: 'same-origin' }).then(function (r) { return r.json(); }));
            } else if (perms.download && secureExportEnabled) {
                fetches.push(fetch('/api/evidence/secure-export/mine', { credentials: 'same-origin' }).then(function (r) { return r.json(); }));
            }
            const results = await Promise.all(fetches);
            const ov = results[0];
            const exportRes = results[1];
            if (!ov || !ov.ok) throwCatalogErr(ov);
            const catalog = ov.catalog || {};
            const catalogDown = !catalog.available;
            renderOverviewGuidance(catalogDown);
            const stor = ov.storage || {};
            const val = stor.validation || {};
            const paths = stor.paths || {};
            const backups = stor.backups || {};
            const totals = ov.dockTotals || {};
            const fleet = ov.fleet || {};
            const docks = ov.docks || [];
            let pendingExports = 0;
            if (exportRes && exportRes.ok) {
                if (dashboardRole === 'super_admin') {
                    pendingExports = (exportRes.requests || []).length;
                } else if (exportRes.requests) {
                    pendingExports = exportRes.requests.filter(function (r) {
                        return r.status === 'pending' || r.status === 'approved';
                    }).length;
                }
            }
            const fileN = catalog.available && catalog.fileCount != null ? catalog.fileCount : null;
            const dbBytes = catalog.available && catalog.dbBytes != null ? catalog.dbBytes : null;
            const evBytes = catalog.available && catalog.evidenceBytes != null ? catalog.evidenceBytes : null;
            const archiveHealthy = catalog.available && !!catalog.engine && val.ftp !== false;
            const fileKpi = fileN != null ? String(fileN) : '\u2014';
            const pendingKpi = pendingExports > 0 && dashboardRole === 'super_admin'
                ? '<button type="button" class="ev-kpi ev-kpi-clickable ev-kpi-warn" data-ev-panel="catalog" data-ev-focus="export-queue">'
                    + '<span class="ev-kpi-n">' + pendingExports + '</span>'
                    + '<span class="ev-kpi-l">' + tr('evidenceHub.kpiPendingExports') + '</span></button>'
                : '<div class="ev-kpi' + (pendingExports > 0 ? ' ev-kpi-warn' : '') + '"><span class="ev-kpi-n">' + pendingExports + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiPendingExports') + '</span></div>';
            let html = renderIndexBanner(catalog);
            html += '<div class="ev-kpi-grid">'
                + '<div class="ev-kpi"><span class="ev-kpi-n">' + (totals.sites || 0) + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiDocks') + '</span></div>'
                + '<div class="ev-kpi' + (totals.sitesOffline > 0 ? ' ev-kpi-warn' : '') + '"><span class="ev-kpi-n">' + (totals.sitesOnline || 0) + '/' + (totals.sites || 0) + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiDockSitesUp') + '</span></div>'
                + '<div class="ev-kpi"><span class="ev-kpi-n">' + (fleet.online || 0) + '/' + (fleet.registered || 0) + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiBwcOnline') + '</span></div>'
                + '<div class="ev-kpi"><span class="ev-kpi-n">' + (catalog.available ? (totals.baysOccupied || 0) : '\u2014') + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiBaysOccupied') + '</span></div>'
                + '<div class="ev-kpi' + (catalogDown ? ' ev-kpi-warn' : '') + '"><span class="ev-kpi-n">' + esc(fileKpi) + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiFiles') + '</span></div>'
                + '<div class="ev-kpi' + (archiveHealthy ? '' : ' ev-kpi-warn') + '"><span class="ev-kpi-n">' + esc(archiveHealthy ? tr('evidenceHub.archiveOk') : tr('evidenceHub.archiveWarn')) + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiArchive') + '</span></div>'
                + pendingKpi
                + '</div>';
            html += '<div class="ev-overview-columns">';
            html += '<div class="ev-storage-health"><h4>' + tr('evidenceHub.storageTitle') + '</h4>'
                + '<div class="ev-health-rows">'
                + healthRow(tr('evidenceHub.storageCatalog'), catalog.available
                    ? esc(tr('evidenceHub.storageOk'))
                    : '<span class="ev-path-bad">' + esc(tr('evidenceHub.indexUnavailableShort')) + '</span>')
                + healthRow(tr('evidenceHub.storageDbSize'), catalog.available && dbBytes != null ? esc(fmtBytes(dbBytes)) : '\u2014')
                + healthRow(tr('evidenceHub.storageEvidenceBytes'), catalog.available && evBytes != null ? esc(fmtBytes(evBytes)) : '\u2014')
                + healthRow(tr('evidenceHub.storageArchive'), esc(val.networkArchive ? tr('evidence.archiveNetwork') : tr('evidence.archiveLocal')))
                + healthRow(tr('evidenceHub.storageFtpPath'), esc(paths.ftpLabel || '\u2014') + ' \u00B7 ' + pathStatusHtml(val.ftp))
                + healthRow(tr('evidenceHub.storageNasPath'), esc(paths.nasMountPath || '\u2014') + ' \u00B7 ' + pathStatusHtml(val.nas))
                + healthRow(tr('evidenceHub.storageBackups'), esc(String(backups.count || 0)) + (backups.latest ? ' \u00B7 ' + esc(backups.latest) : ''))
                + '</div>';
            if ((!archiveHealthy || catalogDown) && dashboardRole === 'super_admin') {
                html += '<p class="ev-health-foot"><button type="button" class="ev-health-foot-link" data-ev-panel="settings">'
                    + tr('evidenceHub.openStorage') + '</button></p>';
            }
            if (dashboardRole === 'super_admin' && catalog.available) {
                html += '<div class="evidence-toolbar" style="margin-top:10px">'
                    + '<button type="button" class="btn btn-action btn-sm" id="ev-overview-backup">' + tr('evidenceHub.storageBackupBtn') + '</button>'
                    + '<button type="button" class="btn btn-ghost btn-sm" id="ev-overview-maint">' + tr('evidenceHub.storageMaintBtn') + '</button>'
                    + '<span id="ev-overview-action-msg" class="hint"></span>'
                    + '</div>';
            }
            html += '</div>';
            html += '<div class="ev-dock-fleet-panel"><h4>' + tr('evidenceHub.dockFleetTitle') + '</h4>'
                + renderDockFleetTable(docks, totals, ov.catalogHintsAvailable !== false && catalog.available)
                + '</div></div>';
            html += '<div id="ev-overview-alerts" class="ev-overview-alerts"></div>';
            el.innerHTML = html;
            bindPanelJump(el);
            bindOverviewAdminActions(el);
            const alertsEl = document.getElementById('ev-overview-alerts');
            const alertParts = [];
            if (dashboardRole === 'super_admin' && pendingExports > 0) {
                alertParts.push('<p class="ev-overview-alert ev-overview-alert-warn">'
                    + esc(tr('evidenceHub.alertPendingExports', { count: pendingExports }))
                    + '<button type="button" class="ev-overview-alert-link" data-ev-panel="catalog" data-ev-focus="export-queue">'
                    + esc(tr('evidenceHub.alertReviewExports')) + '</button></p>');
            }
            if (totals.sitesOffline > 0) {
                alertParts.push('<p class="ev-overview-alert ev-overview-alert-warn">'
                    + esc(tr('evidenceHub.alertDocksOffline', { count: totals.sitesOffline }))
                    + '<button type="button" class="ev-overview-alert-link" data-ev-panel="docks">'
                    + esc(tr('evidenceHub.dockManageLink')) + '</button></p>');
            }
            if ((perms.dockAdmin || dashboardRole === 'super_admin') && !totals.sites) {
                alertParts.push('<p class="ev-overview-alert ev-overview-alert-info">'
                    + esc(tr('evidenceHub.noDocks'))
                    + '<button type="button" class="ev-overview-alert-link" data-ev-panel="docks">'
                    + esc(tr('evidenceHub.registerDock')) + '</button></p>');
            }
            if (alertsEl && alertParts.length) {
                alertsEl.innerHTML = alertParts.join('');
                bindPanelJump(alertsEl);
            }
            if (perms.download && secureExportEnabled && dashboardRole !== 'super_admin') {
                await loadMyExportRequests();
            }
            markPanelLoaded('overview');
        } catch (err) {
            renderOverviewGuidance(true);
            el.innerHTML = renderIndexBanner({ available: false, errorKey: 'errors.generic' })
                + '<p class="hint">' + esc(catalogMsg(err.opPayload || err.catalogPayload, err)) + '</p>';
        }
    }

    async function loadMyExportRequests() {
        const wrap = document.getElementById('ev-overview-alerts') || document.getElementById('ev-my-exports');
        if (!wrap) return;
        try {
            const res = await fetch('/api/evidence/secure-export/mine', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            const rows = (data.requests || []).filter(function (r) {
                return r.status === 'pending' || r.status === 'approved';
            }).slice(0, 10);
            const existing = wrap.innerHTML;
            if (!rows.length) {
                return;
            }
            const block = '<div class="ev-overview-alert ev-overview-alert-info" style="flex-direction:column;align-items:stretch">'
                + '<strong style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8">'
                + esc(tr('evidenceHub.myExports')) + '</strong>'
                + '<ul class="ev-attach-list" style="margin:6px 0 0">'
                + rows.map(function (r) {
                    let line = esc(r.requestId) + ' \u00B7 ' + esc(r.evidenceFileId) + ' \u00B7 ' + esc(exportStatusLabel(r.status));
                    if (r.status === 'approved' && !r.consumedAt) {
                        line += ' <a href="/api/evidence/secure-export/stream/' + encodeURIComponent(r.requestId) + '">' + tr('evidenceHub.download') + '</a>';
                    }
                    return '<li>' + line + '</li>';
                }).join('') + '</ul></div>';
            wrap.innerHTML = existing + block;
        } catch (err) {
            const existing = wrap.innerHTML;
            wrap.innerHTML = existing + '<p class="hint">' + esc(catalogMsg(err.opPayload || err.catalogPayload, err)) + '</p>';
        }
    }

    async function loadDocksList(force) {
        const list = document.getElementById('ev-docks-list');
        const grid = document.getElementById('ev-dock-bay-grid');
        if (!list) return;
        if (panelWarm('docks', force)) return;
        list.innerHTML = '<p class="hint">' + tr('evidenceHub.loading') + '</p>';
        try {
            const res = await fetch('/api/docks', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            docksCache = data.docks || [];
            if (!docksCache.length) {
                list.innerHTML = '<p class="setup-hint">' + tr('evidenceHub.noDocks') + '</p>';
                if (grid) grid.innerHTML = '';
                return;
            }
            list.innerHTML = docksCache.map(function (d) {
                const loc = [d.city, d.province, d.country].filter(Boolean).join(', ');
                return '<button type="button" class="ev-dock-row' + (selectedDockId === d.id ? ' active' : '') + '" data-dock-id="' + esc(d.id) + '">'
                    + '<strong>' + esc(d.displayName) + '</strong>'
                    + '<span class="hint">' + esc(d.branchCode) + ' \u00B7 ' + esc(d.bayPreset) + '-bay</span>'
                    + (loc ? '<span class="hint">' + esc(loc) + '</span>' : '')
                    + '</button>';
            }).join('');
            if (!selectedDockId && docksCache[0]) selectedDockId = docksCache[0].id;
            if (selectedDockId) loadDockBays(selectedDockId);
            markPanelLoaded('docks');
        } catch (err) {
            list.innerHTML = '<p class="hint">' + esc(catalogMsg(err.opPayload || err.catalogPayload, err)) + '</p>';
        }
    }

    async function loadDockBays(dockId) {
        const grid = document.getElementById('ev-dock-bay-grid');
        const title = document.getElementById('ev-dock-bay-title');
        if (!grid) return;
        grid.innerHTML = '<p class="hint">' + tr('evidenceHub.loading') + '</p>';
        try {
            const res = await fetch('/api/docks/' + encodeURIComponent(dockId) + '/bays', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            const layout = data.layout;
            const dock = docksCache.find(function (d) { return d.id === dockId; });
            if (title && dock) {
                title.textContent = dock.displayName + ' (' + layout.count + ' bays)';
            }
            grid.style.gridTemplateColumns = 'repeat(' + layout.cols + ', 1fr)';
            grid.style.gridTemplateRows = 'repeat(' + layout.rows + ', 1fr)';
            grid.innerHTML = layout.bays.map(function (bay) {
                const cls = 'ev-bay-card state-' + (bay.state || 'empty');
                let sub = bay.state === 'empty' ? tr('evidenceHub.bayEmpty') : esc(bay.serial || '\u2014');
                if (bay.state === 'uploading' && bay.progress != null) sub += ' \u00B7 ' + bay.progress + '%';
                if (bay.assignee) sub += '<br><span class="hint">' + esc(bay.assignee) + '</span>';
                return '<div class="' + cls + '" data-bay="' + bay.bay + '">'
                    + '<span class="ev-bay-n">' + tr('evidenceHub.bayN', { n: bay.bay }) + '</span>'
                    + '<span class="ev-bay-body">' + sub + '</span></div>';
            }).join('');
            if (!layout.sdkConnected) {
                const wrap = grid.parentElement;
                if (wrap) {
                    let note = wrap.querySelector('.ev-sdk-note');
                    if (!note) {
                        note = document.createElement('p');
                        note.className = 'setup-hint ev-sdk-note';
                        wrap.appendChild(note);
                    }
                    note.textContent = tr('evidenceHub.sdkPending');
                }
            }
        } catch (err) {
            grid.innerHTML = '<p class="hint">' + esc(catalogMsg(err.opPayload || err.catalogPayload, err)) + '</p>';
        }
    }

    function openDockForm(dock) {
        const dlg = document.getElementById('ev-dock-dialog');
        if (!dlg) return;
        dlg.hidden = false;
        document.getElementById('ev-dock-edit-id').value = dock ? dock.id : '';
        document.getElementById('ev-dock-display-name').value = dock ? dock.displayName : '';
        document.getElementById('ev-dock-branch-code').value = dock ? dock.branchCode : '';
        const productEl = document.getElementById('ev-dock-product');
        if (productEl) productEl.value = dock ? (dock.productCode || '') : '';
        document.getElementById('ev-dock-bay-preset').value = dock ? dock.bayPreset : '8';
        document.getElementById('ev-dock-country').value = dock ? (dock.country || '') : '';
        document.getElementById('ev-dock-province').value = dock ? (dock.province || '') : '';
        document.getElementById('ev-dock-city').value = dock ? (dock.city || '') : '';
        document.getElementById('ev-dock-site').value = dock ? (dock.siteName || '') : '';
        document.getElementById('ev-dock-address').value = dock ? (dock.address || '') : '';
        document.getElementById('ev-dock-host').value = dock ? (dock.hostIp || '') : '';
        document.getElementById('ev-dock-ftp-sub').value = dock ? (dock.ftpSubfolder || '') : '';
        document.getElementById('ev-dock-notes').value = dock ? (dock.notes || '') : '';
        document.getElementById('ev-dock-dialog-title').textContent = dock
            ? tr('evidenceHub.editDock') : tr('evidenceHub.registerDock');
    }

    async function saveDockForm() {
        if (!perms.dockAdmin) { alert(tr('evidenceHub.noDockPerm')); return; }
        const id = document.getElementById('ev-dock-edit-id').value.trim();
        const body = {
            displayName: document.getElementById('ev-dock-display-name').value.trim(),
            branchCode: document.getElementById('ev-dock-branch-code').value.trim(),
            productCode: (document.getElementById('ev-dock-product') || {}).value || '',
            bayPreset: document.getElementById('ev-dock-bay-preset').value,
            country: document.getElementById('ev-dock-country').value.trim(),
            province: document.getElementById('ev-dock-province').value.trim(),
            city: document.getElementById('ev-dock-city').value.trim(),
            siteName: document.getElementById('ev-dock-site').value.trim(),
            address: document.getElementById('ev-dock-address').value.trim(),
            hostIp: document.getElementById('ev-dock-host').value.trim(),
            ftpSubfolder: document.getElementById('ev-dock-ftp-sub').value.trim(),
            notes: document.getElementById('ev-dock-notes').value.trim(),
        };
        const url = id ? ('/api/docks/' + encodeURIComponent(id)) : '/api/docks';
        const res = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwCatalogErr(data);
        document.getElementById('ev-dock-dialog').hidden = true;
        selectedDockId = data.dock.id;
        loadDocksList(true);
    }

    function catalogTagFilterValue() {
        const el = document.getElementById('ev-catalog-tag-filter');
        return el ? String(el.value || '').trim().toLowerCase() : '';
    }

    function updateCatalogPager(page, pageCount, total) {
        const wrap = document.getElementById('ev-catalog-pager');
        const label = document.getElementById('ev-catalog-page-label');
        const prev = document.getElementById('ev-catalog-prev');
        const next = document.getElementById('ev-catalog-next');
        if (!wrap) return;
        const pages = Math.max(1, pageCount || 1);
        const p = Math.max(1, page || 1);
        catalogPage = p;
        if (total <= 0) {
            wrap.hidden = true;
            return;
        }
        wrap.hidden = false;
        if (label) {
            label.textContent = tr('evidenceHub.pageLabel', {
                page: p,
                pages: pages,
                total: total,
            });
        }
        if (prev) prev.disabled = p <= 1;
        if (next) next.disabled = p >= pages;
    }

    function syncCatalogStatusButtons() {
        document.querySelectorAll('.ev-catalog-status-btn').forEach(function (btn) {
            const on = btn.getAttribute('data-status') === catalogStatus;
            btn.classList.toggle('is-active', on);
        });
    }

    function cryptoStatusLabel(status) {
        if (status === 'encrypted') return tr('evidenceHub.cryptoEncrypted');
        if (status === 'plaintext') return tr('evidenceHub.cryptoPlaintext');
        return tr('evidenceHub.cryptoMissing');
    }

    function renderTagChips(tags) {
        if (!tags || !tags.length) return '';
        return '<div class="ev-tag-chips">' + tags.map(function (t) {
            return '<span class="ev-tag-chip">' + esc(t) + '</span>';
        }).join('') + '</div>';
    }

    function rxStatusLabel(status) {
        if (status === 'finalized') return tr('evidenceHub.redactFinalized');
        if (status === 'draft') return tr('evidenceHub.redactDraft');
        return tr('evidenceHub.redactPendingNote');
    }

    function setRedactedExportsLayout(fewRows, count) {
        /* REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-V1 — few-rows includes 0 (scroll only when full). */
        const n = count == null ? 0 : Number(count);
        const few = !Number.isFinite(n) ? !!fewRows : n <= 12;
        const wrap = document.getElementById('ev-rx-table-wrap');
        const panel = document.getElementById('ev-panel-redacted-exports');
        if (wrap) wrap.classList.toggle('ev-rx-few-rows', few);
        if (panel) panel.classList.toggle('ev-rx-few-rows', few);
        const evPanel = document.getElementById('evidence-panel');
        if (evPanel) {
            const onRx = !!(panel && !panel.hidden);
            evPanel.classList.toggle('ev-rx-few-rows', onRx && few);
        }
    }

    async function loadRedactedExports(force) {
        const tbody = document.getElementById('ev-rx-tbody');
        const meta = document.getElementById('ev-rx-meta');
        const pager = document.getElementById('ev-rx-pager');
        const pageLabel = document.getElementById('ev-rx-page-label');
        if (!tbody) return;
        if (!perms.export && !perms.superAdmin) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(tr('evidenceHub.noViewPerm')) + '</td></tr>';
            setRedactedExportsLayout(true, 0);
            return;
        }
        if (!panelWarm('redacted-exports', force)) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(tr('evidenceHub.loading')) + '</td></tr>';
        }
        const qEl = document.getElementById('ev-rx-search');
        const periodEl = document.getElementById('ev-rx-period');
        const statusEl = document.getElementById('ev-rx-status');
        const tagEl = document.getElementById('ev-rx-tag');
        const qs = new URLSearchParams();
        qs.set('page', String(rxPage));
        qs.set('pageSize', String(RX_PAGE_SIZE));
        qs.set('status', (statusEl && statusEl.value) || 'finalized');
        if (periodEl && periodEl.value) qs.set('period', periodEl.value);
        if (qEl && qEl.value.trim()) qs.set('q', qEl.value.trim());
        if (tagEl && tagEl.value.trim()) qs.set('tag', tagEl.value.trim());
        try {
            const res = await fetch('/api/evidence/exports?' + qs.toString(), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            const rows = data.exports || [];
            const total = data.total != null ? data.total : rows.length;
            const pageCount = data.pageCount != null ? data.pageCount : 1;
            if (data.page) rxPage = data.page;
            if (meta) meta.textContent = tr('evidenceHub.redactedExportsMeta', { total: total });
            if (pager) pager.hidden = pageCount <= 1;
            if (pageLabel) {
                pageLabel.textContent = tr('evidenceHub.redactedExportsPageLabel', {
                    page: rxPage,
                    pages: Math.max(1, pageCount),
                    total: total,
                });
            }
            if (!rows.length) {
                const emptyKey = (total === 0)
                    ? 'evidenceHub.redactedExportsEmptyZero'
                    : 'evidenceHub.redactedExportsEmpty';
                tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(tr(emptyKey)) + '</td></tr>';
                setRedactedExportsLayout(true, 0);
            } else {
                tbody.innerHTML = rows.map(function (e) {
                    const st = e.status || (e.meta && e.meta.status) || 'pending';
                    const canDl = (perms.export || perms.superAdmin) && st === 'finalized';
                    const dl = canDl
                        ? '<a class="ev-rx-action-link" href="/api/evidence/export-stream/'
                            + encodeURIComponent(e.exportId) + '">' + esc(tr('evidenceHub.download')) + '</a>'
                        : '';
                    const open = e.evidenceFileId
                        ? '<button type="button" class="ev-rx-action-link ev-rx-open" data-file-id="'
                            + esc(e.evidenceFileId) + '">' + esc(tr('evidenceHub.redactedExportsOpenSource')) + '</button>'
                        : '';
                    /* REDACTED-DETAIL-FULL-ROW-LINE-V1 \u2014 flex inside wrapper; td keeps full-width line */
                    const actions = '<div class="ev-rx-actions-inner">' + dl + open + '</div>';
                    const officer = e.sourceOfficer || '\u2014';
                    const device = e.sourceDeviceId ? (' \u00B7 ' + e.sourceDeviceId) : '';
                    const tags = (e.sourceTags && e.sourceTags.length)
                        ? '<br><span class="hint">' + esc(e.sourceTags.join(', ')) + '</span>'
                        : '';
                    const fileName = e.fileName || '\u2014';
                    const sourceName = e.sourceFileName || '\u2014';
                    return '<tr>'
                        + '<td><span class="hint">[' + esc(tr('evidenceHub.redactType')) + ']</span> '
                        + '<span class="ev-rx-name" title="' + esc(fileName) + '">' + esc(fileName) + '</span></td>'
                        + '<td>' + esc(fmtBytes(e.byteSize)) + '</td>'
                        + '<td>' + esc(rxStatusLabel(st)) + '</td>'
                        + '<td><span class="ev-rx-source" title="' + esc(sourceName) + '">' + esc(sourceName) + '</span>'
                        + tags + '</td>'
                        + '<td>' + esc(officer) + esc(device) + '</td>'
                        + '<td class="mono">' + esc(fmtTime(e.whenAt || e.createdAt)) + '</td>'
                        + '<td class="ev-rx-actions">' + actions + '</td>'
                        + '</tr>';
                }).join('');
                setRedactedExportsLayout(rows.length <= 12, rows.length);
            }
            markPanelLoaded('redacted-exports');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">'
                + esc(catalogMsg(err.opPayload || err.catalogPayload, err, 'evidenceHub.redactedExportsLoadFail'))
                + '</td></tr>';
            setRedactedExportsLayout(true, 0);
        }
    }

    async function loadCatalog(force) {
        const tbody = document.getElementById('evidence-tbody');
        const meta = document.getElementById('evidence-meta');
        const emptyEl = document.getElementById('ev-catalog-empty');
        if (!tbody) return;
        if (!perms.view) {
            showCatalogTable(true);
            tbody.innerHTML = '<tr><td colspan="7" class="hint">\u2014</td></tr>';
            renderCatalogExportQueue(null);
            updateCatalogPager(1, 1, 0);
            return;
        }
        showCatalogTable(true);
        if (!panelWarm('catalog', force)) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">' + tr('evidenceHub.loading') + '</td></tr>';
            if (meta) meta.textContent = '';
            renderCatalogExportQueue(null, true);
        }
        try {
            const tagQ = catalogTagFilterValue();
            const catalogUrl = '/api/evidence/catalog?page=' + encodeURIComponent(catalogPage)
                + '&pageSize=' + encodeURIComponent(CATALOG_PAGE_SIZE)
                + '&status=' + encodeURIComponent(catalogStatus)
                + (tagQ ? ('&tag=' + encodeURIComponent(tagQ)) : '');
            const fetches = [
                fetch(catalogUrl, { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
            ];
            if (perms.superAdmin) {
                fetches.push(fetch('/api/evidence/secure-export/queue?status=pending&limit=50', { credentials: 'same-origin' }).then(function (r) { return r.json(); }));
            }
            const results = await Promise.all(fetches);
            const data = results[0];
            if (!data || !data.ok) throwCatalogErr(data);
            if (perms.superAdmin) {
                renderCatalogExportQueue(results[1] && results[1].ok ? results[1] : null);
            } else {
                renderCatalogExportQueue(null);
            }
            const files = data.files || [];
            const total = data.total != null ? data.total : files.length;
            const page = data.page != null ? data.page : catalogPage;
            const pageCount = data.pageCount != null ? data.pageCount : 1;
            updateCatalogPager(page, pageCount, total);
            if (!files.length) {
                if (meta) meta.textContent = '';
                showCatalogEmptyState(emptyEl, { unavailable: false });
                focusCatalogExportQueueIfNeeded();
                markPanelLoaded('catalog');
                return;
            }
            showCatalogTable(true);
            if (meta) {
                meta.textContent = tagQ
                    ? tr('evidenceHub.tagFilterActive', { tag: tagQ })
                    : '';
            }
            tbody.innerHTML = files.map(function (f) {
                const statusText = f.storageAvailable === false
                    ? tr('evidenceHub.statusMissing')
                    : (f.storageRepaired ? tr('evidenceHub.statusRepaired') : tr('evidenceHub.statusAvailable'));
                const tagsHtml = renderTagChips(f.tags);
                return '<tr data-file-id="' + esc(f.id) + '">'
                    + '<td><code>' + esc(f.id) + '</code></td>'
                    + '<td>' + esc(f.fileName) + '<br><span class="hint">' + fmtBytes(f.byteSize) + '</span>' + tagsHtml + '</td>'
                    + '<td>' + esc(f.operatorName || '\u2014') + '</td>'
                    + '<td>' + esc(fmtTime(f.uploadedAt)) + '</td>'
                    + '<td>' + esc(f.storageTier || f.source || 'local') + '</td>'
                    + '<td><button type="button" class="btn btn-ghost btn-sm ev-open-detail" data-file-id="' + esc(f.id) + '">' + tr('evidenceHub.open') + '</button><br><span class="hint">' + esc(statusText) + '</span></td>'
                    + '<td>' + (perms.download
                        ? (perms.superAdmin || !secureExportEnabled
                            ? '<button type="button" class="btn btn-action btn-sm evidence-dl-btn" data-file-id="' + esc(f.id) + '">' + tr('evidenceHub.download') + '</button>'
                            : '<button type="button" class="btn btn-action btn-sm evidence-secure-btn" data-file-id="' + esc(f.id) + '">' + tr('evidenceHub.requestSecure') + '</button>')
                        : '\u2014') + '</td>'
                    + '</tr>';
            }).join('');
            focusCatalogExportQueueIfNeeded();
            markPanelLoaded('catalog');
        } catch (err) {
            renderCatalogExportQueue(null);
            updateCatalogPager(1, 1, 0);
            showCatalogEmptyState(emptyEl, {
                unavailable: true,
                message: catalogMsg(err.opPayload || err.catalogPayload, err),
            });
            focusCatalogExportQueueIfNeeded();
        }
    }

    function renderCatalogExportQueue(pendingData, loading) {
        const queueEl = document.getElementById('ev-catalog-export-queue');
        const exportMeta = document.getElementById('evidence-export-meta');
        if (!perms.superAdmin) {
            if (queueEl) {
                queueEl.hidden = true;
                queueEl.innerHTML = '';
            }
            if (exportMeta) {
                exportMeta.hidden = true;
                exportMeta.textContent = '';
            }
            return;
        }
        if (exportMeta) exportMeta.hidden = false;
        if (loading) {
            if (exportMeta) exportMeta.textContent = tr('evidenceHub.loading');
            if (queueEl) {
                queueEl.hidden = true;
                queueEl.innerHTML = '';
            }
            return;
        }
        const rows = (pendingData && pendingData.requests) ? pendingData.requests : [];
        if (pendingData && pendingData.secureExportEnabled === false) {
            if (exportMeta) {
                exportMeta.textContent = tr('evidenceHub.approvalsDisabledNote');
                exportMeta.classList.remove('ev-export-meta-warn');
            }
            if (queueEl) {
                queueEl.hidden = true;
                queueEl.innerHTML = '';
            }
            return;
        }
        if (exportMeta) {
            exportMeta.textContent = rows.length
                ? tr('evidenceHub.approvalsPendingMeta', { n: rows.length })
                : tr('evidenceHub.approvalsQueueClear');
            exportMeta.classList.toggle('ev-export-meta-warn', rows.length > 0);
        }
        if (!queueEl) return;
        if (!rows.length) {
            queueEl.hidden = true;
            queueEl.innerHTML = '';
            return;
        }
        queueEl.hidden = false;
        queueEl.innerHTML = '<div class="ev-catalog-export-queue-inner">'
            + '<h4>' + esc(tr('evidenceHub.approvalsPendingTitle'))
            + ' <span class="ev-approvals-count">' + esc(String(rows.length)) + '</span></h4>'
            + '<p class="setup-hint ev-export-queue-hint">' + esc(tr('evidenceHub.approvalsHint')) + '</p>'
            + '<div class="ev-approvals-pending-list">' + renderApprovalCards(rows) + '</div>'
            + '</div>';
    }

    function focusCatalogExportQueueIfNeeded() {
        if (!catalogFocusExportQueue) return;
        const el = document.getElementById('ev-catalog-export-queue');
        if (el && !el.hidden) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        catalogFocusExportQueue = false;
    }

    function showCatalogTable(show) {
        const emptyEl = document.getElementById('ev-catalog-empty');
        const wrap = document.getElementById('ev-catalog-table-wrap');
        if (emptyEl) emptyEl.hidden = !!show;
        if (wrap) wrap.hidden = !show;
    }

    function showCatalogEmptyState(el, opts) {
        if (!el) return;
        showCatalogTable(false);
        el.innerHTML = renderCatalogEmptyState(opts || {});
        el.hidden = false;
        bindPanelJump(el);
        const refreshBtn = el.querySelector('.ev-catalog-empty-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () { loadCatalog(true); });
        }
    }

    function renderCatalogEmptyState(opts) {
        opts = opts || {};
        const unavailable = !!opts.unavailable;
        const title = unavailable
            ? tr('evidenceHub.catalogUnavailableTitle')
            : tr('evidenceHub.catalogEmptyTitle');
        const lead = unavailable
            ? esc(opts.message || tr('evidenceHub.catalogEmptyUnavailableLead'))
            : esc(tr('evidenceHub.catalogEmptyLead'));
        let body = '<p class="ev-catalog-empty-title">' + esc(title) + '</p>'
            + '<p class="hint">' + lead + '</p>';
        if (!unavailable) {
            body += '<ol class="ev-catalog-empty-steps">'
                + '<li>' + esc(tr('evidenceHub.catalogEmptyStep1')) + '</li>'
                + '<li>' + esc(tr('evidenceHub.catalogEmptyStep2')) + '</li>'
                + '<li>' + esc(tr('evidenceHub.catalogEmptyStep3')) + '</li>'
                + '</ol>'
                + '<p class="ev-catalog-empty-note">' + esc(tr('evidenceHub.catalogEmptyNote')) + '</p>';
        } else if (perms.superAdmin) {
            body += '<p class="ev-catalog-empty-note">' + esc(tr('evidenceHub.catalogEmptyUnavailableNote')) + '</p>';
        }
        let actions = '<div class="ev-catalog-empty-actions">';
        if (perms.superAdmin) {
            actions += '<button type="button" class="btn btn-action btn-sm ev-guidance-link" data-ev-panel="settings">'
                + esc(tr('evidenceHub.navSettings')) + '</button>';
        }
        if (perms.dockAdmin || perms.superAdmin) {
            actions += '<button type="button" class="btn btn-ghost btn-sm ev-guidance-link" data-ev-panel="docks">'
                + esc(tr('evidenceHub.navDocks')) + '</button>';
        }
        actions += '<button type="button" class="btn btn-ghost btn-sm ev-catalog-empty-refresh">'
            + esc(tr('evidence.refresh')) + '</button>'
            + '</div>';
        return '<div class="ev-catalog-empty-inner">' + body + actions + '</div>';
    }

    async function loadDetail(fileId, force, opts) {
        opts = opts || {};
        /* quiet: refresh detail DOM without switching away from redact/Finalize panel */
        const quiet = !!opts.quiet;
        currentDetailId = fileId;
        const wrap = document.getElementById('ev-detail-body');
        if (!wrap) return;
        if (panelWarm('detail', force, fileId)) {
            if (!quiet) showPanel('detail', { skipRefresh: true });
            return;
        }
        if (!quiet) {
            wrap.innerHTML = '<p class="hint">' + tr('evidenceHub.loading') + '</p>';
            showPanel('detail', { skipRefresh: true });
        }
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            const d = data.detail;
            const f = d.file;
            const m = d.meta || {};
            const sosOpts = await fetchSosOptions(f.deviceId);
            const previewBlock = d.storageAvailable === false
                ? renderMissingPreview(d)
                : renderControlledPreview(f);
            const trimBar = (perms.export && d.storageAvailable !== false && !isImageEvidenceName(f.fileName)) ? (
                '<div class="ev-trim-bar" id="ev-trim-bar">'
                + '<span class="ev-trim-bar-title">' + tr('evidenceHub.trimExport') + '</span>'
                + '<span class="ev-trim-field"><label>' + tr('evidenceHub.trimStartShort') + '</label>'
                + '<input type="number" id="ev-trim-start" min="0" step="0.1" value="0">'
                + '<button type="button" class="btn btn-ghost btn-sm ev-trim-mark" id="ev-trim-set-start" title="' + esc(tr('evidenceHub.trimUsePlayheadTitle')) + '">' + tr('evidenceHub.trimUsePlayhead') + '</button></span>'
                + '<span class="ev-trim-field"><label>' + tr('evidenceHub.trimEndShort') + '</label>'
                + '<input type="number" id="ev-trim-end" min="0" step="0.1" value="" placeholder="' + esc(tr('evidenceHub.trimEndAuto')) + '">'
                + '<button type="button" class="btn btn-ghost btn-sm ev-trim-mark" id="ev-trim-set-end" title="' + esc(tr('evidenceHub.trimUsePlayheadTitle')) + '">' + tr('evidenceHub.trimUsePlayhead') + '</button></span>'
                + '<button type="button" class="btn btn-action btn-sm" id="ev-trim-export">' + tr('evidenceHub.exportTrim') + '</button>'
                + '<span class="ev-trim-len" id="ev-trim-len"></span>'
                + '<span class="ev-trim-hint hint">' + tr('evidenceHub.trimHint') + '</span>'
                + '</div>'
            ) : '';
            wrap.innerHTML =
                '<div class="ev-detail-head">'
                + '<button type="button" class="btn btn-ghost btn-sm" id="ev-detail-back">← ' + tr('evidenceHub.backCatalog') + '</button>'
                + '<h3>' + esc(f.fileName) + '</h3>'
                + '<div class="ev-detail-id-row">'
                + '<span class="ev-detail-id-label">' + esc(tr('evidenceHub.fileId')) + '</span>'
                + '<code>' + esc(f.id) + '</code>'
                + '</div></div>'
                + '<div class="ev-detail-grid">'
                + '<div class="ev-detail-video">' + previewBlock + trimBar + '</div>'
                + '<div class="ev-detail-side">'
                + '<dl class="ss-dock-ro"><dt>' + tr('evidence.colOfficer') + '</dt><dd>' + esc(f.operatorName || '\u2014') + '</dd>'
                + '<dt>' + tr('evidence.colUploaded') + '</dt><dd>' + esc(fmtTime(f.uploadedAt)) + '</dd>'
                + '<dt>' + tr('evidenceHub.size') + '</dt><dd>' + fmtBytes(f.byteSize) + '</dd>'
                + '<dt>SHA-256</dt><dd><code>' + esc(f.sha256 || tr('evidenceHub.hashLegacyPending')) + '</code></dd>'
                + '<dt>' + tr('evidenceHub.colStatus') + '</dt><dd>' + esc(d.storageAvailable === false ? tr('evidenceHub.statusMissing') : tr('evidenceHub.statusAvailable'))
                + ' <span class="ev-crypto-chip ' + esc(d.cryptoStatus || 'missing') + '">' + esc(cryptoStatusLabel(d.cryptoStatus)) + '</span>'
                + (d.archived ? (' <span class="ev-crypto-chip missing">' + esc(tr('evidenceHub.archivedBadge')) + '</span>') : '')
                + '</dd></dl>'
                /* mob-evidence-redact-action-top-v1 \u2014 Redact with top actions, not after custody */
                + (function () {
                    const redactTop = perms.superAdmin
                        ? ('<button type="button" class="btn btn-action btn-sm" id="ev-detail-redact">' + tr('evidenceHub.openRedact') + '</button>')
                        : '';
                    if (perms.edit) {
                        return '<label class="full"><span>' + tr('evidenceHub.notes') + '</span>'
                            + '<textarea id="ev-detail-notes" rows="3">' + esc(m.notes || '') + '</textarea></label>'
                            + '<label class="full"><span>' + tr('evidenceHub.tags') + ' <span class="hint">' + tr('evidenceHub.tagsExample') + '</span></span>'
                            + '<input type="text" id="ev-detail-tags" class="login-input" value="' + esc((m.tags || []).join(', ')) + '" autocomplete="off" spellcheck="false" placeholder="' + esc(tr('evidenceHub.tagsPlaceholder')) + '"></label>'
                            + '<label class="full"><span>' + tr('evidenceHub.linkSos') + '</span>'
                            + '<select id="ev-detail-sos">' + sosOpts + '</select></label>'
                            + '<label class="full"><span>' + tr('evidenceHub.attachPhoto') + '</span>'
                            + '<input type="file" id="ev-detail-photo" accept="image/*"></label>'
                            + '<div class="ev-detail-side-actions">'
                            + redactTop
                            + '<button type="button" class="btn btn-action btn-sm" id="ev-detail-save-meta">' + tr('evidenceHub.saveMeta') + '</button>'
                            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-detail-add-case">' + tr('caseFiles.addToCase') + '</button>'
                            + (d.archived
                                ? ('<button type="button" class="btn btn-action btn-sm" id="ev-detail-restore">' + tr('evidenceHub.restore') + '</button>')
                                : ('<button type="button" class="btn btn-ghost btn-sm" id="ev-detail-archive">' + tr('evidenceHub.archive') + '</button>'))
                            + '</div>'
                            + '<p class="hint ev-detail-save-hint" id="ev-detail-save-hint" hidden aria-live="polite"></p>';
                    }
                    if (redactTop) {
                        return '<div class="ev-detail-side-actions">' + redactTop + '</div>'
                            + (m.tags && m.tags.length
                                ? ('<div class="full"><span class="hint">' + tr('evidenceHub.tags') + '</span>' + renderTagChips(m.tags) + '</div>')
                                : '');
                    }
                    return (m.tags && m.tags.length
                        ? ('<div class="full"><span class="hint">' + tr('evidenceHub.tags') + '</span>' + renderTagChips(m.tags) + '</div>')
                        : '');
                }())
                + renderAttachments(d.attachments)
                + renderRedactPendingBanner(fileId, d.exports)
                + renderExports(d.exports)
                + renderCustodyLog(d.custodyLog, d.storageAvailable === false, !!d.custodyUnavailable)
                /* mob-evidence-detail-hide-original-download-v1 \u2014 no bottom original Download (use library / Prior exports). */
                + (perms.download && secureExportEnabled && !perms.superAdmin ? (
                    '<div class="ev-export-actions">'
                    + '<button type="button" class="btn btn-action btn-sm" id="ev-detail-secure">' + tr('evidenceHub.requestSecure') + '</button>'
                    + '</div>'
                ) : '')
                + '</div></div>';
            if (m.sosIncidentId) {
                const sel = document.getElementById('ev-detail-sos');
                if (sel) sel.value = m.sosIncidentId;
            }
            bindDetailActions(fileId, f, d.previewUrl, d.storageAvailable !== false);
            captureDetailMetaBaseline();
            markPanelLoaded('detail', fileId);
            if (!quiet) {
                /* already on detail */
            }
        } catch (err) {
            if (!quiet) {
                wrap.innerHTML = '<p class="hint">' + esc(tr('evidenceHub.detailLoadFailed')) + '</p>';
            }
        }
    }

    function renderCustodyLog(log, storageMissing, auditUnavailable) {
        const rows = Array.isArray(log) ? log : [];
        let html = '<div class="ev-custody-block"><h4>' + tr('evidenceHub.custodyTitle') + '</h4>';
        if (auditUnavailable) {
            html += '<p class="hint ev-custody-missing-note">' + esc(tr('evidenceHub.custodyUnavailable')) + '</p>';
        } else if (storageMissing) {
            html += '<p class="hint ev-custody-missing-note">' + esc(tr('evidenceHub.custodyMissingNote')) + '</p>';
        }
        if (!rows.length) {
            html += '<p class="hint">' + esc(tr(auditUnavailable ? 'evidenceHub.custodyEmptyUnavailable' : 'evidenceHub.custodyEmpty')) + '</p></div>';
            return html;
        }
        html += '<ul class="ev-custody-list">' + rows.map(function (row) {
            const summary = row.summary ? '<span class="ev-custody-summary">' + esc(row.summary) + '</span>' : '';
            return '<li class="ev-custody-row">'
                + '<span class="ev-custody-time mono">' + esc(fmtTime(row.ts)) + '</span>'
                + '<span class="ev-custody-actor">' + esc(row.actor || '\u2014') + '</span>'
                + '<span class="ev-custody-action">' + esc(row.label || row.action || '\u2014') + '</span>'
                + summary
                + '</li>';
        }).join('') + '</ul></div>';
        return html;
    }

    function renderAttachments(list) {
        if (!list || !list.length) return '<p class="hint">' + tr('evidenceHub.noAttachments') + '</p>';
        return '<ul class="ev-attach-list">' + list.map(function (a) {
            return '<li><a href="/api/evidence/attachment/' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">' + esc(a.fileName) + '</a></li>';
        }).join('') + '</ul>';
    }

    function renderRedactPendingBanner(fileId, exports) {
        const pendingList = listPendingRedactExports(exports);
        const pendingRow = newestPendingRedactExport(exports);
        let session = getRedactPending(fileId);
        /* REDACT-FINALIZE-DONE-NO-LOOP-V1 — drop stale "Finish Finalize" when export already Finalized. */
        if (session && session.exportId) {
            const sessRow = findExportById(exports, session.exportId);
            if (sessRow && (sessRow.meta || {}).status === 'finalized') {
                clearRedactPending(fileId);
                session = null;
            } else if (!pendingRow && !sessRow) {
                clearRedactPending(fileId);
                session = null;
            } else if (!pendingRow && sessRow && (sessRow.meta || {}).status === 'finalized') {
                clearRedactPending(fileId);
                session = null;
            }
        }
        if (!pendingRow && !session) return '';
        const exportId = (pendingRow && pendingRow.exportId) || (session && session.exportId) || '';
        if (!exportId) return '';
        if (pendingRow && (pendingRow.meta || {}).status === 'finalized') {
            clearRedactPending(fileId);
            return '';
        }
        const extra = pendingList.length > 1
            ? (' <span class="hint">(' + esc(tr('evidenceHub.redactPendingCount', { n: pendingList.length })) + ')</span>')
            : '';
        const cleanBtn = (perms.superAdmin && pendingList.length >= 2)
            ? ('<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-clean-drafts-banner">'
                + esc(tr('evidenceHub.exportCleanDrafts')) + '</button>')
            : '';
        return '<div class="ev-redact-pending-banner" id="ev-redact-pending-banner" role="status">'
            + '<div class="ev-redact-pending-main">'
            + '<p class="ev-redact-pending-text">' + esc(tr('evidenceHub.redactPendingBanner')) + extra + '</p>'
            + '<p class="hint">' + esc(tr('evidenceHub.redactWhereDownloadShort')) + '</p>'
            + '<p class="hint">' + esc(tr('evidenceHub.redactDismissPendingHint')) + '</p>'
            + '<p class="hint ev-redact-cleanup-err" id="ev-redact-cleanup-err" hidden></p>'
            + '</div>'
            + '<div class="ev-redact-pending-actions">'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-finish-banner" data-export-id="'
            + esc(exportId) + '">' + esc(tr('evidenceHub.redactFinishFinalize')) + '</button>'
            + cleanBtn
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-dismiss-banner" title="'
            + esc(tr('evidenceHub.redactDismissPendingHint')) + '">'
            + esc(tr('evidenceHub.redactDismissPending')) + '</button>'
            + '</div></div>';
    }

    function findExportById(exports, exportId) {
        const id = String(exportId || '').trim();
        if (!id || !Array.isArray(exports)) return null;
        for (let i = 0; i < exports.length; i++) {
            if (exports[i] && String(exports[i].exportId) === id) return exports[i];
        }
        return null;
    }

    function isAlreadyFinalizedErr(errOrData) {
        if (!errOrData) return false;
        const parts = [];
        if (typeof errOrData === 'string') {
            parts.push(errOrData);
        } else {
            parts.push(errOrData.error, errOrData.message, errOrData.err);
            if (errOrData.opPayload) {
                parts.push(errOrData.opPayload.error, errOrData.opPayload.message);
            }
            if (errOrData.catalogPayload) {
                parts.push(errOrData.catalogPayload.error, errOrData.catalogPayload.message);
            }
        }
        return /already finalized/i.test(parts.filter(Boolean).join(' '));
    }

    function canDownloadExport() {
        return !!(perms.export || perms.superAdmin);
    }

    function exportBurnWhen(e) {
        const meta = (e && e.meta) || {};
        return meta.finalizedAt || e.createdAt || null;
    }

    function renderExports(list) {
        if (!list || !list.length) return '';
        const all = Array.isArray(list) ? list.slice() : [];
        const finalized = [];
        const pending = [];
        const trims = [];
        const other = [];
        all.forEach(function (e) {
            if (!e) return;
            if (e.exportType === 'trim') {
                trims.push(e);
                return;
            }
            if (e.exportType !== 'redact') {
                other.push(e);
                return;
            }
            const st = (e.meta && e.meta.status) || '';
            if (st === 'finalized') finalized.push(e);
            else pending.push(e);
        });
        const PENDING_SHOW = 5;
        const pendingShown = pending.slice(0, PENDING_SHOW);
        const pendingHidden = Math.max(0, pending.length - PENDING_SHOW);

        function rowHtml(e) {
            const isRedact = e.exportType === 'redact';
            const isTrim = e.exportType === 'trim';
            const meta = e.meta || {};
            const sa = isEvidenceSuperAdmin();
            let statusCls = 'ev-export-status';
            let status = '';
            if (isRedact) {
                if (meta.status === 'finalized') {
                    status = tr('evidenceHub.redactFinalized');
                    statusCls += ' is-finalized';
                } else if (meta.status === 'draft') {
                    status = tr('evidenceHub.redactDraft');
                    statusCls += ' is-pending';
                } else {
                    status = tr('evidenceHub.redactPendingNote');
                    statusCls += ' is-pending';
                }
            }
            let actions = '';
            if (canDownloadExport() && (isTrim || !isRedact || meta.status === 'finalized')) {
                actions += '<a class="btn btn-ghost btn-sm ev-export-dl-btn" href="/api/evidence/export-stream/'
                    + encodeURIComponent(e.exportId) + '">' + esc(tr('evidenceHub.download')) + '</a>';
            }
            if (isRedact && (perms.edit || sa) && meta.status !== 'finalized') {
                actions += '<button type="button" class="btn btn-ghost btn-sm ev-redact-note-btn" data-export-id="'
                    + esc(e.exportId) + '">' + esc(tr('evidenceHub.redactFinishFinalize')) + '</button>';
            }
            /* PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1 — Second pass / Remove for Super admin. */
            if (isRedact && sa && (meta.status === 'finalized' || meta.status === 'draft' || meta.status === 'pending_note' || !meta.status)) {
                actions += '<button type="button" class="btn btn-action btn-sm ev-redact-second-pass-btn" data-export-id="'
                    + esc(e.exportId) + '">' + esc(tr('evidenceHub.redactSecondPass')) + '</button>';
            }
            if (isRedact && sa && meta.status !== 'finalized') {
                actions += '<button type="button" class="btn btn-ghost btn-sm ev-export-remove-btn" data-export-id="'
                    + esc(e.exportId) + '">' + esc(tr('evidenceHub.exportRemoveDraft')) + '</button>';
            }
            if (isRedact && sa && meta.status === 'finalized') {
                actions += '<button type="button" class="btn btn-ghost btn-sm ev-export-remove-finalized-btn" data-export-id="'
                    + esc(e.exportId) + '">' + esc(tr('evidenceHub.exportRemoveFinalized')) + '</button>';
            }
            /* PRIOR-TRIM-LABEL-AND-REMOVE-V1 */
            if (isTrim && sa) {
                actions += '<button type="button" class="btn btn-ghost btn-sm ev-export-remove-trim-btn" data-export-id="'
                    + esc(e.exportId) + '">' + esc(tr('evidenceHub.exportRemoveTrim')) + '</button>';
            }
            let typeLabel = '';
            if (isRedact) typeLabel = '[' + tr('evidenceHub.redactType') + '] ';
            else if (isTrim) typeLabel = '[' + tr('evidenceHub.trimType') + '] ';
            const when = isTrim ? (e.createdAt || null) : exportBurnWhen(e);
            const whenLabel = when
                ? ('<span class="ev-export-when hint">' + esc(tr(
                    isTrim ? 'evidenceHub.exportCreatedAt' : 'evidenceHub.exportBurnedAt',
                    { t: fmtTime(when) }
                )) + '</span>')
                : '';
            const idHint = e.exportId
                ? ('<span class="ev-export-id hint mono">' + esc(String(e.exportId)) + '</span>')
                : '';
            const rowCls = 'ev-export-row'
                + (isRedact ? ' ev-export-row-redact' : '')
                + (isTrim ? ' ev-export-row-trim' : '');
            return '<li class="' + rowCls + '">'
                + '<div class="ev-export-meta">'
                + '<span class="ev-export-name">' + typeLabel + esc(e.fileName) + '</span>'
                + '<span class="ev-export-size hint">' + fmtBytes(e.byteSize) + '</span>'
                + (status ? ('<span class="' + statusCls + '">' + esc(status) + '</span>') : '')
                + whenLabel
                + idHint
                + '</div>'
                + (actions ? ('<div class="ev-export-actions-col">' + actions + '</div>') : '')
                + '</li>';
        }

        let html = '<h4 id="ev-prior-exports">' + tr('evidenceHub.priorExports') + '</h4>'
            + '<p class="hint" id="ev-prior-exports-hint">' + esc(tr('evidenceHub.priorExportsHint')) + '</p>'
            + '<p class="hint ev-redact-cleanup-err" id="ev-export-cleanup-err" hidden></p>';
        if (finalized.length) {
            html += '<p class="ev-export-section">' + esc(tr('evidenceHub.exportSectionFinalized'));
            if (isEvidenceSuperAdmin() && finalized.length >= 2) {
                html += ' <button type="button" class="btn btn-ghost btn-sm" id="ev-export-clean-finalized">'
                    + esc(tr('evidenceHub.exportClearFinalizedN', { n: finalized.length })) + '</button>';
            }
            html += '</p>'
                + '<ul class="ev-attach-list ev-export-list">' + finalized.map(rowHtml).join('') + '</ul>';
        }
        if (pendingShown.length) {
            html += '<p class="ev-export-section">' + esc(tr('evidenceHub.exportSectionPending'));
            if (isEvidenceSuperAdmin() && pending.length >= 2) {
                html += ' <button type="button" class="btn btn-ghost btn-sm" id="ev-export-clean-drafts">'
                    + esc(tr('evidenceHub.exportCleanDraftsN', { n: pending.length })) + '</button>';
            }
            html += '</p>'
                + '<ul class="ev-attach-list ev-export-list">' + pendingShown.map(rowHtml).join('') + '</ul>';
            if (pendingHidden > 0) {
                html += '<p class="hint ev-export-pending-more">'
                    + esc(tr('evidenceHub.exportPendingHidden', { n: pendingHidden })) + '</p>';
            }
        }
        if (trims.length) {
            html += '<p class="ev-export-section">' + esc(tr('evidenceHub.exportSectionTrims'));
            if (isEvidenceSuperAdmin() && trims.length >= 2) {
                html += ' <button type="button" class="btn btn-ghost btn-sm" id="ev-export-clean-trims">'
                    + esc(tr('evidenceHub.exportClearTrimsN', { n: trims.length })) + '</button>';
            }
            html += '</p>'
                + '<ul class="ev-attach-list ev-export-list">' + trims.map(rowHtml).join('') + '</ul>';
        }
        if (other.length) {
            html += '<ul class="ev-attach-list ev-export-list">' + other.map(rowHtml).join('') + '</ul>';
        }
        return html;
    }

    async function fetchSosOptions(deviceId) {
        let html = '<option value="">\u2014 ' + tr('evidenceHub.noSosLink') + ' \u2014</option>';
        try {
            const res = await fetch('/api/evidence/sos-incidents?days=180&limit=100', { credentials: 'same-origin' });
            const data = await res.json();
            const inc = (data.incidents && data.incidents.entries) ? data.incidents.entries : [];
            inc.forEach(function (e) {
                if (deviceId && e.cameraId && e.cameraId !== deviceId) return;
                html += '<option value="' + esc(e.id) + '">' + esc(fmtTime(e.at)) + ' \u00B7 ' + esc(e.operatorName || e.cameraId || e.id) + '</option>';
            });
        } catch (_) { /* ignore */ }
        return html;
    }

    function bindDetailActions(fileId, file, previewUrl, canPreview) {
        const back = document.getElementById('ev-detail-back');
        if (back) back.addEventListener('click', function () { showPanel('catalog'); });
        const openPreview = document.getElementById('ev-detail-open-preview');
        if (openPreview && canPreview) openPreview.addEventListener('click', function () {
            const bust = previewUrl + (previewUrl.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(file.uploadedAt || fileId);
            mountPreview(file.fileName, bust);
        });
        const save = document.getElementById('ev-detail-save-meta');
        if (save) save.addEventListener('click', function () { saveDetailMeta(fileId); });
        const archiveBtn = document.getElementById('ev-detail-archive');
        if (archiveBtn) archiveBtn.addEventListener('click', function () { archiveEvidence(fileId); });
        const restoreBtn = document.getElementById('ev-detail-restore');
        if (restoreBtn) restoreBtn.addEventListener('click', function () { restoreEvidence(fileId); });
        const addCase = document.getElementById('ev-detail-add-case');
        if (addCase) addCase.addEventListener('click', function () {
            if (global.CaseFilesUi && CaseFilesUi.promptAddToCase) {
                CaseFilesUi.promptAddToCase(fileId).catch(function (err) {
                    alert(catalogMsg(err.opPayload || err.catalogPayload, err));
                });
            }
        });
        const photo = document.getElementById('ev-detail-photo');
        if (photo) photo.addEventListener('change', function () { uploadDetailPhoto(fileId, photo); });
        const trimBtn = document.getElementById('ev-trim-export');
        if (trimBtn) trimBtn.addEventListener('click', function () { runTrimExport(fileId); });
        const setStartBtn = document.getElementById('ev-trim-set-start');
        if (setStartBtn) setStartBtn.addEventListener('click', function () { setTrimFromPlayhead('ev-trim-start'); updateTrimLen(); });
        const setEndBtn = document.getElementById('ev-trim-set-end');
        if (setEndBtn) setEndBtn.addEventListener('click', function () { setTrimFromPlayhead('ev-trim-end'); updateTrimLen(); });
        const trimStartEl = document.getElementById('ev-trim-start');
        const trimEndEl = document.getElementById('ev-trim-end');
        if (trimStartEl) trimStartEl.addEventListener('input', updateTrimLen);
        if (trimEndEl) trimEndEl.addEventListener('input', updateTrimLen);
        updateTrimLen();
        const dlBtn = document.getElementById('ev-detail-download');
        if (dlBtn) dlBtn.addEventListener('click', function () { requestDownload(fileId, dlBtn); });
        const secBtn = document.getElementById('ev-detail-secure');
        if (secBtn) secBtn.addEventListener('click', function () { requestSecureExport(fileId, secBtn); });
        const redactBtn = document.getElementById('ev-detail-redact');
        if (redactBtn) redactBtn.addEventListener('click', function () { openRedactWorkspace(fileId); });
        document.querySelectorAll('.ev-redact-note-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openRedactNoteDialog(btn.getAttribute('data-export-id'), fileId, null);
            });
        });
        document.querySelectorAll('.ev-redact-second-pass-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openRedactWorkspace(fileId, {
                    parentExportId: btn.getAttribute('data-export-id'),
                });
            });
        });
        document.querySelectorAll('.ev-export-remove-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeRedactExportDraftUi(btn.getAttribute('data-export-id'), fileId);
            });
        });
        document.querySelectorAll('.ev-export-remove-finalized-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeRedactExportFinalizedUi(btn.getAttribute('data-export-id'), fileId);
            });
        });
        document.querySelectorAll('.ev-export-remove-trim-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeTrimExportUi(btn.getAttribute('data-export-id'), fileId);
            });
        });
        const cleanDrafts = document.getElementById('ev-export-clean-drafts');
        if (cleanDrafts) {
            cleanDrafts.addEventListener('click', function () { cleanRedactDraftsUi(fileId); });
        }
        const cleanFinalized = document.getElementById('ev-export-clean-finalized');
        if (cleanFinalized) {
            cleanFinalized.addEventListener('click', function () { cleanRedactFinalizedUi(fileId); });
        }
        const cleanTrims = document.getElementById('ev-export-clean-trims');
        if (cleanTrims) {
            cleanTrims.addEventListener('click', function () { cleanTrimExportsUi(fileId); });
        }
        const cleanBanner = document.getElementById('ev-redact-clean-drafts-banner');
        if (cleanBanner) {
            cleanBanner.addEventListener('click', function () { cleanRedactDraftsUi(fileId); });
        }
        const finishBanner = document.getElementById('ev-redact-finish-banner');
        if (finishBanner) {
            finishBanner.addEventListener('click', function () {
                openRedactNoteDialog(finishBanner.getAttribute('data-export-id'), fileId, null);
            });
        }
        const dismissBanner = document.getElementById('ev-redact-dismiss-banner');
        if (dismissBanner) {
            dismissBanner.addEventListener('click', function () {
                clearRedactPending(fileId);
                const banner = document.getElementById('ev-redact-pending-banner');
                if (banner) banner.remove();
            });
        }
    }

    async function removeRedactExportDraftUi(exportId, fileId) {
        const id = String(exportId || '').trim();
        if (!id || !perms.superAdmin) return;
        const ok = global.confirm(tr('evidenceHub.exportRemoveDraftConfirm'));
        if (!ok) return;
        showRedactCleanupErr('');
        try {
            const res = await fetch('/api/evidence/redact/' + encodeURIComponent(id), {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            const parsed = await readJsonSafe(res);
            if (!parsed.okJson) {
                showRedactCleanupErr(redactCleanupFailMsg(res, parsed.data, parsed.parseErr));
                return;
            }
            const data = parsed.data;
            if (!res.ok || !data.ok) {
                showRedactCleanupErr(redactCleanupFailMsg(res, data, null));
                return;
            }
            clearRedactPending(fileId);
            await loadDetail(fileId, true);
            scrollToPriorExports();
        } catch (err) {
            showRedactCleanupErr(redactCleanupFailMsg(null, err && (err.opPayload || err.catalogPayload), err));
        }
    }

    async function removeRedactExportFinalizedUi(exportId, fileId) {
        const id = String(exportId || '').trim();
        if (!id || !perms.superAdmin) return;
        const ok = global.confirm(tr('evidenceHub.exportRemoveFinalizedConfirm'));
        if (!ok) return;
        const adminPassword = global.prompt(tr('evidenceHub.exportRemoveFinalizedPasswordPrompt'), '');
        if (adminPassword == null) return;
        if (!String(adminPassword).length) {
            showRedactCleanupErr(tr('evidenceHub.exportFinalizedNeedPassword'));
            return;
        }
        showRedactCleanupErr('');
        try {
            const res = await fetch('/api/evidence/redact/' + encodeURIComponent(id) + '?finalized=1', {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword, finalized: 1 }),
            });
            const parsed = await readJsonSafe(res);
            if (!parsed.okJson) {
                showRedactCleanupErr(redactFinalizedCleanupFailMsg(res, parsed.data, parsed.parseErr));
                return;
            }
            const data = parsed.data;
            if (!res.ok || !data.ok) {
                showRedactCleanupErr(redactFinalizedCleanupFailMsg(res, data, null));
                return;
            }
            await loadDetail(fileId, true);
            scrollToPriorExports();
        } catch (err) {
            showRedactCleanupErr(redactFinalizedCleanupFailMsg(null, err && (err.opPayload || err.catalogPayload), err));
        }
    }

    async function cleanRedactDraftsUi(fileId) {
        const id = String(fileId || '').trim();
        if (!id || !perms.superAdmin) {
            showRedactCleanupErr(tr('evidenceHub.exportCleanupNeedSuperAdmin'));
            return;
        }
        const ok = global.confirm(tr('evidenceHub.exportCleanDraftsConfirm'));
        if (!ok) return;
        showRedactCleanupErr('');
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(id) + '/redact/cleanup-drafts', {
                method: 'POST',
                credentials: 'same-origin',
            });
            const parsed = await readJsonSafe(res);
            if (!parsed.okJson) {
                showRedactCleanupErr(redactCleanupFailMsg(res, parsed.data, parsed.parseErr));
                return;
            }
            const data = parsed.data;
            if (!res.ok || !data.ok) {
                showRedactCleanupErr(redactCleanupFailMsg(res, data, null));
                return;
            }
            clearRedactPending(fileId);
            await loadDetail(fileId, true);
            scrollToPriorExports();
        } catch (err) {
            showRedactCleanupErr(redactCleanupFailMsg(null, err && (err.opPayload || err.catalogPayload), err));
        }
    }

    async function cleanRedactFinalizedUi(fileId) {
        const id = String(fileId || '').trim();
        if (!id || !perms.superAdmin) {
            showRedactCleanupErr(tr('evidenceHub.exportCleanupNeedSuperAdmin'));
            return;
        }
        const ok = global.confirm(tr('evidenceHub.exportClearFinalizedConfirm'));
        if (!ok) return;
        const adminPassword = global.prompt(tr('evidenceHub.exportClearFinalizedPasswordPrompt'), '');
        if (adminPassword == null) return;
        if (!String(adminPassword).length) {
            showRedactCleanupErr(tr('evidenceHub.exportFinalizedNeedPassword'));
            return;
        }
        showRedactCleanupErr('');
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(id) + '/redact/cleanup-finalized', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword }),
            });
            const parsed = await readJsonSafe(res);
            if (!parsed.okJson) {
                showRedactCleanupErr(redactFinalizedCleanupFailMsg(res, parsed.data, parsed.parseErr));
                return;
            }
            const data = parsed.data;
            if (!res.ok || !data.ok) {
                showRedactCleanupErr(redactFinalizedCleanupFailMsg(res, data, null));
                return;
            }
            await loadDetail(fileId, true);
            scrollToPriorExports();
        } catch (err) {
            showRedactCleanupErr(redactFinalizedCleanupFailMsg(null, err && (err.opPayload || err.catalogPayload), err));
        }
    }

    async function removeTrimExportUi(exportId, fileId) {
        const id = String(exportId || '').trim();
        if (!id || !isEvidenceSuperAdmin()) return;
        const ok = global.confirm(tr('evidenceHub.exportRemoveTrimConfirm'));
        if (!ok) return;
        const adminPassword = global.prompt(tr('evidenceHub.exportRemoveTrimPasswordPrompt'), '');
        if (adminPassword == null) return;
        if (!String(adminPassword).length) {
            showRedactCleanupErr(tr('evidenceHub.exportTrimNeedPassword'));
            return;
        }
        showRedactCleanupErr('');
        try {
            const res = await fetch('/api/evidence/trim/' + encodeURIComponent(id), {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword }),
            });
            const parsed = await readJsonSafe(res);
            if (!parsed.okJson) {
                showRedactCleanupErr(trimCleanupFailMsg(res, parsed.data, parsed.parseErr));
                return;
            }
            const data = parsed.data;
            if (!res.ok || !data.ok) {
                showRedactCleanupErr(trimCleanupFailMsg(res, data, null));
                return;
            }
            await loadDetail(fileId, true);
            scrollToPriorExports();
        } catch (err) {
            showRedactCleanupErr(trimCleanupFailMsg(null, err && (err.opPayload || err.catalogPayload), err));
        }
    }

    async function cleanTrimExportsUi(fileId) {
        const id = String(fileId || '').trim();
        if (!id || !isEvidenceSuperAdmin()) {
            showRedactCleanupErr(tr('evidenceHub.exportCleanupNeedSuperAdmin'));
            return;
        }
        const ok = global.confirm(tr('evidenceHub.exportClearTrimsConfirm'));
        if (!ok) return;
        const adminPassword = global.prompt(tr('evidenceHub.exportClearTrimsPasswordPrompt'), '');
        if (adminPassword == null) return;
        if (!String(adminPassword).length) {
            showRedactCleanupErr(tr('evidenceHub.exportTrimNeedPassword'));
            return;
        }
        showRedactCleanupErr('');
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(id) + '/trim/cleanup', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword }),
            });
            const parsed = await readJsonSafe(res);
            if (!parsed.okJson) {
                showRedactCleanupErr(trimCleanupFailMsg(res, parsed.data, parsed.parseErr));
                return;
            }
            const data = parsed.data;
            if (!res.ok || !data.ok) {
                showRedactCleanupErr(trimCleanupFailMsg(res, data, null));
                return;
            }
            await loadDetail(fileId, true);
            scrollToPriorExports();
        } catch (err) {
            showRedactCleanupErr(trimCleanupFailMsg(null, err && (err.opPayload || err.catalogPayload), err));
        }
    }

    /** REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1 \u2014 never bag into “contact IT” for Super admin cleanup. */
    async function readJsonSafe(res) {
        let text = '';
        try { text = await res.text(); } catch (err) {
            return { okJson: false, data: null, parseErr: err };
        }
        const raw = String(text || '').trim();
        if (!raw) {
            return {
                okJson: false,
                data: { ok: false, errorKey: 'evidenceHub.exportCleanupNeedRestart' },
                parseErr: null,
            };
        }
        try {
            return { okJson: true, data: JSON.parse(raw), parseErr: null };
        } catch (err) {
            return {
                okJson: false,
                data: { ok: false, errorKey: 'evidenceHub.exportCleanupNeedRestart' },
                parseErr: err,
            };
        }
    }

    function redactCleanupFailMsg(res, data, err) {
        if (data && data.errorKey) {
            const keyed = tr(data.errorKey);
            if (keyed && keyed !== data.errorKey) return keyed;
        }
        if (data && data.error && typeof data.error === 'string') {
            const e = data.error.trim();
            if (e && !/contact your IT|stack|ECONN|ENOENT|at\s+\S+\s*\(/i.test(e) && e.length < 220) {
                return e;
            }
        }
        const status = res && res.status;
        if (status === 401 || status === 403) return tr('evidenceHub.exportCleanupNeedSuperAdmin');
        if (status === 404 || status === 405 || status === 501 || status === 502) {
            return tr('evidenceHub.exportCleanupNeedRestart');
        }
        if (err && /JSON|Unexpected token|Failed to fetch|NetworkError/i.test(String(err.message || err))) {
            return tr('evidenceHub.exportCleanupNeedRestart');
        }
        return tr('evidenceHub.exportCleanupFailed');
    }

    function redactFinalizedCleanupFailMsg(res, data, err) {
        if (data && data.errorKey) {
            const keyed = tr(data.errorKey);
            if (keyed && keyed !== data.errorKey) return keyed;
        }
        if (data && data.error && typeof data.error === 'string') {
            const e = data.error.trim();
            if (e && !/contact your IT|stack|ECONN|ENOENT|at\s+\S+\s*\(/i.test(e) && e.length < 220) {
                return e;
            }
        }
        const status = res && res.status;
        if (status === 401 || status === 403) return tr('evidenceHub.exportCleanupNeedSuperAdmin');
        if (status === 404 || status === 405 || status === 501 || status === 502) {
            return tr('evidenceHub.exportCleanupNeedRestart');
        }
        if (err && /JSON|Unexpected token|Failed to fetch|NetworkError/i.test(String(err.message || err))) {
            return tr('evidenceHub.exportCleanupNeedRestart');
        }
        return tr('evidenceHub.exportFinalizedCleanupFailed');
    }

    function trimCleanupFailMsg(res, data, err) {
        if (data && data.errorKey) {
            const keyed = tr(data.errorKey);
            if (keyed && keyed !== data.errorKey) return keyed;
        }
        if (data && data.error && typeof data.error === 'string') {
            const e = data.error.trim();
            if (e && !/contact your IT|stack|ECONN|ENOENT|at\s+\S+\s*\(/i.test(e) && e.length < 220) {
                return e;
            }
        }
        const status = res && res.status;
        if (status === 401 || status === 403) {
            return tr('evidenceHub.exportTrimNeedPassword');
        }
        if (status === 404 || status === 405 || status === 501 || status === 502) {
            return tr('evidenceHub.exportCleanupNeedRestart');
        }
        if (err && /JSON|Unexpected token|Failed to fetch|NetworkError/i.test(String(err.message || err))) {
            return tr('evidenceHub.exportCleanupNeedRestart');
        }
        return tr('evidenceHub.exportTrimCleanupFailed');
    }

    function showRedactCleanupErr(msg) {
        const text = String(msg || '').trim();
        const ids = ['ev-redact-cleanup-err', 'ev-export-cleanup-err'];
        let painted = false;
        ids.forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            painted = true;
            if (!text) {
                el.hidden = true;
                el.textContent = '';
                return;
            }
            el.hidden = false;
            el.textContent = text;
        });
        if (text && !painted) {
            /* last resort \u2014 still honest text, not errors.generic */
            try { global.alert(text); } catch (_) { /* ignore */ }
        }
    }

    function ensureRedactDialog() {
        const legacy = document.getElementById('ev-redact-dialog');
        if (legacy) legacy.remove();
        let panel = document.getElementById('ev-panel-redact');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'ev-panel-redact';
            panel.className = 'evidence-hub-panel';
            panel.hidden = true;
            const hub = document.getElementById('evidence-panel');
            if (hub) hub.appendChild(panel);
            else document.body.appendChild(panel);
        }
        let shell = document.getElementById('ev-redact-shell');
        if (shell && shell.getAttribute('data-redact-shell') === 'inline-v1'
            && shell.getAttribute('data-redact-handoff') === 'v4'
            && shell.querySelector('#ev-redact-mark-panel')
            && shell.querySelector('#ev-redact-note-panel')
            && shell.querySelector('#ev-redact-done-panel')
            && shell.querySelector('#ev-redact-mark-footer')
            && shell.querySelector('#ev-redact-save-progress')
            && shell.querySelector('#ev-redact-draft-details')
            && shell.querySelector('#ev-redact-open-prior')
            && shell.querySelector('#ev-redact-where-dl')
            && shell.querySelector('#ev-redact-finalize-err')
            && shell.querySelector('#ev-redact-done-download')
            && shell.querySelector('#ev-redact-back')) {
            const mark = shell.querySelector('#ev-redact-mark-panel');
            const note = shell.querySelector('#ev-redact-note-panel');
            if (!(mark && note && mark.contains(note))) return shell;
        }
        if (shell) shell.innerHTML = '';
        else {
            shell = document.createElement('div');
            shell.id = 'ev-redact-shell';
            shell.className = 'ev-redact-shell';
            panel.appendChild(shell);
        }
        shell.setAttribute('data-redact-shell', 'inline-v1');
        shell.setAttribute('data-redact-handoff', 'v4');
        shell.innerHTML =
            '<div class="ev-redact-dialog-inner" role="region" aria-label="' + esc(tr('evidenceHub.redactTitle')) + '">'
            + '<div id="ev-redact-mark-panel">'
            + '<div class="ev-redact-head">'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-back">' + esc(tr('evidenceHub.redactBack')) + '</button>'
            + '<div class="ev-redact-head-text">'
            + '<h4 id="ev-redact-title"></h4>'
            + '<p class="hint" id="ev-redact-hint"></p>'
            + '</div></div>'
            + '<div class="ev-redact-workspace">'
            + '<div class="ev-redact-main">'
            + '<div class="ev-redact-stage" id="ev-redact-stage">'
            + '<div class="ev-redact-stage-inner">'
            + '<video id="ev-redact-video" playsinline></video>'
            + '<canvas id="ev-redact-canvas"></canvas>'
            + '</div></div></div>'
            + '<div class="ev-redact-rail">'
            + '<div class="ev-redact-toolbar">'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-pause"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-undo"></button>'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-redact-autoface" hidden></button>'
            + '<label class="ev-redact-span"><span id="ev-redact-span-lbl"></span> '
            + '<select id="ev-redact-span-mode" class="ev-redact-span-sel" title="">'
            + '<option value="whole"></option><option value="from"></option><option value="window"></option>'
            + '</select></label>'
            + '<p class="hint ev-redact-span-hint" id="ev-redact-span-hint"></p>'
            + '</div>'
            + '<div class="ev-redact-draft-details" id="ev-redact-draft-details">'
            + '<p class="hint" id="ev-redact-draft-hint"></p>'
            + '<label class="full"><span id="ev-redact-draft-lbl-reason"></span>'
            + '<select id="ev-redact-draft-reason">'
            + '<option value="face"></option><option value="child"></option><option value="bystander"></option>'
            + '<option value="plate"></option><option value="other"></option>'
            + '</select></label>'
            + '<label class="full"><span id="ev-redact-draft-lbl-visible"></span>'
            + '<input type="text" id="ev-redact-draft-visible" maxlength="500"></label>'
            + '<label class="full"><span id="ev-redact-draft-lbl-incident"></span>'
            + '<textarea id="ev-redact-draft-incident" rows="2" maxlength="2000"></textarea></label>'
            + '</div>'
            + '<div class="ev-redact-regions-wrap">'
            + '<ul class="ev-redact-regions" id="ev-redact-region-list"></ul>'
            + '</div>'
            + '</div></div></div>'
            + '<div class="ev-redact-footer ev-redact-footer-sticky" id="ev-redact-mark-footer">'
            + '<p class="hint ev-redact-save-progress" id="ev-redact-save-progress" hidden></p>'
            + '<div class="ev-redact-actions">'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-redact-save"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-cancel">' + esc(tr('common.cancel')) + '</button>'
            + '</div></div>'
            + '<div id="ev-redact-note-panel" hidden>'
            + '<p class="hint ev-redact-note-ready" id="ev-redact-note-ready" hidden></p>'
            + '<p class="hint ev-redact-where-dl" id="ev-redact-where-dl"></p>'
            + '<h4 id="ev-redact-note-title"></h4>'
            + '<p class="hint" id="ev-redact-note-hint"></p>'
            + '<div class="ev-redact-note-scroll">'
            + '<div class="ev-redact-note-inner">'
            + '<label class="full"><span id="ev-redact-lbl-reason"></span>'
            + '<select id="ev-redact-reason">'
            + '<option value="face"></option><option value="child"></option><option value="bystander"></option>'
            + '<option value="plate"></option><option value="other"></option>'
            + '</select></label>'
            + '<label class="full"><span id="ev-redact-lbl-visible"></span>'
            + '<input type="text" id="ev-redact-visible" maxlength="500"></label>'
            + '<label class="full"><span id="ev-redact-lbl-incident"></span>'
            + '<textarea id="ev-redact-incident" rows="3" maxlength="2000"></textarea></label>'
            + '</div></div>'
            + '<p class="hint" id="ev-redact-finalize-gate" hidden></p>'
            + '<p class="hint ev-redact-finalize-err" id="ev-redact-finalize-err" hidden></p>'
            + '<div class="ev-dock-dialog-actions ev-redact-note-actions-sticky">'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-redact-finalize"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-save-note"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-open-prior"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-note-close">' + esc(tr('common.close')) + '</button>'
            + '</div></div>'
            + '<div id="ev-redact-done-panel" hidden>'
            + '<p class="hint ev-redact-done-ready" id="ev-redact-done-ready"></p>'
            + '<p class="hint" id="ev-redact-done-hint"></p>'
            + '<div class="ev-dock-dialog-actions ev-redact-done-actions">'
            + '<a class="btn btn-action btn-sm" id="ev-redact-done-download" href="#" download></a>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-done-prior"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-done-close">' + esc(tr('common.close')) + '</button>'
            + '</div></div>'
            + '</div>';
        return shell;
    }

    /** Mark + Save footer vs note/Finalize \u2014 siblings (handoff-v1 / finish-loop-v1). */
    function showRedactMarkPhase() {
        const mark = document.getElementById('ev-redact-mark-panel');
        const footer = document.getElementById('ev-redact-mark-footer');
        const note = document.getElementById('ev-redact-note-panel');
        const done = document.getElementById('ev-redact-done-panel');
        if (mark) mark.hidden = false;
        if (footer) footer.hidden = false;
        if (note) note.hidden = true;
        if (done) done.hidden = true;
        redactState.saveSucceeded = false;
    }

    function notePanelLooksVisible() {
        const note = document.getElementById('ev-redact-note-panel');
        if (!note || note.hidden) return false;
        const mark = document.getElementById('ev-redact-mark-panel');
        if (mark && mark.contains(note) && mark.hidden) return false;
        try {
            const st = global.getComputedStyle(note);
            if (st && st.display === 'none') return false;
        } catch (_) { /* ignore */ }
        return true;
    }

    function showRedactNotePhase() {
        const mark = document.getElementById('ev-redact-mark-panel');
        const footer = document.getElementById('ev-redact-mark-footer');
        const note = document.getElementById('ev-redact-note-panel');
        const done = document.getElementById('ev-redact-done-panel');
        if (mark) mark.hidden = true;
        if (footer) footer.hidden = true;
        if (note) note.hidden = false;
        if (done) done.hidden = true;
    }

    function showRedactDonePhase(exportId, fileId, opts) {
        opts = opts || {};
        ensureRedactDialog();
        clearRedactPending(fileId);
        const mark = document.getElementById('ev-redact-mark-panel');
        const footer = document.getElementById('ev-redact-mark-footer');
        const note = document.getElementById('ev-redact-note-panel');
        const done = document.getElementById('ev-redact-done-panel');
        if (mark) mark.hidden = true;
        if (footer) footer.hidden = true;
        if (note) note.hidden = true;
        if (done) done.hidden = false;
        showPanel('redact', { skipRefresh: true });
        const ready = document.getElementById('ev-redact-done-ready');
        if (ready) {
            ready.textContent = opts.alreadyFinalized
                ? tr('evidenceHub.redactDoneAlreadyFinalizedReady')
                : tr('evidenceHub.redactDoneReady');
        }
        const hint = document.getElementById('ev-redact-done-hint');
        if (hint) {
            /* N2 — already Finalized + second-pass pointer */
            hint.textContent = opts.alreadyFinalized
                ? tr('evidenceHub.redactDoneAlreadyFinalizedHint')
                : tr('evidenceHub.redactDoneHint');
        }
        const dl = document.getElementById('ev-redact-done-download');
        const url = opts.downloadUrl
            || ('/api/evidence/export-stream/' + encodeURIComponent(exportId));
        if (dl) {
            dl.href = url;
            dl.textContent = tr('evidenceHub.redactDoneDownload');
            dl.hidden = !(perms.export || perms.superAdmin);
        }
        const prior = document.getElementById('ev-redact-done-prior');
        if (prior) {
            prior.textContent = tr('evidenceHub.redactOpenPriorExports');
            prior.onclick = function () { goDetailPriorExports(fileId); };
        }
        const closeBtn = document.getElementById('ev-redact-done-close');
        if (closeBtn) {
            closeBtn.onclick = function () { goDetailPriorExports(fileId); };
        }
    }

    const REDACT_PENDING_KEY = 'me8.redactPendingFinalize';

    function readRedactPendingMap() {
        try {
            const raw = global.sessionStorage && sessionStorage.getItem(REDACT_PENDING_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function writeRedactPendingMap(map) {
        try {
            if (global.sessionStorage) sessionStorage.setItem(REDACT_PENDING_KEY, JSON.stringify(map || {}));
        } catch (_) { /* ignore */ }
    }

    function setRedactPending(fileId, exportId) {
        const id = String(fileId || '').trim();
        const ex = String(exportId || '').trim();
        if (!id || !ex) return;
        const map = readRedactPendingMap();
        map[id] = { exportId: ex, at: Date.now() };
        writeRedactPendingMap(map);
    }

    function clearRedactPending(fileId) {
        const id = String(fileId || '').trim();
        if (!id) return;
        const map = readRedactPendingMap();
        if (!map[id]) return;
        delete map[id];
        writeRedactPendingMap(map);
    }

    function getRedactPending(fileId) {
        const id = String(fileId || '').trim();
        if (!id) return null;
        const row = readRedactPendingMap()[id];
        if (!row || !row.exportId) return null;
        return row;
    }

    function listPendingRedactExports(exports) {
        const list = Array.isArray(exports) ? exports : [];
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (!e || e.exportType !== 'redact') continue;
            const st = (e.meta && e.meta.status) || '';
            if (st !== 'finalized') out.push(e);
        }
        return out;
    }

    /** Prefer newest pending burn (last in list). */
    function newestPendingRedactExport(exports) {
        const pending = listPendingRedactExports(exports);
        if (!pending.length) return null;
        return pending[pending.length - 1];
    }

    function firstPendingRedactExport(exports) {
        return newestPendingRedactExport(exports);
    }

    function highlightPriorExports() {
        const el = document.getElementById('ev-prior-exports');
        if (!el) return;
        el.classList.add('ev-prior-exports-flash');
        setTimeout(function () {
            try { el.classList.remove('ev-prior-exports-flash'); } catch (_) { /* ignore */ }
        }, 1800);
    }

    function showRedactFinalizeErr(msg) {
        const el = document.getElementById('ev-redact-finalize-err');
        if (!el) {
            if (msg) alert(msg);
            return;
        }
        if (!msg) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        el.textContent = msg;
    }

    const redactState = {
        fileId: null,
        exportId: null,
        regions: [],
        drawing: false,
        startX: 0,
        startY: 0,
        scale: 1,
        faceFollow: false,
        autoRegionCount: 0,
        /* REDACT-PREVIEW-CONTROLS-BURN-V1 — deleted Auto preview seeds for burn */
        excludeRegions: [],
        parentExportId: null,
        secondPass: false,
        saving: false,
        saveSucceeded: false,
    };

    /** Client soft cap \u2014 under server face-follow exec timeout (~15m). */
    const REDACT_SAVE_CLIENT_TIMEOUT_MS = 12 * 60 * 1000;
    let redactSaveCtl = null;
    let redactSaveTimer = null;

    function stopRedactSaveProgressUi() {
        if (redactSaveTimer) {
            clearInterval(redactSaveTimer);
            redactSaveTimer = null;
        }
        const prog = document.getElementById('ev-redact-save-progress');
        if (prog) {
            prog.hidden = true;
            prog.textContent = '';
            prog.classList.remove('ev-redact-save-progress-error');
            prog.classList.remove('ev-redact-save-hint');
        }
    }

    /** Calm inline hint next to Save (no alert pop) \u2014 mob-evidence-save-meta-dirty-hint-v1 */
    function showRedactSaveHint(msg, asError) {
        const prog = document.getElementById('ev-redact-save-progress');
        if (!prog) return;
        prog.hidden = false;
        prog.classList.toggle('ev-redact-save-progress-error', !!asError);
        prog.classList.toggle('ev-redact-save-hint', !asError);
        prog.textContent = msg || '';
    }

    function abortRedactSaveInFlight() {
        if (redactSaveCtl) {
            try { redactSaveCtl.abort(); } catch (_) { /* ignore */ }
            redactSaveCtl = null;
        }
        stopRedactSaveProgressUi();
        redactState.saving = false;
    }

    function fmtRedactElapsed(sec) {
        const s = Math.max(0, Math.floor(sec));
        const m = Math.floor(s / 60);
        const r = s % 60;
        if (m <= 0) return r + 's';
        return m + 'm ' + r + 's';
    }

    function closeRedactDialog(opts) {
        opts = opts || {};
        if (redactState.saving && !opts.forceAbortSave && !opts.skipLeaveConfirm) {
            const ok = global.confirm(tr('evidenceHub.redactLeaveWhileSaving'));
            if (!ok) return;
            abortRedactSaveInFlight();
            opts.leftDuringSave = true;
        }
        const returnId = redactState.fileId;
        const exportId = redactState.exportId;
        const saveOk = !!redactState.saveSucceeded;
        if (saveOk && returnId && exportId) {
            setRedactPending(returnId, exportId);
        }
        abortRedactSaveInFlight();
        const vid = document.getElementById('ev-redact-video');
        if (vid) {
            vid.pause();
            vid.removeAttribute('src');
            vid.load();
        }
        redactState.fileId = null;
        redactState.exportId = null;
        redactState.regions = [];
        redactState.faceFollow = false;
        redactState.autoRegionCount = 0;
        redactState.excludeRegions = [];
        redactState.parentExportId = null;
        redactState.secondPass = false;
        redactState.saveSucceeded = false;
        showRedactMarkPhase();
        if (opts.skipReturn) return;
        if (returnId) {
            loadDetail(returnId, !!opts.force).then(function () {
                scrollToPriorExports();
            }).catch(function () {
                scrollToPriorExports();
            });
        } else {
            showPanel('catalog');
        }
    }

    function scrollToPriorExports() {
        const el = document.getElementById('ev-prior-exports') || document.getElementById('ev-redact-pending-banner');
        if (el && el.scrollIntoView) {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {
                try { el.scrollIntoView(true); } catch (__) { /* ignore */ }
            }
        }
        highlightPriorExports();
    }

    function goDetailPriorExports(fileId) {
        const id = String(fileId || '').trim();
        /* PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1 — always force-reload detail (no warm skip). */
        if (currentPanel === 'redact' || redactState.fileId) {
            closeRedactDialog({ skipReturn: true, skipLeaveConfirm: true });
        } else {
            const panel = document.getElementById('ev-panel-redact');
            if (panel) panel.hidden = true;
        }
        if (id) {
            loadDetail(id, true).then(function () { scrollToPriorExports(); }).catch(function () {
                scrollToPriorExports();
            });
        } else {
            showPanel('catalog');
        }
    }

    function syncRedactCanvas() {
        const vid = document.getElementById('ev-redact-video');
        const canvas = document.getElementById('ev-redact-canvas');
        if (!vid || !canvas) return;
        canvas.width = vid.clientWidth;
        canvas.height = vid.clientHeight;
        redactState.scale = vid.videoWidth ? vid.clientWidth / vid.videoWidth : 1;
        redrawRedactRegions();
    }

    function redrawRedactRegions() {
        const canvas = document.getElementById('ev-redact-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scale = redactState.scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redactState.regions.forEach(function (r) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
            ctx.fillStyle = 'rgba(56,189,248,0.15)';
            ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        });
    }

    function isAutoPreviewRegion(r, i) {
        if (!r) return false;
        if (r.source === 'face-follow-preview') return true;
        /* Fallback if source stripped: first autoRegionCount rows after Auto. */
        return !!(redactState.faceFollow && i < (redactState.autoRegionCount || 0));
    }

    function renderRedactRegionList() {
        const list = document.getElementById('ev-redact-region-list');
        if (!list) return;
        if (!redactState.regions.length) {
            list.innerHTML = '<li class="hint">' + esc(tr('evidenceHub.redactNoRegions')) + '</li>';
            return;
        }
        /* mob-evidence-redact-auto-preview-slim-v1 \u2014 Auto rows: tag + delete only. */
        list.innerHTML = redactState.regions.map(function (r, i) {
            const auto = isAutoPreviewRegion(r, i);
            let html = '<li class="ev-redact-region-row' + (auto ? ' ev-redact-region-auto' : '') + '">'
                + '<span class="ev-redact-region-tag">' + esc(tr(
                    auto ? 'evidenceHub.redactAutoPreviewTag' : 'evidenceHub.redactRegionTag',
                    auto
                        ? { n: i + 1, t: (Number(r.t0) || 0).toFixed(1) }
                        : { n: i + 1, w: r.w, h: r.h }
                )) + '</span>';
            if (!auto) {
                html += '<label class="ev-redact-time">' + esc(tr('evidenceHub.redactStart'))
                    + ' <input type="number" min="0" step="0.1" class="ev-redact-t0" data-idx="' + i + '" value="' + r.t0.toFixed(1) + '"></label>'
                    + '<label class="ev-redact-time">' + esc(tr('evidenceHub.redactEnd'))
                    + ' <input type="number" min="0" step="0.1" class="ev-redact-t1" data-idx="' + i + '" value="' + r.t1.toFixed(1) + '"></label>'
                    + '<button type="button" class="btn btn-ghost btn-sm ev-redact-whole" data-idx="' + i + '">' + esc(tr('evidenceHub.redactWholeClip')) + '</button>';
            }
            html += '<button type="button" class="btn btn-ghost btn-sm ev-redact-del" data-idx="' + i + '" aria-label="' + esc(tr('common.delete')) + '">✕</button>'
                + '</li>';
            return html;
        }).join('');
        bindRedactRegionRowHandlers();
    }

    function redactClipDuration() {
        const vid = document.getElementById('ev-redact-video');
        return vid && isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 0;
    }

    function bindRedactRegionRowHandlers() {
        const list = document.getElementById('ev-redact-region-list');
        if (!list) return;
        const dur = redactClipDuration();
        list.querySelectorAll('.ev-redact-t0').forEach(function (inp) {
            inp.onchange = function () {
                const i = Number(inp.getAttribute('data-idx'));
                const r = redactState.regions[i];
                if (!r) return;
                let v = Math.max(0, parseFloat(inp.value) || 0);
                if (v >= r.t1) v = Math.max(0, r.t1 - 0.1);
                r.t0 = v;
                renderRedactRegionList();
            };
        });
        list.querySelectorAll('.ev-redact-t1').forEach(function (inp) {
            inp.onchange = function () {
                const i = Number(inp.getAttribute('data-idx'));
                const r = redactState.regions[i];
                if (!r) return;
                let v = parseFloat(inp.value) || 0;
                if (dur) v = Math.min(dur, v);
                if (v <= r.t0) v = r.t0 + 0.1;
                r.t1 = v;
                renderRedactRegionList();
            };
        });
        list.querySelectorAll('.ev-redact-whole').forEach(function (btn) {
            btn.onclick = function () {
                const i = Number(btn.getAttribute('data-idx'));
                const r = redactState.regions[i];
                if (!r) return;
                r.t0 = 0;
                r.t1 = dur || r.t1;
                renderRedactRegionList();
            };
        });
        list.querySelectorAll('.ev-redact-del').forEach(function (btn) {
            btn.onclick = function () {
                const i = Number(btn.getAttribute('data-idx'));
                const removed = redactState.regions[i];
                const wasAuto = isAutoPreviewRegion(removed, i);
                if (wasAuto && removed) {
                    redactState.excludeRegions.push({
                        x: removed.x, y: removed.y, w: removed.w, h: removed.h,
                    });
                }
                redactState.regions.splice(i, 1);
                if (wasAuto && redactState.autoRegionCount > 0) {
                    redactState.autoRegionCount -= 1;
                }
                if (!redactState.autoRegionCount) redactState.faceFollow = false;
                redrawRedactRegions();
                renderRedactRegionList();
            };
        });
    }

    function fillReasonOptions(selId) {
        const reason = document.getElementById(selId);
        if (reason && reason.options.length >= 5) {
            reason.options[0].text = tr('evidenceHub.redactReasonFace');
            reason.options[1].text = tr('evidenceHub.redactReasonChild');
            reason.options[2].text = tr('evidenceHub.redactReasonBystander');
            reason.options[3].text = tr('evidenceHub.redactReasonPlate');
            reason.options[4].text = tr('evidenceHub.redactReasonOther');
        }
    }

    function fillRedactNoteLabels() {
        const set = function (id, key) {
            const el = document.getElementById(id);
            if (el) el.textContent = tr(key);
        };
        /* mob-evidence-redact-details-before-or-with-save-v1 \u2014 draft on mark panel */
        set('ev-redact-draft-hint', 'evidenceHub.redactDraftHint');
        set('ev-redact-draft-lbl-reason', 'evidenceHub.redactReason');
        set('ev-redact-draft-lbl-visible', 'evidenceHub.redactVisible');
        set('ev-redact-draft-lbl-incident', 'evidenceHub.redactIncident');
        fillReasonOptions('ev-redact-draft-reason');
        const dVis = document.getElementById('ev-redact-draft-visible');
        if (dVis) dVis.placeholder = tr('evidenceHub.redactVisiblePh');
        const dInc = document.getElementById('ev-redact-draft-incident');
        if (dInc) dInc.placeholder = tr('evidenceHub.redactIncidentPh');

        set('ev-redact-note-title', 'evidenceHub.redactNoteTitle');
        set('ev-redact-note-hint', 'evidenceHub.redactNoteHint');
        set('ev-redact-note-ready', 'evidenceHub.redactSaveReady');
        set('ev-redact-where-dl', 'evidenceHub.redactWhereDownload');
        set('ev-redact-lbl-reason', 'evidenceHub.redactReason');
        set('ev-redact-lbl-visible', 'evidenceHub.redactVisible');
        set('ev-redact-lbl-incident', 'evidenceHub.redactIncident');
        set('ev-redact-save-note', 'evidenceHub.redactSaveNote');
        set('ev-redact-finalize', 'evidenceHub.redactFinalize');
        set('ev-redact-open-prior', 'evidenceHub.redactOpenPriorExports');
        fillReasonOptions('ev-redact-reason');
        const vis = document.getElementById('ev-redact-visible');
        if (vis) vis.placeholder = tr('evidenceHub.redactVisiblePh');
        const inc = document.getElementById('ev-redact-incident');
        if (inc) inc.placeholder = tr('evidenceHub.redactIncidentPh');
    }

    function readRedactDraftDetails() {
        return {
            redactionReason: (document.getElementById('ev-redact-draft-reason') || {}).value || 'face',
            visibleDescription: String((document.getElementById('ev-redact-draft-visible') || {}).value || '').trim(),
            incidentNote: String((document.getElementById('ev-redact-draft-incident') || {}).value || '').trim(),
        };
    }

    function resetRedactDraftDetails() {
        const reason = document.getElementById('ev-redact-draft-reason');
        const vis = document.getElementById('ev-redact-draft-visible');
        const inc = document.getElementById('ev-redact-draft-incident');
        if (reason) reason.value = 'face';
        if (vis) vis.value = '';
        if (inc) inc.value = '';
    }

    function bindRedactMarkHandlers(fileId) {
        const vid = document.getElementById('ev-redact-video');
        const canvas = document.getElementById('ev-redact-canvas');
        const pauseBtn = document.getElementById('ev-redact-pause');
        const undoBtn = document.getElementById('ev-redact-undo');
        const saveBtn = document.getElementById('ev-redact-save');
        const cancelBtn = document.getElementById('ev-redact-cancel');
        if (!vid || !canvas) return;

        vid.onloadedmetadata = syncRedactCanvas;
        if (pauseBtn) pauseBtn.onclick = function () {
            if (vid.paused) vid.play(); else vid.pause();
        };
        if (undoBtn) undoBtn.onclick = function () {
            const last = redactState.regions[redactState.regions.length - 1];
            const lastIdx = redactState.regions.length - 1;
            const wasAuto = isAutoPreviewRegion(last, lastIdx);
            if (wasAuto && last) {
                redactState.excludeRegions.push({
                    x: last.x, y: last.y, w: last.w, h: last.h,
                });
            }
            redactState.regions.pop();
            if (redactState.autoRegionCount > redactState.regions.length) {
                redactState.autoRegionCount = redactState.regions.length;
            }
            if (!redactState.autoRegionCount) redactState.faceFollow = false;
            redrawRedactRegions();
            renderRedactRegionList();
        };
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                if (redactState.saving) {
                    abortRedactSaveInFlight();
                    const save = document.getElementById('ev-redact-save');
                    if (save) {
                        save.disabled = false;
                        save.textContent = tr('evidenceHub.redactSave');
                    }
                    const prog = document.getElementById('ev-redact-save-progress');
                    if (prog) {
                        prog.hidden = false;
                        prog.classList.add('ev-redact-save-progress-error');
                        prog.textContent = tr('evidenceHub.redactSaveCancelled');
                    }
                    return;
                }
                closeRedactDialog();
            };
        }

        const autofaceBtn = document.getElementById('ev-redact-autoface');
        const hintEl = document.getElementById('ev-redact-hint');
        if (autofaceBtn) autofaceBtn.onclick = function () {
            autofaceBtn.disabled = true;
            const label = autofaceBtn.textContent;
            autofaceBtn.textContent = tr('evidenceHub.redactAutoFaceRunning');
            fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/redact/autoface', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    redactState.parentExportId
                        ? { parentExportId: redactState.parentExportId }
                        : {}
                ),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) throwCatalogErr(res.data);
                    const added = res.data.regions || [];
                    // Replace prior auto preview; keep any manual regions drawn after previous auto count.
                    const manual = redactState.regions.slice(redactState.autoRegionCount || 0);
                    redactState.regions = added.concat(manual);
                    redactState.autoRegionCount = added.length;
                    redactState.excludeRegions = [];
                    redactState.faceFollow = !!(res.data.faceFollow || (res.data.meta && res.data.meta.faceFollow));
                    redrawRedactRegions();
                    renderRedactRegionList();
                    if (hintEl) {
                        if (added.length) {
                            hintEl.textContent = redactState.faceFollow
                                ? tr('evidenceHub.redactAutoFaceFollowDone', { n: added.length })
                                : tr('evidenceHub.redactAutoFaceDone', { n: added.length });
                        } else {
                            hintEl.textContent = tr('evidenceHub.redactAutoFaceNone');
                        }
                    }
                })
                .catch(function (err) {
                    alert(catalogMsg(err.opPayload || err.catalogPayload, err));
                })
                .finally(function () {
                    autofaceBtn.disabled = false;
                    autofaceBtn.textContent = label;
                });
        };

        canvas.onmousedown = function (e) {
            if (!vid.videoWidth) return;
            redactState.drawing = true;
            const rect = canvas.getBoundingClientRect();
            redactState.startX = (e.clientX - rect.left) / redactState.scale;
            redactState.startY = (e.clientY - rect.top) / redactState.scale;
        };
        canvas.onmousemove = function (e) {
            if (!redactState.drawing) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / redactState.scale;
            const y = (e.clientY - rect.top) / redactState.scale;
            redrawRedactRegions();
            const ctx = canvas.getContext('2d');
            const scale = redactState.scale;
            ctx.strokeStyle = '#fbbf24';
            ctx.strokeRect(
                redactState.startX * scale, redactState.startY * scale,
                (x - redactState.startX) * scale, (y - redactState.startY) * scale
            );
        };
        if (!global._evRedactMouseUp) {
            global._evRedactMouseUp = true;
            window.addEventListener('mouseup', function (e) {
                if (!redactState.drawing) return;
                const canvasEl = document.getElementById('ev-redact-canvas');
                const vidEl = document.getElementById('ev-redact-video');
                const redactPanel = document.getElementById('ev-panel-redact');
                if (!canvasEl || !vidEl || !redactPanel || redactPanel.hidden) return;
                redactState.drawing = false;
                const rect = canvasEl.getBoundingClientRect();
                const x = (e.clientX - rect.left) / redactState.scale;
                const y = (e.clientY - rect.top) / redactState.scale;
                const left = Math.min(redactState.startX, x);
                const top = Math.min(redactState.startY, y);
                const w = Math.abs(x - redactState.startX);
                const h = Math.abs(y - redactState.startY);
                if (w < 8 || h < 8) return redrawRedactRegions();
                const t = vidEl.currentTime || 0;
                const dur = isFinite(vidEl.duration) && vidEl.duration > 0 ? vidEl.duration : (t + 2);
                const modeEl = document.getElementById('ev-redact-span-mode');
                const mode = modeEl ? modeEl.value : 'whole';
                let t0, t1;
                if (mode === 'window') {
                    t0 = Math.max(0, t - 1);
                    t1 = Math.min(dur, t + 1);
                } else if (mode === 'from') {
                    t0 = Math.max(0, t);
                    t1 = dur;
                } else {
                    t0 = 0;
                    t1 = dur;
                }
                redactState.regions.push({
                    x: Math.round(left),
                    y: Math.round(top),
                    w: Math.round(w),
                    h: Math.round(h),
                    t0: t0,
                    t1: t1,
                });
                redrawRedactRegions();
                renderRedactRegionList();
            });
        }

        if (saveBtn) saveBtn.onclick = function () {
            /* mob-evidence-redact-save-progress-v1 \u2014 elapsed + cancel/timeout, no forever freeze */
            if (redactState.saving) return;
            const pending = getRedactPending(fileId);
            if (pending && pending.exportId) {
                const resume = global.confirm(tr('evidenceHub.redactResumeOrBurnAgain'));
                if (resume) {
                    openRedactNoteDialog(pending.exportId, fileId, null);
                    return;
                }
            }
            const faceFollow = !!redactState.faceFollow;
            const manualRegions = faceFollow
                ? redactState.regions.slice(redactState.autoRegionCount || 0)
                : redactState.regions.slice();
            if (!faceFollow && !manualRegions.length) {
                showRedactSaveHint(tr('evidenceHub.redactNoRegions'), false);
                return;
            }
            if (faceFollow && !manualRegions.length && !(redactState.autoRegionCount > 0)) {
                showRedactSaveHint(tr('evidenceHub.redactNoRegions'), false);
                return;
            }
            const draftCheck = readRedactDraftDetails();
            if (!String(draftCheck.redactionReason || '').trim()) {
                showRedactSaveHint(tr('evidenceHub.redactNeedReason'), false);
                return;
            }
            abortRedactSaveInFlight();
            const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            redactSaveCtl = ctl;
            redactState.saving = true;
            const startedAt = Date.now();
            const prog = document.getElementById('ev-redact-save-progress');
            function paintProgress() {
                const elapsed = Math.floor((Date.now() - startedAt) / 1000);
                const base = faceFollow
                    ? tr('evidenceHub.redactFaceFollowSaving')
                    : tr('evidenceHub.redactSaving');
                saveBtn.textContent = base;
                if (prog) {
                    prog.hidden = false;
                    prog.classList.remove('ev-redact-save-progress-error');
                    prog.classList.remove('ev-redact-save-hint');
                    prog.textContent = tr('evidenceHub.redactSaveProgress', {
                        t: fmtRedactElapsed(elapsed),
                    });
                }
            }
            saveBtn.disabled = true;
            paintProgress();
            redactSaveTimer = setInterval(paintProgress, 1000);
            const draft = draftCheck;
            const body = faceFollow
                ? {
                    faceFollow: true,
                    regions: manualRegions,
                    excludeRegions: (redactState.excludeRegions || []).slice(),
                    parentExportId: redactState.parentExportId || undefined,
                    redactionReason: draft.redactionReason,
                    visibleDescription: draft.visibleDescription,
                    incidentNote: draft.incidentNote,
                }
                : {
                    regions: manualRegions,
                    parentExportId: redactState.parentExportId || undefined,
                    redactionReason: draft.redactionReason,
                    visibleDescription: draft.visibleDescription,
                    incidentNote: draft.incidentNote,
                };
            let timedOut = false;
            const timeoutId = setTimeout(function () {
                timedOut = true;
                if (ctl) {
                    try { ctl.abort(); } catch (_) { /* ignore */ }
                }
            }, REDACT_SAVE_CLIENT_TIMEOUT_MS);
            const fetchOpts = {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            };
            if (ctl) fetchOpts.signal = ctl.signal;
            fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/redact', fetchOpts)
                .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) throwCatalogErr(res.data);
                    const exportId = res.data.export && res.data.export.exportId;
                    if (!exportId) {
                        const err = new Error(tr('evidenceHub.redactSaveNoExport'));
                        err.catalogPayload = { error: tr('evidenceHub.redactSaveNoExport') };
                        throw err;
                    }
                    stopRedactSaveProgressUi();
                    redactState.saving = false;
                    redactState.saveSucceeded = true;
                    redactSaveCtl = null;
                    setRedactPending(fileId, exportId);
                    const savedMeta = (res.data.export && res.data.export.meta) || readRedactDraftDetails();
                    openRedactNoteDialog(exportId, fileId, savedMeta);
                    /* Refresh Prior exports behind the scenes \u2014 do NOT steal Finalize panel. */
                    loadDetail(fileId, true, { quiet: true }).catch(function () { /* ignore */ });
                })
                .catch(function (err) {
                    redactState.saveSucceeded = false;
                    showRedactMarkPhase();
                    const aborted = !!(err && (err.name === 'AbortError' || err.code === 20));
                    if (prog) {
                        prog.hidden = false;
                        prog.classList.remove('ev-redact-save-hint');
                        prog.classList.add('ev-redact-save-progress-error');
                        if (timedOut) {
                            prog.textContent = tr('evidenceHub.redactSaveTimeout');
                        } else if (aborted) {
                            prog.textContent = tr('evidenceHub.redactSaveCancelled');
                        } else {
                            prog.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
                        }
                    }
                    if (!aborted && !timedOut) {
                        alert(catalogMsg(err.opPayload || err.catalogPayload, err));
                    }
                })
                .finally(function () {
                    clearTimeout(timeoutId);
                    if (redactSaveTimer) {
                        clearInterval(redactSaveTimer);
                        redactSaveTimer = null;
                    }
                    redactState.saving = false;
                    redactSaveCtl = null;
                    /* After success: stay on Finalize screen \u2014 do not re-arm Save (double-burn loop). */
                    if (!redactState.saveSucceeded) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = tr('evidenceHub.redactSave');
                    }
                });
        };
    }

    function openRedactNoteDialog(exportId, fileId, meta) {
        meta = meta || {};
        /* REDACT-FINALIZE-DONE-NO-LOOP-V1 — never reopen note form for Finalized exports. */
        if (String(meta.status || '') === 'finalized') {
            clearRedactPending(fileId);
            showRedactDonePhase(exportId, fileId, {
                downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
                alreadyFinalized: true,
            });
            return;
        }
        ensureRedactDialog();
        fillRedactNoteLabels();
        redactState.exportId = exportId;
        redactState.fileId = fileId;
        redactState.saveSucceeded = true;
        showRedactFinalizeErr('');
        probeRedactExportThenNote(exportId, fileId, meta);
    }

    async function probeRedactExportThenNote(exportId, fileId, meta) {
        meta = meta || {};
        try {
            if (fileId) {
                const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId), { credentials: 'same-origin' });
                const data = await res.json();
                if (res.ok && data && data.ok && data.detail) {
                    const row = findExportById(data.detail.exports, exportId);
                    if (row && row.meta) {
                        meta = Object.assign({}, meta, row.meta);
                        if (String(meta.status || '') === 'finalized') {
                            clearRedactPending(fileId);
                            showRedactDonePhase(exportId, fileId, {
                                downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
                                alreadyFinalized: true,
                            });
                            return;
                        }
                    }
                }
            }
        } catch (_) { /* fall through to note */ }
        openRedactNoteDialogBody(exportId, fileId, meta);
    }

    function openRedactNoteDialogBody(exportId, fileId, meta) {
        meta = meta || {};
        setRedactPending(fileId, exportId);
        showRedactNotePhase();
        showPanel('redact', { skipRefresh: true });
        showRedactFinalizeErr('');
        const ready = document.getElementById('ev-redact-note-ready');
        if (ready) {
            ready.hidden = false;
            ready.textContent = tr('evidenceHub.redactSaveReady');
        }
        const where = document.getElementById('ev-redact-where-dl');
        if (where) where.textContent = tr('evidenceHub.redactWhereDownload');
        const reason = document.getElementById('ev-redact-reason');
        const vis = document.getElementById('ev-redact-visible');
        const inc = document.getElementById('ev-redact-incident');
        if (reason) reason.value = meta.redactionReason || 'face';
        if (vis) vis.value = meta.visibleDescription || '';
        if (inc) inc.value = meta.incidentNote || '';
        const fin = document.getElementById('ev-redact-finalize');
        const gate = document.getElementById('ev-redact-finalize-gate');
        const saveNote = document.getElementById('ev-redact-save-note');
        if (fin) {
            fin.hidden = !perms.superAdmin;
            fin.onclick = function () { finalizeRedactNote(exportId, fileId); };
        }
        if (saveNote) saveNote.hidden = false;
        if (gate) {
            gate.hidden = !!perms.superAdmin;
            gate.textContent = tr('evidenceHub.redactFinalizeNeedSuperAdmin');
        }

        if (saveNote) saveNote.onclick = function () {
            showRedactFinalizeErr('');
            saveRedactNote(exportId, fileId).catch(function (err) {
                const payload = err && (err.opPayload || err.catalogPayload);
                if (isAlreadyFinalizedErr(payload) || isAlreadyFinalizedErr(err)) {
                    clearRedactPending(fileId);
                    showRedactDonePhase(exportId, fileId, {
                        downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
                        alreadyFinalized: true,
                    });
                    return;
                }
                showRedactFinalizeErr(catalogMsg(payload, err));
            });
        };
        const openPrior = document.getElementById('ev-redact-open-prior');
        const closeBtn = document.getElementById('ev-redact-note-close');
        if (openPrior) openPrior.onclick = function () { goDetailPriorExports(fileId); };
        if (closeBtn) {
            closeBtn.onclick = function () { goDetailPriorExports(fileId); };
        }
        /* Stay on note panel \u2014 do NOT auto-bounce to detail (dead-loop fix). */
    }

    async function saveRedactNote(exportId, fileId) {
        const body = {
            redactionReason: (document.getElementById('ev-redact-reason') || {}).value || '',
            visibleDescription: (document.getElementById('ev-redact-visible') || {}).value || '',
            incidentNote: (document.getElementById('ev-redact-incident') || {}).value || '',
        };
        const res = await fetch('/api/evidence/redact/' + encodeURIComponent(exportId) + '/note', {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwCatalogErr(data);
        if (fileId) loadDetail(fileId, true, { quiet: true });
    }

    async function finalizeRedactNote(exportId, fileId) {
        showRedactFinalizeErr('');
        const reason = String((document.getElementById('ev-redact-reason') || {}).value || '').trim();
        const vis = String((document.getElementById('ev-redact-visible') || {}).value || '').trim();
        const inc = String((document.getElementById('ev-redact-incident') || {}).value || '').trim();
        if (!reason) {
            showRedactFinalizeErr(tr('evidenceHub.redactNeedReason'));
            return;
        }
        if (!vis && !inc) {
            showRedactFinalizeErr(tr('evidenceHub.redactFinalizeNeedNote'));
            return;
        }
        try {
            await saveRedactNote(exportId, fileId);
        } catch (err) {
            const payload = err && (err.opPayload || err.catalogPayload);
            if (isAlreadyFinalizedErr(payload) || isAlreadyFinalizedErr(err)) {
                clearRedactPending(fileId);
                showRedactDonePhase(exportId, fileId, {
                    downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
                    alreadyFinalized: true,
                });
                return;
            }
            showRedactFinalizeErr(catalogMsg(payload, err));
            return;
        }
        const res = await fetch('/api/evidence/redact/' + encodeURIComponent(exportId) + '/finalize', {
            method: 'POST',
            credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            if (isAlreadyFinalizedErr(data)) {
                clearRedactPending(fileId);
                showRedactDonePhase(exportId, fileId, {
                    downloadUrl: '/api/evidence/export-stream/' + encodeURIComponent(exportId),
                    alreadyFinalized: true,
                });
                return;
            }
            showRedactFinalizeErr(catalogMsg(data));
            return;
        }
        clearRedactPending(fileId);
        const out = data.export || {};
        const downloadUrl = out.downloadUrl
            || ('/api/evidence/export-stream/' + encodeURIComponent(exportId));
        showRedactDonePhase(exportId, fileId, { downloadUrl: downloadUrl });
        if (fileId) {
            loadDetail(fileId, true, { quiet: true }).catch(function () { /* ignore */ });
        }
    }

    // mob-evidence-redact-autoface-refresh: wait for /api/license-features before
    // showing Auto-detect. Also force enable + action styling so it never looks
    // like a dead/disabled ghost control next to Pause/Undo.
    function syncRedactAutofaceBtn() {
        const autofaceBtn = document.getElementById('ev-redact-autoface');
        if (!autofaceBtn) return;
        autofaceBtn.textContent = tr('evidenceHub.redactAutoFace');
        autofaceBtn.disabled = false;
        autofaceBtn.removeAttribute('disabled');
        autofaceBtn.classList.add('btn-action');
        autofaceBtn.classList.remove('btn-ghost');
        function apply(frOn) {
            autofaceBtn.hidden = !frOn;
            if (frOn) {
                autofaceBtn.disabled = false;
                autofaceBtn.removeAttribute('disabled');
            }
        }
        if (global.LicenseFeatures && LicenseFeatures.isEnabled && LicenseFeatures.isEnabled('fr')) {
            apply(true);
            return;
        }
        apply(false);
        if (global.LicenseFeatures && LicenseFeatures.onReady) {
            LicenseFeatures.onReady(function (features) {
                apply(!!(features && features.fr));
            });
        }
        if (global.LicenseFeatures && LicenseFeatures.fetch) {
            LicenseFeatures.fetch();
        }
    }

    function openRedactWorkspace(fileId, opts) {
        if (!perms.superAdmin) return;
        opts = opts || {};
        const parentExportId = opts.parentExportId ? String(opts.parentExportId).trim() : '';
        const secondPass = !!parentExportId;
        const pending = getRedactPending(fileId);
        /* Second pass: do not steal into an unfinished first-pass Finalize dialog */
        if (!secondPass && pending && pending.exportId) {
            const resume = global.confirm(tr('evidenceHub.redactResumePending'));
            if (resume) {
                openRedactNoteDialog(pending.exportId, fileId, null);
                return;
            }
        }
        ensureRedactDialog();
        fillRedactNoteLabels();
        resetRedactDraftDetails();
        redactState.fileId = fileId;
        redactState.regions = [];
        redactState.faceFollow = false;
        redactState.autoRegionCount = 0;
        redactState.excludeRegions = [];
        redactState.parentExportId = parentExportId || null;
        redactState.secondPass = secondPass;
        showRedactMarkPhase();
        const ready = document.getElementById('ev-redact-note-ready');
        if (ready) { ready.hidden = true; ready.textContent = ''; }
        document.getElementById('ev-redact-title').textContent = secondPass
            ? tr('evidenceHub.redactSecondPassTitle')
            : tr('evidenceHub.redactTitle');
        document.getElementById('ev-redact-hint').textContent = secondPass
            ? tr('evidenceHub.redactSecondPassHint')
            : tr('evidenceHub.redactHint');
        const backBtn = document.getElementById('ev-redact-back');
        if (backBtn) {
            backBtn.textContent = tr('evidenceHub.redactBack');
            backBtn.onclick = function () {
                closeRedactDialog();
            };
        }
        document.getElementById('ev-redact-pause').textContent = tr('evidenceHub.redactPause');
        document.getElementById('ev-redact-undo').textContent = tr('evidenceHub.redactUndo');
        const saveBtnOpen = document.getElementById('ev-redact-save');
        if (saveBtnOpen) {
            saveBtnOpen.disabled = false;
            saveBtnOpen.textContent = tr('evidenceHub.redactSave');
        }
        syncRedactAutofaceBtn();
        const spanLbl = document.getElementById('ev-redact-span-lbl');
        if (spanLbl) spanLbl.textContent = tr('evidenceHub.redactSpanLabel');
        const spanSel = document.getElementById('ev-redact-span-mode');
        const spanHintTxt = tr('evidenceHub.redactSpanHint');
        if (spanSel && spanSel.options.length >= 3) {
            spanSel.options[0].text = tr('evidenceHub.redactSpanWhole');
            spanSel.options[1].text = tr('evidenceHub.redactSpanFrom');
            spanSel.options[2].text = tr('evidenceHub.redactSpanWindow');
            spanSel.value = 'whole';
            spanSel.title = spanHintTxt;
        }
        const spanHint = document.getElementById('ev-redact-span-hint');
        if (spanHint) spanHint.textContent = spanHintTxt;
        const vid = document.getElementById('ev-redact-video');
        if (vid) {
            vid.src = secondPass
                ? ('/api/evidence/export-preview/' + encodeURIComponent(parentExportId))
                : ('/api/evidence/preview/' + encodeURIComponent(fileId));
            vid.load();
        }
        renderRedactRegionList();
        bindRedactMarkHandlers(fileId);
        showPanel('redact', { skipRefresh: true });
        markPanelLoaded('redact');
    }

    function exportStatusLabel(status) {
        if (status === 'pending') return tr('evidenceHub.statusAwaiting');
        if (status === 'approved') return tr('evidenceHub.statusApproved');
        if (status === 'denied') return tr('evidenceHub.statusDenied');
        if (status === 'consumed') return tr('evidenceHub.statusDownloaded');
        return status || '\u2014';
    }

    function renderApprovalCards(rows) {
        return rows.map(function (r) {
            return '<div class="ev-approval-card" data-request-id="' + esc(r.requestId) + '">'
                + '<strong>' + esc(r.requestId) + '</strong>'
                + '<p>' + tr('evidenceHub.requestedBy') + ': ' + esc(r.requestedBy || '\u2014') + ' \u00B7 ' + fmtTime(r.requestedAt) + '</p>'
                + '<p>' + tr('evidenceHub.fileId') + ': <code>' + esc(r.evidenceFileId) + '</code></p>'
                + (r.reason ? '<p>' + tr('evidenceHub.reason') + ': ' + esc(r.reason) + '</p>' : '')
                + '<label class="full"><span>' + tr('server.users.adminConfirm') + '</span>'
                + '<input type="password" class="ev-approval-pass" autocomplete="current-password"></label>'
                + '<div class="ev-approval-actions">'
                + '<button type="button" class="btn btn-action btn-sm ev-approval-approve">' + tr('evidenceHub.approve') + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm ev-approval-deny">' + tr('evidenceHub.deny') + '</button>'
                + '</div></div>';
        }).join('');
    }

    async function approveSecureExport(requestId, card) {
        const passEl = card.querySelector('.ev-approval-pass');
        const adminPassword = passEl ? passEl.value : '';
        const approveBtn = card.querySelector('.ev-approval-approve');
        const denyBtn = card.querySelector('.ev-approval-deny');
        const busyCtrl = (global.AuthFormBusy && AuthFormBusy.create) ? AuthFormBusy.create({
            fields: [passEl].filter(Boolean),
            submitBtn: approveBtn,
            cancelBtns: [denyBtn].filter(Boolean),
            busyLabel: tr('common.verifying'),
        }) : null;
        if (busyCtrl && busyCtrl.isBusy()) return;
        if (busyCtrl) busyCtrl.setBusy(true);
        try {
            const res = await fetch('/api/evidence/secure-export/' + encodeURIComponent(requestId) + '/approve', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            const msg = tr('evidenceHub.approvedMsg', {
                unlockCode: data.passphrase,
                expires: fmtTime(data.downloadExpiresAt),
            });
            alert(msg);
            if (data.downloadUrl) window.location.href = data.downloadUrl;
            loadCatalog();
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
            if (busyCtrl) busyCtrl.setBusy(false);
            if (passEl) passEl.focus();
        }
    }

    async function denySecureExport(requestId, card) {
        const passEl = card.querySelector('.ev-approval-pass');
        const adminPassword = passEl ? passEl.value : '';
        const approveBtn = card.querySelector('.ev-approval-approve');
        const denyBtn = card.querySelector('.ev-approval-deny');
        const busyCtrl = (global.AuthFormBusy && AuthFormBusy.create) ? AuthFormBusy.create({
            fields: [passEl].filter(Boolean),
            submitBtn: denyBtn,
            cancelBtns: [approveBtn].filter(Boolean),
            busyLabel: tr('common.verifying'),
        }) : null;
        if (busyCtrl && busyCtrl.isBusy()) return;
        const reasonRaw = window.prompt(tr('evidenceHub.denyReasonPrompt'), '');
        if (reasonRaw === null) return;
        if (busyCtrl) busyCtrl.setBusy(true);
        try {
            const res = await fetch('/api/evidence/secure-export/' + encodeURIComponent(requestId) + '/deny', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword, reason: reasonRaw }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            loadCatalog();
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
            if (busyCtrl) busyCtrl.setBusy(false);
            if (passEl) passEl.focus();
        }
    }

    function normalizeDetailTagsStr(s) {
        return String(s || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).join(', ');
    }

    function readDetailMetaSnapshot() {
        const notes = document.getElementById('ev-detail-notes');
        const tagsEl = document.getElementById('ev-detail-tags');
        const sos = document.getElementById('ev-detail-sos');
        const ts = document.getElementById('ev-trim-start');
        const te = document.getElementById('ev-trim-end');
        const photo = document.getElementById('ev-detail-photo');
        return {
            notes: notes ? String(notes.value || '') : '',
            tags: normalizeDetailTagsStr(tagsEl ? tagsEl.value : ''),
            sosIncidentId: sos && sos.value ? String(sos.value) : '',
            trimStartSec: ts && String(ts.value).trim() !== '' ? String(Number(ts.value)) : '',
            trimEndSec: te && String(te.value).trim() !== '' ? String(Number(te.value)) : '',
            photoPending: !!(photo && photo.files && photo.files.length),
        };
    }

    function setDetailSaveHint(msg) {
        const el = document.getElementById('ev-detail-save-hint');
        if (!el) return;
        if (!msg) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        el.textContent = msg;
    }

    function captureDetailMetaBaseline() {
        const snap = readDetailMetaSnapshot();
        snap.photoPending = false;
        detailMetaBaseline = snap;
        setDetailSaveHint('');
    }

    function isDetailMetaDirty() {
        if (!detailMetaBaseline) return true;
        const cur = readDetailMetaSnapshot();
        return cur.notes !== detailMetaBaseline.notes
            || cur.tags !== detailMetaBaseline.tags
            || cur.sosIncidentId !== detailMetaBaseline.sosIncidentId
            || cur.trimStartSec !== detailMetaBaseline.trimStartSec
            || cur.trimEndSec !== detailMetaBaseline.trimEndSec
            || cur.photoPending;
    }

    async function saveDetailMeta(fileId) {
        if (!isDetailMetaDirty()) {
            setDetailSaveHint(tr('evidenceHub.saveMetaNoChanges'));
            return;
        }
        setDetailSaveHint('');
        const notes = document.getElementById('ev-detail-notes');
        const tagsEl = document.getElementById('ev-detail-tags');
        const sos = document.getElementById('ev-detail-sos');
        const body = {
            notes: notes ? notes.value : '',
            tags: tagsEl ? tagsEl.value : '',
            sosIncidentId: sos && sos.value ? sos.value : null,
            trimStartSec: document.getElementById('ev-trim-start') ? Number(document.getElementById('ev-trim-start').value) : null,
            trimEndSec: document.getElementById('ev-trim-end') ? Number(document.getElementById('ev-trim-end').value) : null,
        };
        const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) { alert(catalogMsg(data)); return; }
        captureDetailMetaBaseline();
        setDetailSaveHint(tr('evidenceHub.saved'));
    }

    async function archiveEvidence(fileId) {
        if (!window.confirm(tr('evidenceHub.archiveConfirm'))) return;
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/archive', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            catalogStatus = 'active';
            syncCatalogStatusButtons();
            catalogPage = 1;
            showPanel('catalog', { force: true });
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
        }
    }

    async function restoreEvidence(fileId) {
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/restore', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            catalogStatus = 'active';
            syncCatalogStatusButtons();
            catalogPage = 1;
            loadDetail(fileId, true);
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
        }
    }

    function uploadDetailPhoto(fileId, input) {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function () {
            const b64 = String(reader.result || '').split(',')[1];
            try {
                const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/attachment', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: file.name, dataBase64: b64 }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throwCatalogErr(data);
                loadDetail(fileId);
            } catch (err) {
                alert(catalogMsg(err.opPayload || err.catalogPayload, err));
            }
            input.value = '';
        };
        reader.readAsDataURL(file);
    }

    function setTrimFromPlayhead(inputId) {
        const player = document.getElementById('ev-detail-player');
        const input = document.getElementById(inputId);
        if (!input) return;
        if (!player || typeof player.currentTime !== 'number' || player.tagName !== 'VIDEO') {
            alert(tr('evidenceHub.trimOpenVideoFirst'));
            return;
        }
        input.value = (Math.round(player.currentTime * 10) / 10).toFixed(1);
    }

    var TRIM_MIN_SECONDS = 1;

    function updateTrimLen() {
        const out = document.getElementById('ev-trim-len');
        const startEl = document.getElementById('ev-trim-start');
        const endEl = document.getElementById('ev-trim-end');
        if (!out || !startEl) return;
        const start = Number(startEl.value) || 0;
        if (!endEl || endEl.value === '') {
            out.className = 'ev-trim-len';
            out.textContent = tr('evidenceHub.trimLenToEnd');
            return;
        }
        const end = Number(endEl.value);
        const len = end - start;
        if (Number.isNaN(end) || len <= 0) {
            out.className = 'ev-trim-len ev-trim-len-bad';
            out.textContent = tr('evidenceHub.trimLenInvalid');
        } else if (len < TRIM_MIN_SECONDS) {
            out.className = 'ev-trim-len ev-trim-len-bad';
            out.textContent = tr('evidenceHub.trimLenTooShort', { min: TRIM_MIN_SECONDS });
        } else {
            out.className = 'ev-trim-len';
            out.textContent = tr('evidenceHub.trimLen', { len: len.toFixed(1) });
        }
    }

    async function runTrimExport(fileId) {
        const start = Number(document.getElementById('ev-trim-start').value);
        const endEl = document.getElementById('ev-trim-end');
        const end = endEl && endEl.value !== '' ? Number(endEl.value) : null;
        const btn = document.getElementById('ev-trim-export');
        if (btn) btn.disabled = true;
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/trim-export', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trimStartSec: start, trimEndSec: end }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            window.location.href = data.export.downloadUrl;
            loadDetail(fileId);
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function requestSecureExport(fileId, btn) {
        if (!perms.download || !fileId) return;
        const reason = window.prompt(tr('evidenceHub.secureReasonPrompt'), '') || '';
        if (btn) btn.disabled = true;
        try {
            const res = await fetch('/api/evidence/request-secure-export', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: fileId, reason: reason }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            alert(tr('evidenceHub.secureRequested', { id: data.request.requestId }));
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function requestDownload(fileId, btn) {
        if (!perms.download || !fileId) return;
        if (btn) btn.disabled = true;
        try {
            const res = await fetch('/api/evidence/request-download', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: fileId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            window.location.href = data.download.downloadUrl;
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function ensureForensicImportControl() {
        if (document.getElementById('ev-forensic-import')) return;
        const refresh = document.getElementById('evidence-refresh');
        const toolbar = refresh && refresh.parentElement;
        if (!toolbar) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'ev-forensic-import';
        button.className = 'btn btn-action btn-sm';
        button.setAttribute('data-i18n', 'evidenceHub.importForensic');
        button.textContent = tr('evidenceHub.importForensic');
        button.hidden = !perms.superAdmin;
        const input = document.createElement('input');
        input.type = 'file';
        input.id = 'ev-forensic-import-file';
        input.accept = '.mp4,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.ts,.ps,.h264,.h265,.dat,.bin,.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf';
        input.hidden = true;
        const message = document.createElement('span');
        message.id = 'ev-forensic-import-msg';
        message.className = 'hint';
        toolbar.insertBefore(button, refresh.nextSibling);
        toolbar.insertBefore(input, button.nextSibling);
        toolbar.insertBefore(message, input.nextSibling);
        button.addEventListener('click', function () {
            if (!perms.superAdmin) return;
            input.value = '';
            input.click();
        });
        input.addEventListener('change', async function () {
            const file = input.files && input.files[0];
            if (!file) return;
            button.disabled = true;
            message.textContent = tr('evidenceHub.importChecking');
            try {
                const form = new FormData();
                form.append('file', file, file.name);
                const res = await fetch('/api/evidence/import-forensic', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: form,
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throwCatalogErr(data);
                message.textContent = tr('evidenceHub.importAccepted');
                catalogPage = 1;
                await loadCatalog(true);
            } catch (err) {
                message.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
            } finally {
                button.disabled = false;
                input.value = '';
            }
        });
    }

    function bindUi() {
        ensureForensicImportControl();
        document.querySelectorAll('.evidence-hub-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showPanel(btn.dataset.panel);
            });
        });
        const addDock = document.getElementById('ev-dock-add');
        if (addDock) addDock.addEventListener('click', function () {
            if (!perms.dockAdmin) { alert(tr('evidenceHub.noDockPerm')); return; }
            openDockForm(null);
        });
        const dockList = document.getElementById('ev-docks-list');
        if (dockList) {
            dockList.addEventListener('click', function (e) {
                const row = e.target.closest('[data-dock-id]');
                if (!row) return;
                selectedDockId = row.getAttribute('data-dock-id');
                dockList.querySelectorAll('.ev-dock-row').forEach(function (el) {
                    el.classList.toggle('active', el === row);
                });
                loadDockBays(selectedDockId);
            });
        }
        const dockSave = document.getElementById('ev-dock-save');
        if (dockSave) dockSave.addEventListener('click', function () {
            saveDockForm().catch(function (err) { alert(catalogMsg(err.opPayload || err.catalogPayload, err)); });
        });
        const dockCancel = document.getElementById('ev-dock-cancel');
        if (dockCancel) dockCancel.addEventListener('click', function () {
            document.getElementById('ev-dock-dialog').hidden = true;
        });
        const tbody = document.getElementById('evidence-tbody');
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const dl = e.target.closest('.evidence-dl-btn');
                if (dl) {
                    requestDownload(dl.getAttribute('data-file-id'), dl);
                    return;
                }
                const sec = e.target.closest('.evidence-secure-btn');
                if (sec) {
                    requestSecureExport(sec.getAttribute('data-file-id'), sec);
                    return;
                }
                const open = e.target.closest('.ev-open-detail');
                if (open) loadDetail(open.getAttribute('data-file-id'));
            });
        }
        const catalogPanel = document.getElementById('ev-panel-catalog');
        if (catalogPanel) {
            catalogPanel.addEventListener('click', function (e) {
                const card = e.target.closest('.ev-approval-card');
                if (!card) return;
                const requestId = card.getAttribute('data-request-id');
                if (e.target.closest('.ev-approval-approve')) approveSecureExport(requestId, card);
                if (e.target.closest('.ev-approval-deny')) denySecureExport(requestId, card);
            });
        }
        const refresh = document.getElementById('evidence-refresh');
        if (refresh) refresh.addEventListener('click', function () {
            if (global.TabLifecycle) TabLifecycle.invalidate('evidence');
            refreshCurrentPanel(true);
        });
        const tagFilter = document.getElementById('ev-catalog-tag-filter');
        if (tagFilter && !tagFilter._evTagBound) {
            tagFilter._evTagBound = true;
            let tagTimer = null;
            function runTagFilter() {
                catalogPage = 1;
                if (currentPanel === 'catalog') loadCatalog(true);
            }
            tagFilter.addEventListener('input', function () {
                if (tagTimer) clearTimeout(tagTimer);
                tagTimer = setTimeout(runTagFilter, 280);
            });
            tagFilter.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tagTimer) clearTimeout(tagTimer);
                    runTagFilter();
                }
            });
        }
        document.querySelectorAll('.ev-catalog-status-btn').forEach(function (btn) {
            if (btn._evStatusBound) return;
            btn._evStatusBound = true;
            btn.addEventListener('click', function () {
                const next = btn.getAttribute('data-status') === 'archived' ? 'archived' : 'active';
                if (catalogStatus === next) return;
                catalogStatus = next;
                catalogPage = 1;
                syncCatalogStatusButtons();
                if (currentPanel === 'catalog') loadCatalog(true);
            });
        });
        syncCatalogStatusButtons();
        const prevBtn = document.getElementById('ev-catalog-prev');
        if (prevBtn && !prevBtn._evPagerBound) {
            prevBtn._evPagerBound = true;
            prevBtn.addEventListener('click', function () {
                if (catalogPage <= 1) return;
                catalogPage -= 1;
                loadCatalog(true);
            });
        }
        const nextBtn = document.getElementById('ev-catalog-next');
        if (nextBtn && !nextBtn._evPagerBound) {
            nextBtn._evPagerBound = true;
            nextBtn.addEventListener('click', function () {
                catalogPage += 1;
                loadCatalog(true);
            });
        }
        /* mob-evidence-redacted-exports-browser-v1 */
        const rxTbody = document.getElementById('ev-rx-tbody');
        if (rxTbody && !rxTbody._evRxBound) {
            rxTbody._evRxBound = true;
            rxTbody.addEventListener('click', function (e) {
                const open = e.target.closest('.ev-rx-open');
                if (open) loadDetail(open.getAttribute('data-file-id'));
            });
        }
        const rxRefresh = document.getElementById('ev-rx-refresh');
        if (rxRefresh && !rxRefresh._evRxBound) {
            rxRefresh._evRxBound = true;
            rxRefresh.addEventListener('click', function () { loadRedactedExports(true); });
        }
        function runRxFilter() {
            rxPage = 1;
            if (currentPanel === 'redacted-exports') loadRedactedExports(true);
        }
        const rxSearch = document.getElementById('ev-rx-search');
        if (rxSearch && !rxSearch._evRxBound) {
            rxSearch._evRxBound = true;
            let rxTimer = null;
            rxSearch.addEventListener('input', function () {
                if (rxTimer) clearTimeout(rxTimer);
                rxTimer = setTimeout(runRxFilter, 280);
            });
            rxSearch.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (rxTimer) clearTimeout(rxTimer);
                    runRxFilter();
                }
            });
        }
        ['ev-rx-period', 'ev-rx-status'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el && !el._evRxBound) {
                el._evRxBound = true;
                el.addEventListener('change', runRxFilter);
            }
        });
        const rxTag = document.getElementById('ev-rx-tag');
        if (rxTag && !rxTag._evRxBound) {
            rxTag._evRxBound = true;
            let tagTimer = null;
            rxTag.addEventListener('input', function () {
                if (tagTimer) clearTimeout(tagTimer);
                tagTimer = setTimeout(runRxFilter, 280);
            });
        }
        const rxPrev = document.getElementById('ev-rx-prev');
        if (rxPrev && !rxPrev._evRxBound) {
            rxPrev._evRxBound = true;
            rxPrev.addEventListener('click', function () {
                if (rxPage <= 1) return;
                rxPage -= 1;
                loadRedactedExports(true);
            });
        }
        const rxNext = document.getElementById('ev-rx-next');
        if (rxNext && !rxNext._evRxBound) {
            rxNext._evRxBound = true;
            rxNext.addEventListener('click', function () {
                rxPage += 1;
                loadRedactedExports(true);
            });
        }
        if (!global._evidenceHubI18nBound) {
            global._evidenceHubI18nBound = true;
            global.addEventListener('fm-i18n-changed', function () {
                updatePermBanner();
                renderOverviewGuidance();
                refreshCurrentPanel(true);
            });
        }
    }

    function onShow(opts) {
        opts = opts || {};
        var panel = (currentPanel === 'detail' && currentDetailId) ? 'detail' : currentPanel;
        showPanel(panel, opts.force ? { force: true } : { skipRefresh: true });
    }

    global.EvidenceHub = {
        applyPermissions: applyPermissions,
        onShow: onShow,
        refreshCatalog: loadCatalog,
        refreshCurrentPanel: refreshCurrentPanel,
        bindUi: bindUi,
        requestDownload: requestDownload,
        requestSecureExport: requestSecureExport,
        openDetail: function (fileId) {
            loadDetail(fileId);
        },
    };
}(window));
