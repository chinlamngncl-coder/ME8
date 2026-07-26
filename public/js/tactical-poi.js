/**
 * TACTICAL-MAP-AR-POI-V1 + circle + BWC pin live + spiderfy popups + drag
 * + TACTICAL-POI-DRAG-DELETE-CLARITY-V1 (prepared/fixed editable; BWC GPS never)
 * + TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1 (ops-style label+dot; mount status)
 * + TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1 (plain layerGroup like ops prove; no silent fail)
 * + TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1 (Ops-like pixel spread for near-GPS markers)
 * + TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1 (exact Ops distPx; spread only at zoom >= 16)
 */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'me8.tacticalPois.v1';
    const OWNER = 'tactical-poi:' + Math.random().toString(36).slice(2, 10);
    const CIRCLE_OPEN_CAP = 8;
    /** Cluster if markers within this many meters (GPS-near stack) — popup fan. */
    const SPIDER_CLUSTER_M = 45;
    /** Popup pixel offsets: top, right, bottom, left, then diagonals. */
    const SPIDER_OFFSETS = [
        [0, -150],
        [170, -20],
        [0, 60],
        [-170, -20],
        [130, -120],
        [130, 50],
        [-130, 50],
        [-130, -120],
    ];
    const POI_NEUTRAL_COLOR = '#64748b';
    /** Ops PIN_COLOC_CLUSTER_M — markers within this many meters share a spread ring. */
    const COLOC_CLUSTER_M = 25;
    /** Ops MapPinLayer.disableClusteringAtZoom — only pixel-spread at/above this zoom. */
    const SPREAD_MIN_ZOOM = 16;
    /** Bearings deg: left, right, top, bottom, then diags (Ops PIN_DOCK_SPREAD_BEARING order). */
    const SPREAD_BEARINGS_DEG = [270, 90, 0, 180, 315, 45, 135, 225];

    let map = null;
    let clusterGroup = null;
    let clusterIsReal = false;
    let pois = [];
    let activeId = '';
    let placeMode = false;
    let uiBound = false;
    let mapClickBound = false;
    let spreadMapBound = false;
    let fixedCams = [];
    /** @type {Object.<string, { player: *, camId: string, streamKind?: string }>} */
    let liveByPoi = Object.create(null);
    /** @type {{ targets: Array, page: number }|null} */
    let grabCycle = null;
    /** Live BWC GPS markers on tactical map (team-colored). camId → host */
    let liveBwcByCam = Object.create(null);
    let liveBwcSyncTimer = null;
    let lastMountStatusKey = '';

    /** CLIENT-TACTICAL-OPEN-SESSION-PERSIST-V1 — open pins across nav remount */
    const OPEN_SESSION_KEY = 'me8.tactical.openPins.v1';
    let restoreInFlight = false;
    let remountGen = 0;

    function readOpenSession() {
        try {
            if (global.__me8TacticalOpenSession
                && Array.isArray(global.__me8TacticalOpenSession.items)) {
                return global.__me8TacticalOpenSession;
            }
        } catch (_) { /* ignore */ }
        try {
            const raw = sessionStorage.getItem(OPEN_SESSION_KEY);
            if (!raw) return { v: 1, items: [] };
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.items)) return { v: 1, items: [] };
            return { v: 1, items: parsed.items };
        } catch (_) {
            return { v: 1, items: [] };
        }
    }

    function writeOpenSession(items) {
        const payload = { v: 1, items: Array.isArray(items) ? items : [] };
        try { global.__me8TacticalOpenSession = payload; } catch (_) { /* ignore */ }
        try {
            sessionStorage.setItem(OPEN_SESSION_KEY, JSON.stringify(payload));
        } catch (_) { /* private mode */ }
    }

    function resolveOpenPinDisplayName(camId, streamKind, candidate) {
        const id = String(camId || '').trim();
        let n = String(candidate || '').trim();
        /* Keep a real display name; reject raw wire id */
        if (n && n !== id) return n;
        const kind = streamKind === 'bwc' ? 'bwc' : 'fixed';
        if (kind === 'bwc') {
            return bwcLabel(id) || '';
        }
        const fl = id ? fixedCamLabel(id) : '';
        if (fl && String(fl).trim() && String(fl).trim() !== id) return String(fl).trim();
        return '';
    }

    function rememberOpenPin(hostId, camId, streamKind, name) {
        const id = String(camId || '').trim();
        const hid = String(hostId || '').trim();
        if (!id || !hid) return;
        const cur = readOpenSession();
        const next = cur.items.filter(function (it) {
            return String(it.camId) !== id;
        });
        next.push({
            hostId: hid,
            camId: id,
            streamKind: streamKind === 'bwc' ? 'bwc' : 'fixed',
            name: resolveOpenPinDisplayName(id, streamKind, name),
        });
        writeOpenSession(next);
    }

    /** When fleet dictionary arrives, upgrade cached session names (and open popup titles). */
    function refreshOpenSessionNameForCam(camId, displayName) {
        const id = String(camId || '').trim();
        const name = String(displayName || '').trim();
        if (!id || !name || name === id) return;

        function paintHostTitle(host) {
            if (!host) return;
            host.name = name;
            try {
                const root = popupElSafe(host._marker);
                const title = root && root.querySelector('.ax-tactical-poi-popup-drag-title');
                if (title) title.textContent = name;
            } catch (_) { /* ignore */ }
        }

        const cur = readOpenSession();
        let changed = false;
        const next = cur.items.map(function (it) {
            if (String(it.camId) !== id) return it;
            if (String(it.name || '') === name) return it;
            changed = true;
            const copy = {};
            Object.keys(it).forEach(function (k) { copy[k] = it[k]; });
            copy.name = name;
            return copy;
        });
        if (changed) writeOpenSession(next);
        Object.keys(liveByPoi).forEach(function (hid) {
            const e = liveByPoi[hid];
            if (e && String(e.camId) === id) e.name = name;
        });
        paintHostTitle(liveBwcByCam[id]);
        if (grabCycle && grabCycle.targets) {
            grabCycle.targets.forEach(function (t) {
                if (t && String(t.camId) === id) paintHostTitle(t.host);
            });
        }
        pois.forEach(function (p) {
            const stream = resolvePoiStream(p);
            if (stream && String(stream.camId) === id) paintHostTitle(p);
        });
    }

    function forgetOpenPin(camIdOrHostId) {
        const want = String(camIdOrHostId || '').trim();
        if (!want) return;
        const cur = readOpenSession();
        writeOpenSession(cur.items.filter(function (it) {
            return String(it.camId) !== want && String(it.hostId) !== want;
        }));
    }

    function shortPinLabel(s) {
        const t = String(s || '').trim();
        if (!t) return '—';
        if (t.length <= 14) return t;
        return t.slice(0, 12) + '…';
    }

    /**
     * Ops-like chrome: name tag + colored dot (visible at island zoom).
     * opts: { color, label, kind: 'bwc'|'poi', offline }
     */
    function pinIcon(opts) {
        opts = opts || {};
        const c = String(opts.color || POI_NEUTRAL_COLOR).replace(/[^\w#(),.%\s-]/g, '') || POI_NEUTRAL_COLOR;
        const full = String(opts.label || '').trim() || (opts.kind === 'bwc' ? 'BWC' : 'POI');
        const label = shortPinLabel(full);
        const wrapCls = 'ax-tactical-pin-wrap'
            + (opts.kind === 'bwc' ? ' is-bwc' : ' is-poi')
            + (opts.offline ? ' is-offline' : '');
        const html = '<div class="' + wrapCls + '">'
            + '<div class="ax-tactical-pin-label" title="' + esc(full) + '">' + esc(label) + '</div>'
            + '<div class="ax-tactical-pin-dot" style="background:' + c
            + ';box-shadow:0 0 12px ' + c + ',0 2px 8px rgba(0,0,0,0.5)"></div>'
            + '</div>';
        return global.L.divIcon({
            className: 'ax-tactical-pin-icon',
            html: html,
            iconSize: [110, 52],
            iconAnchor: [55, 46],
        });
    }

    function ensureCluster() {
        /* TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1 — plain layerGroup (ops-simple).
         * Cluster on a second map was flaky; popup spiderfy offsets still handle near-GPS. */
        if (!map || !global.L) return null;
        if (clusterGroup && !clusterIsReal) {
            try {
                if (typeof map.hasLayer === 'function' && !map.hasLayer(clusterGroup)) {
                    map.addLayer(clusterGroup);
                }
            } catch (_) { /* ignore */ }
            return clusterGroup;
        }
        if (clusterGroup) {
            try { map.removeLayer(clusterGroup); } catch (_) { /* ignore */ }
            try { clusterGroup.clearLayers(); } catch (_) { /* ignore */ }
            clusterGroup = null;
        }
        clusterGroup = global.L.layerGroup();
        clusterIsReal = false;
        try { map.addLayer(clusterGroup); } catch (err) {
            try { console.error('[tactical-poi] pin layer add failed', err); } catch (_) { /* ignore */ }
            return null;
        }
        return clusterGroup;
    }

    function removeFromCluster(marker) {
        if (!marker || !clusterGroup) return;
        try { clusterGroup.removeLayer(marker); } catch (_) { /* ignore */ }
    }

    function refreshClusterMarker(marker) {
        if (!marker || !clusterIsReal || !clusterGroup) return;
        try {
            if (typeof clusterGroup.refreshClusters === 'function') {
                clusterGroup.refreshClusters(marker);
            }
        } catch (_) { /* ignore */ }
    }

    function trueGpsOf(host) {
        if (!host) return null;
        if (host._marker && host._marker._gpsLatLng) {
            const g = host._marker._gpsLatLng;
            if (g && g.lat != null && g.lng != null) return { lat: Number(g.lat), lng: Number(g.lng) };
        }
        if (host.lat != null && host.lng != null) {
            return { lat: Number(host.lat), lng: Number(host.lng) };
        }
        return null;
    }

    function setMarkerTrueGps(marker, lat, lng) {
        if (!marker || !global.L) return;
        marker._gpsLatLng = global.L.latLng(lat, lng);
    }

    function listSpreadHosts() {
        /* MOB-APPLY TACTICAL-POI-DRAG-DELETE-CLARITY-V1
         * Spread only live BWC + ephemeral open-camera hosts.
         * Prepared / fixed-linked POIs stay exactly where the operator placed them. */
        const list = [];
        const seen = Object.create(null);
        function push(host) {
            if (!host || !host.id || !host._marker || seen[host.id]) return;
            if (!host._liveBwc && !host._ephemeral) return;
            seen[host.id] = true;
            list.push(host);
        }
        Object.keys(liveBwcByCam).forEach(function (camId) {
            push(liveBwcByCam[camId]);
        });
        if (grabCycle && grabCycle.targets) {
            grabCycle.targets.forEach(function (t) {
                if (t && t.host && t.host._ephemeral) push(t.host);
            });
        }
        return list;
    }

    function pinDistanceMeters(aLat, aLng, bLat, bLng) {
        if (!map || !global.L) return Infinity;
        try {
            return map.distance(global.L.latLng(aLat, aLng), global.L.latLng(bLat, bLng));
        } catch (_) {
            return Infinity;
        }
    }

    function clusterHostsByGps(hosts) {
        const remaining = (hosts || []).slice();
        const clusters = [];
        while (remaining.length) {
            const seed = remaining.shift();
            const sll = trueGpsOf(seed);
            if (!sll) continue;
            const cluster = [seed];
            for (let i = remaining.length - 1; i >= 0; i--) {
                const other = remaining[i];
                const oll = trueGpsOf(other);
                if (!oll) {
                    remaining.splice(i, 1);
                    continue;
                }
                if (pinDistanceMeters(sll.lat, sll.lng, oll.lat, oll.lng) <= COLOC_CLUSTER_M) {
                    cluster.push(other);
                    remaining.splice(i, 1);
                }
            }
            cluster.sort(function (a, b) {
                return String(a.id || '').localeCompare(String(b.id || ''));
            });
            clusters.push(cluster);
        }
        return clusters;
    }

    /**
     * TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1 + TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1
     * True GPS on marker._gpsLatLng; display offset only when zoom >= 16.
     * Ops distPx: Math.max(58, 38 + n * 14).
     */
    function spreadColocatedMarkers() {
        if (!map || !global.L) return;
        const hosts = listSpreadHosts();
        const zoom = typeof map.getZoom === 'function' ? map.getZoom() : 0;
        const allowSpread = zoom >= SPREAD_MIN_ZOOM;

        if (!allowSpread) {
            hosts.forEach(function (h) {
                if (!h || !h._marker) return;
                const ll = trueGpsOf(h);
                if (!ll) return;
                try { h._marker.setLatLng([ll.lat, ll.lng]); } catch (_) { /* ignore */ }
            });
            return;
        }

        const clusters = clusterHostsByGps(hosts);
        const spreadIds = Object.create(null);

        clusters.forEach(function (cluster) {
            if (!cluster || cluster.length < 2) return;
            let cLat = 0;
            let cLng = 0;
            let n = 0;
            cluster.forEach(function (h) {
                const ll = trueGpsOf(h);
                if (!ll) return;
                cLat += ll.lat;
                cLng += ll.lng;
                n += 1;
            });
            if (!n) return;
            let centerPt;
            try {
                centerPt = map.latLngToLayerPoint(global.L.latLng(cLat / n, cLng / n));
            } catch (_) {
                return;
            }
            /* Exact Ops formula — do not widen. */
            const distPx = Math.max(58, 38 + cluster.length * 14);
            cluster.forEach(function (h, i) {
                if (!h._marker) return;
                const bearing = (SPREAD_BEARINGS_DEG[i % SPREAD_BEARINGS_DEG.length] * Math.PI) / 180;
                const dx = Math.sin(bearing) * distPx;
                const dy = -Math.cos(bearing) * distPx;
                try {
                    const pt = global.L.point(centerPt.x + dx, centerPt.y + dy);
                    const display = map.layerPointToLatLng(pt);
                    h._marker.setLatLng(display);
                    if (typeof h._marker.setZIndexOffset === 'function') {
                        h._marker.setZIndexOffset(1000 + i);
                    }
                    spreadIds[h.id] = true;
                } catch (_) { /* ignore */ }
            });
        });

        hosts.forEach(function (h) {
            if (!h || !h._marker || spreadIds[h.id]) return;
            const ll = trueGpsOf(h);
            if (!ll) return;
            try { h._marker.setLatLng([ll.lat, ll.lng]); } catch (_) { /* ignore */ }
        });
    }

    function bindSpreadMapEvents() {
        if (!map || spreadMapBound) return;
        spreadMapBound = true;
        map.on('zoomend', spreadColocatedMarkers);
        map.on('moveend', spreadColocatedMarkers);
    }

    function updatePinMountStatus() {
        const poiN = pois.filter(function (p) { return !!(p && p._marker); }).length;
        const bwcN = Object.keys(liveBwcByCam).length;
        const total = poiN + bwcN;
        const opsGpsN = countOpsGpsPins();
        updateEmptyBanner(total, opsGpsN);
        const key = total === 0 ? 'tactical.pinMountEmpty' : 'tactical.pinMountCount';
        const sig = key + ':' + bwcN + ':' + poiN + ':' + opsGpsN;
        if (sig === lastMountStatusKey) return;
        lastMountStatusKey = sig;
        if (placeMode || grabCycle) return;
        if (total === 0) {
            if (opsGpsN > 0) {
                setStatus(
                    'tactical.pinMountOpsButEmpty',
                    'Ops has {n} GPS pins — Tactical mount failed (see console)',
                    { n: opsGpsN }
                );
            } else {
                setStatus('tactical.pinMountEmpty', 'No GPS units on map — check BWC GPS or Place POI');
            }
        } else {
            setStatus('tactical.pinMountCount', '{bwc} BWC · {poi} POI on map', {
                bwc: bwcN,
                poi: poiN,
                total: total,
            });
        }
    }

    /** Same idea as ops dashboard-boot markerGpsLatLng — count markers with GPS. */
    function countOpsGpsPins() {
        const markers = global.deviceMarkers;
        if (!markers) return 0;
        let n = 0;
        Object.keys(markers).forEach(function (id) {
            if (String(id).indexOf('fixed:') === 0) return;
            if (bwcGpsLatLng(id)) n += 1;
        });
        return n;
    }

    function updateEmptyBanner(total, opsGpsN) {
        let el = document.getElementById('ax-tactical-pin-empty');
        if (!el) {
            const wrap = document.querySelector('#ax-panel-tactical .ax-tactical-map-wrap');
            if (!wrap) return;
            el = document.createElement('div');
            el.id = 'ax-tactical-pin-empty';
            el.className = 'ax-tactical-pin-empty';
            el.setAttribute('role', 'status');
            wrap.appendChild(el);
        }
        if (total > 0) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        if (opsGpsN > 0) {
            el.textContent = tr(
                'tactical.pinMountOpsButEmpty',
                'Ops has {n} GPS pins — Tactical mount failed (see console)',
                { n: opsGpsN }
            );
        } else {
            el.textContent = tr(
                'tactical.pinMountEmptyMap',
                'No GPS units — Place POI or wait for BWC GPS'
            );
        }
    }

    function tr(key, fallback, params) {
        let s;
        if (global.I18n && I18n.t) {
            s = I18n.t(key, params);
            if (s && s !== key) {
                /* already interpolated by I18n when params passed */
            } else {
                s = fallback || key;
            }
        } else {
            s = fallback || key;
        }
        if (params && typeof s === 'string') {
            Object.keys(params).forEach(function (p) {
                s = s.replace(new RegExp('\\{' + p + '\\}', 'g'), String(params[p]));
            });
        }
        return s;
    }

    function setStatus(key, fallback, params) {
        const status = document.getElementById('ax-tactical-status');
        if (status) status.textContent = tr(key, fallback, params);
    }

    function makeId() {
        return 'poi' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function loadStore() {
        try {
            const raw = global.localStorage && localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                pois = [];
                return;
            }
            const parsed = JSON.parse(raw);
            const list = Array.isArray(parsed && parsed.pois) ? parsed.pois : [];
            pois = list.map(function (p) {
                const lat = Number(p && p.lat);
                const lng = Number(p && p.lng);
                if (!p || !p.id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                return {
                    id: String(p.id),
                    name: String(p.name || '').trim() || 'POI',
                    lat: lat,
                    lng: lng,
                    notes: String(p.notes || ''),
                    fixedCamIds: Array.isArray(p.fixedCamIds)
                        ? p.fixedCamIds.map(function (id) { return String(id || '').trim(); }).filter(Boolean)
                        : (p.fixedCamId ? [String(p.fixedCamId).trim()] : []),
                    bwcCamIds: Array.isArray(p.bwcCamIds)
                        ? p.bwcCamIds.map(function (id) { return String(id || '').trim(); }).filter(Boolean)
                        : [],
                };
            }).filter(Boolean);
        } catch (_) {
            pois = [];
        }
    }

    function saveStore() {
        try {
            if (global.localStorage) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ pois: pois }));
            }
        } catch (_) { /* ignore */ }
    }

    function getActive() {
        if (!activeId) return null;
        for (let i = 0; i < pois.length; i += 1) {
            if (pois[i].id === activeId) return pois[i];
        }
        return null;
    }

    function fixedCamLabel(id) {
        if (!id) return tr('tactical.poiFixedNone', 'None');
        for (let i = 0; i < fixedCams.length; i += 1) {
            if (fixedCams[i].id === id) {
                return fixedCams[i].name || id;
            }
        }
        return id;
    }

    function stopLiveForPoi(poiId) {
        const id = String(poiId || '');
        if (!id) return;
        const entry = liveByPoi[id];
        if (!entry) return;
        delete liveByPoi[id];
        if (!restoreInFlight) {
            forgetOpenPin(entry.camId || id);
        }
        if (entry.player) {
            try { entry.player.destroy(); } catch (_) { /* ignore */ }
        }
        if (entry.camId && entry.streamKind !== 'bwc') {
            fetch('/api/fixed-cams/' + encodeURIComponent(entry.camId) + '/zlm/stop', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: OWNER }),
            }).catch(function () { /* lease expires */ });
            return;
        }
        /* BWC release → unregister-viewer-only (server truth) */
        if (entry.camId) {
            unregisterTacticalViewerOnly(entry.camId);
        }
    }

    function registerTacticalViewerOnly(camId) {
        const id = String(camId || '').trim();
        if (!id) return;
        try {
            const VW = global.VideoWall;
            if (VW && typeof VW.emitRegisterViewerOnly === 'function') {
                VW.emitRegisterViewerOnly(id, 'tactical');
            }
        } catch (_) { /* ignore */ }
    }

    function unregisterTacticalViewerOnly(camId) {
        const id = String(camId || '').trim();
        if (!id) return;
        try {
            const VW = global.VideoWall;
            if (VW && typeof VW.emitUnregisterViewerOnly === 'function') {
                VW.emitUnregisterViewerOnly(id, 'tactical');
            }
        } catch (_) { /* ignore */ }
    }

    function closePoiPinPopup(poi) {
        if (!poi || !poi._marker) {
            stopLiveForPoi(poi && poi.id);
            return;
        }
        try {
            poi._marker.closePopup();
        } catch (_) {
            stopLiveForPoi(poi.id);
        }
    }

    function stopAllLive() {
        Object.keys(liveByPoi).forEach(function (id) {
            stopLiveForPoi(id);
        });
    }

    /** @deprecated name kept for single-call sites — stops all pin lives */
    function stopLive() {
        stopAllLive();
    }

    /** Same idea as fleet-ui / FR: dispatchGroupLookup team color. */
    function teamColorForCam(camId) {
        const id = String(camId || '');
        const lk = global.dispatchGroupLookup || {};
        if (id && lk.byDevice && lk.byDevice[id] && lk.byDevice[id].color) {
            return String(lk.byDevice[id].color);
        }
        const devices = global.devices || global.fleetDevices;
        const d = devices && devices[id];
        const mapGroup = d && (d.mapGroup || d.group || d.dispatchGroup);
        const gk = String(mapGroup || '').toLowerCase();
        if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
            return String(lk.byName[gk].color);
        }
        return POI_NEUTRAL_COLOR;
    }

    function colorForPoi(poi) {
        if (!poi) return POI_NEUTRAL_COLOR;
        const bwc = poi.bwcCamIds && poi.bwcCamIds[0];
        if (bwc) return teamColorForCam(bwc);
        return POI_NEUTRAL_COLOR;
    }

    function bindPopup(marker, poi) {
        const title = poi.name || 'POI';
        const link = poi.fixedCamIds[0] ? fixedCamLabel(poi.fixedCamIds[0]) : tr('tactical.poiFixedNone', 'None');
        const html = '<div class="ax-tactical-poi-popup">'
            + '<div class="ax-tactical-poi-popup-drag" title="' + esc(tr('tactical.poiDragHint', 'Drag to move video')) + '">'
            + '<span class="ax-tactical-poi-popup-drag-grip" aria-hidden="true"></span>'
            + '<strong class="ax-tactical-poi-popup-drag-title">' + esc(title) + '</strong>'
            + '</div>'
            + '<div class="ax-tactical-poi-popup-pinhint">'
            + esc(tr('tactical.poiPopupPinHint', 'Drag the map pin to change place · this bar moves video only'))
            + '</div>'
            + '<div class="ax-tactical-poi-popup-status">' + esc(link) + '</div>'
            + '<div class="ax-tactical-poi-popup-stage" data-poi-stage="' + esc(poi.id) + '"></div>'
            + '<div class="ax-tactical-poi-popup-status" data-poi-live-status="' + esc(poi.id) + '"></div>'
            + '<div class="ax-tactical-poi-popup-actions">'
            + '<button type="button" class="ax-tactical-poi-stop" data-poi-stop="' + esc(poi.id) + '">'
            + esc(tr('tactical.poiStop', 'Stop'))
            + '</button>'
            + '</div>'
            + '</div>';
        /* autoClose false — Open grabbed can keep several pin videos open */
        marker.bindPopup(html, {
            maxWidth: 300,
            className: 'ax-tactical-poi-leaflet-popup',
            autoClose: false,
            closeOnClick: false,
        });
        marker.on('popupopen', function () {
            selectPoi(poi.id, { skipPan: true });
            enablePopupDrag(marker);
            wirePoiStopButton(marker, poi);
        });
        marker.on('popupclose', function () {
            stopLiveForPoi(poi.id);
            marker._tacticalPopupOffset = null;
            try {
                const el = popupElSafe(marker);
                if (el) el.removeAttribute('data-tactical-drag');
            } catch (_) { /* ignore */ }
        });
        marker.on('click', function () {
            selectPoi(poi.id, { skipPan: true });
        });
    }

    function wirePoiStopButton(marker, poi) {
        try {
            const root = popupElSafe(marker);
            if (!root) return;
            const btn = root.querySelector('[data-poi-stop="' + poi.id + '"]');
            if (!btn || btn.getAttribute('data-bound') === '1') return;
            btn.setAttribute('data-bound', '1');
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                closePoiPinPopup(poi);
            });
        } catch (_) { /* ignore */ }
    }

    function popupElSafe(marker) {
        try {
            const popup = marker && marker.getPopup && marker.getPopup();
            return popup && popup.getElement ? popup.getElement() : null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Move open popup without Leaflet popup.update().
     * update() re-runs _updateContent → innerHTML wipe → live <video> goes black.
     * TACTICAL-PIN-DRAG-NO-POPUP-UPDATE-WIPE-V1
     */
    function repositionPopupOnly(popup) {
        if (!popup) return;
        try {
            if (typeof popup._updatePosition === 'function') {
                popup._updatePosition();
                return;
            }
        } catch (_) { /* fall through */ }
        try {
            if (typeof popup.update === 'function') popup.update();
        } catch (_) { /* ignore */ }
    }

    /**
     * TACTICAL-PIN-VIDEO-DRAGGABLE-V1 — drag bar moves popup offset only (not GPS / POI).
     */
    function enablePopupDrag(marker) {
        if (!marker || !global.L) return;
        const popup = marker.getPopup && marker.getPopup();
        if (!popup) return;
        const root = popup.getElement && popup.getElement();
        if (!root || root.getAttribute('data-tactical-drag') === '1') return;
        const handle = root.querySelector('.ax-tactical-poi-popup-drag');
        if (!handle) return;
        root.setAttribute('data-tactical-drag', '1');

        let dragging = false;
        let startClientX = 0;
        let startClientY = 0;
        let startOffX = 0;
        let startOffY = 0;

        function readOffset() {
            const off = popup.options && popup.options.offset;
            if (off && typeof off.x === 'number') return { x: off.x, y: off.y };
            if (Array.isArray(marker._tacticalPopupOffset)) {
                return { x: marker._tacticalPopupOffset[0], y: marker._tacticalPopupOffset[1] };
            }
            return { x: 0, y: 6 };
        }

        function applyOffset(x, y) {
            try {
                popup.options.offset = global.L.point(x, y);
                marker._tacticalPopupOffset = [x, y];
                repositionPopupOnly(popup);
            } catch (_) { /* ignore */ }
        }

        function onMove(ev) {
            if (!dragging) return;
            const clientX = ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX;
            const clientY = ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY;
            applyOffset(startOffX + (clientX - startClientX), startOffY + (clientY - startClientY));
            if (ev.cancelable) ev.preventDefault();
        }

        function onUp() {
            if (!dragging) return;
            dragging = false;
            handle.classList.remove('is-dragging');
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            document.removeEventListener('touchmove', onMove, true);
            document.removeEventListener('touchend', onUp, true);
            document.removeEventListener('touchcancel', onUp, true);
            try {
                if (map && map.dragging && map.dragging.enable) map.dragging.enable();
            } catch (_) { /* ignore */ }
        }

        function onDown(ev) {
            if (ev.type === 'mousedown' && ev.button !== 0) return;
            ev.preventDefault();
            ev.stopPropagation();
            dragging = true;
            handle.classList.add('is-dragging');
            const pt = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
            startClientX = pt.clientX;
            startClientY = pt.clientY;
            const cur = readOffset();
            startOffX = cur.x;
            startOffY = cur.y;
            try {
                if (map && map.dragging && map.dragging.disable) map.dragging.disable();
            } catch (_) { /* ignore */ }
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
            document.addEventListener('touchmove', onMove, { capture: true, passive: false });
            document.addEventListener('touchend', onUp, true);
            document.addEventListener('touchcancel', onUp, true);
        }

        handle.addEventListener('mousedown', onDown);
        handle.addEventListener('touchstart', onDown, { passive: false });
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function findHostForOpenItem(item) {
        if (!item || !item.camId) return null;
        const camId = String(item.camId);
        const hostId = String(item.hostId || '');
        /* Prefer exact host (POI / ephemeral) after remount */
        for (let i = 0; i < pois.length; i++) {
            const p = pois[i];
            if (hostId && p.id === hostId && p._marker) return p;
        }
        if (liveBwcByCam[camId] && liveBwcByCam[camId]._marker) {
            return liveBwcByCam[camId];
        }
        for (let j = 0; j < pois.length; j++) {
            const stream = resolvePoiStream(pois[j]);
            if (stream && String(stream.camId) === camId && pois[j]._marker) {
                return pois[j];
            }
        }
        return null;
    }

    /** Refresh name + rebind popup so restore gets drag + correct title (Open cameras parity). */
    function prepareHostPopupForRestore(host, camId, streamKind, savedName) {
        if (!host || !host._marker) return;
        const id = String(camId || '').trim();
        const cached = resolveOpenPinDisplayName(id, streamKind, savedName);
        if (cached) {
            host.name = cached;
        } else if (streamKind === 'bwc') {
            host.name = bwcLabel(id) || host.name || id;
        } else {
            const fixedName = id ? fixedCamLabel(id) : '';
            if (fixedName && fixedName !== id) host.name = fixedName;
            else if (!host.name) host.name = id || 'POI';
        }
        const marker = host._marker;
        try { marker.closePopup(); } catch (_) { /* ignore */ }
        try {
            const el = popupElSafe(marker);
            if (el) el.removeAttribute('data-tactical-drag');
        } catch (_) { /* ignore */ }
        try {
            marker.off('popupopen');
            marker.off('popupclose');
            marker.off('click');
        } catch (_) { /* ignore */ }
        bindPopup(marker, host);
    }

    function restoreOpenPinSessions() {
        const session = readOpenSession();
        if (!session.items.length || !map) {
            restoreInFlight = false;
            return;
        }
        const queue = [];
        session.items.forEach(function (it) {
            const host = findHostForOpenItem(it);
            if (!host || !host._marker) return;
            const streamKind = it.streamKind === 'bwc' ? 'bwc' : 'fixed';
            prepareHostPopupForRestore(host, String(it.camId), streamKind, it.name);
            queue.push({
                host: host,
                camId: String(it.camId),
                streamKind: streamKind,
            });
        });
        if (!queue.length) {
            restoreInFlight = false;
            return;
        }
        /* Same spiderfy as Open cameras — avoid all restored popups on [0, 6] */
        const spider = assignSpiderOffsets(queue);
        spreadColocatedMarkers();
        const armed = queue.map(function (t) {
            return {
                target: t,
                off: (t.host && spider.offsets[t.host.id])
                    ? spider.offsets[t.host.id]
                    : [0, 6],
            };
        });
        restoreInFlight = true;
        function openNext() {
            if (!armed.length) {
                restoreInFlight = false;
                return;
            }
            const item = armed.shift();
            openTargetPinLive(item.target, item.off, function () {
                setTimeout(openNext, 120);
            });
        }
        openNext();
    }

    function remountMarkers() {
        if (!map || !global.L) return;
        const gen = ++remountGen;
        /* Snapshot before teardown so navigational remount can restore UI */
        const snap = [];
        Object.keys(liveByPoi).forEach(function (hid) {
            const e = liveByPoi[hid];
            if (!e || !e.camId) return;
            snap.push({
                hostId: hid,
                camId: String(e.camId),
                streamKind: e.streamKind === 'bwc' ? 'bwc' : 'fixed',
                name: resolveOpenPinDisplayName(e.camId, e.streamKind, e.name),
            });
        });
        if (snap.length) writeOpenSession(snap);
        /* keep prior session if remount with empty liveByPoi (already torn down) */
        restoreInFlight = true;
        stopAllLive();
        const group = ensureCluster();
        if (!group) {
            restoreInFlight = false;
            return;
        }
        pois.forEach(function (poi) {
            if (poi._marker) {
                removeFromCluster(poi._marker);
                poi._marker = null;
            }
        });
        pois.forEach(function (poi) {
            const marker = global.L.marker([poi.lat, poi.lng], {
                icon: pinIcon({
                    color: colorForPoi(poi),
                    kind: 'poi',
                    label: poi.name,
                }),
                draggable: true,
                autoPan: false,
                title: poi.name + ' — ' + tr('tactical.poiDragPinHint', 'Drag pin to move'),
            });
            marker._tacticalPoiId = poi.id;
            marker._tacticalPrepared = true;
            setMarkerTrueGps(marker, poi.lat, poi.lng);
            bindPopup(marker, poi);
            marker.on('dragstart', function () {
                poi._dragging = true;
                try {
                    if (map && map.dragging && map.dragging.disable) map.dragging.disable();
                } catch (_) { /* ignore */ }
                selectPoi(poi.id, { skipPan: true, skipPopup: true });
                setStatus('tactical.poiStatusDragging', 'Dragging POI — drop to save place');
            });
            marker.on('dragend', function () {
                poi._dragging = false;
                try {
                    if (map && map.dragging && map.dragging.enable) map.dragging.enable();
                } catch (_) { /* ignore */ }
                const ll = marker.getLatLng();
                poi.lat = ll.lat;
                poi.lng = ll.lng;
                setMarkerTrueGps(marker, ll.lat, ll.lng);
                try { marker.setLatLng([ll.lat, ll.lng]); } catch (_) { /* ignore */ }
                saveStore();
                setStatus('tactical.poiStatusMoved', 'POI place saved');
                lastMountStatusKey = '';
                refreshClusterMarker(marker);
                spreadColocatedMarkers();
                syncSelectedHint();
            });
            group.addLayer(marker);
            poi._marker = marker;
            try {
                if (marker.dragging && typeof marker.dragging.enable === 'function') {
                    marker.dragging.enable();
                }
            } catch (_) { /* ignore */ }
        });
        syncLiveBwcPins();
        spreadColocatedMarkers();
        /* After BWC ephemeral markers exist, re-open stored sessions (debounced vs triple kickPinMount) */
        setTimeout(function () {
            if (gen !== remountGen) return;
            try { restoreOpenPinSessions(); } catch (_) { /* ignore */ }
        }, 50);
    }

    function syncLiveBwcPins() {
        const group = ensureCluster();
        if (!group || !global.L) return;
        const seen = Object.create(null);
        const camIds = Object.create(null);
        if (global.deviceMarkers) {
            Object.keys(global.deviceMarkers).forEach(function (id) {
                if (String(id).indexOf('fixed:') === 0) return;
                camIds[id] = true;
            });
        }
        const devices = global.devices || global.fleetDevices;
        if (devices) {
            Object.keys(devices).forEach(function (id) {
                if (String(id).indexOf('fixed:') === 0) return;
                camIds[id] = true;
            });
        }
        Object.keys(camIds).forEach(function (camId) {
            const ll = bwcGpsLatLng(camId);
            if (!ll) return;
            seen[camId] = true;
            const online = isBwcOnline(camId);
            const color = teamColorForCam(camId);
            const name = bwcLabel(camId);
            let host = liveBwcByCam[camId];
            if (!host) {
                host = {
                    id: 'live-bwc-' + camId,
                    name: name,
                    lat: ll.lat,
                    lng: ll.lng,
                    notes: '',
                    fixedCamIds: [],
                    bwcCamIds: [camId],
                    _liveBwc: true,
                };
                const marker = global.L.marker([ll.lat, ll.lng], {
                    icon: pinIcon({
                        color: color,
                        kind: 'bwc',
                        label: name,
                        offline: !online,
                    }),
                    draggable: false,
                    title: name,
                });
                marker._tacticalPoiId = host.id;
                marker._tacticalCamId = camId;
                setMarkerTrueGps(marker, ll.lat, ll.lng);
                bindPopup(marker, host);
                group.addLayer(marker);
                host._marker = marker;
                liveBwcByCam[camId] = host;
                if (name && name !== camId) {
                    refreshOpenSessionNameForCam(camId, name);
                }
            } else {
                host.lat = ll.lat;
                host.lng = ll.lng;
                host.name = name;
                try {
                    if (host._marker) {
                        setMarkerTrueGps(host._marker, ll.lat, ll.lng);
                        host._marker.setIcon(pinIcon({
                            color: color,
                            kind: 'bwc',
                            label: name,
                            offline: !online,
                        }));
                        refreshClusterMarker(host._marker);
                    }
                } catch (_) { /* ignore */ }
                /* Dictionary may arrive after Open cameras — upgrade session + open popup title */
                if (name && name !== camId) {
                    refreshOpenSessionNameForCam(camId, name);
                }
            }
        });
        Object.keys(liveBwcByCam).forEach(function (camId) {
            if (seen[camId]) return;
            const host = liveBwcByCam[camId];
            if (host && host.id) stopLiveForPoi(host.id);
            if (host && host._marker) removeFromCluster(host._marker);
            delete liveBwcByCam[camId];
        });
        spreadColocatedMarkers();
        updatePinMountStatus();
    }

    function startLiveBwcSync() {
        if (liveBwcSyncTimer) return;
        liveBwcSyncTimer = setInterval(function () {
            if (!map) return;
            try {
                syncLiveBwcPins();
            } catch (err) {
                try { console.error('[tactical-poi] syncLiveBwcPins', err); } catch (_) { /* ignore */ }
            }
        }, 2500);
    }

    function kickPinMount() {
        if (!map) return;
        try {
            map.invalidateSize();
        } catch (_) { /* ignore */ }
        try {
            remountMarkers();
        } catch (err) {
            try { console.error('[tactical-poi] remountMarkers failed', err); } catch (_) { /* ignore */ }
            setStatus('tactical.pinMountError', 'Pin mount error — see console');
            updateEmptyBanner(0, countOpsGpsPins());
            throw err;
        }
    }

    function attach(mapInstance) {
        map = mapInstance || null;
        if (!map) return;
        loadStore();
        kickPinMount();
        bindSpreadMapEvents();
        startLiveBwcSync();
        bindMapClick();
        bindUi();
        loadFixedCams();
        syncEditor();
    }

    function onShow() {
        if (global.TacticalShell && TacticalShell.ensureMap) {
            const m = TacticalShell.ensureMap();
            attach(m);
        }
        /* After hidden→visible: ops-style invalidate + remount (prove paint). */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                try { kickPinMount(); } catch (_) { /* already logged */ }
            });
        });
        setTimeout(function () {
            try { kickPinMount(); } catch (_) { /* already logged */ }
        }, 200);
        if (global.TacticalShell && TacticalShell.syncOpenInCircleEnabled) {
            try { TacticalShell.syncOpenInCircleEnabled(); } catch (_) { /* ignore */ }
        }
        if (typeof global.I18n !== 'undefined' && I18n.scheduleApply) {
            I18n.scheduleApply(document.getElementById('ax-tactical-prepare-block')
                || document.getElementById('ax-tactical-poi-block'));
        }
    }

    function syncSelectedHint() {
        const hint = document.getElementById('ax-tactical-poi-selected-hint');
        const poi = getActive();
        if (!hint) return;
        if (!poi) {
            hint.hidden = true;
            hint.textContent = '';
            return;
        }
        hint.hidden = false;
        const link = poi.fixedCamIds && poi.fixedCamIds[0]
            ? fixedCamLabel(poi.fixedCamIds[0])
            : tr('tactical.poiFixedNone', 'None');
        hint.textContent = tr(
            'tactical.poiSelectedHint',
            'Selected: {name} · drag pin to move · Delete to remove · link: {link}',
            { name: poi.name || 'POI', link: link },
        );
    }

    function renderList() {
        const empty = document.getElementById('ax-tactical-pois-empty');
        const list = document.getElementById('ax-tactical-pois-list');
        if (!list) return;
        list.innerHTML = '';
        if (!pois.length) {
            if (empty) empty.hidden = false;
            list.hidden = true;
            return;
        }
        if (empty) empty.hidden = true;
        list.hidden = false;
        pois.forEach(function (poi) {
            const li = document.createElement('li');
            li.className = 'ax-tactical-poi-li' + (poi.id === activeId ? ' is-active' : '');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ax-tactical-poi-row' + (poi.id === activeId ? ' active' : '');
            btn.setAttribute('data-poi-id', poi.id);
            const link = poi.fixedCamIds[0] ? fixedCamLabel(poi.fixedCamIds[0]) : tr('tactical.poiFixedNone', 'None');
            btn.innerHTML = '<span class="ax-tactical-poi-row-name">' + esc(poi.name) + '</span>'
                + '<span class="ax-tactical-poi-row-meta">' + esc(link) + ' · '
                + esc(tr('tactical.poiRowHint', 'drag pin to move'))
                + '</span>';
            btn.addEventListener('click', function () {
                selectPoi(poi.id);
            });
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn btn-ghost btn-sm ax-tactical-poi-row-del';
            remove.setAttribute('data-poi-del', poi.id);
            remove.textContent = tr('tactical.poiDeleteShort', 'Delete');
            remove.title = tr('tactical.poiDelete', 'Delete POI');
            remove.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                selectPoi(poi.id, { skipPan: true, skipPopup: true });
                deleteActive();
            });
            li.appendChild(btn);
            li.appendChild(remove);
            list.appendChild(li);
        });
        syncSelectedHint();
    }

    function fillFixedSelect() {
        const sel = document.getElementById('ax-tactical-poi-fixed');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '';
        const none = document.createElement('option');
        none.value = '';
        none.textContent = tr('tactical.poiFixedNone', 'None');
        sel.appendChild(none);
        fixedCams.forEach(function (cam) {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.textContent = (cam.name || cam.id) + (cam.playable === false ? ' (off)' : '');
            sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
    }

    function syncEditor() {
        const poi = getActive();
        const nameEl = document.getElementById('ax-tactical-poi-name');
        const fixedEl = document.getElementById('ax-tactical-poi-fixed');
        const openBtn = document.getElementById('ax-tactical-poi-open');
        const delBtn = document.getElementById('ax-tactical-poi-delete');
        const has = !!poi;
        if (nameEl) {
            nameEl.disabled = !has;
            nameEl.value = has ? poi.name : '';
        }
        if (fixedEl) {
            fixedEl.disabled = !has;
            fixedEl.value = has && poi.fixedCamIds[0] ? poi.fixedCamIds[0] : '';
        }
        if (openBtn) {
            openBtn.disabled = !has || !(
                (poi.fixedCamIds && poi.fixedCamIds[0])
                || (poi.bwcCamIds && poi.bwcCamIds.length)
            );
        }
        if (delBtn) delBtn.disabled = !has;
        renderList();
        syncSelectedHint();
    }

    function selectPoi(id, opts) {
        opts = opts || {};
        activeId = id || '';
        const poi = getActive();
        syncEditor();
        if (poi && poi._marker && !opts.skipPan && map) {
            try {
                map.panTo([poi.lat, poi.lng]);
                if (!opts.skipPopup) openMarkerPopup(poi._marker);
            } catch (_) { /* ignore */ }
        }
        if (poi) {
            setStatus(
                'tactical.poiSelectedHint',
                'Selected: {name} · drag pin to move · Delete to remove',
                { name: poi.name || 'POI', link: (poi.fixedCamIds && poi.fixedCamIds[0]) ? fixedCamLabel(poi.fixedCamIds[0]) : '—' },
            );
        }
    }

    function setPlaceMode(on, opts) {
        opts = opts || {};
        const next = !!on;
        if (next && !opts.fromShell && global.TacticalShell && typeof TacticalShell.enterPlaceMode === 'function') {
            try { TacticalShell.enterPlaceMode(); } catch (_) { /* ignore */ }
        }
        placeMode = next;
        const btn = document.getElementById('ax-tactical-poi-place');
        if (btn) btn.classList.toggle('active', placeMode);
        if (map && map.getContainer) {
            try { map.getContainer().style.cursor = placeMode ? 'crosshair' : ''; } catch (_) { /* ignore */ }
        }
        if (placeMode) {
            setStatus('tactical.bannerPlace', 'PREPARE — click map to place pin');
        } else if (!opts.fromShell && global.TacticalShell && typeof TacticalShell.leavePlaceMode === 'function') {
            try { TacticalShell.leavePlaceMode(); } catch (_) { /* ignore */ }
        }
    }

    function addPoiAt(latlng) {
        const n = pois.length + 1;
        const poi = {
            id: makeId(),
            name: tr('tactical.poiDefaultName', 'POI {n}', { n: n }),
            lat: latlng.lat,
            lng: latlng.lng,
            notes: '',
            fixedCamIds: [],
            bwcCamIds: [],
        };
        pois.push(poi);
        saveStore();
        remountMarkers();
        setPlaceMode(false);
        selectPoi(poi.id);
        setStatus('tactical.poiStatusPlaced', 'POI placed');
    }

    function deleteActive() {
        const poi = getActive();
        if (!poi) {
            setStatus('tactical.poiStatusNeedPoi', 'Select a POI');
            return;
        }
        const label = poi.name || 'POI';
        const ok = global.confirm
            ? global.confirm(tr('tactical.poiDeleteConfirm', 'Remove {name} from the map?', { name: label }))
            : true;
        if (!ok) return;
        stopLive();
        pois = pois.filter(function (p) { return p.id !== poi.id; });
        activeId = '';
        saveStore();
        remountMarkers();
        syncEditor();
        setStatus('tactical.poiStatusDeleted', 'POI deleted');
    }

    function applyEditorToActive() {
        const poi = getActive();
        if (!poi) return;
        const nameEl = document.getElementById('ax-tactical-poi-name');
        const fixedEl = document.getElementById('ax-tactical-poi-fixed');
        if (nameEl) {
            const name = String(nameEl.value || '').trim();
            if (name) poi.name = name;
        }
        if (fixedEl) {
            const fid = String(fixedEl.value || '').trim();
            poi.fixedCamIds = fid ? [fid] : [];
        }
        saveStore();
        remountMarkers();
        syncEditor();
    }

    function openOnWall(fixedId, slotIndex) {
        const sourceId = 'fixed:' + fixedId;
        const slots = document.querySelectorAll('#video-wall .video-slot');
        if (!slots.length || !global.VideoWall || !VideoWall.playSlot) {
            return false;
        }
        /* Fixed cams use bank slots >= 8 (PIN_SLOT_COUNT). */
        let slotEl = null;
        if (typeof slotIndex === 'number' && slotIndex >= 0 && slots[slotIndex]) {
            slotEl = slots[slotIndex];
        } else {
            slotEl = slots[8] || slots[9] || slots[slots.length - 1];
        }
        if (!slotEl) return false;
        slotEl.dataset.camId = sourceId;
        slotEl.setAttribute('data-cam-id', sourceId);
        try {
            VideoWall.playSlot(slotEl);
            return true;
        } catch (_) {
            return false;
        }
    }

    function toastMsg(msg, ms) {
        if (!msg) return;
        const dur = typeof ms === 'number' ? ms : 6500;
        if (global.AdminActionBus && typeof AdminActionBus.toast === 'function') {
            try { AdminActionBus.toast(msg, dur); } catch (_) { /* ignore */ }
        }
        setStatusRaw(msg);
    }

    function setStatusRaw(text) {
        const status = document.getElementById('ax-tactical-status');
        if (status) status.textContent = text;
    }

    function pointInCircle(lat, lng, center, radiusM) {
        if (!map || !global.L || !center || !(radiusM > 0)) return false;
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
        try {
            return map.distance(global.L.latLng(lat, lng), center) <= radiusM;
        } catch (_) {
            return false;
        }
    }

    function fixedCamLatLng(cam) {
        if (!cam) return null;
        const lat = cam.lat != null ? Number(cam.lat) : (cam.latitude != null ? Number(cam.latitude) : NaN);
        const lng = cam.lng != null ? Number(cam.lng) : (cam.longitude != null ? Number(cam.longitude) : NaN);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat: lat, lng: lng };
    }

    function bwcGpsLatLng(camId) {
        /* Match ops dashboard-boot markerGpsLatLng: prefer _gpsLatLng (true GPS). */
        const markers = global.deviceMarkers;
        if (markers && camId) {
            const m = markers[camId];
            if (m) {
                const gps = m._gpsLatLng;
                if (gps && gps.lat != null && gps.lng != null) {
                    const lat = Number(gps.lat);
                    const lng = Number(gps.lng);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat: lat, lng: lng };
                }
                if (typeof m.getLatLng === 'function') {
                    try {
                        const ll = m.getLatLng();
                        if (ll && ll.lat != null && ll.lng != null) {
                            const lat = Number(ll.lat);
                            const lng = Number(ll.lng);
                            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat: lat, lng: lng };
                        }
                    } catch (_) { /* ignore */ }
                }
            }
        }
        const devices = global.devices || global.fleetDevices;
        const d = devices && devices[camId];
        if (d) {
            const lat = d.lat != null ? Number(d.lat) : (d.latitude != null ? Number(d.latitude) : NaN);
            const lng = d.lng != null ? Number(d.lng) : (d.longitude != null ? Number(d.longitude) : NaN);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat: lat, lng: lng };
        }
        return null;
    }

    function isBwcOnline(camId) {
        if (global.FleetUi && typeof FleetUi.isDeviceOnline === 'function') {
            try { return !!FleetUi.isDeviceOnline(camId); } catch (_) { /* ignore */ }
        }
        const devices = global.devices || global.fleetDevices;
        if (devices && devices[camId]) {
            return !!(devices[camId].online || devices[camId].isOnline);
        }
        return true;
    }

    function bwcLabel(camId) {
        const id = String(camId || '').trim();
        if (!id) return '';
        /* Same source Ops / Fleet use — nickname / unit / roster (not raw wire id). */
        try {
            if (global.FleetDisplay && typeof FleetDisplay.friendlyDeviceName === 'function') {
                const friendly = String(FleetDisplay.friendlyDeviceName(id) || '').trim();
                if (friendly && friendly !== id) return friendly;
            }
        } catch (_) { /* ignore */ }
        try {
            if (global.FleetUi && typeof FleetUi.getDeviceName === 'function') {
                const fleet = String(FleetUi.getDeviceName(id) || '').trim();
                if (fleet && fleet !== id) return fleet;
            }
        } catch (_) { /* ignore */ }
        const devices = global.devices || global.fleetDevices;
        if (devices && devices[id]) {
            const d = devices[id];
            const n = String(d.name || d.label || d.displayName || d.operatorName || '').trim();
            if (n && n !== id) return n;
        }
        /* Last resort: short label — never paste full GB device id as the title */
        if (id.length > 8) return 'BWC …' + id.slice(-4);
        return id;
    }

    function clearGrabEphemeral() {
        if (grabCycle && grabCycle.targets) {
            grabCycle.targets.forEach(function (t) {
                if (t && t.host && t.host._ephemeral && t.host.id) stopLiveForPoi(t.host.id);
                if (t && t.host && t.host._marker) {
                    resetPopupOffset(t.host._marker);
                    try { t.host._marker.closePopup(); } catch (_) { /* ignore */ }
                }
                if (t && t.host && t.host._ephemeral && t.host._marker) {
                    removeFromCluster(t.host._marker);
                    t.host._marker = null;
                }
            });
        }
        grabCycle = null;
        syncGrabCycleUi();
    }

    function resetPopupOffset(marker) {
        if (!marker || !global.L) return;
        marker._tacticalPopupOffset = null;
        try {
            const popup = marker.getPopup && marker.getPopup();
            if (popup && popup.options) {
                popup.options.offset = global.L.point(0, 6);
                if (popup.isOpen && popup.isOpen()) {
                    repositionPopupOnly(popup);
                }
            }
        } catch (_) { /* ignore */ }
    }

    function setPopupOffset(marker, xy) {
        if (!marker || !global.L || !xy) return;
        const x = Number(xy[0]) || 0;
        const y = Number(xy[1]) || 0;
        marker._tacticalPopupOffset = [x, y];
        try {
            const popup = marker.getPopup && marker.getPopup();
            if (popup && popup.options) {
                popup.options.offset = global.L.point(x, y);
                if (popup.isOpen && popup.isOpen()) {
                    repositionPopupOnly(popup);
                }
            }
        } catch (_) { /* ignore */ }
    }

    /**
     * Assign L/R/T/B(+diag) popup offsets for GPS-near clusters in the slice.
     * Returns { offsets: Map-like by host.id, clustered: bool }
     */
    function assignSpiderOffsets(targets) {
        const result = Object.create(null);
        let clustered = false;
        if (!targets || !targets.length || !map || !global.L) return { offsets: result, clustered: false };

        const used = [];
        targets.forEach(function (t) {
            if (!t || !t.host) return;
            const lat = t.host.lat;
            const lng = t.host.lng;
            if (lat == null || lng == null) return;
            let clusterIdx = -1;
            for (let i = 0; i < used.length; i++) {
                const c = used[i];
                try {
                    if (map.distance(global.L.latLng(lat, lng), global.L.latLng(c.lat, c.lng)) <= SPIDER_CLUSTER_M) {
                        clusterIdx = i;
                        break;
                    }
                } catch (_) { /* ignore */ }
            }
            if (clusterIdx < 0) {
                used.push({ lat: lat, lng: lng, members: [t] });
            } else {
                used[clusterIdx].members.push(t);
            }
        });

        used.forEach(function (cluster) {
            const members = cluster.members || [];
            if (members.length <= 1) {
                if (members[0] && members[0].host) {
                    result[members[0].host.id] = [0, 6];
                }
                return;
            }
            clustered = true;
            members.forEach(function (t, i) {
                if (!t || !t.host) return;
                result[t.host.id] = SPIDER_OFFSETS[i % SPIDER_OFFSETS.length];
            });
        });
        return { offsets: result, clustered: clustered };
    }

    function makeEphemeralHost(opts) {
        opts = opts || {};
        const group = ensureCluster();
        if (!group) return null;
        const camForColor = (opts.bwcCamIds && opts.bwcCamIds[0])
            || (opts.fixedCamIds && opts.fixedCamIds[0])
            || '';
        const color = opts.streamKind === 'bwc'
            ? teamColorForCam(camForColor)
            : POI_NEUTRAL_COLOR;
        const host = {
            id: String(opts.id),
            name: String(opts.name || opts.id),
            lat: opts.lat,
            lng: opts.lng,
            notes: '',
            fixedCamIds: opts.fixedCamIds || [],
            bwcCamIds: opts.bwcCamIds || [],
            _ephemeral: true,
        };
        const marker = global.L.marker([host.lat, host.lng], {
            icon: pinIcon({
                color: color,
                kind: opts.streamKind === 'bwc' ? 'bwc' : 'poi',
                label: host.name,
            }),
            draggable: false,
            title: host.name,
        });
        marker._tacticalPoiId = host.id;
        setMarkerTrueGps(marker, host.lat, host.lng);
        bindPopup(marker, host);
        group.addLayer(marker);
        host._marker = marker;
        return host;
    }

    function resolvePoiStream(poi) {
        if (!poi) return null;
        const fixedId = poi.fixedCamIds && poi.fixedCamIds[0];
        if (fixedId) return { camId: String(fixedId), streamKind: 'fixed' };
        const bwcId = poi.bwcCamIds && poi.bwcCamIds[0];
        if (bwcId) return { camId: String(bwcId), streamKind: 'bwc' };
        return null;
    }

    /** Build full grab set: POI streams + online BWC GPS + orphan fixed GPS. No wall. */
    function buildGrabTargets(center, radiusM) {
        const targets = [];
        const seenCam = Object.create(null);

        function pushTarget(t) {
            if (!t || !t.host || !t.camId) return;
            const cam = String(t.camId);
            if (seenCam[cam]) return;
            seenCam[cam] = true;
            targets.push(t);
        }

        pois.forEach(function (poi) {
            if (!pointInCircle(poi.lat, poi.lng, center, radiusM)) return;
            const stream = resolvePoiStream(poi);
            if (!stream) return;
            if (stream.streamKind === 'bwc' && !isBwcOnline(stream.camId)) return;
            pushTarget({
                host: poi,
                camId: stream.camId,
                streamKind: stream.streamKind,
                label: poi.name,
            });
        });

        if (global.deviceMarkers || global.devices || global.fleetDevices) {
            const camIds = Object.create(null);
            if (global.deviceMarkers) {
                Object.keys(global.deviceMarkers).forEach(function (id) { camIds[id] = true; });
            }
            const devices = global.devices || global.fleetDevices;
            if (devices) {
                Object.keys(devices).forEach(function (id) { camIds[id] = true; });
            }
            Object.keys(camIds).forEach(function (camId) {
                if (String(camId).indexOf('fixed:') === 0) return;
                if (!isBwcOnline(camId)) return;
                const ll = bwcGpsLatLng(camId);
                if (!ll) return;
                if (!pointInCircle(ll.lat, ll.lng, center, radiusM)) return;
                if (seenCam[camId]) return;
                let host = liveBwcByCam[camId];
                if (host && host._marker) {
                    host.lat = ll.lat;
                    host.lng = ll.lng;
                    try { host._marker.setLatLng([ll.lat, ll.lng]); } catch (_) { /* ignore */ }
                    pushTarget({
                        host: host,
                        camId: camId,
                        streamKind: 'bwc',
                        label: host.name || bwcLabel(camId),
                    });
                    return;
                }
                host = makeEphemeralHost({
                    id: 'grab-bwc-' + camId,
                    name: bwcLabel(camId),
                    lat: ll.lat,
                    lng: ll.lng,
                    bwcCamIds: [camId],
                    streamKind: 'bwc',
                });
                if (!host) return;
                pushTarget({
                    host: host,
                    camId: camId,
                    streamKind: 'bwc',
                    label: host.name,
                    ephemeral: true,
                });
            });
        }

        fixedCams.forEach(function (cam) {
            const id = String((cam && (cam.id || cam.cameraId)) || '').trim();
            if (!id || seenCam[id]) return;
            const ll = fixedCamLatLng(cam);
            if (!ll) return;
            if (!pointInCircle(ll.lat, ll.lng, center, radiusM)) return;
            const host = makeEphemeralHost({
                id: 'grab-fixed-' + id,
                name: (cam && cam.name) || id,
                lat: ll.lat,
                lng: ll.lng,
                fixedCamIds: [id],
                streamKind: 'fixed',
            });
            if (!host) return;
            pushTarget({
                host: host,
                camId: id,
                streamKind: 'fixed',
                label: host.name,
                ephemeral: true,
            });
        });

        return targets;
    }

    function syncGrabCycleUi() {
        const wrap = document.getElementById('ax-tactical-grab-cycle');
        const label = document.getElementById('ax-tactical-grab-cycle-label');
        const prev = document.getElementById('ax-tactical-grab-prev');
        const next = document.getElementById('ax-tactical-grab-next');
        if (!wrap) return;
        if (!grabCycle || !grabCycle.targets || !grabCycle.targets.length) {
            wrap.hidden = true;
            if (label) label.textContent = '';
            return;
        }
        wrap.hidden = false;
        const total = grabCycle.targets.length;
        const pages = Math.max(1, Math.ceil(total / CIRCLE_OPEN_CAP));
        const page = ((grabCycle.page % pages) + pages) % pages;
        grabCycle.page = page;
        const start = page * CIRCLE_OPEN_CAP;
        const end = Math.min(total, start + CIRCLE_OPEN_CAP);
        if (label) {
            label.textContent = tr(
                'tactical.grabCycleLabel',
                '{from}–{to} of {total} on pins',
                { from: start + 1, to: end, total: total }
            );
        }
        const multi = pages > 1;
        if (prev) prev.disabled = !multi;
        if (next) next.disabled = !multi;
    }

    function openMarkerPopup(marker, afterOpen) {
        if (!marker) return false;
        function done() {
            try { marker.openPopup(); } catch (_) { /* ignore */ }
            if (typeof afterOpen === 'function') afterOpen();
        }
        if (clusterIsReal && clusterGroup && typeof clusterGroup.zoomToShowLayer === 'function') {
            try {
                clusterGroup.zoomToShowLayer(marker, done);
                return true;
            } catch (_) { /* fall through */ }
        }
        done();
        return true;
    }

    /** Stage node inside this marker's open popup (not document-global). */
    function resolvePoiStageEl(poiId, marker) {
        const id = String(poiId || '');
        if (!id) return null;
        try {
            const root = popupElSafe(marker);
            if (root) {
                const local = root.querySelector('[data-poi-stage="' + id + '"]');
                if (local) return local;
            }
        } catch (_) { /* fall through */ }
        return document.querySelector('[data-poi-stage="' + id + '"]');
    }

    function resolvePoiStatusEl(poiId, marker) {
        const id = String(poiId || '');
        if (!id) return null;
        try {
            const root = popupElSafe(marker);
            if (root) {
                const local = root.querySelector('[data-poi-live-status="' + id + '"]');
                if (local) return local;
            }
        } catch (_) { /* fall through */ }
        return document.querySelector('[data-poi-live-status="' + id + '"]');
    }

    /**
     * Wait until Leaflet has mounted [data-poi-stage] for this marker.
     * Bulk open must not call startPopupLive until this fires.
     */
    function whenPoiStageReady(marker, poiId, onReady, onFail) {
        const id = String(poiId || '');
        const deadline = Date.now() + 2500;
        function tick() {
            try {
                const popup = marker && marker.getPopup && marker.getPopup();
                const open = popup && popup.isOpen && popup.isOpen();
                const stage = open ? resolvePoiStageEl(id, marker) : null;
                if (stage) {
                    if (typeof onReady === 'function') onReady(stage);
                    return;
                }
            } catch (_) { /* retry */ }
            if (Date.now() >= deadline) {
                if (typeof onFail === 'function') onFail();
                return;
            }
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(tick);
            } else {
                setTimeout(tick, 16);
            }
        }
        tick();
    }

    function openTargetPinLive(target, offsetXy, onArmed) {
        if (!target || !target.host || !target.host._marker || !target.camId) {
            if (typeof onArmed === 'function') onArmed(false);
            return false;
        }
        if (offsetXy) setPopupOffset(target.host._marker, offsetXy);
        else resetPopupOffset(target.host._marker);
        const host = target.host;
        const camId = target.camId;
        const streamKind = target.streamKind || 'fixed';
        openMarkerPopup(host._marker, function () {
            whenPoiStageReady(host._marker, host.id, function () {
                startPopupLive(host, camId, { streamKind: streamKind, marker: host._marker });
                if (typeof onArmed === 'function') onArmed(true);
            }, function () {
                const statusEl = resolvePoiStatusEl(host.id, host._marker);
                if (statusEl) {
                    statusEl.textContent = tr('tactical.poiStatusFail', 'Video unavailable');
                }
                if (typeof onArmed === 'function') onArmed(false);
            });
        });
        return true;
    }

    /**
     * TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1 — pin video in zone; GPS-near fans L/R/T/B.
     * CLIENT-BULK-RENDER-SERIALIZATION-V1 — serial openNext so popup DOM settles per pin.
     * No edge tile bank.
     */
    function applyGrabWindow(opts) {
        opts = opts || {};
        if (!grabCycle || !grabCycle.targets || !grabCycle.targets.length) return 0;
        const total = grabCycle.targets.length;
        const pages = Math.max(1, Math.ceil(total / CIRCLE_OPEN_CAP));
        let page = grabCycle.page || 0;
        page = ((page % pages) + pages) % pages;
        grabCycle.page = page;
        const start = page * CIRCLE_OPEN_CAP;
        const slice = grabCycle.targets.slice(start, start + CIRCLE_OPEN_CAP);

        writeOpenSession([]); /* replaced by rememberOpenPin as each pin arms */
        restoreInFlight = false;
        stopAllLive();
        grabCycle.targets.forEach(function (t) {
            if (t && t.host && t.host._marker) {
                resetPopupOffset(t.host._marker);
                try { t.host._marker.closePopup(); } catch (_) { /* ignore */ }
            }
        });

        const spider = assignSpiderOffsets(slice);
        spreadColocatedMarkers();
        let opened = 0;
        const queue = slice.map(function (t) {
            return {
                target: t,
                off: (t.host && spider.offsets[t.host.id]) ? spider.offsets[t.host.id] : [0, 6],
            };
        });

        function finishGrabWindow() {
            syncGrabCycleUi();
            if (opts.silentToast) return;
            /* Success toasts removed (CLIENT-TACTICAL-FLEETDISPLAY-NAME-V1) — spiderfy is visible */
            if (!opened) {
                toastMsg(tr('tactical.circleNoneOnline', 'No online cams in circle'), 7000);
            }
        }

        function openNext() {
            if (!queue.length) {
                finishGrabWindow();
                return;
            }
            const item = queue.shift();
            openTargetPinLive(item.target, item.off, function (ok) {
                if (ok) opened += 1;
                setTimeout(openNext, ok ? 120 : 0);
            });
        }
        openNext();
        syncGrabCycleUi();
        return slice.length;
    }

    function grabCycleStep(delta) {
        if (!grabCycle || !grabCycle.targets || grabCycle.targets.length <= CIRCLE_OPEN_CAP) return;
        const pages = Math.ceil(grabCycle.targets.length / CIRCLE_OPEN_CAP);
        grabCycle.page = (grabCycle.page + delta + pages) % pages;
        applyGrabWindow({ silentToast: true });
        toastMsg(tr(
            'tactical.grabCycleMoved',
            'Pin page {page} of {pages}',
            { page: grabCycle.page + 1, pages: pages }
        ), 3500);
    }

    /**
     * Open grabbed → pin videos in the zone (spiderfy if GPS stacks). No wall / no edge bank.
     */
    function openInCircle() {
        const grab = global.TacticalShell && TacticalShell.getGrabCircle
            ? TacticalShell.getGrabCircle()
            : null;
        if (!grab) {
            toastMsg(tr('tactical.circleNeedCircle', 'Draw a select zone first (OPERATE → Select zone)'), 7000);
            return;
        }

        stopAllLive();
        clearGrabEphemeral();

        const targets = buildGrabTargets(grab.center, grab.radiusM);
        if (!targets.length) {
            toastMsg(tr(
                'tactical.circleNoneIn',
                'Nothing in this circle — place POIs or check cam GPS'
            ), 7500);
            syncGrabCycleUi();
            return;
        }

        grabCycle = { targets: targets, page: 0 };
        applyGrabWindow();
    }

    /** Open pin popup + FLV (fixed or BWC). Returns true if armed. */
    function openPoiPinLive(poi) {
        const stream = resolvePoiStream(poi);
        if (!poi || !poi._marker || !stream) return false;
        return openTargetPinLive({
            host: poi,
            camId: stream.camId,
            streamKind: stream.streamKind,
        });
    }

    function openLinked() {
        applyEditorToActive();
        const poi = getActive();
        if (!poi) {
            setStatus('tactical.poiStatusNeedPoi', 'Select a POI');
            return;
        }
        const stream = resolvePoiStream(poi);
        if (!stream) {
            setStatus('tactical.poiStatusNoLink', 'Link a fixed cam first');
            return;
        }
        setStatus('tactical.poiStatusOpening', 'Opening linked cam…');
        /* Pin is primary; wall optional only for single Open linked (not grab) */
        if (stream.streamKind === 'fixed' && openOnWall(stream.camId)) {
            setStatus('tactical.poiStatusWall', 'Opened on video wall (panel 9+)');
        }
        openPoiPinLive(poi);
    }

    function attachFlvToStage(poiId, cameraId, flvUrl, streamKind, marker, displayName) {
        const stageNow = resolvePoiStageEl(poiId, marker);
        const statusNow = resolvePoiStatusEl(poiId, marker);
        if (!stageNow) return;
        if (!global.Me8LivePlayerFactory || typeof Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            if (statusNow) statusNow.textContent = tr('tactical.poiStatusNoPlayer', 'FLV player unavailable');
            return;
        }
        const player = Me8LivePlayerFactory.attachFlvPrimary(stageNow, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            onProven: function () {
                if (statusNow) statusNow.textContent = tr('tactical.poiStatusLive', 'Live');
            },
            onFail: function () {
                if (statusNow) statusNow.textContent = tr('tactical.poiStatusFail', 'Video unavailable');
            },
        });
        if (!player) {
            if (statusNow) statusNow.textContent = tr('tactical.poiStatusFail', 'Video unavailable');
            return;
        }
        liveByPoi[poiId] = {
            player: player,
            camId: cameraId,
            streamKind: streamKind || 'fixed',
            name: String(displayName || '').trim(),
        };
    }

    function startPopupLive(poi, cameraId, opts) {
        opts = opts || {};
        if (!poi || !poi.id || !cameraId) return;
        const streamKind = opts.streamKind || 'fixed';
        const marker = opts.marker || poi._marker || null;
        stopLiveForPoi(poi.id);
        const stage = resolvePoiStageEl(poi.id, marker);
        const statusEl = resolvePoiStatusEl(poi.id, marker);
        if (!stage) {
            if (statusEl) statusEl.textContent = tr('tactical.poiStatusFail', 'Video unavailable');
            return;
        }
        rememberOpenPin(poi.id, cameraId, streamKind, poi.name);
        if (statusEl) statusEl.textContent = tr('tactical.poiStatusConnecting', 'Connecting…');
        const poiId = poi.id;
        const displayName = resolveOpenPinDisplayName(cameraId, streamKind, poi.name);
        if (displayName) poi.name = displayName;

        if (streamKind === 'bwc') {
            if (!global.Me8LivePlayerFactory || typeof Me8LivePlayerFactory.fetchDescriptorPreferZlm !== 'function') {
                if (statusEl) statusEl.textContent = tr('tactical.poiStatusNoPlayer', 'FLV player unavailable');
                return;
            }
            /* Register first so server can wake WVP when countForCam was 0,
             * then poll FLV descriptor — avoids attach-before-ensurePlay timeout. */
            registerTacticalViewerOnly(cameraId);
            Me8LivePlayerFactory.fetchDescriptorPreferZlm(cameraId, { tries: 8, gapMs: 700 })
                .then(function (desc) {
                    if (!desc || !desc.ok || !desc.flvUrl) {
                        throw new Error((desc && desc.error) || tr('tactical.poiStatusFail', 'Video unavailable'));
                    }
                    attachFlvToStage(poiId, cameraId, desc.flvUrl, 'bwc', marker, displayName || poi.name);
                })
                .catch(function (err) {
                    const statusNow = resolvePoiStatusEl(poiId, marker);
                    if (statusNow) statusNow.textContent = (err && err.message) || tr('tactical.poiStatusFail', 'Video unavailable');
                    setStatus('tactical.poiStatusFail', 'Video unavailable');
                });
            return;
        }

        fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER }),
        }).then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok || !data.ok) throw new Error((data && data.error) || ('HTTP ' + response.status));
                if (!data.flvUrl) throw new Error(tr('tactical.poiStatusFail', 'Video unavailable'));
                attachFlvToStage(poiId, cameraId, data.flvUrl, 'fixed', marker, displayName || poi.name);
            });
        }).catch(function (err) {
            const statusNow = resolvePoiStatusEl(poiId, marker);
            if (statusNow) statusNow.textContent = (err && err.message) || tr('tactical.poiStatusFail', 'Video unavailable');
            setStatus('tactical.poiStatusFail', 'Video unavailable');
        });
    }

    function loadFixedCams() {
        return fetch('/api/fixed-cams/public', { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('fixed cams');
                return r.json();
            })
            .then(function (payload) {
                fixedCams = Array.isArray(payload && payload.cams) ? payload.cams : [];
                fillFixedSelect();
                syncEditor();
            })
            .catch(function () {
                fixedCams = [];
                fillFixedSelect();
            });
    }

    function bindMapClick() {
        if (!map || mapClickBound) return;
        mapClickBound = true;
        map.on('click', function (ev) {
            if (!placeMode) return;
            addPoiAt(ev.latlng);
        });
    }

    function bindUi() {
        if (uiBound) return;
        uiBound = true;
        const place = document.getElementById('ax-tactical-poi-place');
        const del = document.getElementById('ax-tactical-poi-delete');
        const open = document.getElementById('ax-tactical-poi-open');
        const nameEl = document.getElementById('ax-tactical-poi-name');
        const fixedEl = document.getElementById('ax-tactical-poi-fixed');
        if (place) {
            place.addEventListener('click', function () {
                setPlaceMode(!placeMode);
            });
        }
        if (del) del.addEventListener('click', deleteActive);
        if (open) open.addEventListener('click', openLinked);
        if (nameEl) {
            nameEl.addEventListener('change', applyEditorToActive);
            nameEl.addEventListener('blur', applyEditorToActive);
        }
        if (fixedEl) {
            fixedEl.addEventListener('change', function () {
                applyEditorToActive();
            });
        }
        const grabPrev = document.getElementById('ax-tactical-grab-prev');
        const grabNext = document.getElementById('ax-tactical-grab-next');
        if (grabPrev) grabPrev.addEventListener('click', function () { grabCycleStep(-1); });
        if (grabNext) grabNext.addEventListener('click', function () { grabCycleStep(1); });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && placeMode) {
                setPlaceMode(false);
            }
        });
    }

    function init() {
        /* boots on Tactical show */
    }

    global.TacticalPoi = {
        init: init,
        onShow: onShow,
        attach: attach,
        openInCircle: openInCircle,
        setPlaceMode: setPlaceMode,
        getPois: function () { return pois.map(function (p) {
            return {
                id: p.id,
                name: p.name,
                lat: p.lat,
                lng: p.lng,
                notes: p.notes,
                fixedCamIds: (p.fixedCamIds || []).slice(),
                bwcCamIds: (p.bwcCamIds || []).slice(),
            };
        }); },
    };
}(window));
