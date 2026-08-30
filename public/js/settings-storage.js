/**
 * Settings → Storage Targets
 * Strict tier_type ENUM: local_edge | nvr_hdd | nas_archive
 */
(function () {
    'use strict';

    var TIER_OPTIONS = [
        { id: 'local_edge', label: 'Local Edge (NVMe)', role: 'bwc-ingest' },
        { id: 'nvr_hdd', label: 'NVR HDD', role: 'fixed-archive' },
        { id: 'nas_archive', label: 'NAS Archive', role: 'fixed-archive' },
    ];

    var LEGACY_TIER_MAP = {
        'edge-nvme': 'local_edge',
        'nvr-local': 'nvr_hdd',
        'nas-archive': 'nas_archive',
        'ftp-archive': 'nas_archive',
    };

    var state = { volumes: [], editingId: null, bound: false };
    var EMPTY_HINT = 'No storage targets configured yet. Click Add Volume to attach your first tier.';

    function qs(id) { return document.getElementById(id); }

    function tr(key, fallback) {
        try {
            if (window.I18n && typeof window.I18n.t === 'function') {
                var v = window.I18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_e) { /* ignore */ }
        return fallback != null ? fallback : key;
    }

    function parseTierFromNotes(notes) {
        var m = String(notes || '').match(/tier:([a-z0-9_-]+)/i);
        if (!m) return '';
        var key = m[1].toLowerCase();
        return LEGACY_TIER_MAP[key] || key;
    }

    function normalizeTierId(raw, notes) {
        var t = String(raw || '').trim().toLowerCase();
        if (t === 'local_edge' || t === 'nvr_hdd' || t === 'nas_archive') return t;
        if (LEGACY_TIER_MAP[t]) return LEGACY_TIER_MAP[t];
        return parseTierFromNotes(notes) || 'nas_archive';
    }

    function buildNotes(tier, existingNotes) {
        var rest = String(existingNotes || '').replace(/tier:[a-z0-9_-]+\s*/gi, '').trim();
        var out = 'tier:' + tier;
        if (rest) out += ' ' + rest;
        return out.trim();
    }

    function tierLabel(tierId) {
        for (var i = 0; i < TIER_OPTIONS.length; i++) {
            if (TIER_OPTIONS[i].id === tierId) return TIER_OPTIONS[i].label;
        }
        return tierId || '—';
    }

    function roleForTier(tierId) {
        for (var i = 0; i < TIER_OPTIONS.length; i++) {
            if (TIER_OPTIONS[i].id === tierId) return TIER_OPTIONS[i].role;
        }
        return 'fixed-archive';
    }

    function setStatus(msg, isErr) {
        var el = qs('vms-vol-status');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isErr ? '#f87171' : '#94a3b8';
    }

    function setProbeResult(msg, ok) {
        var el = qs('vms-vol-probe-result');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = ok ? '#22c55e' : '#f87171';
    }

    function setModalErr(msg) {
        var el = qs('vms-vol-modal-err');
        if (!el) return;
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    function softApiError(d) {
        if (!d) return tr('errors.generic', 'Something went wrong. Please try again.');
        var e = d.error || d.notice || '';
        if (!e || /relation|SQL|postgres|stack|ENOENT|ECONN/i.test(String(e))) {
            return tr('settings.storage.notReady', 'Storage is not ready yet. Please try again in a moment.');
        }
        return String(e);
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function loadVolumes() {
        setStatus(tr('settings.storage.checking', 'Checking storage targets…'), false);
        try {
            var r = await fetch('/api/vms/volumes', { credentials: 'same-origin' });
            var d = await r.json().catch(function () { return { ok: true, volumes: [] }; });
            state.volumes = Array.isArray(d.volumes) ? d.volumes : [];
            renderTable();
            if (!d.ok && !state.volumes.length) {
                setStatus(softApiError(d), true);
            } else if (!state.volumes.length) {
                setStatus(tr('settings.storage.readyEmpty', 'Ready when you are — add your first target above.'), false);
            } else {
                setStatus(state.volumes.length + (state.volumes.length === 1 ? ' target connected' : ' targets connected'), false);
            }
        } catch (_e) {
            state.volumes = [];
            renderTable();
            setStatus(tr('settings.storage.loadFail', 'Could not reach storage settings. Please refresh and try again.'), true);
        }
    }

    function renderTable() {
        var tbody = qs('vms-vol-tbody');
        if (!tbody) return;
        if (!state.volumes.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="setup-hint" style="padding:14px 0">' + EMPTY_HINT + '</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        state.volumes.forEach(function (v) {
            var tier = normalizeTierId(v.tier_type || v.tierType, v.notes);
            var trEl = document.createElement('tr');
            trEl.innerHTML =
                '<td>' + esc(v.name) + '</td>' +
                '<td>' + esc(tierLabel(tier)) + '</td>' +
                '<td><code>' + esc(v.role) + '</code></td>' +
                '<td>' + (v.threshold_pct != null ? v.threshold_pct + '%' : '85%') + '</td>' +
                '<td>' + (v.retention_days != null ? v.retention_days + ' days' : tr('settings.storage.noLimit', 'No limit')) + '</td>' +
                '<td style="white-space:nowrap">' +
                    '<button type="button" class="btn btn-ghost btn-sm" data-vms-edit="' + esc(v.id) + '">' +
                        tr('settings.storage.btnEdit', 'Edit') + '</button> ' +
                    '<button type="button" class="btn btn-ghost btn-sm" style="color:#f87171" data-vms-del="' + esc(v.id) + '">' +
                        tr('settings.storage.btnRemove', 'Remove') + '</button>' +
                '</td>';
            tbody.appendChild(trEl);
        });
    }

    function clearFormFields() {
        if (qs('vms-vol-name')) qs('vms-vol-name').value = '';
        if (qs('vms-vol-tier')) qs('vms-vol-tier').value = 'nas_archive';
        if (qs('vms-vol-role')) qs('vms-vol-role').value = 'fixed-archive';
        if (qs('vms-vol-threshold')) qs('vms-vol-threshold').value = '85';
        if (qs('vms-vol-path')) qs('vms-vol-path').value = '';
        if (qs('vms-vol-retention')) qs('vms-vol-retention').value = '';
        setModalErr('');
        setProbeResult('', true);
    }

    function syncRoleFromTier() {
        var tierEl = qs('vms-vol-tier');
        var roleEl = qs('vms-vol-role');
        if (!tierEl || !roleEl) return;
        roleEl.value = roleForTier(tierEl.value);
    }

    function openModal(editId) {
        state.editingId = editId || null;
        var modal = qs('vms-vol-modal');
        if (!modal) return;
        setModalErr('');
        setProbeResult('', true);
        var title = qs('vms-vol-modal-title');
        if (title) {
            title.textContent = editId
                ? tr('settings.storage.modalEdit', 'Edit Storage Target')
                : tr('settings.storage.modalAdd', 'Add Storage Target');
        }

        if (editId) {
            var v = state.volumes.find(function (x) { return x.id === editId; });
            if (v) {
                var tier = normalizeTierId(v.tier_type || v.tierType, v.notes);
                if (qs('vms-vol-name')) qs('vms-vol-name').value = v.name || '';
                if (qs('vms-vol-tier')) qs('vms-vol-tier').value = tier;
                if (qs('vms-vol-role')) qs('vms-vol-role').value = v.role || roleForTier(tier);
                if (qs('vms-vol-threshold')) qs('vms-vol-threshold').value = v.threshold_pct != null ? v.threshold_pct : 85;
                if (qs('vms-vol-path')) qs('vms-vol-path').value = '';
                if (qs('vms-vol-retention')) qs('vms-vol-retention').value = v.retention_days != null ? v.retention_days : '';
            } else {
                clearFormFields();
            }
        } else {
            clearFormFields();
            syncRoleFromTier();
        }

        modal.hidden = false;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        if (qs('vms-vol-name')) qs('vms-vol-name').focus();
        try { modal.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_e) { /* ignore */ }
    }

    function closeModal() {
        var modal = qs('vms-vol-modal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.hidden = true;
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = '';
        }
        state.editingId = null;
        setModalErr('');
        setProbeResult('', true);
        var saveBtn = qs('vms-vol-save-btn');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = tr('settings.storage.btnSave', 'Save Volume'); }
        var probeBtn = qs('vms-vol-probe-btn');
        if (probeBtn) probeBtn.disabled = false;
        clearFormFields();
    }

    async function probeMount() {
        var mountPath = qs('vms-vol-path') ? qs('vms-vol-path').value.trim() : '';
        if (!mountPath) {
            setProbeResult(tr('settings.storage.probeNeedPath', 'Enter a path first, then test the connection.'), false);
            return;
        }
        setProbeResult(tr('settings.storage.probeTesting', 'Testing connection…'), true);
        var btn = qs('vms-vol-probe-btn');
        if (btn) btn.disabled = true;
        try {
            var r = await fetch('/api/vms/volumes/probe', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mount_path: mountPath }),
            });
            var d = await r.json();
            if (d.ok) {
                var info = d.probe || d;
                var msg = tr('settings.storage.probeOk', 'Path looks good');
                if (info.freeGb != null) msg += ' — about ' + Number(info.freeGb).toFixed(1) + ' GB free';
                setProbeResult(msg, true);
            } else {
                setProbeResult(softApiError(d) || tr('settings.storage.probeFail', 'That path could not be reached.'), false);
            }
        } catch (_e) {
            setProbeResult(tr('settings.storage.probeErr', 'Could not test this path right now.'), false);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function saveVolume() {
        var name = qs('vms-vol-name') ? qs('vms-vol-name').value.trim() : '';
        var tier = qs('vms-vol-tier') ? qs('vms-vol-tier').value : 'nas_archive';
        var role = qs('vms-vol-role') ? qs('vms-vol-role').value : roleForTier(tier);
        var mountPath = qs('vms-vol-path') ? qs('vms-vol-path').value.trim() : '';
        var threshold = qs('vms-vol-threshold') ? Number(qs('vms-vol-threshold').value) : 85;
        var retDays = qs('vms-vol-retention') ? qs('vms-vol-retention').value.trim() : '';

        if (!name) { setModalErr(tr('settings.storage.errName', 'Please give this target a name.')); return; }
        if (!mountPath && !state.editingId) {
            setModalErr(tr('settings.storage.errPath', 'Please enter the server mount path.')); return;
        }
        if (isNaN(threshold) || threshold < 50 || threshold > 99) {
            setModalErr(tr('settings.storage.errThreshold', 'Disk pressure threshold should be between 50 and 99.')); return;
        }

        var existingNotes = '';
        if (state.editingId) {
            var ev = state.volumes.find(function (x) { return x.id === state.editingId; });
            if (ev) existingNotes = ev.notes || '';
        }

        var payload = {
            name: name,
            role: role,
            tier_type: normalizeTierId(tier, existingNotes),
            threshold_pct: threshold,
            retention_days: retDays ? Number(retDays) : null,
            notes: buildNotes(normalizeTierId(tier, existingNotes), existingNotes),
        };
        if (mountPath) payload.mount_path = mountPath;

        var saveBtn = qs('vms-vol-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = tr('settings.storage.saving', 'Saving…'); }
        setModalErr('');
        try {
            var url = state.editingId
                ? '/api/vms/volumes/' + encodeURIComponent(state.editingId)
                : '/api/vms/volumes';
            var method = state.editingId ? 'PUT' : 'POST';
            var r = await fetch(url, {
                method: method, credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            var d = await r.json();
            if (!d.ok) throw new Error(softApiError(d));
            closeModal();
            await loadVolumes();
        } catch (e) {
            setModalErr(e.message || tr('settings.storage.saveFail', 'Could not save. Check the path and try again.'));
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = tr('settings.storage.btnSave', 'Save Volume');
            }
        }
    }

    async function deleteVolume(id) {
        if (!id || !window.confirm(tr('settings.storage.confirmRemove', 'Remove this storage target from Axiom? Files on the NAS are not deleted.'))) return;
        try {
            var r = await fetch('/api/vms/volumes/' + encodeURIComponent(id), {
                method: 'DELETE', credentials: 'same-origin',
            });
            var d = await r.json();
            if (!d.ok) throw new Error(softApiError(d));
            await loadVolumes();
        } catch (_e) {
            setStatus(tr('settings.storage.removeFail', 'Could not remove that target. Please try again.'), true);
        }
    }

    function bindOnce() {
        if (state.bound) return;
        state.bound = true;

        document.addEventListener('change', function (e) {
            if (e.target && e.target.id === 'vms-vol-tier') syncRoleFromTier();
        });

        document.addEventListener('click', function (e) {
            var t = e.target;
            if (!t || !t.closest) return;
            if (t.closest('#vms-vol-add-btn')) {
                e.preventDefault();
                openModal(null);
                return;
            }
            if (t.closest('#vms-vol-cancel-btn')) {
                e.preventDefault();
                closeModal();
                return;
            }
            if (t.closest('#vms-vol-save-btn')) {
                e.preventDefault();
                saveVolume();
                return;
            }
            if (t.closest('#vms-vol-probe-btn')) {
                e.preventDefault();
                probeMount();
                return;
            }
            var edit = t.closest('[data-vms-edit]');
            if (edit) {
                e.preventDefault();
                openModal(edit.getAttribute('data-vms-edit'));
                return;
            }
            var del = t.closest('[data-vms-del]');
            if (del) {
                e.preventDefault();
                deleteVolume(del.getAttribute('data-vms-del'));
                return;
            }
        });

        document.addEventListener('keydown', function (e) {
            var modal = qs('vms-vol-modal');
            if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
                e.preventDefault();
                closeModal();
            }
        });
    }

    function init() {
        bindOnce();
        var modal = qs('vms-vol-modal');
        if (modal) modal.setAttribute('aria-hidden', 'true');
        loadVolumes();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.VmsVolumeUi = { reload: loadVolumes, openAdd: function () { openModal(null); } };
})();
