/**
 * Audit Trail hub — compliance activity log (human-readable, filter, CSV export).
 * Isolated from Operations / SOS / live video.
 */
(function (global) {
    const PAGE_SIZE = 50;

    const perms = { view: false, export: false };
    let meta = null;
    let filters = {
        since: '',
        until: '',
        category: '',
        action: '',
        actor: '',
        q: '',
        preset: '',
    };
    let offset = 0;
    let total = 0;
    let storeTotal = 0;
    let loading = false;
    let selectedEntry = null;

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

    function el(id) {
        return document.getElementById(id);
    }

    function isoDateDaysAgo(days) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - Math.max(0, parseInt(days, 10) || 0));
        return d.toISOString().slice(0, 10);
    }

    function applyPermissions(p) {
        p = p || {};
        perms.view = !!(p.auditView || p.auditExport);
        perms.export = !!p.auditExport;
        const nav = el('nav-tab-audit-trail');
        if (nav) nav.hidden = !perms.view;
        const banner = el('at-perm-banner');
        if (banner) banner.hidden = perms.view;
        const exportBtn = el('at-export-btn');
        if (exportBtn) exportBtn.hidden = !perms.export;
        const auditServerBtn = el('server-open-audit-trail');
        const auditRow = el('server-audit-row');
        if (auditServerBtn) auditServerBtn.hidden = !perms.view;
        if (auditRow) auditRow.hidden = !perms.view;
        if (el('app-view-audit-trail') && !el('app-view-audit-trail').hidden) {
            onShow();
        }
    }

    function fmtTime(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString();
        } catch (_) {
            return iso;
        }
    }

    function queryString(extra) {
        const p = new URLSearchParams();
        if (filters.since) p.set('since', filters.since);
        if (filters.until) p.set('until', filters.until);
        if (filters.preset) {
            p.set('preset', filters.preset);
        } else {
            if (filters.category) p.set('category', filters.category);
            if (filters.action) p.set('action', filters.action);
        }
        if (filters.actor) p.set('actor', filters.actor);
        if (filters.q) p.set('q', filters.q);
        if (extra) {
            Object.keys(extra).forEach(function (k) {
                if (extra[k] != null && extra[k] !== '') p.set(k, String(extra[k]));
            });
        }
        const s = p.toString();
        return s ? ('?' + s) : '';
    }

    async function loadMeta() {
        const res = await fetch('/api/audit-trail/meta', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Could not load audit metadata');
        meta = data.meta;
        storeTotal = meta.storeTotal || 0;
        populateActionFilter();
    }

    function populateActionFilter() {
        const sel = el('at-filter-action');
        if (!sel || !meta || !meta.actions) return;
        const cur = filters.action;
        sel.innerHTML = '<option value="">' + esc(tr('auditTrail.filterAllActions')) + '</option>'
            + meta.actions.map(function (a) {
                return '<option value="' + esc(a.action) + '"' + (a.action === cur ? ' selected' : '') + '>'
                    + esc(a.label) + '</option>';
            }).join('');
    }

    function populateCategoryFilter() {
        const sel = el('at-filter-category');
        if (!sel) return;
        const cur = filters.category;
        const cats = (meta && meta.categories) || [];
        sel.innerHTML = '<option value="">' + esc(tr('auditTrail.filterAllCategories')) + '</option>'
            + cats.map(function (c) {
                return '<option value="' + esc(c.id) + '"' + (c.id === cur ? ' selected' : '') + '>'
                    + esc(c.label) + '</option>';
            }).join('');
    }

    function populateReportTypeSelect() {
        const sel = el('at-report-type');
        if (!sel) return;
        const cur = filters.preset || '';
        sel.innerHTML = '<option value="">' + esc(tr('auditTrail.navAllEvents')) + '</option>'
            + '<option value="kill_switch"' + (cur === 'kill_switch' ? ' selected' : '') + '>'
            + esc(tr('auditTrail.presetKillSwitch')) + '</option>'
            + '<option value="geofence"' + (cur === 'geofence' ? ' selected' : '') + '>'
            + esc(tr('auditTrail.presetGeofence')) + '</option>';
    }

    function readFiltersFromUi() {
        filters.since = (el('at-filter-since') && el('at-filter-since').value) || '';
        filters.until = (el('at-filter-until') && el('at-filter-until').value) || '';
        filters.category = (el('at-filter-category') && el('at-filter-category').value) || '';
        filters.action = (el('at-filter-action') && el('at-filter-action').value) || '';
        filters.actor = (el('at-filter-actor') && el('at-filter-actor').value.trim()) || '';
        filters.q = (el('at-filter-q') && el('at-filter-q').value.trim()) || '';
        if (filters.category || filters.action) {
            filters.preset = '';
        } else {
            filters.preset = (el('at-report-type') && el('at-report-type').value) || '';
        }
        const reportSel = el('at-report-type');
        if (reportSel) reportSel.value = filters.preset || '';
    }

    function syncFiltersToUi() {
        if (el('at-filter-since')) el('at-filter-since').value = filters.since;
        if (el('at-filter-until')) el('at-filter-until').value = filters.until;
        if (el('at-filter-category')) el('at-filter-category').value = filters.category;
        if (el('at-filter-action')) el('at-filter-action').value = filters.action;
        if (el('at-filter-actor')) el('at-filter-actor').value = filters.actor;
        if (el('at-filter-q')) el('at-filter-q').value = filters.q;
        populateReportTypeSelect();
        updatePresetUi();
    }

    function updateViewModeUi() {
        const preset = filters.preset || '';
        const title = el('at-page-title');
        const intro = el('at-page-intro');
        const banner = el('at-preset-banner');
        var titleKey = 'auditTrail.title';
        var introKey = 'auditTrail.intro';
        if (preset === 'kill_switch') {
            titleKey = 'auditTrail.titleKillSwitch';
            introKey = 'auditTrail.introKillSwitch';
        } else if (preset === 'geofence') {
            titleKey = 'auditTrail.titleGeofenceReport';
            introKey = 'auditTrail.introGeofenceReport';
        }
        if (title) title.textContent = tr(titleKey);
        if (intro) intro.textContent = tr(introKey);
        if (banner) {
            if (preset === 'kill_switch') {
                banner.hidden = false;
                banner.textContent = tr('auditTrail.presetBannerKillSwitch');
            } else if (preset === 'geofence') {
                banner.hidden = false;
                banner.textContent = tr('auditTrail.presetBannerGeofence');
            } else {
                banner.hidden = true;
                banner.textContent = '';
            }
        }
        document.querySelectorAll('.at-filter-advanced').forEach(function (node) {
            node.hidden = preset === 'kill_switch' || preset === 'geofence';
        });
    }

    function updatePresetUi() {
        updateViewModeUi();
    }

    function onReportTypeChange() {
        const sel = el('at-report-type');
        const next = (sel && sel.value) || '';
        if (next === 'kill_switch') {
            applyKillSwitchPreset();
        } else if (next === 'geofence') {
            applyGeofencePreset();
        } else {
            applyFullAuditPreset();
        }
    }

    function applyKillSwitchPreset() {
        const presetMeta = (meta && meta.presets || []).find(function (p) { return p.id === 'kill_switch'; });
        const days = (presetMeta && presetMeta.defaultDays) || 30;
        filters = {
            since: isoDateDaysAgo(days),
            until: '',
            category: '',
            action: '',
            actor: '',
            q: '',
            preset: 'kill_switch',
        };
        syncFiltersToUi();
        loadPage(true);
    }

    function applyGeofencePreset() {
        const presetMeta = (meta && meta.presets || []).find(function (p) { return p.id === 'geofence'; });
        const days = (presetMeta && presetMeta.defaultDays) || 30;
        filters = {
            since: isoDateDaysAgo(days),
            until: '',
            category: '',
            action: '',
            actor: '',
            q: '',
            preset: 'geofence',
        };
        syncFiltersToUi();
        loadPage(true);
    }

    function applyFullAuditPreset() {
        filters = { since: '', until: '', category: '', action: '', actor: '', q: '', preset: '' };
        syncFiltersToUi();
        loadPage(true);
    }

    async function loadPage(resetOffset, opts) {
        opts = opts || {};
        if (!perms.view || loading) return;
        if (resetOffset) offset = 0;
        const skipSpinner = !!opts.skipSpinner;
        loading = true;
        const tbody = el('at-table-body');
        if (tbody && !skipSpinner) tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(tr('auditTrail.loading')) + '</td></tr>';
        try {
            const qs = queryString({ limit: PAGE_SIZE, offset: offset });
            const res = await fetch('/api/audit-trail' + qs, { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Load failed');
            const trail = data.trail || {};
            total = trail.total || 0;
            storeTotal = trail.storeTotal != null ? trail.storeTotal : storeTotal;
            renderSummary(trail);
            renderTable(trail.entries || []);
            renderPager();
            updatePresetUi();
            if (global.TabLifecycle) TabLifecycle.markLoaded('audit-trail');
        } catch (err) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="hint at-err">' + esc(err.message || 'Error') + '</td></tr>';
            }
        } finally {
            loading = false;
        }
    }

    function renderSummary(trail) {
        const sum = el('at-summary');
        if (!sum) return;
        const from = offset + 1;
        const to = offset + (trail.entries ? trail.entries.length : 0);
        const params = {
            from: total ? from : 0,
            to: to,
            total: total,
            store: storeTotal,
        };
        var text;
        if (filters.preset === 'kill_switch') {
            text = tr('auditTrail.summaryKillSwitch', params);
        } else if (filters.preset === 'geofence') {
            text = tr('auditTrail.summaryGeofence', params);
        } else {
            text = tr('auditTrail.summary', params);
        }
        sum.textContent = text;
    }

    function renderTable(entries) {
        const tbody = el('at-table-body');
        if (!tbody) return;
        if (!entries.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(tr('auditTrail.empty')) + '</td></tr>';
            return;
        }
        tbody.innerHTML = entries.map(function (e) {
            return '<tr class="at-row" data-id="' + esc(e.id) + '" tabindex="0">'
                + '<td class="at-col-time mono">' + esc(fmtTime(e.ts)) + '</td>'
                + '<td>' + esc(e.actor || '—') + '</td>'
                + '<td class="at-col-role">' + esc(e.role || '—') + '</td>'
                + '<td><span class="at-cat-pill">' + esc(e.categoryLabel) + '</span></td>'
                + '<td>' + esc(e.actionLabel) + '</td>'
                + '<td>' + esc(e.targetLabel || e.target || '—') + '</td>'
                + '<td class="at-col-ip mono">' + esc(e.clientIp || '—') + '</td>'
                + '</tr>';
        }).join('');
        tbody.querySelectorAll('.at-row').forEach(function (row) {
            row.addEventListener('click', function () {
                const id = parseInt(row.getAttribute('data-id'), 10);
                const entry = entries.find(function (x) { return x.id === id; });
                if (entry) showDetail(entry);
            });
        });
    }

    function renderPager() {
        const prev = el('at-page-prev');
        const next = el('at-page-next');
        const label = el('at-page-label');
        const page = Math.floor(offset / PAGE_SIZE) + 1;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (label) label.textContent = tr('auditTrail.pageOf', { page: page, pages: pages });
        if (prev) prev.disabled = offset <= 0;
        if (next) next.disabled = offset + PAGE_SIZE >= total;
    }

    function showDetail(entry) {
        selectedEntry = entry;
        const panel = el('at-detail-panel');
        const body = el('at-detail-body');
        if (!panel || !body) return;
        panel.hidden = false;
        const detailJson = entry.detail
            ? '<pre class="at-detail-pre">' + esc(JSON.stringify(entry.detail, null, 2)) + '</pre>'
            : '<p class="hint">' + esc(tr('auditTrail.noDetail')) + '</p>';
        body.innerHTML = ''
            + '<dl class="at-detail-dl">'
            + '<dt>' + esc(tr('auditTrail.colTime')) + '</dt><dd>' + esc(fmtTime(entry.ts)) + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colUser')) + '</dt><dd>' + esc(entry.actor || '—') + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colRole')) + '</dt><dd>' + esc(entry.role || '—') + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colCategory')) + '</dt><dd>' + esc(entry.categoryLabel) + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colAction')) + '</dt><dd>' + esc(entry.actionLabel) + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colTarget')) + '</dt><dd>' + esc(entry.targetLabel || entry.target || '—') + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colIp')) + '</dt><dd class="mono">' + esc(entry.clientIp || '—') + '</dd>'
            + '<dt>' + esc(tr('auditTrail.colSummary')) + '</dt><dd>' + esc(entry.detailSummary || '—') + '</dd>'
            + '</dl>'
            + '<h4>' + esc(tr('auditTrail.detailRaw')) + '</h4>'
            + detailJson;
    }

    function hideDetail() {
        selectedEntry = null;
        const panel = el('at-detail-panel');
        if (panel) panel.hidden = true;
    }

    function exportCsv() {
        if (!perms.export) {
            alert(tr('auditTrail.exportDenied'));
            return;
        }
        window.location.href = '/api/audit-trail/export.csv' + queryString({ limit: 10000 });
    }

    function clearFilters() {
        filters = { since: '', until: '', category: '', action: '', actor: '', q: '', preset: '' };
        syncFiltersToUi();
        loadPage(true);
    }

    async function onShowForMode(mode, opts) {
        opts = opts || {};
        if (!perms.view) return;
        if (!opts.force && global.TabLifecycle && !TabLifecycle.shouldLoad('audit-trail')) return;
        hideDetail();
        try {
            if (!meta) await loadMeta();
            populateCategoryFilter();
            populateActionFilter();
            if (mode === 'kill_switch') applyKillSwitchPreset();
            else if (mode === 'geofence') applyGeofencePreset();
            else applyFullAuditPreset();
        } catch (err) {
            const tbody = el('at-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="hint at-err">' + esc(err.message) + '</td></tr>';
            }
        }
    }

    async function onShow(opts) {
        opts = opts || {};
        if (!perms.view) return;
        if (!opts.force && global.TabLifecycle && !TabLifecycle.shouldLoad('audit-trail')) return;
        hideDetail();
        try {
            if (!meta) await loadMeta();
            populateCategoryFilter();
            populateActionFilter();
            syncFiltersToUi();
            await loadPage(false, { skipSpinner: !opts.force });
        } catch (err) {
            const tbody = el('at-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="hint at-err">' + esc(err.message) + '</td></tr>';
            }
        }
    }

    function openKillSwitchReport() {
        if (!perms.view) return;
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('audit-trail', { auditMode: 'kill_switch' });
            return;
        }
        if (!meta) {
            loadMeta().then(function () {
                applyKillSwitchPreset();
            }).catch(function () {
                applyKillSwitchPreset();
            });
            return;
        }
        applyKillSwitchPreset();
    }

    function openGeofenceReport() {
        if (!perms.view) return;
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('audit-trail', { auditMode: 'geofence' });
            return;
        }
        if (!meta) {
            loadMeta().then(function () {
                applyGeofencePreset();
            }).catch(function () {
                applyGeofencePreset();
            });
            return;
        }
        applyGeofencePreset();
    }

    function openFullAuditTrail() {
        if (!perms.view) return;
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('audit-trail', { auditMode: 'all' });
            return;
        }
        applyFullAuditPreset();
    }

    function bindUi() {
        const applyBtn = el('at-apply-filters');
        const clearBtn = el('at-clear-filters');
        const refreshBtn = el('at-refresh-btn');
        const exportBtn = el('at-export-btn');
        const prevBtn = el('at-page-prev');
        const nextBtn = el('at-page-next');
        const closeDetail = el('at-detail-close');
        const reportTypeSel = el('at-report-type');

        if (applyBtn) applyBtn.addEventListener('click', function () {
            readFiltersFromUi();
            loadPage(true);
        });
        if (clearBtn) clearBtn.addEventListener('click', clearFilters);
        if (refreshBtn) refreshBtn.addEventListener('click', function () { loadPage(false); });
        if (exportBtn) exportBtn.addEventListener('click', exportCsv);
        if (reportTypeSel) reportTypeSel.addEventListener('change', onReportTypeChange);
        if (prevBtn) prevBtn.addEventListener('click', function () {
            offset = Math.max(0, offset - PAGE_SIZE);
            loadPage(false);
        });
        if (nextBtn) nextBtn.addEventListener('click', function () {
            if (offset + PAGE_SIZE < total) {
                offset += PAGE_SIZE;
                loadPage(false);
            }
        });
        if (closeDetail) closeDetail.addEventListener('click', hideDetail);

        ['at-filter-since', 'at-filter-until', 'at-filter-category', 'at-filter-action'].forEach(function (id) {
            const node = el(id);
            if (node) {
                node.addEventListener('change', function () {
                    readFiltersFromUi();
                    loadPage(true);
                });
            }
        });
        const qInput = el('at-filter-q');
        if (qInput) {
            let t = null;
            qInput.addEventListener('input', function () {
                clearTimeout(t);
                t = setTimeout(function () {
                    readFiltersFromUi();
                    loadPage(true);
                }, 400);
            });
        }
        const actorInput = el('at-filter-actor');
        if (actorInput) {
            actorInput.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') {
                    readFiltersFromUi();
                    loadPage(true);
                }
            });
        }

        document.addEventListener('fm-i18n-changed', function () {
            if (el('app-view-audit-trail') && !el('app-view-audit-trail').hidden) {
                populateCategoryFilter();
                populateActionFilter();
                populateReportTypeSelect();
                updateViewModeUi();
                const tbody = el('at-table-body');
                const rowCount = tbody ? tbody.querySelectorAll('.at-row').length : 0;
                renderSummary({ entries: new Array(rowCount) });
                if (selectedEntry) showDetail(selectedEntry);
                renderPager();
            }
        });
    }

    global.AuditTrailHub = {
        applyPermissions: applyPermissions,
        onShow: onShow,
        onShowForMode: onShowForMode,
        bindUi: bindUi,
        openKillSwitchReport: openKillSwitchReport,
        openGeofenceReport: openGeofenceReport,
        openFullAuditTrail: openFullAuditTrail,
        applyKillSwitchPreset: applyKillSwitchPreset,
        applyGeofencePreset: applyGeofencePreset,
        applyFullAuditPreset: applyFullAuditPreset,
    };
})(window);
