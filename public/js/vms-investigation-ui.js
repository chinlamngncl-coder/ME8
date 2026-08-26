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

    function boot() {
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

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window);
