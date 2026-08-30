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

    /** VB-style 1+7: main 3\u00D73 top-left, 3 right column, 4 bottom row */
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
    /** WVP handoff FLV URL per cam (MOB-APPLY-COMMAND-WALL-FLV-HANDOFF-V1). */
    const wvpHandoffFlvByCam = new Map();
    const wvpHandoffSlotInflight = new Map();
    const slotMuted = new Map();
    const slots = new Array(MAX_SLOTS).fill(null);

    let socket = null;
    let pcmAudio = null;
    let audioFocusSlot = null;
    let fleetById = Object.create(null);
    let fixedCameraById = Object.create(null);
    let selectedPtzSlot = -1;
    let cwPtzJoystick = null;
    const fixedCameraOwner = 'command-wall:' + (function () {
        /* SEC-NONSIP-ID-CRYPTO-RANDOM-V1 - browser crypto, not Math.random */
        try {
            var bytes = new Uint8Array(8);
            (globalThis.crypto || window.crypto).getRandomValues(bytes);
            var hex = '';
            for (var i = 0; i < bytes.length; i++) {
                hex += bytes[i].toString(16).padStart(2, '0');
            }
            return hex;
        } catch (_) {
            return Date.now().toString(36);
        }
    })();
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
        if (global.DashboardWsUrl && typeof global.DashboardWsUrl.videoWsUrl === 'function') {
            return global.DashboardWsUrl.videoWsUrl(camId);
        }
        return 'ws://' + window.location.hostname + ':' + wsPort(1) + '/?camId=' + encodeURIComponent(camId);
    }

    function audioWsUrl() {
        if (global.DashboardWsUrl && typeof global.DashboardWsUrl.audioWsUrl === 'function') {
            return global.DashboardWsUrl.audioWsUrl();
        }
        return 'ws://' + window.location.hostname + ':' + wsPort(2);
    }

    let popoutWin = null;

    function openCommandWallPopout() {
        const features = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no';
        const wallUrl = '/command-wall.html?panel=live';
        // Unique name \u2014 avoid reusing a named window stuck on "/" or mid-reload.
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
        'alarm-rail': 'cw-alarm-rail',
        'alarm-rail-body': 'cw-alarm-rail-body',
        'alarm-rail-toggle': 'cw-alarm-rail-toggle',
        'alarm-rail-close': 'cw-alarm-rail-close',
        'alarm-toast': 'cw-alarm-toast',
        'alarm-toast-text': 'cw-alarm-toast-text',
        'alarm-toast-open': 'cw-alarm-toast-open',
        'alarm-toast-dismiss': 'cw-alarm-toast-dismiss',
        'fr-hud': 'cw-fr-hud',
        'fr-hud-tab': 'cw-fr-hud-tab',
        'fr-hud-dismiss': 'cw-fr-hud-dismiss',
        'fr-hud-nudge': 'cw-fr-hud-nudge',
        'fr-hud-menu': 'cw-fr-hud-menu',
        'anpr-hud': 'cw-anpr-hud',
        'anpr-hud-tab': 'cw-anpr-hud-tab',
        'anpr-hud-dismiss': 'cw-anpr-hud-dismiss',
        'anpr-hud-nudge': 'cw-anpr-hud-nudge',
        'anpr-hud-menu': 'cw-anpr-hud-menu',
        'toolbar-analytics': 'cw-toolbar-analytics',
        'fr-pip': 'cw-fr-pip',
        'fr-pip-stage': 'cw-fr-pip-stage',
        'fr-pip-title': 'cw-fr-pip-title',
        'fr-pip-close': 'cw-fr-pip-close',
    } : {
        wall: 'wall',
        'wall-bar': 'wall-bar',
        'roster-body': 'roster-body',
        'roster-search': 'roster-search',
        'btn-clear': 'btn-clear',
        'wall-meta': 'wall-meta',
        'alarm-rail': 'alarm-rail',
        'alarm-rail-body': 'alarm-rail-body',
        'alarm-rail-toggle': 'alarm-rail-toggle',
        'alarm-rail-close': 'alarm-rail-close',
        'alarm-toast': 'alarm-toast',
        'alarm-toast-text': 'alarm-toast-text',
        'alarm-toast-open': 'alarm-toast-open',
        'alarm-toast-dismiss': 'alarm-toast-dismiss',
        'fr-hud': 'fr-hud',
        'fr-hud-tab': 'fr-hud-tab',
        'fr-hud-dismiss': 'fr-hud-dismiss',
        'fr-hud-nudge': 'fr-hud-nudge',
        'fr-hud-menu': 'fr-hud-menu',
        'anpr-hud': 'anpr-hud',
        'anpr-hud-tab': 'anpr-hud-tab',
        'anpr-hud-dismiss': 'anpr-hud-dismiss',
        'anpr-hud-nudge': 'anpr-hud-nudge',
        'anpr-hud-menu': 'anpr-hud-menu',
        'toolbar-analytics': 'toolbar-analytics',
        'fr-pip': 'fr-pip',
        'fr-pip-stage': 'fr-pip-stage',
        'fr-pip-title': 'fr-pip-title',
        'fr-pip-close': 'fr-pip-close',
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

    function isFixedCameraId(camId) {
        return String(camId || '').indexOf('fixed:') === 0;
    }

    function fixedCameraId(camId) {
        return isFixedCameraId(camId) ? String(camId).slice(6) : '';
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
        hardReloadFixedCameraSlot(slot);
    }

    function exitSpotlight() {
        if (!spotlightActive) return;
        const slot = spotlightSlot;
        const restore = spotlightPrevLayout && LAYOUT_SCHEMES[spotlightPrevLayout]
            ? spotlightPrevLayout
            : currentLayout;
        spotlightActive = false;
        spotlightSlot = -1;
        spotlightPrevLayout = null;
        currentLayout = restore;
        applyWallLayout();
        if (slot >= 0) hardReloadFixedCameraSlot(slot);
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
            if (!players.has(slot)) attachLivePlayerForSlot(slot);
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
                setCellStatus(i, '\u2014', '');
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
            if (isAlarmBandLocked(i)) continue;
            if (i === BAND_OVERFLOW_SLOT && alarmOverflow.length) continue;
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
            meta.textContent += ' \u00B7 +' + deckEntries.length + ' deck';
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
                '<span class="' + c('cell-status') + '">\u2014</span>' +
                '<div class="' + c('cell-actions') + '">' +
                '<button type="button" class="' + c('btn-sm') + ' btn-spotlight-exit" hidden>' + gridIconSvg() + '</button>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-play" title="' + tr('video.play') + '" disabled>▶</button>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-stop" title="' + tr('video.stop') + '" disabled>■</button>' +
                '<button type="button" class="' + c('btn-sm') + ' btn-audio" title="' + tr('audio.panelMutedHint') + '" disabled>🔇</button>' +
                '</div></div>' +
                '<div class="' + c('cell-stage') + '">' +
                '<span class="' + c('cell-drop-hint') + '">Drop device here</span>' +
                '<span class="' + c('cell-empty') + '" hidden>' + tr('video.stoppedShort') + '</span>' +
                '<div class="' + c('cell-streaming-label') + '" hidden>Connecting\u2026</div>' +
                '<div class="' + c('cell-offline-overlay') + '" hidden>OFFLINE</div>' +
                '<div class="' + c('alarm-badge') + '" hidden></div>' +
                '</div>';
            wall.appendChild(cell);
            bindCellDrop(cell, i);
            bindCellControls(cell, i);
            bindCellSpotlight(cell, i);
            cell.addEventListener('click', function (event) {
                if (event.target && event.target.closest('button')) return;
                selectedPtzSlot = i;
                syncPtzPanel();
            });
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
        const fixedCamera = isFixedCameraId(camId);
        const commMode = !!(camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId));
        if (playBtn) playBtn.disabled = !camId || (busy && online);
        if (stopBtn) stopBtn.disabled = !camId || (!busy && !commMode);
        if (stopBtn && commMode) {
            stopBtn.title = tr('commandWall.pttCommDismiss');
        } else if (stopBtn) {
            stopBtn.title = tr('video.stop');
        }
        if (audioBtn) {
            audioBtn.hidden = fixedCamera;
            audioBtn.disabled = fixedCamera || !camId || !live || !online;
            const muted = isSlotMuted(slot);
            audioBtn.textContent = muted ? '🔇' : '🔊';
            audioBtn.title = muted ? 'Listen to This Panel' : 'Mute This Panel';
            audioBtn.classList.toggle('listening', !muted && live);
        }
        cell.classList.toggle('has-cam', !!camId);
        cell.classList.toggle(c('ptz-selected'), selectedPtzSlot === slot);
        const overlay = cellQuery(cell, 'cell-offline-overlay');
        if (overlay) overlay.hidden = !(camId && !online);
        syncSpotlightUi();
        maybeExitSpotlightIfInvalid();
        if (selectedPtzSlot === slot) syncPtzPanel();
    }

    function ensurePtzPanel() {
        let panel = document.getElementById(c('ptz-panel'));
        if (!panel) {
            if (!document.getElementById('cw-ptz-runtime-style')) {
                const style = document.createElement('style');
                style.id = 'cw-ptz-runtime-style';
                style.textContent =
                    '.' + c('ptz-panel') + '{flex-shrink:0;padding:10px;border-top:1px solid #334155;background:#0f172a}' +
                    '.' + c('ptz-title') + '{color:#93c5fd;font-size:10px;font-weight:800;letter-spacing:.08em}' +
                    '.' + c('ptz-camera') + '{min-height:30px;margin:5px 0 8px;color:#e2e8f0;font-size:11px;line-height:1.35}' +
                    '.' + c('ptz-pad') + '{display:grid;grid-template-columns:repeat(3,34px);grid-template-areas:". up ." "left home right" ". down .";justify-content:center;gap:4px}' +
                    '.' + c('ptz-pad') + ' [data-ptz=up]{grid-area:up}.' + c('ptz-pad') + ' [data-ptz=left]{grid-area:left}' +
                    '.' + c('ptz-pad') + ' [data-ptz=home]{grid-area:home}.' + c('ptz-pad') + ' [data-ptz=right]{grid-area:right}' +
                    '.' + c('ptz-pad') + ' [data-ptz=down]{grid-area:down}' +
                    '.' + c('ptz-pad') + ' button,.' + c('ptz-zoom') + ' button{border:1px solid #475569;border-radius:5px;background:#1e293b;color:#e2e8f0;cursor:pointer;touch-action:none}' +
                    '.' + c('ptz-pad') + ' button{width:34px;height:30px}.' + c('ptz-zoom') + '{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}' +
                    '.' + c('ptz-zoom') + ' button{height:28px;font-size:10px}.' + c('ptz-panel') + ' button:disabled{opacity:.35;cursor:not-allowed}' +
                    '.' + c('ptz-status') + '{margin-top:7px;min-height:26px;color:#64748b;font-size:9px;line-height:1.35}' +
                    '.' + c('cell') + '.' + c('ptz-selected') + '{border-color:#38bdf8;box-shadow:inset 0 0 0 1px #38bdf8}';
                document.head.appendChild(style);
            }
            const rosterBody = el('roster-body');
            if (!rosterBody || !rosterBody.parentElement) return null;
            panel = document.createElement('section');
            panel.id = c('ptz-panel');
            panel.className = c('ptz-panel');
            rosterBody.parentElement.appendChild(panel);
        }
        /* VMS-PTZ-JOYSTICK-COMMAND-WALL-V1 - shared pad; selection model unchanged */
        if (!cwPtzJoystick && global.VmsPtzJoystick && typeof global.VmsPtzJoystick.create === 'function') {
            cwPtzJoystick = global.VmsPtzJoystick.create(panel, {
                showNumpad: false,
                isFloating: false,
                classPrefix: EMBEDDED ? 'cw-' : '',
            });
        }
        return panel;
    }

    function selectedPtzCamera() {
        const camId = selectedPtzSlot >= 0 ? slotCamId(selectedPtzSlot) : null;
        return isFixedCameraId(camId) ? fixedCameraById[fixedCameraId(camId)] : null;
    }

    function syncPtzPanel() {
        ensurePtzPanel();
        if (!cwPtzJoystick) return;
        const camId = selectedPtzSlot >= 0 ? slotCamId(selectedPtzSlot) : null;
        if (!camId) {
            cwPtzJoystick.setTarget(null, { hasPtz: false, label: 'Empty' });
            return;
        }
        const camera = isFixedCameraId(camId) ? fixedCameraById[fixedCameraId(camId)] : null;
        const hasPtz = !!(camera && camera.ptzEnabled && camera.streamSource === 'onvif');
        let label = 'Camera';
        if (camera && camera.name) label = String(camera.name);
        else if (global.FleetDisplay && typeof global.FleetDisplay.friendlyDeviceName === 'function') {
            label = global.FleetDisplay.friendlyDeviceName(camId);
        } else {
            label = deviceName(camId);
        }
        const apiId = isFixedCameraId(camId) ? fixedCameraId(camId) : null;
        /* Only fixed cams are PTZ API targets; BWC/other -> dead pad */
        cwPtzJoystick.setTarget(apiId, {
            hasPtz: !!(apiId && hasPtz),
            label: label,
        });
    }

    function showStageHint(slot, show) {
        const cell = getCell(slot);
        if (!cell) return;
        const hint = cellQuery(cell, 'cell-drop-hint');
        const empty = cellQuery(cell, 'cell-empty');
        if (hint) hint.hidden = !show;
        if (empty) empty.hidden = true;
    }

    /** Stop with keepAssignment \u2014 device still assigned; do not show empty drop zone. */
    function showStageStopped(slot, show) {
        const cell = getCell(slot);
        if (!cell) return;
        const hint = cellQuery(cell, 'cell-drop-hint');
        const empty = cellQuery(cell, 'cell-empty');
        if (hint) hint.hidden = true;
        if (empty) {
            empty.hidden = !show;
            if (show) {
                empty.textContent = tr('video.stoppedShort') + ' \u2014 ' + tr('video.play');
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
        wvpHandoffSlotInflight.delete(slot);
        const p = players.get(slot);
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players.delete(slot);
        }
        const cell = getCell(slot);
        if (cell) {
            cell.classList.remove(c('cell-has-live'));
            const stage = cellQuery(cell, 'cell-stage');
            if (stage) {
                stage.querySelectorAll('canvas, video.me8-zlm-primary').forEach(function (el) { el.remove(); });
            }
        }
        stopPcmIfIdle();
    }

    function handoffPlayerAttaching(p) {
        return !!(p && (p.wvpHandoffAttaching
            || (typeof p.isHandoffAttaching === 'function' && p.isHandoffAttaching())));
    }

    function getWvpHandoffFlvUrl(camId) {
        if (!camId) return null;
        return wvpHandoffFlvByCam.get(normalizeCamId(camId)) || null;
    }

    function clearWvpHandoffFlv(camId) {
        if (!camId) return;
        wvpHandoffFlvByCam.delete(normalizeCamId(camId));
    }

    function attachWvpHandoffFlvToSlot(slot, camId, flvUrl) {
        if (typeof slot !== 'number' || !camId || !flvUrl) return false;
        camId = normalizeCamId(camId);
        flvUrl = String(flvUrl);
        if (!global.Me8LivePlayerFactory
            || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return false;
        }
        const cell = getCell(slot);
        if (!cell || !isSlotVisible(slot)) return false;
        const stage = cellQuery(cell, 'cell-stage');
        if (!stage) return false;
        const inflight = wvpHandoffSlotInflight.get(slot);
        if (inflight && inflight.camId === camId && inflight.flvUrl === flvUrl) {
            return true;
        }
        const existing = players.get(slot);
        if (existing && slotCamId(slot) === camId && handoffPlayerAttaching(existing)) {
            return true;
        }
        if (existing && slotCamId(slot) === camId && cell.classList.contains(c('cell-has-live'))
            && stage.querySelector('video.me8-zlm-primary')) {
            return true;
        }
        destroyPlayer(slot);
        const emptyEl = cellQuery(cell, 'cell-empty');
        if (emptyEl) emptyEl.hidden = true;
        connectingSlots.add(slot);
        showConnecting(slot, true);
        setCellStatus(slot, 'Connecting\u2026', '');
        wvpHandoffSlotInflight.set(slot, { camId: camId, flvUrl: flvUrl, at: Date.now() });
        console.log('[me8-flv] cw attach once', { slot: slot, camId: camId, url: flvUrl });
        const handle = global.Me8LivePlayerFactory.attachFlvPrimary(stage, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            /* Dense mosaic -> AxiomFlvManager prefers ZLM sub-stream when grid >16 */
            gridCount: (function () {
                try {
                    var wallEl = document.getElementById('cw-wall') || document.querySelector('.cw-wall');
                    if (!wallEl) return players.size || undefined;
                    return wallEl.querySelectorAll('.cw-cell').length || players.size || undefined;
                } catch (_) {
                    return players.size || undefined;
                }
            })(),
            onProven: function () {
                wvpHandoffSlotInflight.delete(slot);
                if (normalizeCamId(slotCamId(slot)) !== camId) return;
                connectingSlots.delete(slot);
                cell.classList.add(c('cell-has-live'));
                showConnecting(slot, false);
                setCellStatus(slot, 'Live', 'live');
                updateCellControls(slot);
                clearPttForCwLive(camId);
            },
            onFail: function () {
                wvpHandoffSlotInflight.delete(slot);
                if (normalizeCamId(slotCamId(slot)) !== camId) return;
                connectingSlots.delete(slot);
                showConnecting(slot, false);
                setCellStatus(slot, 'Error', '');
                if (emptyEl) {
                    emptyEl.hidden = false;
                    emptyEl.textContent = tr('video.playerError');
                }
                updateCellControls(slot);
            },
        });
        if (!handle) {
            wvpHandoffSlotInflight.delete(slot);
            connectingSlots.delete(slot);
            console.log('[me8-flv] cw attach fail', { camId: camId, url: flvUrl, reason: 'attachFlvPrimary_null' });
            return false;
        }
        players.set(slot, handle);
        updateCellControls(slot);
        return true;
    }

    function attachWvpHandoffFlvForCam(camId, flvUrl) {
        if (!camId || !flvUrl) return;
        camId = normalizeCamId(camId);
        wvpHandoffFlvByCam.set(camId, String(flvUrl));
        const slot = findSlotByCamId(camId);
        if (slot >= 0 && slots[slot]) {
            attachWvpHandoffFlvToSlot(slot, camId, flvUrl);
        }
    }

    function attachLivePlayerForSlot(slot) {
        const camId = slotCamId(slot);
        if (!camId) return;
        const flvUrl = getWvpHandoffFlvUrl(camId);
        if (flvUrl) {
            attachWvpHandoffFlvToSlot(slot, camId, flvUrl);
            return;
        }
        attachPlayer(slot);
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
            if (label === '\u2014' || label === 'Idle' || label === 'Stopped' || label === 'Offline') continue;
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
        const rxTalking = !!(camId && global.PttRx && PttRx.isRxActive && PttRx.isRxActive(camId));
        cell.classList.toggle('ptt-incoming-alert', rxTalking);
        cell.classList.toggle(c('cell-ptt-rx'), rxTalking);
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

    /* ── WALL-ALARM-GRID-HOPPER-V1 (Band A + Panel 4 hopper) ─────────────── */
    const ALARM_ACTIVE_WINDOW_MS = 5 * 60 * 1000;
    const BAND_A_SLOTS = [0, 1, 2];
    const BAND_OVERFLOW_SLOT = 3;
    const BAND_C_START = 4;
    /** @type {Array<{rowKey:string,source:string,camId:string,alarmType:string,eventId:string,count:number,firstAt:number,lastAt:number,ended:boolean,acked:boolean,label:string}>} */
    let alarmStripRows = [];
    /** WALL-ALARM-NUDGE-SA-V1 - eventKey -> notified */
    const wallNudgeNotified = new Set();
    let alarmCoolTimer = null;
    /** Band A slot -> { camId, source } */
    const alarmBandOwners = new Map();
    /** Displaced cams waiting restore: { fromSlot, camId, name, pinned, homeSlot, parkedSlot } */
    let alarmSnapshots = [];
    /** Panel 4 hopper - SOS first, then VMS */
    let alarmOverflow = [];
    let hopperBusy = false;

    function alarmTypeLabel(type) {
        const t = String(type || 'other').toLowerCase();
        if (t === 'sos' || t === 'bwc_sos') return 'SOS';
        if (t === 'motion') return 'MOTION';
        if (t === 'tamper') return 'TAMPER';
        if (t === 'line_crossing') return 'LINE';
        if (t === 'analytics') return 'ANALYTICS';
        if (t === 'anpr') return 'ANPR';
        return String(type || 'ALARM').toUpperCase();
    }

    function isSosAlarmSource(source) {
        return String(source || '').toLowerCase() === 'bwc_sos';
    }

    function bandOwnerCamId(slot) {
        const o = alarmBandOwners.get(slot);
        if (!o) return '';
        return typeof o === 'string' ? normalizeCamId(o) : normalizeCamId(o.camId);
    }

    function bandOwnerSource(slot) {
        const o = alarmBandOwners.get(slot);
        if (!o) return '';
        return typeof o === 'string' ? '' : String(o.source || '');
    }

    function setBandOwner(slot, camId, source) {
        alarmBandOwners.set(slot, { camId: normalizeCamId(camId), source: String(source || '') });
    }

    function formatAlarmClock(ms) {
        try {
            return new Date(ms).toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            });
        } catch (_) {
            return '--:--:--';
        }
    }

    function formatAlarmDuration(firstAt, lastAt) {
        const sec = Math.max(0, Math.round((lastAt - firstAt) / 1000));
        if (sec < 60) return sec + 's';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m + 'm ' + s + 's';
    }

    function camDisplayName(camId) {
        const id = normalizeCamId(camId);
        for (let i = 0; i < slots.length; i++) {
            if (slots[i] && normalizeCamId(slots[i].camId) === id) {
                return slots[i].name || id;
            }
        }
        return id;
    }

    function isBandASlot(slot) {
        return BAND_A_SLOTS.indexOf(slot) >= 0;
    }

    function isAlarmBandLocked(slot) {
        return alarmBandOwners.has(slot);
    }

    function ensureLayoutHasBandC() {
        if (activeSlotCount() > BAND_C_START) return;
        if (LAYOUT_SCHEMES['9']) setLayoutScheme('9');
    }

    function findFreeBandCSlot() {
        ensureLayoutHasBandC();
        const n = activeSlotCount();
        for (let i = BAND_C_START; i < n; i += 1) {
            if (!slots[i] && !alarmBandOwners.has(i)) return i;
        }
        for (let i = BAND_C_START; i < n; i += 1) {
            if (!alarmBandOwners.has(i) && !(slots[i] && slots[i].pinned)) return i;
        }
        return -1;
    }

    function findFreeBandASlot() {
        for (let i = 0; i < BAND_A_SLOTS.length; i += 1) {
            const s = BAND_A_SLOTS[i];
            if (!alarmBandOwners.has(s)) return s;
        }
        return -1;
    }

    /** First Band A slot owned by VMS (not SOS) - for SOS-beats-VMS. */
    function findVmsBandAVictimSlot() {
        for (let i = 0; i < BAND_A_SLOTS.length; i += 1) {
            const s = BAND_A_SLOTS[i];
            if (!alarmBandOwners.has(s)) continue;
            if (!isSosAlarmSource(bandOwnerSource(s))) return s;
        }
        return -1;
    }

    function hopperRank(entry) {
        return isSosAlarmSource(entry && entry.source) ? 0 : 1;
    }

    function sortHopper() {
        alarmOverflow.sort(function (a, b) {
            const d = hopperRank(a) - hopperRank(b);
            if (d !== 0) return d;
            return (a.lastAt || a.firstAt || 0) - (b.lastAt || b.firstAt || 0);
        });
    }

    function pushHopper(meta) {
        if (!meta || !meta.camId) return;
        const id = normalizeCamId(meta.camId);
        alarmOverflow = alarmOverflow.filter(function (o) { return normalizeCamId(o.camId) !== id; });
        alarmOverflow.push({
            camId: id,
            label: meta.label || camDisplayName(id),
            rowKey: meta.rowKey || '',
            source: meta.source || '',
            alarmType: meta.alarmType || 'alarm',
            lastAt: meta.lastAt || Date.now(),
            firstAt: meta.firstAt || Date.now(),
        });
        sortHopper();
    }

    /** Move assignment + FLV DOM nodes between slots - no destroy/reconnect. */
    function moveSlotPreserveFlv(fromSlot, toSlot) {
        if (fromSlot === toSlot || fromSlot < 0 || toSlot < 0) return false;
        const fromCell = getCell(fromSlot);
        const toCell = getCell(toSlot);
        if (!fromCell || !toCell) return false;
        const fromStage = cellQuery(fromCell, 'cell-stage');
        const toStage = cellQuery(toCell, 'cell-stage');
        if (!fromStage || !toStage) return false;

        if (slots[toSlot]) return false;

        const entry = slots[fromSlot];
        slots[toSlot] = entry;
        slots[fromSlot] = null;

        if (players.has(fromSlot)) {
            players.set(toSlot, players.get(fromSlot));
            players.delete(fromSlot);
        }
        if (connectingSlots.has(fromSlot)) {
            connectingSlots.delete(fromSlot);
            connectingSlots.add(toSlot);
        }
        if (wvpHandoffSlotInflight.has(fromSlot)) {
            wvpHandoffSlotInflight.set(toSlot, wvpHandoffSlotInflight.get(fromSlot));
            wvpHandoffSlotInflight.delete(fromSlot);
        }
        if (slotMuted.has(fromSlot)) {
            slotMuted.set(toSlot, slotMuted.get(fromSlot));
            slotMuted.delete(fromSlot);
        }
        if (audioFocusSlot === fromSlot) audioFocusSlot = toSlot;
        if (selectedPtzSlot === fromSlot) selectedPtzSlot = toSlot;

        fromStage.querySelectorAll('canvas, video.me8-zlm-primary').forEach(function (node) {
            toStage.appendChild(node);
        });

        if (fromCell.classList.contains(c('cell-has-live'))) {
            toCell.classList.add(c('cell-has-live'));
            fromCell.classList.remove(c('cell-has-live'));
        }
        ['alarm', 'alarm-sos', 'alarm-vms'].forEach(function (cls) {
            if (fromCell.classList.contains(cls)) {
                toCell.classList.add(cls);
                fromCell.classList.remove(cls);
            }
        });

        setCellName(toSlot, entry ? entry.name : ('Panel ' + (toSlot + 1)));
        setCellName(fromSlot, 'Panel ' + (fromSlot + 1));
        const fromSt = cellQuery(fromCell, 'cell-status');
        const toSt = cellQuery(toCell, 'cell-status');
        if (fromSt && toSt) {
            toSt.textContent = fromSt.textContent;
            toSt.className = fromSt.className;
            fromSt.textContent = '\u2014';
            fromSt.className = c('cell-status');
        }
        showStageHint(fromSlot, true);
        showStageHint(toSlot, false);
        showConnecting(fromSlot, false);
        updateCellControls(fromSlot);
        updateCellControls(toSlot);
        syncCwAlarmUiForSlot(fromSlot);
        syncCwAlarmUiForSlot(toSlot);
        return true;
    }

    /** Force displace slot occupant to Band C (works even when Band A alarm-owned). */
    function snapshotAndDisplaceToBandC(bandSlot, forceAlarm) {
        const entry = slots[bandSlot];
        if (!entry || !entry.camId) return true;
        if (!forceAlarm && bandOwnerCamId(bandSlot) === normalizeCamId(entry.camId)) return true;
        const parked = findFreeBandCSlot();
        if (parked < 0) {
            parkCamOnDeck({
                camId: entry.camId,
                name: entry.name,
                pinned: entry.pinned,
                homeSlot: entry.homeSlot != null ? entry.homeSlot : bandSlot,
                fromSlot: bandSlot,
            });
            alarmSnapshots.push({
                fromSlot: bandSlot,
                camId: normalizeCamId(entry.camId),
                name: entry.name,
                pinned: !!entry.pinned,
                homeSlot: entry.homeSlot != null ? entry.homeSlot : bandSlot,
                parkedSlot: -1,
            });
            clearSlotAssignment(bandSlot, false);
            return true;
        }
        alarmSnapshots.push({
            fromSlot: bandSlot,
            camId: normalizeCamId(entry.camId),
            name: entry.name,
            pinned: !!entry.pinned,
            homeSlot: entry.homeSlot != null ? entry.homeSlot : bandSlot,
            parkedSlot: parked,
        });
        return moveSlotPreserveFlv(bandSlot, parked);
    }

    function renderOverflowPanel() {
        const cell = getCell(BAND_OVERFLOW_SLOT);
        if (!cell) return;
        let box = cellQuery(cell, 'alarm-overflow');
        if (!box) {
            const stage = cellQuery(cell, 'cell-stage');
            if (!stage) return;
            box = document.createElement('div');
            box.className = c('alarm-overflow');
            stage.appendChild(box);
        }
        sortHopper();
        if (!alarmOverflow.length) {
            box.hidden = true;
            box.innerHTML = '';
            cell.classList.remove('alarm-overflow-active');
            return;
        }
        cell.classList.add('alarm-overflow-active');
        box.hidden = false;
        box.innerHTML = '<div class="' + c('alarm-overflow-title') + '">'
            + escHtml(tr('commandWall.alarmsOverflowTitle')) + ' (' + alarmOverflow.length + ')</div>'
            + alarmOverflow.map(function (o) {
                return '<div class="' + c('alarm-overflow-row') + '">'
                    + '<span class="' + c('alarm-overflow-badge') + '">['
                    + escHtml(alarmTypeLabel(o.alarmType || (isSosAlarmSource(o.source) ? 'sos' : 'motion'))) + ']</span> '
                    + escHtml(o.label || o.camId)
                    + '</div>';
            }).join('');
    }

    function refreshPopoutAlarmFlash() {
        if (EMBEDDED) return;
        const wall = el('wall');
        if (!wall) return;
        let flash = document.getElementById('alarm-popout-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.id = 'alarm-popout-flash';
            flash.className = 'alarm-popout-flash';
            flash.hidden = true;
            wall.style.position = wall.style.position || 'relative';
            wall.appendChild(flash);
        }
        const live = liveAlarmRows();
        if (!live.length) {
            flash.hidden = true;
            flash.textContent = '';
            flash.classList.remove('is-sos');
            return;
        }
        const top = live[0];
        const isSos = top.source === 'bwc_sos';
        flash.classList.toggle('is-sos', isSos);
        flash.textContent = isSos
            ? ('SOS · ' + (top.label || top.camId))
            : (alarmTypeLabel(top.alarmType) + ' · ' + (top.label || top.camId));
        flash.hidden = false;
    }

    function syncBandALockUi() {
        BAND_A_SLOTS.forEach(function (slot) {
            const cell = getCell(slot);
            if (!cell) return;
            cell.classList.toggle('alarm-band-locked', isAlarmBandLocked(slot));
        });
        renderOverflowPanel();
        refreshPopoutAlarmFlash();
    }

    /**
     * Demote a VMS Band A occupant to hopper + Band C (SOS-beats-VMS).
     * Returns freed slot index or -1.
     */
    function demoteVmsBandAToHopper(slot) {
        if (slot < 0 || !alarmBandOwners.has(slot)) return -1;
        if (isSosAlarmSource(bandOwnerSource(slot))) return -1;
        const vmsCam = bandOwnerCamId(slot);
        const src = bandOwnerSource(slot);
        pushHopper({
            camId: vmsCam,
            label: camDisplayName(vmsCam),
            source: src || 'vms_motion',
            alarmType: 'motion',
        });
        alarmBandOwners.delete(slot);
        snapshotAndDisplaceToBandC(slot, true);
        return slot;
    }

    /**
     * Embedded Wall: place alarm into Band A. SOS may displace VMS.
     * Full -> Panel 4 hopper (sorted). Popout = flash only.
     */
    function promoteAlarmCamToBandA(camId, meta) {
        const id = normalizeCamId(camId);
        if (!id) return false;
        meta = meta || {};
        refreshPopoutAlarmFlash();
        if (!EMBEDDED) return false;

        for (let i = 0; i < BAND_A_SLOTS.length; i += 1) {
            if (bandOwnerCamId(BAND_A_SLOTS[i]) === id) {
                syncBandALockUi();
                return true;
            }
        }

        alarmOverflow = alarmOverflow.filter(function (o) { return normalizeCamId(o.camId) !== id; });

        let target = findFreeBandASlot();
        if (target < 0 && isSosAlarmSource(meta.source)) {
            const victim = findVmsBandAVictimSlot();
            if (victim >= 0) target = demoteVmsBandAToHopper(victim);
        }
        if (target < 0) {
            pushHopper(meta);
            syncBandALockUi();
            return false;
        }

        if (slots[target] && normalizeCamId(slots[target].camId) !== id) {
            if (!snapshotAndDisplaceToBandC(target, !!alarmBandOwners.has(target))) {
                pushHopper(meta);
                syncBandALockUi();
                return false;
            }
        }

        const existing = findSlotByCamId(id);
        if (existing >= 0 && existing !== target) {
            if (slots[target]) snapshotAndDisplaceToBandC(target, true);
            if (!slots[target]) {
                moveSlotPreserveFlv(existing, target);
            }
        } else if (existing < 0) {
            assignCamToSlot(target, id, meta.label || deviceName(id), true, {
                pinned: true,
                alarmPromote: true,
            });
        }

        setBandOwner(target, id, meta.source || '');
        syncBandALockUi();
        syncAllCwAlarmUi();
        return true;
    }

    function restoreSnapshotForSlot(fromSlot) {
        const idx = alarmSnapshots.findIndex(function (s) { return s.fromSlot === fromSlot; });
        if (idx < 0) return;
        const snap = alarmSnapshots[idx];
        alarmSnapshots.splice(idx, 1);
        if (!snap.camId) return;
        if (slots[fromSlot] && normalizeCamId(slots[fromSlot].camId) === snap.camId) return;

        if (slots[fromSlot]) {
            clearSlotAssignment(fromSlot, true);
        }

        const parked = snap.parkedSlot;
        if (parked >= 0 && slots[parked] && normalizeCamId(slots[parked].camId) === snap.camId) {
            moveSlotPreserveFlv(parked, fromSlot);
            return;
        }
        const elsewhere = findSlotByCamId(snap.camId);
        if (elsewhere >= 0) {
            moveSlotPreserveFlv(elsewhere, fromSlot);
            return;
        }
        assignCamToSlot(fromSlot, snap.camId, snap.name, true, {
            pinned: snap.pinned,
            homeSlot: snap.homeSlot,
            alarmPromote: true,
        });
    }

    /**
     * Serializer: fill empty Band A from hopper (SOS first).
     * Re-entrancy guarded - no parallel promotes.
     */
    function promoteFromHopper() {
        if (hopperBusy || !EMBEDDED) return;
        hopperBusy = true;
        try {
            sortHopper();
            let guard = 0;
            while (alarmOverflow.length && guard < 8) {
                guard += 1;
                let target = findFreeBandASlot();
                if (target < 0) {
                    const top = alarmOverflow[0];
                    if (top && isSosAlarmSource(top.source)) {
                        const victim = findVmsBandAVictimSlot();
                        if (victim >= 0) target = demoteVmsBandAToHopper(victim);
                    }
                }
                if (target < 0) break;
                /* Slot empty of alarm owner - if restore filled a watch cam, displace for hopper feed */
                if (slots[target] && !alarmBandOwners.has(target)) {
                    snapshotAndDisplaceToBandC(target, true);
                }
                if (alarmBandOwners.has(target)) break;
                const next = alarmOverflow.shift();
                if (!next) break;
                const ok = promoteAlarmCamToBandA(next.camId, next);
                if (!ok && !alarmOverflow.some(function (o) { return normalizeCamId(o.camId) === normalizeCamId(next.camId); })) {
                    pushHopper(next);
                    break;
                }
            }
        } finally {
            hopperBusy = false;
            syncBandALockUi();
        }
    }

    /**
     * Release -> Restore snapshot -> THEN hopper into empty Band A.
     */
    function releaseAlarmCamFromBand(camId) {
        const id = normalizeCamId(camId);
        if (!id) return;
        alarmOverflow = alarmOverflow.filter(function (o) { return normalizeCamId(o.camId) !== id; });

        let freedSlot = -1;
        alarmBandOwners.forEach(function (owner, slot) {
            const ownerId = typeof owner === 'string' ? normalizeCamId(owner) : normalizeCamId(owner.camId);
            if (ownerId === id) freedSlot = slot;
        });
        if (freedSlot >= 0) {
            alarmBandOwners.delete(freedSlot);
            if (slots[freedSlot] && normalizeCamId(slots[freedSlot].camId) === id) {
                clearSlotAssignment(freedSlot, true);
            }
            /* Release -> Restore -> hopper (serializer) */
            if (!alarmOverflow.length) {
                restoreSnapshotForSlot(freedSlot);
            } else {
                /* Hopper waiting: keep slot empty for feed; snapshot kept until hopper drains */
                restoreSnapshotForSlot(freedSlot);
            }
        }
        promoteFromHopper();
        syncBandALockUi();
        syncAllCwAlarmUi();
    }

    function findAlarmRow(source, camId, alarmType) {
        const id = normalizeCamId(camId);
        const src = String(source || '');
        const typ = String(alarmType || '');
        for (let i = 0; i < alarmStripRows.length; i++) {
            const r = alarmStripRows[i];
            if (r.acked || r.ended) continue;
            if (normalizeCamId(r.camId) !== id) continue;
            if (src === 'bwc_sos') {
                if (r.source === 'bwc_sos') return r;
                continue;
            }
            if (r.source === src && r.alarmType === typ) return r;
        }
        return null;
    }

    function liveAlarmRows() {
        return alarmStripRows.filter(function (r) { return !r.acked; });
    }

    function updateAlarmToggleLabel() {
        const tog = el('alarm-rail-toggle');
        if (!tog) return;
        const n = liveAlarmRows().length;
        const base = tr('commandWall.alarmsToggle');
        tog.textContent = n ? (base + ' (' + n + ')') : base;
    }

    function refreshAlarmToast() {
        const toast = el('alarm-toast');
        const textEl = el('alarm-toast-text');
        if (!toast || !textEl) {
            refreshPopoutAlarmFlash();
            updateAlarmToggleLabel();
            return;
        }
        const live = liveAlarmRows();
        if (!live.length) {
            toast.hidden = true;
            toast.classList.remove('is-sos');
            textEl.textContent = '';
            updateAlarmToggleLabel();
            refreshPopoutAlarmFlash();
            return;
        }
        const top = live[0];
        const isSos = top.source === 'bwc_sos';
        const cam = top.label || camDisplayName(top.camId);
        const key = isSos ? 'commandWall.alarmsToastSos' : 'commandWall.alarmsToastVms';
        let msg = tr(key);
        if (!msg || msg === key) {
            msg = isSos
                ? ('SOS on ' + cam + '. Close it from Operations.')
                : ('Alarm on ' + cam + '. Open Alarms for details.');
        } else {
            msg = String(msg).replace(/\{cam\}/g, cam);
        }
        if (live.length > 1) msg += ' · ' + live.length + ' active';
        textEl.textContent = msg;
        toast.classList.toggle('is-sos', isSos);
        toast.hidden = false;
        updateAlarmToggleLabel();
        refreshPopoutAlarmFlash();
    }

    function openAlarmRail() {
        const rail = el('alarm-rail');
        if (!rail) return;
        rail.hidden = false;
        const tog = el('alarm-rail-toggle');
        if (tog) tog.setAttribute('aria-expanded', 'true');
        document.body.classList.add('cw-alarm-rail-open');
    }

    function closeAlarmRail() {
        const rail = el('alarm-rail');
        if (!rail) return;
        rail.hidden = true;
        const tog = el('alarm-rail-toggle');
        if (tog) tog.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('cw-alarm-rail-open');
    }

    function toggleAlarmRail() {
        const rail = el('alarm-rail');
        if (!rail) return;
        if (rail.hidden) openAlarmRail();
        else closeAlarmRail();
    }

    function wallNudgeEventKeyForRow(r) {
        if (!r) return '';
        return String(r.source || '') + '|' + String(r.camId || '') + '|' + String(r.rowKey || r.camId || '');
    }

    function wallNudgeEventKeyForFr(hit) {
        const h = hit || (frHudHits.length === 1 ? frHudHits[0] : null);
        if (!h) return '';
        const id = String(h.hitId || h.blacklistId || h.camId || '');
        return 'fr_blacklist|' + String(h.camId || '') + '|' + id;
    }

    function isWallNudgeNotified(eventKey) {
        return !!(eventKey && wallNudgeNotified.has(eventKey));
    }

    function postWallNudgeSa(payload) {
        return fetch('/api/wall-alarms/nudge-sa', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload || {}),
        }).then(function (r) { return r.json().catch(function () { return null; }); });
    }

    function postWallNudgeClear(payload) {
        return fetch('/api/wall-alarms/nudge-clear', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload || {}),
        }).catch(function () { /* ignore */ });
    }

    function applyWallNudgeState(data) {
        if (!data || !data.eventKey) return;
        const key = String(data.eventKey);
        if (data.cleared || data.notified === false) {
            wallNudgeNotified.delete(key);
        } else if (data.notified) {
            wallNudgeNotified.add(key);
        }
        renderAlarmStrip();
        renderFrCornerHud();
        renderAnprCornerHud();
    }

    function loadWallNudgeLocks() {
        fetch('/api/wall-alarms/nudge-locks', {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
        }).then(function (r) { return r.json(); }).then(function (data) {
            if (!data || !data.ok || !Array.isArray(data.locks)) return;
            data.locks.forEach(function (lock) {
                if (lock && lock.eventKey) wallNudgeNotified.add(String(lock.eventKey));
            });
            renderAlarmStrip();
            renderFrCornerHud();
            renderAnprCornerHud();
        }).catch(function () { /* ignore */ });
    }

    function nudgeSaFromAlarmRow(rowKey) {
        const row = alarmStripRows.find(function (r) { return r.rowKey === rowKey && !r.acked; });
        if (!row) return;
        const eventKey = wallNudgeEventKeyForRow(row);
        if (isWallNudgeNotified(eventKey)) return;
        postWallNudgeSa({
            source: row.source,
            camId: row.camId,
            eventKey: eventKey,
            rowKey: row.rowKey,
            alarmType: row.alarmType,
            label: row.label || camDisplayName(row.camId),
        }).then(function (data) {
            if (data && data.ok && data.eventKey) {
                wallNudgeNotified.add(String(data.eventKey));
                renderAlarmStrip();
            }
        });
    }

    function nudgeSaFromFrHud(hit) {
        const h = hit || (frHudHits.length === 1 ? frHudHits[0] : null);
        if (!h || !h.camId) return;
        const eventKey = wallNudgeEventKeyForFr(h);
        if (isWallNudgeNotified(eventKey)) return;
        postWallNudgeSa({
            source: 'fr_blacklist',
            camId: h.camId,
            eventKey: eventKey,
            hitId: h.hitId || '',
            alarmType: 'blacklist',
            label: h.label || camDisplayName(h.camId),
        }).then(function (data) {
            if (data && data.ok && data.eventKey) {
                wallNudgeNotified.add(String(data.eventKey));
                renderFrCornerHud();
            }
        });
    }

    function focusNudgeCam(camId) {
        const id = normalizeCamId(camId);
        if (!id) return false;
        const slot = findSlotByCamId(id);
        if (slot >= 0) {
            destroyFrPip();
            pulseFrHudGridCell(slot);
            return true;
        }
        openFrPipForCam(id);
        return true;
    }

    function renderAlarmStrip() {
        const body = el('alarm-rail-body');
        if (!body) return;
        const live = liveAlarmRows();
        if (!live.length) {
            body.innerHTML = '<div class="' + c('alarm-rail-empty') + '">' +
                escHtml(tr('commandWall.alarmsEmpty')) + '</div>';
            syncAllCwAlarmUi();
            refreshAlarmToast();
            return;
        }
        body.innerHTML = live.map(function (r) {
            const isSos = r.source === 'bwc_sos';
            const badge = isSos
                ? '[SOS]'
                : ('[' + alarmTypeLabel(r.alarmType) + ' x' + r.count + ']');
            const span = formatAlarmClock(r.firstAt) + ' \u2014 ' + formatAlarmClock(r.lastAt)
                + ' (' + formatAlarmDuration(r.firstAt, r.lastAt) + ')';
            const endedCls = r.ended ? ' is-ended' : '';
            const sosCls = isSos ? ' is-sos' : ' is-vms';
            const ek = wallNudgeEventKeyForRow(r);
            const notified = isWallNudgeNotified(ek);
            const nudgeBtn = notified
                ? ('<span class="' + c('alarm-nudge-lock') + '">' + escHtml(tr('commandWall.alarmsSaNotified')) + '</span>')
                : ('<button type="button" class="btn btn-ghost btn-sm ' + c('alarm-nudge-btn') + '" data-nudge-key="'
                    + escHtml(r.rowKey) + '">' + escHtml(tr('commandWall.alarmsNudgeSa')) + '</button>');
            return '<div class="' + c('alarm-row') + endedCls + sosCls + '" data-row-key="' + escHtml(r.rowKey) + '">'
                + '<div class="' + c('alarm-row-main') + '">'
                + '<span class="' + c('alarm-row-badge') + '">' + escHtml(badge) + '</span> '
                + '<span class="' + c('alarm-row-name') + '">' + escHtml(r.label || camDisplayName(r.camId)) + '</span>'
                + '</div>'
                + '<div class="' + c('alarm-row-time') + '">' + escHtml(span) + '</div>'
                + (r.ended ? '<div class="' + c('alarm-row-ended') + '">' + escHtml(tr('commandWall.alarmsEnded')) + '</div>' : '')
                + '<div class="' + c('alarm-row-actions') + '">'
                + nudgeBtn
                + '<button type="button" class="btn btn-ghost btn-sm ' + c('alarm-dismiss-btn') + '" data-dismiss-key="'
                + escHtml(r.rowKey) + '">' + escHtml(tr('commandWall.alarmsDismiss')) + '</button>'
                + '</div>'
                + '</div>';
        }).join('');
        body.querySelectorAll('.' + c('alarm-dismiss-btn')).forEach(function (btn) {
            btn.addEventListener('click', function () {
                dismissAlarmRowLocal(btn.getAttribute('data-dismiss-key'));
            });
        });
        body.querySelectorAll('.' + c('alarm-nudge-btn')).forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                nudgeSaFromAlarmRow(btn.getAttribute('data-nudge-key'));
            });
        });
        syncAllCwAlarmUi();
        refreshAlarmToast();
    }

    function escHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function ensureAlarmCoolTimer() {
        if (alarmCoolTimer) return;
        alarmCoolTimer = setInterval(function () {
            const now = Date.now();
            let changed = false;
            alarmStripRows.forEach(function (r) {
                if (r.acked || r.ended) return;
                /* SOS never auto-demotes */
                if (isSosAlarmSource(r.source)) return;
                if (now - r.lastAt >= ALARM_ACTIVE_WINDOW_MS) {
                    r.ended = true;
                    r.acked = true;
                    releaseAlarmCamFromBand(r.camId);
                    /* WALL-ALARM-NUDGE-SA-V1 - VMS cool clears nudge */
                    postWallNudgeClear({
                        source: r.source,
                        camId: r.camId,
                        eventKey: wallNudgeEventKeyForRow(r),
                    });
                    changed = true;
                }
            });
            if (changed) renderAlarmStrip();
        }, 5000);
    }

    function ingestVmsWallAlarm(data) {
        if (!data || !data.camId) return;
        const camId = normalizeCamId(data.camId);
        const alarmType = String(data.alarmType || 'motion').toLowerCase();
        const source = String(data.source || ('vms_' + alarmType)).toLowerCase();
        const at = Date.parse(data.occurredAt) || Date.now();
        let row = findAlarmRow(source, camId, alarmType);
        if (row && !row.ended && (at - row.lastAt) < ALARM_ACTIVE_WINDOW_MS) {
            row.count += 1;
            row.lastAt = Math.max(row.lastAt, at);
            row.eventId = data.eventId || row.eventId;
        } else {
            row = {
                rowKey: source + '|' + camId + '|' + at + '|' + Math.random().toString(36).slice(2, 7),
                source: source,
                camId: camId,
                alarmType: alarmType,
                eventId: data.eventId || '',
                count: 1,
                firstAt: at,
                lastAt: at,
                ended: false,
                acked: false,
                label: camDisplayName(camId),
            };
            alarmStripRows.unshift(row);
        }
        ensureAlarmCoolTimer();
        promoteAlarmCamToBandA(camId, row);
        renderAlarmStrip();
    }

    function ingestSosStripAlarm(camId) {
        const id = normalizeCamId(camId);
        if (!id) return;
        let row = findAlarmRow('bwc_sos', id, 'sos');
        const at = Date.now();
        if (row) {
            row.lastAt = at;
            row.ended = false;
            row.label = camDisplayName(id);
        } else {
            row = {
                rowKey: 'bwc_sos|' + id + '|' + at,
                source: 'bwc_sos',
                camId: id,
                alarmType: 'sos',
                eventId: '',
                count: 1,
                firstAt: at,
                lastAt: at,
                ended: false,
                acked: false,
                label: camDisplayName(id),
            };
            alarmStripRows.unshift(row);
        }
        promoteAlarmCamToBandA(id, row);
        renderAlarmStrip();
    }

    function removeStripRowsForCamSource(camId, source) {
        const id = normalizeCamId(camId);
        alarmStripRows.forEach(function (r) {
            if (normalizeCamId(r.camId) === id && r.source === source) r.acked = true;
        });
        releaseAlarmCamFromBand(id);
        renderAlarmStrip();
    }

    /** Local Wall dismiss only - does not ACK site SOS / Ops. Restores Band A snapshot. */
    function dismissAlarmRowLocal(rowKey) {
        const row = alarmStripRows.find(function (r) { return r.rowKey === rowKey && !r.acked; });
        if (!row) return;
        row.acked = true;
        if (row.source === 'bwc_sos') {
            sosAlarmCams.delete(normalizeCamId(row.camId));
            /* SOS nudge stays until site ACK - do not clear */
        } else {
            postWallNudgeClear({
                source: row.source,
                camId: row.camId,
                eventKey: wallNudgeEventKeyForRow(row),
            });
        }
        releaseAlarmCamFromBand(row.camId);
        syncAllCwAlarmUi();
        renderAlarmStrip();
    }

    function dismissTopAlarmLocal() {
        const live = liveAlarmRows();
        if (!live.length) return;
        dismissAlarmRowLocal(live[0].rowKey);
    }

    function activeAlarmForCam(camId) {
        const id = normalizeCamId(camId);
        if (!id) return null;
        for (let i = 0; i < alarmStripRows.length; i++) {
            const r = alarmStripRows[i];
            if (r.acked) continue;
            if (normalizeCamId(r.camId) !== id) continue;
            if (r.ended && r.source !== 'bwc_sos') continue;
            return r;
        }
        return null;
    }

    function syncCwAlarmUiForSlot(slot) {
        const cell = getCell(slot);
        if (!cell) return;
        const camId = slotCamId(slot);
        const sos = !!(camId && sosAlarmCams.has(normalizeCamId(camId)));
        const row = camId ? activeAlarmForCam(camId) : null;
        const alarm = sos || !!(row && !row.ended);
        cell.classList.toggle('alarm', alarm);
        cell.classList.toggle('alarm-sos', sos || (row && row.source === 'bwc_sos'));
        cell.classList.toggle('alarm-vms', !!(row && row.source !== 'bwc_sos' && !row.ended));
        const badge = cellQuery(cell, 'alarm-badge');
        if (badge) {
            if (sos || (row && row.source === 'bwc_sos')) {
                badge.hidden = false;
                badge.textContent = '[SOS]';
            } else if (row && !row.ended) {
                badge.hidden = false;
                badge.textContent = '[' + alarmTypeLabel(row.alarmType) + ' x' + row.count + '] '
                    + formatAlarmClock(row.lastAt);
            } else {
                badge.hidden = true;
                badge.textContent = '';
            }
        }
        if (isBandASlot(slot)) {
            cell.classList.toggle('alarm-band-locked', isAlarmBandLocked(slot));
        }
    }

    function syncAllCwAlarmUi() {
        for (let i = 0; i < MAX_SLOTS; i += 1) syncCwAlarmUiForSlot(i);
        syncBandALockUi();
    }

    function applyCwSosAlarm(camId) {
        const id = normalizeCamId(camId);
        if (!id) return;
        sosAlarmCams.add(id);
        ingestSosStripAlarm(id);
        syncAllCwAlarmUi();
    }

    function clearCwSosAlarm(camId) {
        const id = normalizeCamId(camId);
        if (!id) return;
        sosAlarmCams.delete(id);
        removeStripRowsForCamSource(id, 'bwc_sos');
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

    function onWallAlarm(data) {
        ingestVmsWallAlarm(data);
    }

    function onWallAlarmAck(data) {
        if (!data || !data.camId) return;
        const src = String(data.source || '').toLowerCase();
        removeStripRowsForCamSource(data.camId, src);
        if (src === 'bwc_sos') clearCwSosAlarm(data.camId);
        else syncAllCwAlarmUi();
    }

    function bindAlarmRailUi() {
        const tog = el('alarm-rail-toggle');
        if (tog && !tog._cwAlarmBound) {
            tog._cwAlarmBound = true;
            tog.addEventListener('click', toggleAlarmRail);
        }
        const closeBtn = el('alarm-rail-close');
        if (closeBtn && !closeBtn._cwAlarmBound) {
            closeBtn._cwAlarmBound = true;
            closeBtn.addEventListener('click', closeAlarmRail);
        }
        const toastOpen = el('alarm-toast-open');
        if (toastOpen && !toastOpen._cwAlarmBound) {
            toastOpen._cwAlarmBound = true;
            toastOpen.addEventListener('click', openAlarmRail);
        }
        const toastDismiss = el('alarm-toast-dismiss');
        if (toastDismiss && !toastDismiss._cwAlarmBound) {
            toastDismiss._cwAlarmBound = true;
            toastDismiss.addEventListener('click', dismissTopAlarmLocal);
        }
        bindFrCornerHudUi();
    }

    /* ── WALL-ALARM-FR-HUD-DOCK-TOOLBAR-V1 ───────────────────────────────── */
    const FR_HUD_COOL_MS = 2 * 60 * 1000;
    const FR_HUD_SCORE_MIN = 75;
    const FR_HUD_MAX_HITS = 8;
    /** @type {Array<{key:string,camId:string,label:string,hitId:string,blacklistId:string,scorePct:number,lastAt:number}>} */
    let frHudHits = [];
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    const frHudCoolTimers = new Map();
    let frHudMenuOpen = false;
    let anprHudMenuOpen = false;
    let frPipHandle = null;
    let frPipCamId = null;
    let frPipHitKey = null;
    /** Shared PIP context: 'fr' | 'anpr' */
    let frPipKind = 'fr';

    function isFrHudOfflineHit(hit) {
        if (!hit) return true;
        if (hit.isLive === false) return true;
        if (hit.isLive === true) return false;
        if (hit.isOffline) return true;
        const s = String(hit.source || '').trim().toLowerCase();
        return s === 'offline-video' || s === 'offline' || s.indexOf('offline') >= 0;
    }

    function frHudTierHigh(hit) {
        if (hit && hit.alertTier) return String(hit.alertTier).toLowerCase() === 'high';
        const status = String((hit && hit.listStatus) || 'blacklist').trim().toLowerCase();
        if (status === 'poi' || status === 'monitoring' || status === 'suspect') return false;
        return true;
    }

    function frHudEligible(hit) {
        if (!hit || hit._labPreview) return false;
        if (hit.kind === 'anpr' || hit.anpr) return false;
        if (isFrHudOfflineHit(hit)) return false;
        if (!hit.camId) return false;
        if (!frHudTierHigh(hit)) return false;
        const score = Number(hit.scorePct);
        if (!Number.isFinite(score) || score < FR_HUD_SCORE_MIN) return false;
        return true;
    }

    function frHudSubjectKey(hit) {
        const bl = String((hit && hit.blacklistId) || '').trim();
        if (bl) return 'bl:' + bl;
        return 'cam:' + normalizeCamId(hit && hit.camId) + '|' + String((hit && (hit.label || hit.displayName)) || '');
    }

    function sameFrHudSubject(a, b) {
        if (!a || !b) return false;
        return frHudSubjectKey(a) === frHudSubjectKey(b);
    }

    function findFrHudHit(keyOrHit) {
        if (!keyOrHit) return null;
        if (typeof keyOrHit === 'string') {
            for (let i = 0; i < frHudHits.length; i++) {
                if (frHudHits[i].key === keyOrHit) return frHudHits[i];
            }
            return null;
        }
        const key = frHudSubjectKey(keyOrHit);
        for (let i = 0; i < frHudHits.length; i++) {
            if (frHudHits[i].key === key) return frHudHits[i];
        }
        return null;
    }

    function clearFrHudCoolTimer(key) {
        if (!key) return;
        const t = frHudCoolTimers.get(key);
        if (t) {
            clearTimeout(t);
            frHudCoolTimers.delete(key);
        }
    }

    function scheduleFrHudHitCool(key) {
        clearFrHudCoolTimer(key);
        if (!key) return;
        frHudCoolTimers.set(key, setTimeout(function () {
            dismissFrHudHit(key, { fromCool: true });
        }, FR_HUD_COOL_MS));
    }

    function closeFrHudMenu() {
        frHudMenuOpen = false;
        const menu = el('fr-hud-menu');
        if (menu) {
            menu.hidden = true;
            menu.innerHTML = '';
        }
        const tab = el('fr-hud-tab');
        if (tab) tab.setAttribute('aria-expanded', 'false');
    }

    function closeAnprHudMenu() {
        anprHudMenuOpen = false;
        const menu = el('anpr-hud-menu');
        if (menu) {
            menu.hidden = true;
            menu.innerHTML = '';
        }
        const tab = el('anpr-hud-tab');
        if (tab) tab.setAttribute('aria-expanded', 'false');
    }

    function closeAllAnalyticsMenus() {
        closeFrHudMenu();
        closeAnprHudMenu();
    }

    function positionFrHudMenu() {
        const menu = el('fr-hud-menu');
        const tab = el('fr-hud-tab');
        if (!menu || !tab || menu.hidden) return;
        const rect = tab.getBoundingClientRect();
        const pad = 4;
        let left = rect.left;
        let top = rect.bottom + pad;
        const mw = Math.max(menu.offsetWidth || 260, 260);
        const mh = menu.offsetHeight || 120;
        if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
        if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - mh - pad);
        menu.style.left = Math.round(left) + 'px';
        menu.style.top = Math.round(top) + 'px';
    }

    function destroyFrPip() {
        if (frPipHandle) {
            try {
                if (typeof frPipHandle.destroy === 'function') frPipHandle.destroy();
            } catch (_) { /* ignore */ }
            frPipHandle = null;
        }
        frPipCamId = null;
        frPipHitKey = null;
        const stage = el('fr-pip-stage');
        if (stage) {
            stage.querySelectorAll('canvas, video.me8-zlm-primary').forEach(function (n) {
                try { n.remove(); } catch (_) { /* ignore */ }
            });
        }
        const pip = el('fr-pip');
        if (pip) pip.hidden = true;
    }

    function dismissFrHudHit(key, opts) {
        opts = opts || {};
        const hit = findFrHudHit(key);
        if (!hit) return;
        clearFrHudCoolTimer(hit.key);
        postWallNudgeClear({
            source: 'fr_blacklist',
            camId: hit.camId,
            eventKey: wallNudgeEventKeyForFr(hit),
            hitId: hit.hitId || '',
        });
        frHudHits = frHudHits.filter(function (h) { return h.key !== hit.key; });
        if (frPipHitKey === hit.key || normalizeCamId(frPipCamId) === normalizeCamId(hit.camId)) {
            destroyFrPip();
        }
        if (frHudHits.length <= 1) closeFrHudMenu();
        renderFrCornerHud();
    }

    /** Parent dismiss - only when n=1 (no mass dismiss). */
    function dismissFrCornerHud() {
        if (frHudHits.length !== 1) return;
        dismissFrHudHit(frHudHits[0].key);
    }

    function syncFrHudSingleActions() {
        const nudgeEl = el('fr-hud-nudge');
        const dismissEl = el('fr-hud-dismiss');
        const single = frHudHits.length === 1;
        if (nudgeEl) {
            nudgeEl.hidden = !single;
            if (single) {
                const ek = wallNudgeEventKeyForFr(frHudHits[0]);
                if (isWallNudgeNotified(ek)) {
                    nudgeEl.disabled = true;
                    nudgeEl.textContent = tr('commandWall.alarmsSaNotified');
                } else {
                    nudgeEl.disabled = false;
                    nudgeEl.textContent = tr('commandWall.alarmsNudgeSa');
                }
            }
        }
        if (dismissEl) dismissEl.hidden = !single;
    }

    function renderFrHudMenu() {
        const menu = el('fr-hud-menu');
        if (!menu) return;
        if (!frHudMenuOpen || frHudHits.length < 2) {
            closeFrHudMenu();
            return;
        }
        menu.innerHTML = frHudHits.map(function (h) {
            const score = Number.isFinite(h.scorePct) ? (Math.round(h.scorePct) + '%') : '';
            const ek = wallNudgeEventKeyForFr(h);
            const notified = isWallNudgeNotified(ek);
            const nudgeLabel = notified ? tr('commandWall.alarmsSaNotified') : tr('commandWall.alarmsNudgeSa');
            return '<div class="' + c('fr-hud-menu-item') + '" data-fr-key="' + escHtml(h.key) + '" role="option">'
                + '<div class="' + c('fr-hud-menu-main') + '">'
                + '<div>' + escHtml(h.label || h.camId) + (score ? (' · ' + escHtml(score)) : '') + '</div>'
                + '<div class="' + c('fr-hud-menu-sub') + '">' + escHtml(camDisplayName(h.camId) || h.camId) + '</div>'
                + '</div>'
                + '<button type="button" class="btn btn-ghost btn-sm ' + c('fr-hud-menu-nudge') + '" data-fr-nudge="'
                + escHtml(h.key) + '"' + (notified ? ' disabled' : '') + '>' + escHtml(nudgeLabel) + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm ' + c('fr-hud-menu-dismiss') + '" data-fr-dismiss="'
                + escHtml(h.key) + '">' + escHtml(tr('commandWall.alarmsDismiss')) + '</button>'
                + '</div>';
        }).join('');
        menu.hidden = false;
        const tab = el('fr-hud-tab');
        if (tab) tab.setAttribute('aria-expanded', 'true');
        menu.querySelectorAll('.' + c('fr-hud-menu-item')).forEach(function (row) {
            row.addEventListener('click', function (ev) {
                if (ev.target.closest('.' + c('fr-hud-menu-nudge'))
                    || ev.target.closest('.' + c('fr-hud-menu-dismiss'))) return;
                const key = row.getAttribute('data-fr-key');
                closeFrHudMenu();
                focusFrHudHit(findFrHudHit(key));
            });
        });
        menu.querySelectorAll('.' + c('fr-hud-menu-nudge')).forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                nudgeSaFromFrHud(findFrHudHit(btn.getAttribute('data-fr-nudge')));
            });
        });
        menu.querySelectorAll('.' + c('fr-hud-menu-dismiss')).forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                dismissFrHudHit(btn.getAttribute('data-fr-dismiss'));
            });
        });
        positionFrHudMenu();
    }

    function renderFrCornerHud() {
        const hud = el('fr-hud');
        const tab = el('fr-hud-tab');
        if (!hud || !tab) return;
        if (!frHudHits.length) {
            hud.hidden = true;
            tab.textContent = '';
            closeFrHudMenu();
            syncFrHudSingleActions();
            return;
        }
        hud.hidden = false;
        if (frHudHits.length === 1) {
            const h = frHudHits[0];
            const score = Number.isFinite(h.scorePct) ? (' · ' + Math.round(h.scorePct) + '%') : '';
            const single = tr('commandWall.frHudSingle', { name: h.label || h.camId });
            tab.textContent = ((single && single !== 'commandWall.frHudSingle')
                ? single
                : ('Watchlist · ' + (h.label || h.camId))) + score;
            closeFrHudMenu();
        } else {
            const coalesced = tr('commandWall.frHudCoalesce', { n: frHudHits.length });
            tab.textContent = (coalesced && coalesced !== 'commandWall.frHudCoalesce')
                ? coalesced
                : ('Watchlist (' + frHudHits.length + ')');
            if (frHudMenuOpen) renderFrHudMenu();
            else closeFrHudMenu();
        }
        syncFrHudSingleActions();
    }

    function pulseFrHudGridCell(slot) {
        const cell = getCell(slot);
        if (!cell) return;
        cell.classList.remove('fr-hud-pulse');
        void cell.offsetWidth;
        cell.classList.add('fr-hud-pulse');
        setTimeout(function () {
            try { cell.classList.remove('fr-hud-pulse'); } catch (_) { /* ignore */ }
        }, 3000);
    }

    function frPipHeaderLabel(hit, camId) {
        const name = (hit && hit.label) || camDisplayName(camId) || camId || '';
        const labeled = tr('commandWall.frHudPipTitle', { name: name });
        if (labeled && labeled !== 'commandWall.frHudPipTitle') return labeled;
        return 'Watchlist · ' + name;
    }

    function anprPipHeaderLabel(hit, camId) {
        const plate = (hit && (hit.plate || hit.label)) || camDisplayName(camId) || camId || '';
        const labeled = tr('commandWall.anprHudPipTitle', { plate: plate });
        if (labeled && labeled !== 'commandWall.anprHudPipTitle') return labeled;
        return 'Plate · ' + plate;
    }

    function applySharedPipChrome(kind, titleText) {
        frPipKind = kind === 'anpr' ? 'anpr' : 'fr';
        const pip = el('fr-pip');
        const title = el('fr-pip-title');
        if (title && titleText) title.textContent = titleText;
        if (pip) {
            pip.classList.toggle('is-anpr', frPipKind === 'anpr');
            pip.classList.toggle('is-fr', frPipKind === 'fr');
        }
    }

    function attachFrPipFlv(camId, flvUrl, hit, kind) {
        if (!global.Me8LivePlayerFactory
            || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return false;
        }
        const stage = el('fr-pip-stage');
        const pip = el('fr-pip');
        if (!stage || !pip) return false;
        destroyFrPip();
        frPipCamId = normalizeCamId(camId);
        frPipHitKey = hit && hit.key ? hit.key : null;
        const pipKind = kind === 'anpr' ? 'anpr' : 'fr';
        pip.hidden = false;
        applySharedPipChrome(
            pipKind,
            pipKind === 'anpr' ? anprPipHeaderLabel(hit, camId) : frPipHeaderLabel(hit, camId)
        );
        frPipHandle = global.Me8LivePlayerFactory.attachFlvPrimary(stage, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            gridCount: 1,
            onProven: function () { /* live */ },
            onFail: function () { /* keep shell */ },
        });
        return !!frPipHandle;
    }

    function openFrPipForCam(camId, hit, kind) {
        const id = normalizeCamId(camId);
        if (!id) return;
        /* Single PIP slot - always replace; fixed safe corner (no drag / no toolbar anchor) */
        destroyFrPip();
        frPipCamId = id;
        frPipHitKey = hit && hit.key ? hit.key : null;
        const pipKind = kind === 'anpr' ? 'anpr' : 'fr';
        applySharedPipChrome(
            pipKind,
            pipKind === 'anpr' ? anprPipHeaderLabel(hit, id) : frPipHeaderLabel(hit, id)
        );
        const existing = getWvpHandoffFlvUrl(id);
        if (existing) {
            attachFrPipFlv(id, existing, hit, pipKind);
            return;
        }
        if (isFixedCameraId(id)) {
            const cameraId = fixedCameraId(id);
            fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/zlm/start', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: fixedCameraOwner, viewMode: 'focus' }),
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (!data || !data.ok || !data.flvUrl) return;
                if (normalizeCamId(frPipCamId) !== id) return;
                wvpHandoffFlvByCam.set(id, data.flvUrl);
                attachFrPipFlv(id, data.flvUrl, hit, pipKind);
            }).catch(function () { /* ignore */ });
            const pip = el('fr-pip');
            if (pip) pip.hidden = false;
            return;
        }
        const pip = el('fr-pip');
        if (pip) pip.hidden = false;
        if (socket && !streaming.has(id)) {
            socket.emit('start-video', { camId: id, mode: 'video', surface: CW_VIEWER_SURFACE });
        } else if (getWvpHandoffFlvUrl(id)) {
            attachFrPipFlv(id, getWvpHandoffFlvUrl(id), hit, pipKind);
        }
    }

    function focusFrHudHit(hit) {
        if (!hit || !hit.camId) return;
        const id = normalizeCamId(hit.camId);
        const slot = findSlotByCamId(id);
        if (slot >= 0) {
            destroyFrPip();
            pulseFrHudGridCell(slot);
            return;
        }
        openFrPipForCam(id, hit, 'fr');
    }

    function onFrHudTabClick() {
        if (!frHudHits.length) return;
        if (frHudHits.length === 1) {
            focusFrHudHit(frHudHits[0]);
            return;
        }
        closeAnprHudMenu();
        frHudMenuOpen = !frHudMenuOpen;
        if (frHudMenuOpen) renderFrHudMenu();
        else closeFrHudMenu();
    }

    function ingestFrCornerHudHit(hit) {
        if (!frHudEligible(hit)) return;
        const id = normalizeCamId(hit.camId);
        const label = hit.displayName || hit.deviceLabel || camDisplayName(id) || id;
        const draft = {
            camId: id,
            label: label,
            hitId: String(hit.hitId || ''),
            blacklistId: String(hit.blacklistId || ''),
            scorePct: Number(hit.scorePct),
            lastAt: Date.now(),
        };
        draft.key = frHudSubjectKey(draft);
        const existing = findFrHudHit(draft.key);
        if (existing) {
            existing.lastAt = draft.lastAt;
            existing.scorePct = draft.scorePct;
            existing.hitId = draft.hitId || existing.hitId;
            existing.camId = id;
            existing.label = label;
            existing.blacklistId = draft.blacklistId || existing.blacklistId;
            scheduleFrHudHitCool(existing.key);
            renderFrCornerHud();
            return;
        }
        frHudHits.unshift(draft);
        while (frHudHits.length > FR_HUD_MAX_HITS) {
            const drop = frHudHits.pop();
            if (drop) {
                clearFrHudCoolTimer(drop.key);
                if (frPipHitKey === drop.key) destroyFrPip();
            }
        }
        scheduleFrHudHitCool(draft.key);
        renderFrCornerHud();
    }

    function onFrBlacklistHitWall(hit) {
        ingestFrCornerHudHit(hit);
    }

    function onFrAlarmClearedWall(data) {
        if (!data || !frHudHits.length) return;
        const hitId = String(data.hitId || '');
        const camId = normalizeCamId(data.camId);
        const match = frHudHits.find(function (h) {
            if (hitId && h.hitId && hitId === h.hitId) return true;
            return !!(camId && camId === normalizeCamId(h.camId));
        });
        if (match) dismissFrHudHit(match.key);
    }

    function onFrPipStreamReady(data) {
        if (!data || !frPipCamId) return;
        const camId = normalizeCamId(data.camId || data.cameraId);
        if (camId !== frPipCamId) return;
        if (data.flvUrl) wvpHandoffFlvByCam.set(camId, String(data.flvUrl));
        const flv = data.flvUrl || getWvpHandoffFlvUrl(camId);
        let hit = null;
        if (frPipKind === 'anpr') {
            hit = frPipHitKey ? findAnprHudHit(frPipHitKey) : null;
        } else {
            hit = frPipHitKey ? findFrHudHit(frPipHitKey) : null;
        }
        if (flv) attachFrPipFlv(camId, flv, hit, frPipKind);
    }

    function bindFrCornerHudUi() {
        const tab = el('fr-hud-tab');
        if (tab && !tab._cwFrHudBound) {
            tab._cwFrHudBound = true;
            tab.addEventListener('click', onFrHudTabClick);
        }
        const dismiss = el('fr-hud-dismiss');
        if (dismiss && !dismiss._cwFrHudBound) {
            dismiss._cwFrHudBound = true;
            dismiss.addEventListener('click', function (ev) {
                ev.stopPropagation();
                dismissFrCornerHud();
            });
        }
        const nudge = el('fr-hud-nudge');
        if (nudge && !nudge._cwFrHudBound) {
            nudge._cwFrHudBound = true;
            nudge.addEventListener('click', function (ev) {
                ev.stopPropagation();
                nudgeSaFromFrHud();
            });
        }
        const closePip = el('fr-pip-close');
        if (closePip && !closePip._cwFrHudBound) {
            closePip._cwFrHudBound = true;
            closePip.addEventListener('click', destroyFrPip);
        }
        bindAnprCornerHudUi();
        if (!window._cwFrHudPortalBound) {
            window._cwFrHudPortalBound = true;
            document.addEventListener('click', function (ev) {
                if (!frHudMenuOpen && !anprHudMenuOpen) return;
                const frMenu = el('fr-hud-menu');
                const frHud = el('fr-hud');
                const anprMenu = el('anpr-hud-menu');
                const anprHud = el('anpr-hud');
                if (frMenu && frMenu.contains(ev.target)) return;
                if (frHud && frHud.contains(ev.target)) return;
                if (anprMenu && anprMenu.contains(ev.target)) return;
                if (anprHud && anprHud.contains(ev.target)) return;
                closeAllAnalyticsMenus();
            }, true);
            window.addEventListener('resize', function () {
                if (frHudMenuOpen) positionFrHudMenu();
                if (anprHudMenuOpen) positionAnprHudMenu();
            });
            document.addEventListener('keydown', function (ev) {
                if (ev.key === 'Escape') closeAllAnalyticsMenus();
            });
        }
    }

    /* ── WALL-ALARM-ANPR-CORNER-HUD-V1 ───────────────────────────────────── */
    const ANPR_HUD_COOL_MS = 2 * 60 * 1000;
    const ANPR_HUD_MAX_HITS = 8;
    /** @type {Array<{key:string,camId:string,label:string,plate:string,hitId:string,listId:string,scorePct:number,lastAt:number}>} */
    let anprHudHits = [];
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    const anprHudCoolTimers = new Map();

    function isAnprHudOfflineHit(hit) {
        if (!hit) return true;
        if (hit.isLive === false) return true;
        if (hit.isOffline) return true;
        const s = String(hit.source || '').trim().toLowerCase();
        return s === 'offline-video' || s === 'offline' || s.indexOf('offline') >= 0;
    }

    function anprHudEligible(hit) {
        if (!hit || hit._labPreview) return false;
        if (!(hit.kind === 'anpr' || hit.anpr === true)) return false;
        if (isAnprHudOfflineHit(hit)) return false;
        if (!hit.camId) return false;
        const plate = String(hit.plate || hit.displayName || hit.label || '').trim();
        if (!plate) return false;
        return true;
    }

    function anprHudSubjectKey(hit) {
        const plate = String((hit && (hit.plate || hit.label || hit.displayName)) || '').trim().toUpperCase();
        const listId = String((hit && (hit.listId || hit.blacklistId)) || '').trim();
        if (listId && plate) return 'anpr:' + listId + '|' + plate;
        return 'anpr:' + normalizeCamId(hit && hit.camId) + '|' + plate;
    }

    function findAnprHudHit(keyOrHit) {
        if (!keyOrHit) return null;
        if (typeof keyOrHit === 'string') {
            for (let i = 0; i < anprHudHits.length; i++) {
                if (anprHudHits[i].key === keyOrHit) return anprHudHits[i];
            }
            return null;
        }
        const key = anprHudSubjectKey(keyOrHit);
        for (let i = 0; i < anprHudHits.length; i++) {
            if (anprHudHits[i].key === key) return anprHudHits[i];
        }
        return null;
    }

    function wallNudgeEventKeyForAnpr(hit) {
        const h = hit || (anprHudHits.length === 1 ? anprHudHits[0] : null);
        if (!h) return '';
        const id = String(h.hitId || h.plate || h.camId || '');
        return 'anpr_list|' + String(h.camId || '') + '|' + id;
    }

    function clearAnprHudCoolTimer(key) {
        if (!key) return;
        const t = anprHudCoolTimers.get(key);
        if (t) {
            clearTimeout(t);
            anprHudCoolTimers.delete(key);
        }
    }

    function scheduleAnprHudHitCool(key) {
        clearAnprHudCoolTimer(key);
        if (!key) return;
        anprHudCoolTimers.set(key, setTimeout(function () {
            dismissAnprHudHit(key);
        }, ANPR_HUD_COOL_MS));
    }

    function positionAnprHudMenu() {
        const menu = el('anpr-hud-menu');
        const tab = el('anpr-hud-tab');
        if (!menu || !tab || menu.hidden) return;
        const rect = tab.getBoundingClientRect();
        const pad = 4;
        let left = rect.left;
        let top = rect.bottom + pad;
        const mw = Math.max(menu.offsetWidth || 260, 260);
        const mh = menu.offsetHeight || 120;
        if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
        if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - mh - pad);
        menu.style.left = Math.round(left) + 'px';
        menu.style.top = Math.round(top) + 'px';
    }

    function dismissAnprHudHit(key) {
        const hit = findAnprHudHit(key);
        if (!hit) return;
        clearAnprHudCoolTimer(hit.key);
        postWallNudgeClear({
            source: 'anpr_list',
            camId: hit.camId,
            eventKey: wallNudgeEventKeyForAnpr(hit),
            hitId: hit.hitId || '',
        });
        anprHudHits = anprHudHits.filter(function (h) { return h.key !== hit.key; });
        if (frPipKind === 'anpr'
            && (frPipHitKey === hit.key || normalizeCamId(frPipCamId) === normalizeCamId(hit.camId))) {
            destroyFrPip();
        }
        if (anprHudHits.length <= 1) closeAnprHudMenu();
        renderAnprCornerHud();
    }

    function dismissAnprCornerHud() {
        if (anprHudHits.length !== 1) return;
        dismissAnprHudHit(anprHudHits[0].key);
    }

    function nudgeSaFromAnprHud(hit) {
        const h = hit || (anprHudHits.length === 1 ? anprHudHits[0] : null);
        if (!h || !h.camId) return;
        const eventKey = wallNudgeEventKeyForAnpr(h);
        if (isWallNudgeNotified(eventKey)) return;
        postWallNudgeSa({
            source: 'anpr_list',
            camId: h.camId,
            eventKey: eventKey,
            hitId: h.hitId || '',
            alarmType: 'plate',
            label: h.plate || h.label || camDisplayName(h.camId),
        }).then(function (data) {
            if (data && data.ok && data.eventKey) {
                wallNudgeNotified.add(String(data.eventKey));
                renderAnprCornerHud();
            }
        });
    }

    function syncAnprHudSingleActions() {
        const nudgeEl = el('anpr-hud-nudge');
        const dismissEl = el('anpr-hud-dismiss');
        const single = anprHudHits.length === 1;
        if (nudgeEl) {
            nudgeEl.hidden = !single;
            if (single) {
                const ek = wallNudgeEventKeyForAnpr(anprHudHits[0]);
                if (isWallNudgeNotified(ek)) {
                    nudgeEl.disabled = true;
                    nudgeEl.textContent = tr('commandWall.alarmsSaNotified');
                } else {
                    nudgeEl.disabled = false;
                    nudgeEl.textContent = tr('commandWall.alarmsNudgeSa');
                }
            }
        }
        if (dismissEl) dismissEl.hidden = !single;
    }

    function renderAnprHudMenu() {
        const menu = el('anpr-hud-menu');
        if (!menu) return;
        if (!anprHudMenuOpen || anprHudHits.length < 2) {
            closeAnprHudMenu();
            return;
        }
        menu.innerHTML = anprHudHits.map(function (h) {
            const score = Number.isFinite(h.scorePct) ? (Math.round(h.scorePct) + '%') : '';
            const ek = wallNudgeEventKeyForAnpr(h);
            const notified = isWallNudgeNotified(ek);
            const nudgeLabel = notified ? tr('commandWall.alarmsSaNotified') : tr('commandWall.alarmsNudgeSa');
            return '<div class="' + c('anpr-hud-menu-item') + '" data-anpr-key="' + escHtml(h.key) + '" role="option">'
                + '<div class="' + c('anpr-hud-menu-main') + '">'
                + '<div>' + escHtml(h.plate || h.label || h.camId) + (score ? (' · ' + escHtml(score)) : '') + '</div>'
                + '<div class="' + c('anpr-hud-menu-sub') + '">' + escHtml(camDisplayName(h.camId) || h.camId) + '</div>'
                + '</div>'
                + '<button type="button" class="btn btn-ghost btn-sm ' + c('anpr-hud-menu-nudge') + '" data-anpr-nudge="'
                + escHtml(h.key) + '"' + (notified ? ' disabled' : '') + '>' + escHtml(nudgeLabel) + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm ' + c('anpr-hud-menu-dismiss') + '" data-anpr-dismiss="'
                + escHtml(h.key) + '">' + escHtml(tr('commandWall.alarmsDismiss')) + '</button>'
                + '</div>';
        }).join('');
        menu.hidden = false;
        const tab = el('anpr-hud-tab');
        if (tab) tab.setAttribute('aria-expanded', 'true');
        menu.querySelectorAll('.' + c('anpr-hud-menu-item')).forEach(function (row) {
            row.addEventListener('click', function (ev) {
                if (ev.target.closest('.' + c('anpr-hud-menu-nudge'))
                    || ev.target.closest('.' + c('anpr-hud-menu-dismiss'))) return;
                const key = row.getAttribute('data-anpr-key');
                closeAnprHudMenu();
                focusAnprHudHit(findAnprHudHit(key));
            });
        });
        menu.querySelectorAll('.' + c('anpr-hud-menu-nudge')).forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                nudgeSaFromAnprHud(findAnprHudHit(btn.getAttribute('data-anpr-nudge')));
            });
        });
        menu.querySelectorAll('.' + c('anpr-hud-menu-dismiss')).forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                dismissAnprHudHit(btn.getAttribute('data-anpr-dismiss'));
            });
        });
        positionAnprHudMenu();
    }

    function renderAnprCornerHud() {
        const hud = el('anpr-hud');
        const tab = el('anpr-hud-tab');
        if (!hud || !tab) return;
        if (!anprHudHits.length) {
            hud.hidden = true;
            tab.textContent = '';
            closeAnprHudMenu();
            syncAnprHudSingleActions();
            return;
        }
        hud.hidden = false;
        if (anprHudHits.length === 1) {
            const h = anprHudHits[0];
            const single = tr('commandWall.anprHudSingle', { plate: h.plate || h.label || h.camId });
            tab.textContent = (single && single !== 'commandWall.anprHudSingle')
                ? single
                : ('ANPR · ' + (h.plate || h.label || h.camId));
            closeAnprHudMenu();
        } else {
            const coalesced = tr('commandWall.anprHudCoalesce', { n: anprHudHits.length });
            tab.textContent = (coalesced && coalesced !== 'commandWall.anprHudCoalesce')
                ? coalesced
                : ('ANPR (' + anprHudHits.length + ')');
            if (anprHudMenuOpen) renderAnprHudMenu();
            else closeAnprHudMenu();
        }
        syncAnprHudSingleActions();
    }

    function focusAnprHudHit(hit) {
        if (!hit || !hit.camId) return;
        const id = normalizeCamId(hit.camId);
        const slot = findSlotByCamId(id);
        if (slot >= 0) {
            destroyFrPip();
            pulseFrHudGridCell(slot);
            return;
        }
        openFrPipForCam(id, hit, 'anpr');
    }

    function onAnprHudTabClick() {
        if (!anprHudHits.length) return;
        if (anprHudHits.length === 1) {
            focusAnprHudHit(anprHudHits[0]);
            return;
        }
        closeFrHudMenu();
        anprHudMenuOpen = !anprHudMenuOpen;
        if (anprHudMenuOpen) renderAnprHudMenu();
        else closeAnprHudMenu();
    }

    function ingestAnprCornerHudHit(hit) {
        if (!anprHudEligible(hit)) return;
        const id = normalizeCamId(hit.camId);
        const plate = String(hit.plate || hit.displayName || hit.label || '').trim();
        const draft = {
            camId: id,
            label: plate,
            plate: plate,
            hitId: String(hit.hitId || ''),
            listId: String(hit.listId || hit.blacklistId || ''),
            scorePct: Number(hit.scorePct),
            lastAt: Date.now(),
        };
        draft.key = anprHudSubjectKey(draft);
        const existing = findAnprHudHit(draft.key);
        if (existing) {
            existing.lastAt = draft.lastAt;
            existing.scorePct = draft.scorePct;
            existing.hitId = draft.hitId || existing.hitId;
            existing.camId = id;
            existing.plate = plate;
            existing.label = plate;
            scheduleAnprHudHitCool(existing.key);
            renderAnprCornerHud();
            return;
        }
        anprHudHits.unshift(draft);
        while (anprHudHits.length > ANPR_HUD_MAX_HITS) {
            const drop = anprHudHits.pop();
            if (drop) {
                clearAnprHudCoolTimer(drop.key);
                if (frPipKind === 'anpr' && frPipHitKey === drop.key) destroyFrPip();
            }
        }
        scheduleAnprHudHitCool(draft.key);
        renderAnprCornerHud();
    }

    function onAnprListHitWall(hit) {
        ingestAnprCornerHudHit(Object.assign({}, hit || {}, {
            kind: 'anpr',
            anpr: true,
            isLive: hit && hit.isLive !== false,
            source: (hit && hit.source) || 'live',
        }));
    }

    function bindAnprCornerHudUi() {
        const tab = el('anpr-hud-tab');
        if (tab && !tab._cwAnprHudBound) {
            tab._cwAnprHudBound = true;
            tab.addEventListener('click', onAnprHudTabClick);
        }
        const dismiss = el('anpr-hud-dismiss');
        if (dismiss && !dismiss._cwAnprHudBound) {
            dismiss._cwAnprHudBound = true;
            dismiss.addEventListener('click', function (ev) {
                ev.stopPropagation();
                dismissAnprCornerHud();
            });
        }
        const nudge = el('anpr-hud-nudge');
        if (nudge && !nudge._cwAnprHudBound) {
            nudge._cwAnprHudBound = true;
            nudge.addEventListener('click', function (ev) {
                ev.stopPropagation();
                nudgeSaFromAnprHud();
            });
        }
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
        setCellStatus(slot, '\u2014', '');
        showStageHint(slot, true);
        showConnecting(slot, false);
        updateCellControls(slot);
        syncCwAlarmUiForSlot(slot);
        renderRoster();
    }

    function assignCamToSlot(slot, camId, name, autoStart, opts) {
        opts = opts || {};
        if (!camId || !isSlotVisible(slot)) return;
        if (isAlarmBandLocked(slot) && !opts.alarmPromote) return;
        if (slot === BAND_OVERFLOW_SLOT && alarmOverflow.length && !opts.alarmPromote) return;
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
        if (isFixedCameraId(camId)) selectedPtzSlot = slot;
        setCellName(slot, slots[slot].name);
        showStageHint(slot, false);
        showStageStopped(slot, false);
        if (autoStart !== false) clearPttForCwLive(camId);
        updateCellControls(slot);
        updateOfflineOverlay(slot);
        renderRoster();
        if (autoStart !== false && deviceOnline(camId) && !players.has(slot)) {
            if (streaming.has(camId)) attachLivePlayerForSlot(slot);
            else startSlot(slot);
        }
        syncCwAlarmUiForSlot(slot);
        syncPtzPanel();
    }

    function startFixedCameraSlot(slot, camId) {
        const cameraId = fixedCameraId(camId);
        connectingSlots.add(slot);
        showConnecting(slot, true);
        setCellStatus(slot, 'Connecting\u2026', '');
        updateCellControls(slot);
        return fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: fixedCameraOwner, viewMode: slotLiveViewMode(slot) }),
        }).then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok || !data.ok) throw new Error((data && data.error) || ('HTTP ' + response.status));
                if (normalizeCamId(slotCamId(slot)) !== normalizeCamId(camId)) return;
                streaming.add(camId);
                wvpHandoffFlvByCam.set(camId, data.flvUrl);
                if (!attachWvpHandoffFlvToSlot(slot, camId, data.flvUrl)) {
                    throw new Error('Live video player is unavailable');
                }
            });
        }).catch(function (error) {
            connectingSlots.delete(slot);
            showConnecting(slot, false);
            setCellStatus(slot, 'Error', '');
            const cell = getCell(slot);
            const empty = cell && cellQuery(cell, 'cell-empty');
            if (empty) {
                empty.hidden = false;
                empty.textContent = error.message || 'Fixed camera failed';
            }
            updateCellControls(slot);
        });
    }

    function slotLiveViewMode(slot) {
        const scheme = LAYOUT_SCHEMES[currentLayout] || LAYOUT_SCHEMES['16'];
        if (spotlightActive && spotlightSlot === slot) return 'focus';
        if (scheme && scheme.count === 1) return 'focus';
        if (scheme && scheme.focus && slot === 0) return 'focus';
        return 'grid';
    }

    function hardReloadFixedCameraSlot(slot) {
        const camId = slotCamId(slot);
        if (!camId || !isFixedCameraId(camId)) return;
        destroyPlayer(slot);
        streaming.delete(camId);
        startFixedCameraSlot(slot, camId);
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
        setCellStatus(slot, 'Connecting\u2026', '');
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

    function getMatrixSlotVideo(slotIndex) {
        const cell = getCell(slotIndex);
        if (!cell) return null;
        const stage = cellQuery(cell, 'cell-stage');
        if (!stage) return null;
        return stage.querySelector('video.me8-zlm-primary');
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
        if (isFixedCameraId(camId)) {
            startFixedCameraSlot(slot, camId);
            return;
        }
        clearPttForCwLive(camId);
        if (socket && !streaming.has(camId)) {
            socket.emit('start-video', { camId: camId, mode: 'video', surface: CW_VIEWER_SURFACE });
            connectingSlots.add(slot);
            showConnecting(slot, true);
            setCellStatus(slot, 'Connecting\u2026', '');
            updateCellControls(slot);
            return;
        }
        attachLivePlayerForSlot(slot);
    }

    function stopSlot(slot, keepAssignment) {
        const camId = slotCamId(slot);
        if (isFixedCameraId(camId)) {
            fetch('/api/fixed-cams/' + encodeURIComponent(fixedCameraId(camId)) + '/zlm/stop', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: fixedCameraOwner }),
            }).catch(function () { /* server owner lease expires safely */ });
        }
        if (camId && pttCommCamId && normalizeCamId(camId) === normalizeCamId(pttCommCamId)) {
            clearCwPttComm();
        }
        if (camId && voiceCallCamId === camId && socket) {
            socket.emit('end-bwc-call', { camId: camId });
        }
        destroyPlayer(slot);
        showConnecting(slot, false);
        if (camId) removeFromDeck(camId);
        if (camId && socket && !isFixedCameraId(camId)) {
            socket.emit('stop-video', { camId: camId, surface: CW_VIEWER_SURFACE });
            streaming.delete(camId);
        } else if (camId && isFixedCameraId(camId)) {
            streaming.delete(camId);
            clearWvpHandoffFlv(camId);
        }
        const cell = getCell(slot);
        if (cell) {
            const empty = cellQuery(cell, 'cell-empty');
            if (empty) empty.hidden = true;
        }
        setCellStatus(slot, keepAssignment ? 'Stopped' : '\u2014', '');
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
            if (isAlarmBandLocked(slot) || (slot === BAND_OVERFLOW_SLOT && alarmOverflow.length)) {
                e.dataTransfer.dropEffect = 'none';
                return;
            }
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
            if (isAlarmBandLocked(slot) || (slot === BAND_OVERFLOW_SLOT && alarmOverflow.length)) return;
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

    function buildRosterModel(fleet, groupsPayload, bwcDevices, fixedCameras) {
        fleetById = Object.create(null);
        fixedCameraById = Object.create(null);
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
        (fixedCameras || []).forEach(function (camera) {
            if (!camera || !camera.id || !camera.playable) return;
            const sourceId = 'fixed:' + camera.id;
            fixedCameraById[camera.id] = camera;
            fleetById[sourceId] = {
                id: sourceId,
                name: camera.name || camera.id,
                online: true,
                mapGroup: 'Fixed cameras',
                fixedCamera: true,
            };
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
            const gname = d.fixedCamera ? 'Fixed cameras' : (d.mapGroup ? ('Map: ' + d.mapGroup) : 'Unassigned');
            if (!rosterData.ungrouped[gname]) rosterData.ungrouped[gname] = [];
            rosterData.ungrouped[gname].push(d);
        });
    }

    function fetchJsonOk(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (r.status === 401 || r.status === 403) {
                throw new Error('Sign-in required (HTTP ' + r.status + '). Close this window and open again from Control room while signed in.');
            }
            if (!r.ok) throw new Error(url + ' \u2192 HTTP ' + r.status);
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
            fetchJsonOk('/api/fixed-cams/public'),
        ]).then(function (results) {
            const fleet = (results[0] && results[0].fleet) || [];
            const groups = (results[1] && results[1].groups) || [];
            const bwc = (results[2] && results[2].devices) || [];
            const fixedCameras = (results[3] && results[3].cams) || [];
            buildRosterModel(fleet, groups, bwc, fixedCameras);
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

    setInterval(function () {
        const active = Object.create(null);
        for (let slot = 0; slot < MAX_SLOTS; slot += 1) {
            const camId = slotCamId(slot);
            if (!isFixedCameraId(camId) || !players.has(slot) || active[camId]) continue;
            active[camId] = true;
            fetch('/api/fixed-cams/' + encodeURIComponent(fixedCameraId(camId)) + '/zlm/start', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: fixedCameraOwner, viewMode: slotLiveViewMode(slot) }),
        }).catch(function () { /* next heartbeat retries */ });
        }
    }, 30000);

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

    /** GlobalDevicePresence bridge - same SSOT as Ops / ANPR (additive). */
    function ingestPresenceList(list) {
        if (!Array.isArray(list)) return;
        var changed = false;
        list.forEach(function (d) {
            if (!d || !d.id) return;
            const id = normalizeCamId(d.id);
            const prev = fleetById[id];
            const online = d.online === true || d.status === '1';
            const name = d.name || (prev && prev.name) || id;
            const mapGroup = d.mapGroup || d.group || (prev && prev.mapGroup) || '';
            if (!prev || prev.online !== online || prev.name !== name || prev.mapGroup !== mapGroup) {
                changed = true;
            }
            fleetById[id] = {
                id: id,
                name: name,
                online: online,
                mapGroup: mapGroup,
            };
        });
        if (changed) refreshAllOnlineState();
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
        socket.on('wall-alarm', onWallAlarm);
        socket.on('wall-alarm-ack', onWallAlarmAck);
        socket.on('wall-nudge-state', applyWallNudgeState);
        socket.on('fr-blacklist-hit', onFrBlacklistHitWall);
        socket.on('anpr-list-hit', onAnprListHitWall);
        socket.on('fr-alarm-acked', onFrAlarmClearedWall);
        socket.on('fr-alarm-dismissed', onFrAlarmClearedWall);
        socket.on('video-stream-ready', function (data) {
            onFrPipStreamReady(data);
            if (!data || !data.camId) return;
            if (data.surface && data.surface !== CW_VIEWER_SURFACE) return;
            const camId = normalizeCamId(data.camId);
            streaming.add(camId);
            if (data.wvpVideoHandoff && data.flvUrl) {
                attachWvpHandoffFlvForCam(camId, data.flvUrl);
                return;
            }
            const slot = findSlotByCamId(camId);
            if (slot >= 0 && !players.has(slot) && slots[slot]) {
                attachPlayer(slot);
            }
        });
        socket.on('video-stream-stopped', function (data) {
            if (!data || !data.camId) return;
            const camId = normalizeCamId(data.camId);
            clearWvpHandoffFlv(camId);
            streaming.delete(camId);
            const slot = findSlotByCamId(camId);
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
                setCellStatus(slot, slots[slot] ? 'Stopped' : '\u2014', '');
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
        bindAlarmRailUi();
        loadWallNudgeLocks();
        // Pop-out: re-apply after paint so grid columns win (avoids one-column row list).
        try {
            requestAnimationFrame(function () { applyWallLayout(); });
        } catch (_) {
            applyWallLayout();
        }
        bindCwHubNav();
        const launchPanel = new URLSearchParams(window.location.search).get('panel');
        if (launchPanel === 'live' || launchPanel === 'display') showCwPanel(launchPanel);

        // Roster FIRST \u2014 must not depend on socket / optional globals (pop-out was stuck on Loading).
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
            if (global.GlobalDevicePresence && GlobalDevicePresence.subscribe && !window._cwPresenceSub) {
                window._cwPresenceSub = true;
                GlobalDevicePresence.subscribe(function (list) {
                    ingestPresenceList(list);
                });
            }
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

    function occupiedVisibleCount() {
        let n = 0;
        const limit = activeSlotCount();
        for (let i = 0; i < limit; i += 1) {
            if (slotCamId(i)) n += 1;
        }
        return n;
    }

    function listFreeVisibleSlots() {
        const free = [];
        const limit = activeSlotCount();
        for (let i = 0; i < limit; i += 1) {
            if (!slotCamId(i)) free.push(i);
        }
        return free;
    }

    function wallHasCamAssigned(camId) {
        const id = normalizeCamId(camId);
        if (!id) return false;
        if (findSlotByCamId(id) >= 0) return true;
        if (typeof findDeckIndex === 'function' && findDeckIndex(id) >= 0) return true;
        return commandWallHasLiveForCam(id);
    }

    function listAssignedCamIds() {
        const out = [];
        const seen = Object.create(null);
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const id = normalizeCamId(slotCamId(i));
            if (!id || seen[id]) continue;
            seen[id] = true;
            out.push(id);
        }
        (deckEntries || []).forEach(function (e) {
            const id = normalizeCamId(e && e.camId);
            if (!id || seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
        return out;
    }

    function nextLayoutForNeed(need) {
        const order = ['1', '4', '9', '16', '32'];
        let start = order.indexOf(currentLayout);
        if (start < 0) start = 0;
        for (let i = start; i < order.length; i += 1) {
            if (LAYOUT_SCHEMES[order[i]].count >= need) return order[i];
        }
        for (let i = 0; i < order.length; i += 1) {
            if (LAYOUT_SCHEMES[order[i]].count >= need) return order[i];
        }
        return null;
    }

    function layoutToastLabel(id) {
        const map = { '1': '1-up', '4': '2\u00d72', '9': '3\u00d73', '16': '4\u00d74', '32': '8\u00d74' };
        return map[id] || id;
    }

    /**
     * VMS-TARGETING-CART-V1 - place net-new fixed cams from Spatial Targeting Queue.
     * items: [{ id, name }] raw fixed-cam UUIDs (no fixed: prefix).
     */
    function acceptTargetingQueue(items) {
        const list = Array.isArray(items) ? items : [];
        if (spotlightActive) exitSpotlight();

        const skipped = [];
        const netNew = [];
        const seenQ = Object.create(null);
        list.forEach(function (item) {
            if (!item || !item.id) return;
            const rawId = String(item.id).trim();
            if (!rawId || seenQ[rawId]) return;
            seenQ[rawId] = true;
            const wallCamId = 'fixed:' + rawId;
            if (wallHasCamAssigned(wallCamId)) {
                skipped.push({ id: rawId, name: item.name || rawId });
                return;
            }
            netNew.push({ id: rawId, name: item.name || rawId, wallCamId: wallCamId });
        });

        if (!netNew.length) {
            return {
                ok: true,
                placed: 0,
                skipped: skipped.length,
                expanded: null,
                failed: [],
                message: skipped.length
                    ? 'All queued cameras are already on the wall.'
                    : 'Nothing to push.',
            };
        }

        let free = listFreeVisibleSlots();
        let expanded = null;
        if (free.length < netNew.length) {
            const need = occupiedVisibleCount() + netNew.length;
            if (need > MAX_SLOTS) {
                return {
                    ok: false,
                    placed: 0,
                    skipped: skipped.length,
                    expanded: null,
                    failed: netNew.slice(),
                    message: 'Wall is full (32). Cannot push ' + netNew.length + ' more camera(s).',
                };
            }
            const next = nextLayoutForNeed(need);
            if (!next || LAYOUT_SCHEMES[next].count < need) {
                return {
                    ok: false,
                    placed: 0,
                    skipped: skipped.length,
                    expanded: null,
                    failed: netNew.slice(),
                    message: 'Wall is full. Cannot push ' + netNew.length + ' more camera(s).',
                };
            }
            if (next !== currentLayout) {
                setLayoutScheme(next);
                expanded = next;
            }
            free = listFreeVisibleSlots();
        }

        if (free.length < netNew.length) {
            return {
                ok: false,
                placed: 0,
                skipped: skipped.length,
                expanded: expanded,
                failed: netNew.slice(),
                message: 'Not enough free wall slots after layout change.',
            };
        }

        const placed = [];
        for (let i = 0; i < netNew.length; i += 1) {
            const row = netNew[i];
            const slot = free[i];
            if (!fleetById[row.wallCamId]) {
                fleetById[row.wallCamId] = {
                    id: row.wallCamId,
                    name: row.name,
                    online: true,
                    mapGroup: 'Fixed cameras',
                    fixedCamera: true,
                };
            }
            if (!fixedCameraById[row.id]) {
                fixedCameraById[row.id] = { id: row.id, name: row.name, playable: true };
            } else if (!fixedCameraById[row.id].name) {
                fixedCameraById[row.id].name = row.name;
            }
            assignCamToSlot(slot, row.wallCamId, row.name, true, { pinned: true });
            placed.push(row);
        }

        let message = 'Pushed ' + placed.length + ' camera(s) to the wall.';
        if (expanded) message += ' Layout expanded to ' + layoutToastLabel(expanded) + '.';
        if (skipped.length) message += ' Skipped ' + skipped.length + ' already on wall.';

        return {
            ok: true,
            placed: placed.length,
            skipped: skipped.length,
            expanded: expanded,
            expandedLabel: expanded ? layoutToastLabel(expanded) : null,
            failed: [],
            message: message,
        };
    }

    const commandWallApi = {
        init: function (sharedSocket) {
            if (window._commandWallStarted) return;
            window._commandWallStarted = true;
            startApp(sharedSocket);
        },
        showPanel: showCwPanel,
        ingestPresenceList: ingestPresenceList,
        hasLiveForCam: commandWallHasLiveForCam,
        hasActiveLivePlayerForCam: commandWallHasActiveLivePlayerForCam,
        getLiveSlotSummary: getLiveSlotSummary,
        listAssignedCamIds: listAssignedCamIds,
        wallHasCamAssigned: wallHasCamAssigned,
        exitSpotlight: exitSpotlight,
        acceptTargetingQueue: acceptTargetingQueue,
        openPttCommForCam: openPttCommForCam,
        focusNudgeCam: focusNudgeCam,
        ingestAnprCornerHudHit: ingestAnprCornerHudHit,
        onPttRxState: onCwPttRxState,
        onPttRxLinger: onCwPttRxLinger,
        clearPttComm: clearCwPttComm,
        getMatrixSlotCount: getMatrixSlotCount,
        getMatrixSlotInfo: getMatrixSlotInfo,
        getMatrixSlotCanvas: getMatrixSlotCanvas,
        getMatrixSlotVideo: getMatrixSlotVideo,
        getHandoffFlvUrlForCam: getWvpHandoffFlvUrl,
        playMatrixSlot: playMatrixSlot,
        stopMatrixSlot: stopMatrixSlot,
        toggleMatrixSlotAudio: toggleMatrixSlotAudio,
    };

    if (EMBEDDED) {
        window.CommandWall = commandWallApi;
    } else {
        // Server already gated this HTML. Do NOT redirect to login here \u2014 that caused
        // wall ↔ login blink loops when session JSON lagged the cookie.
        startApp();
    }
})(window);
