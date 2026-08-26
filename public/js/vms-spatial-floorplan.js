/**
 * VMS-SPATIAL-FLOORPLAN-V1
 * Indoor floors: Leaflet CRS.Simple + zone image + 0–1 pins.
 * Operator: tree zone swap, pin popup Sub (viewMode grid).
 * Super Admin: upload floor image, drag tray to place/move pins.
 * Fixed cams only — no BWC, no circle select, no alert cascade.
 */
(function (global) {
    'use strict';

    var OWNER = 'spatial-floorplan';
    var MAX_POPUP_VIDEOS = 1;

    var map = null;
    var overlay = null;
    var markers = new Map();
    var players = new Map();
    var openOrder = [];
    var tree = [];
    var activeZoneId = '';
    var activeSiteId = '';
    var editMode = false;
    var dragCamId = null;
    var inited = false;
    var isSuperAdmin = false;
    var allCamsCache = [];
    var floorW = 1;
    var floorH = 1;
    var floorBounds = null;
    var mapLocked = true; /* default still — no accidental pan/wheel */
    var targetingQueue = []; /* [{ id, name }] max 9 — survives zone swaps */
    var MAX_TARGETING_QUEUE = 9;
    /** VMS-SPATIAL-SELECTION-TOOLS-DRAW-V1 (floor host only) */
    var floorDrawTool = null;
    var floorDraw = {
        boxStart: null,
        rect: null,
        polyVerts: [],
        polyLine: null,
        polyFill: null,
        bound: false,
    };

    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function pctToLatLng(mapX, mapY) {
        var x = Math.min(1, Math.max(0, Number(mapX)));
        var y = Math.min(1, Math.max(0, Number(mapY)));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        /* CRS.Simple: lat grows up. Image top-left = (floorH, 0). Pins stay 0–1. */
        return [floorH * (1 - y), floorW * x];
    }

    function latLngToPct(latlng) {
        var lat = Number(latlng.lat);
        var lng = Number(latlng.lng);
        var w = floorW > 0 ? floorW : 1;
        var h = floorH > 0 ? floorH : 1;
        return {
            map_x: Math.min(1, Math.max(0, lng / w)),
            map_y: Math.min(1, Math.max(0, 1 - (lat / h))),
        };
    }

    function loadImageSize(url) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () {
                resolve({
                    w: Math.max(1, img.naturalWidth || img.width || 1),
                    h: Math.max(1, img.naturalHeight || img.height || 1),
                });
            };
            img.onerror = function () { reject(new Error('Floor plan image failed to load')); };
            img.src = url;
        });
    }

    function fitFloorToPanel() {
        if (!map || !floorBounds) return;
        try { map.invalidateSize(true); } catch (_) { /* ignore */ }
        try {
            map.setMaxBounds(floorBounds.pad(0.35));
            map.fitBounds(floorBounds, { animate: false, padding: [24, 24] });
        } catch (_) { /* ignore */ }
        try { map.invalidateSize(true); } catch (_) { /* ignore */ }
        applyMapInteraction();
    }

    function syncLockButton() {
        var btn = $('spatial-map-lock');
        if (!btn) return;
        btn.setAttribute('aria-pressed', mapLocked ? 'true' : 'false');
        if (mapLocked) {
            btn.textContent = 'Unlock Map';
            btn.classList.add('btn-action');
            btn.classList.remove('btn-ghost');
        } else {
            btn.textContent = 'Lock Map';
            btn.classList.add('btn-ghost');
            btn.classList.remove('btn-action');
        }
    }

    function applyMapInteraction() {
        if (!map) return;
        var handlers = ['dragging', 'scrollWheelZoom', 'doubleClickZoom', 'boxZoom', 'keyboard', 'touchZoom'];
        handlers.forEach(function (name) {
            var h = map[name];
            if (!h) return;
            try {
                if (mapLocked) h.disable();
                else h.enable();
            } catch (_) { /* ignore */ }
        });
        syncLockButton();
    }

    function setMapLocked(locked) {
        mapLocked = !!locked;
        applyMapInteraction();
        if (mapLocked && floorBounds) fitFloorToPanel();
    }

    function camPlayable(cam) {
        var src = String(cam && cam.streamSource || cam.streamSource || '');
        return src === 'onvif' || src === 'rtsp';
    }

    function wallCamId(camId) {
        return 'fixed:' + String(camId || '').trim();
    }

    function camOnWall(camId) {
        var cw = global.CommandWall;
        if (!cw) return false;
        var id = wallCamId(camId);
        if (typeof cw.wallHasCamAssigned === 'function') return !!cw.wallHasCamAssigned(id);
        if (typeof cw.hasLiveForCam === 'function') return !!cw.hasLiveForCam(id);
        return false;
    }

    function queueIndexOf(camId) {
        var id = String(camId || '');
        for (var i = 0; i < targetingQueue.length; i++) {
            if (targetingQueue[i].id === id) return i;
        }
        return -1;
    }

    function renderTargetingQueue() {
        var empty = $('spatial-tq-empty');
        var list = $('spatial-tq-list');
        var pushBtn = $('spatial-tq-push');
        var clearBtn = $('spatial-tq-clear');
        var hint = $('spatial-tq-hint');
        if (!list) return;
        if (!targetingQueue.length) {
            if (empty) empty.hidden = false;
            list.hidden = true;
            list.innerHTML = '';
            if (pushBtn) pushBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            if (hint) hint.textContent = '';
            return;
        }
        if (empty) empty.hidden = true;
        list.hidden = false;
        list.innerHTML = targetingQueue.map(function (row, idx) {
            return '<li class="spatial-tq-item" data-cam-id="' + esc(row.id) + '">' +
                '<span class="spatial-tq-name">' + esc(row.name || (String(row.id || '').length > 8 ? ('Camera ·' + String(row.id).slice(-4)) : 'Camera')) + '</span>' +
                '<button type="button" class="btn btn-ghost btn-sm spatial-tq-remove" data-idx="' + idx + '" aria-label="Remove">\u00d7</button>' +
                '</li>';
        }).join('');
        list.querySelectorAll('.spatial-tq-remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var i = parseInt(btn.getAttribute('data-idx'), 10);
                if (!Number.isFinite(i)) return;
                targetingQueue.splice(i, 1);
                renderTargetingQueue();
                refreshPinBadges();
            });
        });
        if (pushBtn) pushBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;
        if (hint) hint.textContent = targetingQueue.length + ' / ' + MAX_TARGETING_QUEUE;
    }

    function inSelection(camId) {
        try {
            if (global.VmsCommandShell && typeof global.VmsCommandShell.isSelected === 'function') {
                return !!global.VmsCommandShell.isSelected(camId);
            }
        } catch (_) { /* ignore */ }
        return queueIndexOf(camId) >= 0;
    }

    function toggleShellSelection(cam) {
        if (!cam || !cam.id) return false;
        if (editMode) {
            setStatus('Finish pin edit before selecting.', true);
            return false;
        }
        try {
            if (global.VmsCommandShell && typeof global.VmsCommandShell.toggleCamSelection === 'function') {
                global.VmsCommandShell.toggleCamSelection(cam.id);
                refreshPinBadges();
                setStatus(inSelection(cam.id) ? 'Selected: ' + (cam.name || cam.id) : 'Removed from selection.');
                return true;
            }
        } catch (_) { /* ignore */ }
        return addToTargetingQueue(cam);
    }

    function syncSelectionHalo() {
        /* Null-safe: refresh icons only for markers that exist */
        markers.forEach(function (marker) {
            if (!marker || !marker._spatialCam) return;
            try { marker.setIcon(pinIcon(marker._spatialCam)); } catch (_) { /* ignore */ }
        });
    }

    function addToTargetingQueue(cam, opts) {
        opts = opts || {};
        if (!cam || !cam.id) return false;
        if (editMode) {
            setStatus('Finish pin edit before selecting.', true);
            return false;
        }
        /* Prefer unified selection Set (Phase 1a) */
        if (global.VmsCommandShell && typeof global.VmsCommandShell.appendSelectionIds === 'function') {
            if (inSelection(cam.id)) {
                setStatus('Already selected.');
                return false;
            }
            var r = global.VmsCommandShell.appendSelectionIds([cam.id]);
            refreshPinBadges();
            if (r && r.truncated) return false;
            setStatus('Selected: ' + (cam.name || cam.id));
            return true;
        }
        if (camOnWall(cam.id)) {
            setStatus('Already on Command Wall.', true);
            return false;
        }
        if (queueIndexOf(cam.id) >= 0) {
            setStatus('Already in Selected Cameras.');
            return false;
        }
        if (targetingQueue.length >= MAX_TARGETING_QUEUE) {
            setStatus('Selected Cameras is full (max ' + MAX_TARGETING_QUEUE + ').', true);
            return false;
        }
        targetingQueue.push({ id: cam.id, name: cam.name || cam.id });
        renderTargetingQueue();
        refreshPinBadges();
        setStatus(opts.noPreview
            ? 'Selected: ' + (cam.name || cam.id)
            : 'Selected: ' + (cam.name || cam.id));
        return true;
    }

    function refreshPinBadges() {
        markers.forEach(function (marker, id) {
            var cam = marker._spatialCam;
            if (!cam) return;
            try { marker.setIcon(pinIcon(cam)); } catch (_) { /* ignore */ }
        });
    }

    function pinIcon(cam) {
        var iconType = ['fixed', 'dome', 'ptz', 'traffic', 'building'].indexOf(cam && cam.mapIcon) >= 0
            ? cam.mapIcon : 'fixed';
        var glyphs = { fixed: '\u25A3', dome: '\u25D2', ptz: '\u2725', traffic: '\u25C6', building: '\u25A6' };
        var onWall = camOnWall(cam && cam.id);
        var selected = inSelection(cam && cam.id);
        var extra = (onWall ? ' spatial-pin-on-wall map-pin-has-live' : '') +
            (selected ? ' spatial-pin-selected' : '');
        var badge = onWall
            ? '<i class="spatial-pin-badge" title="On Wall">W</i>'
            : (selected ? '<i class="spatial-pin-badge spatial-pin-badge-sel" title="Selected">S</i>' : '');
        return global.L.divIcon({
            className: 'fixed-camera-map-pin icon-' + iconType + ' spatial-floor-pin' + extra,
            html: '<span><b>' + glyphs[iconType] + '</b>' + badge + '</span>',
            iconSize: [32, 32],
            iconAnchor: [16, 30],
            popupAnchor: [0, -28],
        });
    }

    function popupHtml(cam) {
        if (!camPlayable(cam)) {
            return '<div class="fixed-camera-popup">' +
                '<div class="fixed-camera-popup-name">' + esc(cam.name || cam.id) + '</div>' +
                '<div class="fixed-camera-popup-location-only">Location only — no video configured</div>' +
                '</div>';
        }
        var onWall = camOnWall(cam.id);
        var selected = inSelection(cam.id);
        var qLabel = onWall ? 'On Wall' : (selected ? 'Remove from Selection' : 'Add to Selection');
        var qDis = onWall ? ' disabled' : '';
        return '<div class="fixed-camera-popup">' +
            '<div class="fixed-camera-popup-name">' + esc(cam.name || cam.id) + '</div>' +
            '<div class="fixed-camera-popup-stage"><div class="fixed-camera-popup-status">Ready</div></div>' +
            '<div class="fixed-camera-popup-actions">' +
            '<button type="button" class="btn btn-action btn-sm spatial-popup-queue" data-cam-id="' + esc(cam.id) + '"' + qDis + '>' + qLabel + '</button>' +
            '</div></div>';
    }

    function stopVideo(cameraId) {
        var entry = players.get(cameraId);
        if (entry && entry.player) {
            try {
                if (typeof entry.player.destroy === 'function') entry.player.destroy();
                else if (typeof entry.player.detach === 'function') entry.player.detach();
            } catch (_) { /* ignore */ }
        }
        players.delete(cameraId);
        fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/zlm/stop', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'grid' }),
        }).catch(function () { /* lease expires */ });
    }

    function enforceVideoLimit(cameraId, marker) {
        if (!camPlayable(markers.get(cameraId) && markers.get(cameraId)._spatialCam)) {
            /* fall through using cameraId */
        }
        var idx = openOrder.indexOf(cameraId);
        if (idx >= 0) openOrder.splice(idx, 1);
        openOrder.push(cameraId);
        while (openOrder.length > MAX_POPUP_VIDEOS) {
            var oldest = openOrder.shift();
            var m = markers.get(oldest);
            if (m && m !== marker && m.isPopupOpen && m.isPopupOpen()) m.closePopup();
            else stopVideo(oldest);
        }
    }

    function startVideo(cam, marker) {
        if (!cam || !camPlayable(cam) || !marker || !marker.isPopupOpen()) return;
        var popupNode = marker.getPopup() && marker.getPopup().getElement();
        var stage = popupNode && popupNode.querySelector('.fixed-camera-popup-stage');
        var status = popupNode && popupNode.querySelector('.fixed-camera-popup-status');
        if (!stage || players.has(cam.id)) return;
        if (status) status.textContent = 'Connecting\u2026';
        fetch('/api/fixed-cams/' + encodeURIComponent(cam.id) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'grid' }),
        }).then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok || !data.ok) throw new Error((data && data.error) || ('HTTP ' + response.status));
                if (!marker.isPopupOpen()) return;
                if (!global.Me8LivePlayerFactory || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
                    throw new Error('Live video player is unavailable');
                }
                var player = global.Me8LivePlayerFactory.attachFlvPrimary(stage, data.flvUrl, {
                    proveMs: 300,
                    timeoutMs: 10000,
                    onProven: function () { if (status) status.textContent = 'Live'; },
                    onFail: function () { if (status) status.textContent = 'Video unavailable'; },
                });
                if (!player) throw new Error('Live video player could not start');
                players.set(cam.id, { player: player, marker: marker });
            });
        }).catch(function (err) {
            if (status) status.textContent = (err && err.message) || 'Video unavailable';
        });
    }

    function clearMarkers() {
        markers.forEach(function (marker, id) {
            stopVideo(id);
            try { if (map) map.removeLayer(marker); } catch (_) { /* ignore */ }
        });
        markers.clear();
        openOrder = [];
    }

    function clearOverlay() {
        if (overlay && map) {
            try { map.removeLayer(overlay); } catch (_) { /* ignore */ }
        }
        overlay = null;
    }

    function ensureMap() {
        var host = $('vms-floor-host') || $('spatial-floor-map');
        if (!host || !global.L) return map;
        if (map) {
            try { map.invalidateSize(true); } catch (_) { /* ignore */ }
            return map;
        }
        map = global.L.map(host, {
            crs: global.L.CRS.Simple,
            minZoom: -5,
            maxZoom: 4,
            zoomSnap: 0.25,
            zoomControl: true,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            touchZoom: false,
        });
        map.setView([0.5, 0.5], 0);
        map.on('click', onMapClickPlace);
        applyMapInteraction();
        return map;
    }

    function onMapClickPlace(e) {
        if (!editMode || !dragCamId || !activeZoneId) return;
        var pct = latLngToPct(e.latlng);
        placeCamAt(dragCamId, pct.map_x, pct.map_y).then(function () {
            dragCamId = null;
            setStatus('Pin saved.');
            refreshTray();
            selectZone(activeZoneId, { keepEdit: true });
        }).catch(function (err) {
            setStatus((err && err.message) || 'Pin save failed', true);
        });
    }

    function setStatus(msg, isErr) {
        var el = $('spatial-floor-status');
        if (!el) return;
        el.textContent = msg || '';
        el.classList.toggle('spatial-floor-status-err', !!isErr);
    }

    function addPinMarker(cam) {
        if (!map || cam.map_x == null || cam.map_y == null) return;
        var ll = pctToLatLng(cam.map_x, cam.map_y);
        if (!ll) return;
        var marker = global.L.marker(ll, {
            icon: pinIcon(cam),
            zIndexOffset: 400,
            draggable: !!editMode,
        });
        marker._spatialCam = cam;
        marker.bindPopup(popupHtml(cam), {
            maxWidth: 280,
            className: 'fixed-camera-leaflet-popup',
            autoPan: true,
            autoClose: true,
            closeOnClick: false,
        });
        marker.on('popupopen', function () {
            if (editMode) return;
            enforceVideoLimit(cam.id, marker);
            startVideo(marker._spatialCam, marker);
            var root = marker.getPopup() && marker.getPopup().getElement();
            var qBtn = root && root.querySelector('.spatial-popup-queue');
            if (qBtn && !qBtn._spatialBound) {
                qBtn._spatialBound = true;
                qBtn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (qBtn.disabled) return;
                    var c = marker._spatialCam;
                    toggleShellSelection(c);
                    try {
                        marker.setPopupContent(popupHtml(c));
                        marker.setIcon(pinIcon(c));
                    } catch (_) { /* ignore */ }
                });
            }
        });
        marker.on('popupclose', function () {
            var idx = openOrder.indexOf(cam.id);
            if (idx >= 0) openOrder.splice(idx, 1);
            stopVideo(cam.id);
        });
        marker.on('click', function (ev) {
            if (editMode) return;
            if (ev && ev.originalEvent && ev.originalEvent.shiftKey) {
                try { if (typeof ev.originalEvent.preventDefault === 'function') ev.originalEvent.preventDefault(); } catch (_) { /* ignore */ }
                toggleShellSelection(marker._spatialCam);
                try { marker.closePopup(); } catch (_) { /* ignore */ }
            }
        });
        if (editMode) {
            marker.on('dragend', function () {
                var pct = latLngToPct(marker.getLatLng());
                placeCamAt(cam.id, pct.map_x, pct.map_y).then(function () {
                    setStatus('Pin moved.');
                }).catch(function (err) {
                    setStatus((err && err.message) || 'Move failed', true);
                });
            });
        }
        marker.addTo(map);
        markers.set(cam.id, marker);
    }

    function findZone(zoneId) {
        for (var i = 0; i < tree.length; i++) {
            var zones = tree[i].zones || [];
            for (var j = 0; j < zones.length; j++) {
                if (zones[j].id === zoneId) return { site: tree[i], zone: zones[j] };
            }
        }
        return null;
    }

    function clearFloorDrawLayers() {
        if (!map) return;
        if (floorDraw.rect) {
            try { map.removeLayer(floorDraw.rect); } catch (_) { /* ignore */ }
            floorDraw.rect = null;
        }
        if (floorDraw.polyLine) {
            try { map.removeLayer(floorDraw.polyLine); } catch (_) { /* ignore */ }
            floorDraw.polyLine = null;
        }
        if (floorDraw.polyFill) {
            try { map.removeLayer(floorDraw.polyFill); } catch (_) { /* ignore */ }
            floorDraw.polyFill = null;
        }
        floorDraw.boxStart = null;
        floorDraw.polyVerts = [];
    }

    function unbindFloorDraw() {
        if (!map || !floorDraw.bound) return;
        map.off('mousedown', onFloorBoxDown);
        map.off('mousemove', onFloorBoxMove);
        map.off('mouseup', onFloorBoxUp);
        map.off('click', onFloorPolyClick);
        map.off('dblclick', onFloorPolyDbl);
        floorDraw.bound = false;
    }

    function cancelActiveTool() {
        unbindFloorDraw();
        clearFloorDrawLayers();
        floorDrawTool = null;
        var host = $('vms-floor-host');
        if (host) host.classList.remove('vms-draw-active');
        applyMapInteraction();
    }

    function floorPointInPoly(latlng, verts) {
        var x = latlng.lng;
        var y = latlng.lat;
        var inside = false;
        for (var i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            var xi = verts[i].lng;
            var yi = verts[i].lat;
            var xj = verts[j].lng;
            var yj = verts[j].lat;
            var hit = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
            if (hit) inside = !inside;
        }
        return inside;
    }

    function collectIdsInBounds(bounds) {
        var ids = [];
        markers.forEach(function (marker, id) {
            if (!marker || !marker.getLatLng) return;
            try {
                if (bounds.contains(marker.getLatLng())) ids.push(id);
            } catch (_) { /* ignore */ }
        });
        return ids;
    }

    function collectIdsInPoly(verts) {
        var ids = [];
        if (!verts || verts.length < 3) return ids;
        markers.forEach(function (marker, id) {
            if (!marker || !marker.getLatLng) return;
            try {
                if (floorPointInPoly(marker.getLatLng(), verts)) ids.push(id);
            } catch (_) { /* ignore */ }
        });
        return ids;
    }

    function commitFloorSelection(ids) {
        if (global.VmsCommandShell && typeof global.VmsCommandShell.appendSelectionIds === 'function') {
            global.VmsCommandShell.appendSelectionIds(ids);
        }
        refreshPinBadges();
        setStatus(ids.length
            ? ('Selected ' + ids.length + ' camera' + (ids.length === 1 ? '' : 's') + '.')
            : 'No cameras in that area.');
    }

    function onFloorBoxDown(e) {
        if (floorDrawTool !== 'box') return;
        if (editMode) return;
        if (e.originalEvent && e.originalEvent.button != null && e.originalEvent.button !== 0) return;
        try { if (global.L && e.originalEvent) global.L.DomEvent.preventDefault(e.originalEvent); } catch (_) { /* ignore */ }
        clearFloorDrawLayers();
        floorDraw.boxStart = e.latlng;
        floorDraw.rect = global.L.rectangle(global.L.latLngBounds(e.latlng, e.latlng), {
            color: '#38bdf8', weight: 2, fillOpacity: 0.12, interactive: false,
        }).addTo(map);
        map.on('mousemove', onFloorBoxMove);
        map.on('mouseup', onFloorBoxUp);
    }

    function onFloorBoxMove(e) {
        if (!floorDraw.boxStart || !floorDraw.rect) return;
        floorDraw.rect.setBounds(global.L.latLngBounds(floorDraw.boxStart, e.latlng));
    }

    function onFloorBoxUp(e) {
        map.off('mousemove', onFloorBoxMove);
        map.off('mouseup', onFloorBoxUp);
        if (!floorDraw.boxStart) return;
        var bounds = global.L.latLngBounds(floorDraw.boxStart, e.latlng);
        floorDraw.boxStart = null;
        var ids = collectIdsInBounds(bounds);
        clearFloorDrawLayers();
        commitFloorSelection(ids);
    }

    function redrawFloorPoly() {
        if (!map) return;
        if (floorDraw.polyLine) {
            try { map.removeLayer(floorDraw.polyLine); } catch (_) { /* ignore */ }
        }
        if (floorDraw.polyFill) {
            try { map.removeLayer(floorDraw.polyFill); } catch (_) { /* ignore */ }
        }
        floorDraw.polyLine = null;
        floorDraw.polyFill = null;
        if (floorDraw.polyVerts.length < 1) return;
        floorDraw.polyLine = global.L.polyline(floorDraw.polyVerts, {
            color: '#38bdf8', weight: 2, dashArray: '4 4', interactive: false,
        }).addTo(map);
        if (floorDraw.polyVerts.length >= 3) {
            floorDraw.polyFill = global.L.polygon(floorDraw.polyVerts, {
                color: '#38bdf8', weight: 1, fillOpacity: 0.12, interactive: false,
            }).addTo(map);
        }
    }

    function onFloorPolyClick(e) {
        if (floorDrawTool !== 'polygon') return;
        if (editMode) return;
        floorDraw.polyVerts.push(e.latlng);
        redrawFloorPoly();
    }

    function onFloorPolyDbl(e) {
        if (floorDrawTool !== 'polygon') return;
        try { if (global.L && e.originalEvent) global.L.DomEvent.preventDefault(e.originalEvent); } catch (_) { /* ignore */ }
        if (e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
            e.originalEvent.stopPropagation();
        }
        if (floorDraw.polyVerts.length >= 2) floorDraw.polyVerts.pop();
        if (floorDraw.polyVerts.length < 3) {
            clearFloorDrawLayers();
            setStatus('Polygon needs 3+ points (double-click to finish).', true);
            return;
        }
        var ids = collectIdsInPoly(floorDraw.polyVerts);
        clearFloorDrawLayers();
        commitFloorSelection(ids);
    }

    /**
     * Floor host only. Shell must cancel GIS first; starting Box cancels Polygon here.
     */
    function startDrawTool(kind) {
        var mode = global.vmsSpatialState && global.vmsSpatialState.mode;
        if (mode !== 'floor') return false;
        if (editMode) {
            setStatus('Finish pin edit before selecting.', true);
            return false;
        }
        cancelActiveTool();
        ensureMap();
        if (!map || !global.L) return false;
        floorDrawTool = kind === 'polygon' ? 'polygon' : 'box';
        var host = $('vms-floor-host');
        if (host) host.classList.add('vms-draw-active');
        try { if (map.dragging) map.dragging.disable(); } catch (_) { /* ignore */ }
        if (floorDrawTool === 'box') {
            map.on('mousedown', onFloorBoxDown);
            setStatus('Box Select: drag on floor plan.');
        } else {
            try { if (map.doubleClickZoom) map.doubleClickZoom.disable(); } catch (_) { /* ignore */ }
            map.on('click', onFloorPolyClick);
            map.on('dblclick', onFloorPolyDbl);
            setStatus('Polygon Select: click vertices, double-click to finish.');
        }
        floorDraw.bound = true;
        return true;
    }

    function selectZone(zoneId, opts) {
        opts = opts || {};
        /* Cancel draw on zone change (shell clears both hosts + tool buttons) */
        try {
            if (global.VmsCommandShell && typeof global.VmsCommandShell.cancelActiveTool === 'function') {
                global.VmsCommandShell.cancelActiveTool();
            } else {
                cancelActiveTool();
            }
        } catch (_) { cancelActiveTool(); }
        var found = findZone(zoneId);
        if (!found) {
            setStatus('Zone not found', true);
            return;
        }
        activeZoneId = zoneId;
        activeSiteId = found.site.id;
        highlightTree(zoneId);

        var zone = found.zone;
        var ph = $('spatial-map-ph');
        var mapEl = $('vms-floor-host') || $('spatial-floor-map');

        clearMarkers();
        clearOverlay();
        floorW = 1;
        floorH = 1;
        floorBounds = null;

        if (!zone.hasFloorPlan) {
            if (ph) {
                ph.hidden = false;
                ph.textContent = 'No floor plan for this zone. Upload a PNG or JPEG (Super Admin).';
            }
            if (mapEl) {
                mapEl.classList.add('is-hidden');
                mapEl.style.visibility = 'hidden';
                mapEl.style.pointerEvents = 'none';
            }
            setStatus('');
            if (opts.keepEdit || editMode) refreshTray();
            return;
        }

        /* Show map host BEFORE Leaflet measures size — keep visibility (no display:none) */
        if (ph) ph.hidden = true;
        if (mapEl) {
            mapEl.removeAttribute('hidden');
            mapEl.classList.remove('is-hidden');
            mapEl.style.visibility = 'visible';
            mapEl.style.pointerEvents = 'auto';
        }
        /* Only steal shell mode when operator chose a zone (not auto-load on tab open) */
        if (!opts.skipShellMode && global.VmsCommandShell && typeof global.VmsCommandShell.setMode === 'function') {
            try { global.VmsCommandShell.setMode('floor'); } catch (_) { /* ignore */ }
        }
        ensureMap();
        if (!map) return;

        var url = '/api/vms/zones/' + encodeURIComponent(zoneId) + '/map-image';
        setStatus('Loading floor plan\u2026');

        loadImageSize(url).then(function (size) {
            if (activeZoneId !== zoneId) return;
            floorW = size.w;
            floorH = size.h;
            floorBounds = global.L.latLngBounds([0, 0], [floorH, floorW]);
            clearOverlay();
            overlay = global.L.imageOverlay(url, floorBounds, { opacity: 1, interactive: false });
            overlay.addTo(map);
            fitFloorToPanel();
            (zone.cameras || []).forEach(function (cam) {
                if (cam.map_x == null || cam.map_y == null) return;
                addPinMarker(cam);
            });
            setStatus(zone.name + (editMode ? ' — pin edit on' : ''));
            if (opts.keepEdit || editMode) refreshTray();
            requestAnimationFrame(function () {
                fitFloorToPanel();
                setTimeout(fitFloorToPanel, 120);
            });
        }).catch(function (err) {
            if (ph) {
                ph.hidden = false;
                ph.textContent = (err && err.message) || 'Floor plan failed to load';
            }
            if (mapEl) {
                mapEl.classList.add('is-hidden');
                mapEl.style.visibility = 'hidden';
                mapEl.style.pointerEvents = 'none';
            }
            setStatus((err && err.message) || 'Floor plan failed to load', true);
        });
    }

    function highlightTree(zoneId) {
        var root = $('spatial-tree-body');
        if (!root) return;
        root.querySelectorAll('.spatial-zone-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-zone-id') === zoneId);
        });
    }

    function renderTree() {
        var body = $('spatial-tree-body');
        if (!body) return;
        if (!tree.length) {
            if (global.VmsCommandShell && typeof global.VmsCommandShell.renderPlaceholderTree === 'function') {
                global.VmsCommandShell.renderPlaceholderTree();
            } else {
                body.innerHTML = '<p class="ma-empty">No sites yet.' +
                    (isSuperAdmin ? ' Use Add Site below.' : '') + '</p>';
            }
            renderAdminChrome();
            return;
        }
        var html = '';
        tree.forEach(function (site) {
            html += '<div class="spatial-tree-site">' +
                '<div class="spatial-tree-site-name">' + esc(site.name) + '</div>';
            (site.zones || []).forEach(function (zone) {
                var camN = (zone.cameras || []).length;
                var fp = zone.hasFloorPlan ? '' : ' · no plan';
                html += '<button type="button" class="spatial-zone-btn" data-zone-id="' + esc(zone.id) + '">' +
                    esc(zone.name) +
                    '<span class="spatial-zone-meta">' + camN + ' cam' + fp + '</span></button>';
            });
            if (!(site.zones || []).length) {
                html += '<p class="spatial-tree-empty">No zones</p>';
            }
            html += '</div>';
        });
        body.innerHTML = html;
        body.querySelectorAll('.spatial-zone-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectZone(btn.getAttribute('data-zone-id'), { fromUserClick: true });
            });
        });
        renderAdminChrome();
        if (activeZoneId) highlightTree(activeZoneId);
    }

    function renderAdminChrome() {
        var admin = $('spatial-admin-bar');
        if (!admin) return;
        admin.hidden = !isSuperAdmin;
        if (!isSuperAdmin) return;
        var editBtn = $('spatial-edit-pins');
        if (editBtn) {
            editBtn.textContent = editMode ? 'Done Pinning' : 'Edit Pins';
            editBtn.classList.toggle('btn-action', editMode);
            editBtn.classList.toggle('btn-ghost', !editMode);
        }
        var tray = $('spatial-pin-tray');
        if (tray) tray.hidden = !editMode;
        var uploadWrap = $('spatial-upload-wrap');
        if (uploadWrap) uploadWrap.hidden = !activeZoneId;
    }

    function refreshTray() {
        var list = $('spatial-pin-tray-list');
        if (!list || !editMode) return;
        var candidates = (allCamsCache || []).filter(function (c) {
            if (String(c.placementMode || '').toLowerCase() !== 'indoor') return false;
            if (!c.enabled && c.enabled !== undefined) return false;
            var hasXY = c.map_x != null && c.map_y != null && Number.isFinite(+c.map_x) && Number.isFinite(+c.map_y);
            if (!hasXY) return true;
            return String(c.zone_id || '') === String(activeZoneId || '');
        });
        if (!candidates.length) {
            list.innerHTML = '<p class="ma-empty">No indoor cameras to place. Mark cameras Indoor in Fixed Cameras first.</p>';
            return;
        }
        list.innerHTML = candidates.map(function (c) {
            var hasXY = c.map_x != null && c.map_y != null;
            var onZone = String(c.zone_id || '') === String(activeZoneId || '');
            var tag = !hasXY ? 'unplaced' : (onZone ? 'on floor' : 'other zone');
            return '<button type="button" class="spatial-tray-cam' + (dragCamId === c.id ? ' active' : '') +
                '" data-cam-id="' + esc(c.id) + '" draggable="true">' +
                esc(c.name || c.id) +
                '<span class="spatial-zone-meta">' + tag + '</span></button>';
        }).join('');
        list.querySelectorAll('.spatial-tray-cam').forEach(function (btn) {
            var id = btn.getAttribute('data-cam-id');
            btn.addEventListener('click', function () {
                dragCamId = id;
                setStatus('Click the floor plan to place: ' + (btn.textContent || id).trim());
                refreshTray();
            });
            btn.addEventListener('dragstart', function (ev) {
                dragCamId = id;
                try { ev.dataTransfer.setData('text/plain', id); } catch (_) { /* ignore */ }
            });
        });
    }

    async function placeCamAt(camId, mapX, mapY) {
        var full = (allCamsCache || []).find(function (c) { return c.id === camId; });
        if (!full) {
            var r0 = await fetch('/api/fixed-cams', { credentials: 'same-origin' });
            var j0 = await r0.json();
            if (!r0.ok) throw new Error((j0 && j0.error) || 'Cannot load cameras');
            allCamsCache = j0.cams || [];
            full = allCamsCache.find(function (c) { return c.id === camId; });
        }
        if (!full) throw new Error('Camera not found');
        var payload = Object.assign({}, full, {
            placementMode: 'indoor',
            zone_id: activeZoneId,
            map_x: mapX,
            map_y: mapY,
            lat: null,
            lng: null,
        });
        var r = await fetch('/api/fixed-cams/' + encodeURIComponent(camId), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error((j && j.error) || 'Save failed');
        await loadTree();
        await loadAllCams();
        return j;
    }

    async function loadTree() {
        var r = await fetch('/api/vms/tree', { credentials: 'same-origin' });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error((j && j.error) || 'Tree load failed');
        tree = j.tree || j.sites || [];
        /* normalize: some payloads wrap { ok, tree } */
        if (j.tree) tree = j.tree;
        renderTree();
        return tree;
    }

    async function loadAllCams() {
        if (!isSuperAdmin) { allCamsCache = []; return; }
        try {
            var r = await fetch('/api/fixed-cams', { credentials: 'same-origin' });
            var j = await r.json();
            if (r.ok) allCamsCache = j.cams || [];
        } catch (_) { allCamsCache = []; }
    }

    async function detectAdmin() {
        isSuperAdmin = !!(global.__fmBlueprintManage);
        if (isSuperAdmin) return;
        try {
            var r = await fetch('/api/fixed-cams', { credentials: 'same-origin' });
            isSuperAdmin = r.ok;
        } catch (_) { isSuperAdmin = false; }
    }

    async function uploadFloorPlan(file) {
        if (!activeZoneId || !file) return;
        var fd = new FormData();
        fd.append('mapImage', file);
        var r = await fetch('/api/vms/zones/' + encodeURIComponent(activeZoneId) + '/map-image', {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
        });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error((j && j.error) || 'Upload failed');
        await loadTree();
        selectZone(activeZoneId, { keepEdit: true });
        setStatus('Floor plan uploaded.');
    }

    async function addSite() {
        var name = window.prompt('Site name');
        if (!name || !String(name).trim()) return;
        var r = await fetch('/api/vms/sites', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: String(name).trim() }),
        });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error((j && j.error) || 'Add site failed');
        await loadTree();
    }

    async function addZone() {
        if (!activeSiteId && tree[0]) activeSiteId = tree[0].id;
        if (!activeSiteId) {
            setStatus('Add a site first', true);
            return;
        }
        var name = window.prompt('Zone / floor name (e.g. Level 1 Lobby)');
        if (!name || !String(name).trim()) return;
        var r = await fetch('/api/vms/zones', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site_id: activeSiteId, name: String(name).trim() }),
        });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error((j && j.error) || 'Add zone failed');
        await loadTree();
        if (j.zone && j.zone.id) selectZone(j.zone.id);
    }

    function bindUi() {
        var mapHost = $('vms-floor-host') || $('spatial-floor-map');
        if (mapHost) {
            mapHost.addEventListener('dragover', function (ev) {
                if (!editMode || !dragCamId) return;
                ev.preventDefault();
            });
            mapHost.addEventListener('drop', function (ev) {
                if (!editMode || !map) return;
                ev.preventDefault();
                var id = dragCamId;
                try {
                    var t = ev.dataTransfer && ev.dataTransfer.getData('text/plain');
                    if (t) id = t;
                } catch (_) { /* ignore */ }
                if (!id) return;
                var latlng = map.mouseEventToLatLng(ev);
                var pct = latLngToPct(latlng);
                placeCamAt(id, pct.map_x, pct.map_y).then(function () {
                    dragCamId = null;
                    setStatus('Pin saved.');
                    refreshTray();
                    selectZone(activeZoneId, { keepEdit: true });
                }).catch(function (err) {
                    setStatus((err && err.message) || 'Pin save failed', true);
                });
            });
        }

        var editBtn = $('spatial-edit-pins');
        if (editBtn) {
            editBtn.addEventListener('click', function () {
                editMode = !editMode;
                dragCamId = null;
                /* Pin edit keeps map locked unless operator unlocks — avoids dragging the floor */
                renderAdminChrome();
                if (activeZoneId) selectZone(activeZoneId, { keepEdit: true });
                else refreshTray();
            });
        }

        var fitBtn = $('spatial-fit-floor');
        if (fitBtn) {
            fitBtn.addEventListener('click', function () {
                fitFloorToPanel();
                setStatus('Floor plan fitted.');
            });
        }

        var lockBtn = $('spatial-map-lock');
        if (lockBtn) {
            lockBtn.addEventListener('click', function () {
                setMapLocked(!mapLocked);
                setStatus(mapLocked ? 'Map Panning Locked' : 'Map Panning Unlocked');
            });
        }

        var clearQ = $('spatial-tq-clear');
        if (clearQ) {
            clearQ.addEventListener('click', function () {
                targetingQueue = [];
                renderTargetingQueue();
                refreshPinBadges();
                setStatus('Selected Cameras cleared.');
            });
        }

        var pushQ = $('spatial-tq-push');
        if (pushQ) {
            pushQ.addEventListener('click', function () {
                pushTargetingQueue();
            });
        }

        var fileIn = $('spatial-map-file');
        if (fileIn) {
            fileIn.addEventListener('change', function () {
                var f = fileIn.files && fileIn.files[0];
                if (!f) return;
                uploadFloorPlan(f).catch(function (err) {
                    setStatus((err && err.message) || 'Upload failed', true);
                }).finally(function () { fileIn.value = ''; });
            });
        }

        var addSiteBtn = $('spatial-add-site');
        if (addSiteBtn) addSiteBtn.addEventListener('click', function () {
            addSite().catch(function (err) { setStatus((err && err.message) || 'Failed', true); });
        });
        var addZoneBtn = $('spatial-add-zone');
        if (addZoneBtn) addZoneBtn.addEventListener('click', function () {
            addZone().catch(function (err) { setStatus((err && err.message) || 'Failed', true); });
        });
    }

    function destroyAllSpatialVideo() {
        markers.forEach(function (marker, id) {
            try { if (marker.isPopupOpen && marker.isPopupOpen()) marker.closePopup(); } catch (_) { /* ignore */ }
            stopVideo(id);
        });
        openOrder = [];
    }

    function pushTargetingQueue() {
        if (!targetingQueue.length) {
            setStatus('Selected Cameras is empty.', true);
            return;
        }
        var cw = global.CommandWall;
        if (!cw || typeof cw.acceptTargetingQueue !== 'function') {
            setStatus('Command Wall is not ready.', true);
            return;
        }

        /* 1) Hard-stop Spatial popup decode (no display:none leak) */
        destroyAllSpatialVideo();

        var snapshot = targetingQueue.slice();

        /* 2) Switch tab */
        try {
            if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
                EvidenceManager.showTab('command-wall');
            }
        } catch (_) { /* ignore */ }

        /* 3–6) Exit spotlight, dedupe, scheme bump, start streams (wall owns this) */
        var result;
        try {
            if (typeof cw.exitSpotlight === 'function') cw.exitSpotlight();
            result = cw.acceptTargetingQueue(snapshot);
        } catch (err) {
            setStatus((err && err.message) || 'Push failed.', true);
            return;
        }

        if (result && result.ok) {
            targetingQueue = [];
            renderTargetingQueue();
            refreshPinBadges();
            setStatus(result.message || 'Pushed to Command Wall.');
            var hint = $('spatial-tq-hint');
            if (hint) hint.textContent = result.message || '';
        } else {
            setStatus((result && result.message) || 'Push blocked.', true);
        }
    }

    async function onShow() {
        if (!inited) {
            inited = true;
            await detectAdmin();
            bindUi();
        }
        ensureMap();
        renderTargetingQueue();
        try {
            await loadTree();
            await loadAllCams();
            if (activeZoneId) selectZone(activeZoneId, { keepEdit: editMode, skipShellMode: true });
            else if (tree[0] && tree[0].zones && tree[0].zones[0]) {
                /* Prefetch first zone floor data — do not steal Outdoor GIS / Indoor Floor toggle */
                selectZone(tree[0].zones[0].id, { skipShellMode: true });
            } else {
                setStatus(isSuperAdmin ? 'Add a site and zone, then upload a floor plan.' : 'No zones available.');
            }
            refreshPinBadges();
            setTimeout(function () { fitFloorToPanel(); }, 80);
            setTimeout(function () { fitFloorToPanel(); refreshPinBadges(); }, 300);
        } catch (err) {
            setStatus((err && err.message) || 'Spatial load failed', true);
        }
    }

    function onHide() {
        destroyAllSpatialVideo();
    }

    global.VmsSpatialFloorplan = {
        onShow: onShow,
        onHide: onHide,
        hasMap: function () { return !!map; },
        invalidateSize: function () {
            if (!map) return;
            setTimeout(function () {
                try { map.invalidateSize(true); } catch (_) { /* ignore */ }
            }, 40);
            setTimeout(function () {
                try { map.invalidateSize(true); } catch (_) { /* ignore */ }
            }, 200);
        },
        refresh: function () { return loadTree().then(function () {
            if (activeZoneId) selectZone(activeZoneId, { keepEdit: editMode });
        }); },
        syncSelectionHalo: syncSelectionHalo,
        refreshPinBadges: refreshPinBadges,
        cancelActiveTool: cancelActiveTool,
        startDrawTool: startDrawTool,
        getActiveDrawTool: function () { return floorDrawTool; },
    };
})(window);
