/**
 * VMS-COMMAND-TAB-SHELL-V1
 * Dual-host GIS/floor stage + vmsSpatialState + rail live preview (max 5/page).
 * Floor CRS.Simple map remains owned by VmsSpatialFloorplan on #vms-floor-host.
 * Nearest-Cam / Wall2 chase: PARKED (not in this file).
 */
(function (global) {
    'use strict';

    var OWNER = 'vms-command-shell';
    var RAIL_PAGE_SIZE = 5;
    var MAX_SELECTION = 20;
    var GIS_DEFAULT = { lat: 1.3521, lng: 103.8198, zoom: 12 };

    /** Single source of truth — do not duplicate parallel currentFloor vars. */
    var vmsSpatialState = {
        siteId: null,
        zoneId: null,
        floorId: null,
        camId: null,
        mode: 'gis',
        gisView: { lat: GIS_DEFAULT.lat, lng: GIS_DEFAULT.lng, zoom: GIS_DEFAULT.zoom },
        floorView: { zoom: 0, panX: 0, panY: 0 },
        selectedCamIds: [],
        railCurrentPage: 0,
        treeFilter: '',
    };

    var PLACEHOLDER_TREE = [
        {
            id: 'ph-site-alpha',
            name: 'Site Alpha (Placeholder)',
            zones: [
                {
                    id: 'ph-zone-lobby',
                    name: 'Lobby Zone',
                    floors: [
                        { id: 'ph-floor-1', name: 'Floor 1', cams: [
                            { id: 'ph-cam-lobby-1', name: 'Lobby Cam 1' },
                            { id: 'ph-cam-lobby-2', name: 'Lobby Cam 2' },
                            { id: 'ph-cam-lobby-3', name: 'Lobby Cam 3' },
                        ] },
                        { id: 'ph-floor-2', name: 'Floor 2', cams: [
                            { id: 'ph-cam-f2-1', name: 'Floor 2 Cam 1' },
                            { id: 'ph-cam-f2-2', name: 'Floor 2 Cam 2' },
                            { id: 'ph-cam-f2-3', name: 'Floor 2 Cam 3' },
                            { id: 'ph-cam-f2-4', name: 'Floor 2 Cam 4' },
                            { id: 'ph-cam-f2-5', name: 'Floor 2 Cam 5' },
                            { id: 'ph-cam-f2-6', name: 'Floor 2 Cam 6' },
                        ] },
                    ],
                },
            ],
        },
    ];

    var gisMap = null;
    var railPlayers = new Map();
    /** Bumps on every rail remount — stale zlm/FLV callbacks must no-op (desync guard). */
    var railMountGen = 0;
    /** VMS-SPATIAL-RAIL-IDLE-WHILE-WALL2-V1 — true after successful handoff until Wall 2 closes */
    var wall2InvestigationActive = false;
    var bound = false;
    var modeClickBound = false;
    var shellVisible = false;
    /** VMS-SPATIAL-SELECTION-TOOLS-DRAW-V1 — 'box' | 'polygon' | null */
    var activeTool = null;
    var gisDraw = {
        boxStart: null,
        rect: null,
        polyVerts: [],
        polyLine: null,
        polyFill: null,
        bound: false,
    };
    var escBound = false;

    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /** UI-COPY-OPERATOR-VOICE-V1 — sync chrome labels only; never full UUID; no new fetches. */
    function shortCamFallback(camId) {
        var id = String(camId || '').trim();
        if (!id) return 'Camera';
        if (id.length > 8) return 'Camera ·' + id.slice(-4);
        return 'Camera';
    }

    function resolveCamChromeLabel(camId) {
        var id = String(camId || '').trim();
        if (!id) return 'Camera';
        try {
            var btn = document.querySelector('[data-vms-cam-id="' + id.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
            if (btn) {
                var t = String(btn.textContent || '').trim();
                if (t && t !== id) return t;
            }
        } catch (_) { /* ignore */ }
        if (global.FleetDisplay && typeof global.FleetDisplay.friendlyDeviceName === 'function') {
            var n = global.FleetDisplay.friendlyDeviceName(id);
            if (n && n !== id) return n;
        }
        return shortCamFallback(id);
    }

    function buildCamLabelsMap(ids) {
        var map = {};
        var list = Array.isArray(ids) ? ids : [];
        for (var i = 0; i < list.length; i++) {
            var id = String(list[i] || '').trim();
            if (id) map[id] = resolveCamChromeLabel(id);
        }
        return map;
    }

    function setHostVisible(el, on) {
        if (!el) return;
        /* Visibility only — never display:none (Leaflet grey-screen / zero-size). */
        el.removeAttribute('hidden');
        if (on) {
            el.classList.remove('is-hidden');
            el.style.visibility = 'visible';
            el.style.pointerEvents = 'auto';
            el.setAttribute('aria-hidden', 'false');
        } else {
            el.classList.add('is-hidden');
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
            el.setAttribute('aria-hidden', 'true');
        }
    }

    function invalidateSoon(map) {
        if (!map) return;
        setTimeout(function () {
            try { map.invalidateSize(true); } catch (_) { /* ignore */ }
        }, 40);
        setTimeout(function () {
            try { map.invalidateSize(true); } catch (_) { /* ignore */ }
        }, 200);
    }

    function ensureGisMap() {
        var host = $('vms-gis-host');
        if (!host || !global.L) return null;
        if (gisMap) {
            invalidateSoon(gisMap);
            return gisMap;
        }
        gisMap = global.L.map(host, {
            zoomControl: true,
            attributionControl: false,
        });
        global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(gisMap);
        var v = vmsSpatialState.gisView;
        gisMap.setView([v.lat, v.lng], v.zoom);
        gisMap.on('moveend', function () {
            if (!gisMap) return;
            var c = gisMap.getCenter();
            vmsSpatialState.gisView = {
                lat: c.lat,
                lng: c.lng,
                zoom: gisMap.getZoom(),
            };
        });
        invalidateSoon(gisMap);
        return gisMap;
    }

    /** Floor CRS.Simple is owned by VmsSpatialFloorplan on #vms-floor-host — do not double-init Leaflet. */
    function notifyFloorInvalidate() {
        if (global.VmsSpatialFloorplan && typeof global.VmsSpatialFloorplan.invalidateSize === 'function') {
            global.VmsSpatialFloorplan.invalidateSize();
        }
    }

    /** Apply vmsSpatialState.mode → DOM hosts + Leaflet size refresh. */
    function renderMapHosts() {
        var mode = vmsSpatialState.mode === 'floor' ? 'floor' : 'gis';
        var gisHost = $('vms-gis-host');
        var floorHost = $('vms-floor-host');
        var ph = $('spatial-map-ph');
        var btnGis = $('vms-mode-gis');
        var btnFloor = $('vms-mode-floor');
        var status = $('spatial-floor-status');
        if (btnGis) btnGis.classList.toggle('is-active', mode === 'gis');
        if (btnFloor) btnFloor.classList.toggle('is-active', mode === 'floor');

        setHostVisible(gisHost, mode === 'gis');
        setHostVisible(floorHost, mode === 'floor');
        if (gisHost) {
            gisHost.classList.toggle('is-active-host', mode === 'gis');
            gisHost.style.zIndex = mode === 'gis' ? '3' : '1';
            gisHost.style.opacity = mode === 'gis' ? '1' : '0';
        }
        if (floorHost) {
            floorHost.classList.toggle('is-active-host', mode === 'floor');
            floorHost.style.zIndex = mode === 'floor' ? '3' : '1';
            floorHost.style.opacity = mode === 'floor' ? '1' : '0';
        }

        if (mode === 'gis') {
            if (ph) ph.hidden = true;
            if (status) status.textContent = 'Outdoor GIS';
            ensureGisMap();
            invalidateSoon(gisMap);
        } else {
            if (status) status.textContent = 'Indoor Floor';
            if (ph) {
                var hasFp = global.VmsSpatialFloorplan && global.VmsSpatialFloorplan.hasMap && global.VmsSpatialFloorplan.hasMap();
                ph.hidden = !!hasFp;
                if (!hasFp) {
                    ph.textContent = 'Select a Zone with a Floor Plan (or Upload as Super Admin)';
                }
            }
            setTimeout(function () { notifyFloorInvalidate(); }, 40);
            setTimeout(function () { notifyFloorInvalidate(); }, 200);
        }
    }

    function setMode(mode) {
        cancelActiveTool();
        vmsSpatialState.mode = mode === 'floor' ? 'floor' : 'gis';
        renderMapHosts();
    }

    function syncToolButtons() {
        var box = $('vms-tool-box');
        var poly = $('vms-tool-polygon');
        if (box) {
            box.classList.toggle('is-active', activeTool === 'box');
            box.setAttribute('aria-pressed', activeTool === 'box' ? 'true' : 'false');
        }
        if (poly) {
            poly.classList.toggle('is-active', activeTool === 'polygon');
            poly.setAttribute('aria-pressed', activeTool === 'polygon' ? 'true' : 'false');
        }
    }

    function setHostDrawClass(on) {
        var gisHost = $('vms-gis-host');
        var floorHost = $('vms-floor-host');
        if (gisHost) gisHost.classList.toggle('vms-draw-active', !!on && vmsSpatialState.mode === 'gis');
        if (floorHost) floorHost.classList.toggle('vms-draw-active', !!on && vmsSpatialState.mode === 'floor');
    }

    function clearGisDrawLayers() {
        if (!gisMap) return;
        if (gisDraw.rect) {
            try { gisMap.removeLayer(gisDraw.rect); } catch (_) { /* ignore */ }
            gisDraw.rect = null;
        }
        if (gisDraw.polyLine) {
            try { gisMap.removeLayer(gisDraw.polyLine); } catch (_) { /* ignore */ }
            gisDraw.polyLine = null;
        }
        if (gisDraw.polyFill) {
            try { gisMap.removeLayer(gisDraw.polyFill); } catch (_) { /* ignore */ }
            gisDraw.polyFill = null;
        }
        gisDraw.boxStart = null;
        gisDraw.polyVerts = [];
    }

    function unbindGisDraw() {
        if (!gisMap || !gisDraw.bound) return;
        gisMap.off('mousedown', onGisBoxDown);
        gisMap.off('mousemove', onGisBoxMove);
        gisMap.off('mouseup', onGisBoxUp);
        gisMap.off('click', onGisPolyClick);
        gisMap.off('dblclick', onGisPolyDbl);
        gisDraw.bound = false;
    }

    function cancelGisDraw() {
        unbindGisDraw();
        clearGisDrawLayers();
        if (gisMap && gisMap.dragging) {
            try { gisMap.dragging.enable(); } catch (_) { /* ignore */ }
        }
        if (gisMap && gisMap.doubleClickZoom) {
            try { gisMap.doubleClickZoom.enable(); } catch (_) { /* ignore */ }
        }
    }

    /**
     * Cancel Box/Polygon on both hosts. Safe to call from setMode / ESC / selectZone.
     */
    function cancelActiveTool() {
        if (cancelActiveTool._busy) return;
        cancelActiveTool._busy = true;
        try {
            cancelGisDraw();
            try {
                if (global.VmsSpatialFloorplan && typeof global.VmsSpatialFloorplan.cancelActiveTool === 'function') {
                    global.VmsSpatialFloorplan.cancelActiveTool();
                }
            } catch (_) { /* ignore */ }
            activeTool = null;
            setHostDrawClass(false);
            syncToolButtons();
        } finally {
            cancelActiveTool._busy = false;
        }
    }

    function onGisBoxDown(e) {
        if (activeTool !== 'box' || vmsSpatialState.mode !== 'gis') return;
        if (e.originalEvent && e.originalEvent.button != null && e.originalEvent.button !== 0) return;
        try { if (global.L && e.originalEvent) global.L.DomEvent.preventDefault(e.originalEvent); } catch (_) { /* ignore */ }
        gisDraw.boxStart = e.latlng;
        clearGisDrawLayers();
        gisDraw.boxStart = e.latlng;
        gisDraw.rect = global.L.rectangle(global.L.latLngBounds(e.latlng, e.latlng), {
            color: '#38bdf8', weight: 2, fillOpacity: 0.12, interactive: false,
        }).addTo(gisMap);
        gisMap.on('mousemove', onGisBoxMove);
        gisMap.on('mouseup', onGisBoxUp);
    }

    function onGisBoxMove(e) {
        if (!gisDraw.boxStart || !gisDraw.rect) return;
        gisDraw.rect.setBounds(global.L.latLngBounds(gisDraw.boxStart, e.latlng));
    }

    function onGisBoxUp(e) {
        gisMap.off('mousemove', onGisBoxMove);
        gisMap.off('mouseup', onGisBoxUp);
        if (!gisDraw.boxStart) return;
        gisDraw.boxStart = null;
        /* GIS pins not mounted yet — no Set change. */
        clearGisDrawLayers();
        var st = $('spatial-floor-status');
        if (st) st.textContent = 'No outdoor cameras on this map yet.';
    }

    function pointInPoly(latlng, verts) {
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

    function redrawGisPoly() {
        if (!gisMap) return;
        if (gisDraw.polyLine) {
            try { gisMap.removeLayer(gisDraw.polyLine); } catch (_) { /* ignore */ }
        }
        if (gisDraw.polyFill) {
            try { gisMap.removeLayer(gisDraw.polyFill); } catch (_) { /* ignore */ }
        }
        gisDraw.polyLine = null;
        gisDraw.polyFill = null;
        if (gisDraw.polyVerts.length < 1) return;
        gisDraw.polyLine = global.L.polyline(gisDraw.polyVerts, {
            color: '#38bdf8', weight: 2, dashArray: '4 4', interactive: false,
        }).addTo(gisMap);
        if (gisDraw.polyVerts.length >= 3) {
            gisDraw.polyFill = global.L.polygon(gisDraw.polyVerts, {
                color: '#38bdf8', weight: 1, fillOpacity: 0.12, interactive: false,
            }).addTo(gisMap);
        }
    }

    function onGisPolyClick(e) {
        if (activeTool !== 'polygon' || vmsSpatialState.mode !== 'gis') return;
        gisDraw.polyVerts.push(e.latlng);
        redrawGisPoly();
    }

    function onGisPolyDbl(e) {
        if (activeTool !== 'polygon' || vmsSpatialState.mode !== 'gis') return;
        try { if (global.L && e.originalEvent) global.L.DomEvent.preventDefault(e.originalEvent); } catch (_) { /* ignore */ }
        if (e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
            e.originalEvent.stopPropagation();
        }
        /* Drop duplicate vertex from second click of dblclick */
        if (gisDraw.polyVerts.length >= 2) gisDraw.polyVerts.pop();
        if (gisDraw.polyVerts.length < 3) {
            clearGisDrawLayers();
            var st = $('spatial-floor-status');
            if (st) st.textContent = 'Polygon needs 3+ points (double-click to finish).';
            return;
        }
        clearGisDrawLayers();
        var st2 = $('spatial-floor-status');
        if (st2) st2.textContent = 'No outdoor cameras on this map yet.';
    }

    function startGisDraw(kind) {
        ensureGisMap();
        if (!gisMap || !global.L) return;
        unbindGisDraw();
        clearGisDrawLayers();
        if (kind === 'box') {
            try { if (gisMap.dragging) gisMap.dragging.disable(); } catch (_) { /* ignore */ }
            gisMap.on('mousedown', onGisBoxDown);
        } else {
            try { if (gisMap.doubleClickZoom) gisMap.doubleClickZoom.disable(); } catch (_) { /* ignore */ }
            gisMap.on('click', onGisPolyClick);
            gisMap.on('dblclick', onGisPolyDbl);
        }
        gisDraw.bound = true;
        setHostDrawClass(true);
        var st = $('spatial-floor-status');
        if (st) {
            st.textContent = kind === 'box'
                ? 'Box Select: drag on Outdoor GIS.'
                : 'Polygon Select: click vertices, double-click to finish.';
        }
    }

    function startTool(kind) {
        var k = kind === 'polygon' ? 'polygon' : 'box';
        /* Starting one tool instantly cancels the other */
        cancelActiveTool();
        activeTool = k;
        syncToolButtons();
        if (vmsSpatialState.mode === 'gis') {
            startGisDraw(k);
        } else if (global.VmsSpatialFloorplan && typeof global.VmsSpatialFloorplan.startDrawTool === 'function') {
            global.VmsSpatialFloorplan.startDrawTool(k);
            setHostDrawClass(true);
        }
    }

    function onEscKey(ev) {
        if (!ev || ev.key !== 'Escape') return;
        if (!shellVisible || !activeTool) return;
        var view = $('app-view-spatial-command');
        if (!view || view.hidden) return;
        var t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        cancelActiveTool();
        var st = $('spatial-floor-status');
        if (st) st.textContent = vmsSpatialState.mode === 'floor' ? 'Indoor Floor' : 'Outdoor GIS';
    }

    function ensureEscBound() {
        if (escBound) return;
        escBound = true;
        document.addEventListener('keydown', onEscKey, true);
    }

    function onModeButtonClick(ev) {
        var t = ev.target;
        if (!t || !t.closest) return;
        var btn = t.closest('#spatial-map-panel [data-vms-mode]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        setMode(btn.getAttribute('data-vms-mode') === 'floor' ? 'floor' : 'gis');
    }

    /**
     * VMS-SPATIAL-SELECTION-RAIL-FLV-V1
     * Strict teardown per slot: AxiomFlv detach (pause→unload→destroy) + drop DOM + ZLM stop.
     * Never leave a live player mapped to a recycled tile.
     */
    function destroyRailSlot(camId) {
        var id = String(camId || '');
        var entry = railPlayers.get(id);
        if (!entry) return;
        railPlayers.delete(id);
        try {
            if (entry.video && global.AxiomFlvManager && typeof global.AxiomFlvManager.detach === 'function') {
                global.AxiomFlvManager.detach(entry.video);
            } else if (entry.player) {
                try { if (typeof entry.player.pause === 'function') entry.player.pause(); } catch (_) { /* ignore */ }
                try { if (typeof entry.player.unload === 'function') entry.player.unload(); } catch (_) { /* ignore */ }
                try {
                    if (typeof entry.player.destroy === 'function') entry.player.destroy();
                    else if (typeof entry.player.detach === 'function') entry.player.detach();
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
        try {
            if (entry.video) {
                entry.video.removeAttribute('src');
                entry.video.load();
                if (entry.video.parentNode) entry.video.parentNode.removeChild(entry.video);
            }
        } catch (_) { /* ignore */ }
        try {
            if (entry.stageEl) entry.stageEl.innerHTML = '';
        } catch (_) { /* ignore */ }
        fetch('/api/fixed-cams/' + encodeURIComponent(id) + '/zlm/stop', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'grid' }),
        }).catch(function () { /* lease */ });
    }

    function destroyAllRailPlayers() {
        var ids = Array.from(railPlayers.keys());
        for (var i = 0; i < ids.length; i++) destroyRailSlot(ids[i]);
        railPlayers.clear();
    }

    function pageCount() {
        var n = vmsSpatialState.selectedCamIds.length;
        return Math.max(1, Math.ceil(n / RAIL_PAGE_SIZE) || 1);
    }

    function clampRailPage() {
        var max = pageCount() - 1;
        if (vmsSpatialState.railCurrentPage > max) vmsSpatialState.railCurrentPage = max;
        if (vmsSpatialState.railCurrentPage < 0) vmsSpatialState.railCurrentPage = 0;
    }

    function mountRailCam(camId, stageEl, labelEl, mountGen) {
        if (!camId || !stageEl) return;
        var id = String(camId);
        if (id.indexOf('ph-cam-') === 0) {
            if (labelEl) labelEl.textContent = 'No stream';
            return;
        }
        if (labelEl) labelEl.textContent = 'Connecting…';
        var gen = mountGen;
        fetch('/api/fixed-cams/' + encodeURIComponent(id) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'grid' }),
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
                /* Stale after [x] / page turn / Set shift — do not attach into recycled DOM */
                if (gen !== railMountGen) return;
                if (!stageEl.isConnected) return;
                var tile = stageEl.closest && stageEl.closest('.vms-rail-tile');
                if (tile && tile.dataset.camId !== id) return;
                if (!res.ok || !res.j || !res.j.flvUrl) {
                    if (labelEl && gen === railMountGen) labelEl.textContent = 'Unavailable';
                    return;
                }
                /* Destroy any leftover for this id before attach (identity lock) */
                if (railPlayers.has(id)) destroyRailSlot(id);
                var video = document.createElement('video');
                video.className = 'vms-rail-video';
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('data-vms-rail-cam', id);
                stageEl.innerHTML = '';
                stageEl.appendChild(video);
                var handle = null;
                if (global.AxiomFlvManager && typeof global.AxiomFlvManager.attach === 'function') {
                    handle = global.AxiomFlvManager.attach(video, res.j.flvUrl, { withCredentials: true });
                }
                if (gen !== railMountGen || !stageEl.isConnected) {
                    try {
                        if (handle && global.AxiomFlvManager && typeof global.AxiomFlvManager.detach === 'function') {
                            global.AxiomFlvManager.detach(video);
                        }
                    } catch (_) { /* ignore */ }
                    try { stageEl.innerHTML = ''; } catch (_) { /* ignore */ }
                    return;
                }
                railPlayers.set(id, { video: video, player: handle, stageEl: stageEl, gen: gen });
                if (labelEl) labelEl.textContent = 'Live';
                try { video.play(); } catch (_) { /* ignore */ }
            })
            .catch(function () {
                if (gen !== railMountGen) return;
                if (labelEl) labelEl.textContent = 'Unavailable';
            });
    }

    /**
     * Full page rebuild: destroy all FLV → wipe tiles → remount current Set slice.
     * Used on [x], selection change, and pager — prevents Cam N video in Cam N+1 slot.
     * While Wall 2 investigation is active: UI tiles only (no FLV) — ghost wake lock.
     */
    function remountRailPage() {
        if (wall2InvestigationActive) {
            renderRailIdlePage();
            return;
        }
        clampRailPage();
        railMountGen += 1;
        var gen = railMountGen;
        destroyAllRailPlayers();
        var tiles = $('vms-rail-tiles');
        var empty = $('vms-rail-empty');
        var label = $('vms-rail-page-label');
        var prev = $('vms-rail-prev');
        var next = $('vms-rail-next');
        if (!tiles) return;

        var ids = vmsSpatialState.selectedCamIds;
        var pages = pageCount();
        var page = vmsSpatialState.railCurrentPage;
        if (label) label.textContent = 'Page ' + (page + 1) + ' of ' + pages;
        if (prev) prev.disabled = page <= 0 || ids.length === 0;
        if (next) next.disabled = page >= pages - 1 || ids.length === 0;

        tiles.innerHTML = '';
        if (!ids.length) {
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;

        var start = page * RAIL_PAGE_SIZE;
        var slice = ids.slice(start, start + RAIL_PAGE_SIZE);
        for (var i = 0; i < slice.length; i++) {
            var camId = slice[i];
            var card = document.createElement('div');
            card.className = 'vms-rail-tile';
            card.dataset.camId = camId;
            card.innerHTML =
                '<div class="vms-rail-tile-head">' +
                '<span>' + esc(resolveCamChromeLabel(camId)) + '</span>' +
                '<button type="button" class="btn btn-ghost btn-sm vms-rail-remove" data-cam-id="' + esc(camId) + '" aria-label="Remove">×</button>' +
                '</div>' +
                '<div class="vms-rail-tile-stage"></div>' +
                '<div class="vms-rail-tile-status">Idle</div>';
            tiles.appendChild(card);
            mountRailCam(camId, card.querySelector('.vms-rail-tile-stage'), card.querySelector('.vms-rail-tile-status'), gen);
        }
    }

    /** IDs stay; no FLV — rail idle while Investigation Window holds the streams. */
    function renderRailIdlePage() {
        clampRailPage();
        railMountGen += 1;
        destroyAllRailPlayers();
        var tiles = $('vms-rail-tiles');
        var empty = $('vms-rail-empty');
        var label = $('vms-rail-page-label');
        var prev = $('vms-rail-prev');
        var next = $('vms-rail-next');
        if (!tiles) return;

        var ids = vmsSpatialState.selectedCamIds;
        var pages = pageCount();
        var page = vmsSpatialState.railCurrentPage;
        if (label) label.textContent = 'Page ' + (page + 1) + ' of ' + pages;
        if (prev) prev.disabled = page <= 0 || ids.length === 0;
        if (next) next.disabled = page >= pages - 1 || ids.length === 0;

        tiles.innerHTML = '';
        if (!ids.length) {
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;

        var start = page * RAIL_PAGE_SIZE;
        var slice = ids.slice(start, start + RAIL_PAGE_SIZE);
        for (var i = 0; i < slice.length; i++) {
            var camId = slice[i];
            var card = document.createElement('div');
            card.className = 'vms-rail-tile vms-rail-tile-idle';
            card.dataset.camId = camId;
            card.innerHTML =
                '<div class="vms-rail-tile-head">' +
                '<span>' + esc(resolveCamChromeLabel(camId)) + '</span>' +
                '<button type="button" class="btn btn-ghost btn-sm vms-rail-remove" data-cam-id="' + esc(camId) + '" aria-label="Remove">×</button>' +
                '</div>' +
                '<div class="vms-rail-tile-stage vms-rail-tile-stage-idle"></div>' +
                '<div class="vms-rail-tile-status">Idle — Active in Investigation Window</div>';
            tiles.appendChild(card);
        }
    }

    function showSelectionToast(msg) {
        var el = $('spatial-tq-hint');
        if (el) {
            el.textContent = msg || '';
            el.hidden = !msg;
        }
        /* Prefer existing standby toast if present */
        var toast = document.getElementById('fr-ptt-standby-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'vms-selection-toast';
            toast.setAttribute('role', 'status');
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:13px;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.hidden = false;
        if (showSelectionToast._t) clearTimeout(showSelectionToast._t);
        showSelectionToast._t = setTimeout(function () { toast.hidden = true; }, 4000);
    }

    /**
     * VMS-SPATIAL-SELECTION-QUEUE-MATH-V1
     * Dedup first → keep existing order → append until 20 → drop overflow → one toast.
     */
    function appendSelectionIds(newIds) {
        var existing = vmsSpatialState.selectedCamIds;
        var seen = {};
        var i;
        for (i = 0; i < existing.length; i++) seen[String(existing[i])] = true;
        var toAdd = [];
        var raw = Array.isArray(newIds) ? newIds : [newIds];
        for (i = 0; i < raw.length; i++) {
            var id = String(raw[i] || '').trim();
            if (!id || seen[id]) continue;
            seen[id] = true;
            toAdd.push(id);
        }
        if (!toAdd.length) {
            afterSelectionChange();
            return { added: 0, truncated: false };
        }
        var added = 0;
        var truncated = false;
        for (i = 0; i < toAdd.length; i++) {
            if (existing.length >= MAX_SELECTION) {
                truncated = true;
                break;
            }
            existing.push(toAdd[i]);
            added += 1;
        }
        if (truncated) {
            showSelectionToast('Selection limit reached (20 max).');
        }
        afterSelectionChange();
        return { added: added, truncated: truncated };
    }

    function removeSelectionId(camId) {
        var id = String(camId || '').trim();
        if (!id) return;
        var list = vmsSpatialState.selectedCamIds;
        var ix = list.indexOf(id);
        if (ix < 0) return;
        list.splice(ix, 1);
        afterSelectionChange();
    }

    function toggleCamSelection(camId) {
        var id = String(camId || '').trim();
        if (!id) return;
        var list = vmsSpatialState.selectedCamIds;
        var ix = list.indexOf(id);
        if (ix >= 0) {
            list.splice(ix, 1);
            vmsSpatialState.camId = id;
            afterSelectionChange();
            return;
        }
        vmsSpatialState.camId = id;
        appendSelectionIds([id]);
    }

    function clearSelection() {
        vmsSpatialState.selectedCamIds = [];
        vmsSpatialState.railCurrentPage = 0;
        afterSelectionChange();
    }

    function isSelected(camId) {
        return vmsSpatialState.selectedCamIds.indexOf(String(camId || '')) >= 0;
    }

    /** Halo on visible floor pins only — skip missing markers. */
    function syncSelectionHalo() {
        try {
            if (global.VmsSpatialFloorplan && typeof global.VmsSpatialFloorplan.syncSelectionHalo === 'function') {
                global.VmsSpatialFloorplan.syncSelectionHalo(vmsSpatialState.selectedCamIds.slice());
            }
        } catch (_) { /* ignore */ }
    }

    function renderSelectionCount() {
        var n = vmsSpatialState.selectedCamIds.length;
        var countEl = $('vms-selection-count');
        var emptyEl = $('spatial-tq-empty');
        var clearBtn = $('spatial-tq-clear');
        var launchBtn = $('spatial-tq-push');
        if (countEl) {
            countEl.textContent = n > 0
                ? (n + ' Cameras Selected')
                : 'No cameras selected.';
        }
        if (emptyEl) emptyEl.hidden = n > 0;
        if (clearBtn) clearBtn.disabled = n === 0;
        if (launchBtn) {
            launchBtn.hidden = false;
            launchBtn.removeAttribute('aria-hidden');
            launchBtn.disabled = n === 0;
        }
        var list = $('spatial-tq-list');
        if (list) {
            if (!n) {
                list.innerHTML = '';
                list.hidden = true;
            } else {
                list.hidden = false;
                list.innerHTML = vmsSpatialState.selectedCamIds.map(function (id) {
                    return '<li class="spatial-tq-item" data-cam-id="' + esc(id) + '">' +
                        '<span class="spatial-tq-name">' + esc(resolveCamChromeLabel(id)) + '</span>' +
                        '<button type="button" class="btn btn-ghost btn-sm vms-sel-remove" data-cam-id="' + esc(id) + '" aria-label="Remove">×</button>' +
                        '</li>';
                }).join('');
            }
        }
    }

    /**
     * VMS-SPATIAL-LAUNCH-PAYLOAD-V1
     * Manual investigation payload from Set: active Live Preview page vs Pool.
     * Phase 2a: build + console verify only (no window.open / Overwrite — 2b).
     */
    function buildLaunchPayload() {
        clampRailPage();
        var all = vmsSpatialState.selectedCamIds.slice();
        var page = vmsSpatialState.railCurrentPage;
        var start = page * RAIL_PAGE_SIZE;
        var livePreview = all.slice(start, start + RAIL_PAGE_SIZE);
        var liveSet = {};
        var i;
        for (i = 0; i < livePreview.length; i++) liveSet[livePreview[i]] = true;
        var pool = [];
        for (i = 0; i < all.length; i++) {
            if (!liveSet[all[i]]) pool.push(all[i]);
        }
        return {
            version: 1,
            source: 'command-spatial',
            reason: 'manual',
            layout: '2x3',
            createdAt: new Date().toISOString(),
            siteId: vmsSpatialState.siteId || null,
            zoneId: vmsSpatialState.zoneId || null,
            floorId: vmsSpatialState.floorId || null,
            selection: all,
            livePreviewPage: page + 1,
            livePreviewPageCount: pageCount(),
            livePreview: livePreview,
            pool: pool,
            camLabels: buildCamLabelsMap(all),
            /* 2×3 fill hint for Phase 3: five from Live Preview + first from Pool (or empty) */
            fillHint: {
                cells: livePreview.slice(),
                sixth: pool.length ? pool[0] : null,
            },
        };
    }

    var lastLaunchPayload = null;
    /** VMS-SPATIAL-WALL2-OPEN-FAILSAFE-V1 + RAIL-IDLE-WHILE-WALL2-V1 */
    var WALL2_CH = 'mobility-axiom-vms-wall2';
    var WALL2_NAME = 'vms-wall2-investigation';
    var WALL2_URL = '/vms-investigation.html';
    var WALL2_STORAGE_KEY = 'vms-wall2-launch-payload';
    var wall2Window = null;
    var wall2Channel = null;
    var wall2LastPongAt = 0;
    var wall2ChannelBound = false;
    var wall2CloseWatchTimer = null;

    function enterRailIdleAfterHandoff() {
        wall2InvestigationActive = true;
        renderRailIdlePage();
        ensureWall2CloseWatch();
    }

    function wakeRailAfterWall2Close() {
        if (!wall2InvestigationActive && !wall2Window) {
            wall2LastPongAt = 0;
            return;
        }
        wall2InvestigationActive = false;
        wall2LastPongAt = 0;
        wall2Window = null;
        if (wall2CloseWatchTimer) {
            clearInterval(wall2CloseWatchTimer);
            wall2CloseWatchTimer = null;
        }
        remountRailPage();
        var hint = $('spatial-tq-hint');
        if (hint) {
            hint.hidden = false;
            hint.textContent = 'Investigation closed.';
        }
    }

    function ensureWall2CloseWatch() {
        if (wall2CloseWatchTimer) return;
        wall2CloseWatchTimer = setInterval(function () {
            if (!wall2InvestigationActive) return;
            try {
                if (wall2Window && wall2Window.closed) {
                    wakeRailAfterWall2Close();
                }
            } catch (_) { /* ignore */ }
        }, 1500);
    }

    function ensureWall2Channel() {
        if (wall2ChannelBound) return wall2Channel;
        wall2ChannelBound = true;
        if (typeof global.BroadcastChannel !== 'function') return null;
        try {
            wall2Channel = new global.BroadcastChannel(WALL2_CH);
            wall2Channel.onmessage = function (ev) {
                var d = ev && ev.data;
                if (!d || typeof d !== 'object') return;
                if (d.type === 'pong') {
                    wall2LastPongAt = Date.now();
                } else if (d.type === 'wall2-closed' || d.type === 'closed') {
                    wakeRailAfterWall2Close();
                }
            };
        } catch (_) {
            wall2Channel = null;
        }
        return wall2Channel;
    }

    function postWall2(msg) {
        var ch = ensureWall2Channel();
        if (!ch) return;
        try { ch.postMessage(msg); } catch (_) { /* ignore */ }
    }

    function isWall2Alive() {
        try {
            if (wall2Window && !wall2Window.closed) return true;
        } catch (_) { /* cross-origin unlikely same origin */ }
        return wall2LastPongAt > 0 && (Date.now() - wall2LastPongAt) < 5000;
    }

    function showOperatorToast(msg) {
        showSelectionToast(msg);
        var hint = $('spatial-tq-hint');
        if (hint) {
            hint.hidden = false;
            hint.textContent = msg;
        }
    }

    function ensureOverwriteModal() {
        var el = $('vms-wall2-overwrite-modal');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'vms-wall2-overwrite-modal';
        el.className = 'vms-wall2-overwrite-modal';
        el.hidden = true;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', 'vms-wall2-overwrite-title');
        el.innerHTML =
            '<div class="vms-wall2-overwrite-card enterprise-card">' +
            '<p id="vms-wall2-overwrite-title" class="vms-wall2-overwrite-title">Overwrite active investigation?</p>' +
            '<div class="vms-wall2-overwrite-actions">' +
            '<button type="button" class="btn btn-action btn-sm" id="vms-wall2-overwrite-yes">Overwrite</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="vms-wall2-overwrite-no">Cancel</button>' +
            '</div></div>';
        document.body.appendChild(el);
        var yes = el.querySelector('#vms-wall2-overwrite-yes');
        var no = el.querySelector('#vms-wall2-overwrite-no');
        if (yes) {
            yes.addEventListener('click', function () {
                el.hidden = true;
                if (lastLaunchPayload) broadcastOverwrite(lastLaunchPayload);
            });
        }
        if (no) {
            no.addEventListener('click', function () {
                el.hidden = true;
                /* Cancel: leave Wall 1 Set / Live Preview untouched */
            });
        }
        el.addEventListener('click', function (ev) {
            if (ev.target === el) {
                el.hidden = true;
            }
        });
        return el;
    }

    function showOverwriteModal() {
        var el = ensureOverwriteModal();
        el.hidden = false;
    }

    function storePayloadForWall2(payload) {
        try {
            sessionStorage.setItem(WALL2_STORAGE_KEY, JSON.stringify(payload));
        } catch (_) { /* ignore */ }
    }

    function broadcastOverwrite(payload) {
        storePayloadForWall2(payload);
        postWall2({ type: 'overwrite', payload: payload, at: Date.now() });
        showOperatorToast('Emergency view updated.');
        enterRailIdleAfterHandoff();
    }

    function openWall2Dead(payload) {
        ensureWall2Channel();
        storePayloadForWall2(payload);
        var win = null;
        try {
            win = global.open(WALL2_URL, WALL2_NAME);
        } catch (_) {
            win = null;
        }
        if (win) wall2Window = win;
        if (!win) {
            showOperatorToast('Popup blocked. Please allow popups for the Investigation Window.');
            return false;
        }
        setTimeout(function () {
            postWall2({ type: 'launch', payload: payload, at: Date.now() });
            postWall2({ type: 'ping', at: Date.now() });
        }, 400);
        showOperatorToast('Investigation window opened.');
        enterRailIdleAfterHandoff();
        return true;
    }

    function onLaunchInvestigationClick(ev) {
        if (ev) ev.preventDefault();
        if (!vmsSpatialState.selectedCamIds.length) return;
        cancelActiveTool();
        lastLaunchPayload = buildLaunchPayload();
        try {
            console.log('[Command Spatial] Launch Investigation payload', lastLaunchPayload);
        } catch (_) { /* ignore */ }

        ensureWall2Channel();
        postWall2({ type: 'ping', at: Date.now() });

        if (isWall2Alive()) {
            showOverwriteModal();
            return;
        }
        /* Brief wait for late pong if window exists without local handle */
        setTimeout(function () {
            if (!lastLaunchPayload) return;
            if (isWall2Alive()) {
                showOverwriteModal();
                return;
            }
            openWall2Dead(lastLaunchPayload);
        }, 250);
    }

    function afterSelectionChange() {
        clampRailPage();
        renderSelectionCount();
        remountRailPage();
        syncTreeSelectionUi();
        syncSelectionHalo();
        try {
            if (typeof global.onSelectionQueueChanged === 'function') {
                global.onSelectionQueueChanged(vmsSpatialState.selectedCamIds.slice());
            }
        } catch (_) { /* Phase 2 hook */ }
    }

    function onRailClick(ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.vms-rail-remove, .vms-sel-remove');
        if (!btn) return;
        ev.preventDefault();
        removeSelectionId(btn.getAttribute('data-cam-id'));
    }

    function syncTreeSelectionUi() {
        var body = $('spatial-tree-body');
        if (!body) return;
        var nodes = body.querySelectorAll('[data-vms-cam-id]');
        for (var i = 0; i < nodes.length; i++) {
            var id = nodes[i].getAttribute('data-vms-cam-id');
            nodes[i].classList.toggle('is-selected', vmsSpatialState.selectedCamIds.indexOf(id) >= 0);
        }
    }

    function renderPlaceholderTree() {
        var body = $('spatial-tree-body');
        if (!body) return;
        /* API sites win — do not clobber real deployment tree */
        if (body.querySelector('.spatial-tree-site') && !body.querySelector('.vms-shell-tree')) return;

        var html = '<div class="vms-shell-tree">';
        for (var s = 0; s < PLACEHOLDER_TREE.length; s++) {
            var site = PLACEHOLDER_TREE[s];
            html += '<div class="spatial-tree-site vms-tree-site" data-vms-site-id="' + esc(site.id) + '">';
            html += '<button type="button" class="vms-tree-site-btn spatial-tree-site-name" data-vms-site-id="' + esc(site.id) + '">' + esc(site.name) + '</button>';
            for (var z = 0; z < site.zones.length; z++) {
                var zone = site.zones[z];
                html += '<div class="vms-tree-zone" data-vms-zone-id="' + esc(zone.id) + '">';
                html += '<div class="spatial-zone-meta">' + esc(zone.name) + '</div>';
                for (var f = 0; f < zone.floors.length; f++) {
                    var floor = zone.floors[f];
                    html += '<button type="button" class="spatial-zone-btn vms-tree-floor-btn" data-vms-site-id="' + esc(site.id) +
                        '" data-vms-zone-id="' + esc(zone.id) + '" data-vms-floor-id="' + esc(floor.id) + '">' +
                        '<span>' + esc(floor.name) + '</span><span class="spatial-zone-meta">Indoor</span></button>';
                    html += '<div class="vms-tree-cams" data-vms-floor-id="' + esc(floor.id) + '">';
                    for (var c = 0; c < floor.cams.length; c++) {
                        var cam = floor.cams[c];
                        html += '<button type="button" class="vms-tree-cam-btn" data-vms-cam-id="' + esc(cam.id) + '">' + esc(cam.name) + '</button>';
                    }
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        body.innerHTML = html;
        syncTreeSelectionUi();
    }

    function onTreeClick(ev) {
        var t = ev.target;
        if (!t || !t.closest) return;
        var camBtn = t.closest('[data-vms-cam-id]');
        if (camBtn) {
            toggleCamSelection(camBtn.getAttribute('data-vms-cam-id'));
            return;
        }
        var floorBtn = t.closest('[data-vms-floor-id].vms-tree-floor-btn');
        if (floorBtn) {
            vmsSpatialState.siteId = floorBtn.getAttribute('data-vms-site-id');
            vmsSpatialState.zoneId = floorBtn.getAttribute('data-vms-zone-id');
            vmsSpatialState.floorId = floorBtn.getAttribute('data-vms-floor-id');
            setMode('floor');
            var status = $('spatial-floor-status');
            if (status) {
                var floorNameEl = floorBtn.querySelector('span');
                var floorName = floorNameEl ? String(floorNameEl.textContent || '').trim() : '';
                status.textContent = floorName || 'Indoor Floor';
            }
            return;
        }
        var siteBtn = t.closest('[data-vms-site-id].vms-tree-site-btn');
        if (siteBtn) {
            vmsSpatialState.siteId = siteBtn.getAttribute('data-vms-site-id');
            vmsSpatialState.zoneId = null;
            vmsSpatialState.floorId = null;
            setMode('gis');
            var st = $('spatial-floor-status');
            if (st) {
                var siteName = String(siteBtn.textContent || '').trim();
                st.textContent = siteName || 'Outdoor GIS';
            }
        }
    }

    function ensureModeClickBound() {
        if (modeClickBound) return;
        modeClickBound = true;
        document.addEventListener('click', onModeButtonClick, true);
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        var body = $('spatial-tree-body');
        if (body) body.addEventListener('click', onTreeClick);
        ensureModeClickBound();
        var panel = $('spatial-video-panel');
        if (panel) panel.addEventListener('click', onRailClick);
        var tqList = $('spatial-tq-list');
        if (tqList) tqList.addEventListener('click', onRailClick);
        var clearBtn = $('spatial-tq-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                clearSelection();
            });
        }
        /* Phase 2a: Launch Investigation visible; open/Overwrite is 2b */
        var launchBtn = $('spatial-tq-push');
        if (launchBtn) {
            launchBtn.hidden = false;
            launchBtn.removeAttribute('aria-hidden');
            launchBtn.addEventListener('click', onLaunchInvestigationClick);
        }
        var prev = $('vms-rail-prev');
        var next = $('vms-rail-next');
        if (prev) {
            prev.addEventListener('click', function () {
                if (vmsSpatialState.railCurrentPage <= 0) return;
                vmsSpatialState.railCurrentPage -= 1;
                remountRailPage();
            });
        }
        if (next) {
            next.addEventListener('click', function () {
                if (vmsSpatialState.railCurrentPage >= pageCount() - 1) return;
                vmsSpatialState.railCurrentPage += 1;
                remountRailPage();
            });
        }
        var toolBox = $('vms-tool-box');
        var toolPoly = $('vms-tool-polygon');
        if (toolBox) {
            toolBox.addEventListener('click', function () {
                if (activeTool === 'box') cancelActiveTool();
                else startTool('box');
            });
        }
        if (toolPoly) {
            toolPoly.addEventListener('click', function () {
                if (activeTool === 'polygon') cancelActiveTool();
                else startTool('polygon');
            });
        }
        ensureEscBound();
        renderSelectionCount();
        syncToolButtons();
    }

    /* Wire mode toggle immediately (do not wait for Command Spatial onShow) */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureModeClickBound);
    } else {
        ensureModeClickBound();
    }

    function onShow() {
        shellVisible = true;
        bindUi();
        ensureWall2Channel();
        ensureGisMap();
        setMode(vmsSpatialState.mode || 'gis');
        setTimeout(function () {
            if (!shellVisible) return;
            var body = $('spatial-tree-body');
            var hasApi = body && body.querySelector('.spatial-tree-site') && !body.querySelector('.vms-shell-tree');
            if (!hasApi) renderPlaceholderTree();
            remountRailPage();
            renderSelectionCount();
            syncSelectionHalo();
            if (vmsSpatialState.mode === 'gis') invalidateSoon(gisMap);
            else notifyFloorInvalidate();
        }, 350);
    }

    function onHide() {
        shellVisible = false;
        cancelActiveTool();
        destroyAllRailPlayers();
    }

    global.vmsSpatialState = vmsSpatialState;
    global.VmsCommandShell = {
        onShow: onShow,
        onHide: onHide,
        setMode: setMode,
        renderMapHosts: renderMapHosts,
        remountRail: remountRailPage,
        destroyRail: destroyAllRailPlayers,
        renderPlaceholderTree: renderPlaceholderTree,
        getState: function () { return vmsSpatialState; },
        RAIL_PAGE_SIZE: RAIL_PAGE_SIZE,
        MAX_SELECTION: MAX_SELECTION,
        appendSelectionIds: appendSelectionIds,
        toggleCamSelection: toggleCamSelection,
        removeSelectionId: removeSelectionId,
        clearSelection: clearSelection,
        isSelected: isSelected,
        syncSelectionHalo: syncSelectionHalo,
        getSelectedCamIds: function () { return vmsSpatialState.selectedCamIds.slice(); },
        cancelActiveTool: cancelActiveTool,
        startTool: startTool,
        getActiveTool: function () { return activeTool; },
        buildLaunchPayload: buildLaunchPayload,
        getLastLaunchPayload: function () { return lastLaunchPayload ? JSON.parse(JSON.stringify(lastLaunchPayload)) : null; },
        isWall2Alive: isWall2Alive,
        isWall2InvestigationActive: function () { return !!wall2InvestigationActive; },
        wakeRailAfterWall2Close: wakeRailAfterWall2Close,
    };
})(window);
