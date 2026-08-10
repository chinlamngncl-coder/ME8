/**
 * EVIDENCE-RETENTION-CATEGORIES-V1 — Evidence → Retention (Super admin).
 */
(function (global) {
    'use strict';

    var bound = false;

    function tr(key, fallback) {
        try {
            if (global.I18n && typeof I18n.t === 'function') {
                var v = I18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback != null ? fallback : key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isSuperAdmin() {
        return global.__fmDashboardRole === 'super_admin';
    }

    function retentionLabel(c) {
        if (!c) return '—';
        if (c.mode === 'until_manual') {
            return tr('evidenceRetention.untilManual', 'Until manually deleted');
        }
        return String(c.days || '—') + ' ' + tr('evidenceRetention.daysUnit', 'days');
    }

    function syncModeUi() {
        var mode = document.getElementById('ev-retention-mode');
        var daysWrap = document.getElementById('ev-retention-days-wrap');
        if (!mode || !daysWrap) return;
        daysWrap.hidden = mode.value === 'until_manual';
    }

    function clearForm() {
        var idEl = document.getElementById('ev-retention-edit-id');
        var nameEl = document.getElementById('ev-retention-name');
        var modeEl = document.getElementById('ev-retention-mode');
        var daysEl = document.getElementById('ev-retention-days');
        var title = document.getElementById('ev-retention-form-title');
        if (idEl) idEl.value = '';
        if (nameEl) nameEl.value = '';
        if (modeEl) modeEl.value = 'days';
        if (daysEl) daysEl.value = '90';
        if (title) title.textContent = tr('evidenceRetention.addTitle', 'Add category');
        syncModeUi();
    }

    function fillForm(c) {
        var idEl = document.getElementById('ev-retention-edit-id');
        var nameEl = document.getElementById('ev-retention-name');
        var modeEl = document.getElementById('ev-retention-mode');
        var daysEl = document.getElementById('ev-retention-days');
        var title = document.getElementById('ev-retention-form-title');
        if (!c) return clearForm();
        if (idEl) idEl.value = c.id || '';
        if (nameEl) nameEl.value = c.name || '';
        if (modeEl) modeEl.value = c.mode === 'until_manual' ? 'until_manual' : 'days';
        if (daysEl) daysEl.value = c.mode === 'days' ? String(c.days || 90) : '90';
        if (title) title.textContent = tr('evidenceRetention.editTitle', 'Edit category');
        syncModeUi();
    }

    function renderList(categories) {
        var tbody = document.getElementById('ev-retention-tbody');
        var empty = document.getElementById('ev-retention-empty');
        if (!tbody) return;
        tbody.innerHTML = '';
        var rows = categories || [];
        if (empty) empty.hidden = rows.length > 0;
        rows.forEach(function (c) {
            var trEl = document.createElement('tr');
            trEl.innerHTML =
                '<td>' + esc(c.name) + '</td>' +
                '<td>' + esc(retentionLabel(c)) + '</td>' +
                '<td class="ev-retention-actions">' +
                '<button type="button" class="btn btn-ghost btn-sm ev-retention-edit" data-id="' + esc(c.id) + '">' +
                esc(tr('common.edit', 'Edit')) + '</button> ' +
                '<button type="button" class="btn btn-ghost btn-sm ev-retention-del" data-id="' + esc(c.id) + '">' +
                esc(tr('common.delete', 'Delete')) + '</button></td>';
            tbody.appendChild(trEl);
        });
        tbody.querySelectorAll('.ev-retention-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                var hit = rows.find(function (r) { return r && r.id === id; });
                fillForm(hit);
            });
        });
        tbody.querySelectorAll('.ev-retention-del').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                if (!id) return;
                if (!window.confirm(tr('evidenceRetention.deleteConfirm', 'Delete this retention category?'))) return;
                fetch('/api/evidence/retention-categories/' + encodeURIComponent(id), {
                    method: 'DELETE',
                    credentials: 'same-origin',
                }).then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
                    .then(function (out) {
                        if (!out.res.ok || !out.data.ok) throw new Error((out.data && out.data.error) || 'delete failed');
                        clearForm();
                        renderList(out.data.categories || []);
                    }).catch(function (err) {
                        window.alert((err && err.message) || 'delete failed');
                    });
            });
        });
    }

    async function loadList() {
        var meta = document.getElementById('ev-retention-meta');
        try {
            var res = await fetch('/api/evidence/retention-categories', { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'load failed');
            renderList(data.categories || []);
            if (meta) meta.textContent = '';
        } catch (err) {
            renderList([]);
            if (meta) meta.textContent = (err && err.message) || tr('evidenceRetention.loadFailed', 'Could not load categories');
        }
    }

    async function saveForm() {
        if (!isSuperAdmin()) {
            window.alert(tr('evidenceRetention.needAdmin', 'Super admin required to edit retention categories.'));
            return;
        }
        var idEl = document.getElementById('ev-retention-edit-id');
        var nameEl = document.getElementById('ev-retention-name');
        var modeEl = document.getElementById('ev-retention-mode');
        var daysEl = document.getElementById('ev-retention-days');
        var body = {
            name: nameEl ? String(nameEl.value || '').trim() : '',
            mode: modeEl ? modeEl.value : 'days',
            days: daysEl ? parseInt(daysEl.value, 10) : 90,
        };
        if (!body.name) {
            window.alert(tr('evidenceRetention.nameRequired', 'Enter a category name.'));
            return;
        }
        var editId = idEl ? String(idEl.value || '').trim() : '';
        var url = editId
            ? ('/api/evidence/retention-categories/' + encodeURIComponent(editId))
            : '/api/evidence/retention-categories';
        var method = editId ? 'PATCH' : 'POST';
        try {
            var res = await fetch(url, {
                method: method,
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'save failed');
            clearForm();
            renderList(data.categories || []);
        } catch (err) {
            window.alert((err && err.message) || 'save failed');
        }
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        var mode = document.getElementById('ev-retention-mode');
        if (mode) mode.addEventListener('change', syncModeUi);
        var save = document.getElementById('ev-retention-save');
        if (save) save.addEventListener('click', saveForm);
        var cancel = document.getElementById('ev-retention-cancel');
        if (cancel) cancel.addEventListener('click', clearForm);
        var refresh = document.getElementById('ev-retention-refresh');
        if (refresh) refresh.addEventListener('click', loadList);
        syncModeUi();
    }

    function onShow() {
        bindUi();
        var form = document.getElementById('ev-retention-form');
        if (form) form.hidden = !isSuperAdmin();
        loadList();
    }

    global.EvidenceRetentionUi = {
        onShow: onShow,
        refresh: loadList,
    };
}(window));
