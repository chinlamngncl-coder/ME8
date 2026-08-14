/**
 * EVIDENCE-DELETE-QUEUE-7D-V1 — Super admin deletion queue panel.
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

    function fmtWhen(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return String(iso);
            return d.toISOString().slice(0, 16).replace('T', ' ');
        } catch (_) {
            return String(iso);
        }
    }

    function renderList(items, queueDays) {
        var tbody = document.getElementById('ev-delete-queue-tbody');
        var empty = document.getElementById('ev-delete-queue-empty');
        var tableWrap = document.getElementById('ev-delete-queue-table-wrap');
        var meta = document.getElementById('ev-delete-queue-meta');
        if (!tbody) return;
        tbody.innerHTML = '';
        var rows = items || [];
        var hasRows = rows.length > 0;
        if (empty) empty.hidden = hasRows;
        if (tableWrap) tableWrap.hidden = !hasRows;
        if (meta) {
            meta.textContent = hasRows
                ? (String(rows.length) + ' · ' + tr('evidenceDeleteQueue.window', 'Purge after') + ' ' + String(queueDays || 7) + 'd')
                : '';
        }
        rows.forEach(function (it) {
            var trEl = document.createElement('tr');
            trEl.innerHTML =
                '<td>' + esc(it.fileName || it.evidenceFileId) + '</td>' +
                '<td class="mono">' + esc(it.deviceId || '—') + '</td>' +
                '<td>' + esc(fmtWhen(it.queuedAt)) + '</td>' +
                '<td>' + esc(fmtWhen(it.purgeAt)) + '</td>' +
                '<td>' + esc(it.queuedBy || '—') + '</td>' +
                '<td class="ev-dq-actions">' +
                '<button type="button" class="btn btn-action btn-sm ev-dq-restore" data-id="' + esc(it.evidenceFileId) + '">' +
                esc(tr('evidenceDeleteQueue.restore', 'Restore')) + '</button> ' +
                '<button type="button" class="btn btn-ghost btn-sm ev-dq-open" data-id="' + esc(it.evidenceFileId) + '">' +
                esc(tr('evidenceHub.open', 'Open')) + '</button></td>';
            tbody.appendChild(trEl);
        });
        tbody.querySelectorAll('.ev-dq-restore').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                if (!id) return;
                fetch('/api/evidence/detail/' + encodeURIComponent(id) + '/restore-from-queue', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                }).then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
                    .then(function (out) {
                        if (!out.res.ok || !out.data.ok) throw new Error((out.data && out.data.error) || 'restore failed');
                        loadList();
                    }).catch(function (err) {
                        window.alert((err && err.message) || 'restore failed');
                    });
            });
        });
        tbody.querySelectorAll('.ev-dq-open').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                if (!id) return;
                if (global.EvidenceHub && EvidenceHub.openDetail) EvidenceHub.openDetail(id);
            });
        });
    }

    async function loadList() {
        try {
            var res = await fetch('/api/evidence/delete-queue', { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'load failed');
            renderList(data.items || [], data.queueDays);
        } catch (err) {
            renderList([]);
            var meta = document.getElementById('ev-delete-queue-meta');
            if (meta) meta.textContent = (err && err.message) || tr('evidenceDeleteQueue.loadFailed', 'Could not load queue');
        }
    }

    async function purgeDue() {
        if (!window.confirm(tr('evidenceDeleteQueue.purgeConfirm', 'Permanently delete files whose 7-day wait is over?'))) return;
        try {
            var res = await fetch('/api/evidence/delete-queue/purge-due', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'purge failed');
            window.alert(tr('evidenceDeleteQueue.purgeDone', 'Purged') + ': ' + String(data.purged || 0));
            loadList();
        } catch (err) {
            window.alert((err && err.message) || 'purge failed');
        }
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        var refresh = document.getElementById('ev-delete-queue-refresh');
        if (refresh) refresh.addEventListener('click', loadList);
        var purge = document.getElementById('ev-delete-queue-purge');
        if (purge) purge.addEventListener('click', purgeDue);
    }

    function onShow() {
        bindUi();
        loadList();
    }

    global.EvidenceDeleteQueueUi = {
        onShow: onShow,
        refresh: loadList,
    };
}(window));
