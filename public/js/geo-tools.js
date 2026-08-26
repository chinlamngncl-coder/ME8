/**
 * GEO-TOOLS-V1 + MIX-10-V1 - Ops map Geo Tools palette.
 * Select area -> open mix BWC+fixed totalling 10 (BWC preferred on 1-8, leftover for fixed).
 * Measure. PTZ remote (fixed API). Reuses FleetUi + VideoWall playSlot.
 */
(function (global) {
    'use strict';

    var BWC_OPEN_CAP = 8;
    var TOTAL_OPEN_CAP = 10;

    var activeTool = '';
    var drawLayer = null;
    var drawHandler = null;
    var measureLine = null;
    var measurePoints = [];
    var mapDragWasEnabled = true;
    var statusTimer = null;
    var dragState = null;
    var geoPtzJoystick = null;
    var mapPinBridgeBound = false;

    function el(id) {
        return document.getElementById(id);
    }

    function getMap() {
        return global.__me8OpsMap || null;
    }

    function setStatus(text, ms) {
        var s = el('geo-tools-status');
        if (!s) return;
        s.textContent = text || '';
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = null;
        if (text && ms) {
            statusTimer = setTimeout(function () {
                if (s.textContent === text) s.textContent = '';
            }, ms);
        }
    }

    function toast(text, ms) {
        var t = el('map-geofence-toast');
        if (!t) {
            setStatus(text, ms || 5000);
            return;
        }
        t.textContent = text;
        t.style.display = 'block';
        if (t._geoToolsToastTimer) clearTimeout(t._geoToolsToastTimer);
        t._geoToolsToastTimer = setTimeout(function () {
            t.style.display = 'none';
        }, ms || 5000);
        setStatus(text, ms || 5000);
    }

    function haversineM(a, b) {
        var R = 6371000;
        var toRad = Math.PI / 180;
        var dLat = (b.lat - a.lat) * toRad;
        var dLng = (b.lng - a.lng) * toRad;
        var lat1 = a.lat * toRad;
        var lat2 = b.lat * toRad;
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    function markerLatLng(marker) {
        if (!marker) return null;
        try {
            return marker._gpsLatLng || (marker.getLatLng && marker.getLatLng()) || null;
        } catch (_) {
            return null;
        }
    }

    function clearDrawPreview() {
        var map = getMap();
        if (drawHandler) {
            try {
                if (drawHandler.disable) drawHandler.disable();
            } catch (_) { /* ignore */ }
            drawHandler = null;
        }
        if (drawLayer && map) {
            try { map.removeLayer(drawLayer); } catch (_) { /* ignore */ }
            drawLayer = null;
        }
        if (measureLine && map) {
            try { map.removeLayer(measureLine); } catch (_) { /* ignore */ }
            measureLine = null;
        }
        measurePoints = [];
        if (map && map.off) map.off('click', onMeasureClick);
        if (map && map.dragging) {
            if (mapDragWasEnabled) map.dragging.enable();
        }
    }

    function collectHits(predicate) {
        var bwc = [];
        var fixed = [];
        var markers = global.deviceMarkers || {};
        Object.keys(markers).forEach(function (id) {
            var ll = markerLatLng(markers[id]);
            if (!ll) return;
            if (predicate(ll)) bwc.push(String(id));
        });
        var fixedMap = global.__me8FixedCameraMapMarkers;
        if (fixedMap && typeof fixedMap.forEach === 'function') {
            fixedMap.forEach(function (marker, cameraId) {
                var ll = markerLatLng(marker);
                if (!ll) return;
                if (predicate(ll)) fixed.push('fixed:' + String(cameraId));
            });
        }
        return { bwc: bwc, fixed: fixed };
    }

    function openHits(hits) {
        var bwcAll = hits.bwc || [];
        var fixedAll = hits.fixed || [];
        var bwc = bwcAll.slice(0, BWC_OPEN_CAP);
        var fixedRoom = Math.max(0, TOTAL_OPEN_CAP - bwc.length);
        var fixed = fixedAll.slice(0, fixedRoom);
        var openedPlan = bwc.length + fixed.length;

        if (!bwc.length && !fixed.length) {
            toast('No cams in area', 4000);
            return;
        }

        if (bwc.length && global.FleetUi && typeof global.FleetUi.openBatchLivePins === 'function') {
            global.FleetUi.openBatchLivePins(bwc);
        } else if (bwc.length && global.VideoWall && global.VideoWall.openAllLivePins) {
            bwc.forEach(function (camId) {
                if (typeof global.syncMapPinForCam === 'function') {
                    global.syncMapPinForCam(camId, { openPopup: true });
                }
            });
            setTimeout(function () {
                global.VideoWall.openAllLivePins(bwc);
            }, 200);
        }

        var waitMs = bwc.length ? (bwc.length * 120 + 400) : 0;
        setTimeout(function () {
            openFixedOnWallAndPins(fixed, bwc);
        }, waitMs);

        var skipped = (bwcAll.length + fixedAll.length) - openedPlan;
        var msg = 'Opened ' + openedPlan + ' of ' + (bwcAll.length + fixedAll.length) +
            ' (BWC ' + bwc.length + ' · Fixed ' + fixed.length + ')';
        if (skipped > 0) msg += ' - cap ' + TOTAL_OPEN_CAP;
        toast(msg, 6000);

        var ptzFixed = fixed.filter(function (sid) {
            var id = sid.replace(/^fixed:/, '');
            var m = fixedMapGet(id);
            var cam = m && m._fixedCamera;
            return !!(cam && cam.ptzEnabled);
        });
        if (ptzFixed.length) {
            setPtzCamera(ptzFixed[0].replace(/^fixed:/, ''), true);
        }
    }

    function fixedMapGet(cameraId) {
        var fixedMap = global.__me8FixedCameraMapMarkers;
        if (!fixedMap || typeof fixedMap.get !== 'function') return null;
        return fixedMap.get(cameraId) || null;
    }

    function openFixedOnWallAndPins(sourceIds, bwcIds) {
        if (!sourceIds || !sourceIds.length) return;
        var slots = Array.prototype.slice.call(
            document.querySelectorAll('#video-wall-slots .video-slot')
        );
        var bwcSet = Object.create(null);
        (bwcIds || []).forEach(function (id) { bwcSet[String(id)] = true; });
        function slotTaken(slotEl) {
            if (!slotEl) return true;
            var id = String(slotEl.getAttribute('data-cam-id') || slotEl.dataset.camId || '').trim();
            if (bwcSet[id]) return true;
            if (slotEl.classList.contains('video-slot-has-live')) return true;
            if (id && id.indexOf('fixed:') !== 0) return true;
            return false;
        }
        var order = [];
        var i;
        for (i = 8; i < Math.min(TOTAL_OPEN_CAP, slots.length); i += 1) order.push(i);
        for (i = BWC_OPEN_CAP - 1; i >= 0; i -= 1) order.push(i);
        var fi = 0;
        var firstSlot = -1;
        order.forEach(function (s) {
            if (fi >= sourceIds.length) return;
            var slotEl = slots[s];
            if (slotTaken(slotEl)) return;
            var sid = sourceIds[fi];
            fi += 1;
            if (firstSlot < 0) firstSlot = s;
            slotEl.dataset.camId = sid;
            slotEl.setAttribute('data-cam-id', sid);
            if (global.VideoWall && typeof global.VideoWall.playSlot === 'function') {
                global.VideoWall.playSlot(slotEl);
            }
        });
        if (firstSlot >= 5 && global.VideoWall && typeof global.VideoWall.applyWallBankPage === 'function') {
            global.VideoWall.applyWallBankPage('b');
        }
        sourceIds.forEach(function (sid, idx) {
            var id = String(sid).replace(/^fixed:/, '');
            var marker = fixedMapGet(id);
            if (!marker || !marker.openPopup) return;
            setTimeout(function () {
                try { marker.openPopup(); } catch (_) { /* ignore */ }
            }, 80 * idx);
        });
    }

    function onCircleCreated(e) {
        var layer = e.layer;
        drawLayer = layer;
        var center = layer.getLatLng();
        var radiusM = layer.getRadius();
        var hits = collectHits(function (ll) {
            return haversineM(center, ll) <= radiusM;
        });
        openHits(hits);
        clearActiveToolKeepPalette();
    }

    function onRectCreated(e) {
        var layer = e.layer;
        drawLayer = layer;
        var bounds = layer.getBounds();
        var hits = collectHits(function (ll) {
            return bounds.contains(ll);
        });
        openHits(hits);
        clearActiveToolKeepPalette();
    }

    function onMeasureClick(e) {
        var map = getMap();
        if (!map || activeTool !== 'measure') return;
        measurePoints.push(e.latlng);
        if (measurePoints.length === 1) {
            setStatus('Click end point', 0);
            return;
        }
        var a = measurePoints[0];
        var b = measurePoints[1];
        if (measureLine) {
            try { map.removeLayer(measureLine); } catch (_) { /* ignore */ }
        }
        measureLine = L.polyline([a, b], {
            color: '#38bdf8',
            weight: 2,
            dashArray: '6 4',
            interactive: false,
        }).addTo(map);
        var meters = haversineM(a, b);
        var label = meters >= 1000
            ? (meters / 1000).toFixed(2) + ' km'
            : Math.round(meters) + ' m';
        toast('Distance: ' + label, 8000);
        measurePoints = [];
        clearActiveToolKeepPalette();
    }

    function startDraw(tool) {
        var map = getMap();
        if (!map || typeof L === 'undefined') {
            toast('Map not ready', 3000);
            return;
        }
        if (typeof L.Draw === 'undefined') {
            toast('Draw tools unavailable', 4000);
            return;
        }
        clearDrawPreview();
        mapDragWasEnabled = !!(map.dragging && map.dragging.enabled && map.dragging.enabled());
        if (map.dragging) map.dragging.disable();

        if (tool === 'circle') {
            drawHandler = new L.Draw.Circle(map, {
                shapeOptions: {
                    color: '#38bdf8',
                    weight: 2,
                    fillOpacity: 0.12,
                },
            });
            map.once(L.Draw.Event.CREATED, onCircleCreated);
            drawHandler.enable();
            setStatus('Drag on map to draw area', 0);
            return;
        }
        if (tool === 'rect') {
            drawHandler = new L.Draw.Rectangle(map, {
                shapeOptions: {
                    color: '#38bdf8',
                    weight: 2,
                    fillOpacity: 0.12,
                },
            });
            map.once(L.Draw.Event.CREATED, onRectCreated);
            drawHandler.enable();
            setStatus('Drag on map to draw rectangle', 0);
            return;
        }
        if (tool === 'measure') {
            map.on('click', onMeasureClick);
            setStatus('Click start point', 0);
        }
    }

    function clearActiveToolKeepPalette() {
        activeTool = '';
        document.querySelectorAll('.geo-tools-tool.is-active').forEach(function (btn) {
            btn.classList.remove('is-active');
        });
        var ptzPad = el('geo-tools-ptz-pad');
        if (ptzPad) ptzPad.hidden = true;
        clearDrawPreview();
    }

    function setTool(tool) {
        if (activeTool === tool) {
            clearActiveToolKeepPalette();
            setStatus('Tool off', 2000);
            return;
        }
        clearActiveToolKeepPalette();
        activeTool = tool;
        document.querySelectorAll('.geo-tools-tool').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-geo-tool') === tool);
        });
        var ptzPad = el('geo-tools-ptz-pad');
        if (tool === 'ptz') {
            if (ptzPad) ptzPad.hidden = false;
            loadPtzCameras();
            setStatus('Choose a camera, then use the pad', 0);
            return;
        }
        if (ptzPad) ptzPad.hidden = true;
        startDraw(tool);
    }

    function syncToggles(open) {
        ['geo-tools-toggle', 'geo-tools-map-chip'].forEach(function (id) {
            var btn = el(id);
            if (!btn) return;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.classList.toggle('is-open', !!open);
        });
    }

    function setExpanded(open) {
        var palette = el('geo-tools-palette');
        if (!palette) return;
        palette.setAttribute('data-expanded', open ? '1' : '0');
        syncToggles(!!open);
        if (!open) clearActiveToolKeepPalette();
    }

    /* VMS-PTZ-JOYSTICK-GEO-TOOLS-V1 - one funnel for select + map pins */
    function ensureGeoPtzJoystick() {
        if (geoPtzJoystick) return geoPtzJoystick;
        var host = el('geo-tools-ptz-joystick-host');
        if (!host || !global.VmsPtzJoystick || typeof global.VmsPtzJoystick.create !== 'function') return null;
        geoPtzJoystick = global.VmsPtzJoystick.create(host, {
            showNumpad: false,
            isFloating: false,
            classPrefix: 'cw-',
        });
        return geoPtzJoystick;
    }

    function friendlyFixedName(rawId) {
        var m = fixedMapGet(rawId);
        var cam = m && m._fixedCamera;
        if (cam && cam.name) return String(cam.name);
        var sel = el('geo-tools-ptz-cam');
        if (sel) {
            for (var i = 0; i < sel.options.length; i += 1) {
                if (sel.options[i].value === rawId) {
                    return String(sel.options[i].textContent || 'Camera');
                }
            }
        }
        return 'Camera';
    }

    function resolvePtzSource(sourceId) {
        var s = String(sourceId == null ? '' : sourceId).trim();
        if (!s) return { kind: 'empty' };
        if (/^bwc:/i.test(s)) return { kind: 'bwc' };
        if (/^fixed:/i.test(s)) {
            return { kind: 'fixed', raw: s.replace(/^fixed:/i, '').trim() };
        }
        try {
            if (global.deviceMarkers && global.deviceMarkers[s]) return { kind: 'bwc' };
        } catch (_) { /* ignore */ }
        return { kind: 'fixed', raw: s };
    }

    function applyGeoPtzTarget(sourceId, announce) {
        ensureGeoPtzJoystick();
        var sel = el('geo-tools-ptz-cam');
        var resolved = resolvePtzSource(sourceId);
        if (resolved.kind !== 'fixed' || !resolved.raw) {
            if (sel) sel.value = '';
            if (geoPtzJoystick) {
                geoPtzJoystick.setTarget(null, { hasPtz: false, label: 'Empty' });
            }
            return;
        }
        var raw = resolved.raw;
        var m = fixedMapGet(raw);
        var cam = m && m._fixedCamera;
        var inList = false;
        if (sel) {
            for (var i = 0; i < sel.options.length; i += 1) {
                if (sel.options[i].value === raw) {
                    inList = true;
                    break;
                }
            }
            if (inList) sel.value = raw;
        }
        var hasPtz = inList || !!(cam && cam.ptzEnabled && cam.streamSource === 'onvif');
        var label = (cam && cam.name) ? String(cam.name) : friendlyFixedName(raw);
        if (geoPtzJoystick) {
            geoPtzJoystick.setTarget(raw, { hasPtz: !!hasPtz, label: label });
        }
        if (announce && hasPtz) toast('Ready - ' + label, 4500);
    }

    function setPtzCamera(cameraId, announce) {
        var raw = String(cameraId || '').replace(/^fixed:/i, '').trim();
        if (!raw) return;
        var sel = el('geo-tools-ptz-cam');
        if (sel) {
            var found = false;
            for (var i = 0; i < sel.options.length; i += 1) {
                if (sel.options[i].value === raw) {
                    found = true;
                    break;
                }
            }
            if (!found) return;
        }
        var ptzPad = el('geo-tools-ptz-pad');
        var palette = el('geo-tools-palette');
        if (palette && palette.getAttribute('data-expanded') !== '1') setExpanded(true);
        if (ptzPad) {
            ptzPad.hidden = false;
            activeTool = 'ptz';
            document.querySelectorAll('.geo-tools-tool').forEach(function (btn) {
                btn.classList.toggle('is-active', btn.getAttribute('data-geo-tool') === 'ptz');
            });
        }
        applyGeoPtzTarget(raw, announce);
    }

    function notifyMapPin(sourceId) {
        if (activeTool !== 'ptz') return;
        applyGeoPtzTarget(sourceId, true);
    }

    function loadPtzCameras() {
        var sel = el('geo-tools-ptz-cam');
        if (!sel) return;
        var prev = sel.value;
        fetch('/api/fixed-cams', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var cams = Array.isArray(data && data.cams) ? data.cams : [];
                var ptzCams = cams.filter(function (c) {
                    return c && c.enabled && c.ptzEnabled && c.streamSource === 'onvif';
                });
                sel.innerHTML = '';
                if (!ptzCams.length) {
                    var opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = 'No cameras with pan-tilt';
                    sel.appendChild(opt);
                    applyGeoPtzTarget(null, false);
                    return;
                }
                ptzCams.forEach(function (c) {
                    var o = document.createElement('option');
                    o.value = c.id;
                    o.textContent = c.name || 'Camera';
                    sel.appendChild(o);
                });
                if (prev && ptzCams.some(function (c) { return c.id === prev; })) {
                    sel.value = prev;
                } else {
                    sel.value = ptzCams[0].id;
                }
                applyGeoPtzTarget(sel.value, false);
            })
            .catch(function () {
                sel.innerHTML = '<option value="">Camera list unavailable</option>';
                applyGeoPtzTarget(null, false);
            });
    }

    function bindMapPinBridge() {
        if (mapPinBridgeBound) return;
        var map = getMap();
        if (!map || typeof map.on !== 'function') return;
        mapPinBridgeBound = true;
        map.on('popupopen', function (e) {
            if (activeTool !== 'ptz') return;
            var src = e && e.popup && e.popup._source;
            if (!src) return;
            if (src._fixedCamera && src._fixedCamera.id) {
                applyGeoPtzTarget('fixed:' + src._fixedCamera.id, true);
                return;
            }
            /* BWC / other pin - pad Empty, never POST */
            applyGeoPtzTarget('bwc:', false);
        });
    }

    function bindPaletteDrag() {
        var handle = el('geo-tools-drag-handle');
        var palette = el('geo-tools-palette');
        if (!handle || !palette) return;
        handle.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            var rect = palette.getBoundingClientRect();
            var parent = palette.offsetParent || document.body;
            var parentRect = parent.getBoundingClientRect();
            dragState = {
                ox: e.clientX - rect.left,
                oy: e.clientY - rect.top,
                parentLeft: parentRect.left,
                parentTop: parentRect.top,
            };
            palette.style.right = 'auto';
            palette.style.bottom = 'auto';
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragState) return;
            var left = e.clientX - dragState.parentLeft - dragState.ox;
            var top = e.clientY - dragState.parentTop - dragState.oy;
            palette.style.left = Math.max(4, left) + 'px';
            palette.style.top = Math.max(4, top) + 'px';
        });
        document.addEventListener('mouseup', function () {
            dragState = null;
        });
    }

    var chipBound = false;
    function bindToggle(id) {
        var btn = el(id);
        if (!btn || btn.getAttribute('data-geo-bound') === '1') return;
        btn.setAttribute('data-geo-bound', '1');
        chipBound = true;
        btn.addEventListener('click', function () {
            var palette = el('geo-tools-palette');
            var open = palette && palette.getAttribute('data-expanded') === '1';
            setExpanded(!open);
        });
    }

    function bindUi() {
        bindToggle('geo-tools-map-chip');
        var palette = el('geo-tools-palette');
        document.querySelectorAll('.geo-tools-tool').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (!palette || palette.getAttribute('data-expanded') !== '1') setExpanded(true);
                setTool(btn.getAttribute('data-geo-tool'));
            });
        });
        ensureGeoPtzJoystick();
        var sel = el('geo-tools-ptz-cam');
        if (sel && sel.getAttribute('data-geo-ptz-bound') !== '1') {
            sel.setAttribute('data-geo-ptz-bound', '1');
            sel.addEventListener('change', function () {
                applyGeoPtzTarget(sel.value || null, false);
            });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && activeTool) {
                clearActiveToolKeepPalette();
                setStatus('Cancelled', 2000);
            }
        });
        bindPaletteDrag();
    }

    function init() {
        bindUi();
        var tries = 0;
        function bindWhenChipReady() {
            bindToggle('geo-tools-map-chip');
            bindMapPinBridge();
            if (chipBound && mapPinBridgeBound) return;
            tries += 1;
            if (tries < 40) setTimeout(bindWhenChipReady, 100);
        }
        bindWhenChipReady();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.GeoTools = {
        init: init,
        setExpanded: setExpanded,
        setPtzCamera: setPtzCamera,
        notifyMapPin: notifyMapPin,
    };
})(window);
