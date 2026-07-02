/**
 * Video wall — which BWC plays on each of 6 panels (panels 5–6 poll overflow).
 * Names and map groups live in bwc-devices.js (unlimited list).
 */
(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    const SLOT_COUNT = 6;
    /** Panels 5–6 (0-based slots 4–5) rotate through BWCs not fixed on panels 1–4. */
    const POLL_SLOT_START = 4;
    const CSV_HEADER = ['Panel', 'Mode', 'Device ID', 'Map group', 'Device list', 'Rotate sec'];
    let channels = defaultChannels();
    let open = false;

    function defaultChannels() {
        return Array.from({ length: SLOT_COUNT }, (_, slot) => ({
            slot,
            sourceMode: slot >= POLL_SLOT_START ? 'overflow' : 'none',
            operatorName: '',
            deviceId: '',
            mapGroup: '',
            deviceIds: [],
            rotateSec: 30,
            userName: '',
            password: '',
            protocol: 'sip',
        }));
    }

    const rotationIndex = new Array(SLOT_COUNT).fill(0);

    function normalizeChannel(ch, slot) {
        const row = ch || {};
        let sourceMode = String(row.sourceMode || '').toLowerCase();
        if (!sourceMode) sourceMode = row.deviceId ? 'fixed' : 'none';
        if (!['fixed', 'group', 'all', 'list', 'overflow', 'none'].includes(sourceMode)) sourceMode = 'fixed';
        let deviceIds = [];
        if (Array.isArray(row.deviceIds)) deviceIds = row.deviceIds.map(String).filter(Boolean);
        else if (row.deviceIds) {
            deviceIds = String(row.deviceIds).split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
        }
        return {
            slot,
            sourceMode,
            operatorName: String(row.operatorName || '').trim(),
            deviceId: String(row.deviceId || '').trim(),
            mapGroup: String(row.mapGroup || '').trim(),
            deviceIds,
            rotateSec: Math.max(5, parseInt(row.rotateSec, 10) || 30),
            userName: String(row.userName || '').trim(),
            password: String(row.password != null ? row.password : ''),
            protocol: String(row.protocol || 'sip').toLowerCase() === 'onvif' ? 'onvif' : 'sip',
        };
    }

    function isRotatingMode(mode) {
        return mode === 'group' || mode === 'all' || mode === 'list' || mode === 'overflow';
    }

    function fixedWallDeviceIds(excludeSlot) {
        const ids = new Set();
        for (let i = 0; i < POLL_SLOT_START; i += 1) {
            if (i === excludeSlot) continue;
            const ch = getChannel(i);
            if (ch && ch.sourceMode === 'fixed' && ch.deviceId) ids.add(ch.deviceId);
        }
        return ids;
    }

    function buildOverflowQueue(slot) {
        const exclude = fixedWallDeviceIds(slot);
        const list = global.BwcDevices && BwcDevices.listDevices ? BwcDevices.listDevices() : [];
        return list.filter(function (d) {
            return d.deviceId && deviceOnline(d.deviceId) && !exclude.has(d.deviceId);
        }).map(function (d) { return d.deviceId; });
    }

    function pollSlotOffset(slot, qLen) {
        if (qLen <= 1 || slot < POLL_SLOT_START) return 0;
        return (slot - POLL_SLOT_START) % qLen;
    }

    function deviceOnline(deviceId) {
        if (!deviceId || !global.FleetUi || !FleetUi.getDeviceState) return false;
        return !!FleetUi.getDeviceState(deviceId).online;
    }

    function listMapGroups() {
        const groups = new Set();
        const list = global.BwcDevices && BwcDevices.listDevices ? BwcDevices.listDevices() : [];
        list.forEach((d) => {
            const g = String(d.mapGroup || '').trim();
            if (g) groups.add(g);
        });
        return Array.from(groups).sort(function (a, b) { return a.localeCompare(b); });
    }

    function buildQueueForChannel(ch) {
        if (!ch) return [];
        const list = global.BwcDevices && BwcDevices.listDevices ? BwcDevices.listDevices() : [];
        if (ch.sourceMode === 'fixed') return ch.deviceId ? [ch.deviceId] : [];
        if (ch.sourceMode === 'all') {
            return list.filter(function (d) { return d.deviceId && deviceOnline(d.deviceId); })
                .map(function (d) { return d.deviceId; });
        }
        if (ch.sourceMode === 'group') {
            const g = String(ch.mapGroup || '').trim().toLowerCase();
            if (!g) return [];
            return list.filter(function (d) {
                return d.deviceId && deviceOnline(d.deviceId)
                    && String(d.mapGroup || '').trim().toLowerCase() === g;
            }).map(function (d) { return d.deviceId; });
        }
        if (ch.sourceMode === 'list') {
            return (ch.deviceIds || []).filter(function (id) { return deviceOnline(id); });
        }
        if (ch.sourceMode === 'overflow') return buildOverflowQueue(ch.slot);
        return [];
    }

    function getActiveDeviceForSlot(slot) {
        const ch = getChannel(slot);
        if (!ch) return '';
        if (ch.sourceMode === 'fixed') return ch.deviceId || '';
        if (!isRotatingMode(ch.sourceMode)) return '';
        const q = buildQueueForChannel(ch);
        if (!q.length) return '';
        const idx = (rotationIndex[slot] + pollSlotOffset(slot, q.length)) % q.length;
        return q[idx];
    }

    function panelHasRotation() {
        return channels.some(function (ch) { return isRotatingMode(ch.sourceMode); });
    }

    function getChannel(slot) {
        return channels[slot] || null;
    }

    function findChannelByDeviceId(deviceId) {
        if (!deviceId) return null;
        for (let i = 0; i < channels.length; i += 1) {
            const ch = channels[i];
            if (ch.sourceMode === 'fixed' && ch.deviceId === deviceId) return ch;
            if (buildQueueForChannel(ch).indexOf(deviceId) >= 0) return ch;
        }
        return channels.find(function (c) { return c.deviceId === deviceId; }) || null;
    }

    function configuredDeviceCount() {
        return channels.filter(function (c) {
            if (isRotatingMode(c.sourceMode)) return buildQueueForChannel(c).length > 0;
            return String(c.deviceId || '').trim().length > 0;
        }).length;
    }

    function advanceRotationIndex(slot) {
        const ch = getChannel(slot);
        const q = buildQueueForChannel(ch);
        if (q.length <= 1) return q[0] || '';
        rotationIndex[slot] = (rotationIndex[slot] + 1) % q.length;
        const idx = (rotationIndex[slot] + pollSlotOffset(slot, q.length)) % q.length;
        return q[idx];
    }

    function slotLabel(slot) {
        const ch = getChannel(slot);
        const n = slot + 1;
        const activeId = getActiveDeviceForSlot(slot) || (ch && ch.deviceId);
        let op = '';
        if (activeId && global.BwcDevices && BwcDevices.findByDeviceId) {
            const rec = BwcDevices.findByDeviceId(activeId);
            if (rec && rec.operatorName) op = rec.operatorName;
        }
        if (ch && isRotatingMode(ch.sourceMode)) {
            if (ch.sourceMode === 'group' && ch.mapGroup) {
                return tr('video.panelLabelRotateGroup', { n: n, group: ch.mapGroup });
            }
            if (ch.sourceMode === 'all') return tr('video.panelLabelRotateAll', { n: n });
            if (ch.sourceMode === 'list') return tr('video.panelLabelRotateList', { n: n });
            if (ch.sourceMode === 'overflow') return tr('video.panelLabelRotateOverflow', { n: n });
        }
        if (op) return tr('video.panelLabel', { n: n, name: op });
        if (activeId) {
            const short = activeId.length > 12 ? activeId.slice(0, 10) + '…' : activeId;
            return tr('video.panelLabel', { n: n, name: short });
        }
        return tr('video.panel', { n: n });
    }

    function slotDeviceId(slot) {
        return getActiveDeviceForSlot(slot) || '';
    }

    function applyLabelsToWall() {
        document.querySelectorAll('.video-slot').forEach((slotEl) => {
            const slot = parseInt(slotEl.dataset.slot, 10);
            const label = slotEl.querySelector('.video-slot-label');
            if (label) label.textContent = slotLabel(slot);
            const cfgId = slotDeviceId(slot);
            if (cfgId) slotEl.dataset.camId = cfgId;
        });
        if (global.fleetRegistryRefresh) {
            try { global.fleetRegistryRefresh(); } catch (_) { /* ignore */ }
        }
    }

    async function load() {
        try {
            const res = await fetch('/api/video-channels');
            const data = await res.json();
            if (data && Array.isArray(data.channels)) {
                channels = defaultChannels().map(function (def, i) {
                    const row = data.channels.find(function (c) { return Number(c.slot) === i; }) || data.channels[i] || {};
                    const merged = normalizeChannel(Object.assign({}, def, row), i);
                    if (i >= POLL_SLOT_START && merged.sourceMode === 'none') merged.sourceMode = 'overflow';
                    return merged;
                });
            }
        } catch (_) {
            channels = defaultChannels();
        }
        applyLabelsToWall();
        updatePollUi();
        if (global.VideoWall && VideoWall.restartRotation) VideoWall.restartRotation();
        return channels;
    }

    async function saveChannels(next) {
        channels = next;
        const res = await fetch('/api/video-channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channels }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Save failed');
        applyLabelsToWall();
        updatePollUi();
        if (global.VideoWall && VideoWall.restartRotation) VideoWall.restartRotation();
        if (global.refreshAllDeviceMarkerStyles) global.refreshAllDeviceMarkerStyles();
        if (global.ServerSetup && global.ServerSetup.refreshDeviceSummary) {
            global.ServerSetup.refreshDeviceSummary();
        }
        return data;
    }

    function updatePollUi() {
        /* Live wall: no global rotate banner — per-panel hints only. */
    }

    function updatePanelHints() {
        document.querySelectorAll('.video-panel-hint').forEach(function (el) {
            const slot = parseInt(el.dataset.slot, 10);
            const ch = getChannel(slot);
            if (!ch) return;
            if (isRotatingMode(ch.sourceMode)) {
                const q = buildQueueForChannel(ch);
                el.textContent = tr('video.wall.hintRotate', { n: q.length, sec: ch.rotateSec || 30 });
                return;
            }
            const id = ch.deviceId || '';
            if (!id) {
                el.textContent = tr('video.wall.hintNoDevice');
                return;
            }
            const rec = global.BwcDevices && BwcDevices.findByDeviceId ? BwcDevices.findByDeviceId(id) : null;
            if (rec) {
                let txt = rec.operatorName || id;
                if (rec.mapGroup) txt += ' · ' + tr('video.wall.mapGroup', { group: rec.mapGroup });
                el.textContent = txt;
            } else {
                el.textContent = tr('video.wall.hintUnknownId', { id: id });
            }
        });
    }

    function syncModePanels(row, mode) {
        row.querySelectorAll('[data-mode-panel]').forEach(function (panel) {
            panel.hidden = panel.getAttribute('data-mode-panel') !== mode;
        });
    }

    function buildConfigRows(container) {
        container.innerHTML = '';
        const groups = listMapGroups();
        channels.forEach(function (ch, i) {
            const mode = ch.sourceMode || 'none';
            let groupOpts = '<option value="">' + tr('video.wall.pickGroup') + '</option>';
            groups.forEach(function (g) {
                groupOpts += '<option value="' + esc(g) + '"' + (ch.mapGroup === g ? ' selected' : '') + '>' + esc(g) + '</option>';
            });
            const row = document.createElement('div');
            row.className = 'video-config-row';
            row.innerHTML =
                '<div class="video-config-row-title">' + tr('video.wall.panelRow', { n: i + 1 }) + '</div>' +
                '<label>' + tr('video.wall.sourceMode') +
                '<select data-field="sourceMode" data-slot="' + i + '">' +
                '<option value="none"' + (mode === 'none' ? ' selected' : '') + '>' + tr('video.wall.mode.none') + '</option>' +
                '<option value="fixed"' + (mode === 'fixed' ? ' selected' : '') + '>' + tr('video.wall.mode.fixed') + '</option>' +
                '<option value="group"' + (mode === 'group' ? ' selected' : '') + '>' + tr('video.wall.mode.group') + '</option>' +
                '<option value="all"' + (mode === 'all' ? ' selected' : '') + '>' + tr('video.wall.mode.all') + '</option>' +
                '<option value="list"' + (mode === 'list' ? ' selected' : '') + '>' + tr('video.wall.mode.list') + '</option>' +
                '<option value="overflow"' + (mode === 'overflow' ? ' selected' : '') + '>' + tr('video.wall.mode.overflow') + '</option>' +
                '</select></label>' +
                '<div data-mode-panel="fixed"' + (mode === 'fixed' ? '' : ' hidden') + '>' +
                '<label>' + tr('video.wall.deviceId') +
                '<input type="text" data-field="deviceId" data-slot="' + i + '" value="' + esc(ch.deviceId) + '" placeholder="' + esc(tr('video.wall.placeholder.deviceId')) + '"></label>' +
                '<p class="config-hint">' + tr('video.wall.fixedHint') + '</p></div>' +
                '<div data-mode-panel="group"' + (mode === 'group' ? '' : ' hidden') + '>' +
                '<label>' + tr('video.wall.mapGroupPick') +
                '<select data-field="mapGroup" data-slot="' + i + '">' + groupOpts + '</select></label>' +
                '<p class="config-hint">' + tr('video.wall.groupHint') + '</p></div>' +
                '<div data-mode-panel="all"' + (mode === 'all' ? '' : ' hidden') + '>' +
                '<p class="config-hint">' + tr('video.wall.allHint') + '</p></div>' +
                '<div data-mode-panel="list"' + (mode === 'list' ? '' : ' hidden') + '>' +
                '<label>' + tr('video.wall.deviceList') +
                '<textarea data-field="deviceIds" data-slot="' + i + '" rows="4" placeholder="' + esc(tr('video.wall.listPlaceholder')) + '">' +
                esc((ch.deviceIds || []).join('\n')) + '</textarea></label>' +
                '<p class="config-hint">' + tr('video.wall.listHint') + '</p></div>' +
                '<div data-mode-panel="overflow"' + (mode === 'overflow' ? '' : ' hidden') + '>' +
                '<p class="config-hint">' + tr('video.wall.overflowHint') + '</p></div>' +
                '<label>' + tr('video.wall.rotateSec') +
                '<input type="number" min="5" max="600" data-field="rotateSec" data-slot="' + i + '" value="' + esc(String(ch.rotateSec || 30)) + '"></label>' +
                '<p class="config-hint video-panel-hint" data-slot="' + i + '"></p>';
            container.appendChild(row);
            const modeSel = row.querySelector('[data-field="sourceMode"]');
            modeSel.addEventListener('change', function () {
                syncModePanels(row, modeSel.value);
                updatePanelHints();
            });
        });
        updatePanelHints();
        container.querySelectorAll('[data-field="deviceId"], [data-field="mapGroup"], [data-field="deviceIds"], [data-field="rotateSec"]').forEach(function (el) {
            el.addEventListener('input', updatePanelHints);
            el.addEventListener('change', updatePanelHints);
        });
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function readFormFromDom() {
        const next = defaultChannels();
        for (let i = 0; i < SLOT_COUNT; i += 1) {
            const modeEl = document.querySelector('#video-config-rows select[data-field="sourceMode"][data-slot="' + i + '"]');
            const deviceEl = document.querySelector('#video-config-rows [data-field="deviceId"][data-slot="' + i + '"]');
            const groupEl = document.querySelector('#video-config-rows select[data-field="mapGroup"][data-slot="' + i + '"]');
            const listEl = document.querySelector('#video-config-rows textarea[data-field="deviceIds"][data-slot="' + i + '"]');
            const secEl = document.querySelector('#video-config-rows input[data-field="rotateSec"][data-slot="' + i + '"]');
            const sourceMode = modeEl ? modeEl.value : 'none';
            const deviceIds = listEl ? String(listEl.value || '').split(/[\r\n,;]+/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
            next[i] = normalizeChannel({
                sourceMode: sourceMode,
                deviceId: deviceEl ? deviceEl.value : '',
                mapGroup: groupEl ? groupEl.value : '',
                deviceIds: deviceIds,
                rotateSec: secEl ? secEl.value : 30,
            }, i);
            const rec = global.BwcDevices && BwcDevices.findByDeviceId && next[i].deviceId
                ? BwcDevices.findByDeviceId(next[i].deviceId) : null;
            if (rec) {
                next[i].operatorName = rec.operatorName || '';
                next[i].userName = rec.userName || '';
                next[i].password = rec.password || '';
                next[i].protocol = rec.protocol === 'onvif' ? 'onvif' : 'sip';
            }
        }
        return next;
    }

    function escapeCsvCell(val) {
        const s = val == null ? '' : String(val);
        if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    function channelsToCsv(rows) {
        const lines = [CSV_HEADER.join(',')];
        rows.forEach(function (ch, i) {
            lines.push([
                i + 1,
                ch.sourceMode || 'fixed',
                ch.deviceId || '',
                ch.mapGroup || '',
                (ch.deviceIds || []).join(';'),
                ch.rotateSec || 30,
            ].map(escapeCsvCell).join(','));
        });
        return '\uFEFF' + lines.join('\r\n') + '\r\n';
    }

    function parseCsvLine(line) {
        const out = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i += 1) {
            const c = line[i];
            if (inQ) {
                if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
                else if (c === '"') inQ = false;
                else cur += c;
            } else if (c === '"') inQ = true;
            else if (c === ',') { out.push(cur); cur = ''; }
            else cur += c;
        }
        out.push(cur);
        return out;
    }

    function parseCsvText(text) {
        const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
        if (!lines.length) return null;
        const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
        const idx = {
            panel: header.findIndex(function (h) { return h === 'panel' || h === 'channel'; }),
            mode: header.findIndex(function (h) { return h === 'mode' || h === 'source'; }),
            deviceId: header.findIndex(function (h) { return h.indexOf('device') >= 0 && h.indexOf('list') < 0; }),
            mapGroup: header.findIndex(function (h) { return h.indexOf('map') >= 0 && h.indexOf('group') >= 0; }),
            deviceList: header.findIndex(function (h) { return h.indexOf('list') >= 0; }),
            rotateSec: header.findIndex(function (h) { return h.indexOf('rotate') >= 0 || h.indexOf('sec') >= 0; }),
        };
        const next = defaultChannels();
        let autoSlot = 0;
        for (let li = 1; li < lines.length; li += 1) {
            const cols = parseCsvLine(lines[li]);
            let slot = idx.panel >= 0 ? parseInt(cols[idx.panel], 10) - 1 : autoSlot;
            if (Number.isNaN(slot) || slot < 0) slot = autoSlot;
            if (slot >= SLOT_COUNT) continue;
            const deviceId = idx.deviceId >= 0 ? String(cols[idx.deviceId] || '').trim() : '';
            const modeRaw = idx.mode >= 0 ? String(cols[idx.mode] || '').trim().toLowerCase() : '';
            let sourceMode = modeRaw || (deviceId ? 'fixed' : 'none');
            const mapGroup = idx.mapGroup >= 0 ? String(cols[idx.mapGroup] || '').trim() : '';
            const listRaw = idx.deviceList >= 0 ? String(cols[idx.deviceList] || '') : '';
            const deviceIds = listRaw.split(/[;|]/).map(function (s) { return s.trim(); }).filter(Boolean);
            const rotateSec = idx.rotateSec >= 0 ? parseInt(cols[idx.rotateSec], 10) : 30;
            if (!deviceId && !mapGroup && !deviceIds.length && sourceMode === 'fixed') continue;
            next[slot] = normalizeChannel({
                sourceMode: sourceMode,
                deviceId: deviceId,
                mapGroup: mapGroup,
                deviceIds: deviceIds,
                rotateSec: rotateSec,
            }, slot);
            autoSlot = slot + 1;
        }
        return next;
    }

    function downloadCsv(filename, content) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadCsvTemplate() {
        downloadCsv('mobility-c2-video-wall-template.csv', channelsToCsv(defaultChannels()));
    }

    function exportCsv() {
        downloadCsv('mobility-c2-video-wall.csv', channelsToCsv(channels));
    }

    async function importCsvFile(file) {
        if (!file) return;
        const text = await file.text();
        const parsed = parseCsvText(text);
        if (!parsed) throw new Error(tr('video.wall.error.csvEmpty'));
        const count = parsed.filter(function (c) {
            return isRotatingMode(c.sourceMode) || String(c.deviceId || '').trim();
        }).length;
        if (!count) throw new Error(tr('video.wall.error.csvNoIds'));
        await saveChannels(parsed);
        const rows = document.getElementById('video-config-rows');
        if (rows && open) buildConfigRows(rows);
        return count;
    }

    function setPanelVisible(show) {
        const backdrop = document.getElementById('video-config-backdrop');
        if (!backdrop) return;
        backdrop.hidden = !show;
        open = show;
    }

    function openPanel() {
        const rows = document.getElementById('video-config-rows');
        const show = () => {
            if (rows) buildConfigRows(rows);
            setPanelVisible(true);
        };
        if (global.BwcDevices && BwcDevices.load) BwcDevices.load().then(show);
        else show();
    }

    function bindUi() {
        const openBtn = document.getElementById('video-config-open');
        const saveBtn = document.getElementById('video-config-save');
        const cancelBtn = document.getElementById('video-config-cancel');
        const backdrop = document.getElementById('video-config-backdrop');
        const rows = document.getElementById('video-config-rows');
        const fileInput = document.getElementById('video-config-file');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                buildConfigRows(rows);
                setPanelVisible(true);
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => setPanelVisible(false));
        }
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) setPanelVisible(false);
            });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    await saveChannels(readFormFromDom());
                    setPanelVisible(false);
                } catch (err) {
                    alert(tr('video.wall.error.save', { msg: err.message }));
                }
            });
        }
        const tplBtn = document.getElementById('video-config-template');
        const impBtn = document.getElementById('video-config-import');
        const expBtn = document.getElementById('video-config-export');
        if (tplBtn) tplBtn.addEventListener('click', downloadCsvTemplate);
        if (expBtn) expBtn.addEventListener('click', exportCsv);
        if (impBtn && fileInput) {
            impBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files && fileInput.files[0];
                fileInput.value = '';
                if (!file) return;
                try {
                    const n = await importCsvFile(file);
                    alert(tr('video.wall.alert.imported', { n: n }));
                } catch (err) {
                    alert(tr('video.wall.alert.importFailed', { msg: err.message }));
                }
            });
        }
        window.addEventListener('fm-i18n-changed', () => {
            applyLabelsToWall();
            const rows = document.getElementById('video-config-rows');
            if (rows && open) buildConfigRows(rows);
        });
    }

    function init() {
        bindUi();
        return load();
    }

    global.VideoConfig = {
        SLOT_COUNT,
        init,
        load,
        saveChannels,
        getChannel,
        findChannelByDeviceId,
        slotLabel,
        slotDeviceId,
        getActiveDeviceForSlot,
        buildQueueForChannel,
        advanceRotationIndex,
        isRotatingMode,
        panelHasRotation,
        applyLabelsToWall,
        configuredDeviceCount,
        openPanel,
        downloadCsvTemplate,
        exportCsv,
        importCsvFile,
        updatePollUi,
    };
})(window);
