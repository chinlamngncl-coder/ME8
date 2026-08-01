/**
 * ANPR Live watch — 4 live + 16 rail (4×4).
 * MOB: ANPR-ASYNC-TRACK-PIP-V1 — async pipeline ticks; track best-frame; dual-image PiP cards.
 * Surface: analytics-anpr (concurrent with analytics-fr — not a mutex).
 */
(function (global) {
    'use strict';

    var SURFACE = 'analytics-anpr';
    var LIVE_SLOTS = 4;
    var MAX_WATCH = 16;
    var RAIL_MAX = 50;
    /** Offline Match recent plates — volatile UI buffer (same cap as live). */
    var OFFLINE_RAIL_MAX = 50;
    var ROTATE_MS = 20000;
    var TILE_SIGNAL_LOST_MS = 15000;

    var TILE_STATE = {
        LIVE: 'live',
        IDLE: 'idle',
        WAITING: 'waiting',
        CONNECTING: 'connecting',
        OFFLINE: 'offline',
        NO_SIGNAL: 'no-signal',
        SIGNAL_LOST: 'signal-lost',
        STREAM_ERROR: 'stream-error',
        INVITE_FAILED: 'invite-failed',
        LIVE_CAP: 'live-cap',
        PLAYER_ERROR: 'player-error',
    };

    var fleet = [];
    var selected = [];
    var watching = false;
    var slotCam = [];
    var players = [];
    var pipPlayers = [];
    var pipMinimized = [];
    var pipSwapped = [];
    var pairByCam = Object.create(null);
    var rotateCursor = 0;
    var rotateTimer = null;
    var wvpHandoffFlvByCam = Object.create(null);
    var wvpHandoffSlotInflight = Object.create(null);
    var streamingCams = Object.create(null);
    var tileSignalTimers = [];
    var tileSignalRetried = Object.create(null);
    var socketBound = false;
    var liveRail = [];
    var offlineRail = [];
    /** Offline Match blacklist / suspect hit strip (separate from Recent Plates). */
    var hitRail = [];
    var HIT_RAIL_MAX = 40;
    var lastHit = null;
    var toastTimer = null;
    var fleetPollTimer = null;
    var FLEET_POLL_MS = 3000;
    var uiBound = false;
    var focusedSlot = 0;
    var presenceUnsub = null;

    for (var si = 0; si < LIVE_SLOTS; si++) {
        slotCam[si] = null;
        players[si] = null;
        pipPlayers[si] = null;
        pipMinimized[si] = false;
        pipSwapped[si] = false;
        tileSignalTimers[si] = null;
    }

    function tr(key, fallback) {
        try {
            if (global.i18n && typeof global.i18n.t === 'function') {
                var v = global.i18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizeCamId(id) {
        return String(id || '').trim();
    }

    function getSocket() {
        if (global.__mobilityDashboardSocket && typeof global.__mobilityDashboardSocket.emit === 'function') {
            return global.__mobilityDashboardSocket;
        }
        if (global.dashboardSocket && typeof global.dashboardSocket.emit === 'function') {
            return global.dashboardSocket;
        }
        if (global.socket && typeof global.socket.emit === 'function') return global.socket;
        return null;
    }

    function wsPort() {
        return (parseInt(global.location.port, 10) || 3888) + 1;
    }

    function videoWsUrl(camId) {
        if (global.DashboardWsUrl && typeof global.DashboardWsUrl.videoWsUrl === 'function') {
            return global.DashboardWsUrl.videoWsUrl(camId);
        }
        return 'ws://' + global.location.hostname + ':' + wsPort() + '/?camId=' + encodeURIComponent(camId);
    }

    function tileEl(slot) {
        return document.getElementById('ax-anpr-live-tile-' + slot);
    }

    function deviceName(camId) {
        camId = normalizeCamId(camId);
        for (var i = 0; i < fleet.length; i++) {
            if (normalizeCamId(fleet[i].id) === camId) {
                return String(fleet[i].name || camId);
            }
        }
        return String(camId);
    }

    function shortCamId(camId) {
        if (global.FleetDisplay && typeof FleetDisplay.shortTechnicalId === 'function') {
            return FleetDisplay.shortTechnicalId(camId);
        }
        var s = String(camId || '');
        if (s.length <= 8) return s;
        return '\u2026' + s.slice(-4);
    }

    function deviceOnline(camId) {
        camId = normalizeCamId(camId);
        for (var i = 0; i < fleet.length; i++) {
            if (normalizeCamId(fleet[i].id) === camId) return !!fleet[i].online;
        }
        return false;
    }

    /** Empty-slot copy matches FR pattern — idle hint, not "Waiting" / not "watching". */
    function tileStatusText(stateKey) {
        switch (stateKey) {
            case TILE_STATE.LIVE:
                return 'Live';
            case TILE_STATE.IDLE:
                return tr('analytics.anpr.tileIdleHint', 'Select BWCs and Start watch');
            case TILE_STATE.WAITING:
                return tr('analytics.fr.tileWaiting', 'Waiting for slot');
            case TILE_STATE.CONNECTING:
                return tr('analytics.fr.tileConnecting', 'Connecting\u2026');
            case TILE_STATE.OFFLINE:
                return tr('analytics.fr.tileOffline', 'BWC offline');
            case TILE_STATE.NO_SIGNAL:
                return tr('analytics.fr.tileNoSignal', 'No video signal');
            case TILE_STATE.SIGNAL_LOST:
                return tr('analytics.fr.tileSignalLost', 'Signal lost \u2014 retrying\u2026');
            case TILE_STATE.STREAM_ERROR:
                return tr('analytics.fr.tileStreamError', 'Stream error');
            case TILE_STATE.INVITE_FAILED:
                return tr('analytics.fr.tileInviteFailed', 'Could not start live');
            case TILE_STATE.LIVE_CAP:
                return tr('analytics.fr.tileLiveCap', 'Server live limit \u2014 pause other views');
            case TILE_STATE.PLAYER_ERROR:
                return tr('analytics.fr.tilePlayerError', 'Player unavailable');
            default:
                return tr('analytics.fr.tileWaiting', 'Waiting for slot');
        }
    }

    function applyTileStateClasses(tile, stateKey) {
        if (!tile) return;
        tile.classList.remove('is-live', 'is-tile-connecting', 'is-tile-warn', 'is-tile-error', 'is-tile-pulse');
        if (stateKey === TILE_STATE.LIVE) {
            tile.classList.add('is-live');
        } else if (stateKey === TILE_STATE.CONNECTING) {
            tile.classList.add('is-tile-connecting', 'is-tile-pulse');
        } else if (stateKey === TILE_STATE.SIGNAL_LOST) {
            tile.classList.add('is-tile-warn', 'is-tile-pulse');
        } else if (stateKey === TILE_STATE.OFFLINE || stateKey === TILE_STATE.NO_SIGNAL ||
            stateKey === TILE_STATE.LIVE_CAP) {
            tile.classList.add('is-tile-warn');
        } else if (stateKey === TILE_STATE.STREAM_ERROR || stateKey === TILE_STATE.INVITE_FAILED ||
            stateKey === TILE_STATE.PLAYER_ERROR) {
            tile.classList.add('is-tile-error');
        }
    }

    function ensureTileStopBtn(slot) {
        var tile = tileEl(slot);
        if (!tile) return;
        var btn = tile.querySelector('.ax-anpr-live-tile-stop');
        if (btn) return btn;
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ax-anpr-live-tile-stop';
        btn.setAttribute('data-anpr-slot-stop', String(slot));
        btn.title = tr('analytics.anpr.liveStopSlot', 'Stop Stream');
        btn.setAttribute('aria-label', tr('analytics.anpr.liveStopSlot', 'Stop Stream'));
        btn.innerHTML = '<span class="ax-anpr-live-tile-stop-x" aria-hidden="true">\u00D7</span>' +
            '<span class="ax-anpr-live-tile-stop-txt">' +
            esc(tr('analytics.anpr.liveStopSlot', 'Stop Stream')) + '</span>';
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            stopOneSlot(slot);
        });
        tile.appendChild(btn);
        return btn;
    }

    function stopOneSlot(slot) {
        slot = Number(slot);
        if (!isFinite(slot) || slot < 0 || slot >= LIVE_SLOTS) return;
        var camId = slotCam[slot];
        if (!camId) return;
        focusedSlot = slot;
        /* Remove from watch set + stop only this quadrant — never stopAll */
        var idx = selected.indexOf(normalizeCamId(camId));
        if (idx >= 0) selected.splice(idx, 1);
        stopSlot(slot, true);
        if (watching) {
            fillEmptySlots();
            emitWatchSlots();
            if (!selected.length) endWatchSession();
        }
        updateMeta();
        renderRoster();
        refreshEmptyTileHints();
    }

    function stopFocusedSlot() {
        /* Toolbar Stop: only the focused (or first live) quadrant */
        var slot = focusedSlot;
        if (!(slotCam[slot])) {
            slot = -1;
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i]) { slot = i; break; }
            }
        }
        if (slot < 0) return;
        stopOneSlot(slot);
    }

    function setTileMeta(slot, camId, stateKey) {
        var tile = tileEl(slot);
        if (!tile) return;
        ensureTileStopBtn(slot);
        var stopBtn = tile.querySelector('.ax-anpr-live-tile-stop');
        if (stopBtn) stopBtn.hidden = !camId;
        var label = tile.querySelector('.ax-anpr-live-tile-label');
        var ph = tile.querySelector('.ax-fr-tile-ph');
        if (!ph) {
            ph = document.createElement('span');
            ph.className = 'ax-fr-tile-ph';
            tile.appendChild(ph);
        }
        var name = camId ? deviceName(camId) : '';
        if (label) {
            if (camId) {
                label.textContent = String(slot + 1) + ' \u00B7 ' + name + ' \u00B7 ' + shortCamId(camId);
                label.title = String(camId);
            } else {
                label.textContent = String(slot + 1);
                label.removeAttribute('title');
            }
        }
        if (camId && stateKey) {
            ph.textContent = tileStatusText(stateKey);
            ph.hidden = stateKey === TILE_STATE.LIVE;
        } else if (!camId) {
            stateKey = watching ? TILE_STATE.WAITING : TILE_STATE.IDLE;
            ph.textContent = tileStatusText(stateKey);
            ph.hidden = false;
        }
        applyTileStateClasses(tile, stateKey);
        tile.setAttribute('data-cam', camId || '');
        tile.setAttribute('data-anpr-slot', String(slot));
    }

    function refreshEmptyTileHints() {
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (!slotCam[i]) setTileMeta(i, null, null);
        }
    }

    function clearSignalTimer(slot) {
        if (tileSignalTimers[slot]) {
            clearTimeout(tileSignalTimers[slot]);
            tileSignalTimers[slot] = null;
        }
    }

    function clearSignalRetry(slot, camId) {
        if (camId) delete tileSignalRetried[slot + ':' + camId];
    }

    function parseStreamError(data) {
        var msg = String((data && data.error) || (data && data.message) || '').toLowerCase();
        if (/limit|concurrent|cap|license/.test(msg)) return TILE_STATE.LIVE_CAP;
        if (/conference|sharing to video|vc /.test(msg)) return TILE_STATE.INVITE_FAILED;
        if (/contact|invite|unavailable|offline/.test(msg)) return TILE_STATE.INVITE_FAILED;
        return TILE_STATE.STREAM_ERROR;
    }

    function startSignalTimer(slot, camId) {
        clearSignalTimer(slot);
        if (!camId || !watching) return;
        var retryKey = slot + ':' + camId;
        tileSignalTimers[slot] = setTimeout(function () {
            if (slotCam[slot] !== camId || !watching) return;
            var tile = tileEl(slot);
            if (tile && tile.classList.contains('is-live')) return;
            if (!tileSignalRetried[retryKey]) {
                tileSignalRetried[retryKey] = true;
                setTileMeta(slot, camId, TILE_STATE.SIGNAL_LOST);
                var sock = getSocket();
                if (sock) sock.emit('start-video', { camId: camId, mode: 'video', surface: SURFACE });
                if (streamingCams[camId] || getWvpHandoffFlvUrl(camId)) {
                    attachLivePlayerForSlot(slot);
                }
                return;
            }
            setTileMeta(slot, camId, TILE_STATE.NO_SIGNAL);
        }, TILE_SIGNAL_LOST_MS);
    }

    function handoffPlayerAttaching(p) {
        return !!(p && (p.wvpHandoffAttaching
            || (typeof p.isHandoffAttaching === 'function' && p.isHandoffAttaching())));
    }

    function getWvpHandoffFlvUrl(camId) {
        if (!camId) return null;
        return wvpHandoffFlvByCam[normalizeCamId(camId)] || null;
    }

    function clearWvpHandoffFlv(camId) {
        if (!camId) return;
        delete wvpHandoffFlvByCam[normalizeCamId(camId)];
    }

    function destroyPip(slot) {
        var p = pipPlayers[slot];
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            pipPlayers[slot] = null;
        }
        var tile = tileEl(slot);
        if (tile) {
            tile.querySelectorAll('.ax-anpr-live-pip, .ax-anpr-live-pip-bar, .ax-anpr-live-pip-toggle').forEach(function (el) {
                try { el.remove(); } catch (_) { /* ignore */ }
            });
            pipMinimized[slot] = false;
            pipSwapped[slot] = false;
            tile.classList.remove('is-pip-swapped');
        }
    }

    function destroyPlayer(slot) {
        delete wvpHandoffSlotInflight[slot];
        destroyPip(slot);
        var p = players[slot];
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players[slot] = null;
        }
        var tile = tileEl(slot);
        if (tile) {
            tile.querySelectorAll('canvas, video.me8-zlm-primary').forEach(function (el) {
                try { el.remove(); } catch (_) { /* ignore */ }
            });
            tile.classList.remove('is-live');
        }
    }

    function pairedSecondaryFor(camId) {
        camId = normalizeCamId(camId);
        var sec = pairByCam[camId];
        if (!sec) return null;
        sec = normalizeCamId(sec);
        if (!sec || sec === camId) return null;
        return sec;
    }

    function applyPipLayout(slot) {
        var tile = tileEl(slot);
        if (!tile) return;
        tile.classList.toggle('is-pip-swapped', !!pipSwapped[slot]);
        var host = tile.querySelector('.ax-anpr-live-pip');
        if (host) {
            host.classList.toggle('is-minimized', !!pipMinimized[slot] && !pipSwapped[slot]);
            host.classList.toggle('is-swapped', !!pipSwapped[slot]);
        }
    }

    function ensurePipToggle(slot) {
        var tile = tileEl(slot);
        if (!tile) return;
        var bar = tile.querySelector('.ax-anpr-live-pip-bar');
        if (bar) return bar;
        bar = document.createElement('div');
        bar.className = 'ax-anpr-live-pip-bar';

        var swapBtn = document.createElement('button');
        swapBtn.type = 'button';
        swapBtn.className = 'ax-anpr-live-pip-swap';
        swapBtn.title = tr('analytics.anpr.pipSwap', 'Swap main / PIP');
        swapBtn.textContent = '\u21C4';
        swapBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            pipSwapped[slot] = !pipSwapped[slot];
            applyPipLayout(slot);
        });

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ax-anpr-live-pip-toggle';
        btn.title = tr('analytics.anpr.pipToggle', 'Show / hide PIP');
        btn.textContent = pipMinimized[slot] ? '\u25A1' : '\u2013';
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            pipMinimized[slot] = !pipMinimized[slot];
            if (pipMinimized[slot]) pipSwapped[slot] = false;
            applyPipLayout(slot);
            btn.textContent = pipMinimized[slot] ? '\u25A1' : '\u2013';
        });

        bar.appendChild(swapBtn);
        bar.appendChild(btn);
        tile.appendChild(bar);
        return bar;
    }

    function raisePipAboveMain(slot) {
        var tile = tileEl(slot);
        if (!tile) return;
        var pip = tile.querySelector('.ax-anpr-live-pip');
        var bar = tile.querySelector('.ax-anpr-live-pip-bar');
        if (pip) tile.appendChild(pip);
        if (bar) tile.appendChild(bar);
        applyPipLayout(slot);
    }

    function attachPipSecondary(slot, primaryCamId) {
        var secId = pairedSecondaryFor(primaryCamId);
        destroyPip(slot);
        if (!secId || !watching) return;
        var tile = tileEl(slot);
        if (!tile) return;
        var wrap = document.createElement('div');
        wrap.className = 'ax-anpr-live-pip' + (pipMinimized[slot] ? ' is-minimized' : '')
            + (pipSwapped[slot] ? ' is-swapped' : '');
        wrap.setAttribute('data-anpr-pip-cam', secId);
        tile.appendChild(wrap);
        ensurePipToggle(slot);
        applyPipLayout(slot);

        var sock = getSocket();
        if (sock) {
            try {
                sock.emit('start-video', {
                    camId: secId,
                    surface: SURFACE,
                    preferFlv: true,
                });
            } catch (_) { /* ignore */ }
        }

        var flvUrl = getWvpHandoffFlvUrl(secId);
        if (flvUrl && global.Me8LivePlayerFactory
            && typeof global.Me8LivePlayerFactory.attachFlvPrimary === 'function') {
            var handle = global.Me8LivePlayerFactory.attachFlvPrimary(wrap, flvUrl, {
                proveMs: 300,
                timeoutMs: 10000,
            });
            if (handle) {
                pipPlayers[slot] = handle;
                raisePipAboveMain(slot);
                return;
            }
        }
        if (typeof JSMpeg !== 'undefined') {
            var canvas = document.createElement('canvas');
            canvas.className = 'ax-anpr-live-pip-canvas';
            wrap.appendChild(canvas);
            try {
                pipPlayers[slot] = new JSMpeg.Player(videoWsUrl(secId), {
                    canvas: canvas,
                    autoplay: true,
                    audio: false,
                    disableGl: true,
                });
            } catch (_) {
                destroyPip(slot);
            }
            raisePipAboveMain(slot);
        }
    }

    function attachWvpHandoffFlvToSlot(slot, camId, flvUrl) {
        if (typeof slot !== 'number' || slot < 0 || slot >= LIVE_SLOTS || !camId || !flvUrl) return false;
        camId = normalizeCamId(camId);
        flvUrl = String(flvUrl);
        if (!global.Me8LivePlayerFactory
            || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return false;
        }
        var tile = tileEl(slot);
        if (!tile || !watching) return false;
        var inflight = wvpHandoffSlotInflight[slot];
        if (inflight && inflight.camId === camId && inflight.flvUrl === flvUrl) {
            return true;
        }
        var existing = players[slot];
        if (existing && normalizeCamId(slotCam[slot]) === camId && handoffPlayerAttaching(existing)) {
            return true;
        }
        if (existing && normalizeCamId(slotCam[slot]) === camId && tile.classList.contains('is-live')
            && tile.querySelector('video.me8-zlm-primary')) {
            return true;
        }
        destroyPlayer(slot);
        setTileMeta(slot, camId, TILE_STATE.CONNECTING);
        startSignalTimer(slot, camId);
        wvpHandoffSlotInflight[slot] = { camId: camId, flvUrl: flvUrl, at: Date.now() };
        console.log('[me8-flv] anpr attach once', { slot: slot, camId: camId, url: flvUrl });
        var handle = global.Me8LivePlayerFactory.attachFlvPrimary(tile, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            onProven: function () {
                delete wvpHandoffSlotInflight[slot];
                if (normalizeCamId(slotCam[slot]) !== camId) return;
                clearSignalTimer(slot);
                clearSignalRetry(slot, camId);
                setTileMeta(slot, camId, TILE_STATE.LIVE);
                attachPipSecondary(slot, camId);
                updateMeta();
                renderRoster();
            },
            onFail: function () {
                delete wvpHandoffSlotInflight[slot];
                if (normalizeCamId(slotCam[slot]) !== camId) return;
                clearSignalTimer(slot);
                setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
                updateMeta();
                renderRoster();
            },
            onVideoFrame: function () {
                clearSignalTimer(slot);
                if (camId) clearSignalRetry(slot, camId);
            },
        });
        if (!handle) {
            delete wvpHandoffSlotInflight[slot];
            console.log('[me8-flv] anpr attach fail', { camId: camId, url: flvUrl, reason: 'attachFlvPrimary_null' });
            return false;
        }
        players[slot] = handle;
        return true;
    }

    function attachWvpHandoffFlvForCam(camId, flvUrl) {
        if (!camId || !flvUrl) return;
        camId = normalizeCamId(camId);
        wvpHandoffFlvByCam[camId] = String(flvUrl);
        var slot = findSlotByCamId(camId);
        if (slot >= 0) {
            attachWvpHandoffFlvToSlot(slot, camId, flvUrl);
        }
    }

    function attachPlayer(slot, camId) {
        var tile = tileEl(slot);
        if (!tile || !camId || typeof JSMpeg === 'undefined') {
            setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
            return;
        }
        destroyPlayer(slot);
        setTileMeta(slot, camId, TILE_STATE.CONNECTING);
        startSignalTimer(slot, camId);
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
                    clearSignalTimer(slot);
                    if (camId) clearSignalRetry(slot, camId);
                    setTileMeta(slot, camId, TILE_STATE.LIVE);
                    if (!pipPlayers[slot]) attachPipSecondary(slot, camId);
                    updateMeta();
                    renderRoster();
                },
            });
            players[slot] = player;
        } catch (err) {
            clearSignalTimer(slot);
            setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
            updateMeta();
            renderRoster();
        }
    }

    function attachLivePlayerForSlot(slot) {
        var camId = slotCam[slot];
        if (!camId) return;
        var flvUrl = getWvpHandoffFlvUrl(camId);
        if (flvUrl) {
            if (!attachWvpHandoffFlvToSlot(slot, camId, flvUrl)) {
                attachPlayer(slot, camId);
            }
            return;
        }
        attachPlayer(slot, camId);
    }

    function stopSlot(slot, emitStop) {
        var camId = slotCam[slot];
        clearSignalTimer(slot);
        if (camId) clearSignalRetry(slot, camId);
        destroyPlayer(slot);
        if (camId) {
            delete streamingCams[normalizeCamId(camId)];
            clearWvpHandoffFlv(camId);
        }
        if (emitStop !== false && camId) {
            var sock = getSocket();
            if (sock) {
                try { sock.emit('stop-video', { camId: camId, surface: SURFACE }); } catch (_) { /* ignore */ }
            }
        }
        slotCam[slot] = null;
        setTileMeta(slot, null, null);
        emitWatchSlots();
    }

    function startSlot(slot, camId) {
        camId = normalizeCamId(camId);
        if (slot < 0 || slot >= LIVE_SLOTS || !camId) return;
        if (slotCam[slot] === camId && players[slot]) return;
        if (slotCam[slot] && slotCam[slot] !== camId) {
            clearSignalRetry(slot, slotCam[slot]);
            stopSlot(slot, true);
        }
        slotCam[slot] = camId;
        clearSignalRetry(slot, camId);
        setTileMeta(slot, camId, TILE_STATE.CONNECTING);
        if (!deviceOnline(camId)) {
            clearSignalTimer(slot);
            setTileMeta(slot, camId, TILE_STATE.OFFLINE);
            emitWatchSlots();
            return;
        }
        var sock = getSocket();
        if (sock) sock.emit('start-video', { camId: camId, mode: 'video', surface: SURFACE });
        startSignalTimer(slot, camId);
        if (streamingCams[camId] || getWvpHandoffFlvUrl(camId)) {
            attachLivePlayerForSlot(slot);
        }
        emitWatchSlots();
    }

    function activeSlotCams() {
        var out = [];
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i]) out.push(slotCam[i]);
        }
        return out;
    }

    function provenLiveCount() {
        var n = 0;
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (!slotCam[i]) continue;
            var tile = tileEl(i);
            if (tile && tile.classList.contains('is-live')) n += 1;
        }
        return n;
    }

    function findEmptySlot() {
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (!slotCam[i]) return i;
        }
        return -1;
    }

    function findSlotByCamId(camId) {
        camId = normalizeCamId(camId);
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i] === camId) return i;
        }
        return -1;
    }

    function tileSlotFor(camId) {
        var s = findSlotByCamId(camId);
        return s >= 0 ? s + 1 : 0;
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
            return id;
        }
        return null;
    }

    function emitWatchSlots() {
        var sock = getSocket();
        if (!sock) return;
        sock.emit('anpr-watch-slots', { camIds: watching ? activeSlotCams() : [] });
    }

    function updateMeta() {
        var meta = document.getElementById('ax-anpr-live-meta');
        var startBtn = document.getElementById('ax-anpr-live-start');
        var stopAllBtn = document.getElementById('ax-anpr-live-stop-all');
        if (startBtn) startBtn.disabled = watching || selected.length === 0;
        if (stopAllBtn) stopAllBtn.disabled = !watching && selected.length === 0;
        if (meta) {
            meta.textContent = 'Cameras: ' + String(selected.length) + '/' + String(MAX_WATCH) +
                ' selected \u00B7 ' + String(provenLiveCount()) + '/' + String(LIVE_SLOTS) + ' live';
        }
    }

    function rosterBadgeHtml(camId) {
        var slot = tileSlotFor(camId);
        var tile = slot > 0 ? tileEl(slot - 1) : null;
        var proven = !!(tile && tile.classList.contains('is-live'));
        if (proven) {
            return '<span class="hint">' +
                esc(tr('analytics.fr.tileBadge', 'Live {n}').replace('{n}', String(slot))) + '</span>';
        }
        if (slot > 0) {
            return '<span class="hint">' +
                esc(tr('analytics.fr.tileConnecting', 'Connecting\u2026')) + '</span>';
        }
        if (selected.indexOf(normalizeCamId(camId)) >= 0) {
            return '<span class="hint">' +
                esc(tr('analytics.fr.rotateBadge', 'Rotate')) + '</span>';
        }
        var online = deviceOnline(camId);
        return '<span class="hint">' + esc(online ? 'online' : 'offline') + '</span>';
    }

    function renderRoster() {
        var host = document.getElementById('ax-anpr-live-roster-list');
        if (!host) return;
        var qEl = document.getElementById('ax-anpr-live-search');
        var q = qEl ? String(qEl.value || '').trim().toLowerCase() : '';
        var rows = fleet.filter(function (d) {
            if (!d || !d.id) return false;
            if (!q) return true;
            var hay = (String(d.id) + ' ' + String(d.name || '')).toLowerCase();
            return hay.indexOf(q) >= 0;
        });
        if (!rows.length) {
            host.innerHTML = '<div class="hint">' + esc(tr('analytics.anpr.liveNoBwc', 'No BWC devices')) + '</div>';
            return;
        }
        host.innerHTML = rows.map(function (d) {
            var id = normalizeCamId(d.id);
            var checked = selected.indexOf(id) >= 0;
            var onTile = findSlotByCamId(id) >= 0;
            var disableMore = !checked && selected.length >= MAX_WATCH;
            return '<label class="ax-anpr-live-roster-row' +
                (d.online ? '' : ' is-offline') +
                (onTile ? ' is-on-tile' : '') + '">' +
                '<input type="checkbox" data-anpr-cam="' + esc(id) + '"' +
                (checked ? ' checked' : '') +
                (disableMore || (!d.online && !checked) ? ' disabled' : '') + '>' +
                '<span>' + esc(d.name || id) + '</span>' +
                rosterBadgeHtml(id) + '</label>';
        }).join('');
    }

    function ingestFleet(list) {
        var prevOnline = Object.create(null);
        for (var i = 0; i < fleet.length; i++) {
            if (fleet[i] && fleet[i].id) prevOnline[normalizeCamId(fleet[i].id)] = !!fleet[i].online;
        }
        fleet = Array.isArray(list) ? list.slice() : [];
        renderRoster();
        updateMeta();
        /* If a watched cam just came online while watching, fill empty slots */
        if (watching) {
            for (var j = 0; j < fleet.length; j++) {
                var id = normalizeCamId(fleet[j] && fleet[j].id);
                if (!id || !fleet[j].online) continue;
                if (prevOnline[id]) continue;
                if (selected.indexOf(id) >= 0 && findSlotByCamId(id) < 0) {
                    fillEmptySlots();
                    break;
                }
            }
        }
    }

    function startFleetPolling() {
        stopFleetPolling();
        loadFleet();
        if (!presenceUnsub && global.GlobalDevicePresence && GlobalDevicePresence.subscribe) {
            presenceUnsub = GlobalDevicePresence.subscribe(function (list) {
                if (!Array.isArray(list)) return;
                ingestFleet(list.map(function (d) {
                    return {
                        id: d.id,
                        name: d.name,
                        online: !!d.online,
                        group: d.group || d.mapGroup || '',
                    };
                }));
            });
        }
        /* Pairing map + device catalog refresh (presence online is driven by GlobalDevicePresence) */
        fleetPollTimer = setInterval(function () {
            loadFleet();
        }, FLEET_POLL_MS);
    }

    function stopFleetPolling() {
        if (fleetPollTimer) {
            clearInterval(fleetPollTimer);
            fleetPollTimer = null;
        }
        if (typeof presenceUnsub === 'function') {
            try { presenceUnsub(); } catch (_) { /* ignore */ }
            presenceUnsub = null;
        }
    }

    function loadFleet() {
        /* Prefer GlobalDevicePresence SSOT; keep light merge for pair map only */
        if (global.GlobalDevicePresence && typeof GlobalDevicePresence.getList === 'function') {
            var list = GlobalDevicePresence.getList();
            if (list && list.length) {
                ingestFleet(list.map(function (d) {
                    return {
                        id: d.id,
                        name: d.name,
                        online: !!d.online,
                        group: d.group || d.mapGroup || '',
                    };
                }));
            }
        }
        fetch('/api/bwc-devices', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (bwcData) {
                var rows = (bwcData && Array.isArray(bwcData.devices)) ? bwcData.devices
                    : (Array.isArray(bwcData) ? bwcData : []);
                pairByCam = Object.create(null);
                var byId = Object.create(null);
                (fleet || []).forEach(function (d) {
                    if (d && d.id) byId[normalizeCamId(d.id)] = d;
                });
                rows.forEach(function (d) {
                    if (!d || !d.deviceId) return;
                    var id = normalizeCamId(d.deviceId);
                    var sec = d.pairedSecondaryCameraId || d.paired_secondary_camera_id;
                    if (sec) pairByCam[id] = normalizeCamId(sec);
                    if (!byId[id]) {
                        byId[id] = {
                            id: id,
                            name: d.operatorName || d.nickname || id,
                            online: global.GlobalDevicePresence && GlobalDevicePresence.isOnline
                                ? GlobalDevicePresence.isOnline(id)
                                : false,
                            group: d.mapGroup || '',
                        };
                    } else if (d.operatorName || d.nickname) {
                        byId[id].name = d.operatorName || d.nickname || byId[id].name;
                    }
                });
                if (global.GlobalDevicePresence && GlobalDevicePresence.getList) {
                    GlobalDevicePresence.getList().forEach(function (d) {
                        var id = normalizeCamId(d.id);
                        if (!id) return;
                        if (!byId[id]) {
                            byId[id] = {
                                id: id,
                                name: d.name || id,
                                online: !!d.online,
                                group: d.group || '',
                            };
                        } else {
                            byId[id].online = !!d.online;
                            if (d.name) byId[id].name = d.name;
                        }
                    });
                }
                ingestFleet(Object.keys(byId).map(function (k) { return byId[k]; }));
            })
            .catch(function () { /* ignore */ });
    }

    function endWatchSession() {
        watching = false;
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
    }

    function fillInitialSlots() {
        var online = selected.filter(deviceOnline);
        var want = online.slice(0, LIVE_SLOTS);
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (want[i]) startSlot(i, want[i]);
            else stopSlot(i, false);
        }
        rotateCursor = Math.max(0, want.length - 1);
        refreshEmptyTileHints();
    }

    function fillEmptySlots() {
        if (!watching) return;
        while (true) {
            var slot = findEmptySlot();
            if (slot < 0) break;
            var next = nextRotateCandidate();
            if (!next) break;
            startSlot(slot, next);
        }
        refreshEmptyTileHints();
    }

    function rotateOnce() {
        if (!watching) return;
        if (selected.length <= LIVE_SLOTS) return;
        var next = nextRotateCandidate();
        if (!next) return;
        var slot = findEmptySlot();
        if (slot < 0) slot = 0;
        startSlot(slot, next);
        renderRoster();
        updateMeta();
    }

    function startWatch() {
        if (!selected.length) return;
        watching = true;
        fillInitialSlots();
        if (rotateTimer) clearInterval(rotateTimer);
        rotateTimer = setInterval(rotateOnce, ROTATE_MS);
        emitWatchSlots();
        updateMeta();
        renderRoster();
    }

    function stopWatch() {
        endWatchSession();
        for (var i = 0; i < LIVE_SLOTS; i++) stopSlot(i, true);
        emitWatchSlots();
        updateMeta();
        renderRoster();
        refreshEmptyTileHints();
    }

    function stopAllWatch() {
        if (!watching && !selected.length) return;
        var ok = global.confirm(tr('analytics.anpr.liveStopAllConfirm',
            'Stop all video and clear the watch set?'));
        if (!ok) return;
        if (watching) stopWatch();
        selected = [];
        updateMeta();
        renderRoster();
        refreshEmptyTileHints();
    }

    function toggleSelect(camId, checked) {
        camId = normalizeCamId(camId);
        var idx = selected.indexOf(camId);
        if (checked) {
            if (idx >= 0) return;
            if (selected.length >= MAX_WATCH) {
                try {
                    global.alert(tr('analytics.anpr.liveWatchFull', 'Watch set full (16 max)'));
                } catch (_) { /* ignore */ }
                renderRoster();
                return;
            }
            selected.push(camId);
            if (watching) {
                var empty = findEmptySlot();
                if (empty >= 0 && deviceOnline(camId) && findSlotByCamId(camId) < 0) {
                    startSlot(empty, camId);
                    emitWatchSlots();
                }
            }
        } else {
            if (idx < 0) return;
            selected.splice(idx, 1);
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId) stopSlot(i, true);
            }
            if (watching) {
                fillEmptySlots();
                emitWatchSlots();
            }
            if (!selected.length && watching) endWatchSession();
        }
        updateMeta();
        renderRoster();
        refreshEmptyTileHints();
    }

    function gradeClass(status) {
        var s = String(status || '').toLowerCase();
        if (s === 'wanted' || s === 'blacklist' || s === 'suspicious') return 'is-' + s;
        return '';
    }

    function formatWhen(at) {
        if (!at) return '\u2014';
        var s = String(at);
        if (s.length >= 19) return s.slice(0, 19).replace('T', ' ');
        if (s.length >= 16) return s.slice(0, 16).replace('T', ' ');
        return s;
    }

    function formatWhenShort(at) {
        if (!at) return '\u2014';
        var s = String(at);
        if (s.indexOf('T') >= 0) {
            var part = s.split('T')[1] || '';
            return part.slice(0, 8) || formatWhen(at);
        }
        if (s.length >= 19) return s.slice(11, 19);
        return s;
    }

    function listLabel(tick) {
        if (!tick) return tr('analytics.anpr.liveNoListHit', 'No list match');
        var m = tick.listMatch;
        if (m && (m.listStatus || m.displayName)) {
            return String(m.listStatus || 'hit') +
                (m.displayName ? (' \u00B7 ' + m.displayName) : '');
        }
        if (tick.listStatus) {
            return String(tick.listStatus) +
                (tick.displayName ? (' \u00B7 ' + tick.displayName) : '');
        }
        return tr('analytics.anpr.liveNoListHit', 'No list match');
    }

    function listStatusOf(tick) {
        if (!tick) return '';
        if (tick.listMatch && tick.listMatch.listStatus) return String(tick.listMatch.listStatus);
        return String(tick.listStatus || '');
    }

    function railPrimaryUrl(t) {
        if (!t) return null;
        /* Macro preferred; fall back to plate crop so cards never blank */
        if (t.vehicleUrl) return t.vehicleUrl;
        if (t.cropUrl) return t.cropUrl;
        return null;
    }

    function railPlateUrl(t) {
        if (!t) return null;
        return t.cropUrl || null;
    }

    function motionLabel(t) {
        var m = String((t && t.motion) || '').toLowerCase();
        if (m === 'moving') return tr('analytics.anpr.motionMoving', 'Moving');
        if (m === 'stationary') return tr('analytics.anpr.motionStationary', 'Stationary');
        return tr('analytics.anpr.motionStationary', 'Stationary');
    }

    function mmrLine(t) {
        if (!t) return '';
        if (t.mmrText) return String(t.mmrText);
        var parts = [t.color, t.make, t.model].filter(function (x) {
            return x && String(x).toLowerCase() !== 'unknown';
        });
        if (parts.length) return parts.join(' - ');
        if (t.color || t.make || t.model) {
            return [t.color || '—', t.make || '—', t.model || '—'].join(' - ');
        }
        return '';
    }

    function railMetaLine(t) {
        var parts = [];
        if (t.seq != null && isFinite(Number(t.seq))) {
            parts.push('#' + String(t.seq));
        }
        parts.push(formatWhenShort(t.at) || '\u2014');
        parts.push(t.deviceLabel || t.camId || '\u2014');
        var mmr = mmrLine(t);
        if (mmr) parts.push(mmr);
        else parts.push(motionLabel(t));
        return parts.join(' \u00B7 ');
    }

    function mismatchIconHtml(t) {
        if (!t || !t.mmrMismatch) return '';
        var tip = t.mmrMismatchDetail || tr('analytics.anpr.mmrMismatch', 'Registered vs visual mismatch');
        return '<span class="ax-anpr-mmr-warn" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">\u26A0</span>';
    }

    function copyRailTick(tick, prev) {
        return {
            plate: tick.plate || null,
            vehicleUrl: tick.vehicleUrl || null,
            cropUrl: tick.cropUrl || null,
            vehicleLabel: tick.vehicleLabel || null,
            listMatch: tick.listMatch || null,
            listStatus: tick.listStatus || (tick.listMatch && tick.listMatch.listStatus) || null,
            displayName: tick.displayName || (tick.listMatch && tick.listMatch.displayName) || null,
            deviceLabel: tick.deviceLabel || null,
            camId: tick.camId || null,
            at: tick.at || null,
            trackId: tick.trackId != null ? tick.trackId : (prev && prev.trackId),
            seq: tick.seq != null ? tick.seq : (prev && prev.seq),
            motion: tick.motion || (prev && prev.motion) || 'Stationary',
            make: tick.make || (tick.mmr && tick.mmr.make) || (prev && prev.make) || null,
            model: tick.model || (tick.mmr && tick.mmr.model) || (prev && prev.model) || null,
            color: tick.color || (tick.mmr && tick.mmr.color) || (prev && prev.color) || null,
            mmrText: tick.mmrText || (tick.mmr && tick.mmr.mmrText) || (prev && prev.mmrText) || null,
            mmrMismatch: !!(tick.mmrMismatch),
            mmrMismatchDetail: tick.mmrMismatchDetail || null,
            unclear: !!tick.unclear,
            reviewStatus: tick.reviewStatus || null,
            frameUuid: tick.frameUuid || (prev && prev.frameUuid) || null,
            fusion: tick.fusion || (prev && prev.fusion) || null,
            lat: tick.lat != null ? tick.lat : (prev && prev.lat),
            lon: tick.lon != null ? tick.lon : (prev && prev.lon),
            source: tick.source || (prev && prev.source) || null,
            isLive: tick.isLive != null ? tick.isLive : (prev && prev.isLive),
            hitId: tick.hitId || (prev && prev.hitId) || null,
            confidence: tick.confidence != null ? tick.confidence : (prev && prev.confidence),
            listId: tick.listId || (prev && prev.listId) || null,
        };
    }

    function isOfflineAnprSource(tick) {
        if (!tick) return false;
        var s = String(tick.source || '').trim().toLowerCase();
        return s === 'offline' || s === 'offline-video' || String(tick.camId || '') === 'offline';
    }

    function isLiveAnprSource(tick) {
        if (!tick || isOfflineAnprSource(tick)) return false;
        if (tick.isLive === false) return false;
        return true;
    }

    function pushRail(tick) {
        if (!tick) return;
        /* Accept vehicle scene, plate crop, or plate text — never drop a valid capture */
        if (!tick.vehicleUrl && !tick.cropUrl && !tick.plate) return;

        var offline = isOfflineAnprSource(tick);
        /* DATA ISOLATION: live bucket ignores offline; offline bucket ignores live */
        if (!offline) {
            tick = Object.assign({}, tick, {
                source: tick.source || 'live',
                isLive: true,
            });
        }

        var bucket = offline ? offlineRail : liveRail;
        var maxSlots = offline ? OFFLINE_RAIL_MAX : RAIL_MAX;

        if (tick.trackId != null) {
            for (var ri = 0; ri < bucket.length; ri++) {
                if (bucket[ri] && bucket[ri].trackId === tick.trackId) {
                    bucket[ri] = copyRailTick(tick, bucket[ri]);
                    renderRail(false);
                    if (listStatusOf(bucket[ri]) && offline) pushHitSlot(bucket[ri]);
                    return;
                }
            }
        }
        bucket.unshift(copyRailTick(tick, null));
        while (bucket.length > maxSlots) {
            bucket.pop();
        }
        if (offline) offlineRail = bucket;
        else liveRail = bucket;
        renderRail(true);
        if (listStatusOf(tick) && offline) pushHitSlot(tick);
    }

    function pushHitSlot(tick) {
        if (!tick || !listStatusOf(tick)) return;
        /* Hit strip is Offline Match only */
        if (!isOfflineAnprSource(tick)) return;
        hitRail.unshift(copyRailTick(tick, null));
        if (hitRail.length > HIT_RAIL_MAX) hitRail = hitRail.slice(0, HIT_RAIL_MAX);
        paintHitSlots();
    }

    function paintHitSlots() {
        var row = document.getElementById('ax-anpr-offline-hit-row');
        if (!row) return;
        if (!Array.isArray(hitRail) || hitRail.length === 0) {
            row.innerHTML = '<div class="ax-anpr-offline-hit-empty" role="status">' +
                esc(tr('analytics.anpr.hitSlotsEmpty', 'Waiting for list hits\u2026')) + '</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < hitRail.length; i++) {
            var t = hitRail[i];
            if (!t) continue;
            var st = listStatusOf(t);
            var hitCls = st ? (' is-hit ' + gradeClass(st)) : ' is-hit';
            var primary = railPrimaryUrl(t);
            var plateThumb = railPlateUrl(t);
            html += '<div class="ax-anpr-offline-hit-card ax-anpr-live-rail-card' + hitCls + '" role="listitem" data-anpr-hit="' + i + '" title="' +
                esc(tr('analytics.anpr.liveRailExpandHint', 'Click to expand')) + '">' +
                '<div class="ax-anpr-rail-macro">' +
                (primary
                    ? '<img class="ax-anpr-rail-scene" src="' + esc(primary) + '" alt="">'
                    : '<div class="ax-anpr-rail-macro-empty hint">\u2014</div>') +
                (plateThumb && primary
                    ? '<img class="ax-anpr-rail-plate-thumb ax-anpr-rail-micro" src="' + esc(plateThumb) + '" alt="">'
                    : '') +
                '</div>' +
                '<div class="ax-anpr-rail-plate">' + esc(t.plate || tr('analytics.anpr.liveRailNoText', 'No plate')) + '</div>' +
                '<div class="ax-anpr-rail-meta">' + esc(String(st || 'hit').toUpperCase() + ' \u00B7 ' + formatWhenShort(t.at)) + '</div>' +
                '</div>';
        }
        row.innerHTML = html;
    }

    function renderRail(animateShift) {
        paintRailGrid(document.getElementById('ax-anpr-live-rail-grid'), animateShift, {
            maxSlots: RAIL_MAX,
            recentPlates: liveRail,
            scope: 'live',
        });
        paintRailGrid(document.getElementById('ax-anpr-offline-rail-grid'), false, {
            maxSlots: OFFLINE_RAIL_MAX,
            recentPlates: offlineRail,
            scope: 'offline',
        });
    }

    function captureImagePath(t) {
        return railPrimaryUrl(t) || '';
    }

    function capturePlateText(t) {
        if (!t) return 'UNCLEAR';
        if (t.unclear) return 'UNCLEAR';
        return String(t.plate || 'UNCLEAR');
    }

    function captureMacroUrl(t) {
        if (!t) return '';
        return t.vehicleUrl || t.macroCropUrl || t.sceneUrl || t.cropUrl || '';
    }

    function captureMicroUrl(t) {
        if (!t) return '';
        return t.cropUrl || t.microCropUrl || t.plateUrl || t.vehicleUrl || '';
    }

    function captureBwcUser(t) {
        if (!t) return '\u2014';
        return String(t.deviceLabel || t.bwcUser || t.camera_name || t.camName || t.camId || '\u2014');
    }

    function captureSourceIsLive(t) {
        if (!t) return false;
        if (isOfflineAnprSource(t)) return false;
        if (t.isLive === true) return true;
        var s = String(t.source || '').toLowerCase();
        return s === 'live' || s === '' || s === 'bwc';
    }

    function skeletonEmptyHtml() {
        /* Empty state — 4 dashed placeholders (h-40 / Tailwind → global.css) */
        var cell = '<div class="ax-anpr-rail-skeleton" role="status">Awaiting Capture</div>';
        return cell + cell + cell + cell;
    }

    /* fe26055 dense cards — DO NOT alter HTML / mapping */
    function paintRailCardHtml(t, idx) {
        var plateText = capturePlateText(t);
        var when = formatWhenShort(t.at) || formatWhen(t.at) || '\u2014';
        var macroUrl = captureMacroUrl(t);
        var microUrl = captureMicroUrl(t);
        var bwcUser = captureBwcUser(t);
        var isLive = captureSourceIsLive(t);
        var st = listStatusOf(t);
        var hitCls = st ? (' is-hit ' + gradeClass(st)) : '';
        var sourceBadge = isLive
            ? ('BWC: ' + bwcUser)
            : 'OFFLINE MP4';
        var macroHtml = macroUrl
            ? '<img src="' + esc(macroUrl) + '" class="ax-anpr-snap-macro-img" alt="Full Context" loading="lazy">'
            : '<span class="ax-anpr-snap-card-img-empty">\u2014</span>';
        var microHtml = microUrl
            ? '<img src="' + esc(microUrl) + '" class="ax-anpr-snap-micro-img" alt="Zoomed Plate Crop" loading="lazy">'
            : '<span class="ax-anpr-snap-card-img-empty">\u2014</span>';
        return (
            '<div class="ax-anpr-snap-card' + hitCls + '" role="listitem" data-anpr-rail="' + idx + '">' +
            '<div class="ax-anpr-snap-macro">' + macroHtml + '</div>' +
            '<button type="button" class="ax-anpr-rail-mag" data-anpr-open="' + idx + '" title="' +
            esc(tr('analytics.anpr.liveRailExpandHint', 'Open evidence')) + '" aria-label="' +
            esc(tr('analytics.anpr.liveRailExpandHint', 'Open evidence')) + '">' +
            '<svg class="ax-anpr-rail-mag-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>' +
            '</button>' +
            '<div class="ax-anpr-snap-micro">' + microHtml + '</div>' +
            '<div class="ax-anpr-snap-card-body">' +
            '<div class="ax-anpr-snap-card-row">' +
            '<span class="ax-anpr-snap-card-plate">' + mismatchIconHtml(t) + esc(plateText) + '</span>' +
            '<span class="ax-anpr-snap-bwc' + (isLive ? ' is-live' : ' is-offline') + '">' +
            esc(sourceBadge) + '</span>' +
            '</div>' +
            '<span class="ax-anpr-snap-card-time">' + esc(when) + '</span>' +
            '</div></div>'
        );
    }

    function paintRailGrid(grid, animateShift, opts) {
        if (!grid) return;
        opts = opts || {};
        var maxSlots = opts.maxSlots != null ? opts.maxSlots : RAIL_MAX;
        var scope = opts.scope === 'offline' ? 'offline' : 'live';
        var recentPlates = Array.isArray(opts.recentPlates) ? opts.recentPlates : [];
        /* DATA FIREWALL — tab isolation */
        recentPlates = recentPlates.filter(function (c) {
            if (!c) return false;
            var src = String(c.source || '').toLowerCase();
            if (scope === 'live') {
                if (src === 'offline') return false;
                return !isOfflineAnprSource(c);
            }
            /* offline tab: only source === offline */
            if (src === 'live' || src !== 'offline') return false;
            return true;
        });
        if (!recentPlates.length) {
            grid.innerHTML = skeletonEmptyHtml();
            return;
        }
        var html = '';
        var limit = Math.min(recentPlates.length, maxSlots);
        for (var i = 0; i < limit; i++) {
            if (!recentPlates[i]) continue;
            html += paintRailCardHtml(recentPlates[i], i);
        }
        if (!html) {
            grid.innerHTML = skeletonEmptyHtml();
            return;
        }
        grid.innerHTML = html;
        if (animateShift) {
            grid.classList.remove('is-rail-shift');
            void grid.offsetWidth;
            grid.classList.add('is-rail-shift');
        }
    }

    function clearUiRail(scope) {
        if (scope === 'offline') {
            offlineRail = [];
        } else {
            liveRail = [];
        }
        renderRail(false);
    }

    function openAnprModal(idx, scope) {
        var i = parseInt(idx, 10);
        if (!isFinite(i) || i < 0) return;
        var sc = scope === 'offline' ? 'offline' : 'live';
        var bucket = railByScope(sc).filter(function (c) {
            if (!c) return false;
            if (sc === 'live') return !isOfflineAnprSource(c);
            return isOfflineAnprSource(c);
        });
        var tick = bucket[i];
        if (!tick) return;
        var img = captureImagePath(tick) || captureMacroUrl(tick) || captureMicroUrl(tick);
        var liveHit = sc === 'live' && !!listStatusOf(tick);
        if (liveHit) {
            try {
                if (global.FrAlarm && typeof FrAlarm.showHit === 'function') {
                    var payload = anprHitToFrAlarmPayload(Object.assign({}, tick, {
                        isLive: true,
                        source: tick.source || 'live',
                    }));
                    if (payload) FrAlarm.showHit(payload);
                }
            } catch (_) { /* ignore */ }
        }
        try {
            if (img && global.FrAlarm && typeof FrAlarm.openSnapLightbox === 'function') {
                FrAlarm.openSnapLightbox({
                    cropUrl: img,
                    photoUrl: tick.cropUrl || img,
                    displayName: capturePlateText(tick),
                    camId: tick.camId,
                    deviceLabel: tick.deviceLabel || tick.camId || capturePlateText(tick),
                    at: tick.at,
                    lat: tick.lat,
                    lon: tick.lon,
                    match: !!listStatusOf(tick),
                    scorePct: tick.confidence != null ? Number(tick.confidence) : null,
                    plate: tick.plate,
                    anpr: true,
                });
                return;
            }
        } catch (_) { /* fall through */ }
        openLightbox(tick);
    }

    function ensureLightbox() {
        var el = document.getElementById('ax-anpr-snap-lightbox');
        if (el) {
            if (!el.querySelector('.ax-anpr-lb-download')) {
                var meta = el.querySelector('.ax-anpr-snap-lb-meta');
                if (meta && !meta.querySelector('.ax-anpr-snap-lb-actions')) {
                    var actions = document.createElement('div');
                    actions.className = 'ax-anpr-snap-lb-actions';
                    actions.innerHTML = '<button type="button" class="btn btn-sm btn-primary ax-anpr-lb-download">' +
                        esc(tr('analytics.anpr.downloadEvidence', 'Download Evidence')) + '</button>';
                    meta.appendChild(actions);
                    var dl = actions.querySelector('.ax-anpr-lb-download');
                    if (dl) {
                        dl.addEventListener('click', function (e) {
                            e.stopPropagation();
                            downloadAnprEvidence(el._tick);
                        });
                    }
                }
            }
            var scene = el.querySelector('.ax-anpr-lb-scene');
            if (scene && scene.parentElement
                && !scene.parentElement.classList.contains('ax-anpr-lb-scene-wrap')) {
                var wrapUp = document.createElement('div');
                wrapUp.className = 'ax-anpr-lb-scene-wrap';
                scene.parentNode.insertBefore(wrapUp, scene);
                wrapUp.appendChild(scene);
                el._anprMagBound = false;
            }
            if (!el._anprMagBound) bindMacroMagnifier(el);
            return el;
        }
        el = document.createElement('div');
        el.id = 'ax-anpr-snap-lightbox';
        el.hidden = true;
        el.innerHTML =
            '<div class="ax-anpr-snap-lb-chrome" data-anpr-drag-handle="1">' +
            '<h3 class="ax-anpr-snap-lb-title"></h3>' +
            '<button type="button" class="ax-anpr-snap-lb-close" aria-label="' +
            esc(tr('common.close', 'Close')) + '">\u00D7</button></div>' +
            '<div class="ax-anpr-snap-lb-body">' +
            '<div class="ax-anpr-lb-scene-wrap">' +
            '<img class="ax-anpr-lb-scene" alt="">' +
            '</div>' +
            '<div class="ax-anpr-lb-plate-wrap">' +
            '<img class="ax-anpr-lb-plate-img" alt="" hidden>' +
            '</div>' +
            '<div class="ax-anpr-snap-lb-meta">' +
            '<p class="ax-anpr-lb-plate"></p>' +
            '<p class="ax-anpr-lb-mmr"></p>' +
            '<p class="ax-anpr-lb-list"></p>' +
            '<p class="ax-anpr-lb-when"></p>' +
            '<p class="ax-anpr-lb-bwc"></p>' +
            '<div class="ax-anpr-snap-lb-actions">' +
            '<button type="button" class="btn btn-sm btn-primary ax-anpr-lb-download">' +
            esc(tr('analytics.anpr.downloadEvidence', 'Download Evidence')) + '</button>' +
            '</div>' +
            '</div></div>';
        document.body.appendChild(el);
        var closeBtn = el.querySelector('.ax-anpr-snap-lb-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () { el.hidden = true; });
        }
        var dlBtn = el.querySelector('.ax-anpr-lb-download');
        if (dlBtn) {
            dlBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                downloadAnprEvidence(el._tick);
            });
        }
        bindMacroMagnifier(el);
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && el && !el.hidden) el.hidden = true;
        });
        /* Native pointer drag on header — not locked to screen center */
        (function bindDrag() {
            var handle = el.querySelector('[data-anpr-drag-handle]');
            if (!handle || el._anprDragBound) return;
            el._anprDragBound = true;
            var dragging = false;
            var ox = 0;
            var oy = 0;
            handle.addEventListener('pointerdown', function (ev) {
                if (ev.button != null && ev.button !== 0) return;
                if (ev.target && ev.target.closest && ev.target.closest('.ax-anpr-snap-lb-close')) return;
                dragging = true;
                var rect = el.getBoundingClientRect();
                ox = ev.clientX - rect.left;
                oy = ev.clientY - rect.top;
                el.style.right = 'auto';
                el.style.bottom = 'auto';
                el.style.left = rect.left + 'px';
                el.style.top = rect.top + 'px';
                try { handle.setPointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
                ev.preventDefault();
            });
            handle.addEventListener('pointermove', function (ev) {
                if (!dragging) return;
                var nx = ev.clientX - ox;
                var ny = ev.clientY - oy;
                var maxX = Math.max(0, window.innerWidth - el.offsetWidth);
                var maxY = Math.max(0, window.innerHeight - el.offsetHeight);
                el.style.left = Math.max(0, Math.min(maxX, nx)) + 'px';
                el.style.top = Math.max(0, Math.min(maxY, ny)) + 'px';
            });
            function endDrag(ev) {
                if (!dragging) return;
                dragging = false;
                try { handle.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
            }
            handle.addEventListener('pointerup', endDrag);
            handle.addEventListener('pointercancel', endDrag);
        })();
        return el;
    }

    /** Hover-to-zoom on primary macro-crop (full vehicle) — pan via transform-origin. */
    function bindMacroMagnifier(el) {
        if (!el || el._anprMagBound) return;
        var wrap = el.querySelector('.ax-anpr-lb-scene-wrap');
        var img = el.querySelector('.ax-anpr-lb-scene');
        if (!wrap || !img) return;
        el._anprMagBound = true;
        wrap.addEventListener('mousemove', function (ev) {
            if (img.hidden) return;
            var w = wrap.offsetWidth || img.offsetWidth || 1;
            var h = wrap.offsetHeight || img.offsetHeight || 1;
            var ox = (ev.offsetX != null) ? ev.offsetX : (ev.nativeEvent && ev.nativeEvent.offsetX);
            var oy = (ev.offsetY != null) ? ev.offsetY : (ev.nativeEvent && ev.nativeEvent.offsetY);
            if (ox == null || oy == null) {
                var rect = wrap.getBoundingClientRect();
                ox = ev.clientX - rect.left;
                oy = ev.clientY - rect.top;
            }
            var x = Math.max(0, Math.min(100, (ox / w) * 100));
            var y = Math.max(0, Math.min(100, (oy / h) * 100));
            img.style.transformOrigin = x + '% ' + y + '%';
            img.style.transform = 'scale(2.5)';
            wrap.classList.add('is-zooming');
        });
        wrap.addEventListener('mouseleave', function () {
            img.style.transform = '';
            img.style.transformOrigin = '';
            wrap.classList.remove('is-zooming');
        });
        /* Keep plate scrap zoom as secondary copy */
        var pWrap = el.querySelector('.ax-anpr-lb-plate-wrap');
        var pImg = el.querySelector('.ax-anpr-lb-plate-img');
        if (pWrap && pImg) {
            pWrap.addEventListener('mousemove', function (ev) {
                if (pImg.hidden) return;
                var pw = pWrap.offsetWidth || 1;
                var ph = pWrap.offsetHeight || 1;
                var px = Math.max(0, Math.min(100, ((ev.offsetX != null ? ev.offsetX : 0) / pw) * 100));
                var py = Math.max(0, Math.min(100, ((ev.offsetY != null ? ev.offsetY : 0) / ph) * 100));
                pImg.style.transformOrigin = px + '% ' + py + '%';
                pImg.style.transform = 'scale(2.5)';
                pWrap.classList.add('is-zooming');
            });
            pWrap.addEventListener('mouseleave', function () {
                pImg.style.transform = '';
                pImg.style.transformOrigin = '';
                pWrap.classList.remove('is-zooming');
            });
        }
    }

    function downloadAnprEvidence(tick) {
        if (!tick) return;
        var url = railPrimaryUrl(tick) || tick.cropUrl || '';
        if (!url) return;
        var base = String(tick.plate || tick.camId || 'plate').replace(/[^\w.\-]+/g, '_').slice(0, 48);
        var filename = 'anpr-evidence-' + base + '-' + Date.now() + '.jpg';
        fetch(String(url), { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('http_' + r.status);
                return r.blob();
            })
            .then(function (blob) {
                var u = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = u;
                a.download = filename;
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                try { document.body.removeChild(a); } catch (_) { /* ignore */ }
                setTimeout(function () {
                    try { URL.revokeObjectURL(u); } catch (_) { /* ignore */ }
                }, 2000);
            })
            .catch(function () {
                /* data: URLs — fallback via anchor */
                try {
                    var a2 = document.createElement('a');
                    a2.href = url;
                    a2.download = filename;
                    document.body.appendChild(a2);
                    a2.click();
                    document.body.removeChild(a2);
                } catch (_) { /* ignore */ }
            });
    }

    function openLightbox(tick) {
        if (!tick) return;
        var el = ensureLightbox();
        el._tick = tick;
        var title = el.querySelector('.ax-anpr-snap-lb-title');
        var img = el.querySelector('.ax-anpr-lb-scene');
        var plateImg = el.querySelector('.ax-anpr-lb-plate-img');
        var plate = el.querySelector('.ax-anpr-lb-plate');
        var list = el.querySelector('.ax-anpr-lb-list');
        var when = el.querySelector('.ax-anpr-lb-when');
        var bwc = el.querySelector('.ax-anpr-lb-bwc');
        if (title) {
            title.textContent = tr('analytics.anpr.liveSnapTitle', 'Vehicle snap') +
                ' \u00B7 ' + (tick.plate || tick.vehicleLabel || '\u2014');
        }
        var sceneUrl = railPrimaryUrl(tick);
        if (img) {
            if (sceneUrl) {
                img.src = sceneUrl;
                img.hidden = false;
            } else {
                img.removeAttribute('src');
                img.hidden = true;
            }
        }
        if (plateImg) {
            if (tick.cropUrl && tick.vehicleUrl) {
                plateImg.src = tick.cropUrl;
                plateImg.hidden = false;
            } else {
                plateImg.removeAttribute('src');
                plateImg.hidden = true;
            }
        }
        if (plate) {
            plate.textContent = tick.unclear
                ? (tr('analytics.anpr.unclear', 'Unclear / Manual Review'))
                : (tr('analytics.anpr.liveDetailPlate', 'Plate') + ': ' + (tick.plate || '\u2014'));
        }
        var mmrEl = el.querySelector('.ax-anpr-lb-mmr');
        if (mmrEl) {
            var ml = mmrLine(tick);
            mmrEl.textContent = ml
                ? (tr('analytics.anpr.liveDetailMmr', 'Vehicle') + ': ' + ml)
                : '';
            mmrEl.hidden = !ml;
        }
        if (list) list.textContent = tr('analytics.anpr.liveDetailList', 'List') + ': ' + listLabel(tick);
        if (when) when.textContent = tr('analytics.anpr.liveDetailWhen', 'When') + ': ' + formatWhen(tick.at);
        if (bwc) {
            var gps = '';
            if (tick.lat != null && tick.lon != null
                && isFinite(Number(tick.lat)) && isFinite(Number(tick.lon))) {
                gps = ' \u00B7 GPS ' + Number(tick.lat).toFixed(5) + ', ' + Number(tick.lon).toFixed(5);
            }
            bwc.textContent = tr('analytics.anpr.liveDetailCam', 'Camera') + ': ' +
                (tick.deviceLabel || tick.camId || '\u2014') + gps;
        }
        el.hidden = false;
    }

    function openHistoryDetail(tick) {
        openLightbox(tick);
    }

    /**
     * ANPR-LIVE-FR-GLOBAL-ALERT-V1 — Live plate-list hits enter the SAME FrAlarm
     * triage pipeline as fr-blacklist-hit (HQ bar + toast + Ack/Dismiss/Keep + map/PiP).
     * Offline Match (isLive:false / source offline) must NOT call this.
     */
    function anprHitToFrAlarmPayload(hit) {
        if (!hit) return null;
        var st = String(hit.listStatus || (hit.listMatch && hit.listMatch.listStatus) || '').toLowerCase();
        var tier = (st === 'suspicious' || st === 'suspect') ? 'medium' : 'high';
        var listStatus = (st === 'wanted') ? 'blacklist' : (st || 'blacklist');
        var conf = Number(hit.confidence);
        var scorePct = Number.isFinite(conf)
            ? Math.round((conf <= 1 ? conf * 100 : conf))
            : 90;
        if (scorePct < 75 && tier === 'high') scorePct = 90;
        return {
            hitId: hit.hitId || ('anprhit_' + Date.now()),
            camId: hit.camId,
            deviceLabel: hit.deviceLabel || hit.camId,
            displayName: hit.displayName || hit.plate || 'Plate hit',
            plate: hit.plate || null,
            blacklistId: hit.listId || hit.blacklistId || null,
            listId: hit.listId || null,
            listStatus: listStatus,
            alertTier: tier,
            reasonCode: hit.reasonCode || '',
            scorePct: scorePct,
            lat: hit.lat,
            lon: hit.lon,
            gpsAt: hit.gpsAt || hit.at,
            at: hit.at,
            source: 'live',
            isLive: true,
            kind: 'anpr',
            anpr: true,
            cropUrl: hit.vehicleUrl || hit.cropUrl || null,
            photoUrl: hit.cropUrl || hit.vehicleUrl || null,
            vehicleUrl: hit.vehicleUrl || null,
        };
    }

    function promoteLiveAnprHit(hit) {
        if (!hit) return;
        if (hit.isLive === false || isOfflineAnprSource(hit)) return;
        if (hit.isLive !== true && String(hit.source || '').toLowerCase() !== 'live') return;
        var frHit = anprHitToFrAlarmPayload(hit);
        if (!frHit) return;
        try {
            if (global.FrAlarm && typeof FrAlarm.onHit === 'function') {
                FrAlarm.onHit(frHit);
                return;
            }
            if (global.FrAlarm && typeof FrAlarm.showHit === 'function') {
                FrAlarm.showHit(frHit);
            }
        } catch (_) { /* ignore */ }
    }

    function setHitBar(hit) {
        /* Local triage bar removed from Live tiles — FrAlarm toast/drawer owns Ack/Dismiss/Keep.
           Keep lastHit only for rail/lightbox context; never inject buttons into the video wall. */
        var bar = document.getElementById('ax-anpr-live-hit-bar');
        if (bar) {
            bar.hidden = true;
            bar.setAttribute('aria-hidden', 'true');
            bar.className = 'ax-anpr-live-hit-bar';
        }
        lastHit = hit || null;
    }

    function showToast(hit) {
        var el = document.getElementById('ax-anpr-live-toast');
        if (!el || !hit) return;
        el.hidden = false;
        el.innerHTML = '<strong>' + esc(hit.plate || '') + '</strong>' +
            esc(String(hit.listStatus || 'hit').toUpperCase()) + ' \u00B7 ' +
            esc(hit.displayName || hit.deviceLabel || hit.camId || '');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.hidden = true;
        }, 8000);
    }

    function flashCam(camId) {
        camId = normalizeCamId(camId);
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i] !== camId) continue;
            var tile = tileEl(i);
            if (!tile) continue;
            tile.classList.add('is-hit');
            (function (t) {
                setTimeout(function () {
                    try { t.classList.remove('is-hit'); } catch (_) { /* ignore */ }
                }, 4000);
            })(tile);
        }
    }

    function onCropTick(tick) {
        if (!tick) return;
        /* DATA FIREWALL — Live tab ignores offline captures */
        if (String(tick.source || '').toLowerCase() === 'offline') return;
        if (isOfflineAnprSource(tick)) return;
        pushRail(Object.assign({}, tick, { source: tick.source || 'live', isLive: true }));
        if (tick.listMatch) {
            setHitBar({
                plate: tick.plate,
                listStatus: tick.listMatch.listStatus,
                displayName: tick.listMatch.displayName,
                deviceLabel: tick.deviceLabel,
                camId: tick.camId,
                at: tick.at,
                hitId: null,
            });
        }
    }

    function onListHit(hit) {
        if (!hit) return;
        /* DATA FIREWALL — Live tab ignores offline captures */
        if (String(hit.source || '').toLowerCase() === 'offline') return;
        if (isOfflineAnprSource(hit)) return;
        setHitBar(hit);
        pushRail(Object.assign({}, hit, { isLive: true, source: hit.source || 'live' }));
        flashCam(hit.camId);
        promoteLiveAnprHit(Object.assign({}, hit, { isLive: true, source: hit.source || 'live' }));
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
            var camId = normalizeCamId(data.camId);
            streamingCams[camId] = true;
            if (data.wvpVideoHandoff && data.flvUrl) {
                attachWvpHandoffFlvForCam(camId, data.flvUrl);
                return;
            }
            var slot = findSlotByCamId(camId);
            if (slot >= 0 && !players[slot]) {
                attachPlayer(slot, camId);
            }
        });
        sock.on('video-stream-error', function (data) {
            if (!data || !data.camId || !watching) return;
            if (data.surface && data.surface !== SURFACE) return;
            var camId = normalizeCamId(data.camId);
            var stateKey = parseStreamError(data);
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId) {
                    clearSignalTimer(i);
                    destroyPlayer(i);
                    setTileMeta(i, camId, stateKey);
                }
            }
            updateMeta();
            renderRoster();
        });
        sock.on('anpr-crop-tick', onCropTick);
        sock.on('anpr-list-hit', onListHit);
    }

    function bindUi() {
        var startBtn = document.getElementById('ax-anpr-live-start');
        var stopAllBtn = document.getElementById('ax-anpr-live-stop-all');
        var search = document.getElementById('ax-anpr-live-search');
        var list = document.getElementById('ax-anpr-live-roster-list');
        var railHost = document.getElementById('ax-anpr-live-rail');
        var liveClear = document.getElementById('ax-anpr-live-rail-clear');
        var offlineClear = document.getElementById('ax-anpr-offline-rail-clear');
        if (liveClear && !liveClear._anprClearBound) {
            liveClear._anprClearBound = true;
            liveClear.addEventListener('click', function () { clearUiRail('live'); });
        }
        if (offlineClear && !offlineClear._anprClearBound) {
            offlineClear._anprClearBound = true;
            offlineClear.addEventListener('click', function () { clearUiRail('offline'); });
        }
        if (startBtn) startBtn.addEventListener('click', startWatch);
        if (stopAllBtn) stopAllBtn.addEventListener('click', stopAllWatch);
        var tilesHost = document.querySelector('#ax-panel-anpr .ax-anpr-live-tiles');
        if (tilesHost && !tilesHost._anprFocusBound) {
            tilesHost._anprFocusBound = true;
            tilesHost.addEventListener('click', function (ev) {
                var tile = ev.target && ev.target.closest
                    ? ev.target.closest('.ax-anpr-live-tile[data-anpr-slot]')
                    : null;
                if (!tile) return;
                if (ev.target && ev.target.closest
                    && (ev.target.closest('.ax-anpr-live-tile-stop')
                        || ev.target.closest('.ax-anpr-live-pip-bar'))) {
                    return;
                }
                var s = parseInt(tile.getAttribute('data-anpr-slot'), 10);
                if (isFinite(s)) focusedSlot = s;
            });
        }
        if (search) search.addEventListener('input', renderRoster);
        if (list) {
            list.addEventListener('change', function (ev) {
                var t = ev.target;
                if (!t || !t.getAttribute) return;
                var cam = t.getAttribute('data-anpr-cam');
                if (!cam) return;
                toggleSelect(cam, !!t.checked);
            });
        }
        if (railHost && !railHost._anprRailBound) {
            railHost._anprRailBound = true;
            railHost.addEventListener('click', function (ev) {
                var mag = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-open]')
                    : null;
                if (mag) {
                    ev.preventDefault();
                    openAnprModal(mag.getAttribute('data-anpr-open'), mag.getAttribute('data-anpr-rail-scope') || 'live');
                    return;
                }
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-rail'), 10);
                if (!isFinite(idx)) return;
                openAnprModal(idx, card.getAttribute('data-anpr-rail-scope') || 'live');
            });
            railHost.addEventListener('dblclick', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                ev.preventDefault();
                var idx = parseInt(card.getAttribute('data-anpr-rail'), 10);
                if (!isFinite(idx)) return;
                openAnprModal(idx, card.getAttribute('data-anpr-rail-scope') || 'live');
            });
        }
        var offlineRailEl = document.getElementById('ax-anpr-offline-rail');
        if (offlineRailEl && !offlineRailEl._anprRailBound) {
            offlineRailEl._anprRailBound = true;
            offlineRailEl.addEventListener('click', function (ev) {
                var mag = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-open]')
                    : null;
                if (mag) {
                    ev.preventDefault();
                    openAnprModal(mag.getAttribute('data-anpr-open'), mag.getAttribute('data-anpr-rail-scope') || 'offline');
                    return;
                }
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-rail'), 10);
                if (!isFinite(idx)) return;
                openAnprModal(idx, card.getAttribute('data-anpr-rail-scope') || 'offline');
            });
            offlineRailEl.addEventListener('dblclick', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                ev.preventDefault();
                var idx = parseInt(card.getAttribute('data-anpr-rail'), 10);
                if (!isFinite(idx)) return;
                openAnprModal(idx, card.getAttribute('data-anpr-rail-scope') || 'offline');
            });
        }
        var hitRow = document.getElementById('ax-anpr-offline-hit-row');
        if (hitRow && !hitRow._anprHitBound) {
            hitRow._anprHitBound = true;
            hitRow.addEventListener('click', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-hit]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-hit'), 10);
                if (!isFinite(idx) || !hitRail[idx]) return;
                openLightbox(hitRail[idx]);
            });
        }
    }

    function onShow() {
        if (!uiBound) {
            bindUi();
            uiBound = true;
        }
        bindSocket();
        startFleetPolling();
        if (!socketBound) {
            var n = 0;
            var iv = setInterval(function () {
                bindSocket();
                if (socketBound || ++n > 40) clearInterval(iv);
            }, 100);
        }
        refreshEmptyTileHints();
        renderRail();
        paintHitSlots();
        updateMeta();
        renderRoster();
    }

    function onHide() {
        stopFleetPolling();
    }

    global.addEventListener('beforeunload', function () {
        if (watching) stopWatch();
    });

    global.AnprLiveWatch = {
        onShow: onShow,
        onHide: onHide,
        stop: stopFocusedSlot,
        stopAll: stopAllWatch,
        stopWatchSession: stopWatch,
        pushRail: pushRail,
        renderRail: renderRail,
        paintHitSlots: paintHitSlots,
        openAnprModal: openAnprModal,
        clearUiRail: clearUiRail,
        openHistoryDetail: openHistoryDetail,
        MAX_WATCH: MAX_WATCH,
        LIVE_SLOTS: LIVE_SLOTS,
    };
    global.openAnprModal = function (idx, scope) {
        return openAnprModal(idx, scope);
    };
})(typeof window !== 'undefined' ? window : this);
