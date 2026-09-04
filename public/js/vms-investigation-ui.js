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
                /* VMS-PLAY-GESTURE-HYGIENE-V1 — AxiomFlvManager.attach already plays (muted retry +
                   click-to-play inside); the extra bare play() only produced an unhandled rejection. */
                if (!(global.AxiomFlvManager && typeof global.AxiomFlvManager.attach === 'function')) {
                    try { var p0 = video.play(); if (p0 && p0.catch) p0.catch(function () {}); } catch (_) { /* ignore */ }
                }
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
    /* INV-TIMELINE-MULTI-LANE-V1 */
    var LANE_LABEL_W = 54;
    var LANE_H = 16;
    var LANE_GAP = 3;
    var LANE_PIN_BAND = 18;

    var tl = {
        from: null,
        to: null,
        selectedDate: null,
        playheadMs: null,
        markInMs: null,
        markOutMs: null,
        dptzScale: 1,
        dptzPanX: 0,
        dptzPanY: 0,
        playing: false,
        /* INV-SYNC-MASTER-CLOCK-V1 */
        masterClockOn: false,
        masterClockOriginMs: null,
        masterClockOriginWall: 0,
        _masterRaf: null,
        _masterBusy: {},
        _masterDrawAcc: 0,
        speed: 1,
        syncLock: true,
        focusSlot: 0,
        tiles: [],
        mergedSegments: [],
        mergedAlarms: [],
        metadataFrames: [],
        dragging: false,
        panning: false,
        panLastX: 0,
        panMoved: false,
        zoomLevel: 1,
        viewFromMs: null,
        viewToMs: null,
        bound: false,
        visible: false,
        /* INV-LIVE-REFRESH-AND-CACHE-V1 */
        _sosDirtyCams: {},
        _sosPendingCams: {},
        _sosRefreshTimer: null,
        layoutMode: 'four',
        treeData: [],
        treeFilter: '',
        calYear: null,
        calMonth: null, /* 1–12 */
        recordingDays: {},
        alarmDays: {},
        alarmDayList: [],
        _apiAlarmDays: {},
        _timelineVipDays: {},
        _daysFetchGen: 0,
        calOpen: false,
        calDraftDate: null,
        ignoreOutsideClick: false,
    };

    function tlLayoutStatusText(mode) {
        if (mode === 'single') return 'Single Camera · Full Resolution';
        if (mode === 'six') {
            return tl.syncLock ? 'Six Cameras · Sync Lock' : 'Six Cameras · Independent';
        }
        if (mode === 'compare') return 'Same Camera · Time Compare';
        return tl.syncLock ? 'Four Cameras · Synchronised' : 'Four Cameras · Independent';
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
        var nextId = camId || null;
        var changed = String(tile.camId || '') !== String(nextId || '');
        tile.camId = nextId;
        tile.camName = camName || '';
        tile.activeSegmentId = null;
        tile.playing = false;
        /* INV-PLAY-FROM-PLAYHEAD-V1 — replacing Chin with kk must drop Chin's blue lane immediately */
        if (changed) {
            tile.segments = [];
            tile.alarms = [];
            tile.playheadMs = null;
            if (tile.status) tile.status.textContent = '';
        }
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
            /* INV-TAB-ONHIDE-TEARDOWN-V1 — pause → detach → unload (was src-strip first, then detach) */
            try { tile.video.pause(); } catch (_) { /* ignore */ }
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(tile.video);
            } catch (_) { /* ignore */ }
            try {
                tile.video.removeAttribute('src');
                tile.video.src = '';
                tile.video.load();
            } catch (_) { /* ignore */ }
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
        var stop = tile.tile.querySelector('.inv-vms-tile-stop');
        var mute = tile.tile.querySelector('.inv-vms-tile-mute');
        var show = !!tile.camId;
        var hasMedia = !!(tile.video && tile.video.getAttribute('src'));
        if (play) {
            play.hidden = !show || !!tile.playing;
            play.disabled = !show;
        }
        if (pause) {
            pause.hidden = !show || !tile.playing;
            pause.disabled = !show;
        }
        if (stop) {
            stop.hidden = !show || (!tile.playing && !hasMedia);
            stop.disabled = !show;
        }
        if (mute) {
            mute.hidden = !show;
            mute.disabled = !show;
            var muted = !!tile.audioMuted;
            mute.textContent = muted ? 'Unmute' : 'Mute';
            mute.setAttribute('data-i18n', muted ? 'investigation.unmute' : 'investigation.mute');
            mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
            mute.classList.toggle('is-muted', muted);
            try {
                if (global.I18n && typeof I18n.t === 'function') {
                    var key = muted ? 'investigation.unmute' : 'investigation.mute';
                    var tr = I18n.t(key);
                    if (tr && tr !== key) mute.textContent = tr;
                }
            } catch (_) { /* ignore */ }
        }
    }

    function tlApplyTileAudio(tile) {
        if (!tile || !tile.video) return;
        try {
            tile.video.muted = !!tile.audioMuted;
        } catch (_) { /* ignore */ }
    }

    function tlToggleTileMute(tile) {
        if (!tile) return;
        tile.audioMuted = !tile.audioMuted;
        tlApplyTileAudio(tile);
        tlUpdateTileTransport(tile);
        tlSetMeta(tile.audioMuted
            ? ('Slot ' + (tile.slot + 1) + ' muted.')
            : ('Slot ' + (tile.slot + 1) + ' unmuted.'));
    }

    function tlUpdateAllTileTransport() {
        tl.tiles.forEach(tlUpdateTileTransport);
        tlUpdateMasterTransportChrome();
    }

    function tlPlayErrorMeta(err) {
        var name = err && err.name ? String(err.name) : '';
        if (name === 'NotAllowedError') {
            return 'Browser blocked play after load. Trying muted play — click Play again if still black.';
        }
        if (name === 'NotSupportedError') {
            return 'Recording stream not readable (format or decrypt). Check segment stream.';
        }
        if (name === 'AbortError') {
            return 'Playback aborted while loading. Click Play From Alarm again.';
        }
        if (!err) return 'Playback failed.';
        return 'Playback failed (' + (name || 'error') + ').';
    }

    function tlEnsureVideoPlayAttrs(video) {
        if (!video) return;
        try {
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.playsInline = true;
            video.preload = 'auto';
        } catch (_) { /* ignore */ }
    }

    /**
     * VMS-PLAY-USER-GESTURE-V1 — play after async seek/load without relying on spent click gesture.
     * Start muted (allowed), then unmute once playing.
     */
    function tlPlayVideoElement(video, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            if (!video || !video.src) {
                resolve({ ok: false, reason: 'no-src' });
                return;
            }
            tlEnsureVideoPlayAttrs(video);
            if (opts.rate != null && Number.isFinite(opts.rate)) {
                try { video.playbackRate = opts.rate; } catch (_) { /* ignore */ }
            }
            video.muted = true;
            var p;
            try {
                p = video.play();
            } catch (e) {
                resolve({ ok: false, err: e });
                return;
            }
            function tryUnmute() {
                if (opts.unmute === false) {
                    resolve({ ok: true, muted: true });
                    return;
                }
                try { video.muted = false; } catch (_) { /* ignore */ }
                if (video.paused) {
                    video.muted = true;
                    try { video.play(); } catch (_) { /* ignore */ }
                    resolve({ ok: true, muted: true });
                    return;
                }
                resolve({ ok: true, muted: !!video.muted });
            }
            if (p && typeof p.then === 'function') {
                p.then(tryUnmute).catch(function (err) {
                    video.muted = true;
                    var p2;
                    try { p2 = video.play(); } catch (e2) {
                        resolve({ ok: false, err: err });
                        return;
                    }
                    if (p2 && typeof p2.then === 'function') {
                        p2.then(function () { resolve({ ok: true, muted: true }); })
                            .catch(function (e3) { resolve({ ok: false, err: e3 || err }); });
                    } else {
                        resolve({ ok: true, muted: true });
                    }
                });
            } else {
                tryUnmute();
            }
        });
    }

    function tlNearestInDirection(tile, fromMs, forward) {
        var segs = (tile && tile.segments) || [];
        var best = null;
        var i;
        for (i = 0; i < segs.length; i++) {
            var s = segs[i];
            if (!s || s.status === 'unavailable') continue;
            var a = tlIsoToMs(s.start_at);
            var b = tlIsoToMs(s.end_at);
            if (!Number.isFinite(a)) continue;
            if (!Number.isFinite(b) || b < a) b = a + 1000;
            if (forward) {
                if (a > fromMs && (best == null || a < best)) best = a;
            } else {
                if (b < fromMs && (best == null || b > best)) best = b;
            }
        }
        return best;
    }

    function tlNextSectorMs(fromMs, forward) {
        var best = null;
        tl.tiles.forEach(function (t) {
            if (!t || !t.camId) return;
            if (typeof tlTileActiveInLayout === 'function' && !tlTileActiveInLayout(t)) return;
            (t.segments || []).forEach(function (seg) {
                if (!seg || seg.status === 'unavailable') return;
                var st = tlIsoToMs(seg.start_at);
                var en = tlIsoToMs(seg.end_at);
                if (!Number.isFinite(st)) return;
                if (!Number.isFinite(en) || en < st) en = st + 1000;
                if (forward) {
                    if (st > fromMs + 40 && (best == null || st < best)) best = st;
                } else if (en < fromMs - 40) {
                    if (best == null || st > best) best = st;
                }
            });
        });
        return best;
    }

    function tlStepFocus(deltaMs) {
        var tile = tlFocusTile();
        if (!tile || !tile.camId) {
            tlSetMeta('Focus a tile with a camera loaded first.');
            return;
        }
        if (!tile.segments || !tile.segments.length) {
            tlSetMeta('No recording loaded. Load Recordings first.');
            return;
        }
        if (tile.playing) tlPauseTile(tile);
        if (tl.masterClockOn) tlStopMasterClock();
        var base = Number.isFinite(tile.playheadMs) ? tile.playheadMs
            : (Number.isFinite(tl.playheadMs) ? tl.playheadMs : null);
        if (!Number.isFinite(base)) {
            var near0 = tlNearestPlayableMs(tile, tl.from ? tl.from.getTime() : null);
            if (near0 == null) {
                tlSetMeta('No playable time on this camera.');
                return;
            }
            base = near0;
        }
        var target;
        /* Sync Lock ±1s = next/prev blue sector (manual hop; no gap crawl). */
        if (tl.syncLock && Math.abs(deltaMs) >= 900) {
            target = tlNextSectorMs(base, deltaMs > 0);
            if (target == null) {
                tlSetMeta(deltaMs > 0 ? 'No next blue sector.' : 'No previous blue sector.');
                return;
            }
        } else {
            target = base + deltaMs;
            if (tl.from) target = Math.max(tl.from.getTime(), target);
            if (tl.to) target = Math.min(tl.to.getTime(), target);
            if (!tlFindSegmentAt(tile.segments, target)) {
                var hop = tlNearestInDirection(tile, base, deltaMs > 0);
                if (hop == null) {
                    tlSetMeta(deltaMs > 0 ? 'At end of recording.' : 'At start of recording.');
                    return;
                }
                target = hop;
            }
        }
        tile.playheadMs = target;
        tl.playheadMs = target;
        var readout = $('inv-vms-time-readout');
        if (readout) readout.textContent = tlMsToLocalLabel(target);
        if (tl.syncLock) {
            tl.tiles.forEach(function (t) {
                if (!tlShouldSeekTile(t)) return;
                t.playheadMs = target;
                if (t.playing) tlPauseTile(t);
            });
            tlSeekAll(target);
            tlSetMeta((deltaMs > 0 ? 'Next' : 'Previous') + ' sector · ' +
                tlMsToLocalLabel(target) + ' · press Play All');
            tlDrawTimeline();
            tlDrawOverlays();
            tlUpdateAllTileTransport();
        } else {
            tlSeekTile(tile, target).then(function () {
                tlDrawTimeline();
                tlDrawOverlays();
                tlUpdateAllTileTransport();
            });
            var abs = Math.abs(deltaMs);
            var label = abs >= 900 ? ((deltaMs < 0 ? '−' : '+') + Math.round(abs / 1000) + 's')
                : ((deltaMs < 0 ? '−' : '+') + 'frame');
            tlSetMeta('Step ' + label + ' · ' + tlMsToLocalLabel(target));
        }
    }

    function tlPlayTile(tile) {
        if (!tile || !tile.camId || !tile.video) {
            tlSetMeta('Select a camera on this tile first.');
            return;
        }
        /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — tile Play releases this slot's hold. */
        tile.hold = false;
        tile._exhaustedSegId = null;
        /* Sync On: tile Playback = same as Play All from timeline marker (no jump-back). */
        if (tl.syncLock && tl.layoutMode !== 'compare') {
            if (tl.masterClockOn) {
                /* Master already running for the other slots — this slot simply rejoins on the next tick. */
                tlUpdateAllTileTransport();
                return;
            }
            if (!Number.isFinite(tl.playheadMs) && Number.isFinite(tile.playheadMs)) {
                tl.playheadMs = tile.playheadMs;
            }
            tlSyncPlayVideos();
            return;
        }
        tlAuditPlayAllNoRecord('playback_tile');
        tlOnFocusSlot(tile.slot);
        /* INV-PLAY-FROM-PLAYHEAD-V1 — never snap to clip start; play from yellow only */
        var at = Number.isFinite(tl.playheadMs) ? tl.playheadMs
            : (Number.isFinite(tile.playheadMs) ? tile.playheadMs : null);
        if (at == null) {
            tlSetMeta('Move the timeline marker onto a blue block, then press Playback.');
            return;
        }
        if (!tlFindSegmentAt(tile.segments || [], at)) {
            tlSetMeta('No recording at the timeline marker for this camera. Move the marker onto a blue block.');
            return;
        }
        tile.playheadMs = at;
        if (tile.slot === tl.focusSlot || tl.syncLock) tl.playheadMs = at;
        tlDrawTimeline();
        tile.playing = true;
        tlEnsureVideoPlayAttrs(tile.video);
        /* Seek once (load+#t / currentTime), then play — no second seek chain. */
        tlSeekTile(tile, at).then(function (ok) {
            if (ok === false) { /* INV-SYNC-SEEK-GENERATION-V1 — superseded / cam changed mid-seek */
                if (tile.playing && !tile.activeSegmentId) tile.playing = false;
                tlUpdateAllTileTransport();
                return null;
            }
            if (!tile.playing || !tile.video) return null;
            if (!tile.video.src) {
                tlSetMeta('Recording file could not be opened for playback.');
                tile.playing = false;
                tlUpdateAllTileTransport();
                return null;
            }
            return tlPlayVideoElement(tile.video, { rate: tl.speed, unmute: !tile.audioMuted });
        }).then(function (res) {
            if (!res) return;
            tlApplyTileAudio(tile);
            if (!res.ok) {
                tile.playing = false;
                tlSetMeta(tlPlayErrorMeta(res.err));
            } else if (tile.audioMuted || res.muted) {
                tlSetMeta(tile.audioMuted
                    ? 'Playing from timeline marker (tile muted).'
                    : 'Playing from timeline marker (sound muted by browser).');
            } else {
                tlSetMeta('Playing from timeline marker.');
            }
            tlUpdateAllTileTransport();
        });
    }

    function tlPauseTile(tile) {
        if (!tile) return;
        tile.playing = false;
        /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — per-slot hold: master clock must not re-play it */
        tile.hold = true;
        if (tile.video) {
            try { tile.video.pause(); } catch (_) { /* ignore */ }
            /* INV-SYNC-ONE-CLOCK-HARD-V1 — master owns playhead; do not steal from video. */
            if (!tl.masterClockOn && tile.activeSegmentId && Number.isFinite(tile.video.currentTime)) {
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

    /** Capture playhead from current media time (same as pause). */
    function tlCaptureTilePlayhead(tile) {
        if (!tile || !tile.video || !tile.activeSegmentId) return;
        if (tl.masterClockOn) return;
        if (!Number.isFinite(tile.video.currentTime)) return;
        var seg = null;
        var si;
        for (si = 0; si < tile.segments.length; si++) {
            if (tile.segments[si].segmentId === tile.activeSegmentId) {
                seg = tile.segments[si];
                break;
            }
        }
        if (!seg) return;
        tile.playheadMs = tlIsoToMs(seg.start_at) + tile.video.currentTime * 1000;
        if (tile.slot === tl.focusSlot) tl.playheadMs = tile.playheadMs;
    }

    function tlUnloadTileVideo(tile) {
        if (!tile || !tile.video) return;
        var v = tile.video;
        try { v.pause(); } catch (_) { /* ignore */ }
        try {
            if (global.AxiomFlvManager) global.AxiomFlvManager.detach(v);
        } catch (_) { /* ignore */ }
        try {
            v.removeAttribute('src');
            v.src = '';
            v.load();
        } catch (_) { /* ignore */ }
        if (tile.activeSegmentId && tl._segmentClaims &&
            String(tl._segmentClaims[tile.activeSegmentId] || '') === String(tile.camId || '')) {
            delete tl._segmentClaims[tile.activeSegmentId];
        }
        tile.activeSegmentId = null;
        tile._streamCamId = null;
    }

    function tlStopTile(tile) {
        if (!tile) return;
        tlCaptureTilePlayhead(tile);
        tile.playing = false;
        tile.hold = true; /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 */
        tlUnloadTileVideo(tile);
        tlUpdateAllTileTransport();
        tlDrawTimeline();
    }

    function tlStopVideos() {
        tlStopMasterClock();
        tl.tiles.forEach(function (tile) {
            tlCaptureTilePlayhead(tile);
            tile.playing = false;
            tlUnloadTileVideo(tile);
        });
        tlUpdateAllTileTransport();
        tlDrawTimeline();
        tlSetMeta('Stopped. Timeline marker kept — press Play All to resume from here.');
    }

    /**
     * INV-TAB-ONHIDE-TEARDOWN-V1 — operator left the Investigation tab. Stop the master
     * clock (RAF), pause + detach + unload every tile video (own FLV sessions only — the
     * Ops wall players are never touched), keep each playhead so Play All resumes.
     * Idempotent: safe when nothing is playing.
     */
    function tlTeardownForHide() {
        try { tlStopMasterClock(); } catch (_) { /* ignore */ }
        var hadVideo = false;
        tl.tiles.forEach(function (tile) {
            if (!tile) return;
            if (tile.playing || (tile.video && tile.video.src)) hadVideo = true;
            try { tlCaptureTilePlayhead(tile); } catch (_) { /* ignore */ }
            tile.playing = false;
            try { tlUnloadTileVideo(tile); } catch (_) { /* ignore */ }
        });
        if (hadVideo) {
            try { tlUpdateAllTileTransport(); } catch (_) { /* ignore */ }
        }
    }

    /* INV-LIVE-REFRESH-AND-CACHE-V1 — SOS lane refresh: per-cam coalesced (600 ms), one draw. */
    function tlRefreshSosLanes(camIds) {
        var jobs = [];
        var names = [];
        tl.tiles.forEach(function (tile) {
            if (!tile || !tile.camId || camIds.indexOf(String(tile.camId)) < 0) return;
            names.push(tlShortTreeLabel(tile.camName, tile.camId));
            jobs.push(Promise.resolve(tlFetchTileTimeline(tile)).catch(function () { /* ignore */ }));
        });
        if (!jobs.length) {
            tlSetMeta('SOS raised. Load Recordings (or re-assign cam) to show the red pin.');
            return;
        }
        Promise.all(jobs).then(function () {
            if (!tl.visible) return;
            tlMergeTimelineData();
            tlDrawTimeline();
            tlSetMeta('SOS marker refreshed for ' + names.join(', ') +
                '. Scrub yellow onto blue overlap for Sync Play — pins are markers only.');
        });
    }

    function tlQueueSosRefresh(camId) {
        tl._sosPendingCams[camId] = true;
        if (tl._sosRefreshTimer) return;
        tl._sosRefreshTimer = setTimeout(function () {
            tl._sosRefreshTimer = null;
            var cams = Object.keys(tl._sosPendingCams);
            tl._sosPendingCams = {};
            if (cams.length) tlRefreshSosLanes(cams);
        }, 600);
    }

    function tlFlushSosDirty() {
        var cams = Object.keys(tl._sosDirtyCams);
        if (!cams.length) return;
        tl._sosDirtyCams = {};
        tlRefreshSosLanes(cams);
    }

    function tlClipSegmentEndToMedia(tile, seg, mediaDurSec) {
        if (!seg) return false;
        var start = tlIsoToMs(seg.start_at);
        var durMs = Number(mediaDurSec) * 1000;
        if (!Number.isFinite(start) || !Number.isFinite(durMs) || durMs < 80) return false;
        var mediaEnd = start + Math.round(durMs);
        var curEnd = tlIsoToMs(seg.end_at);
        if (Number.isFinite(curEnd) && mediaEnd >= curEnd - 30) return false;
        var iso = new Date(mediaEnd).toISOString();
        function patch(list) {
            (list || []).forEach(function (s) {
                if (!s) return;
                if (seg.segmentId && s.segmentId === seg.segmentId) s.end_at = iso;
            });
        }
        patch(tile && tile.segments);
        patch(tl.mergedSegments);
        seg.end_at = iso;
        return true;
    }

    /**
     * INV-PLAY-FROM-PLAYHEAD-V1 — clip ended: stop chrome, keep yellow where it is.
     * Do NOT auto-jump to the next segment (that stole the playhead).
     */
    function tlOnTilePlaybackEnded(tile) {
        if (!tile) return;
        tile.playing = false;
        /* INV-SYNC-SECTOR-STOP-V1 — this slot only goes black.
           Do NOT kill Sync for everyone (that froze other cams mid-play).
           Master clock keeps running while any selected slot still has blue;
           it stops itself when all slots are in a gap. */
        tlUnloadTileVideo(tile);
        if (tl.masterClockOn) {
            tlUpdateAllTileTransport();
            tlDrawTimeline();
            return;
        }
        tlCaptureTilePlayhead(tile);
        tlUpdateAllTileTransport();
        tlDrawTimeline();
        if (tile.slot === tl.focusSlot || !tlAnyTilePlaying()) {
            tlSetMeta('Playback stopped at the timeline marker. Move the marker, then press Play All.');
        }
    }

    function tlOnTilePlaybackError(tile) {
        if (!tile) return;
        tile.playing = false;
        if (tile.video) {
            try { tile.video.pause(); } catch (_) { /* ignore */ }
        }
        tlUpdateAllTileTransport();
        tlDrawTimeline();
        if (tile.slot === tl.focusSlot || !tlAnyTilePlaying()) {
            tlSetMeta('Playback stopped (stream error). Yellow line kept — click Play to try again.');
        }
    }

    function tlBindTilePlaybackLifecycle(tile) {
        if (!tile || !tile.video || tile._invPlayEndedBound) return;
        tile._invPlayEndedBound = true;
        tile.video.addEventListener('ended', function () {
            tlOnTilePlaybackEnded(tile);
        });
        tile.video.addEventListener('error', function () {
            if (!tile.playing && !tile.activeSegmentId) return;
            tlOnTilePlaybackError(tile);
        });
        /* INV-SYNC-SEEK-GENERATION-V1 — transport chrome follows the media element. A browser-side
           pause (autoplay policy, native controls, stalled decode) while the tile still says
           "playing" would leave a Pause button on a frozen frame. Ignored while a seek/load is in
           flight (load() fires pause) and under the master clock (the tick re-plays paused slots). */
        tile.video.addEventListener('pause', function () {
            if (!tile.playing || tile._seekBusy || tl.masterClockOn) return;
            var v = tile.video;
            if (!v || v.ended || !v.getAttribute('src') || v.readyState < 2) return;
            tile.playing = false;
            tlUpdateAllTileTransport();
        });
    }

    function tlDisplaySegments() {
        /* INV-TIMELINE-MULTI-LANE-V1 — Sync Off / single: focus cam only.
           Sync On four/six: draw uses per-lane tiles (not this list). */
        if (tl.layoutMode === 'four' || tl.layoutMode === 'six') {
            if (tl.syncLock) return tl.mergedSegments;
            var ftOff = tlFocusTile();
            if (!ftOff || !ftOff.camId) return [];
            return (ftOff.segments || []).map(function (s) {
                return Object.assign({ camId: ftOff.camId }, s);
            });
        }
        var ft = tlFocusTile();
        if (!ft || !ft.camId) return [];
        return (ft.segments || []).map(function (s) {
            return Object.assign({ camId: ft.camId }, s);
        });
    }

    function tlDisplayAlarms() {
        if (tl.layoutMode === 'four' || tl.layoutMode === 'six') {
            if (tl.syncLock) return tl.mergedAlarms;
            var ftOff = tlFocusTile();
            if (!ftOff || !ftOff.camId) return [];
            return (ftOff.alarms || []).map(function (a) {
                return Object.assign({ camId: ftOff.camId }, a);
            });
        }
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
        else if (tl.layoutMode === 'compare') {
            var ftC = tlFocusTile();
            if (ftC) {
                if (ftC.playheadMs == null && tl.from) ftC.playheadMs = tl.from.getTime();
                if (ftC.playheadMs != null) tl.playheadMs = ftC.playheadMs;
            }
            tlSyncCompareTimeInput(ftC);
            tlDrawTimeline();
        } else if (tl.layoutMode === 'four' || tl.layoutMode === 'six') {
            /* INV-TIMELINE-MULTI-LANE-V1 — focus links timeline highlight / Sync Off clock */
            var ft = tlFocusTile();
            if (!tl.syncLock && ft) {
                if (ft.playheadMs == null && tl.from) ft.playheadMs = tl.from.getTime();
                if (ft.playheadMs != null) tl.playheadMs = ft.playheadMs;
                if (Number.isFinite(ft.playheadMs)) tlSeekTile(ft, ft.playheadMs);
            }
            tlDrawTimeline();
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
        tlRenderEventList();
        /* Slot-assign cue — Focus owns next tree pick + scrubber. */
        var focus = tlFocusTile();
        if (focus && tl.layoutMode !== 'compare') {
            var label = focus.camId
                ? tlShortTreeLabel(focus.camName, focus.camId)
                : 'empty';
            var syncNote = (tl.layoutMode === 'four' || tl.layoutMode === 'six')
                ? (tl.syncLock ? ' · multi-lane Sync On' : ' · timeline = this slot')
                : '';
            tlSetMeta('Focus · slot ' + (focus.slot + 1) + ' · ' + label + syncNote +
                '. Click a camera to assign here, or drag onto another tile.');
        }
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
            /* INV-LIVE-REFRESH-AND-CACHE-V1 — a slot hidden by the layout was only paused: its FLV
               session and buffer stayed alive. Keep playhead, release the media; it re-seeks when
               the layout shows it again (tlSeekAll only touches active slots). */
            try { tlCaptureTilePlayhead(t); } catch (_) { /* ignore */ }
            t.playing = false;
            tlUnloadTileVideo(t);
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
                '. Click a tile to Focus, then a camera to assign to that slot.');
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

        /* Toggle off if this cam is already on a visible tile. */
        if (tlTilesWithCam(camId).length) {
            tlClearCamFromVisibleSlots(camId);
            tlMergeTimelineData();
            tlDrawTimeline();
            tlSyncFocusCamBar();
            return;
        }

        /*
         * INV-MULTI-PLAY-STABLE-V1 — keep multi-lane:
         * Prefer next empty slot so Chin+kk become 2 lanes.
         * Replace Focus only when every visible slot is already filled.
         */
        var empty = tlNextEmptyTile();
        var focus = tlFocusTile();
        var target = null;
        if (empty) {
            target = empty;
        } else if (focus && tlSlotVisibleInLayout(focus.slot)) {
            target = focus;
        } else {
            target = tl.tiles[0];
        }
        if (!target) return;
        if (target.camId) {
            tlSetMeta('Replaced slot ' + (target.slot + 1) +
                ' (all slots full). Toggle a camera off to free a slot.');
        } else if (focus && focus.camId && target.slot !== focus.slot) {
            tlSetMeta('Added to slot ' + (target.slot + 1) +
                ' — previous cameras stay on their slots (multi-lane).');
        }
        tlOnFocusSlot(target.slot);
        tlAssignCameraToTile(target, camId, camName);
    }

    function tlAssignCameraToTile(tile, camId, camName) {
        if (!tile) return;
        /* INV-TAB-ONHIDE-TEARDOWN-V1 — reassign while Sync runs: stop the clock first, or the
           RAF keeps stepping a slot whose video was just detached. */
        if (tl.masterClockOn) tlStopMasterClock();
        tlRadioTeardownForTile(tile);
        if (tl.layoutMode === 'compare') {
            var i;
            for (i = 0; i < 4; i++) {
                if (tl.tiles[i]) tlBindCamFields(tl.tiles[i], camId, camName);
            }
            tlHighlightTreeSelection(camId);
            tlRefreshRecordingDays();
            tlSyncFocusCamBar();
            tlMergeTimelineData();
            tlDrawTimeline();
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
        tlMergeTimelineData();
        tlDrawTimeline();
        if (!camId) {
            tlSetMeta('');
            return;
        }
        /* Auto-fetch this slot's timeline when day/range already set — no Calendar OK needed */
        if (tl.selectedDate || (tl.from && tl.to)) {
            tlSetMeta('Loading timeline for slot ' + (tile.slot + 1) + ' · '
                + tlShortTreeLabel(camName, camId) + '\u2026');
            Promise.resolve(tlFetchTileTimeline(tile)).then(function () {
                tlMergeTimelineData();
                /* Do NOT move yellow to clip start when adding a 2nd/3rd cam */
                if (!Number.isFinite(tl.playheadMs) && tile.segments && tile.segments.length) {
                    var first = tlIsoToMs(tile.segments[0].start_at);
                    if (Number.isFinite(first)) {
                        tl.playheadMs = first;
                        tile.playheadMs = first;
                    }
                } else if (Number.isFinite(tl.playheadMs)) {
                    tile.playheadMs = tl.playheadMs;
                }
                tlDrawTimeline();
                var n = tlLaneTilesForTimeline().length;
                tlSetMeta('Slot ' + (tile.slot + 1) + ' · ' + tlShortTreeLabel(camName, camId)
                    + ' ready · ' + n + ' lane(s). Sync On = multi-lane. Scrub yellow, then Play All.');
            }).catch(function () {
                tlSetMeta('Could not load timeline for '
                    + tlShortTreeLabel(camName, camId) + '. Try Calendar OK / Load Recordings.');
            });
            return;
        }
        tlSetMeta('Assigned to slot ' + (tile.slot + 1) +
            ' · ' + tlShortTreeLabel(camName, camId) +
            '. Set Calendar / times, then Load Recordings.');
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

    function tlCamSourceKind(camOrId) {
        var obj = null;
        if (camOrId && typeof camOrId === 'object') obj = camOrId;
        else if (camOrId != null && camCatalog[String(camOrId)]) obj = camCatalog[String(camOrId)];
        if (!obj) return 'fixed';
        var t = String(obj.type || '').toLowerCase();
        if (t === 'bwc' || t === 'bodyworn' || t === 'body-worn') return 'bwc';
        if (obj.deviceId && !obj.streamSource) return 'bwc';
        if (t === 'fixed' || t === 'nvr' || t === 'ip' || t === 'onvif') return 'fixed';
        if (obj.streamSource || obj.zone_id || obj.ptzEnabled != null) return 'fixed';
        return 'fixed';
    }

    function tlMakeTreeCamButton(cam) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inv-vms-tree-cam';
        btn.setAttribute('data-cam-id', cam.id);
        btn.setAttribute('role', 'treeitem');
        btn.draggable = true;
        var kind = tlCamSourceKind(cam);
        btn.setAttribute('data-source-kind', kind);
        var fullTitle = (cam.name && String(cam.name) !== String(cam.id))
            ? (String(cam.name).trim() + ' · ' + cam.id)
            : String(cam.id || cam.name || '');
        fullTitle = (kind === 'bwc' ? 'BWC · ' : 'Fixed · ') + fullTitle;
        btn.title = fullTitle;
        btn.setAttribute('data-cam-title', fullTitle);
        var badge = document.createElement('span');
        badge.className = 'inv-vms-tree-cam-badge inv-vms-tree-cam-badge--' + kind;
        badge.textContent = kind === 'bwc' ? 'BWC' : 'Fixed';
        badge.setAttribute('aria-hidden', 'true');
        var nameEl = document.createElement('span');
        nameEl.className = 'inv-vms-tree-cam-name';
        nameEl.textContent = tlShortTreeLabel(cam.name, cam.id);
        btn.appendChild(badge);
        btn.appendChild(nameEl);
        btn.addEventListener('click', function () {
            tlTreePickCamera(cam);
        });
        btn.addEventListener('dragstart', function (ev) {
            try {
                ev.dataTransfer.setData('application/x-inv-vms-cam', JSON.stringify({
                    id: cam.id,
                    name: cam.name || cam.id,
                    type: kind,
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
                        type: 'bwc',
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
    /* ALARM-MARKER-CONTRACT-V1 — one reader for marker time (REST occurred_at / socket occurredAt / at). */
    function tlAlarmAt(al) {
        if (!al) return NaN;
        return tlIsoToMs(al.occurred_at || al.occurredAt || al.at);
    }

    function tlMsToLocalLabel(ms) {
        if (!Number.isFinite(ms)) return '\u2014';
        try {
            var d = new Date(ms);
            if (typeof global.fmtDateTime === 'function') {
                var base = global.fmtDateTime(d.toISOString());
                var sec = d.getSeconds();
                var pad = function (n) { return n < 10 ? '0' + n : String(n); };
                /* Centre chrome + seconds for scrub readout */
                if (base && /,\s*\d{2}:\d{2}$/.test(base)) {
                    return base + ':' + pad(sec);
                }
                return base || '\u2014';
            }
            var pad2 = function (n) { return n < 10 ? '0' + n : String(n); };
            return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
                ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
        } catch (_) {
            return '\u2014';
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
        if (!p.date) return '\u2014 Select \u2014';
        var iso = p.date + 'T' + (p.time ? p.time.slice(0, 5) : '00:00');
        if (typeof global.fmtDateTime === 'function') return global.fmtDateTime(iso);
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
            if (typeof tlDayHasVipRed === 'function' ? tlDayHasVipRed(iso) :
                (tl.alarmDays[iso] || (tl.alarmDayList && tl.alarmDayList.indexOf(iso) >= 0))) {
                btn.classList.add('has-alarm');
                var vipDot = document.createElement('span');
                vipDot.className = 'inv-vms-cal-vip-dot';
                vipDot.setAttribute('aria-hidden', 'true');
                btn.appendChild(vipDot);
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
        if (typeof tlApplyVipRedClasses === 'function') tlApplyVipRedClasses(grid);
    }

    function tlSyncCalMonthFromUnifiedRange() {
        /* VMS-CALENDAR-VIP-RED-UNIFY-V1: Calendar month = Start Time (same unified range). */
        var hid = $('inv-vms-from');
        var parts = tlDtParts(hid && hid.value);
        var dateStr = (parts && parts.date) || tlTodayDateInput();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr = tlTodayDateInput();
        var p = dateStr.split('-').map(Number);
        if (p[0] && p[1]) {
            tl.calYear = p[0];
            tl.calMonth = p[1];
        }
        if (!tl.calDraftDate) tl.calDraftDate = dateStr;
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
        /* Keep shared month on the same unified Start/End date — no separate calendar year. */
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
        if (t.indexOf('tamper') >= 0 || t.indexOf('motion') >= 0 || t.indexOf('intrusion') >= 0 ||
            t.indexOf('line_crossing') >= 0 || t.indexOf('crossing') >= 0) return '#fbbf24';
        if (t.indexOf('fr') >= 0 || t.indexOf('face') >= 0 || t.indexOf('anpr') >= 0 ||
            t.indexOf('weapon') >= 0 || t.indexOf('ai') >= 0 || t.indexOf('analytics') >= 0) return '#22d3ee';
        return '#22d3ee';
    }

    function tlSegmentCoversMs(ms, camId) {
        if (!Number.isFinite(ms)) return false;
        var i;
        if (camId) {
            for (i = 0; i < (tl.tiles || []).length; i++) {
                var t = tl.tiles[i];
                if (!t || String(t.camId || '') !== String(camId)) continue;
                if (tlFindSegmentAt(t.segments || [], ms)) return true;
            }
        }
        var segs = tl.mergedSegments || [];
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

    /** Nearest playable time on this tile (segment start if playhead is outside all clips). */
    function tlNearestPlayableMs(tile, preferMs) {
        var segs = (tile && tile.segments) || [];
        var bestAt = null;
        var bestDist = Infinity;
        var i;
        for (i = 0; i < segs.length; i++) {
            var s = segs[i];
            if (!s || s.status === 'unavailable') continue;
            var a = tlIsoToMs(s.start_at);
            var b = tlIsoToMs(s.end_at);
            if (!Number.isFinite(a)) continue;
            if (!Number.isFinite(b) || b < a) b = a + 1000;
            if (Number.isFinite(preferMs) && preferMs >= a && preferMs <= b) return preferMs;
            var dist = Number.isFinite(preferMs)
                ? (preferMs < a ? (a - preferMs) : (preferMs - b))
                : a;
            if (dist < bestDist) {
                bestDist = dist;
                bestAt = a;
            }
        }
        return bestAt;
    }

    function tlResolvePlayAtMs(tile, opts) {
        opts = opts || {};
        var at = tile && tile.playheadMs != null ? tile.playheadMs
            : (tl.playheadMs != null ? tl.playheadMs : (tl.from ? tl.from.getTime() : null));
        /* INV-TIMELINE-MULTI-LANE-V1 — Sync Lock: exact shared clock, no snap to another clip */
        if (opts.sharedClock || (tl.syncLock && (tl.layoutMode === 'four' || tl.layoutMode === 'six') && !opts.allowSnap)) {
            at = Number.isFinite(tl.playheadMs) ? tl.playheadMs : at;
            if (at == null || !tile) return null;
            if (tlFindSegmentAt(tile.segments || [], at)) return at;
            return null;
        }
        if (at == null || !tile) return null;
        if (tlFindSegmentAt(tile.segments || [], at)) return at;
        return tlNearestPlayableMs(tile, at);
    }

    function tlAlarmEventId(al) {
        if (!al) return '';
        var id = al.id || al.markerId || al.marker_id || al.eventId || al.event_id || '';
        return String(id).trim();
    }

    function tlCopyAlarmPreviewId() {
        var prev = tl._alarmPreview;
        var id = (prev && prev.alarmId) ? String(prev.alarmId) : '';
        if (!id && prev && prev.al) id = tlAlarmEventId(prev.al);
        if (!id) {
            tlSetMeta('No alarm ID to copy.');
            return;
        }
        function ok() {
            tlSetMeta('Alarm ID copied.');
        }
        function fail() {
            tlSetMeta('Could not copy alarm ID.');
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(id).then(ok).catch(function () {
                    try {
                        var ta = document.createElement('textarea');
                        ta.value = id;
                        ta.setAttribute('readonly', '');
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        ok();
                    } catch (_) { fail(); }
                });
                return;
            }
        } catch (_) { /* fall through */ }
        try {
            var ta2 = document.createElement('textarea');
            ta2.value = id;
            ta2.setAttribute('readonly', '');
            ta2.style.position = 'fixed';
            ta2.style.left = '-9999px';
            document.body.appendChild(ta2);
            ta2.select();
            document.execCommand('copy');
            document.body.removeChild(ta2);
            ok();
        } catch (_) { fail(); }
    }

    function tlCloseAlarmPreview() {
        var panel = $('inv-vms-alarm-preview');
        if (panel) {
            panel.hidden = true;
            panel.classList.remove('is-no-recording');
            panel.classList.remove('is-has-recording');
            panel.classList.remove('is-minimized');
            panel.classList.remove('is-dragging');
        }
        var minBtn = $('inv-vms-alarm-preview-min');
        if (minBtn) {
            minBtn.textContent = '\u2212';
            minBtn.setAttribute('aria-label', 'Minimize');
            minBtn.title = 'Minimize';
        }
        var img = $('inv-vms-alarm-preview-img');
        if (img) {
            img.hidden = true;
            img.removeAttribute('src');
        }
        var playBtn = $('inv-vms-alarm-preview-play');
        if (playBtn) playBtn.hidden = true;
        tl._alarmPreview = null;
    }

    function tlSetAlarmPreviewMinimized(on) {
        var panel = $('inv-vms-alarm-preview');
        var minBtn = $('inv-vms-alarm-preview-min');
        if (!panel) return;
        panel.classList.toggle('is-minimized', !!on);
        if (minBtn) {
            minBtn.textContent = on ? '\u25A1' : '\u2212';
            minBtn.setAttribute('aria-label', on ? 'Restore' : 'Minimize');
            minBtn.title = on ? 'Restore' : 'Minimize';
        }
    }

    function tlBindAlarmPreviewChrome() {
        if (tl._alarmPreviewChromeBound) return;
        tl._alarmPreviewChromeBound = true;
        var panel = $('inv-vms-alarm-preview');
        var head = $('inv-vms-alarm-preview-drag');
        var minBtn = $('inv-vms-alarm-preview-min');
        if (!panel || !head) return;
        var drag = { on: false, ox: 0, oy: 0, moved: false };

        function placePanel(left, top) {
            var w = panel.offsetWidth || 300;
            var h = panel.offsetHeight || 80;
            var maxL = Math.max(8, window.innerWidth - w - 8);
            var maxT = Math.max(8, window.innerHeight - h - 8);
            left = Math.max(8, Math.min(maxL, left));
            top = Math.max(8, Math.min(maxT, top));
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';
            tl._alarmPreviewPos = { left: left, top: top };
        }

        head.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target && e.target.closest &&
                e.target.closest('button')) return;
            e.preventDefault();
            var rect = panel.getBoundingClientRect();
            drag.on = true;
            drag.moved = false;
            drag.ox = e.clientX - rect.left;
            drag.oy = e.clientY - rect.top;
            panel.classList.add('is-dragging');
            placePanel(rect.left, rect.top);
        });
        window.addEventListener('mousemove', function (e) {
            if (!drag.on) return;
            drag.moved = true;
            placePanel(e.clientX - drag.ox, e.clientY - drag.oy);
        });
        window.addEventListener('mouseup', function () {
            if (!drag.on) return;
            drag.on = false;
            panel.classList.remove('is-dragging');
        });
        if (minBtn) {
            minBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                tlSetAlarmPreviewMinimized(!panel.classList.contains('is-minimized'));
            });
        }
        head.addEventListener('dblclick', function (e) {
            if (e.target && e.target.closest && e.target.closest('button')) return;
            tlSetAlarmPreviewMinimized(!panel.classList.contains('is-minimized'));
        });
    }

    function tlEventListSource() {
        var scopeEl = $('inv-vms-event-list-scope');
        var scope = scopeEl ? String(scopeEl.value || 'focus') : 'focus';
        if (scope === 'all') return (tl.mergedAlarms || []).slice();
        var ft = tlFocusTile();
        if (!ft || !ft.camId) return [];
        return (ft.alarms || []).map(function (a) {
            return Object.assign({ camId: ft.camId }, a);
        });
    }

    function tlFmtEventWhen(ms, iso) {
        if (Number.isFinite(ms)) return tlMsToLocalLabel(ms);
        return String(iso || '—');
    }

    function tlCamLabelForId(camId) {
        var id = String(camId || '').trim();
        if (!id) return '—';
        var i;
        for (i = 0; i < tl.tiles.length; i++) {
            var t = tl.tiles[i];
            if (t && t.camId === id) return tlShortTreeLabel(t.camName, id);
        }
        return id;
    }

    function tlRenderEventList() {
        var panel = $('inv-vms-event-list');
        var rows = $('inv-vms-event-list-rows');
        var empty = $('inv-vms-event-list-empty');
        if (!panel || !rows) return;
        var filterEl = $('inv-vms-event-list-filter');
        var q = filterEl ? String(filterEl.value || '').trim().toLowerCase() : '';
        var list = tlEventListSource().filter(function (al) {
            if (!q) return true;
            var et = String(al.event_type || al.eventType || '').toLowerCase();
            var note = String(al.note || '').toLowerCase();
            var cam = String(al.camId || al.cam_id || '').toLowerCase();
            var id = tlAlarmEventId(al).toLowerCase();
            return et.indexOf(q) >= 0 || note.indexOf(q) >= 0 || cam.indexOf(q) >= 0 || id.indexOf(q) >= 0;
        });
        list.sort(function (a, b) {
            return tlAlarmAt(b) - tlAlarmAt(a);
        });
        var eventsBtn = $('inv-vms-events');
        if (eventsBtn) {
            eventsBtn.classList.toggle('active', !panel.hidden);
            var n = list.length;
            eventsBtn.textContent = n ? ('Events (' + n + ')') : 'Events';
        }
        if (panel.hidden) return;
        rows.innerHTML = '';
        list.forEach(function (al) {
            var ms = tlAlarmAt(al);
            var et = String(al.event_type || al.eventType || 'event');
            var camId = String(al.camId || al.cam_id || '').trim();
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'inv-vms-event-list-row';
            btn.setAttribute('role', 'listitem');
            var typeEl = document.createElement('span');
            typeEl.className = 'inv-vms-event-list-row-type';
            typeEl.textContent = et;
            var metaEl = document.createElement('span');
            metaEl.className = 'inv-vms-event-list-row-meta';
            metaEl.textContent = tlFmtEventWhen(ms, al.occurred_at || al.occurredAt) +
                ' · ' + tlCamLabelForId(camId);
            btn.appendChild(typeEl);
            btn.appendChild(metaEl);
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                tlOpenAlarmPreview(al);
            });
            rows.appendChild(btn);
        });
        if (empty) empty.hidden = list.length > 0;
    }

    function tlCloseEventList() {
        var panel = $('inv-vms-event-list');
        if (panel) {
            panel.hidden = true;
            panel.classList.remove('is-minimized');
            panel.classList.remove('is-dragging');
        }
        var minBtn = $('inv-vms-event-list-min');
        if (minBtn) {
            minBtn.textContent = '\u2212';
            minBtn.setAttribute('aria-label', 'Minimize');
            minBtn.title = 'Minimize';
        }
        var eventsBtn = $('inv-vms-events');
        if (eventsBtn) {
            eventsBtn.classList.remove('active');
            eventsBtn.textContent = 'Events';
        }
    }

    function tlSetEventListMinimized(on) {
        var panel = $('inv-vms-event-list');
        var minBtn = $('inv-vms-event-list-min');
        if (!panel) return;
        panel.classList.toggle('is-minimized', !!on);
        if (minBtn) {
            minBtn.textContent = on ? '\u25A1' : '\u2212';
            minBtn.setAttribute('aria-label', on ? 'Restore' : 'Minimize');
            minBtn.title = on ? 'Restore' : 'Minimize';
        }
    }

    function tlOpenEventList() {
        var panel = $('inv-vms-event-list');
        if (!panel) return;
        tlBindEventListChrome();
        tlSetEventListMinimized(false);
        if (tl._eventListPos) {
            panel.style.left = tl._eventListPos.left + 'px';
            panel.style.top = tl._eventListPos.top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }
        panel.hidden = false;
        tlRenderEventList();
    }

    function tlToggleEventList() {
        var panel = $('inv-vms-event-list');
        if (!panel) return;
        if (panel.hidden) tlOpenEventList();
        else tlCloseEventList();
    }

    function tlBindEventListChrome() {
        if (tl._eventListChromeBound) return;
        tl._eventListChromeBound = true;
        var panel = $('inv-vms-event-list');
        var head = $('inv-vms-event-list-drag');
        var minBtn = $('inv-vms-event-list-min');
        var closeBtn = $('inv-vms-event-list-close');
        var scopeEl = $('inv-vms-event-list-scope');
        var filterEl = $('inv-vms-event-list-filter');
        if (!panel || !head) return;
        var drag = { on: false, ox: 0, oy: 0 };

        function placePanel(left, top) {
            var w = panel.offsetWidth || 340;
            var h = panel.offsetHeight || 120;
            var maxL = Math.max(8, window.innerWidth - w - 8);
            var maxT = Math.max(8, window.innerHeight - h - 8);
            left = Math.max(8, Math.min(maxL, left));
            top = Math.max(8, Math.min(maxT, top));
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            tl._eventListPos = { left: left, top: top };
        }

        head.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target && e.target.closest && e.target.closest('button')) return;
            e.preventDefault();
            var rect = panel.getBoundingClientRect();
            drag.on = true;
            drag.ox = e.clientX - rect.left;
            drag.oy = e.clientY - rect.top;
            panel.classList.add('is-dragging');
            placePanel(rect.left, rect.top);
        });
        window.addEventListener('mousemove', function (e) {
            if (!drag.on) return;
            placePanel(e.clientX - drag.ox, e.clientY - drag.oy);
        });
        window.addEventListener('mouseup', function () {
            if (!drag.on) return;
            drag.on = false;
            panel.classList.remove('is-dragging');
        });
        if (minBtn) {
            minBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                tlSetEventListMinimized(!panel.classList.contains('is-minimized'));
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                tlCloseEventList();
            });
        }
        head.addEventListener('dblclick', function (e) {
            if (e.target && e.target.closest && e.target.closest('button')) return;
            tlSetEventListMinimized(!panel.classList.contains('is-minimized'));
        });
        if (scopeEl) scopeEl.addEventListener('change', function () { tlRenderEventList(); });
        if (filterEl) {
            filterEl.addEventListener('input', function () { tlRenderEventList(); });
        }
        panel.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    function tlTileForAlarmCam(camId) {
        var want = String(camId || '').trim();
        var i;
        if (want) {
            for (i = 0; i < (tl.tiles || []).length; i++) {
                var t = tl.tiles[i];
                if (t && String(t.camId || '') === want) return t;
            }
        }
        return tlFocusTile();
    }

    function tlPlayAlarmPreview() {
        var prev = tl._alarmPreview;
        if (!prev || !Number.isFinite(prev.ms)) {
            tlSetMeta('No alarm selected.');
            return;
        }
        var tile = tlTileForAlarmCam(prev.camId);
        if (!tile || !tile.camId || !tile.video) {
            tlSetMeta('Assign this camera to a tile, then Play From Alarm.');
            return;
        }
        tlOnFocusSlot(tile.slot);
        tile.playheadMs = prev.ms;
        tl.playheadMs = prev.ms;
        tlDrawTimeline();
        tlPlayTile(tile);
        tlSetMeta('Playing from alarm time.');
    }

    function tlOpenAlarmPreview(al) {
        if (!al) return;
        var panel = $('inv-vms-alarm-preview');
        if (!panel) return;
        var ms = tlAlarmAt(al);
        var camId = String(al.cam_id || al.camId || '').trim();
        if (!camId) {
            var ft0 = tlFocusTile();
            if (ft0 && ft0.camId) camId = String(ft0.camId).trim();
        }
        var typeEl = $('inv-vms-alarm-preview-type');
        var whenEl = $('inv-vms-alarm-preview-when');
        var camEl = $('inv-vms-alarm-preview-cam');
        var noteEl = $('inv-vms-alarm-preview-note');
        var snapEl = $('inv-vms-alarm-preview-snap');
        var recEl = $('inv-vms-alarm-preview-rec');
        var img = $('inv-vms-alarm-preview-img');
        var playBtn = $('inv-vms-alarm-preview-play');
        var et = String(al.event_type || al.eventType || 'event');
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
        var alarmId = tlAlarmEventId(al);
        var idEl = $('inv-vms-alarm-preview-id');
        var copyBtn = $('inv-vms-alarm-preview-copy');
        if (idEl) idEl.textContent = 'ID · ' + (alarmId || '—');
        if (copyBtn) copyBtn.disabled = !alarmId;
        if (noteEl) noteEl.textContent = note || '—';
        if (img) {
            img.hidden = true;
            img.removeAttribute('src');
        }
        if (snapEl) snapEl.textContent = 'Looking up snapshot…';
        var hasRec = tlSegmentCoversMs(ms, camId);
        if (!hasRec && Number.isFinite(ms)) {
            /* Soft check: nearest segment on focus tile still allows Play (seek snaps). */
            var softTile = tlTileForAlarmCam(camId);
            if (softTile && tlNearestPlayableMs(softTile, ms) != null) hasRec = true;
        }
        panel.classList.toggle('is-no-recording', !hasRec);
        panel.classList.toggle('is-has-recording', !!hasRec);
        if (playBtn) playBtn.hidden = !hasRec;
        if (recEl) {
            recEl.textContent = hasRec
                ? 'Recording available. Use Play From Alarm below.'
                : 'No recording at this time. Snapshot and alarm details only.';
        }
        tl._alarmPreview = { al: al, ms: ms, camId: camId, hasRec: !!hasRec, alarmId: alarmId };
        tlBindAlarmPreviewChrome();
        tlSetAlarmPreviewMinimized(false);
        if (tl._alarmPreviewPos) {
            var pos = tl._alarmPreviewPos;
            panel.style.left = pos.left + 'px';
            panel.style.top = pos.top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';
        } else {
            panel.style.left = '';
            panel.style.top = '';
            panel.style.right = '';
            panel.style.bottom = '';
            panel.style.transform = '';
        }
        panel.hidden = false;
        if (Number.isFinite(ms)) {
            tl.playheadMs = ms;
            var focusTile = tlFocusTile();
            if (focusTile) focusTile.playheadMs = ms;
        }
        if (hasRec && Number.isFinite(ms)) {
            tlPauseVideos();
            tlSeekAll(ms);
            tlSetMeta('Alarm ready. Press Play From Alarm.');
        } else {
            tlPauseVideos();
            tlUpdateTimelineChrome();
            tlDrawTimeline();
            tlSetMeta('No recording at this alarm time. See the event panel for details.');
        }
        var url = '/api/vms/alarm-event-preview?camId=' + encodeURIComponent(camId) +
            '&occurredAt=' + encodeURIComponent(String(al.occurred_at || al.occurredAt || '')) +
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
                    if (snapEl) snapEl.textContent = d.snapshotLabel || 'Snapshot';
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
                audioMuted: i !== 0, /* Focus slot 0 unmuted by default; others muted */
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
        alarms.sort(function (a, b) { return tlAlarmAt(a) - tlAlarmAt(b); });
        tl.mergedSegments = segs;
        tl.mergedAlarms = alarms;
        tl.metadataFrames = [];
        alarms.forEach(function (al) {
            var meta = tlParseAlarmMeta(al);
            if (meta && meta.bbox) {
                tl.metadataFrames.push({
                    camId: al.camId,
                    atMs: tlAlarmAt(al),
                    bbox: meta.bbox,
                    label: meta.label || al.event_type || '',
                });
            }
        });
        tlRenderEventList();
        tlRebuildTimelineVipDayHints();
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
                    if (!cam.type) cam.type = 'fixed';
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
        /* VMS-CALENDAR-VIP-RED-PAINT-V1: do NOT wipe VIP days before fetch —
         * wipe race painted empty calendar while API still in flight. */
        var camId = String(sel.value || '').trim();
        if (!camId) {
            tl.alarmDays = {};
            tl.recordingDays = {};
            tl.alarmDayList = [];
            tl._apiAlarmDays = {};
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

    function tlIsCalendarVipAlarm(al) {
        /* 2-tier: calendar red dots = VIP only (match recording-days whitelist). */
        /* ALARM-MARKER-CONTRACT-V1: only CHECK-legal types (020) — same list as recording-days. */
        var t = String((al && (al.event_type || al.eventType)) || '').toLowerCase().trim();
        return t === 'analytics' || t === 'sos' || t === 'anpr';
    }

    function tlFocusIdentitySet() {
        var set = {};
        function add(v) {
            var s = String(v || '').trim();
            if (s) set[s] = true;
        }
        var focus = tlFocusTile();
        if (focus && focus.camId) add(focus.camId);
        var sel = $('inv-vms-focus-cam');
        if (sel && sel.value) add(sel.value);
        add(tlCalendarFocusCamId());
        return set;
    }

    function tlIdMatchesFocus(id) {
        var s = String(id || '').trim();
        if (!s) return false;
        var set = tlFocusIdentitySet();
        if (set[s]) return true;
        var k;
        for (k in set) {
            if (!Object.prototype.hasOwnProperty.call(set, k)) continue;
            if (k === s) return true;
            /* VIP-RED-VERIFY-V1: never substring-match long GB28181 ids (0008 vs 0009 false friends). */
            if (/^\d{10,}$/.test(s) || /^\d{10,}$/.test(k)) continue;
            if (k.indexOf(s) >= 0 || s.indexOf(k) >= 0) return true;
        }
        return false;
    }

    function tlAugmentDaysFromLoadedTimeline() {
        var focusId = tlCalendarFocusCamId();
        var focusSlot = tl.focusSlot;
        tlAugmentAlarmDaysFromMarkers();
        function addRec(ms) {
            var iso = tlLocalDayIsoFromMs(ms);
            if (iso && tlMarkDayInMonth(iso)) tl.recordingDays[iso] = true;
        }
        function addAlarm(al, ms) {
            if (!tlIsCalendarVipAlarm(al)) return;
            var iso = tlLocalDayIsoFromMs(ms);
            if (iso) tl.alarmDays[iso] = true;
        }
        (tl.tiles || []).forEach(function (tile) {
            var isFocusTile = (tile.slot === focusSlot) ||
                (focusId && String(tile.camId || '').trim() === focusId) ||
                tlIdMatchesFocus(tile.camId);
            if (focusId && !isFocusTile) return;
            (tile.segments || []).forEach(function (seg) {
                addRec(tlIsoToMs(seg.start_at || seg.startAt));
                addRec(tlIsoToMs(seg.end_at || seg.endAt));
            });
            (tile.alarms || []).forEach(function (al) {
                addAlarm(al, tlAlarmAt(al));
            });
        });
        (tl.mergedSegments || []).forEach(function (seg) {
            if (!seg) return;
            if (focusId) {
                var sid = String(seg.cam_id || seg.camId || '').trim();
                if (sid && !tlIdMatchesFocus(sid)) return;
                if (!sid) return;
            }
            addRec(tlIsoToMs(seg.start_at || seg.startAt));
            addRec(tlIsoToMs(seg.end_at || seg.endAt));
        });
        (tl.mergedAlarms || []).forEach(function (al) {
            if (focusId && !tlIdMatchesFocus(tlAlarmCamId(al))) return;
            addAlarm(al, tlAlarmAt(al));
        });
    }

    function tlAugmentAlarmDaysFromMarkers() {
        var focusId = tlCalendarFocusCamId();
        (tl.mergedAlarms || []).forEach(function (al) {
            if (!tlIsCalendarVipAlarm(al)) return;
            if (focusId && !tlIdMatchesFocus(tlAlarmCamId(al))) return;
            var iso = tlLocalDayIsoFromMs(tlAlarmAt(al));
            if (iso) tl.alarmDays[iso] = true;
        });
        var focus = tlFocusTile();
        if (focus && focus.alarms && focus.alarms.length) {
            focus.alarms.forEach(function (al) {
                if (!tlIsCalendarVipAlarm(al)) return;
                var iso = tlLocalDayIsoFromMs(tlAlarmAt(al));
                if (iso) tl.alarmDays[iso] = true;
            });
        }
    }

    function tlRebuildTimelineVipDayHints() {
        /* VIP-only days from loaded focus alarms — full map (not month-clipped); paint filters cells. */
        var next = {};
        function add(al, camHint) {
            if (!tlIsCalendarVipAlarm(al)) return;
            var cid = tlAlarmCamId(al) || String(camHint || '').trim();
            var focusId = tlCalendarFocusCamId();
            if (focusId && cid && !tlIdMatchesFocus(cid)) return;
            var ms = tlAlarmAt(al);
            if (!Number.isFinite(ms) || ms < 1e12) return;
            var iso = tlLocalDayIsoFromMs(ms);
            if (iso) next[iso] = true;
        }
        (tl.mergedAlarms || []).forEach(function (al) { add(al, al && al.camId); });
        var focus = tlFocusTile();
        if (focus && focus.alarms) {
            focus.alarms.forEach(function (al) { add(al, focus.camId); });
        }
        tl._timelineVipDays = next;
    }

    function tlDayHasVipRed(iso) {
        var d = String(iso || '').slice(0, 10);
        if (!d) return false;
        if (tl._apiAlarmDays && tl._apiAlarmDays[d]) return true;
        return !!(tl._timelineVipDays && tl._timelineVipDays[d]);
    }

    function tlApplyVipRedClasses(root) {
        if (!root) return;
        var nodes = root.querySelectorAll('button[data-date]');
        var i;
        for (i = 0; i < nodes.length; i++) {
            var btn = nodes[i];
            var d = String(btn.getAttribute('data-date') || '').slice(0, 10);
            var on = tlDayHasVipRed(d);
            if (on) btn.classList.add('has-alarm');
            else btn.classList.remove('has-alarm');
            var dot = btn.querySelector('.inv-vms-cal-vip-dot');
            if (on && !dot) {
                dot = document.createElement('span');
                dot.className = 'inv-vms-cal-vip-dot';
                dot.setAttribute('aria-hidden', 'true');
                btn.appendChild(dot);
            } else if (!on && dot) {
                try { btn.removeChild(dot); } catch (_) { /* ignore */ }
            }
        }
    }

    function tlForceCalendarPaint() {
        /* Rebuild + force class pass from API VIP map. */
        tl.alarmDayList = tl._apiAlarmDays ? Object.keys(tl._apiAlarmDays) : [];
        tlRepaintOpenCalendars();
        tlPaintRecordingCalendar();
        try {
            requestAnimationFrame(function () {
                tlRepaintOpenCalendars();
                tlPaintRecordingCalendar();
            });
        } catch (_) {
            tlRepaintOpenCalendars();
            tlPaintRecordingCalendar();
        }
        setTimeout(function () {
            tlRepaintOpenCalendars();
            tlPaintRecordingCalendar();
        }, 0);
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
            /* VIP-RED-PAINT-V1: pad Y-M-D directly — avoid Date() shifting cell keys. */
            var localDateStr = cellY + '-' + pad(cellM) + '-' + pad(dayNum);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = String(dayNum);
            btn.setAttribute('data-date', localDateStr);
            if (other) btn.classList.add('is-other');
            if (localDateStr === selected) btn.classList.add('is-selected');
            if (localDateStr === today) btn.classList.add('is-today');
            if (tl.recordingDays[localDateStr]) btn.classList.add('has-rec');
            if (tlDayHasVipRed(localDateStr)) {
                btn.classList.add('has-alarm');
                var vip = document.createElement('span');
                vip.className = 'inv-vms-cal-vip-dot';
                vip.setAttribute('aria-hidden', 'true');
                btn.appendChild(vip);
            }
            var tips = [localDateStr];
            if (tl.recordingDays[localDateStr]) tips.push('Has Recordings');
            if (tlDayHasVipRed(localDateStr)) tips.push('Has Alarms');
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
        tlApplyVipRedClasses(grid);
    }

    async function tlRefreshRecordingDays() {
        tlEnsureCalMonth();
        var camId = tlCalendarFocusCamId();
        var gen = (tl._daysFetchGen = (tl._daysFetchGen || 0) + 1);
        function normDay(day) {
            var s = String(day || '').trim();
            /* YYYY-MM-DD only — never Date.parse (UTC midnight shifts local day). */
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            return '';
        }
        if (!camId) {
            /* No focus cam: no VIP API — clear reds (do not invent from timeline). */
            tl._apiAlarmDays = {};
            tl.alarmDays = {};
            tl.alarmDayList = [];
            tlAugmentDaysFromLoadedTimeline();
            if (gen !== tl._daysFetchGen) return;
            tlForceCalendarPaint();
            return;
        }
        try {
            var url = '/api/vms/recording-days?camIds=' + encodeURIComponent(camId) +
                '&year=' + encodeURIComponent(String(tl.calYear)) +
                '&month=' + encodeURIComponent(String(tl.calMonth)) +
                '&tzOffset=' + encodeURIComponent(String(new Date().getTimezoneOffset())) +
                '&_=' + encodeURIComponent(String(Date.now()));
            var r = await fetch(url, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' },
            });
            var d = await r.json();
            if (gen !== tl._daysFetchGen) return;
            if (!d.ok) throw new Error('days');
            var nextRec = {};
            var nextAlm = {};
            var recArr = (d.recordingDays && d.recordingDays.length) ? d.recordingDays : (d.days || []);
            if (Array.isArray(recArr)) {
                recArr.forEach(function (dayStr) {
                    var iso = normDay(dayStr);
                    if (iso) nextRec[iso] = true;
                });
            }
            if (Array.isArray(d.alarmDays)) {
                d.alarmDays.forEach(function (dayStr) {
                    var iso = normDay(dayStr);
                    if (iso) nextAlm[iso] = true;
                });
            }
            /* VIP-RED-VERIFY-V1: replace VIP map from API. SOS-V2: paint also uses timeline VIP hints. */
            tl._apiAlarmDays = nextAlm;
            tl.recordingDays = nextRec;
            tl.alarmDays = Object.assign({}, nextAlm);
            tl.alarmDayList = Object.keys(nextAlm);
            tlAugmentRecordingDaysOnly();
            tlRebuildTimelineVipDayHints();
            tlForceCalendarPaint();
        } catch (err) {
            if (gen !== tl._daysFetchGen) return;
            /* ALARM-MARKER-CONTRACT-V1: logged, not swallowed. Keep last good _apiAlarmDays; still paint. */
            try { console.warn('[investigation] recording-days failed', err && err.message ? err.message : err); } catch (_) { /* ignore */ }
            tlForceCalendarPaint();
        }
    }

    function tlAugmentRecordingDaysOnly() {
        var focusId = tlCalendarFocusCamId();
        var focusSlot = tl.focusSlot;
        function addRec(ms) {
            var iso = tlLocalDayIsoFromMs(ms);
            if (iso && tlMarkDayInMonth(iso)) tl.recordingDays[iso] = true;
        }
        (tl.tiles || []).forEach(function (tile) {
            var isFocusTile = (tile.slot === focusSlot) ||
                (focusId && String(tile.camId || '').trim() === focusId) ||
                tlIdMatchesFocus(tile.camId);
            if (focusId && !isFocusTile) return;
            (tile.segments || []).forEach(function (seg) {
                addRec(tlIsoToMs(seg.start_at || seg.startAt));
                addRec(tlIsoToMs(seg.end_at || seg.endAt));
            });
        });
        (tl.mergedSegments || []).forEach(function (seg) {
            if (!seg) return;
            if (focusId) {
                var sid = String(seg.cam_id || seg.camId || '').trim();
                if (sid && !tlIdMatchesFocus(sid)) return;
                if (!sid) return;
            }
            addRec(tlIsoToMs(seg.start_at || seg.startAt));
            addRec(tlIsoToMs(seg.end_at || seg.endAt));
        });
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
                /* Unify: Calendar opens on Start Time month/year, same VIP map as Start/End. */
                tlSyncCalMonthFromUnifiedRange();
                tlSetCalOpen(!tl.calOpen);
                if (tl.calOpen) {
                    Promise.resolve(tlRefreshRecordingDays()).then(function () {
                        tlForceCalendarPaint();
                    });
                } else {
                    tlPaintRecordingCalendar();
                }
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
        /* ALARM-MARKER-CONTRACT-V1 — same tzOffset the calendar sends, so a day means the browser's day. */
        var tzq = '&tzOffset=' + encodeURIComponent(String(new Date().getTimezoneOffset()));
        if (tl.selectedDate) {
            url = '/api/vms/cameras/' + encodeURIComponent(tile.camId) + '/timeline' +
                '?date=' + encodeURIComponent(tl.selectedDate) + tzq;
        } else if (tl.from && tl.to) {
            url = '/api/vms/cameras/' + encodeURIComponent(tile.camId) + '/timeline' +
                '?from=' + encodeURIComponent(tl.from.toISOString()) +
                '&to=' + encodeURIComponent(tl.to.toISOString()) + tzq;
        } else {
            return;
        }
        var r = await fetch(url, { credentials: 'same-origin' });
        var d = await r.json();
        if (!d.ok) throw new Error(d.error || 'timeline error');
        /* INV-GAP-BLACK-AND-OWN-CAM-V1 — drop any clip whose camId is another loaded slot. */
        tile.segments = (d.segments || []).filter(function (seg) {
            if (!seg) return false;
            if (!seg.camId || !tile.camId) return true;
            if (String(seg.camId) === String(tile.camId)) return true;
            if (tl.tiles.some(function (o) {
                return o && o !== tile && o.camId && String(o.camId) === String(seg.camId);
            })) return false;
            return true;
        });
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
            var kind = tlCamSourceKind(tile.camId);
            var kindTag = kind === 'bwc' ? 'BWC' : 'Fixed';
            if (!(tile.segments || []).length) {
                tile.status.textContent = kindTag + ' · no local recording';
            } else {
                tile.status.textContent = kindTag + ' · ' + tile.segments.length + ' seg · ' + tile.alarms.length + ' evt' +
                    (tierKeys.length ? ' · ' + tierKeys.join(', ') : '');
            }
        }
        tlRadioLoadForTile(tile);
    }

    /* INV-SOS-RADIO-AUDIO-TRACK-V1 — HQ call / PTT WAVs bound to SOS incidents on this cam play as
       hidden audio slaves driven by the master playhead (absolute UTC). Video stays untouched.
       Fail-open: any error → no radio, timeline unaffected. */
    var RADIO_SYNC_MS = 250;
    var RADIO_DRIFT_SEC = 0.6;
    var RADIO_FALLBACK_DUR_MS = 5 * 60 * 1000;
    var radioSyncTimer = null;

    function tlRadioTeardownForTile(tile) {
        if (!tile || !Array.isArray(tile.radioTracks)) return;
        tile.radioTracks.forEach(function (t) {
            if (!t || !t.el) return;
            try { t.el.pause(); } catch (_) { /* ignore */ }
            try { t.el.removeAttribute('src'); t.el.load(); } catch (_) { /* ignore */ }
            try { if (t.el.parentNode) t.el.parentNode.removeChild(t.el); } catch (_) { /* ignore */ }
        });
        tile.radioTracks = [];
    }

    function tlRadioLoadForTile(tile) {
        tlRadioTeardownForTile(tile);
        if (!tile || !tile.camId || !tl.from || !tl.to) return;
        var camId = String(tile.camId);
        /* BWC: VMS camera id != SIP device id used by the SOS ledger — accept either. */
        var cat = camCatalog[camId] || null;
        var idSet = {};
        idSet[camId] = true;
        if (cat && cat.deviceId) idSet[String(cat.deviceId)] = true;
        if (cat && cat.sipId) idSet[String(cat.sipId)] = true;
        var fromMs = tl.from.getTime();
        var toMs = tl.to.getTime();
        var days = Math.max(1, Math.ceil((Date.now() - fromMs) / 86400000) + 1);
        fetch('/api/sos-incidents?limit=100&days=' + days, { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!tile || String(tile.camId) !== camId) return;
                var tracks = [];
                (d && d.entries || []).forEach(function (e) {
                    if (!e || !idSet[String(e.cameraId || '')]) return;
                    (e.pttAudioRecordings || []).forEach(function (r) {
                        if (!r) return;
                        var src = r.previewUrl || (r.evidenceId ? '/api/evidence/preview/' + encodeURIComponent(r.evidenceId) : '');
                        var startMs = Date.parse(r.startedAt || r.at || '');
                        if (!src || !Number.isFinite(startMs)) return;
                        if (startMs > toMs || startMs + RADIO_FALLBACK_DUR_MS < fromMs) return;
                        var el = document.createElement('audio');
                        el.preload = 'metadata';
                        el.className = 'sos-talk-audio';
                        el.src = src;
                        document.body.appendChild(el);
                        var track = { el: el, startMs: startMs, durMs: RADIO_FALLBACK_DUR_MS, camId: camId };
                        el.addEventListener('loadedmetadata', function () {
                            if (Number.isFinite(el.duration) && el.duration > 0) track.durMs = el.duration * 1000;
                        });
                        tracks.push(track);
                    });
                });
                tile.radioTracks = tracks;
                if (tracks.length && tile.status && tile.status.textContent.indexOf('radio') < 0) {
                    tile.status.textContent += ' · radio ' + tracks.length;
                }
                if (tracks.length && !radioSyncTimer) radioSyncTimer = setInterval(tlRadioSyncAll, RADIO_SYNC_MS);
            })
            .catch(function () { /* fail-open */ });
    }

    function tlRadioSyncAll() {
        var anyTracks = false;
        var playing = !!(tl.masterClockOn || tl.tiles.some(function (t) { return t && t.playing; }));
        var headMs = tl.playheadMs;
        tl.tiles.forEach(function (tile) {
            if (!tile || !Array.isArray(tile.radioTracks) || !tile.radioTracks.length) return;
            anyTracks = true;
            tile.radioTracks.forEach(function (t) {
                var el = t.el;
                if (!el) return;
                var inRange = Number.isFinite(headMs) && headMs >= t.startMs && headMs < t.startMs + t.durMs;
                if (!playing || !inRange) {
                    if (!el.paused) { try { el.pause(); } catch (_) { /* ignore */ } }
                    return;
                }
                var target = (headMs - t.startMs) / 1000;
                el.muted = !!tile.audioMuted;
                var rate = Number.isFinite(tl.speed) && tl.speed > 0 ? tl.speed : 1;
                if (el.playbackRate !== rate) { try { el.playbackRate = rate; } catch (_) { /* ignore */ } }
                if (Math.abs((el.currentTime || 0) - target) > RADIO_DRIFT_SEC) {
                    try { el.currentTime = target; } catch (_) { /* ignore */ }
                }
                if (el.paused) {
                    var p = el.play();
                    if (p && p.catch) p.catch(function () { /* autoplay policy — user gesture already given by Play */ });
                }
            });
        });
        if (!anyTracks && radioSyncTimer) {
            clearInterval(radioSyncTimer);
            radioSyncTimer = null;
        }
    }

    function tlFindSegmentAt(segments, utcMs) {
        /* Prefer half-open [start, end) so clip junction does not stick on ended file. */
        var i;
        var fallback = null;
        for (i = 0; i < (segments || []).length; i++) {
            var s = segments[i];
            if (s.status === 'unavailable') continue;
            var st = tlIsoToMs(s.start_at);
            var en = tlIsoToMs(s.end_at);
            if (!Number.isFinite(st) || !Number.isFinite(en)) continue;
            if (utcMs >= st && utcMs < en) return s;
            if (utcMs === en) fallback = s;
        }
        return fallback;
    }

    /** INV-GAP-BLACK-AND-OWN-CAM-V1 — segment camId belongs to another loaded slot (any cam). */
    function tlSegmentOwnedByOtherTile(tile, seg) {
        if (!tile || !seg) return false;
        var sid = String(seg.camId || seg.cam_id || '').trim();
        if (!sid) return false;
        return tl.tiles.some(function (o) {
            if (!o || o === tile || !o.camId) return false;
            if (typeof tlTileActiveInLayout === 'function' && !tlTileActiveInLayout(o)) return false;
            return String(o.camId) === sid;
        });
    }

    function tlStopMasterClock() {
        tl.masterClockOn = false;
        if (tl._masterRaf) {
            try { cancelAnimationFrame(tl._masterRaf); } catch (_) { /* ignore */ }
        }
        tl._masterRaf = null;
        tl.masterClockOriginMs = null;
        tl._masterBusy = {};
    }

    function tlMasterClockNowMs() {
        if (!tl.masterClockOn || !Number.isFinite(tl.masterClockOriginMs)) {
            return Number.isFinite(tl.playheadMs) ? tl.playheadMs : null;
        }
        var rate = Number(tl.speed) || 1;
        return tl.masterClockOriginMs + (performance.now() - tl.masterClockOriginWall) * rate;
    }

    function tlRebaseMasterClock(ms) {
        if (!Number.isFinite(ms)) return;
        tl.masterClockOriginMs = ms;
        tl.masterClockOriginWall = performance.now();
        tl.playheadMs = ms;
    }

    function tlMasterApplyTiles(nowMs) {
        /* INV-SYNC-ONE-CLOCK-HARD-V1 — every slot slaves to nowMs; gap = black; no free-run ahead.
           INV-SYNC-EOF-STOP-YELLOW-V1 — never count EOF / past-blue as playing (that kept yellow crawling). */
        var playingN = 0;
        var heldN = 0;
        var gapLabels = [];
        tl.tiles.forEach(function (tile) {
            if (!tile || !tile.camId || !tlTileActiveInLayout(tile)) return;
            tile.playheadMs = nowMs;
            /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — operator paused/stopped this slot: master
               leaves it alone (not playing, not a gap) until tile Play / Play All / scrub. */
            if (tile.hold) { heldN += 1; return; }
            var seg = tlFindSegmentAt(tile.segments || [], nowMs);
            if (!seg || tlSegmentOwnedByOtherTile(tile, seg)) {
                tlClearTileAtGap(tile);
                gapLabels.push(tlShortTreeLabel(tile.camName, tile.camId));
                return;
            }
            /* Media file shorter than the DB segment (end_at = finalize time): once the file is
               exhausted stay black for the rest of that segment — no reload → ended → reload flash. */
            if (tile._exhaustedSegId && tile._exhaustedSegId === seg.segmentId) {
                gapLabels.push(tlShortTreeLabel(tile.camName, tile.camId));
                return;
            }
            var segStart = tlIsoToMs(seg.start_at);
            var segEnd = tlIsoToMs(seg.end_at);
            if (Number.isFinite(segEnd) && nowMs >= segEnd - 40) {
                tlOnTilePlaybackEnded(tile);
                gapLabels.push(tlShortTreeLabel(tile.camName, tile.camId));
                return;
            }
            var targetOff = Number.isFinite(segStart)
                ? Math.max(0, (nowMs - segStart) / 1000) : 0;
            if (tile.video) {
                var mediaDur = Number(tile.video.duration);
                if (Number.isFinite(mediaDur) && mediaDur > 0.05) {
                    if (tlClipSegmentEndToMedia(tile, seg, mediaDur)) {
                        segEnd = tlIsoToMs(seg.end_at);
                    }
                    if (targetOff >= mediaDur - 0.08) {
                        tile._exhaustedSegId = seg.segmentId;
                        tlOnTilePlaybackEnded(tile);
                        gapLabels.push(tlShortTreeLabel(tile.camName, tile.camId));
                        return;
                    }
                }
                if (tile.video.ended) {
                    tile._exhaustedSegId = seg.segmentId;
                    tlOnTilePlaybackEnded(tile);
                    gapLabels.push(tlShortTreeLabel(tile.camName, tile.camId));
                    return;
                }
            }
            playingN += 1;
            var segId = seg.segmentId;
            var need = !tile.playing || tile.activeSegmentId !== segId
                || !tile.video || !tile.video.getAttribute('src')
                || tile._streamCamId !== tile.camId;
            if (need) {
                if (tile.video && tile.activeSegmentId && tile.activeSegmentId !== segId) {
                    try { tile.video.pause(); } catch (_) { /* ignore */ }
                }
                if (tl._masterBusy[tile.slot]) return;
                tl._masterBusy[tile.slot] = true;
                tile.playing = true;
                tlEnsureVideoPlayAttrs(tile.video);
                var wantSegId = segId;
                tlSeekTile(tile, nowMs).then(function (ok) {
                    if (ok === false) {
                        /* INV-SYNC-SEEK-GENERATION-V1 — superseded by a newer seek on this tile
                           (activeSegmentId still set): leave the newer load alone. Real refusal
                           (claim / other-cam) already cleared the tile → mirror that state. */
                        if (!tile.activeSegmentId) {
                            tile.playing = false;
                            tlClearTileAtGap(tile);
                        }
                        return null;
                    }
                    if (!tl.masterClockOn || !tile.playing || !tile.video) return null;
                    var clockNow = tlMasterClockNowMs();
                    var segNow = Number.isFinite(clockNow)
                        ? tlFindSegmentAt(tile.segments || [], clockNow) : null;
                    if (!segNow || segNow.segmentId !== wantSegId || tlSegmentOwnedByOtherTile(tile, segNow)) {
                        tile.playing = false;
                        tlClearTileAtGap(tile);
                        return null;
                    }
                    if (!tile.video.src) {
                        tile.playing = false;
                        tlClearTileAtGap(tile);
                        return null;
                    }
                    var off = Math.max(0, (clockNow - tlIsoToMs(segNow.start_at)) / 1000);
                    var md = Number(tile.video.duration);
                    if (Number.isFinite(md) && md > 0.05) {
                        tlClipSegmentEndToMedia(tile, segNow, md);
                        if (off >= md - 0.08) {
                            tile.playing = false;
                            tile._exhaustedSegId = wantSegId;
                            tlOnTilePlaybackEnded(tile);
                            return null;
                        }
                        off = Math.min(off, Math.max(0, md - 0.05));
                    }
                    try {
                        if (Math.abs((tile.video.currentTime || 0) - off) > 0.35) {
                            tile.video.currentTime = off;
                        }
                    } catch (_) { /* ignore */ }
                    return tlPlayVideoElement(tile.video, { rate: tl.speed, unmute: !tile.audioMuted })
                        .then(function (res) {
                            tlApplyTileAudio(tile);
                            return res;
                        });
                }).catch(function () { /* ignore */ })
                    .then(function () { tl._masterBusy[tile.slot] = false; });
                return;
            }
            if (tile.video) {
                var mediaDur2 = Number(tile.video.duration);
                var target = targetOff;
                if (Number.isFinite(mediaDur2) && mediaDur2 > 0.05) {
                    target = Math.min(target, Math.max(0, mediaDur2 - 0.05));
                }
                try {
                    var cur = tile.video.currentTime || 0;
                    if (Math.abs(cur - target) > 0.28) {
                        tile.video.currentTime = target;
                    }
                } catch (_) { /* ignore */ }
                if (tile.video.paused) {
                    tlPlayVideoElement(tile.video, { rate: tl.speed, unmute: !tile.audioMuted })
                        .then(function () { tlApplyTileAudio(tile); });
                }
                try { tile.video.playbackRate = tl.speed; } catch (_) { /* ignore */ }
            }
        });
        return { playingN: playingN, gapLabels: gapLabels, heldN: heldN };
    }

    function tlSelectedRecordingBounds() {
        /* Latest blue end + next blue start after playhead (selected layout tiles). */
        var lastEnd = null;
        var nextStart = null;
        var now = Number.isFinite(tl.playheadMs) ? tl.playheadMs : null;
        tl.tiles.forEach(function (tile) {
            if (!tile || !tile.camId || !tlTileActiveInLayout(tile)) return;
            (tile.segments || []).forEach(function (s) {
                if (!s || s.status === 'unavailable') return;
                var st = tlIsoToMs(s.start_at);
                var en = tlIsoToMs(s.end_at);
                if (!Number.isFinite(st) || !Number.isFinite(en) || en < st) return;
                if (lastEnd == null || en > lastEnd) lastEnd = en;
                if (now != null && st > now + 40) {
                    if (nextStart == null || st < nextStart) nextStart = st;
                }
            });
        });
        return { lastEnd: lastEnd, nextStart: nextStart };
    }

    function tlMasterClockTick() {
        tl._masterRaf = null;
        if (!tl.masterClockOn) return;
        var now = tlMasterClockNowMs();
        if (!Number.isFinite(now)) {
            tlStopMasterClock();
            return;
        }
        if (tl.to && now >= tl.to.getTime()) {
            now = tl.to.getTime();
            tl.playheadMs = now;
            tlStopMasterClock();
            tl.tiles.forEach(function (tile) {
                tile.playing = false;
                tlClearTileAtGap(tile);
            });
            tlSetMeta('Playback stopped at the end of the time range. Move the timeline marker, then press Play All.');
            tlUpdateAllTileTransport();
            tlDrawTimeline();
            tlDrawOverlays();
            return;
        }
        tl.playheadMs = now;
        var snap = tlMasterApplyTiles(now);
        /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — every selected slot is on operator hold:
           park the clock here, keep the slots as they are (no gap-clear, no "sector ended"). */
        if (snap && !snap.playingN && snap.heldN) {
            tlStopMasterClock();
            tl.playheadMs = now;
            tlSetMeta('All slots paused. Press Play on a slot or Play All to resume.');
            tlUpdateAllTileTransport();
            tlDrawTimeline();
            tlDrawOverlays();
            return;
        }
        /* INV-SYNC-SECTOR-STOP-V1 — stop at every sector end / mid-gap (no auto-crawl). */
        if (snap && !snap.playingN) {
            var bounds = tlSelectedRecordingBounds();
            if (Number.isFinite(bounds.lastEnd) && now > bounds.lastEnd) {
                now = bounds.lastEnd;
                tl.playheadMs = now;
                tlRebaseMasterClock(now);
            }
            tlStopMasterClock();
            tl.tiles.forEach(function (tile) {
                tile.playing = false;
                tlClearTileAtGap(tile);
            });
            var hasFuture = bounds.nextStart != null && bounds.nextStart > now;
            tlSetMeta(hasFuture
                ? 'Sector ended (gap). Slot black. Press +1s to jump to the next blue bar, then Play All.'
                : 'Playback stopped — no more recordings after this time. Move the timeline marker onto a blue bar, then Play All.');
            tlUpdateAllTileTransport();
            var readoutStop = $('inv-vms-time-readout');
            if (readoutStop) readoutStop.textContent = tlMsToLocalLabel(tl.playheadMs);
            tlDrawTimeline();
            tlDrawOverlays();
            return;
        }
        var readout = $('inv-vms-time-readout');
        if (readout) readout.textContent = tlMsToLocalLabel(now);
        tl._masterDrawAcc = (tl._masterDrawAcc || 0) + 1;
        if (tl._masterDrawAcc >= 4) {
            tl._masterDrawAcc = 0;
            tlDrawTimeline();
            tlDrawOverlays();
            tlUpdateAllTileTransport();
            if (snap && snap.playingN) {
                tlSetMeta(snap.gapLabels && snap.gapLabels.length
                    ? ('Playing from timeline marker. Waiting (no video yet): ' + snap.gapLabels.join(', '))
                    : 'Playing from timeline marker (Sync).');
            }
        }
        tl._masterRaf = requestAnimationFrame(tlMasterClockTick);
    }

    function tlStartMasterClock(fromMs) {
        if (!Number.isFinite(fromMs)) return;
        tl.masterClockOn = true;
        tl.masterClockOriginMs = fromMs;
        tl.masterClockOriginWall = performance.now();
        tl.playheadMs = fromMs;
        tl._masterBusy = {};
        tl._masterDrawAcc = 0;
        if (!tl._masterRaf) tl._masterRaf = requestAnimationFrame(tlMasterClockTick);
    }

    function tlStreamUrl(segmentId, camId) {
        var u = '/api/vms/segments/' + encodeURIComponent(segmentId) + '/stream';
        if (camId) u += '?cam=' + encodeURIComponent(String(camId));
        return u;
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

    function tlWaitVideoSeek(video, offsetSec) {
        /* Fast best-effort — never hang Ops UI (max ~500ms).
           Always seek when far from target — including offset≈0 (was skipping
           and leaving video at end → instant "Playback ended"). */
        return new Promise(function (resolve) {
            if (!video || !Number.isFinite(offsetSec) || offsetSec < 0) {
                resolve(true);
                return;
            }
            var target = Math.max(0, offsetSec);
            var cur = 0;
            try { cur = Number(video.currentTime) || 0; } catch (_) { cur = 0; }
            if (Math.abs(cur - target) <= 0.2) {
                resolve(true);
                return;
            }
            var done = false;
            function finish() {
                if (done) return;
                done = true;
                try { video.removeEventListener('seeked', onSeeked); } catch (_) { /* ignore */ }
                resolve(true);
            }
            function onSeeked() {
                clearTimeout(timer);
                finish();
            }
            var timer = setTimeout(finish, 500);
            try {
                video.addEventListener('seeked', onSeeked);
                video.currentTime = target;
            } catch (_) {
                clearTimeout(timer);
                finish();
            }
        });
    }

    function tlPlayVideoAtOffset(video, offsetSec, playOpts) {
        /* One short seek, then play — no nested seek storm. */
        return tlWaitVideoSeek(video, offsetSec).then(function () {
            return tlPlayVideoElement(video, playOpts || {});
        });
    }

    function tlSeekTile(tile, utcMs, opts) {
        opts = opts || {};
        if (!tile || !tile.camId || !tile.video) return Promise.resolve(true);
        var seg = tlFindSegmentAt(tile.segments, utcMs);
        if (!seg) {
            tlClearTileAtGap(tile);
            return Promise.resolve(true);
        }
        /* Never attach another loaded cam's segment to this slot (any cam ids). */
        if (tlSegmentOwnedByOtherTile(tile, seg)) {
            tlClearTileAtGap(tile);
            return Promise.resolve(false);
        }
        if (seg.status === 'recording') {
            tile.activeSegmentId = seg.segmentId;
            tile._streamCamId = tile.camId;
            return tlStartLiveSubStream(tile.camId, tile.video).then(function () { return true; });
        }
        var segStart = tlIsoToMs(seg.start_at);
        var segEnd = tlIsoToMs(seg.end_at);
        var offsetSec = Math.max(0, (utcMs - segStart) / 1000);
        if (Number.isFinite(segEnd) && segEnd > segStart) {
            var durSec = (segEnd - segStart) / 1000;
            if (durSec > 0.1) offsetSec = Math.min(offsetSec, Math.max(0, durSec - 0.08));
        }
        var baseUrl = tlStreamUrl(seg.segmentId, tile.camId);
        var url = offsetSec >= 0.25
            ? (baseUrl + '#t=' + (Math.round(offsetSec * 100) / 100))
            : baseUrl;
        var v = tile.video;
        tlEnsureVideoPlayAttrs(v);
        try { v.preload = 'auto'; } catch (_) { /* ignore */ }

        /* INV-SAME-FILE-GUARD-V1 — sync claim map (stops Play-All race on same segmentId). */
        if (!tl._segmentClaims) tl._segmentClaims = {};
        var claimOwner = tl._segmentClaims[seg.segmentId];
        if (claimOwner && String(claimOwner) !== String(tile.camId)) {
            tlClearTileAtGap(tile);
            return Promise.resolve(false);
        }
        var claimed = null;
        tl.tiles.forEach(function (other) {
            if (!other || other === tile || !other.camId) return;
            if (typeof tlTileActiveInLayout === 'function' && !tlTileActiveInLayout(other)) return;
            if (other.activeSegmentId === seg.segmentId && other._streamCamId &&
                String(other._streamCamId) !== String(tile.camId)) {
                claimed = other;
            }
        });
        if (claimed) {
            tlClearTileAtGap(tile);
            tlSetMeta('Blocked duplicate clip on this slot (same file as another camera).');
            return Promise.resolve(false);
        }
        tl._segmentClaims[seg.segmentId] = String(tile.camId);

        var srcNow = v.getAttribute('src') || '';
        var needLoad = tile.activeSegmentId !== seg.segmentId
            || !srcNow
            || srcNow.indexOf(encodeURIComponent(seg.segmentId)) < 0
            || tile._streamCamId !== tile.camId;

        /* INV-SYNC-SEEK-GENERATION-V1 — every seek gets a per-tile generation. After any await
           (load timer / metadata / seeked) the seek re-checks that it is still the newest one for
           this tile and that cam / segment / element are unchanged. A stale seek resolves false and
           never touches the video (the old 1.5 s load timer used to seek a *newer* clip to an old
           offset). Callers treat false as "do not play". */
        var gen = tile._seekGen = (tile._seekGen || 0) + 1;
        var camAtStart = tile.camId;
        var segIdAtStart = seg.segmentId;
        function stale() {
            return tile._seekGen !== gen
                || tile.video !== v
                || String(tile.camId || '') !== String(camAtStart || '')
                || tile.activeSegmentId !== segIdAtStart;
        }
        function settleBusy(ok) {
            if (tile._seekGen === gen) tile._seekBusy = false;
            var md = Number(v.duration);
            if (ok !== false && Number.isFinite(md) && md > 0.05) {
                if (tlClipSegmentEndToMedia(tile, seg, md)) tlDrawTimeline();
            }
            return ok;
        }

        if (needLoad) {
            tile.activeSegmentId = seg.segmentId;
            tile._streamCamId = tile.camId;
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(v);
            } catch (_) { /* ignore */ }
            if (opts.quick) {
                /* Scrub: kick load, do not wait (was freezing timeline clicks). */
                tile._seekBusy = true;
                v.src = url;
                try { v.load(); } catch (_) { /* ignore */ }
                try { v.currentTime = offsetSec; } catch (_) { /* ignore */ }
                setTimeout(function () { settleBusy(true); }, 0);
                return Promise.resolve(true);
            }
            tile._seekBusy = true;
            return new Promise(function (resolve) {
                var settled = false;
                var finishLoad = function () {
                    if (settled) return;
                    settled = true;
                    if (stale()) { resolve(settleBusy(false)); return; }
                    try { v.playbackRate = tl.speed; } catch (_) { /* ignore */ }
                    tlWaitVideoSeek(v, offsetSec).then(function () { resolve(settleBusy(!stale())); });
                };
                var timer = setTimeout(finishLoad, 1500);
                v.onerror = function () {
                    clearTimeout(timer);
                    finishLoad();
                };
                v.onloadedmetadata = function () {
                    clearTimeout(timer);
                    finishLoad();
                };
                v.src = url;
                try { v.load(); } catch (_) { finishLoad(); }
            });
        }
        try { v.playbackRate = tl.speed; } catch (_) { /* ignore */ }
        if (opts.quick) {
            try { v.currentTime = offsetSec; } catch (_) { /* ignore */ }
            return Promise.resolve(true);
        }
        tile._seekBusy = true;
        return tlWaitVideoSeek(v, offsetSec).then(function () { return settleBusy(!stale()); });
    }

    function tlShouldSeekTile(tile) {
        if (!tile || !tile.camId) return false;
        if (!tlTileActiveInLayout(tile)) return false;
        if (tl.syncLock) return true;
        if (tile.slot === tl.focusSlot) return true;
        if (tile.playing) return true;
        return false;
    }

    function tlSyncLockChrome() {
        var btn = $('inv-vms-sync-lock');
        if (btn) {
            btn.classList.toggle('active', !!tl.syncLock);
            btn.setAttribute('aria-pressed', tl.syncLock ? 'true' : 'false');
            btn.textContent = tl.syncLock ? 'Sync Lock On' : 'Sync Lock Off';
        }
        if (typeof tlUpdateLayoutChrome === 'function') {
            try { tlUpdateLayoutChrome(); } catch (_) { /* ignore */ }
        }
    }

    function tlSetSyncLock(on) {
        tl.syncLock = !!on;
        tlSyncLockChrome();
        tlSetMeta(tl.syncLock
            ? 'Sync Lock on — one clock; multi-lane timeline (focus lane highlighted).'
            : 'Sync Lock off — timeline shows Focus camera only.');
        if (tl.syncLock && Number.isFinite(tl.playheadMs)) tlSeekAll(tl.playheadMs);
        tlDrawTimeline();
    }

    function tlSeekAll(utcMs, opts) {
        opts = opts || {};
        if (!Number.isFinite(utcMs) || !tl.from || !tl.to) return;
        tl.playheadMs = Math.max(tl.from.getTime(), Math.min(tl.to.getTime(), utcMs));
        tlStoreFocusPlayhead();
        /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — explicit seek (±1 s, scrub, Sync on) re-arms exhausted slots */
        tl.tiles.forEach(function (t) { if (t) t._exhaustedSegId = null; });
        var readout = $('inv-vms-time-readout');
        if (readout) readout.textContent = tlMsToLocalLabel(tl.playheadMs);
        var quick = !!opts.quick;
        /* INV-SYNC-SEEK-GENERATION-V1 — newest Sync-Lock seek wins; an older in-flight seekAll
           that resolves later must not play / redraw over it (serialised by supersession). */
        var seekAllGen = tl._seekAllGen = (tl._seekAllGen || 0) + 1;
        var targetMs = tl.playheadMs;
        var promises = tl.tiles.map(function (tile) {
            if (!tlShouldSeekTile(tile)) return Promise.resolve(true);
            tile.playheadMs = tl.playheadMs;
            return tlSeekTile(tile, tl.playheadMs, { quick: quick });
        });
        if (quick) {
            tlDrawTimeline();
            tlDrawOverlays();
            tlUpdateAllTileTransport();
            return;
        }
        Promise.all(promises).then(function (results) {
            if (tl._seekAllGen !== seekAllGen) return;
            tlDrawTimeline();
            tlDrawOverlays();
            tl.tiles.forEach(function (tile, i) {
                if (results[i] === false) return;
                if (!tile.playing || !tile.video || !tile.video.src) return;
                /* post-await revalidation: the loaded segment must still be the one under yellow */
                var segNow = tlFindSegmentAt(tile.segments || [], targetMs);
                if (!segNow || segNow.segmentId !== tile.activeSegmentId) return;
                tlPlayVideoElement(tile.video, { rate: tl.speed, unmute: !tile.audioMuted })
                    .then(function () { tlApplyTileAudio(tile); });
            });
            tlUpdateAllTileTransport();
        });
    }

    function tlGapHonestyMeta(playingN, gapLabels) {
        /* INV-SOS-PIN-AND-GAP-HONESTY-V1 — no fake sync; name cams in gap. */
        var gaps = (gapLabels || []).filter(Boolean);
        if (!playingN && gaps.length) {
            return 'Yellow is in a gap for ' + gaps.join(', ') +
                '. Move the timeline marker onto blue, then press Play All.';
        }
        if (playingN && gaps.length) {
            return 'Playing ' + playingN + ' at yellow. Gap (no blue): ' + gaps.join(', ') +
                '. Move the marker to where both lanes are blue for full Sync. Play does not jump to red markers.';
        }
        if (playingN) return 'Playing from playhead (yellow).';
        return 'Move the timeline marker onto a blue block, then press Play All.';
    }

    function tlClearTileAtGap(tile) {
        if (!tile) return;
        tile.playing = false;
        /* INV-GAP-BLACK-AND-OWN-CAM-V1 — always unload to black (no leftover other-cam frame). */
        tlUnloadTileVideo(tile);
        if (tile.video) {
            try {
                tile.video.removeAttribute('poster');
                tile.video.style.background = '#000';
            } catch (_) { /* ignore */ }
        }
    }

    function tlAuditPlayAllNoRecord(source) {
        /* INV-RECORD-WHO-FIRED-V1 — breadcrumb only; never sends device Record. */
        var cams = [];
        tl.tiles.forEach(function (t) {
            if (t && t.camId && tlTileActiveInLayout(t)) cams.push(String(t.camId));
        });
        try {
            fetch('/api/vms/investigation/play-audit', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: source || 'play_all',
                    syncLock: !!tl.syncLock,
                    playheadMs: Number.isFinite(tl.playheadMs) ? tl.playheadMs : null,
                    cams: cams,
                }),
            }).catch(function () { /* ignore */ });
        } catch (_) { /* ignore */ }
    }

    /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — Play All / scrub release every per-slot hold and
       every "media exhausted" mark so the master clock may pick the slot up again. */
    function tlReleaseTileHolds(alsoExhausted) {
        tl.tiles.forEach(function (tile) {
            if (!tile) return;
            tile.hold = false;
            if (alsoExhausted) tile._exhaustedSegId = null;
        });
    }

    function tlSyncPlayVideos() {
        /* INV-SYNC-MASTER-CLOCK-V1 — drag yellow, Play All: shared clock; cams join when blue.
           Never snap to clip start / red pin. */
        tlReleaseTileHolds(false);
        tlAuditPlayAllNoRecord(tl.syncLock ? 'play_all_sync' : 'play_all');
        var yellow = Number.isFinite(tl.playheadMs) ? tl.playheadMs : null;
        if (yellow == null) {
            tlSetMeta('Move the timeline marker onto the recordings, then press Play All.');
            return;
        }
        if (tl.layoutMode === 'compare') {
            /* Compare keeps per-tile clocks — not master Sync. */
            var jobs = [];
            var gapLabels = [];
            var i;
            /* INV-SYNC-SEEK-GENERATION-V1 — per-tile closure (the old `var tile` inside the for
               loop made every .then() see the LAST tile → compare played one slot, not four);
               a stale / superseded seek drops that tile back to not-playing instead of playing. */
            var compareJob = function (tile) {
                tile.playheadMs = yellow;
                tile.playing = true;
                tlEnsureVideoPlayAttrs(tile.video);
                return tlSeekTile(tile, yellow).then(function (ok) {
                    if (ok === false || !tile.playing || !tile.video || !tile.video.src) {
                        tile.playing = false;
                        return { ok: false, gap: true };
                    }
                    return tlPlayVideoElement(tile.video, { rate: tl.speed, unmute: !tile.audioMuted })
                        .then(function (res) {
                            tlApplyTileAudio(tile);
                            return res;
                        });
                });
            };
            for (i = 0; i < 4; i++) {
                var cmpTile = tl.tiles[i];
                if (!cmpTile || !cmpTile.camId || !cmpTile.video) continue;
                if (!tlFindSegmentAt(cmpTile.segments || [], yellow)) {
                    tlClearTileAtGap(cmpTile);
                    gapLabels.push(tlShortTreeLabel(cmpTile.camName, cmpTile.camId));
                    continue;
                }
                jobs.push(compareJob(cmpTile));
            }
            Promise.all(jobs).then(function () {
                tlSetMeta(tlGapHonestyMeta(jobs.length, gapLabels));
                tlDrawTimeline();
                tlUpdateAllTileTransport();
            });
            return;
        }
        tl.tiles.forEach(function (tile) {
            if (!tlTileActiveInLayout(tile)) {
                tile.playing = false;
                if (tile.video) try { tile.video.pause(); } catch (_) { /* ignore */ }
                return;
            }
            /* INV-SYNC-ONE-CLOCK-HARD-V1 — black gaps before clock starts (no leftover frames). */
            if (tile.camId && !tlFindSegmentAt(tile.segments || [], yellow)) {
                tlClearTileAtGap(tile);
            }
        });
        tlStartMasterClock(yellow);
        tlMasterApplyTiles(yellow);
        var readout0 = $('inv-vms-time-readout');
        if (readout0) readout0.textContent = tlMsToLocalLabel(yellow);
        tlDrawTimeline();
        tlUpdateAllTileTransport();
        tlSetMeta('Playing from timeline marker (Sync). Other cameras join when their recording starts.');
    }

    function tlPauseVideos() {
        tlStopMasterClock();
        tl.tiles.forEach(function (tile) {
            tile.playing = false;
            if (tile.video) try { tile.video.pause(); } catch (_) { /* ignore */ }
        });
        /* INV-PLAY-FROM-PLAYHEAD-V1 — do not re-seek (was fighting scrub / playhead) */
        tlUpdateAllTileTransport();
        tlDrawTimeline();
        tlSetMeta('Paused at timeline marker.');
    }

    function tlRatioForMs(ms) {
        if (!tl.from || !tl.to) return 0;
        return (ms - tl.from.getTime()) / (tl.to.getTime() - tl.from.getTime());
    }

    /* VMS-TIMELINE-ZOOM-PLAY-V1 — visible scrub window (zoom), full from/to stay load range. */
    function tlFullSpanMs() {
        if (!tl.from || !tl.to) return 1;
        return Math.max(1, tl.to.getTime() - tl.from.getTime());
    }

    function tlSyncZoomLabel() {
        var el = $('inv-vms-zoom-label');
        if (!el) return;
        var z = Math.max(1, Number(tl.zoomLevel) || 1);
        el.textContent = (z <= 1 ? '1' : String(z)) + 'x';
    }

    function tlResetTimelineZoom() {
        tl.zoomLevel = 1;
        if (tl.from && tl.to) {
            tl.viewFromMs = tl.from.getTime();
            tl.viewToMs = tl.to.getTime();
        } else {
            tl.viewFromMs = null;
            tl.viewToMs = null;
        }
        tlSyncZoomLabel();
    }

    function tlViewBounds() {
        if (!tl.from || !tl.to) return { fromMs: 0, toMs: 1, span: 1 };
        var fullFrom = tl.from.getTime();
        var fullTo = tl.to.getTime();
        if (tl.viewFromMs == null || tl.viewToMs == null || tl.zoomLevel <= 1) {
            return { fromMs: fullFrom, toMs: fullTo, span: Math.max(1, fullTo - fullFrom) };
        }
        var v0 = Math.max(fullFrom, Math.min(tl.viewFromMs, tl.viewToMs));
        var v1 = Math.min(fullTo, Math.max(tl.viewFromMs, tl.viewToMs));
        if (v1 <= v0) return { fromMs: fullFrom, toMs: fullTo, span: Math.max(1, fullTo - fullFrom) };
        return { fromMs: v0, toMs: v1, span: Math.max(1, v1 - v0) };
    }

    function tlSetZoomLevel(level, anchorMs) {
        if (!tl.from || !tl.to) return;
        var fullFrom = tl.from.getTime();
        var fullTo = tl.to.getTime();
        var fullSpan = Math.max(1, fullTo - fullFrom);
        var z = Math.max(1, Math.min(64, Math.round(Number(level) || 1)));
        tl.zoomLevel = z;
        if (z <= 1) {
            tl.viewFromMs = fullFrom;
            tl.viewToMs = fullTo;
            tlSyncZoomLabel();
            tlDrawTimeline();
            return;
        }
        var span = fullSpan / z;
        var mid = Number.isFinite(anchorMs) ? anchorMs
            : (tl.playheadMs != null ? tl.playheadMs : fullFrom + fullSpan / 2);
        var v0 = mid - span / 2;
        var v1 = mid + span / 2;
        if (v0 < fullFrom) { v1 += fullFrom - v0; v0 = fullFrom; }
        if (v1 > fullTo) { v0 -= v1 - fullTo; v1 = fullTo; }
        tl.viewFromMs = Math.max(fullFrom, v0);
        tl.viewToMs = Math.min(fullTo, v1);
        tlSyncZoomLabel();
        tlDrawTimeline();
    }

    function tlClampViewWindow() {
        if (!tl.from || !tl.to || tl.zoomLevel <= 1) return;
        var fullFrom = tl.from.getTime();
        var fullTo = tl.to.getTime();
        var span = Math.max(1, (tl.viewToMs || 0) - (tl.viewFromMs || 0));
        var v0 = Number(tl.viewFromMs);
        var v1 = Number(tl.viewToMs);
        if (!Number.isFinite(v0) || !Number.isFinite(v1)) return;
        if (v0 < fullFrom) {
            v1 += fullFrom - v0;
            v0 = fullFrom;
        }
        if (v1 > fullTo) {
            v0 -= v1 - fullTo;
            v1 = fullTo;
        }
        v0 = Math.max(fullFrom, v0);
        v1 = Math.min(fullTo, v1);
        if (v1 - v0 < span) {
            if (v0 <= fullFrom) v1 = Math.min(fullTo, fullFrom + span);
            if (v1 >= fullTo) v0 = Math.max(fullFrom, fullTo - span);
        }
        tl.viewFromMs = v0;
        tl.viewToMs = Math.max(v0 + 1, v1);
    }

    function tlPanByPixels(dxPx) {
        if (!tl.from || !tl.to || tl.zoomLevel <= 1) return;
        var canvas = $('inv-vms-timeline');
        if (!canvas) return;
        var W = Math.max(1, canvas.clientWidth || canvas.width || 1);
        var vb = tlViewBounds();
        var shift = (-Number(dxPx) || 0) * (vb.span / W);
        tl.viewFromMs = vb.fromMs + shift;
        tl.viewToMs = vb.toMs + shift;
        tlClampViewWindow();
        tlDrawTimeline();
    }

    function tlPanByFraction(frac) {
        if (!tl.from || !tl.to || tl.zoomLevel <= 1) return;
        var vb = tlViewBounds();
        var shift = vb.span * (Number(frac) || 0);
        tl.viewFromMs = vb.fromMs + shift;
        tl.viewToMs = vb.toMs + shift;
        tlClampViewWindow();
        tlDrawTimeline();
    }

    function tlMsFromClientX(clientX) {
        var canvas = $('inv-vms-timeline');
        if (!canvas || !tl.from || !tl.to) return null;
        var rect = canvas.getBoundingClientRect();
        var w = rect.width || 1;
        var labelW = tlUseMultiLaneTimeline() ? LANE_LABEL_W : 0;
        var trackW = Math.max(1, w - labelW);
        var x = clientX - rect.left - labelW;
        var ratio = Math.max(0, Math.min(1, x / trackW));
        var vb = tlViewBounds();
        return vb.fromMs + ratio * vb.span;
    }

    function tlLaneTilesForTimeline() {
        var out = [];
        (tl.tiles || []).forEach(function (t) {
            if (!t || !t.camId) return;
            if (!tlTileActiveInLayout(t)) return;
            out.push(t);
        });
        return out;
    }

    function tlUseMultiLaneTimeline() {
        if (tl.layoutMode !== 'four' && tl.layoutMode !== 'six') return false;
        /* Sync Off = focus lane only; Sync On = one yellow + all assigned lanes */
        if (!tl.syncLock) return false;
        return tlLaneTilesForTimeline().length >= 1;
    }

    function tlLaneShortName(tile) {
        if (!tile) return '?';
        var raw = tlShortTreeLabel(tile.camName, tile.camId) || ('S' + (tile.slot + 1));
        var s = String(raw).trim();
        if (s.length > 7) s = s.slice(0, 6) + '\u2026';
        return s;
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
        var multi = tlUseMultiLaneTimeline();
        var lanes = multi ? tlLaneTilesForTimeline() : null;
        var H = TIMELINE_H;
        if (multi && lanes && lanes.length) {
            H = LANE_PIN_BAND + lanes.length * (LANE_H + LANE_GAP) + 6;
            H = Math.max(TIMELINE_H, Math.min(H, 200));
        }
        canvas.width = W;
        canvas.height = H;
        canvas.style.height = H + 'px';
        var vb = tlViewBounds();
        var fromMs = vb.fromMs;
        var toMs = vb.toMs;
        var span = vb.span;
        var labelW = multi ? LANE_LABEL_W : 0;
        var trackW = Math.max(1, W - labelW);
        var xFor = function (ms) {
            return labelW + Math.round((ms - fromMs) / span * trackW);
        };

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, W, H);

        if (multi && lanes && lanes.length) {
            /* INV-TIMELINE-MULTI-LANE-V1 — one playhead, thin lane per loaded slot */
            var li;
            for (li = 0; li < lanes.length; li++) {
                var lane = lanes[li];
                var y = LANE_PIN_BAND + li * (LANE_H + LANE_GAP);
                var isFocus = lane.slot === tl.focusSlot;
                ctx.fillStyle = isFocus ? 'rgba(59, 130, 246, 0.22)' : '#0f172a';
                ctx.fillRect(0, y - 1, W, LANE_H + 2);
                ctx.fillStyle = '#334155';
                ctx.fillRect(labelW, y, trackW, LANE_H);
                ctx.fillStyle = isFocus ? '#fde68a' : '#94a3b8';
                ctx.font = (isFocus ? 'bold ' : '') + '10px system-ui';
                ctx.fillText(String(lane.slot + 1), 4, y + 12);
                (lane.segments || []).forEach(function (seg) {
                    var s0 = tlIsoToMs(seg.start_at);
                    var s1 = tlIsoToMs(seg.end_at);
                    if (!Number.isFinite(s0)) return;
                    if (!Number.isFinite(s1) || s1 < s0) s1 = s0 + 1;
                    if (s1 < fromMs || s0 > toMs) return;
                    var x1 = xFor(Math.max(s0, fromMs));
                    var x2 = xFor(Math.min(s1, toMs));
                    var ww = x2 > x1 ? (x2 - x1) : 0;
                    if (ww < 1) return;
                    ctx.fillStyle = isFocus ? tlTierFill(seg) : 'rgba(56, 189, 248, 0.55)';
                    ctx.globalAlpha = isFocus ? 1 : 0.72;
                    ctx.fillRect(x1, y + 1, ww, LANE_H - 2);
                    ctx.globalAlpha = 1;
                });
                /* Gap marker at playhead if this lane has no clip */
                if (Number.isFinite(tl.playheadMs) && !tlFindSegmentAt(lane.segments || [], tl.playheadMs)) {
                    var gx = xFor(tl.playheadMs);
                    ctx.fillStyle = 'rgba(248, 113, 113, 0.85)';
                    ctx.fillRect(gx - 1, y, 2, LANE_H);
                }
            }
            /* INV-SOS-PIN-AND-GAP-HONESTY-V1 — Sync multi-lane: pins from ALL assigned cams
               (was focus-only → SOS on kk hidden when Focus = Chin). */
            var pinAlarms = tlDisplayAlarms() || [];
            var lastPinX = -9999;
            pinAlarms.forEach(function (al) {
                var ams = tlAlarmAt(al);
                if (!Number.isFinite(ams) || ams < fromMs || ams > toMs) return;
                var x = xFor(ams);
                if (Math.abs(x - lastPinX) < 4) return;
                lastPinX = x;
                var note = String(al.note || '');
                var col = tlPinColor(note.indexOf('FR') === 0 || note.indexOf('Weapon') === 0
                    ? 'analytics'
                    : (al.event_type || al.eventType));
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(x, LANE_PIN_BAND - 2);
                ctx.lineTo(x - 4, 2);
                ctx.lineTo(x + 4, 2);
                ctx.closePath();
                ctx.fill();
            });
            if (tl.markInMs != null && tl.markInMs >= fromMs && tl.markInMs <= toMs) {
                var ix = xFor(tl.markInMs);
                ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
                ctx.fillRect(ix - 1, 0, 2, H);
            }
            if (tl.markOutMs != null && tl.markOutMs >= fromMs && tl.markOutMs <= toMs) {
                var ox = xFor(tl.markOutMs);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.fillRect(ox - 1, 0, 2, H);
            }
            if (tl.playheadMs != null && tl.playheadMs >= fromMs && tl.playheadMs <= toMs) {
                var px = xFor(tl.playheadMs);
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px, 0);
                ctx.lineTo(px, H);
                ctx.stroke();
            }
            return;
        }

        /* Single-band timeline (Single cam, Sync Off, or one lane) */
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, SEG_Y, W, SEG_H);

        if (tl.zoomLevel > 1) {
            var tickEvery = span > 3600000 ? 900000 : (span > 600000 ? 60000 : 15000);
            var t0 = Math.ceil(fromMs / tickEvery) * tickEvery;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
            ctx.font = '9px system-ui';
            for (var tick = t0; tick <= toMs; tick += tickEvery) {
                var tx = xFor(tick);
                ctx.fillRect(tx, SEG_Y, 1, SEG_H);
                if (tickEvery >= 60000) {
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
                    var lab = tlMsToTimeInput(tick);
                    if (lab.length >= 5) lab = lab.slice(0, 5);
                    ctx.fillText(lab, tx + 2, SEG_Y - 2);
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
                }
            }
        }

        tlDisplaySegments().forEach(function (seg) {
            var s0 = tlIsoToMs(seg.start_at);
            var s1 = tlIsoToMs(seg.end_at);
            if (!Number.isFinite(s0)) return;
            if (!Number.isFinite(s1) || s1 < s0) s1 = s0 + 1;
            if (s1 < fromMs || s0 > toMs) return;
            var x1 = xFor(Math.max(s0, fromMs));
            var x2 = xFor(Math.min(s1, toMs));
            var w = x2 > x1 ? (x2 - x1) : 0;
            if (w < 1) return;
            ctx.fillStyle = tlTierFill(seg);
            ctx.fillRect(x1, SEG_Y, w, SEG_H);
            if (w > 56 && seg.storageTier) {
                ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
                ctx.font = '9px system-ui';
                var label = String(seg.storageTier);
                if (label.length > 12) label = label.slice(0, 11) + '\u2026';
                ctx.fillText(label, x1 + 3, SEG_Y + 12);
            }
        });

        var lastPinXs = -9999;
        tlDisplayAlarms().forEach(function (al) {
            var ams = tlAlarmAt(al);
            if (!Number.isFinite(ams) || ams < fromMs || ams > toMs) return;
            var x = xFor(ams);
            if (Math.abs(x - lastPinXs) < 4) return;
            lastPinXs = x;
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

        if (tl.markInMs != null && tl.markInMs >= fromMs && tl.markInMs <= toMs) {
            var ix2 = xFor(tl.markInMs);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            ctx.fillRect(ix2 - 1, 0, 2, H);
            ctx.fillStyle = '#22c55e';
            ctx.font = '9px sans-serif';
            ctx.fillText('IN', ix2 + 3, 10);
        }
        if (tl.markOutMs != null && tl.markOutMs >= fromMs && tl.markOutMs <= toMs) {
            var ox2 = xFor(tl.markOutMs);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
            ctx.fillRect(ox2 - 1, 0, 2, H);
            ctx.fillStyle = '#ef4444';
            ctx.font = '9px sans-serif';
            ctx.fillText('OUT', ox2 + 3, 10);
        }

        if (tl.playheadMs != null && tl.playheadMs >= fromMs && tl.playheadMs <= toMs) {
            var px2 = xFor(tl.playheadMs);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px2, 0);
            ctx.lineTo(px2, H);
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

    function tlPointerHitsBlue(clientX) {
        var ms = tlMsFromClientX(clientX);
        if (!Number.isFinite(ms)) return false;
        if (tl.layoutMode === 'compare') {
            var cft = tlFocusTile();
            return !!(cft && tlFindSegmentAt(cft.segments || [], ms));
        }
        if (tlUseMultiLaneTimeline()) {
            return tlLaneTilesForTimeline().some(function (t) {
                return t && tlFindSegmentAt(t.segments || [], ms);
            });
        }
        var f = tlFocusTile();
        if (f && f.camId) return !!tlFindSegmentAt(f.segments || [], ms);
        return (tl.mergedSegments || []).some(function (seg) {
            return !!tlFindSegmentAt([seg], ms);
        });
    }

    function tlPointerNearPlayhead(clientX) {
        var canvas = $('inv-vms-timeline');
        if (!canvas || !Number.isFinite(tl.playheadMs) || !tl.from || !tl.to) return false;
        var rect = canvas.getBoundingClientRect();
        var W = rect.width || 1;
        var labelW = tlUseMultiLaneTimeline() ? LANE_LABEL_W : 0;
        var vb = tlViewBounds();
        var px = labelW + ((tl.playheadMs - vb.fromMs) / vb.span) * Math.max(1, W - labelW);
        return Math.abs((clientX - rect.left) - px) <= 8;
    }

    function tlPointerOnLabelGutter(clientX) {
        var canvas = $('inv-vms-timeline');
        if (!canvas || !tlUseMultiLaneTimeline()) return false;
        return (clientX - canvas.getBoundingClientRect().left) < LANE_LABEL_W;
    }

    function tlOnTimelinePointer(clientX) {
        var ms = tlMsFromClientX(clientX);
        if (ms == null) return;
        if (tl.layoutMode === 'compare') {
            var ft = tlFocusTile();
            if (ft) {
                tlPauseTile(ft);
                ft.playheadMs = ms;
                tl.playheadMs = ms;
                tlSyncCompareTimeInput(ft);
                tlSeekTile(ft, ms, { quick: true });
                tlDrawTimeline();
                tlDrawOverlays();
            }
            return;
        }
        /* INV-SYNC-MASTER-CLOCK-V1 — drag marker freely; pause Sync clock; keep position */
        tlStopMasterClock();
        tl.playheadMs = ms;
        tlReleaseTileHolds(true); /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 */
        tl.tiles.forEach(function (tile) {
            tile.playing = false;
            if (tile.video) try { tile.video.pause(); } catch (_) { /* ignore */ }
            if (tl.syncLock || tile.slot === tl.focusSlot) tile.playheadMs = ms;
        });
        tlSeekAll(ms, { quick: true });
        tlDrawTimeline();
        tlUpdateAllTileTransport();
    }

    function tlOnTimelineClick(e) {
        var canvas = $('inv-vms-timeline');
        if (!canvas || !tl.from || !tl.to) return;
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var W = Math.max(1, canvas.width || rect.width);
        var vb = tlViewBounds();
        var fromMs = vb.fromMs;
        var span = vb.span;
        var labelW = tlUseMultiLaneTimeline() ? LANE_LABEL_W : 0;
        var trackW = Math.max(1, W - labelW);
        var hitPin = null;
        var best = 8;
        var pinList = tlUseMultiLaneTimeline()
            ? ((tlFocusTile() && tlFocusTile().alarms) || tl.mergedAlarms || [])
            : tlDisplayAlarms();
        pinList.forEach(function (al) {
            var ams = tlAlarmAt(al);
            if (!Number.isFinite(ams) || ams < fromMs || ams > vb.toMs) return;
            var ax = labelW + ((ams - fromMs) / span) * trackW;
            if (Math.abs(ax - x) <= best) {
                best = Math.abs(ax - x);
                hitPin = al;
            }
        });
        if (hitPin) {
            tl._pinHitAt = Date.now(); /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — pin click never auto-plays */
            tlOpenAlarmPreview(hitPin);
            return;
        }
        tlCloseAlarmPreview();
        tlOnTimelinePointer(e.clientX);
    }

    /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 — NLE behaviour: release the yellow marker on a blue
       block → play from there (Sync: Play All; else focus slot). Released in a gap → stay paused
       (existing meta explains). Deferred one tick so the canvas `click` (which re-seeks) runs first. */
    function tlResumeAfterScrub() {
        setTimeout(function () {
            if (tl._pinHitAt && (Date.now() - tl._pinHitAt) < 400) return;
            if (!Number.isFinite(tl.playheadMs)) return;
            var at = tl.playheadMs;
            if (tl.layoutMode === 'compare') {
                var ft = tlFocusTile();
                if (ft && ft.camId && tlFindSegmentAt(ft.segments || [], at)) tlPlayTile(ft);
                return;
            }
            var onBlue = tl.tiles.some(function (t) {
                if (!t || !t.camId || !tlTileActiveInLayout(t)) return false;
                if (!tl.syncLock && t.slot !== tl.focusSlot) return false;
                return !!tlFindSegmentAt(t.segments || [], at);
            });
            if (!onBlue) return;
            if (tl.syncLock) {
                tlSyncPlayVideos();
            } else {
                var f = tlFocusTile();
                if (f) tlPlayTile(f);
            }
        }, 0);
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
            tlResetTimelineZoom();
            tlDrawTimeline();
            tlSeekAll(tl.playheadMs);
            tlUpdateTimelineChrome();
            tlSetMeta(active.length + ' assigned · ' + tl.mergedSegments.length + ' segment(s) · ' +
                tl.mergedAlarms.length + ' marker(s)' +
                (focusTile && focusTile.camId
                    ? (' · focus ' + tlShortTreeLabel(focusTile.camName, focusTile.camId))
                    : '') +
                (tl.selectedDate ? ' · ' + tl.selectedDate : '') +
                tlEmptyRecordingMetaSuffix(active) + '.');
            await tlRefreshRecordingDays();
        } catch (err) {
            tlSetMeta('Could not load recordings.');
            tlUpdateTimelineChrome();
        }
    }

    function tlEmptyRecordingMetaSuffix(tiles) {
        var fixedEmpty = 0;
        var bwcEmpty = 0;
        (tiles || []).forEach(function (t) {
            if (!t || !t.camId) return;
            if ((t.segments || []).length) return;
            if (tlCamSourceKind(t.camId) === 'bwc') bwcEmpty += 1;
            else fixedEmpty += 1;
        });
        if (!fixedEmpty && !bwcEmpty) return '';
        if (fixedEmpty && !bwcEmpty) {
            return ' · Fixed: no local recording (continuous record / storage). Remote NVR pull is not in this release';
        }
        if (bwcEmpty && !fixedEmpty) {
            return ' · BWC: no clips for this range (dock or SOS upload after duty)';
        }
        return ' · Some cameras have no local clips for this range';
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
            if (!tl.visible) return; /* INV-TAB-ONHIDE-TEARDOWN-V1 */
            if (e.key === 'Escape') {
                tlCloseAllDtPops();
                if (tl.calOpen) tlSetCalOpen(false);
            }
        });
        tlSyncDtTriggers();
        try {
            global.addEventListener('fm-i18n-changed', function () { tlSyncDtTriggers(); });
        } catch (_) { /* ignore */ }

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

        function tlWireRailTransport(playId, pauseId, stopId) {
            var rp = $(playId);
            var rz = $(pauseId);
            var rs = stopId ? $(stopId) : null;
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
            if (rs) {
                rs.addEventListener('click', function () {
                    var dock = $('inv-vms-sync-stop');
                    if (dock) dock.click();
                });
            }
        }
        tlWireRailTransport('inv-vms-rail-play-all', 'inv-vms-rail-pause-all', 'inv-vms-rail-stop-all');
        tlWireRailTransport('inv-vms-rail-compare-play', 'inv-vms-rail-compare-pause', 'inv-vms-rail-compare-stop');

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
                var tStop = tile.tile.querySelector('.inv-vms-tile-stop');
                var tMute = tile.tile.querySelector('.inv-vms-tile-mute');
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
                if (tStop) {
                    tStop.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        tlStopTile(tile);
                    });
                }
                if (tMute) {
                    tMute.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        tlToggleTileMute(tile);
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
                tlBindTilePlaybackLifecycle(tile);
                tile.video.addEventListener('timeupdate', function () {
                    if (tl.masterClockOn) return;
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
                    if (tl.syncLock && tile.slot === tl.focusSlot) {
                        tl.tiles.forEach(function (other) {
                            if (other.slot === tile.slot || !other.camId || !other.video || !other.playing) return;
                            if (!tlTileActiveInLayout(other)) return;
                            other.playheadMs = utc;
                            var oseg = tlFindSegmentAt(other.segments, utc);
                            if (!oseg) return;
                            if (oseg.segmentId !== other.activeSegmentId) {
                                tlSeekTile(other, utc);
                                return;
                            }
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
        var syncLockBtn = $('inv-vms-sync-lock');
        if (syncLockBtn) {
            syncLockBtn.addEventListener('click', function () {
                tlSetSyncLock(!tl.syncLock);
            });
        }
        tlSyncLockChrome();
        var stopAllBtn = $('inv-vms-sync-stop');
        if (stopAllBtn) {
            stopAllBtn.addEventListener('click', tlStopVideos);
        }
        var stepBack = $('inv-vms-step-back');
        var stepFwd = $('inv-vms-step-fwd');
        if (stepBack) {
            stepBack.addEventListener('click', function () { tlStepFocus(-1000); });
        }
        if (stepFwd) {
            stepFwd.addEventListener('click', function () { tlStepFocus(1000); });
        }
        document.addEventListener('keydown', function (e) {
            if (!tl.visible) return;
            if (e.target && e.target.closest &&
                e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            var frameMs = 1000 / 30;
            var delta = e.shiftKey ? frameMs : 1000;
            if (e.key === 'ArrowLeft') delta = -delta;
            tlStepFocus(delta);
        });

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
                if (e.button !== 0 && e.button !== 1) return;
                /* NLE: zoomed empty grey / left gutter / middle-button = pan (blue stays put).
                   Yellow line or a blue clip = scrub. Wheel still zooms. Fit (1x) cannot pan. */
                var wantPan = e.button === 1
                    || (e.button === 0 && tl.zoomLevel > 1
                        && (tlPointerOnLabelGutter(e.clientX)
                            || (!tlPointerNearPlayhead(e.clientX) && !tlPointerHitsBlue(e.clientX))));
                if (wantPan) {
                    e.preventDefault();
                    tl.panning = true;
                    tl.panMoved = false;
                    tl.panLastX = e.clientX;
                    tl.dragging = false;
                    return;
                }
                if (e.button !== 0) return;
                tl.panning = false;
                tl.dragging = true;
                tl.panMoved = false;
                tlOnTimelinePointer(e.clientX);
            });
            window.addEventListener('mousemove', function (e) {
                if (tl.panning) {
                    var dx = e.clientX - tl.panLastX;
                    if (Math.abs(dx) > 2) {
                        tl.panMoved = true;
                        tlPanByPixels(dx);
                        tl.panLastX = e.clientX;
                    }
                    return;
                }
                if (!tl.dragging) return;
                tlOnTimelinePointer(e.clientX);
            });
            window.addEventListener('mouseup', function () {
                var wasScrub = !!tl.dragging;
                tl.dragging = false;
                tl.panning = false;
                if (wasScrub) tlResumeAfterScrub(); /* INV-TILE-HOLD-SCRUB-PLAY-EOF-GUARD-V1 */
            });
            canvas.addEventListener('click', function (e) {
                if (tl.panMoved) {
                    tl.panMoved = false;
                    return;
                }
                tlOnTimelineClick(e);
            });
            canvas.addEventListener('auxclick', function (e) {
                if (e.button === 1) e.preventDefault();
            });
            canvas.addEventListener('wheel', function (e) {
                if (!tl.from || !tl.to) return;
                e.preventDefault();
                if (tl.zoomLevel > 1 && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) {
                    var panDx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? -e.deltaX : (e.deltaY > 0 ? -48 : 48);
                    tlPanByPixels(panDx);
                    return;
                }
                var anchor = tlMsFromClientX(e.clientX);
                var cur = Math.max(1, Number(tl.zoomLevel) || 1);
                if (e.deltaY < 0) tlSetZoomLevel(Math.min(64, cur * 2), anchor);
                else tlSetZoomLevel(Math.max(1, Math.floor(cur / 2)), anchor);
            }, { passive: false });
        }
        var zoomIn = $('inv-vms-zoom-in');
        var zoomOut = $('inv-vms-zoom-out');
        var zoomFit = $('inv-vms-zoom-fit');
        var panLeft = $('inv-vms-pan-left');
        var panRight = $('inv-vms-pan-right');
        if (zoomIn) {
            zoomIn.addEventListener('click', function (ev) {
                ev.preventDefault();
                var cur = Math.max(1, Number(tl.zoomLevel) || 1);
                tlSetZoomLevel(Math.min(64, cur * 2), tl.playheadMs);
            });
        }
        if (zoomOut) {
            zoomOut.addEventListener('click', function (ev) {
                ev.preventDefault();
                var cur = Math.max(1, Number(tl.zoomLevel) || 1);
                tlSetZoomLevel(Math.max(1, Math.floor(cur / 2)), tl.playheadMs);
            });
        }
        if (zoomFit) {
            zoomFit.addEventListener('click', function (ev) {
                ev.preventDefault();
                tlSetZoomLevel(1);
            });
        }
        if (panLeft) {
            panLeft.addEventListener('click', function (ev) {
                ev.preventDefault();
                tlPanByFraction(-0.4);
            });
        }
        if (panRight) {
            panRight.addEventListener('click', function (ev) {
                ev.preventDefault();
                tlPanByFraction(0.4);
            });
        }
        tlSyncZoomLabel();
        try {
            global.addEventListener('fm-i18n-changed', function () {
                if (tl.playheadMs != null) {
                    var readout = $('inv-vms-time-readout');
                    if (readout) readout.textContent = tlMsToLocalLabel(tl.playheadMs);
                }
                tlSyncDtTriggers();
            });
        } catch (_) { /* ignore */ }
        tlBindAlarmPreviewChrome();
        tlBindDptzPan();
        var alarmClose = $('inv-vms-alarm-preview-close');
        if (alarmClose) {
            alarmClose.addEventListener('click', function (e) {
                e.stopPropagation();
                tlCloseAlarmPreview();
            });
        }
        var alarmPlay = $('inv-vms-alarm-preview-play');
        if (alarmPlay) {
            alarmPlay.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                tlPlayAlarmPreview();
            });
        }
        var alarmCopy = $('inv-vms-alarm-preview-copy');
        if (alarmCopy) {
            alarmCopy.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                tlCopyAlarmPreviewId();
            });
        }
        var alarmPanel = $('inv-vms-alarm-preview');
        if (alarmPanel) {
            alarmPanel.addEventListener('click', function (e) { e.stopPropagation(); });
        }
        document.addEventListener('keydown', function (e) {
            if (!tl.visible) return; /* INV-TAB-ONHIDE-TEARDOWN-V1 */
            if (e.key !== 'Escape') return;
            var preview = $('inv-vms-alarm-preview');
            if (preview && !preview.hidden) {
                tlCloseAlarmPreview();
                return;
            }
            tlCloseEventList();
        });
        tlBindEventListChrome();
        var eventsBtn = $('inv-vms-events');
        if (eventsBtn) {
            eventsBtn.addEventListener('click', function () {
                tlToggleEventList();
            });
        }

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

    function tlClampDptzPan(stage) {
        var scale = tl.dptzScale || 1;
        if (scale <= 1 || !stage) {
            tl.dptzPanX = 0;
            tl.dptzPanY = 0;
            return;
        }
        var maxX = (stage.clientWidth * (scale - 1)) / 2;
        var maxY = (stage.clientHeight * (scale - 1)) / 2;
        if (!Number.isFinite(maxX) || maxX < 0) maxX = 0;
        if (!Number.isFinite(maxY) || maxY < 0) maxY = 0;
        tl.dptzPanX = Math.max(-maxX, Math.min(maxX, tl.dptzPanX || 0));
        tl.dptzPanY = Math.max(-maxY, Math.min(maxY, tl.dptzPanY || 0));
    }

    function tlDptzCssTransform() {
        var scale = tl.dptzScale || 1;
        if (scale <= 1) return '';
        return 'translate(' + (tl.dptzPanX || 0) + 'px,' + (tl.dptzPanY || 0) + 'px) scale(' + scale + ')';
    }

    function tlDptzSteps() {
        return [1, 1.5, 2, 3, 4, 6, 8];
    }

    function tlSetDptzScale(next, metaMsg) {
        var steps = tlDptzSteps();
        var scale = Number(next);
        if (steps.indexOf(scale) < 0) scale = 1;
        if (scale <= 1) {
            tl.dptzPanX = 0;
            tl.dptzPanY = 0;
        }
        tl.dptzScale = scale;
        tl.tiles.forEach(function (tile) {
            if (!tile.tile) return;
            var stage = tile.tile.querySelector('.inv-vms-tile-stage');
            if (stage) stage.classList.remove('is-dptz');
            if (tile.video) tile.video.style.transform = '';
            if (tile.overlay) tile.overlay.style.transform = '';
        });
        tlApplyDptz();
        if (metaMsg != null) tlSetMeta(metaMsg);
        else {
            tlSetMeta(tl.dptzScale > 1
                ? ('Digital PTZ ' + tl.dptzScale + 'x — wheel zoom · drag to pan')
                : 'Digital PTZ off');
        }
    }

    function tlApplyDptz() {
        var tile = tlFocusTile();
        if (!tile || !tile.tile) return;
        var stage = tile.tile.querySelector('.inv-vms-tile-stage');
        var scale = tl.dptzScale || 1;
        if (scale <= 1) {
            tl.dptzPanX = 0;
            tl.dptzPanY = 0;
        } else if (stage) {
            tlClampDptzPan(stage);
        }
        if (stage) stage.classList.toggle('is-dptz', scale > 1);
        var xf = tlDptzCssTransform();
        if (tile.video) tile.video.style.transform = xf;
        if (tile.overlay) tile.overlay.style.transform = xf;
        var btn = $('inv-vms-dptz');
        if (btn) {
            btn.textContent = scale > 1 ? ('Digital PTZ ' + scale + 'x') : 'Digital PTZ';
            btn.classList.toggle('active', scale > 1);
        }
    }

    function tlBindDptzPan() {
        if (tl._dptzPanBound) return;
        tl._dptzPanBound = true;
        var drag = { on: false, lx: 0, ly: 0, moved: false };

        function stageOfEvent(e) {
            var el = e.target;
            if (!el || !el.closest) return null;
            return el.closest('.inv-vms-tile-stage.is-dptz');
        }

        function focusStageOfEvent(e) {
            var el = e.target;
            if (!el || !el.closest) return null;
            var stage = el.closest('.inv-vms-tile-stage');
            if (!stage) return null;
            var tile = tlFocusTile();
            if (!tile || !tile.tile) return null;
            if (tile.tile.querySelector('.inv-vms-tile-stage') !== stage) return null;
            return stage;
        }

        document.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if ((tl.dptzScale || 1) <= 1) return;
            if (e.target && e.target.closest && e.target.closest('.inv-vms-tile-transport, button, a')) return;
            var stage = stageOfEvent(e);
            if (!stage) return;
            var tile = tlFocusTile();
            if (!tile || !tile.tile) return;
            if (tile.tile.querySelector('.inv-vms-tile-stage') !== stage) return;
            drag.on = true;
            drag.moved = false;
            drag.lx = e.clientX;
            drag.ly = e.clientY;
            stage.classList.add('is-dptz-panning');
            e.preventDefault();
        });
        window.addEventListener('mousemove', function (e) {
            if (!drag.on) return;
            var dx = e.clientX - drag.lx;
            var dy = e.clientY - drag.ly;
            if (dx || dy) drag.moved = true;
            drag.lx = e.clientX;
            drag.ly = e.clientY;
            tl.dptzPanX = (tl.dptzPanX || 0) + dx;
            tl.dptzPanY = (tl.dptzPanY || 0) + dy;
            tlApplyDptz();
        });
        window.addEventListener('mouseup', function () {
            if (!drag.on) return;
            drag.on = false;
            document.querySelectorAll('.inv-vms-tile-stage.is-dptz-panning').forEach(function (el) {
                el.classList.remove('is-dptz-panning');
            });
        });
        document.addEventListener('click', function (e) {
            if (!drag.moved) return;
            var stage = stageOfEvent(e);
            if (!stage) return;
            e.stopPropagation();
            drag.moved = false;
        }, true);
        /* VMS-DIGITAL-PTZ-WHEEL-ZOOM-V1: wheel on Focus tile stage steps zoom ladder */
        document.addEventListener('wheel', function (e) {
            if (!tl.visible) return;
            if (e.target && e.target.closest && e.target.closest('.inv-vms-tile-transport, button, a, input, textarea')) return;
            var stage = focusStageOfEvent(e);
            if (!stage) return;
            var dy = e.deltaY;
            if (!dy) return;
            e.preventDefault();
            var steps = tlDptzSteps();
            var i = steps.indexOf(tl.dptzScale);
            if (i < 0) i = 0;
            if (dy < 0) i = Math.min(steps.length - 1, i + 1);
            else i = Math.max(0, i - 1);
            if (steps[i] === tl.dptzScale) return;
            tlSetDptzScale(steps[i]);
        }, { passive: false, capture: true });
    }

    function tlToggleDptz() {
        var steps = tlDptzSteps();
        var i = steps.indexOf(tl.dptzScale);
        if (i < 0) i = 0;
        tlSetDptzScale(steps[(i + 1) % steps.length]);
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
                    /* INV-LIVE-REFRESH-AND-CACHE-V1 — SOS raised while on another tab: refresh
                       those cams' lanes now so the red pin appears without Load / reload. */
                    tlFlushSosDirty();
                });
            },
            onHide: function () {
                if (!tl.visible) return;
                tl.visible = false;
                /* INV-TAB-ONHIDE-TEARDOWN-V1 — no hidden playback, no RAF, no wheel/keydown capture */
                tlTeardownForHide();
            },
            /* INV-SOS-PIN-AND-GAP-HONESTY-V1 — refresh assigned cam timeline so red SOS pin appears */
            onSosAlarm: function (data) {
                if (!data) return;
                var camId = String(data.cameraId || data.camId || '').trim();
                if (!camId) return;
                /* INV-LIVE-REFRESH-AND-CACHE-V1 — hidden tab: mark dirty, refresh on onShow.
                   Visible: coalesce per cam (SOS bursts fire several socket events). */
                if (!tl.visible) {
                    tl._sosDirtyCams[camId] = true;
                    return;
                }
                tlQueueSosRefresh(camId);
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
