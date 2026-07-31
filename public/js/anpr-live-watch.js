/**
 * ANPR Live watch — 4 smaller live + 16 equal rail (4×4 row-major).
 * MOB: ANPR-LIVE-RAIL-4X4-EQUAL-V1 (viewport lock kept; does NOT touch China pack)
 * Surface: analytics-anpr (concurrent with analytics-fr — not a mutex).
 */
(function (global) {
    'use strict';

    var SURFACE = 'analytics-anpr';
    var LIVE_SLOTS = 4;
    var MAX_WATCH = 16;
    var RAIL_MAX = 16;
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
    var rotateCursor = 0;
    var rotateTimer = null;
    var wvpHandoffFlvByCam = Object.create(null);
    var wvpHandoffSlotInflight = Object.create(null);
    var streamingCams = Object.create(null);
    var tileSignalTimers = [];
    var tileSignalRetried = Object.create(null);
    var socketBound = false;
    var rail = [];
    var lastHit = null;
    var toastTimer = null;
    var uiBound = false;

    for (var si = 0; si < LIVE_SLOTS; si++) {
        slotCam[si] = null;
        players[si] = null;
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

    function setTileMeta(slot, camId, stateKey) {
        var tile = tileEl(slot);
        if (!tile) return;
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

    function destroyPlayer(slot) {
        delete wvpHandoffSlotInflight[slot];
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
        var stopBtn = document.getElementById('ax-anpr-live-stop');
        var stopAllBtn = document.getElementById('ax-anpr-live-stop-all');
        if (startBtn) startBtn.disabled = watching || selected.length === 0;
        if (stopBtn) stopBtn.disabled = !watching;
        if (stopAllBtn) stopAllBtn.disabled = !watching && selected.length === 0;
        if (meta) {
            meta.textContent = tr('analytics.anpr.liveMeta', '{n}/{max} selected \u00B7 {live}/{slots} live')
                .replace('{n}', String(selected.length))
                .replace('{max}', String(MAX_WATCH))
                .replace('{live}', String(provenLiveCount()))
                .replace('{slots}', String(LIVE_SLOTS));
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
        fleet = Array.isArray(list) ? list.slice() : [];
        renderRoster();
        updateMeta();
    }

    function loadFleet() {
        fetch('/api/fleet', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var list = Array.isArray(data) ? data
                    : (data && Array.isArray(data.fleet) ? data.fleet : []);
                ingestFleet(list);
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
        /* WHOLE-VEHICLE-CROP-V1 — never promote tight plate scrap as main thumb */
        if (t.vehicleUrl) return t.vehicleUrl;
        return null;
    }

    function railPlateUrl(t) {
        if (!t) return null;
        return t.cropUrl || null;
    }

    function pushRail(tick) {
        if (!tick) return;
        /* Prefer vehicle/scene; allow plate-only tick only if hull produced vehicleUrl */
        if (!tick.vehicleUrl && !tick.plate) return;
        if (!tick.vehicleUrl && tick.cropUrl && !tick.plate) return;
        /* Row-major 4×4: newest → index 0 (top-left); others shift across row then down */
        rail.unshift({
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
        });
        if (rail.length > RAIL_MAX) rail = rail.slice(0, RAIL_MAX);
        renderRail(true);
    }

    function renderRail(animateShift) {
        var grid = document.getElementById('ax-anpr-live-rail-grid');
        if (!grid) return;
        var html = '';
        for (var i = 0; i < RAIL_MAX; i++) {
            var t = rail[i];
            if (!t) {
                html += '<div class="ax-anpr-live-rail-card is-empty" role="listitem">' +
                    '<span class="hint">\u2014</span></div>';
                continue;
            }
            var st = listStatusOf(t);
            var hitCls = st ? (' is-hit ' + gradeClass(st)) : '';
            var primary = railPrimaryUrl(t);
            var plateThumb = railPlateUrl(t);
            html += '<div class="ax-anpr-live-rail-card' + hitCls + '" role="listitem" data-anpr-rail="' + i + '" title="' +
                esc(tr('analytics.anpr.liveRailExpandHint', 'Click to expand')) + '">' +
                (primary
                    ? '<img class="ax-anpr-rail-scene" src="' + esc(primary) + '" alt="" data-anpr-rail-img="' + i + '">'
                    : '<div class="hint" style="flex:1;display:flex;align-items:center;justify-content:center">\u2014</div>') +
                (plateThumb && primary
                    ? '<img class="ax-anpr-rail-plate-thumb" src="' + esc(plateThumb) + '" alt="">'
                    : '') +
                '<div class="ax-anpr-rail-plate">' + esc(t.plate || tr('analytics.anpr.liveRailNoText', 'Plate\u2026')) + '</div>' +
                '<div class="ax-anpr-rail-meta">' + esc(
                    listLabel(t) + ' \u00B7 ' + formatWhenShort(t.at) +
                    (t.deviceLabel || t.camId ? (' \u00B7 ' + (t.deviceLabel || t.camId)) : '')
                ) + '</div>' +
                '</div>';
        }
        grid.innerHTML = html;
        if (animateShift) {
            grid.classList.remove('is-rail-shift');
            void grid.offsetWidth;
            grid.classList.add('is-rail-shift');
        }
    }

    function ensureLightbox() {
        var el = document.getElementById('ax-anpr-snap-lightbox');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'ax-anpr-snap-lightbox';
        el.hidden = true;
        el.innerHTML =
            '<div class="ax-anpr-snap-lb-chrome">' +
            '<h3 class="ax-anpr-snap-lb-title"></h3>' +
            '<button type="button" class="ax-anpr-snap-lb-close" aria-label="' +
            esc(tr('common.close', 'Close')) + '">\u00D7</button></div>' +
            '<div class="ax-anpr-snap-lb-body">' +
            '<img class="ax-anpr-lb-scene" alt="">' +
            '<img class="ax-anpr-lb-plate-img" alt="" hidden>' +
            '<div class="ax-anpr-snap-lb-meta">' +
            '<p class="ax-anpr-lb-plate"></p>' +
            '<p class="ax-anpr-lb-list"></p>' +
            '<p class="ax-anpr-lb-when"></p>' +
            '<p class="ax-anpr-lb-bwc"></p>' +
            '</div></div>';
        document.body.appendChild(el);
        var closeBtn = el.querySelector('.ax-anpr-snap-lb-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () { el.hidden = true; });
        }
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && el && !el.hidden) el.hidden = true;
        });
        return el;
    }

    function openLightbox(tick) {
        if (!tick) return;
        var el = ensureLightbox();
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
        if (plate) plate.textContent = tr('analytics.anpr.liveDetailPlate', 'Plate') + ': ' + (tick.plate || '\u2014');
        if (list) list.textContent = tr('analytics.anpr.liveDetailList', 'List') + ': ' + listLabel(tick);
        if (when) when.textContent = tr('analytics.anpr.liveDetailWhen', 'When') + ': ' + formatWhen(tick.at);
        if (bwc) {
            bwc.textContent = tr('analytics.anpr.liveDetailCam', 'Camera') + ': ' +
                (tick.deviceLabel || tick.camId || '\u2014');
        }
        el.hidden = false;
    }

    function setHitBar(hit) {
        var bar = document.getElementById('ax-anpr-live-hit-bar');
        var plate = document.getElementById('ax-anpr-live-hit-plate');
        var meta = document.getElementById('ax-anpr-live-hit-meta');
        var ack = document.getElementById('ax-anpr-live-ack');
        if (!bar) return;
        if (!hit) {
            bar.className = 'ax-anpr-live-hit-bar';
            if (plate) plate.textContent = '\u2014';
            if (meta) meta.textContent = '\u2014';
            if (ack) ack.disabled = true;
            return;
        }
        bar.className = 'ax-anpr-live-hit-bar is-on ' + (gradeClass(hit.listStatus) || 'is-blacklist');
        if (plate) plate.textContent = String(hit.plate || '') + ' \u00B7 ' + String(hit.listStatus || 'hit');
        if (meta) {
            meta.textContent = String(hit.deviceLabel || hit.camId || '') + ' \u00B7 ' +
                formatWhenShort(hit.at);
        }
        if (ack) ack.disabled = false;
        lastHit = hit;
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
        pushRail(tick);
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
        setHitBar(hit);
        pushRail(hit);
        showToast(hit);
        flashCam(hit.camId);
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
        var stopBtn = document.getElementById('ax-anpr-live-stop');
        var stopAllBtn = document.getElementById('ax-anpr-live-stop-all');
        var search = document.getElementById('ax-anpr-live-search');
        var list = document.getElementById('ax-anpr-live-roster-list');
        var ack = document.getElementById('ax-anpr-live-ack');
        var railHost = document.getElementById('ax-anpr-live-rail');
        if (startBtn) startBtn.addEventListener('click', startWatch);
        if (stopBtn) stopBtn.addEventListener('click', stopWatch);
        if (stopAllBtn) stopAllBtn.addEventListener('click', stopAllWatch);
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
        if (ack) {
            ack.addEventListener('click', function () {
                setHitBar(null);
                var toast = document.getElementById('ax-anpr-live-toast');
                if (toast) toast.hidden = true;
                lastHit = null;
                ack.disabled = true;
            });
        }
        if (railHost && !railHost._anprRailBound) {
            railHost._anprRailBound = true;
            railHost.addEventListener('click', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-rail'), 10);
                if (!isFinite(idx) || !rail[idx]) return;
                openLightbox(rail[idx]);
            });
            railHost.addEventListener('dblclick', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-rail]')
                    : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-anpr-rail'), 10);
                if (!isFinite(idx) || !rail[idx]) return;
                openLightbox(rail[idx]);
            });
        }
    }

    function onShow() {
        if (!uiBound) {
            bindUi();
            uiBound = true;
        }
        bindSocket();
        loadFleet();
        if (!socketBound) {
            var n = 0;
            var iv = setInterval(function () {
                bindSocket();
                if (socketBound || ++n > 40) clearInterval(iv);
            }, 100);
        }
        refreshEmptyTileHints();
        renderRail();
        updateMeta();
        renderRoster();
    }

    global.addEventListener('beforeunload', function () {
        if (watching) stopWatch();
    });

    global.AnprLiveWatch = {
        onShow: onShow,
        stop: stopWatch,
        stopAll: stopAllWatch,
        MAX_WATCH: MAX_WATCH,
        LIVE_SLOTS: LIVE_SLOTS,
    };
})(typeof window !== 'undefined' ? window : this);
