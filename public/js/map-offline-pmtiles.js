/**
 * MapLibre + PMTiles 3D buildings overlay — synced with Leaflet pins (Lane B lab).
 * Raster basemap stays on Leaflet (map-offline-tiles.js); vector buildings when .pmtiles exists.
 */
(function (global) {
    'use strict';

    var leafletMap = null;
    var glMap = null;
    var glReady = false;
    var active = false;
    var offlineCfg = null;
    var syncBound = false;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function hasMetaFlag(name, value) {
        try {
            var meta = document.querySelector('meta[name="' + name + '"]');
            return !!(meta && String(meta.content || '').trim() === value);
        } catch (_) {
            return false;
        }
    }

    function offlineOnlyMeta() {
        return hasMetaFlag('fm-map-offline-only', '1');
    }

    function vectorEnabledByMeta() {
        return hasMetaFlag('fm-map-vector-pmtiles', '1');
    }

    function ensureOverlayEl() {
        var wrap = document.querySelector('.map-canvas-wrap');
        if (!wrap) return null;
        var el = document.getElementById('map-pmtiles-gl');
        if (!el) {
            el = document.createElement('div');
            el.id = 'map-pmtiles-gl';
            el.setAttribute('aria-hidden', 'true');
            wrap.insertBefore(el, wrap.firstChild.nextSibling);
        }
        return el;
    }

    function setToggleState(on) {
        var btn = document.getElementById('map-pmtiles-3d-btn');
        if (!btn) return;
        btn.classList.toggle('is-on', !!on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function syncFromLeaflet() {
        if (!glMap || !leafletMap || !active) return;
        var c = leafletMap.getCenter();
        try {
            glMap.jumpTo({
                center: [c.lng, c.lat],
                zoom: leafletMap.getZoom(),
                bearing: 0,
            });
        } catch (_) { /* ignore */ }
    }

    function bindLeafletSync() {
        if (!leafletMap || syncBound) return;
        syncBound = true;
        leafletMap.on('move zoom resize', syncFromLeaflet);
    }

    function setOverlayVisible(show) {
        var el = document.getElementById('map-pmtiles-gl');
        if (!el) return;
        el.classList.toggle('fm-pmtiles-active', !!show);
    }

    function loadGlMap() {
        if (!offlineCfg || !offlineCfg.vectorStyleUrl || !global.maplibregl || !global.pmtiles) {
            return Promise.reject(new Error('maplibre or pmtiles missing'));
        }
        if (glMap) return Promise.resolve(glMap);
        var el = ensureOverlayEl();
        if (!el) return Promise.reject(new Error('map container missing'));

        var protocol = global.__fmPmtilesProtocol;
        if (!protocol) {
            protocol = new pmtiles.Protocol();
            maplibregl.addProtocol('pmtiles', protocol.tile);
            global.__fmPmtilesProtocol = protocol;
        }
        if (offlineCfg.vectorPmtilesUrl) {
            protocol.add(new pmtiles.PMTiles(offlineCfg.vectorPmtilesUrl));
        }

        return fetch(offlineCfg.vectorStyleUrl, { credentials: 'same-origin', cache: 'no-cache' })
            .then(function (r) {
                if (!r.ok) throw new Error('style ' + r.status);
                return r.json();
            })
            .then(function (style) {
                glMap = new maplibregl.Map({
                    container: el,
                    style: style,
                    interactive: false,
                    attributionControl: false,
                    pitch: 52,
                    bearing: 0,
                    antialias: true,
                });
                return new Promise(function (resolve) {
                    glMap.on('load', function () {
                        glReady = true;
                        syncFromLeaflet();
                        resolve(glMap);
                    });
                    glMap.on('error', function () { /* style tile miss — keep Leaflet */ });
                });
            });
    }

    function enable3d() {
        if (!offlineCfg || !offlineCfg.vectorPmtilesExists) return Promise.resolve(false);
        return loadGlMap().then(function () {
            active = true;
            setOverlayVisible(true);
            setToggleState(true);
            bindLeafletSync();
            syncFromLeaflet();
            try { glMap.resize(); } catch (_) { /* ignore */ }
            updateAttribution();
            return true;
        }).catch(function () {
            active = false;
            setOverlayVisible(false);
            setToggleState(false);
            return false;
        });
    }

    function disable3d() {
        active = false;
        setOverlayVisible(false);
        setToggleState(false);
        updateAttribution();
    }

    function toggle3d() {
        if (active) {
            disable3d();
            return;
        }
        enable3d();
    }

    function updateAttribution() {
        var strip = document.getElementById('map-attribution-strip');
        if (!strip) return;
        var parts = [];
        if (tilesOffline) {
            parts.push(tr('map.offline.tilesAttr'));
        } else if (offlineOnlyMeta()) {
            parts.push(tr('map.offline.packMissing'));
        } else {
            parts.push('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>');
        }
        if (active && offlineCfg && offlineCfg.vectorPmtilesExists) {
            parts.push(tr('map.offline.pmtilesAttr'));
        }
        parts.push('Leaflet');
        strip.innerHTML = parts.join(' · ');
    }

    var tilesOffline = false;

    function ensureToggleButton() {
        var bar = document.getElementById('map-view-controls');
        if (!bar || document.getElementById('map-pmtiles-3d-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'map-pmtiles-3d-btn';
        btn.textContent = tr('map.offline.pmtiles3d');
        btn.title = tr('map.offline.pmtiles3dTitle');
        btn.setAttribute('aria-label', tr('map.offline.pmtiles3dTitle'));
        btn.addEventListener('click', toggle3d);
        bar.insertBefore(btn, bar.firstChild);
    }

    function fetchConfig() {
        return fetch('/api/gis/offline/config', { credentials: 'same-origin', cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; });
    }

    function init(mapInstance) {
        leafletMap = mapInstance;
        ensureOverlayEl();
        return fetchConfig().then(function (cfg) {
            offlineCfg = cfg;
            updateAttribution();
            if (!cfg || !cfg.vectorPmtilesExists) return { pmtiles: false };
            ensureToggleButton();
            if (global.I18n && I18n.applyPage) {
                var btn = document.getElementById('map-pmtiles-3d-btn');
                if (btn) I18n.applyPage(btn);
            }
            if (vectorEnabledByMeta()) return enable3d().then(function () { updateAttribution(); return { pmtiles: true }; });
            updateAttribution();
            return { pmtiles: true };
        });
    }

    global.MobilityMapPmtiles = {
        init: init,
        enable3d: enable3d,
        disable3d: disable3d,
        updateAttribution: updateAttribution,
        setTilesOffline: function (on) { tilesOffline = !!on; updateAttribution(); },
        getConfig: function () { return offlineCfg; },
        resize: function () {
            try { if (glMap) glMap.resize(); } catch (_) { /* ignore */ }
            syncFromLeaflet();
        },
    };
})(typeof window !== 'undefined' ? window : this);
