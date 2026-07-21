/**
 * Analytics Face — Live watch (6 tiles + ≤32 rotate).
 * Video only — face detect/match is a later MOB (server frame-grab).
 * Pattern mirrors command-wall socket + FLV handoff / JSMpeg fallback; surface: analytics-fr.
 */
(function (global) {
    var SURFACE = 'analytics-fr';
    var MAX_WATCH = 32;
    var LIVE_SLOTS = 6;
    var ROTATE_MS = 20000;

    var watching = false;
    var selected = []; // camIds in watch set order
    var pinned = Object.create(null); // camId -> true (hold on a slot)
    var slotCam = [null, null, null, null, null, null];
    var players = [null, null, null, null, null, null];
    var streamingCams = Object.create(null);
    var wvpHandoffFlvByCam = Object.create(null);
    var wvpHandoffSlotInflight = Object.create(null);
    var focusedSlot = -1; // mob-fr-stop-video-selected — tile click target for Stop video
    var rotateTimer = null;
    var rotateCursor = 0;
    var fleetById = Object.create(null);
    var socketBound = false;
    var uiBound = false;
    var rosterTimer = null;
    var rosterSearch = '';
    var rosterFilter = 'online';
    var rosterSearchFocused = false;
    var rosterGroupExpanded = Object.create(null); // groupName -> true|false (user override)

    var ROSTER_EXPAND_INLINE_MAX = 4;
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

    var tileSignalTimers = [null, null, null, null, null, null];
    var tileSignalRetried = Object.create(null);
    /** mob-fr-tile-sos-badge — camId -> 'sos' | 'fall' (active alarms only) */
    var sosKindByCam = Object.create(null);

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

    function shortCamId(camId) {
        if (global.FleetDisplay && typeof FleetDisplay.shortTechnicalId === 'function') {
            return FleetDisplay.shortTechnicalId(camId);
        }
        var s = String(camId || '');
        if (s.length <= 8) return s;
        return '…' + s.slice(-4);
    }

    function rosterNameHtml(d, id) {
        var name = d.name || id;
        return '<span class="ax-fr-roster-name" title="' + esc(String(id)) + '">' +
            esc(name) + ' <span class="ax-fr-roster-id-inline">(' + esc(shortCamId(id)) + ')</span></span>';
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

    function buildGroupedFleetRows(rows) {
        var byGroup = {};
        var ungrouped = [];
        rows.forEach(function (m) {
            var g = String(m.mapGroup || '').trim();
            if (!g) {
                ungrouped.push(m);
                return;
            }
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(m);
        });
        var out = [];
        Object.keys(byGroup).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (gName) {
            out.push({ type: 'header', groupName: gName, color: groupColorForDevice(null, gName), devices: byGroup[gName] });
            byGroup[gName].sort(function (a, b) {
                return String(a.name || a.id).localeCompare(String(b.name || b.id));
            }).forEach(function (m) { out.push({ type: 'row', device: m }); });
        });
        if (ungrouped.length) {
            if (Object.keys(byGroup).length) {
                out.push({
                    type: 'header',
                    groupName: tr('fleet.groupUngrouped', 'Ungrouped'),
                    color: '#64748b',
                    ungrouped: true,
                    devices: ungrouped,
                });
            }
            ungrouped.sort(function (a, b) {
                return String(a.name || a.id).localeCompare(String(b.name || b.id));
            }).forEach(function (m) { out.push({ type: 'row', device: m }); });
        }
        return out;
    }

    function rosterDevicesFiltered() {
        var q = String(rosterSearch || '').trim().toLowerCase();
        var list = [];
        Object.keys(fleetById).forEach(function (id) {
            var d = fleetById[id];
            if (!d) return;
            if (rosterFilter === 'online' && !d.online) return;
            if (rosterFilter === 'selected' && selected.indexOf(id) < 0) return;
            if (q) {
                var hay = (String(d.name || '') + ' ' + String(d.id || '') + ' ' + String(d.mapGroup || '')).toLowerCase();
                if (hay.indexOf(q) < 0) return;
            }
            list.push(d);
        });
        return list;
    }

    function tileSlotFor(camId) {
        camId = String(camId || '');
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i] === camId) return i + 1;
        }
        return 0;
    }

    function tileBadgeHtml(camId) {
        var slot = tileSlotFor(camId);
        if (slot > 0) {
            return '<span class="ax-fr-roster-badge is-live">' +
                esc(tr('analytics.fr.tileBadge', 'Live {n}').replace('{n}', String(slot))) + '</span>';
        }
        if (selected.indexOf(String(camId)) >= 0) {
            return '<span class="ax-fr-roster-badge is-rotate">' +
                esc(tr('analytics.fr.rotateBadge', 'Rotate')) + '</span>';
        }
        return '<span class="ax-fr-roster-badge is-idle">—</span>';
    }

    function groupOnlineCounts(devices) {
        var total = devices ? devices.length : 0;
        var online = 0;
        (devices || []).forEach(function (d) { if (d && d.online) online += 1; });
        return { online: online, total: total };
    }

    function groupWatchState(devices) {
        var on = 0;
        var sel = 0;
        (devices || []).forEach(function (d) {
            if (!d || !d.online) return;
            sel += 1;
            if (selected.indexOf(String(d.id)) >= 0) on += 1;
        });
        if (!sel) return 'disabled';
        if (on === 0) return 'unchecked';
        if (on >= sel) return 'checked';
        return 'indeterminate';
    }

    function groupSelectedCount(devices) {
        var n = 0;
        (devices || []).forEach(function (d) {
            if (d && selected.indexOf(String(d.id)) >= 0) n += 1;
        });
        return n;
    }

    function showWatchHint(message, ms) {
        var el = document.getElementById('ax-fr-watch-hint');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ax-fr-watch-hint';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.hidden = false;
        if (showWatchHint._t) clearTimeout(showWatchHint._t);
        showWatchHint._t = setTimeout(function () { el.hidden = true; }, ms || 4000);
    }

    function groupHasLiveOnTile(devices) {
        for (var i = 0; i < (devices || []).length; i++) {
            if (tileSlotFor(devices[i].id) > 0) return true;
        }
        return false;
    }

    function groupMatchesSearch(devices) {
        var q = String(rosterSearch || '').trim().toLowerCase();
        if (!q) return false;
        for (var i = 0; i < (devices || []).length; i++) {
            var d = devices[i];
            if (!d) continue;
            var hay = (String(d.name || '') + ' ' + String(d.id || '')).toLowerCase();
            if (hay.indexOf(q) >= 0) return true;
        }
        return false;
    }

    function isGroupExpanded(block) {
        if (!block || !block.header) return true;
        var gName = block.header.groupName;
        if (Object.prototype.hasOwnProperty.call(rosterGroupExpanded, gName)) {
            return !!rosterGroupExpanded[gName];
        }
        var devices = (block.header.devices && block.header.devices.length)
            ? block.header.devices : (block.members || []);
        if (groupMatchesSearch(devices)) return true;
        if (rosterFilter === 'selected' && groupSelectedCount(devices) > 0) return true;
        if (groupHasLiveOnTile(devices)) return true;
        return devices.length <= ROSTER_EXPAND_INLINE_MAX;
    }

    function toggleGroupWatch(devices, checked) {
        if (checked) {
            var capHit = false;
            (devices || []).forEach(function (d) {
                if (!d || !d.id || !d.online) return;
                var id = String(d.id);
                if (selected.indexOf(id) >= 0) return;
                if (selected.length >= MAX_WATCH) {
                    capHit = true;
                    return;
                }
                toggleSelect(id, true);
            });
            if (capHit || selected.length >= MAX_WATCH) {
                showWatchHint(tr('analytics.fr.watchSetFull', 'Watch set full (32 max)'));
            }
        } else {
            (devices || []).forEach(function (d) {
                if (!d || !d.id) return;
                var id = String(d.id);
                if (selected.indexOf(id) >= 0) toggleSelect(id, false);
            });
        }
    }

    function clearWatchSet() {
        if (!selected.length) return;
        if (watching) {
            var ok = global.confirm(tr('analytics.fr.clearWatchConfirm',
                'Stop video and clear all selected BWCs?'));
            if (!ok) return;
            stopWatch();
        }
        selected = [];
        pinned = Object.create(null);
        updateWatchButtons();
        renderWatchList();
    }

    function stopAllWatch() {
        if (!watching && !selected.length) return;
        var ok = global.confirm(tr('analytics.fr.stopAllConfirm',
            'Stop all video and clear the watch set?'));
        if (!ok) return;
        if (watching) stopWatch();
        selected = [];
        pinned = Object.create(null);
        updateWatchButtons();
        renderWatchList();
    }

    function tileEl(slot) {
        return document.querySelector('.ax-fr-tile[data-slot="' + slot + '"]');
    }

    function tileStatusText(stateKey) {
        switch (stateKey) {
            case TILE_STATE.LIVE:
                return 'Live';
            case TILE_STATE.IDLE:
                return tr('analytics.fr.tileIdleHint', 'Select officers and Start watch');
            case TILE_STATE.WAITING:
                return tr('analytics.fr.tileWaiting', 'Waiting for slot');
            case TILE_STATE.CONNECTING:
                return tr('analytics.fr.tileConnecting', 'Connecting…');
            case TILE_STATE.OFFLINE:
                return tr('analytics.fr.tileOffline', 'BWC offline');
            case TILE_STATE.NO_SIGNAL:
                return tr('analytics.fr.tileNoSignal', 'No video signal');
            case TILE_STATE.SIGNAL_LOST:
                return tr('analytics.fr.tileSignalLost', 'Signal lost — retrying…');
            case TILE_STATE.STREAM_ERROR:
                return tr('analytics.fr.tileStreamError', 'Stream error');
            case TILE_STATE.INVITE_FAILED:
                return tr('analytics.fr.tileInviteFailed', 'Could not start live');
            case TILE_STATE.LIVE_CAP:
                return tr('analytics.fr.tileLiveCap', 'Server live limit — pause other views');
            case TILE_STATE.PLAYER_ERROR:
                return tr('analytics.fr.tilePlayerError', 'Player unavailable');
            default:
                return tr('analytics.fr.tileWaiting', 'Waiting for slot');
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
        var label = tile.querySelector('.ax-fr-tile-label');
        var ph = tile.querySelector('.ax-fr-tile-ph');
        var name = camId ? deviceName(camId) : '';
        if (label) {
            if (camId) {
                label.textContent = String(slot + 1) + ' · ' + name + ' · ' + shortCamId(camId);
                label.title = String(camId);
            } else {
                label.textContent = String(slot + 1);
                label.removeAttribute('title');
            }
        }
        if (ph) {
            if (camId && stateKey) {
                var labelText = tileStatusText(stateKey);
                ph.textContent = labelText;
                ph.hidden = stateKey === TILE_STATE.LIVE;
            } else if (!camId) {
                ph.textContent = watching
                    ? tileStatusText(TILE_STATE.WAITING)
                    : tileStatusText(TILE_STATE.IDLE);
                ph.hidden = false;
                stateKey = watching ? TILE_STATE.WAITING : TILE_STATE.IDLE;
            }
        }
        applyTileStateClasses(tile, stateKey);
        tile.classList.toggle('is-pinned', !!(camId && pinned[camId]));
        tile.setAttribute('data-cam', camId || '');
        var stopBtn = tile.querySelector('.ax-fr-tile-stop');
        if (stopBtn) {
            stopBtn.hidden = !camId;
            stopBtn.setAttribute('aria-label', tr('analytics.fr.tileStop', 'Stop this tile'));
        }
        applyTileSosBadge(tile, camId);
    }

    function normalizeFrCamId(camId) {
        return String(camId == null ? '' : camId).trim();
    }

    function isActiveSosCam(camId) {
        var id = normalizeFrCamId(camId);
        if (!id) return false;
        if (typeof global.getActiveSosCamIds === 'function') {
            var ids = global.getActiveSosCamIds() || [];
            for (var i = 0; i < ids.length; i++) {
                if (normalizeFrCamId(ids[i]) === id) return true;
            }
            return false;
        }
        return !!sosKindByCam[id];
    }

    function reconcileSosKindMap() {
        var keep = Object.create(null);
        if (typeof global.getActiveSosCamIds === 'function') {
            (global.getActiveSosCamIds() || []).forEach(function (raw) {
                var id = normalizeFrCamId(raw);
                if (!id) return;
                keep[id] = sosKindByCam[id] || 'sos';
            });
        } else {
            Object.keys(sosKindByCam).forEach(function (id) { keep[id] = sosKindByCam[id]; });
        }
        sosKindByCam = keep;
    }

    function ensureTileSosBadge(tile) {
        if (!tile) return null;
        var badge = tile.querySelector('.ax-fr-tile-sos-badge');
        if (badge) return badge;
        badge = document.createElement('span');
        badge.className = 'ax-fr-tile-sos-badge';
        badge.hidden = true;
        badge.setAttribute('aria-live', 'polite');
        tile.appendChild(badge);
        return badge;
    }

    function applyTileSosBadge(tile, camId) {
        var badge = ensureTileSosBadge(tile);
        if (!badge) return;
        var id = normalizeFrCamId(camId);
        var active = id && isActiveSosCam(id);
        if (!active) {
            badge.hidden = true;
            badge.classList.remove('is-fall');
            if (tile) tile.classList.remove('is-sos-alarm');
            return;
        }
        var kind = sosKindByCam[id] || 'sos';
        var isFall = kind === 'fall';
        badge.textContent = isFall
            ? tr('analytics.fr.tileFallBadge', 'FALL')
            : tr('analytics.fr.tileSosBadge', 'SOS');
        badge.title = isFall
            ? tr('analytics.fr.tileFallBadgeTitle', 'Fall alert on this BWC')
            : tr('analytics.fr.tileSosBadgeTitle', 'SOS alert on this BWC');
        badge.classList.toggle('is-fall', isFall);
        badge.hidden = false;
        if (tile) tile.classList.add('is-sos-alarm');
    }

    function syncAllTileSosBadges() {
        reconcileSosKindMap();
        for (var i = 0; i < LIVE_SLOTS; i++) {
            var tile = tileEl(i);
            if (!tile) continue;
            applyTileSosBadge(tile, slotCam[i] || tile.getAttribute('data-cam') || '');
        }
    }

    function findSlotByCamId(camId) {
        var id = normalizeFrCamId(camId);
        if (!id) return -1;
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (normalizeFrCamId(slotCam[i]) === id) return i;
        }
        return -1;
    }

    function handoffPlayerAttaching(p) {
        return !!(p && (p.wvpHandoffAttaching
            || (typeof p.isHandoffAttaching === 'function' && p.isHandoffAttaching())));
    }

    function getWvpHandoffFlvUrl(camId) {
        if (!camId) return null;
        return wvpHandoffFlvByCam[normalizeFrCamId(camId)] || null;
    }

    function clearWvpHandoffFlv(camId) {
        if (!camId) return;
        delete wvpHandoffFlvByCam[normalizeFrCamId(camId)];
    }

    function attachWvpHandoffFlvToSlot(slot, camId, flvUrl) {
        if (typeof slot !== 'number' || slot < 0 || slot >= LIVE_SLOTS || !camId || !flvUrl) return false;
        camId = normalizeFrCamId(camId);
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
        if (existing && normalizeFrCamId(slotCam[slot]) === camId && handoffPlayerAttaching(existing)) {
            return true;
        }
        if (existing && normalizeFrCamId(slotCam[slot]) === camId && tile.classList.contains('is-live')
            && tile.querySelector('video.me8-zlm-primary')) {
            return true;
        }
        destroyPlayer(slot);
        setTileMeta(slot, camId, TILE_STATE.CONNECTING);
        startSignalTimer(slot, camId);
        wvpHandoffSlotInflight[slot] = { camId: camId, flvUrl: flvUrl, at: Date.now() };
        console.log('[me8-flv] fr attach once', { slot: slot, camId: camId, url: flvUrl });
        var handle = global.Me8LivePlayerFactory.attachFlvPrimary(tile, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            onProven: function () {
                delete wvpHandoffSlotInflight[slot];
                if (normalizeFrCamId(slotCam[slot]) !== camId) return;
                clearSignalTimer(slot);
                clearSignalRetry(slot, camId);
                setTileMeta(slot, camId, TILE_STATE.LIVE);
            },
            onFail: function () {
                delete wvpHandoffSlotInflight[slot];
                if (normalizeFrCamId(slotCam[slot]) !== camId) return;
                clearSignalTimer(slot);
                setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
            },
            onVideoFrame: function () {
                clearSignalTimer(slot);
                if (camId) clearSignalRetry(slot, camId);
            },
        });
        if (!handle) {
            delete wvpHandoffSlotInflight[slot];
            console.log('[me8-flv] fr attach fail', { camId: camId, url: flvUrl, reason: 'attachFlvPrimary_null' });
            return false;
        }
        players[slot] = handle;
        return true;
    }

    function attachWvpHandoffFlvForCam(camId, flvUrl) {
        if (!camId || !flvUrl) return;
        camId = normalizeFrCamId(camId);
        wvpHandoffFlvByCam[camId] = String(flvUrl);
        var slot = findSlotByCamId(camId);
        if (slot >= 0) {
            attachWvpHandoffFlvToSlot(slot, camId, flvUrl);
        }
    }

    function attachLivePlayerForSlot(slot) {
        var camId = slotCam[slot];
        if (!camId) return;
        var flvUrl = getWvpHandoffFlvUrl(camId);
        if (flvUrl) {
            attachWvpHandoffFlvToSlot(slot, camId, flvUrl);
            return;
        }
        attachPlayer(slot, camId);
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

    function stopSlot(slot, emitStop) {
        var camId = slotCam[slot];
        clearSignalTimer(slot);
        if (camId) clearSignalRetry(slot, camId);
        destroyPlayer(slot);
        if (camId) {
            delete streamingCams[normalizeFrCamId(camId)];
            clearWvpHandoffFlv(camId);
        }
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
        sock.emit('fr-watch-slots', {
            camIds: watching ? activeSlotCams() : [],
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
                },
            });
            players[slot] = player;
        } catch (err) {
            clearSignalTimer(slot);
            setTileMeta(slot, camId, TILE_STATE.PLAYER_ERROR);
        }
    }

    function startSlot(slot, camId) {
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
        if (streamingCams[normalizeFrCamId(camId)] || getWvpHandoffFlvUrl(camId)) {
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

    function findEmptySlot() {
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (!slotCam[i]) return i;
        }
        return -1;
    }

    function syncTileFocusUi() {
        for (var i = 0; i < LIVE_SLOTS; i++) {
            var tile = tileEl(i);
            if (tile) tile.classList.toggle('is-focused', focusedSlot === i);
        }
    }

    function setFocusedSlot(slot) {
        if (typeof slot !== 'number' || isNaN(slot) || slot < 0 || slot >= LIVE_SLOTS) {
            focusedSlot = -1;
        } else {
            focusedSlot = slot;
        }
        syncTileFocusUi();
    }

    function endWatchSession() {
        watching = false;
        focusedSlot = -1;
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
        syncTileFocusUi();
    }

    /** Fill empty tiles from remaining watch-set cams (not the stopped ones). */
    function fillEmptySlots() {
        if (!watching) return;
        while (true) {
            var slot = findEmptySlot();
            if (slot < 0) break;
            var next = nextRotateCandidate();
            if (!next) break;
            startSlot(slot, next);
        }
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
        endWatchSession();
        for (var i = 0; i < LIVE_SLOTS; i++) stopSlot(i, true);
        emitWatchSlots();
        updateWatchButtons();
        renderWatchList();
    }

    /**
     * Stop video = focused live tile only. Removes cam from rotate pool so it
     * does not return; free slot can be filled by selecting another BWC.
     */
    function stopSelectedVideo() {
        if (!watching) return;
        var camId = (focusedSlot >= 0 && focusedSlot < LIVE_SLOTS) ? slotCam[focusedSlot] : null;
        if (!camId) {
            showWatchHint(tr('analytics.fr.stopVideoNeedFocus',
                'Click a live tile first, then Stop video'));
            return;
        }
        removeCamFromWatch(camId);
    }

    /** Remove one cam from watch set + tear down its tile; stay watching if others remain. */
    function removeCamFromWatch(camId) {
        camId = String(camId || '');
        if (!camId) return;
        var idx = selected.indexOf(camId);
        if (idx >= 0) selected.splice(idx, 1);
        delete pinned[camId];
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i] === camId) {
                if (focusedSlot === i) focusedSlot = -1;
                stopSlot(i, true);
            }
        }
        if (!selected.length) {
            endWatchSession();
            emitWatchSlots();
        } else if (watching) {
            fillEmptySlots();
            emitWatchSlots();
        }
        syncTileFocusUi();
        updateWatchButtons();
        renderWatchList();
    }

    function startWatch() {
        if (!selected.length) return;
        watching = true;
        focusedSlot = -1;
        fillInitialSlots();
        if (rotateTimer) clearInterval(rotateTimer);
        rotateTimer = setInterval(rotateOnce, ROTATE_MS);
        emitWatchSlots();
        syncTileFocusUi();
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
            if (watching) {
                var empty = findEmptySlot();
                if (empty >= 0 && deviceOnline(camId) && activeSlotCams().indexOf(camId) < 0) {
                    startSlot(empty, camId);
                    emitWatchSlots();
                }
            }
        } else {
            if (idx < 0) return;
            removeCamFromWatch(camId);
            return;
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
        var stopAllBtn = document.getElementById('ax-fr-watch-stop-all');
        var clearBtn = document.getElementById('ax-fr-roster-clear');
        var meta = document.getElementById('ax-fr-watch-meta');
        if (startBtn) startBtn.disabled = watching || selected.length === 0;
        if (stopBtn) stopBtn.disabled = !watching;
        if (stopAllBtn) stopAllBtn.disabled = !watching && selected.length === 0;
        if (clearBtn) clearBtn.disabled = selected.length === 0;
        if (meta) {
            meta.textContent = tr('analytics.fr.rosterMeta', '{n}/{max} selected · {live}/{slots} live')
                .replace('{n}', String(selected.length))
                .replace('{max}', String(MAX_WATCH))
                .replace('{live}', String(activeSlotCams().length))
                .replace('{slots}', String(LIVE_SLOTS));
        }
    }

    function rosterDeviceRowHtml(d, isMember) {
        var id = String(d.id);
        var checked = selected.indexOf(id) >= 0;
        var isPin = !!pinned[id];
        var onTile = tileSlotFor(id) > 0;
        var disableMore = !checked && selected.length >= MAX_WATCH;
        var pinColor = d.groupColor || groupColorForDevice(id, d.mapGroup);
        var pinLabel = isPin
            ? tr('analytics.fr.unpin', 'Unpin')
            : tr('analytics.fr.pin', 'Pin');
        var rowCls = 'ax-fr-roster-row' +
            (isMember ? ' is-member' : '') +
            (onTile ? ' is-on-tile' : '') +
            (isPin ? ' is-pinned' : '') +
            (!d.online ? ' is-offline' : '');
        return '<tr class="' + rowCls + '" data-cam="' + esc(id) + '">' +
            '<td class="ax-fr-roster-cell-cb">' +
            '<input type="checkbox" class="ax-fr-roster-watch-cb" data-cam="' + esc(id) + '"' +
            (checked ? ' checked' : '') +
            (disableMore ? ' disabled' : '') +
            (!d.online && !checked ? ' disabled' : '') + '></td>' +
            '<td class="ax-fr-roster-cell-pin">' +
            (checked
                ? ('<button type="button" class="ax-fr-roster-pin ax-fr-roster-pin-icon' + (isPin ? ' is-active' : '') +
                    '" data-cam="' + esc(id) + '" title="' + esc(tr('analytics.fr.pinHint', 'Pin to a live tile')) +
                    '" aria-label="' + esc(pinLabel) + '"></button>')
                : '') +
            '</td>' +
            '<td class="ax-fr-roster-cell-status">' +
            '<span class="ax-fr-roster-status' + (d.online ? ' is-on' : ' is-off') + '" title="' +
            esc(d.online ? tr('fleet.online', 'Online') : tr('fleet.offline', 'Offline')) + '"></span>' +
            '<span class="ax-fr-roster-dot" style="background:' + esc(pinColor) + '"></span></td>' +
            '<td class="ax-fr-roster-cell-name' + (isMember ? ' is-member' : '') + '">' + rosterNameHtml(d, id) + '</td>' +
            '<td class="ax-fr-roster-cell-tile">' + tileBadgeHtml(id) + '</td>' +
            '</tr>';
    }

    function buildRosterGroupBlocks(grouped) {
        var blocks = [];
        var cur = null;
        grouped.forEach(function (entry) {
            if (entry.type === 'header') {
                cur = { header: entry, members: [] };
                blocks.push(cur);
            } else if (entry.type === 'row') {
                if (!cur) {
                    cur = {
                        header: {
                            groupName: tr('fleet.groupUngrouped', 'Ungrouped'),
                            color: '#64748b',
                            devices: [],
                            ungrouped: true,
                        },
                        members: [],
                    };
                    blocks.push(cur);
                }
                cur.members.push(entry.device);
                if (cur.header.devices) cur.header.devices.push(entry.device);
            }
        });
        blocks.forEach(function (block) {
            if (block.header && (!block.header.devices || !block.header.devices.length)) {
                block.header.devices = block.members.slice();
            }
        });
        return blocks;
    }

    function rosterGroupCardHeadHtml(entry, expanded, members) {
        var devices = (entry.devices && entry.devices.length) ? entry.devices : (members || []);
        var cnt = groupOnlineCounts(devices);
        var inWatch = groupSelectedCount(devices);
        var gState = groupWatchState(devices);
        var gName = entry.groupName;
        var chev = expanded ? '▼' : '▶';
        var expandTitle = expanded
            ? tr('analytics.fr.rosterCollapseGroup', 'Collapse group')
            : tr('analytics.fr.rosterExpandGroup', 'Expand group');
        var meta = tr('analytics.fr.groupOnline', '{online}/{total} online')
            .replace('{online}', String(cnt.online))
            .replace('{total}', String(cnt.total));
        if (inWatch > 0) {
            meta += ' · ' + tr('analytics.fr.groupInWatch', '{n} in watch').replace('{n}', String(inWatch));
        }
        return '<div class="ax-fr-roster-card-head" data-group="' + esc(gName) + '">' +
            '<div class="ax-fr-roster-group-label">' +
            '<button type="button" class="ax-fr-roster-group-expand" data-group="' + esc(gName) + '"' +
            ' aria-expanded="' + (expanded ? 'true' : 'false') + '" title="' + esc(expandTitle) + '">' +
            esc(chev) + '</button>' +
            '<label class="ax-fr-roster-group-check">' +
            '<input type="checkbox" class="ax-fr-roster-group-cb" data-group="' + esc(gName) + '"' +
            (gState === 'checked' ? ' checked' : '') +
            (gState === 'disabled' ? ' disabled' : '') + '>' +
            '<span class="ax-fr-roster-group-dot" style="background:' + esc(entry.color) + '"></span>' +
            '<span class="ax-fr-roster-group-name">' + esc(gName) + '</span>' +
            '<span class="ax-fr-roster-group-meta">' + esc(meta) + '</span>' +
            '</label></div></div>';
    }

    function buildGroupCardHtml(block) {
        var expanded = isGroupExpanded(block);
        var gName = block.header.groupName;
        var html = '<div class="ax-fr-roster-group-card" data-group="' + esc(gName) + '">';
        html += rosterGroupCardHeadHtml(block.header, expanded, block.members);
        if (expanded && block.members.length) {
            html += '<table class="ax-fr-roster-table ax-fr-roster-card-table"><tbody>';
            block.members.forEach(function (d) {
                html += rosterDeviceRowHtml(d, true);
            });
            html += '</tbody></table>';
        }
        html += '</div>';
        return html;
    }

    function buildGroupGridHtml(blocks) {
        var html = '<div class="ax-fr-roster-grid">';
        blocks.forEach(function (block) {
            html += buildGroupCardHtml(block);
        });
        html += '</div>';
        return html;
    }

    function renderWatchList() {
        var el = document.getElementById('ax-fr-watch-list');
        if (!el) return;
        var searchEl = document.getElementById('ax-fr-roster-search');
        if (searchEl && document.activeElement === searchEl) rosterSearchFocused = true;
        else if (searchEl) rosterSearch = searchEl.value || rosterSearch;

        var filtered = rosterDevicesFiltered();
        var grouped = buildGroupedFleetRows(filtered);
        var groupCount = 0;
        grouped.forEach(function (e) { if (e.type === 'header') groupCount += 1; });

        var head = '<div class="ax-fr-watch-bar">' +
            '<div class="ax-fr-roster-actions">' +
            '<button type="button" class="btn btn-action btn-sm" id="ax-fr-watch-start"' +
            (watching || selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.watchStart', 'Start watch')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-fr-watch-stop"' +
            (watching ? '' : ' disabled') + '>' +
            esc(tr('analytics.fr.stopVideo', 'Stop video')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-fr-watch-stop-all"' +
            (!watching && selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.stopAll', 'Stop all')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-fr-roster-clear"' +
            (selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.clearWatch', 'Clear')) + '</button>' +
            '</div>' +
            '<span id="ax-fr-watch-meta" class="hint ax-fr-roster-summary">' +
            esc(tr('analytics.fr.rosterMeta', '{n}/{max} selected · {live}/{slots} live')
                .replace('{n}', String(selected.length))
                .replace('{max}', String(MAX_WATCH))
                .replace('{live}', String(activeSlotCams().length))
                .replace('{slots}', String(LIVE_SLOTS))) +
            (groupCount ? (' · ' + esc(String(groupCount)) + ' ' + esc(tr('analytics.fr.rosterGroups', 'groups'))) : '') +
            '</span>' +
            '<div class="ax-fr-roster-tools">' +
            '<input type="search" id="ax-fr-roster-search" class="ax-fr-roster-search" autocomplete="off" ' +
            'placeholder="' + esc(tr('analytics.fr.rosterSearch', 'Search officers…')) + '" value="' + esc(rosterSearch) + '">' +
            '<select id="ax-fr-roster-filter" class="ax-fr-roster-filter">' +
            '<option value="all"' + (rosterFilter === 'all' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterAll', 'All')) + '</option>' +
            '<option value="online"' + (rosterFilter === 'online' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterOnline', 'Online')) + '</option>' +
            '<option value="selected"' + (rosterFilter === 'selected' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterSelected', 'In watch set')) + '</option>' +
            '</select>' +
            '</div></div>';

        if (!Object.keys(fleetById).length) {
            el.innerHTML = head + '<p class="hint ax-fr-roster-empty">' +
                esc(tr('analytics.fr.rosterNoFleet', 'No BWCs registered.')) + '</p>';
            bindWatchRoster();
            return;
        }

        if (!filtered.length) {
            el.innerHTML = head + '<p class="hint ax-fr-roster-empty">' +
                esc(tr('analytics.fr.rosterNoMatch', 'No BWCs match this filter.')) + '</p>';
            bindWatchRoster();
            return;
        }

        var blocks = buildRosterGroupBlocks(grouped);

        el.innerHTML = head +
            '<div class="ax-fr-roster-wrap ax-fr-roster-scroll">' +
            buildGroupGridHtml(blocks) + '</div>';

        bindWatchRoster();
    }

    function bindTileStopButtons() {
        document.querySelectorAll('.ax-fr-tile-stop').forEach(function (btn) {
            if (btn._frBound) return;
            btn._frBound = true;
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var tile = btn.closest('.ax-fr-tile');
                if (!tile) return;
                var slot = parseInt(tile.getAttribute('data-slot'), 10);
                if (isNaN(slot) || slot < 0) return;
                var camId = slotCam[slot];
                if (camId) removeCamFromWatch(camId);
                else {
                    stopSlot(slot, true);
                    updateWatchButtons();
                    renderWatchList();
                }
            });
        });
        document.querySelectorAll('.ax-fr-tile').forEach(function (tile) {
            if (tile._frFocusBound) return;
            tile._frFocusBound = true;
            tile.addEventListener('click', function (ev) {
                if (ev.target && ev.target.closest && ev.target.closest('.ax-fr-tile-stop')) return;
                var slot = parseInt(tile.getAttribute('data-slot'), 10);
                if (isNaN(slot) || slot < 0) return;
                if (!slotCam[slot]) {
                    setFocusedSlot(-1);
                    return;
                }
                setFocusedSlot(slot);
            });
        });
    }

    function bindWatchRoster() {
        var startBtn = document.getElementById('ax-fr-watch-start');
        var stopBtn = document.getElementById('ax-fr-watch-stop');
        var stopAllBtn = document.getElementById('ax-fr-watch-stop-all');
        var clearBtn = document.getElementById('ax-fr-roster-clear');
        if (startBtn) startBtn.onclick = function () { startWatch(); };
        if (stopBtn) stopBtn.onclick = function () { stopSelectedVideo(); };
        if (stopAllBtn) stopAllBtn.onclick = function () { stopAllWatch(); };
        if (clearBtn) clearBtn.onclick = function () { clearWatchSet(); };

        var searchEl = document.getElementById('ax-fr-roster-search');
        if (searchEl) {
            searchEl.oninput = function () {
                rosterSearch = searchEl.value || '';
                renderWatchList();
            };
            if (rosterSearchFocused) {
                searchEl.focus();
                try {
                    var len = searchEl.value.length;
                    searchEl.setSelectionRange(len, len);
                } catch (_) { /* ignore */ }
                rosterSearchFocused = false;
            }
        }
        var filterEl = document.getElementById('ax-fr-roster-filter');
        if (filterEl) {
            filterEl.onchange = function () {
                rosterFilter = filterEl.value || 'online';
                renderWatchList();
            };
        }

        var el = document.getElementById('ax-fr-watch-list');
        if (!el) return;

        el.querySelectorAll('.ax-fr-roster-watch-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                toggleSelect(cb.getAttribute('data-cam'), cb.checked);
            });
        });
        el.querySelectorAll('.ax-fr-roster-pin').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                togglePin(btn.getAttribute('data-cam'));
            });
        });
        el.querySelectorAll('.ax-fr-roster-group-expand').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var gName = btn.getAttribute('data-group');
                if (!gName) return;
                var blocks = buildRosterGroupBlocks(buildGroupedFleetRows(rosterDevicesFiltered()));
                var expanded = false;
                blocks.forEach(function (block) {
                    if (block.header && block.header.groupName === gName) {
                        expanded = isGroupExpanded(block);
                    }
                });
                rosterGroupExpanded[gName] = !expanded;
                renderWatchList();
            });
        });
        el.querySelectorAll('.ax-fr-roster-group-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var gName = cb.getAttribute('data-group');
                var devices = [];
                Object.keys(fleetById).forEach(function (id) {
                    var d = fleetById[id];
                    if (!d) return;
                    var g = String(d.mapGroup || '').trim();
                    var label = g || tr('fleet.groupUngrouped', 'Ungrouped');
                    if (label === gName) devices.push(d);
                });
                toggleGroupWatch(devices, cb.checked);
            });
            if (cb.indeterminate !== undefined) {
                var gName2 = cb.getAttribute('data-group');
                var devs = [];
                Object.keys(fleetById).forEach(function (id) {
                    var d = fleetById[id];
                    if (!d) return;
                    var g = String(d.mapGroup || '').trim();
                    var label = g || tr('fleet.groupUngrouped', 'Ungrouped');
                    if (label === gName2) devs.push(d);
                });
                var st = groupWatchState(devs);
                cb.indeterminate = st === 'indeterminate';
            }
        });
    }

    function ingestFleet(list) {
        fleetById = Object.create(null);
        (list || []).forEach(function (d) {
            if (!d || !d.id) return;
            var id = String(d.id);
            var mapGroup = String(d.mapGroup || '').trim();
            fleetById[id] = {
                id: id,
                name: d.name || d.id,
                online: !!d.online,
                mapGroup: mapGroup,
                groupColor: groupColorForDevice(id, mapGroup),
            };
        });
        // Drop offline from selection? Keep selected but skip in rotate; mark offline on tiles
        if (watching) {
            for (var i = 0; i < LIVE_SLOTS; i++) {
                var id = slotCam[i];
                if (id && !deviceOnline(id)) {
                    clearSignalTimer(i);
                    setTileMeta(i, id, TILE_STATE.OFFLINE);
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
            var camId = normalizeFrCamId(data.camId);
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
            var camId = String(data.camId);
            var stateKey = parseStreamError(data);
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId) {
                    clearSignalTimer(i);
                    destroyPlayer(i);
                    setTileMeta(i, camId, stateKey);
                }
            }
        });
        /* mob-fr-tile-sos-badge — chip on FR tile for active SOS/FALL cam */
        sock.on('sos-alarm', function (data) {
            if (!data || !data.cameraId) return;
            var id = normalizeFrCamId(data.cameraId);
            if (!id) return;
            sosKindByCam[id] = (data.alarmKind === 'fall') ? 'fall' : 'sos';
            syncAllTileSosBadges();
        });
        sock.on('sos-acknowledged', function (data) {
            if (data && data.cameraId) {
                delete sosKindByCam[normalizeFrCamId(data.cameraId)];
            }
            syncAllTileSosBadges();
        });
    }

    function onFacePanelShow() {
        bindSocket();
        bindTileStopButtons();
        loadFleet();
        if (!socketBound) {
            var n = 0;
            var iv = setInterval(function () {
                bindSocket();
                if (socketBound || ++n > 40) clearInterval(iv);
            }, 100);
        }
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
        syncAllTileSosBadges();
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
