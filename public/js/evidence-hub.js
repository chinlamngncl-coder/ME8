/**
 * Evidence & Docking hub — docks (1 / 8 / 24-bay 6×4), catalog, detail, trim export.
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
    let docksCache = [];
    let selectedDockId = null;
    const panelLoadedAt = Object.create(null);

    function staleMs() {
        return (global.TabLifecycle && TabLifecycle.STALE_MS) || 60000;
    }

    function panelWarm(name, force) {
        if (force) return false;
        const t = panelLoadedAt[name];
        return !!(t && (Date.now() - t < staleMs()));
    }

    function markPanelLoaded(name) {
        panelLoadedAt[name] = Date.now();
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
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString(); } catch (_) { return iso; }
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
        if (dashboardRole !== 'super_admin' && currentPanel === 'settings') showPanel('overview');
        else if (currentPanel === 'approvals') showPanel('catalog', { focusExportQueue: true });
        else if (!perms.dockAdmin && dashboardRole !== 'super_admin' && currentPanel === 'docks') showPanel('overview');
        refreshSecureExportFlag();
        if (document.getElementById('app-view-evidence') && !document.getElementById('app-view-evidence').hidden) {
            refreshCurrentPanel();
        }
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
        return '—';
    }

    function fmtLastAuth(d) {
        if (d.lastAuthOfficer && d.lastAuthAt) {
            return esc(d.lastAuthOfficer) + '<br><span class="hint">' + esc(fmtTime(d.lastAuthAt)) + '</span>';
        }
        return '—';
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
                : '—';
            const loc = d.location || d.branchCode || '—';
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
        document.querySelectorAll('.evidence-hub-panel').forEach(function (p) {
            p.hidden = p.id !== 'ev-panel-' + name;
        });
        document.querySelectorAll('.evidence-hub-nav-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.panel === name);
        });
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
            if (panelWarm('case-files', force)) return;
            if (global.CaseFilesUi && CaseFilesUi.onShow) CaseFilesUi.onShow({ force: true });
            markPanelLoaded('case-files');
        } else if (currentPanel === 'detail' && currentDetailId) {
            if (panelWarm('detail', force)) return;
            loadDetail(currentDetailId, force);
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
            const fileKpi = fileN != null ? String(fileN) : '—';
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
                + '<div class="ev-kpi"><span class="ev-kpi-n">' + (catalog.available ? (totals.baysOccupied || 0) : '—') + '</span><span class="ev-kpi-l">' + tr('evidenceHub.kpiBaysOccupied') + '</span></div>'
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
                + healthRow(tr('evidenceHub.storageDbSize'), catalog.available && dbBytes != null ? esc(fmtBytes(dbBytes)) : '—')
                + healthRow(tr('evidenceHub.storageEvidenceBytes'), catalog.available && evBytes != null ? esc(fmtBytes(evBytes)) : '—')
                + healthRow(tr('evidenceHub.storageArchive'), esc(val.networkArchive ? tr('evidence.archiveNetwork') : tr('evidence.archiveLocal')))
                + healthRow(tr('evidenceHub.storageFtpPath'), esc(paths.ftpLabel || '—') + ' · ' + pathStatusHtml(val.ftp))
                + healthRow(tr('evidenceHub.storageNasPath'), esc(paths.nasMountPath || '—') + ' · ' + pathStatusHtml(val.nas))
                + healthRow(tr('evidenceHub.storageBackups'), esc(String(backups.count || 0)) + (backups.latest ? ' · ' + esc(backups.latest) : ''))
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
                    let line = esc(r.requestId) + ' · ' + esc(r.evidenceFileId) + ' · ' + esc(exportStatusLabel(r.status));
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
                    + '<span class="hint">' + esc(d.branchCode) + ' · ' + esc(d.bayPreset) + '-bay</span>'
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
                let sub = bay.state === 'empty' ? tr('evidenceHub.bayEmpty') : esc(bay.serial || '—');
                if (bay.state === 'uploading' && bay.progress != null) sub += ' · ' + bay.progress + '%';
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

    async function loadCatalog(force) {
        const tbody = document.getElementById('evidence-tbody');
        const meta = document.getElementById('evidence-meta');
        const emptyEl = document.getElementById('ev-catalog-empty');
        if (!tbody) return;
        if (!perms.view) {
            showCatalogTable(true);
            tbody.innerHTML = '<tr><td colspan="7" class="hint">—</td></tr>';
            renderCatalogExportQueue(null);
            return;
        }
        showCatalogTable(true);
        if (!panelWarm('catalog', force)) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">' + tr('evidenceHub.loading') + '</td></tr>';
            if (meta) meta.textContent = '';
            renderCatalogExportQueue(null, true);
        }
        try {
            const fetches = [
                fetch('/api/evidence/catalog?limit=200', { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
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
            if (!files.length) {
                if (meta) meta.textContent = '';
                showCatalogEmptyState(emptyEl, { unavailable: false });
                focusCatalogExportQueueIfNeeded();
                markPanelLoaded('catalog');
                return;
            }
            showCatalogTable(true);
            if (meta) meta.textContent = files.length + ' file(s)';
            tbody.innerHTML = files.map(function (f) {
                return '<tr data-file-id="' + esc(f.id) + '">'
                    + '<td><code>' + esc(f.id) + '</code></td>'
                    + '<td>' + esc(f.fileName) + '<br><span class="hint">' + fmtBytes(f.byteSize) + '</span></td>'
                    + '<td>' + esc(f.operatorName || '—') + '</td>'
                    + '<td>' + esc(fmtTime(f.uploadedAt)) + '</td>'
                    + '<td>' + esc(f.storageTier || f.source || 'local') + '</td>'
                    + '<td><button type="button" class="btn btn-ghost btn-sm ev-open-detail" data-file-id="' + esc(f.id) + '">' + tr('evidenceHub.open') + '</button></td>'
                    + '<td>' + (perms.download
                        ? (perms.superAdmin || !secureExportEnabled
                            ? '<button type="button" class="btn btn-action btn-sm evidence-dl-btn" data-file-id="' + esc(f.id) + '">' + tr('evidenceHub.download') + '</button>'
                            : '<button type="button" class="btn btn-action btn-sm evidence-secure-btn" data-file-id="' + esc(f.id) + '">' + tr('evidenceHub.requestSecure') + '</button>')
                        : '—') + '</td>'
                    + '</tr>';
            }).join('');
            focusCatalogExportQueueIfNeeded();
            markPanelLoaded('catalog');
        } catch (err) {
            renderCatalogExportQueue(null);
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

    async function loadDetail(fileId, force) {
        currentDetailId = fileId;
        const wrap = document.getElementById('ev-detail-body');
        if (!wrap) return;
        if (panelWarm('detail', force)) {
            showPanel('detail', { skipRefresh: true });
            return;
        }
        wrap.innerHTML = '<p class="hint">' + tr('evidenceHub.loading') + '</p>';
        showPanel('detail', { skipRefresh: true });
        try {
            const res = await fetch('/api/evidence/detail/' + encodeURIComponent(fileId), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            const d = data.detail;
            const f = d.file;
            const m = d.meta || {};
            const sosOpts = await fetchSosOptions(f.deviceId);
            wrap.innerHTML =
                '<div class="ev-detail-head">'
                + '<button type="button" class="btn btn-ghost btn-sm" id="ev-detail-back">← ' + tr('evidenceHub.backCatalog') + '</button>'
                + '<h3>' + esc(f.fileName) + '</h3>'
                + '<code>' + esc(f.id) + '</code></div>'
                + '<div class="ev-detail-grid">'
                + '<div class="ev-detail-video"><video id="ev-detail-player" controls playsinline src="' + esc(d.previewUrl) + '"></video></div>'
                + '<div class="ev-detail-side">'
                + '<dl class="ss-dock-ro"><dt>' + tr('evidence.colOfficer') + '</dt><dd>' + esc(f.operatorName || '—') + '</dd>'
                + '<dt>' + tr('evidence.colUploaded') + '</dt><dd>' + esc(fmtTime(f.uploadedAt)) + '</dd>'
                + '<dt>' + tr('evidenceHub.size') + '</dt><dd>' + fmtBytes(f.byteSize) + '</dd></dl>'
                + (perms.edit ? (
                    '<label class="full"><span>' + tr('evidenceHub.notes') + '</span>'
                    + '<textarea id="ev-detail-notes" rows="3">' + esc(m.notes || '') + '</textarea></label>'
                    + '<label class="full"><span>' + tr('evidenceHub.linkSos') + '</span>'
                    + '<select id="ev-detail-sos">' + sosOpts + '</select></label>'
                    + '<label class="full"><span>' + tr('evidenceHub.attachPhoto') + '</span>'
                    + '<input type="file" id="ev-detail-photo" accept="image/*"></label>'
                    + '<button type="button" class="btn btn-action btn-sm" id="ev-detail-save-meta">' + tr('evidenceHub.saveMeta') + '</button>'
                    + '<button type="button" class="btn btn-ghost btn-sm" id="ev-detail-add-case">' + tr('caseFiles.addToCase') + '</button>'
                ) : '')
                + (perms.export ? (
                    '<div class="ev-trim-block"><h4>' + tr('evidenceHub.trimExport') + '</h4>'
                    + '<label><span>' + tr('evidenceHub.trimStart') + '</span><input type="number" id="ev-trim-start" min="0" step="0.1" value="' + (m.trimStartSec != null ? m.trimStartSec : 0) + '"></label>'
                    + '<label><span>' + tr('evidenceHub.trimEnd') + '</span><input type="number" id="ev-trim-end" min="0" step="0.1" value="' + (m.trimEndSec != null ? m.trimEndSec : '') + '" placeholder="auto"></label>'
                    + '<button type="button" class="btn btn-action btn-sm" id="ev-trim-export">' + tr('evidenceHub.exportTrim') + '</button></div>'
                ) : '')
                + renderAttachments(d.attachments)
                + renderExports(d.exports)
                + (perms.superAdmin ? (
                    '<div class="ev-export-actions">'
                    + '<button type="button" class="btn btn-ghost btn-sm" id="ev-detail-redact">' + tr('evidenceHub.openRedact') + '</button>'
                    + '</div>'
                ) : '')
                + (perms.download ? (
                    '<div class="ev-export-actions">'
                    + (perms.superAdmin || !secureExportEnabled
                        ? '<button type="button" class="btn btn-action btn-sm" id="ev-detail-download">' + tr('evidenceHub.download') + '</button>'
                        : '<button type="button" class="btn btn-action btn-sm" id="ev-detail-secure">' + tr('evidenceHub.requestSecure') + '</button>')
                    + '</div>'
                ) : '')
                + '</div></div>';
            if (m.sosIncidentId) {
                const sel = document.getElementById('ev-detail-sos');
                if (sel) sel.value = m.sosIncidentId;
            }
            bindDetailActions(fileId);
            markPanelLoaded('detail');
        } catch (err) {
            wrap.innerHTML = '<p class="hint">' + esc(catalogMsg(err.opPayload || err.catalogPayload, err)) + '</p>';
        }
    }

    function renderAttachments(list) {
        if (!list || !list.length) return '<p class="hint">' + tr('evidenceHub.noAttachments') + '</p>';
        return '<ul class="ev-attach-list">' + list.map(function (a) {
            return '<li><a href="/api/evidence/attachment/' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">' + esc(a.fileName) + '</a></li>';
        }).join('') + '</ul>';
    }

    function renderExports(list) {
        if (!list || !list.length) return '';
        return '<h4>' + tr('evidenceHub.priorExports') + '</h4><ul class="ev-attach-list">' + list.map(function (e) {
            const isRedact = e.exportType === 'redact';
            const meta = e.meta || {};
            let status = '';
            if (isRedact) {
                if (meta.status === 'finalized') status = ' · ' + tr('evidenceHub.redactFinalized');
                else if (meta.status === 'draft') status = ' · ' + tr('evidenceHub.redactDraft');
                else status = ' · ' + tr('evidenceHub.redactPendingNote');
            }
            let noteBtn = '';
            if (isRedact && (perms.edit || perms.superAdmin) && meta.status !== 'finalized') {
                noteBtn = ' <button type="button" class="btn btn-ghost btn-sm ev-redact-note-btn" data-export-id="'
                    + esc(e.exportId) + '">' + tr('evidenceHub.redactEditNote') + '</button>';
            }
            const typeLabel = isRedact ? ('[' + tr('evidenceHub.redactType') + '] ') : '';
            const dl = (perms.export && (!isRedact || meta.status === 'finalized'))
                ? ' <a href="/api/evidence/export-stream/' + encodeURIComponent(e.exportId) + '">' + tr('evidenceHub.download') + '</a>'
                : '';
            return '<li>' + typeLabel + esc(e.fileName) + ' · ' + fmtBytes(e.byteSize) + status + dl + noteBtn + '</li>';
        }).join('') + '</ul>';
    }

    async function fetchSosOptions(deviceId) {
        let html = '<option value="">— ' + tr('evidenceHub.noSosLink') + ' —</option>';
        try {
            const res = await fetch('/api/evidence/sos-incidents?days=180&limit=100', { credentials: 'same-origin' });
            const data = await res.json();
            const inc = (data.incidents && data.incidents.entries) ? data.incidents.entries : [];
            inc.forEach(function (e) {
                if (deviceId && e.cameraId && e.cameraId !== deviceId) return;
                html += '<option value="' + esc(e.id) + '">' + esc(fmtTime(e.at)) + ' · ' + esc(e.operatorName || e.cameraId || e.id) + '</option>';
            });
        } catch (_) { /* ignore */ }
        return html;
    }

    function bindDetailActions(fileId) {
        const back = document.getElementById('ev-detail-back');
        if (back) back.addEventListener('click', function () { showPanel('catalog'); });
        const save = document.getElementById('ev-detail-save-meta');
        if (save) save.addEventListener('click', function () { saveDetailMeta(fileId); });
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
    }

    function ensureRedactDialog() {
        let dlg = document.getElementById('ev-redact-dialog');
        if (dlg) return dlg;
        dlg = document.createElement('div');
        dlg.id = 'ev-redact-dialog';
        dlg.hidden = true;
        dlg.innerHTML =
            '<div class="ev-redact-dialog-inner" role="dialog" aria-modal="true">'
            + '<div id="ev-redact-mark-panel">'
            + '<h4 id="ev-redact-title"></h4>'
            + '<p class="hint" id="ev-redact-hint"></p>'
            + '<div class="ev-redact-toolbar">'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-pause"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-undo"></button>'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-redact-save"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-cancel">' + esc(tr('common.cancel')) + '</button>'
            + '</div>'
            + '<div class="ev-redact-stage" id="ev-redact-stage">'
            + '<video id="ev-redact-video" playsinline></video>'
            + '<canvas id="ev-redact-canvas"></canvas>'
            + '</div>'
            + '<ul class="ev-redact-regions" id="ev-redact-region-list"></ul>'
            + '</div>'
            + '<div id="ev-redact-note-panel" hidden>'
            + '<h4 id="ev-redact-note-title"></h4>'
            + '<p class="hint" id="ev-redact-note-hint"></p>'
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
            + '<div class="ev-dock-dialog-actions">'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-redact-save-note"></button>'
            + '<button type="button" class="btn btn-action btn-sm" id="ev-redact-finalize"></button>'
            + '<button type="button" class="btn btn-ghost btn-sm" id="ev-redact-note-close">' + esc(tr('common.close')) + '</button>'
            + '</div></div></div>'
            + '</div>';
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) {
            if (e.target === dlg) closeRedactDialog();
        });
        return dlg;
    }

    const redactState = {
        fileId: null,
        exportId: null,
        regions: [],
        drawing: false,
        startX: 0,
        startY: 0,
        scale: 1,
    };

    function closeRedactDialog() {
        const dlg = document.getElementById('ev-redact-dialog');
        if (!dlg) return;
        dlg.hidden = true;
        const vid = document.getElementById('ev-redact-video');
        if (vid) {
            vid.pause();
            vid.removeAttribute('src');
            vid.load();
        }
        redactState.fileId = null;
        redactState.exportId = null;
        redactState.regions = [];
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

    function renderRedactRegionList() {
        const list = document.getElementById('ev-redact-region-list');
        if (!list) return;
        if (!redactState.regions.length) {
            list.innerHTML = '<li class="hint">' + esc(tr('evidenceHub.redactNoRegions')) + '</li>';
            return;
        }
        list.innerHTML = redactState.regions.map(function (r, i) {
            return '<li>' + esc(tr('evidenceHub.redactRegionLine', {
                n: i + 1,
                t0: r.t0.toFixed(1),
                t1: r.t1.toFixed(1),
                w: r.w,
                h: r.h,
            })) + '</li>';
        }).join('');
    }

    function fillRedactNoteLabels() {
        const set = function (id, key) {
            const el = document.getElementById(id);
            if (el) el.textContent = tr(key);
        };
        set('ev-redact-note-title', 'evidenceHub.redactNoteTitle');
        set('ev-redact-note-hint', 'evidenceHub.redactNoteHint');
        set('ev-redact-lbl-reason', 'evidenceHub.redactReason');
        set('ev-redact-lbl-visible', 'evidenceHub.redactVisible');
        set('ev-redact-lbl-incident', 'evidenceHub.redactIncident');
        set('ev-redact-save-note', 'evidenceHub.redactSaveNote');
        set('ev-redact-finalize', 'evidenceHub.redactFinalize');
        const reason = document.getElementById('ev-redact-reason');
        if (reason && reason.options.length >= 5) {
            reason.options[0].text = tr('evidenceHub.redactReasonFace');
            reason.options[1].text = tr('evidenceHub.redactReasonChild');
            reason.options[2].text = tr('evidenceHub.redactReasonBystander');
            reason.options[3].text = tr('evidenceHub.redactReasonPlate');
            reason.options[4].text = tr('evidenceHub.redactReasonOther');
        }
        const vis = document.getElementById('ev-redact-visible');
        if (vis) vis.placeholder = tr('evidenceHub.redactVisiblePh');
        const inc = document.getElementById('ev-redact-incident');
        if (inc) inc.placeholder = tr('evidenceHub.redactIncidentPh');
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
            redactState.regions.pop();
            redrawRedactRegions();
            renderRedactRegionList();
        };
        if (cancelBtn) cancelBtn.onclick = closeRedactDialog;

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
                if (!canvasEl || !vidEl || document.getElementById('ev-redact-dialog').hidden) return;
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
                redactState.regions.push({
                    x: Math.round(left),
                    y: Math.round(top),
                    w: Math.round(w),
                    h: Math.round(h),
                    t0: Math.max(0, t - 1),
                    t1: t + 1,
                });
                redrawRedactRegions();
                renderRedactRegionList();
            });
        }

        if (saveBtn) saveBtn.onclick = function () {
            if (!redactState.regions.length) {
                alert(tr('evidenceHub.redactNoRegions'));
                return;
            }
            saveBtn.disabled = true;
            saveBtn.textContent = tr('evidenceHub.redactSaving');
            fetch('/api/evidence/detail/' + encodeURIComponent(fileId) + '/redact', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regions: redactState.regions }),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) throwCatalogErr(res.data);
                    document.getElementById('ev-redact-mark-panel').hidden = true;
                    openRedactNoteDialog(res.data.export.exportId, fileId, null);
                    loadDetail(fileId, true);
                })
                .catch(function (err) {
                    alert(catalogMsg(err.opPayload || err.catalogPayload, err));
                })
                .finally(function () {
                    saveBtn.disabled = false;
                    saveBtn.textContent = tr('evidenceHub.redactSave');
                });
        };
    }

    function openRedactNoteDialog(exportId, fileId, meta) {
        ensureRedactDialog();
        fillRedactNoteLabels();
        redactState.exportId = exportId;
        redactState.fileId = fileId;
        const dlg = document.getElementById('ev-redact-dialog');
        const markPanel = document.getElementById('ev-redact-mark-panel');
        const notePanel = document.getElementById('ev-redact-note-panel');
        if (markPanel) markPanel.hidden = true;
        if (notePanel) notePanel.hidden = false;
        dlg.hidden = false;
        meta = meta || {};
        const reason = document.getElementById('ev-redact-reason');
        const vis = document.getElementById('ev-redact-visible');
        const inc = document.getElementById('ev-redact-incident');
        if (reason) reason.value = meta.redactionReason || 'face';
        if (vis) vis.value = meta.visibleDescription || '';
        if (inc) inc.value = meta.incidentNote || '';
        const fin = document.getElementById('ev-redact-finalize');
        if (fin) fin.hidden = !perms.superAdmin;

        const saveNote = document.getElementById('ev-redact-save-note');
        const closeBtn = document.getElementById('ev-redact-note-close');
        if (saveNote) saveNote.onclick = function () { saveRedactNote(exportId, fileId); };
        if (fin) fin.onclick = function () { finalizeRedactNote(exportId, fileId); };
        if (closeBtn) closeBtn.onclick = closeRedactDialog;
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
        if (fileId) loadDetail(fileId, true);
    }

    async function finalizeRedactNote(exportId, fileId) {
        try {
            await saveRedactNote(exportId, fileId);
        } catch (err) {
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
            return;
        }
        const res = await fetch('/api/evidence/redact/' + encodeURIComponent(exportId) + '/finalize', {
            method: 'POST',
            credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            alert(catalogMsg(data));
            return;
        }
        closeRedactDialog();
        if (fileId) loadDetail(fileId, true);
    }

    function openRedactWorkspace(fileId) {
        if (!perms.superAdmin) return;
        ensureRedactDialog();
        fillRedactNoteLabels();
        redactState.fileId = fileId;
        redactState.regions = [];
        const dlg = document.getElementById('ev-redact-dialog');
        const markPanel = document.getElementById('ev-redact-mark-panel');
        const notePanel = document.getElementById('ev-redact-note-panel');
        if (markPanel) markPanel.hidden = false;
        if (notePanel) notePanel.hidden = true;
        document.getElementById('ev-redact-title').textContent = tr('evidenceHub.redactTitle');
        document.getElementById('ev-redact-hint').textContent = tr('evidenceHub.redactHint');
        document.getElementById('ev-redact-pause').textContent = tr('evidenceHub.redactPause');
        document.getElementById('ev-redact-undo').textContent = tr('evidenceHub.redactUndo');
        document.getElementById('ev-redact-save').textContent = tr('evidenceHub.redactSave');
        const vid = document.getElementById('ev-redact-video');
        if (vid) {
            vid.src = '/api/evidence/preview/' + encodeURIComponent(fileId);
            vid.load();
        }
        renderRedactRegionList();
        bindRedactMarkHandlers(fileId);
        dlg.hidden = false;
    }

    function exportStatusLabel(status) {
        if (status === 'pending') return tr('evidenceHub.statusAwaiting');
        if (status === 'approved') return tr('evidenceHub.statusApproved');
        if (status === 'denied') return tr('evidenceHub.statusDenied');
        if (status === 'consumed') return tr('evidenceHub.statusDownloaded');
        return status || '—';
    }

    function renderApprovalCards(rows) {
        return rows.map(function (r) {
            return '<div class="ev-approval-card" data-request-id="' + esc(r.requestId) + '">'
                + '<strong>' + esc(r.requestId) + '</strong>'
                + '<p>' + tr('evidenceHub.requestedBy') + ': ' + esc(r.requestedBy || '—') + ' · ' + fmtTime(r.requestedAt) + '</p>'
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

    async function saveDetailMeta(fileId) {
        const notes = document.getElementById('ev-detail-notes');
        const sos = document.getElementById('ev-detail-sos');
        const body = {
            notes: notes ? notes.value : '',
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
        alert(tr('evidenceHub.saved'));
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

    function bindUi() {
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
