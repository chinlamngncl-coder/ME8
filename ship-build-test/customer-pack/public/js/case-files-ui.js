/**
 * Case Files — field report workspace + linked evidence (phase 1).
 */
(function (global) {
    var perms = { view: false, edit: false, superAdmin: false };
    var currentId = null;
    var listCache = [];
    var pendingLinkEvidenceId = null;
    var deleteModalResolver = null;
    var deleteModalBound = false;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return String(key || '').split('.').pop() || key;
    }

    function msg(data, err) {
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data);
        if (data && data.errorKey) return tr(data.errorKey);
        if (data && data.error) return data.error;
        return tr('errors.generic');
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
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString(); } catch (_) { return iso; }
    }

    function panelRoot() {
        return document.getElementById('ev-panel-case-files');
    }

    function updateViewChrome() {
        const inDetail = !!currentId;
        const hint = document.getElementById('cf-hint');
        const listToolbar = document.getElementById('cf-list-toolbar');
        if (hint) hint.hidden = inDetail;
        if (listToolbar) listToolbar.hidden = inDetail;
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

    async function fetchSosOptions(selected) {
        try {
            const res = await fetch('/api/evidence/sos-incidents?days=365&limit=200', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) return '<option value="">' + esc(tr('caseFiles.noSosLink')) + '</option>';
            const entries = (data.incidents && data.incidents.entries) ? data.incidents.entries : [];
            let html = '<option value="">' + esc(tr('caseFiles.noSosLink')) + '</option>';
            entries.forEach(function (e) {
                const id = e.id || e.incidentId;
                if (!id) return;
                const label = (e.operatorName || e.cameraId || '—') + ' · ' + (e.at ? e.at.slice(0, 16).replace('T', ' ') : id);
                html += '<option value="' + esc(id) + '"' + (selected === id ? ' selected' : '') + '>' + esc(label) + '</option>';
            });
            return html;
        } catch (_) {
            return '<option value="">' + esc(tr('caseFiles.noSosLink')) + '</option>';
        }
    }

    function listColspan() {
        return perms.superAdmin ? 8 : 7;
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
        const delCol = document.getElementById('cf-col-delete');
        if (delCol) delCol.hidden = !perms.superAdmin;
        if (!tbody) return;
        if (!perms.view) {
            tbody.innerHTML = '<tr><td colspan="' + listColspan() + '" class="hint">—</td></tr>';
            return;
        }
        tbody.innerHTML = '<tr><td colspan="' + listColspan() + '" class="hint">' + tr('evidenceHub.loading') + '</td></tr>';
        try {
            const res = await fetch(buildListUrl(), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwOp(data);
            listCache = data.caseFiles || [];
            if (meta) meta.textContent = listCache.length ? (listCache.length + ' ' + tr('caseFiles.listCount')) : '';
            if (!listCache.length) {
                tbody.innerHTML = '<tr><td colspan="' + listColspan() + '" class="hint">' + esc(tr('caseFiles.noCases')) + '</td></tr>';
                return;
            }
            tbody.innerHTML = listCache.map(function (cf) {
                const st = cf.status === 'closed' ? tr('caseFiles.statusClosed') : tr('caseFiles.statusOpen');
                return '<tr data-case-id="' + esc(cf.id) + '">'
                    + '<td><code>' + esc(cf.id) + '</code></td>'
                    + '<td>' + esc(cf.title) + '</td>'
                    + '<td>' + esc(cf.officerName || '—') + '</td>'
                    + '<td>' + esc(st) + '</td>'
                    + '<td>' + esc(String(cf.evidenceCount != null ? cf.evidenceCount : 0)) + '</td>'
                    + '<td>' + esc(fmtTime(cf.updatedAt)) + '</td>'
                    + '<td><button type="button" class="btn btn-ghost btn-sm cf-open" data-case-id="' + esc(cf.id) + '">' + tr('evidenceHub.open') + '</button></td>'
                    + (perms.superAdmin
                        ? '<td><button type="button" class="btn btn-ghost btn-sm cf-delete cf-delete-btn" data-case-id="' + esc(cf.id) + '" data-case-title="' + esc(cf.title) + '" data-evidence-count="' + esc(String(cf.evidenceCount || 0)) + '">' + tr('caseFiles.deleteCase') + '</button></td>'
                        : '')
                    + '</tr>';
            }).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="' + listColspan() + '" class="hint">' + esc(msg(err.opPayload, err)) + '</td></tr>';
        }
    }

    function renderEvidenceTable(evidence) {
        if (!evidence || !evidence.length) {
            return '<p class="hint">' + esc(tr('caseFiles.noLinkedEvidence')) + '</p>';
        }
        return '<table class="evidence-table cf-evidence-table"><thead><tr>'
            + '<th>' + esc(tr('evidence.colId')) + '</th>'
            + '<th>' + esc(tr('evidence.colFile')) + '</th>'
            + '<th>' + esc(tr('evidence.colOfficer')) + '</th>'
            + '<th>' + esc(tr('evidence.colUploaded')) + '</th>'
            + '<th></th>'
            + '</tr></thead><tbody>'
            + evidence.map(function (ev) {
                const name = ev.fileName || (ev.missing ? tr('caseFiles.missingEvidence') : '—');
                return '<tr>'
                    + '<td><code>' + esc(ev.evidenceFileId) + '</code></td>'
                    + '<td>' + esc(name) + '</td>'
                    + '<td>' + esc(ev.operatorName || '—') + '</td>'
                    + '<td>' + esc(fmtTime(ev.uploadedAt)) + '</td>'
                    + '<td class="cf-ev-actions">'
                    + (ev.missing ? '' : '<button type="button" class="btn btn-ghost btn-sm cf-open-evidence" data-file-id="' + esc(ev.evidenceFileId) + '">' + tr('caseFiles.openEvidence') + '</button>')
                    + (perms.edit ? ' <button type="button" class="btn btn-ghost btn-sm cf-unlink" data-file-id="' + esc(ev.evidenceFileId) + '">' + tr('caseFiles.unlink') + '</button>' : '')
                    + '</td></tr>';
            }).join('')
            + '</tbody></table>';
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
            const sosOpts = await fetchSosOptions(cf.sosIncidentId);
            const statusOpen = cf.status !== 'closed';
            wrap.innerHTML =
                '<div class="cf-detail-head">'
                + '<button type="button" class="btn btn-ghost btn-sm" id="cf-back">← ' + tr('caseFiles.back') + '</button>'
                + '<div class="cf-detail-title-wrap">'
                + '<span class="cf-detail-title">' + esc(cf.title) + '</span>'
                + '<code>' + esc(cf.id) + '</code>'
                + '<span class="cf-status-badge' + (statusOpen ? '' : ' cf-status-closed') + '">'
                + esc(statusOpen ? tr('caseFiles.statusOpen') : tr('caseFiles.statusClosed')) + '</span>'
                + '</div>'
                + '<div class="cf-detail-head-actions">'
                + '<span id="cf-save-msg" class="hint"></span>'
                + (perms.edit ? '<button type="button" class="btn btn-action btn-sm" id="cf-save">' + tr('caseFiles.save') + '</button>' : '')
                + (perms.superAdmin
                    ? '<button type="button" class="btn btn-ghost btn-sm cf-delete-btn" id="cf-detail-delete">' + tr('caseFiles.deleteCase') + '</button>'
                    : '')
                + '</div></div>'
                + '<div class="cf-detail-grid">'
                + '<section class="cf-field-report">'
                + '<h4>' + tr('caseFiles.fieldReport') + '</h4>'
                + (perms.edit ? (
                    '<div class="cf-meta-grid">'
                    + '<label class="full cf-span-full"><span>' + tr('caseFiles.title') + '</span>'
                    + '<input type="text" id="cf-title" value="' + esc(cf.title) + '"></label>'
                    + '<label class="full"><span>' + tr('caseFiles.officer') + '</span>'
                    + '<input type="text" id="cf-officer" value="' + esc(cf.officerName || '') + '"></label>'
                    + '<label class="full"><span>' + tr('caseFiles.device') + '</span>'
                    + '<input type="text" id="cf-device" value="' + esc(cf.deviceId || '') + '"></label>'
                    + '<label class="full"><span>' + tr('caseFiles.status') + '</span>'
                    + '<select id="cf-status">'
                    + '<option value="open"' + (statusOpen ? ' selected' : '') + '>' + tr('caseFiles.statusOpen') + '</option>'
                    + '<option value="closed"' + (!statusOpen ? ' selected' : '') + '>' + tr('caseFiles.statusClosed') + '</option>'
                    + '</select></label>'
                    + '<label class="full cf-span-full"><span>' + tr('caseFiles.sosLink') + '</span>'
                    + '<select id="cf-sos">' + sosOpts + '</select></label>'
                    + '</div>'
                    + '<label class="full cf-narrative-wrap"><span>' + tr('caseFiles.narrative') + '</span>'
                    + '<textarea id="cf-narrative" rows="5">' + esc(cf.narrative || '') + '</textarea></label>'
                ) : (
                    '<div class="cf-meta-grid">'
                    + '<dl class="ss-dock-ro cf-span-full" style="margin:0">'
                    + '<dt>' + tr('caseFiles.officer') + '</dt><dd>' + esc(cf.officerName || '—') + '</dd>'
                    + '<dt>' + tr('caseFiles.device') + '</dt><dd>' + esc(cf.deviceId || '—') + '</dd>'
                    + '<dt>' + tr('caseFiles.sosLink') + '</dt><dd>' + esc(cf.sosIncidentId || '—') + '</dd>'
                    + '</dl></div>'
                    + '<div class="cf-narrative-read">' + esc(cf.narrative || '—') + '</div>'
                ))
                + '<p class="hint cf-meta">' + tr('caseFiles.updated') + ': ' + esc(fmtTime(cf.updatedAt))
                + (cf.createdBy ? ' · ' + esc(cf.createdBy) : '') + '</p>'
                + '</section>'
                + '<section class="cf-linked-evidence">'
                + '<h4>' + tr('caseFiles.linkedEvidence') + '</h4>'
                + (perms.edit ? (
                    '<div class="cf-link-bar">'
                    + '<input type="text" id="cf-link-evidence-id" placeholder="' + esc(tr('caseFiles.evidenceIdPlaceholder')) + '">'
                    + '<button type="button" class="btn btn-action btn-sm" id="cf-link-btn">' + tr('caseFiles.linkEvidence') + '</button>'
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
            bindDetailActions(id, cf.title, evidence.length);
        } catch (err) {
            wrap.innerHTML = '<p class="hint">' + esc(msg(err.opPayload, err)) + '</p>';
        }
    }

    function bindDetailActions(id, caseTitle, evidenceCount) {
        const back = document.getElementById('cf-back');
        if (back) back.addEventListener('click', function () { showList(); loadList(); });
        const save = document.getElementById('cf-save');
        if (save) save.addEventListener('click', function () {
            saveCase(id).catch(function (err) {
                const el = document.getElementById('cf-save-msg');
                if (el) el.textContent = msg(err.opPayload, err);
            });
        });
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
        const msgEl = document.getElementById('cf-save-msg');
        const body = {
            title: document.getElementById('cf-title').value,
            officerName: document.getElementById('cf-officer').value,
            deviceId: document.getElementById('cf-device').value,
            sosIncidentId: document.getElementById('cf-sos').value || null,
            status: document.getElementById('cf-status').value,
            narrative: document.getElementById('cf-narrative').value,
        };
        const res = await fetch('/api/case-files/' + encodeURIComponent(id), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        if (msgEl) msgEl.textContent = tr('caseFiles.saved');
        loadDetail(id);
        loadList();
    }

    async function linkEvidence(caseId, evidenceFileId) {
        const res = await fetch('/api/case-files/' + encodeURIComponent(caseId) + '/evidence', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenceFileId: evidenceFileId }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        loadDetail(caseId);
        loadList();
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
        const incidentId = window.prompt(tr('caseFiles.sosPrompt'));
        if (!incidentId || !incidentId.trim()) return;
        const res = await fetch('/api/case-files/from-sos', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incidentId: incidentId.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throwOp(data);
        showDetail(data.detail.caseFile.id);
        loadList();
    }

    function updateToolbar() {
        const createBtn = document.getElementById('cf-create');
        const sosBtn = document.getElementById('cf-from-sos');
        if (createBtn) createBtn.hidden = !perms.edit;
        if (sosBtn) sosBtn.hidden = !perms.edit;
    }

    function bindUi() {
        bindDeleteModal();
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
                const open = e.target.closest('.cf-open');
                if (open) {
                    showDetail(open.getAttribute('data-case-id'));
                    return;
                }
                const del = e.target.closest('.cf-delete');
                if (del) {
                    confirmDeleteCase(
                        del.getAttribute('data-case-id'),
                        del.getAttribute('data-case-title'),
                        parseInt(del.getAttribute('data-evidence-count'), 10) || 0
                    );
                }
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
        perms.superAdmin = role === 'super_admin';
        updateToolbar();
    }

    function onShow() {
        bindUi();
        updateToolbar();
        if (currentId) {
            updateViewChrome();
            loadDetail(currentId);
        } else {
            showList();
            loadList();
        }
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
            return cf.id + ' — ' + cf.title;
        });
        const pick = window.prompt(tr('caseFiles.selectCasePrompt') + '\n\n' + options.join('\n'), cases[0].id);
        if (!pick || !pick.trim()) return;
        const caseId = pick.trim().split(/\s/)[0];
        await linkEvidence(caseId, evidenceFileId);
        alert(tr('caseFiles.linkDone'));
    }

    global.CaseFilesUi = {
        applyPermissions: applyPermissions,
        onShow: onShow,
        openWithEvidenceLink: openWithEvidenceLink,
        promptAddToCase: promptAddToCase,
        refreshList: loadList,
    };
}(window));
