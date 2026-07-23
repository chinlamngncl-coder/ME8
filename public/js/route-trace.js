/**
 * Evidence hub \u2014 Route trace: GPS breadcrumb map + evidence video scrubber (Axon-style).
 */
(function (global) {
    var map = null;
    var routeLayer = null;
    var pointLayer = null;
    var highlightLayer = null;
    var tileLayer = null;
    var points = [];
    var evidenceFiles = [];
    var activeVideo = null;
    var scrubbing = false;
    var selectedPointIdx = -1;

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

    function panelEl() {
        return document.getElementById('ev-panel-route-trace');
    }

    function ensureMap() {
        var host = document.getElementById('rt-map');
        if (!host || typeof L === 'undefined') return;
        if (map) {
            setTimeout(function () { map.invalidateSize(); }, 80);
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
            tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors',
            }).addTo(map);
        }
        routeLayer = L.layerGroup().addTo(map);
        pointLayer = L.layerGroup().addTo(map);
        highlightLayer = L.layerGroup().addTo(map);
    }

    function clearMap() {
        if (routeLayer) routeLayer.clearLayers();
        if (pointLayer) pointLayer.clearLayers();
        if (highlightLayer) highlightLayer.clearLayers();
        points = [];
        evidenceFiles = [];
        selectedPointIdx = -1;
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
        if (!activeVideo || !points.length || idx < 0) return;
        var dur = activeVideo.duration;
        if (!dur || !Number.isFinite(dur)) return;
        var frac = points.length > 1 ? idx / (points.length - 1) : 0;
        scrubbing = true;
        activeVideo.currentTime = Math.min(dur - 0.05, Math.max(0, frac * dur));
        scrubbing = false;
    }

    function pointIdxForVideoTime(t, dur) {
        if (!points.length || !dur) return 0;
        var frac = Math.max(0, Math.min(1, t / dur));
        return Math.round(frac * (points.length - 1));
    }

    function bindVideoSync() {
        var vid = document.getElementById('rt-video');
        if (!vid) return;
        activeVideo = vid;
        vid.onloadedmetadata = function () {
            var meta = document.getElementById('rt-video-meta');
            if (meta) meta.textContent = tr('routeTrace.videoReady', 'Video ready \u2014 playback syncs with route scrubber.');
        };
        vid.ontimeupdate = function () {
            if (scrubbing || !points.length) return;
            var idx = pointIdxForVideoTime(vid.currentTime, vid.duration);
            if (idx !== selectedPointIdx) highlightPoint(idx);
        };
    }

    function loadVideoForEvidence(file) {
        var wrap = document.getElementById('rt-video-wrap');
        var vid = document.getElementById('rt-video');
        var meta = document.getElementById('rt-video-meta');
        if (!wrap || !vid) return;
        if (!file) {
            wrap.hidden = true;
            vid.removeAttribute('src');
            activeVideo = null;
            if (meta) meta.textContent = tr('routeTrace.noVideo', 'No catalog video for this window.');
            return;
        }
        wrap.hidden = false;
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
        L.polyline(latlngs, { color: '#38bdf8', weight: 4, opacity: 0.85 }).addTo(routeLayer);
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
        var stat = document.getElementById('rt-stat');
        if (stat) {
            stat.textContent = points.length + ' ' + tr('routeTrace.points', 'points')
                + (evidenceFiles.length ? (' \u00B7 ' + evidenceFiles.length + ' ' + tr('routeTrace.evidenceFiles', 'evidence file(s)')) : '');
        }
    }

    async function loadDeviceOptions() {
        var sel = document.getElementById('rt-device');
        if (!sel) return;
        try {
            var res = await fetch('/api/bwc-devices', { credentials: 'same-origin' });
            var data = await res.json();
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

    global.RouteTrace = {
        onShow: onShow,
        loadRoute: loadRoute,
        onSmartGpsState: onSmartGpsState,
    };
}(window));
