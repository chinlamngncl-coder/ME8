/**
 * VMS-SPATIAL-WALL2-LAYOUTS-REMOUNT-V1
 * Investigation Window — Command Wall DOM/CSS chrome, full remount on overwrite.
 */
(function (global) {
    'use strict';

    var CH = 'mobility-axiom-vms-wall2';
    var KEY = 'vms-wall2-launch-payload';
    var OWNER = 'vms-investigation';
    var SLOT_COUNT = 6;

    /** 1+5 focus grid (3×3 tracks) — same approach as Command Wall FOCUS_GRID */
    var LAYOUT_1_5 = [
        { col: '1 / 3', row: '1 / 3' },
        { col: '3', row: '1' },
        { col: '3', row: '2' },
        { col: '1', row: '3' },
        { col: '2', row: '3' },
        { col: '3', row: '3' },
    ];

    var channel = null;
    var current = null;
    var players = new Map();
    var mountGen = 0;
    var activeLayout = '2x3';
    var camCatalog = {};
    var camLabels = {};
    var wallSwapBound = false;

    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /** UI-COPY-OPERATOR-VOICE-V1 — labels from launch payload + catalog name; never full UUID. */
    function shortCamFallback(camId) {
        var id = String(camId || '').trim();
        if (!id) return 'Camera';
        if (id.length > 8) return 'Camera ·' + id.slice(-4);
        return 'Camera';
    }

    function chromeCamName(camId) {
        var id = String(camId || '').trim();
        if (!id) return 'Camera';
        if (camLabels[id]) return camLabels[id];
        var cam = camCatalog[id];
        if (cam && cam.name && String(cam.name).trim()) return String(cam.name).trim();
        return shortCamFallback(id);
    }

    function ingestCamLabels(payload) {
        camLabels = {};
        var src = payload && payload.camLabels;
        if (!src || typeof src !== 'object') return;
        Object.keys(src).forEach(function (k) {
            var v = src[k];
            if (v != null && String(v).trim()) camLabels[String(k)] = String(v).trim();
        });
    }

    function resolveLayout(payload) {
        var raw = String((payload && (payload.layout || payload.reason)) || '').toLowerCase();
        if (raw.indexOf('1+5') >= 0 || raw.indexOf('1x5') >= 0 || raw === 'sos' ||
            raw.indexOf('correlat') >= 0 || raw === 'focus') {
            return '1+5';
        }
        return '2x3';
    }

    function buildSlotIds(payload) {
        var live = Array.isArray(payload.livePreview) ? payload.livePreview.slice() : [];
        var pool = Array.isArray(payload.pool) ? payload.pool.slice() : [];
        var slots = [];
        var i;
        for (i = 0; i < 5; i++) slots.push(live[i] || null);
        var sixth = null;
        if (payload.fillHint && payload.fillHint.sixth) sixth = payload.fillHint.sixth;
        else if (pool.length) sixth = pool[0];
        slots.push(sixth);
        return slots;
    }

    function poolRemainder(payload, slotIds) {
        var pool = Array.isArray(payload.pool) ? payload.pool.slice() : [];
        var used = {};
        var i;
        for (i = 0; i < slotIds.length; i++) {
            if (slotIds[i]) used[String(slotIds[i])] = true;
        }
        /* sixth consumed from pool head — drop from side list */
        var out = [];
        for (i = 0; i < pool.length; i++) {
            var id = String(pool[i]);
            if (used[id]) continue;
            out.push(id);
        }
        return out;
    }

    function destroyAllPlayers() {
        mountGen += 1;
        var ids = Array.from(players.keys());
        for (var i = 0; i < ids.length; i++) destroySlot(ids[i]);
        players.clear();
    }

    function destroySlot(camId) {
        var id = String(camId || '');
        var entry = players.get(id);
        if (!entry) return;
        players.delete(id);
        try {
            if (entry.video && global.AxiomFlvManager && typeof global.AxiomFlvManager.detach === 'function') {
                global.AxiomFlvManager.detach(entry.video);
            }
        } catch (_) { /* ignore */ }
        try {
            if (entry.video && entry.video.parentNode) {
                entry.video.parentNode.removeChild(entry.video);
            }
        } catch (_) { /* ignore */ }
        fetch('/api/fixed-cams/' + encodeURIComponent(id) + '/zlm/stop', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'grid' }),
        }).catch(function () { /* lease */ });
    }

    function applyGridChrome(layout) {
        var wall = $('cw-wall');
        if (!wall) return;
        if (layout === '1+5') {
            wall.style.gridTemplateColumns = 'repeat(3, 1fr)';
            wall.style.gridTemplateRows = 'repeat(3, 1fr)';
        } else {
            wall.style.gridTemplateColumns = 'repeat(3, 1fr)';
            wall.style.gridTemplateRows = 'repeat(2, 1fr)';
        }
    }

    function buildCell(slotIndex, camId, layout) {
        var cell = document.createElement('div');
        cell.className = 'cw-cell' + (camId ? ' has-cam' : '');
        cell.dataset.slot = String(slotIndex);
        if (camId) cell.dataset.camId = camId;
        if (layout === '1+5' && LAYOUT_1_5[slotIndex]) {
            cell.style.gridColumn = LAYOUT_1_5[slotIndex].col;
            cell.style.gridRow = LAYOUT_1_5[slotIndex].row;
        }
        var title = camId ? esc(chromeCamName(camId)) : 'Empty';
        cell.innerHTML =
            '<div class="cw-cell-head">' +
            '<span class="cw-cell-name">' + title + '</span>' +
            '<span class="cw-cell-status">' + (camId ? '—' : '') + '</span>' +
            '</div>' +
            '<div class="cw-cell-stage">' +
            '<span class="cw-cell-empty"' + (camId ? ' hidden' : '') + '>Empty</span>' +
            '<div class="cw-cell-streaming-label" hidden>Connecting…</div>' +
            '<div class="cw-cell-offline-overlay" hidden>Unavailable</div>' +
            '</div>';
        return cell;
    }

    function setCellUnavailable(cell) {
        if (!cell) return;
        var st = cell.querySelector('.cw-cell-status');
        var empty = cell.querySelector('.cw-cell-empty');
        var conn = cell.querySelector('.cw-cell-streaming-label');
        var off = cell.querySelector('.cw-cell-offline-overlay');
        if (st) st.textContent = 'Unavailable';
        if (conn) conn.hidden = true;
        if (empty) empty.hidden = true;
        if (off) off.hidden = false;
    }

    function setCellLive(cell) {
        if (!cell) return;
        var st = cell.querySelector('.cw-cell-status');
        var conn = cell.querySelector('.cw-cell-streaming-label');
        var off = cell.querySelector('.cw-cell-offline-overlay');
        var empty = cell.querySelector('.cw-cell-empty');
        if (st) {
            st.textContent = 'Live';
            st.classList.add('live');
        }
        if (conn) conn.hidden = true;
        if (off) off.hidden = true;
        if (empty) empty.hidden = true;
        cell.classList.add('cw-cell-has-live');
    }

    function mountCam(camId, cell, gen) {
        if (!camId || !cell) return;
        if (String(camId).indexOf('ph-cam-') === 0) {
            setCellUnavailable(cell);
            return;
        }
        var stage = cell.querySelector('.cw-cell-stage');
        var conn = cell.querySelector('.cw-cell-streaming-label');
        if (conn) conn.hidden = false;
        fetch('/api/fixed-cams/' + encodeURIComponent(camId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'grid' }),
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
                if (gen !== mountGen) return;
                if (!res.ok || !res.j || !res.j.flvUrl) {
                    setCellUnavailable(cell);
                    return;
                }
                if (!stage || !stage.isConnected) return;
                var video = document.createElement('video');
                video.className = 'me8-zlm-primary';
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                stage.appendChild(video);
                if (global.AxiomFlvManager && typeof global.AxiomFlvManager.attach === 'function') {
                    global.AxiomFlvManager.attach(video, res.j.flvUrl, { withCredentials: true });
                }
                if (gen !== mountGen) {
                    try {
                        if (global.AxiomFlvManager) global.AxiomFlvManager.detach(video);
                    } catch (_) { /* ignore */ }
                    return;
                }
                players.set(String(camId), { video: video, stage: stage });
                setCellLive(cell);
                try { video.play(); } catch (_) { /* ignore */ }
            })
            .catch(function () {
                if (gen !== mountGen) return;
                setCellUnavailable(cell);
            });
    }

    var poolIds = [];
    var DRAG_MIME = 'application/x-inv-pool-cam';
    var poolDragBound = false;
    var wallDropBound = false;

    function findPoolChip(body, id) {
        if (!body) return null;
        var nodes = body.querySelectorAll('.cw-device-chip');
        for (var n = 0; n < nodes.length; n++) {
            if (nodes[n].getAttribute('data-cam-id') === String(id)) return nodes[n];
        }
        return null;
    }

    function updateStageMeta() {
        var meta = $('cw-wall-meta');
        if (!meta) return;
        var liveN = 0;
        for (var i = 0; i < SLOT_COUNT; i++) {
            var cell = getCellBySlotIndex(i);
            if (cell && cell.dataset.camId) liveN += 1;
        }
        var waitN = poolIds.length;
        if (liveN === 0 && waitN === 0) {
            meta.textContent = '';
            meta.hidden = true;
            return;
        }
        meta.hidden = false;
        meta.textContent = liveN + ' on wall · ' + waitN + ' waiting';
    }

    function renderPool(ids) {
        var body = $('cw-roster-body');
        if (!body) return;
        poolIds = Array.isArray(ids) ? ids.map(String) : [];
        bindPoolDrag();
        if (!poolIds.length) {
            body.innerHTML = '<div class="cw-roster-empty">No cameras waiting</div>';
            return;
        }
        body.innerHTML = poolIds.map(function (id) {
            return '<div class="cw-device-chip" data-cam-id="' + esc(id) + '" draggable="true">' +
                '<span class="dot on"></span>' +
                '<div class="cw-device-chip-inner">' +
                '<span class="name">' + esc(chromeCamName(id)) + '</span>' +
                '</div></div>';
        }).join('');

        fetch('/api/fixed-cams/public', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var map = {};
                var list = (data && data.cams) || [];
                for (var i = 0; i < list.length; i++) {
                    map[String(list[i].id)] = list[i];
                    camCatalog[String(list[i].id)] = list[i];
                }
                poolIds.forEach(function (id) {
                    var cam = map[String(id)];
                    var dead = !cam || cam.enabled === false || cam.playable === false ||
                        String(id).indexOf('ph-cam-') === 0;
                    var chip = findPoolChip(body, id);
                    if (!chip) return;
                    if (cam && cam.name) {
                        var nameEl = chip.querySelector('.name');
                        if (nameEl) nameEl.textContent = String(cam.name).trim() || chromeCamName(id);
                    }
                    if (dead) {
                        chip.classList.add('offline');
                        chip.setAttribute('draggable', 'false');
                        chip.draggable = false;
                        var dot = chip.querySelector('.dot');
                        if (dot) { dot.classList.remove('on'); dot.classList.add('off'); }
                        var inner = chip.querySelector('.cw-device-chip-inner');
                        if (inner && !inner.querySelector('.id')) {
                            inner.insertAdjacentHTML('beforeend', '<span class="id">Unavailable</span>');
                        }
                    } else {
                        chip.setAttribute('draggable', 'true');
                        chip.draggable = true;
                    }
                });
            })
            .catch(function () { /* keep chips unmarked */ });
    }

    function bindPoolDrag() {
        var body = $('cw-roster-body');
        if (!body || poolDragBound) return;
        poolDragBound = true;
        body.addEventListener('dragstart', function (ev) {
            var chip = ev.target && ev.target.closest && ev.target.closest('.cw-device-chip');
            if (!chip || !body.contains(chip)) return;
            if (chip.getAttribute('draggable') !== 'true') {
                ev.preventDefault();
                return;
            }
            var id = chip.getAttribute('data-cam-id');
            if (!id || poolIds.indexOf(String(id)) < 0) {
                ev.preventDefault();
                return;
            }
            try {
                ev.dataTransfer.setData(DRAG_MIME, id);
                ev.dataTransfer.setData('text/plain', id);
                ev.dataTransfer.effectAllowed = 'move';
            } catch (_) { /* ignore */ }
        });
    }

    function clearDropTargets(wall) {
        if (!wall) return;
        var nodes = wall.querySelectorAll('.cw-cell.drop-target');
        for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('drop-target');
    }

    function ensureStageOverlays(stage) {
        if (!stage) return;
        if (!stage.querySelector('.cw-cell-empty')) {
            var empty = document.createElement('span');
            empty.className = 'cw-cell-empty';
            empty.hidden = true;
            empty.textContent = 'Empty';
            stage.appendChild(empty);
        }
        if (!stage.querySelector('.cw-cell-streaming-label')) {
            var conn = document.createElement('div');
            conn.className = 'cw-cell-streaming-label';
            conn.hidden = true;
            conn.textContent = 'Connecting…';
            stage.appendChild(conn);
        }
        if (!stage.querySelector('.cw-cell-offline-overlay')) {
            var off = document.createElement('div');
            off.className = 'cw-cell-offline-overlay';
            off.hidden = true;
            off.textContent = 'Unavailable';
            stage.appendChild(off);
        }
    }

    function prepareCellForIncoming(cell, camId) {
        cell.dataset.camId = camId;
        cell.classList.add('has-cam');
        cell.classList.remove('cw-cell-has-live');
        var name = cell.querySelector('.cw-cell-name');
        if (name) name.textContent = chromeCamName(camId);
        var st = cell.querySelector('.cw-cell-status');
        if (st) {
            st.textContent = '—';
            st.classList.remove('live');
        }
        var stage = cell.querySelector('.cw-cell-stage');
        ensureStageOverlays(stage);
        var empty = stage && stage.querySelector('.cw-cell-empty');
        if (empty) empty.hidden = true;
        var off = stage && stage.querySelector('.cw-cell-offline-overlay');
        if (off) off.hidden = true;
    }

    /**
     * VMS-SPATIAL-WALL2-POOL-DRAG-V1 — Pool → grid only.
     */
    function applyPoolDrop(cell, camId) {
        var id = String(camId || '').trim();
        if (!id || !cell) return;
        if (poolIds.indexOf(id) < 0) return;

        var existing = cell.dataset.camId ? String(cell.dataset.camId) : '';
        if (existing === id) return;

        poolIds = poolIds.filter(function (x) { return x !== id; });

        if (!existing) {
            /* Empty cell — mount only, no eviction */
            prepareCellForIncoming(cell, id);
            mountCam(id, cell, mountGen);
        } else {
            destroySlot(existing);
            prepareCellForIncoming(cell, id);
            mountCam(id, cell, mountGen);
            poolIds.push(existing);
        }

        renderPool(poolIds);
        updateStageMeta();

        if (Number(cell.dataset.slot) === 0 && activeLayout === '1+5') {
            refreshCamCatalog(function () { syncPtzBinding(); });
        } else {
            syncPtzBinding();
        }
    }

    function bindWallPoolDrop() {
        var wall = $('cw-wall');
        if (!wall || wallDropBound) return;
        wallDropBound = true;
        wall.addEventListener('dragover', function (ev) {
            var cell = ev.target && ev.target.closest && ev.target.closest('.cw-cell');
            if (!cell || !wall.contains(cell)) return;
            ev.preventDefault();
            try { ev.dataTransfer.dropEffect = 'move'; } catch (_) { /* ignore */ }
            clearDropTargets(wall);
            cell.classList.add('drop-target');
        });
        wall.addEventListener('dragleave', function (ev) {
            var cell = ev.target && ev.target.closest && ev.target.closest('.cw-cell');
            if (!cell) return;
            var rel = ev.relatedTarget;
            if (rel && cell.contains(rel)) return;
            cell.classList.remove('drop-target');
        });
        wall.addEventListener('drop', function (ev) {
            var cell = ev.target && ev.target.closest && ev.target.closest('.cw-cell');
            clearDropTargets(wall);
            if (!cell || !wall.contains(cell)) return;
            ev.preventDefault();
            var id = '';
            try {
                id = ev.dataTransfer.getData(DRAG_MIME) || ev.dataTransfer.getData('text/plain') || '';
            } catch (_) { id = ''; }
            id = String(id).trim();
            if (!id) return;
            applyPoolDrop(cell, id);
        });
        wall.addEventListener('dragend', function () { clearDropTargets(wall); });
    }

    function fullRemount(payload, how) {
        if (!payload || typeof payload !== 'object') return;
        current = payload;
        ingestCamLabels(payload);
        try { sessionStorage.setItem(KEY, JSON.stringify(payload)); } catch (_) { /* ignore */ }

        destroyAllPlayers();
        var gen = mountGen;
        var layout = resolveLayout(payload);
        activeLayout = layout;
        var slotIds = buildSlotIds(payload);
        var remainder = poolRemainder(payload, slotIds);

        applyGridChrome(layout);
        var wall = $('cw-wall');
        if (wall) {
            wall.innerHTML = '';
            wall.setAttribute('data-inv-layout', layout);
            for (var i = 0; i < SLOT_COUNT; i++) {
                var camId = slotIds[i];
                var cell = buildCell(i, camId, layout);
                wall.appendChild(cell);
                if (camId) mountCam(camId, cell, gen);
            }
            bindWallFastSwap();
            bindWallPoolDrop();
        }
        renderPool(remainder);
        updateStageMeta();
        var meta = $('cw-wall-meta');
        if (meta && how === 'overwrite' && !meta.hidden && meta.textContent) {
            meta.textContent = 'Updated · ' + meta.textContent;
        }
        refreshCamCatalog(function () {
            /* Prefer registry names when payload labels missing */
            for (var s = 0; s < SLOT_COUNT; s++) {
                var cell = getCellBySlotIndex(s);
                if (!cell || !cell.dataset.camId) continue;
                var nm = cell.querySelector('.cw-cell-name');
                if (nm) nm.textContent = chromeCamName(cell.dataset.camId);
            }
            renderPool(poolIds.slice());
            syncJoystickVisibility(layout);
            syncPtzBinding();
        });
    }

    /** Operator Slot 1 = data-slot 0 (focus). Slots 2–6 = data-slot 1–5. */
    function getCellBySlotIndex(slotIndex) {
        var wall = $('cw-wall');
        if (!wall) return null;
        return wall.querySelector('.cw-cell[data-slot="' + slotIndex + '"]');
    }

    function focusCamId() {
        var cell = getCellBySlotIndex(0);
        return cell && cell.dataset.camId ? String(cell.dataset.camId) : '';
    }

    function refreshCamCatalog(done) {
        fetch('/api/fixed-cams/public', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                camCatalog = {};
                var list = (data && data.cams) || [];
                for (var i = 0; i < list.length; i++) {
                    camCatalog[String(list[i].id)] = list[i];
                }
                if (typeof done === 'function') done();
            })
            .catch(function () {
                if (typeof done === 'function') done();
            });
    }

    var invPtzJoystick = null;

    function ensureJoystickHud() {
        var hud = $('inv-ptz-hud');
        if (hud && invPtzJoystick) return hud;
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'inv-ptz-hud';
            hud.hidden = true;
            var host = $('app-view-command-wall') || document.body;
            host.appendChild(hud);
        }
        if (!global.VmsPtzJoystick || typeof global.VmsPtzJoystick.create !== 'function') {
            return hud;
        }
        if (!invPtzJoystick) {
            invPtzJoystick = global.VmsPtzJoystick.create(hud, {
                showNumpad: true,
                isFloating: true,
            }, {
                onNumpadClick: function (n) {
                    if (n === 1) {
                        pulseFocusCell();
                        return;
                    }
                    if (n >= 2 && n <= 6) fastSwapWithFocus(n - 1);
                },
            });
        }
        return hud;
    }

    function syncJoystickVisibility(layout) {
        activeLayout = layout === '1+5' ? '1+5' : '2x3';
        ensureJoystickHud();
        if (!invPtzJoystick) return;
        if (activeLayout !== '1+5') {
            invPtzJoystick.setVisible(false);
            return;
        }
        invPtzJoystick.setVisible(true);
    }

    function syncPtzBinding() {
        ensureJoystickHud();
        if (!invPtzJoystick) return;
        var camId = focusCamId();
        var cam = camId ? camCatalog[camId] : null;
        var canPtz = !!(cam && cam.ptzEnabled && cam.streamSource === 'onvif');
        invPtzJoystick.setTarget(camId, {
            hasPtz: canPtz,
            label: camId ? chromeCamName(camId) : 'Empty',
        });
    }

    function pulseFocusCell() {
        var cell = getCellBySlotIndex(0);
        if (!cell) return;
        cell.classList.add('cw-ptz-selected');
        setTimeout(function () { cell.classList.remove('cw-ptz-selected'); }, 450);
    }

    /**
     * Fast-Swap: keep grid shells fixed (CSS grid areas); swap stage media nodes + labels.
     * No destroy/remount — anti-flicker chase.
     * @param {number} satSlotIndex 0-based satellite (1..5) — operator slots 2–6
     */
    function fastSwapWithFocus(satSlotIndex) {
        if (activeLayout !== '1+5') return;
        if (satSlotIndex < 1 || satSlotIndex > 5) return;
        var focus = getCellBySlotIndex(0);
        var sat = getCellBySlotIndex(satSlotIndex);
        if (!focus || !sat) return;
        var satCam = sat.dataset.camId ? String(sat.dataset.camId) : '';
        if (!satCam) return;

        var focusStage = focus.querySelector('.cw-cell-stage');
        var satStage = sat.querySelector('.cw-cell-stage');
        if (!focusStage || !satStage) return;

        var focusCam = focus.dataset.camId ? String(focus.dataset.camId) : '';

        var focusFrag = document.createDocumentFragment();
        var satFrag = document.createDocumentFragment();
        while (focusStage.firstChild) focusFrag.appendChild(focusStage.firstChild);
        while (satStage.firstChild) satFrag.appendChild(satStage.firstChild);
        focusStage.appendChild(satFrag);
        satStage.appendChild(focusFrag);

        if (satCam) focus.dataset.camId = satCam;
        else delete focus.dataset.camId;
        if (focusCam) sat.dataset.camId = focusCam;
        else delete sat.dataset.camId;

        focus.classList.toggle('has-cam', !!satCam);
        sat.classList.toggle('has-cam', !!focusCam);
        focus.classList.toggle('cw-cell-has-live', !!satCam && !!focusStage.querySelector('video'));
        sat.classList.toggle('cw-cell-has-live', !!focusCam && !!satStage.querySelector('video'));

        var focusName = focus.querySelector('.cw-cell-name');
        var satName = sat.querySelector('.cw-cell-name');
        if (focusName) focusName.textContent = satCam ? chromeCamName(satCam) : 'Empty';
        if (satName) satName.textContent = focusCam ? chromeCamName(focusCam) : 'Empty';

        var focusSt = focus.querySelector('.cw-cell-status');
        var satSt = sat.querySelector('.cw-cell-status');
        if (focusSt) {
            focusSt.textContent = satCam ? (focusStage.querySelector('video') ? 'Live' : '—') : '';
            focusSt.classList.toggle('live', !!(satCam && focusStage.querySelector('video')));
        }
        if (satSt) {
            satSt.textContent = focusCam ? (satStage.querySelector('video') ? 'Live' : '—') : '';
            satSt.classList.toggle('live', !!(focusCam && satStage.querySelector('video')));
        }

        if (satCam && players.has(satCam)) players.get(satCam).stage = focusStage;
        if (focusCam && players.has(focusCam)) players.get(focusCam).stage = satStage;

        syncPtzBinding();
        pulseFocusCell();
    }

    function bindWallFastSwap() {
        var wall = $('cw-wall');
        if (!wall || wallSwapBound) return;
        wallSwapBound = true;
        wall.addEventListener('dblclick', function (ev) {
            if (activeLayout !== '1+5') return;
            var cell = ev.target && ev.target.closest && ev.target.closest('.cw-cell');
            if (!cell || !wall.contains(cell)) return;
            var slot = Number(cell.dataset.slot);
            if (!(slot >= 1 && slot <= 5)) return;
            fastSwapWithFocus(slot);
        });
    }

    function post(msg) {
        if (!channel) return;
        try { channel.postMessage(msg); } catch (_) { /* ignore */ }
    }

    /** Persistent Ops-ACK notice — never tears down players or pool. */
    function showOpsAckBanner() {
        var el = $('inv-ops-ack-banner');
        if (!el) {
            el = document.createElement('div');
            el.id = 'inv-ops-ack-banner';
            el.className = 'inv-ops-ack-banner';
            el.setAttribute('role', 'status');
            el.textContent = 'Acknowledged on Operations.';
            var meta = $('cw-wall-meta');
            if (meta && meta.parentNode) meta.parentNode.appendChild(el);
            else document.body.appendChild(el);
        }
        el.textContent = 'Acknowledged on Operations.';
        el.hidden = false;
    }

    function heartbeat() {
        post({ type: 'pong', at: Date.now(), hasPayload: !!current });
    }

    /* ═══ VMS-INVESTIGATION-TIMELINE-V2 — embedded dashboard view ═══ */
    var TIMELINE_OWNER = 'vms-investigation-timeline';
    var TIMELINE_SLOT_COUNT = 6;
    var TIMELINE_H = 72;
    var SEG_Y = 28;
    var SEG_H = 28;
    var PIN_Y = 6;
    var PIN_H = 16;

    var tl = {
        from: null,
        to: null,
        selectedDate: null,
        playheadMs: null,
        markInMs: null,
        markOutMs: null,
        dptzScale: 1,
        playing: false,
        speed: 1,
        focusSlot: 0,
        tiles: [],
        mergedSegments: [],
        mergedAlarms: [],
        metadataFrames: [],
        dragging: false,
        bound: false,
        visible: false,
        layoutMode: 'four',
        treeData: [],
        treeFilter: '',
        calYear: null,
        calMonth: null, /* 1–12 */
        recordingDays: {},
        alarmDays: {},
        alarmDayList: [],
        calOpen: false,
        calDraftDate: null,
        ignoreOutsideClick: false,
    };

    function tlLayoutStatusText(mode) {
        if (mode === 'single') return 'Single Camera · Full Resolution';
        if (mode === 'six') return 'Six Cameras · Independent';
        if (mode === 'compare') return 'Same Camera · Time Compare';
        return 'Four Cameras · Synchronised';
    }

    function tlCompareTimeInput(slot) {
        return document.querySelector('.inv-vms-compare-time[data-slot="' + slot + '"]');
    }

    function tlSyncCompareTimeInput(tile) {
        if (!tile) return;
        var inp = tlCompareTimeInput(tile.slot);
        if (!inp) return;
        if (tile.playheadMs != null) inp.value = tlMsToTimeInput(tile.playheadMs);
    }

    function tlUpdateSlotRailChrome() {
        var live = $('inv-vms-live-view');
        var rail = $('inv-vms-slot-rail');
        var fourPanel = $('inv-vms-rail-four');
        var comparePanel = $('inv-vms-rail-compare');
        var useRail = tl.layoutMode === 'four' || tl.layoutMode === 'compare';
        if (live) live.classList.toggle('is-rail', useRail);
        if (rail) {
            if (useRail) rail.removeAttribute('hidden');
            else rail.setAttribute('hidden', '');
        }
        if (fourPanel) {
            if (tl.layoutMode === 'four') fourPanel.removeAttribute('hidden');
            else fourPanel.setAttribute('hidden', '');
        }
        if (comparePanel) {
            if (tl.layoutMode === 'compare') comparePanel.removeAttribute('hidden');
            else comparePanel.setAttribute('hidden', '');
        }
    }

    function tlUpdateLayoutChrome() {
        tlUpdateLayoutStatus();
        tlUpdateSlotRailChrome();
        var playBtn = $('inv-vms-sync-play');
        if (playBtn) {
            playBtn.textContent = tl.layoutMode === 'single' ? 'Playback' : 'Play All Selected';
        }
        var pauseBtn = $('inv-vms-sync-pause');
        if (pauseBtn) {
            pauseBtn.textContent = tl.layoutMode === 'single' ? 'Pause' : 'Pause All Selected';
        }
        var canvas = $('inv-vms-timeline');
        if (canvas) canvas.setAttribute('aria-label', 'Recording Timeline');
        document.body.classList.toggle('inv-vms-mode-compare', tl.layoutMode === 'compare');
    }

    function tlUpdateLayoutStatus() {
        var el = $('inv-vms-layout-status');
        if (el) el.textContent = tlLayoutStatusText(tl.layoutMode);
    }

    function tlIsCompareSlot(slot) {
        return slot >= 0 && slot <= 3;
    }

    function tlTileActiveInLayout(tile) {
        if (!tile || !tile.camId) return false;
        if (tl.layoutMode === 'single') return tile.slot === tl.focusSlot;
        if (tl.layoutMode === 'compare') return tlIsCompareSlot(tile.slot);
        return true;
    }

    function tlMsToTimeInput(ms) {
        if (!Number.isFinite(ms)) return '';
        var d = new Date(ms);
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function tlCompareDayStartMs() {
        if (tl.selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(tl.selectedDate)) {
            var p = tl.selectedDate.split('-').map(Number);
            return new Date(p[0], p[1] - 1, p[2], 0, 0, 0, 0).getTime();
        }
        if (tl.from) {
            var d = new Date(tl.from.getTime());
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }
        var n = new Date();
        n.setHours(0, 0, 0, 0);
        return n.getTime();
    }

    function tlParseCompareTimeOnDay(timeStr) {
        var m = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return null;
        var day = tlCompareDayStartMs();
        var hh = parseInt(m[1], 10);
        var mm = parseInt(m[2], 10);
        var ss = m[3] != null ? parseInt(m[3], 10) : 0;
        if (hh > 23 || mm > 59 || ss > 59) return null;
        return day + ((hh * 3600) + (mm * 60) + ss) * 1000;
    }

    function tlApplyCompareDefaultTimes() {
        var day = tlCompareDayStartMs();
        var offsets = [0, 6 * 3600000, 12 * 3600000, 18 * 3600000];
        var i;
        for (i = 0; i < 4; i++) {
            var tile = tl.tiles[i];
            if (!tile) continue;
            tile.playheadMs = day + offsets[i];
            if (tl.from && tl.to) {
                tile.playheadMs = Math.max(tl.from.getTime(), Math.min(tl.to.getTime(), tile.playheadMs));
            }
            tlSyncCompareTimeInput(tile);
        }
        if (tl.tiles[tl.focusSlot] && tl.tiles[tl.focusSlot].playheadMs != null) {
            tl.playheadMs = tl.tiles[tl.focusSlot].playheadMs;
        }
    }

    function tlSeekCompareTiles() {
        var promises = [];
        var i;
        for (i = 0; i < 4; i++) {
            var tile = tl.tiles[i];
            if (!tile || !tile.camId || tile.playheadMs == null) continue;
            promises.push(tlSeekTile(tile, tile.playheadMs));
        }
        return Promise.all(promises).then(function () {
            tlDrawTimeline();
            tlDrawOverlays();
            tlUpdateAllTileTransport();
        });
    }

    function tlBindCamFields(tile, camId, camName) {
        tile.camId = camId || null;
        tile.camName = camName || '';
        tile.activeSegmentId = null;
        tile.playing = false;
        if (tile.select) tile.select.value = camId || '';
        if (tile.tile) tile.tile.classList.toggle('has-cam', !!tile.camId);
        var camEl = tile.camLabel || (tile.tile && tile.tile.querySelector('.inv-vms-tile-cam'));
        if (camEl) {
            if (tile.camId) {
                camEl.textContent = tlShortTreeLabel(tile.camName, tile.camId);
                camEl.title = (tile.camName && tile.camName !== tile.camId)
                    ? (tile.camName + ' · ' + tile.camId)
                    : String(tile.camId);
                camEl.hidden = false;
            } else {
                camEl.textContent = '';
                camEl.removeAttribute('title');
                camEl.hidden = true;
            }
        }
        if (tile.video) {
            tile.video.removeAttribute('src');
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(tile.video);
            } catch (_) { /* ignore */ }
            try { tile.video.pause(); } catch (_) { /* ignore */ }
        }
        tlUpdateTileTransport(tile);
    }

    function tlAnyTilePlaying() {
        return tl.tiles.some(function (t) { return !!t.playing; });
    }

    function tlUpdateMasterTransportChrome() {
        var any = tlAnyTilePlaying();
        tl.playing = any;
        var playBtn = $('inv-vms-sync-play');
        var pauseBtn = $('inv-vms-sync-pause');
        if (playBtn) playBtn.hidden = any;
        if (pauseBtn) pauseBtn.hidden = !any;
    }

    function tlUpdateTileTransport(tile) {
        if (!tile || !tile.tile) return;
        var play = tile.tile.querySelector('.inv-vms-tile-play');
        var pause = tile.tile.querySelector('.inv-vms-tile-pause');
        var show = !!tile.camId;
        if (play) {
            play.hidden = !show || !!tile.playing;
            play.disabled = !show;
        }
        if (pause) {
            pause.hidden = !show || !tile.playing;
            pause.disabled = !show;
        }
    }

    function tlUpdateAllTileTransport() {
        tl.tiles.forEach(tlUpdateTileTransport);
        tlUpdateMasterTransportChrome();
    }

    function tlPlayTile(tile) {
        if (!tile || !tile.camId || !tile.video) {
            tlSetMeta('Select a camera on this tile first.');
            return;
        }
        tlOnFocusSlot(tile.slot);
        var at = tile.playheadMs != null ? tile.playheadMs
            : (tl.playheadMs != null ? tl.playheadMs : (tl.from ? tl.from.getTime() : null));
        if (at == null) {
            tlSetMeta('Load Recordings first.');
            return;
        }
        tile.playing = true;
        tlSeekTile(tile, at).then(function () {
            if (!tile.playing || !tile.video) return;
            tile.video.playbackRate = tl.speed;
            try { tile.video.play(); } catch (_) { /* ignore */ }
            tlUpdateAllTileTransport();
        });
    }

    function tlPauseTile(tile) {
        if (!tile) return;
        tile.playing = false;
        if (tile.video) {
            try { tile.video.pause(); } catch (_) { /* ignore */ }
            if (tile.activeSegmentId && Number.isFinite(tile.video.currentTime)) {
                var seg = null;
                var si;
                for (si = 0; si < tile.segments.length; si++) {
                    if (tile.segments[si].segmentId === tile.activeSegmentId) {
                        seg = tile.segments[si];
                        break;
                    }
                }
                if (seg) {
                    tile.playheadMs = tlIsoToMs(seg.start_at) + tile.video.currentTime * 1000;
                    if (tile.slot === tl.focusSlot) tl.playheadMs = tile.playheadMs;
                }
            }
        }
        tlUpdateAllTileTransport();
        tlDrawTimeline();
    }

    function tlDisplaySegments() {
        if (tl.layoutMode === 'four') return tl.mergedSegments;
        var ft = tlFocusTile();
        if (!ft || !ft.camId) return [];
        return (ft.segments || []).map(function (s) {
            return Object.assign({ camId: ft.camId }, s);
        });
    }

    function tlDisplayAlarms() {
        if (tl.layoutMode === 'four') return tl.mergedAlarms;
        var ft = tlFocusTile();
        if (!ft || !ft.camId) return [];
        return (ft.alarms || []).map(function (a) {
            return Object.assign({ camId: ft.camId }, a);
        });
    }

    function tlStoreFocusPlayhead() {
        var ft = tlFocusTile();
        if (ft && tl.playheadMs != null) ft.playheadMs = tl.playheadMs;
    }

    function tlOnFocusSlot(slot) {
        tlStoreFocusPlayhead();
        tl.focusSlot = slot;
        tl.tiles.forEach(function (t, i) {
            if (t.tile) t.tile.classList.toggle('active-focus', i === tl.focusSlot);
        });
        if (tl.layoutMode === 'single') tlApplyLayout('single');
        else if (tl.layoutMode === 'six' || tl.layoutMode === 'compare') {
            var ft = tlFocusTile();
            if (ft) {
                if (ft.playheadMs == null && tl.from) ft.playheadMs = tl.from.getTime();
                if (ft.playheadMs != null) tl.playheadMs = ft.playheadMs;
            }
            if (tl.layoutMode === 'compare') tlSyncCompareTimeInput(ft);
            if (tl.playheadMs != null && tl.layoutMode === 'six') tlSeekAll(tl.playheadMs);
            else tlDrawTimeline();
        }
        tlHighlightTreeSelection(tlFocusTile() ? tlFocusTile().camId : '');
        tlSyncFocusCamBar();
        tl.tiles.forEach(function (t) {
            if (!t.tile) return;
            var stage = t.tile.querySelector('.inv-vms-tile-stage');
            if (stage) stage.classList.remove('is-dptz');
            if (t.video) t.video.style.transform = '';
            if (t.overlay) t.overlay.style.transform = '';
        });
        tlApplyDptz();
        tlDrawOverlays();
    }

    function tlClearAllAssignments(metaMsg) {
        tl.tiles.forEach(function (tile) {
            if (!tile) return;
            tile.segments = [];
            tile.alarms = [];
            tile.playheadMs = null;
            tile.activeSegmentId = null;
            tlBindCamFields(tile, null, '');
            var inp = tlCompareTimeInput(tile.slot);
            if (inp) inp.value = '';
        });
        tl.mergedSegments = [];
        tl.mergedAlarms = [];
        tl.metadataFrames = [];
        tlHighlightTreeSelection('');
        tlMergeTimelineData();
        tlDrawTimeline();
        tlUpdateAllTileTransport();
        tlRefreshRecordingDays();
        tlSyncFocusCamBar();
        if (metaMsg != null) tlSetMeta(metaMsg);
    }

    function tlApplyLayout(mode) {
        var prev = tl.layoutMode;
        var next = mode;
        if (next === 'single' || next === 'four' || next === 'six' || next === 'compare') {
            tl.layoutMode = next;
        }
        if (prev === 'compare' && tl.layoutMode !== 'compare') {
            tlClearAllAssignments('Left Time Compare — click a blue tile, then a camera (or drag onto a slot).');
        } else if (prev !== 'compare' && tl.layoutMode === 'compare') {
            tlClearAllAssignments('Time Compare — select one camera for all four slots, then set each Start time.');
        }
        var grid = $('inv-vms-grid');
        if (grid) {
            grid.setAttribute('data-layout', tl.layoutMode === 'compare' ? 'compare' : tl.layoutMode);
        }
        tl.tiles.forEach(function (t) {
            if (!t.tile) return;
            var show = false;
            if (tl.layoutMode === 'four' || tl.layoutMode === 'six') show = true;
            else if (tl.layoutMode === 'compare') show = tlIsCompareSlot(t.slot);
            else show = t.slot === tl.focusSlot;
            if (show) t.tile.removeAttribute('hidden');
            else t.tile.setAttribute('hidden', '');
        });
        if (tl.layoutMode === 'compare' && tl.focusSlot > 3) tl.focusSlot = 0;
        document.querySelectorAll('.inv-vms-layout-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-layout') === tl.layoutMode);
        });
        tlUpdateLayoutChrome();
        tl.tiles.forEach(function (t) {
            if (!t.video || tlTileActiveInLayout(t)) return;
            try { t.video.pause(); } catch (_) { /* ignore */ }
        });
        if (tl.layoutMode === 'compare') {
            tl.tiles.forEach(tlSyncCompareTimeInput);
            if (tl.tiles.some(function (t) { return t.camId && t.segments && t.segments.length; })) {
                tlSeekCompareTiles();
            } else if (tl.playheadMs != null) {
                tlSeekAll(tl.playheadMs);
            } else {
                tlResizeOverlays();
                tlDrawTimeline();
            }
        } else if (tl.playheadMs != null) {
            tlSeekAll(tl.playheadMs);
        } else {
            tlResizeOverlays();
            tlDrawTimeline();
        }
        tlUpdateAllTileTransport();
    }

    function tlHighlightTreeSelection(camId) {
        var root = $('inv-vms-cam-tree');
        if (!root) return;
        var focusId = '';
        if (camId != null && String(camId).trim()) {
            focusId = String(camId);
        } else {
            var ft = tlFocusTile();
            if (ft && ft.camId) focusId = String(ft.camId);
        }
        var assigned = {};
        tl.tiles.forEach(function (t) {
            if (!t || !t.camId || !tlSlotVisibleInLayout(t.slot)) return;
            if (!assigned[t.camId]) assigned[t.camId] = [];
            assigned[t.camId].push(String(t.slot + 1));
        });
        root.querySelectorAll('.inv-vms-tree-cam').forEach(function (btn) {
            var id = btn.getAttribute('data-cam-id') || '';
            var slots = assigned[id] || null;
            var on = !!slots;
            btn.classList.toggle('is-assigned', on);
            btn.classList.toggle('is-selected', !!(focusId && id === focusId));
            if (on) {
                btn.setAttribute('data-assigned-slots', slots.join(','));
                var base = btn.getAttribute('data-cam-title') || btn.title || id;
                if (!btn.getAttribute('data-cam-title')) {
                    btn.setAttribute('data-cam-title', btn.title || id);
                    base = btn.title || id;
                } else {
                    base = btn.getAttribute('data-cam-title');
                }
                btn.title = base + ' · On slot ' + slots.join(', ');
            } else {
                btn.removeAttribute('data-assigned-slots');
                if (btn.getAttribute('data-cam-title')) {
                    btn.title = btn.getAttribute('data-cam-title');
                }
            }
        });
    }

    function tlSlotVisibleInLayout(slot) {
        var s = Number(slot);
        if (tl.layoutMode === 'single') return s === tl.focusSlot;
        if (tl.layoutMode === 'compare') return s >= 0 && s <= 3;
        if (tl.layoutMode === 'four') return s >= 0 && s <= 3;
        if (tl.layoutMode === 'six') return s >= 0 && s <= 5;
        return s >= 0 && s < TIMELINE_SLOT_COUNT;
    }

    function tlTilesWithCam(camId) {
        var id = String(camId || '');
        var out = [];
        if (!id) return out;
        tl.tiles.forEach(function (t) {
            if (t && t.camId === id && tlSlotVisibleInLayout(t.slot)) out.push(t);
        });
        return out;
    }

    function tlNextEmptyTile() {
        var ft = tlFocusTile();
        if (ft && tlSlotVisibleInLayout(ft.slot) && !ft.camId) return ft;
        var i;
        for (i = 0; i < TIMELINE_SLOT_COUNT; i++) {
            if (!tlSlotVisibleInLayout(i)) continue;
            var t = tl.tiles[i];
            if (t && !t.camId) return t;
        }
        return null;
    }

    function tlClearCamFromVisibleSlots(camId) {
        var owned = tlTilesWithCam(camId);
        owned.forEach(function (t) {
            tlBindCamFields(t, null, '');
        });
        tlRefreshRecordingDays();
        var ft = tlFocusTile();
        tlHighlightTreeSelection(ft && ft.camId ? ft.camId : '');
        if (owned.length) {
            tlSetMeta('Removed from slot ' + (owned[0].slot + 1) +
                (owned.length > 1 ? ('–' + (owned[owned.length - 1].slot + 1)) : '') +
                '. Click a camera to assign to the next empty slot.');
        }
        return owned.length;
    }

    function tlTreePickCamera(cam) {
        if (!cam || !cam.id) return;
        var camId = cam.id;
        var camName = cam.name || cam.id;

        if (tl.layoutMode === 'compare') {
            if (tl.tiles[0] && tl.tiles[0].camId === camId) {
                tlClearAllAssignments('Time Compare cleared. Select a camera for all four slots.');
                return;
            }
            tlAssignCameraToTile(tl.tiles[0], camId, camName);
            tlSyncFocusCamBar();
            return;
        }

        if (tlTilesWithCam(camId).length) {
            tlClearCamFromVisibleSlots(camId);
            tlSyncFocusCamBar();
            return;
        }

        var target = tlNextEmptyTile();
        if (!target) {
            target = tlFocusTile();
            if (!target || !tlSlotVisibleInLayout(target.slot)) target = tl.tiles[0];
            if (!target) return;
            tlSetMeta('All slots full — replaced slot ' + (target.slot + 1) +
                '. Drag onto a slot to choose exactly, or click a highlighted camera to remove it.');
        }
        tlAssignCameraToTile(target, camId, camName);
    }

    function tlAssignCameraToTile(tile, camId, camName) {
        if (!tile) return;
        if (tl.layoutMode === 'compare') {
            var i;
            for (i = 0; i < 4; i++) {
                if (tl.tiles[i]) tlBindCamFields(tl.tiles[i], camId, camName);
            }
            tlHighlightTreeSelection(camId);
            tlRefreshRecordingDays();
            tlSyncFocusCamBar();
            tlSetMeta(camId
                ? ('Time Compare · same camera on four tiles. Set each Start time, then Load Recordings.')
                : '');
            return;
        }
        tlBindCamFields(tile, camId, camName);
        tlOnFocusSlot(tile.slot);
        tlHighlightTreeSelection(tile.camId);
        tlRefreshRecordingDays();
        tlSyncFocusCamBar();
        if (camId) {
            tlSetMeta('Assigned to slot ' + (tile.slot + 1) +
                ' · ' + tlShortTreeLabel(camName, camId) +
                '. Focus bar shows the blue (focus) camera. Load uses all assigned tiles.');
        } else {
            tlSetMeta('');
        }
    }

    function tlTreeFilterText() {
        return String(tl.treeFilter || '').trim().toLowerCase();
    }

    function tlTextMatchesFilter() {
        var parts = [];
        for (var a = 0; a < arguments.length; a++) {
            if (arguments[a] != null && String(arguments[a]).trim()) parts.push(String(arguments[a]).toLowerCase());
        }
        var blob = parts.join(' ');
        var f = tlTreeFilterText();
        return !f || blob.indexOf(f) >= 0;
    }

    function tlTruncateId(id) {
        var s = String(id || '').trim();
        if (!s) return '';
        if (s.length <= 12) return s;
        return s.slice(0, 5) + '…' + s.slice(-4);
    }

    function tlShortTreeLabel(name, id) {
        var idStr = String(id || '').trim();
        var n = String(name || '').trim();
        var shortId = tlTruncateId(idStr);
        if (idStr && n.indexOf(idStr) >= 0) {
            n = n.split(idStr).join('').replace(/\s*[·•|]\s*$/g, '').replace(/^\s*[·•|]\s*/g, '').trim();
        }
        if (!n || n === idStr) return shortId || 'Camera';
        if (shortId && n.indexOf(shortId) < 0) return n + ' · ' + shortId;
        return n;
    }

    function tlMakeTreeCamButton(cam) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inv-vms-tree-cam';
        btn.setAttribute('data-cam-id', cam.id);
        btn.setAttribute('role', 'treeitem');
        btn.draggable = true;
        var fullTitle = (cam.name && String(cam.name) !== String(cam.id))
            ? (String(cam.name).trim() + ' · ' + cam.id)
            : String(cam.id || cam.name || '');
        btn.title = fullTitle;
        btn.setAttribute('data-cam-title', fullTitle);
        btn.textContent = tlShortTreeLabel(cam.name, cam.id);
        btn.addEventListener('click', function () {
            tlTreePickCamera(cam);
        });
        btn.addEventListener('dragstart', function (ev) {
            try {
                ev.dataTransfer.setData('application/x-inv-vms-cam', JSON.stringify({
                    id: cam.id,
                    name: cam.name || cam.id,
                }));
                ev.dataTransfer.setData('text/plain', String(cam.id || ''));
                ev.dataTransfer.effectAllowed = 'copy';
            } catch (_) { /* ignore */ }
            btn.classList.add('is-dragging');
        });
        btn.addEventListener('dragend', function () {
            btn.classList.remove('is-dragging');
            tl.tiles.forEach(function (t) {
                if (t.tile) t.tile.classList.remove('is-drop-target');
            });
        });
        return btn;
    }

    function tlRenderCamTree(tree) {
        tl.treeData = tree || [];
        tlPaintCamTree();
    }

    function tlPaintCamTree() {
        var root = $('inv-vms-cam-tree');
        if (!root) return;
        root.innerHTML = '';
        var filter = tlTreeFilterText();
        var any = false;

        (tl.treeData || []).forEach(function (site) {
            var siteName = site.name || 'Site';
            var siteDetails = document.createElement('details');
            siteDetails.className = 'inv-vms-tree-site';
            siteDetails.open = true;
            var siteSummary = document.createElement('summary');
            siteSummary.textContent = siteName;
            siteDetails.appendChild(siteSummary);

            var siteHas = false;

            (site.zones || []).forEach(function (zone) {
                var zoneName = zone.name || 'Zone';
                var zoneCams = (zone.cameras || []).filter(function (cam) {
                    return tlTextMatchesFilter(siteName, zoneName, cam.name, cam.id);
                });
                if (!zoneCams.length) return;
                siteHas = true;
                any = true;
                var zoneDetails = document.createElement('details');
                zoneDetails.className = 'inv-vms-tree-zone';
                zoneDetails.open = !!filter || zoneCams.length <= 12;
                var zoneSummary = document.createElement('summary');
                zoneSummary.textContent = zoneName;
                zoneDetails.appendChild(zoneSummary);
                zoneCams.forEach(function (cam) {
                    zoneDetails.appendChild(tlMakeTreeCamButton(cam));
                });
                siteDetails.appendChild(zoneDetails);
            });

            var bwcs = (site.bwcDevices || []).filter(function (bwc) {
                return tlTextMatchesFilter(siteName, 'Body-Worn', bwc.operatorName, bwc.deviceId);
            });
            if (bwcs.length) {
                siteHas = true;
                any = true;
                var bwcDetails = document.createElement('details');
                bwcDetails.className = 'inv-vms-tree-group';
                bwcDetails.open = !!filter || bwcs.length <= 12;
                var bwcSummary = document.createElement('summary');
                bwcSummary.textContent = 'Body-Worn Cameras';
                bwcDetails.appendChild(bwcSummary);
                bwcs.forEach(function (bwc) {
                    var id = bwc.deviceId || '';
                    if (!id) return;
                    bwcDetails.appendChild(tlMakeTreeCamButton({
                        id: id,
                        name: bwc.operatorName || id,
                    }));
                });
                siteDetails.appendChild(bwcDetails);
            }

            if (siteHas) root.appendChild(siteDetails);
        });

        if (!any) {
            var empty = document.createElement('p');
            empty.className = 'inv-vms-tree-empty';
            empty.textContent = filter ? 'No cameras match your search.' : 'No cameras in tree.';
            root.appendChild(empty);
        }

        var focused = tlFocusTile();
        if (focused && focused.camId) tlHighlightTreeSelection(focused.camId);
    }

    function tlIsoToMs(s) { return s ? Date.parse(s) : 0; }

    function tlMsToLocalLabel(ms) {
        if (!Number.isFinite(ms)) return '—';
        try {
            var d = new Date(ms);
            var pad = function (n) { return n < 10 ? '0' + n : String(n); };
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
                ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        } catch (_) {
            return '—';
        }
    }

    function tlLocalInput(d) {
        return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    function tlDtParts(val) {
        var s = String(val || '');
        if (s.indexOf('T') < 0) return { date: '', time: '' };
        var p = s.split('T');
        var t = String(p[1] || '').slice(0, 8);
        if (t.length === 5) t += ':00';
        return { date: p[0], time: t };
    }

    function tlFormatDtLabel(val) {
        var p = tlDtParts(val);
        if (!p.date) return '— Select —';
        return p.date + ' ' + (p.time ? p.time.slice(0, 5) : '00:00');
    }

    function tlSyncDtTriggers() {
        var fromEl = $('inv-vms-from');
        var toEl = $('inv-vms-to');
        var fromLab = $('inv-vms-from-label');
        var toLab = $('inv-vms-to-label');
        if (fromLab) fromLab.textContent = tlFormatDtLabel(fromEl && fromEl.value);
        if (toLab) toLab.textContent = tlFormatDtLabel(toEl && toEl.value);
    }

    function tlCloseDtPop(which) {
        var pop = $('inv-vms-' + which + '-pop');
        var btn = $('inv-vms-' + which + '-btn');
        if (pop) pop.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function tlCloseAllDtPops() {
        tlCloseDtPop('from');
        tlCloseDtPop('to');
    }

    function tlDtPad(v) { return v < 10 ? '0' + v : String(v); }

    function tlDtMonthLabel(y, m) {
        try {
            return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
        } catch (_) {
            return y + '-' + tlDtPad(m);
        }
    }

    function tlEnsureDtDraft(which, dateStr) {
        if (!tl.dtDraft) tl.dtDraft = {};
        var d = dateStr || tlTodayDateInput();
        var p = String(d).split('-').map(Number);
        var y = p[0] || new Date().getFullYear();
        var m = p[1] || (new Date().getMonth() + 1);
        tl.dtDraft[which] = { year: y, month: m, date: d };
        return tl.dtDraft[which];
    }

    function tlPaintDtCal(which) {
        var draft = tl.dtDraft && tl.dtDraft[which];
        if (!draft) draft = tlEnsureDtDraft(which, tlTodayDateInput());
        var title = $('inv-vms-' + which + '-cal-title');
        var grid = $('inv-vms-' + which + '-cal-grid');
        var dateEl = $('inv-vms-' + which + '-date');
        if (title) title.textContent = tlDtMonthLabel(draft.year, draft.month);
        if (!grid) return;
        grid.innerHTML = '';
        var y = draft.year;
        var m = draft.month;
        var first = new Date(y, m - 1, 1);
        var startDow = first.getDay();
        var daysInMonth = new Date(y, m, 0).getDate();
        var prevDays = new Date(y, m - 1, 0).getDate();
        var selected = dateEl ? String(dateEl.value || '') : '';
        var today = tlTodayDateInput();
        var i;
        for (i = 0; i < 42; i++) {
            var dayNum;
            var cellY = y;
            var cellM = m;
            var other = false;
            if (i < startDow) {
                dayNum = prevDays - startDow + i + 1;
                cellM = m - 1;
                if (cellM < 1) { cellM = 12; cellY = y - 1; }
                other = true;
            } else if (i >= startDow + daysInMonth) {
                dayNum = i - startDow - daysInMonth + 1;
                cellM = m + 1;
                if (cellM > 12) { cellM = 1; cellY = y + 1; }
                other = true;
            } else {
                dayNum = i - startDow + 1;
            }
            var iso = cellY + '-' + tlDtPad(cellM) + '-' + tlDtPad(dayNum);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = String(dayNum);
            btn.setAttribute('data-date', iso);
            if (other) btn.classList.add('is-other');
            if (iso === selected) btn.classList.add('is-selected');
            if (iso === today) btn.classList.add('is-today');
            if (tl.alarmDays[iso] ||
                (tl.alarmDayList && tl.alarmDayList.indexOf(iso) >= 0)) {
                btn.classList.add('has-alarm');
            }
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var d = ev.currentTarget.getAttribute('data-date');
                if (!d || !dateEl) return;
                dateEl.value = d;
                var parts = d.split('-').map(Number);
                if (tl.dtDraft && tl.dtDraft[which]) {
                    tl.dtDraft[which].date = d;
                    tl.dtDraft[which].year = parts[0];
                    tl.dtDraft[which].month = parts[1];
                }
                tlPaintDtCal(which);
            });
            grid.appendChild(btn);
        }
    }

    function tlOpenDtPop(which) {
        if (typeof tlSetCalOpen === 'function') tlSetCalOpen(false);
        tlCloseAllDtPops();
        tl.ignoreOutsideClick = true;
        setTimeout(function () { tl.ignoreOutsideClick = false; }, 0);
        var hid = $('inv-vms-' + which);
        var dateEl = $('inv-vms-' + which + '-date');
        var timeEl = $('inv-vms-' + which + '-time');
        var pop = $('inv-vms-' + which + '-pop');
        var btn = $('inv-vms-' + which + '-btn');
        var parts = tlDtParts(hid && hid.value);
        var dateStr = parts.date || tlTodayDateInput();
        if (dateEl) dateEl.value = dateStr;
        tlEnsureDtDraft(which, dateStr);
        if (timeEl) {
            timeEl.value = parts.time || (function () {
                var n = new Date();
                return tlDtPad(n.getHours()) + ':' + tlDtPad(n.getMinutes()) + ':' + tlDtPad(n.getSeconds());
            })();
        }
        tl.calYear = tl.dtDraft[which].year;
        tl.calMonth = tl.dtDraft[which].month;
        if (pop) pop.hidden = false;
        if (btn) btn.setAttribute('aria-expanded', 'true');
        tlPaintDtCal(which);
        Promise.resolve(tlRefreshRecordingDays()).then(function () {
            tlPaintDtCal(which);
        });
    }

    function tlDtToday(which) {
        var dateEl = $('inv-vms-' + which + '-date');
        var timeEl = $('inv-vms-' + which + '-time');
        var d = tlTodayDateInput();
        if (dateEl) dateEl.value = d;
        tlEnsureDtDraft(which, d);
        if (timeEl) {
            var n = new Date();
            timeEl.value = tlDtPad(n.getHours()) + ':' + tlDtPad(n.getMinutes()) + ':' + tlDtPad(n.getSeconds());
        }
        tlPaintDtCal(which);
    }

    function tlShiftDtMonth(which, delta) {
        var draft = tl.dtDraft && tl.dtDraft[which];
        if (!draft) draft = tlEnsureDtDraft(which, tlTodayDateInput());
        draft.month += delta;
        if (draft.month < 1) { draft.month = 12; draft.year -= 1; }
        if (draft.month > 12) { draft.month = 1; draft.year += 1; }
        tlPaintDtCal(which);
    }

    function tlCommitDtPop(which) {
        var dateEl = $('inv-vms-' + which + '-date');
        var timeEl = $('inv-vms-' + which + '-time');
        var hid = $('inv-vms-' + which);
        if (!dateEl || !timeEl || !hid) return;
        var d = String(dateEl.value || '').trim();
        var t = String(timeEl.value || '').trim();
        if (!d || !t) {
            tlSetMeta('Pick date and time, then OK.');
            return;
        }
        var hm = t.length >= 5 ? t.slice(0, 5) : t;
        hid.value = d + 'T' + hm;
        tlSyncDtTriggers();
        tlCloseDtPop(which);
        var fromEl = $('inv-vms-from');
        var toEl = $('inv-vms-to');
        if (fromEl && toEl && fromEl.value && toEl.value) {
            var a = new Date(fromEl.value);
            var b = new Date(toEl.value);
            if (!(b > a)) {
                tlSetMeta('Start time is after End time. Swap them, or use Calendar.');
                return;
            }
            tlLoadTimeline({ useDate: false });
            return;
        }
        tlSetMeta('Set both Start Time and End Time, then OK — or use Calendar.');
    }

    function tlSetMeta(msg) {
        var el = $('inv-vms-meta');
        if (el) el.textContent = msg || '';
    }

    function tlPinColor(eventType) {
        var t = String(eventType || '').toLowerCase();
        if (t.indexOf('sos') >= 0 || t.indexOf('distress') >= 0 || t.indexOf('fall') >= 0) return '#ef4444';
        if (t.indexOf('tamper') >= 0 || t.indexOf('motion') >= 0 || t.indexOf('intrusion') >= 0) return '#fbbf24';
        if (t.indexOf('fr') >= 0 || t.indexOf('face') >= 0 || t.indexOf('anpr') >= 0 ||
            t.indexOf('weapon') >= 0 || t.indexOf('ai') >= 0 || t.indexOf('analytics') >= 0) return '#22d3ee';
        return '#22d3ee';
    }

    function tlSegmentCoversMs(ms, camId) {
        if (!Number.isFinite(ms)) return false;
        var segs = tl.mergedSegments || [];
        if (!segs.length) {
            var ft = tlFocusTile();
            if (ft && ft.segments) {
                segs = ft.segments.map(function (s) {
                    return Object.assign({ camId: ft.camId }, s);
                });
            }
        }
        var i;
        for (i = 0; i < segs.length; i++) {
            var s = segs[i];
            if (!s) continue;
            if (camId && s.camId && String(s.camId) !== String(camId)) continue;
            var a = tlIsoToMs(s.start_at);
            var b = tlIsoToMs(s.end_at);
            if (!Number.isFinite(a)) continue;
            if (!Number.isFinite(b) || b < a) b = a + 1;
            if (ms >= a && ms <= b) return true;
        }
        return false;
    }

    function tlCloseAlarmPreview() {
        var panel = $('inv-vms-alarm-preview');
        if (panel) panel.hidden = true;
        var img = $('inv-vms-alarm-preview-img');
        if (img) {
            img.hidden = true;
            img.removeAttribute('src');
        }
    }

    function tlOpenAlarmPreview(al) {
        if (!al) return;
        var panel = $('inv-vms-alarm-preview');
        if (!panel) return;
        var ms = tlIsoToMs(al.occurred_at);
        var camId = String(al.camId || (tlFocusTile() && tlFocusTile().camId) || '').trim();
        var typeEl = $('inv-vms-alarm-preview-type');
        var whenEl = $('inv-vms-alarm-preview-when');
        var camEl = $('inv-vms-alarm-preview-cam');
        var noteEl = $('inv-vms-alarm-preview-note');
        var snapEl = $('inv-vms-alarm-preview-snap');
        var recEl = $('inv-vms-alarm-preview-rec');
        var img = $('inv-vms-alarm-preview-img');
        var et = String(al.event_type || 'event');
        var note = String(al.note || '');
        if (typeEl) typeEl.textContent = 'Type · ' + et;
        if (whenEl) {
            whenEl.textContent = 'Time · ' + (Number.isFinite(ms) ? new Date(ms).toLocaleString() : String(al.occurred_at || '—'));
        }
        if (camEl) {
            var focus = tlFocusTile();
            var camName = (focus && focus.camId === camId && focus.camName) ? focus.camName : camId;
            camEl.textContent = 'Camera · ' + (camName || '—');
        }
        if (noteEl) noteEl.textContent = note || '—';
        if (img) {
            img.hidden = true;
            img.removeAttribute('src');
        }
        if (snapEl) snapEl.textContent = 'Looking up snapshot…';
        var hasRec = tlSegmentCoversMs(ms, camId);
        if (recEl) {
            recEl.textContent = hasRec
                ? 'Recording available at this time.'
                : 'No recording at this time.';
        }
        panel.hidden = false;
        if (hasRec && Number.isFinite(ms)) {
            tlPauseVideos();
            tlSeekAll(ms);
        } else {
            tlPauseVideos();
            if (Number.isFinite(ms)) tl.playheadMs = ms;
            tlUpdateTimelineChrome();
            tlDrawTimeline();
        }
        var url = '/api/vms/alarm-event-preview?camId=' + encodeURIComponent(camId) +
            '&occurredAt=' + encodeURIComponent(String(al.occurred_at || '')) +
            '&eventType=' + encodeURIComponent(et) +
            '&note=' + encodeURIComponent(note.slice(0, 200)) +
            '&markerId=' + encodeURIComponent(String(al.id || ''));
        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.ok) throw new Error('preview');
                if (d.previewUrl && img) {
                    img.onload = function () { img.hidden = false; };
                    img.onerror = function () {
                        img.hidden = true;
                        if (snapEl) snapEl.textContent = 'No snapshot for this event.';
                    };
                    img.src = d.previewUrl;
                    if (snapEl) snapEl.textContent = '';
                } else if (snapEl) {
                    snapEl.textContent = 'No snapshot for this event.';
                }
            })
            .catch(function () {
                if (snapEl) snapEl.textContent = 'No snapshot for this event.';
            });
    }

    function tlParseAlarmMeta(al) {
        try {
            var n = al && al.note;
            if (n && String(n).trim().charAt(0) === '{') return JSON.parse(n);
        } catch (_) { /* ignore */ }
        return null;
    }

    function tlBindTileDrop(tile) {
        if (!tile || !tile.tile || tile._dropBound) return;
        tile._dropBound = true;
        tile.tile.addEventListener('dragover', function (ev) {
            if (!ev.dataTransfer) return;
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
            tile.tile.classList.add('is-drop-target');
        });
        tile.tile.addEventListener('dragleave', function (ev) {
            if (ev.relatedTarget && tile.tile.contains(ev.relatedTarget)) return;
            tile.tile.classList.remove('is-drop-target');
        });
        tile.tile.addEventListener('drop', function (ev) {
            ev.preventDefault();
            tile.tile.classList.remove('is-drop-target');
            var raw = '';
            try { raw = ev.dataTransfer.getData('application/x-inv-vms-cam'); } catch (_) { /* ignore */ }
            var camId = '';
            var camName = '';
            if (raw) {
                try {
                    var parsed = JSON.parse(raw);
                    camId = parsed && parsed.id ? String(parsed.id) : '';
                    camName = parsed && parsed.name ? String(parsed.name) : camId;
                } catch (_) { /* ignore */ }
            }
            if (!camId) {
                try { camId = String(ev.dataTransfer.getData('text/plain') || '').trim(); } catch (_) { /* ignore */ }
                camName = camId;
            }
            if (!camId) return;
            tlOnFocusSlot(tile.slot);
            tlAssignCameraToTile(tile, camId, camName || camId);
        });
    }

    function tlInitTiles() {
        tl.tiles = [];
        var i;
        for (i = 0; i < TIMELINE_SLOT_COUNT; i++) {
            var tileEl = document.querySelector('.inv-vms-tile[data-slot="' + i + '"]');
            var camLabel = document.querySelector('.inv-vms-tile-cam[data-slot="' + i + '"]');
            if (camLabel) {
                camLabel.textContent = '';
                camLabel.hidden = true;
            }
            var tile = {
                slot: i,
                camId: null,
                camName: '',
                segments: [],
                alarms: [],
                activeSegmentId: null,
                playheadMs: null,
                playing: false,
                video: document.querySelector('.inv-vms-video[data-slot="' + i + '"]'),
                overlay: document.querySelector('.inv-vms-overlay[data-slot="' + i + '"]'),
                select: document.querySelector('.inv-vms-cam-select[data-slot="' + i + '"]'),
                status: document.querySelector('.inv-vms-tile-status[data-slot="' + i + '"]'),
                camLabel: camLabel,
                tile: tileEl,
            };
            tl.tiles.push(tile);
            tlBindTileDrop(tile);
        }
        tlUpdateAllTileTransport();
    }

    function tlResizeOverlays() {
        tl.tiles.forEach(function (tile) {
            if (!tile.video || !tile.overlay) return;
            var w = tile.video.clientWidth;
            var h = tile.video.clientHeight;
            if (w < 2 || h < 2) return;
            tile.overlay.width = w;
            tile.overlay.height = h;
        });
    }

    function tlMergeTimelineData() {
        var segs = [];
        var alarms = [];
        tl.tiles.forEach(function (tile) {
            if (!tile.camId) return;
            (tile.segments || []).forEach(function (s) {
                segs.push(Object.assign({ camId: tile.camId }, s));
            });
            (tile.alarms || []).forEach(function (a) {
                alarms.push(Object.assign({ camId: tile.camId }, a));
            });
        });
        segs.sort(function (a, b) { return tlIsoToMs(a.start_at) - tlIsoToMs(b.start_at); });
        alarms.sort(function (a, b) { return tlIsoToMs(a.occurred_at) - tlIsoToMs(b.occurred_at); });
        tl.mergedSegments = segs;
        tl.mergedAlarms = alarms;
        tl.metadataFrames = [];
        alarms.forEach(function (al) {
            var meta = tlParseAlarmMeta(al);
            if (meta && meta.bbox) {
                tl.metadataFrames.push({
                    camId: al.camId,
                    atMs: tlIsoToMs(al.occurred_at),
                    bbox: meta.bbox,
                    label: meta.label || al.event_type || '',
                });
            }
        });
    }

    async function tlLoadCameraTree() {
        try {
            var r = await fetch('/api/vms/tree', { credentials: 'same-origin' });
            var d = await r.json();
            if (!d.ok) throw new Error(d.error || 'tree error');
            tl.treeCams = tlCollectTreeCams(d.tree || []);
            tlRenderCamTree(d.tree || []);
            tl.tiles.forEach(function (tile) {
                if (!tile.select) return;
                var cur = tile.camId || '';
                tile.select.innerHTML = '<option value="">— Camera —</option>';
                (tl.treeCams || []).forEach(function (cam) {
                    var opt = document.createElement('option');
                    opt.value = cam.id;
                    opt.textContent = cam.label;
                    tile.select.appendChild(opt);
                });
                if (cur) tile.select.value = cur;
            });
            tlSyncFocusCamBar();
        } catch (e) {
            tlSetMeta('Camera tree error.');
        }
    }

    function tlCollectTreeCams(tree) {
        var out = [];
        var seen = {};
        function pushCam(id, name, label) {
            var cid = String(id || '').trim();
            if (!cid || seen[cid]) return;
            seen[cid] = true;
            out.push({
                id: cid,
                name: name || cid,
                label: label || (name || cid)
            });
        }
        (tree || []).forEach(function (site) {
            var siteName = site.name || 'Site';
            (site.zones || []).forEach(function (zone) {
                var zoneName = zone.name || 'Zone';
                (zone.cameras || []).forEach(function (cam) {
                    if (!cam || !cam.id) return;
                    camCatalog[String(cam.id)] = cam;
                    pushCam(
                        cam.id,
                        cam.name || cam.id,
                        siteName + ' › ' + zoneName + ' › ' + (cam.name || cam.id)
                    );
                });
            });
            (site.bwcDevices || []).forEach(function (bwc) {
                var id = bwc.deviceId || bwc.id || '';
                if (!id) return;
                var nm = bwc.operatorName || bwc.name || id;
                camCatalog[String(id)] = { id: id, name: nm, type: 'bwc' };
                pushCam(id, nm, siteName + ' › Body-Worn › ' + nm);
            });
        });
        return out;
    }

    function tlSyncFocusCamBar() {
        var sel = $('inv-vms-focus-cam');
        if (!sel) return;
        var focus = tlFocusTile();
        var want = focus && focus.camId ? String(focus.camId) : '';
        if (!want && sel.value) want = String(sel.value);
        var filterEl = $('inv-vms-focus-cam-filter');
        var q = String((filterEl && filterEl.value) || '').trim().toLowerCase();
        var cams = (tl.treeCams && tl.treeCams.length) ? tl.treeCams.slice() : [];
        /* Always include currently assigned tile cams (even if tree still empty) */
        tl.tiles.forEach(function (t) {
            if (!t || !t.camId) return;
            var exists = false;
            var i;
            for (i = 0; i < cams.length; i++) {
                if (cams[i].id === t.camId) { exists = true; break; }
            }
            if (!exists) {
                cams.push({
                    id: t.camId,
                    name: t.camName || t.camId,
                    label: t.camName || t.camId
                });
            }
        });
        if (q) {
            cams = cams.filter(function (c) {
                var hay = String(c.label || c.name || c.id || '').toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }
        sel.innerHTML = '';
        var ph = document.createElement('option');
        ph.value = '';
        ph.textContent = '— Select Focus Camera —';
        sel.appendChild(ph);
        cams.forEach(function (c) {
            var opt = document.createElement('option');
            var rawId = String(c.id || '').trim();
            opt.value = rawId;
            opt.setAttribute('data-cam-id', rawId);
            opt.textContent = c.label || c.name || rawId;
            sel.appendChild(opt);
        });
        if (want) {
            var ok = false;
            var j;
            for (j = 0; j < sel.options.length; j++) {
                if (sel.options[j].value === want) { ok = true; break; }
            }
            sel.value = ok ? want : '';
        } else {
            sel.value = '';
        }
    }

    function tlOnFocusCamBarChange() {
        var sel = $('inv-vms-focus-cam');
        if (!sel) return;
        tl.alarmDays = {};
        tl.recordingDays = {};
        tl.alarmDayList = [];
        var camId = String(sel.value || '').trim();
        if (!camId) {
            tlPaintRecordingCalendar();
            tlSetMeta('Pick a Focus Camera, or click cameras in the list to assign tiles.');
            return;
        }
        var owned = tlTilesWithCam(camId);
        if (owned.length) {
            tlOnFocusSlot(owned[0].slot);
            tlRefreshRecordingDays();
            tlSetMeta('Focus · ' + tlShortTreeLabel(owned[0].camName, camId) +
                '. Load Recordings loads all assigned cameras.');
            return;
        }
        var cam = null;
        var j;
        for (j = 0; j < (tl.treeCams || []).length; j++) {
            if (tl.treeCams[j].id === camId) { cam = tl.treeCams[j]; break; }
        }
        tlTreePickCamera({ id: camId, name: cam ? cam.name : camId });
        tlRefreshRecordingDays();
    }

    function tlTierFill(seg) {
        var tier = String(seg.storageTier || 'Local Node').toLowerCase();
        if (seg.status === 'recording') return '#475569';
        if (seg.status === 'unavailable') return '#1e293b';
        if (tier.indexOf('nvr') >= 0) return '#059669';
        if (tier.indexOf('nas') >= 0 || tier.indexOf('archive') >= 0 || tier.indexOf('ftp') >= 0) return '#7c3aed';
        if (tier.indexOf('ai') >= 0) return '#0891b2';
        return '#2563eb';
    }

    function tlApplyDayBlock(dateStr) {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
        tl.selectedDate = dateStr;
        var parts = dateStr.split('-').map(Number);
        tl.from = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        tl.to = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        var fromEl = $('inv-vms-from');
        var toEl = $('inv-vms-to');
        if (fromEl) fromEl.value = tlLocalInput(tl.from);
        if (toEl) toEl.value = tlLocalInput(tl.to);
        tlSyncDtTriggers();
        return true;
    }

    function tlTodayDateInput() {
        var n = new Date();
        var pad = function (v) { return v < 10 ? '0' + v : String(v); };
        return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate());
    }

    function tlAssignedCamIds() {
        var ids = [];
        var seen = {};
        tl.tiles.forEach(function (t) {
            if (!t || !t.camId || seen[t.camId]) return;
            seen[t.camId] = true;
            ids.push(t.camId);
        });
        return ids;
    }

    function tlEnsureCalMonth() {
        if (tl.calYear != null && tl.calMonth != null) return;
        var dateEl = $('inv-vms-history-date');
        var raw = (dateEl && dateEl.value) || tlTodayDateInput();
        var p = String(raw).split('-').map(Number);
        if (p.length >= 2 && p[0] && p[1]) {
            tl.calYear = p[0];
            tl.calMonth = p[1];
        } else {
            var n = new Date();
            tl.calYear = n.getFullYear();
            tl.calMonth = n.getMonth() + 1;
        }
    }

    function tlCalMonthLabel() {
        var names = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return names[(tl.calMonth || 1) - 1] + ' ' + tl.calYear;
    }

    function tlSetCalOpen(open) {
        tl.calOpen = !!open;
        if (tl.calOpen) {
            tlCloseAllDtPops();
            tl.ignoreOutsideClick = true;
            setTimeout(function () { tl.ignoreOutsideClick = false; }, 0);
            var dateEl = $('inv-vms-history-date');
            tl.calDraftDate = (dateEl && dateEl.value) || tl.calDraftDate || tlTodayDateInput();
        }
        var panel = $('inv-vms-day-cal');
        var btn = $('inv-vms-cal-toggle');
        if (panel) {
            if (tl.calOpen) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        }
        if (btn) btn.setAttribute('aria-expanded', tl.calOpen ? 'true' : 'false');
    }

    function tlLocalDayIsoFromMs(ms) {
        if (!Number.isFinite(ms)) return '';
        var d = new Date(ms);
        return d.getFullYear() + '-' + tlDtPad(d.getMonth() + 1) + '-' + tlDtPad(d.getDate());
    }

    function tlMarkDayInMonth(iso) {
        if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
        var p = iso.split('-').map(Number);
        return p[0] === tl.calYear && p[1] === tl.calMonth;
    }

    function tlResolveRawCamId(raw) {
        var id = String(raw || '').trim();
        if (!id) return '';
        /* Truncated DOM labels (first5…last4) must never hit the API. */
        if (id.indexOf('\u2026') >= 0 || /\.\.\./.test(id)) {
            var head = id.split(/\u2026|\.\.\./)[0] || '';
            var tail = id.split(/\u2026|\.\.\./).pop() || '';
            var recovered = '';
            (tl.treeCams || []).forEach(function (c) {
                if (!c || !c.id) return;
                var full = String(c.id);
                if (head && tail && full.indexOf(head) === 0 && full.slice(-tail.length) === tail) {
                    recovered = full;
                }
            });
            if (recovered) id = recovered;
            else return '';
        }
        var cam = null;
        try {
            if (typeof camCatalog === 'object' && camCatalog && camCatalog[id]) cam = camCatalog[id];
        } catch (_) { /* ignore */ }
        if (!cam) {
            var i;
            for (i = 0; i < (tl.treeCams || []).length; i++) {
                if (String(tl.treeCams[i].id) === id) { cam = tl.treeCams[i]; break; }
            }
        }
        if (cam) {
            return String(
                cam.deviceId || cam.fullId || cam.serialNo || cam.serial || cam.id || id
            ).trim();
        }
        return id;
    }

    function tlCalendarFocusCamId() {
        var focus = tlFocusTile();
        if (focus && focus.camId) return tlResolveRawCamId(focus.camId);
        var focusSel = $('inv-vms-focus-cam');
        if (focusSel && focusSel.value) return tlResolveRawCamId(focusSel.value);
        return '';
    }

    function tlAlarmCamId(al) {
        if (!al) return '';
        return String(al.cam_id || al.camId || '').trim();
    }

    function tlAugmentDaysFromLoadedTimeline() {
        var focusId = tlCalendarFocusCamId();
        tlAugmentAlarmDaysFromMarkers();
        function addRec(ms) {
            var iso = tlLocalDayIsoFromMs(ms);
            if (iso && tlMarkDayInMonth(iso)) tl.recordingDays[iso] = true;
        }
        function addAlarm(ms) {
            var iso = tlLocalDayIsoFromMs(ms);
            if (iso && tlMarkDayInMonth(iso)) tl.alarmDays[iso] = true;
        }
        (tl.tiles || []).forEach(function (tile) {
            if (focusId && String(tile.camId || '').trim() !== focusId) return;
            (tile.segments || []).forEach(function (seg) {
                addRec(tlIsoToMs(seg.start_at || seg.startAt));
                addRec(tlIsoToMs(seg.end_at || seg.endAt));
            });
            (tile.alarms || []).forEach(function (al) {
                addAlarm(tlIsoToMs(al && al.occurred_at));
            });
        });
        (tl.mergedSegments || []).forEach(function (seg) {
            if (!seg) return;
            if (focusId) {
                var sid = String(seg.cam_id || seg.camId || '').trim();
                if (sid && sid !== focusId) return;
                if (!sid) return;
            }
            addRec(tlIsoToMs(seg.start_at || seg.startAt));
            addRec(tlIsoToMs(seg.end_at || seg.endAt));
        });
        (tl.mergedAlarms || []).forEach(function (al) {
            if (focusId && tlAlarmCamId(al) !== focusId) return;
            addAlarm(tlIsoToMs(al && al.occurred_at));
        });
    }

    function tlAugmentAlarmDaysFromMarkers() {
        var focusId = tlCalendarFocusCamId();
        (tl.mergedAlarms || []).forEach(function (al) {
            if (focusId && tlAlarmCamId(al) !== focusId) return;
            var iso = tlLocalDayIsoFromMs(tlIsoToMs(al && al.occurred_at));
            if (iso) tl.alarmDays[iso] = true;
        });
    }

    function tlRepaintOpenCalendars() {
        tlPaintRecordingCalendar();
        var fromPop = $('inv-vms-from-pop');
        var toPop = $('inv-vms-to-pop');
        if (fromPop && !fromPop.hidden) tlPaintDtCal('from');
        if (toPop && !toPop.hidden) tlPaintDtCal('to');
    }

    function tlPaintRecordingCalendar() {
        tlEnsureCalMonth();
        var title = $('inv-vms-cal-title');
        var grid = $('inv-vms-cal-grid');
        if (title) title.textContent = tlCalMonthLabel();
        if (!grid) return;
        grid.innerHTML = '';
        var y = tl.calYear;
        var m = tl.calMonth;
        var first = new Date(y, m - 1, 1);
        var startDow = first.getDay();
        var daysInMonth = new Date(y, m, 0).getDate();
        var prevDays = new Date(y, m - 1, 0).getDate();
        var dateEl = $('inv-vms-history-date');
        var selected = tl.calDraftDate || (dateEl ? String(dateEl.value || '') : '');
        var today = tlTodayDateInput();
        var pad = function (v) { return v < 10 ? '0' + v : String(v); };
        var i;
        for (i = 0; i < 42; i++) {
            var dayNum;
            var cellY = y;
            var cellM = m;
            var other = false;
            if (i < startDow) {
                dayNum = prevDays - startDow + i + 1;
                cellM = m - 1;
                if (cellM < 1) { cellM = 12; cellY = y - 1; }
                other = true;
            } else if (i >= startDow + daysInMonth) {
                dayNum = i - startDow - daysInMonth + 1;
                cellM = m + 1;
                if (cellM > 12) { cellM = 1; cellY = y + 1; }
                other = true;
            } else {
                dayNum = i - startDow + 1;
            }
            var targetDate = new Date(cellY, cellM - 1, dayNum);
            var localDateStr = targetDate.getFullYear() + '-' +
                String(targetDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(targetDate.getDate()).padStart(2, '0');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = String(dayNum);
            btn.setAttribute('data-date', localDateStr);
            if (other) btn.classList.add('is-other');
            if (localDateStr === selected) btn.classList.add('is-selected');
            if (localDateStr === today) btn.classList.add('is-today');
            if (tl.recordingDays[localDateStr]) btn.classList.add('has-rec');
            if (tl.alarmDays[localDateStr] ||
                (tl.alarmDayList && tl.alarmDayList.indexOf(localDateStr) >= 0)) {
                btn.classList.add('has-alarm');
            }
            var tips = [localDateStr];
            if (tl.recordingDays[localDateStr]) tips.push('Has Recordings');
            if (tl.alarmDays[localDateStr] ||
                (tl.alarmDayList && tl.alarmDayList.indexOf(localDateStr) >= 0)) {
                tips.push('Has Alarms');
            }
            btn.title = tips.join(' · ');
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var d = ev.currentTarget.getAttribute('data-date');
                if (!d) return;
                tl.calDraftDate = d;
                tlPaintRecordingCalendar();
            });
            grid.appendChild(btn);
        }
    }

    async function tlRefreshRecordingDays() {
        tlEnsureCalMonth();
        var camId = tlCalendarFocusCamId();
        var gen = (tl._daysFetchGen = (tl._daysFetchGen || 0) + 1);
        tl.recordingDays = {};
        tl.alarmDays = {};
        tl.alarmDayList = [];
        tlRepaintOpenCalendars();
        function normDay(day) {
            var s = String(day || '').trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            var ms = Date.parse(s);
            if (!Number.isFinite(ms)) return '';
            var dt = new Date(ms);
            return dt.getFullYear() + '-' +
                String(dt.getMonth() + 1).padStart(2, '0') + '-' +
                String(dt.getDate()).padStart(2, '0');
        }
        if (!camId) {
            tlAugmentDaysFromLoadedTimeline();
            if (gen !== tl._daysFetchGen) return;
            tl.alarmDayList = Object.keys(tl.alarmDays);
            tlRepaintOpenCalendars();
            return;
        }
        try {
            var url = '/api/vms/recording-days?camIds=' + encodeURIComponent(camId) +
                '&year=' + encodeURIComponent(String(tl.calYear)) +
                '&month=' + encodeURIComponent(String(tl.calMonth)) +
                '&tzOffset=' + encodeURIComponent(String(new Date().getTimezoneOffset()));
            var r = await fetch(url, { credentials: 'same-origin' });
            var d = await r.json();
            if (gen !== tl._daysFetchGen) return;
            if (!d.ok) throw new Error('days');
            tl.recordingDays = {};
            tl.alarmDays = {};
            var recArr = (d.recordingDays && d.recordingDays.length) ? d.recordingDays : (d.days || []);
            if (Array.isArray(recArr)) {
                recArr.forEach(function (dayStr) {
                    var iso = normDay(dayStr);
                    if (iso) tl.recordingDays[iso] = true;
                });
            }
            if (Array.isArray(d.alarmDays)) {
                d.alarmDays.forEach(function (dayStr) {
                    var iso = normDay(dayStr);
                    if (iso) tl.alarmDays[iso] = true;
                });
            }
            tl.alarmDayList = Object.keys(tl.alarmDays);
            tlRepaintOpenCalendars();
        } catch (_) {
            if (gen !== tl._daysFetchGen) return;
        }
        if (gen !== tl._daysFetchGen) return;
        tlAugmentDaysFromLoadedTimeline();
        tl.alarmDayList = Object.keys(tl.alarmDays);
        tlRepaintOpenCalendars();
    }

    function tlCalCommitOk() {
        var d = tl.calDraftDate;
        if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            tlSetMeta('Pick a day, then OK.');
            return;
        }
        var el = $('inv-vms-history-date');
        if (el) el.value = d;
        tlApplyDayBlock(d);
        tlSetCalOpen(false);
        tlPaintRecordingCalendar();
        var active = tl.tiles.filter(function (t) { return t.camId; });
        if (!active.length) {
            tlSetMeta('Date set to ' + d + '. Select a camera, then Load Recordings.');
            return;
        }
        tlLoadTimeline({ useDate: true });
    }

    function tlBindRecordingCalendar() {
        var toggle = $('inv-vms-cal-toggle');
        var prev = $('inv-vms-cal-prev');
        var next = $('inv-vms-cal-next');
        var panel = $('inv-vms-day-cal');
        var calToday = $('inv-vms-cal-today');
        var calCancel = $('inv-vms-cal-cancel');
        var calOk = $('inv-vms-cal-ok');
        if (toggle) {
            toggle.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                tlEnsureCalMonth();
                tlSetCalOpen(!tl.calOpen);
                if (tl.calOpen) tlRefreshRecordingDays();
                else tlPaintRecordingCalendar();
            });
        }
        if (prev) {
            prev.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                tlEnsureCalMonth();
                tl.calMonth -= 1;
                if (tl.calMonth < 1) { tl.calMonth = 12; tl.calYear -= 1; }
                tlRefreshRecordingDays();
            });
        }
        if (next) {
            next.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                tlEnsureCalMonth();
                tl.calMonth += 1;
                if (tl.calMonth > 12) { tl.calMonth = 1; tl.calYear += 1; }
                tlRefreshRecordingDays();
            });
        }
        if (calToday) {
            calToday.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var d = tlTodayDateInput();
                var p = d.split('-').map(Number);
                tl.calDraftDate = d;
                if (p[0] && p[1]) {
                    tl.calYear = p[0];
                    tl.calMonth = p[1];
                }
                tlRefreshRecordingDays();
            });
        }
        if (calCancel) {
            calCancel.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                tlSetCalOpen(false);
            });
        }
        if (calOk) {
            calOk.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                tlCalCommitOk();
            });
        }
        if (panel) {
            panel.addEventListener('click', function (ev) { ev.stopPropagation(); });
        }
        tlEnsureCalMonth();
        if (!$('inv-vms-history-date') || !$('inv-vms-history-date').value) {
            var hid = $('inv-vms-history-date');
            if (hid) hid.value = tlTodayDateInput();
        }
        tl.calDraftDate = ($('inv-vms-history-date') && $('inv-vms-history-date').value) || tlTodayDateInput();
        tlPaintRecordingCalendar();
    }

    async function tlFetchTileTimeline(tile) {
        if (!tile.camId) return;
        var url;
        if (tl.selectedDate) {
            url = '/api/vms/cameras/' + encodeURIComponent(tile.camId) + '/timeline' +
                '?date=' + encodeURIComponent(tl.selectedDate);
        } else if (tl.from && tl.to) {
            url = '/api/vms/cameras/' + encodeURIComponent(tile.camId) + '/timeline' +
                '?from=' + encodeURIComponent(tl.from.toISOString()) +
                '&to=' + encodeURIComponent(tl.to.toISOString());
        } else {
            return;
        }
        var r = await fetch(url, { credentials: 'same-origin' });
        var d = await r.json();
        if (!d.ok) throw new Error(d.error || 'timeline error');
        tile.segments = d.segments || [];
        tile.alarms = d.alarms || [];
        if (d.from && d.to) {
            tl.from = new Date(d.from);
            tl.to = new Date(d.to);
        }
        if (d.date) tl.selectedDate = d.date;
        if (tile.status) {
            var tiers = {};
            tile.segments.forEach(function (s) {
                tiers[s.storageTier || 'Local Node'] = true;
            });
            var tierKeys = Object.keys(tiers);
            tile.status.textContent = tile.segments.length + ' seg · ' + tile.alarms.length + ' evt' +
                (tierKeys.length ? ' · ' + tierKeys.join(', ') : '');
        }
    }

    function tlFindSegmentAt(segments, utcMs) {
        var i;
        for (i = 0; i < segments.length; i++) {
            var s = segments[i];
            if (s.status === 'unavailable') continue;
            var st = tlIsoToMs(s.start_at);
            var en = tlIsoToMs(s.end_at);
            if (utcMs >= st && utcMs <= en) return s;
        }
        return null;
    }

    function tlStreamUrl(segmentId) {
        return '/api/vms/segments/' + encodeURIComponent(segmentId) + '/stream';
    }

    /** Grid views use sub-stream (viewMode grid) — never main profile for 4-up. */
    function tlStartLiveSubStream(camId, video) {
        return fetch('/api/fixed-cams/' + encodeURIComponent(camId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: TIMELINE_OWNER, viewMode: 'grid' }),
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
                if (!res.ok || !res.j || !res.j.flvUrl || !video) return false;
                if (global.AxiomFlvManager && typeof global.AxiomFlvManager.attach === 'function') {
                    global.AxiomFlvManager.attach(video, res.j.flvUrl, { withCredentials: true });
                }
                return true;
            }).catch(function () { return false; });
    }

    function tlSeekTile(tile, utcMs) {
        if (!tile || !tile.camId || !tile.video) return Promise.resolve();
        var seg = tlFindSegmentAt(tile.segments, utcMs);
        if (!seg) {
            tile.activeSegmentId = null;
            tile.video.removeAttribute('src');
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(tile.video);
            } catch (_) { /* ignore */ }
            return Promise.resolve();
        }
        if (seg.status === 'recording') {
            return tlStartLiveSubStream(tile.camId, tile.video);
        }
        var segStart = tlIsoToMs(seg.start_at);
        var offsetSec = Math.max(0, (utcMs - segStart) / 1000);
        var url = tlStreamUrl(seg.segmentId);
        if (tile.activeSegmentId !== seg.segmentId) {
            tile.activeSegmentId = seg.segmentId;
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(tile.video);
            } catch (_) { /* ignore */ }
            tile.video.src = url;
            tile.video.load();
            return new Promise(function (resolve) {
                tile.video.onloadedmetadata = function () {
                    tile.video.playbackRate = tl.speed;
                    tile.video.currentTime = offsetSec;
                    resolve();
                };
            });
        }
        tile.video.playbackRate = tl.speed;
        tile.video.currentTime = offsetSec;
        return Promise.resolve();
    }

    function tlSeekAll(utcMs) {
        if (!Number.isFinite(utcMs) || !tl.from || !tl.to) return;
        tl.playheadMs = Math.max(tl.from.getTime(), Math.min(tl.to.getTime(), utcMs));
        tlStoreFocusPlayhead();
        var readout = $('inv-vms-time-readout');
        if (readout) readout.textContent = tlMsToLocalLabel(tl.playheadMs);
        var promises = tl.tiles.map(function (tile) {
            if (tl.layoutMode === 'six' || tl.layoutMode === 'single' || tl.layoutMode === 'compare') {
                if (tile.slot !== tl.focusSlot && !tile.playing) return Promise.resolve();
            }
            if (!tlTileActiveInLayout(tile)) return Promise.resolve();
            return tlSeekTile(tile, tl.playheadMs);
        });
        Promise.all(promises).then(function () {
            tlDrawTimeline();
            tlDrawOverlays();
            tl.tiles.forEach(function (tile) {
                if (!tile.playing || !tile.video || !tile.video.src) return;
                tile.video.playbackRate = tl.speed;
                try { tile.video.play(); } catch (_) { /* ignore */ }
            });
            tlUpdateAllTileTransport();
        });
    }

    function tlSyncPlayVideos() {
        if (tl.layoutMode === 'compare') {
            var jobs = [];
            var i;
            for (i = 0; i < 4; i++) {
                (function (tile) {
                    if (!tile || !tile.camId || !tile.video) return;
                    var at = tile.playheadMs != null ? tile.playheadMs
                        : (tl.playheadMs != null ? tl.playheadMs : null);
                    if (at == null) return;
                    tile.playing = true;
                    jobs.push(tlSeekTile(tile, at).then(function () {
                        if (!tile.playing || !tile.video || !tile.video.src) return;
                        tile.video.playbackRate = tl.speed;
                        try { tile.video.play(); } catch (_) { /* ignore */ }
                    }));
                })(tl.tiles[i]);
            }
            Promise.all(jobs).then(function () { tlUpdateAllTileTransport(); });
            return;
        }
        tl.tiles.forEach(function (tile) {
            if (!tlTileActiveInLayout(tile)) {
                tile.playing = false;
                if (tile.video) try { tile.video.pause(); } catch (_) { /* ignore */ }
                return;
            }
            if (!tile.video || !tile.camId || !tile.video.src) return;
            tile.playing = true;
            tile.video.playbackRate = tl.speed;
            try { tile.video.play(); } catch (_) { /* ignore */ }
        });
        tlUpdateAllTileTransport();
    }

    function tlPauseVideos() {
        tl.tiles.forEach(function (tile) {
            tile.playing = false;
            if (tile.video) try { tile.video.pause(); } catch (_) { /* ignore */ }
        });
        if (tl.playheadMs != null) tlSeekAll(tl.playheadMs);
        tlUpdateAllTileTransport();
    }

    function tlRatioForMs(ms) {
        if (!tl.from || !tl.to) return 0;
        return (ms - tl.from.getTime()) / (tl.to.getTime() - tl.from.getTime());
    }

    function tlUpdateTimelineChrome() {
        var wrap = $('inv-vms-timeline-wrap');
        if (!wrap) return;
        var hasRange = !!(tl.from && tl.to);
        var hasData = hasRange && ((tl.mergedSegments && tl.mergedSegments.length) ||
            (tl.mergedAlarms && tl.mergedAlarms.length) ||
            tl.tiles.some(function (t) { return t.camId && t.segments && t.segments.length; }));
        wrap.classList.toggle('is-collapsed', !hasData);
    }

    function tlDrawTimeline() {
        tlUpdateTimelineChrome();
        var canvas = $('inv-vms-timeline');
        if (!canvas || !tl.from || !tl.to) return;
        var wrap = $('inv-vms-timeline-wrap');
        if (wrap && wrap.classList.contains('is-collapsed')) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.clientWidth || 800;
        canvas.width = W;
        canvas.height = TIMELINE_H;
        var fromMs = tl.from.getTime();
        var toMs = tl.to.getTime();
        var span = toMs - fromMs || 1;
        var xFor = function (ms) { return Math.round((ms - fromMs) / span * W); };

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, W, TIMELINE_H);

        /* Gap zones — full track dark gray baseline */
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, SEG_Y, W, SEG_H);

        /* Recording segments — federated storage tier colors */
        tlDisplaySegments().forEach(function (seg) {
            var x1 = xFor(tlIsoToMs(seg.start_at));
            var x2 = xFor(tlIsoToMs(seg.end_at));
            var w = Math.max(2, x2 - x1);
            ctx.fillStyle = tlTierFill(seg);
            ctx.fillRect(x1, SEG_Y, w, SEG_H);
            if (w > 56 && seg.storageTier) {
                ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
                ctx.font = '9px system-ui';
                var label = String(seg.storageTier);
                if (label.length > 12) label = label.slice(0, 11) + '…';
                ctx.fillText(label, x1 + 3, SEG_Y + 12);
            }
        });

        /* Metadata pins — thin near-overlap so AI + ONVIF do not paint a solid bar */
        var lastPinX = -9999;
        tlDisplayAlarms().forEach(function (al) {
            var x = xFor(tlIsoToMs(al.occurred_at));
            if (Math.abs(x - lastPinX) < 4) return;
            lastPinX = x;
            var note = String(al.note || '');
            var col = tlPinColor(note.indexOf('FR') === 0 || note.indexOf('Weapon') === 0
                ? 'analytics'
                : al.event_type);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(x, PIN_Y + PIN_H);
            ctx.lineTo(x - 4, PIN_Y);
            ctx.lineTo(x + 4, PIN_Y);
            ctx.closePath();
            ctx.fill();
        });

        /* Mark In / Out */
        if (tl.markInMs != null) {
            var ix = xFor(tl.markInMs);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            ctx.fillRect(ix - 1, 0, 2, TIMELINE_H);
            ctx.fillStyle = '#22c55e';
            ctx.font = '9px sans-serif';
            ctx.fillText('IN', ix + 3, 10);
        }
        if (tl.markOutMs != null) {
            var ox = xFor(tl.markOutMs);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
            ctx.fillRect(ox - 1, 0, 2, TIMELINE_H);
            ctx.fillStyle = '#ef4444';
            ctx.font = '9px sans-serif';
            ctx.fillText('OUT', ox + 3, 10);
        }

        /* Playhead */
        if (tl.playheadMs != null) {
            var px = xFor(tl.playheadMs);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, TIMELINE_H);
            ctx.stroke();
        }
    }

    function tlDrawOverlays() {
        tl.tiles.forEach(function (tile, idx) {
            if (!tile.overlay) return;
            var ctx = tile.overlay.getContext('2d');
            ctx.clearRect(0, 0, tile.overlay.width, tile.overlay.height);
            if (idx !== tl.focusSlot || !tile.camId || tl.playheadMs == null) return;
            var frames = tl.metadataFrames.filter(function (f) {
                return f.camId === tile.camId && Math.abs(f.atMs - tl.playheadMs) < 1500;
            });
            frames.forEach(function (fr) {
                var b = fr.bbox;
                if (!b || b.length < 4) return;
                var x = b[0], y = b[1], w = b[2], h = b[3];
                if (w <= 1 && h <= 1) {
                    w = b[2] * tile.overlay.width;
                    h = b[3] * tile.overlay.height;
                    x = b[0] * tile.overlay.width;
                    y = b[1] * tile.overlay.height;
                }
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                if (fr.label) {
                    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
                    ctx.font = '11px system-ui';
                    ctx.fillText(fr.label, x + 2, Math.max(12, y - 4));
                }
            });
        });
    }

    function tlOnTimelinePointer(clientX) {
        var canvas = $('inv-vms-timeline');
        if (!canvas || !tl.from || !tl.to) return;
        var rect = canvas.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        var ms = tl.from.getTime() + ratio * (tl.to.getTime() - tl.from.getTime());
        if (tl.layoutMode === 'compare') {
            var ft = tlFocusTile();
            if (ft) {
                tlPauseTile(ft);
                ft.playheadMs = ms;
                tl.playheadMs = ms;
                tlSyncCompareTimeInput(ft);
                tlSeekTile(ft, ms).then(function () {
                    tlDrawTimeline();
                    tlDrawOverlays();
                });
            }
            return;
        }
        tlPauseVideos();
        tlSeekAll(ms);
    }

    function tlOnTimelineClick(e) {
        var canvas = $('inv-vms-timeline');
        if (!canvas || !tl.from || !tl.to) return;
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var W = canvas.width;
        var fromMs = tl.from.getTime();
        var span = tl.to.getTime() - fromMs || 1;
        var hitMs = fromMs + (x / W) * span;
        var hitPin = null;
        var best = 8;
        tlDisplayAlarms().forEach(function (al) {
            var ax = ((tlIsoToMs(al.occurred_at) - fromMs) / span) * W;
            if (Math.abs(ax - x) <= best) {
                best = Math.abs(ax - x);
                hitPin = al;
            }
        });
        if (hitPin) {
            tlOpenAlarmPreview(hitPin);
            return;
        }
        tlCloseAlarmPreview();
        tlOnTimelinePointer(e.clientX);
    }

    async function tlLoadTimeline(opts) {
        opts = opts || {};
        var dateEl = $('inv-vms-history-date');
        var fromEl = $('inv-vms-from');
        var toEl = $('inv-vms-to');

        if (opts.useDate !== false && dateEl && dateEl.value) {
            if (!tlApplyDayBlock(dateEl.value)) {
                tlSetMeta('Pick a valid day in Calendar, then OK.');
                return;
            }
        } else if (fromEl && toEl && fromEl.value && toEl.value) {
            tl.selectedDate = null;
            tl.from = new Date(fromEl.value);
            tl.to = new Date(toEl.value);
            if (!(tl.to > tl.from)) {
                tlSetMeta('Start time is after End time. Swap them, or use Calendar.');
                return;
            }
        } else {
            tlSetMeta('Set Start Time and End Time, or pick a day in Calendar.');
            return;
        }
        tlSetMeta('Loading recordings…');
        try {
            if (tl.layoutMode === 'compare') {
                var primary = tl.tiles[0];
                if (!primary || !primary.camId) {
                    tlSetMeta('Select a camera for Time Compare.');
                    return;
                }
                await tlFetchTileTimeline(primary);
                var ci;
                for (ci = 1; ci < 4; ci++) {
                    var ct = tl.tiles[ci];
                    if (!ct) continue;
                    ct.camId = primary.camId;
                    ct.camName = primary.camName;
                    ct.segments = (primary.segments || []).slice();
                    ct.alarms = (primary.alarms || []).slice();
                    ct.activeSegmentId = null;
                    if (ct.tile) ct.tile.classList.add('has-cam');
                    if (ct.status) ct.status.textContent = primary.status ? primary.status.textContent : '';
                }
                tlMergeTimelineData();
                var usedInputs = false;
                for (ci = 0; ci < 4; ci++) {
                    var tile = tl.tiles[ci];
                    if (!tile) continue;
                    var inp = tlCompareTimeInput(ci);
                    var parsed = inp ? tlParseCompareTimeOnDay(inp.value) : null;
                    if (parsed != null) {
                        tile.playheadMs = parsed;
                        usedInputs = true;
                    }
                }
                if (!usedInputs) tlApplyCompareDefaultTimes();
                else {
                    for (ci = 0; ci < 4; ci++) tlSyncCompareTimeInput(tl.tiles[ci]);
                    if (tl.tiles[tl.focusSlot] && tl.tiles[tl.focusSlot].playheadMs != null) {
                        tl.playheadMs = tl.tiles[tl.focusSlot].playheadMs;
                    }
                }
                await tlSeekCompareTiles();
                tlUpdateTimelineChrome();
                tlSetMeta('Time Compare · 1 camera · 4 start times' +
                    (tl.selectedDate ? ' · ' + tl.selectedDate : '') +
                    ' · ' + (primary.segments || []).length + ' segment(s).');
                return;
            }

            var active = tl.tiles.filter(function (t) { return t.camId; });
            if (!active.length) {
                tlSetMeta('Select at least one camera.');
                return;
            }
            var focusTile = tlFocusTile();
            tlSetMeta('Loading ' + active.length + ' assigned camera(s)' +
                (focusTile && focusTile.camId
                    ? (' · focus ' + tlShortTreeLabel(focusTile.camName, focusTile.camId))
                    : '') + '…');
            await Promise.all(active.map(function (t) { return tlFetchTileTimeline(t); }));
            tlMergeTimelineData();
            tl.playheadMs = tl.from.getTime();
            active.forEach(function (t) {
                if (t.playheadMs == null) t.playheadMs = tl.playheadMs;
            });
            tlDrawTimeline();
            tlSeekAll(tl.playheadMs);
            tlUpdateTimelineChrome();
            tlSetMeta(active.length + ' assigned · ' + tl.mergedSegments.length + ' segment(s) · ' +
                tl.mergedAlarms.length + ' marker(s)' +
                (focusTile && focusTile.camId
                    ? (' · focus ' + tlShortTreeLabel(focusTile.camName, focusTile.camId))
                    : '') +
                (tl.selectedDate ? ' · ' + tl.selectedDate : '') + '.');
            tlRefreshRecordingDays();
        } catch (err) {
            tlSetMeta('Could not load recordings.');
            tlUpdateTimelineChrome();
        }
    }

    function tlBindControls() {
        if (tl.bound) return;
        tl.bound = true;
        var loadBtn = $('inv-vms-load-btn');
        if (loadBtn) loadBtn.addEventListener('click', function () { tlLoadTimeline({ useDate: false }); });

        var focusCam = $('inv-vms-focus-cam');
        if (focusCam) focusCam.addEventListener('change', tlOnFocusCamBarChange);
        var focusFilter = $('inv-vms-focus-cam-filter');
        if (focusFilter) {
            focusFilter.addEventListener('input', function () {
                tlSyncFocusCamBar();
            });
        }

        var fromBtn = $('inv-vms-from-btn');
        var toBtn = $('inv-vms-to-btn');
        if (fromBtn) {
            fromBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var pop = $('inv-vms-from-pop');
                if (pop && !pop.hidden) tlCloseDtPop('from');
                else tlOpenDtPop('from');
            });
        }
        if (toBtn) {
            toBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var pop = $('inv-vms-to-pop');
                if (pop && !pop.hidden) tlCloseDtPop('to');
                else tlOpenDtPop('to');
            });
        }
        var fromOk = $('inv-vms-from-ok');
        var toOk = $('inv-vms-to-ok');
        var fromCancel = $('inv-vms-from-cancel');
        var toCancel = $('inv-vms-to-cancel');
        if (fromOk) fromOk.addEventListener('click', function () { tlCommitDtPop('from'); });
        if (toOk) toOk.addEventListener('click', function () { tlCommitDtPop('to'); });
        if (fromCancel) fromCancel.addEventListener('click', function () { tlCloseDtPop('from'); });
        if (toCancel) toCancel.addEventListener('click', function () { tlCloseDtPop('to'); });
        var fromToday = $('inv-vms-from-today');
        var toToday = $('inv-vms-to-today');
        if (fromToday) fromToday.addEventListener('click', function (e) { e.stopPropagation(); tlDtToday('from'); });
        if (toToday) toToday.addEventListener('click', function (e) { e.stopPropagation(); tlDtToday('to'); });
        var fromPrev = $('inv-vms-from-cal-prev');
        var fromNext = $('inv-vms-from-cal-next');
        var toPrev = $('inv-vms-to-cal-prev');
        var toNext = $('inv-vms-to-cal-next');
        if (fromPrev) fromPrev.addEventListener('click', function (e) { e.stopPropagation(); tlShiftDtMonth('from', -1); });
        if (fromNext) fromNext.addEventListener('click', function (e) { e.stopPropagation(); tlShiftDtMonth('from', 1); });
        if (toPrev) toPrev.addEventListener('click', function (e) { e.stopPropagation(); tlShiftDtMonth('to', -1); });
        if (toNext) toNext.addEventListener('click', function (e) { e.stopPropagation(); tlShiftDtMonth('to', 1); });
        ['inv-vms-from-pop', 'inv-vms-to-pop'].forEach(function (id) {
            var pop = $(id);
            if (pop) {
                pop.addEventListener('click', function (e) { e.stopPropagation(); });
            }
        });
        document.addEventListener('click', function (e) {
            if (tl.ignoreOutsideClick) return;
            var t = e.target;
            if (t && t.closest) {
                if (t.closest('.inv-vms-dt-pop') || t.closest('.inv-vms-dt-trigger') ||
                    t.closest('.inv-vms-day-cal') || t.closest('#inv-vms-cal-toggle')) {
                    return;
                }
            }
            tlCloseAllDtPops();
            if (tl.calOpen) tlSetCalOpen(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                tlCloseAllDtPops();
                if (tl.calOpen) tlSetCalOpen(false);
            }
        });
        tlSyncDtTriggers();

        var layoutSingle = $('inv-vms-layout-single');
        var layoutFour = $('inv-vms-layout-four');
        var layoutSix = $('inv-vms-layout-six');
        var layoutCompare = $('inv-vms-layout-compare');
        if (layoutSingle) {
            layoutSingle.addEventListener('click', function () { tlApplyLayout('single'); });
        }
        if (layoutFour) {
            layoutFour.addEventListener('click', function () { tlApplyLayout('four'); });
        }
        if (layoutSix) {
            layoutSix.addEventListener('click', function () { tlApplyLayout('six'); });
        }
        if (layoutCompare) {
            layoutCompare.addEventListener('click', function () { tlApplyLayout('compare'); });
        }

        document.querySelectorAll('.inv-vms-compare-time').forEach(function (inp) {
            inp.addEventListener('change', function () {
                var slot = parseInt(inp.getAttribute('data-slot') || '0', 10);
                var tile = tl.tiles[slot];
                if (!tile) return;
                var ms = tlParseCompareTimeOnDay(inp.value);
                if (ms == null) {
                    tlSetMeta('Enter a valid Start time (HH:MM).');
                    return;
                }
                tile.playheadMs = ms;
                if (slot === tl.focusSlot) tl.playheadMs = ms;
                tlOnFocusSlot(slot);
                tlSeekTile(tile, ms).then(function () {
                    tlDrawTimeline();
                    tlDrawOverlays();
                    tlUpdateTileTransport(tile);
                });
            });
            inp.addEventListener('click', function (ev) { ev.stopPropagation(); });
        });

        function tlWireRailTransport(playId, pauseId) {
            var rp = $(playId);
            var rz = $(pauseId);
            if (rp) {
                rp.addEventListener('click', function () {
                    var dock = $('inv-vms-sync-play');
                    if (dock) dock.click();
                });
            }
            if (rz) {
                rz.addEventListener('click', function () {
                    var dock = $('inv-vms-sync-pause');
                    if (dock) dock.click();
                });
            }
        }
        tlWireRailTransport('inv-vms-rail-play-all', 'inv-vms-rail-pause-all');
        tlWireRailTransport('inv-vms-rail-compare-play', 'inv-vms-rail-compare-pause');

        var treeSearch = $('inv-vms-tree-search');
        if (treeSearch) {
            treeSearch.addEventListener('input', function () {
                tl.treeFilter = treeSearch.value || '';
                tlPaintCamTree();
            });
        }

        var dateEl = $('inv-vms-history-date');
        if (dateEl && !dateEl.value) dateEl.value = tlTodayDateInput();
        tlBindRecordingCalendar();

        tl.tiles.forEach(function (tile) {
            if (tile.select) {
                tile.select.addEventListener('change', function () {
                    var opt = tile.select.selectedOptions[0];
                    tlAssignCameraToTile(tile, tile.select.value || null,
                        opt ? opt.textContent : '');
                });
            }
            if (tile.tile) {
                tile.tile.addEventListener('click', function (ev) {
                    if (ev.target && ev.target.closest && ev.target.closest('.inv-vms-tile-transport')) return;
                    tlOnFocusSlot(tile.slot);
                });
                var tPlay = tile.tile.querySelector('.inv-vms-tile-play');
                var tPause = tile.tile.querySelector('.inv-vms-tile-pause');
                var tCap = tile.tile.querySelector('.inv-vms-tile-capture');
                var tPtz = tile.tile.querySelector('.inv-vms-tile-dptz');
                if (tPlay) {
                    tPlay.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        tlPlayTile(tile);
                    });
                }
                if (tPause) {
                    tPause.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        tlPauseTile(tile);
                    });
                }
                if (tCap) {
                    tCap.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        tlOnFocusSlot(tile.slot);
                        tlCaptureFrame();
                    });
                }
                if (tPtz) {
                    tPtz.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        tlOnFocusSlot(tile.slot);
                        tlToggleDptz();
                    });
                }
            }
            if (tile.video) {
                tile.video.addEventListener('timeupdate', function () {
                    if (!tile.playing) return;
                    if (!tile.activeSegmentId) return;
                    var seg = null;
                    var si;
                    for (si = 0; si < tile.segments.length; si++) {
                        if (tile.segments[si].segmentId === tile.activeSegmentId) {
                            seg = tile.segments[si];
                            break;
                        }
                    }
                    if (!seg) return;
                    var utc = tlIsoToMs(seg.start_at) + tile.video.currentTime * 1000;
                    tile.playheadMs = utc;
                    if (tile.slot === tl.focusSlot) {
                        tl.playheadMs = utc;
                        var readout = $('inv-vms-time-readout');
                        if (readout) readout.textContent = tlMsToLocalLabel(utc);
                    }
                    if (tl.layoutMode === 'four' && tile.slot === tl.focusSlot) {
                        tl.tiles.forEach(function (other) {
                            if (other.slot === tile.slot || !other.camId || !other.video || !other.playing) return;
                            var oseg = tlFindSegmentAt(other.segments, utc);
                            if (!oseg || oseg.segmentId !== other.activeSegmentId) return;
                            var oStart = tlIsoToMs(oseg.start_at);
                            var target = (utc - oStart) / 1000;
                            if (Math.abs(other.video.currentTime - target) > 0.35) {
                                other.video.currentTime = target;
                            }
                        });
                    }
                    if (tile.slot === tl.focusSlot) {
                        tlDrawTimeline();
                        tlDrawOverlays();
                    }
                });
            }
        });

        var playBtn = $('inv-vms-sync-play');
        var pauseBtn = $('inv-vms-sync-pause');
        if (playBtn) {
            playBtn.addEventListener('click', function () {
                if (tl.playheadMs == null) return;
                tlSyncPlayVideos();
            });
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', tlPauseVideos);
        }

        document.querySelectorAll('.inv-vms-speed-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var sp = parseFloat(btn.getAttribute('data-speed') || '1');
                tl.speed = sp;
                document.querySelectorAll('.inv-vms-speed-btn').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                tl.tiles.forEach(function (tile) {
                    if (tile.video) tile.video.playbackRate = sp;
                });
            });
        });

        var canvas = $('inv-vms-timeline');
        if (canvas) {
            canvas.addEventListener('mousedown', function (e) {
                tl.dragging = true;
                tlOnTimelinePointer(e.clientX);
            });
            window.addEventListener('mousemove', function (e) {
                if (!tl.dragging) return;
                tlOnTimelinePointer(e.clientX);
            });
            window.addEventListener('mouseup', function () { tl.dragging = false; });
            canvas.addEventListener('click', tlOnTimelineClick);
        }
        var alarmClose = $('inv-vms-alarm-preview-close');
        if (alarmClose) {
            alarmClose.addEventListener('click', function (e) {
                e.stopPropagation();
                tlCloseAlarmPreview();
            });
        }
        var alarmPanel = $('inv-vms-alarm-preview');
        if (alarmPanel) {
            alarmPanel.addEventListener('click', function (e) { e.stopPropagation(); });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') tlCloseAlarmPreview();
        });

        window.addEventListener('resize', function () {
            if (!tl.visible) return;
            tlResizeOverlays();
            tlDrawTimeline();
        });

        ['inv-vms-export', 'inv-vms-dptz', 'inv-vms-capture'].forEach(function (id) {
            var btn = $(id);
            if (btn) {
                btn.addEventListener('click', function () {
                    if (id === 'inv-vms-export') tlExportEvidence();
                    else if (id === 'inv-vms-dptz') tlToggleDptz();
                    else if (id === 'inv-vms-capture') tlCaptureFrame();
                });
            }
        });
        var secCancel = $('inv-vms-secure-export-cancel');
        var secOk = $('inv-vms-secure-export-ok');
        var secPass = $('inv-vms-secure-export-pass');
        if (secCancel) secCancel.addEventListener('click', tlCloseSecureExportModal);
        if (secOk) secOk.addEventListener('click', function () { tlConfirmSecureExport(); });
        if (secPass) {
            secPass.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    tlConfirmSecureExport();
                } else if (e.key === 'Escape') {
                    tlCloseSecureExportModal();
                }
            });
        }
        var markInBtn = $('inv-vms-mark-in');
        var markOutBtn = $('inv-vms-mark-out');
        if (markInBtn) markInBtn.addEventListener('click', function () { tlSetMark('in'); });
        if (markOutBtn) markOutBtn.addEventListener('click', function () { tlSetMark('out'); });
    }

    function tlFocusTile() {
        return tl.tiles[tl.focusSlot] || null;
    }

    function tlSetMark(which) {
        if (tl.playheadMs == null) {
            tlSetMeta('Move the timeline to a time, then Mark In / Mark Out.');
            return;
        }
        if (which === 'in') {
            tl.markInMs = tl.playheadMs;
            if (tl.markOutMs != null && tl.markOutMs <= tl.markInMs) tl.markOutMs = null;
            tlSetMeta('Mark In set · ' + tlMsToLocalLabel(tl.markInMs));
        } else {
            tl.markOutMs = tl.playheadMs;
            if (tl.markInMs != null && tl.markOutMs <= tl.markInMs) {
                tlSetMeta('Mark Out must be after Mark In.');
                tl.markOutMs = null;
                return;
            }
            tlSetMeta('Mark Out set · ' + tlMsToLocalLabel(tl.markOutMs));
        }
        tlDrawTimeline();
    }

    function tlApplyDptz() {
        var tile = tlFocusTile();
        if (!tile || !tile.tile) return;
        var stage = tile.tile.querySelector('.inv-vms-tile-stage');
        var scale = tl.dptzScale || 1;
        if (stage) stage.classList.toggle('is-dptz', scale > 1);
        if (tile.video) tile.video.style.transform = scale > 1 ? ('scale(' + scale + ')') : '';
        if (tile.overlay) tile.overlay.style.transform = scale > 1 ? ('scale(' + scale + ')') : '';
        var btn = $('inv-vms-dptz');
        if (btn) {
            btn.textContent = scale > 1 ? ('Digital PTZ ' + scale + 'x') : 'Digital PTZ';
            btn.classList.toggle('active', scale > 1);
        }
    }

    function tlToggleDptz() {
        var steps = [1, 1.5, 2, 3];
        var i = steps.indexOf(tl.dptzScale);
        tl.dptzScale = steps[(i + 1) % steps.length];
        tl.tiles.forEach(function (tile) {
            if (!tile.tile) return;
            var stage = tile.tile.querySelector('.inv-vms-tile-stage');
            if (stage) stage.classList.remove('is-dptz');
            if (tile.video) tile.video.style.transform = '';
            if (tile.overlay) tile.overlay.style.transform = '';
        });
        tlApplyDptz();
        tlSetMeta(tl.dptzScale > 1
            ? ('Digital PTZ ' + tl.dptzScale + 'x on focused tile')
            : 'Digital PTZ off');
    }

    async function tlExportEvidence() {
        var tile = tlFocusTile();
        if (!tile || !tile.camId) {
            tlSetMeta('Focus a tile with a camera loaded first.');
            return;
        }
        if (tl.markInMs == null || tl.markOutMs == null) {
            tlSetMeta('Set Mark In and Mark Out on the timeline, then Export Evidence.');
            return;
        }
        tlOpenSecureExportModal();
    }

    function tlOpenSecureExportModal() {
        var modal = $('inv-vms-secure-export-modal');
        var pass = $('inv-vms-secure-export-pass');
        var err = $('inv-vms-secure-export-err');
        if (err) {
            err.hidden = true;
            err.textContent = '';
        }
        if (pass) pass.value = '';
        if (modal) modal.hidden = false;
        if (pass) {
            try { pass.focus(); } catch (_e) { /* ignore */ }
        }
    }

    function tlCloseSecureExportModal() {
        var modal = $('inv-vms-secure-export-modal');
        if (modal) modal.hidden = true;
    }

    async function tlConfirmSecureExport() {
        var tile = tlFocusTile();
        var passEl = $('inv-vms-secure-export-pass');
        var err = $('inv-vms-secure-export-err');
        var password = passEl ? String(passEl.value || '') : '';
        if (!tile || !tile.camId) {
            tlSetMeta('Focus a tile with a camera loaded first.');
            return;
        }
        if (password.length < 8) {
            if (err) {
                err.hidden = false;
                err.textContent = 'Password must be at least 8 characters.';
            }
            return;
        }
        tlCloseSecureExportModal();
        tlSetMeta('Building secure export package…');
        try {
            var r = await fetch('/api/vms/cameras/' + encodeURIComponent(tile.camId) + '/export-clip', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markInMs: tl.markInMs,
                    markOutMs: tl.markOutMs,
                    password: password,
                }),
            });
            var ctype = String(r.headers.get('content-type') || '');
            if (!r.ok) {
                var d = {};
                try { d = await r.json(); } catch (_j) { d = {}; }
                throw new Error((d && d.error) || 'Export failed');
            }
            if (ctype.indexOf('application/json') >= 0) {
                var j = await r.json().catch(function () { return {}; });
                throw new Error((j && j.error) || 'Export failed');
            }
            var blob = await r.blob();
            var a = document.createElement('a');
            var url = URL.createObjectURL(blob);
            a.href = url;
            a.download = (tile.camId || 'evidence').replace(/[^\w.-]+/g, '_') + '-secure.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_u) { /* ignore */ } }, 2000);
            var alarmHdr = r.headers.get('X-Alarm-Count');
            tlSetMeta('Secure package ready' + (alarmHdr ? (' · ' + alarmHdr + ' alarm(s) in range') : '') + '.');
        } catch (err) {
            tlSetMeta(err && err.message ? err.message : 'Export failed');
        }
    }

    async function tlCaptureFrame() {
        var tile = tlFocusTile();
        if (!tile || !tile.camId) {
            tlSetMeta('Focus a tile with a camera loaded first.');
            return;
        }
        var atMs = tl.playheadMs;
        if (atMs == null) {
            tlSetMeta('Move the timeline to the frame time, then Capture Frame.');
            return;
        }
        tlSetMeta('Capturing frame…');
        try {
            var r = await fetch('/api/vms/cameras/' + encodeURIComponent(tile.camId) + '/capture-frame', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ atMs: atMs }),
            });
            var d = await r.json().catch(function () { return {}; });
            if (!r.ok || !d.ok) {
                /* Fallback: grab from focused video element */
                if (tile.video && tile.video.videoWidth) {
                    var c = document.createElement('canvas');
                    c.width = tile.video.videoWidth;
                    c.height = tile.video.videoHeight;
                    c.getContext('2d').drawImage(tile.video, 0, 0);
                    var a0 = document.createElement('a');
                    a0.href = c.toDataURL('image/jpeg', 0.92);
                    a0.download = (tile.camId || 'frame') + '.jpg';
                    document.body.appendChild(a0);
                    a0.click();
                    a0.remove();
                    tlSetMeta('Frame captured from playback tile');
                    return;
                }
                throw new Error((d && d.error) || 'Capture failed');
            }
            tlSetMeta('Frame ready · ' + tlMsToLocalLabel(atMs));
            if (d.downloadUrl) {
                var a = document.createElement('a');
                a.href = d.downloadUrl;
                a.download = d.fileName || 'frame.jpg';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (err) {
            tlSetMeta(err && err.message ? err.message : 'Capture failed');
        }
    }

    function tlDefaultWindow() {
        var to = new Date();
        var from = new Date(to.getTime() - 3600000);
        var fromEl = $('inv-vms-from');
        var toEl = $('inv-vms-to');
        var dateEl = $('inv-vms-history-date');
        if (fromEl) fromEl.value = tlLocalInput(from);
        if (toEl) toEl.value = tlLocalInput(to);
        tlSyncDtTriggers();
        if (dateEl) dateEl.value = tlTodayDateInput();
        tl.selectedDate = null;
    }

    function initEmbeddedTimelineInvestigation() {
        if (!$('app-view-investigation')) return false;
        tlInitTiles();
        tlDefaultWindow();
        tlBindControls();
        tlApplyLayout('four');
        tlUpdateLayoutChrome();
        tlUpdateTimelineChrome();
        if (tl.tiles[0] && tl.tiles[0].tile) tl.tiles[0].tile.classList.add('active-focus');
        global.VmsInvestigationTimeline = {
            onShow: function () {
                tl.visible = true;
                tlLoadCameraTree().then(function () {
                    tlResizeOverlays();
                    tlDrawTimeline();
                });
            },
            onHide: function () {
                tl.visible = false;
            },
        };
        return true;
    }

    function bootWallPopout() {
        if (typeof global.BroadcastChannel === 'function') {
            try {
                channel = new global.BroadcastChannel(CH);
                channel.onmessage = function (ev) {
                    var d = ev && ev.data;
                    if (!d || typeof d !== 'object') return;
                    if (d.type === 'ping' || d.type === 'hello') {
                        heartbeat();
                        return;
                    }
                    /* VMS-SOS-SITE-ACK-HANDSHAKE-V1 — banner only; keep FLV / pool / window */
                    if (d.type === 'sos_ack' || d.action === 'sos_ack') {
                        showOpsAckBanner();
                        return;
                    }
                    if ((d.type === 'launch' || d.type === 'overwrite') && d.payload) {
                        fullRemount(d.payload, d.type === 'overwrite' ? 'overwrite' : 'open');
                        heartbeat();
                    }
                };
            } catch (_) { /* ignore */ }
        }

        try {
            var raw = sessionStorage.getItem(KEY);
            if (raw) fullRemount(JSON.parse(raw), 'open');
        } catch (_) { /* ignore */ }

        heartbeat();
        setInterval(heartbeat, 2000);

        function signalClosed() {
            destroyAllPlayers();
            post({ type: 'wall2-closed', at: Date.now() });
            post({ type: 'closed', at: Date.now() });
        }
        window.addEventListener('pagehide', signalClosed);
        window.addEventListener('unload', signalClosed);
    }

    function boot() {
        if (initEmbeddedTimelineInvestigation()) return;
        bootWallPopout();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window);
