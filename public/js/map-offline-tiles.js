/**
 * Leaflet basemap \u2014 MAP-SOURCE-SETTINGS-TOGGLE-V1: Super Admin mapSource
 * (auto / online / local). auto = Gold stamp (fm-map-offline-only → pack, else OSM).
 * Pack-on-disk alone does not force local. Swap uses setUrl — markers stay.
 */
(function (global) {
    'use strict';

    var OSM = {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
    };

    var OFFLINE_ATTR = '© OpenStreetMap \u00B7 offline tiles (local)';
    var BLANK_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    var PACK_MISSING_ATTR = 'Offline map pack not installed \u2014 see Installation Guide (GIS offline tiles)';

    /* MAP-SOURCE-SETTINGS-TOGGLE-V1 — auto: Gold stamp (offline-only meta → pack, else OSM).
     * online / local: Super Admin setting wins. Pack-on-disk alone does not force Carto. */
    function useOfflineTiles(cfg) {
        var mode = cfg && cfg.mapSource ? String(cfg.mapSource).toLowerCase() : 'auto';
        var pack = !!(cfg && cfg.tilesExists && cfg.tileUrlTemplate);
        if (mode === 'online') return false;
        if (mode === 'local') return pack;
        if (offlineOnly()) return pack;
        return false;
    }

    /* Public internet tiles only by explicit page opt-in; offline-only meta always wins. */
    function onlineOptIn() {
        return !offlineOnly() && hasMetaFlag('fm-map-online', '1');
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

    /* MAP-OPS-LOCAL-ZOOM-AND-FILL-V1 — one ceiling for SG / PH / ID / TH / KR / CN / ZA */
    var packMaxZoom = null;

    function packZoomFromCfg(cfg, opts) {
        var z = Number(cfg && cfg.maxNativeZoom);
        if (!Number.isFinite(z) || z < 2) {
            z = opts && opts.maxNativeZoom != null ? opts.maxNativeZoom : 14;
        }
        return Math.max(2, Math.min(22, Math.floor(z)));
    }

    function applyFillAndZoom(map, packZ, offline) {
        packMaxZoom = offline ? packZ : null;
        try {
            if (typeof map.setMaxZoom === 'function') map.setMaxZoom(offline ? packZ + 1 : 20);
        } catch (_) { /* ignore */ }
        try {
            if (offline && map.getZoom && map.getZoom() > packZ + 1) map.setZoom(packZ);
        } catch (_) { /* ignore */ }
        if (global.MobilityMapGis && typeof MobilityMapGis.setPackMaxZoom === 'function') {
            try { MobilityMapGis.setPackMaxZoom(offline ? packZ : null); } catch (_) { /* ignore */ }
        }
    }

    var attached = [];

    function remember(map, opts, layer) {
        var i;
        for (i = 0; i < attached.length; i++) {
            if (attached[i].map === map) {
                attached[i].opts = opts;
                attached[i].layer = layer;
                return;
            }
        }
        attached.push({ map: map, opts: opts, layer: layer });
    }

    function pickTile(cfg, opts) {
        var useOffline = useOfflineTiles(cfg);
        var packZ = packZoomFromCfg(cfg, opts);
        var url;
        var attribution;
        var maxNative;
        var maxZ;
        if (useOffline) {
            url = cfg.tileUrlTemplate;
            attribution = OFFLINE_ATTR;
            maxNative = packZ;
            maxZ = packZ + 1;
        } else if ((cfg && cfg.mapSource === 'local') || (offlineOnly() && !(cfg && cfg.mapSource === 'online'))) {
            url = BLANK_TILE;
            attribution = PACK_MISSING_ATTR;
            maxNative = opts.maxNativeZoom != null ? opts.maxNativeZoom : 19;
            maxZ = opts.maxZoom != null ? opts.maxZoom : 20;
        } else {
            url = OSM.url;
            attribution = OSM.attribution;
            maxNative = 19;
            maxZ = opts.maxZoom != null ? opts.maxZoom : 20;
        }
        return {
            url: url,
            attribution: attribution,
            useOffline: useOffline,
            packZ: packZ,
            maxNative: maxNative,
            maxZ: maxZ,
            online: !useOffline && url === OSM.url,
        };
    }

    function setLayerAttribution(map, layer, nextAttr) {
        var prev = layer.options && layer.options.attribution;
        if (prev === nextAttr) return;
        try {
            if (map.attributionControl && prev) map.attributionControl.removeAttribution(prev);
        } catch (_) { /* ignore */ }
        layer.options.attribution = nextAttr;
        try {
            if (map.attributionControl && nextAttr) map.attributionControl.addAttribution(nextAttr);
        } catch (_) { /* ignore */ }
    }

    function applyPickToLayer(map, layer, pick, opts) {
        layer.options.maxNativeZoom = pick.maxNative;
        layer.options.maxZoom = pick.maxZ;
        setLayerAttribution(map, layer, pick.attribution);
        var cur = '';
        try { cur = layer._url || (layer.options && layer.options.url) || ''; } catch (_) { cur = ''; }
        if (cur !== pick.url && typeof layer.setUrl === 'function') {
            layer.setUrl(pick.url);
        }
        applyFillAndZoom(map, pick.packZ, pick.useOffline);
        remember(map, opts, layer);
        return { layer: layer, offline: pick.useOffline, online: pick.online, maxNativeZoom: pick.useOffline ? pick.packZ : null };
    }

    function layerOpts(opts) {
        return {
            maxNativeZoom: opts.maxNativeZoom != null ? opts.maxNativeZoom : 19,
            maxZoom: opts.maxZoom != null ? opts.maxZoom : 20,
            keepBuffer: opts.keepBuffer != null ? opts.keepBuffer : 12,
            updateWhenIdle: opts.updateWhenIdle != null ? opts.updateWhenIdle : false,
            updateWhenZooming: opts.updateWhenZooming != null ? opts.updateWhenZooming : true,
            crossOrigin: true,
        };
    }

    function fetchCfg() {
        var signal;
        try { signal = (global.AbortSignal && AbortSignal.timeout) ? AbortSignal.timeout(8000) : undefined; } catch (_) { signal = undefined; }
        return fetch('/api/gis/offline/config', { credentials: 'same-origin', cache: 'no-cache', signal: signal })
            .then(function (r) { return r.ok ? r.json() : null; });
    }

    function attachLeaflet(map, opts) {
        opts = opts || {};
        var baseOpts = layerOpts(opts);
        bindLiveRefresh();
        return fetchCfg()
            .then(function (cfg) {
                var pick = pickTile(cfg, opts);
                var existing = map._fmBaseTiles;
                if (existing) return applyPickToLayer(map, existing, pick, opts);
                var layer = L.tileLayer(pick.url, Object.assign({}, baseOpts, {
                    attribution: pick.attribution,
                    maxNativeZoom: pick.maxNative,
                    maxZoom: pick.maxZ,
                }));
                layer.addTo(map);
                map._fmBaseTiles = layer;
                applyFillAndZoom(map, pick.packZ, pick.useOffline);
                remember(map, opts, layer);
                return { layer: layer, offline: pick.useOffline, online: pick.online, maxNativeZoom: pick.useOffline ? pick.packZ : null };
            })
            .catch(function () {
                var blank = offlineOnly();
                var existing = map._fmBaseTiles;
                var pick = {
                    url: blank ? BLANK_TILE : OSM.url,
                    attribution: blank ? 'Offline map unavailable' : OSM.attribution,
                    useOffline: false,
                    packZ: 20,
                    maxNative: 19,
                    maxZ: 20,
                    online: !blank,
                };
                if (existing) return applyPickToLayer(map, existing, pick, opts);
                var layer = L.tileLayer(pick.url, Object.assign({}, baseOpts, { attribution: pick.attribution }));
                layer.addTo(map);
                map._fmBaseTiles = layer;
                remember(map, opts, layer);
                return { layer: layer, offline: false, online: !blank };
            });
    }

    function refreshAll() {
        return fetchCfg().then(function (cfg) {
            var i;
            var next = [];
            for (i = 0; i < attached.length; i++) {
                var entry = attached[i];
                if (!entry.map) continue;
                try {
                    var pick = pickTile(cfg, entry.opts || {});
                    var layer = entry.layer || entry.map._fmBaseTiles;
                    if (!layer) continue;
                    applyPickToLayer(entry.map, layer, pick, entry.opts || {});
                    next.push(entry);
                } catch (_) { /* drop dead map */ }
            }
            attached = next;
        }).catch(function () { /* keep current tiles */ });
    }

    var liveBound = false;
    function bindLiveRefresh() {
        if (liveBound) return;
        liveBound = true;
        document.addEventListener('fm-map-source-changed', function () { refreshAll(); });
        var tries = 0;
        var t = setInterval(function () {
            var s = global.__mobilityDashboardSocket;
            if (s && typeof s.on === 'function') {
                s.on('map-source-changed', function () { refreshAll(); });
                clearInterval(t);
            }
            if (++tries > 40) clearInterval(t);
        }, 400);
    }

    /* For surfaces that cannot wait on the config fetch: same rule, no network guess. */
    function blankLayer(opts) {
        return L.tileLayer(BLANK_TILE, Object.assign({ maxZoom: 19 }, opts || {}, { attribution: PACK_MISSING_ATTR }));
    }

    global.MobilityMapTiles = {
        attachLeaflet: attachLeaflet,
        refreshAll: refreshAll,
        blankLayer: blankLayer,
        BLANK_TILE: BLANK_TILE,
        getPackMaxZoom: function () { return packMaxZoom; },
    };
})(typeof window !== 'undefined' ? window : this);
