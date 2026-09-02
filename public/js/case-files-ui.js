/**
 * Case Files \u2014 field report workspace + linked evidence (phase 1).
 */
(function (global) {
    var perms = { view: false, edit: false, export: false, superAdmin: false };
    var currentId = null;
    var listCache = [];
    var pendingLinkEvidenceId = null;
    var pendingLinkEvidenceIds = [];
    var deleteModalResolver = null;
    var deleteModalBound = false;
    var sosModalBound = false;
    var detailNarrativeOriginal = '';
    var libraryReturnCaseId = null;
    var analysisReturnFileId = null;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return String(key || '').split('.').pop() || key;
    }

    function msg(data, err, fallbackKey) {
        if (global.OperatorUI) return OperatorUI.opMsg(data, err, fallbackKey);
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data, fallbackKey);
        return tr(fallbackKey || 'errors.generic');
    }

    function throwOp(data) {
        throw global.OperatorErrorVoice
            ? OperatorErrorVoice.attach(new Error('op'), data)
            : new Error(msg(data));
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function fmtTime(iso) {
        return (typeof fmtDateTime === 'function') ? fmtDateTime(iso) : String(iso || '\u2014');
    }

    function panelRoot() {
        return document.getElementById('ev-panel-case-files');
    }

    const CF_FEW_ROWS_MAX = 12;

    /** CASE-FILES-EMPTY-COMPACT-V2 \u2014 hide table shell when list has no rows. */
    function setCaseListEmptyState(isEmpty) {
        const panel = panelRoot();
        const tableWrap = document.getElementById('cf-table-wrap');
        const listWrap = document.getElementById('cf-list-wrap');
        const emptyState = document.getElementById('cf-empty-state');
        const evPanel = document.getElementById('evidence-panel');
        [panel, tableWrap, listWrap].forEach(function (el) {
            if (!el) return;
            if (isEmpty) el.classList.add('cf-list-empty');
            else el.classList.remove('cf-list-empty');
        });
        if (emptyState) emptyState.hidden = !isEmpty;
        if (isEmpty) setCaseListFewRows(0);
        if (evPanel) {
            const onCaseFiles = panel && !panel.hidden && !currentId;
            evPanel.classList.toggle('ev-case-files-empty', !!(onCaseFiles && isEmpty));
        }
    }

    /** CASE-FILES-LIST-SCROLL-WHEN-FULL-V1 \u2014 compact when few rows; scroll only when many. */
    function setCaseListFewRows(count) {
        const panel = panelRoot();
        const tableWrap = document.getElementById('cf-table-wrap');
        const listWrap = document.getElementById('cf-list-wrap');
        const evPanel = document.getElementById('evidence-panel');
        const n = parseInt(count, 10) || 0;
        const few = n > 0 && n <= CF_FEW_ROWS_MAX;
        [panel, tableWrap, listWrap].forEach(function (el) {
            if (!el) return;
            if (few) el.classList.add('cf-few-rows');
            else el.classList.remove('cf-few-rows');
        });
        if (evPanel) {
            const onCaseFiles = panel && !panel.hidden && !currentId;
            evPanel.classList.toggle('ev-case-files-few-rows', !!(onCaseFiles && few));
        }
    }

    function setCaseDetailActiveState(inDetail) {
        const panel = panelRoot();
        const evPanel = document.getElementById('evidence-panel');
        if (panel) panel.classList.toggle('cf-detail-active', !!inDetail);
        if (evPanel) {
            const onCaseFiles = panel && !panel.hidden;
            evPanel.classList.toggle('ev-case-files-detail', !!(onCaseFiles && inDetail));
            if (inDetail) evPanel.classList.remove('ev-case-files-few-rows');
        }
    }

    function updateViewChrome() {
        const inDetail = !!currentId;
        const hintBlock = document.getElementById('cf-hint-block');
        const listToolbar = document.getElementById('cf-list-toolbar');
        if (hintBlock) hintBlock.hidden = inDetail;
        if (listToolbar) listToolbar.hidden = inDetail;
        setCaseDetailActiveState(inDetail);
    }

    function showList() {
        currentId = null;
        var list = document.getElementById('cf-list-wrap');
        var detail = document.getElementById('cf-detail-wrap');
        if (list) list.hidden = false;
        if (detail) detail.hidden = true;
        updateViewChrome();
    }

    function showDetail(id) {
        currentId = id;
        var list = document.getElementById('cf-list-wrap');
        var detail = document.getElementById('cf-detail-wrap');
        if (list) list.hidden = true;
        if (detail) detail.hidden = false;
        updateViewChrome();
        loadDetail(id);
    }

    async function fetchSosEntries() {
        try {
            const res = await fetch('/api/evidence/sos-incidents?days=365&limit=200', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) return [];
            return (data.incidents && data.incidents.entries) ? data.incidents.entries : [];
        } catch (_) {
            return [];
        }
    }

    function sosOptionsHtml(entries, selected) {
        let html = '<option value="">' + esc(tr('caseFiles.noSosLink')) + '</option>';
        (entries || []).forEach(function (e) {
            const id = e.id || e.incidentId;
            if (!id) return;
            const label = (e.operatorName || e.cameraId || '\u2014') + ' \u00B7 ' + (e.at ? fmtSosTime(e.at) : id);
            html += '<option value="' + esc(id) + '"' + (selected === id ? ' selected' : '') + '>' + esc(label) + '</option>';
        });
        return html;
    }

    function openedFromLabel(opsCaseId, sosIncidentId) {
        const k = String(opsCaseId || '');
        if (/^SO:/i.test(k) || sosIncidentId) return tr('caseFiles.openedFromSos');
        if (/^WD:/i.test(k)) return tr('caseFiles.openedFromWeapon');
        if (/^FR:/i.test(k)) return tr('caseFiles.openedFromFace');
        if (/^AN:/i.test(k)) return tr('caseFiles.openedFromPlate');
        return '';
    }

    function looksMashedNarrative(s) {
        const t = String(s || '');
        if (!t) return false;
        return t.length > 160 && t.indexOf('\n') < 0;
    }

    function fmtSosTime(iso) {
        if (!iso) return '';
        return (typeof fmtDateTime === 'function') ? fmtDateTime(iso) : String(iso).slice(0, 16).replace('T', ' ');
    }

    function factRow(label, valueHtml) {
        if (!valueHtml) return '';
        return '<li><span class="k">' + esc(label) + '</span><span class="v">' + valueHtml + '</span></li>';
    }

    function renderSosFacts(hit) {
        if (!hit) return '';
        const alarm = hit.alarmKind === 'fall' ? tr('caseFiles.sosFall') : tr('caseFiles.sosAlarm');
        const status = hit.acknowledged ? tr('caseFiles.sosAcked') : tr('caseFiles.statusOpen');
        let locHtml = '';
        if (hit.lat != null && hit.lon != null && hit.lat !== '' && hit.lon !== '') {
            const q = encodeURIComponent(String(hit.lat) + ',' + String(hit.lon));
            locHtml = esc(String(hit.lat) + ', ' + String(hit.lon))
                + ' <a href="https://maps.google.com/?q=' + q + '" target="_blank" rel="noopener">'
                + esc(tr('caseFiles.openMap')) + '</a>';
        }
        function openHref(url) {
            if (!url) return '';
            return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(tr('caseFiles.openLink')) + '</a>';
        }
        const rows = [
            factRow(tr('caseFiles.sosFactAlarm'), esc(alarm)),
            factRow(tr('caseFiles.sosFactStatus'), esc(status)),
            factRow(tr('caseFiles.sosFactOfficer'), hit.operatorName ? esc(hit.operatorName) : ''),
            factRow(tr('caseFiles.sosFactBwc'), (hit.cameraId || hit.deviceId) ? esc(hit.cameraId || hit.deviceId) : ''),
            factRow(tr('caseFiles.sosFactTime'), esc(fmtSosTime(hit.alarmTime || hit.at))),
            factRow(tr('caseFiles.sosFactLocation'), locHtml),
            factRow(tr('caseFiles.sosFactAck'), hit.note ? esc(String(hit.note)) : ''),
            factRow(tr('caseFiles.sosFactSnapshot'), openHref(hit.snapshot)),
            factRow(tr('caseFiles.sosFactHqRec'), openHref(hit.serverRecordingPreviewUrl)),
            factRow(tr('caseFiles.sosFactDockRec'), openHref(hit.deviceRecordingPreviewUrl)),
            factRow(tr('caseFiles.sosOwningSa', 'Owning SA'), hit.owningDisplayName || hit.owningUsername
                ? esc(hit.owningDisplayName || hit.owningUsername) : ''),
            factRow(tr('caseFiles.sosCompileReady', 'Compile Ready'), hit.compileReadyAt
                ? esc(fmtSosTime(hit.compileReadyAt)) : ''),
        ].filter(Boolean).join('');
        if (!rows) return '';
        return '<ul class="cf-sos-facts">' + rows + '</ul>';
    }

    function renderHandoffPanel(cf, sosHandoff) {
        if (!cf || !cf.sosIncidentId || !perms.edit) return '';
        const h = sosHandoff || {};
        const owner = h.owningDisplayName || h.owningUsername || '';
        const ready = h.compileReadyAt
            ? ('<p class="hint">' + esc(tr('caseFiles.handoffCompileMarked', 'Marked compile-ready'))
                + (h.compileReadyBy ? (' · ' + esc(h.compileReadyBy)) : '') + '</p>')
            : '';
        const markBtn = h.canMarkCompileReady && !h.compileReadyAt
            ? ('<button type="button" class="btn btn-ghost btn-sm" id="cf-compile-ready">'
                + esc(tr('caseFiles.markCompileReady', 'Mark Compile Ready')) + '</button>')
            : '';
        return '<div class="cf-handoff-panel" data-sos="' + esc(cf.sosIncidentId) + '">'
            + '<h4>' + esc(tr('caseFiles.teamHandoff', 'Team Handoff')) + '</h4>'
            + (owner
                ? ('<p class="hint">' + esc(tr('caseFiles.handoffOwner', 'Owning SA')) + ': ' + esc(owner) + '</p>')
                : '')
            + ready
            + '<label class="cf-form-field cf-form-field-full"><span class="cf-form-label">'
            + esc(tr('caseFiles.handoffNote', 'Handoff Note')) + '</span>'
            + '<textarea id="cf-handoff-note" rows="3" maxlength="8000"></textarea></label>'
            + '<div class="cf-link-bar">'
            + '<button type="button" class="btn btn-action btn-sm" id="cf-handoff-submit">'
            + esc(tr('caseFiles.handoffSubmit', 'Submit Team Handoff')) + '</button>'
            + markBtn
            + '<span id="cf-handoff-msg" class="hint"></span>'
            + '</div></div>';
    }

    async function reconstructScene(opts) {
        opts = opts || {};
        var atIso = opts.atIso || '';
        var sosId = opts.sosIncidentId || '';
        if (sosId) {
            try {
                const res = await fetch('/api/evidence/sos-incidents?days=365&limit=200', { credentials: 'same-origin' });
                const data = await res.json();
                const entries = (data && data.incidents && data.incidents.entries) ? data.incidents.entries : [];
                const hit = entries.find(function (e) {
                    return (e.id || e.incidentId) === sosId;
                });
                if (hit && hit.at) atIso = hit.at;
            } catch (_) { /* keep fallback atIso */ }
        }
        if (global.RouteTrace && RouteTrace.launchFromIncident) {
            RouteTrace.launchFromIncident({
                deviceId: opts.deviceId || '',
                atIso: atIso,
                caseFileId: opts.caseFileId || '',
            });
        }
    }

    function listColspan() {
        return 7;
    }

    function renderListActions(cf) {
        const open = '<button type="button" class="cf-list-action-link cf-open" data-case-id="' + esc(cf.id) + '">'
            + esc(tr('evidenceHub.open')) + '</button>';
        if (!perms.superAdmin) return open;
        const del = '<button type="button" class="cf-list-action-link cf-list-action-danger cf-delete" data-case-id="'
            + esc(cf.id) + '" data-case-title="' + esc(cf.title) + '" data-evidence-count="'
            + esc(String(cf.evidenceCount || 0)) + '">' + esc(tr('caseFiles.deleteCase')) + '</button>';
        return open + '<span class="cf-list-action-sep" aria-hidden="true">\u00B7</span>' + del;
    }

    function buildListUrl() {
        const qs = new URLSearchParams();
        qs.set('limit', '200');
        const search = document.getElementById('cf-search');
        const period = document.getElementById('cf-period');
        const status = document.getElementById('cf-status-filter');
        if (search && search.value.trim()) qs.set('q', search.value.trim());
        if (period && period.value && period.value !== 'all') qs.set('period', period.value);
        if (status && status.value && status.value !== 'all') qs.set('status', status.value);
        return '/api/case-files?' + qs.toString();
    }

    async function loadList() {
        const tbody = document.getElementById('cf-tbody');
        const meta = document.getElementById('cf-list-meta');
        if (!tbody) return;
        const emptyTitle = document.querySelector('#cf-empty-state .cf-empty-title');
        if (!perms.view) {
            if (emptyTitle) emptyTitle.textContent = tr('caseFiles.noCases');
            tbody.innerHTML = '<tr class="cf-empty-row"><td colspan="' + listColspan() + '" class="hint cf-empty-cell">\u2014</td></tr>';
            setCaseListEmptyState(true);
            return;
        }
        if (emptyTitle) emptyTitle.textContent = tr('evidenceHub.loading');
        setCaseListEmptyState(true);
        tbody.innerHTML = '<tr><td colspan="' + listColspan() + '" class="hint">' + tr('evidenceHub.loading') + '</td></tr>';
        try {
            const res = await fetch(buildListUrl(), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOp(data);
            listCache = data.caseFiles || [];
            if (meta) meta.textContent = listCache.length ? (listCache.length + ' ' + tr('caseFiles.listCount')) : '';
            if (!listCache.length) {
                if (emptyTitle) emptyTitle.textContent = tr('caseFiles.noCases');
                tbody.innerHTML = '<tr class="cf-empty-row"><td colspan="' + listColspan() + '" class="hint cf-empty-cell">'
                    + esc(tr('caseFiles.noCases')) + '</td></tr>';
                setCaseListEmptyState(true);
                return;
            }
            if (emptyTitle) emptyTitle.textContent = tr('caseFiles.noCases');
            setCaseListEmptyState(false);
            setCaseListFewRows(listCache.length);
            tbody.innerHTML = listCache.map(function (cf) {
                const st = cf.status === 'closed' ? tr('caseFiles.statusClosed') : tr('caseFiles.statusOpen');
                return '<tr data-case-id="' + esc(cf.id) + '">'
                    + '<td><code class="cf-list-id">' + esc(cf.id) + '</code></td>'
                    + '<td><span class="cf-list-title" title="' + esc(cf.title) + '">' + esc(cf.title) + '</span></td>'
                    + '<td>' + esc(cf.officerName || '\u2014') + '</td>'
                    + '<td>' + esc(st) + '</td>'
                    + '<td>' + esc(String(cf.evidenceCount != null ? cf.evidenceCount : 0)) + '</td>'
                    + '<td>' + esc(fmtTime(cf.updatedAt)) + '</td>'
                    + '<td class="cf-list-actions">' + renderListActions(cf) + '</td>'
                    + '</tr>';
            }).join('');
        } catch (err) {
            if (emptyTitle) emptyTitle.textContent = tr('caseFiles.noCases');
            tbody.innerHTML = '<tr class="cf-empty-row"><td colspan="' + listColspan() + '" class="hint cf-empty-cell">'
                + esc(msg(err.opPayload, err)) + '</td></tr>';
            setCaseListEmptyState(true);
        }
    }

    function renderEvidenceTable(evidence) {
        if (!evidence || !evidence.length) {
            return '<p class="hint cf-ev-empty-msg">' + esc(tr('caseFiles.noLinkedEvidence')) + '</p>';
        }
        return '<table class="evidence-table cf-evidence-table"><thead><tr>'
            + '<th>' + esc(tr('evidence.colId')) + '</th>'
            + '<th>' + esc(tr('evidence.colFile')) + '</th>'
            + '<th>' + esc(tr('evidence.colOfficer')) + '</th>'
            + '<th>' + esc(tr('evidence.colUploaded')) + '</th>'
            + '<th></th>'
            + '</tr></thead><tbody>'
            + evidence.map(function (ev) {
                const name = ev.fileName || (ev.missing ? tr('caseFiles.missingEvidence') : '\u2014');
                return '<tr>'
                    + '<td><code>' + esc(ev.evidenceFileId) + '</code></td>'
                    + '<td>' + esc(name) + '</td>'
                    + '<td>' + esc(ev.operatorName || '\u2014') + '</td>'
                    + '<td>' + esc(fmtTime(ev.uploadedAt)) + '</td>'
                    + '<td class="cf-ev-actions">'
                    + (ev.missing ? '' : '<button type="button" class="btn btn-ghost btn-sm cf-open-evidence" data-file-id="' + esc(ev.evidenceFileId) + '">' + tr('caseFiles.openEvidence') + '</button>')
                    + (perms.edit ? ' <button type="button" class="btn btn-ghost btn-sm cf-unlink" data-file-id="' + esc(ev.evidenceFileId) + '">' + tr('caseFiles.unlink') + '</button>' : '')
                    + '</td></tr>';
            }).join('')
            + '</tbody></table>';
    }

    function isVideoEvidenceName(name) {
        return /\.(mp4|mov|m4v|mkv|avi|webm|ts)$/i.test(String(name || ''));
    }

    function isImageEvidenceName(name) {
        return /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(name || ''));
    }

    function renderReportMedia(evidence, sosHit) {
        var tiles = [];
        if (sosHit) {
            if (sosHit.snapshot) {
                tiles.push({ kind: 'img', src: sosHit.snapshot, cap: tr('caseFiles.sosFactSnapshot') });
            }
            if (sosHit.serverRecordingPreviewUrl) {
                tiles.push({ kind: 'video', src: sosHit.serverRecordingPreviewUrl, cap: tr('caseFiles.sosFactHqRec') });
            }
            if (sosHit.deviceRecordingPreviewUrl) {
                tiles.push({ kind: 'video', src: sosHit.deviceRecordingPreviewUrl, cap: tr('caseFiles.sosFactDockRec') });
            }
        }
        (evidence || []).forEach(function (ev) {
            if (!ev || ev.missing || !ev.evidenceFileId) return;
            var src = '/api/evidence/preview/' + ev.evidenceFileId;
            if (isVideoEvidenceName(ev.fileName)) {
                tiles.push({ kind: 'video', src: src, cap: ev.fileName || tr('caseFiles.linkedEvidence') });
            } else if (isImageEvidenceName(ev.fileName)) {
                tiles.push({ kind: 'img', src: src, cap: ev.fileName || tr('caseFiles.linkedEvidence') });
            }
        });
        if (!tiles.length) return '';
        return '<div class="cf-media-gallery">'
            + '<div class="cf-media-grid">'
            + tiles.map(function (t) {
                var body = t.kind === 'img'
                    ? '<img src="' + esc(t.src) + '" alt="">'
                    : '<video controls playsinline src="' + esc(t.src) + '"></video>';
                return '<div class="cf-media-tile">' + body
                    + '<p class="hint">' + esc(t.cap) + '</p></div>';
            }).join('')
            + '</div></div>';
    }

    function exhibitTypeLabel(type) {
        if (type === 'ai_report') return tr('caseFiles.exhibitAi', 'AI report');
        if (type === 'fr_hit') return tr('caseFiles.exhibitFr', 'FR hit');
        if (type === 'anpr_hit') return tr('caseFiles.exhibitAnpr', 'ANPR hit');
        if (type === 'team_handoff') return tr('caseFiles.exhibitHandoff', 'Team handoff');
        if (type === 'sos_ownership') return tr('caseFiles.exhibitOwnership', 'Owning SA');
        return tr('caseFiles.exhibitMedia', 'Media');
    }

    function displayExhibitContent(content) {
        var t = String(content || '');
        if (t.indexOf('hit:') === 0 || t.indexOf('by:') === 0 || t.indexOf('owning:') === 0) {
            var i = t.indexOf('\n');
            return i >= 0 ? t.slice(i + 1) : '';
        }
        return t;
    }

    function renderExhibitTimeline(exhibits) {
        var rows = exhibits || [];
        var items = rows.length ? rows.map(function (ex) {
            var src = String(ex.fileUrl || '');
            var media = '';
            if (src.indexOf('/api/') === 0) {
                media = /\.(mp4|webm|mov)(\?|$)/i.test(src)
                    ? '<video controls playsinline src="' + esc(src) + '"></video>'
                    : '<img src="' + esc(src) + '" alt="">';
            }
            var body = displayExhibitContent(ex.content);
            return '<li class="cf-timeline-item">'
                + '<div class="cf-timeline-meta">'
                + '<span class="cf-exhibit-num">E' + esc(String(ex.exhibitNumber || '')) + '</span>'
                + '<span class="cf-exhibit-badge">' + esc(exhibitTypeLabel(ex.exhibitType)) + '</span>'
                + '<span class="cf-exhibit-time mono">' + esc(fmtTime(ex.createdAt)) + '</span>'
                + '</div>'
                + '<div class="cf-exhibit-title">' + esc(ex.title || '') + '</div>'
                + (body ? '<p class="cf-exhibit-body">' + esc(body) + '</p>' : '')
                + (media ? '<div class="cf-exhibit-media">' + media + '</div>' : '')
                + '</li>';
        }).join('') : '';
        return '<div class="cf-timeline">'
            + '<h4>' + esc(tr('caseFiles.timelineTitle', 'Chronological timeline and exhibits')) + '</h4>'
            + (items
                ? ('<ol class="cf-timeline-list">' + items + '</ol>')
                : ('<p class="hint">' + esc(tr('caseFiles.timelineEmpty', 'No exhibits yet.')) + '</p>'))
            + '</div>';
    }

    async function loadDetail(id) {
        const wrap = document.getElementById('cf-detail-body');
        if (!wrap) return;
        wrap.innerHTML = '<p class="hint">' + tr('evidenceHub.loading') + '</p>';
        try {
            const res = await fetch('/api/case-files/' + encodeURIComponent(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOp(data);
            const cf = data.detail.caseFile;
            const evidence = data.detail.evidence || [];
            const exhibits = data.detail.exhibits || [];
            const sosHandoff = data.detail.sosHandoff || null;
            detailNarrativeOriginal = cf.narrative || '';
            const sosEntries = await fetchSosEntries();
            const sosOpts = sosOptionsHtml(sosEntries, cf.sosIncidentId);
            const sosHit = cf.sosIncidentId
                ? (sosEntries.find(function (e) {
                    return (e.id || e.incidentId) === cf.sosIncidentId;
                }) || null)
                : null;
            if (sosHit && sosHandoff) {
                if (!sosHit.owningUsername && sosHandoff.owningUsername) {
                    sosHit.owningUsername = sosHandoff.owningUsername;
                    sosHit.owningDisplayName = sosHandoff.owningDisplayName;
                }
                if (!sosHit.compileReadyAt && sosHandoff.compileReadyAt) {
                    sosHit.compileReadyAt = sosHandoff.compileReadyAt;
                    sosHit.compileReadyBy = sosHandoff.compileReadyBy;
                }
            }
            const sosFactsHtml = renderSosFacts(sosHit);
            const mashed = !!(cf.sosIncidentId && looksMashedNarrative(cf.narrative));
            const officerText = mashed ? '' : (cf.narrative || '');
            const opened = openedFromLabel(cf.opsCaseId, cf.sosIncidentId);
            const statusOpen = cf.status !== 'closed';
            let opsLinkHtml = opened
                ? ('<p class="hint cf-ops-case-link"><button type="button" class="cf-opened-from-btn" id="cf-opened-from">'
                    + esc(opened) + '</button></p>')
                : '';
            if (perms.superAdmin && cf.opsCaseId) {
                opsLinkHtml += '<p class="hint cf-incident-id">' + esc(tr('caseFiles.incidentId'))
                    + ': <code>' + esc(cf.opsCaseId) + '</code></p>';
            }
            const narrativeLabel = tr('caseFiles.whatHappened');
            const reportMediaHtml = renderReportMedia(evidence, sosHit);
            const timelineHtml = renderExhibitTimeline(exhibits);
            const handoffHtml = renderHandoffPanel(cf, sosHandoff);
            wrap.innerHTML =
                '<div class="cf-detail-back-bar">'
                + '<button type="button" class="cf-detail-back-btn" id="cf-back">'
                + '<span class="cf-detail-back-arrow" aria-hidden="true">←</span>'
                + '<span>' + esc(tr('caseFiles.back')) + '</span>'
                + '</button></div>'
                + '<div class="cf-detail-head">'
                + '<div class="cf-detail-title-wrap">'
                + '<span class="cf-detail-title">' + esc(cf.title) + '</span>'
                + '<code>' + esc(cf.id) + '</code>'
                + '<span class="cf-status-badge' + (statusOpen ? '' : ' cf-status-closed') + '">'
                + esc(statusOpen ? tr('caseFiles.statusOpen') : tr('caseFiles.statusClosed')) + '</span>'
                + '</div>'
                + '<div class="cf-detail-head-actions">'
                + '<span id="cf-save-msg" class="hint"></span>'
                + '<button type="button" class="btn btn-primary btn-sm" id="cf-reconstruct" title="View Geospatial Trace"'
                + ' data-device="' + esc(cf.deviceId || '') + '"'
                + ' data-at="' + esc((function () {
                    var times = evidence.map(function (ev) { return ev && ev.uploadedAt; }).filter(Boolean).sort();
                    return times[0] || cf.createdAt || '';
                })()) + '"'
                + ' data-case-id="' + esc(cf.id) + '"'
                + ' data-sos="' + esc(cf.sosIncidentId || '') + '">Reconstruct Scene</button>'
                + ((perms.export || perms.superAdmin)
                    ? '<button type="button" class="btn btn-primary btn-sm" id="cf-export-package">'
                        + esc(tr('caseFiles.exportPackage', 'Export Case Package')) + '</button>'
                    : '')
                + (perms.edit ? '<button type="button" class="btn btn-action btn-sm" id="cf-save">' + tr('caseFiles.save') + '</button>' : '')
                + (perms.superAdmin
                    ? '<button type="button" class="btn btn-ghost btn-sm cf-delete-btn" id="cf-detail-delete">' + tr('caseFiles.deleteCase') + '</button>'
                    : '')
                + '</div></div>'
                + opsLinkHtml
                + '<div class="cf-detail-grid">'
                + '<section class="cf-field-report">'
                + '<h4>' + tr('caseFiles.fieldReport') + '</h4>'
                + (perms.edit ? (
                    '<div class="cf-form-stack">'
                    + '<label class="cf-form-field cf-form-field-full"><span class="cf-form-label">' + tr('caseFiles.title') + '</span>'
                    + '<input type="text" id="cf-title" value="' + esc(cf.title) + '"></label>'
                    + '<div class="cf-form-row-3">'
                    + '<label class="cf-form-field"><span class="cf-form-label">' + tr('caseFiles.officer') + '</span>'
                    + '<input type="text" id="cf-officer" value="' + esc(cf.officerName || '') + '"></label>'
                    + '<label class="cf-form-field"><span class="cf-form-label">' + tr('caseFiles.device') + '</span>'
                    + '<input type="text" id="cf-device" value="' + esc(cf.deviceId || '') + '"></label>'
                    + '<label class="cf-form-field"><span class="cf-form-label">' + tr('caseFiles.status') + '</span>'
                    + '<select id="cf-status">'
                    + '<option value="open"' + (statusOpen ? ' selected' : '') + '>' + tr('caseFiles.statusOpen') + '</option>'
                    + '<option value="closed"' + (!statusOpen ? ' selected' : '') + '>' + tr('caseFiles.statusClosed') + '</option>'
                    + '</select></label>'
                    + '</div>'
                    + '<label class="cf-form-field cf-form-field-full"><span class="cf-form-label">' + tr('caseFiles.sosLink') + '</span>'
                    + '<select id="cf-sos">' + sosOpts + '</select></label>'
                    + sosFactsHtml
                    + reportMediaHtml
                    + timelineHtml
                    + handoffHtml
                    + '<label class="cf-form-field cf-form-field-full cf-narrative-wrap"><span class="cf-form-label">' + narrativeLabel + '</span>'
                    + '<textarea id="cf-narrative" rows="6">' + esc(officerText) + '</textarea></label>'
                    + '</div>'
                ) : (
                    '<div class="cf-form-stack cf-form-readonly">'
                    + '<div class="cf-form-row-3">'
                    + '<div class="cf-form-field"><span class="cf-form-label">' + tr('caseFiles.officer') + '</span>'
                    + '<div class="cf-readonly-val">' + esc(cf.officerName || '\u2014') + '</div></div>'
                    + '<div class="cf-form-field"><span class="cf-form-label">' + tr('caseFiles.device') + '</span>'
                    + '<div class="cf-readonly-val">' + esc(cf.deviceId || '\u2014') + '</div></div>'
                    + '<div class="cf-form-field"><span class="cf-form-label">' + tr('caseFiles.sosLink') + '</span>'
                    + '<div class="cf-readonly-val">' + esc(opened || '\u2014') + '</div></div>'
                    + '</div>'
                    + sosFactsHtml
                    + reportMediaHtml
                    + timelineHtml
                    + handoffHtml
                    + (officerText
                        ? ('<div class="cf-form-field cf-form-field-full"><span class="cf-form-label">' + narrativeLabel + '</span>'
                            + '<div class="cf-narrative-read">' + esc(officerText) + '</div></div>')
                        : (sosFactsHtml ? '' : '<div class="cf-form-field cf-form-field-full"><span class="cf-form-label">' + narrativeLabel + '</span>'
                            + '<div class="cf-narrative-read">\u2014</div></div>'))
                    + '</div>'
                ))
                + '<p class="hint cf-meta">' + tr('caseFiles.updated') + ': ' + esc(fmtTime(cf.updatedAt))
                + (cf.createdBy ? ' \u00B7 ' + esc(cf.createdBy) : '') + '</p>'
                + '</section>'
                + '<section class="cf-linked-evidence">'
                + '<h4>' + tr('caseFiles.linkedEvidence') + '</h4>'
                + (perms.edit ? (
                    '<div class="cf-link-bar">'
                    + '<button type="button" class="btn btn-action btn-sm" id="cf-choose-library">' + tr('caseFiles.chooseFromLibrary') + '</button>'
                    + '<button type="button" class="btn btn-ghost btn-sm" id="cf-choose-triage">' + tr('caseFiles.addFromTriage', 'Add from Triage') + '</button>'
                    + (perms.superAdmin
                        ? ('<input type="text" id="cf-link-evidence-id" placeholder="' + esc(tr('caseFiles.evidenceIdPlaceholder')) + '">'
                            + '<button type="button" class="btn btn-ghost btn-sm" id="cf-link-btn">' + tr('caseFiles.linkEvidence') + '</button>')
                        : '<input type="hidden" id="cf-link-evidence-id" value="">')
                    + '</div>'
                ) : '')
                + '<div id="cf-evidence-table" class="cf-ev-scroll">' + renderEvidenceTable(evidence) + '</div>'
                + '</section>'
                + '</div>';
            if (pendingLinkEvidenceId && perms.edit) {
                const inp = document.getElementById('cf-link-evidence-id');
                if (inp) inp.value = pendingLinkEvidenceId;
                pendingLinkEvidenceId = null;
            }
            bindDetailActions(id, cf.title, evidence.length, cf.sosIncidentId);
            const evScroll = document.getElementById('cf-evidence-table');
            if (evScroll) evScroll.classList.toggle('cf-ev-empty', !evidence || !evidence.length);
        } catch (err) {
            wrap.innerHTML = '<p class="hint">' + esc(msg(err.opPayload, err)) + '</p>';
        }
    }

    function bindDetailActions(id, caseTitle, evidenceCount, sosIncidentId) {
        const back = document.getElementById('cf-back');
        if (back) back.addEventListener('click', function () { showList(); loadList(); });
        const save = document.getElementById('cf-save');
        if (save) save.addEventListener('click', function () {
            saveCase(id).catch(function (err) {
                const el = document.getElementById('cf-save-msg');
                if (el) el.textContent = msg(err.opPayload, err);
            });
        });
        const recon = document.getElementById('cf-reconstruct');
        if (recon) recon.addEventListener('click', function () {
            reconstructScene({
                deviceId: recon.getAttribute('data-device') || '',
                atIso: recon.getAttribute('data-at') || '',
                caseFileId: recon.getAttribute('data-case-id') || id,
                sosIncidentId: recon.getAttribute('data-sos') || '',
            }).catch(function () { /* ignore */ });
        });
        const openedBtn = document.getElementById('cf-opened-from');
        if (openedBtn && recon) {
            openedBtn.addEventListener('click', function () { recon.click(); });
        }
        const exportBtn = document.getElementById('cf-export-package');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                fetch('/api/case-files/' + encodeURIComponent(id) + '/export', { credentials: 'same-origin' })
                    .then(function (res) {
                        if (!res.ok) {
                            return res.json().then(function (data) { throwOp(data); }).catch(function (err) {
                                if (err && err.opPayload) throw err;
                                throwOp({ errorKey: 'errors.generic' });
                            });
                        }
                        return res.blob();
                    })
                    .then(function (blob) {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'court-package-' + String(id).replace(/[^a-zA-Z0-9._-]+/g, '_') + '.zip';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    })
                    .catch(function (err) { alert(msg(err.opPayload, err)); });
            });
        }
        const chooseLib = document.getElementById('cf-choose-library');
        if (chooseLib) chooseLib.addEventListener('click', function () { beginLibraryPick(id); });
        const chooseTriage = document.getElementById('cf-choose-triage');
        if (chooseTriage) chooseTriage.addEventListener('click', function () { beginTriagePick(id); });
        const linkBtn = document.getElementById('cf-link-btn');
        if (linkBtn) linkBtn.addEventListener('click', function () {
            const inp = document.getElementById('cf-link-evidence-id');
            const fid = inp ? inp.value.trim() : '';
            if (!fid) return;
            linkEvidence(id, fid).catch(function (err) { alert(msg(err.opPayload, err)); });
        });
        const delBtn = document.getElementById('cf-detail-delete');
        if (delBtn) delBtn.addEventListener('click', function () {
            confirmDeleteCase(id, caseTitle || id, evidenceCount || 0);
        });
        const handoffBtn = document.getElementById('cf-handoff-submit');
        if (handoffBtn && sosIncidentId) {
            handoffBtn.addEventListener('click', function () {
                const noteEl = document.getElementById('cf-handoff-note');
                const note = noteEl ? String(noteEl.value || '').trim() : '';
                const msgEl = document.getElementById('cf-handoff-msg');
                if (!note) {
                    if (msgEl) msgEl.textContent = tr('caseFiles.handoffNoteRequired', 'Enter a handoff note.');
                    return;
                }
                fetch('/api/sos-incidents/' + encodeURIComponent(sosIncidentId) + '/handoff', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note: note }),
                }).then(function (res) {
                    return res.json().then(function (data) {
                        if (!res.ok || !data.ok) throwOp(data);
                        return data;
                    });
                }).then(function () {
                    if (msgEl) msgEl.textContent = tr('caseFiles.handoffDone', 'Handoff saved on case.');
                    loadDetail(id);
                }).catch(function (err) {
                    if (msgEl) msgEl.textContent = msg(err.opPayload, err);
                });
            });
        }
        const compileBtn = document.getElementById('cf-compile-ready');
        if (compileBtn && sosIncidentId) {
            compileBtn.addEventListener('click', function () {
                const msgEl = document.getElementById('cf-handoff-msg');
                fetch('/api/sos-incidents/' + encodeURIComponent(sosIncidentId) + '/compile-ready', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                }).then(function (res) {
                    return res.json().then(function (data) {
                        if (!res.ok || !data.ok) throwOp(data);
                        return data;
                    });
                }).then(function () {
                    if (msgEl) msgEl.textContent = tr('caseFiles.handoffCompileMarked', 'Marked compile-ready');
                    loadDetail(id);
                }).catch(function (err) {
                    if (msgEl) msgEl.textContent = msg(err.opPayload, err);
                });
            });
        }
        const wrap = document.getElementById('cf-detail-body');
        if (wrap) {
            wrap.querySelectorAll('.cf-unlink').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    unlinkEvidence(id, btn.getAttribute('data-file-id')).catch(function (err) {
                        alert(msg(err.opPayload, err));
                    });
                });
            });
            wrap.querySelectorAll('.cf-open-evidence').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const fid = btn.getAttribute('data-file-id');
                    if (global.EvidenceHub && EvidenceHub.openDetail) EvidenceHub.openDetail(fid);
                });
            });
        }
    }

    async function saveCase(id) {
        /* CASE-FILES-SAVE-JUMP-LIST-V1 — require narrative; on success jump to list */
        const msgEl = document.getElementById('cf-save-msg');
        const narrativeEl = document.getElementById('cf-narrative');
        const typed = narrativeEl ? String(narrativeEl.value || '') : '';
        const sosVal = document.getElementById('cf-sos') ? document.getElementById('cf-sos').value : '';
        let narrative = typed;
        if (!typed.trim()) {
            if (looksMashedNarrative(detailNarrativeOriginal)) {
                narrative = detailNarrativeOriginal;
            } else if (sosVal) {
                narrative = detailNarrativeOriginal || '';
            } else {
                if (msgEl) msgEl.textContent = tr('caseFiles.needNarrative');
                if (narrativeEl && typeof narrativeEl.focus === 'function') narrativeEl.focus();
                return;
            }
        }
        const body = {
            title: document.getElementById('cf-title').value,
            officerName: document.getElementById('cf-officer').value,
            deviceId: document.getElementById('cf-device').value,
            sosIncidentId: sosVal || null,
            status: document.getElementById('cf-status').value,
            narrative: narrative,
        };
        const res = await fetch('/api/case-files/' + encodeURIComponent(id), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        showList();
        await loadList();
        const listMsg = document.getElementById('cf-list-save-msg');
        if (listMsg) {
            listMsg.hidden = false;
            listMsg.textContent = tr('caseFiles.saved');
            setTimeout(function () {
                try {
                    listMsg.textContent = '';
                    listMsg.hidden = true;
                } catch (_) { /* ignore */ }
            }, 4000);
        }
    }

    async function linkEvidence(caseId, evidenceFileId, opts) {
        const res = await fetch('/api/case-files/' + encodeURIComponent(caseId) + '/evidence', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenceFileId: evidenceFileId }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        if (!(opts && opts.skipReload)) {
            loadDetail(caseId);
            loadList();
        }
    }

    async function linkEvidenceMany(caseId, ids) {
        var list = (ids || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        var i;
        for (i = 0; i < list.length; i++) {
            await linkEvidence(caseId, list[i], { skipReload: true });
        }
        if (list.length) {
            loadDetail(caseId);
            loadList();
        }
    }

    async function unlinkEvidence(caseId, evidenceFileId) {
        const res = await fetch('/api/case-files/' + encodeURIComponent(caseId) + '/evidence/' + encodeURIComponent(evidenceFileId), {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        loadDetail(caseId);
        loadList();
    }

    async function deleteCase(caseId, adminPassword) {
        const res = await fetch('/api/case-files/' + encodeURIComponent(caseId), {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: adminPassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        return data;
    }

    function setDeleteModalA11y(show) {
        const backdrop = document.getElementById('cf-delete-backdrop');
        if (!backdrop) return;
        if ('inert' in backdrop) backdrop.inert = !show;
        backdrop.setAttribute('aria-hidden', show ? 'false' : 'true');
        const pass = document.getElementById('cf-delete-pass');
        if (pass) {
            pass.tabIndex = show ? 0 : -1;
            pass.disabled = !show;
        }
        const toggle = document.getElementById('cf-delete-pass-toggle');
        if (toggle) toggle.disabled = !show;
    }

    function resetDeletePasswordField() {
        const pass = document.getElementById('cf-delete-pass');
        const toggle = document.getElementById('cf-delete-pass-toggle');
        if (pass) {
            pass.value = '';
            pass.type = 'password';
        }
        if (toggle) {
            toggle.setAttribute('aria-pressed', 'false');
            toggle.textContent = tr('common.showPassword');
            toggle.setAttribute('aria-label', tr('common.showPassword'));
        }
    }

    function closeDeleteModal(password) {
        const backdrop = document.getElementById('cf-delete-backdrop');
        const errEl = document.getElementById('cf-delete-error');
        if (backdrop) backdrop.hidden = true;
        setDeleteModalA11y(false);
        resetDeletePasswordField();
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        const submit = document.getElementById('cf-delete-submit');
        if (submit) submit.disabled = false;
        if (deleteModalResolver) {
            deleteModalResolver(password);
            deleteModalResolver = null;
        }
    }

    function showDeleteModalError(text) {
        const errEl = document.getElementById('cf-delete-error');
        if (!errEl) return;
        errEl.textContent = text;
        errEl.hidden = !text;
    }

    function isDeletePasswordRetryError(err) {
        const key = err && err.opPayload && err.opPayload.errorKey;
        return key === 'errors.passwordWrong';
    }

    function promptDeletePassword(title, caseId, evidenceCount, initialError) {
        return new Promise(function (resolve) {
            const backdrop = document.getElementById('cf-delete-backdrop');
            const summary = document.getElementById('cf-delete-summary');
            const note = document.getElementById('cf-delete-evidence-note');
            const pass = document.getElementById('cf-delete-pass');
            if (!backdrop || !summary || !note || !pass) {
                resolve(null);
                return;
            }
            deleteModalResolver = resolve;
            summary.textContent = tr('caseFiles.deleteConfirm', { title: title, id: caseId });
            note.textContent = tr('caseFiles.deleteEvidenceKept', { count: String(evidenceCount || 0) });
            showDeleteModalError(initialError || '');
            resetDeletePasswordField();
            backdrop.hidden = false;
            setDeleteModalA11y(true);
            pass.focus();
        });
    }

    function bindDeleteModal() {
        if (deleteModalBound) return;
        deleteModalBound = true;
        const backdrop = document.getElementById('cf-delete-backdrop');
        const cancelBtn = document.getElementById('cf-delete-cancel');
        const submitBtn = document.getElementById('cf-delete-submit');
        const pass = document.getElementById('cf-delete-pass');
        const toggle = document.getElementById('cf-delete-pass-toggle');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () { closeDeleteModal(null); });
        }
        if (backdrop) {
            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop) closeDeleteModal(null);
            });
        }
        if (toggle && pass) {
            toggle.addEventListener('click', function () {
                const reveal = pass.type === 'password';
                pass.type = reveal ? 'text' : 'password';
                toggle.setAttribute('aria-pressed', reveal ? 'true' : 'false');
                const label = tr(reveal ? 'common.hidePassword' : 'common.showPassword');
                toggle.textContent = label;
                toggle.setAttribute('aria-label', label);
                pass.focus();
            });
        }
        if (submitBtn && pass) {
            const submit = function () {
                const value = String(pass.value || '').trim();
                if (!value) {
                    showDeleteModalError(tr('errors.passwordConfirmRequired'));
                    pass.focus();
                    return;
                }
                closeDeleteModal(value);
            };
            submitBtn.addEventListener('click', submit);
            pass.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                }
                if (e.key === 'Escape') closeDeleteModal(null);
            });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            const el = document.getElementById('cf-delete-backdrop');
            if (el && !el.hidden) closeDeleteModal(null);
        });
    }

    function bindSosPickModal() {
        if (sosModalBound) return;
        sosModalBound = true;
        var cancel = document.getElementById('cf-sos-modal-cancel');
        var run = document.getElementById('cf-sos-modal-run');
        var backdrop = document.getElementById('cf-sos-modal');
        if (cancel) cancel.addEventListener('click', closeSosPickModal);
        if (run) run.addEventListener('click', function () {
            submitSosPickModal().catch(function (err) {
                setSosModalMsg(msg(err.opPayload, err), true);
            });
        });
        if (backdrop) backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) closeSosPickModal();
        });
    }

    async function confirmDeleteCase(caseId, title, evidenceCount) {
        if (!perms.superAdmin) return;
        bindDeleteModal();
        let modalError = '';
        for (;;) {
            const adminPassword = await promptDeletePassword(title || caseId, caseId, evidenceCount, modalError);
            if (!adminPassword) return;
            modalError = '';
            try {
                await deleteCase(caseId, adminPassword);
                alert(tr('caseFiles.deleteDone'));
                if (currentId === caseId) {
                    showList();
                }
                loadList();
                return;
            } catch (err) {
                if (isDeletePasswordRetryError(err)) {
                    modalError = msg(err.opPayload, err);
                    continue;
                }
                alert(msg(err.opPayload, err));
                return;
            }
        }
    }

    async function createCase() {
        const title = window.prompt(tr('caseFiles.newTitlePrompt'), tr('caseFiles.newTitleDefault'));
        if (title == null) return;
        const res = await fetch('/api/case-files', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim() || tr('caseFiles.newTitleDefault') }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        showDetail(data.detail.caseFile.id);
        loadList();
    }

    async function createFromSos() {
        openSosPickModal();
    }

    function sosPickLabel(entry) {
        var when = entry && entry.at ? fmtTime(entry.at) : '—';
        var device = (entry && (entry.operatorName || entry.cameraId || entry.deviceId)) || '—';
        return when + ' - Device: ' + device;
    }

    function setSosModalMsg(text, isErr) {
        var el = document.getElementById('cf-sos-modal-msg');
        if (!el) return;
        if (!text) {
            el.hidden = true;
            el.textContent = '';
            el.className = 'hint';
            return;
        }
        el.hidden = false;
        el.textContent = text;
        el.className = isErr ? 'hint ss-gate-error' : 'hint';
    }

    function closeSosPickModal() {
        var modal = document.getElementById('cf-sos-modal');
        if (modal) modal.hidden = true;
        setSosModalMsg('');
        var run = document.getElementById('cf-sos-modal-run');
        if (run) run.disabled = false;
    }

    async function openSosPickModal() {
        var modal = document.getElementById('cf-sos-modal');
        var sel = document.getElementById('cf-sos-modal-select');
        var run = document.getElementById('cf-sos-modal-run');
        if (!modal || !sel) return;
        sel.innerHTML = '<option value="">Loading…</option>';
        if (run) run.disabled = true;
        setSosModalMsg('');
        modal.hidden = false;
        try {
            const res = await fetch('/api/evidence/sos-incidents?days=365&limit=200', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOp(data);
            const entries = (data.incidents && data.incidents.entries) ? data.incidents.entries : [];
            if (!entries.length) {
                sel.innerHTML = '<option value="">No SOS incidents in this period</option>';
                setSosModalMsg('No SOS incidents available.', true);
                return;
            }
            var html = '<option value="">Select an incident</option>';
            entries.forEach(function (e) {
                var id = e && (e.id || e.incidentId);
                if (!id) return;
                html += '<option value="' + esc(id) + '">' + esc(sosPickLabel(e)) + '</option>';
            });
            sel.innerHTML = html;
            if (run) run.disabled = false;
            sel.focus();
        } catch (err) {
            sel.innerHTML = '<option value="">Could not load incidents</option>';
            setSosModalMsg(msg(err.opPayload, err), true);
        }
    }

    async function submitSosPickModal() {
        var sel = document.getElementById('cf-sos-modal-select');
        var run = document.getElementById('cf-sos-modal-run');
        var incidentId = sel ? String(sel.value || '').trim() : '';
        if (!incidentId) {
            setSosModalMsg('Select an SOS incident.', true);
            return;
        }
        if (run) run.disabled = true;
        setSosModalMsg('Creating case…');
        try {
            const res = await fetch('/api/case-files/from-sos', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentId: incidentId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOp(data);
            closeSosPickModal();
            showDetail(data.detail.caseFile.id);
            loadList();
        } catch (err) {
            setSosModalMsg(msg(err.opPayload, err), true);
            if (run) run.disabled = false;
        }
    }

    function updateToolbar() {
        const createBtn = document.getElementById('cf-create');
        const sosBtn = document.getElementById('cf-from-sos');
        if (createBtn) createBtn.hidden = !perms.edit;
        if (sosBtn) sosBtn.hidden = !perms.edit;
    }

    function bindUi() {
        bindDeleteModal();
        bindSosPickModal();
        const createBtn = document.getElementById('cf-create');
        if (createBtn && !createBtn._cfBound) {
            createBtn._cfBound = true;
            createBtn.addEventListener('click', function () {
                createCase().catch(function (err) { alert(msg(err.opPayload, err)); });
            });
        }
        const sosBtn = document.getElementById('cf-from-sos');
        if (sosBtn && !sosBtn._cfBound) {
            sosBtn._cfBound = true;
            sosBtn.addEventListener('click', function () {
                createFromSos().catch(function (err) { alert(msg(err.opPayload, err)); });
            });
        }
        const refresh = document.getElementById('cf-refresh');
        if (refresh && !refresh._cfBound) {
            refresh._cfBound = true;
            refresh.addEventListener('click', function () {
                if (currentId) loadDetail(currentId);
                else loadList();
            });
        }
        const tbody = document.getElementById('cf-tbody');
        if (tbody && !tbody._cfBound) {
            tbody._cfBound = true;
            tbody.addEventListener('click', function (e) {
                const del = e.target.closest('.cf-delete');
                if (del) {
                    confirmDeleteCase(
                        del.getAttribute('data-case-id'),
                        del.getAttribute('data-case-title'),
                        parseInt(del.getAttribute('data-evidence-count'), 10) || 0
                    );
                    return;
                }
                const row = e.target.closest('tr[data-case-id]');
                const caseId = row ? row.getAttribute('data-case-id') : null;
                if (!caseId) return;
                if (pendingLinkEvidenceIds.length) {
                    pickIncidentForAnalysis(caseId).catch(function (err) { alert(msg(err.opPayload, err)); });
                    return;
                }
                const open = e.target.closest('.cf-open');
                if (open) showDetail(open.getAttribute('data-case-id'));
            });
        }
        const search = document.getElementById('cf-search');
        if (search && !search._cfBound) {
            search._cfBound = true;
            let timer = null;
            search.addEventListener('input', function () {
                clearTimeout(timer);
                timer = setTimeout(function () { if (!currentId) loadList(); }, 280);
            });
        }
        const period = document.getElementById('cf-period');
        if (period && !period._cfBound) {
            period._cfBound = true;
            period.addEventListener('change', function () { if (!currentId) loadList(); });
        }
        const statusFilter = document.getElementById('cf-status-filter');
        if (statusFilter && !statusFilter._cfBound) {
            statusFilter._cfBound = true;
            statusFilter.addEventListener('change', function () { if (!currentId) loadList(); });
        }
    }

    function applyPermissions(p, role) {
        p = p || {};
        perms.view = !!(p.evidenceView || p.evidenceDownload);
        perms.edit = !!p.evidenceEdit;
        perms.export = !!p.evidenceExport;
        perms.superAdmin = role === 'super_admin';
        updateToolbar();
    }

    function onShow(opts) {
        opts = opts || {};
        bindUi();
        updateToolbar();
        try {
            var bulkRaw = sessionStorage.getItem('pendingBulkCaseEvidence');
            if (bulkRaw) {
                sessionStorage.removeItem('pendingBulkCaseEvidence');
                var bulkIds = JSON.parse(bulkRaw);
                if (Array.isArray(bulkIds) && bulkIds.length) {
                    beginIncidentAttach(bulkIds);
                }
            }
        } catch (_) { /* ignore */ }
        if (currentId) {
            setCaseListEmptyState(false);
            const evPanel = document.getElementById('evidence-panel');
            if (evPanel) evPanel.classList.remove('ev-case-files-empty');
            setCaseDetailActiveState(true);
            updateViewChrome();
            loadDetail(currentId);
        } else {
            showList();
            if (opts.warm && !opts.force) {
                setCaseListEmptyState(!listCache.length);
                if (listCache.length) setCaseListFewRows(listCache.length);
            } else {
                loadList();
            }
        }
    }

    function beginLibraryPick(caseId) {
        libraryReturnCaseId = caseId || null;
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('catalog', { force: true });
        }
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function beginTriagePick(caseId) {
        libraryReturnCaseId = caseId || null;
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('ftp-inbox', { force: true });
        }
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function endLibraryPick() {
        libraryReturnCaseId = null;
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function goBackFromLibrary() {
        var caseId = libraryReturnCaseId;
        endLibraryPick();
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files', { force: true });
        }
        if (caseId) showDetail(caseId);
    }

    async function completeLibraryPick(fileId) {
        return completeLibraryPicks(fileId ? [fileId] : []);
    }

    async function completeLibraryPicks(ids) {
        var caseId = libraryReturnCaseId;
        var list = (ids || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        if (!caseId || !list.length) return;
        await linkEvidenceMany(caseId, list);
        endLibraryPick();
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files', { force: true });
        }
        showDetail(caseId);
    }

    function setPendingLinkIds(ids) {
        pendingLinkEvidenceIds = (Array.isArray(ids) ? ids : [ids])
            .map(function (x) { return String(x || '').trim(); })
            .filter(Boolean);
        pendingLinkEvidenceId = pendingLinkEvidenceIds[0] || null;
    }

    function beginIncidentAttach(ids) {
        setPendingLinkIds(ids);
        analysisReturnFileId = null;
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('evidence');
        }
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files', { force: true });
        }
        showList();
        loadList();
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function beginAnalysisPick(fileId) {
        setPendingLinkIds(fileId);
        analysisReturnFileId = pendingLinkEvidenceId;
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('evidence');
        }
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files', { force: true });
        }
        showList();
        loadList();
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function endAnalysisPick() {
        pendingLinkEvidenceId = null;
        pendingLinkEvidenceIds = [];
        analysisReturnFileId = null;
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function goBackToAnalysis() {
        var fileId = analysisReturnFileId;
        endAnalysisPick();
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('analytics');
        }
        if (global.AnalyticsHub && typeof AnalyticsHub.restoreAnalysis === 'function') {
            AnalyticsHub.restoreAnalysis(fileId);
        }
    }

    async function pickIncidentForAnalysis(caseId) {
        var ids = pendingLinkEvidenceIds.length ? pendingLinkEvidenceIds.slice() : (pendingLinkEvidenceId ? [pendingLinkEvidenceId] : []);
        if (!caseId || !ids.length) return;
        await linkEvidenceMany(caseId, ids);
        var report = '';
        try {
            report = sessionStorage.getItem('pending_ai_report') || '';
            if (report) sessionStorage.removeItem('pending_ai_report');
        } catch (_) { report = ''; }
        if (report) {
            try {
                await fetch('/api/case-files/' + encodeURIComponent(caseId) + '/ai-report', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: report, evidenceFileId: ids[0] || '' }),
                });
            } catch (_) { /* ignore */ }
        }
        try { sessionStorage.setItem('pending_analysis_case_id', caseId); } catch (_) { /* ignore */ }
        pendingLinkEvidenceId = null;
        pendingLinkEvidenceIds = [];
        showDetail(caseId);
        if (global.EvidenceHub && EvidenceHub.paintLibraryReturn) EvidenceHub.paintLibraryReturn();
    }

    function openWithEvidenceLink(evidenceFileId) {
        pendingLinkEvidenceId = evidenceFileId || null;
        if (global.EvidenceHub && EvidenceHub.refreshCurrentPanel) {
            /* panel switch handled by hub */
        }
        if (listCache.length === 1 && perms.edit) {
            showDetail(listCache[0].id);
            return;
        }
        showList();
        loadList();
    }

    async function promptAddToCase(evidenceFileId) {
        if (!perms.edit || !evidenceFileId) return;
        let cases = listCache;
        try {
            const res = await fetch(buildListUrl(), { credentials: 'same-origin' });
            const data = await res.json();
            if (res.ok && data.ok) {
                cases = data.caseFiles || [];
                listCache = cases;
            }
        } catch (_) { /* use cache */ }
        if (!cases.length) {
            if (window.confirm(tr('caseFiles.createFirstConfirm'))) {
                const res = await fetch('/api/case-files', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: tr('caseFiles.newTitleDefault'),
                        evidenceFileId: evidenceFileId,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throwOp(data);
                alert(tr('caseFiles.linkDone'));
            }
            return;
        }
        const options = cases.map(function (cf) {
            return cf.id + ' \u2014 ' + cf.title;
        });
        const pick = window.prompt(tr('caseFiles.selectCasePrompt') + '\n\n' + options.join('\n'), cases[0].id);
        if (!pick || !pick.trim()) return;
        const caseId = pick.trim().split(/\s/)[0];
        await linkEvidence(caseId, evidenceFileId);
        alert(tr('caseFiles.linkDone'));
    }

    function openCase(opts) {
        opts = opts || {};
        var caseId = typeof opts === 'string' ? opts : (opts.caseId || opts.id || null);
        try {
            if (global.EvidenceManager && EvidenceManager.showTab) EvidenceManager.showTab('evidence');
        } catch (_) { /* ignore */ }
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files', { force: true });
        }
        if (caseId) {
            setTimeout(function () { showDetail(caseId); }, 80);
        }
    }

    global.CaseFilesUi = {
        applyPermissions: applyPermissions,
        onShow: onShow,
        openWithEvidenceLink: openWithEvidenceLink,
        promptAddToCase: promptAddToCase,
        beginAnalysisPick: beginAnalysisPick,
        beginIncidentAttach: beginIncidentAttach,
        goBackToAnalysis: goBackToAnalysis,
        analysisReturnFileId: function () { return analysisReturnFileId; },
        libraryReturnCaseId: function () { return libraryReturnCaseId; },
        completeLibraryPick: completeLibraryPick,
        completeLibraryPicks: completeLibraryPicks,
        goBackFromLibrary: goBackFromLibrary,
        refreshList: loadList,
        openDetail: showDetail,
        openCase: openCase,
    };
}(window));
