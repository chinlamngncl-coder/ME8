/**
 * Map pin layer \u2014 Leaflet marker clustering + batched GPS map updates (Phase B scale prep).
 * SOS / fall alarms stay on the map layer (never clustered).
 * Viewport culling skips DOM work for off-screen patrol pins (SOS/selected always update).
 */
(function (global) {
    var clusterGroup = null;
    var mapRef = null;
    var clusterEnabled = false;
    var gpsPending = Object.create(null);
    var gpsDeferred = Object.create(null);
    var gpsFlushTimer = null;
    var GPS_BATCH_MS = 300;
    var VIEWPORT_MARGIN = 0.12;
    var viewportCullEnabled = true;
    var selectedCamIds = Object.create(null);
    var popupOpenCamIds = Object.create(null);
    var deferredApplyFn = null;

    function parseBatchMs() {
        var q = global.location && global.location.search ? global.location.search : '';
        var m = q.match(/[?&]gpsBatch=(\d+)/);
        if (m) return Math.max(0, parseInt(m[1], 10));
        return GPS_BATCH_MS;
    }

    function parseViewportCull() {
        var q = global.location && global.location.search ? global.location.search : '';
        if (/[?&]noViewportCull=1/.test(q)) return false;
        return true;
    }

    function isInExpandedBounds(lat, lon) {
        if (!mapRef || lat == null || lon == null || isNaN(lat) || isNaN(lon)) return true;
        var bounds = mapRef.getBounds();
        if (!bounds) return true;
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();
        var latPad = (ne.lat - sw.lat) * VIEWPORT_MARGIN;
        var lonPad = (ne.lng - sw.lng) * VIEWPORT_MARGIN;
        return lat >= sw.lat - latPad && lat <= ne.lat + latPad
            && lon >= sw.lng - lonPad && lon <= ne.lng + lonPad;
    }

    function shouldProcessGps(camId, lat, lon, meta) {
        if (!viewportCullEnabled || !mapRef) return true;
        meta = meta || {};
        if (meta.isSos) return true;
        if (meta.alarmKind === 'sos' || meta.alarmKind === 'fall') return true;
        if (meta.forceUpdate) return true;
        if (camId && selectedCamIds[camId]) return true;
        if (camId && popupOpenCamIds[camId]) return true;
        return isInExpandedBounds(lat, lon);
    }

    function ensureMapZoomLimits(map) {
        if (!map || !map.options) return;
        // MarkerClusterGroup requires map.options.maxZoom (tile layer alone is too late when attachLeaflet is async).
        if (map.options.maxZoom == null) map.options.maxZoom = 20;
        if (map.options.minZoom == null) map.options.minZoom = 2;
    }

    function init(map) {
        mapRef = map;
        ensureMapZoomLimits(map);
        GPS_BATCH_MS = parseBatchMs();
        viewportCullEnabled = parseViewportCull();
        if (!global.L || typeof L.markerClusterGroup !== 'function') {
            clusterEnabled = false;
            return;
        }
        clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 55,
            disableClusteringAtZoom: 16,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            removeOutsideVisibleBounds: true,
            animate: false,
            chunkedLoading: true,
            chunkInterval: 200,
            chunkDelay: 50,
        });
        map.addLayer(clusterGroup);
        clusterEnabled = true;
        map.on('moveend', function () { flushDeferredGps(); });
        map.on('zoomend', function () { flushDeferredGps(); });
    }

    function isClusterEligible(isSos, alarmKind, camId) {
        if (!clusterEnabled || !clusterGroup) return false;
        if (isSos) return false;
        if (alarmKind === 'sos' || alarmKind === 'fall') return false;
        if (camId && selectedCamIds[camId]) return false;
        if (camId && popupOpenCamIds[camId]) return false;
        return true;
    }

    function detachMarker(marker) {
        if (!marker) return;
        if (clusterGroup) {
            try { clusterGroup.removeLayer(marker); } catch (_) { /* ignore */ }
        }
        if (mapRef) {
            try { mapRef.removeLayer(marker); } catch (_) { /* ignore */ }
        }
    }

    function attachMarker(marker, isSos, alarmKind, camId) {
        if (!marker || !mapRef) return;
        camId = camId ? String(camId).trim() : '';
        if (isClusterEligible(isSos, alarmKind, camId)) {
            try { mapRef.removeLayer(marker); } catch (_) { /* ignore */ }
            try { clusterGroup.addLayer(marker); } catch (_) { /* ignore */ }
        } else {
            try { clusterGroup.removeLayer(marker); } catch (_) { /* ignore */ }
            if (!mapRef.hasLayer(marker)) {
                marker.addTo(mapRef);
            }
        }
    }

    function queueGpsUpdate(camId, lat, lon, meta, applyFn) {
        if (!camId || typeof applyFn !== 'function') return;
        deferredApplyFn = applyFn;
        if (GPS_BATCH_MS <= 0 || (meta && meta.isSos)) {
            if (shouldProcessGps(camId, lat, lon, meta)) {
                applyFn(camId, lat, lon, meta);
                delete gpsDeferred[camId];
            } else {
                gpsDeferred[camId] = { lat: lat, lon: lon, meta: meta || {} };
            }
            return;
        }
        gpsPending[camId] = { lat: lat, lon: lon, meta: meta || {} };
        if (gpsFlushTimer) return;
        gpsFlushTimer = setTimeout(function () {
            gpsFlushTimer = null;
            var batch = gpsPending;
            gpsPending = Object.create(null);
            Object.keys(batch).forEach(function (id) {
                var row = batch[id];
                if (shouldProcessGps(id, row.lat, row.lon, row.meta)) {
                    applyFn(id, row.lat, row.lon, row.meta);
                    delete gpsDeferred[id];
                } else {
                    gpsDeferred[id] = row;
                }
            });
        }, GPS_BATCH_MS);
    }

    function flushDeferredGps(applyFn) {
        applyFn = applyFn || deferredApplyFn;
        if (!applyFn) return;
        var ids = Object.keys(gpsDeferred);
        if (!ids.length) return;
        ids.forEach(function (id) {
            var row = gpsDeferred[id];
            if (!row) return;
            if (shouldProcessGps(id, row.lat, row.lon, row.meta)) {
                applyFn(id, row.lat, row.lon, row.meta);
                delete gpsDeferred[id];
            }
        });
    }

    function flushGpsPending(applyFn) {
        if (gpsFlushTimer) {
            clearTimeout(gpsFlushTimer);
            gpsFlushTimer = null;
        }
        if (!applyFn) return;
        var batch = gpsPending;
        gpsPending = Object.create(null);
        Object.keys(batch).forEach(function (id) {
            var row = batch[id];
            if (shouldProcessGps(id, row.lat, row.lon, row.meta)) {
                applyFn(id, row.lat, row.lon, row.meta);
                delete gpsDeferred[id];
            } else {
                gpsDeferred[id] = row;
            }
        });
        flushDeferredGps(applyFn);
    }

    function setSelectedCamIds(ids) {
        selectedCamIds = Object.create(null);
        (ids || []).forEach(function (id) {
            if (id) selectedCamIds[String(id)] = true;
        });
    }

    function setPopupOpenCamId(camId, open) {
        if (!camId) return;
        if (open) popupOpenCamIds[String(camId)] = true;
        else delete popupOpenCamIds[String(camId)];
    }

    /** Zoom/spiderfy clustered patrol pin so popup + focus can reach it (FR map focus). */
    function revealMarker(marker, callback) {
        if (!marker) {
            if (callback) callback();
            return;
        }
        if (!clusterEnabled || !clusterGroup) {
            if (callback) callback();
            return;
        }
        try {
            if (typeof clusterGroup.zoomToShowLayer === 'function') {
                clusterGroup.zoomToShowLayer(marker, function () {
                    if (callback) callback();
                });
                return;
            }
        } catch (_) { /* ignore */ }
        if (callback) callback();
    }

    function refreshClusters() {
        if (!clusterGroup) return;
        try {
            if (typeof clusterGroup.refreshClusters === 'function') {
                clusterGroup.refreshClusters();
            }
        } catch (_) { /* ignore */ }
    }

    global.MapPinLayer = {
        init: init,
        attachMarker: attachMarker,
        detachMarker: detachMarker,
        queueGpsUpdate: queueGpsUpdate,
        flushGpsPending: flushGpsPending,
        flushDeferredGps: flushDeferredGps,
        setSelectedCamIds: setSelectedCamIds,
        setPopupOpenCamId: setPopupOpenCamId,
        revealMarker: revealMarker,
        refreshClusters: refreshClusters,
        isClusterEnabled: function () { return clusterEnabled; },
        isViewportCullEnabled: function () { return viewportCullEnabled; },
    };
}(window));
