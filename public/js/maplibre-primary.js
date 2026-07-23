/**
 * MapLibre primary basemap (lab) \u2014 offline LAN style or online OpenFreeMap.
 * Leaflet stays on top for pins/geofence; tiles come from MapLibre only.
 */
(function (global) {
    'use strict';

    var ONLINE_STYLE = 'https://tiles.openfreemap.org/styles/bright';
    var mlMap = null;
    var offlineCfg = null;
    var mapMode = 'offline';
    var maxZoom = 14;
    var syncBound = false;

    function tr(key, fallback) {
        if (global.I18n && I18n.t) {
            var t = I18n.t(key);
            if (t && t !== key) return t;
        }
        return fallback || key;
    }

    function hasMetaFlag(name, value) {
        try {
            var meta = document.querySelector('meta[name="' + name + '"]');
            return !!(meta && String(meta.content || '').trim() === value);
        } catch (_) {
            return false;
        }
    }

    function ensureBasemapEl() {
        var wrap = document.querySelector('.map-canvas-wrap');
        var host = document.getElementById('map');
        if (!wrap || !host) return null;
        var el = document.getElementById('map-ml');
        if (!el) {
            el = document.createElement('div');
            el.id = 'map-ml';
            el.setAttribute('aria-hidden', 'true');
            wrap.insertBefore(el, host);
        }
        return el;
    }

    function pickStyle(cfg) {
        cfg = cfg || {};
        var wantOffline = !!(cfg.tilesExists && (
            cfg.forceOfflineOnly
            || hasMetaFlag('fm-map-offline-only', '1')
            || hasMetaFlag('fm-map-offline', '1')
        ));
        if (wantOffline) {
            return {
                mode: 'offline',
                url: '/api/gis/maplibre/style-offline',
                maxZoom: cfg.maxNativeZoom != null ? cfg.maxNativeZoom : 14,
            };
        }
        var online = String(cfg.onlineStyleUrl || ONLINE_STYLE).trim();
        return {
            mode: 'online',
            url: online,
            maxZoom: cfg.onlineMaxZoom != null ? cfg.onlineMaxZoom : 18,
        };
    }

    function updateAttributionStrip() {
        var strip = document.getElementById('map-attribution-strip');
        if (!strip) return;
        var html;
        if (mapMode === 'offline') {
            html = tr(
                'map.attribution.offline',
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors \u00B7 Carto \u00B7 offline tiles (local)'
            );
        } else {
            html = tr(
                'map.attribution.online',
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> \u00B7 <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>'
            );
        }
        strip.innerHTML = html;
    }

    function clampZoom(z) {
        var n = Number(z);
        if (!Number.isFinite(n)) return maxZoom;
        return Math.max(2, Math.min(maxZoom, n));
    }

    function bindSync(leafletMap) {
        if (!leafletMap || !mlMap || syncBound) return;
        syncBound = true;
        var lock = false;

        function mlToLeaflet() {
            if (lock || !mlMap) return;
            lock = true;
            try {
                var c = mlMap.getCenter();
                leafletMap.setView([c.lat, c.lng], clampZoom(mlMap.getZoom()), { animate: false });
            } catch (_) { /* ignore */ }
            lock = false;
        }

        function leafletToMl() {
            if (lock || !mlMap) return;
            lock = true;
            try {
                var c = leafletMap.getCenter();
                mlMap.jumpTo({
                    center: [c.lng, c.lat],
                    zoom: clampZoom(leafletMap.getZoom()),
                });
            } catch (_) { /* ignore */ }
            lock = false;
        }

        mlMap.on('move', mlToLeaflet);
        mlMap.on('zoom', mlToLeaflet);
        leafletMap.on('move', leafletToMl);
        leafletMap.on('zoom', leafletToMl);
        mlToLeaflet();
    }

    function applyLeafletChrome(leafletMap) {
        if (!leafletMap) return;
        try {
            leafletMap.setMaxZoom(maxZoom);
            if (leafletMap.getZoom() > maxZoom) leafletMap.setZoom(maxZoom);
        } catch (_) { /* ignore */ }
        var pane = leafletMap.getPane && leafletMap.getPane('tilePane');
        if (pane) pane.style.display = 'none';
    }

    function fetchConfig() {
        return fetch('/api/gis/offline/config', { credentials: 'same-origin', cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; });
    }

    function initBasemap(centerPos, zoom) {
        var el = ensureBasemapEl();
        if (!el || !global.maplibregl) {
            return Promise.reject(new Error('MapLibre container or library missing'));
        }
        return fetchConfig().then(function (cfg) {
            offlineCfg = cfg || {};
            var pick = pickStyle(offlineCfg);
            mapMode = pick.mode;
            maxZoom = pick.maxZoom;
            global.__fmMapTileMaxZoom = maxZoom;

            if (mlMap) {
                try { mlMap.remove(); } catch (_) { /* ignore */ }
                mlMap = null;
                syncBound = false;
            }

            return new Promise(function (resolve, reject) {
                var center = centerPos && centerPos.length >= 2
                    ? [centerPos[1], centerPos[0]]
                    : [103.8198, 1.3521];
                var z = clampZoom(zoom != null ? zoom : 11);
                var failed = false;

                mlMap = new maplibregl.Map({
                    container: el,
                    style: pick.url,
                    center: center,
                    zoom: z,
                    minZoom: 2,
                    maxZoom: maxZoom,
                    attributionControl: false,
                    antialias: true,
                });

                mlMap.on('error', function (e) {
                    if (failed || mapMode !== 'offline') return;
                    failed = true;
                    mapMode = 'online';
                    maxZoom = 18;
                    global.__fmMapTileMaxZoom = maxZoom;
                    try {
                        mlMap.setStyle(ONLINE_STYLE);
                    } catch (_) {
                        reject(e && e.error ? e.error : e);
                    }
                });

                mlMap.once('load', function () {
                    updateAttributionStrip();
                    resolve({ mlMap: mlMap, mode: mapMode, maxZoom: maxZoom, cfg: offlineCfg });
                });

                mlMap.on('style.load', function () {
                    if (mapMode === 'online' && failed) updateAttributionStrip();
                });

                setTimeout(function () {
                    if (!mlMap || mlMap.loaded()) return;
                    reject(new Error('MapLibre style load timeout'));
                }, 20000);
            });
        });
    }

    function attachLeafletOverlay(leafletMap) {
        applyLeafletChrome(leafletMap);
        bindSync(leafletMap);
        updateAttributionStrip();
        return Promise.resolve({ mlMap: mlMap, leafletMap: leafletMap, mode: mapMode, maxZoom: maxZoom });
    }

    function resize() {
        try {
            if (mlMap) mlMap.resize();
        } catch (_) { /* ignore */ }
    }

    global.MobilityMapLibre = {
        initBasemap: initBasemap,
        attachLeafletOverlay: attachLeafletOverlay,
        getMlMap: function () { return mlMap; },
        getMaxZoom: function () { return maxZoom; },
        getMode: function () { return mapMode; },
        resize: resize,
        updateAttribution: updateAttributionStrip,
    };

    global.MobilityMapTiles = {
        getMaxZoom: function () { return maxZoom; },
        attachLeaflet: function (leafletMap) {
            var pos = leafletMap.getCenter();
            var z = leafletMap.getZoom();
            return initBasemap([pos.lat, pos.lng], z).then(function () {
                return attachLeafletOverlay(leafletMap);
            });
        },
    };
})(typeof window !== 'undefined' ? window : this);
