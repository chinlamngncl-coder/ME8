/**
 * Dashboard Auth — dispatch group management (super admin).
 */
(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    var PRESET_COLORS = [
        '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444',
        '#06b6d4', '#ec4899', '#eab308', '#6366f1', '#14b8a6',
    ];

    let groups = [];
    let editingId = null;
    let uiBound = false;

    function applyLookupToMap(lookup) {
        global.dispatchGroupLookup = lookup || { byDevice: {}, byName: {}, groups: [] };
        if (typeof global.onDispatchGroupsUpdated === 'function') {
            global.onDispatchGroupsUpdated(global.dispatchGroupLookup);
        }
    }

    async function fetchGroups() {
        const res = await fetch('/api/dispatch-groups');
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Could not load groups');
        groups = data.groups || [];
        applyLookupToMap(data.lookup);
        return groups;
    }

    function registeredBwcs() {
        if (!global.BwcDevices || !BwcDevices.listDevices) return [];
        return BwcDevices.listDevices().filter(function (d) { return d && d.deviceId; });
    }

    function bwcPickOptionsHtml(selectedId) {
        var opts = '<option value="">' + esc(tr('groups.pickBwc')) + '</option>';
        registeredBwcs().forEach(function (d) {
            var label = (d.operatorName ? d.operatorName + ' — ' : '') + d.deviceId;
            opts += '<option value="' + esc(d.deviceId) + '" data-name="' + esc(d.operatorName || '') + '"'
                + (d.deviceId === selectedId ? ' selected' : '') + '>' + esc(label) + '</option>';
        });
        return opts;
    }

    function renderGroupList() {
        const el = document.getElementById('ss-groups-list');
        if (!el) return;
        if (!groups.length) {
            el.innerHTML = '<p class="setup-hint">' + esc(tr('groups.empty')) + '</p>';
            return;
        }
        el.innerHTML = groups.map(function (g) {
            return '<div class="ss-group-card" data-group-id="' + esc(g.id) + '">'
                + '<span class="ss-group-dot" style="background:' + esc(g.color) + '"></span>'
                + '<div class="ss-group-card-main">'
                + '<strong>' + esc(g.name) + '</strong>'
                + '<span class="hint">' + g.memberCount + ' ' + tr('groups.members') + '</span>'
                + '</div>'
                + '<button type="button" class="ss-group-view" data-group-id="' + esc(g.id) + '">' + tr('groups.view') + '</button>'
                + '<button type="button" class="ss-group-edit" data-group-id="' + esc(g.id) + '">' + tr('common.edit') + '</button>'
                + '<button type="button" class="ss-group-del" data-group-id="' + esc(g.id) + '">' + tr('groups.delete') + '</button>'
                + '</div>';
        }).join('');
    }

    function updateColorPreview() {
        var colorEl = document.getElementById('ss-group-edit-color');
        var preview = document.getElementById('ss-group-color-preview');
        var color = (colorEl && colorEl.value) ? colorEl.value : '#22c55e';
        if (preview) preview.style.background = color;
        document.querySelectorAll('.ss-color-preset').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-color').toLowerCase() === color.toLowerCase());
        });
    }

    function buildColorPresets() {
        var wrap = document.getElementById('ss-group-color-presets');
        if (!wrap) return;
        wrap.innerHTML = PRESET_COLORS.map(function (c) {
            return '<button type="button" class="ss-color-preset" data-color="' + c + '" style="background:' + c + '" title="' + c + '"></button>';
        }).join('');
    }

    function memberRowHtml(m) {
        m = m || {};
        return '<tr class="ss-gm-row">'
            + '<td><select class="ss-gm-pick">' + bwcPickOptionsHtml(m.deviceId || '') + '</select>'
            + '<input type="text" class="ss-gm-nick" value="' + esc(m.nickname || '') + '" placeholder="' + esc(tr('groups.nickname')) + '"></td>'
            + '<td><input type="text" class="ss-gm-device" value="' + esc(m.deviceId || '') + '" placeholder="' + esc(tr('groups.deviceId')) + '"></td>'
            + '<td><input type="text" class="ss-gm-user" value="' + esc(m.dashboardUsername || '') + '" placeholder="' + esc(tr('groups.dashUserOptional')) + '"></td>'
            + '<td><button type="button" class="ss-gm-rm" title="Remove">×</button></td>'
            + '</tr>';
    }

    function bindMemberRowEvents(row) {
        if (!row) return;
        var pick = row.querySelector('.ss-gm-pick');
        if (pick) {
            pick.addEventListener('change', function () {
                var opt = pick.options[pick.selectedIndex];
                if (!opt || !opt.value) return;
                var nick = row.querySelector('.ss-gm-nick');
                var dev = row.querySelector('.ss-gm-device');
                if (dev) dev.value = opt.value;
                if (nick && !nick.value.trim()) nick.value = opt.getAttribute('data-name') || '';
            });
        }
    }

    function updateMembersEmptyHint() {
        var tbody = document.getElementById('ss-group-members-body');
        var hint = document.getElementById('ss-group-members-empty');
        if (!hint) return;
        var count = tbody ? tbody.querySelectorAll('tr').length : 0;
        hint.hidden = count > 0;
    }

    function renderMemberRows(rows) {
        var tbody = document.getElementById('ss-group-members-body');
        if (!tbody) return;
        var list = rows && rows.length ? rows : [{ nickname: '', deviceId: '', dashboardUsername: '' }];
        tbody.innerHTML = list.map(function (m) { return memberRowHtml(m); }).join('');
        tbody.querySelectorAll('.ss-gm-row').forEach(bindMemberRowEvents);
        updateMembersEmptyHint();
    }

    function addMemberRow(nickname, deviceId, dashboardUsername) {
        var tbody = document.getElementById('ss-group-members-body');
        if (!tbody) return;
        var tmp = document.createElement('tbody');
        tmp.innerHTML = memberRowHtml({
            nickname: nickname || '',
            deviceId: deviceId || '',
            dashboardUsername: dashboardUsername || '',
        });
        var row = tmp.querySelector('tr');
        if (!row) return;
        tbody.appendChild(row);
        bindMemberRowEvents(row);
        updateMembersEmptyHint();
    }

    function clearEditor() {
        editingId = null;
        var idEl = document.getElementById('ss-group-edit-id');
        var nameEl = document.getElementById('ss-group-edit-name');
        var colorEl = document.getElementById('ss-group-edit-color');
        if (idEl) idEl.value = '';
        if (nameEl) nameEl.value = '';
        if (colorEl) colorEl.value = '#22c55e';
        renderMemberRows([]);
        updateColorPreview();
    }

    function readEditorGroup() {
        const name = (document.getElementById('ss-group-edit-name') || {}).value.trim();
        const color = (document.getElementById('ss-group-edit-color') || {}).value || '#22c55e';
        const id = (document.getElementById('ss-group-edit-id') || {}).value.trim();
        const members = [];
        document.querySelectorAll('#ss-group-members-body tr').forEach(function (row) {
            const nickname = (row.querySelector('.ss-gm-nick') || {}).value.trim();
            const deviceId = (row.querySelector('.ss-gm-device') || {}).value.trim();
            const dashboardUsername = (row.querySelector('.ss-gm-user') || {}).value.trim();
            if (!nickname && !deviceId) return;
            members.push({
                nickname: nickname,
                deviceId: deviceId,
                dashboardUsername: dashboardUsername || null,
            });
        });
        return {
            id: id || undefined,
            name: name,
            color: color,
            members: members,
        };
    }

    async function openEditor(group) {
        if (global.BwcDevices && BwcDevices.load) {
            try { await BwcDevices.load(); } catch (_) { /* ignore */ }
        }
        var panel = document.getElementById('ss-group-editor');
        var titleEl = document.getElementById('ss-group-editor-title');
        if (panel) panel.hidden = false;
        if (titleEl) {
            titleEl.textContent = group ? tr('groups.editorTitle') : tr('groups.newGroupTitle');
        }
        clearEditor();
        buildColorPresets();
        if (!group) {
            renderMemberRows([{ nickname: '', deviceId: '', dashboardUsername: '' }]);
            updateColorPreview();
            if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        editingId = group.id;
        document.getElementById('ss-group-edit-id').value = group.id;
        document.getElementById('ss-group-edit-name').value = group.name;
        document.getElementById('ss-group-edit-color').value = group.color || '#22c55e';
        var members = group.members && group.members.length
            ? group.members.slice()
            : [{ nickname: '', deviceId: '', dashboardUsername: '' }];
        renderMemberRows(members);
        updateColorPreview();
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closeEditor() {
        var panel = document.getElementById('ss-group-editor');
        if (panel) panel.hidden = true;
        clearEditor();
    }

    function showGroupMembers(groupId) {
        const g = groups.find(function (x) { return x.id === groupId; });
        if (!g) return;
        const backdrop = document.getElementById('ss-group-view-backdrop');
        const title = document.getElementById('ss-group-view-title');
        const body = document.getElementById('ss-group-view-body');
        if (!backdrop || !body) return;
        if (backdrop.parentElement !== document.body) {
            document.body.appendChild(backdrop);
        }
        backdrop.style.zIndex = '25000';
        if (title) title.textContent = g.name;
        body.innerHTML = '<p class="setup-hint">' + esc(tr('groups.viewHint')) + '</p><ul class="ss-group-view-list">'
            + (g.members || []).map(function (m) {
                const st = m.online ? tr('groups.online') : tr('groups.offline');
                return '<li><span class="ss-group-dot" style="background:' + esc(g.color) + '"></span>'
                    + '<strong>' + esc(m.nickname || '—') + '</strong>'
                    + (m.deviceId ? ' <code>' + esc(m.deviceId) + '</code>' : '')
                    + ' <span class="hint">(' + st + ')</span></li>';
            }).join('') + '</ul>';
        backdrop.hidden = false;
    }

    async function saveEditor() {
        const group = readEditorGroup();
        if (!group.name) {
            alert(tr('groups.nameRequired'));
            return;
        }
        const payload = global.AuthReverify && AuthReverify.withReverify
            ? await AuthReverify.withReverify({ group: group })
            : { group: group };
        const res = await fetch('/api/dispatch-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Save failed');
        groups = data.groups || [];
        applyLookupToMap(data.lookup);
        renderGroupList();
        closeEditor();
        if (global.BwcDevices && BwcDevices.load) await BwcDevices.load();
        if (global.BwcDevices && BwcDevices.refreshGroupOptions) await BwcDevices.refreshGroupOptions();
        if (global.BwcDevices && BwcDevices.buildEmbeddedTable) BwcDevices.buildEmbeddedTable();
        if (typeof global.refreshAllDeviceMarkerStyles === 'function') global.refreshAllDeviceMarkerStyles();
        alert(tr('groups.saved'));
    }

    async function deleteGroup(id) {
        const g = groups.find(function (x) { return x.id === id; });
        if (!g) return;
        if (!window.confirm(tr('groups.deleteConfirm', { name: g.name }))) return;
        const payload = global.AuthReverify && AuthReverify.withReverify
            ? await AuthReverify.withReverify({})
            : {};
        const res = await fetch('/api/dispatch-groups/' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Delete failed');
        groups = data.groups || [];
        await fetchGroups();
        renderGroupList();
    }

    function bindUi() {
        if (uiBound) return;
        uiBound = true;
        buildColorPresets();

        const dl = document.getElementById('ss-groups-download-csv');
        if (dl) {
            dl.addEventListener('click', function () {
                window.location.href = '/api/dispatch-groups/template.csv';
            });
        }
        const file = document.getElementById('ss-groups-csv-file');
        const importBtn = document.getElementById('ss-groups-import-csv');
        if (importBtn && file) {
            importBtn.addEventListener('click', function () { file.click(); });
            file.addEventListener('change', async function () {
                const f = file.files && file.files[0];
                file.value = '';
                if (!f) return;
                try {
                    const text = await f.text();
                    const payload = global.AuthReverify && AuthReverify.withReverify
                        ? await AuthReverify.withReverify({ csv: text })
                        : { csv: text };
                    const res = await fetch('/api/dispatch-groups/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Import failed');
                    groups = data.groups || [];
                    applyLookupToMap(data.lookup);
                    renderGroupList();
                    if (global.BwcDevices && BwcDevices.load) await BwcDevices.load();
                    if (global.BwcDevices && BwcDevices.refreshGroupOptions) await BwcDevices.refreshGroupOptions();
                    if (global.BwcDevices && BwcDevices.buildEmbeddedTable) BwcDevices.buildEmbeddedTable();
                    if (typeof global.refreshAllDeviceMarkerStyles === 'function') global.refreshAllDeviceMarkerStyles();
                    alert(tr('groups.imported', { n: data.imported }));
                } catch (err) {
                    alert(err.message || 'Import failed');
                }
            });
        }

        const addBtn = document.getElementById('ss-groups-add');
        if (addBtn) addBtn.addEventListener('click', function () { openEditor(null); });

        const editor = document.getElementById('ss-group-editor');
        if (editor) {
            editor.addEventListener('click', function (e) {
                if (e.target.id === 'ss-group-add-member' || e.target.closest('#ss-group-add-member')) {
                    e.preventDefault();
                    addMemberRow('', '', '');
                    return;
                }
                if (e.target.matches('.ss-color-preset')) {
                    e.preventDefault();
                    var c = e.target.getAttribute('data-color');
                    var colorEl = document.getElementById('ss-group-edit-color');
                    if (colorEl && c) colorEl.value = c;
                    updateColorPreview();
                    return;
                }
                if (e.target.matches('.ss-gm-rm')) {
                    e.preventDefault();
                    var row = e.target.closest('tr');
                    if (row) row.remove();
                    var tbody = document.getElementById('ss-group-members-body');
                    if (tbody && !tbody.querySelector('tr')) addMemberRow('', '', '');
                    updateMembersEmptyHint();
                }
            });
        }

        const colorEl = document.getElementById('ss-group-edit-color');
        if (colorEl) {
            colorEl.addEventListener('input', updateColorPreview);
            colorEl.addEventListener('change', updateColorPreview);
        }

        const saveBtn = document.getElementById('ss-group-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                saveEditor().catch(function (err) { alert(err.message); });
            });
        }
        const cancelBtn = document.getElementById('ss-group-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);

        const list = document.getElementById('ss-groups-list');
        if (list) {
            list.addEventListener('click', function (e) {
                const viewBtn = e.target.closest('.ss-group-view');
                const editBtn = e.target.closest('.ss-group-edit');
                const delBtn = e.target.closest('.ss-group-del');
                const id = (viewBtn || editBtn || delBtn || e.target).getAttribute('data-group-id');
                if (!id) return;
                if (editBtn || e.target.matches('.ss-group-edit')) {
                    const g = groups.find(function (x) { return x.id === id; });
                    openEditor(g || null);
                } else if (delBtn || e.target.matches('.ss-group-del')) {
                    deleteGroup(id).catch(function (err) { alert(err.message); });
                } else if (viewBtn || e.target.matches('.ss-group-view')) {
                    showGroupMembers(id);
                }
            });
        }
        const viewClose = document.getElementById('ss-group-view-close');
        const viewBackdrop = document.getElementById('ss-group-view-backdrop');
        if (viewClose && viewBackdrop) {
            viewClose.addEventListener('click', function () { viewBackdrop.hidden = true; });
            viewBackdrop.addEventListener('click', function (e) {
                if (e.target.id === 'ss-group-view-backdrop') viewBackdrop.hidden = true;
            });
        }
    }

    async function load() {
        bindUi();
        await fetchGroups();
        renderGroupList();
    }

    function init() {
        bindUi();
    }

    global.DispatchGroupsAdmin = { init: init, load: load, fetchGroups: fetchGroups };
})(window);
