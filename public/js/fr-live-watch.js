/**
 * Analytics Face — Live watch (4 tiles + ≤32 rotate).
 * Video only — face detect/match is a later MOB (server frame-grab).
 * Pattern mirrors command-wall socket + JSMpeg; surface: analytics-fr.
 */
(function (global) {
    var SURFACE = 'analytics-fr';
    var MAX_WATCH = 32;
    var LIVE_SLOTS = 4;
    var ROTATE_MS = 20000;

    var watching = false;
    var selected = []; // camIds in watch set order
    var pinned = Object.create(null); // camId -> true (hold on a slot)
    var slotCam = [null, null, null, null];
    var players = [null, null, null, null];
    var rotateTimer = null;
    var rotateCursor = 0;
    var fleetById = Object.create(null);
    var socketBound = false;
    var uiBound = false;
    var rosterTimer = null;

    function tr(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.t) {
            var s = I18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getSocket() {
        if (global.__mobilityDashboardSocket && typeof global.__mobilityDashboardSocket.emit === 'function') {
            return global.__mobilityDashboardSocket;
        }
        if (global.socket && typeof global.socket.emit === 'function') return global.socket;
        return null;
    }

    function wsPort() {
        return (parseInt(global.location.port, 10) || 3888) + 1;
    }

    function videoWsUrl(camId) {
        return 'ws://' + global.location.hostname + ':' + wsPort() + '/?camId=' + encodeURIComponent(camId);
    }

    function deviceName(camId) {
        var d = fleetById[camId];
        if (d && d.name) return String(d.name);
        return String(camId);
    }

    function deviceOnline(camId) {
        var d = fleetById[camId];
        return !!(d && d.online);
    }

    function tileEl(slot) {
        return document.querySelector('.ax-fr-tile[data-slot="' + slot + '"]');
    }

    function setTileMeta(slot, camId, status) {
        var tile = tileEl(slot);
        if (!tile) return;
        var label = tile.querySelector('.ax-fr-tile-label');
        var ph = tile.querySelector('.ax-fr-tile-ph');
        var name = camId ? deviceName(camId) : '';
        if (label) {
            label.textContent = camId
                ? (String(slot + 1) + ' · ' + name)
                : String(slot + 1);
        }
        if (ph) {
            if (camId && status) {
                ph.textContent = status;
                ph.hidden = status === 'Live';
            } else if (!camId) {
                ph.textContent = tr('analytics.fr.tileIdle', 'Waiting');
                ph.hidden = false;
            }
        }
        tile.classList.toggle('is-live', status === 'Live');
        tile.classList.toggle('is-pinned', !!(camId && pinned[camId]));
        tile.setAttribute('data-cam', camId || '');
    }

    function destroyPlayer(slot) {
        var p = players[slot];
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players[slot] = null;
        }
        var tile = tileEl(slot);
        if (tile) {
            var canvases = tile.querySelectorAll('canvas');
            for (var i = 0; i < canvases.length; i++) {
                try { canvases[i].remove(); } catch (_) { /* ignore */ }
            }
            tile.classList.remove('is-live');
        }
    }

    function stopSlot(slot, emitStop) {
        var camId = slotCam[slot];
        destroyPlayer(slot);
        if (emitStop !== false && camId) {
            var sock = getSocket();
            if (sock) sock.emit('stop-video', { camId: camId, surface: SURFACE });
        }
        slotCam[slot] = null;
        setTileMeta(slot, null, null);
        emitWatchSlots();
    }

    function emitWatchSlots() {
        var sock = getSocket();
        if (!sock) return;
        var thrEl = document.getElementById('ax-fr-threshold');
        var thr = thrEl ? parseInt(thrEl.value, 10) : 75;
        if (isNaN(thr)) thr = 75;
        sock.emit('fr-watch-slots', {
            camIds: watching ? activeSlotCams() : [],
            threshold: thr,
        });
    }

    function flashCam(camId) {
        camId = String(camId || '');
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i] !== camId) continue;
            (function (tile) {
                if (!tile) return;
                tile.classList.add('is-fr-hit');
                setTimeout(function () {
                    try { tile.classList.remove('is-fr-hit'); } catch (_) { /* ignore */ }
                }, 4000);
            })(tileEl(i));
        }
    }

    function attachPlayer(slot, camId) {
        var tile = tileEl(slot);
        if (!tile || !camId || typeof JSMpeg === 'undefined') {
            setTileMeta(slot, camId, tr('analytics.fr.tileError', 'Player unavailable'));
            return;
        }
        destroyPlayer(slot);
        setTileMeta(slot, camId, tr('analytics.fr.tileConnecting', 'Connecting…'));
        var canvas = document.createElement('canvas');
        canvas.className = 'ax-fr-tile-canvas';
        tile.appendChild(canvas);
        try {
            var player = new JSMpeg.Player(videoWsUrl(camId), {
                canvas: canvas,
                audio: false,
                pauseWhenHidden: false,
                disableGl: true,
                onVideoDecode: function () {
                    setTileMeta(slot, camId, 'Live');
                },
            });
            players[slot] = player;
        } catch (err) {
            setTileMeta(slot, camId, tr('analytics.fr.tileError', 'Player error'));
        }
    }

    function startSlot(slot, camId) {
        if (slot < 0 || slot >= LIVE_SLOTS || !camId) return;
        if (slotCam[slot] === camId && players[slot]) return;
        if (slotCam[slot] && slotCam[slot] !== camId) {
            stopSlot(slot, true);
        }
        slotCam[slot] = camId;
        setTileMeta(slot, camId, tr('analytics.fr.tileConnecting', 'Connecting…'));
        if (!deviceOnline(camId)) {
            setTileMeta(slot, camId, tr('analytics.fr.tileOffline', 'Offline'));
            emitWatchSlots();
            return;
        }
        var sock = getSocket();
        if (sock) sock.emit('start-video', { camId: camId, mode: 'video', surface: SURFACE });
        attachPlayer(slot, camId);
        emitWatchSlots();
    }

    function activeSlotCams() {
        var out = [];
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i]) out.push(slotCam[i]);
        }
        return out;
    }

    function nextRotateCandidate() {
        if (!selected.length) return null;
        var active = Object.create(null);
        activeSlotCams().forEach(function (id) { active[id] = true; });
        var n = selected.length;
        for (var k = 0; k < n; k++) {
            rotateCursor = (rotateCursor + 1) % n;
            var id = selected[rotateCursor];
            if (!id || active[id]) continue;
            if (!deviceOnline(id)) continue;
            if (pinned[id]) continue;
            return id;
        }
        return null;
    }

    function findUnpinnedSlot() {
        for (var i = 0; i < LIVE_SLOTS; i++) {
            var id = slotCam[i];
            if (!id) return i;
            if (!pinned[id]) return i;
        }
        return -1;
    }

    function rotateOnce() {
        if (!watching) return;
        if (selected.length <= LIVE_SLOTS) return;
        var next = nextRotateCandidate();
        if (!next) return;
        var slot = findUnpinnedSlot();
        if (slot < 0) return;
        startSlot(slot, next);
        renderWatchList();
    }

    function fillInitialSlots() {
        var online = selected.filter(deviceOnline);
        var want = online.slice(0, LIVE_SLOTS);
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (want[i]) startSlot(i, want[i]);
            else stopSlot(i, true);
        }
        rotateCursor = Math.max(0, want.length - 1);
    }

    function stopWatch() {
        watching = false;
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
        for (var i = 0; i < LIVE_SLOTS; i++) stopSlot(i, true);
        emitWatchSlots();
        updateWatchButtons();
        renderWatchList();
    }

    function startWatch() {
        if (!selected.length) return;
        watching = true;
        fillInitialSlots();
        if (rotateTimer) clearInterval(rotateTimer);
        rotateTimer = setInterval(rotateOnce, ROTATE_MS);
        emitWatchSlots();
        updateWatchButtons();
        renderWatchList();
    }

    function toggleSelect(camId, checked) {
        camId = String(camId || '');
        if (!camId) return;
        var idx = selected.indexOf(camId);
        if (checked) {
            if (idx >= 0) return;
            if (selected.length >= MAX_WATCH) return;
            selected.push(camId);
        } else {
            if (idx < 0) return;
            selected.splice(idx, 1);
            delete pinned[camId];
            if (watching) {
                for (var i = 0; i < LIVE_SLOTS; i++) {
                    if (slotCam[i] === camId) {
                        stopSlot(i, true);
                        var next = nextRotateCandidate();
                        if (next) startSlot(i, next);
                    }
                }
            }
        }
        updateWatchButtons();
        renderWatchList();
    }

    function togglePin(camId) {
        camId = String(camId || '');
        if (!camId || selected.indexOf(camId) < 0) return;
        if (pinned[camId]) delete pinned[camId];
        else pinned[camId] = true;
        renderWatchList();
        // If pinning while watching and not on a tile, swap into an unpinned slot
        if (watching && pinned[camId] && activeSlotCams().indexOf(camId) < 0) {
            var slot = findUnpinnedSlot();
            if (slot >= 0) startSlot(slot, camId);
        }
    }

    function updateWatchButtons() {
        var startBtn = document.getElementById('ax-fr-watch-start');
        var stopBtn = document.getElementById('ax-fr-watch-stop');
        var meta = document.getElementById('ax-fr-watch-meta');
        if (startBtn) startBtn.disabled = watching || selected.length === 0;
        if (stopBtn) stopBtn.disabled = !watching;
        if (meta) {
            meta.textContent = tr('analytics.fr.watchMeta', '{n} selected · {live} live')
                .replace('{n}', String(selected.length))
                .replace('{live}', String(activeSlotCams().length));
        }
    }

    function renderWatchList() {
        var el = document.getElementById('ax-fr-watch-list');
        if (!el) return;
        var online = [];
        Object.keys(fleetById).forEach(function (id) {
            if (fleetById[id] && fleetById[id].online) online.push(fleetById[id]);
        });
        online.sort(function (a, b) {
            return String(a.name || a.id).localeCompare(String(b.name || b.id));
        });

        var head = '<div class="ax-fr-watch-bar">' +
            '<button type="button" class="btn btn-action btn-sm" id="ax-fr-watch-start"' +
            (watching || selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.watchStart', 'Start watch')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-fr-watch-stop"' +
            (watching ? '' : ' disabled') + '>' +
            esc(tr('analytics.fr.watchStop', 'Stop watch')) + '</button>' +
            '<span id="ax-fr-watch-meta" class="hint">' +
            esc(tr('analytics.fr.watchMeta', '{n} selected · {live} live')
                .replace('{n}', String(selected.length))
                .replace('{live}', String(activeSlotCams().length))) +
            '</span>' +
            '<span class="hint">' + esc(tr('analytics.fr.watchCap', 'Max 32 · 4 live · rotate 20s')) + '</span>' +
            '</div>';

        if (!online.length) {
            el.innerHTML = head + '<p class="hint">' +
                esc(tr('analytics.fr.watchEmpty', 'No online BWCs right now.')) + '</p>';
            bindWatchBar();
            return;
        }

        var rows = online.map(function (d) {
            var id = String(d.id);
            var checked = selected.indexOf(id) >= 0;
            var isPin = !!pinned[id];
            var onTile = activeSlotCams().indexOf(id) >= 0;
            var disableMore = !checked && selected.length >= MAX_WATCH;
            return '<label class="ax-fr-watch-item' + (onTile ? ' is-on-tile' : '') +
                (isPin ? ' is-pinned' : '') + '">' +
                '<input type="checkbox" data-cam="' + esc(id) + '"' +
                (checked ? ' checked' : '') + (disableMore ? ' disabled' : '') + '>' +
                '<span class="ax-fr-watch-name">' + esc(d.name || id) + '</span>' +
                (checked
                    ? ('<button type="button" class="btn btn-ghost btn-sm ax-fr-pin-btn" data-cam="' +
                        esc(id) + '" title="' + esc(tr('analytics.fr.pinHint', 'Pin to a live tile')) + '">' +
                        esc(isPin ? tr('analytics.fr.unpin', 'Unpin') : tr('analytics.fr.pin', 'Pin')) +
                        '</button>')
                    : '') +
                '</label>';
        }).join('');

        el.innerHTML = head + '<div class="ax-fr-watch-grid">' + rows + '</div>';
        bindWatchBar();
        el.querySelectorAll('input[type="checkbox"][data-cam]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                toggleSelect(cb.getAttribute('data-cam'), cb.checked);
            });
        });
        el.querySelectorAll('.ax-fr-pin-btn').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                togglePin(btn.getAttribute('data-cam'));
            });
        });
    }

    function bindWatchBar() {
        var startBtn = document.getElementById('ax-fr-watch-start');
        var stopBtn = document.getElementById('ax-fr-watch-stop');
        if (startBtn) startBtn.onclick = function () { startWatch(); };
        if (stopBtn) stopBtn.onclick = function () { stopWatch(); };
    }

    function ingestFleet(list) {
        fleetById = Object.create(null);
        (list || []).forEach(function (d) {
            if (!d || !d.id) return;
            fleetById[String(d.id)] = {
                id: String(d.id),
                name: d.name || d.id,
                online: !!d.online,
            };
        });
        // Drop offline from selection? Keep selected but skip in rotate; mark offline on tiles
        if (watching) {
            for (var i = 0; i < LIVE_SLOTS; i++) {
                var id = slotCam[i];
                if (id && !deviceOnline(id)) {
                    setTileMeta(i, id, tr('analytics.fr.tileOffline', 'Offline'));
                }
            }
        }
        renderWatchList();
    }

    function loadFleet() {
        fetch('/api/fleet', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                ingestFleet((data && data.fleet) || []);
            })
            .catch(function () {
                renderWatchList();
            });
    }

    function bindSocket() {
        if (socketBound) return;
        var sock = getSocket();
        if (!sock) return;
        socketBound = true;
        sock.on('fleet-roster', function (payload) {
            var list = Array.isArray(payload) ? payload
                : (payload && Array.isArray(payload.fleet) ? payload.fleet : null);
            if (list) ingestFleet(list);
        });
        sock.on('video-stream-ready', function (data) {
            if (!data || !data.camId) return;
            if (data.surface && data.surface !== SURFACE) return;
            if (!watching) return;
            var camId = String(data.camId);
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId && !players[i]) attachPlayer(i, camId);
            }
        });
        sock.on('video-stream-error', function (data) {
            if (!data || !data.camId || !watching) return;
            var camId = String(data.camId);
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId) {
                    setTileMeta(i, camId, tr('analytics.fr.tileError', 'Stream error'));
                }
            }
        });
    }

    function onFacePanelShow() {
        bindSocket();
        loadFleet();
        if (!rosterTimer) {
            rosterTimer = setInterval(function () {
                if (document.getElementById('ax-panel-face') &&
                    !document.getElementById('ax-panel-face').hidden) {
                    loadFleet();
                }
            }, 30000);
        }
        if (!watching) {
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (!slotCam[i]) setTileMeta(i, null, null);
            }
            renderWatchList();
        } else {
            updateWatchButtons();
            renderWatchList();
        }
    }

    function onHideOrLeave() {
        // Keep watch running if user switches to Verify/Blacklist within Analytics;
        // only stop when explicitly Stop or page unload.
    }

    function dispose() {
        stopWatch();
        if (rosterTimer) {
            clearInterval(rosterTimer);
            rosterTimer = null;
        }
    }

    global.addEventListener('beforeunload', function () {
        if (watching) stopWatch();
    });

    global.FrLiveWatch = {
        onShow: onFacePanelShow,
        stop: stopWatch,
        dispose: dispose,
        isWatching: function () { return watching; },
        getActiveSlotCams: activeSlotCams,
        flashCam: flashCam,
        emitWatchSlots: emitWatchSlots,
    };
})(window);
