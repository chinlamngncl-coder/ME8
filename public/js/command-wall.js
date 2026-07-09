(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    function whenI18nReady(cb) {
        if (typeof I18n === 'undefined' || !I18n.init) {
            cb();
            return;
        }
        try {
            const p = I18n.init();
            if (p && typeof p.then === 'function') p.then(cb).catch(function () { cb(); });
            else cb();
        } catch (_) {
            cb();
        }
    }

    function syncWallToolbarI18n() {
        const bar = el('wall-bar');
        if (!bar || !bar.dataset.built) return;
        bar.querySelectorAll('[data-i18n]').forEach(function (node) {
            const key = node.getAttribute('data-i18n');
            if (key) node.textContent = tr(key);
        });
        bar.querySelectorAll('[data-layout]').forEach(function (btn) {
            const id = btn.dataset.layout;
            const key = id === 'focus' ? 'commandWall.layoutFocus' : 'commandWall.layout' + id;
            const label = tr(key);
            btn.textContent = label;
            btn.title = id === 'focus' ? '1 main + 7 satellites' : (label + ' panels');
        });
        bar.querySelectorAll('[data-poll-ms]').forEach(function (btn) {
            const ms = Number(btn.dataset.pollMs);
            btn.textContent = ms ? tr('commandWall.pollSec', { n: ms / 1000 }) : tr('commandWall.pollOff');
        });
        bar.querySelectorAll('[data-rotate-ms]').forEach(function (btn) {
            const ms = Number(btn.dataset.rotateMs);
            btn.textContent = ms ? tr('commandWall.rotateSec', { n: ms / 1000 }) : tr('commandWall.rotateOff');
        });
        const pauseBtn = bar.querySelector('.btn-rotate-pause');
        if (pauseBtn) {
            const pauseKey = rotatePaused ? 'commandWall.rotateResume' : 'commandWall.rotatePause';
            pauseBtn.setAttribute('data-i18n', pauseKey);
            pauseBtn.textContent = tr(pauseKey);
        }
    }

    const MAX_SLOTS = 32;
    const DRAG_MIME = 'application/x-mc2-cam-id';
    const CW_VIEWER_SURFACE = 'command-wall';
    const EMBEDDED = !!document.getElementById('app-view-command-wall');

    const LAYOUT_SCHEMES = {
        '1': { count: 1, cols: 1, rows: 1, focus: false },
        '4': { count: 4, cols: 2, rows: 2, focus: false },
        '9': { count: 9, cols: 3, rows: 3, focus: false },
        '16': { count: 16, cols: 4, rows: 4, focus: false },
        '32': { count: 32, cols: 8, rows: 4, focus: false },
        focus: { count: 8, cols: 4, rows: 4, focus: true },
    };

    /** VB-style 1+7: main 3×3 top-left, 3 right column, 4 bottom row */
    const FOCUS_GRID = [
        { col: '1 / 4', row: '1 / 4' },
        { col: '4', row: '1' },
        { col: '4', row: '2' },
        { col: '4', row: '3' },
        { col: '1', row: '4' },
        { col: '2', row: '4' },
        { col: '3', row: '4' },
        { col: '4', row: '4' },
    ];

    const POLL_OPTIONS = [0, 15000, 30000, 60000];
    const ROTATE_OPTIONS = [0, 20000, 30000, 60000];

    const players = new Map();
    const connectingSlots = new Set();
    const streaming = new Set();
    const slotMuted = new Map();
    const slots = new Array(MAX_SLOTS).fill(null);

    let socket = null;
    let pcmAudio = null;
    let audioFocusSlot = null;
    let fleetById = Object.create(null);
    let rosterFilter = '';
    let voiceCallCamId = null;
    let voiceCallPending = false;
    const sosAlarmCams = new Set();
    let currentLayout = '16';
    let pollIntervalMs = 0;
    let pollQueueIndex = 0;
    let pollTimer = null;
    let rotateIntervalMs = 0;
    let rotateQueueIndex = 0;
    let rotateTimer = null;
    let rotatePaused = false;
    let pttCommCamId = null;
    let spotlightActive = false;
    let spotlightSlot = -1;
    let spotlightPrevLayout = null;
    /** Background deck: streams stay up, no visible panel (layout overflow). */
    let deckEntries = [];

    function c(name) { return EMBEDDED ? 'cw-' + name : name; }

    function gridIconSvg() {
        return '<svg class="' + c('grid-icon') + '" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
            '<rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>' +
            '<rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/>' +
            '<rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/>' +
            '<rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>';
    }

    function wsPort(offset) {
        return (parseInt(window.location.port, 10) || 3888) + offset;
    }

    function videoWsUrl(camId) {
        return 'ws://' + window.location.hostname + ':' + wsPort(1) + '/?camId=' + encodeURIComponent(camId);
    }

    function audioWsUrl() {
        return 'ws://' + window.location.hostname + ':' + wsPort(2);
    }

    let popoutWin = null;

    function openCommandWallPopout() {
        const features = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no';
        const wallUrl = '/command-wall.html?panel=live';
        // Unique name — avoid reusing a named window stuck on "/" or mid-reload.
        popoutWin = window.open(wallUrl, 'mobility-wall-' + String(Date.now()), features);
        if (popoutWin) {
            try { popoutWin.focus(); } catch (_) { /* ignore */ }
        }
    }

    const EL_IDS = EMBEDDED ? {
        wall: 'cw-wall',
        'wall-bar': 'cw-wall-bar',
        'roster-body': 'cw-roster-body',
        'roster-search': 'cw-roster-search',
        'btn-clear': 'cw-btn-clear',
        'btn-popout': 'cw-btn-popout',
        'wall-meta': 'cw-wall-meta',
    } : {
        wall: 'wall',
        'wall-bar': 'wall-bar',
        'roster-body': 'roster-body',
        'roster-search': 'roster-search',
        'btn-clear': 'btn-clear',
        'wall-meta': 'wall-meta',
    };

    function el(key) { return document.getElementById(EL_IDS[key] || key); }

    function activeSlotCount() {
        const scheme = LAYOUT_SCHEMES[currentLayout];
        return scheme ? scheme.count : 16;
    }

    function isSlotVisible(slot) {
        return slot >= 0 && slot < activeSlotCount();
    }

    function slotCamId(slot) {
        const s = slots[slot];
        return s && s.camId ? s.camId : null;
    }

    function isSlotPinned(slot) {
        const s = slots[slot];
        return !!(s && s.pinned);
    }

    function deviceOnline(camId) {
        const d = fleetById[camId];
        return !!(d && d.online);
    }

    function deviceName(camId) {
        const d = fleetById[camId];
        return (d && d.name) || camId || 'Panel';
    }

    function buildWallToolbar() {
        const bar = el('wall-bar');
        if (!bar || bar.dataset.built) return;
        bar.dataset.built = '1';

        const layoutGroup = document.createElement('div');
        layoutGroup.className = c('wall-bar-group');
        const layoutLabel = document.createElement('span');
        layoutLabel.className = c('wall-bar-label');
        layoutLabel.setAttribute('data-i18n', 'commandWall.layout');
        layoutLabel.textContent = tr('commandWall.layout');
        layoutGroup.appendChild(layoutLabel);

        const layoutDefs = [
            { id: '1', key: 'commandWall.layout1' },
            { id: '4', key: 'commandWall.layout4' },
            { id: '9', key: 'commandWall.layout9' },
            { id: '16', key: 'commandWall.layout16' },
            { id: '32', key: 'commandWall.layout32' },
            { id: 'focus', key: 'commandWall.layoutFocus', focus: true },
        ];
        layoutDefs.forEach(function (def) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = c('scheme-btn') + (def.focus ? ' scheme-focus' : '');
            btn.dataset.layout = def.id;
            btn.setAttribute('data-i18n', def.key);
            const label = tr(def.key);
            btn.textContent = label;
            btn.title = def.id === 'focus' ? '1 main + 7 satellites' : (label + ' panels');
            btn.addEventListener('click', function () {
                setLayoutScheme(def.id);
            });
            layoutGroup.appendChild(btn);
        });
        bar.appendChild(layoutGroup);

        const pollGroup = document.createElement('div');
        pollGroup.className = c('wall-bar-group');
        const pollLabel = document.createElement('span');
        pollLabel.className = c('wall-bar-label');
        pollLabel.setAttribute('data-i18n', 'commandWall.poll');
        pollLabel.textContent = tr('commandWall.poll');
        pollGroup.appendChild(pollLabel);

        POLL_OPTIONS.forEach(function (ms) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = c('scheme-btn');
            btn.dataset.pollMs = String(ms);
            btn.textContent = ms ? tr('commandWall.pollSec', { n: ms / 1000 }) : tr('commandWall.pollOff');
            btn.addEventListener('click', function () {
                setPollInterval(ms);
            });
            pollGroup.appendChild(btn);
        });
        bar.appendChild(pollGroup);

        const rotateGroup = document.createElement('div');
        rotateGroup.className = c('wall-bar-group');
        const rotateLabel = document.createElement('span');
        rotateLabel.className = c('wall-bar-label');
        rotateLabel.setAttribute('data-i18n', 'commandWall.rotate');
        rotateLabel.textContent = tr('commandWall.rotate');
        rotateGroup.appendChild(rotateLabel);

        ROTATE_OPTIONS.forEach(function (ms) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = c('scheme-btn');
            btn.dataset.rotateMs = String(ms);
            btn.textContent = ms ? tr('commandWall.rotateSec', { n: ms / 1000 }) : tr('commandWall.rotateOff');
            btn.addEventListener('click', function () {
                setRotateInterval(ms);
            });
            rotateGroup.appendChild(btn);
        });

        const pauseBtn = document.createElement('button');
        pauseBtn.type = 'button';
        pauseBtn.className = c('scheme-btn') + ' btn-rotate-pause';
        pauseBtn.setAttribute('data-i18n', 'commandWall.rotatePause');
        pauseBtn.title = tr('commandWall.rotatePauseHint');
        pauseBtn.textContent = tr('commandWall.rotatePause');
        pauseBtn.addEventListener('click', toggleRotatePaused);
        rotateGroup.appendChild(pauseBtn);
        bar.appendChild(rotateGroup);
        syncWallToolbarI18n();
    }

    function syncToolbarActive() {
        const bar = el('wall-bar');
        if (!bar) return;
        bar.querySelectorAll('[data-layout]').forEach(function (btn) {
            btn.classList.toggle('active', !spotlightActive && btn.dataset.layout === currentLayout);
        });
        bar.querySelectorAll('[data-poll-ms]').forEach(function (btn) {
            btn.classList.toggle('active', Number(btn.dataset.pollMs) === pollIntervalMs);
        });
        bar.querySelectorAll('[data-rotate-ms]').forEach(function (btn) {
            btn.classList.toggle('active', Number(btn.dataset.rotateMs) === rotateIntervalMs);
        });
        const pauseBtn = bar.querySelector('.btn-rotate-pause');
        if (pauseBtn) {
            pauseBtn.classList.toggle('active', rotatePaused);
            pauseBtn.disabled = !rotateIntervalMs;
            const pauseKey = rotatePaused ? 'commandWall.rotateResume' : 'commandWall.rotatePause';
            pauseBtn.setAttribute('data-i18n', pauseKey);
            pauseBtn.textContent = tr(pauseKey);
        }
    }

    function canEnterSpotlight(slot) {
        if (spotlightActive || !slotCamId(slot) || !isSlotVisible(slot)) return false;
        return players.has(slot) || connectingSlots.has(slot);
    }

    function enterSpotlight(slot) {
        if (!canEnterSpotlight(slot)) return;
        spotlightPrevLayout = currentLayout;
        spotlightActive = true;
        spotlightSlot = slot;
        applyWallLayout();
    }

    function exitSpotlight() {
        if (!spotlightActive) return;
        const restore = spotlightPrevLayout && LAYOUT_SCHEMES[spotlightPrevLayout]
            ? spotlightPrevLayout
            : currentLayout;
        spotlightActive = false;
        spotlightSlot = -1;
        spotlightPrevLayout = null;
        currentLayout = restore;
        applyWallLayout();
    }

    function maybeExitSpotlightIfInvalid() {
        if (!spotlightActive) return;
        if (spotlightSlot < 0 || !slotCamId(spotlightSlot)) {
            exitSpotlight();
            return;
        }
        if (!players.has(spotlightSlot) && !connectingSlots.has(spotlightSlot)) {
            exitSpotlight();
        }
    }

    function syncSpotlightUi() {
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const cell = getCell(i);
            if (!cell) continue;
            const exitBtn = cell.querySelector('.btn-spotlight-exit');
            const stage = cellQuery(cell, 'cell-stage');
            const showExit = spotlightActive && spotlightSlot === i;
            if (exitBtn) {
                exitBtn.hidden = !showExit;
                if (showExit) {
                    const label = tr('commandWall.exitSpotlight');
                    exitBtn.title = label;
                    exitBtn.setAttribute('aria-label', label);
                }
            }
            if (stage) {
                const canClick = !spotlightActive && canEnterSpotlight(i);
                stage.classList.toggle(c('cell-stage-spotlight'), canClick);
                stage.title = canClick ? tr('commandWall.clickSpotlight') : '';
            }
            if (!spotlightActive) cell.classList.remove(c('cell-spotlight'));
        }
        const wall = el('wall');
        if (wall) wall.classList.toggle(c('wall-spotlight-active'), spotlightActive);
    }

    function applyWallLayout() {
        const wall = el('wall');
        if (!wall) return;

        if (spotlightActive && spotlightSlot >= 0) {
            wall.style.gridTemplateColumns = '1fr';
            wall.style.gridTemplateRows = '1fr';
            for (let i = 0; i < MAX_SLOTS; i += 1) {
                const cell = getCell(i);
                if (!cell) continue;
                const visible = i === spotlightSlot;
                cell.hidden = !visible;
                cell.style.gridColumn = '';
                cell.style.gridRow = '';
                cell.classList.toggle(c('cell-spotlight'), visible);
            }
            syncToolbarActive();
            updateWallMeta();
            syncSpotlightUi();
            return;
        }

        const scheme = LAYOUT_SCHEMES[currentLayout] || LAYOUT_SCHEMES['16'];
        const count = scheme.count;

        wall.style.gridTemplateColumns = 'repeat(' + scheme.cols + ', 1fr)';
        wall.style.gridTemplateRows = 'repeat(' + scheme.rows + ', 1fr)';

        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const cell = getCell(i);
            if (!cell) continue;
            const visible = i < count;
            cell.hidden = !visible;
            cell.style.gridColumn = '';
            cell.style.gridRow = '';
            cell.classList.remove(c('cell-spotlight'));
            if (visible && scheme.focus && FOCUS_GRID[i]) {
                cell.style.gridColumn = FOCUS_GRID[i].col;
                cell.style.gridRow = FOCUS_GRID[i].row;
            }
        }
        syncToolbarActive();
        repackWallLayout();
        syncSpotlightUi();
        if (pollIntervalMs) runPollTick();
        if (rotateIntervalMs && !rotatePaused) runRotateTick();
    }

    function findDeckIndex(camId) {
        const want = normalizeCamId(camId);
        if (!want) return -1;
        for (let i = 0; i < deckEntries.length; i += 1) {
            if (normalizeCamId(deckEntries[i].camId) === want) return i;
        }
        return -1;
    }

    function removeFromDeck(camId) {
        const idx = findDeckIndex(camId);
        if (idx >= 0) deckEntries.splice(idx, 1);
    }

    function ensureCamStreamAlive(camId) {
        if (!camId || !socket || !deviceOnline(camId)) return;
        if (!streaming.has(camId)) {
            socket.emit('start-video', { camId: camId, mode: 'video', surface: CW_VIEWER_SURFACE });
        }
    }

    function wallEntryRank(entry) {
        const id = normalizeCamId(entry.camId);
        return {
            sos: sosAlarmCams.has(id) ? 0 : 1,
            pin: entry.pinned ? 0 : 1,
            home: entry.homeSlot != null ? entry.homeSlot : (entry.fromSlot != null ? entry.fromSlot : 999),
        };
    }

    function collectWallEntries() {
        const entries = [];
        const seen = Object.create(null);
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const s = slots[i];
            if (!s || !s.camId) continue;
            const id = normalizeCamId(s.camId);
            if (seen[id]) continue;
            seen[id] = true;
            entries.push({
                camId: s.camId,
                name: s.name,
                pinned: !!s.pinned,
                homeSlot: s.homeSlot != null ? s.homeSlot : i,
                fromSlot: i,
            });
        }
        deckEntries.forEach(function (e) {
            const id = normalizeCamId(e.camId);
            if (seen[id]) return;
            seen[id] = true;
            entries.push({
                camId: e.camId,
                name: e.name,
                pinned: !!e.pinned,
                homeSlot: e.homeSlot,
                fromSlot: null,
            });
        });
        return entries;
    }

    function parkCamOnDeck(entry) {
        if (!entry || !entry.camId) return;
        removeFromDeck(entry.camId);
        deckEntries.push({
            camId: entry.camId,
            name: entry.name || deviceName(entry.camId),
            pinned: !!entry.pinned,
            homeSlot: entry.homeSlot != null ? entry.homeSlot : entry.fromSlot,
        });
        ensureCamStreamAlive(entry.camId);
    }

    function applySlotAssignment(slot, entry) {
        const homeSlot = entry.homeSlot != null ? entry.homeSlot : slot;
        slots[slot] = {
            camId: entry.camId,
            name: entry.name || deviceName(entry.camId),
            pinned: !!entry.pinned,
            homeSlot: homeSlot,
        };
        setCellName(slot, slots[slot].name);
        showStageHint(slot, false);
        updateCellControls(slot);
        updateOfflineOverlay(slot);
        syncCwAlarmUiForSlot(slot);
        if (deviceOnline(entry.camId)) {
            ensureCamStreamAlive(entry.camId);
            if (!players.has(slot)) attachPlayer(slot);
        }
    }

    function repackWallLayout() {
        if (spotlightActive) return;
        const count = activeSlotCount();
        const entries = collectWallEntries();
        if (!entries.length) {
            deckEntries = [];
            updateWallMeta();
            return;
        }

        entries.sort(function (a, b) {
            const ra = wallEntryRank(a);
            const rb = wallEntryRank(b);
            if (ra.sos !== rb.sos) return ra.sos - rb.sos;
            if (ra.pin !== rb.pin) return ra.pin - rb.pin;
            return ra.home - rb.home;
        });

        for (let i = 0; i < MAX_SLOTS; i += 1) {
            if (players.has(i)) destroyPlayer(i);
        }

        const placed = new Array(count).fill(null);
        const used = Object.create(null);

        entries.forEach(function (entry) {
            const id = normalizeCamId(entry.camId);
            if (used[id]) return;
            const home = entry.homeSlot != null ? entry.homeSlot : entry.fromSlot;
            const preferHome = entry.pinned || sosAlarmCams.has(id);
            if (preferHome && home != null && home >= 0 && home < count && !placed[home]) {
                placed[home] = entry;
                used[id] = true;
            }
        });

        let nextSlot = 0;
        entries.forEach(function (entry) {
            const id = normalizeCamId(entry.camId);
            if (used[id]) return;
            while (nextSlot < count && placed[nextSlot]) nextSlot += 1;
            if (nextSlot >= count) return;
            placed[nextSlot] = entry;
            used[id] = true;
            nextSlot += 1;
        });

        for (let i = 0; i < MAX_SLOTS; i += 1) {
            slots[i] = null;
            if (i < count) {
                setCellName(i, 'Panel ' + (i + 1));
                setCellStatus(i, '—', '');
                showStageHint(i, true);
                showConnecting(i, false);
                updateCellControls(i);
                syncCwAlarmUiForSlot(i);
            }
        }

        deckEntries = [];
        entries.forEach(function (entry) {
            const id = normalizeCamId(entry.camId);
            if (used[id]) return;
            parkCamOnDeck(entry);
        });

        for (let i = 0; i < count; i += 1) {
            if (placed[i]) applySlotAssignment(i, placed[i]);
        }

        renderRoster();
        updateWallMeta();
        if (rotateIntervalMs && !rotatePaused && deckEntries.length) runRotateTick();
    }

    function rotateEligibleSlots() {
        const count = activeSlotCount();
        const out = [];
        for (let i = 0; i < count; i += 1) {
            const s = slots[i];
            if (s && s.pinned) continue;
            if (s && sosAlarmCams.has(normalizeCamId(s.camId))) continue;
            out.push(i);
        }
        return out;
    }

    function runRotateTick() {
        if (!rotateIntervalMs || rotatePaused || spotlightActive) return;
        const deckLen = deckEntries.length;
        if (!deckLen) return;
        const eligible = rotateEligibleSlots();
        if (!eligible.length) return;

        const plan = [];
        for (let j = 0; j < eligible.length && j < deckLen; j += 1) {
            const slot = eligible[j];
            const deckIdx = (rotateQueueIndex + j) % deckLen;
            const deckEntry = deckEntries[deckIdx];
            const current = slots[slot];
            if (!deckEntry) continue;
            if (current && normalizeCamId(current.camId) === normalizeCamId(deckEntry.camId)) continue;
            plan.push({ slot: slot, deckIdx: deckIdx, deckEntry: deckEntry, current: current || null });
        }
        if (!plan.length) {
            rotateQueueIndex = (rotateQueueIndex + 1) % deckLen;
            return;
        }

        plan.sort(function (a, b) { return b.deckIdx - a.deckIdx; });
        plan.forEach(function (p) {
            deckEntries.splice(p.deckIdx, 1);
            if (p.current && p.current.camId) {
                parkCamOnDeck({
                    camId: p.current.camId,
                    name: p.current.name,
                    pinned: false,
                    homeSlot: p.current.homeSlot != null ? p.current.homeSlot : p.slot,
                    fromSlot: p.slot,
                });
            }
            applySlotAssignment(p.slot, {
                camId: p.deckEntry.camId,
                name: p.deckEntry.name,
                pinned: false,
                homeSlot: p.deckEntry.homeSlot,
            });
        });
        rotateQueueIndex = (rotateQueueIndex + plan.length) % Math.max(deckEntries.length, 1);
        renderRoster();
        updateWallMeta();
    }

    function setRotateInterval(ms) {
        rotateIntervalMs = ms;
        rotateQueueIndex = 0;
        if (!rotateIntervalMs) rotatePaused = false;
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
        if (rotateIntervalMs > 0) {
            runRotateTick();
            rotateTimer = setInterval(runRotateTick, rotateIntervalMs);
        }
        syncToolbarActive();
        updateWallMeta();
    }

    function toggleRotatePaused() {
        if (!rotateIntervalMs) return;
        rotatePaused = !rotatePaused;
        syncToolbarActive();
        updateWallMeta();
        if (!rotatePaused) runRotateTick();
    }

    function setLayoutScheme(id) {
        if (!LAYOUT_SCHEMES[id]) return;
        if (spotlightActive) {
            spotlightActive = false;
            spotlightSlot = -1;
            spotlightPrevLayout = null;
        }
        currentLayout = id;
        applyWallLayout();
    }

    function setPollInterval(ms) {
        pollIntervalMs = ms;
        pollQueueIndex = 0;
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (pollIntervalMs > 0) {
            runPollTick();
            pollTimer = setInterval(runPollTick, pollIntervalMs);
        }
        syncToolbarActive();
        updateWallMeta();
    }

    function rosterCamList() {
        const ids = [];
        const seen = Object.create(null);
        rosterData.groups.forEach(function (g) {
            (g.members || []).forEach(function (m) {
                const id = m.deviceId;
                if (!id || seen[id]) return;
                seen[id] = true;
                ids.push(id);
            });
        });
        Object.keys(rosterData.ungrouped).sort().forEach(function (groupName) {
            rosterData.ungrouped[groupName].forEach(function (d) {
                if (!d.id || seen[d.id]) return;
                seen[d.id] = true;
                ids.push(d.id);
            });
        });
        return ids;
    }

    function pinnedCamIds() {
        const ids = Object.create(null);
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const s = slots[i];
            if (s && s.pinned && s.camId) ids[s.camId] = true;
        }
        deckEntries.forEach(function (e) {
            if (e.pinned && e.camId) ids[e.camId] = true;
        });
        return ids;
    }

    function rosterPoolForPoll() {
        const pinned = pinnedCamIds();
        return rosterCamList().filter(function (id) {
            return !pinned[id] && deviceOnline(id);
        });
    }

    function runPollTick() {
        if (!pollIntervalMs) return;
        const count = activeSlotCount();
        const pool = rosterPoolForPoll();
        const pollSlots = [];
        for (let i = 0; i < count; i += 1) {
            if (!isSlotPinned(i)) pollSlots.push(i);
        }
        if (!pollSlots.length) return;

        if (!pool.length) {
            pollSlots.forEach(function (slot) {
                if (slots[slot] && !slots[slot].pinned) clearSlotAssignment(slot, true);
            });
            return;
        }

        for (let j = 0; j < pollSlots.length; j += 1) {
            const slot = pollSlots[j];
            const camId = pool[(pollQueueIndex + j) % pool.length];
            if (slotCamId(slot) !== camId) {
                assignCamToSlot(slot, camId, deviceName(camId), true, { pinned: false, fromPoll: true });
            }
        }
        pollQueueIndex = (pollQueueIndex + 1) % pool.length;
    }

    function updateWallMeta() {
        const meta = el('wall-meta');
        if (!meta) return;
        const online = Object.keys(fleetById).filter(function (id) { return deviceOnline(id); }).length;
        const slotsN = activeSlotCount();
        if (pollIntervalMs) {
            meta.textContent = tr('commandWall.metaPoll', {
                online: online,
                slots: slotsN,
                sec: pollIntervalMs / 1000,
            });
        } else if (rotateIntervalMs && !rotatePaused) {
            meta.textContent = tr('commandWall.metaRotate', {
                online: online,
                slots: slotsN,
                sec: rotateIntervalMs / 1000,
                deck: deckEntries.length,
            });
        } else {
            meta.textContent = tr('commandWall.metaSlots', { online: online, slots: slotsN });
        }
        if (deckEntries.length && !(rotateIntervalMs && !rotatePaused)) {
            meta.textContent += ' · +' + deckEntries.length + ' deck';
        }
        if (rotatePaused && rotateIntervalMs) {
            meta.textContent += tr('commandWall.metaRotatePaused');
        }
    }

    function buildGrid() {
        const wall = el('wall');
        if (!wall) return;
        wall.innerHTML = '';
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const cell = document.createElement('div');
            cell.className = c('cell');
            cell.dataset.slot = String(i);
            cell.innerHTML =
                '<div class="' + c('cell-head') + '">' +
                '<span class="' + c('cell-name') + '">Panel ' + (i + 1) + '</span>' +
                '<span class="' + c('cell-status') + '">—</span>' +
                '<div class="' + c('cell-actions') + '">' +
                '<button type="button" class="' + c('btn-sm') + ' btn-spotlight-exit" hidden>' + gridIconSvg() + '</button>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-play" title="' + tr('video.play') + '" disabled>▶</button>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-stop" title="' + tr('video.stop') + '" disabled>■</button>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-audio" title="' + tr('audio.panelMutedHint') + '" disabled>🔇</button>' +
                '</div></div>' +
                '<div class="' + c('cell-stage') + '">' +
                '<span class="' + c('cell-drop-hint') + '">Drop device here</span>' +
                '<span class="' + c('cell-empty') + '" hidden>' + tr('video.stoppedShort') + '</span>' +
                '<div class="' + c('cell-streaming-label') + '" hidden>Connecting…</div>' +
                '<div class="' + c('cell-offline-overlay') + '" hidden>OFFLINE</div>' +
                '</div>';
            wall.appendChild(cell);
            bindCellDrop(cell, i);
            bindCellControls(cell, i);
            bindCellSpotlight(cell, i);
        }
        applyWallLayout();
    }

    function getCell(slot) {
        return document.querySelector('.' + c('cell') + '[data-slot="' + slot + '"]');
    }

    function cellQuery(cell, cls) {
        return cell.querySelector('.' + c(cls));
    }

    function setCellStatus(slot, text, cls) {
        const cell = getCell(slot);
        if (!cell) return;
        const st = cellQuery(cell, 'cell-status');
        if (st) {
            st.textContent = text;
            st.className = c('cell-status') + (cls ? ' ' + cls : '');
        }
    }

    function setCellName(slot, name) {
        const cell = getCell(slot);
        if (!cell) return;
        const nm = cellQuery(cell, 'cell-name');
        if (nm) nm.textContent = name || tr('commandWall.panel', { n: slot + 1 });
    }

    function isSlotVideoBusy(slot) {
        const camId = slotCamId(slot);
        if (!camId) return false;
        if (players.has(slot) || connectingSlots.has(slot)) return true;
        return streaming.has(camId);
    }

    function updateCellControls(slot) {
        const cell = getCell(slot);
        if (!cell) return;
        const camId = slotCamId(slot);
        const live = players.has(slot);
        const busy = isSlotVideoBusy(slot);
        const online = camId && deviceOnline(camId);
        const playBtn = cell.querySelector('.btn-play');
        const stopBtn = cell.querySelector('.btn-stop');
        const audioBtn = cell.querySelector('.btn-audio');
        const commMode = !!(camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId));
        if (playBtn) playBtn.disabled = !camId || (busy && online);
        if (stopBtn) stopBtn.disabled = !camId || (!busy && !commMode);
        if (stopBtn && commMode) {
            stopBtn.title = tr('commandWall.pttCommDismiss');
        } else if (stopBtn) {
            stopBtn.title = tr('video.stop');
        }
        if (audioBtn) {
            audioBtn.disabled = !camId || !live || !online;
            const muted = isSlotMuted(slot);
            audioBtn.textContent = muted ? '🔇' : '🔊';
            audioBtn.title = muted ? 'Listen to this panel' : 'Mute this panel';
            audioBtn.classList.toggle('listening', !muted && live);
        }
        cell.classList.toggle('has-cam', !!camId);
        const overlay = cellQuery(cell, 'cell-offline-overlay');
        if (overlay) overlay.hidden = !(camId && !online);
        syncSpotlightUi();
        maybeExitSpotlightIfInvalid();
    }

    function showStageHint(slot, show) {
        const cell = getCell(slot);
        if (!cell) return;
        const hint = cellQuery(cell, 'cell-drop-hint');
        const empty = cellQuery(cell, 'cell-empty');
        if (hint) hint.hidden = !show;
        if (empty) empty.hidden = true;
    }

    /** Stop with keepAssignment — device still assigned; do not show empty drop zone. */
    function showStageStopped(slot, show) {
        const cell = getCell(slot);
        if (!cell) return;
        const hint = cellQuery(cell, 'cell-drop-hint');
        const empty = cellQuery(cell, 'cell-empty');
        if (hint) hint.hidden = true;
        if (empty) {
            empty.hidden = !show;
            if (show) {
                empty.textContent = tr('video.stoppedShort') + ' — ' + tr('video.play');
            }
        }
    }

    function showConnecting(slot, show) {
        const cell = getCell(slot);
        if (!cell) return;
        const lab = cellQuery(cell, 'cell-streaming-label');
        if (lab) lab.hidden = !show;
    }

    function isSlotMuted(slot) {
        if (!slotMuted.has(slot)) return true;
        return slotMuted.get(slot);
    }

    function setSlotMuted(slot, muted) {
        slotMuted.set(slot, muted);
        if (!muted) {
            for (let i = 0; i < MAX_SLOTS; i += 1) {
                if (i !== slot) slotMuted.set(i, true);
            }
            audioFocusSlot = slot;
            focusAudioForSlot(slot);
        } else if (audioFocusSlot === slot) {
            audioFocusSlot = null;
        }
        syncAudioGain();
        updateCellControls(slot);
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            if (i !== slot) updateCellControls(i);
        }
    }

    function toggleSlotAudio(slot) {
        setSlotMuted(slot, !isSlotMuted(slot));
    }

    function focusAudioForSlot(slot) {
        const camId = slotCamId(slot);
        if (!camId || !socket) return;
        socket.emit('audio-focus', { camId: camId });
        ensurePcmAudio();
    }

    function ensurePcmAudio() {
        if (pcmAudio) {
            syncAudioGain();
            return;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx({ sampleRate: 8000 });
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        const ws = new WebSocket(audioWsUrl());
        ws.binaryType = 'arraybuffer';
        const state = { ctx: ctx, ws: ws, gain: gain, stopped: false, nextTime: 0, started: false };
        pcmAudio = state;
        syncAudioGain();
        ws.onopen = function () {
            if (ctx.state === 'suspended') ctx.resume();
            syncAudioGain();
        };
        ws.onmessage = function (ev) {
            if (state.stopped || !ev.data) return;
            const int16 = new Int16Array(ev.data);
            if (!int16.length) return;
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
            }
            const buf = ctx.createBuffer(1, float32.length, 8000);
            buf.getChannelData(0).set(float32);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(gain);
            if (!state.started) {
                state.nextTime = ctx.currentTime + 0.05;
                state.started = true;
            }
            const t = Math.max(ctx.currentTime, state.nextTime);
            src.start(t);
            state.nextTime = t + buf.duration;
        };
        ws.onclose = function () {
            if (!state.stopped) pcmAudio = null;
        };
    }

    function syncAudioGain() {
        if (!pcmAudio || !pcmAudio.gain) return;
        let listen = false;
        if (audioFocusSlot != null && !isSlotMuted(audioFocusSlot) && players.has(audioFocusSlot)) {
            listen = deviceOnline(slotCamId(audioFocusSlot));
        }
        pcmAudio.gain.gain.value = listen ? 1 : 0;
    }

    function stopPcmIfIdle() {
        if (players.size > 0) return;
        if (!pcmAudio) return;
        pcmAudio.stopped = true;
        try { pcmAudio.ws.close(); } catch (_) { /* ignore */ }
        try { pcmAudio.ctx.close(); } catch (_) { /* ignore */ }
        pcmAudio = null;
        audioFocusSlot = null;
    }

    function destroyPlayer(slot) {
        connectingSlots.delete(slot);
        const p = players.get(slot);
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players.delete(slot);
        }
        const cell = getCell(slot);
        if (cell) {
            cell.classList.remove(c('cell-has-live'));
            const stage = cellQuery(cell, 'cell-stage');
            if (stage) stage.querySelectorAll('canvas').forEach(function (cnv) { cnv.remove(); });
        }
        stopPcmIfIdle();
    }

    function normalizeCamId(camId) {
        return String(camId || '').trim();
    }

    function findSlotByCamId(camId) {
        const want = normalizeCamId(camId);
        if (!want) return -1;
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            if (normalizeCamId(slotCamId(i)) === want) return i;
        }
        return -1;
    }

    /** True when this cam is live or connecting on Command Wall (embedded or popout). */
    function commandWallHasLiveForCam(camId) {
        if (!camId) return false;
        const id = normalizeCamId(camId);
        if (findDeckIndex(id) >= 0 && streaming.has(id)) return true;
        for (let slot = 0; slot < MAX_SLOTS; slot += 1) {
            if (normalizeCamId(slotCamId(slot)) !== id) continue;
            if (players.has(slot)) return true;
            if (streaming.has(id)) return true;
            const cell = getCell(slot);
            if (!cell) return true;
            const st = cellQuery(cell, 'cell-status');
            const label = (st && st.textContent) || '';
            if (label === '—' || label === 'Idle' || label === 'Stopped' || label === 'Offline') continue;
            return true;
        }
        return false;
    }

    function commandWallHasActiveLivePlayerForCam(camId) {
        if (!camId) return false;
        const id = normalizeCamId(camId);
        if (findDeckIndex(id) >= 0 && streaming.has(id)) return true;
        for (let slot = 0; slot < MAX_SLOTS; slot += 1) {
            if (normalizeCamId(slotCamId(slot)) !== id) continue;
            return players.has(slot) || streaming.has(id);
        }
        return false;
    }

    /** Embedded CW live/connecting slots for Operations awareness ticker. */
    function getLiveSlotSummary() {
        if (!EMBEDDED) return [];
        const out = [];
        const seen = Object.create(null);
        const limit = activeSlotCount();
        for (let slot = 0; slot < limit; slot++) {
            const camId = slotCamId(slot);
            if (!camId) continue;
            const id = normalizeCamId(camId);
            if (seen[id]) continue;
            if (!commandWallHasLiveForCam(camId)) continue;
            seen[id] = true;
            const decoded = players.has(slot);
            out.push({
                camId: id,
                name: deviceName(camId),
                slot: slot,
                decoded: decoded,
                connecting: !decoded && isSlotVideoBusy(slot),
            });
        }
        return out;
    }

    function clearPttLingerForCwCam(camId) {
        if (!camId) return;
        if (global.PttRx && PttRx.clearLingerForCam) PttRx.clearLingerForCam(camId);
        else if (global.PttRx && PttRx.refreshBanner) PttRx.refreshBanner();
    }

    function clearPttForCwLive(camId) {
        if (!camId) return;
        if (pttCommCamId && normalizeCamId(pttCommCamId) === normalizeCamId(camId)) {
            clearCwPttComm();
        }
        if (global.PttRx && PttRx.suppressLingerForLive) PttRx.suppressLingerForLive(camId);
        else clearPttLingerForCwCam(camId);
    }

    function findFirstEmptyVisibleSlot() {
        const count = activeSlotCount();
        for (let i = 0; i < count; i += 1) {
            if (!slots[i]) return i;
        }
        return -1;
    }

    function ensureCwCellPttComm(cell) {
        let comm = cellQuery(cell, 'cell-ptt-comm');
        if (!comm) {
            const stage = cellQuery(cell, 'cell-stage');
            if (!stage) return null;
            comm = document.createElement('div');
            comm.className = c('cell-ptt-comm');
            comm.hidden = true;
            comm.innerHTML =
                '<div class="' + c('cell-ptt-comm-head') + '">' +
                '<div class="' + c('cell-ptt-comm-title') + '">' + tr('ptt.commTitle') + '</div>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-ptt-comm-dismiss" data-i18n="commandWall.pttCommDismiss" title="' + escHtml(tr('commandWall.pttCommDismiss')) + '">✕</button>' +
                '</div>' +
                '<div class="' + c('cell-ptt-comm-name') + '"></div>' +
                '<div class="' + c('cell-ptt-comm-status') + '"></div>' +
                '<button type="button" class="' + c('cell-ptt-hold-btn') + '" title="' + escHtml(tr('ptt.holdTalk')) + '">🎙 ' + escHtml(tr('ptt.holdTalk')) + '</button>' +
                '<div class="' + c('cell-ptt-comm-hint') + '">' + tr('ptt.commHintCw') + '</div>';
            stage.appendChild(comm);
            const holdBtn = comm.querySelector('.' + c('cell-ptt-hold-btn'));
            if (holdBtn && global.VideoWall && VideoWall.bindPttHoldButton) {
                VideoWall.bindPttHoldButton(holdBtn, function () {
                    const slot = parseInt(cell.dataset.slot, 10);
                    return slotCamId(slot);
                }, { forceOneToOne: true });
            }
        }
        wireCwCommDismiss(comm);
        return comm;
    }

    function wireCwCommDismiss(comm) {
        if (!comm || comm.dataset.dismissWired) return;
        let dismissBtn = comm.querySelector('.btn-ptt-comm-dismiss');
        if (!dismissBtn) {
            const title = comm.querySelector('.' + c('cell-ptt-comm-title'));
            dismissBtn = document.createElement('button');
            dismissBtn.type = 'button';
            dismissBtn.className = c('btn-sm') + ' btn-ptt-comm-dismiss';
            dismissBtn.setAttribute('data-i18n', 'commandWall.pttCommDismiss');
            dismissBtn.textContent = '✕';
            if (title && title.parentElement === comm) {
                const head = document.createElement('div');
                head.className = c('cell-ptt-comm-head');
                comm.insertBefore(head, title);
                head.appendChild(title);
                head.appendChild(dismissBtn);
            } else if (title && title.parentElement) {
                title.parentElement.appendChild(dismissBtn);
            } else {
                comm.insertBefore(dismissBtn, comm.firstChild);
            }
        }
        dismissBtn.title = tr('commandWall.pttCommDismiss');
        dismissBtn.setAttribute('aria-label', tr('commandWall.pttCommDismiss'));
        dismissBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            clearCwPttComm();
        });
        comm.dataset.dismissWired = '1';
    }

    function syncCwPttCommForSlot(slot) {
        const cell = getCell(slot);
        if (!cell) return;
        const camId = slotCamId(slot);
        const comm = ensureCwCellPttComm(cell);
        const commMode = !!(camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId));
        cell.classList.toggle(c('cell-ptt-comm-mode'), commMode);
        if (!comm) return;
        if (!commMode) {
            comm.hidden = true;
            return;
        }
        comm.hidden = false;
        const rxLive = global.PttRx && PttRx.isRxActive && PttRx.isRxActive(camId);
        const rxLinger = global.PttRx && PttRx.isLingerActive && PttRx.isLingerActive(camId);
        const nameEl = comm.querySelector('.' + c('cell-ptt-comm-name'));
        if (nameEl) nameEl.textContent = deviceName(camId);
        const statusEl = comm.querySelector('.' + c('cell-ptt-comm-status'));
        if (statusEl) {
            statusEl.textContent = rxLive
                ? tr('ptt.commReceiving')
                : (rxLinger ? tr('ptt.commLinger') : tr('ptt.commReply'));
        }
        const holdBtn = comm.querySelector('.' + c('cell-ptt-hold-btn'));
        if (holdBtn && global.VideoWall && VideoWall.isPttReadyForCam) {
            const ready = VideoWall.isPttReadyForCam(camId);
            holdBtn.disabled = !ready;
            holdBtn.hidden = !ready;
        }
        cell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function syncCwPttCommAll() {
        const count = activeSlotCount();
        for (let i = 0; i < count; i += 1) syncCwPttCommForSlot(i);
    }

    function clearCwPttComm() {
        pttCommCamId = null;
        syncCwPttCommAll();
    }

    function openPttCommForCam(camId) {
        camId = normalizeCamId(camId);
        if (!camId) return;
        if (pttCommCamId && normalizeCamId(pttCommCamId) === camId) {
            clearCwPttComm();
            return;
        }
        if (EMBEDDED) showCwPanel('live');
        pttCommCamId = camId;
        let slot = findSlotByCamId(camId);
        if (slot < 0) {
            slot = findFirstEmptyVisibleSlot();
            if (slot >= 0) {
                assignCamToSlot(slot, camId, deviceName(camId), false, { pinned: false });
            }
        }
        if (slot < 0 && global.selectFleetDevice) {
            pttCommCamId = null;
            global.selectFleetDevice(camId, { skipVideo: true, pttCommPin: true });
            return;
        }
        syncCwPttCommAll();
    }

    function onCwPttRxState(data) {
        if (!data || !data.camId) return;
        syncCwPttCommAll();
    }

    function onCwPttRxLinger(data) {
        if (!data || !data.camId) return;
        syncCwPttCommAll();
    }

    function syncCwAlarmUiForSlot(slot) {
        const cell = getCell(slot);
        if (!cell) return;
        const camId = slotCamId(slot);
        const alarm = !!(camId && sosAlarmCams.has(normalizeCamId(camId)));
        cell.classList.toggle('alarm', alarm);
    }

    function syncAllCwAlarmUi() {
        for (let i = 0; i < MAX_SLOTS; i += 1) syncCwAlarmUiForSlot(i);
    }

    function applyCwSosAlarm(camId) {
        const id = normalizeCamId(camId);
        if (!id) return;
        sosAlarmCams.add(id);
        syncAllCwAlarmUi();
    }

    function clearCwSosAlarm(camId) {
        const id = normalizeCamId(camId);
        if (!id) return;
        sosAlarmCams.delete(id);
        syncAllCwAlarmUi();
    }

    function onCwSosAlarm(data) {
        if (!data || !data.cameraId) return;
        applyCwSosAlarm(data.cameraId);
    }

    function onCwSosAcknowledged(data) {
        if (!data || !data.cameraId) return;
        clearCwSosAlarm(data.cameraId);
    }

    function clearSlotAssignment(slot, stopStream) {
        const camId = slotCamId(slot);
        if (stopStream !== false) {
            stopSlot(slot, true);
        } else if (players.has(slot)) {
            destroyPlayer(slot);
        }
        slots[slot] = null;
        if (camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId)) {
            pttCommCamId = null;
        }
        setCellName(slot, 'Panel ' + (slot + 1));
        setCellStatus(slot, '—', '');
        showStageHint(slot, true);
        showConnecting(slot, false);
        updateCellControls(slot);
        syncCwAlarmUiForSlot(slot);
        renderRoster();
    }

    function assignCamToSlot(slot, camId, name, autoStart, opts) {
        opts = opts || {};
        if (!camId || !isSlotVisible(slot)) return;
        removeFromDeck(camId);
        const prevSlot = findSlotByCamId(camId);
        if (prevSlot >= 0 && prevSlot !== slot) {
            clearSlotAssignment(prevSlot, false);
        }
        if (slots[slot] && slots[slot].camId && slots[slot].camId !== camId) {
            const displaced = slots[slot];
            parkCamOnDeck({
                camId: displaced.camId,
                name: displaced.name,
                pinned: displaced.pinned,
                homeSlot: displaced.homeSlot != null ? displaced.homeSlot : slot,
                fromSlot: slot,
            });
            clearSlotAssignment(slot, false);
        }
        const pinned = opts.fromPoll ? false : opts.pinned !== false;
        const homeSlot = pinned
            ? (opts.homeSlot != null ? opts.homeSlot : slot)
            : (slots[slot] && slots[slot].homeSlot != null ? slots[slot].homeSlot : slot);
        slots[slot] = { camId: camId, name: name || deviceName(camId), pinned: pinned, homeSlot: homeSlot };
        setCellName(slot, slots[slot].name);
        showStageHint(slot, false);
        showStageStopped(slot, false);
        if (autoStart !== false) clearPttForCwLive(camId);
        updateCellControls(slot);
        updateOfflineOverlay(slot);
        renderRoster();
        if (autoStart !== false && deviceOnline(camId) && !players.has(slot)) {
            if (streaming.has(camId)) attachPlayer(slot);
            else startSlot(slot);
        }
        syncCwAlarmUiForSlot(slot);
    }

    function attachPlayer(slot) {
        const camId = slotCamId(slot);
        const cell = getCell(slot);
        if (!cell || !camId || !isSlotVisible(slot)) return;
        const stage = cellQuery(cell, 'cell-stage');
        if (!stage) return;
        destroyPlayer(slot);
        const emptyEl = cellQuery(cell, 'cell-empty');
        if (emptyEl) emptyEl.hidden = true;
        connectingSlots.add(slot);
        showConnecting(slot, true);
        setCellStatus(slot, 'Connecting…', '');
        const canvas = document.createElement('canvas');
        stage.appendChild(canvas);
        try {
            const player = new JSMpeg.Player(videoWsUrl(camId), {
                canvas: canvas,
                audio: false,
                pauseWhenHidden: false,
                disableGl: true,
                onVideoDecode: function () {
                    connectingSlots.delete(slot);
                    cell.classList.add(c('cell-has-live'));
                    showConnecting(slot, false);
                    setCellStatus(slot, 'Live', 'live');
                    updateCellControls(slot);
                    clearPttForCwLive(camId);
                },
            });
            players.set(slot, player);
            updateCellControls(slot);
        } catch (err) {
            connectingSlots.delete(slot);
            showConnecting(slot, false);
            setCellStatus(slot, 'Error', '');
            if (emptyEl) {
                emptyEl.hidden = false;
                emptyEl.textContent = err.message || tr('video.playerError');
            }
            updateCellControls(slot);
        }
    }

    function getMatrixSlotCount() {
        return activeSlotCount();
    }

    function getMatrixSlotInfo(slotIndex) {
        const camId = slotCamId(slotIndex);
        const cell = getCell(slotIndex);
        const statusEl = cell ? cellQuery(cell, 'cell-status') : null;
        return {
            slotIndex: slotIndex,
            panelNum: slotIndex + 1,
            camId: camId || '',
            label: camId ? deviceName(camId) : '',
            status: statusEl ? statusEl.textContent : '',
            hasLive: players.has(slotIndex),
            audioMuted: isSlotMuted(slotIndex),
        };
    }

    function getMatrixSlotCanvas(slotIndex) {
        const cell = getCell(slotIndex);
        if (!cell) return null;
        const stage = cellQuery(cell, 'cell-stage');
        if (!stage) return null;
        const canvas = stage.querySelector('canvas');
        if (canvas && canvas.width > 8 && canvas.height > 8) return canvas;
        return null;
    }

    function playMatrixSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;
        startSlot(slotIndex);
        return true;
    }

    function stopMatrixSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;
        stopSlot(slotIndex, true);
        return true;
    }

    function toggleMatrixSlotAudio(slotIndex) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;
        toggleSlotAudio(slotIndex);
        return true;
    }

    function startSlot(slot) {
        if (!isSlotVisible(slot)) return;
        const camId = slotCamId(slot);
        if (!camId) return;
        showStageStopped(slot, false);
        showStageHint(slot, false);
        if (!deviceOnline(camId)) {
            updateOfflineOverlay(slot);
            setCellStatus(slot, 'Offline', '');
            updateCellControls(slot);
            return;
        }
        if (players.has(slot)) return;
        clearPttForCwLive(camId);
        if (socket && !streaming.has(camId)) {
            socket.emit('start-video', { camId: camId, mode: 'video', surface: CW_VIEWER_SURFACE });
        }
        attachPlayer(slot);
    }

    function stopSlot(slot, keepAssignment) {
        const camId = slotCamId(slot);
        if (camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId)) {
            clearCwPttComm();
        }
        if (camId && voiceCallCamId === camId && socket) {
            socket.emit('end-bwc-call', { camId: camId });
        }
        destroyPlayer(slot);
        showConnecting(slot, false);
        if (camId) removeFromDeck(camId);
        if (camId && socket) {
            socket.emit('stop-video', { camId: camId, surface: CW_VIEWER_SURFACE });
            streaming.delete(camId);
        }
        const cell = getCell(slot);
        if (cell) {
            const empty = cellQuery(cell, 'cell-empty');
            if (empty) empty.hidden = true;
        }
        setCellStatus(slot, keepAssignment ? 'Stopped' : '—', '');
        if (keepAssignment) showStageStopped(slot, true);
        else showStageHint(slot, true);
        updateCellControls(slot);
        if (!keepAssignment) clearSlotAssignment(slot, false);
    }

    function updateOfflineOverlay(slot) {
        const camId = slotCamId(slot);
        const cell = getCell(slot);
        if (!cell) return;
        const overlay = cellQuery(cell, 'cell-offline-overlay');
        const offline = !!(camId && !deviceOnline(camId));
        if (overlay) overlay.hidden = !offline;
        if (offline && players.has(slot)) {
            destroyPlayer(slot);
            setCellStatus(slot, 'Offline', '');
            showConnecting(slot, false);
        }
        updateCellControls(slot);
    }

    function refreshAllOnlineState() {
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            if (slots[i]) updateOfflineOverlay(i);
        }
        renderRoster();
        syncAudioGain();
        updateWallMeta();
    }

    function bindCellDrop(cell, slot) {
        cell.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            cell.classList.add('drop-target');
        });
        cell.addEventListener('dragleave', function () {
            cell.classList.remove('drop-target');
        });
        cell.addEventListener('drop', function (e) {
            e.preventDefault();
            cell.classList.remove('drop-target');
            let camId = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain');
            camId = String(camId || '').trim();
            if (!camId) return;
            const name = deviceName(camId);
            assignCamToSlot(slot, camId, name, true, { pinned: true });
        });
    }

    function syncAllCallUi() {
        for (let i = 0; i < MAX_SLOTS; i += 1) updateCellControls(i);
    }

    function onBwcCallState(data) {
        voiceCallPending = false;
        if (data && data.active && data.camId) {
            voiceCallCamId = data.camId;
            const slot = findSlotByCamId(data.camId);
            if (slot >= 0) {
                setSlotMuted(slot, false);
                focusAudioForSlot(slot);
            }
            if (window.CallMic) window.CallMic.start(data.camId);
        } else {
            if (window.CallMic) window.CallMic.stop();
            if (!data || !data.camId || voiceCallCamId === data.camId) voiceCallCamId = null;
        }
        syncAllCallUi();
        syncAudioGain();
    }

    function bindCellControls(cell, slot) {
        cell.querySelector('.btn-play').addEventListener('click', function () {
            startSlot(slot);
        });
        cell.querySelector('.btn-stop').addEventListener('click', function () {
            const camId = slotCamId(slot);
            if (camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId) && !isSlotVideoBusy(slot)) {
                clearCwPttComm();
                return;
            }
            stopSlot(slot, true);
        });
        cell.querySelector('.btn-audio').addEventListener('click', function () {
            toggleSlotAudio(slot);
        });
        const exitBtn = cell.querySelector('.btn-spotlight-exit');
        if (exitBtn) {
            exitBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                exitSpotlight();
            });
        }
    }

    function bindCellSpotlight(cell, slot) {
        const stage = cellQuery(cell, 'cell-stage');
        if (!stage) return;
        stage.addEventListener('click', function (e) {
            if (e.target.closest('button') || e.target.closest('.' + c('cell-ptt-comm'))) return;
            if (!canEnterSpotlight(slot)) return;
            enterSpotlight(slot);
        });
    }

    function bindDeviceChip(chip) {
        chip.addEventListener('dragstart', function (e) {
            const camId = chip.dataset.camId;
            if (!camId) return;
            e.dataTransfer.setData(DRAG_MIME, camId);
            e.dataTransfer.setData('text/plain', camId);
            e.dataTransfer.effectAllowed = 'copy';
        });
    }

    function renderDeviceChip(camId, name, online, inWall) {
        const chip = document.createElement('div');
        chip.className = c('device-chip') + (online ? '' : ' offline') + (inWall ? ' in-wall' : '');
        chip.draggable = true;
        chip.dataset.camId = camId;
        chip.innerHTML =
            '<span class="dot ' + (online ? 'on' : 'off') + '"></span>' +
            '<div class="' + c('device-chip-inner') + '">' +
            '<span class="name">' + escHtml(name || camId) + '</span>' +
            '<span class="id">' + escHtml(camId) + '</span>' +
            '</div>';
        bindDeviceChip(chip);
        return chip;
    }

    function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function matchesFilter(name, camId) {
        if (!rosterFilter) return true;
        const q = rosterFilter.toLowerCase();
        return (name && name.toLowerCase().indexOf(q) >= 0) || (camId && camId.toLowerCase().indexOf(q) >= 0);
    }

    function inWallCamIds() {
        const ids = {};
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const s = slots[i];
            if (s && s.camId) ids[s.camId] = true;
        }
        deckEntries.forEach(function (e) {
            if (e.camId) ids[e.camId] = true;
        });
        return ids;
    }

    function renderRoster() {
        const body = el('roster-body');
        const wallIds = inWallCamIds();
        body.innerHTML = '';
        if (!rosterData.groups.length && !rosterData.ungrouped.length) {
            body.innerHTML = '<div class="' + c('roster-empty') + '">No devices registered</div>';
            return;
        }
        rosterData.groups.forEach(function (g) {
            const members = (g.members || []).filter(function (m) {
                return m.deviceId && matchesFilter(m.nickname || deviceName(m.deviceId), m.deviceId);
            });
            if (!members.length) return;
            const onlineCount = members.filter(function (m) { return deviceOnline(m.deviceId); }).length;
            const block = document.createElement('div');
            block.className = c('group-block');
            const title = document.createElement('div');
            title.className = c('group-title');
            title.innerHTML =
                '<span class="' + c('group-dot') + '" style="background:' + escHtml(g.color || '#64748b') + '"></span>' +
                '<span>' + escHtml(g.name || 'Group') + '</span>' +
                '<span class="' + c('group-meta') + '">' + onlineCount + '/' + members.length + ' online</span>';
            block.appendChild(title);
            members.forEach(function (m) {
                const camId = m.deviceId;
                const name = m.nickname || deviceName(camId);
                block.appendChild(renderDeviceChip(camId, name, deviceOnline(camId), !!wallIds[camId]));
            });
            body.appendChild(block);
        });
        Object.keys(rosterData.ungrouped).sort().forEach(function (groupName) {
            const list = rosterData.ungrouped[groupName].filter(function (d) {
                return matchesFilter(d.name, d.id);
            });
            if (!list.length) return;
            const onlineCount = list.filter(function (d) { return d.online; }).length;
            const block = document.createElement('div');
            block.className = c('group-block');
            const title = document.createElement('div');
            title.className = c('group-title');
            title.innerHTML =
                '<span class="' + c('group-dot') + '" style="background:#64748b"></span>' +
                '<span>' + escHtml(groupName) + '</span>' +
                '<span class="' + c('group-meta') + '">' + onlineCount + '/' + list.length + ' online</span>';
            block.appendChild(title);
            list.forEach(function (d) {
                block.appendChild(renderDeviceChip(d.id, d.name, d.online, !!wallIds[d.id]));
            });
            body.appendChild(block);
        });
    }

    const rosterData = { groups: [], ungrouped: {} };

    function buildRosterModel(fleet, groupsPayload, bwcDevices) {
        fleetById = Object.create(null);
        (fleet || []).forEach(function (d) {
            if (!d || !d.id) return;
            fleetById[d.id] = {
                id: d.id,
                name: d.name || d.id,
                online: d.online === true || d.status === '1',
                mapGroup: d.mapGroup || '',
            };
        });
        const bwcById = Object.create(null);
        (bwcDevices || []).forEach(function (d) {
            if (d && d.deviceId) bwcById[d.deviceId] = d;
        });
        Object.keys(fleetById).forEach(function (id) {
            const b = bwcById[id];
            if (b) {
                if (b.operatorName) fleetById[id].name = b.operatorName;
                if (b.mapGroup) fleetById[id].mapGroup = b.mapGroup;
            }
        });
        const inDispatch = Object.create(null);
        rosterData.groups = (groupsPayload || []).map(function (g) {
            return {
                id: g.id,
                name: g.name,
                color: g.color,
                members: (g.members || []).filter(function (m) { return m.deviceId; }).map(function (m) {
                    inDispatch[m.deviceId] = true;
                    return m;
                }),
            };
        });
        rosterData.ungrouped = {};
        Object.keys(fleetById).forEach(function (id) {
            if (inDispatch[id]) return;
            const d = fleetById[id];
            const gname = d.mapGroup ? ('Map: ' + d.mapGroup) : 'Unassigned';
            if (!rosterData.ungrouped[gname]) rosterData.ungrouped[gname] = [];
            rosterData.ungrouped[gname].push(d);
        });
    }

    function fetchJsonOk(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (r.status === 401 || r.status === 403) {
                throw new Error('Sign-in required (HTTP ' + r.status + '). Close this window and open again from Control room while signed in.');
            }
            if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
            return r.json().then(function (data) {
                if (data && data.ok === false && data.error) {
                    throw new Error(String(data.error));
                }
                return data;
            });
        });
    }

    function setRosterMessage(msg) {
        const body = el('roster-body');
        if (!body) return;
        body.innerHTML = '<div class="' + c('roster-empty') + '">' + escHtml(msg) + '</div>';
    }

    function loadRoster() {
        return Promise.all([
            fetchJsonOk('/api/fleet'),
            fetchJsonOk('/api/dispatch-groups'),
            fetchJsonOk('/api/bwc-devices'),
        ]).then(function (results) {
            const fleet = (results[0] && results[0].fleet) || [];
            const groups = (results[1] && results[1].groups) || [];
            const bwc = (results[2] && results[2].devices) || [];
            buildRosterModel(fleet, groups, bwc);
            renderRoster();
            refreshAllOnlineState();
            maybeAutofillFromUrl();
            const body = el('roster-body');
            if (body && !body.children.length) {
                setRosterMessage('No devices registered');
            }
        }).catch(function (err) {
            setRosterMessage('Failed to load roster: ' + (err && err.message ? err.message : 'unknown error'));
        });
    }

    function parseLaunchParams() {
        const q = new URLSearchParams(window.location.search);
        if (q.get('autofill') !== '1') return null;
        const groups = (q.get('groups') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        const layout = q.get('layout') || '16';
        return { groups: groups, layout: layout };
    }

    function autofillWallFromGroups(groupIds, layoutId) {
        if (layoutId && LAYOUT_SCHEMES[layoutId]) setLayoutScheme(layoutId);
        const idSet = new Set(groupIds);
        const cams = [];
        const seen = Object.create(null);
        rosterData.groups.forEach(function (g) {
            if (groupIds.length && !idSet.has(g.id)) return;
            (g.members || []).forEach(function (m) {
                const id = m.deviceId;
                if (!id || seen[id] || !deviceOnline(id)) return;
                seen[id] = true;
                cams.push(id);
            });
        });
        const scheme = LAYOUT_SCHEMES[currentLayout] || LAYOUT_SCHEMES['16'];
        const max = scheme.count;
        for (let i = 0; i < Math.min(cams.length, max); i += 1) {
            assignCamToSlot(i, cams[i], deviceName(cams[i]), true, { pinned: false });
        }
    }

    function maybeAutofillFromUrl() {
        const launch = parseLaunchParams();
        if (!launch || !launch.groups.length) return;
        autofillWallFromGroups(launch.groups, launch.layout);
    }

    function clearWall() {
        if (spotlightActive) {
            spotlightActive = false;
            spotlightSlot = -1;
            spotlightPrevLayout = null;
        }
        clearCwPttComm();
        deckEntries = [];
        rotatePaused = false;
        rotateQueueIndex = 0;
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
        rotateIntervalMs = 0;
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            if (slots[i]) stopSlot(i, false);
        }
        streaming.clear();
        pollQueueIndex = 0;
        syncToolbarActive();
        renderRoster();
    }

    function ingestFleetRoster(fleet) {
        (fleet || []).forEach(function (d) {
            if (!d || !d.id) return;
            const prev = fleetById[d.id];
            fleetById[d.id] = {
                id: d.id,
                name: (prev && prev.name) || d.name || d.id,
                online: d.status === '1' || d.online === true,
                mapGroup: (prev && prev.mapGroup) || d.mapGroup || '',
            };
        });
        refreshAllOnlineState();
    }

    function showCwPanel(name) {
        const live = document.getElementById('cw-panel-live') || document.getElementById('panel-live');
        const display = document.getElementById('cw-panel-display') || document.getElementById('panel-display');
        const clearBtn = el('btn-clear');
        const popoutBtn = el('btn-popout');
        if (live) live.hidden = name !== 'live';
        if (display) display.hidden = name !== 'display';
        const navRoot = document.getElementById('app-view-command-wall') || document.body;
        navRoot.querySelectorAll('.cw-hub-nav-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-cw-panel') === name);
        });
        if (clearBtn) clearBtn.hidden = name !== 'live';
        if (popoutBtn) popoutBtn.hidden = name !== 'live';
        if (name === 'display' && global.CwDisplayRoom && CwDisplayRoom.onShow) CwDisplayRoom.onShow();
    }

    function bindCwHubNav() {
        const navRoot = document.getElementById('app-view-command-wall') || document.body;
        navRoot.querySelectorAll('.cw-hub-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showCwPanel(btn.getAttribute('data-cw-panel') || 'live');
            });
        });
    }

    function bindSocketHandlers() {
        if (!socket || socket.__commandWallHandlers) return;
        socket.__commandWallHandlers = true;
        if (global.LiveSurfaceHint && LiveSurfaceHint.bind) LiveSurfaceHint.bind(socket);
        socket.on('connect', loadRoster);
        socket.on('fleet-roster', ingestFleetRoster);
        socket.on('bwc-call-state', onBwcCallState);
        socket.on('sos-alarm', onCwSosAlarm);
        socket.on('sos-acknowledged', onCwSosAcknowledged);
        socket.on('video-stream-ready', function (data) {
            if (!data || !data.camId) return;
            if (data.surface && data.surface !== CW_VIEWER_SURFACE) return;
            streaming.add(data.camId);
            const slot = findSlotByCamId(data.camId);
            if (slot >= 0 && !players.has(slot) && slots[slot]) {
                attachPlayer(slot);
            }
        });
        socket.on('video-stream-stopped', function (data) {
            if (!data || !data.camId) return;
            streaming.delete(data.camId);
            const slot = findSlotByCamId(data.camId);
            if (slot < 0) {
                removeFromDeck(data.camId);
                renderRoster();
                updateWallMeta();
                return;
            }
            if (players.has(slot)) {
                destroyPlayer(slot);
                showConnecting(slot, false);
                const cell = getCell(slot);
                if (cell) {
                    const empty = cellQuery(cell, 'cell-empty');
                    if (empty) empty.hidden = true;
                }
                setCellStatus(slot, slots[slot] ? 'Stopped' : '—', '');
                if (slots[slot]) showStageHint(slot, true);
                updateCellControls(slot);
            } else if (slots[slot]) {
                connectingSlots.delete(slot);
                showConnecting(slot, false);
                setCellStatus(slot, 'Stopped', '');
                const cell = getCell(slot);
                if (cell) {
                    const empty = cellQuery(cell, 'cell-empty');
                    if (empty) empty.hidden = true;
                }
                showStageHint(slot, true);
                updateCellControls(slot);
            } else if (!deviceOnline(data.camId)) {
                updateOfflineOverlay(slot);
            }
        });
    }

    function startApp(sharedSocket) {
        buildWallToolbar();
        whenI18nReady(syncWallToolbarI18n);
        if (!window._cwToolbarI18nBound) {
            window._cwToolbarI18nBound = true;
            window.addEventListener('fm-i18n-changed', syncWallToolbarI18n);
        }
        buildGrid();
        // Pop-out: re-apply after paint so grid columns win (avoids one-column row list).
        try {
            requestAnimationFrame(function () { applyWallLayout(); });
        } catch (_) {
            applyWallLayout();
        }
        bindCwHubNav();
        const launchPanel = new URLSearchParams(window.location.search).get('panel');
        if (launchPanel === 'live' || launchPanel === 'display') showCwPanel(launchPanel);

        // Roster FIRST — must not depend on socket / optional globals (pop-out was stuck on Loading).
        loadRoster();
        setTimeout(function () {
            const body = el('roster-body');
            const stuck = body && /Loading/i.test(body.textContent || '');
            if (stuck) loadRoster();
        }, 1500);
        setInterval(loadRoster, 45000);

        try {
            if (global.CwDisplayRoom && CwDisplayRoom.bindUi) CwDisplayRoom.bindUi();
        } catch (_) { /* ignore */ }

        try {
            const ownsSocket = !sharedSocket;
            if (sharedSocket) {
                socket = sharedSocket;
            } else if (typeof io === 'function') {
                socket = io({ withCredentials: true });
            } else {
                socket = null;
            }
            if (ownsSocket && socket && window.CallMic && CallMic.bindSocket) {
                CallMic.bindSocket(socket);
            }
            if (socket) bindSocketHandlers();
        } catch (err) {
            try { console.warn('[command-wall] socket init skipped', err); } catch (_) { /* ignore */ }
        }

        const clearBtn = el('btn-clear');
        if (clearBtn) clearBtn.addEventListener('click', clearWall);
        const popoutBtn = el('btn-popout');
        if (popoutBtn) popoutBtn.addEventListener('click', openCommandWallPopout);
        const searchEl = el('roster-search');
        if (searchEl) searchEl.addEventListener('input', function (e) {
            rosterFilter = String(e.target.value || '').trim();
            renderRoster();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && pttCommCamId) {
                e.preventDefault();
                clearCwPttComm();
                return;
            }
            if (e.key === 'Escape' && spotlightActive) {
                e.preventDefault();
                exitSpotlight();
            }
        });
    }

    const commandWallApi = {
        init: function (sharedSocket) {
            if (window._commandWallStarted) return;
            window._commandWallStarted = true;
            startApp(sharedSocket);
        },
        showPanel: showCwPanel,
        hasLiveForCam: commandWallHasLiveForCam,
        hasActiveLivePlayerForCam: commandWallHasActiveLivePlayerForCam,
        getLiveSlotSummary: getLiveSlotSummary,
        openPttCommForCam: openPttCommForCam,
        onPttRxState: onCwPttRxState,
        onPttRxLinger: onCwPttRxLinger,
        clearPttComm: clearCwPttComm,
        getMatrixSlotCount: getMatrixSlotCount,
        getMatrixSlotInfo: getMatrixSlotInfo,
        getMatrixSlotCanvas: getMatrixSlotCanvas,
        playMatrixSlot: playMatrixSlot,
        stopMatrixSlot: stopMatrixSlot,
        toggleMatrixSlotAudio: toggleMatrixSlotAudio,
    };

    if (EMBEDDED) {
        window.CommandWall = commandWallApi;
    } else {
        // Server already gated this HTML. Do NOT redirect to login here — that caused
        // wall ↔ login blink loops when session JSON lagged the cookie.
        startApp();
    }
})(window);
