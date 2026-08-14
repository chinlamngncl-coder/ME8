/**
 * VIDEO-POPOUT-MINIMAP-V1 — floating map + running pin on live.html pop-out.
 * Own Leaflet instance (not Ops #map). GPS via gps-update + /api/last-gps.
 */
(function (global) {
    'use strict';

    var DEFAULT_CENTER = [14.5995, 120.9842];
    var DEFAULT_ZOOM = 15;
    var STORAGE_KEY = 'ax-live-popout-minimap-geom';

    var state = {
        camId: '',
        socket: null,
        map: null,
        marker: null,
        panel: null,
        mapEl: null,
        follow: true,
        destroyed: false,
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function loadGeom() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var g = JSON.parse(raw);
            if (!g || g.left == null || g.top == null) return null;
            return g;
        } catch (_) {
            return null;
        }
    }

    function saveGeom() {
        if (!state.panel) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                left: state.panel.style.left,
                top: state.panel.style.top,
                width: state.panel.style.width,
                height: state.panel.style.height,
            }));
        } catch (_) { /* ignore */ }
    }

    function ensurePanel() {
        var existing = document.getElementById('live-popout-minimap');
        if (existing) {
            state.panel = existing;
            state.mapEl = document.getElementById('live-popout-minimap-map');
            return existing;
        }
        var panel = document.createElement('div');
        panel.id = 'live-popout-minimap';
        panel.className = 'live-popout-minimap';
        panel.innerHTML =
            '<div class="live-popout-minimap-head" data-ax-drag-handle="1">' +
            '<span class="live-popout-minimap-title">Map \u00B7 ' + esc(state.camId) + '</span>' +
            '<label class="live-popout-minimap-follow"><input type="checkbox" id="live-popout-minimap-follow" checked> Follow</label>' +
            '</div>' +
            '<div id="live-popout-minimap-map" class="live-popout-minimap-map" aria-label="Device map"></div>' +
            '<div class="live-popout-minimap-resize" data-ax-resize="1" title="Resize"></div>';
        document.body.appendChild(panel);
        state.panel = panel;
        state.mapEl = document.getElementById('live-popout-minimap-map');

        var geom = loadGeom();
        if (geom) {
            panel.style.left = geom.left;
            panel.style.top = geom.top;
            if (geom.width) panel.style.width = geom.width;
            if (geom.height) panel.style.height = geom.height;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }

        bindDrag(panel);
        bindResize(panel);
        var followCb = document.getElementById('live-popout-minimap-follow');
        if (followCb) {
            followCb.addEventListener('change', function () {
                state.follow = !!followCb.checked;
            });
        }
        return panel;
    }

    function bindDrag(panel) {
        var handle = panel.querySelector('[data-ax-drag-handle]');
        if (!handle || handle.dataset.axDragBound === '1') return;
        handle.dataset.axDragBound = '1';
        handle.addEventListener('pointerdown', function (e) {
            if (e.button != null && e.button !== 0) return;
            if (e.target && e.target.closest && e.target.closest('input, label, button, a')) return;
            e.preventDefault();
            var rect = panel.getBoundingClientRect();
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            var sx = e.clientX;
            var sy = e.clientY;
            var ol = rect.left;
            var ot = rect.top;
            try { handle.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            function onMove(ev) {
                panel.style.left = Math.round(ol + (ev.clientX - sx)) + 'px';
                panel.style.top = Math.round(ot + (ev.clientY - sy)) + 'px';
            }
            function onUp() {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                saveGeom();
            }
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });
    }

    function bindResize(panel) {
        var handle = panel.querySelector('[data-ax-resize]');
        if (!handle || handle.dataset.axResizeBound === '1') return;
        handle.dataset.axResizeBound = '1';
        handle.addEventListener('pointerdown', function (e) {
            if (e.button != null && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            var rect = panel.getBoundingClientRect();
            var sx = e.clientX;
            var sy = e.clientY;
            var ow = rect.width;
            var oh = rect.height;
            try { handle.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            function onMove(ev) {
                var nw = Math.max(200, Math.round(ow + (ev.clientX - sx)));
                var nh = Math.max(160, Math.round(oh + (ev.clientY - sy)));
                panel.style.width = nw + 'px';
                panel.style.height = nh + 'px';
                if (state.map) {
                    try { state.map.invalidateSize(); } catch (_) { /* ignore */ }
                }
            }
            function onUp() {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                saveGeom();
                if (state.map) {
                    try { state.map.invalidateSize(); } catch (_) { /* ignore */ }
                }
            }
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });
    }

    function setPin(lat, lon, opts) {
        opts = opts || {};
        if (!state.map || !isFinite(lat) || !isFinite(lon)) return;
        var ll = [lat, lon];
        if (!state.marker) {
            state.marker = global.L.circleMarker(ll, {
                radius: 8,
                color: '#2563eb',
                weight: 2,
                fillColor: '#38bdf8',
                fillOpacity: 0.95,
            }).addTo(state.map);
            state.marker.bindTooltip(String(state.camId || 'cam'), { permanent: false });
        } else {
            state.marker.setLatLng(ll);
        }
        if (state.follow || opts.forceCenter) {
            state.map.setView(ll, state.map.getZoom() || DEFAULT_ZOOM, { animate: !!opts.animate });
        }
    }

    function onGps(payload) {
        if (state.destroyed || !payload) return;
        var id = String(payload.cameraId || payload.camId || '');
        if (!id || id !== String(state.camId)) return;
        var lat = Number(payload.lat);
        var lon = Number(payload.lon != null ? payload.lon : payload.lng);
        if (!isFinite(lat) || !isFinite(lon)) return;
        setPin(lat, lon, { animate: true });
    }

    function bootstrapGps() {
        var id = encodeURIComponent(state.camId);
        fetch('/api/last-gps?camId=' + id, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || data.lat == null || data.lon == null) return;
                setPin(Number(data.lat), Number(data.lon), { forceCenter: true });
            })
            .catch(function () { /* ignore */ });
        try {
            if (state.socket && state.socket.connected) {
                state.socket.emit('select-device', { cameraId: state.camId });
            }
        } catch (_) { /* ignore */ }
    }

    function initMap() {
        if (!global.L || !state.mapEl) return;
        if (state.map) return;
        state.map = global.L.map(state.mapEl, {
            zoomControl: true,
            attributionControl: false,
        }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'OSM',
        }).addTo(state.map);
        setTimeout(function () {
            try { state.map.invalidateSize(); } catch (_) { /* ignore */ }
        }, 80);
        setTimeout(function () {
            try { state.map.invalidateSize(); } catch (_) { /* ignore */ }
        }, 400);
    }

    function destroy() {
        state.destroyed = true;
        saveGeom();
        if (state.socket && state._onGps) {
            try { state.socket.off('gps-update', state._onGps); } catch (_) { /* ignore */ }
        }
        if (state.map) {
            try { state.map.remove(); } catch (_) { /* ignore */ }
            state.map = null;
            state.marker = null;
        }
    }

    function init(opts) {
        opts = opts || {};
        state.camId = String(opts.camId || '').trim();
        state.socket = opts.socket || null;
        state.destroyed = false;
        if (!state.camId || !global.L) return null;
        ensurePanel();
        initMap();
        state._onGps = onGps;
        if (state.socket) {
            state.socket.on('gps-update', onGps);
            if (state.socket.connected) bootstrapGps();
            else state.socket.on('connect', bootstrapGps);
        } else {
            bootstrapGps();
        }
        return state.panel;
    }

    global.LivePopoutMinimap = {
        init: init,
        destroy: destroy,
        setPin: setPin,
    };
})(typeof window !== 'undefined' ? window : this);
