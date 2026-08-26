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
    /** Critical Watchlist Alerts banner — top 3 most recent hits. */
    var CRITICAL_ALERT_MAX = 3;
    var ROTATE_MS = 20000;
    var TILE_SIGNAL_LOST_MS = 15000;
    /** FLV / Player unavailable → background reconnect (not permanent lock). */
    var PLAYER_RECOVER_MS = 3000;
    /** While Live tab open — ping sidecar health every 5s. */
    var HEALTH_POLL_MS = 5000;
    /* ANPR-ENGINE-BADGE-STABLE-V1 — need N consecutive fails before Off (sticky OK). */
    var HEALTH_FAIL_NEED = 3;
    var healthFailStreak = 0;
    var healthLastKind = '';

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
    var tileRecoverTimers = [];
    var tileSignalRetried = Object.create(null);
    var healthPollTimer = null;
    var socketBound = false;
    var liveRail = [];
    var offlineRail = [];
    /** Offline Match blacklist / suspect hit strip (separate from Recent Plates). */
    var hitRail = [];
    var HIT_RAIL_MAX = 40;
    /** Critical Watchlist Alerts — Live vs Offline (max CRITICAL_ALERT_MAX each). */
    var liveCriticalAlerts = [];
    var offlineCriticalAlerts = [];
    var lastHit = null;
    var toastTimer = null;
    var fleetPollTimer = null;
    var FLEET_POLL_MS = 3000;
    var uiBound = false;
    var focusedSlot = 0;
    var expandedTileId = null; // click-to-expand (null = 4-grid)
    var presenceUnsub = null;

    for (var si = 0; si < LIVE_SLOTS; si++) {
        slotCam[si] = null;
        players[si] = null;
        pipPlayers[si] = null;
        pipMinimized[si] = false;
        pipSwapped[si] = false;
        tileSignalTimers[si] = null;
        tileRecoverTimers[si] = null;
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

    function applyAnprTileExpand() {
        var grid = document.querySelector('#ax-panel-anpr .ax-anpr-live-tiles');
        if (!grid) return;
        grid.classList.toggle('is-tile-expanded', !!expandedTileId);
        grid.querySelectorAll('.ax-anpr-live-tile').forEach(function (tile) {
            var id = tile.getAttribute('data-tile-id')
                || ('anpr-' + tile.getAttribute('data-anpr-slot'));
            var isExp = expandedTileId != null && id === expandedTileId;
            tile.classList.toggle('is-expanded', isExp);
            tile.classList.toggle('is-expanded-hidden', !!(expandedTileId && !isExp));
        });
    }

    function toggleAnprTileExpand(tileId) {
        expandedTileId = (expandedTileId === tileId) ? null : tileId;
        applyAnprTileExpand();
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
                return tr('analytics.fr.tileWaiting', 'Waiting…');
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
                return tr('analytics.fr.tileWaiting', 'Waiting…');
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
        /* Remove from watch set + stop this quadrant — do NOT auto-refill (re-armed BWC/OCR). */
        var idx = selected.indexOf(normalizeCamId(camId));
        if (idx >= 0) selected.splice(idx, 1);
        stopSlot(slot, true);
        if (watching) {
            emitWatchSlots();
            if (!selected.length) {
                stopWatch();
            }
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
                label.textContent = String(slot + 1) + '  ' + name;
                label.title = String(camId);
            } else {
                label.textContent = String(slot + 1);
                label.removeAttribute('title');
            }
            label.style.display = '';
        }
        if (camId && stateKey) {
            ph.textContent = tileStatusText(stateKey);
            ph.hidden = stateKey === TILE_STATE.LIVE;
            if (stateKey === TILE_STATE.LIVE) {
                ph.style.display = 'none';
            } else {
                ph.style.display = '';
            }
        } else if (!camId) {
            stateKey = watching ? TILE_STATE.WAITING : TILE_STATE.IDLE;
            ph.textContent = tileStatusText(stateKey);
            ph.hidden = false;
            ph.style.display = '';
            if (label) label.style.display = '';
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

    function clearRecoverTimer(slot) {
        if (tileRecoverTimers[slot]) {
            clearTimeout(tileRecoverTimers[slot]);
            tileRecoverTimers[slot] = null;
        }
    }

    /**
     * Auto-recover after FLV / Player unavailable — retry in background after 3s
     * instead of locking the tile permanently.
     */
    function schedulePlayerRecover(slot, camId, reason) {
        camId = normalizeCamId(camId);
        if (!watching || !camId || slotCam[slot] !== camId) return;
        clearRecoverTimer(slot);
        tileRecoverTimers[slot] = setTimeout(function () {
            tileRecoverTimers[slot] = null;
            if (!watching || slotCam[slot] !== camId) return;
            clearSignalRetry(slot, camId);
            delete wvpHandoffSlotInflight[slot];
            setTileMeta(slot, camId, TILE_STATE.CONNECTING);
            var sock = getSocket();
            if (sock) {
                try {
                    sock.emit('start-video', { camId: camId, mode: 'video', surface: SURFACE });
                } catch (_) { /* ignore */ }
            }
            destroyPlayer(slot);
            var flvUrl = getWvpHandoffFlvUrl(camId);
            if (flvUrl) {
                attachWvpHandoffFlvToSlot(slot, camId, flvUrl, { force: true });
            } else {
                attachPlayer(slot, camId);
            }
            startSignalTimer(slot, camId);
            try {
                console.log('[me8-flv] anpr auto-recover', {
                    slot: slot,
                    camId: camId,
                    reason: reason || 'player-error',
                });
            } catch (_) { /* ignore */ }
        }, PLAYER_RECOVER_MS);
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

    function attachWvpHandoffFlvToSlot(slot, camId, flvUrl, opts) {
        opts = opts || {};
        if (typeof slot !== 'number' || slot < 0 || slot >= LIVE_SLOTS || !camId || !flvUrl) return false;
        camId = normalizeCamId(camId);
        flvUrl = String(flvUrl);
        if (!global.Me8LivePlayerFactory
            || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return false;
        }
        var tile = tileEl(slot);
        if (!tile || !watching) return false;
        var force = !!opts.force;
        var inflight = wvpHandoffSlotInflight[slot];
        if (!force && inflight && inflight.camId === camId && inflight.flvUrl === flvUrl) {
            return true;
        }
        var existing = players[slot];
        if (!force && existing && normalizeCamId(slotCam[slot]) === camId && handoffPlayerAttaching(existing)) {
            return true;
        }
        if (!force && existing && normalizeCamId(slotCam[slot]) === camId && tile.classList.contains('is-live')
            && tile.querySelector('video.me8-zlm-primary')
            && !tile.classList.contains('is-tile-error')) {
            return true;
        }
        clearRecoverTimer(slot);
        destroyPlayer(slot);
        setTileMeta(slot, camId, TILE_STATE.CONNECTING);
        startSignalTimer(slot, camId);
        wvpHandoffSlotInflight[slot] = { camId: camId, flvUrl: flvUrl, at: Date.now() };
        console.log('[me8-flv] anpr attach once', { slot: slot, camId: camId, url: flvUrl, force: force });
        var handle = global.Me8LivePlayerFactory.attachFlvPrimary(tile, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            onProven: function () {
                delete wvpHandoffSlotInflight[slot];
                if (normalizeCamId(slotCam[slot]) !== camId) return;
                clearSignalTimer(slot);
                clearSignalRetry(slot, camId);
                clearRecoverTimer(slot);
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
                schedulePlayerRecover(slot, camId, 'flv-onFail');
            },
            onVideoFrame: function () {
                clearSignalTimer(slot);
                if (camId) clearSignalRetry(slot, camId);
            },
        });
        if (!handle) {
            delete wvpHandoffSlotInflight[slot];
            console.log('[me8-flv] anpr attach fail', { camId: camId, url: flvUrl, reason: 'attachFlvPrimary_null' });
            setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
            schedulePlayerRecover(slot, camId, 'attachFlvPrimary_null');
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
        // Tile FLV is live → WVP active map is warm. Re-emit so Fleet POSTs /watch/start
        // (first emitWatchSlots often races before ensurePlay finishes). No WVP API calls here.
        if (watching) emitWatchSlots();
    }

    function attachPlayer(slot, camId) {
        var tile = tileEl(slot);
        if (!tile || !camId || typeof JSMpeg === 'undefined') {
            setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
            if (camId) schedulePlayerRecover(slot, camId, 'jsmpeg-missing');
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
            schedulePlayerRecover(slot, camId, 'jsmpeg-exception');
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
        clearRecoverTimer(slot);
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
        var ids = watching ? activeSlotCams() : [];
        // Per-cam FLV the tile already holds (handoff). Multi-BWC: one URL per camId — not a hardcode.
        var flvByCam = {};
        for (var i = 0; i < ids.length; i++) {
            var cid = ids[i];
            var u = getWvpHandoffFlvUrl(cid);
            if (u) flvByCam[cid] = String(u);
        }
        sock.emit('anpr-watch-slots', { camIds: ids, flvByCam: flvByCam });
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

    function groupColorForDevice(camId, mapGroup) {
        var lk = global.dispatchGroupLookup || {};
        if (camId && lk.byDevice && lk.byDevice[camId] && lk.byDevice[camId].color) {
            return lk.byDevice[camId].color;
        }
        var gk = String(mapGroup || '').toLowerCase();
        if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
            return lk.byName[gk].color;
        }
        return '#64748b';
    }

    function deviceMapGroup(d) {
        return String((d && (d.mapGroup || d.group)) || '').trim();
    }

    function renderRoster() {
        var host = document.getElementById('ax-anpr-live-roster-list');
        if (!host) return;
        var qEl = document.getElementById('ax-anpr-live-search');
        var q = qEl ? String(qEl.value || '').trim().toLowerCase() : '';
        var rows = fleet.filter(function (d) {
            if (!d || !d.id) return false;
            if (!q) return true;
            var g = deviceMapGroup(d);
            var hay = (String(d.id) + ' ' + String(d.name || '') + ' ' + g).toLowerCase();
            return hay.indexOf(q) >= 0;
        });
        if (!rows.length) {
            host.innerHTML = '<div class="hint">' + esc(tr('analytics.anpr.liveNoBwc', 'No BWC devices')) + '</div>';
            return;
        }
        var byGroup = {};
        var ungrouped = [];
        rows.forEach(function (d) {
            var g = deviceMapGroup(d);
            if (!g) {
                ungrouped.push(d);
                return;
            }
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(d);
        });
        function rowHtml(d) {
            var id = normalizeCamId(d.id);
            var checked = selected.indexOf(id) >= 0;
            var onTile = findSlotByCamId(id) >= 0;
            var disableMore = !checked && selected.length >= MAX_WATCH;
            var pin = groupColorForDevice(id, deviceMapGroup(d));
            return '<label class="ax-anpr-live-roster-row' +
                (d.online ? '' : ' is-offline') +
                (onTile ? ' is-on-tile' : '') + '">' +
                '<input type="checkbox" data-anpr-cam="' + esc(id) + '"' +
                (checked ? ' checked' : '') +
                (disableMore || (!d.online && !checked) ? ' disabled' : '') + '>' +
                '<span class="ax-anpr-roster-pin" style="background:' + esc(pin) + '"></span>' +
                '<span>' + esc(d.name || id) + '</span>' +
                rosterBadgeHtml(id) + '</label>';
        }
        function groupBlock(gName, devices, color) {
            var online = 0;
            devices.forEach(function (d) { if (d && d.online) online += 1; });
            var html = '<div class="ax-anpr-roster-group">';
            html += '<div class="ax-anpr-roster-group-head">' +
                '<span class="ax-anpr-roster-group-dot" style="background:' + esc(color) + '"></span>' +
                '<span class="ax-anpr-roster-group-name">' + esc(gName) + '</span>' +
                '<span class="ax-anpr-roster-group-meta">' + esc(String(online) + '/' + String(devices.length) + ' online') +
                '</span></div>';
            devices.slice().sort(function (a, b) {
                return String(a.name || a.id).localeCompare(String(b.name || b.id));
            }).forEach(function (d) { html += rowHtml(d); });
            html += '</div>';
            return html;
        }
        var html = '';
        Object.keys(byGroup).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (gName) {
            html += groupBlock(gName, byGroup[gName], groupColorForDevice(null, gName));
        });
        if (ungrouped.length) {
            html += groupBlock(tr('fleet.groupUngrouped', 'Ungrouped'), ungrouped, '#64748b');
        }
        host.innerHTML = html;
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
                        mapGroup: d.mapGroup || d.group || '',
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
                        mapGroup: d.mapGroup || d.group || '',
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
                            mapGroup: d.mapGroup || '',
                        };
                    } else {
                        if (d.operatorName || d.nickname) {
                            byId[id].name = d.operatorName || d.nickname || byId[id].name;
                        }
                        if (d.mapGroup) {
                            byId[id].mapGroup = d.mapGroup;
                            byId[id].group = d.mapGroup;
                        }
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
                                group: d.group || d.mapGroup || '',
                                mapGroup: d.mapGroup || d.group || '',
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
            else stopSlot(i, true);
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

    function pad2(n) {
        n = Number(n) || 0;
        return n < 10 ? ('0' + n) : String(n);
    }

    /** Parse ISO / epoch → Date; prefer Z/offset so UTC payloads render in local TZ. */
    function parseWhenDate(at) {
        if (at == null || at === '') return null;
        if (typeof at === 'number' || /^\d+$/.test(String(at).trim())) {
            var dn = new Date(Number(at));
            return isNaN(dn.getTime()) ? null : dn;
        }
        var s = String(at).trim();
        if (!s) return null;
        /* Bare "YYYY-MM-DDTHH:MM:SS" from gmtime without Z — treat as UTC */
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) s += 'Z';
        var d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    /** Local wall clock YYYY-MM-DD HH:MM:SS (browser TZ, e.g. UTC+8). */
    function formatWhen(at) {
        var d = parseWhenDate(at);
        if (!d) {
            if (!at) return '\u2014';
            var raw = String(at);
            if (raw.length >= 19) return raw.slice(0, 19).replace('T', ' ');
            return raw || '\u2014';
        }
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
            ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }

    function formatWhenShort(at) {
        var d = parseWhenDate(at);
        if (!d) return formatWhen(at);
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }

    /** Full date + time for cards / lightbox — always local TZ. */
    function formatWhenFull(at) {
        return formatWhen(at);
    }

    /** Backend may send `time` instead of / in addition to `at`. */
    function captureWhenRaw(t) {
        if (!t) return null;
        return t.at || t.time || t.capturedAt || t.ts || null;
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

    /** Watchlist / blacklist hit → Critical Alerts banner (not plain Recent Plates only). */
    function isWatchlistHit(tick) {
        if (!tick) return false;
        if (tick.isWatchlistHit === true || tick.isBlacklist === true) return true;
        var st = String(listStatusOf(tick) || '').toLowerCase().replace(/[^a-z]/g, '');
        return st === 'blacklist' || st === 'wanted' || st === 'suspicious' || st === 'watchlist';
    }

    function hitSlotsContainer() {
        return document.getElementById('blacklist-hits-container')
            || document.getElementById('ax-anpr-offline-hit-row');
    }

    function railPrimaryUrl(t) {
        if (!t) return null;
        /* Macro preferred (contract + legacy keys); fall back to plate crop */
        if (t.macroCropUrl) return t.macroCropUrl;
        if (t.vehicleUrl) return t.vehicleUrl;
        if (t.sceneUrl) return t.sceneUrl;
        if (t.microCropUrl) return t.microCropUrl;
        if (t.cropUrl) return t.cropUrl;
        return null;
    }

    function railPlateUrl(t) {
        if (!t) return null;
        return t.microCropUrl || t.cropUrl || t.plateUrl || null;
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
        var whenRaw = captureWhenRaw(tick) || (prev && prev.at) || null;
        /* plate_text = OCR only; never invent from camera metadata */
        var plateVal = (tick.plate_text != null && String(tick.plate_text).trim())
            ? String(tick.plate_text).trim()
            : ((tick.plateText != null && String(tick.plateText).trim())
                ? String(tick.plateText).trim()
                : (prev && (prev.plate_text || prev.plateText)) || null);
        var macroVal = tick.macroCropUrl || tick.vehicleUrl || tick.sceneUrl
            || (prev && (prev.macroCropUrl || prev.vehicleUrl)) || null;
        var microVal = tick.microCropUrl || tick.cropUrl || tick.plateUrl
            || (prev && (prev.microCropUrl || prev.cropUrl)) || null;
        var camIdVal = tick.camera_id || tick.camId
            || (prev && (prev.camera_id || prev.camId)) || null;
        var bwcVal = tick.device_name || tick.deviceName || tick.deviceLabel || tick.bwcUser
            || (prev && (prev.device_name || prev.deviceLabel || prev.bwcUser)) || null;
        return {
            id: tick.id || tick.hitId || tick.frameUuid || (prev && prev.id)
                || ('anpr_' + String(camIdVal || 'cam') + '_' + Date.now()),
            plate: plateVal,
            plate_text: plateVal,
            plateText: plateVal,
            plateCompact: tick.plateCompact || (prev && prev.plateCompact) || null,
            rawText: tick.rawText || (prev && prev.rawText) || null,
            vehicleUrl: macroVal,
            cropUrl: microVal,
            macroCropUrl: macroVal,
            microCropUrl: microVal,
            vehicleLabel: tick.vehicleLabel || null,
            listMatch: tick.listMatch || null,
            listStatus: tick.listStatus || (tick.listMatch && tick.listMatch.listStatus) || null,
            displayName: tick.displayName || (tick.listMatch && tick.listMatch.displayName) || null,
            camera_id: camIdVal,
            camId: camIdVal,
            device_name: bwcVal,
            deviceLabel: bwcVal,
            bwcUser: bwcVal,
            at: whenRaw,
            time: whenRaw,
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
            isWatchlistHit: !!(tick.isWatchlistHit || (tick.listMatch && tick.listMatch.id)
                || (prev && prev.isWatchlistHit)),
            hitId: tick.hitId || (prev && prev.hitId) || null,
            confidence: tick.confidence != null ? tick.confidence : (prev && prev.confidence),
            listId: tick.listId || (prev && prev.listId) || null,
            dwellSeconds: tick.dwellSeconds != null ? tick.dwellSeconds
                : (prev && prev.dwellSeconds != null ? prev.dwellSeconds : 0),
            isUpdate: !!tick.isUpdate,
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
        /* Accept contract + legacy keys — never drop a valid capture */
        if (!tick.vehicleUrl && !tick.macroCropUrl && !tick.cropUrl && !tick.microCropUrl
            && !tick.plate && !tick.plateText && !tick.plateCompact) return;

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
        var watchHit = isWatchlistHit(tick);

        if (tick.trackId != null) {
            for (var ri = 0; ri < bucket.length; ri++) {
                if (bucket[ri] && bucket[ri].trackId === tick.trackId) {
                    bucket[ri] = copyRailTick(tick, bucket[ri]);
                    renderRail(false);
                    if (offline && (watchHit || listStatusOf(bucket[ri]))) {
                        pushHitSlot(bucket[ri]);
                    } else if (!offline && watchHit) {
                        pushCriticalAlert(bucket[ri], false);
                    }
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
        /* Offline watchlist hits → bottom #blacklist-hits-container only (no rail banner) */
        if (offline && (watchHit || listStatusOf(tick))) pushHitSlot(tick);
        else if (!offline && watchHit) pushCriticalAlert(tick, false);
    }

    function pushCriticalAlert(tick, offline) {
        /* Offline rail banner removed — hits use #blacklist-hits-container only */
        if (offline) {
            pushHitSlot(tick);
            return;
        }
        if (!tick || !isWatchlistHit(tick)) return;
        var bucket = liveCriticalAlerts;
        var copy = copyRailTick(tick, null);
        if (tick.trackId != null) {
            for (var i = 0; i < bucket.length; i++) {
                if (bucket[i] && bucket[i].trackId === tick.trackId) {
                    bucket[i] = copy;
                    liveCriticalAlerts = bucket;
                    paintCriticalAlerts();
                    return;
                }
            }
        }
        bucket.unshift(copy);
        while (bucket.length > CRITICAL_ALERT_MAX) bucket.pop();
        liveCriticalAlerts = bucket;
        paintCriticalAlerts();
    }

    function paintCriticalAlertCard(t, idx, scope) {
        var st = listStatusOf(t) || 'watchlist';
        var thumb = railPlateUrl(t) || railPrimaryUrl(t) || '';
        var plate = t.plate || tr('analytics.anpr.liveRailNoText', 'No plate');
        var meta = String(st).toUpperCase() + ' \u00B7 ' + (formatWhenShort(t.at) || '\u2014');
        return (
            '<div class="ax-anpr-critical-alert-card" role="listitem" data-anpr-critical="' + idx +
            '" data-anpr-critical-scope="' + esc(scope) + '" title="' +
            esc(tr('analytics.anpr.liveRailExpandHint', 'Open evidence')) + '">' +
            (thumb
                ? '<img class="ax-anpr-critical-alert-thumb" src="' + esc(thumb) + '" alt="">'
                : '<span class="ax-anpr-critical-alert-thumb" aria-hidden="true"></span>') +
            '<div class="ax-anpr-critical-alert-body">' +
            '<div class="ax-anpr-critical-alert-plate">' + esc(plate) + '</div>' +
            '<div class="ax-anpr-critical-alert-meta">' + esc(meta) + '</div>' +
            '</div>' +
            '<button type="button" class="ax-anpr-critical-alert-x" data-anpr-critical-dismiss="' + idx +
            '" data-anpr-critical-scope="' + esc(scope) + '" title="Dismiss" aria-label="Dismiss">&times;</button>' +
            '</div>'
        );
    }

    function paintCriticalAlerts() {
        /* Live tab only — Offline has no rail watchlist banner */
        paintOneCriticalList(
            document.getElementById('critical-alerts-container'),
            document.getElementById('active-alerts-list'),
            document.getElementById('alert-count-badge'),
            liveCriticalAlerts,
            'live'
        );
        paintSubnavWatchBadge();
    }

    function paintSubnavWatchBadge() {
        var badge = document.getElementById('ax-anpr-subnav-watch-badge');
        if (!badge) return;
        /* Live only — Offline / Snapshot / History / Lists never show this badge.
           Offline hits belong in #blacklist-hits-container only. */
        var livePanel = document.getElementById('ax-anpr-sub-live-panel');
        var onLive = !!(livePanel && !livePanel.hidden);
        if (!onLive) {
            badge.hidden = true;
            badge.setAttribute('hidden', '');
            badge.setAttribute('aria-hidden', 'true');
            badge.classList.remove('is-active');
            return;
        }
        badge.hidden = false;
        badge.removeAttribute('hidden');
        badge.setAttribute('aria-hidden', 'false');
        /* Live critical only — never mix Offline hitRail into "Watchlist" */
        var n = liveCriticalAlerts ? liveCriticalAlerts.length : 0;
        badge.textContent = String(n) + ' Active Watchlist Hits';
        if (n > 0) badge.classList.add('is-active');
        else badge.classList.remove('is-active');
    }

    /** Called from analytics-hub on ANPR sub-tab switch. */
    function syncSubnavWatchBadge() {
        paintSubnavWatchBadge();
    }

    function paintOneCriticalList(containerEl, listEl, badgeEl, alerts, scope) {
        var n = Array.isArray(alerts) ? Math.min(alerts.length, CRITICAL_ALERT_MAX) : 0;
        if (badgeEl) badgeEl.textContent = String(n) + ' ACTIVE';
        if (containerEl) {
            if (n > 0) {
                containerEl.hidden = false;
                containerEl.classList.remove('is-collapsed');
                containerEl.removeAttribute('hidden');
                containerEl.style.display = '';
            } else {
                /* Collapse completely — Recent Plates sits at top of rail */
                containerEl.hidden = true;
                containerEl.classList.add('is-collapsed');
                containerEl.setAttribute('hidden', '');
                containerEl.style.display = 'none';
            }
        }
        if (!listEl) return;
        if (!n) {
            listEl.innerHTML = '';
            return;
        }
        var html = '';
        for (var i = 0; i < n; i++) {
            if (!alerts[i]) continue;
            html += paintCriticalAlertCard(alerts[i], i, scope);
        }
        listEl.innerHTML = html;
    }

    function dismissCriticalAlert(scope, idx) {
        if (scope === 'offline') return;
        var bucket = liveCriticalAlerts;
        var i = parseInt(idx, 10);
        if (!isFinite(i) || i < 0 || i >= bucket.length) return;
        bucket.splice(i, 1);
        liveCriticalAlerts = bucket;
        paintCriticalAlerts();
    }

    function clearCriticalAlerts(scope) {
        if (scope === 'offline') {
            hitRail = [];
            paintHitSlots();
            paintSubnavWatchBadge();
            return;
        }
        liveCriticalAlerts = [];
        paintCriticalAlerts();
    }

    function pushHitSlot(tick) {
        if (!tick || !listStatusOf(tick)) return;
        /* Hit strip is Offline Match only */
        if (!isOfflineAnprSource(tick)) return;
        hitRail.unshift(copyRailTick(tick, null));
        if (hitRail.length > HIT_RAIL_MAX) hitRail = hitRail.slice(0, HIT_RAIL_MAX);
        paintHitSlots();
    }

    function blacklistHitSkeletonHtml() {
        var cell = '<div class="ax-anpr-offline-hit-skel" role="status">Awaiting Hit</div>';
        return '<div class="ax-anpr-offline-hit-skel-row">' + cell + cell + cell + '</div>';
    }

    function paintHitSlots() {
        var row = hitSlotsContainer();
        if (!row) return;
        if (!Array.isArray(hitRail) || hitRail.length === 0) {
            row.innerHTML = blacklistHitSkeletonHtml();
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
        paintCriticalAlerts();
        paintHitSlots();
    }

    function captureImagePath(t) {
        return railPrimaryUrl(t) || '';
    }

    /* UI confidence floor for plate_text display (payload field only — no string heuristics) */
    var PLATE_TEXT_CONF_FLOOR = 0.25;

    /** Card title / overlay: bind ONLY to event.plate_text (OCR). Empty / low conf → UNKNOWN. */
    function capturePlateText(t) {
        if (!t) return 'UNKNOWN';
        var text = t.plate_text != null ? t.plate_text : t.plateText;
        if (text == null || !String(text).trim()) return 'UNKNOWN';
        var conf = t.confidence != null ? Number(t.confidence) : null;
        if (conf != null && isFinite(conf) && conf < PLATE_TEXT_CONF_FLOOR) return 'UNKNOWN';
        return String(text).trim();
    }

    function captureMacroUrl(t) {
        if (!t) return '';
        return t.macroCropUrl || t.vehicleUrl || t.sceneUrl || t.microCropUrl || t.cropUrl || '';
    }

    function captureMicroUrl(t) {
        if (!t) return '';
        return t.microCropUrl || t.cropUrl || t.plateUrl || t.macroCropUrl || t.vehicleUrl || '';
    }

    /** Metadata only — camera_id / device_name (any characters OK). Never use plate_text. */
    function captureBwcUser(t) {
        if (!t) return '\u2014';
        return String(
            t.device_name || t.deviceName || t.deviceLabel || t.bwcUser
            || t.camera_id || t.cameraId || t.camId || '\u2014'
        );
    }

    /** Designated BWC metadata badge: device_name · camera_id */
    function captureBwcBadge(t) {
        if (!t) return '\u2014';
        var name = String(
            t.device_name || t.deviceName || t.deviceLabel || t.bwcUser || ''
        ).trim();
        var cam = String(t.camera_id || t.cameraId || t.camId || '').trim();
        if (name && cam && name.toLowerCase() !== cam.toLowerCase()) {
            return name + ' \u00B7 ' + cam;
        }
        return name || cam || '\u2014';
    }

    function captureIdOf(t) {
        if (!t) return '';
        return String(t.id || t.hitId || t.frameUuid || '').trim();
    }

    function captureWhenDisplay(t, shortForm) {
        var raw = captureWhenRaw(t);
        /* Cards + lightbox: always prefer full date+time (operator mandate) */
        if (!shortForm) return formatWhenFull(raw);
        return formatWhenFull(raw);
    }

    function captureGpsLine(t) {
        if (!t) return '';
        if (t.lat == null || t.lon == null) return '';
        if (!isFinite(Number(t.lat)) || !isFinite(Number(t.lon))) return '';
        return Number(t.lat).toFixed(5) + ', ' + Number(t.lon).toFixed(5);
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

    function formatDwellLabel(sec) {
        sec = Math.max(0, Math.floor(Number(sec) || 0));
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        var ss = (s < 10 ? '0' : '') + String(s);
        if (m >= 60) {
            var h = Math.floor(m / 60);
            m = m % 60;
            var mm = (m < 10 ? '0' : '') + String(m);
            return 'Tracked: ' + h + 'h ' + mm + 'm ' + ss + 's';
        }
        return 'Tracked: ' + m + 'm ' + ss + 's';
    }

    function plateMatchKey(t) {
        if (!t) return '';
        return String(t.plateCompact || t.plateText || t.plate || '')
            .replace(/[\s\-_.]/g, '')
            .toUpperCase();
    }

    /* ANPR-LIVE-MAG-OPEN-BY-INDEX-V1 — open key = grid index; stamp id on tick */
    function paintRailCardHtml(t, idx, scope) {
        var plateText = capturePlateText(t);
        var when = captureWhenDisplay(t, false);
        var macroUrl = captureMacroUrl(t);
        var microUrl = captureMicroUrl(t);
        var bwcBadge = captureBwcBadge(t);
        var isLive = captureSourceIsLive(t);
        var st = listStatusOf(t);
        var hitCls = st ? (' is-hit ' + gradeClass(st)) : '';
        var sourceBadge = isLive
            ? ('BWC: ' + bwcBadge)
            : 'OFFLINE MP4';
        var sc = scope === 'offline' ? 'offline' : 'live';
        var capId = captureIdOf(t);
        if (!capId) {
            capId = 'idx_' + sc + '_' + idx;
        }
        /* Stamp so findRailTick never orphans button ids */
        t.id = String(t.id || capId);
        if (!t.frameUuid && capId.indexOf('idx_') !== 0) t.frameUuid = capId;
        var macroHtml = macroUrl
            ? '<img src="' + esc(macroUrl) + '" class="ax-anpr-snap-macro-img" alt="Full Context" loading="lazy">'
            : '<span class="ax-anpr-snap-card-img-empty">\u2014</span>';
        var microHtml = microUrl
            ? '<img src="' + esc(microUrl) + '" class="ax-anpr-snap-micro-img" alt="Zoomed Plate Crop" loading="lazy">'
            : '<span class="ax-anpr-snap-card-img-empty">\u2014</span>';
        var dwellSec = Number(t.dwellSeconds) || 0;
        var dwellHtml = '';
        if (dwellSec > 0) {
            var dwellCls = dwellSec > 120 ? ' ax-anpr-dwell-badge is-long' : ' ax-anpr-dwell-badge';
            dwellHtml = '<span class="' + dwellCls.trim() + '" title="' +
                esc(formatDwellLabel(dwellSec)) + '">' + esc(formatDwellLabel(dwellSec)) + '</span>';
        }
        /* data-anpr-open = grid index (primary). capture-id kept as secondary. */
        return (
            '<div class="ax-anpr-snap-card' + hitCls + '" role="listitem" data-anpr-rail="' + idx +
            '" data-anpr-rail-scope="' + sc + '" data-anpr-capture-id="' + esc(capId) + '">' +
            '<div class="ax-anpr-snap-macro">' + macroHtml + '</div>' +
            '<button type="button" class="ax-anpr-rail-mag" data-anpr-open="' + idx +
            '" data-anpr-rail-scope="' + sc + '" data-anpr-capture-id="' + esc(capId) +
            '" data-anpr-rail-idx="' + idx + '" title="' +
            esc(tr('analytics.anpr.liveRailExpandHint', 'Open evidence')) + '" aria-label="' +
            esc(tr('analytics.anpr.liveRailExpandHint', 'Open evidence')) + '">' +
            '<svg class="ax-anpr-rail-mag-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>' +
            '</button>' +
            '<div class="ax-anpr-snap-micro">' + microHtml + '</div>' +
            '<div class="ax-anpr-snap-card-body">' +
            '<div class="ax-anpr-snap-card-row">' +
            '<span class="ax-anpr-snap-card-plate">' + mismatchIconHtml(t) + esc(plateText) + '</span>' +
            '<span class="ax-anpr-snap-bwc' + (isLive ? ' is-live' : ' is-offline') + '" title="' +
            esc(sourceBadge) + '">' +
            esc(sourceBadge) + '</span>' +
            '</div>' +
            dwellHtml +
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
            html += paintRailCardHtml(recentPlates[i], i, scope);
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
            /* Clear UI — Recent Plates only; bottom blacklist panel is separate */
            offlineRail = [];
            offlineCriticalAlerts = [];
        } else {
            /* Shift Reset — empty recentPlates + re-render skeletons */
            liveRail = [];
            liveCriticalAlerts = [];
        }
        renderRail(false);
    }

    /** ANPR-MAG-RAILBYSCOPE-FIX-V1 — was missing; every glass click crashed here */
    function railByScope(scope) {
        return scope === 'offline' ? offlineRail : liveRail;
    }

    function findRailTick(key, scope) {
        var sc = scope === 'offline' ? 'offline' : 'live';
        var raw = railByScope(sc) || [];
        var bucket = raw.filter(function (c) {
            if (!c) return false;
            if (sc === 'live') return !isOfflineAnprSource(c);
            return isOfflineAnprSource(c);
        });
        if (key == null || key === '') return null;
        var s = String(key).trim();
        var i;
        /* Index-first (ANPR-LIVE-MAG-OPEN-BY-INDEX-V1) */
        if (/^\d+$/.test(s)) {
            i = parseInt(s, 10);
            if (isFinite(i) && i >= 0 && bucket[i]) return bucket[i];
            if (isFinite(i) && i >= 0 && raw[i]) return raw[i];
        }
        var syn = /^idx_(live|offline)_(\d+)$/.exec(s);
        if (syn) {
            i = parseInt(syn[2], 10);
            if (isFinite(i) && i >= 0) return bucket[i] || raw[i] || null;
        }
        var j;
        for (j = 0; j < bucket.length; j++) {
            if (!bucket[j]) continue;
            if (captureIdOf(bucket[j]) === s
                || String(bucket[j].id || '') === s
                || String(bucket[j].hitId || '') === s
                || String(bucket[j].frameUuid || '') === s) {
                return bucket[j];
            }
        }
        for (j = 0; j < raw.length; j++) {
            if (!raw[j]) continue;
            if (captureIdOf(raw[j]) === s
                || String(raw[j].id || '') === s
                || String(raw[j].hitId || '') === s
                || String(raw[j].frameUuid || '') === s) {
                return raw[j];
            }
        }
        return null;
    }

    /** Prefer data-anpr-rail index from mag or card. */
    function openKeyFromRailEl(el) {
        if (!el || !el.getAttribute) return null;
        var card = el.closest ? el.closest('[data-anpr-rail]') : null;
        if (card && card.getAttribute('data-anpr-rail') != null
            && String(card.getAttribute('data-anpr-rail')) !== '') {
            return card.getAttribute('data-anpr-rail');
        }
        if (el.getAttribute('data-anpr-rail-idx') != null
            && String(el.getAttribute('data-anpr-rail-idx')) !== '') {
            return el.getAttribute('data-anpr-rail-idx');
        }
        if (el.getAttribute('data-anpr-open') != null
            && /^\d+$/.test(String(el.getAttribute('data-anpr-open')))) {
            return el.getAttribute('data-anpr-open');
        }
        return el.getAttribute('data-anpr-capture-id')
            || el.getAttribute('data-anpr-open')
            || (card && card.getAttribute('data-anpr-capture-id'))
            || null;
    }

    function openAnprModal(idx, scope) {
        try {
            var sc = scope === 'offline' ? 'offline' : 'live';
            var tick = findRailTick(idx, sc);
            if (!tick) {
                try {
                    console.warn('[anpr] openAnprModal miss', { idx: idx, scope: sc });
                } catch (_) { /* ignore */ }
                return;
            }
            /* Magnifier → ANPR lightbox first; FrAlarm after (unchanged) */
            openLightbox(tick, sc);
            if (sc === 'live' && listStatusOf(tick)) {
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
        } catch (err) {
            try {
                console.error('[anpr] openAnprModal err', err && err.message ? err.message : err);
            } catch (_) { /* ignore */ }
        }
    }

    function closeAnprLightbox() {
        var el = document.getElementById('ax-anpr-snap-lightbox');
        var bd = document.getElementById('ax-anpr-snap-lightbox-backdrop');
        if (el) {
            el.hidden = true;
            el.classList.remove('is-open');
        }
        if (bd) {
            bd.hidden = true;
            bd.classList.remove('is-open');
        }
    }

    function ensureLightboxBackdrop() {
        var bd = document.getElementById('ax-anpr-snap-lightbox-backdrop');
        if (bd) return bd;
        bd = document.createElement('div');
        bd.id = 'ax-anpr-snap-lightbox-backdrop';
        bd.className = 'ax-anpr-snap-lightbox-backdrop';
        bd.hidden = true;
        bd.addEventListener('click', function () { closeAnprLightbox(); });
        document.body.appendChild(bd);
        return bd;
    }

    function ensureLightbox() {
        ensureLightboxBackdrop();
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
            if (!el.querySelector('.ax-anpr-lb-zoom-hint')) {
                var body0 = el.querySelector('.ax-anpr-snap-lb-body');
                if (body0) {
                    var hint0 = document.createElement('p');
                    hint0.className = 'ax-anpr-lb-zoom-hint hint';
                    hint0.textContent = tr('analytics.anpr.lbZoomHint', 'Hover image to enlarge');
                    var meta0 = body0.querySelector('.ax-anpr-snap-lb-meta');
                    if (meta0) body0.insertBefore(hint0, meta0);
                    else body0.appendChild(hint0);
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
            var pImg = el.querySelector('.ax-anpr-lb-plate-img');
            if (pImg && pImg.parentElement
                && !pImg.parentElement.classList.contains('ax-anpr-lb-plate-wrap')) {
                var pWrapUp = document.createElement('div');
                pWrapUp.className = 'ax-anpr-lb-plate-wrap';
                pImg.parentNode.insertBefore(pWrapUp, pImg);
                pWrapUp.appendChild(pImg);
                el._anprMagBound = false;
            }
            if (!el._anprMagBound) bindMacroMagnifier(el);
            if (!el._anprBigMagCloseBound) {
                el._anprBigMagCloseBound = true;
                var closeBtn0 = el.querySelector('.ax-anpr-snap-lb-close');
                if (closeBtn0) {
                    closeBtn0.addEventListener('click', function () { closeAnprLightbox(); });
                }
            }
            return el;
        }
        el = document.createElement('div');
        el.id = 'ax-anpr-snap-lightbox';
        el.className = 'ax-anpr-snap-lightbox';
        el.hidden = true;
        el.innerHTML =
            '<div class="ax-anpr-snap-lb-chrome" data-anpr-drag-handle="1">' +
            '<h3 class="ax-anpr-snap-lb-title"></h3>' +
            '<button type="button" class="ax-anpr-snap-lb-close" aria-label="' +
            esc(tr('common.close', 'Close')) + '">\u00D7</button></div>' +
            '<div class="ax-anpr-snap-lb-body">' +
            '<div class="ax-anpr-lb-scene-wrap" title="' +
            esc(tr('analytics.anpr.lbZoomHint', 'Hover image to enlarge')) + '">' +
            '<img class="ax-anpr-lb-scene" alt="">' +
            '</div>' +
            '<div class="ax-anpr-lb-plate-wrap" title="' +
            esc(tr('analytics.anpr.lbZoomHint', 'Hover image to enlarge')) + '">' +
            '<img class="ax-anpr-lb-plate-img" alt="" hidden>' +
            '</div>' +
            '<p class="ax-anpr-lb-zoom-hint hint">' +
            esc(tr('analytics.anpr.lbZoomHint', 'Hover image to enlarge')) + '</p>' +
            '<div class="ax-anpr-snap-lb-meta">' +
            '<p class="ax-anpr-lb-plate"></p>' +
            '<p class="ax-anpr-lb-mmr"></p>' +
            '<p class="ax-anpr-lb-list"></p>' +
            '<p class="ax-anpr-lb-when"></p>' +
            '<p class="ax-anpr-lb-bwc"></p>' +
            '<p class="ax-anpr-lb-gps" hidden></p>' +
            '<div class="ax-anpr-snap-lb-actions">' +
            '<button type="button" class="btn btn-sm btn-secondary ax-anpr-lb-copy-loc" hidden>' +
            esc(tr('analytics.anpr.copyLocation', 'Copy location')) + '</button>' +
            '<button type="button" class="btn btn-sm btn-primary ax-anpr-lb-download">' +
            esc(tr('analytics.anpr.downloadEvidence', 'Download Evidence')) + '</button>' +
            '</div>' +
            '</div></div>';
        document.body.appendChild(el);
        var closeBtn = el.querySelector('.ax-anpr-snap-lb-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () { closeAnprLightbox(); });
        }
        el._anprBigMagCloseBound = true;
        var dlBtn = el.querySelector('.ax-anpr-lb-download');
        if (dlBtn) {
            dlBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                downloadAnprEvidence(el._tick);
            });
        }
        var copyBtn = el.querySelector('.ax-anpr-lb-copy-loc');
        if (copyBtn && !copyBtn._anprCopyBound) {
            copyBtn._anprCopyBound = true;
            copyBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var tick = el._tick;
                var line = captureGpsLine(tick);
                if (!line || !global.navigator || !navigator.clipboard) return;
                navigator.clipboard.writeText(line).catch(function () { /* ignore */ });
            });
        }
        bindMacroMagnifier(el);
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && el && !el.hidden) closeAnprLightbox();
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
                el.style.transform = 'none';
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
            img.style.transform = 'scale(3)';
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
                pImg.style.transform = 'scale(3)';
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

    function openLightbox(tick, scopeHint) {
        if (!tick) return;
        var el = ensureLightbox();
        var bd = ensureLightboxBackdrop();
        el._tick = tick;
        /* Big centered open — reset any prior drag position */
        el.style.left = '';
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
        el.style.transform = '';
        var title = el.querySelector('.ax-anpr-snap-lb-title');
        var img = el.querySelector('.ax-anpr-lb-scene');
        var plateImg = el.querySelector('.ax-anpr-lb-plate-img');
        var plate = el.querySelector('.ax-anpr-lb-plate');
        var list = el.querySelector('.ax-anpr-lb-list');
        var when = el.querySelector('.ax-anpr-lb-when');
        var bwc = el.querySelector('.ax-anpr-lb-bwc');
        var gpsEl = el.querySelector('.ax-anpr-lb-gps');
        var copyLoc = el.querySelector('.ax-anpr-lb-copy-loc');
        if (!gpsEl && el.querySelector('.ax-anpr-snap-lb-meta')) {
            gpsEl = document.createElement('p');
            gpsEl.className = 'ax-anpr-lb-gps';
            gpsEl.hidden = true;
            var metaIns = el.querySelector('.ax-anpr-snap-lb-meta');
            var actionsIns = metaIns && metaIns.querySelector('.ax-anpr-snap-lb-actions');
            if (actionsIns) metaIns.insertBefore(gpsEl, actionsIns);
            else if (metaIns) metaIns.appendChild(gpsEl);
        }
        if (!copyLoc && el.querySelector('.ax-anpr-snap-lb-actions')) {
            copyLoc = document.createElement('button');
            copyLoc.type = 'button';
            copyLoc.className = 'btn btn-sm btn-secondary ax-anpr-lb-copy-loc';
            copyLoc.hidden = true;
            copyLoc.textContent = tr('analytics.anpr.copyLocation', 'Copy location');
            el.querySelector('.ax-anpr-snap-lb-actions').insertBefore(
                copyLoc,
                el.querySelector('.ax-anpr-lb-download')
            );
            copyLoc.addEventListener('click', function (e) {
                e.stopPropagation();
                var line = captureGpsLine(el._tick);
                if (!line || !global.navigator || !navigator.clipboard) return;
                navigator.clipboard.writeText(line).catch(function () { /* ignore */ });
            });
        }
        var plateLine = capturePlateText(tick);
        var bwcLine = captureBwcBadge(tick);
        var liveSnap = scopeHint === 'live' || (!isOfflineAnprSource(tick) && scopeHint !== 'offline');
        if (title) {
            /* Strict plate_text bind — never vehicleLabel / camId */
            title.textContent = tr('analytics.anpr.liveSnapTitle', 'Vehicle snap') +
                ' \u00B7 ' + plateLine;
        }
        var sceneUrl = captureMacroUrl(tick) || railPrimaryUrl(tick);
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
            var micro = captureMicroUrl(tick);
            if (micro) {
                plateImg.src = micro;
                plateImg.hidden = false;
            } else {
                plateImg.removeAttribute('src');
                plateImg.hidden = true;
            }
        }
        if (plate) {
            plate.textContent = (plateLine === 'UNKNOWN' || tick.unclear)
                ? (tr('analytics.anpr.unclear', 'Unclear / Manual Review') + ' \u00B7 ' + plateLine)
                : (tr('analytics.anpr.liveDetailPlate', 'Plate') + ': ' + plateLine);
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
        if (when) {
            when.textContent = tr('analytics.anpr.liveDetailWhen', 'When') + ': ' +
                captureWhenDisplay(tick, false);
        }
        if (bwc) {
            bwc.textContent = tr('analytics.anpr.liveDetailCam', 'Camera') + ': ' + bwcLine;
        }
        /* Location / GPS — Live enlarge only (Offline does not need it) */
        var gpsLine = liveSnap ? captureGpsLine(tick) : '';
        if (gpsEl) {
            if (gpsLine) {
                gpsEl.hidden = false;
                gpsEl.textContent = tr('analytics.anpr.liveDetailGps', 'Location') + ': ' + gpsLine;
            } else if (liveSnap) {
                gpsEl.hidden = false;
                gpsEl.textContent = tr('analytics.anpr.liveDetailGps', 'Location') + ': ' +
                    tr('analytics.anpr.noLocation', 'No GPS for this unit');
            } else {
                gpsEl.hidden = true;
                gpsEl.textContent = '';
            }
        }
        if (copyLoc) {
            if (liveSnap && gpsLine) {
                copyLoc.hidden = false;
            } else {
                copyLoc.hidden = true;
            }
        }
        if (bd) {
            bd.hidden = false;
            bd.classList.add('is-open');
        }
        el.hidden = false;
        el.classList.add('is-open');
        if (!el._anprMagBound) bindMacroMagnifier(el);
    }

    function openHistoryDetail(tick) {
        openLightbox(tick, isOfflineAnprSource(tick) ? 'offline' : 'live');
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
        try {
            if (global.AnalyticToastDrag && typeof global.AnalyticToastDrag.enable === 'function') {
                global.AnalyticToastDrag.enable(el, { storageKey: 'ax-toast-pos-ax-anpr-live' });
            }
        } catch (_) { /* ignore */ }
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
        if (tick.isUpdate) {
            onCropUpdate(tick);
            return;
        }
        pushRail(Object.assign({}, tick, {
            source: tick.source || 'live',
            isLive: true,
            dwellSeconds: tick.dwellSeconds != null ? tick.dwellSeconds : 0,
            isUpdate: false,
        }));
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

    /** Dwell update — patch existing rail card; never prepend a new card */
    function onCropUpdate(payload) {
        if (!payload) return;
        if (String(payload.source || '').toLowerCase() === 'offline') return;
        if (isOfflineAnprSource(payload)) return;
        var key = plateMatchKey(payload);
        if (!key) return;
        var dwellSeconds = Math.max(0, Math.floor(Number(payload.dwellSeconds) || 0));
        var updated = false;
        for (var i = 0; i < liveRail.length; i++) {
            if (!liveRail[i]) continue;
            if (plateMatchKey(liveRail[i]) !== key) continue;
            liveRail[i] = Object.assign({}, liveRail[i], {
                dwellSeconds: dwellSeconds,
                isUpdate: true,
                at: payload.at || liveRail[i].at,
                macroCropUrl: payload.macroCropUrl || payload.vehicleUrl || liveRail[i].macroCropUrl,
                microCropUrl: payload.microCropUrl || payload.cropUrl || liveRail[i].microCropUrl,
                vehicleUrl: payload.vehicleUrl || payload.macroCropUrl || liveRail[i].vehicleUrl,
                cropUrl: payload.cropUrl || payload.microCropUrl || liveRail[i].cropUrl,
            });
            updated = true;
            break;
        }
        if (updated) renderRail(false);
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
                if (watching) emitWatchSlots();
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
                    if (stateKey === TILE_STATE.STREAM_ERROR
                        || stateKey === TILE_STATE.PLAYER_ERROR
                        || stateKey === TILE_STATE.INVITE_FAILED) {
                        schedulePlayerRecover(i, camId, 'video-stream-error:' + stateKey);
                    }
                }
            }
            updateMeta();
            renderRoster();
        });
        sock.on('anpr-crop-tick', onCropTick);
        sock.on('anpr-crop-update', onCropUpdate);
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
                var tileId = tile.getAttribute('data-tile-id') || ('anpr-' + s);
                toggleAnprTileExpand(tileId);
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
        if (railHost && !railHost._anprRailOpenByIndexV1) {
            railHost._anprRailOpenByIndexV1 = true;
            railHost._anprRailBound = true;
            railHost.addEventListener('click', function (ev) {
                var mag = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-open]')
                    : null;
                if (mag) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    openAnprModal(
                        openKeyFromRailEl(mag),
                        mag.getAttribute('data-anpr-rail-scope') || 'live'
                    );
                    return;
                }
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                ev.preventDefault();
                openAnprModal(
                    openKeyFromRailEl(card),
                    card.getAttribute('data-anpr-rail-scope') || 'live'
                );
            });
            railHost.addEventListener('dblclick', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                ev.preventDefault();
                openAnprModal(
                    openKeyFromRailEl(card),
                    card.getAttribute('data-anpr-rail-scope') || 'live'
                );
            });
        }
        var offlineRailEl = document.getElementById('ax-anpr-offline-rail');
        if (offlineRailEl && !offlineRailEl._anprRailOpenByIndexV1) {
            offlineRailEl._anprRailOpenByIndexV1 = true;
            offlineRailEl._anprRailBound = true;
            offlineRailEl.addEventListener('click', function (ev) {
                var mag = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-open]')
                    : null;
                if (mag) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    openAnprModal(
                        openKeyFromRailEl(mag),
                        mag.getAttribute('data-anpr-rail-scope') || 'offline'
                    );
                    return;
                }
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                ev.preventDefault();
                openAnprModal(
                    openKeyFromRailEl(card),
                    card.getAttribute('data-anpr-rail-scope') || 'offline'
                );
            });
            offlineRailEl.addEventListener('dblclick', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                ev.preventDefault();
                openAnprModal(
                    openKeyFromRailEl(card),
                    card.getAttribute('data-anpr-rail-scope') || 'offline'
                );
            });
        }
        /* Capture-phase — index-first; stops older id-first bubble handlers */
        if (!document.documentElement._anprSnapOpenByIndexV1) {
            document.documentElement._anprSnapOpenByIndexV1 = true;
            document.addEventListener('click', function (ev) {
                var panel = document.getElementById('ax-panel-anpr');
                if (!panel || panel.hidden) return;
                var t = ev.target;
                if (!t || !t.closest) return;
                if (!panel.contains(t)) return;
                var mag = t.closest('#ax-anpr-live-rail-grid [data-anpr-open], #ax-anpr-offline-rail-grid [data-anpr-open]');
                var card = (!mag && t.closest)
                    ? t.closest('#ax-anpr-live-rail-grid [data-anpr-rail], #ax-anpr-offline-rail-grid [data-anpr-rail]')
                    : null;
                var el = mag || card;
                if (!el) return;
                ev.preventDefault();
                ev.stopPropagation();
                if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
                openAnprModal(
                    openKeyFromRailEl(el),
                    el.getAttribute('data-anpr-rail-scope')
                        || (el.closest('#ax-anpr-offline-rail') ? 'offline' : 'live')
                );
            }, true);
        }
        var hitRow = hitSlotsContainer();
        if (hitRow && !hitRow._anprHitBound) {
            hitRow._anprHitBound = true;
            hitRow.addEventListener('click', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-hit]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-hit'), 10);
                if (!isFinite(idx) || !hitRail[idx]) return;
                openLightbox(hitRail[idx], 'offline');
            });
        }
        function bindCriticalList(listId, scope) {
            var list = document.getElementById(listId);
            if (!list || list._anprCriticalBound) return;
            list._anprCriticalBound = true;
            list.addEventListener('click', function (ev) {
                var dismissBtn = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-critical-dismiss]')
                    : null;
                if (dismissBtn) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    dismissCriticalAlert(
                        dismissBtn.getAttribute('data-anpr-critical-scope') || scope,
                        dismissBtn.getAttribute('data-anpr-critical-dismiss')
                    );
                    return;
                }
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-critical]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-critical'), 10);
                var bucket = liveCriticalAlerts;
                if (!isFinite(idx) || !bucket[idx]) return;
                openLightbox(bucket[idx], 'live');
            });
        }
        bindCriticalList('active-alerts-list', 'live');
        var railLive = document.getElementById('ax-anpr-live-rail');
        if (railLive && !railLive._anprCriticalClearBound) {
            railLive._anprCriticalClearBound = true;
            railLive.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-critical-clear]')
                    : null;
                if (!btn) return;
                ev.preventDefault();
                clearCriticalAlerts(btn.getAttribute('data-anpr-critical-clear') || 'live');
            });
        }
        paintCriticalAlerts();
        paintHitSlots();
    }

    function ensureUiBound() {
        if (!uiBound) {
            bindUi();
            uiBound = true;
        } else {
            /* Re-ensure Live/Offline rail open listeners (Offline may open before Live) */
            bindUi();
        }
    }

    function onShow() {
        ensureUiBound();
        bindSocket();
        startFleetPolling();
        startLiveHealthPoll();
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
        paintSubnavWatchBadge();
        updateMeta();
        renderRoster();
    }

    function onHide() {
        // CRITICAL: leaving ANPR Live must release BWC video — no background call.
        if (watching) stopWatch();
        stopFleetPolling();
        stopLiveHealthPoll();
        paintSubnavWatchBadge();
    }

    function paintLiveHealthBadge(kind, text) {
        var el = document.getElementById('ax-anpr-status');
        if (!el) return;
        el.classList.remove('ok', 'bad', 'warn');
        if (kind === 'ok' || kind === 'bad' || kind === 'warn') el.classList.add(kind);
        el.textContent = text;
        healthLastKind = kind || '';
    }

    function applyLiveHealthOk() {
        healthFailStreak = 0;
        paintLiveHealthBadge('ok', tr('analytics.anpr.engineOk', 'ANPR Engine \u2014 OK'));
    }

    function applyLiveHealthBad() {
        healthFailStreak += 1;
        /* Sticky: keep OK until 3 consecutive fails; cold-start still shows Down. */
        if (healthFailStreak >= HEALTH_FAIL_NEED || healthLastKind !== 'ok') {
            paintLiveHealthBadge('bad', tr('analytics.anpr.engineDown', 'ANPR Engine \u2014 Not available'));
        }
    }

    function pingAnprHealthOnce() {
        var el = document.getElementById('ax-anpr-status');
        if (!el) return;
        var licensed = !!(global.LicenseFeatures && LicenseFeatures.isEnabled
            && (LicenseFeatures.isEnabled('analyticsAnpr') || LicenseFeatures.isEnabled('anpr')));
        if (!licensed) {
            healthFailStreak = 0;
            paintLiveHealthBadge('warn', tr('analytics.anpr.engineNotLicensed', 'ANPR Engine \u2014 Not licensed'));
            return;
        }
        fetch('/api/analytics/anpr/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || !data.featureEnabled) {
                    healthFailStreak = 0;
                    paintLiveHealthBadge('warn', tr('analytics.anpr.engineNotLicensed', 'ANPR Engine \u2014 Not licensed'));
                    return;
                }
                if (data.runtime && (
                    data.runtime.ok
                    || data.runtime.dualEngine === true
                    || String(data.runtime.engine || '').indexOf('dual') >= 0
                    || data.runtime.fastalpr === 'ready'
                    || data.runtime.ocr === 'ready'
                    || data.runtime.ocr === 'paddleocr-en'
                    || data.runtime.ocr === 'rapidocr-onnx'
                    || String(data.runtime.ocrModel || '').toLowerCase().indexOf('rapid') >= 0
                    || String(data.runtime.ocrModel || '').toLowerCase().indexOf('paddle') >= 0
                )) {
                    applyLiveHealthOk();
                } else {
                    applyLiveHealthBad();
                }
            })
            .catch(function () {
                applyLiveHealthBad();
            });
    }

    function startLiveHealthPoll() {
        stopLiveHealthPoll();
        healthFailStreak = 0;
        pingAnprHealthOnce();
        healthPollTimer = setInterval(pingAnprHealthOnce, HEALTH_POLL_MS);
    }

    function stopLiveHealthPoll() {
        if (healthPollTimer) {
            clearInterval(healthPollTimer);
            healthPollTimer = null;
        }
    }

    global.addEventListener('beforeunload', function () {
        if (watching) stopWatch();
    });
    global.addEventListener('pagehide', function () {
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
        openInspectTick: function (tick, scopeHint) {
            openLightbox(tick, scopeHint || 'live');
        },
        clearUiRail: clearUiRail,
        openHistoryDetail: openHistoryDetail,
        syncSubnavWatchBadge: syncSubnavWatchBadge,
        ensureUiBound: ensureUiBound,
        MAX_WATCH: MAX_WATCH,
        LIVE_SLOTS: LIVE_SLOTS,
    };
    global.openAnprModal = function (idx, scope) {
        return openAnprModal(idx, scope);
    };
})(typeof window !== 'undefined' ? window : this);
