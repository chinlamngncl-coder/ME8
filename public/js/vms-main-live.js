/**
 * VMS-MAIN-LIVE-VIEW-V1
 * VMS Live View: camera tree + live grid. AxiomFlvManager only.
 * Does not touch Ops wall, fleet-ui, or Command Wall Gold paths.
 */
(function (global) {
    'use strict';

    var OWNER = 'vms-main-live';
    var SURFACE = 'vms-main';
    var LAYOUTS = { hotspot: 6, '1': 1, '4': 4, '9': 9, '16': 16 };
    var HEARTBEAT_MS = 30000;

    var socket = null;
    var bound = false;
    var visible = false;
    var layout = '4';
    var selectedSlot = 0;
    var mountGen = 0;
    var filterText = '';
    var catalog = [];
    var slots = [];
    var players = {};
    var heartbeatTimer = null;
    var ptzJoy = null;
    var ptzOpen = false;
    var ptzPinned = false;
    var fixedMeta = {};
    var picked = {};
    var pickMode = false;

    function tr(key, fallback) {
        try {
            if (typeof I18n !== 'undefined' && I18n.t) {
                var s = I18n.t(key);
                if (s && s !== key) return s;
            }
        } catch (_) { /* ignore */ }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function $(id) {
        return document.getElementById(id);
    }

    function isFixed(id) {
        return String(id || '').indexOf('fixed:') === 0;
    }

    function rawFixed(id) {
        return isFixed(id) ? String(id).slice(6) : '';
    }

    function viewMode() {
        return layout === 'hotspot' || layout === '1' ? 'focus' : 'grid';
    }

    function slotCount() {
        return LAYOUTS[layout] || 6;
    }

    function camById(id) {
        var want = String(id || '');
        for (var i = 0; i < catalog.length; i++) {
            if (catalog[i].id === want) return catalog[i];
        }
        return null;
    }

    function watchingCount() {
        var n = 0;
        for (var i = 0; i < slots.length; i++) {
            if (slots[i] && slots[i].camId) n += 1;
        }
        return n;
    }

    function updateMeta() {
        var el = $('vms-main-meta');
        if (!el) return;
        var n = watchingCount();
        if (!n) {
            el.textContent = tr('vmsMain.meta', 'Select cameras from the tree');
            return;
        }
        var tpl = tr('vmsMain.watching', '{n} Live');
        el.textContent = String(tpl).replace('{n}', String(n));
    }

    function stopLiveEdge(p) {
        if (!p || !p.edgeTimer) return;
        try { clearInterval(p.edgeTimer); } catch (_) { /* ignore */ }
        p.edgeTimer = null;
    }

    function detachPlayer(p) {
        if (!p) return;
        stopLiveEdge(p);
        if (p.handle && typeof p.handle.destroy === 'function') {
            try { p.handle.destroy(); } catch (_) { /* ignore */ }
            return;
        }
        if (p.video) detachVideo(p.video);
    }

    function detachVideo(video) {
        if (!video) return;
        try {
            if (global.AxiomFlvManager && typeof global.AxiomFlvManager.detach === 'function') {
                global.AxiomFlvManager.detach(video);
            }
        } catch (_) { /* ignore */ }
        try { video.pause(); } catch (_) { /* ignore */ }
        try { video.removeAttribute('src'); } catch (_) { /* ignore */ }
        try { if (typeof video.unload === 'function') video.unload(); } catch (_) { /* ignore */ }
        try { if (video.load) video.load(); } catch (_) { /* ignore */ }
        try {
            if (video.parentNode) video.parentNode.removeChild(video);
        } catch (_) { /* ignore */ }
    }

    function stopFixedLease(camId) {
        if (!isFixed(camId)) return;
        fetch('/api/fixed-cams/' + encodeURIComponent(rawFixed(camId)) + '/zlm/stop', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER }),
        }).catch(function () { /* lease expires */ });
    }

    function stopBwcClaim(camId) {
        if (!camId || isFixed(camId) || !socket) return;
        try { socket.emit('stop-video', { camId: camId, surface: SURFACE }); } catch (_) { /* ignore */ }
    }

    function clearSlot(i, keepSelect) {
        var rec = slots[i];
        var camId = rec && rec.camId;
        detachPlayer(players[i]);
        delete players[i];
        if (camId) {
            stopFixedLease(camId);
            stopBwcClaim(camId);
            delete picked[i];
        }
        slots[i] = { camId: '', name: '', status: '' };
        paintTile(i);
        if (!keepSelect) markSelected(selectedSlot);
        paintTree();
        updateMeta();
    }

    function clearAll() {
        mountGen += 1;
        picked = {};
        var n = Math.max(slots.length, slotCount());
        for (var i = 0; i < n; i++) clearSlot(i, true);
        ensureSlots();
        selectedSlot = 0;
        markSelected(0);
        updateMeta();
    }

    function setTileStatus(i, status, live) {
        if (!slots[i]) slots[i] = { camId: '', name: '', status: '' };
        slots[i].status = status || '';
        slots[i].live = !!live;
        var tile = document.querySelector('#vms-main-wall .vms-main-tile[data-slot="' + i + '"]');
        if (!tile) return;
        var badge = tile.querySelector('.vms-main-tile-badge');
        if (badge) {
            badge.textContent = status || '';
            badge.hidden = !status;
            badge.classList.toggle('is-live', !!live);
        }
        tile.classList.toggle('is-live', !!live);
        tile.classList.toggle('is-empty', !slots[i].camId);
    }

    function paintTile(i) {
        var tile = document.querySelector('#vms-main-wall .vms-main-tile[data-slot="' + i + '"]');
        if (!tile) return;
        var rec = slots[i] || { camId: '', name: '', status: '' };
        var nameEl = tile.querySelector('.vms-main-tile-name');
        var empty = tile.querySelector('.vms-main-tile-empty');
        if (nameEl) nameEl.textContent = rec.camId ? (rec.name || rec.camId) : '';
        if (empty) empty.hidden = !!rec.camId;
        tile.classList.toggle('is-empty', !rec.camId);
        tile.classList.toggle('is-live', !!rec.live);
        var on = Number(i) === selectedSlot || !!picked[i];
        tile.classList.toggle('is-picked', !!picked[i]);
        tile.classList.toggle('is-selected', on);
        var badge = tile.querySelector('.vms-main-tile-badge');
        if (badge) {
            badge.textContent = rec.status || '';
            badge.hidden = !rec.status;
            badge.classList.toggle('is-live', !!rec.live);
        }
        var close = tile.querySelector('.vms-main-tile-close');
        if (close) close.hidden = !rec.camId;
        var hud = tile.querySelector('.vms-main-tile-hud');
        if (hud) hud.hidden = !rec.camId;
        var pauseBtn = tile.querySelector('[data-vms-hud="pause"]');
        if (pauseBtn) {
            var paused = !!(players[i] && players[i].paused);
            pauseBtn.textContent = paused ? tr('vmsMain.resume', 'Resume') : tr('vmsMain.pause', 'Pause');
        }
        var playBtn = tile.querySelector('[data-vms-hud="play"]');
        if (playBtn) playBtn.hidden = !rec.stopped;
    }

    function putVideoInSlot(i, p) {
        if (!p || !p.video) return;
        var tile = document.querySelector('#vms-main-wall .vms-main-tile[data-slot="' + i + '"]');
        var stage = tile && tile.querySelector('.vms-main-tile-stage');
        if (stage && p.video.parentNode !== stage) stage.appendChild(p.video);
    }

    function swapSlots(a, b) {
        if (a === b) return;
        var sa = slots[a];
        slots[a] = slots[b];
        slots[b] = sa;
        var pa = players[a];
        players[a] = players[b];
        players[b] = pa;
        putVideoInSlot(a, players[a]);
        putVideoInSlot(b, players[b]);
        paintTile(a);
        paintTile(b);
    }

    function markSelected(i) {
        i = Number(i);
        if (isNaN(i) || i < 0) return;
        selectedSlot = i;
        var tiles = document.querySelectorAll('#vms-main-wall .vms-main-tile');
        for (var t = 0; t < tiles.length; t++) {
            tiles[t].classList.toggle('is-selected', Number(tiles[t].getAttribute('data-slot')) === i);
        }
        syncPtz();
    }

    function ensureSlots() {
        var n = slotCount();
        while (slots.length < n) slots.push({ camId: '', name: '', status: '' });
        var wall = $('vms-main-wall');
        if (!wall) return;
        wall.setAttribute('data-layout', layout);
        var tiles = wall.querySelectorAll('.vms-main-tile');
        var i;
        for (i = tiles.length - 1; i >= n; i--) {
            clearSlot(i, true);
            if (tiles[i] && tiles[i].parentNode) tiles[i].parentNode.removeChild(tiles[i]);
        }
        tiles = wall.querySelectorAll('.vms-main-tile');
        for (i = tiles.length; i < n; i++) {
            wall.appendChild(makeTile(i));
            paintTile(i);
        }
        if (selectedSlot >= n) selectedSlot = 0;
        markSelected(selectedSlot);
        var btns = document.querySelectorAll('#vms-main-layout [data-vms-layout]');
        for (var b = 0; b < btns.length; b++) {
            btns[b].classList.toggle('active', btns[b].getAttribute('data-vms-layout') === layout);
        }
    }

    function findSlotByCam(camId) {
        var want = String(camId || '');
        for (var i = 0; i < slotCount(); i++) {
            if (slots[i] && slots[i].camId === want) return i;
        }
        return -1;
    }

    function firstEmpty() {
        for (var i = 0; i < slotCount(); i++) {
            if (!slots[i] || !slots[i].camId) return i;
        }
        return selectedSlot;
    }

    function pickSlot() {
        if (selectedSlot >= 0 && selectedSlot < slotCount()
            && (!slots[selectedSlot] || !slots[selectedSlot].camId)) {
            return selectedSlot;
        }
        return firstEmpty();
    }

    function makeTile(i) {
        var tile = document.createElement('div');
        tile.className = 'vms-main-tile is-empty';
        tile.setAttribute('data-slot', String(i));
        tile.innerHTML =
            '<div class="vms-main-tile-stage">' +
                '<div class="vms-main-tile-empty">' + esc(tr('vmsMain.emptyTile', 'Select a Camera')) + '</div>' +
            '</div>' +
            '<div class="vms-main-tile-hud" hidden>' +
                '<button type="button" data-vms-hud="capture">' + esc(tr('vmsMain.capture', 'Capture')) + '</button>' +
                '<button type="button" data-vms-hud="replay">' + esc(tr('vmsMain.instantReplay', 'Instant Replay')) + '</button>' +
                '<button type="button" data-vms-hud="ptz">' + esc(tr('vmsMain.ptz', 'PTZ')) + '</button>' +
                '<button type="button" data-vms-hud="pause">' + esc(tr('vmsMain.pause', 'Pause')) + '</button>' +
                '<button type="button" data-vms-hud="stop">' + esc(tr('vmsMain.stop', 'Stop')) + '</button>' +
                '<button type="button" data-vms-hud="play" hidden>' + esc(tr('vmsMain.play', 'Play')) + '</button>' +
            '</div>' +
            '<div class="vms-main-tile-bar">' +
                '<span class="vms-main-tile-name"></span>' +
                '<span class="vms-main-tile-badge" hidden></span>' +
                '<button type="button" class="vms-main-tile-close" data-slot="' + i + '" hidden aria-label="Clear">×</button>' +
            '</div>';
        return tile;
    }

    function attachFlv(i, camId, flvUrl, gen) {
        if (gen !== mountGen) return;
        if (!slots[i] || slots[i].camId !== camId) return;
        var tile = document.querySelector('#vms-main-wall .vms-main-tile[data-slot="' + i + '"]');
        var stage = tile && tile.querySelector('.vms-main-tile-stage');
        if (!stage) return;
        var prev = players[i];
        if (prev && prev.camId === camId && prev.flvUrl === flvUrl && prev.video && !prev.paused) return;
        detachPlayer(prev);
        if (!global.AxiomFlvManager || typeof global.AxiomFlvManager.attach !== 'function') return;
        var video = document.createElement('video');
        video.className = 'me8-zlm-primary vms-main-video';
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');
        stage.appendChild(video);
        var handle = global.AxiomFlvManager.attach(video, flvUrl, { withCredentials: true });
        if (gen !== mountGen || !slots[i] || slots[i].camId !== camId || !handle) {
            if (handle && typeof handle.destroy === 'function') {
                try { handle.destroy(); } catch (_) { /* ignore */ }
            } else {
                detachVideo(video);
            }
            return;
        }
        slots[i].stopped = false;
        players[i] = {
            handle: handle,
            video: video,
            camId: camId,
            flvUrl: flvUrl || '',
            paused: false,
        };
        armLiveEdge(players[i]);
        setTileStatus(i, tr('vmsMain.live', 'Live'), true);
        paintTile(i);
    }

    function armLiveEdge(p) {
        stopLiveEdge(p);
        if (!p || !p.video) return;
        p.edgeTimer = setInterval(function () {
            if (!p.video || p.paused) return;
            try {
                var video = p.video;
                if (!video.buffered || !video.buffered.length) return;
                var end = video.buffered.end(video.buffered.length - 1);
                var behind = end - (video.currentTime || 0);
                if (behind > 1.5) video.currentTime = Math.max(0, end - 0.25);
            } catch (_) { /* ignore */ }
        }, 1000);
    }

    function pauseSlot(i) {
        var p = players[i];
        if (!p || !p.video || !slots[i] || !slots[i].camId) return;
        if (p.paused) {
            p.paused = false;
            try {
                var mpeg = p.handle && p.handle.player;
                if (mpeg && typeof mpeg.play === 'function') mpeg.play();
            } catch (_) { /* ignore */ }
            try {
                var playP = p.video.play();
                if (playP && playP.catch) playP.catch(function () { /* ignore */ });
            } catch (_) { /* ignore */ }
            setTileStatus(i, tr('vmsMain.live', 'Live'), true);
        } else {
            p.paused = true;
            try {
                var mpegP = p.handle && p.handle.player;
                if (mpegP && typeof mpegP.pause === 'function') mpegP.pause();
            } catch (_) { /* ignore */ }
            try { p.video.pause(); } catch (_) { /* ignore */ }
            setTileStatus(i, tr('vmsMain.paused', 'Paused'), false);
        }
        paintTile(i);
    }

    function stopSlotPlay(i) {
        var rec = slots[i];
        if (!rec || !rec.camId) return;
        detachPlayer(players[i]);
        delete players[i];
        if (isFixed(rec.camId)) stopFixedLease(rec.camId);
        else stopBwcClaim(rec.camId);
        rec.stopped = true;
        rec.live = false;
        setTileStatus(i, tr('vmsMain.stopped', 'Stopped'), false);
        paintTile(i);
    }

    function playSlot(i) {
        var rec = slots[i];
        if (!rec || !rec.camId) return;
        rec.stopped = false;
        if (isFixed(rec.camId)) startFixed(i, rec.camId, mountGen);
        else startBwc(i, rec.camId);
        paintTile(i);
    }

    function startFixed(i, camId, gen) {
        setTileStatus(i, tr('vmsMain.connecting', 'Connecting'), false);
        fetch('/api/fixed-cams/' + encodeURIComponent(rawFixed(camId)) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: viewMode() }),
        }).then(function (r) {
            return r.json().then(function (j) { return { ok: r.ok, j: j }; });
        }).then(function (res) {
            if (gen !== mountGen) return;
            if (!res.ok || !res.j || !res.j.flvUrl) {
                setTileStatus(i, tr('vmsMain.unavailable', 'Unavailable'), false);
                return;
            }
            attachFlv(i, camId, res.j.flvUrl, gen);
        }).catch(function () {
            if (gen !== mountGen) return;
            setTileStatus(i, tr('vmsMain.unavailable', 'Unavailable'), false);
        });
    }

    function startBwc(i, camId) {
        if (!socket) {
            setTileStatus(i, tr('vmsMain.unavailable', 'Unavailable'), false);
            return;
        }
        setTileStatus(i, tr('vmsMain.connecting', 'Connecting'), false);
        try { socket.emit('start-video', { camId: camId, mode: 'video', surface: SURFACE }); } catch (_) { /* ignore */ }
    }

    function assignCam(camId, slotHint) {
        var cam = camById(camId);
        if (!cam) return;
        var existing = findSlotByCam(cam.id);
        if (existing >= 0) {
            markSelected(existing);
            return;
        }
        var i = (slotHint != null && slotHint >= 0) ? slotHint : pickSlot();
        if (i < 0 || i >= slotCount()) i = 0;
        if (slots[i] && slots[i].camId) clearSlot(i, true);
        slots[i] = { camId: cam.id, name: cam.name, status: '', live: false };
        paintTile(i);
        if (slotHint == null) markSelected(i);
        var playAt = findSlotByCam(cam.id);
        if (playAt < 0) playAt = i;
        paintTree();
        updateMeta();
        if (!cam.online) {
            setTileStatus(playAt, tr('vmsMain.offline', 'Offline'), false);
            return;
        }
        if (cam.fixed) startFixed(playAt, cam.id, mountGen);
        else startBwc(playAt, cam.id);
    }

    function openOnline() {
        var n = slotCount();
        var used = {};
        var i;
        for (i = 0; i < n; i++) {
            if (slots[i] && slots[i].camId) used[slots[i].camId] = true;
        }
        for (i = 0; i < n; i++) {
            if (slots[i] && slots[i].camId) continue;
            var pick = null;
            for (var c = 0; c < catalog.length; c++) {
                if (!catalog[c].online || used[catalog[c].id]) continue;
                pick = catalog[c];
                break;
            }
            if (!pick) break;
            used[pick.id] = true;
            assignCam(pick.id, i);
        }
    }

    function setLayout(next) {
        next = String(next || '4');
        if (!LAYOUTS[next] || next === layout) return;
        var nextN = LAYOUTS[next];
        var oldN = slotCount();
        for (var d = nextN; d < oldN; d++) {
            if (slots[d] && slots[d].camId) clearSlot(d, true);
        }
        layout = next;
        ensureSlots();
        updateMeta();
        paintTree();
    }

    function matchesFilter(cam) {
        if (!filterText) return true;
        var q = filterText;
        return String(cam.name || '').toLowerCase().indexOf(q) >= 0
            || String(cam.id || '').toLowerCase().indexOf(q) >= 0;
    }

    function paintTree() {
        var root = $('vms-main-tree');
        if (!root) return;
        var groups = [
            { key: 'bwc', title: tr('vmsMain.bodyWorn', 'Body Worn'), items: [] },
            { key: 'fixed', title: tr('vmsMain.fixed', 'Fixed Cameras'), items: [] },
        ];
        for (var i = 0; i < catalog.length; i++) {
            if (!matchesFilter(catalog[i])) continue;
            if (catalog[i].fixed) groups[1].items.push(catalog[i]);
            else groups[0].items.push(catalog[i]);
        }
        var html = [];
        var shown = 0;
        for (var g = 0; g < groups.length; g++) {
            var items = groups[g].items;
            if (!items.length) continue;
            html.push(
                '<details class="vms-main-group" open>' +
                    '<summary>' + esc(groups[g].title) +
                    '<span class="vms-main-group-count">' + items.length + '</span></summary>' +
                    '<div class="vms-main-group-body">'
            );
            for (var k = 0; k < items.length; k++) {
                var cam = items[k];
                var onWall = findSlotByCam(cam.id) >= 0;
                html.push(
                    '<button type="button" class="vms-main-cam' +
                        (cam.online ? ' is-online' : '') +
                        (onWall ? ' is-watching' : '') +
                        '" draggable="true" data-cam-id="' + esc(cam.id) + '">' +
                        '<span class="vms-main-dot' + (cam.online ? ' on' : '') + '"></span>' +
                        '<span class="vms-main-cam-name">' + esc(cam.name) + '</span>' +
                    '</button>'
                );
                shown += 1;
            }
            html.push('</div></details>');
        }
        if (!shown) {
            root.innerHTML = '<div class="vms-main-tree-empty">' +
                esc(tr('vmsMain.emptyTree', 'No cameras registered')) + '</div>';
            return;
        }
        root.innerHTML = html.join('');
    }

    function ingestCatalog(fleet, bwcDevices, fixedCameras) {
        var list = [];
        var seen = {};
        fixedMeta = {};
        var bwcName = {};
        (bwcDevices || []).forEach(function (d) {
            if (d && d.deviceId) bwcName[d.deviceId] = d.operatorName || d.deviceId;
        });
        (fleet || []).forEach(function (d) {
            if (!d || !d.id) return;
            seen[d.id] = true;
            list.push({
                id: String(d.id),
                name: bwcName[d.id] || d.name || d.id,
                online: d.online === true || d.status === '1',
                fixed: false,
            });
        });
        (fixedCameras || []).forEach(function (camera) {
            if (!camera || !camera.id) return;
            if (camera.enabled === false || camera.playable === false) return;
            var id = 'fixed:' + camera.id;
            fixedMeta[String(camera.id)] = {
                ptzEnabled: !!camera.ptzEnabled,
                streamSource: camera.streamSource || '',
            };
            list.push({
                id: id,
                name: camera.name || camera.id,
                online: true,
                fixed: true,
            });
        });
        list.sort(function (a, b) {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return String(a.name).localeCompare(String(b.name));
        });
        catalog = list;
        paintTree();
    }

    function loadCatalog() {
        return Promise.all([
            fetch('/api/fleet', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : {}; }),
            fetch('/api/bwc-devices', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : {}; }),
            fetch('/api/fixed-cams/public', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : {}; }),
        ]).then(function (rows) {
            ingestCatalog(
                (rows[0] && rows[0].fleet) || [],
                (rows[1] && rows[1].devices) || [],
                (rows[2] && rows[2].cams) || []
            );
        }).catch(function () {
            var root = $('vms-main-tree');
            if (root && !catalog.length) {
                root.innerHTML = '<div class="vms-main-tree-empty">' +
                    esc(tr('vmsMain.emptyTree', 'No cameras registered')) + '</div>';
            }
        });
    }

    function surfaceOurs(surface) {
        var s = String(surface || '').trim();
        return !s || s === SURFACE || s === 'vms' || s === 'ops';
    }

    function readyIsVmsMain(surface) {
        var s = String(surface || '').trim().toLowerCase();
        return s === SURFACE || s === 'vms' || s === 'vmsmain';
    }

    function onStreamReady(data) {
        if (!visible || !data || !data.camId) return;
        if (!readyIsVmsMain(data.surface)) return;
        var camId = String(data.camId);
        var i = findSlotByCam(camId);
        if (i < 0) return;
        if (data.wvpVideoHandoff && data.flvUrl) {
            attachFlv(i, camId, data.flvUrl, mountGen);
        }
    }

    function onStreamStopped(data) {
        if (!visible || !data || !data.camId) return;
        if (!surfaceOurs(data.surface)) return;
        var i = findSlotByCam(String(data.camId));
        if (i < 0) return;
        var p = players[i];
        detachPlayer(p);
        delete players[i];
        if (slots[i]) slots[i].live = false;
        setTileStatus(i, tr('vmsMain.unavailable', 'Unavailable'), false);
    }

    function paintPtzChrome() {
        var overlay = $('vms-main-ptz-overlay');
        var pin = $('vms-main-ptz-pin');
        if (overlay) overlay.hidden = !ptzOpen;
        if (pin) {
            pin.setAttribute('aria-pressed', ptzPinned ? 'true' : 'false');
            pin.textContent = ptzPinned ? tr('vmsMain.kept', 'Kept') : tr('vmsMain.keep', 'Keep');
        }
    }

    function showPtz() {
        ptzOpen = true;
        ensurePtz();
        paintPtzChrome();
        syncPtz();
    }

    function hidePtz() {
        ptzOpen = false;
        ptzPinned = false;
        if (ptzJoy && ptzJoy.setVisible) ptzJoy.setVisible(false);
        paintPtzChrome();
    }

    function ensurePtz() {
        var host = $('vms-main-ptz');
        if (!host || ptzJoy) return;
        if (!global.VmsPtzJoystick || typeof global.VmsPtzJoystick.create !== 'function') return;
        ptzJoy = global.VmsPtzJoystick.create(host, {
            showNumpad: false,
            isFloating: false,
            proChrome: true,
            classPrefix: 'cw-',
        }, {
            onClose: function () {
                hidePtz();
            },
        });
    }

    function syncPtz() {
        if (ptzPinned && !ptzOpen) showPtz();
        if (!ptzOpen) return;
        if (!ptzJoy || !ptzJoy.setTarget) return;
        var rec = slots[selectedSlot];
        if (!rec || !rec.camId) {
            ptzJoy.setTarget(null, {
                hasPtz: false,
                label: '—',
                ptzTabEnabled: false,
                tab: 'digi',
            });
            if (ptzJoy.setVisible) ptzJoy.setVisible(true);
            return;
        }
        var meta = isFixed(rec.camId) ? (fixedMeta[rawFixed(rec.camId)] || {}) : {};
        var hasPtz = !!(meta.ptzEnabled && meta.streamSource === 'onvif');
        var lab = !!(ptzJoy.isLabMock && ptzJoy.isLabMock());
        var apiId = isFixed(rec.camId) ? rawFixed(rec.camId) : (lab ? rec.camId : null);
        ptzJoy.setTarget(apiId, {
            hasPtz: !!(apiId && hasPtz),
            labMock: lab && !hasPtz,
            label: rec.name || rec.camId,
            ptzTabEnabled: !!(hasPtz || lab),
            tab: (hasPtz || lab) ? 'ptz' : 'digi',
        });
        if (ptzJoy.setVisible) ptzJoy.setVisible(true);
    }

    function captureSlot(i) {
        var p = players[i];
        var video = p && p.video;
        if (!video || !video.videoWidth) return;
        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        try { canvas.getContext('2d').drawImage(video, 0, 0); } catch (_) { return; }
        var link = document.createElement('a');
        var name = String((slots[i] && slots[i].name) || 'camera').replace(/[^\w\-]+/g, '_');
        link.download = name + '.png';
        try { link.href = canvas.toDataURL('image/png'); } catch (_) { return; }
        link.click();
    }

    function instantReplay(i) {
        var camId = slots[i] && slots[i].camId ? String(slots[i].camId) : '';
        try { sessionStorage.setItem('vmsMainReplayCam', camId); } catch (_) { /* ignore */ }
        if (global.EvidenceManager && typeof global.EvidenceManager.showTab === 'function') {
            global.EvidenceManager.showTab('playback');
        }
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        var wall = $('vms-main-wall');
        var tree = $('vms-main-tree');
        var search = $('vms-main-tree-search');
        var layouts = $('vms-main-layout');
        var clearBtn = $('vms-main-clear');
        var openBtn = $('vms-main-open-online');
        if (wall) {
            wall.addEventListener('click', function (ev) {
                var hud = ev.target && ev.target.closest ? ev.target.closest('[data-vms-hud]') : null;
                if (hud && wall.contains(hud)) {
                    ev.preventDefault();
                    var hudTile = hud.closest('.vms-main-tile');
                    var hudSlot = hudTile ? Number(hudTile.getAttribute('data-slot')) : -1;
                    if (hud.getAttribute('data-vms-hud') === 'capture') captureSlot(hudSlot);
                    else if (hud.getAttribute('data-vms-hud') === 'replay') instantReplay(hudSlot);
                    else if (hud.getAttribute('data-vms-hud') === 'pause') pauseSlot(hudSlot);
                    else if (hud.getAttribute('data-vms-hud') === 'stop') stopSlotPlay(hudSlot);
                    else if (hud.getAttribute('data-vms-hud') === 'play') playSlot(hudSlot);
                    else if (hud.getAttribute('data-vms-hud') === 'ptz') {
                        markSelected(hudSlot);
                        showPtz();
                    }
                    return;
                }
                var close = ev.target && ev.target.closest ? ev.target.closest('.vms-main-tile-close') : null;
                if (close) {
                    ev.preventDefault();
                    clearSlot(Number(close.getAttribute('data-slot')), true);
                    syncPtz();
                    return;
                }
                var tile = ev.target && ev.target.closest ? ev.target.closest('.vms-main-tile') : null;
                if (!tile || !wall.contains(tile)) return;
                var clickSlot = Number(tile.getAttribute('data-slot'));
                markSelected(clickSlot);
                if (pickMode) {
                    picked[clickSlot] = true;
                    paintPickBar();
                }
            });
            wall.addEventListener('dragover', function (ev) {
                ev.preventDefault();
                if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
                var over = ev.target && ev.target.closest ? ev.target.closest('.vms-main-tile') : null;
                var tiles = wall.querySelectorAll('.vms-main-tile.is-drop-target');
                for (var t = 0; t < tiles.length; t++) {
                    if (tiles[t] !== over) tiles[t].classList.remove('is-drop-target');
                }
                if (over && wall.contains(over)) over.classList.add('is-drop-target');
            });
            wall.addEventListener('dragleave', function (ev) {
                var to = ev.relatedTarget;
                if (to && wall.contains(to)) return;
                var left = wall.querySelectorAll('.vms-main-tile.is-drop-target');
                for (var l = 0; l < left.length; l++) left[l].classList.remove('is-drop-target');
            });
            wall.addEventListener('drop', function (ev) {
                ev.preventDefault();
                var drops = wall.querySelectorAll('.vms-main-tile.is-drop-target');
                for (var d = 0; d < drops.length; d++) drops[d].classList.remove('is-drop-target');
                var tile = ev.target && ev.target.closest ? ev.target.closest('.vms-main-tile') : null;
                if (!tile || !wall.contains(tile)) return;
                var camId = ev.dataTransfer ? String(ev.dataTransfer.getData('text/plain') || '').trim() : '';
                if (!camId) return;
                var dropSlot = Number(tile.getAttribute('data-slot'));
                assignCam(camId, dropSlot);
                markSelected(dropSlot);
            });
        }
        if (tree) {
            tree.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest ? ev.target.closest('.vms-main-cam') : null;
                if (!btn || !tree.contains(btn)) return;
                assignCam(btn.getAttribute('data-cam-id'));
            });
            tree.addEventListener('dragstart', function (ev) {
                var btn = ev.target && ev.target.closest ? ev.target.closest('.vms-main-cam') : null;
                if (!btn || !tree.contains(btn)) {
                    ev.preventDefault();
                    return;
                }
                var camId = String(btn.getAttribute('data-cam-id') || '');
                if (!camId) {
                    ev.preventDefault();
                    return;
                }
                if (ev.dataTransfer) {
                    ev.dataTransfer.setData('text/plain', camId);
                    ev.dataTransfer.effectAllowed = 'copy';
                }
            });
        }
        if (search) {
            search.addEventListener('input', function () {
                filterText = String(search.value || '').trim().toLowerCase();
                paintTree();
            });
        }
        if (layouts) {
            layouts.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest ? ev.target.closest('[data-vms-layout]') : null;
                if (!btn) return;
                setLayout(btn.getAttribute('data-vms-layout'));
            });
        }
        if (clearBtn) clearBtn.addEventListener('click', function () { clearAll(); });
        if (openBtn) openBtn.addEventListener('click', function () { openOnline(); });
        var pickCancel = $('vms-main-pick-cancel');
        var pickOk = $('vms-main-pick-ok');
        if (pickCancel) pickCancel.addEventListener('click', function () { endPickMode(); });
        if (pickOk) pickOk.addEventListener('click', function () { confirmPickMode(); });
        var pinBtn = $('vms-main-ptz-pin');
        var closePtz = $('vms-main-ptz-close');
        if (pinBtn) {
            pinBtn.addEventListener('click', function () {
                ptzPinned = !ptzPinned;
                if (ptzPinned) showPtz();
                else paintPtzChrome();
            });
        }
        if (closePtz) closePtz.addEventListener('click', function () { hidePtz(); });
    }

    function bindSocket(sock) {
        socket = sock || socket || global.__mobilityDashboardSocket || null;
        if (!socket || socket.__vmsMainLiveBound) return;
        socket.__vmsMainLiveBound = true;
        socket.on('connect', function () { if (visible) loadCatalog(); });
        socket.on('fleet-roster', function () { if (visible) loadCatalog(); });
        socket.on('video-stream-ready', onStreamReady);
        socket.on('video-stream-stopped', onStreamStopped);
    }

    function startHeartbeat() {
        if (heartbeatTimer) return;
        heartbeatTimer = setInterval(function () {
            if (!visible) return;
            var seen = {};
            for (var i = 0; i < slotCount(); i++) {
                var id = slots[i] && slots[i].camId;
                if (!id || !isFixed(id) || seen[id] || !players[i]) continue;
                seen[id] = true;
                fetch('/api/fixed-cams/' + encodeURIComponent(rawFixed(id)) + '/zlm/start', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owner: OWNER, viewMode: viewMode() }),
                }).catch(function () { /* next tick */ });
            }
        }, HEARTBEAT_MS);
    }

    function onShow() {
        visible = true;
        bindUi();
        bindSocket(global.__mobilityDashboardSocket);
        ensureSlots();
        ensurePtz();
        loadCatalog();
        startHeartbeat();
        try {
            if (typeof I18n !== 'undefined' && I18n.scheduleApply) I18n.scheduleApply($('app-view-vms-main'));
        } catch (_) { /* ignore */ }
        updateMeta();
        if (ptzPinned) showPtz();
        else paintPtzChrome();
    }

    function onHide() {
        if (!visible) return;
        visible = false;
        endPickMode();
        ptzOpen = false;
        if (ptzJoy && ptzJoy.setVisible) ptzJoy.setVisible(false);
        paintPtzChrome();
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function init(sock) {
        bindUi();
        bindSocket(sock || global.__mobilityDashboardSocket);
        if (!slots.length) ensureSlots();
    }

    function getMatrixSlotCount() {
        return slotCount();
    }

    function getMatrixSlotInfo(slotIndex) {
        var rec = slots[slotIndex] || { camId: '', name: '', status: '' };
        var p = players[slotIndex];
        return {
            slotIndex: slotIndex,
            panelNum: slotIndex + 1,
            camId: rec.camId || '',
            label: rec.name || rec.camId || '',
            status: rec.status || '',
            hasLive: !!(p && p.video),
            audioMuted: !(p && p.video && p.video.muted === false),
        };
    }

    function getMatrixSlotVideo(slotIndex) {
        var p = players[slotIndex];
        return (p && p.video) || null;
    }

    function getHandoffFlvUrlForCam(camId) {
        var want = String(camId || '');
        if (!want) return '';
        var i = findSlotByCam(want);
        if (i < 0) return '';
        return (players[i] && players[i].flvUrl) || '';
    }

    function playMatrixSlot() {
        return true;
    }

    function stopMatrixSlot() {
        return false;
    }

    function getSelectedSlot() {
        return selectedSlot;
    }

    function getMatrixPicks() {
        var out = [];
        var n = slotCount();
        for (var i = 0; i < n; i++) {
            if (picked[i]) out.push(i);
        }
        return out;
    }

    function paintPickBar() {
        var bar = $('vms-main-pick-bar');
        var wall = $('vms-main-wall');
        var btn = $('vms-main-matrix');
        if (bar) bar.hidden = !pickMode;
        if (wall) wall.classList.toggle('is-picking', pickMode);
        if (btn) btn.classList.toggle('active', pickMode);
        var n = slotCount();
        for (var i = 0; i < n; i++) paintTile(i);
    }

    function endPickMode() {
        pickMode = false;
        picked = {};
        paintPickBar();
    }

    function enterPickMode() {
        pickMode = true;
        if (selectedSlot >= 0) picked[selectedSlot] = true;
        paintPickBar();
    }

    function confirmPickMode() {
        if (!pickMode) return;
        var indices = getMatrixPicks();
        if (!indices.length && selectedSlot >= 0) indices = [selectedSlot];
        endPickMode();
        if (!indices.length) return;
        if (global.VideoMatrix && typeof VideoMatrix.openMatrixPopout === 'function') {
            if (typeof VideoMatrix.openFromVms === 'function') VideoMatrix.openFromVms(indices);
            else VideoMatrix.openMatrixPopout(indices);
        }
    }

    function toggleMatrixSlotAudio(slotIndex) {
        var p = players[slotIndex];
        if (!p || !p.video) return false;
        var next = p.video.muted !== false;
        var n = slotCount();
        for (var i = 0; i < n; i++) {
            if (players[i] && players[i].video) players[i].video.muted = true;
        }
        p.video.muted = !next ? true : false;
        return true;
    }

    global.VmsMainLive = {
        init: init,
        onShow: onShow,
        onHide: onHide,
        getMatrixSlotCount: getMatrixSlotCount,
        getMatrixSlotInfo: getMatrixSlotInfo,
        getMatrixSlotVideo: getMatrixSlotVideo,
        getHandoffFlvUrlForCam: getHandoffFlvUrlForCam,
        playMatrixSlot: playMatrixSlot,
        stopMatrixSlot: stopMatrixSlot,
        toggleMatrixSlotAudio: toggleMatrixSlotAudio,
        getSelectedSlot: getSelectedSlot,
        getMatrixPicks: getMatrixPicks,
        enterPickMode: enterPickMode,
    };
})(typeof window !== 'undefined' ? window : this);
