/**
 * Evidence hub \u2014 Route trace: GPS breadcrumb map + evidence video scrubber (Axon-style).
 */
(function (global) {
    var map = null;
    var routeLayer = null;
    var pointLayer = null;
    var highlightLayer = null;
    var tileLayer = null;
    var routeLine = null;
    var playheadMarker = null;
    var proximityLayer = null;
    var points = [];
    var evidenceFiles = [];
    var lastRouteFile = null;
    var canTrimClip = false;
    var activeVideo = null;
    var scrubbing = false;
    var selectedPointIdx = -1;
    var proximityUnits = [];
    var lastTelemetry = null;
    var pendingSeekIso = null;
    var pendingVideoSeekIdx = -1;
    var activeCaseFileId = '';
    var deviceLoadSeq = 0;

    function tr(key, fallback) {
        if (global.I18n && I18n.t) {
            var t = I18n.t(key);
            if (t && t !== key) return t;
        }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function fmtLocal(iso) {
        if (!iso) return '\u2014';
        try { return new Date(iso).toLocaleString(); } catch (_) { return iso; }
    }

    function pointMs(p) {
        var t = p && Date.parse(p.recordedAt);
        return Number.isFinite(t) ? t : 0;
    }

    function haversineM(aLat, aLon, bLat, bLon) {
        var r = 6371000;
        var p1 = aLat * Math.PI / 180;
        var p2 = bLat * Math.PI / 180;
        var dp = (bLat - aLat) * Math.PI / 180;
        var dl = (bLon - aLon) * Math.PI / 180;
        var s = Math.sin(dp / 2) * Math.sin(dp / 2)
            + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * r * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    function fmtDistance(m) {
        if (!Number.isFinite(m) || m <= 0) return '\u2014';
        if (m < 1000) return Math.round(m) + ' m';
        return (m / 1000).toFixed(2) + ' km';
    }

    function fmtSpeedKmh(mps) {
        if (!Number.isFinite(mps) || mps < 0) return '\u2014';
        return (mps * 3.6).toFixed(1) + ' km/h';
    }

    function trackStartMs() {
        return points.length ? pointMs(points[0]) : 0;
    }

    function nearestIdxForMs(targetMs) {
        if (!points.length) return 0;
        var best = 0;
        var bestAbs = Infinity;
        for (var i = 0; i < points.length; i++) {
            var d = Math.abs(pointMs(points[i]) - targetMs);
            if (d < bestAbs) {
                bestAbs = d;
                best = i;
            }
        }
        return best;
    }

    function nearestIdxForLatLng(latlng) {
        if (!points.length || !latlng) return 0;
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < points.length; i++) {
            var d = (map && typeof map.distance === 'function')
                ? map.distance(latlng, L.latLng(points[i].lat, points[i].lon))
                : haversineM(latlng.lat, latlng.lng, points[i].lat, points[i].lon);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }

    function locAtVideoTime(tSec) {
        if (!points.length) return null;
        var target = trackStartMs() + Math.max(0, tSec) * 1000;
        if (target <= pointMs(points[0])) return [points[0].lat, points[0].lon];
        var last = points[points.length - 1];
        if (target >= pointMs(last)) return [last.lat, last.lon];
        for (var i = 0; i < points.length - 1; i++) {
            var a = pointMs(points[i]);
            var b = pointMs(points[i + 1]);
            if (target >= a && target <= b) {
                var u = (b === a) ? 0 : (target - a) / (b - a);
                return [
                    points[i].lat + (points[i + 1].lat - points[i].lat) * u,
                    points[i].lon + (points[i + 1].lon - points[i].lon) * u,
                ];
            }
        }
        return [last.lat, last.lon];
    }

    function renderTelemetry() {
        var distEl = document.getElementById('rt-tel-distance');
        var avgEl = document.getElementById('rt-tel-avg');
        var maxEl = document.getElementById('rt-tel-max');
            if (!points.length) {
            if (distEl) distEl.textContent = '\u2014';
            if (avgEl) avgEl.textContent = '\u2014';
            if (maxEl) maxEl.textContent = '\u2014';
            lastTelemetry = null;
            return;
        }
        var totalM = 0;
        var maxMps = 0;
        for (var i = 1; i < points.length; i++) {
            var dt = (pointMs(points[i]) - pointMs(points[i - 1])) / 1000;
            var dm = haversineM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
            if (!Number.isFinite(dm) || dm < 0) continue;
            totalM += dm;
            if (dt > 0.5) {
                var mps = dm / dt;
                if (mps > maxMps && mps < 70) maxMps = mps;
            }
        }
        var spanSec = (pointMs(points[points.length - 1]) - pointMs(points[0])) / 1000;
        var avgMps = spanSec > 0 ? totalM / spanSec : 0;
        if (distEl) distEl.textContent = fmtDistance(totalM);
        if (avgEl) avgEl.textContent = fmtSpeedKmh(avgMps);
        if (maxEl) maxEl.textContent = fmtSpeedKmh(maxMps);
        lastTelemetry = {
            distanceM: Math.round(totalM * 10) / 10,
            avgMps: Math.round(avgMps * 100) / 100,
            maxMps: Math.round(maxMps * 100) / 100,
            distanceText: fmtDistance(totalM),
            avgText: fmtSpeedKmh(avgMps),
            maxText: fmtSpeedKmh(maxMps),
        };
    }

    function movePlayhead(latlng) {
        if (!map || !latlng) return;
        if (!playheadMarker) {
            playheadMarker = L.circleMarker(latlng, {
                radius: 9,
                color: '#f8fafc',
                fillColor: '#2563eb',
                fillOpacity: 1,
                weight: 3,
                pane: 'markerPane',
            }).addTo(map);
            playheadMarker.bindTooltip('Playhead', { direction: 'top', opacity: 0.9 });
        } else {
            playheadMarker.setLatLng(latlng);
        }
    }

    function panelEl() {
        return document.getElementById('ev-panel-route-trace');
    }

    function ensureMap() {
        var host = document.getElementById('rt-map');
        if (!host || typeof L === 'undefined') return;
        if (map) {
            setTimeout(function () { map.invalidateSize(); }, 120);
            return;
        }
        var rtView = (typeof MobilityMapGis !== 'undefined' && MobilityMapGis.getInitialView)
            ? MobilityMapGis.getInitialView()
            : { pos: [39.9042, 116.4074], zoom: 12 };
        map = L.map(host, { zoomControl: true, attributionControl: true }).setView(rtView.pos, rtView.zoom);
        if (typeof MobilityMapTiles !== 'undefined' && MobilityMapTiles.attachLeaflet) {
            MobilityMapTiles.attachLeaflet(map, { maxNativeZoom: 19, maxZoom: 19, keepBuffer: 6 }).then(function (r) {
                tileLayer = r && r.layer ? r.layer : null;
            });
        } else {
            /* AIRGAP-MAP-OFFLINE-DEFAULT-V1 — helper missing: blank, never public internet */
            tileLayer = L.tileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', {
                maxZoom: 19,
                attribution: 'Offline map pack not installed',
            }).addTo(map);
        }
        routeLayer = L.layerGroup().addTo(map);
        pointLayer = L.layerGroup().addTo(map);
        highlightLayer = L.layerGroup().addTo(map);
        proximityLayer = L.layerGroup().addTo(map);
    }

    function clearMap() {
        if (routeLayer) routeLayer.clearLayers();
        if (pointLayer) pointLayer.clearLayers();
        if (highlightLayer) highlightLayer.clearLayers();
        if (proximityLayer) proximityLayer.clearLayers();
        if (playheadMarker && map) {
            try { map.removeLayer(playheadMarker); } catch (_) { /* ignore */ }
        }
        routeLine = null;
        playheadMarker = null;
        points = [];
        evidenceFiles = [];
        selectedPointIdx = -1;
        renderTelemetry();
    }

    function dayBounds(dateStr, timeFrom, timeTo) {
        var d = dateStr || new Date().toISOString().slice(0, 10);
        var from = d + 'T' + (timeFrom || '00:00') + ':00';
        var to = d + 'T' + (timeTo || '23:59') + ':59';
        return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
    }

    function pickPrimaryEvidence() {
        if (!evidenceFiles.length) return null;
        return evidenceFiles[evidenceFiles.length - 1];
    }

    function highlightPoint(idx) {
        if (!highlightLayer || !points[idx]) return;
        highlightLayer.clearLayers();
        selectedPointIdx = idx;
        var p = points[idx];
        L.circleMarker([p.lat, p.lon], {
            radius: 10,
            color: '#fbbf24',
            fillColor: '#f59e0b',
            fillOpacity: 0.95,
            weight: 3,
        }).addTo(highlightLayer).bindPopup(fmtLocal(p.recordedAt));
        document.querySelectorAll('.rt-point-row').forEach(function (row) {
            row.classList.toggle('active', parseInt(row.getAttribute('data-idx'), 10) === idx);
        });
        var scrub = document.getElementById('rt-scrub');
        if (scrub && points.length > 1) {
            scrub.value = String(Math.round((idx / (points.length - 1)) * 1000));
        }
    }

    function syncVideoToPointIdx(idx) {
        if (!activeVideo || !points.length || idx < 0 || !points[idx]) return;
        var dur = activeVideo.duration;
        if (!dur || !Number.isFinite(dur)) return;
        var tSec = (pointMs(points[idx]) - trackStartMs()) / 1000;
        scrubbing = true;
        activeVideo.currentTime = Math.min(dur - 0.05, Math.max(0, tSec));
        scrubbing = false;
    }

    function pointIdxForVideoTime(t, dur) {
        void dur;
        if (!points.length) return 0;
        return nearestIdxForMs(trackStartMs() + Math.max(0, t) * 1000);
    }

    function bindVideoSync() {
        var vid = document.getElementById('rt-video');
        if (!vid) return;
        activeVideo = vid;
        vid.onloadedmetadata = function () {
            var meta = document.getElementById('rt-video-meta');
            if (meta) meta.textContent = tr('routeTrace.videoReady', 'Video ready \u2014 playback syncs with route scrubber.');
            applyPendingVideoSeek();
        };
        vid.ontimeupdate = function () {
            if (scrubbing || !points.length) return;
            var loc = locAtVideoTime(vid.currentTime);
            if (loc) movePlayhead(loc);
            var idx = pointIdxForVideoTime(vid.currentTime, vid.duration);
            if (idx !== selectedPointIdx) highlightPoint(idx);
        };
    }

    function loadVideoForEvidence(file) {
        var wrap = document.getElementById('rt-video-wrap');
        var vid = document.getElementById('rt-video');
        var meta = document.getElementById('rt-video-meta');
        var empty = document.getElementById('rt-video-empty');
        var scrub = document.getElementById('rt-scrub');
        if (!wrap || !vid) return;
        lastRouteFile = file || null;
        var trimBtn = document.getElementById('rt-trim-clip');
        if (trimBtn) trimBtn.disabled = !file;
        if (!file) {
            wrap.hidden = true;
            vid.removeAttribute('src');
            activeVideo = null;
            if (empty) empty.hidden = false;
            if (meta) {
                meta.hidden = true;
                meta.textContent = tr('routeTrace.noVideo', 'No catalog video for this window.');
            }
            if (scrub) scrub.hidden = true;
            return;
        }
        wrap.hidden = false;
        if (empty) empty.hidden = true;
        if (scrub) scrub.hidden = false;
        if (meta) meta.hidden = false;
        vid.src = '/api/evidence/preview/' + encodeURIComponent(file.id);
        if (meta) {
            meta.textContent = esc(file.fileName) + ' \u00B7 ' + fmtLocal(file.uploadedAt);
        }
        bindVideoSync();
    }

    async function openEvidenceDetail(fileId) {
        if (!fileId || !global.EvidenceHub || !EvidenceHub.openDetail) return;
        EvidenceHub.openDetail(fileId);
    }

    async function onPointClick(idx, p) {
        highlightPoint(idx);
        syncVideoToPointIdx(idx);
        var msg = document.getElementById('rt-point-msg');
        try {
            var res = await fetch('/api/gps-track/evidence-at?deviceId='
                + encodeURIComponent(p.deviceId)
                + '&at=' + encodeURIComponent(p.recordedAt), { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Lookup failed');
            if (data.match) {
                if (msg) {
                    msg.innerHTML = tr('routeTrace.evidenceMatch', 'Evidence:')
                        + ' <button type="button" class="btn btn-ghost btn-sm rt-open-ev" data-file-id="'
                        + esc(data.match.id) + '">' + esc(data.match.fileName) + '</button>';
                }
                loadVideoForEvidence(data.match);
            } else if (msg) {
                msg.textContent = tr('routeTrace.noEvidenceAtPoint', 'No catalog file near this point.');
            }
        } catch (err) {
            if (msg) msg.textContent = err.message;
        }
    }

    function drawRoute(data) {
        clearMap();
        ensureMap();
        points = data.points || [];
        evidenceFiles = data.evidence || [];
        if (!points.length) {
            var empty = document.getElementById('rt-empty');
            if (empty) empty.hidden = false;
            loadVideoForEvidence(null);
            return;
        }
        var emptyEl = document.getElementById('rt-empty');
        if (emptyEl) emptyEl.hidden = true;
        var latlngs = points.map(function (p) { return [p.lat, p.lon]; });
        routeLine = L.polyline(latlngs, {
            color: '#38bdf8',
            weight: 6,
            opacity: 0.9,
            interactive: true,
        }).addTo(routeLayer);
        routeLine.on('click', function (e) {
            if (!e || !e.latlng) return;
            L.DomEvent.stopPropagation(e);
            var idx = nearestIdxForLatLng(e.latlng);
            onPointClick(idx, points[idx]);
        });
        points.forEach(function (p, idx) {
            var m = L.circleMarker([p.lat, p.lon], {
                radius: 5,
                color: '#0ea5e9',
                fillColor: '#0284c7',
                fillOpacity: 0.9,
                weight: 2,
            }).addTo(pointLayer);
            m.on('click', function () { onPointClick(idx, p); });
            m.bindTooltip(fmtLocal(p.recordedAt), { direction: 'top', opacity: 0.95 });
        });
        try {
            map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 17 });
        } catch (_) { /* ignore */ }
        var list = document.getElementById('rt-point-list');
        if (list) {
            list.innerHTML = points.map(function (p, idx) {
                return '<button type="button" class="rt-point-row" data-idx="' + idx + '">'
                    + '<span class="rt-point-time">' + esc(fmtLocal(p.recordedAt)) + '</span>'
                    + '<span class="rt-point-coord">' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) + '</span>'
                    + '</button>';
            }).join('');
            list.querySelectorAll('.rt-point-row').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var idx = parseInt(btn.getAttribute('data-idx'), 10);
                    onPointClick(idx, points[idx]);
                });
            });
        }
        var primary = pickPrimaryEvidence();
        loadVideoForEvidence(primary);
        highlightPoint(0);
        movePlayhead([points[0].lat, points[0].lon]);
        renderTelemetry();
        applyIncidentSeek();
        var stat = document.getElementById('rt-stat');
        if (stat) {
            stat.textContent = points.length + ' ' + tr('routeTrace.points', 'points')
                + (evidenceFiles.length ? (' \u00B7 ' + evidenceFiles.length + ' ' + tr('routeTrace.evidenceFiles', 'evidence file(s)')) : '');
        }
    }

    async function loadDeviceOptions() {
        var sel = document.getElementById('rt-device');
        if (!sel) return;
        var seq = ++deviceLoadSeq;
        try {
            var res = await fetch('/api/bwc-devices', { credentials: 'same-origin' });
            var data = await res.json();
            if (seq !== deviceLoadSeq) return;
            var devices = (data && data.devices) ? data.devices : [];
            sel.innerHTML = '<option value="">' + tr('routeTrace.selectBwc', 'Select BWC\u2026') + '</option>'
                + devices.map(function (d) {
                    var label = (d.operatorName || d.deviceId) + ' (' + d.deviceId + ')';
                    return '<option value="' + esc(d.deviceId) + '">' + esc(label) + '</option>';
                }).join('');
        } catch (_) { /* ignore */ }
    }

    async function loadRoute() {
        var deviceId = (document.getElementById('rt-device') || {}).value;
        var date = (document.getElementById('rt-date') || {}).value;
        var fromT = (document.getElementById('rt-from') || {}).value || '00:00';
        var toT = (document.getElementById('rt-to') || {}).value || '23:59';
        var msg = document.getElementById('rt-load-msg');
        if (!deviceId) {
            if (msg) msg.textContent = tr('routeTrace.pickDevice', 'Select a BWC.');
            return;
        }
        var bounds = dayBounds(date, fromT, toT);
        if (msg) msg.textContent = tr('routeTrace.loading', 'Loading\u2026');
        try {
            var url = '/api/gps-track/route?deviceId=' + encodeURIComponent(deviceId)
                + '&from=' + encodeURIComponent(bounds.from)
                + '&to=' + encodeURIComponent(bounds.to);
            var res = await fetch(url, { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Route load failed');
            drawRoute(data);
            if (msg) msg.textContent = '';
        } catch (err) {
            if (msg) msg.textContent = err.message;
            clearMap();
        }
    }

    function bindUi() {
        var panel = panelEl();
        if (!panel || panel._rtBound) return;
        panel._rtBound = true;
        var loadBtn = document.getElementById('rt-load');
        if (loadBtn) loadBtn.addEventListener('click', loadRoute);
        var scrub = document.getElementById('rt-scrub');
        if (scrub) {
            scrub.addEventListener('input', function () {
                if (!points.length) return;
                var idx = Math.round((parseInt(scrub.value, 10) / 1000) * (points.length - 1));
                highlightPoint(idx);
                syncVideoToPointIdx(idx);
            });
        }
        panel.addEventListener('click', function (e) {
            var open = e.target.closest('.rt-open-ev');
            if (open) openEvidenceDetail(open.getAttribute('data-file-id'));
        });
        var date = document.getElementById('rt-date');
        if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
        var proxBtn = document.getElementById('rt-proximity-scan');
        if (proxBtn) proxBtn.addEventListener('click', scanProximity);
        var attachBtn = document.getElementById('rt-attach-case');
        if (attachBtn) attachBtn.addEventListener('click', attachTraceToCase);
        var trimBtn = document.getElementById('rt-trim-clip');
        if (trimBtn) trimBtn.addEventListener('click', openRouteTrimModal);
    }

    function openRouteTrimModal() {
        var file = lastRouteFile || pickPrimaryEvidence();
        var vid = document.getElementById('rt-video');
        if (!file || !file.id) {
            var meta = document.getElementById('rt-video-meta');
            if (meta) {
                meta.hidden = false;
                meta.textContent = 'Load a GPS trace with video first.';
            }
            return;
        }
        if (global.EvidenceHub && EvidenceHub.openMediaTools) {
            var current = (vid && typeof vid.currentTime === 'number') ? vid.currentTime : 0;
            var duration = (vid && Number.isFinite(vid.duration)) ? vid.duration : NaN;
            var caseInp = document.getElementById('rt-attach-case-id');
            EvidenceHub.openMediaTools({
                fileId: file.id,
                tool: 'trim',
                trimOpts: {
                    fileName: file.fileName,
                    currentTime: current,
                    duration: duration,
                    caseId: (caseInp && caseInp.value) || activeCaseFileId || '',
                },
            });
            return;
        }
        if (!global.EvidenceTrimUi || !EvidenceTrimUi.open) return;
        var current = (vid && typeof vid.currentTime === 'number') ? vid.currentTime : 0;
        var duration = (vid && Number.isFinite(vid.duration)) ? vid.duration : NaN;
        var caseInp = document.getElementById('rt-attach-case-id');
        EvidenceTrimUi.open({
            fileId: file.id,
            fileName: file.fileName,
            currentTime: current,
            duration: duration,
            caseId: (caseInp && caseInp.value) || activeCaseFileId || '',
        });
    }

    function sliceIsoFromVideo() {
        if (activeVideo && Number.isFinite(activeVideo.currentTime) && points.length) {
            return new Date(trackStartMs() + Math.max(0, activeVideo.currentTime) * 1000).toISOString();
        }
        if (selectedPointIdx >= 0 && points[selectedPointIdx]) return points[selectedPointIdx].recordedAt;
        if (points.length) return points[0].recordedAt;
        return null;
    }

    function setProxMsg(text, show) {
        var el = document.getElementById('rt-prox-msg');
        if (!el) return;
        el.textContent = text || '';
        el.hidden = !show;
    }

    function drawProximityUnits(units, fixedCams, origin) {
        ensureMap();
        if (!proximityLayer) proximityLayer = L.layerGroup().addTo(map);
        proximityLayer.clearLayers();
        var oLat = origin && Number.isFinite(origin.lat) ? origin.lat : null;
        var oLon = origin && Number.isFinite(origin.lon) ? origin.lon : (origin && Number.isFinite(origin.lng) ? origin.lng : null);
        if (oLat != null && oLon != null) {
            L.circle([oLat, oLon], {
                radius: 1000,
                color: '#eab308',
                weight: 2,
                fillColor: '#eab308',
                fillOpacity: 0.12,
                className: 'rt-prox-circle',
                interactive: false,
            }).addTo(proximityLayer);
        }
        (units || []).forEach(function (u, i) {
            if (!u || !Number.isFinite(u.lat) || !Number.isFinite(u.lon)) return;
            var id = String(u.deviceId || u.id || 'BWC');
            var tone = (i % 2) ? 'rt-prox-tone-grey' : 'rt-prox-tone-yellow';
            var icon = L.divIcon({
                className: 'rt-prox-pin',
                html: '<span class="rt-prox-dot ' + tone + '"></span><span class="rt-prox-id">' + esc(id) + '</span>',
                iconSize: [72, 28],
                iconAnchor: [8, 8],
            });
            L.marker([u.lat, u.lon], { icon: icon, keyboard: false })
                .bindTooltip(id, { direction: 'top', opacity: 0.95, className: 'rt-prox-tip' })
                .addTo(proximityLayer);
        });
        (fixedCams || []).forEach(function (c) {
            if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon)) return;
            var label = String(c.name || c.id || 'Cam');
            var kind = String(c.type || 'Static');
            var icon = L.divIcon({
                className: 'rt-prox-pin',
                html: '<span class="rt-prox-dot rt-prox-tone-fixed"></span><span class="rt-prox-id">' + esc(label) + '</span>',
                iconSize: [72, 28],
                iconAnchor: [8, 8],
            });
            L.marker([c.lat, c.lon], { icon: icon, keyboard: false })
                .bindTooltip(label + ' \u00B7 ' + kind, { direction: 'top', opacity: 0.95, className: 'rt-prox-tip' })
                .addTo(proximityLayer);
        });
        try {
            if (proximityLayer.getLayers().length) {
                map.fitBounds(proximityLayer.getBounds(), { padding: [28, 28], maxZoom: 16 });
            }
        } catch (_) { /* ignore */ }
    }

    async function scanProximity() {
        var deviceId = (document.getElementById('rt-device') || {}).value;
        var at = sliceIsoFromVideo();
        var btn = document.getElementById('rt-proximity-scan');
        if (!deviceId) {
            setProxMsg(tr('routeTrace.pickDevice', 'Select a BWC.'), true);
            return;
        }
        if (!at) {
            setProxMsg('Load a GPS trace first.', true);
            return;
        }
        if (btn) btn.disabled = true;
        setProxMsg('Scanning nearby units\u2026', true);
        try {
            var url = '/api/evidence/proximity-scan?bwcId=' + encodeURIComponent(deviceId)
                + '&timestamp=' + encodeURIComponent(at);
            var res = await fetch(url, { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Proximity scan failed');
            var units = data.units || [];
            var fixed = data.fixedCameras || [];
            proximityUnits = units;
            drawProximityUnits(units, fixed, data.origin);
            var bits = [];
            if (units.length) bits.push(units.length + ' BWC' + (units.length === 1 ? '' : 's'));
            if (fixed.length) bits.push(fixed.length + ' fixed cam' + (fixed.length === 1 ? '' : 's'));
            setProxMsg(bits.length
                ? bits.join(' \u00B7 ') + ' within 1 km'
                : (data.originMissing ? 'No GPS origin at this timestamp.' : 'No other units within 1 km'), true);
        } catch (err) {
            setProxMsg(err.message || 'Proximity scan failed', true);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function applyIncidentSeek() {
        if (!pendingSeekIso || !points.length) return;
        var ms = Date.parse(pendingSeekIso);
        pendingSeekIso = null;
        if (!Number.isFinite(ms)) return;
        var idx = nearestIdxForMs(ms);
        highlightPoint(idx);
        if (points[idx]) movePlayhead([points[idx].lat, points[idx].lon]);
        pendingVideoSeekIdx = idx;
        applyPendingVideoSeek();
    }

    function applyPendingVideoSeek() {
        if (pendingVideoSeekIdx < 0) return;
        if (activeVideo && Number.isFinite(activeVideo.duration) && activeVideo.duration > 0) {
            syncVideoToPointIdx(pendingVideoSeekIdx);
            pendingVideoSeekIdx = -1;
        }
    }

    function setAttachMsg(text, show) {
        var el = document.getElementById('rt-attach-msg');
        if (!el) return;
        el.textContent = text || '';
        el.hidden = !show;
    }

    function currentMapBounds() {
        if (!map || typeof map.getBounds !== 'function') return null;
        try {
            var b = map.getBounds();
            return {
                north: b.getNorth(),
                south: b.getSouth(),
                east: b.getEast(),
                west: b.getWest(),
            };
        } catch (_) {
            return null;
        }
    }

    async function attachTraceToCase() {
        var inp = document.getElementById('rt-attach-case-id');
        var caseId = String((inp && inp.value) || activeCaseFileId || '').trim();
        var btn = document.getElementById('rt-attach-case');
        if (!caseId) {
            setAttachMsg('Enter a Case File ID.', true);
            return;
        }
        if (!points.length) {
            setAttachMsg('Load a GPS trace first.', true);
            return;
        }
        if (btn) btn.disabled = true;
        setAttachMsg('Attaching trace\u2026', true);
        try {
            var body = {
                at: sliceIsoFromVideo(),
                deviceId: (document.getElementById('rt-device') || {}).value || '',
                mapBounds: currentMapBounds(),
                telemetry: lastTelemetry,
                nearbyUnits: proximityUnits || [],
            };
            var res = await fetch('/api/case-files/' + encodeURIComponent(caseId) + '/geospatial-trace', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Attach failed');
            activeCaseFileId = caseId;
            setAttachMsg('Trace attached to ' + caseId, true);
        } catch (err) {
            setAttachMsg(err.message || 'Attach failed', true);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function openIncident(opts) {
        opts = opts || {};
        bindUi();
        ensureMap();
        activeCaseFileId = String(opts.caseFileId || '').trim();
        pendingSeekIso = opts.atIso || null;
        proximityUnits = [];
        await loadDeviceOptions();
        var sel = document.getElementById('rt-device');
        var did = String(opts.deviceId || '').trim();
        if (sel && did) {
            var found = false;
            for (var i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value === did) { found = true; break; }
            }
            if (!found) {
                var opt = document.createElement('option');
                opt.value = did;
                opt.textContent = did;
                sel.appendChild(opt);
            }
            sel.value = did;
        }
        var dateEl = document.getElementById('rt-date');
        if (dateEl && opts.atIso) dateEl.value = String(opts.atIso).slice(0, 10);
        var fromEl = document.getElementById('rt-from');
        var toEl = document.getElementById('rt-to');
        if (fromEl) fromEl.value = '00:00';
        if (toEl) toEl.value = '23:59';
        var caseInp = document.getElementById('rt-attach-case-id');
        if (caseInp && activeCaseFileId) caseInp.value = activeCaseFileId;
        if (did) await loadRoute();
    }

    function launchFromIncident(opts) {
        if (global.EvidenceManager && EvidenceManager.showTab) EvidenceManager.showTab('evidence');
        if (global.EvidenceHub && EvidenceHub.showPanel) EvidenceHub.showPanel('route-trace', { force: true });
        setTimeout(function () {
            openIncident(opts || {});
        }, 80);
    }

    function refreshHighResHint(activeList) {
        var el = document.getElementById('rt-highres-hint');
        if (!el) return;
        var rows = activeList || [];
        if (!rows.length) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        var labels = rows.map(function (row) {
            var id = row && row.camId ? row.camId : '';
            var tail = id ? id.slice(-8) : '';
            var reasons = (row && row.reasons && row.reasons.length) ? row.reasons.join(', ') : 'track';
            return tail + ' (' + reasons + ')';
        });
        el.textContent = tr('routeTrace.highResActive', 'High-res GPS tracking active') + ': ' + labels.join(', ')
            + ' \u2014 ' + tr('routeTrace.highResNote', '~15 s fixes while active.');
        el.hidden = false;
    }

    function onSmartGpsState(data) {
        refreshHighResHint(data && data.active ? data.active : []);
    }

    function onShow() {
        bindUi();
        loadDeviceOptions();
        ensureMap();
        fetch('/api/smart-gps/status', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.ok) refreshHighResHint(data.active);
            })
            .catch(function () { /* ignore */ });
    }

    function applyPermissions(p, role) {
        p = p || {};
        var isSa = role === 'super_admin';
        var canView = isSa || !!(p.evidenceView || p.evidenceDownload);
        var canEdit = isSa || !!p.evidenceEdit;
        canTrimClip = canEdit;
        var proxBtn = document.getElementById('rt-proximity-scan');
        if (proxBtn) proxBtn.hidden = !canView;
        var trimBtn = document.getElementById('rt-trim-clip');
        if (trimBtn) {
            trimBtn.hidden = !canEdit;
            trimBtn.disabled = !lastRouteFile;
        }
        var attachWrap = document.querySelector('#ev-panel-route-trace .rt-attach-case');
        if (attachWrap) attachWrap.hidden = !canEdit;
        var attachBtn = document.getElementById('rt-attach-case');
        if (attachBtn) attachBtn.hidden = !canEdit;
        var attachId = document.getElementById('rt-attach-case-id');
        if (attachId) attachId.disabled = !canEdit;
    }

    global.RouteTrace = {
        onShow: onShow,
        loadRoute: loadRoute,
        onSmartGpsState: onSmartGpsState,
        openIncident: openIncident,
        launchFromIncident: launchFromIncident,
        applyPermissions: applyPermissions,
    };
}(window));
