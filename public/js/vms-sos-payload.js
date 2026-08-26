/**
 * VMS-SOS-PAYLOAD-A1-V1 + VMS-SOS-AUTOFIRE-A2-V1
 * A1: correlate fixed cams → stash Investigation payload.
 * A2: broadcast-first overwrite / open / Open Investigation failsafe.
 * Never Spatial rail idle. Never Overwrite modal. Never break Ops SOS UI.
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'vms-wall2-launch-payload';
    var WALL2_CH = 'mobility-axiom-vms-wall2';
    var WALL2_NAME = 'vms-wall2-investigation';
    var WALL2_URL = '/vms-investigation.html';
    var RADIUS_M = 200;
    var FOCUS_N = 1;
    var SAT_N = 5;
    var POOL_MAX = 14;
    var gen = 0;
    var lastStashKey = '';
    var lastStashAt = 0;
    var lastHandoffAt = 0;
    var wall2Window = null;
    var wall2Channel = null;
    var wall2ChannelBound = false;
    var wall2LastPongAt = 0;
    var pendingOpenPayload = null;

    function shortLabel(id, name) {
        var n = name && String(name).trim();
        if (n) return n;
        var s = String(id || '').trim();
        if (s.length > 8) return 'Camera ·' + s.slice(-4);
        return 'Camera';
    }

    function haversineM(lat1, lon1, lat2, lon2) {
        var R = 6371000;
        var toRad = function (x) { return x * Math.PI / 180; };
        var dLat = toRad(lat2 - lat1);
        var dLon = toRad(lon2 - lon1);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    function floorDist(ax, ay, bx, by) {
        var dx = Number(ax) - Number(bx);
        var dy = Number(ay) - Number(by);
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return Infinity;
        /* Normalized floor coords → treat as planar; scale ~100m across unit square as soft gate */
        return Math.sqrt(dx * dx + dy * dy) * 100;
    }

    function rawFixedId(sourceId) {
        return String(sourceId || '').replace(/^fixed:/i, '').trim();
    }

    /** Fixed cams already live on Ops wall — exclude to avoid double ZLM lease. */
    function opsWallFixedIdSet() {
        var out = Object.create(null);
        var nodes = document.querySelectorAll('#video-wall-slots .video-slot');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var id = String(el.getAttribute('data-cam-id') || el.dataset.camId || '').trim();
            if (!id) continue;
            var raw = rawFixedId(id);
            if (!raw) continue;
            var isFixed = id.indexOf('fixed:') === 0 || el.classList.contains('video-slot-fixed-camera');
            if (!isFixed) continue;
            var live = el.classList.contains('video-slot-has-live');
            if (!live && global.VideoWall && typeof global.VideoWall.wallHasPlayerForCam === 'function') {
                live = !!global.VideoWall.wallHasPlayerForCam(id)
                    || !!global.VideoWall.wallHasPlayerForCam(raw)
                    || !!global.VideoWall.wallHasPlayerForCam('fixed:' + raw);
            }
            if (live) out[raw] = true;
        }
        return out;
    }

    function isPlayableFixed(cam) {
        if (!cam || !cam.id) return false;
        if (cam.enabled === false) return false;
        if (cam.playable === false) return false;
        var id = String(cam.id);
        if (id.indexOf('ph-cam-') === 0) return false;
        return true;
    }

    function resolveSosOrigin(data, camId) {
        var lat = data && data.lat != null && data.lat !== '' ? parseFloat(data.lat) : NaN;
        var lon = data && (data.lon != null ? data.lon : data.lng);
        lon = lon != null && lon !== '' ? parseFloat(lon) : NaN;
        var floorId = data && (data.floorId || data.floor_id || data.floor) || null;
        floorId = floorId != null && String(floorId).trim() ? String(floorId).trim() : null;
        var mapX = data && (data.map_x != null ? data.map_x : data.mapX);
        var mapY = data && (data.map_y != null ? data.map_y : data.mapY);
        mapX = mapX != null && mapX !== '' ? parseFloat(mapX) : NaN;
        mapY = mapY != null && mapY !== '' ? parseFloat(mapY) : NaN;

        if (floorId && Number.isFinite(mapX) && Number.isFinite(mapY)) {
            return { mode: 'floor', floorId: floorId, mapX: mapX, mapY: mapY, camId: camId };
        }
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { mode: 'gis', lat: lat, lon: lon, camId: camId };
        }
        return null;
    }

    function rankFixedCams(cams, origin, wallBusy) {
        var ranked = [];
        for (var i = 0; i < cams.length; i++) {
            var cam = cams[i];
            if (!isPlayableFixed(cam)) continue;
            var id = String(cam.id);
            if (wallBusy[id]) continue;
            var dist = Infinity;
            if (origin.mode === 'floor') {
                var camFloor = String(cam.floor_id || cam.floorId || cam.zone_id || cam.zoneId || '').trim();
                if (!camFloor || camFloor !== origin.floorId) continue;
                if (cam.map_x == null || cam.map_y == null) continue;
                dist = floorDist(origin.mapX, origin.mapY, cam.map_x, cam.map_y);
            } else {
                var clat = cam.lat != null ? parseFloat(cam.lat) : NaN;
                var clng = cam.lng != null ? parseFloat(cam.lng) : (cam.lon != null ? parseFloat(cam.lon) : NaN);
                if (!Number.isFinite(clat) || !Number.isFinite(clng)) continue;
                dist = haversineM(origin.lat, origin.lon, clat, clng);
            }
            if (!Number.isFinite(dist) || dist > RADIUS_M) continue;
            ranked.push({ id: id, name: cam.name || '', dist: dist });
        }
        ranked.sort(function (a, b) { return a.dist - b.dist; });
        return ranked;
    }

    function buildPayloadFromRanked(ranked, origin) {
        if (!ranked.length) return null;
        var ids = ranked.map(function (r) { return r.id; });
        /* Up to 6 for grid (1 focus + 5 sats), up to 14 more waiting */
        var grid = ids.slice(0, FOCUS_N + SAT_N);
        var waiters = ids.slice(FOCUS_N + SAT_N).slice(0, POOL_MAX);
        var focus = grid[0];
        var sats = grid.slice(1);
        /* Investigation fill: livePreview[0..4] + pool[0] → sixth cell */
        var livePreview = [focus].concat(sats.slice(0, 4));
        var sixth = sats.length >= 5 ? sats[4] : null;
        var poolForPayload = [];
        if (sixth) poolForPayload.push(sixth);
        for (var w = 0; w < waiters.length; w++) poolForPayload.push(waiters[w]);

        var selection = grid.concat(waiters);
        var camLabels = {};
        ranked.forEach(function (r) {
            if (selection.indexOf(r.id) >= 0) camLabels[r.id] = shortLabel(r.id, r.name);
        });

        return {
            version: 1,
            source: 'sos-correlation',
            reason: 'sos',
            layout: '1+5',
            createdAt: new Date().toISOString(),
            sosCameraId: origin.camId || null,
            siteId: null,
            zoneId: null,
            floorId: origin.mode === 'floor' ? origin.floorId : null,
            selection: selection,
            livePreview: livePreview,
            pool: poolForPayload,
            camLabels: camLabels,
            fillHint: {
                cells: livePreview.slice(),
                sixth: sixth,
            },
            correlation: {
                mode: origin.mode,
                radiusM: RADIUS_M,
                focusCount: 1,
                satelliteCount: sats.length,
                waitingCount: waiters.length,
            },
        };
    }

    function stashPayload(payload) {
        if (!payload) return false;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            return true;
        } catch (_) {
            return false;
        }
    }

    function fetchFixedCatalog(done) {
        fetch('/api/fixed-cams/public', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                done(Array.isArray(data && data.cams) ? data.cams : []);
            })
            .catch(function () { done([]); });
    }

    /**
     * A1 entry — call from onDashboardSosAlarm after UI work.
     * Guards: caller must pass only real SOS (not refresh/replay/fromLiveBye).
     */
    function buildAndStashFromSosAlarm(data) {
        if (!data || !data.cameraId) return;
        var camId = String(data.cameraId).trim();
        if (!camId) return;

        var origin = resolveSosOrigin(data, camId);
        if (!origin) return; /* silent abort — no coordinates */

        var debounceKey = camId + '|' + origin.mode;
        var now = Date.now();
        if (debounceKey === lastStashKey && (now - lastStashAt) < 2500) return;
        lastStashKey = debounceKey;
        lastStashAt = now;

        var myGen = ++gen;
        var wallBusy = opsWallFixedIdSet();

        fetchFixedCatalog(function (cams) {
            if (myGen !== gen) return; /* newer SOS won */
            var ranked = rankFixedCams(cams, origin, wallBusy);
            var payload = buildPayloadFromRanked(ranked, origin);
            if (!payload) return; /* none within radius — silent */
            if (!stashPayload(payload)) return;
            try {
                console.info('[SOS A1] Investigation payload stashed', {
                    layout: payload.layout,
                    onWall: payload.livePreview.length + (payload.fillHint.sixth ? 1 : 0),
                    waiting: Math.max(0, payload.pool.length - (payload.fillHint.sixth ? 1 : 0)),
                    mode: origin.mode,
                });
            } catch (_) { /* ignore */ }
            /* A2 — after successful stash only */
            try {
                handoffInvestigationFromSos(payload);
            } catch (err) {
                try { console.error('[SOS A2] handoff error', err); } catch (_) { /* ignore */ }
            }
        });
    }

    /* ── A2 handoff (no Spatial rail idle, no overwrite modal) ───────────── */

    function showOpsChromeToast(msg) {
        var el = document.getElementById('sos-inv-handoff-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sos-inv-handoff-toast';
            el.setAttribute('role', 'status');
            el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10050;' +
                'padding:10px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px;' +
                'color:#e2e8f0;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.35);';
            document.body.appendChild(el);
        }
        el.textContent = msg || '';
        el.hidden = !msg;
        if (showOpsChromeToast._t) clearTimeout(showOpsChromeToast._t);
        if (msg) {
            showOpsChromeToast._t = setTimeout(function () { el.hidden = true; }, 5000);
        }
    }

    function hideOpenInvestigationBtn() {
        var btn = document.getElementById('sos-open-investigation-btn');
        if (btn) btn.hidden = true;
    }

    function showOpenInvestigationBtn() {
        var btn = document.getElementById('sos-open-investigation-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'sos-open-investigation-btn';
            btn.className = 'btn btn-action';
            btn.textContent = 'Open Investigation';
            btn.style.cssText = 'position:fixed;top:56px;right:12px;z-index:10060;padding:10px 14px;' +
                'font-size:13px;font-weight:700;box-shadow:0 8px 28px rgba(0,0,0,.45);';
            btn.addEventListener('click', function () {
                var payload = pendingOpenPayload || readStashedSosPayload();
                if (!payload) {
                    showOpsChromeToast('Investigation is not ready yet.');
                    return;
                }
                var ok = openInvestigationWindow(payload, true);
                if (ok) hideOpenInvestigationBtn();
            });
            document.body.appendChild(btn);
        }
        btn.hidden = false;
    }

    function readStashedSosPayload() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var p = JSON.parse(raw);
            if (!p || typeof p !== 'object') return null;
            var reason = String(p.reason || '').toLowerCase();
            var source = String(p.source || '').toLowerCase();
            if (reason !== 'sos' && source.indexOf('sos') < 0) return null;
            if (!Array.isArray(p.livePreview) || !p.livePreview.length) return null;
            return p;
        } catch (_) {
            return null;
        }
    }

    function postWall2(msg) {
        ensureWall2Channel();
        if (!wall2Channel) return;
        try { wall2Channel.postMessage(msg); } catch (_) { /* ignore */ }
    }

    function ensureWall2Channel() {
        if (wall2ChannelBound) return wall2Channel;
        wall2ChannelBound = true;
        if (typeof global.BroadcastChannel !== 'function') {
            wall2Channel = null;
            return null;
        }
        try {
            wall2Channel = new global.BroadcastChannel(WALL2_CH);
            wall2Channel.onmessage = function (ev) {
                var d = ev && ev.data;
                if (!d || typeof d !== 'object') return;
                if (d.type === 'pong' || d.type === 'wall2-pong') {
                    wall2LastPongAt = Date.now();
                    hideOpenInvestigationBtn();
                } else if (d.type === 'wall2-closed' || d.type === 'closed') {
                    wall2LastPongAt = 0;
                    wall2Window = null;
                }
            };
        } catch (_) {
            wall2Channel = null;
        }
        return wall2Channel;
    }

    function isInvestigationAlive() {
        try {
            if (wall2Window && !wall2Window.closed) return true;
        } catch (_) { /* ignore */ }
        return wall2LastPongAt > 0 && (Date.now() - wall2LastPongAt) < 5000;
    }

    function broadcastOverwriteSos(payload) {
        stashPayload(payload);
        postWall2({ type: 'overwrite', payload: payload, at: Date.now() });
        showOpsChromeToast('Emergency view updated.');
        /* intentionally NO enterRailIdleAfterHandoff */
    }

    function openInvestigationWindow(payload, fromUserClick) {
        ensureWall2Channel();
        stashPayload(payload);
        var win = null;
        try {
            win = global.open(WALL2_URL, WALL2_NAME);
        } catch (_) {
            win = null;
        }
        if (win) wall2Window = win;
        if (!win) {
            pendingOpenPayload = payload;
            if (!fromUserClick) showOpenInvestigationBtn();
            showOpsChromeToast(fromUserClick
                ? 'Could not open Investigation. Allow popups, then try again.'
                : 'Popup blocked — use Open Investigation.');
            return false;
        }
        pendingOpenPayload = null;
        hideOpenInvestigationBtn();
        setTimeout(function () {
            postWall2({ type: 'launch', payload: payload, at: Date.now() });
            postWall2({ type: 'ping', at: Date.now() });
        }, 400);
        showOpsChromeToast('Investigation window opened.');
        /* intentionally NO enterRailIdleAfterHandoff */
        return true;
    }

    function handoffInvestigationFromSos(payload) {
        if (!payload || !Array.isArray(payload.livePreview) || !payload.livePreview.length) return;
        var now = Date.now();
        if ((now - lastHandoffAt) < 2000) return;
        lastHandoffAt = now;

        pendingOpenPayload = payload;
        ensureWall2Channel();
        postWall2({ type: 'ping', at: Date.now() });

        setTimeout(function () {
            try {
                if (isInvestigationAlive()) {
                    broadcastOverwriteSos(payload);
                    hideOpenInvestigationBtn();
                    return;
                }
                openInvestigationWindow(payload, false);
            } catch (err) {
                try { console.error('[SOS A2] handoff tick error', err); } catch (_) { /* ignore */ }
            }
        }, 280);
    }

    global.VmsSosPayload = {
        buildAndStashFromSosAlarm: buildAndStashFromSosAlarm,
        handoffInvestigationFromSos: handoffInvestigationFromSos,
        openInvestigationFromButton: function () {
            var payload = pendingOpenPayload || readStashedSosPayload();
            if (!payload) return false;
            return openInvestigationWindow(payload, true);
        },
        /** A3 — Ops ACK → Investigation banner only (no teardown). */
        notifyOpsSosAck: function (info) {
            try {
                ensureWall2Channel();
                postWall2({
                    type: 'sos_ack',
                    action: 'sos_ack',
                    at: Date.now(),
                    cameraId: info && info.cameraId ? String(info.cameraId) : null,
                });
            } catch (_) { /* ignore */ }
        },
        STORAGE_KEY: STORAGE_KEY,
        RADIUS_M: RADIUS_M,
    };
})(window);
