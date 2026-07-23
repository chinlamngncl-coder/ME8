/**
 * Video wall \u2014 ten independently configurable panels.
 * Names and map groups live in bwc-devices.js (unlimited list).
 */
(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    const SLOT_COUNT = 10;
    const CSV_HEADER = ['Panel', 'Mode', 'Device ID', 'Map group', 'Device list', 'Rotate sec'];
    let channels = defaultChannels();
    let fixedCams = [];
    let open = false;

    function isFixedCameraId(id) {
        return String(id || '').indexOf('fixed:') === 0;
    }

    function fixedCameraBySourceId(id) {
        const fixedId = String(id || '').replace(/^fixed:/, '');
        return fixedCams.find(function (cam) { return String(cam.id) === fixedId; }) || null;
    }

    function defaultChannels() {
        return Array.from({ length: SLOT_COUNT }, (_, slot) => ({
            slot,
            sourceMode: 'none',
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
        for (let i = 0; i < SLOT_COUNT; i += 1) {
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
        if (qLen <= 1) return 0;
        const overflowSlots = channels.filter(function (ch) {
            return ch && ch.sourceMode === 'overflow';
        }).map(function (ch) { return ch.slot; });
        const offset = overflowSlots.indexOf(slot);
        return offset >= 0 ? offset % qLen : 0;
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
        if (isFixedCameraId(activeId)) {
            const fixed = fixedCameraBySourceId(activeId);
            if (fixed) op = fixed.name + ' \u00B7 Fixed ' + String(fixed.streamSource || '').toUpperCase();
        }
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
            const short = activeId.length > 12 ? activeId.slice(0, 10) + '\u2026' : activeId;
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
            slotEl.classList.toggle('video-slot-fixed-camera', isFixedCameraId(cfgId));
            if (cfgId) slotEl.dataset.camId = cfgId;
            else if (!slotEl.classList.contains('video-slot-has-live')) delete slotEl.dataset.camId;
        });
        if (global.fleetRegistryRefresh) {
            try { global.fleetRegistryRefresh(); } catch (_) { /* ignore */ }
        }
    }

    async function load() {
        try {
            const fixedRes = await fetch('/api/fixed-cams/public');
            const fixedData = await fixedRes.json();
            fixedCams = fixedData && fixedData.ok && Array.isArray(fixedData.cams) ? fixedData.cams : [];
        } catch (_) {
            fixedCams = [];
        }
        try {
            const res = await fetch('/api/video-channels');
            const data = await res.json();
            if (data && Array.isArray(data.channels)) {
                channels = defaultChannels().map(function (def, i) {
                    const row = data.channels.find(function (c) { return Number(c.slot) === i; }) || data.channels[i] || {};
                    return normalizeChannel(Object.assign({}, def, row), i);
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
        /* Live wall: no global rotate banner \u2014 per-panel hints only. */
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
            const fixed = isFixedCameraId(id) ? fixedCameraBySourceId(id) : null;
            if (fixed) {
                el.textContent = fixed.name + (fixed.zone ? ' \u00B7 ' + fixed.zone : '') +
                    ' \u00B7 Fixed ' + String(fixed.streamSource || '').toUpperCase() +
                    (fixed.playable ? '' : ' \u00B7 RTSP URL required');
                return;
            }
            const rec = global.BwcDevices && BwcDevices.findByDeviceId ? BwcDevices.findByDeviceId(id) : null;
            if (rec) {
                let txt = rec.operatorName || id;
                if (rec.mapGroup) txt += ' \u00B7 ' + tr('video.wall.mapGroup', { group: rec.mapGroup });
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

    function cameraPickerLabel(device) {
        if (!device) return '';
        const id = String(device.deviceId || '').trim();
        const parts = [];
        parts.push(device.sourceKind === 'fixed'
            ? 'Fixed \u00B7 ' + String(device.streamSource || '').toUpperCase()
            : 'BWC');
        if (device.operatorName) parts.push(String(device.operatorName).trim());
        if (device.mapGroup) parts.push(String(device.mapGroup).trim());
        if (id) parts.push(id);
        return parts.filter(Boolean).join(' \u2014 ');
    }

    function bindManualCameraSearch(picker, value, devices, selectedId, emptyMessage) {
        const search = picker && picker.querySelector('[data-camera-search]');
        const results = picker && picker.querySelector('.video-camera-search-results');
        if (!search || !value || !results) return;
        const rows = (devices || []).filter(function (device) {
            return !!String(device.deviceId || '').trim();
        });
        const selected = rows.find(function (device) {
            return String(device.deviceId || '').trim() === String(selectedId || '').trim();
        });
        if (selected) search.value = cameraPickerLabel(selected);
        else if (selectedId) search.value = String(selectedId);

        function closeResults() {
            results.hidden = true;
        }

        function renderResults() {
            const query = String(search.value || '').trim().toLowerCase();
            const matches = rows.filter(function (device) {
                const haystack = [
                    device.deviceId,
                    device.operatorName,
                    device.mapGroup,
                ].map(function (part) { return String(part || '').toLowerCase(); }).join(' ');
                return !query || haystack.indexOf(query) >= 0;
            }).slice(0, 50);
            results.innerHTML = '';
            if (!matches.length) {
                const empty = document.createElement('div');
                empty.className = 'video-camera-search-empty';
                empty.textContent = emptyMessage || 'No registered cameras match';
                results.appendChild(empty);
            } else {
                matches.forEach(function (device) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'video-camera-search-result';
                    button.textContent = cameraPickerLabel(device) + (device.playable === false ? ' \u00B7 RTSP URL required' : '');
                    button.disabled = device.playable === false;
                    button.addEventListener('mousedown', function (event) {
                        if (device.playable === false) return;
                        event.preventDefault();
                        value.value = String(device.deviceId || '').trim();
                        search.value = cameraPickerLabel(device);
                        closeResults();
                        updatePanelHints();
                    });
                    results.appendChild(button);
                });
            }
            results.hidden = false;
        }

        search.addEventListener('input', function () {
            value.value = '';
            renderResults();
        });
        search.addEventListener('focus', renderResults);
        search.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeResults();
            if (event.key === 'Enter') {
                const first = results.querySelector('.video-camera-search-result');
                if (first) {
                    event.preventDefault();
                    first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                }
            }
        });
        search.addEventListener('blur', function () {
            setTimeout(closeResults, 120);
        });
    }

    function buildConfigRows(container) {
        container.innerHTML = '';
        const groups = listMapGroups();
        channels.forEach(function (ch, i) {
            const mode = ch.sourceMode || 'none';
            const manualPanel = i >= 8;
            const bwcChoices = (global.BwcDevices && BwcDevices.listDevices ? BwcDevices.listDevices() : []).map(function (device) {
                return Object.assign({}, device, {
                    sourceKind: 'bwc',
                    playable: true,
                });
            });
            const fixedChoices = [];
            if (manualPanel) {
                fixedCams.forEach(function (cam) {
                    if (!cam || !cam.enabled || (cam.streamSource !== 'onvif' && cam.streamSource !== 'rtsp')) return;
                    fixedChoices.push({
                        deviceId: 'fixed:' + cam.id,
                        operatorName: cam.name,
                        mapGroup: cam.zone,
                        sourceKind: 'fixed',
                        streamSource: cam.streamSource,
                        playable: !!cam.playable,
                    });
                });
            }
            const devices = bwcChoices.concat(fixedChoices);
            const uiMode = manualPanel && mode === 'fixed'
                ? (isFixedCameraId(ch.deviceId) ? 'fixed-camera' : 'bwc-fixed')
                : mode;
            let deviceOpts = '<option value="">' + esc(tr('video.wall.placeholder.deviceId')) + '</option>';
            let configuredDeviceFound = false;
            devices.forEach(function (device) {
                const id = String(device.deviceId || '').trim();
                if (!id) return;
                const selected = id === ch.deviceId;
                if (selected) configuredDeviceFound = true;
                const label = (device.operatorName ? device.operatorName + ' \u2014 ' : '') + id;
                deviceOpts += '<option value="' + esc(id) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
            });
            if (ch.deviceId && !configuredDeviceFound) {
                deviceOpts += '<option value="' + esc(ch.deviceId) + '" selected>' + esc(ch.deviceId) + '</option>';
            }
            const modeOptions = manualPanel
                ? '<option value="none"' + (uiMode === 'none' ? ' selected' : '') + '>None</option>' +
                    '<option value="bwc-fixed"' + (uiMode === 'bwc-fixed' ? ' selected' : '') + '>Registered BWC</option>' +
                    '<option value="fixed-camera"' + (uiMode === 'fixed-camera' ? ' selected' : '') + '>Registered Fixed Camera \u2014 ONVIF/RTSP</option>'
                : '<option value="none"' + (mode === 'none' ? ' selected' : '') + '>' + tr('video.wall.mode.none') + '</option>' +
                    '<option value="fixed"' + (mode === 'fixed' ? ' selected' : '') + '>' + tr('video.wall.mode.fixed') + '</option>' +
                    '<option value="group"' + (mode === 'group' ? ' selected' : '') + '>' + tr('video.wall.mode.group') + '</option>' +
                    '<option value="all"' + (mode === 'all' ? ' selected' : '') + '>' + tr('video.wall.mode.all') + '</option>' +
                    '<option value="list"' + (mode === 'list' ? ' selected' : '') + '>' + tr('video.wall.mode.list') + '</option>' +
                    '<option value="overflow"' + (mode === 'overflow' ? ' selected' : '') + '>' + tr('video.wall.mode.overflow') + '</option>';
            const deviceControl = '<select data-field="deviceId" data-slot="' + i + '">' + deviceOpts + '</select>';
            const manualSourcePanels = manualPanel
                ? '<input type="hidden" data-field="deviceId" data-slot="' + i + '" value="' + esc(ch.deviceId) + '">' +
                    '<div data-mode-panel="bwc-fixed"' + (uiMode === 'bwc-fixed' ? '' : ' hidden') + '>' +
                    '<label>Registered BWC search<div class="video-camera-search-picker" data-picker-kind="bwc">' +
                    '<input type="search" data-camera-search autocomplete="off" placeholder="Search operator, BWC ID, or map group">' +
                    '<div class="video-camera-search-results" hidden></div></div></label>' +
                    '<p class="config-hint">Panel-only playback; this does not open its map pin.</p></div>' +
                    '<div data-mode-panel="fixed-camera"' + (uiMode === 'fixed-camera' ? '' : ' hidden') + '>' +
                    '<label>Registered fixed camera search<div class="video-camera-search-picker" data-picker-kind="fixed">' +
                    '<input type="search" data-camera-search autocomplete="off" placeholder="Search camera name, ID, or zone">' +
                    '<div class="video-camera-search-results" hidden></div></div></label>' +
                    '<p class="config-hint">Enabled ONVIF/RTSP fixed cameras only.</p></div>'
                : '';
            let groupOpts = '<option value="">' + tr('video.wall.pickGroup') + '</option>';
            groups.forEach(function (g) {
                groupOpts += '<option value="' + esc(g) + '"' + (ch.mapGroup === g ? ' selected' : '') + '>' + esc(g) + '</option>';
            });
            const row = document.createElement('div');
            row.className = 'video-config-row';
            row.innerHTML =
                '<div class="video-config-row-title">' + tr('video.wall.panelRow', { n: i + 1 }) +
                (manualPanel ? ' \u00B7 Manual searchable camera' : '') + '</div>' +
                '<label>' + tr('video.wall.sourceMode') +
                '<select data-field="sourceMode" data-slot="' + i + '">' +
                modeOptions +
                '</select></label>' +
                (manualPanel ? manualSourcePanels :
                '<div data-mode-panel="fixed"' + (mode === 'fixed' ? '' : ' hidden') + '>' +
                '<label>' + tr('video.wall.deviceId') +
                deviceControl + '</label>' +
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
                '<input type="number" min="5" max="600" data-field="rotateSec" data-slot="' + i + '" value="' + esc(String(ch.rotateSec || 30)) + '"></label>') +
                '<p class="config-hint video-panel-hint" data-slot="' + i + '"></p>';
            container.appendChild(row);
            if (manualPanel) {
                const value = row.querySelector('[data-field="deviceId"]');
                bindManualCameraSearch(
                    row.querySelector('[data-picker-kind="bwc"]'),
                    value,
                    bwcChoices,
                    isFixedCameraId(ch.deviceId) ? '' : ch.deviceId,
                    'No registered BWCs match',
                );
                bindManualCameraSearch(
                    row.querySelector('[data-picker-kind="fixed"]'),
                    value,
                    fixedChoices,
                    isFixedCameraId(ch.deviceId) ? ch.deviceId : '',
                    'No registered fixed cameras',
                );
            }
            const modeSel = row.querySelector('[data-field="sourceMode"]');
            modeSel.addEventListener('change', function () {
                if (manualPanel) {
                    const value = row.querySelector('[data-field="deviceId"]');
                    if (value) value.value = '';
                    row.querySelectorAll('[data-camera-search]').forEach(function (input) { input.value = ''; });
                }
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
        const fixedOwners = new Map();
        for (let i = 0; i < SLOT_COUNT; i += 1) {
            const modeEl = document.querySelector('#video-config-rows select[data-field="sourceMode"][data-slot="' + i + '"]');
            const deviceEl = document.querySelector('#video-config-rows [data-field="deviceId"][data-slot="' + i + '"]');
            const groupEl = document.querySelector('#video-config-rows select[data-field="mapGroup"][data-slot="' + i + '"]');
            const listEl = document.querySelector('#video-config-rows textarea[data-field="deviceIds"][data-slot="' + i + '"]');
            const secEl = document.querySelector('#video-config-rows input[data-field="rotateSec"][data-slot="' + i + '"]');
            const selectedMode = modeEl ? modeEl.value : 'none';
            const sourceMode = (selectedMode === 'bwc-fixed' || selectedMode === 'fixed-camera')
                ? 'fixed'
                : selectedMode;
            const deviceIds = listEl ? String(listEl.value || '').split(/[\r\n,;]+/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
            next[i] = normalizeChannel({
                sourceMode: sourceMode,
                deviceId: deviceEl ? deviceEl.value : '',
                mapGroup: groupEl ? groupEl.value : '',
                deviceIds: deviceIds,
                rotateSec: secEl ? secEl.value : 30,
            }, i);
            if ((selectedMode === 'bwc-fixed' || selectedMode === 'fixed-camera') && !next[i].deviceId) {
                throw new Error('Choose a registered camera for Panel ' + (i + 1));
            }
            if (selectedMode === 'bwc-fixed' && isFixedCameraId(next[i].deviceId)) {
                throw new Error('Choose a registered BWC for Panel ' + (i + 1));
            }
            if (selectedMode === 'fixed-camera' && !isFixedCameraId(next[i].deviceId)) {
                throw new Error('Choose a registered fixed camera for Panel ' + (i + 1));
            }
            if (next[i].sourceMode === 'fixed' && next[i].deviceId) {
                if (fixedOwners.has(next[i].deviceId)) {
                    throw new Error('Camera ' + next[i].deviceId + ' is already assigned to Panel ' + (fixedOwners.get(next[i].deviceId) + 1));
                }
                fixedOwners.set(next[i].deviceId, i);
            }
            const fixed = isFixedCameraId(next[i].deviceId) ? fixedCameraBySourceId(next[i].deviceId) : null;
            if (fixed) {
                next[i].operatorName = fixed.name || '';
                next[i].protocol = 'onvif';
                continue;
            }
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
        isFixedCameraId,
        fixedCameraBySourceId,
    };
})(window);
