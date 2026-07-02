/**
 * Leaflet basemap — local offline tiles when data/gis/offline/tiles exists, else OSM.
 * CN trial packs ship with offline tiles; APAC trial falls back to OSM.
 */
(function (global) {
    'use strict';

    var OSM = {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
    };

    var OFFLINE_ATTR = '© OpenStreetMap · offline tiles (local)';

    function useOfflineTiles(cfg) {
        if (!cfg || !cfg.tilesExists || !cfg.tileUrlTemplate) return false;
        return offlineOnly() || hasMetaFlag('fm-map-offline', '1');
    }

    function hasMetaFlag(name, value) {
        try {
            var meta = document.querySelector('meta[name="' + name + '"]');
            return !!(meta && String(meta.content || '').trim() === value);
        } catch (_) {
            return false;
        }
    }

    function offlineOnly() {
        return hasMetaFlag('fm-map-offline-only', '1');
    }

    function attachLeaflet(map, opts) {
        opts = opts || {};
        var baseOpts = {
            maxNativeZoom: opts.maxNativeZoom != null ? opts.maxNativeZoom : 19,
            maxZoom: opts.maxZoom != null ? opts.maxZoom : 20,
            keepBuffer: opts.keepBuffer != null ? opts.keepBuffer : 12,
            updateWhenIdle: opts.updateWhenIdle != null ? opts.updateWhenIdle : false,
            updateWhenZooming: opts.updateWhenZooming != null ? opts.updateWhenZooming : true,
            crossOrigin: true,
        };

        return fetch('/api/gis/offline/config', { credentials: 'same-origin', cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (cfg) {
                var useOffline = useOfflineTiles(cfg);
                var url = useOffline ? cfg.tileUrlTemplate : OSM.url;
                var attribution = useOffline ? OFFLINE_ATTR : OSM.attribution;
                if (offlineOnly() && !useOffline) {
                    attribution = 'Offline map pack missing — run BUILD-CHINA-OFFLINE-TILES.ps1';
                    url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                }
                var layer = L.tileLayer(url, Object.assign({}, baseOpts, { attribution: attribution }));
                layer.addTo(map);
                return { layer: layer, offline: useOffline };
            })
            .catch(function () {
                if (offlineOnly()) {
                    var blank = L.tileLayer(
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        Object.assign({}, baseOpts, { attribution: 'Offline map unavailable' })
                    );
                    blank.addTo(map);
                    return { layer: blank, offline: false };
                }
                var layer = L.tileLayer(OSM.url, Object.assign({}, baseOpts, { attribution: OSM.attribution }));
                layer.addTo(map);
                return { layer: layer, offline: false };
            });
    }

    global.MobilityMapTiles = { attachLeaflet: attachLeaflet };
})(typeof window !== 'undefined' ? window : this);
