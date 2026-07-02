/**
 * Evidence hub — shared context rail (status + quick nav) per panel.
 */
(function (global) {
    var RAIL_BODIES = {
        settings: 'ev-storage-rail-body',
        catalog: 'ev-catalog-rail-body',
        approvals: 'ev-approvals-rail-body',
        'case-files': 'ev-case-files-rail-body',
    };

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return String(key || '').split('.').pop() || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function fmtBytes(n) {
        var b = parseInt(n, 10) || 0;
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
        return (b / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    function pathStatusHtml(ok) {
        if (ok === true) return '<span class="ev-path-ok">✓</span>';
        if (ok === false) return '<span class="ev-path-bad">✗</span>';
        return '—';
    }

    function catalogMsg(data, err) {
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data);
        if (data && data.errorKey) return tr(data.errorKey);
        if (data && data.error) return data.error;
        return tr('errors.generic');
    }

    function railRow(label, valueHtml) {
        return '<div class="ev-rail-row"><span class="ev-rail-label">' + esc(label)
            + '</span><span class="ev-rail-value">' + valueHtml + '</span></div>';
    }

    function bindRailNav(root) {
        if (!root) return;
        root.querySelectorAll('[data-ev-rail-panel]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var panel = btn.getAttribute('data-ev-rail-panel');
                if (!panel) return;
                var nav = document.querySelector('.evidence-hub-nav-btn[data-panel="' + panel + '"]');
                if (nav && !nav.hidden) nav.click();
            });
        });
    }

    function railNav(panels) {
        return '<div class="ev-rail-nav">'
            + panels.map(function (p) {
                return '<button type="button" class="ev-rail-nav-btn" data-ev-rail-panel="' + esc(p.id) + '">'
                    + esc(tr(p.labelKey)) + '</button>';
            }).join('')
            + '</div>';
    }

    function isSuperAdmin() {
        return !!(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer());
    }

    function overviewRows(bundle, opts) {
        opts = opts || {};
        var ov = bundle.ov || {};
        var catalog = ov.catalog || {};
        var stor = ov.storage || {};
        var val = stor.validation || {};
        var backups = stor.backups || {};
        var totals = ov.dockTotals || {};
        var fleet = ov.fleet || {};
        var archiveHealthy = catalog.available && !!catalog.engine && val.ftp !== false;
        var html = '';
        html += railRow(tr('evidenceHub.storageCatalog'), catalog.available
            ? esc(tr('evidenceHub.storageOk'))
            : '<span class="ev-path-bad">' + esc(tr('evidenceHub.indexUnavailableShort')) + '</span>');
        if (catalog.available && catalog.fileCount != null) {
            html += railRow(tr('evidenceHub.kpiFiles'), esc(String(catalog.fileCount)));
        }
        if (catalog.available && catalog.evidenceBytes != null) {
            html += railRow(tr('evidenceHub.storageEvidenceBytes'), esc(fmtBytes(catalog.evidenceBytes)));
        }
        html += railRow(tr('evidenceHub.kpiArchive'), archiveHealthy
            ? '<span class="ev-path-ok">' + esc(tr('evidenceHub.archiveOk')) + '</span>'
            : '<span class="ev-path-bad">' + esc(tr('evidenceHub.archiveWarn')) + '</span>');
        if (opts.ftpSvc != null) {
            html += railRow(tr('server.dock.status'), esc(String(opts.ftpSvc).trim() || '—'));
        }
        if (opts.showPaths) {
            html += railRow(tr('evidenceHub.storageFtpPath'), pathStatusHtml(val.ftp));
            if (val.networkArchive) {
                html += railRow(tr('evidenceHub.storageNasPath'), pathStatusHtml(val.nas));
            }
        }
        html += railRow(tr('evidenceHub.kpiDocks'), esc(String(totals.sites || 0))
            + ' · ' + esc(String(totals.sitesOnline || 0)) + '/' + esc(String(totals.sites || 0))
            + ' ' + esc(tr('evidenceHub.storageRailOnline')));
        html += railRow(tr('evidenceHub.kpiBwcOnline'), esc(String(fleet.online || 0)) + '/' + esc(String(fleet.registered || 0)));
        if (catalog.available && totals.baysOccupied != null) {
            html += railRow(tr('evidenceHub.kpiBaysOccupied'), esc(String(totals.baysOccupied || 0)));
        }
        if (opts.showBackups) {
            html += railRow(tr('evidenceHub.storageBackups'), esc(String(backups.count || 0))
                + (backups.latest ? ' · ' + esc(backups.latest) : ''));
        }
        if (bundle.pendingExports > 0) {
            html += railRow(tr('evidenceHub.kpiPendingExports'), '<span class="ev-path-bad">' + esc(String(bundle.pendingExports)) + '</span>');
        }
        return html;
    }

    function renderSettingsRail(el, bundle, opts) {
        var html = '<div class="ev-rail-rows">';
        html += overviewRows(bundle, {
            ftpSvc: opts && opts.ftpSvc != null ? opts.ftpSvc : '—',
            showPaths: true,
            showBackups: true,
        });
        html += '</div>';
        html += '<p class="ev-rail-hint">' + esc(tr('evidenceHub.storageRailHint')) + '</p>';
        el.innerHTML = html;
    }

    function renderCatalogRail(el, bundle) {
        var nav = [
            { id: 'overview', labelKey: 'evidenceHub.navOverview' },
            { id: 'docks', labelKey: 'evidenceHub.navDocks' },
        ];
        if (isSuperAdmin()) {
            nav.push({ id: 'settings', labelKey: 'evidenceHub.navSettings' });
        }
        var html = '<div class="ev-rail-rows">' + overviewRows(bundle, { showPaths: false, showBackups: false }) + '</div>';
        html += railNav(nav);
        html += '<p class="ev-rail-hint">' + esc(tr('evidenceHub.railHintCatalog')) + '</p>';
        el.innerHTML = html;
        bindRailNav(el);
    }

    function renderApprovalsRail(el, bundle) {
        var recent = bundle.recentQueue || [];
        var decided = recent.filter(function (r) { return r.status !== 'pending'; }).length;
        var html = '<div class="ev-rail-rows">';
        html += overviewRows(bundle, { showPaths: false, showBackups: false });
        html += railRow(tr('evidenceHub.approvalsRecentTitle'), esc(String(decided)));
        html += '</div>';
        html += railNav([
            { id: 'catalog', labelKey: 'evidenceHub.navCatalog' },
            { id: 'overview', labelKey: 'evidenceHub.navOverview' },
        ]);
        html += '<p class="ev-rail-hint">' + esc(tr('evidenceHub.railHintApprovals')) + '</p>';
        el.innerHTML = html;
        bindRailNav(el);
    }

    function renderCaseFilesRail(el, bundle) {
        var html = '<div class="ev-rail-rows">' + overviewRows(bundle, { showPaths: false, showBackups: false }) + '</div>';
        html += railNav([
            { id: 'catalog', labelKey: 'evidenceHub.navCatalog' },
            { id: 'overview', labelKey: 'evidenceHub.navOverview' },
        ]);
        html += '<p class="ev-rail-hint">' + esc(tr('evidenceHub.railHintCaseFiles')) + '</p>';
        el.innerHTML = html;
        bindRailNav(el);
    }

    var RENDERERS = {
        settings: renderSettingsRail,
        catalog: renderCatalogRail,
        approvals: renderApprovalsRail,
        'case-files': renderCaseFilesRail,
    };

    async function fetchBundle() {
        var isSuper = isSuperAdmin();
        var fetches = [
            fetch('/api/evidence/overview', { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
        ];
        if (isSuper) {
            fetches.push(fetch('/api/evidence/secure-export/queue?status=pending&limit=200', { credentials: 'same-origin' }).then(function (r) { return r.json(); }));
            fetches.push(fetch('/api/evidence/secure-export/queue?limit=20', { credentials: 'same-origin' }).then(function (r) { return r.json(); }));
        }
        var results = await Promise.all(fetches);
        var ov = results[0];
        if (!ov || !ov.ok) {
            var err = new Error(catalogMsg(ov));
            if (global.OperatorErrorVoice) throw OperatorErrorVoice.attach(err, ov);
            throw err;
        }
        var pendingExports = 0;
        var recentQueue = [];
        if (isSuper && results[1] && results[1].ok) {
            pendingExports = (results[1].requests || []).length;
        }
        if (isSuper && results[2] && results[2].ok) {
            recentQueue = results[2].requests || [];
        }
        return { ov: ov, pendingExports: pendingExports, recentQueue: recentQueue };
    }

    async function refresh(panel, opts) {
        opts = opts || {};
        var bodyId = RAIL_BODIES[panel];
        if (!bodyId) return;
        var el = document.getElementById(bodyId);
        if (!el) return;
        var render = RENDERERS[panel];
        if (!render) return;
        el.innerHTML = '<p class="hint">' + esc(tr('evidenceHub.loading')) + '</p>';
        try {
            var bundle = opts.bundle || await fetchBundle();
            render(el, bundle, opts);
        } catch (err) {
            el.innerHTML = '<p class="hint ev-path-bad">' + esc(catalogMsg(err && err.opPayload, err)) + '</p>';
        }
    }

    global.EvContextRail = {
        refresh: refresh,
        fetchBundle: fetchBundle,
        bindRailNav: bindRailNav,
    };
}(window));
