/**
 * TACTICAL-LEAFLET-DRAW-V1 + TACTICAL-DRAW-DELETE-LIST-UX-V1
 * + TACTICAL-AR-CIRCLE-BATCH-OPEN-V1
 * + TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1 (exclusive Prepare/Operate + banner)
 */
(function (global) {
    'use strict';

    let map = null;
    let mapReady = false;
    let drawnItems = null;
    let activeHandler = null;
    let activeMode = null;
    let draftLayer = null;
    let zones = [];
    let zoneSeq = 0;
    let uiBound = false;
    let layerClickBound = false;
    let skipStatusOverwrite = false;

    const DRAW_STYLE = {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.95,
        fillColor: '#2563eb',
        fillOpacity: 0.22,
    };
    const GRAB_STYLE = {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.95,
        fillColor: '#f59e0b',
        fillOpacity: 0.2,
        dashArray: '6, 4',
    };

    /** idle | place | grab | polygon | zone-circle | edit | delete */
    let flowMode = 'idle';

    function tr(key, fallback) {
        if (global.I18n && I18n.t) {
            const v = I18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback || key;
    }

    function setStatus(key, fallback) {
        const status = document.getElementById('ax-tactical-status');
        if (status) status.textContent = tr(key, fallback);
    }

    function syncModeBanner() {
        const banner = document.getElementById('ax-tactical-mode-banner');
        if (!banner) return;
        let key = 'tactical.bannerIdle';
        let text = 'Idle — drag map to move';
        let mode = flowMode || 'idle';
        if (mode === 'place') {
            key = 'tactical.bannerPlace';
            text = 'PREPARE — click map to place pin';
        } else if (mode === 'grab') {
            key = 'tactical.bannerGrab';
            text = 'OPERATE — drag on map to draw a select zone';
        } else if (mode === 'polygon' || mode === 'zone-circle') {
            key = 'tactical.bannerZoneDraw';
            text = 'ZONES — draw on map';
        } else if (mode === 'edit') {
            key = 'tactical.bannerZoneEdit';
            text = 'ZONES — edit shape';
        } else if (mode === 'delete') {
            key = 'tactical.bannerZoneDelete';
            text = 'ZONES — click shape to delete';
        }
        banner.setAttribute('data-mode', mode);
        banner.textContent = tr(key, text);
        banner.classList.toggle('is-prepare', mode === 'place');
        banner.classList.toggle('is-operate', mode === 'grab');
        banner.classList.toggle('is-zone', mode === 'polygon' || mode === 'zone-circle' || mode === 'edit' || mode === 'delete');
    }

    function clearActiveToolButtons() {
        document.querySelectorAll('.ax-tactical-draw-btns .btn, #ax-tactical-grab-circle, #ax-tactical-poi-place').forEach(function (btn) {
            btn.classList.remove('active');
        });
    }

    function cancelPlacePoi() {
        if (global.TacticalPoi && typeof TacticalPoi.setPlaceMode === 'function') {
            try { TacticalPoi.setPlaceMode(false, { fromShell: true }); } catch (_) { /* ignore */ }
        }
    }

    function goIdle(opts) {
        opts = opts || {};
        stopHandler();
        if (!opts.keepPlace) cancelPlacePoi();
        flowMode = 'idle';
        clearActiveToolButtons();
        syncModeBanner();
        syncOpenInCircleEnabled();
        if (!opts.silentStatus) setStatus('tactical.statusIdle', 'Idle — drag map to move');
    }

    function enterPlaceMode() {
        stopHandler();
        flowMode = 'place';
        clearActiveToolButtons();
        const btn = document.getElementById('ax-tactical-poi-place');
        if (btn) btn.classList.add('active');
        syncModeBanner();
        setStatus('tactical.bannerPlace', 'PREPARE — click map to place pin');
    }

    function enterGrabMode() {
        cancelPlacePoi();
        if (!map || !global.L || !global.L.Draw) return;
        if (flowMode === 'grab' && activeMode === 'grab') {
            goIdle();
            return;
        }
        stopHandler();
        ensureDraw();
        clearGrabCircles();
        activeHandler = new global.L.Draw.Circle(map, {
            shapeOptions: GRAB_STYLE,
            showRadius: true,
            metric: true,
        });
        activeHandler.enable();
        activeMode = 'grab';
        flowMode = 'grab';
        clearActiveToolButtons();
        const btn = document.getElementById('ax-tactical-grab-circle');
        if (btn) btn.classList.add('active');
        try { map.getContainer().style.cursor = 'crosshair'; } catch (_) { /* ignore */ }
        syncModeBanner();
        setStatus('tactical.bannerGrab', 'OPERATE — drag on map to draw a select zone');
    }

    function clearGrabCircles() {
        if (!drawnItems) return;
        const doomed = [];
        drawnItems.eachLayer(function (layer) {
            if (layer && layer._tacticalGrab) doomed.push(layer);
        });
        doomed.forEach(function (layer) {
            try { drawnItems.removeLayer(layer); } catch (_) { /* ignore */ }
            try {
                if (map && map.hasLayer && map.hasLayer(layer)) map.removeLayer(layer);
            } catch (_) { /* ignore */ }
            if (draftLayer === layer) draftLayer = null;
        });
    }

    function incidentId() {
        const el = document.getElementById('ax-tactical-incident-id');
        return el ? String(el.value || '').trim() : '';
    }

    function kindLabel(kind) {
        const k = String(kind || 'shape').toLowerCase();
        if (k === 'circle') return tr('tactical.kindCircle', 'Circle');
        if (k === 'polygon') return tr('tactical.kindPolygon', 'Polygon');
        return tr('tactical.kindShape', 'Shape');
    }

    function layerToGeoJSON(layer) {
        if (!layer || typeof layer.toGeoJSON !== 'function') return null;
        const gj = layer.toGeoJSON();
        if (!gj) return null;
        if (layer instanceof global.L.Circle) {
            const c = layer.getLatLng();
            return {
                type: 'Feature',
                properties: {
                    kind: 'circle',
                    radiusM: layer.getRadius(),
                },
                geometry: {
                    type: 'Point',
                    coordinates: [c.lng, c.lat],
                },
            };
        }
        if (!gj.properties) gj.properties = {};
        if (!gj.properties.kind) {
            gj.properties.kind = (gj.geometry && gj.geometry.type === 'Polygon') ? 'polygon' : 'shape';
        }
        return gj;
    }

    function stopHandler(opts) {
        opts = opts || {};
        if (activeHandler) {
            try {
                if (opts.commit && typeof activeHandler.save === 'function') {
                    activeHandler.save();
                } else if (opts.revert && typeof activeHandler.revertLayers === 'function') {
                    activeHandler.revertLayers();
                }
            } catch (_) { /* ignore */ }
            try { activeHandler.disable(); } catch (_) { /* ignore */ }
            activeHandler = null;
        }
        activeMode = null;
        document.querySelectorAll('.ax-tactical-draw-btns .btn, #ax-tactical-grab-circle').forEach(function (btn) {
            btn.classList.remove('active');
        });
        if (map && map.getContainer) {
            try { map.getContainer().style.cursor = ''; } catch (_) { /* ignore */ }
        }
    }

    function finishActiveIf(mode) {
        if (activeMode === mode && activeHandler) {
            stopHandler({ commit: true });
            syncSaveEnabled();
            return true;
        }
        if (activeMode === mode && mode === 'delete') {
            stopHandler();
            syncSaveEnabled();
            return true;
        }
        return false;
    }

    function syncSaveEnabled() {
        const btn = document.getElementById('ax-tactical-save-zone');
        if (btn) {
            const ok = !!draftLayer && !!incidentId();
            btn.disabled = !ok;
        }
        syncOpenInCircleEnabled();
        if (skipStatusOverwrite) return;
        if (activeMode === 'delete' || activeMode === 'edit' || activeMode === 'polygon' || activeMode === 'circle' || activeMode === 'grab' || activeMode === 'zone-circle') {
            return;
        }
        if (!draftLayer && !zones.length) {
            setStatus('tactical.statusIdle', 'Idle');
        } else if (draftLayer && !incidentId()) {
            setStatus('tactical.statusNeedIncident', 'Need incident');
        } else if (!draftLayer && incidentId()) {
            setStatus('tactical.statusNeedShape', 'Need shape');
        } else if (draftLayer && incidentId()) {
            setStatus('tactical.statusReadySave', 'Ready to save');
        }
    }

    function layerIsCircle(layer) {
        if (!layer || !global.L) return false;
        if (layer instanceof global.L.Circle) return true;
        return typeof layer.getRadius === 'function' && typeof layer.getLatLng === 'function';
    }

    /** Prefer OPERATE grab circle; else draft/saved circle. */
    function getGrabCircle() {
        function pack(layer) {
            if (!layerIsCircle(layer)) return null;
            try {
                const center = layer.getLatLng();
                const radiusM = layer.getRadius();
                if (!center || !(radiusM > 0)) return null;
                return { center: center, radiusM: radiusM, layer: layer, isGrab: !!layer._tacticalGrab };
            } catch (_) {
                return null;
            }
        }
        let grabFound = null;
        let other = null;
        if (drawnItems) {
            drawnItems.eachLayer(function (layer) {
                const packed = pack(layer);
                if (!packed) return;
                if (packed.isGrab && !grabFound) grabFound = packed;
                else if (!other) other = packed;
            });
        }
        if (grabFound) return grabFound;
        const fromDraft = pack(draftLayer);
        if (fromDraft) return fromDraft;
        if (other) return other;
        for (let i = 0; i < zones.length; i++) {
            const packed = pack(zones[i] && zones[i].layer);
            if (packed) return packed;
        }
        return null;
    }

    function syncOpenInCircleEnabled() {
        const btn = document.getElementById('ax-tactical-open-in-circle');
        if (!btn) return;
        btn.disabled = !getGrabCircle();
    }

    function onOpenInCircleClick() {
        if (global.TacticalPoi && typeof TacticalPoi.openInCircle === 'function') {
            TacticalPoi.openInCircle();
            return;
        }
        setStatus('tactical.circleNeedModule', 'POI module not loaded');
        if (global.AdminActionBus && AdminActionBus.toast) {
            try { AdminActionBus.toast(tr('tactical.circleNeedModule', 'POI module not loaded'), 5000); } catch (_) { /* ignore */ }
        }
    }

    function onCreated(e) {
        const layer = e.layer;
        if (!layer) return;
        const wasGrab = activeMode === 'grab';
        if (wasGrab) {
            clearGrabCircles();
            layer.setStyle && layer.setStyle(GRAB_STYLE);
            layer._tacticalGrab = true;
            layer._tacticalDraft = false;
        } else {
            layer.setStyle && layer.setStyle(DRAW_STYLE);
            layer._tacticalDraft = true;
            layer._tacticalGrab = false;
        }
        drawnItems.addLayer(layer);
        bindLayerClick(layer);
        stopHandler();
        if (wasGrab) {
            draftLayer = null;
            flowMode = 'idle';
            clearActiveToolButtons();
            syncModeBanner();
            setStatus('tactical.grabReady', 'Select zone ready — tap Open cameras');
            if (global.AdminActionBus && AdminActionBus.toast) {
                try {
                    AdminActionBus.toast(tr('tactical.grabReady', 'Select zone ready — tap Open cameras'), 4500);
                } catch (_) { /* ignore */ }
            }
        } else {
            draftLayer = layer;
            flowMode = 'idle';
            clearActiveToolButtons();
            syncModeBanner();
        }
        syncSaveEnabled();
        syncOpenInCircleEnabled();
    }

    function renderZonesList() {
        const empty = document.getElementById('ax-tactical-zones-empty');
        const list = document.getElementById('ax-tactical-zones-list');
        if (!empty || !list) return;
        if (!zones.length) {
            empty.hidden = false;
            list.hidden = true;
            list.innerHTML = '';
            return;
        }
        empty.hidden = true;
        list.hidden = false;
        list.innerHTML = zones.map(function (z) {
            const kind = (z.geojson && z.geojson.properties && z.geojson.properties.kind) || 'shape';
            return '<li class="ax-tactical-zone-row" data-zone-id="' + esc(z.id) + '">'
                + '<span class="ax-tactical-zone-id">' + esc(z.incidentId) + '</span>'
                + '<span class="ax-tactical-zone-badge">' + esc(kindLabel(kind)) + '</span>'
                + '</li>';
        }).join('');
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function removeLayerFromState(layer) {
        if (!layer) return false;
        let removed = false;
        if (draftLayer === layer) {
            draftLayer = null;
            removed = true;
        }
        const before = zones.length;
        zones = zones.filter(function (z) {
            if (z.layer === layer) {
                removed = true;
                return false;
            }
            return true;
        });
        if (before !== zones.length) removed = true;
        if (drawnItems && drawnItems.hasLayer(layer)) {
            drawnItems.removeLayer(layer);
            removed = true;
        }
        try {
            if (map && map.hasLayer && map.hasLayer(layer)) map.removeLayer(layer);
        } catch (_) { /* ignore */ }
        return removed;
    }

    function onLayerClick(e) {
        if (activeMode !== 'delete') return;
        const layer = e.target;
        if (!layer) return;
        if (typeof L !== 'undefined' && e.originalEvent) {
            try { L.DomEvent.stop(e.originalEvent); } catch (_) { /* ignore */ }
        }
        const ok = removeLayerFromState(layer);
        stopHandler();
        renderZonesList();
        skipStatusOverwrite = true;
        syncSaveEnabled();
        if (ok) setStatus('tactical.statusDeleted', 'Deleted');
        else setStatus('tactical.statusIdle', 'Idle');
        skipStatusOverwrite = false;
    }

    function bindLayerClick(layer) {
        if (!layer || layer._tacticalClickBound) return;
        layer._tacticalClickBound = true;
        layer.on('click', onLayerClick);
    }

    function onCreated(e) {
        const layer = e.layer;
        if (!layer) return;
        layer.setStyle && layer.setStyle(DRAW_STYLE);
        drawnItems.addLayer(layer);
        bindLayerClick(layer);
        draftLayer = layer;
        layer._tacticalDraft = true;
        stopHandler();
        syncSaveEnabled();
    }

    function onEdited() {
        if (draftLayer) syncSaveEnabled();
    }

    function ensureDraw() {
        if (!map || !global.L || !global.L.Draw) return;
        if (drawnItems) return;
        drawnItems = new global.L.FeatureGroup();
        map.addLayer(drawnItems);
        map.on(global.L.Draw.Event.CREATED, onCreated);
        map.on(global.L.Draw.Event.EDITED, onEdited);
        if (!layerClickBound) {
            layerClickBound = true;
            drawnItems.on('layeradd', function (ev) {
                if (ev && ev.layer) bindLayerClick(ev.layer);
            });
        }
    }

    function beginZoneTool(mode) {
        cancelPlacePoi();
        flowMode = mode;
        syncModeBanner();
    }

    function startPolygon() {
        if (!map || !global.L.Draw) return;
        if (finishActiveIf('polygon')) {
            goIdle({ keepPlace: true, silentStatus: true });
            setStatus('tactical.statusIdle', 'Idle — drag map to move');
            return;
        }
        stopHandler();
        beginZoneTool('polygon');
        ensureDraw();
        activeHandler = new global.L.Draw.Polygon(map, {
            shapeOptions: DRAW_STYLE,
            allowIntersection: false,
            showArea: false,
        });
        activeHandler.enable();
        activeMode = 'polygon';
        clearActiveToolButtons();
        const btn = document.getElementById('ax-tactical-draw-polygon');
        if (btn) btn.classList.add('active');
        setStatus('tactical.bannerZoneDraw', 'ZONES — draw on map');
    }

    function startCircle() {
        if (!map || !global.L.Draw) return;
        if (finishActiveIf('circle')) {
            goIdle({ keepPlace: true, silentStatus: true });
            setStatus('tactical.statusIdle', 'Idle — drag map to move');
            return;
        }
        stopHandler();
        beginZoneTool('zone-circle');
        ensureDraw();
        activeHandler = new global.L.Draw.Circle(map, {
            shapeOptions: DRAW_STYLE,
            showRadius: true,
            metric: true,
        });
        activeHandler.enable();
        activeMode = 'circle';
        clearActiveToolButtons();
        const btn = document.getElementById('ax-tactical-draw-circle');
        if (btn) btn.classList.add('active');
        setStatus('tactical.bannerZoneDraw', 'ZONES — draw on map');
    }

    function startEdit() {
        if (!map || !global.L.EditToolbar || !drawnItems) return;
        if (finishActiveIf('edit')) {
            goIdle({ keepPlace: true, silentStatus: true });
            setStatus('tactical.statusSaved', 'Saved');
            return;
        }
        if (!drawnItems.getLayers().length) {
            setStatus('tactical.statusNeedShape', 'Need shape');
            return;
        }
        stopHandler();
        beginZoneTool('edit');
        activeHandler = new global.L.EditToolbar.Edit(map, {
            featureGroup: drawnItems,
            selectedPathOptions: {
                maintainColor: true,
                opacity: 0.7,
                dashArray: '8, 8',
            },
        });
        activeHandler.enable();
        activeMode = 'edit';
        clearActiveToolButtons();
        const btn = document.getElementById('ax-tactical-draw-edit');
        if (btn) btn.classList.add('active');
        setStatus('tactical.bannerZoneEdit', 'ZONES — edit shape');
    }

    function startDelete() {
        if (!map || !drawnItems) return;
        if (finishActiveIf('delete')) {
            goIdle({ keepPlace: true, silentStatus: true });
            syncSaveEnabled();
            return;
        }
        if (!drawnItems.getLayers().length) {
            setStatus('tactical.statusNeedShape', 'Need shape');
            return;
        }
        stopHandler();
        beginZoneTool('delete');
        activeHandler = null;
        activeMode = 'delete';
        drawnItems.eachLayer(bindLayerClick);
        clearActiveToolButtons();
        const btn = document.getElementById('ax-tactical-draw-delete');
        if (btn) btn.classList.add('active');
        try { map.getContainer().style.cursor = 'crosshair'; } catch (_) { /* ignore */ }
        setStatus('tactical.bannerZoneDelete', 'ZONES — click shape to delete');
    }

    function saveZone() {
        const id = incidentId();
        if (!draftLayer || draftLayer._tacticalGrab) {
            setStatus('tactical.statusNeedShape', 'Need shape');
            return;
        }
        if (!id) {
            setStatus('tactical.statusNeedIncident', 'Need incident');
            return;
        }
        const geojson = layerToGeoJSON(draftLayer);
        if (!geojson) {
            setStatus('tactical.statusNeedShape', 'Need shape');
            return;
        }
        zoneSeq += 1;
        const zid = 'tz-' + zoneSeq;
        draftLayer._tacticalDraft = false;
        draftLayer._tacticalZoneId = zid;
        bindLayerClick(draftLayer);
        zones.push({
            id: zid,
            incidentId: id,
            geojson: geojson,
            layer: draftLayer,
        });
        draftLayer = null;
        renderZonesList();
        syncSaveEnabled();
        setStatus('tactical.statusSaved', 'Saved');
    }

    function bindUi() {
        if (uiBound) return;
        uiBound = true;
        const poly = document.getElementById('ax-tactical-draw-polygon');
        const circ = document.getElementById('ax-tactical-draw-circle');
        const grab = document.getElementById('ax-tactical-grab-circle');
        const edit = document.getElementById('ax-tactical-draw-edit');
        const del = document.getElementById('ax-tactical-draw-delete');
        const save = document.getElementById('ax-tactical-save-zone');
        const openCircle = document.getElementById('ax-tactical-open-in-circle');
        const incident = document.getElementById('ax-tactical-incident-id');
        if (poly) poly.addEventListener('click', function () { startPolygon(); });
        if (circ) circ.addEventListener('click', function () { startCircle(); });
        if (grab) grab.addEventListener('click', function () { enterGrabMode(); });
        if (edit) edit.addEventListener('click', function () { startEdit(); });
        if (del) del.addEventListener('click', function () { startDelete(); });
        if (save) save.addEventListener('click', function () { saveZone(); });
        if (openCircle) openCircle.addEventListener('click', onOpenInCircleClick);
        if (incident) {
            incident.addEventListener('input', syncSaveEnabled);
            incident.addEventListener('change', syncSaveEnabled);
        }
        document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Escape') return;
            if (flowMode === 'idle' && !activeMode) return;
            goIdle();
            syncSaveEnabled();
        });
    }

    function ensureMap() {
        if (mapReady && map) {
            try { map.invalidateSize(); } catch (_) { /* ignore */ }
            ensureDraw();
            return map;
        }
        const host = document.getElementById('ax-tactical-map');
        if (!host || typeof global.L === 'undefined') return null;

        let center = [1.3521, 103.8198];
        let zoom = 12;
        try {
            if (global.MobilityMapGis && MobilityMapGis.getInitialView) {
                const iv = MobilityMapGis.getInitialView();
                if (iv && iv.pos) center = iv.pos;
                if (iv && typeof iv.zoom === 'number') zoom = iv.zoom;
            } else if (global.map && typeof global.map.getCenter === 'function') {
                const c = global.map.getCenter();
                center = [c.lat, c.lng];
                zoom = global.map.getZoom() || zoom;
            }
        } catch (_) { /* ignore */ }

        map = global.L.map(host, {
            zoomControl: true,
            attributionControl: true,
            fadeAnimation: false,
        }).setView(center, zoom);

        if (global.MobilityMapTiles && MobilityMapTiles.attachLeaflet) {
            MobilityMapTiles.attachLeaflet(map);
        } else {
            global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap',
            }).addTo(map);
        }

        mapReady = true;
        ensureDraw();
        setTimeout(function () {
            try { map.invalidateSize(); } catch (_) { /* ignore */ }
        }, 80);
        setTimeout(function () {
            try { map.invalidateSize(); } catch (_) { /* ignore */ }
        }, 250);
        return map;
    }

    function onShow() {
        ensureMap();
        bindUi();
        syncSaveEnabled();
        syncModeBanner();
        if (global.TacticalPoi && TacticalPoi.onShow) {
            try {
                TacticalPoi.onShow();
            } catch (err) {
                try { console.error('[tactical] pin mount failed', err); } catch (_) { /* ignore */ }
                const status = document.getElementById('ax-tactical-status');
                if (status) {
                    status.textContent = tr('tactical.pinMountError', 'Pin mount error — see console');
                }
            }
        }
        if (global.TacticalBlueprintUi && typeof TacticalBlueprintUi.onShow === 'function') {
            try { TacticalBlueprintUi.onShow(); } catch (bpErr) {
                try { console.error('[tactical] blueprint ui failed', bpErr); } catch (_) { /* ignore */ }
            }
        }
        if (typeof global.I18n !== 'undefined' && I18n.scheduleApply) {
            I18n.scheduleApply(document.getElementById('app-view-tactical'));
        }
    }

    function init() {
        /* map boots on first tab show */
    }

    function leavePlaceMode() {
        if (flowMode !== 'place') return;
        flowMode = 'idle';
        clearActiveToolButtons();
        syncModeBanner();
        setStatus('tactical.statusIdle', 'Idle — drag map to move');
    }

    global.TacticalShell = {
        init: init,
        onShow: onShow,
        ensureMap: ensureMap,
        getMap: function () { return map; },
        invalidateSize: function () {
            if (map && typeof map.invalidateSize === 'function') {
                try { map.invalidateSize(); } catch (_) { /* ignore */ }
            }
        },
        getZones: function () { return zones.slice(); },
        getGrabCircle: getGrabCircle,
        syncOpenInCircleEnabled: syncOpenInCircleEnabled,
        enterPlaceMode: enterPlaceMode,
        leavePlaceMode: leavePlaceMode,
        goIdle: goIdle,
        enterGrabMode: enterGrabMode,
        syncModeBanner: syncModeBanner,
    };
}(window));
