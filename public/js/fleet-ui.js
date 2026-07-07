/**
 * Searchable devices table; telemetry lives on the map pin popup (not video wall).
 */
(function (global) {
    function tr(key, params) {
        const fallbacks = {
            'fleet.statusOffline': 'Device Offline',
            'fleet.statusOnline': 'Online',
            'fleet.statusPtt': '🎙 PTT',
            'fleet.emptyNone': 'No devices yet',
            'fleet.emptyNoMatch': 'No devices match',
            'fleet.addNicknameHint': 'Add nickname in Server Config',
            'fleet.groupUngrouped': 'Ungrouped',
            'fleet.clearMapPinsNoPerm': 'Clear map pins requires super admin or permission from Dashboard Auth.',
            'fleet.clearMapPinsConfirm': 'Clear all map pins? This closes pin popups and removes markers from the map.',
            'fleet.pttTalkOnly': 'Talk to {name} only (hold)',
            'fleet.colPtt': 'PTT',
            'fleet.colVoice': 'Call',
            'fleet.voiceTalk': 'Call {name} (tap)',
            'fleet.statusGpsTrack': '📍 Track',
            'fleet.gpsTrackToggle': 'High-res GPS track {name}',
            'fleet.gpsTrackTitle': '15 s GPS trail (toggle)',
            'fleet.colTrack': 'GPS',
        };
        let s;
        if (global.I18n && I18n.t) {
            s = I18n.t(key, params);
        } else {
            s = key;
        }
        if (s === key && fallbacks[key]) s = fallbacks[key];
        return s;
    }

    let socket = null;
    let fleetList = [];
    let fleetById = {};
    let selectedCamId = null;
    /** Up to 8 cams with map pin popups open (matches pool cap + MAX_OPEN_PIN_POPUPS). */
    const selectedCamIds = new Set();
    const MAX_PIN_SELECT = 8;
    let searchQuery = '';
    let statusFilter = 'all';
    let canClearMapPins = false;
    const pttRxActive = {};
    const pttRxLinger = {};
    const smartGpsActive = {};

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function shortId(id) {
        if (!id) return '—';
        return id.length > 12 ? id.slice(0, 8) + '…' + id.slice(-4) : id;
    }

    function shouldShowInDeviceList(m) {
        if (!m || !m.id) return false;
        if (m.configured === false) return false;
        var id = String(m.id).trim();
        if (!/^3402\d{16,}$/.test(id)) return false;
        if (global.BwcDevices && BwcDevices.listDevices) {
            var rows = BwcDevices.listDevices();
            if (rows.length > 0) {
                return rows.some(function (d) { return d && d.deviceId === id; });
            }
        }
        return true;
    }

    function mapMarkerCount() {
        if (!global.deviceMarkers || typeof global.deviceMarkers !== 'object') return 0;
        return Object.keys(global.deviceMarkers).length;
    }

    function filteredFleet() {
        const q = searchQuery.trim().toLowerCase();
        return fleetList.filter(function (m) {
            if (!shouldShowInDeviceList(m)) return false;
            if (statusFilter === 'online' && m.status !== '1') return false;
            if (statusFilter === 'offline' && m.status === '1') return false;
            if (!q) return true;
            const hay = (m.name + ' ' + m.id).toLowerCase();
            return hay.indexOf(q) >= 0;
        });
    }

        function updateSummary() {
        const el = document.getElementById('fleet-summary');
        if (!el) return;
        const online = fleetList.filter(function (m) { return m.status === '1'; }).length;
        const total = fleetList.length;
        const offline = total - online;
        const visible = filteredFleet().length;
        const pinned = selectedCamIds.size;
        const markers = mapMarkerCount();
        const canClear = pinned > 0 || markers > 0;
        const groups = new Set(fleetList.map(function (m) {
            return String(m.mapGroup || '').trim();
        }).filter(Boolean)).size;
        const parts = [];
        parts.push(online + ' online');
        if (offline > 0) parts.push(offline + ' offline');
        parts.push(total + ' device' + (total === 1 ? '' : 's'));
        if (groups > 0) parts.push(groups + ' group' + (groups === 1 ? '' : 's'));
        if (pinned > 0) parts.push(pinned + ' pinned');
        if (searchQuery.trim() || statusFilter !== 'all') {
            parts.push('showing ' + visible);
        }
        const groupedLen = buildGroupedFleetRows(filteredFleet()).length;
        if (groupedLen > FLEET_MAX_VISIBLE_ROWS) {
            parts.push('scroll list');
        }
        el.textContent = parts.join(' · ');
        const clearBtn = document.getElementById('fleet-clear-pins');
        if (clearBtn) {
            clearBtn.hidden = !canClear;
            clearBtn.disabled = !canClear;
            clearBtn.title = canClear ? '' : tr('fleet.clearMapPinsNoPerm');
        }
        const openAllBtn = document.getElementById('fleet-open-all-pins');
        if (openAllBtn) openAllBtn.disabled = pinned === 0;
    }

    function refreshFleetLayout() {
        scheduleFleetTableResize();
        if (typeof global.map !== 'undefined' && global.map && global.map.invalidateSize) {
            requestAnimationFrame(function () { global.map.invalidateSize(); });
        }
    }

    /** Grow with rows; scroll after this many tbody rows (devices + group headers). */
    const FLEET_MAX_VISIBLE_ROWS = 8;

    function sumRowHeights(rows) {
        var total = 0;
        for (var i = 0; i < rows.length; i++) {
            total += rows[i].offsetHeight || 0;
        }
        return total;
    }

    function resizeFleetTable() {
        const wrap = document.getElementById('fleet-table-wrap');
        const tbody = document.getElementById('fleet-tbody');
        if (!wrap || !tbody) return;
        const thead = wrap.querySelector('thead');
        const headerH = thead ? thead.offsetHeight : 28;
        const emptyRow = tbody.querySelector('.fleet-empty');
        wrap.style.maxHeight = '';
        wrap.classList.remove('fleet-scroll');
        if (emptyRow) {
            wrap.style.maxHeight = (headerH + (emptyRow.offsetHeight || 44)) + 'px';
            return;
        }
        const allRows = Array.from(tbody.querySelectorAll('tr'));
        if (!allRows.length) {
            wrap.style.maxHeight = headerH + 'px';
            return;
        }
        const cap = FLEET_MAX_VISIBLE_ROWS;
        if (allRows.length <= cap) {
            wrap.style.maxHeight = 'none';
            return;
        }
        wrap.style.maxHeight = (headerH + sumRowHeights(allRows.slice(0, cap))) + 'px';
        wrap.classList.add('fleet-scroll');
    }

    function scheduleFleetTableResize() {
        requestAnimationFrame(function () {
            resizeFleetTable();
            requestAnimationFrame(resizeFleetTable);
        });
    }

    function groupColorForDevice(camId, mapGroup) {
        var lk = global.dispatchGroupLookup || {};
        if (camId && lk.byDevice && lk.byDevice[camId] && lk.byDevice[camId].color) {
            return lk.byDevice[camId].color;
        }
        var gk = String(mapGroup || '').toLowerCase();
        if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
            return lk.byName[gk].color;
        }
        return '#64748b';
    }

    function buildGroupedFleetRows(rows) {
        var byGroup = {};
        var ungrouped = [];
        rows.forEach(function (m) {
            var g = String(m.mapGroup || '').trim();
            if (!g) {
                ungrouped.push(m);
                return;
            }
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(m);
        });
        var out = [];
        Object.keys(byGroup).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (gName) {
            out.push({ type: 'header', groupName: gName, color: groupColorForDevice(null, gName) });
            byGroup[gName].forEach(function (m) { out.push({ type: 'row', device: m }); });
        });
        if (ungrouped.length) {
            if (Object.keys(byGroup).length) {
                out.push({ type: 'header', groupName: tr('fleet.groupUngrouped'), color: '#64748b', ungrouped: true });
            }
            ungrouped.forEach(function (m) { out.push({ type: 'row', device: m }); });
        }
        return out;
    }

    function renderDeviceRow(m) {
        var on = m.status === '1';
        var active = selectedCamIds.has(m.id) ? ' fleet-row-active' : '';
        var focus = selectedCamId === m.id ? ' fleet-row-focus' : '';
        var pttRx = !!pttRxActive[m.id];
        var pttLinger = !!pttRxLinger[m.id];
        var pttClass = (pttRx || pttLinger) ? ' fleet-row-ptt-rx' : '';
        if (pttLinger && !pttRx) pttClass += ' fleet-row-ptt-rx-linger';
        var gpsTrack = !!smartGpsActive[m.id];
        var gpsClass = gpsTrack ? ' fleet-row-gps-track' : '';
        var statusText = pttRx ? tr('fleet.statusPtt') : (pttLinger ? tr('fleet.statusPttLinger') : (gpsTrack ? tr('fleet.statusGpsTrack') : (on ? tr('fleet.statusOnline') : tr('fleet.statusOffline'))));
        var statusClass = (pttRx || pttLinger) ? 'fleet-status-ptt-rx' : (gpsTrack ? 'fleet-status-gps-track' : (on ? 'fleet-status-on' : 'fleet-status-off'));
        var pinChecked = selectedCamIds.has(m.id) ? ' checked' : '';
        var atPinMax = selectedCamIds.size >= MAX_PIN_SELECT && !selectedCamIds.has(m.id);
        var pinDisabled = on ? (atPinMax ? ' disabled' : '') : ' disabled';
        var pinColor = groupColorForDevice(m.id, m.mapGroup);
        var sub = global.FleetDisplay && FleetDisplay.hasConfiguredName(m.id)
            ? esc(FleetDisplay.shortTechnicalId(m.id))
            : esc(tr('fleet.addNicknameHint'));
        var groupTitle = m.mapGroup ? esc(m.mapGroup) : '';
        return '<tr class="fleet-row' + active + focus + pttClass + gpsClass + '" data-cam-id="' + esc(m.id) + '" tabindex="0">' +
            '<td class="fleet-pin-cell">' +
            '<input type="checkbox" class="fleet-pin-check" data-cam-id="' + esc(m.id) + '"' + pinChecked + pinDisabled +
            ' title="Show live pin on map (max ' + MAX_PIN_SELECT + ')" aria-label="Pin on map"></td>' +
            '<td class="fleet-ptt-cell">' +
            (on ? '<button type="button" class="fleet-row-ptt-btn" data-cam-id="' + esc(m.id) + '" aria-label="' +
            esc(tr('fleet.pttTalkOnly', { name: m.name })) + '">🎙</button>' : '') +
            '</td>' +
            '<td class="fleet-voice-cell">' +
            (on ? '<button type="button" class="fleet-row-voice-btn" data-cam-id="' + esc(m.id) + '" aria-label="' +
            esc(tr('fleet.voiceTalk', { name: m.name })) + '">☎</button>' : '') +
            '</td>' +
            '<td class="fleet-track-cell">' +
            (on ? '<button type="button" class="fleet-row-track-btn' + (gpsTrack ? ' active' : '') + '" data-cam-id="' + esc(m.id) + '" aria-pressed="' + (gpsTrack ? 'true' : 'false') + '" aria-label="' +
            esc(tr('fleet.gpsTrackToggle', { name: m.name })) + '" title="' + esc(tr('fleet.gpsTrackTitle')) + '">📍</button>' : '') +
            '</td>' +
            '<td class="fleet-dot-cell"><span class="status-dot' + (on ? ' on' : '') + '"></span></td>' +
            '<td class="fleet-name-cell"><div class="fleet-name-with-pin">' +
            '<span class="fleet-pin-color" style="background:' + esc(pinColor) + '"' + (groupTitle ? ' title="' + groupTitle + '"' : '') + '></span>' +
            '<span class="fleet-name">' + esc(m.name) + '</span></div>' +
            '<span class="fleet-id-sub">' + sub + '</span></td>' +
            '<td class="fleet-status-cell"><span class="' + statusClass + '">' + statusText + '</span></td>' +
            '</tr>';
    }

    function renderTable() {
        const tbody = document.getElementById('fleet-tbody');
        if (!tbody) return;
        const rows = filteredFleet();
        if (!rows.length) {
            var emptyMsg = fleetList.length === 0 ? tr('fleet.emptyNone') : tr('fleet.emptyNoMatch');
            tbody.innerHTML = '<tr><td colspan="7" class="fleet-empty">' + esc(emptyMsg) + '</td></tr>';
            updateSummary();
            scheduleFleetTableResize();
            return;
        }
        let html = '';
        buildGroupedFleetRows(rows).forEach(function (entry) {
            if (entry.type === 'header') {
                html += '<tr class="fleet-group-header"><td colspan="7">' +
                    '<span class="fleet-group-dot" style="background:' + esc(entry.color) + '"></span>' +
                    '<span class="fleet-group-name">' + esc(entry.groupName) + '</span></td></tr>';
                return;
            }
            html += renderDeviceRow(entry.device);
        });
        tbody.innerHTML = html;
        updateSummary();
        scheduleFleetTableResize();
        if (global.VideoWall && VideoWall.syncFleetPttRows) {
            VideoWall.syncFleetPttRows();
        }
        if (global.VideoWall && VideoWall.syncFleetVoiceRows) {
            VideoWall.syncFleetVoiceRows();
        }
    }

    function syncPinTelemetry(camId) {
        if (!camId || typeof global.refreshMapPinTelemetry !== 'function') return;
        const m = fleetById[camId] || {};
        global.refreshMapPinTelemetry(camId, m.telemetryStored || null, m.status === '1');
    }

    function applySelectedPanel() {
        renderTable();
        syncPinTelemetry(selectedCamId);
    }

    function refreshMapPinStyles() {
        if (typeof global.refreshAllDeviceMarkerStyles === 'function') {
            global.refreshAllDeviceMarkerStyles();
        }
    }

    function maybeReleaseOpenAllIfIdle() {
        if (typeof global.getOpenPinCamIds === 'function' && global.getOpenPinCamIds().length > 0) return;
        if (global.VideoWall && global.VideoWall.releaseOpenAllState) {
            global.VideoWall.releaseOpenAllState();
        }
        global.mapPinPopupAllowMulti = false;
        global.mapPinPopupFocusCamId = null;
    }

    function openAllSelectedPins() {
        var ids = Array.from(selectedCamIds).filter(function (id) { return isDeviceOnline(id); });
        if (!ids.length) return;
        if (global.VideoWall && VideoWall.prepareOpenAllLive) {
            VideoWall.prepareOpenAllLive(ids);
        }
        global.mapPinPopupAllowMulti = true;
        global.mapPinPopupFocusCamId = null;
        ids.forEach(function (camId) {
            if (typeof global.clearMapPinPopupSuppression === 'function') {
                global.clearMapPinPopupSuppression(camId);
            }
        });
        ids.forEach(function (camId, i) {
            setTimeout(function () {
                if (typeof global.syncMapPinForCam === 'function') {
                    global.syncMapPinForCam(camId, { openPopup: true });
                } else {
                    var marker = global.deviceMarkers && global.deviceMarkers[camId];
                    if (marker && marker.openPopup) marker.openPopup();
                }
                if (i === ids.length - 1 && typeof global.assignColocatedPinPopupDocks === 'function') {
                    setTimeout(global.assignColocatedPinPopupDocks, 80);
                }
            }, i * 120);
        });
        var videoBase = ids.length * 120 + 250;
        setTimeout(function () {
            if (global.VideoWall && VideoWall.openAllLivePins) {
                VideoWall.openAllLivePins(ids);
            } else {
                ids.forEach(function (camId, i) {
                    setTimeout(function () {
                        if (global.VideoWall && VideoWall.playMapPinVideoIfPopupOpen) {
                            VideoWall.playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true });
                        }
                    }, i * 200);
                });
            }
        }, videoBase);
        selectedCamId = ids[ids.length - 1];
        renderTable();
        refreshMapPinStyles();
    }

    function openPinPopupForCam(camId, opts) {
        if (!camId) return;
        camId = String(camId).trim();
        opts = opts || {};
        const pttCommPin = !!opts.pttCommPin;
        if (pttCommPin) {
            global.mapPinOpenPttCommCamId = camId;
        } else if (global.mapPinOpenPttCommCamId === camId) {
            global.mapPinOpenPttCommCamId = null;
        }
        if (typeof global.clearMapPinPopupSuppression === 'function') {
            global.clearMapPinPopupSuppression(camId);
        }
        maybeReleaseOpenAllIfIdle();
        var openPinCount = (typeof global.getOpenPinCamIds === 'function')
            ? global.getOpenPinCamIds().length : 0;
        var keepMulti = !!opts.keepMulti || !!opts.addToMulti
            || selectedCamIds.size > 1 || openPinCount > 0;
        global.mapPinPopupFocusCamId = camId;
        if (keepMulti) {
            global.mapPinPopupAllowMulti = true;
        } else {
            global.mapPinPopupAllowMulti = false;
            selectedCamIds.forEach(function (id) {
                if (String(id).trim() !== camId) closePinPopupForCam(id);
            });
        }
        var marker = global.deviceMarkers && global.deviceMarkers[camId];
        var popupOpen = marker && marker.isPopupOpen && marker.isPopupOpen();
        if (popupOpen && typeof global.isMapPinVideoMinimized === 'function' && global.isMapPinVideoMinimized(camId)) {
            if (typeof global.expandMapPinVideo === 'function') global.expandMapPinVideo(camId);
            if (pttCommPin && global.VideoWall && VideoWall.openMapPinPttComm) {
                VideoWall.openMapPinPttComm(camId);
            } else if (pttCommPin && global.VideoWall && VideoWall.syncMapPinPttComm) {
                VideoWall.syncMapPinPttComm(camId);
            } else if (global.VideoWall && VideoWall.playMapPinVideoIfPopupOpen) {
                VideoWall.playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true });
            }
            return;
        }
        if (popupOpen && global.VideoWall && VideoWall.mapPinHasLiveVideo && VideoWall.mapPinHasLiveVideo(camId)) {
            if (pttCommPin && global.VideoWall.openMapPinPttComm) {
                VideoWall.openMapPinPttComm(camId);
            }
            return;
        }
        if (typeof global.syncMapPinForCam === 'function') {
            global.syncMapPinForCam(camId, { openPopup: true, pttCommPin: pttCommPin });
        } else if (marker && !popupOpen && marker.openPopup) {
            marker.openPopup();
        }
        if (pttCommPin && global.VideoWall && VideoWall.openMapPinPttComm) {
            VideoWall.openMapPinPttComm(camId);
        } else if (pttCommPin && global.VideoWall && VideoWall.syncMapPinPttComm) {
            setTimeout(function () { VideoWall.syncMapPinPttComm(camId, 0); }, 280);
        } else if (global.VideoWall && VideoWall.playMapPinVideoIfPopupOpen) {
            setTimeout(function () { VideoWall.playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true }); }, 280);
        }
        if (typeof global.assignColocatedPinPopupDocks === 'function') {
            setTimeout(global.assignColocatedPinPopupDocks, 100);
        }
        if (keepMulti && typeof global.scheduleSyncOpenPinVideosFromWall === 'function') {
            global.scheduleSyncOpenPinVideosFromWall();
        }
    }

    function closePinPopupForCam(camId) {
        if (typeof global.closeMapPinPopup === 'function') {
            global.closeMapPinPopup(camId);
        }
    }

    function clearPinSelection() {
        var pinned = selectedCamIds.size;
        var markers = mapMarkerCount();
        if (pinned === 0 && markers === 0) return;
        if (!window.confirm(tr('fleet.clearMapPinsConfirm'))) return;
        selectedCamIds.forEach(function (id) { closePinPopupForCam(id); });
        selectedCamIds.clear();
        selectedCamId = null;
        if (typeof global.clearAllDeviceMapMarkers === 'function') {
            global.clearAllDeviceMapMarkers();
        }
        if (global.VideoWall && VideoWall.releaseOpenAllState) {
            VideoWall.releaseOpenAllState();
        }
        renderTable();
        refreshMapPinStyles();
        if (typeof global.refreshPttGroupPreview === 'function') global.refreshPttGroupPreview();
    }

    function togglePinSelect(camId, wantOn) {
        if (!camId) return;
        camId = String(camId).trim();
        if (wantOn) {
            if (selectedCamIds.has(camId)) {
                selectedCamId = camId;
                renderTable();
                refreshMapPinStyles();
                return;
            }
            if (selectedCamIds.size >= MAX_PIN_SELECT) return;
            if (!isDeviceOnline(camId)) return;
            selectedCamIds.add(camId);
            selectedCamId = camId;
        } else {
            selectedCamIds.delete(camId);
            closePinPopupForCam(camId);
            if (selectedCamId === camId) {
                const rest = selectedCamIds.values().next();
                selectedCamId = rest.done ? null : rest.value;
            }
        }
        renderTable();
        refreshMapPinStyles();
        if (typeof global.refreshPttGroupPreview === 'function') global.refreshPttGroupPreview();
    }

    function pick(camId, opts) {
        if (!camId) return;
        opts = opts || {};
        camId = String(camId).trim();

        if (opts.toggleMulti && selectedCamIds.has(camId)) {
            togglePinSelect(camId, false);
            return;
        }

        const keepMulti = !!opts.keepMulti || !!opts.addToMulti;

        if (!keepMulti) {
            selectedCamIds.forEach(function (id) {
                if (id !== camId) closePinPopupForCam(id);
            });
            if (!opts.keepPinSelection) {
                selectedCamIds.clear();
            }
        }

        if (isDeviceOnline(camId)) {
            if (!selectedCamIds.has(camId)) {
                if (selectedCamIds.size >= MAX_PIN_SELECT) return;
                selectedCamIds.add(camId);
            }
        }

        selectedCamId = camId;
        if (socket && !opts.skipSelectEmit) socket.emit('select-device', { cameraId: camId });
        if (typeof global.syncCameraId === 'function') global.syncCameraId(camId);

        if (!opts.skipMapPopup) {
            openPinPopupForCam(camId, opts);
        }

        renderTable();
        syncPinTelemetry(camId);
        if (typeof global.refreshMapToolbarBwcList === 'function') global.refreshMapToolbarBwcList();
        if (global.BwcDevices && BwcDevices.refreshEmbeddedOnlineDots) BwcDevices.refreshEmbeddedOnlineDots();

        const isFocusWall = !opts.skipVideo && !opts.pinOnly;
        if (isFocusWall && global.VideoWall && global.VideoConfig) {
            let slotIndex = 0;
            const ch = VideoConfig.findChannelByDeviceId(camId);
            if (ch) slotIndex = ch.slot;
            const alreadyLive = global.VideoWall.isCameraLive && VideoWall.isCameraLive(camId);
            const online = isDeviceOnline(camId);
            if (!alreadyLive) {
                VideoWall.assignCamToSlot(camId, slotIndex);
            } else if (!online && VideoWall.onDeviceWentOffline) {
                VideoWall.onDeviceWentOffline(camId);
            }
        }
        refreshMapPinStyles();
        if (typeof global.refreshPttGroupPreview === 'function') global.refreshPttGroupPreview();
        if (global.MapPopoutSync && !global.mapPopoutMirrorActive) {
            global.MapPopoutSync.publishDebounced();
        }
    }

    function ingestFleet(fleet) {
        fleetList = (Array.isArray(fleet) ? fleet.slice() : []).filter(shouldShowInDeviceList);
        fleetById = {};
        fleetList.forEach(function (m) {
            if (m.battery != null || m.signal || m.recording != null) {
                m.telemetryStored = {
                    battery: m.battery,
                    signal: m.signal,
                    recording: m.recording,
                };
            }
            fleetById[m.id] = m;
        });
        updateSummary();
        if (selectedCamId && !fleetById[selectedCamId]) {
            selectedCamId = null;
            selectedCamIds.clear();
        } else {
            selectedCamIds.forEach(function (id) {
                if (!fleetById[id]) selectedCamIds.delete(id);
            });
        }
        applySelectedPanel();
        if (typeof global.refreshMapToolbarBwcList === 'function') global.refreshMapToolbarBwcList();
        if (global.BwcDevices && BwcDevices.refreshEmbeddedOnlineDots) BwcDevices.refreshEmbeddedOnlineDots();
        if (global.VideoWall && VideoWall.onFleetUpdate) VideoWall.onFleetUpdate();
        if (typeof global.syncAllDeviceMarkers === 'function'
            && !(global.isSosIncidentActive && global.isSosIncidentActive())) {
            global.syncAllDeviceMarkers();
        }
        if (typeof global.refreshAllDeviceMarkerStyles === 'function') {
            global.refreshAllDeviceMarkerStyles();
        }
    }

    function onDeviceStatus(data) {
        if (!data || !data.cameraId) return;
        const m = fleetById[data.cameraId];
        if (m) {
            const prev = m.telemetryStored || {};
            const nextBattery = data.battery;
            m.telemetryStored = {
                battery: (nextBattery != null && nextBattery !== '—' && nextBattery !== '--')
                    ? nextBattery
                    : prev.battery,
                signal: data.signal != null ? data.signal : prev.signal,
                recording: data.recording != null ? data.recording : prev.recording,
                audio: data.audio != null ? data.audio : prev.audio,
                callstate: data.callstate != null ? data.callstate : prev.callstate,
                volume: data.volume != null ? data.volume : prev.volume,
                appversion: data.appversion != null ? data.appversion : prev.appversion,
                deviceTime: (data.deviceTime != null && data.deviceTime !== '—' && data.deviceTime !== '--')
                    ? data.deviceTime
                    : prev.deviceTime,
            };
        }
        syncPinTelemetry(data.cameraId);
    }

    function onHeartbeat(data) {
        if (!data || !data.cameraId) return;
        const m = fleetById[data.cameraId];
        if (m) m.status = '1';
        syncPinTelemetry(data.cameraId);
        if (typeof global.refreshAllDeviceMarkerStyles === 'function') {
            global.refreshAllDeviceMarkerStyles();
        }
        if (typeof global.refreshMapToolbarBwcList === 'function') global.refreshMapToolbarBwcList();
        if (global.BwcDevices && BwcDevices.refreshEmbeddedOnlineDots) BwcDevices.refreshEmbeddedOnlineDots();
    }

    function onDeviceOffline(data) {
        if (!data || !data.cameraId) return;
        const m = fleetById[data.cameraId];
        if (m) m.status = '0';
        renderTable();
        syncPinTelemetry(data.cameraId);
        if (typeof global.refreshMapToolbarBwcList === 'function') global.refreshMapToolbarBwcList();
        if (global.BwcDevices && BwcDevices.refreshEmbeddedOnlineDots) BwcDevices.refreshEmbeddedOnlineDots();
        if (global.VideoWall && VideoWall.onFleetUpdate) VideoWall.onFleetUpdate();
        if (typeof global.syncAllDeviceMarkers === 'function'
            && !(global.isSosIncidentActive && global.isSosIncidentActive())) {
            global.syncAllDeviceMarkers();
        }
    }

    function setPttRxActive(camId, active) {
        if (!camId) return;
        if (active) pttRxActive[camId] = true;
        else delete pttRxActive[camId];
        renderTable();
    }

    function setPttRxLinger(camId, active) {
        if (!camId) return;
        if (active) pttRxLinger[camId] = true;
        else delete pttRxLinger[camId];
        renderTable();
    }

    function clearAllPttRxFlags() {
        Object.keys(pttRxActive).forEach(function (k) { delete pttRxActive[k]; });
        Object.keys(pttRxLinger).forEach(function (k) { delete pttRxLinger[k]; });
        renderTable();
    }

    function ingestSmartGpsState(activeList) {
        Object.keys(smartGpsActive).forEach(function (k) { delete smartGpsActive[k]; });
        (activeList || []).forEach(function (row) {
            if (row && row.camId) smartGpsActive[row.camId] = true;
        });
        renderTable();
    }

    function toggleSmartGpsTrack(camId) {
        if (!camId) return;
        var enable = !smartGpsActive[camId];
        fetch('/api/smart-gps/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ deviceId: camId, active: enable }),
        }).then(function (r) { return r.json(); }).then(function (data) {
            if (data && data.ok && Array.isArray(data.active)) ingestSmartGpsState(data.active);
        }).catch(function () { /* ignore */ });
    }

    function bindUi() {
        const search = document.getElementById('fleet-search');
        const filter = document.getElementById('fleet-filter');
        const tbody = document.getElementById('fleet-tbody');
        if (search) {
            search.addEventListener('input', function () {
                searchQuery = search.value;
                renderTable();
            });
        }
        if (filter) {
            filter.addEventListener('change', function () {
                statusFilter = filter.value;
                renderTable();
            });
        }
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const check = e.target.closest('.fleet-pin-check');
                if (check) {
                    e.stopPropagation();
                    var camId = check.dataset.camId;
                    if (check.checked && selectedCamIds.size >= MAX_PIN_SELECT && !selectedCamIds.has(camId)) {
                        check.checked = false;
                        return;
                    }
                    togglePinSelect(camId, check.checked);
                    return;
                }
                if (e.target.closest('.fleet-row-ptt-btn')) {
                    e.stopPropagation();
                    return;
                }
                const trackBtn = e.target.closest('.fleet-row-track-btn');
                if (trackBtn) {
                    e.stopPropagation();
                    toggleSmartGpsTrack(trackBtn.getAttribute('data-cam-id'));
                    return;
                }
                const voiceBtn = e.target.closest('.fleet-row-voice-btn');
                if (voiceBtn) {
                    e.stopPropagation();
                    const camId = voiceBtn.getAttribute('data-cam-id');
                    if (camId && global.VideoWall && typeof VideoWall.toggleVoiceCall === 'function') {
                        VideoWall.toggleVoiceCall(camId, { audioOnly: true });
                    }
                    return;
                }
                const row = e.target.closest('.fleet-row[data-cam-id]');
                if (!row) return;
                pick(row.dataset.camId, {
                    keepMulti: false,
                    keepPinSelection: true,
                    skipVideo: !selectedCamIds.has(row.dataset.camId) && selectedCamIds.size >= 1,
                });
            });
            tbody.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const row = e.target.closest('.fleet-row[data-cam-id]');
                if (!row) return;
                e.preventDefault();
                pick(row.dataset.camId, { keepMulti: false, keepPinSelection: true });
            });
        }
        const clearPins = document.getElementById('fleet-clear-pins');
        if (clearPins) clearPins.addEventListener('click', clearPinSelection);
        const openAllPins = document.getElementById('fleet-open-all-pins');
        if (openAllPins) openAllPins.addEventListener('click', openAllSelectedPins);
    }

    function setStatusFilter(value) {
        statusFilter = value === 'online' || value === 'offline' ? value : 'all';
        const filter = document.getElementById('fleet-filter');
        if (filter) filter.value = statusFilter;
        renderTable();
        updateSummary();
    }

    function init(ioSocket) {
        socket = ioSocket;
        bindUi();
        window.addEventListener('resize', refreshFleetLayout);
        window.addEventListener('fm-i18n-changed', function () {
            renderTable();
            updateSummary();
        });
    }

    function setClearMapPinsPermission(on) {
        canClearMapPins = !!on;
        updateSummary();
    }

    function getDeviceState(camId) {
        const m = fleetById[camId];
        if (!m) return { online: false, telemetry: null };
        return { online: m.status === '1', telemetry: m.telemetryStored || null };
    }

    function isDeviceOnline(camId) {
        const m = fleetById[camId];
        return !!(m && m.status === '1');
    }

    function isKnownDevice(camId) {
        return !!fleetById[camId];
    }

    global.FleetUi = {
        init,
        ingestFleet,
        pick,
        onDeviceStatus,
        onHeartbeat,
        onDeviceOffline,
        getSelectedCamId: function () { return selectedCamId; },
        getSelectedCamIds: function () { return Array.from(selectedCamIds); },
        isPinSelected: function (camId) { return selectedCamIds.has(camId); },
        clearPinSelection,
        openAllSelectedPins,
        togglePinSelect,
        setClearMapPinsPermission,
        setStatusFilter,
        refreshSummary: updateSummary,
        refreshLayout: refreshFleetLayout,
        refreshFromGroups: function () { renderTable(); },
        maxPinSelect: MAX_PIN_SELECT,
        getDeviceName: function (camId) {
            var m = fleetById[camId];
            return (m && m.name) ? m.name : (camId || '');
        },
        getDeviceState,
        isDeviceOnline,
        isKnownDevice,
        setPttRxActive,
        setPttRxLinger,
        clearAllPttRxFlags,
        ingestSmartGpsState,
        toggleSmartGpsTrack,
        getOnlineDevices: function () {
            return fleetList.filter(function (m) { return m.status === '1'; })
                .slice()
                .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
        },
        getAllDevices: function () {
            return fleetList.slice();
        },
    };
    global.selectFleetDevice = function (camId, opts) {
        pick(camId, opts);
    };
})(window);
