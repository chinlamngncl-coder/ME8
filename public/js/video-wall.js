/**
 * Six-slot live video wall \u2014 panels 1\u20134 fixed; panels 5\u20136 poll extra online BWCs.
 *
 * Player: JSMpeg first. Soft ZLM overlay (mob-zlm-wall-safe-no-wipe) only for
 * single-cam wall \u2014 never wipe panel; Open All skips ZLM.
 * Video WS: ws://host:(HTTP+1) e.g. 3889 \u2014 server bridge fans out (clients:2+).
 * Audio WS: ws://host:(HTTP+2) e.g. 3890 \u2014 PCM Web Audio, separate from JSMpeg.
 *
 * Map pin: per-cam JSMpeg on pool WS fanout (mob-pin-pool-jsmpeg-primary). No wall canvas mirror.
 * Reuse: pool already live (ops / CW / stream-ready) \u2192 no start-video; attach pin JSMpeg on videoWsUrl().
 */

(function (global) {

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    const SLOT_COUNT = 10;
    const PIN_SLOT_COUNT = 8;
    const BANK_A_COUNT = 5;
    const MAX_LIVE_STREAMS = 10;
    let wallBankPage = 'a';
    const OPS_VIEWER_SURFACE = 'ops';
    function alarmStreamLabel() { return tr('video.stream.sos'); }
    function liveStreamLabel() { return tr('video.stream.live'); }

    function commandWallWatchingCam(camId) {
        return !!(global.CommandWall && CommandWall.hasLiveForCam && CommandWall.hasLiveForCam(camId));
    }

    /** Pool session up for this camId \u2014 pin may attach JSMpeg without a new INVITE. */
    function pinCanReusePoolWs(camId) {
        if (!camId) return false;
        return wallHasPlayerForCam(camId) || isStreamInvited(camId) || commandWallWatchingCam(camId);
    }

    function emitOpsStartVideo(camId, extra) {
        if (!socket || !camId) return;
        const payload = Object.assign({
            camId: camId,
            mode: 'video',
            surface: OPS_VIEWER_SURFACE,
        }, extra || {});
        console.log('[PIN-TRACE] emit start-video', payload);
        console.log('[PIN-TRACE] 5. Emitting start-video for', camId);
        socket.emit('start-video', payload);
    }

    /** Operator-initiated stop \u2014 wins over socket reason if events race. */
    const localDashboardStopCams = new Set();

    function emitOpsStopVideo(camId, reason, clientReason) {
        if (!socket || !camId) return;
        camId = String(camId).trim();
        reason = String(reason || 'operator').trim() || 'operator';
        clientReason = String(clientReason || 'emitOpsStopVideo').trim() || 'emitOpsStopVideo';
        console.trace('[me8-stop-video-trace]', {
            camId: camId,
            surface: OPS_VIEWER_SURFACE,
            reason: reason,
            clientReason: clientReason,
        });
        if (reason === 'operator') localDashboardStopCams.add(camId);
        socket.emit('stop-video', {
            camId: camId,
            surface: OPS_VIEWER_SURFACE,
            reason: reason,
            clientReason: clientReason,
        });
    }

    const players = new Map();

    /** Wall slot index or 'map:camId' \u2192 camId bound to that JSMpeg player. */
    const activeStreams = new Map();

    /** camId \u2192 JSMpeg player for map pin popups (up to MAX_LIVE_STREAMS). */
    const mapPlayers = new Map();
    const mapPinCleanupInProgress = new Set();

    function ensureActivePlayersRegistry() {
        if (!global.activePlayers) global.activePlayers = Object.create(null);
    }

    function activePlayerRegistryKey(camId, target) {
        return String(camId || '').trim() + ':' + target;
    }

    function getRegisteredActivePlayer(camId, target) {
        ensureActivePlayersRegistry();
        return global.activePlayers[activePlayerRegistryKey(camId, target)] || null;
    }

    function clearRegisteredActivePlayer(camId, target) {
        ensureActivePlayersRegistry();
        delete global.activePlayers[activePlayerRegistryKey(camId, target)];
    }

    function registerActivePlayer(camId, target, player, canvas) {
        ensureActivePlayersRegistry();
        global.activePlayers[activePlayerRegistryKey(camId, target)] = {
            player: player,
            canvas: canvas,
        };
    }

    /** camIds with an active server INVITE / RTP session. */
    const streamingCams = new Set();

    /** Map pin cams that received at least one decoded JSMpeg frame (not canvas size alone). */
    const mapPinDecodedCams = new Set();

    /** Wall slot reserved before JSMpeg attaches (Open All must not pile onto slot 0). */
    const pendingWallSlots = {};

    /** Cam IDs from last Open All session. */
    let openAllReservedIds = null;

    /** Open All: camId \u2192 config wall slot (panel = slot + 1). */
    let openAllSlotByCam = null;

    /** Wall slots locked by Open All (rotation paused on these). */
    const openAllOccupiedSlots = new Set();

    /** Pending assignCamToSlot canvas timers \u2014 cleared when the same slot re-assigns. */
    const slotRenderTimers = new Map();

    const OPEN_ALL_DEVICE_STAGGER_MS = 300;

    let openAllLivePinsSyncTimer = null;
    let isBatchOpening = false;
    global.__me8PinBatchOpening = false;

    let mapMirrorRaf = null;

    let mapMirrorCamId = null;

    function ensureMapPinVideoRafs() {
        if (!global.mapPinVideoRafs) global.mapPinVideoRafs = Object.create(null);
    }

    function mapPinMirrorActive(camId) {
        ensureMapPinVideoRafs();
        return !!(camId && global.mapPinVideoRafs[camId]);
    }

    function stopMapPinMirror(camId) {
        ensureMapPinVideoRafs();
        if (camId) {
            const rafId = global.mapPinVideoRafs[camId];
            if (rafId) {
                cancelAnimationFrame(rafId);
                delete global.mapPinVideoRafs[camId];
            }
            if (mapMirrorCamId === camId) mapMirrorCamId = null;
            return;
        }
        Object.keys(global.mapPinVideoRafs).forEach(function (id) {
            stopMapPinMirror(id);
        });
        mapMirrorRaf = null;
        mapMirrorCamId = null;
    }

    let socket = null;

    let activeCamId = null;

    let streamingCamId = null;

    let voiceCallCamId = null;

    let voiceCallPending = false;

    let pttEnabled = false;

    /** Server-authoritative video mode; WVP pins wait for the wall FLV and never attach JSMpeg. */
    let wvpVideoHandoffUi = false;

    const pttOnlineDevices = new Set();

    let pttMic = null;

    let pttTalkCamId = null;

    /** When set, operator group PTT fans out to every camId in this list (SOS response team). */
    let pttTalkCamIds = null;

    let pttHolding = false;

    let pttError = null;

    const pttRxActive = new Set();

    const pttRxLinger = new Set();

    /** Operator clicked banner/toast \u2014 show PTT Comm on map pin even when live is open. */
    let pttCommPinForcedCamId = null;

    let pttDownlinkPolicy = {
        modelVoicePrefixes: ['UB'],
        downlinkByCamId: {},
        deviceModels: {},
        downlinkResolved: {},
        voiceOverrideCamIds: [],
    };
    let voiceCallProfiles = {};

    let pttVoiceFallbackHold = false;

    let pttVoiceFallbackStartedCall = false;

    let pttVoiceFallbackAwaitingCall = false;

    /** Fleet row 🎙 wake poke in flight (Ops only). */
    const pttWakingCamIds = new Set();

    function videoWsUrl(camId) {
        const port = window.location.port ? (parseInt(window.location.port, 10) + 1) : 3889;
        var url = 'ws://' + window.location.hostname + ':' + port + '/';
        if (camId) url += '?camId=' + encodeURIComponent(camId);
        return url;
    }

    function isFixedCameraSourceId(camId) {
        return String(camId || '').indexOf('fixed:') === 0;
    }

    function fixedCameraRegistryId(camId) {
        return String(camId || '').replace(/^fixed:/, '');
    }

    function mapStreamKey(camId) {
        return camId ? ('map:' + camId) : 'map';
    }

    function getMapPlayer(camId) {
        return camId ? mapPlayers.get(camId) : null;
    }

    function getWallPlayer(camId) {
        if (!camId) return null;
        const id = String(camId).trim();
        for (const el of getSlots()) {
            const idx = findSlotIndex(el);
            if (!players.has(idx)) continue;
            const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
            if (bound === id) return players.get(idx) || null;
        }
        return null;
    }

    function hasAnyMapPlayer() {
        return mapPlayers.size > 0;
    }

    function isStreamInvited(camId) {
        return !!(camId && streamingCams.has(camId));
    }

    function destroyMapPlayer(camId) {
        if (!camId) {
            mapPlayers.forEach(function (_, id) { destroyMapPlayer(id); });
            return;
        }
        if (mapPinMirrorActive(camId) || mapMirrorCamId === camId) stopMapPinMirror(camId);
        const p = mapPlayers.get(camId);
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            mapPlayers.delete(camId);
        }
        clearBwcStallWatch(camId);
        clearRegisteredActivePlayer(camId, 'map');
        activeStreams.delete(mapStreamKey(camId));
        mapPinDecodedCams.delete(camId);
        const pinHost = mapPinHostForCam(camId);
        if (pinHost) {
            pinHost.classList.remove('vid-box-live', 'map-pin-has-live');
        }
        maybeStopPcmAudio();
        syncPinAudioUi();
    }

    /** After SOS session ends \u2014 restore GTID 49 always-on PTT unless dispatch group PTT is active. */
    function restorePttAfterSosSessionClose(opts) {
        opts = opts || {};
        global.activeSosPttTeam = null;
        syncAllPttUi();
        const dispatchActive = Array.isArray(global.activeDispatchPttTeam)
            && global.activeDispatchPttTeam.length >= 2;
        if (dispatchActive && opts.respectDispatchGroup !== false) {
            return;
        }
        if (socket) socket.emit('ptt-restore-always-on');
    }

    function releaseServerStreamIfIdle(camId) {
        if (!camId || !socket) return;
        if (wallHasPlayerForCam(camId)) return;
        if (mapPlayers.has(camId)) return;
        if (commandWallWatchingCam(camId)) return;
        if (!streamingCams.has(camId)) return;
        emitOpsStopVideo(camId, 'idle-release', 'releaseServerStreamIfIdle');
        streamingCams.delete(camId);
        if (streamingCamId === camId) {
            streamingCamId = streamingCams.values().next().value || null;
        }
    }

    function audioWsUrl() {
        const port = window.location.port ? (parseInt(window.location.port, 10) + 2) : 3890;
        return 'ws://' + window.location.hostname + ':' + port;
    }

    let pcmAudio = null;

    const LIVE_AUDIO_VOL_KEY = 'fm_live_audio_volume';

    const slotAudioMuted = new Map();

    const camAudioMuted = new Map();

    let pinAudioUiBound = false;

    function camIdKey(camId) {
        return camId ? String(camId).trim() : '';
    }

    function isCamAudioMuted(camId) {
        const id = camIdKey(camId);
        if (!id) return true;
        if (!camAudioMuted.has(id)) return true;
        return !!camAudioMuted.get(id);
    }

    function syncAudioUiForCam(camId) {
        const id = camIdKey(camId);
        if (!id) return;
        const muted = isCamAudioMuted(id);
        getSlots().forEach(function (slotEl, idx) {
            if (!players.has(idx)) return;
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound === id) {
                slotAudioMuted.set(idx, muted);
                updateSlotAudioButton(idx);
            }
        });
        syncPinAudioUi(id);
    }

    function syncAllCamAudioUi() {
        syncAllSlotAudioUi();
        syncPinAudioUi();
    }

    function setCamAudioMuted(camId, muted) {
        const id = camIdKey(camId);
        if (!id) return;
        if (!muted) {
            camAudioMuted.forEach(function (_, other) {
                if (other !== id) camAudioMuted.set(other, true);
            });
            camAudioMuted.set(id, false);
            /* WALL-AUDIO-PATH-V1 \u2014 handoff never starts PCM on JSMpeg attach; open WS + focus on unmute */
            if (!isFixedCameraSourceId(id)) startPcmAudio();
            if (socket) socket.emit('audio-focus', { camId: id });
            syncAllCamAudioUi();
        } else {
            camAudioMuted.set(id, true);
            syncAudioUiForCam(id);
        }
        applyLiveAudioGain();
    }

    function getStoredLiveAudioVolume() {
        try {
            const v = parseInt(localStorage.getItem(LIVE_AUDIO_VOL_KEY), 10);
            if (Number.isFinite(v) && v >= 0 && v <= 100) return v;
        } catch (_) { /* ignore */ }
        return 100;
    }

    function isSlotAudioMuted(slotIndex) {
        const slotEl = getSlots()[slotIndex];
        if (!slotEl || !players.has(slotIndex)) return true;
        const camId = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
        return isCamAudioMuted(camId);
    }

    function setSlotAudioMuted(slotIndex, muted) {
        const slotEl = getSlots()[slotIndex];
        const camId = slotEl && (slotEl.dataset.camId || resolveCamIdForSlot(slotEl));
        if (camId) setCamAudioMuted(camId, muted);
    }

    function toggleSlotAudio(slotIndex) {
        const slotEl = getSlots()[slotIndex];
        const camId = slotEl && (slotEl.dataset.camId || resolveCamIdForSlot(slotEl));
        if (camId && isSosCamForAudio(camId)) return;
        if (!camId) return;
        setCamAudioMuted(camId, !isCamAudioMuted(camId));
    }

    function setPinAudioMuted(muted) {
        const pinCam = pinCamIdFromPopup();
        if (!pinCam) return;
        setCamAudioMuted(pinCam, !!muted);
    }

    function togglePinAudio() {
        const pinCam = pinCamIdFromPopup();
        if (pinCam && isSosCamForAudio(pinCam)) return;
        if (!pinCam) return;
        setCamAudioMuted(pinCam, !isCamAudioMuted(pinCam));
    }

    function pinCamIdFromPopup() {
        const pop = document.querySelector('.leaflet-popup-content .map-popup');
        return pop ? pop.getAttribute('data-cam-id') : null;
    }

    function eachOpenPinPopup(cb) {
        const seen = {};
        if (typeof global.getOpenPinCamIds === 'function') {
            global.getOpenPinCamIds().forEach(function (camId) {
                const root = mapPopupRootForCam(camId);
                if (root && !seen[camId]) {
                    seen[camId] = true;
                    cb(camId, root);
                }
            });
        }
        document.querySelectorAll('.leaflet-popup-content .map-popup[data-cam-id]').forEach(function (root) {
            const camId = root.getAttribute('data-cam-id');
            if (camId && !seen[camId]) cb(camId, root);
        });
    }

    function isAudioListenAllowed() {
        if (voiceCallCamId) return true;
        if (!pcmAudio) return false;
        const slots = getSlots();
        for (let i = 0; i < slots.length; i++) {
            if (!players.has(i)) continue;
            const camId = resolveCamIdForSlot(slots[i]) || slots[i].dataset.camId || streamingCamId;
            if (!camId) continue;
            /* WALL-AUDIO-PATH-V1 \u2014 handoff Live counts even if invite set races */
            if (!isStreamInvited(camId) && !wallHasPlayerForCam(camId)) continue;
            if (!isCamAudioMuted(camId)) return true;
        }
        let pinOk = false;
        eachOpenPinPopup(function (id) {
            if (pinOk || !id) return;
            if (!isStreamInvited(id) && !wallHasPlayerForCam(id) && !mapPlayers.has(id)) return;
            if ((mapPlayers.has(id) || wallHasPlayerForCam(id)) && !isCamAudioMuted(id)) pinOk = true;
        });
        return pinOk;
    }

    const VOICE_HINT_TOAST_MS = 20000;
    const VOICE_HINT_CLIENT_COOLDOWN_MS = 20000;
    let voiceHintToastEl = null;
    let voiceHintToastTimer = null;
    let voiceHintUiBound = false;
    const voiceHintClientCooldown = Object.create(null);

    function deviceLabelForCam(camId) {
        if (global.FleetUi && FleetUi.getDeviceName) {
            const n = FleetUi.getDeviceName(camId);
            if (n) return n;
        }
        return camId ? String(camId).slice(-8) : 'BWC';
    }

    function unmuteListenForCam(camId) {
        if (!camId) return;
        setCamAudioMuted(camId, false);
        hideVoiceHintToast();
    }

    function buildVoiceHintToastBody(el, camId) {
        el.replaceChildren();
        const msg = document.createElement('div');
        msg.className = 'live-voice-hint-msg';
        msg.textContent = tr('video.voiceHintToast', { name: deviceLabelForCam(camId) });
        el.appendChild(msg);
        const actions = document.createElement('div');
        actions.className = 'live-voice-hint-actions';
        const listenBtn = document.createElement('button');
        listenBtn.type = 'button';
        listenBtn.className = 'live-voice-hint-btn live-voice-hint-listen';
        listenBtn.textContent = tr('video.voiceHintListen');
        const callBtn = document.createElement('button');
        callBtn.type = 'button';
        callBtn.className = 'live-voice-hint-btn live-voice-hint-call';
        callBtn.textContent = tr('video.voiceHintCall');
        const dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'live-voice-hint-btn live-voice-hint-dismiss';
        dismissBtn.textContent = tr('video.voiceHintDismiss');
        actions.appendChild(listenBtn);
        actions.appendChild(callBtn);
        actions.appendChild(dismissBtn);
        el.appendChild(actions);
    }

    function bindVoiceHintToastUi() {
        if (voiceHintUiBound) return;
        voiceHintUiBound = true;
        document.addEventListener('click', function (ev) {
            const listenBtn = ev.target.closest('.live-voice-hint-listen');
            const callBtn = ev.target.closest('.live-voice-hint-call');
            const dismissBtn = ev.target.closest('.live-voice-hint-dismiss');
            if (!listenBtn && !callBtn && !dismissBtn) return;
            const el = voiceHintToastEl || document.getElementById('live-voice-hint-toast');
            const camId = el && el.getAttribute('data-cam-id');
            if (!camId) return;
            ev.preventDefault();
            ev.stopPropagation();
            if (listenBtn) {
                unmuteListenForCam(camId);
                return;
            }
            if (callBtn) {
                hideVoiceHintToast();
                toggleVoiceCall(camId);
                return;
            }
            if (dismissBtn) hideVoiceHintToast();
        }, true);
    }

    function ensureVoiceHintToast() {
        if (voiceHintToastEl) return voiceHintToastEl;
        voiceHintToastEl = document.getElementById('live-voice-hint-toast');
        if (!voiceHintToastEl) {
            voiceHintToastEl = document.createElement('div');
            voiceHintToastEl.id = 'live-voice-hint-toast';
            voiceHintToastEl.hidden = true;
            voiceHintToastEl.setAttribute('role', 'status');
            document.body.appendChild(voiceHintToastEl);
        }
        bindVoiceHintToastUi();
        return voiceHintToastEl;
    }

    function hideVoiceHintToast() {
        if (voiceHintToastTimer) {
            clearTimeout(voiceHintToastTimer);
            voiceHintToastTimer = null;
        }
        const el = voiceHintToastEl || document.getElementById('live-voice-hint-toast');
        if (!el) return;
        el.hidden = true;
        el.removeAttribute('data-cam-id');
        el.classList.remove('live-voice-hint-active');
        el.replaceChildren();
    }

    function showVoiceHintToast(camId) {
        const el = ensureVoiceHintToast();
        el.hidden = false;
        el.setAttribute('data-cam-id', camId || '');
        buildVoiceHintToastBody(el, camId);
        el.classList.add('live-voice-hint-active');
        if (voiceHintToastTimer) clearTimeout(voiceHintToastTimer);
        voiceHintToastTimer = setTimeout(hideVoiceHintToast, VOICE_HINT_TOAST_MS);
    }

    function onLiveVoiceHint(data) {
        if (!data || !data.camId) return;
        if (typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive()) return;
        const camId = String(data.camId).trim();
        if (!hasActiveDashboardLiveForCam(camId)) return;
        if (global.PttRx && PttRx.isRxActive(camId)) return;
        const now = Date.now();
        if (voiceHintClientCooldown[camId] && now - voiceHintClientCooldown[camId] < VOICE_HINT_CLIENT_COOLDOWN_MS) return;
        voiceHintClientCooldown[camId] = now;
        showVoiceHintToast(camId);
    }

    const VOICE_ONLY_CALL_GAIN = 0.6;
    const PCM_LISTEN_JITTER_SEC = 0.08;
    const PCM_LISTEN_MAX_QUEUE_SEC = 0.5;

    function voiceOnlyCallListenScale() {
        if (!voiceCallCamId || isLiveCamId(voiceCallCamId)) return 1;
        return VOICE_ONLY_CALL_GAIN;
    }

    function applyLiveAudioGain() {
        if (!pcmAudio || !pcmAudio.gain) return;
        const vol = getStoredLiveAudioVolume();
        pcmAudio.gain.gain.value = isAudioListenAllowed()
            ? voiceOnlyCallListenScale()
                * ((global.PttRx && PttRx.isAnyRxActive()) ? 0.15 : 1)
                * (vol / 100)
            : 0;
        syncPinAudioUi();
        syncLayoutAudioVol();
    }

    function syncLayoutAudioVol() {
        const gutter = document.getElementById('layout-gutter');
        const wrap = document.getElementById('layout-audio-vol-wrap');
        const slider = document.getElementById('layout-audio-vol');
        if (!wrap || !slider) return;
        const listening = isAudioListenAllowed();
        wrap.hidden = !listening;
        if (gutter) gutter.classList.toggle('listening', listening);
        slider.value = String(getStoredLiveAudioVolume());
    }

    function updateSlotAudioButton(slotIndex) {
        const slots = getSlots();
        const slotEl = slots[slotIndex];
        if (!slotEl) return;
        const btn = slotEl.querySelector('.video-slot-audio');
        if (!btn) return;
        const muted = isSlotAudioMuted(slotIndex);
        const live = players.has(slotIndex);
        btn.disabled = !live;
        btn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
        btn.title = !live ? 'Audio (starts muted when live)' : (muted ? 'Listen to this panel' : 'Mute this panel');
        btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        btn.classList.toggle('listening', live && !muted);
    }

    function syncAllSlotAudioUi() {
        getSlots().forEach((_, idx) => updateSlotAudioButton(idx));
    }

    function isLiveCamId(camId) {
        if (!camId) return false;
        if (wallHasPlayerForCam(camId)) return true;
        if (mapPlayers.has(camId)) return true;
        if (mapPinHasLiveVideo(camId)) return true;
        return isStreamInvited(camId) && (players.size > 0 || mapPlayers.has(camId));
    }

    function updateSlotCallButton(slotIndex) {
        const slots = getSlots();
        const slotEl = slots[slotIndex];
        if (!slotEl) return;
        const btn = slotEl.querySelector('.video-slot-call');
        if (!btn) return;
        let camId = streamCamForSlotKey(slotIndex) || resolveCamIdForSlot(slotEl);
        const active = !!(camId && voiceCallCamId === camId);
        const live = camId && isLiveCamId(camId);
        btn.hidden = !live;
        btn.disabled = !live || (voiceCallPending && !active);
        btn.classList.toggle('active', active);
        btn.title = active ? tr('call.end') : tr('call.whenLive');
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    function syncAllCallUi() {
        getSlots().forEach((_, idx) => updateSlotCallButton(idx));
        syncPinCallUi();
        syncPinVoiceUi();
        syncAllPttUi();
        syncFleetVoiceRows();
    }

    function isPttReadyForCam(camId) {
        return !!(pttEnabled && camId && pttOnlineDevices.has(camId));
    }

    function isPttTalkReadyForCam(camId) {
        return isPttReadyForCam(camId);
    }

    function resolvePttTalkCamIds(camId) {
        const id = String(camId || '').trim();
        if (!id) return [];
        const dispatchTeam = global.activeDispatchPttTeam;
        /* PTT-GROUP-NET-MESH-AND-TALK-V1 \u2014 fanout when Joined net includes this cam (2+) */
        if (Array.isArray(dispatchTeam) && dispatchTeam.length >= 2 && dispatchTeam.indexOf(id) >= 0) {
            return dispatchTeam.map(String).filter(Boolean);
        }
        const sosTeam = global.activeSosPttTeam;
        if (Array.isArray(sosTeam) && sosTeam.length > 1 && sosTeam.indexOf(id) >= 0) {
            return sosTeam.map(String).filter(Boolean);
        }
        return [id];
    }

    function dispatchGroupNetActive() {
        return Array.isArray(global.activeDispatchPttTeam)
            && global.activeDispatchPttTeam.length >= 2;
    }

    function resolveDispatchGroupTalkSeedCamId() {
        const team = global.activeDispatchPttTeam;
        if (!Array.isArray(team) || team.length < 2) return null;
        for (let i = 0; i < team.length; i++) {
            const id = String(team[i] || '').trim();
            if (id && isPttTalkReadyForCam(id)) return id;
        }
        return String(team[0] || '').trim() || null;
    }

    function updateDispatchGroupPttButton() {
        const row = document.getElementById('ptt-group-talk-row');
        const hint = document.getElementById('ptt-group-talk-hint');
        const btn = document.getElementById('ptt-group-talk-hold');
        const activeNet = dispatchGroupNetActive();
        if (row) row.hidden = !activeNet;
        if (hint) hint.hidden = !activeNet;
        if (!btn) return;
        const talking = !!(pttHolding && pttTalkCamIds && pttTalkCamIds.length > 1);
        btn.classList.toggle('active', talking);
        btn.disabled = !activeNet || !pttEnabled
            || (pttHolding && !talking)
            || false;
        btn.setAttribute('aria-pressed', talking ? 'true' : 'false');
        if (talking) {
            btn.title = tr('ptt.groupTalking', { n: pttTalkCamIds.length });
        } else {
            btn.title = tr('ptt.groupBox.holdTalk');
        }
    }

    function bindDispatchGroupPttHold(btn) {
        if (!btn) return;
        bindPttHoldButton(btn, resolveDispatchGroupTalkSeedCamId, { wakeOnNotReady: true });
    }

    /** SOS response team active for this cam \u2014 HQ hold PTT fans out to full team (v1.8). */
    function sosPttGroupTalkActiveForCam(camId) {
        const id = String(camId || '').trim();
        if (!id) return false;
        const sosTeam = global.activeSosPttTeam;
        return Array.isArray(sosTeam) && sosTeam.length > 1 && sosTeam.indexOf(id) >= 0;
    }

    function setDispatchPttTeam(camIds) {
        global.activeDispatchPttTeam = Array.isArray(camIds) && camIds.length
            ? camIds.map(String).filter(Boolean)
            : null;
        syncAllPttUi();
    }

    function clearDispatchPttTeam(restoreAlwaysOn) {
        global.activeDispatchPttTeam = null;
        if (restoreAlwaysOn && socket) socket.emit('ptt-restore-always-on');
        syncAllPttUi();
    }

    function pttGroupTalkSize() {
        return (pttTalkCamIds && pttTalkCamIds.length > 1) ? pttTalkCamIds.length : 0;
    }

    function pttTalkTitle(camId, ready) {
        if (camId && pttWakingCamIds.has(camId)) return tr('ptt.wakingChannel');
        if (pttHolding && pttTalkCamId === camId) {
            const n = pttGroupTalkSize();
            if (n > 1) return tr('ptt.groupTalking', { n: n });
            return tr('ptt.talking');
        }
        if (ready) return tr('ptt.holdTalk');
        const name = global.FleetUi && FleetUi.getDeviceName
            ? FleetUi.getDeviceName(camId)
            : (camId ? String(camId).slice(-8) : '');
        return tr('ptt.tapToWake', { name: name || 'BWC' });
    }

    function updateSlotPttButton(slotIndex) {
        const slots = getSlots();
        const slotEl = slots[slotIndex];
        if (!slotEl) return;
        const btn = slotEl.querySelector('.video-slot-ptt');
        if (!btn) return;
        let camId = streamCamForSlotKey(slotIndex) || resolveCamIdForSlot(slotEl);
        const ready = isPttTalkReadyForCam(camId);
        const waking = !!(camId && pttWakingCamIds.has(camId));
        btn.hidden = !pttEnabled || !camId;
        btn.disabled = (pttHolding && pttTalkCamId !== camId)
            || voiceCallBlocksPttForCam(camId);
        const active = !!(camId && pttHolding && pttTalkCamId === camId);
        btn.classList.toggle('active', active);
        btn.classList.toggle('video-slot-ptt-awaiting', !ready && !waking && !!camId);
        btn.classList.toggle('video-slot-ptt-waking', waking);
        btn.title = pttTalkTitle(camId, ready);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        slotEl.classList.toggle('video-slot-ptt-tx', !!(active && pttHolding));
    }

    function syncAllPttUi() {
        getSlots().forEach((_, idx) => updateSlotPttButton(idx));
        syncPinPttUi();
        syncPinPttTxUi();
        syncFleetPttRows();
        updateDispatchGroupPttButton();
    }

    function applyVoiceCallPolicy(data) {
        if (!data || typeof data !== 'object') return;
        voiceCallProfiles = data.voiceCallProfiles && typeof data.voiceCallProfiles === 'object'
            ? Object.assign({}, data.voiceCallProfiles) : {};
    }

    function fleetVoicePathForCam(camId) {
        const id = String(camId || '').trim();
        return id && voiceCallProfiles[id] ? voiceCallProfiles[id] : 'broadcast';
    }

    function applyPttDownlinkPolicy(data) {
        if (!data || typeof data !== 'object') return;
        pttDownlinkPolicy = {
            modelVoicePrefixes: Array.isArray(data.modelVoicePrefixes) ? data.modelVoicePrefixes.slice() : ['UB'],
            downlinkByCamId: data.downlinkByCamId && typeof data.downlinkByCamId === 'object'
                ? Object.assign({}, data.downlinkByCamId) : {},
            deviceModels: data.deviceModels && typeof data.deviceModels === 'object'
                ? Object.assign({}, data.deviceModels) : {},
            downlinkResolved: data.downlinkResolved && typeof data.downlinkResolved === 'object'
                ? Object.assign({}, data.downlinkResolved) : {},
            voiceOverrideCamIds: Array.isArray(data.voiceOverrideCamIds) ? data.voiceOverrideCamIds.slice() : [],
        };
    }

    function isPttVoiceFallbackCam(camId) {
        return false;
    }

    function voiceCallBlocksPttForCam(camId) {
        if (!camId || voiceCallCamId !== camId) return false;
        return !(pttHolding && pttVoiceFallbackHold && pttTalkCamId === camId);
    }

    function waitForVoiceCallActive(camId, timeoutMs) {
        return new Promise(function (resolve) {
            if (voiceCallCamId === camId) {
                resolve(true);
                return;
            }
            const deadline = Date.now() + (timeoutMs || 5000);
            (function tick() {
                if (voiceCallCamId === camId) {
                    resolve(true);
                    return;
                }
                if (Date.now() >= deadline || !pttHolding) {
                    resolve(false);
                    return;
                }
                setTimeout(tick, 80);
            })();
        });
    }

    function fleetPttTalkTitle(camId, ready) {
        const name = global.FleetUi && FleetUi.getDeviceName
            ? FleetUi.getDeviceName(camId)
            : camId;
        if (pttWakingCamIds.has(camId)) return tr('ptt.wakingChannel');
        if (pttHolding && pttTalkCamId === camId) {
            return tr('ptt.talking');
        }
        if (voiceCallBlocksPttForCam(camId)) {
            return tr('ptt.disabledDuringCall');
        }
        if (ready) {
            return tr('fleet.pttTalkOnly', { name: name || camId });
        }
        return tr('ptt.tapToWake', { name: name || camId });
    }

    function setFleetPttWaking(camId, on) {
        if (!camId) return;
        if (on) pttWakingCamIds.add(camId);
        else pttWakingCamIds.delete(camId);
        syncAllPttUi();
    }

    function waitForPttTalkReady(camId, timeoutMs, abort) {
        return new Promise(function (resolve) {
            if (isPttTalkReadyForCam(camId)) {
                resolve(true);
                return;
            }
            const deadline = Date.now() + (timeoutMs || 8000);
            (function tick() {
                if (abort && abort.cancelled) {
                    resolve(false);
                    return;
                }
                if (isPttTalkReadyForCam(camId)) {
                    resolve(true);
                    return;
                }
                if (Date.now() >= deadline) {
                    resolve(false);
                    return;
                }
                setTimeout(tick, 150);
            })();
        });
    }

    const fleetPttWakeOnlyInFlight = new Set();

    /** Tap-to-wake fleet row PTT \u2014 channel prep without hold (cold start). */
    function pokeFleetPttWakeOnly(camId) {
        if (!socket || !camId || !pttEnabled) return;
        camId = String(camId).trim();
        if (!camId || isPttTalkReadyForCam(camId)) return;
        if (fleetPttWakeOnlyInFlight.has(camId) || pttWakingCamIds.has(camId)) return;
        fleetPttWakeOnlyInFlight.add(camId);
        setFleetPttWaking(camId, true);
        socket.emit('ptt-wake-device', { camId: camId });
        waitForPttTalkReady(camId, 8000, null).then(function (ready) {
            fleetPttWakeOnlyInFlight.delete(camId);
            setFleetPttWaking(camId, false);
            if (ready) syncAllPttUi();
        });
    }

    async function pokeFleetPttWakeAndTalk(camId, talkOpts, abort, isHoldingFn) {
        if (!socket || !camId || !pttEnabled) return;
        setFleetPttWaking(camId, true);
        socket.emit('ptt-wake-device', { camId: camId });
        const ready = await waitForPttTalkReady(camId, 8000, abort);
        setFleetPttWaking(camId, false);
        if (abort && abort.cancelled) return;
        if (!isHoldingFn()) return;
        if (ready) {
            beginPttTalk(camId, talkOpts);
        } else {
            alert(tr('ptt.wakeFailed'));
        }
    }

    function syncFleetPttRows() {
        document.querySelectorAll('.fleet-row-ptt-btn').forEach(function (btn) {
            const camId = btn.getAttribute('data-cam-id');
            if (!camId) return;
            const online = global.FleetUi && FleetUi.isDeviceOnline && FleetUi.isDeviceOnline(camId);
            const ready = isPttTalkReadyForCam(camId);
            const waking = pttWakingCamIds.has(camId);
            btn.hidden = !pttEnabled || !online;
            btn.disabled = (pttHolding && pttTalkCamId !== camId)
                || voiceCallBlocksPttForCam(camId);
            const active = !!(pttHolding && pttTalkCamId === camId);
            btn.classList.toggle('active', active);
            btn.classList.toggle('fleet-row-ptt-awaiting', !ready && !waking && online);
            btn.classList.toggle('fleet-row-ptt-waking', waking);
            btn.title = fleetPttTalkTitle(camId, ready);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            const row = btn.closest('.fleet-row');
            if (row) row.classList.toggle('fleet-row-ptt-tx', active && pttHolding);
            bindPttHoldButton(btn, function () { return camId; }, { forceOneToOne: true, wakeOnNotReady: true });
            if (!btn._pttTapWakeBound) {
                btn._pttTapWakeBound = true;
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (btn.hidden || btn.disabled) return;
                    const id = btn.getAttribute('data-cam-id');
                    if (!id || isPttTalkReadyForCam(id)) return;
                    pokeFleetPttWakeOnly(id);
                });
            }
        });
    }

    function syncPinPttUi(camId) {
        function syncOne(id, root) {
            const bar = root.querySelector('.map-pin-video-bar');
            if (!bar) return;
            const pttBtn = bar.querySelector('.map-pin-ptt');
            if (!pttBtn) return;
            const ready = isPttTalkReadyForCam(id);
            const waking = !!(id && pttWakingCamIds.has(id));
            pttBtn.hidden = !pttEnabled || !id;
            pttBtn.disabled = (pttHolding && pttTalkCamId !== id)
                || voiceCallBlocksPttForCam(id);
            const active = !!(id && pttHolding && pttTalkCamId === id);
            pttBtn.classList.toggle('active', active);
            pttBtn.classList.toggle('map-pin-ptt-awaiting', !ready && !waking && !!id);
            pttBtn.classList.toggle('map-pin-ptt-waking', waking);
            pttBtn.title = pttTalkTitle(id, ready);
            pttBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
            bindPttHoldButton(pttBtn, function () {
                return pttBtn.getAttribute('data-cam-id') || id;
            }, { forceOneToOne: true, wakeOnNotReady: true });
        }
        if (camId) {
            const root = mapPopupRootForCam(camId);
            if (root) syncOne(camId, root);
            return;
        }
        eachOpenPinPopup(syncOne);
    }

    function syncPinPttTxUi() {
        eachOpenPinPopup(function (popCamId, pop) {
            const tx = !!(pttHolding && popCamId && (
                pttTalkCamId === popCamId ||
                (pttTalkCamIds && pttTalkCamIds.indexOf(popCamId) >= 0)
            ));
            pop.classList.toggle('map-popup-ptt-tx', tx);
        });
    }

    function ensurePttMic() {
        if (pttMic || !global.PttMic) return pttMic;
        pttMic = global.PttMic.create(function (alawFrame) {
            if (!socket || !pttHolding || !pttTalkCamId) return;
            socket.emit('ptt-audio', { camId: pttTalkCamId }, alawFrame.buffer);
        });
        return pttMic;
    }

    async function beginPttVoiceFallbackHold(camId) {
        if (!socket || !camId || pttHolding || !pttEnabled) return;
        if (voiceCallCamId && voiceCallCamId !== camId) {
            alert(tr('ptt.disabledDuringCall'));
            return;
        }
        if (!isPttTalkReadyForCam(camId)) {
            alert(tr('ptt.notOnChannel') + ' \u2014 wait a few seconds after live video starts, or press PTT team again.');
            return;
        }
        pttTalkCamId = camId;
        pttTalkCamIds = null;
        pttHolding = true;
        pttVoiceFallbackHold = true;
        pttVoiceFallbackStartedCall = false;
        pttError = null;
        syncAllPttUi();
        try {
            if (voiceCallCamId !== camId) {
                pttVoiceFallbackStartedCall = true;
                pttVoiceFallbackAwaitingCall = true;
                voiceCallPending = true;
                syncAllCallUi();
                socket.emit('start-bwc-call', { camId: camId, audioOnly: true, pttHold: true });
                const ok = await waitForVoiceCallActive(camId, 5000);
                if (!ok || !pttHolding) {
                    throw new Error('Voice call did not connect');
                }
            } else if (window.CallMic) {
                window.CallMic.stop();
            }
            const mic = ensurePttMic();
            if (!mic) throw new Error('PTT mic unavailable');
            await mic.start();
        } catch (err) {
            pttHolding = false;
            pttTalkCamId = null;
            pttVoiceFallbackHold = false;
            pttVoiceFallbackAwaitingCall = false;
            if (pttVoiceFallbackStartedCall && socket) {
                socket.emit('end-bwc-call', { camId: camId });
            }
            pttVoiceFallbackStartedCall = false;
            if (pttMic) pttMic.stop();
            pttError = err && err.message ? err.message : 'Voice call failed';
            alert('PTT (voice): ' + pttError);
            syncAllPttUi();
            syncAllCallUi();
        }
    }

    async function beginPttTalk(camId, opts) {
        opts = opts || {};
        if (!socket || !camId || pttHolding || !pttEnabled) return;
        if (voiceCallBlocksPttForCam(camId)) {
            alert(tr('ptt.disabledDuringCall'));
            return;
        }
        if (!isPttTalkReadyForCam(camId)) {
            alert(tr('ptt.notOnChannel') + ' \u2014 wait a few seconds after live video starts, or press PTT team again.');
            return;
        }
        const camIds = (opts.forceOneToOne && !sosPttGroupTalkActiveForCam(camId))
            ? [String(camId).trim()].filter(Boolean)
            : resolvePttTalkCamIds(camId);
        if (!camIds.length) return;
        pttTalkCamId = camId;
        pttTalkCamIds = camIds.length > 1 ? camIds : null;
        pttHolding = true;
        pttError = null;
        syncAllPttUi();
        if (camIds.length > 1) {
            socket.emit('ptt-start', { camIds: camIds });
        } else {
            socket.emit('ptt-start', { camId: camId });
        }
        try {
            const mic = ensurePttMic();
            if (!mic) throw new Error('PTT mic unavailable');
            await mic.start();
        } catch (err) {
            pttHolding = false;
            pttTalkCamId = null;
            pttTalkCamIds = null;
            pttError = err && err.message ? err.message : 'Microphone blocked';
            if (pttMic) pttMic.stop();
            if (socket && camId) socket.emit('ptt-stop', { camId: camId });
            alert('PTT mic failed: ' + pttError + '. Allow microphone in the browser, or use Call (phone) while live.');
            syncAllPttUi();
        }
    }

    function endPttTalk() {
        if (!pttHolding && !pttTalkCamId) return;
        const camId = pttTalkCamId;
        const wasFallback = pttVoiceFallbackHold;
        const startedCall = pttVoiceFallbackStartedCall;
        pttHolding = false;
        pttVoiceFallbackHold = false;
        pttVoiceFallbackAwaitingCall = false;
        if (pttMic) pttMic.stop();
        if (wasFallback) {
            if (startedCall && socket && camId) {
                socket.emit('end-bwc-call', { camId: camId });
            }
            pttVoiceFallbackStartedCall = false;
        } else if (socket && camId) {
            socket.emit('ptt-stop', { camId: camId });
        }
        pttTalkCamId = null;
        pttTalkCamIds = null;
        syncAllPttUi();
        syncAllCallUi();
    }

    function onPttTalkState(data) {
        if (!data) return;
        if (data.error && !data.active) {
            pttError = data.error;
            pttHolding = false;
            pttTalkCamId = null;
            pttTalkCamIds = null;
            if (pttMic) pttMic.stop();
            alert('PTT: ' + data.error);
        } else if (!data.active && pttTalkCamId === data.camId) {
            pttHolding = false;
            pttTalkCamId = null;
            pttTalkCamIds = null;
            if (pttMic) pttMic.stop();
        }
        syncAllPttUi();
    }

    function onPttDeviceState(data) {
        if (!data || !data.camId) return;
        if (data.online) pttOnlineDevices.add(data.camId);
        else pttOnlineDevices.delete(data.camId);
        syncAllPttUi();
        /* Existing Fleet Voice/Call button readiness also depends on 29201. */
        syncFleetVoiceRows();
    }

    function onPttRxState(data) {
        if (!data || !data.camId) return;
        if (data.active) pttRxActive.add(data.camId);
        else pttRxActive.delete(data.camId);
        syncAllPttRxUi();
        applyLiveAudioGain();
    }

    function onPttRxLinger(data) {
        if (!data || !data.camId) return;
        if (data.active) pttRxLinger.add(data.camId);
        else pttRxLinger.delete(data.camId);
        syncAllPttRxUi();
    }

    function clearPttRxLingerForCamIds(camIds, forLiveStart) {
        (camIds || []).forEach(function (camId) {
            if (!camId) return;
            pttRxLinger.delete(camId);
            pttRxActive.delete(camId);
            if (global.FleetUi && FleetUi.setPttRxLinger) FleetUi.setPttRxLinger(camId, false);
            if (global.FleetUi && FleetUi.setPttRxActive) FleetUi.setPttRxActive(camId, false);
            if (forLiveStart && global.PttRx && PttRx.suppressLingerForLive) {
                PttRx.suppressLingerForLive(camId);
            } else if (global.PttRx && PttRx.clearLingerForCam) {
                PttRx.clearLingerForCam(camId);
            }
        });
        syncAllPttRxUi();
    }

    function clearAllFieldPttRx() {
        const ids = new Set();
        pttRxActive.forEach(function (id) { ids.add(id); });
        pttRxLinger.forEach(function (id) { ids.add(id); });
        pttRxActive.clear();
        pttRxLinger.clear();
        clearPttCommPinForced();
        ids.forEach(function (camId) {
            if (global.FleetUi && FleetUi.setPttRxActive) FleetUi.setPttRxActive(camId, false);
            if (global.FleetUi && FleetUi.setPttRxLinger) FleetUi.setPttRxLinger(camId, false);
        });
        syncAllPttRxUi();
    }

    function pttBoundCamForSlot(slotIndex, slotEl) {
        if (activeStreams.has(slotIndex)) return activeStreams.get(slotIndex);
        if (slotEl && slotEl.dataset.camId) return slotEl.dataset.camId;
        if (global.VideoConfig) {
            const slot = typeof slotIndex === 'number' ? slotIndex : findSlotIndex(slotEl);
            if (typeof slot === 'number') {
                const configured = VideoConfig.getActiveDeviceForSlot(slot);
                if (configured) return configured;
            }
        }
        return null;
    }

    function syncSlotPttRxUi(slotIndex) {
        const slots = getSlots();
        const slotEl = slots[slotIndex];
        if (!slotEl) return;
        let camId = pttBoundCamForSlot(slotIndex, slotEl);
        const isAlarmSlot = slotEl.classList.contains('alarm');
        const liveActive = hasDashboardLiveForCam(camId) || isAlarmSlot;
        const rx = !!(camId && !liveActive && (pttRxActive.has(camId) || pttRxLinger.has(camId)));
        slotEl.classList.toggle('video-slot-ptt-rx', rx);
        const stEl = slotEl.querySelector('.video-slot-status');
        if (stEl && rx) {
            stEl.textContent = tr('video.fieldPtt');
            stEl.classList.add('video-slot-status-ptt-rx');
        } else if (stEl && stEl.classList.contains('video-slot-status-ptt-rx')) {
            stEl.classList.remove('video-slot-status-ptt-rx');
            if (isAlarmSlot) {
                stEl.textContent = players.has(slotIndex) ? tr('video.live') : alarmStreamLabel();
            } else if (players.has(slotIndex)) {
                stEl.textContent = isLiveCamId(camId) ? tr('video.live') : tr('video.connecting');
            } else {
                stEl.textContent = 'Idle';
            }
        }
    }

    function syncAllPttRxUi() {
        getSlots().forEach((_, idx) => syncSlotPttRxUi(idx));
        syncPinPttRxUi();
        if (global.PttRx && PttRx.refreshBanner) PttRx.refreshBanner();
    }

    function wallSlotLiveIntentForCam(camId) {
        if (!camId) return false;
        let found = false;
        getSlots().forEach(function (slotEl) {
            const bound = (slotEl.dataset.camId || slotEl.getAttribute('data-cam-id') || '').trim();
            if (bound !== camId) return;
            const st = slotEl.querySelector('.video-slot-status');
            const label = (st && st.textContent) || '';
            if (label === 'Idle' || label === 'Stopped' || label === 'Offline') return;
            found = true;
        });
        return found;
    }

    function mapPinLiveIntentForCam(camId) {
        if (!camId) return false;
        if (openAllReservedIds && openAllReservedIds.indexOf(camId) >= 0) return true;
        const root = mapPopupRootForCam(camId);
        if (!root) return false;
        if (root.getAttribute('data-offline-popup') === '1') return false;
        if (mapPinHasLiveVideo(camId)) return true;
        const host = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
        if (!host) return false;
        if (host.querySelector('canvas')) return true;
        if (host.querySelector('.map-pin-streaming-label')) return true;
        return !!(host.classList.contains('vid-box-live') || host.classList.contains('map-pin-has-live'));
    }

    function hasDashboardLiveForCam(camId) {
        if (!camId) return false;
        if (global.CommandWall && CommandWall.hasLiveForCam && CommandWall.hasLiveForCam(camId)) {
            return true;
        }
        return !!(
            pinHasActiveLiveForPttComm(camId)
            || wallSlotLiveIntentForCam(camId)
            || mapPinLiveIntentForCam(camId)
        );
    }

    /** Active decode only \u2014 cold PTT linger must not treat stale slot/pin intent as live. */
    function hasActiveDashboardLiveForCam(camId) {
        if (!camId) return false;
        if (global.CommandWall && CommandWall.hasActiveLivePlayerForCam
            && CommandWall.hasActiveLivePlayerForCam(camId)) {
            return true;
        }
        return !!(wallHasPlayerForCam(camId) || mapPinHasLiveVideo(camId));
    }

    function syncPinPttRxUi() {
        eachOpenPinPopup(function (camId, pop) {
            applyMapPinPttCommUi(camId, pop);
        });
    }

    function isPttCommPinForced(camId) {
        if (!camId || !pttCommPinForcedCamId) return false;
        return String(camId).trim() === String(pttCommPinForcedCamId).trim();
    }

    function clearPttCommPinForced(camId) {
        if (!pttCommPinForcedCamId && !global.mapPinOpenPttCommCamId) return;
        if (!camId || isPttCommPinForced(camId)) {
            pttCommPinForcedCamId = null;
            if (global.mapPinOpenPttCommCamId
                && (!camId || String(global.mapPinOpenPttCommCamId).trim() === String(camId).trim())) {
                global.mapPinOpenPttCommCamId = null;
            }
        }
    }

    function isPttCommPinIntent(camId) {
        return isPttCommPinForced(camId)
            || !!(camId && global.mapPinOpenPttCommCamId
                && String(global.mapPinOpenPttCommCamId).trim() === String(camId).trim());
    }

    function openMapPinPttComm(camId) {
        if (!camId) return;
        pttCommPinForcedCamId = String(camId).trim();
        global.mapPinOpenPttCommCamId = pttCommPinForcedCamId;
        syncMapPinPttComm(camId, 0);
    }

    function pttCommDeviceLabel(camId) {
        if (global.FleetUi && FleetUi.getDeviceName) {
            const n = FleetUi.getDeviceName(camId);
            if (n) return n;
        }
        return camId ? String(camId).slice(-8) : 'BWC';
    }

    function pinHasActiveLiveForPttComm(camId) {
        if (!camId) return false;
        return !!(
            mapPinHasLiveVideo(camId)
            || wallHasPlayerForCam(camId)
            || isWallPlayingCam(camId)
        );
    }

    function ensureMapPinPttCommEl(root) {
        let comm = root.querySelector('.map-pin-ptt-comm');
        if (comm) return comm;
        const vidBox = root.querySelector('.map-pin-video');
        if (!vidBox) return null;
        comm = document.createElement('div');
        comm.className = 'map-pin-ptt-comm';
        comm.hidden = true;
        comm.innerHTML =
            '<div class="map-pin-ptt-comm-title">' + tr('ptt.commTitle') + '</div>' +
            '<div class="map-pin-ptt-comm-name"></div>' +
            '<div class="map-pin-ptt-comm-status"></div>' +
            '<div class="map-pin-ptt-comm-reply">' + tr('ptt.commReply') + '</div>' +
            '<div class="map-pin-ptt-comm-hint">' + tr('ptt.commHint') + '</div>';
        vidBox.insertBefore(comm, vidBox.firstChild);
        return comm;
    }

    function dismissPttCommForCall(camId) {
        clearPttCommPinForced(camId);
        if (global.PttRx && PttRx.clearAllLinger) PttRx.clearAllLinger();
        else if (global.PttRx && PttRx.dismissCommForCam) PttRx.dismissCommForCam(camId);
        else if (camId && global.PttRx && PttRx.clearLingerForCam) PttRx.clearLingerForCam(camId);
        syncAllPttRxUi();
    }

    function pinPopupOpenForLive(camId) {
        if (!camId) return false;
        if (isPttCommPinIntent(camId) || isPttCommPinForced(camId)) return false;
        const root = mapPopupRootForCam(camId);
        return !!root && root.getAttribute('data-offline-popup') !== '1';
    }

    function suppressPinOpenPttChrome(camId) {
        if (!camId) return;
        if (isPttCommPinIntent(camId) || isPttCommPinForced(camId)) return;
        camId = String(camId).trim();
        if (global.PttRx && PttRx.suppressLingerForLive) PttRx.suppressLingerForLive(camId);
        else if (global.PttRx && PttRx.clearLingerForCam) PttRx.clearLingerForCam(camId);
        syncAllPttRxUi();
    }

    function refreshPinPttAfterLivePin(camId) {
        if (!camId) return;
        if (hasActiveDashboardLiveForCam(camId)) {
            if (global.PttRx && PttRx.suppressLingerForLive) PttRx.suppressLingerForLive(camId);
            else if (global.PttRx && PttRx.clearLingerForCam) PttRx.clearLingerForCam(camId);
        }
        syncAllPttRxUi();
    }

    function applyMapPinPttCommUi(camId, root) {
        if (!root || !camId) return;
        const onVoiceCall = voiceCallCamId === camId;
        const forced = isPttCommPinForced(camId);
        const liveActive = hasDashboardLiveForCam(camId);
        const liveDecode = hasActiveDashboardLiveForCam(camId);
        const livePinOpen = pinPopupOpenForLive(camId);
        const rxLive = !onVoiceCall && pttRxActive.has(camId);
        const rxLinger = !onVoiceCall && pttRxLinger.has(camId);
        const rx = rxLive || rxLinger;
        const suppressChrome = livePinOpen || (liveActive && !forced);
        const showFieldPttChrome = !suppressChrome && (rx || forced);
        root.classList.toggle('map-popup-ptt-rx', showFieldPttChrome);
        root.classList.toggle('map-popup-ptt-rx-linger', showFieldPttChrome
            && ((rxLinger && !rxLive) || (forced && !rxLive && !onVoiceCall)));
        const badge = root.querySelector('.map-pin-ptt-rx-badge');
        if (badge) badge.hidden = !showFieldPttChrome;
        const commMode = forced ? !onVoiceCall : (rx && !liveActive && !livePinOpen);
        root.classList.toggle('map-popup-ptt-comm-mode', commMode);
        const comm = ensureMapPinPttCommEl(root);
        const placeholder = root.querySelector('.map-pin-video-placeholder');
        const vidBox = root.querySelector('.map-pin-video');
        if (vidBox) vidBox.classList.toggle('map-pin-video-ptt-comm-active', commMode);
        if (comm) {
            if (commMode) {
                comm.hidden = false;
                const nameEl = comm.querySelector('.map-pin-ptt-comm-name');
                if (nameEl) nameEl.textContent = pttCommDeviceLabel(camId);
                const statusEl = comm.querySelector('.map-pin-ptt-comm-status');
                if (statusEl) {
                    statusEl.textContent = rxLive
                        ? tr('ptt.commReceiving')
                        : (rxLinger ? tr('ptt.commLinger') : tr('ptt.commReply'));
                }
            } else {
                comm.hidden = true;
            }
        }
        if (placeholder) placeholder.hidden = commMode;
    }

    function fieldPttRxBlocksPinAutoPlay(camId, opts) {
        if (!camId) return false;
        opts = opts || {};
        if (opts.forceLive) return false;
        if (isPttCommPinIntent(camId)) return true;
        if (hasDashboardLiveForCam(camId)) return false;
        if (voiceCallCamId === camId) return false;
        if (pttRxActive.has(camId) || pttRxLinger.has(camId)) return true;
        if (global.PttRx && PttRx.isRxActive && PttRx.isRxActive(camId)) return true;
        return false;
    }

    function guardFieldPttCommInsteadOfPinAutoPlay(camId, attempt, opts) {
        if (!fieldPttRxBlocksPinAutoPlay(camId, opts)) return false;
        syncMapPinPttComm(camId, attempt || 0);
        return true;
    }

    function syncMapPinPttComm(camId, attempt) {
        if (!camId) return;
        attempt = attempt || 0;
        const root = mapPopupRootForCam(camId);
        if (!root) {
            if (attempt < 20 && (fieldPttRxBlocksPinAutoPlay(camId) || isPttCommPinForced(camId))) {
                setTimeout(function () { syncMapPinPttComm(camId, attempt + 1); }, 100);
            }
            return;
        }
        applyMapPinPttCommUi(camId, root);
        syncPinPttUi(camId);
    }

    function onServerCapabilities(data) {
        pttEnabled = !!(data && data.pttEnabled);
        wvpVideoHandoffUi = !!(data && data.wvpVideoHandoff);
        pttOnlineDevices.clear();
        if (data && Array.isArray(data.pttOnlineDevices)) {
            data.pttOnlineDevices.forEach(function (id) { if (id) pttOnlineDevices.add(id); });
        }
        if (data && data.pttDownlinkPolicy) applyPttDownlinkPolicy(data.pttDownlinkPolicy);
        if (data && data.voiceCallPolicy) applyVoiceCallPolicy(data.voiceCallPolicy);
        else if (data && Array.isArray(data.pttVoiceFallbackCamIds)) {
            applyPttDownlinkPolicy({
                modelVoicePrefixes: ['UB'],
                downlinkByCamId: {},
                deviceModels: {},
                downlinkResolved: {},
                voiceOverrideCamIds: data.pttVoiceFallbackCamIds,
            });
        }
        syncAllPttUi();
        if (global.FleetUi && typeof FleetUi.refreshFromGroups === 'function') {
            FleetUi.refreshFromGroups();
        }
    }

    function bindPttHoldButton(btn, camIdResolver, talkOpts) {
        if (!btn || btn._pttBound) return;
        btn._pttBound = true;
        talkOpts = talkOpts || {};
        let holdActive = false;
        let wakeAbort = null;
        const start = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (btn.hidden) return;
            const camId = camIdResolver();
            if (!camId) return;
            if (btn.disabled) return;
            holdActive = true;
            if (talkOpts.wakeOnNotReady && !isPttTalkReadyForCam(camId)) {
                wakeAbort = { cancelled: false };
                pokeFleetPttWakeAndTalk(camId, talkOpts, wakeAbort, function () { return holdActive; });
                return;
            }
            if (!isPttTalkReadyForCam(camId)) return;
            beginPttTalk(camId, talkOpts);
        };
        const stop = function (e) {
            holdActive = false;
            if (wakeAbort) wakeAbort.cancelled = true;
            if (e) e.stopPropagation();
            endPttTalk();
        };
        btn.addEventListener('mousedown', start);
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
        btn.addEventListener('touchend', stop);
        btn.addEventListener('touchcancel', stop);
        btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    function syncPinCallUi(camId) {
        function syncOne(id, root) {
            const bar = root.querySelector('.map-pin-video-bar');
            if (!bar) return;
            const callBtn = bar.querySelector('.map-pin-call');
            if (!callBtn) return;
            const live = isLiveCamId(id);
            callBtn.hidden = !live;
            const active = !!(id && voiceCallCamId === id);
            callBtn.disabled = !live || (voiceCallPending && !active);
            callBtn.classList.toggle('active', active);
            callBtn.title = active ? tr('call.end') : tr('call.whenLive');
            callBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (camId) {
            const root = mapPopupRootForCam(camId);
            if (root) syncOne(camId, root);
            return;
        }
        eachOpenPinPopup(syncOne);
    }

    function syncPinVoiceUi(camId) {
        function syncOne(id, root) {
            const bar = root.querySelector('.map-pin-video-bar');
            if (!bar) return;
            const voiceBtn = bar.querySelector('.map-pin-voice');
            if (!voiceBtn) return;
            const online = global.FleetUi && FleetUi.isDeviceOnline && FleetUi.isDeviceOnline(id);
            const live = isLiveCamId(id);
            voiceBtn.hidden = !online || live;
            voiceBtn.disabled = !online || live || voiceCallPending || pttHolding
                || !!(voiceCallCamId && voiceCallCamId !== id);
            const active = !!(id && voiceCallCamId === id);
            voiceBtn.classList.toggle('active', active);
            const name = global.FleetUi && FleetUi.getDeviceName ? FleetUi.getDeviceName(id) : id;
            voiceBtn.title = active ? tr('call.end') : tr('call.talkToName', { name: name || id });
            voiceBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (camId) {
            const root = mapPopupRootForCam(camId);
            if (root) syncOne(camId, root);
            return;
        }
        eachOpenPinPopup(syncOne);
    }

    function fleetVoiceTitle(camId) {
        const name = global.FleetUi && FleetUi.getDeviceName
            ? FleetUi.getDeviceName(camId)
            : camId;
        if (voiceCallCamId === camId) return tr('call.end');
        return tr('fleet.voiceTalk', { name: name || camId });
    }

    function syncFleetVoiceRows() {
        document.querySelectorAll('.fleet-row-voice-btn').forEach(function (btn) {
            const camId = btn.getAttribute('data-cam-id');
            if (!camId) return;
            const online = global.FleetUi && FleetUi.isDeviceOnline && FleetUi.isDeviceOnline(camId);
            const active = voiceCallCamId === camId;
            btn.hidden = !online;
            btn.disabled = !online || pttHolding
                || !!(voiceCallCamId && voiceCallCamId !== camId)
                || (voiceCallPending && !active);
            btn.classList.toggle('active', active);
            btn.title = fleetVoiceTitle(camId);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function toggleVoiceCall(camId, opts) {
        opts = opts || {};
        if (!socket || !camId) return;
        if (typeof window.dispatchCallGroupTryToggle === 'function'
            && window.dispatchCallGroupTryToggle(camId)) {
            return;
        }
        dismissPttCommForCall(camId);
        if (voiceCallCamId === camId) {
            if (!voiceCallPending) {
                voiceCallPending = true;
                syncAllCallUi();
            }
            socket.emit('end-bwc-call', { camId: camId });
            return;
        }
        if (voiceCallPending) return;
        const live = isLiveCamId(camId);
        const audioOnly = opts.audioOnly === true || (opts.audioOnly !== false && !live);
        if (!audioOnly && !live) return;
        voiceCallPending = true;
        syncAllCallUi();
        socket.emit('start-bwc-call', { camId: camId, audioOnly: audioOnly });
    }

    function onBwcCallRx(data) {
        if (!data || !data.active || !data.camId) return;
        if (voiceCallCamId !== data.camId) return;
        if (!isLiveCamId(data.camId)) {
            stopPcmAudio();
            startPcmAudio();
            applyLiveAudioGain();
        }
    }

    function onBwcCallState(data) {
        voiceCallPending = false;
        if (data && data.active && data.camId) {
            dismissPttCommForCall(data.camId);
            voiceCallCamId = data.camId;
            setCamAudioMuted(data.camId, false);
            if (!pttVoiceFallbackAwaitingCall && !pttVoiceFallbackHold && window.CallMic) {
                window.CallMic.start(data.camId);
            }
            pttVoiceFallbackAwaitingCall = false;
            if (!isLiveCamId(data.camId)) {
                stopPcmAudio();
                startPcmAudio();
                applyLiveAudioGain();
            }
            applyLiveAudioGain();
            syncPinAudioUi(data.camId);
        } else if (!data || !data.active) {
            var endedCamId = (data && data.camId) || voiceCallCamId;
            if (window.CallMic) window.CallMic.stop();
            if (!data || !data.camId || voiceCallCamId === data.camId) voiceCallCamId = null;
            if (endedCamId && isLiveCamId(endedCamId)) muteLiveAudioForCam(endedCamId);
            maybeStopPcmAudio();
        }
        if (data && data.error) {
            console.warn('BWC call:', data.error);
            alert(data.error);
        }
        syncAllCallUi();
    }

    function syncPinAudioUi(camId) {
        function syncOne(id, root) {
            const wrap = root.querySelector('.map-pin-video-wrap');
            if (!wrap) return;
            const live = !!(id && mapPinDecodedCams.has(id));
            const muteBtn = wrap.querySelector('.map-pin-audio-mute');
            if (muteBtn) muteBtn.hidden = !live;
            if (!live || !muteBtn) return;
            const muted = isCamAudioMuted(id);
            muteBtn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
            muteBtn.title = muted ? 'Listen to live audio' : 'Mute live audio';
            muteBtn.classList.toggle('listening', !muted);
            muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        }
        if (camId) {
            const root = mapPopupRootForCam(camId);
            if (root) syncOne(camId, root);
            return;
        }
        eachOpenPinPopup(syncOne);
    }

    function setLiveAudioVolume(percent) {
        const vol = Math.max(0, Math.min(100, Math.round(percent)));
        try { localStorage.setItem(LIVE_AUDIO_VOL_KEY, String(vol)); } catch (_) { /* ignore */ }
        applyLiveAudioGain();
        syncAllSlotAudioUi();
        syncLayoutAudioVol();
    }

    function bindPinAudioControls() {
        if (pinAudioUiBound) return;
        pinAudioUiBound = true;
        document.addEventListener('click', (e) => {
            const muteBtn = e.target.closest('.map-pin-audio-mute');
            if (muteBtn && muteBtn.closest('.leaflet-popup-content')) {
                e.preventDefault();
                e.stopPropagation();
                togglePinAudio();
            }
        });
        document.addEventListener('input', (e) => {
            if (e.target.id === 'layout-audio-vol') {
                e.stopPropagation();
                setLiveAudioVolume(parseInt(e.target.value, 10));
            }
        });
    }

    function isSosCamForAudio(camId) {
        if (!camId) return false;
        if (typeof global.isCamSosActive === 'function' && global.isCamSosActive(camId)) return true;
        return false;
    }

    /** Drop queued PCM and reconnect at live edge (ffmpeg probe + prime buffer desyncs A/V). */
    function flushLivePcmSync() {
        if (!pcmAudio) return;
        const hadPlayers = players.size > 0 || hasAnyMapPlayer();
        stopPcmAudio();
        if (hadPlayers) startPcmAudio();
    }

    function unmuteAudioForSosCam(camId) {
        if (!camId || !isSosCamForAudio(camId)) return;
        setCamAudioMuted(camId, false);
        flushLivePcmSync();
    }

    function muteLiveAudioForCam(camId) {
        if (!camId) return;
        setCamAudioMuted(camId, true);
    }

    function defaultAudioMutedForNewStream(slotKey, camId) {
        const id = camIdKey(camId);
        if (!id) return;
        const autoUnmute = isSosCamForAudio(id);
        if (!camAudioMuted.has(id)) {
            camAudioMuted.set(id, !autoUnmute);
        }
        syncAudioUiForCam(id);
        applyLiveAudioGain();
    }

    function stopPcmAudio() {
        if (!pcmAudio) return;
        pcmAudio.stopped = true;
        try { pcmAudio.ws.close(); } catch (_) { /* ignore */ }
        try { pcmAudio.ctx.close(); } catch (_) { /* ignore */ }
        pcmAudio = null;
        syncPinAudioUi();
    }

    function maybeStopPcmAudio() {
        if (voiceCallCamId) return;
        if (players.size === 0 && !hasAnyMapPlayer()) stopPcmAudio();
    }

    function pcmQueueDurationSec(state) {
        let samples = 0;
        const q = state.pcmQueue;
        for (let i = 0; i < q.length; i++) samples += q[i].length;
        return samples / 8000;
    }

    function schedulePcmListenBuffer(state, int16) {
        if (!int16.length) return;
        const ctx = state.ctx;
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
        }
        const ab = ctx.createBuffer(1, float32.length, 8000);
        ab.getChannelData(0).set(float32);
        const src = ctx.createBufferSource();
        src.buffer = ab;
        src.connect(state.gain);
        const t = Math.max(ctx.currentTime + 0.01, state.nextTime);
        src.start(t);
        state.nextTime = t + ab.duration;
    }

    function drainPcmListenQueue(state) {
        if (state.ctx.state === 'suspended') state.ctx.resume();
        while (state.pcmQueue.length) {
            schedulePcmListenBuffer(state, state.pcmQueue.shift());
        }
    }

    function enqueuePcmListenChunk(state, chunk) {
        const buf = chunk instanceof ArrayBuffer ? chunk : chunk.buffer;
        const int16 = new Int16Array(buf);
        if (!int16.length) return;
        state.pcmQueue.push(int16);
        while (pcmQueueDurationSec(state) > PCM_LISTEN_MAX_QUEUE_SEC) state.pcmQueue.shift();
        if (!state.primed) {
            if (pcmQueueDurationSec(state) < PCM_LISTEN_JITTER_SEC) return;
            state.primed = true;
            state.nextTime = state.ctx.currentTime + PCM_LISTEN_JITTER_SEC;
            drainPcmListenQueue(state);
            return;
        }
        if (state.nextTime < state.ctx.currentTime - 0.15) {
            state.nextTime = state.ctx.currentTime + 0.03;
        }
        drainPcmListenQueue(state);
    }

    function startPcmAudio() {
        if (pcmAudio) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx({ sampleRate: 8000 });
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        const ws = new WebSocket(audioWsUrl());
        ws.binaryType = 'arraybuffer';
        const state = {
            ctx, ws, gain, stopped: false, nextTime: 0, primed: false, pcmQueue: [],
        };
        pcmAudio = state;
        applyLiveAudioGain();
        ws.onopen = () => {
            if (ctx.state === 'suspended') ctx.resume();
            applyLiveAudioGain();
            syncPinAudioUi();
        };
        ws.onmessage = (ev) => {
            if (state.stopped || !ev.data) return;
            enqueuePcmListenChunk(state, ev.data);
        };
        ws.onerror = () => { /* ignore \u2014 video keeps running */ };
        ws.onclose = () => {
            if (!state.stopped) pcmAudio = null;
        };
    }

    function getSlots() {
        return Array.from(document.querySelectorAll('#video-wall-slots .video-slot'));
    }

    function slotBankForIndex(slotIndex) {
        return (typeof slotIndex === 'number' && slotIndex >= BANK_A_COUNT) ? 'b' : 'a';
    }

    function updateWallBankTabLabels() {
        const nextBtn = document.getElementById('video-wall-bank-next');
        const curEl = document.getElementById('video-wall-bank-current');
        if (curEl) curEl.textContent = wallBankPage === 'b' ? 'Panels 6\u201310' : 'Panels 1\u20135';
        if (nextBtn) nextBtn.textContent = wallBankPage === 'b' ? 'Next Panels 1\u20135' : 'Next Panels 6\u201310';
        const wall = document.getElementById('video-wall');
        if (wall) wall.setAttribute('data-bank', wallBankPage);
    }

    function applyWallBankPage(page) {
        if (page === 'a' || page === 'b') wallBankPage = page;
        getSlots().forEach(function (el) {
            const idx = parseInt(el.dataset.slot, 10);
            el.classList.toggle('is-bank-hidden', slotBankForIndex(idx) !== wallBankPage);
        });
        updateWallBankTabLabels();
        scheduleWallSixteenNineFit();
    }

    function ensureBankVisibleForSlot(slotIndex) {
        const page = slotBankForIndex(slotIndex);
        if (page !== wallBankPage) applyWallBankPage(page);
    }

    function toggleWallBankPage() {
        applyWallBankPage(wallBankPage === 'a' ? 'b' : 'a');
    }

    let wallFitRaf = 0;
    function scheduleWallSixteenNineFit() {
        if (wallFitRaf) cancelAnimationFrame(wallFitRaf);
        wallFitRaf = requestAnimationFrame(function () {
            wallFitRaf = 0;
            layoutWallSixteenNineFit();
        });
    }

    function wallStreamAspectRatio(visibleSlots) {
        let ar = 16 / 9;
        (visibleSlots || []).some(function (slot) {
            const video = slot.querySelector('video.me8-zlm-primary, video.me8-zlm-soft-overlay');
            if (!video || !(video.videoWidth > 0) || !(video.videoHeight > 0)) return false;
            const candidate = video.videoWidth / video.videoHeight;
            if (candidate > 0.5 && candidate < 4) ar = candidate;
            return true;
        });
        return ar;
    }

    function layoutWallSixteenNineFit() {
        const wall = document.getElementById('video-wall');
        const slotsEl = document.getElementById('video-wall-slots');
        if (!wall || !slotsEl) return;
        wall.style.removeProperty('width');
        getSlots().forEach(function (slot) {
            const box = slot.querySelector('.video-slot-box');
            const stage = slot.querySelector('.video-slot-stage');
            slot.style.removeProperty('height');
            slot.style.removeProperty('flex');
            slot.style.removeProperty('max-height');
            if (box) {
                box.style.removeProperty('width');
                box.style.removeProperty('max-width');
                box.style.removeProperty('flex');
            }
            if (stage) {
                stage.style.removeProperty('width');
                stage.style.removeProperty('height');
                stage.style.removeProperty('flex');
                stage.style.removeProperty('min-height');
                stage.style.removeProperty('max-height');
                stage.style.removeProperty('margin-left');
                stage.style.removeProperty('margin-right');
            }
        });
    }

    function destroyAllPlayers() {
        players.forEach((_, idx) => destroyPlayer(idx, { forceHandoffDestroy: true }));
        destroyPlayer('map');
        stopPcmAudio();
    }

    function destroyPlayer(slotIndex, opts) {
        if (slotIndex === 'map') {
            destroyMapPlayer(null);
            return;
        }
        if (typeof slotIndex === 'string' && slotIndex.indexOf('map:') === 0) {
            destroyMapPlayer(slotIndex.slice(4));
            return;
        }
        if (typeof slotIndex === 'number') destroyZlmWallOverlay(slotIndex);
        const p = players.get(slotIndex);
        if (p && handoffPlayerAttaching(p) && !(opts && opts.forceHandoffDestroy)) {
            return;
        }
        const boundCam = activeStreams.get(slotIndex)
            || (typeof slotIndex === 'number' && getSlots()[slotIndex] && getSlots()[slotIndex].dataset.camId)
            || null;
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players.delete(slotIndex);
            activeStreams.delete(slotIndex);
            if (boundCam) clearRegisteredActivePlayer(boundCam, 'wall');
        }
        if (typeof slotIndex === 'number') wvpHandoffSlotInflight.delete(slotIndex);
        if (boundCam) clearBwcStallWatch(boundCam);
        if (!(opts && opts.keepPending) && typeof slotIndex === 'number') delete pendingWallSlots[slotIndex];
        if (typeof slotIndex === 'number') {
            const slotEl = getSlots()[slotIndex];
            if (slotEl) slotEl.classList.remove('video-slot-has-live');
        }
        updateSlotAudioButton(slotIndex);
        maybeStopPcmAudio();
    }

    function stopServerStream(camId) {
        if (!socket) return;
        if (camId) {
            releaseServerStreamIfIdle(camId);
            return;
        }
        streamingCams.forEach(function (id) {
            emitOpsStopVideo(id, 'operator', 'stopServerStream:all');
        });
        streamingCams.clear();
        streamingCamId = null;
        voiceCallCamId = null;
        voiceCallPending = false;
        endPttTalk();
        syncAllCallUi();
    }

    function setSlotMeta(slotEl, camId, statusText) {
        const stEl = slotEl.querySelector('.video-slot-status');
        const slot = findSlotIndex(slotEl);
        const labelEl = slotEl.querySelector('.video-slot-label');
        if (labelEl && global.VideoConfig) {
            labelEl.textContent = VideoConfig.slotLabel(slot);
        }
        if (stEl) stEl.textContent = statusText || 'Idle';
        if (camId) slotEl.dataset.camId = camId;
    }

    function streamWaitLabel(isAlarm) {
        return isAlarm ? alarmStreamLabel() : liveStreamLabel();
    }

    function ensureStreamingOverlay(container, opts) {
        if (!container) return null;
        opts = opts || {};
        const labelClass = opts.labelClass || opts.className || 'video-slot-streaming-label';
        const labelText = opts.labelText || opts.label || liveStreamLabel();
        const isAlarm = !!opts.isAlarm;
        const baseClass = labelClass.split(' ')[0];
        let el = container.querySelector('.' + baseClass);
        if (!el) {
            el = document.createElement(baseClass === 'video-slot-streaming-label' ? 'div' : 'span');
            container.appendChild(el);
        }
        el.className = labelClass + (isAlarm ? ' streaming-label-alarm' : ' streaming-label-live');
        el.textContent = labelText;
        el.hidden = false;
        el.style.display = 'flex';
        el.style.opacity = '1';
        if (baseClass === 'map-pin-streaming-label' && el.parentElement === container && container.lastElementChild !== el) {
            container.appendChild(el);
        }
        return el;
    }

    function removeStreamingOverlay(container) {
        if (!container) return;
        container.querySelectorAll('.video-slot-streaming-label, .map-pin-streaming-label').forEach(function (el) {
            el.style.opacity = '0';
            el.style.display = 'none';
        });
    }

    const signalLostCams = new Set();

    function signalLostLabel() {
        return tr('video.signalLost');
    }

    function ensureSignalLostOverlay(container) {
        if (!container) return null;
        let el = container.querySelector('.video-signal-lost-overlay');
        if (!el) {
            el = document.createElement('div');
            el.className = 'video-signal-lost-overlay';
            el.setAttribute('aria-live', 'polite');
            container.appendChild(el);
        }
        el.textContent = signalLostLabel();
        el.hidden = false;
        return el;
    }

    function clearSignalLostOverlay(container) {
        if (!container) return;
        const el = container.querySelector('.video-signal-lost-overlay');
        if (el) el.hidden = true;
    }

    function clearVideoSignalLostForCam(camId) {
        if (!camId) return;
        signalLostCams.delete(camId);
        getSlots().forEach(function (slotEl) {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            slotEl.classList.remove('video-slot-signal-lost');
            const stage = slotEl.querySelector('.video-slot-stage');
            if (stage) clearSignalLostOverlay(stage);
        });
        const pinHost = mapPinHostForCam(camId);
        if (pinHost) {
            pinHost.classList.remove('map-pin-signal-lost');
            clearSignalLostOverlay(pinHost);
        }
    }

    const bwcStoppedCams = new Set();

    function bwcStoppedLabel() {
        return tr('video.stoppedOnDevice');
    }

    function ensureBwcStoppedOverlay(container) {
        if (!container) return null;
        let el = container.querySelector('.video-bwc-stopped-overlay');
        if (!el) {
            el = document.createElement('div');
            el.className = 'video-bwc-stopped-overlay';
            el.setAttribute('aria-live', 'polite');
            container.appendChild(el);
        }
        el.textContent = bwcStoppedLabel();
        el.hidden = false;
        return el;
    }

    function clearBwcStoppedOverlay(container) {
        if (!container) return;
        const el = container.querySelector('.video-bwc-stopped-overlay');
        if (el) el.hidden = true;
    }

    function clearBwcDeviceStoppedForCam(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        bwcStoppedCams.delete(camId);
        clearBwcStallWatch(camId);
        getSlots().forEach(function (slotEl) {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            slotEl.classList.remove('video-slot-bwc-stopped');
            const stage = slotEl.querySelector('.video-slot-stage');
            if (stage) clearBwcStoppedOverlay(stage);
        });
        const pinHost = mapPinHostForCam(camId);
        if (pinHost) {
            pinHost.classList.remove('map-pin-bwc-stopped');
            clearBwcStoppedOverlay(pinHost);
        }
    }

    const BWC_VIDEO_STALL_MS = 2800;
    const lastVideoFrameAt = Object.create(null);
    const bwcStallWatchTimers = Object.create(null);
    const bwcStallDecodedOnce = new Set();

    function isBwcStallWatchPaused() {
        return !!(typeof document !== 'undefined' && document.hidden);
    }

    function resetBwcStallClocksAfterTabVisible() {
        const now = Date.now();
        Object.keys(bwcStallWatchTimers).forEach(function (camId) {
            if (!camId || !bwcStallWatchTimers[camId]) return;
            lastVideoFrameAt[camId] = now;
        });
    }

    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) resetBwcStallClocksAfterTabVisible();
        });
    }

    /** Wall stage has live decode \u2014 JSMpeg canvas or WVP handoff FLV video. */
    function wallStageHasLiveMedia(stage) {
        if (!stage) return false;
        return !!(stage.querySelector('canvas')
            || stage.querySelector('video.me8-zlm-primary'));
    }

    /** Pin host shows live picture \u2014 direct canvas or wall mirror canvas. */
    function pinHostHasLiveMedia(pinHost, camId) {
        if (!pinHost) return false;
        if (pinHost.querySelector('canvas.map-pin-video-canvas')) return true;
        if (mapPinMirrorActive(camId)) return true;
        if (pinHost.querySelector('canvas.map-pin-mirror-canvas')
            && (pinHost.classList.contains('map-pin-has-live') || mapPinHasLiveVideo(camId))) {
            return true;
        }
        return !!(pinHost.querySelector('canvas')
            && (pinHost.classList.contains('map-pin-has-live') || mapPinHasLiveVideo(camId)));
    }

    function noteVideoFrame(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        lastVideoFrameAt[camId] = Date.now();
        bwcStallDecodedOnce.add(camId);
    }

    function clearBwcStallWatch(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        if (bwcStallWatchTimers[camId]) {
            clearInterval(bwcStallWatchTimers[camId]);
            delete bwcStallWatchTimers[camId];
        }
        delete lastVideoFrameAt[camId];
        bwcStallDecodedOnce.delete(camId);
    }

    function camHasActiveLiveVideoSurface(camId) {
        if (!camId) return false;
        camId = String(camId).trim();
        const wallLive = getSlots().some(function (slotEl) {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return false;
            if (!slotEl.classList.contains('video-slot-has-live')) return false;
            const stage = slotEl.querySelector('.video-slot-stage');
            return wallStageHasLiveMedia(stage);
        });
        if (wallLive) return true;
        if (mapPinMirrorActive(camId)) return false;
        const pinHost = mapPinHostForCam(camId);
        return pinHostHasLiveMedia(pinHost, camId);
    }

    function ensureBwcStallWatch(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        if (bwcStallWatchTimers[camId]) return;
        bwcStallWatchTimers[camId] = setInterval(function () {
            if (isBwcStallWatchPaused()) return;
            if (bwcStoppedCams.has(camId)) {
                clearBwcStallWatch(camId);
                return;
            }
            if (localDashboardStopCams.has(camId)) return;
            if (pinStoppedByUser(camId)) return;
            if (wvpVideoHandoffUi && opsWallClaimsCam(camId)) return;
            if (!bwcStallDecodedOnce.has(camId)) return;
            if (!camHasActiveLiveVideoSurface(camId)) {
                clearBwcStallWatch(camId);
                return;
            }
            const last = lastVideoFrameAt[camId];
            if (!last || (Date.now() - last) < BWC_VIDEO_STALL_MS) return;
            clearBwcStallWatch(camId);
            markBwcStoppedOverlay(camId);
        }, 700);
    }

    function markBwcStoppedOverlay(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        clearBwcStallWatch(camId);
        clearVideoSignalLostForCam(camId);
        bwcStoppedCams.add(camId);
        getSlots().forEach(function (slotEl) {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            const idx = findSlotIndex(slotEl);
            const stage = slotEl.querySelector('.video-slot-stage');
            if (!wallStageHasLiveMedia(stage)) return;
            ensureBwcStoppedOverlay(stage);
            slotEl.classList.add('video-slot-bwc-stopped');
            slotEl.classList.remove('video-slot-has-live', 'video-slot-signal-lost');
            setSlotMeta(slotEl, camId, bwcStoppedLabel());
            removeStreamingOverlay(stage);
            clearSignalLostOverlay(stage);
            detachWallPlayerKeepCanvas(idx, camId);
        });
        const pinHost = mapPinHostForCam(camId);
        if (pinHostHasLiveMedia(pinHost, camId)) {
            ensureBwcStoppedOverlay(pinHost);
            pinHost.classList.add('map-pin-bwc-stopped');
            pinHost.classList.remove('map-pin-signal-lost', 'vid-box-live', 'map-pin-has-live');
            removeStreamingOverlay(pinHost);
            clearSignalLostOverlay(pinHost);
            mapPinDecodedCams.delete(camId);
            detachMapPlayerKeepCanvas(camId);
        }
        streamingCams.delete(camId);
        if (streamingCamId === camId) {
            streamingCamId = streamingCams.values().next().value || null;
        }
        /* Clear HQ viewer refs without treating as operator Stop (keep Stopped by BWC chrome). */
        if (socket) {
            socket.emit('stop-video', { camId: camId, surface: OPS_VIEWER_SURFACE });
        }
        updateMapPinStopButton(camId);
        if (typeof global.minimizeMapPinVideo === 'function') {
            global.minimizeMapPinVideo(camId);
        }
        syncAllCallUi();
        syncAllPttUi();
    }

    function detachWallPlayerKeepCanvas(slotIndex, camId) {
        const p = players.get(slotIndex);
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players.delete(slotIndex);
            activeStreams.delete(slotIndex);
            if (camId) clearRegisteredActivePlayer(camId, 'wall');
        }
        if (typeof slotIndex === 'number') {
            const slotEl = getSlots()[slotIndex];
            if (slotEl) slotEl.classList.remove('video-slot-has-live');
        }
        updateSlotAudioButton(slotIndex);
        maybeStopPcmAudio();
    }

    function detachMapPlayerKeepCanvas(camId) {
        if (mapPinMirrorActive(camId) || mapMirrorCamId === camId) stopMapPinMirror(camId);
        const p = mapPlayers.get(camId);
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            mapPlayers.delete(camId);
        }
        clearRegisteredActivePlayer(camId, 'map');
        activeStreams.delete(mapStreamKey(camId));
        maybeStopPcmAudio();
        syncPinAudioUi();
    }

    function markVideoSignalLost(camId) {
        if (!camId) return;
        signalLostCams.add(camId);
        getSlots().forEach(function (slotEl) {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            const idx = findSlotIndex(slotEl);
            if (!slotHasLiveWallPlayer(slotEl, idx)) return;
            const stage = slotEl.querySelector('.video-slot-stage');
            if (!wallStageHasLiveMedia(stage)) return;
            ensureSignalLostOverlay(stage);
            slotEl.classList.add('video-slot-signal-lost');
            slotEl.classList.remove('video-slot-has-live');
            setSlotMeta(slotEl, camId, signalLostLabel());
            removeStreamingOverlay(stage);
            detachWallPlayerKeepCanvas(idx, camId);
        });
        const pinHost = mapPinHostForCam(camId);
        if (pinHost && mapPinHasLiveVideo(camId) && pinHostHasLiveMedia(pinHost, camId)) {
            ensureSignalLostOverlay(pinHost);
            pinHost.classList.add('map-pin-signal-lost');
            removeStreamingOverlay(pinHost);
            detachMapPlayerKeepCanvas(camId);
        }
        streamingCams.delete(camId);
        if (streamingCamId === camId) {
            streamingCamId = streamingCams.values().next().value || null;
        }
        releaseServerStreamIfIdle(camId);
        syncAllCallUi();
        syncAllPttUi();
    }

    function camHasSignalLostFrame(camId) {
        if (!camId) return false;
        return wallSlotDecodedForCam(camId) || mapPinHasLiveVideo(camId);
    }

    function isAlarmCamId(camId) {
        if (!camId) return false;
        if (typeof global.isCamSosActive === 'function' && global.isCamSosActive(camId)) return true;
        if (typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive()) {
            const sosCam = typeof global.getSosCamId === 'function' ? global.getSosCamId() : null;
            if (sosCam && sosCam === camId) return true;
        }
        const slot = findSlotByCamId(camId);
        return !!(slot && slot.classList.contains('alarm'));
    }

    function mapPopupRootForCam(camId) {
        if (!camId) return null;
        const id = String(camId).trim();
        const pops = document.querySelectorAll('.leaflet-popup-content .map-popup[data-cam-id]');
        for (let i = 0; i < pops.length; i++) {
            if (pops[i].getAttribute('data-cam-id') === id) return pops[i];
        }
        return null;
    }

    function mapPinHostForCam(camId) {
        const root = mapPopupRootForCam(camId);
        if (root) {
            let host = root.querySelector('.map-pin-video');
            if (!host) host = root.querySelector('.vid-box');
            if (!host) host = root.querySelector('.media-box.vid-box');
            if (host) return host;
        }
        const host = getMapPopupVideoHost();
        if (!host) return null;
        const hostCam = host.getAttribute('data-cam-id');
        if (hostCam && camId && hostCam !== camId) return null;
        return host;
    }

    function mapPinOverlayContainer(camId) {
        const host = camId ? mapPinHostForCam(camId) : getMapPopupVideoHost();
        if (!host) return null;
        const hostCam = host.getAttribute('data-cam-id');
        if (hostCam && camId && hostCam !== camId) return null;
        return host;
    }

    function showMapPinStreamingOverlay(camId, isAlarm) {
        const overlayRoot = mapPinOverlayContainer(camId);
        if (!overlayRoot) return null;
        const text = isAlarm ? 'SOS Streaming...' : 'Live streaming...';
        return ensureStreamingOverlay(overlayRoot, {
            labelClass: 'map-pin-streaming-label',
            labelText: text,
            isAlarm: !!isAlarm,
        });
    }

    function mapPinHasLiveVideo(camId) {
        return !!(camId && mapPinDecodedCams.has(camId));
    }

    function syncMapPinStreamingOverlay(camId) {
        const host = camId ? mapPinHostForCam(camId) : getMapPopupVideoHost();
        if (!camId || !host) return;
        const hostCam = host.getAttribute('data-cam-id');
        if (hostCam && hostCam !== camId) return;
        if (mapPinHasLiveVideo(camId)) {
            const pinHost = mapPinHostForCam(camId);
            if (pinHost) pinHost.classList.add('vid-box-live');
            return;
        }
        if (isAlarmCamId(camId)) showMapPinStreamingOverlay(camId, true);
        else if (isStreamInvited(camId) && !mapPinHasLiveVideo(camId)) showMapPinStreamingOverlay(camId, false);
    }

    function ensureMapPinStreamingOverlay(camId) {
        return showMapPinStreamingOverlay(camId, true);
    }

    function ensureMapPinLiveStreamingOverlay(camId) {
        return showMapPinStreamingOverlay(camId, false);
    }

    function removeMapPinStreamingOverlay(camId) {
        const host = camId ? mapPinHostForCam(camId) : getMapPopupVideoHost();
        if (!host) return;
        removeStreamingOverlay(host);
    }

    function syncMapPinAlarmStreaming(camId) {
        syncMapPinStreamingOverlay(camId);
    }

    function ensureAlarmStreamingOverlay(slotEl) {
        if (!slotEl) return null;
        if (slotEl.classList.contains('video-slot-has-live')) return null;
        const idx = findSlotIndex(slotEl);
        if (typeof idx === 'number' && players.has(idx)) {
            const c = slotEl.querySelector('.video-slot-stage canvas');
            if (c && c.width > 8 && c.height > 8) return null;
        }
        const stage = slotEl.querySelector('.video-slot-stage');
        if (!stage) return null;
        return ensureStreamingOverlay(stage, {
            className: 'video-slot-streaming-label',
            label: alarmStreamLabel(),
            isAlarm: true,
        });
    }

    function ensureLiveStreamingOverlay(slotEl) {
        if (!slotEl) return null;
        const stage = slotEl.querySelector('.video-slot-stage');
        if (!stage) return null;
        return injectWallSlotStreamingLabel(stage, false);
    }

    /** Wall panel waiting label \u2014 survives until video-slot-has-live. */
    function injectWallSlotStreamingLabel(stage, isAlarm) {
        if (!stage) return null;
        let el = stage.querySelector('.video-slot-streaming-label');
        if (!el) {
            el = document.createElement('div');
            stage.appendChild(el);
        }
        el.className = 'video-slot-streaming-label' + (isAlarm ? ' streaming-label-alarm' : ' streaming-label-live');
        el.textContent = isAlarm ? alarmStreamLabel() : liveStreamLabel();
        el.hidden = false;
        el.style.display = 'flex';
        el.style.opacity = '1';
        return el;
    }

    function removeAlarmStreamingOverlay(slotEl) {
        if (!slotEl) return;
        const stage = slotEl.querySelector('.video-slot-stage');
        if (!stage) return;
        removeStreamingOverlay(stage);
    }

    function slotElForKey(slotKey) {
        if (slotKey === 'map' || typeof slotKey !== 'number' || Number.isNaN(slotKey)) return null;
        return getSlots()[slotKey] || null;
    }

    const rotateTimers = new Map();

    function rotationEnabled() {
        const el = document.getElementById('video-wall-poll');
        return !el || el.checked;
    }

    function clearRotationTimers() {
        rotateTimers.forEach(function (t) { clearInterval(t); });
        rotateTimers.clear();
    }

    function tickRotateSlot(slotIndex) {
        if (!rotationEnabled() || !global.VideoConfig) return;
        if (openAllOccupiedSlots.has(slotIndex)) return;
        const ch = VideoConfig.getChannel(slotIndex);
        if (!ch || !VideoConfig.isRotatingMode(ch.sourceMode)) return;
        const q = VideoConfig.buildQueueForChannel(ch);
        if (q.length <= 1) {
            if (q.length === 1) assignCamToSlot(q[0], slotIndex);
            return;
        }
        const camId = VideoConfig.advanceRotationIndex(slotIndex);
        if (!camId) return;
        assignCamToSlot(camId, slotIndex);
        VideoConfig.applyLabelsToWall();
    }

    function startRotationForSlot(slotIndex) {
        if (rotateTimers.has(slotIndex)) {
            clearInterval(rotateTimers.get(slotIndex));
            rotateTimers.delete(slotIndex);
        }
        if (openAllOccupiedSlots.has(slotIndex)) return;
        if (!global.VideoConfig) return;
        const ch = VideoConfig.getChannel(slotIndex);
        if (!ch || !VideoConfig.isRotatingMode(ch.sourceMode)) return;
        const sec = Math.max(5, parseInt(ch.rotateSec, 10) || 30);
        const camId = VideoConfig.getActiveDeviceForSlot(slotIndex);
        if (camId && rotationEnabled()) assignCamToSlot(camId, slotIndex);
        rotateTimers.set(slotIndex, setInterval(function () {
            tickRotateSlot(slotIndex);
        }, sec * 1000));
    }

    function restartRotation() {
        clearRotationTimers();
        if (!rotationEnabled() || !global.VideoConfig) return;
        for (let i = 0; i < SLOT_COUNT; i += 1) startRotationForSlot(i);
        if (global.VideoConfig.updatePollUi) VideoConfig.updatePollUi();
    }

    function onFleetUpdate() {
        if (global.VideoConfig && VideoConfig.applyLabelsToWall) VideoConfig.applyLabelsToWall();
    }

    function configuredSlotCamId(slot) {
        if (typeof slot !== 'number' || !global.VideoConfig) return '';
        return VideoConfig.getActiveDeviceForSlot(slot) || '';
    }

    /** Per-slot cam \u2014 never falls back to global activeCamId (avoids empty panels cloning last play). */
    function resolveCamIdForSlot(slotEl) {
        const slot = findSlotIndex(slotEl);
        if (typeof slot === 'number' && activeStreams.has(slot)) {
            return activeStreams.get(slot);
        }
        if (typeof slot === 'number' && players.has(slot)) {
            const bound = slotEl.dataset.camId || pendingWallSlots[slot];
            if (bound) return bound;
        }
        return configuredSlotCamId(slot);
    }

    function streamCamForSlotKey(slotKey) {
        if (activeStreams.has(slotKey)) return activeStreams.get(slotKey);
        if (typeof slotKey === 'number') {
            const el = getSlots()[slotKey];
            return el ? resolveCamIdForSlot(el) : null;
        }
        return null;
    }

    function findSlotByCamId(camId) {
        return getSlots().find((el) => el.dataset.camId === camId) || null;
    }

    function slotBoundCam(slotIndex) {
        const el = getSlots()[slotIndex];
        if (!el) return null;
        return streamCamForSlotKey(slotIndex) || el.dataset.camId || resolveCamIdForSlot(el) || null;
    }

    function wallSlotTaken(slotIndex, camId) {
        if (players.has(slotIndex)) {
            const bound = slotBoundCam(slotIndex);
            return !bound || bound !== camId;
        }
        const bound = slotBoundCam(slotIndex);
        if (bound && bound !== camId) return true;
        const pending = pendingWallSlots[slotIndex];
        return !!(pending && pending !== camId);
    }

    /** First free pin-capable panel; manual Panels 9\u201310 are never allocated by pins. */
    function freeWallSlotForCam(camId) {
        for (let i = 0; i < PIN_SLOT_COUNT; i += 1) {
            if (!wallSlotTaken(i, camId)) return i;
        }
        return null;
    }

    function findWallSlotForCam(camId) {
        const existing = findSlotByCamId(camId);
        if (existing) return findSlotIndex(existing);
        if (global.VideoConfig) {
            const ch = VideoConfig.findChannelByDeviceId(camId);
            if (ch != null) {
                const idx = ch.slot;
                const el = getSlots()[idx];
                if (el && !wallSlotTaken(idx, camId)) return idx;
            }
        }
        for (let i = 0; i < getSlots().length; i++) {
            if (!wallSlotTaken(i, camId)) return i;
        }
        return existing ? findSlotIndex(existing) : 0;
    }

    function reserveWallSlotForCam(camId) {
        let idx = findWallSlotForCam(camId);
        if (idx == null || idx < 0 || idx >= PIN_SLOT_COUNT) idx = freeWallSlotForCam(camId);
        if (idx == null || idx < 0) return null;
        pendingWallSlots[idx] = camId;
        return idx;
    }

    function releaseWallSlot(slotIndex, camId) {
        if (pendingWallSlots[slotIndex] === camId) delete pendingWallSlots[slotIndex];
    }

    /** Video Config panel registration \u2192 wall slot; else first free panel. */
    function resolveWallSlotFromConfig(camId, taken) {
        if (!camId) return 0;
        taken = taken || {};
        if (global.VideoConfig && VideoConfig.findChannelByDeviceId) {
            const ch = VideoConfig.findChannelByDeviceId(camId);
            if (ch != null && typeof ch.slot === 'number') {
                const slot = ch.slot;
                if (slot >= 0 && slot < PIN_SLOT_COUNT && !taken[slot]) return slot;
            }
        }
        for (let i = 0; i < PIN_SLOT_COUNT; i++) {
            if (taken[i]) continue;
            if (!wallSlotTaken(i, camId)) return i;
        }
        return freeWallSlotForCam(camId);
    }

    function buildOpenAllAssignments(ids) {
        const slotByCam = Object.create(null);
        const pairs = [];
        const takenSlots = Object.create(null);
        const normalized = (ids || []).map(function (id) { return String(id || '').trim(); }).filter(Boolean);
        normalized.forEach(function (camId) {
            let slotId = -1;
            if (global.VideoConfig && VideoConfig.findChannelByDeviceId) {
                const ch = VideoConfig.findChannelByDeviceId(camId);
                if (ch != null && typeof ch.slot === 'number') {
                    const configSlot = ch.slot;
                    if (configSlot >= 0 && configSlot < PIN_SLOT_COUNT && !takenSlots[configSlot]) {
                        slotId = configSlot;
                    }
                }
            }
            if (slotId < 0) {
                for (let s = 0; s < PIN_SLOT_COUNT; s += 1) {
                    if (!takenSlots[s]) {
                        slotId = s;
                        break;
                    }
                }
            }
            if (slotId < 0) return;
            takenSlots[slotId] = camId;
            slotByCam[camId] = slotId;
            pairs.push({ camId: camId, slot: slotId });
        });
        pairs.sort(function (a, b) { return a.slot - b.slot; });
        return { slotByCam: slotByCam, pairs: pairs };
    }

    function openAllWallSlotForCam(camId) {
        if (!camId || !openAllSlotByCam) return null;
        const slot = openAllSlotByCam[camId];
        return (slot != null && slot >= 0) ? slot : null;
    }

    function pauseRotationForSlots(slotIndexes) {
        (slotIndexes || []).forEach(function (slotIndex) {
            if (rotateTimers.has(slotIndex)) {
                clearInterval(rotateTimers.get(slotIndex));
                rotateTimers.delete(slotIndex);
            }
        });
    }

    function releaseOpenAllState() {
        isBatchOpening = false;
        global.__me8PinBatchOpening = false;
        if (openAllLivePinsSyncTimer) {
            clearTimeout(openAllLivePinsSyncTimer);
            openAllLivePinsSyncTimer = null;
        }
        if (openAllSlotByCam) {
            Object.keys(openAllSlotByCam).forEach(function (camId) {
                const slot = openAllSlotByCam[camId];
                if (pendingWallSlots[slot] === camId) delete pendingWallSlots[slot];
            });
        }
        openAllReservedIds = null;
        openAllSlotByCam = null;
        openAllOccupiedSlots.clear();
        restartRotation();
    }

    function clearOpenAllWallStateForSos(sosCamId) {
        const openAllActive = !!(openAllReservedIds && openAllReservedIds.length);
        if (openAllLivePinsSyncTimer) {
            clearTimeout(openAllLivePinsSyncTimer);
            openAllLivePinsSyncTimer = null;
        }
        if (!openAllActive) openAllReservedIds = null;
        for (let i = 0; i < SLOT_COUNT; i++) {
            const pending = pendingWallSlots[i];
            if (!pending) continue;
            if (sosCamId && pending === sosCamId) continue;
            if (openAllActive && openAllReservedIds.indexOf(pending) >= 0) continue;
            if (players.has(i) && slotBoundCam(i) === pending) continue;
            delete pendingWallSlots[i];
        }
    }

    function forcedWallSlotForCam(camId) {
        if (!camId) return null;
        if (!isAlarmCamId(camId)) return null;
        return resolveSlotIndexForCam(camId);
    }

    /** Wall slot for a map pin: Open All lock \u2192 SOS slot \u2192 Video Config panel. */
    function resolvePinWallSlot(camId) {
        if (!camId) return null;
        const openAllSlot = openAllWallSlotForCam(camId);
        if (openAllSlot != null) return openAllSlot;
        const sosSlot = forcedWallSlotForCam(camId);
        if (sosSlot != null) return sosSlot;
        if (global.VideoConfig && VideoConfig.findChannelByDeviceId) {
            const ch = VideoConfig.findChannelByDeviceId(camId);
            if (ch != null && typeof ch.slot === 'number' && ch.slot >= 0 && ch.slot < PIN_SLOT_COUNT) {
                if (!wallSlotTaken(ch.slot, camId)) return ch.slot;
            }
        }
        return null;
    }

    function findSlotIndex(slotEl) {
        return parseInt(slotEl.dataset.slot, 10);
    }

    function clearAlarmStates() {
        getSlots().forEach((el) => {
            el.classList.remove('alarm');
            removeAlarmStreamingOverlay(el);
            const idx = findSlotIndex(el);
            const st = el.querySelector('.video-slot-status');
            if (st && (players.has(idx) || slotHasLiveWallPlayer(el, idx))) {
                st.textContent = 'Live';
            } else if (st) {
                st.textContent = 'Idle';
            }
        });
        removeMapPinStreamingOverlay();
        syncWallStopDuringSos();
        if (global.VideoConfig && VideoConfig.applyLabelsToWall) VideoConfig.applyLabelsToWall();
    }

    function selectSlot(slotEl) {
        getSlots().forEach((el) => el.classList.remove('selected'));
        if (slotEl) slotEl.classList.add('selected');
    }

    /** True when HQ may resume after Stopped by BWC (Play / SOS / Open All) \u2014 never auto. */
    function allowBwcStoppedLiveResume(opts) {
        opts = opts || {};
        return !!(opts.userPlay || opts.sosLive || opts.alarm || opts.openAll || opts.allowBwcStoppedResume);
    }

    function ensureInvite(camId, force, opts) {
        if (!socket || !camId) return false;
        camId = String(camId).trim();
        if (bwcStoppedCams.has(camId) && !allowBwcStoppedLiveResume(opts)) {
            return false;
        }
        if (!force && isStreamInvited(camId)) return false;
        if (!force && streamingCams.size >= MAX_LIVE_STREAMS && !isStreamInvited(camId)) {
            console.warn('[VideoWall] Max ' + MAX_LIVE_STREAMS + ' live streams');
            return false;
        }
        streamingCams.add(camId);
        streamingCamId = camId;
        activeCamId = camId;
        emitOpsStartVideo(camId, { forceRestart: !!force });
        return true;
    }

    /** Wall or server stream already up \u2014 attach JSMpeg only, no backend INVITE. */
    function requestStreamForCam(camId, force, opts) {
        if (!camId) return false;
        camId = String(camId).trim();
        if (bwcStoppedCams.has(camId) && !allowBwcStoppedLiveResume(opts)) {
            return false;
        }
        if (!canStreamCam(camId) && !force) return false;
        if (!force && isCameraLive(camId)) {
            noteExternalStream(camId);
            return false;
        }
        return ensureInvite(camId, force, opts);
    }

    /** Soft ZLM overlays by wall slot \u2014 JSMpeg stays; overlay removed on fail/stop. */
    const zlmWallOverlays = new Map();

    /** WVP handoff FLV URL per cam \u2014 MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1 */
    const wvpHandoffFlvByCam = new Map();

    /** Per-slot handoff attach lock \u2014 MOB-APPLY-FLV-SINGLE-ATTACH-DEDUPE-V1 */
    const wvpHandoffSlotInflight = new Map();

function handoffPlayerAttaching(player) {
        if (!player) return false;
        if (typeof player.isHandoffAttaching === 'function') return player.isHandoffAttaching();
        return !!player.wvpHandoffAttaching;
    }

    function clearHandoffInflightForCam(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        wvpHandoffSlotInflight.forEach(function (row, slotKey) {
            if (row && row.camId === camId) wvpHandoffSlotInflight.delete(slotKey);
        });
    }

    function clearWvpHandoffFlv(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        wvpHandoffFlvByCam.delete(camId);
        clearHandoffInflightForCam(camId);
    }

    function wvpHandoffFlvReady(camId) {
        return !!(camId && wvpHandoffFlvByCam.has(String(camId).trim()));
    }

    function getWvpHandoffFlvUrl(camId) {
        if (!camId) return null;
        return wvpHandoffFlvByCam.get(String(camId).trim()) || null;
    }

    function attachWvpHandoffFlvToWallSlot(slotKey, camId, slotEl, flvUrl) {
        if (typeof slotKey !== 'number' || !camId || !slotEl || !flvUrl) return false;
        camId = String(camId).trim();
        flvUrl = String(flvUrl);
        if (!global.Me8LivePlayerFactory
            || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return false;
        }
        const stage = slotEl.querySelector('.video-slot-stage');
        if (!stage) return false;
        const inflight = wvpHandoffSlotInflight.get(slotKey);
        if (inflight && inflight.camId === camId && inflight.flvUrl === flvUrl) {
            return true;
        }
        if (players.has(slotKey) && activeStreams.get(slotKey) === camId
            && slotEl.classList.contains('video-slot-has-live')
            && stage.querySelector('video.me8-zlm-primary')) {
            return true;
        }
        const existing = players.get(slotKey);
        if (existing && activeStreams.get(slotKey) === camId && handoffPlayerAttaching(existing)) {
            return true;
        }
        destroyZlmWallOverlay(slotKey);
        if (players.has(slotKey)) {
            destroyPlayer(slotKey, { keepPending: true, forceHandoffDestroy: true });
        }
        stage.querySelectorAll('canvas.video-canvas').forEach(function (c) { c.remove(); });
        const isAlarm = slotEl.classList.contains('alarm');
        const statusEl = slotEl.querySelector('.video-slot-status');
        const waitLabel = streamWaitLabel(isAlarm);
        if (statusEl) statusEl.textContent = waitLabel;
        slotEl.classList.remove('video-slot-has-live');
        ensureStreamingOverlay(stage, {
            className: 'video-slot-streaming-label',
            label: waitLabel,
            isAlarm: isAlarm,
        });
        wvpHandoffSlotInflight.set(slotKey, { camId: camId, flvUrl: flvUrl, at: Date.now() });
        console.log('[me8-flv] wall attach once', { slot: slotKey, camId: camId, url: flvUrl });
        const handle = global.Me8LivePlayerFactory.attachFlvPrimary(stage, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            onProven: function () {
                wvpHandoffSlotInflight.delete(slotKey);
                if (activeStreams.get(slotKey) !== camId) return;
                slotEl.classList.add('video-slot-has-live');
                removeAlarmStreamingOverlay(slotEl);
                removeStreamingOverlay(stage);
                if (statusEl) statusEl.textContent = 'Live';
                if (camId) {
                    noteVideoFrame(camId);
                    ensureBwcStallWatch(camId);
                }
                if (!isFixedCameraSourceId(camId)) startPcmAudio();
                updateSlotAudioButton(slotKey);
                syncAllCallUi();
                if (camId) {
                    syncMapPopupPlayer(camId);
                    requestAnimationFrame(function () { syncMapPopupPlayer(camId); });
                }
                scheduleWallSixteenNineFit();
            },
            onVideoFrame: function () {
                if (activeStreams.get(slotKey) !== camId) return;
                if (camId) noteVideoFrame(camId);
            },
            onFail: function () {
                wvpHandoffSlotInflight.delete(slotKey);
                if (activeStreams.get(slotKey) !== camId) return;
                if (isAlarm) ensureAlarmStreamingOverlay(slotEl);
                else ensureLiveStreamingOverlay(slotEl);
                if (statusEl) statusEl.textContent = tr('video.playerError');
            },
        });
        if (!handle) {
            wvpHandoffSlotInflight.delete(slotKey);
            console.log('[me8-flv] wall attach fail', { camId: camId, url: flvUrl, reason: 'attachFlvPrimary_null' });
            return false;
        }
        players.set(slotKey, handle);
        activeStreams.set(slotKey, camId);
        registerActivePlayer(camId, 'wall', handle, handle.video || null);
        releaseWallSlot(slotKey, camId);
        updateSlotAudioButton(slotKey);
        syncAllCallUi();
        return true;
    }

    function cancelSlotRenderTimersForCam(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        getSlots().forEach(function (slotEl) {
            const slotIndex = findSlotIndex(slotEl);
            if (Number.isNaN(slotIndex)) return;
            const bound = slotEl.dataset.camId || pendingWallSlots[slotIndex]
                || streamCamForSlotKey(slotIndex) || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            if (slotRenderTimers.has(slotIndex)) {
                clearTimeout(slotRenderTimers.get(slotIndex));
                slotRenderTimers.delete(slotIndex);
            }
        });
    }

    function attachWvpHandoffFlvForCam(camId, flvUrl) {
        if (!camId || !flvUrl) return;
        camId = String(camId).trim();
        wvpHandoffFlvByCam.set(camId, flvUrl);
        cancelSlotRenderTimersForCam(camId);
        getSlots().forEach(function (slotEl) {
            const slotIndex = findSlotIndex(slotEl);
            if (Number.isNaN(slotIndex)) return;
            const bound = slotEl.dataset.camId || pendingWallSlots[slotIndex]
                || streamCamForSlotKey(slotIndex) || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            attachWvpHandoffFlvToWallSlot(slotIndex, camId, slotEl, flvUrl);
        });
    }

    function destroyZlmWallOverlay(slotKey) {
        const h = zlmWallOverlays.get(slotKey);
        if (!h) return;
        zlmWallOverlays.delete(slotKey);
        try { h.destroy(); } catch (_) { /* ignore */ }
    }

    /** One-cam ZLM soft try only \u2014 Open All / multi-live stays JSMpeg. */
    function wallZlmSoftUpgradeAllowed() {
        if (openAllReservedIds && openAllReservedIds.length) return false;
        if (openAllOccupiedSlots.size > 0) return false;
        try {
            if (wallActiveCamIds().length > 1) return false;
        } catch (_) { /* ignore */ }
        return !!(global.Me8LivePlayerFactory
            && typeof global.Me8LivePlayerFactory.fetchDescriptorPreferZlm === 'function'
            && typeof global.Me8LivePlayerFactory.softAttachZlmOverlay === 'function');
    }

    function scheduleWallZlmSoftUpgrade(slotKey, camId, slotEl) {
        if (typeof slotKey !== 'number' || !camId || !slotEl) return;
        if (!wallZlmSoftUpgradeAllowed()) return;
        setTimeout(function () {
            if (!wallZlmSoftUpgradeAllowed()) return;
            if (activeStreams.get(slotKey) !== camId) return;
            if (!players.has(slotKey)) return;
            const stage = slotEl.querySelector('.video-slot-stage');
            if (!stage) return;
            destroyZlmWallOverlay(slotKey);
            global.Me8LivePlayerFactory.fetchDescriptorPreferZlm(camId, { tries: 5, gapMs: 600 })
                .then(function (desc) {
                    if (!wallZlmSoftUpgradeAllowed()) return;
                    if (activeStreams.get(slotKey) !== camId) return;
                    if (!players.has(slotKey)) return;
                    if (!desc || desc.engine !== 'zlm' || !desc.flvUrl) return;
                    const handle = global.Me8LivePlayerFactory.softAttachZlmOverlay(stage, desc, {
                        proveMs: 450,
                        timeoutMs: 8000,
                        onProven: function () {
                            /* JSMpeg kept under overlay for pin mirror \u2014 no wipe */
                        },
                        onFail: function () {
                            zlmWallOverlays.delete(slotKey);
                        },
                    });
                    if (handle) zlmWallOverlays.set(slotKey, handle);
                })
                .catch(function () { /* keep JSMpeg */ });
        }, 2200);
    }

    function attachCanvasPlayer(canvas, slotKey, camId, statusEl, connectDelayMs, slotEl) {
        if (!canvas && typeof slotKey !== 'number') return;
        const fixedCameraSource = isFixedCameraSourceId(camId);
        if (camId && !fixedCameraSource) clearBwcStallWatch(camId);
        if (!slotEl && typeof slotKey === 'number') slotEl = slotElForKey(slotKey);
        if (typeof slotKey === 'number' && camId && slotEl && wvpHandoffFlvReady(camId)) {
            attachWvpHandoffFlvToWallSlot(slotKey, camId, slotEl, getWvpHandoffFlvUrl(camId));
            return;
        }
        if (!canvas) return;
        let statusElRef = statusEl;
        let wsUrl = videoWsUrl(camId);
        if (typeof statusEl === 'string' && /^wss?:\/\//i.test(statusEl)) {
            wsUrl = statusEl;
            statusElRef = null;
        }
        if (!slotEl) slotEl = slotElForKey(slotKey);
        const mapHost = slotKey === 'map'
            ? (canvas.parentElement || mapPopupVideoHostForCam(camId))
            : null;
        const isAlarm = slotEl
            ? slotEl.classList.contains('alarm')
            : (slotKey === 'map' && isAlarmCamId(camId));
        const reuseWsOnly = slotKey === 'map' && pinCanReusePoolWs(camId);
        const delay = typeof connectDelayMs === 'number'
            ? connectDelayMs
            : (reuseWsOnly ? 80 : (streamingCamId === camId ? 200 : 400));
        const waitLabel = streamWaitLabel(isAlarm);
        if (statusElRef) statusElRef.textContent = waitLabel;
        if (slotEl) slotEl.classList.remove('video-slot-has-live');
        if (mapHost) mapHost.classList.remove('vid-box-live');
        const overlayOpts = {
            label: waitLabel,
            isAlarm: isAlarm,
        };
        if (slotEl) {
            ensureStreamingOverlay(slotEl.querySelector('.video-slot-stage'), Object.assign({
                className: 'video-slot-streaming-label',
            }, overlayOpts));
        } else if (mapHost) {
            mapHost.classList.remove('vid-box-live', 'map-pin-has-live');
            showMapPinStreamingOverlay(camId, isAlarm);
        }
        setTimeout(() => {
            if (typeof slotKey === 'number' && camId && slotEl && wvpHandoffFlvReady(camId)) {
                attachWvpHandoffFlvToWallSlot(slotKey, camId, slotEl, getWvpHandoffFlvUrl(camId));
                return;
            }
            if (typeof slotKey === 'number' && players.has(slotKey) && activeStreams.get(slotKey) === camId) return;
            if (slotKey === 'map' && camId && mapPlayers.has(camId)) {
                const existing = mapPlayers.get(camId);
                if (existing && existing.canvas === canvas) return;
            }
            if (slotEl) slotEl.classList.remove('video-slot-has-live');
            if (mapHost) mapHost.classList.remove('vid-box-live');
            try {
                const playerOpts = {
                    canvas: canvas,
                    audio: false,
                    pauseWhenHidden: false,
                    disableGl: true,
                    onVideoDecode: function () {
                        if (camId) {
                            noteVideoFrame(camId);
                            if (!fixedCameraSource) ensureBwcStallWatch(camId);
                        }
                        if (slotEl) {
                            if (slotEl.classList.contains('video-slot-has-live')) return;
                            removeAlarmStreamingOverlay(slotEl);
                            slotEl.classList.add('video-slot-has-live');
                            if (statusElRef) statusElRef.textContent = 'Live';
                            updateSlotAudioButton(slotKey);
                            syncAllCallUi();
                            if (camId && !fixedCameraSource) {
                                setTimeout(function () { syncMapPopupPlayer(camId); }, 120);
                            }
                            /* Baseline (Firmware Gold): multi-live \u2192 open map pins + one dock. */
                            if (!fixedCameraSource && wallActiveCamIds().length >= 2) {
                                setTimeout(function () {
                                    ensurePopupsForLiveWallCams();
                                }, 120);
                            }
                            return;
                        }
                        if (mapHost && camId) {
                            if (mapPinDecodedCams.has(camId)) return;
                            mapPinDecodedCams.add(camId);
                            mapHost.classList.add('map-pin-has-live');
                            if (!mapHost.classList.contains('vid-box-live')) {
                                mapHost.classList.add('vid-box-live');
                            }
                            const ph = mapHost.querySelector('.map-pin-video-placeholder');
                            if (ph) ph.hidden = true;
                            removeStreamingOverlay(mapHost);
                            updateMapPinStopButton(camId);
                            syncAllCallUi();
                        }
                    },
                };
                const player = new JSMpeg.Player(wsUrl, playerOpts);
                if (!fixedCameraSource) startPcmAudio();
                if (slotKey === 'map' && camId) {
                    mapPlayers.set(camId, player);
                    registerActivePlayer(camId, 'map', player, canvas);
                } else {
                    players.set(slotKey, player);
                    if (camId) registerActivePlayer(camId, 'wall', player, canvas);
                    releaseWallSlot(slotKey, camId);
                    if (!fixedCameraSource && !wvpHandoffFlvReady(camId)) {
                        scheduleWallZlmSoftUpgrade(slotKey, camId, slotEl);
                    }
                }
                if (camId) activeStreams.set(slotKey === 'map' ? mapStreamKey(camId) : slotKey, camId);
                if (slotKey === 'map' && camId) updateMapPinStopButton(camId);
                else if (typeof slotKey === 'number') updateSlotAudioButton(slotKey);
                syncAllCallUi();
            } catch (_) {
                if (statusElRef) statusElRef.textContent = tr('video.playerError');
                if (slotEl) {
                    if (isAlarm) ensureAlarmStreamingOverlay(slotEl);
                    else ensureLiveStreamingOverlay(slotEl);
                } else if (mapHost) {
                    showMapPinStreamingOverlay(camId, isAlarm);
                }
            }
        }, delay);
        defaultAudioMutedForNewStream(slotKey, camId);
    }

    function getMapPopupVideoHost(camId) {
        if (camId) {
            const fromCam = mapPinHostForCam(camId);
            if (fromCam) return fromCam;
        }
        const popup = document.querySelector('.leaflet-popup-content');
        if (!popup) return null;
        const canvas = popup.querySelector('canvas');
        if (canvas && canvas.parentElement) return canvas.parentElement;
        let host = popup.querySelector('.map-pin-video');
        if (!host) host = popup.querySelector('.vid-box');
        if (!host) host = popup.querySelector('.media-box.vid-box');
        return host;
    }

    function mapPinVideoMarkup(camId) {
        return      '<div class="map-pin-video-wrap">' +
            '<span class="map-pin-ptt-rx-badge" hidden>' + tr('ptt.fieldBadge') + '</span>' +
            '<div class="media-box vid-box map-pin-video" data-cam-id="' + camId + '">' +
            '<div class="map-pin-video-placeholder">' + tr('map.pin.livePlaceholder') + '</div>' +
            '<button type="button" class="map-pin-audio-mute" title="Listen to live audio" hidden>\uD83D\uDD07</button>' +
            '</div>' +
            '<div class="map-pin-video-bar">' +
            '<button type="button" class="map-pin-play" data-cam-id="' + camId + '" title="' + tr('call.liveVideo') + '">' + tr('call.liveVideo') + '</button>' +
            '<button type="button" class="map-pin-call" data-cam-id="' + camId + '" title="' + tr('call.whenLive') + '" hidden>' + tr('call.mapCall') + '</button>' +
            '<button type="button" class="map-pin-voice" data-cam-id="' + camId + '" title="' + tr('call.voiceOnly') + '" hidden>' + tr('call.voiceMap') + '</button>' +
            '<button type="button" class="map-pin-ptt" data-cam-id="' + camId + '" title="' + tr('ptt.holdTalk') + '" hidden>' + tr('ptt.mapLabel') + '</button>' +
            '<button type="button" class="map-pin-stop" data-cam-id="' + camId + '" title="' + tr('call.stopLive') + '" hidden>' + tr('call.stopLive') + '</button>' +
            '</div></div>';
    }

    function showMapPinStoppedPlaceholder(camId, labelText, placeholderClass) {
        if (!camId) return;
        labelText = labelText || tr('video.stopped');
        placeholderClass = placeholderClass || 'map-pin-stopped-placeholder';
        const root = mapPopupRootForCam(camId);
        if (!root) return;
        const host = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
        if (!host) {
            const container = root.querySelector('.sos-popup-container');
            if (!container) return;
            container.innerHTML = mapPinVideoMarkup(camId);
            const box = container.querySelector('.map-pin-video') || container.querySelector('.vid-box');
            const ph = box && box.querySelector('.map-pin-video-placeholder');
            if (ph) {
                ph.textContent = labelText;
                ph.hidden = false;
                ph.className = 'map-pin-video-placeholder ' + placeholderClass;
            }
            if (box) box.classList.remove('map-pin-bwc-stopped');
            updateMapPinStopButton(camId);
            return;
        }
        host.querySelectorAll('canvas, .map-pin-streaming-label, .video-signal-lost-overlay').forEach(function (el) {
            el.remove();
        });
        host.classList.remove('vid-box-live', 'map-pin-has-live', 'map-pin-signal-lost');
        if (placeholderClass === 'map-pin-bwc-stopped-placeholder') {
            host.classList.add('map-pin-bwc-stopped');
        } else {
            host.classList.remove('map-pin-bwc-stopped');
        }
        let ph = host.querySelector('.map-pin-video-placeholder');
        if (!ph) {
            ph = document.createElement('div');
            ph.className = 'map-pin-video-placeholder ' + placeholderClass;
            host.insertBefore(ph, host.firstChild);
        } else {
            ph.className = 'map-pin-video-placeholder ' + placeholderClass;
        }
        ph.textContent = labelText;
        ph.hidden = false;
        updateMapPinStopButton(camId);
    }

    function teardownWallPin(camId, stopKind) {
        if (!camId) return;
        camId = String(camId).trim();
        const isDevice = stopKind === 'device';
        clearVideoSignalLostForCam(camId);
        clearBwcDeviceStoppedForCam(camId);
        const panelLabel = isDevice ? tr('video.stoppedOnDevice') : tr('video.stopped');
        const panelStatus = isDevice ? tr('video.stoppedOnDevice') : 'Stopped';
        const pinClass = isDevice ? 'map-pin-bwc-stopped-placeholder' : 'map-pin-stopped-placeholder';
        getSlots().forEach(function (slotEl) {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            const idx = findSlotIndex(slotEl);
            if (slotRenderTimers.has(idx)) {
                clearTimeout(slotRenderTimers.get(idx));
                slotRenderTimers.delete(idx);
            }
            slotEl.classList.remove('video-slot-has-live', 'video-slot-signal-lost', 'video-slot-bwc-stopped');
            if (isDevice) slotEl.classList.add('video-slot-bwc-stopped');
            destroyPlayer(idx, { forceHandoffDestroy: true });
            const stage = slotEl.querySelector('.video-slot-stage');
            if (stage) {
                removeStreamingOverlay(stage);
                stage.innerHTML = '<span class="video-slot-empty' + (isDevice ? ' video-slot-bwc-stopped' : '') + '">'
                    + panelLabel + '</span>';
            }
            setSlotMeta(slotEl, camId, panelStatus);
        });
        mapPinDecodedCams.delete(camId);
        streamingCams.delete(camId);
        destroyMapPlayer(camId);
        if (streamingCamId === camId) {
            streamingCamId = streamingCams.values().next().value || null;
        }
        resetMapPopupVideo(camId);
        updateMapPinStopButton(camId);
        if (typeof global.minimizeMapPinVideo === 'function') {
            global.minimizeMapPinVideo(camId);
        }
        if (typeof global.refreshOpenPinPopups === 'function') {
            setTimeout(function () { global.refreshOpenPinPopups(); }, 50);
        }
        if (openAllSlotByCam || openAllLivePinsSyncTimer
            || (openAllReservedIds && openAllReservedIds.length)) {
            releaseOpenAllState();
        }
    }

    function resetMapPopupVideo(camId) {
        stopMapPinMirror(camId);
        if (!camId) return;
        destroyMapPlayer(camId);
        const root = mapPopupRootForCam(camId);
        if (!root) return;
        const container = root.querySelector('.sos-popup-container');
        if (!container) {
            showMapPinStoppedPlaceholder(camId);
            return;
        }
        container.innerHTML = mapPinVideoMarkup(camId);
        updateMapPinStopButton(camId);
    }

    function stopMapMirror() {
        stopMapPinMirror(null);
    }

    function restoreWallCanvasForCam(camId, canvas) {
        if (!canvas || !camId) return false;
        const slotIndex = findWallSlotForCam(camId);
        if (slotIndex == null || slotIndex < 0) return false;
        const slotEl = getSlots()[slotIndex];
        const stage = slotEl && slotEl.querySelector('.video-slot-stage');
        if (!stage) return false;
        if (stage.contains(canvas)) return true;
        stage.innerHTML = '';
        canvas.className = 'video-canvas';
        canvas.style.cssText = 'width:100%;height:100%;display:block;background:#000';
        stage.appendChild(canvas);
        return true;
    }

    function wallCanvasForCam(camId) {
        if (!camId) return null;
        for (const el of getSlots()) {
            const idx = findSlotIndex(el);
            if (!players.has(idx)) continue;
            const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
            if (bound !== camId) continue;
            const canvas = el.querySelector('.video-slot-stage canvas');
            if (canvas && canvas.width > 8 && canvas.height > 8) return canvas;
        }
        return null;
    }

    /** WVP handoff wall player \u2014 mpegts on <video>, no JSMpeg canvas. */

    /**
     * Pin mirror source \u2014 Firmware Gold canvas first; else handoff <video> when wall decoded.
     * Player-only change for WVP/ZLM (no layout).
     */

    /** Wall panel has real decode (video-slot-has-live) \u2014 not merely an invited player canvas. */
    function wallSlotDecodedForCam(camId) {
        if (!camId) return false;
        return getSlots().some(function (el) {
            const idx = findSlotIndex(el);
            const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
            if (bound !== camId) return false;
            return slotHasLiveWallPlayer(el, idx);
        });
    }


    /** WVP handoff wall player \u2014 mpegts on <video>, no JSMpeg canvas. */
    function wallHandoffVideoForCam(camId) {
        if (!camId) return null;
        camId = String(camId).trim();
        for (const el of getSlots()) {
            const idx = findSlotIndex(el);
            if (!players.has(idx)) continue;
            const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
            if (bound !== camId) continue;
            const video = el.querySelector('.video-slot-stage video.me8-zlm-primary');
            if (video) return video;
        }
        return null;
    }

    /** Pin mirror source \u2014 classic canvas first; else handoff <video> when wall decoded. */
    function wallMirrorSourceForCam(camId) {
        if (!camId) return null;
        const canvas = wallCanvasForCam(camId);
        if (canvas) return { kind: 'canvas', el: canvas };
        if (!wallSlotDecodedForCam(camId)) return null;
        const video = wallHandoffVideoForCam(camId);
        if (video) return { kind: 'video', el: video };
        return null;
    }


    /** Pin video mirror \u2014 RAF copy from wall canvas or handoff <video> (Gold + player-only). */
    function startMapMirrorFromWall(camId, host) {
        if (!camId || !host) return false;
        camId = String(camId).trim();
        /* PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1 \u2014 classic RAF; source = canvas or WVP video. */
        const src = wallMirrorSourceForCam(camId);
        if (!src || !src.el) return false;
        const srcKind = src.kind === 'video' ? 'video' : 'canvas';
        const srcEl = src.el;

        stopMapPinMirror(camId);

        let dstCanvas = wvpVideoHandoffUi
            ? ensureWvpPinCanvas(host)
            : (host.querySelector('canvas.map-pin-video-canvas')
                || host.querySelector('canvas.map-pin-mirror-canvas'));
        if (!dstCanvas) {
            dstCanvas = document.createElement('canvas');
            dstCanvas.className = 'map-pin-mirror-canvas';
            dstCanvas.style.cssText = 'width:100%;height:100%;display:block;background:#000';
            host.appendChild(dstCanvas);
        } else {
            dstCanvas.classList.add('map-pin-mirror-canvas');
        }

        mapMirrorCamId = camId;

        function wallSlotElForCam(id) {
            for (const el of getSlots()) {
                const idx = findSlotIndex(el);
                if (!players.has(idx)) continue;
                const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
                if (bound === id) return el;
            }
            return null;
        }

        function render() {
            if (!host.isConnected || !srcEl.isConnected) {
                stopMapPinMirror(camId);
                return;
            }
            const dst = host.querySelector('canvas.map-pin-mirror-canvas');
            if (!dst) {
                stopMapPinMirror(camId);
                return;
            }
            const sw = srcKind === 'canvas' ? srcEl.width : srcEl.videoWidth;
            const sh = srcKind === 'canvas' ? srcEl.height : srcEl.videoHeight;
            if (sw > 8 && sh > 8) {
                const fixedPinBox = dst.classList.contains('map-pin-video-canvas');
                if (!fixedPinBox) {
                    if (dst.width !== sw) dst.width = sw;
                    if (dst.height !== sh) dst.height = sh;
                }
                const dw = dst.width;
                const dh = dst.height;
                const ctx = dst.getContext('2d');
                if (ctx) {
                    try { ctx.drawImage(srcEl, 0, 0, dw, dh); } catch (_) { /* ignore */ }
                }
                if (!mapPinDecodedCams.has(camId)) {
                    mapPinDecodedCams.add(camId);
                    noteVideoFrame(camId);
                    removeStreamingOverlay(host);
                    const ph = host.querySelector('.map-pin-video-placeholder');
                    if (ph) ph.hidden = true;
                    updateMapPinStopButton(camId);
                }
            }
            const slotEl = wallSlotElForCam(camId);
            const wallLive = !!(slotEl && slotEl.classList.contains('video-slot-has-live'));
            if (wallLive) {
                host.classList.add('map-pin-has-live', 'vid-box-live');
            } else {
                host.classList.remove('map-pin-has-live', 'vid-box-live');
            }
            ensureMapPinVideoRafs();
            global.mapPinVideoRafs[camId] = requestAnimationFrame(render);
        }

        ensureMapPinVideoRafs();
        global.mapPinVideoRafs[camId] = requestAnimationFrame(render);
        return true;
    }

    function ensureMapPopupShowsWallStream(camId, isAlarm) {
        if (!camId) return;
        if (bwcStoppedCams.has(camId) && !isAlarm) {
            updateMapPinStopButton(camId);
            return;
        }
        if (!mapPinHostForCam(camId) && !getMapPopupVideoHost()) return;
        requestStreamForCam(camId, false, isAlarm ? { alarm: true, sosLive: true } : {});
        activeCamId = camId;
        syncWallPanelForCam(camId, !!isAlarm);
        syncMapPopupPlayer(camId);
    }

    function mapPopupVideoHostForCam(camId) {
        if (!camId) return null;
        const id = String(camId).trim();
        const root = document.querySelector('.leaflet-popup-content .map-popup[data-cam-id="' + id + '"]');
        if (!root) return null;
        let host = root.querySelector('.map-pin-video[data-cam-id="' + id + '"]');
        if (!host) host = root.querySelector('.map-pin-video');
        if (!host) return null;
        const hostCam = host.getAttribute('data-cam-id');
        if (hostCam && hostCam !== id) return null;
        return host;
    }

    function pinStoppedByUser(camId) {
        return !!(camId && typeof global.isPinVideoStoppedByUser === 'function'
            && global.isPinVideoStoppedByUser(camId));
    }

    function attachMapPopupPlayer(camId, host) {
        if (!camId) return false;
        camId = String(camId).trim();
        if (pinStoppedByUser(camId)) {
            updateMapPinStopButton(camId);
            return false;
        }
        /* Do not clear Stopped by BWC here \u2014 that reopened live / auto call-back. */
        if (bwcStoppedCams.has(camId)) {
            updateMapPinStopButton(camId);
            return false;
        }
        if (!host) host = mapPopupVideoHostForCam(camId);
        if (!host) return false;
        const hostCam = host.getAttribute('data-cam-id');
        if (hostCam && hostCam !== camId) return false;

        if (mapPinMirrorActive(camId) && host.querySelector('canvas.map-pin-mirror-canvas')) {
            host.onclick = null;
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            refreshPinPttAfterLivePin(camId);
            return true;
        }

        if (!mapPinHasLiveVideo(camId) && !mapPinMirrorActive(camId)
            && wallHasPlayerForCam(camId) && !wallSlotDecodedForCam(camId)) {
            const waitCanvas = host.querySelector('canvas.map-pin-video-canvas');
            const waitPlayer = getMapPlayer(camId);
            const hasPinPlayer = !!(waitCanvas && waitPlayer && waitPlayer.canvas === waitCanvas);
            const hasMirrorCanvas = !!host.querySelector('canvas.map-pin-mirror-canvas');
            const streamLabel = host.querySelector('.map-pin-streaming-label');
            const labelVisible = !!(streamLabel && streamLabel.style.display !== 'none'
                && streamLabel.style.opacity !== '0');
            if (labelVisible || (!hasPinPlayer && !hasMirrorCanvas)) {
                if (!labelVisible) showMapPinStreamingOverlay(camId, isAlarmCamId(camId));
                host.onclick = null;
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                refreshPinPttAfterLivePin(camId);
                return true;
            }
            if (hasPinPlayer) {
                host.onclick = null;
                host.classList.remove('vid-box-live', 'map-pin-has-live');
                if (!labelVisible) showMapPinStreamingOverlay(camId, isAlarmCamId(camId));
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                refreshPinPttAfterLivePin(camId);
                return true;
            }
        }

        if (wallMirrorSourceForCam(camId)) {
            destroyMapPlayer(camId);
            if (startMapMirrorFromWall(camId, host)) {
                const mirrorPh = host.querySelector('.map-pin-video-placeholder');
                if (mirrorPh) mirrorPh.hidden = true;
                removeStreamingOverlay(host);
                host.onclick = null;
                host.style.padding = '0';
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                refreshPinPttAfterLivePin(camId);
                return true;
            }
            showMapPinStreamingOverlay(camId, isAlarmCamId(camId));
            updateMapPinStopButton(camId);
            return true;
        }

        if (wvpVideoHandoffUi) {
            destroyMapPlayer(camId);
            ensureWvpPinCanvas(host);
            host.classList.remove('vid-box-live', 'map-pin-has-live');
            showMapPinStreamingOverlay(camId, isAlarmCamId(camId));
            updateMapPinStopButton(camId);
            return true;
        }

        stopMapPinMirror(camId);
        const existingCanvas = host.querySelector('canvas.map-pin-video-canvas');
        const existingPlayer = getMapPlayer(camId);
        if (existingCanvas && existingPlayer && host.contains(existingCanvas)
            && existingPlayer.canvas === existingCanvas) {
            if (mapPinHasLiveVideo(camId)) {
                host.onclick = null;
                host.classList.add('vid-box-live', 'map-pin-has-live');
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                refreshPinPttAfterLivePin(camId);
                return true;
            }
            if (!wallSlotDecodedForCam(camId)) {
                host.onclick = null;
                host.classList.remove('vid-box-live', 'map-pin-has-live');
                showMapPinStreamingOverlay(camId, isAlarmCamId(camId));
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                refreshPinPttAfterLivePin(camId);
                return true;
            }
            destroyMapPlayer(camId);
            existingCanvas.remove();
        } else if (mapPinHasLiveVideo(camId) && existingCanvas && host.contains(existingCanvas)) {
            host.onclick = null;
            host.classList.add('vid-box-live', 'map-pin-has-live');
            removeStreamingOverlay(host);
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            refreshPinPttAfterLivePin(camId);
            return true;
        }
        destroyMapPlayer(camId);
        if (!pinCanReusePoolWs(camId)) {
            requestStreamForCam(camId);
        } else {
            noteExternalStream(camId);
        }
        host.onclick = null;
        host.style.padding = '0';
        host.classList.remove('vid-box-live', 'map-pin-has-live');
        mapPinDecodedCams.delete(camId);
        host.querySelectorAll('canvas.map-pin-video-canvas, canvas.map-pin-mirror-canvas').forEach(function (c) { c.remove(); });
        const canvas = document.createElement('canvas');
        canvas.className = 'map-pin-video-canvas';
        canvas.style.cssText = 'width:100%;height:100%;display:block;background:#000';
        host.appendChild(canvas);
        if (pinCanReusePoolWs(camId) && !mapPinHasLiveVideo(camId)) {
            showMapPinStreamingOverlay(camId, isAlarmCamId(camId));
        }
        const mapStreamAttachArg = pinCanReusePoolWs(camId) ? videoWsUrl(camId) : null;
        attachCanvasPlayer(canvas, 'map', camId, mapStreamAttachArg);
        updateMapPinStopButton(camId);
        unmuteAudioForSosCam(camId);
        refreshPinPttAfterLivePin(camId);
        return true;
    }

    function syncMapPopupPlayer(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        if (pinStoppedByUser(camId)) {
            updateMapPinStopButton(camId);
            return;
        }
        attachMapPopupPlayer(camId, null);
    }

    function syncPinMirrorOnWallDecode(camId) {
        syncMapPopupPlayer(camId);
    }

    function updateMapPinStopButton(camId) {
        const root = camId ? mapPopupRootForCam(camId) : null;
        const scope = root || document.querySelector('.leaflet-popup-content');
        if (!scope) return;
        const bar = scope.querySelector('.map-pin-video-bar');
        const box = scope.querySelector('.map-pin-video') || scope.querySelector('.vid-box');
        if (!bar) return;
        const id = camId || streamingCamId || (box && box.getAttribute('data-cam-id'));
        const pinHasCanvas = !!(box && box.querySelector('canvas'));
        const pinDecoded = !!(id && mapPinHasLiveVideo(id));
        const lazyPending = !!(id && typeof global.shouldLazyPinLive === 'function' && global.shouldLazyPinLive(id));
        const streaming = !!(id && (mapPlayers.has(id) || mapPinMirrorActive(id) || mapPinHasLiveVideo(id)
            || (!lazyPending && wallHasPlayerForCam(id))
            || isStreamInvited(id)));
        const playBtn = bar.querySelector('.map-pin-play');
        const stopBtn = bar.querySelector('.map-pin-stop');
        const placeholder = box && box.querySelector('.map-pin-video-placeholder');
        if (lazyPending && !pinDecoded) {
            if (playBtn) playBtn.hidden = false;
            if (stopBtn) stopBtn.hidden = true;
            if (placeholder) placeholder.hidden = false;
            if (box) box.classList.remove('vid-box-live', 'map-pin-has-live');
            syncPinAudioUi(camId);
            syncPinCallUi(camId);
            syncPinVoiceUi(camId);
            syncPinPttUi(camId);
            syncPinPttTxUi();
            if (id && root) applyMapPinPttCommUi(id, root);
            return;
        }
        if (id && typeof global.isPinVideoStoppedByUser === 'function' && global.isPinVideoStoppedByUser(id)) {
            if (playBtn) playBtn.hidden = false;
            if (stopBtn) stopBtn.hidden = true;
            if (placeholder) {
                placeholder.textContent = tr('video.stopped');
                placeholder.hidden = false;
                placeholder.classList.add('map-pin-stopped-placeholder');
            }
            if (box) {
                box.classList.remove('vid-box-live', 'map-pin-has-live', 'map-pin-signal-lost');
            }
            syncPinAudioUi(camId);
            syncPinCallUi(camId);
            syncPinVoiceUi(camId);
            syncPinPttUi(camId);
            syncPinPttTxUi();
            if (id && root) applyMapPinPttCommUi(id, root);
            return;
        }
        if (id && bwcStoppedCams.has(id)) {
            if (playBtn) playBtn.hidden = false;
            if (stopBtn) stopBtn.hidden = true;
            syncPinAudioUi(camId);
            syncPinCallUi(camId);
            syncPinVoiceUi(camId);
            syncPinPttUi(camId);
            syncPinPttTxUi();
            if (id && root) applyMapPinPttCommUi(id, root);
            return;
        }
        if (playBtn) playBtn.hidden = streaming;
        if (stopBtn) {
            stopBtn.hidden = !streaming;
            stopBtn.disabled = false;
            stopBtn.classList.remove('sos-stop-disabled');
            stopBtn.title = tr('call.stopLive');
        }
        const pinLive = pinDecoded || !!(id && mapPinMirrorActive(id));
        if (placeholder) placeholder.hidden = pinLive;
        if (placeholder && !placeholder.hidden && !placeholder.classList.contains('map-pin-stopped-placeholder')) {
            placeholder.textContent = tr('map.pin.livePlaceholder');
        }
        if (box) {
            if (pinLive) {
                box.classList.add('vid-box-live', 'map-pin-has-live');
            } else {
                box.classList.remove('vid-box-live', 'map-pin-has-live');
                if (id && !lazyPending && !mapPinHasLiveVideo(id)) {
                    if (wallHasPlayerForCam(id)) {
                        showMapPinStreamingOverlay(id, isAlarmCamId(id));
                    } else {
                        syncMapPinStreamingOverlay(id);
                    }
                }
            }
        }
        syncPinAudioUi(camId);
        syncPinCallUi(camId);
        syncPinVoiceUi(camId);
        syncPinPttUi(camId);
        syncPinPttTxUi();
        if (id && root) applyMapPinPttCommUi(id, root);
    }

    function slotIsLiveForCam(slotEl, camId) {
        if (!slotEl || !camId) return false;
        const bound = slotEl.dataset.camId || (global.VideoConfig ? VideoConfig.slotDeviceId(findSlotIndex(slotEl)) : '');
        if (bound && bound !== camId) return false;
        const st = slotEl.querySelector('.video-slot-status');
        const idx = findSlotIndex(slotEl);
        return !!(st && st.textContent === 'Live' && players.has(idx));
    }

    function wallHasPlayerForCam(camId) {
        if (!camId) return false;
        return getSlots().some((el) => {
            const idx = findSlotIndex(el);
            if (!players.has(idx)) return false;
            const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
            return bound === camId;
        });
    }

    /** True when Ops wall still owns this cam (player, pending assign, or active panel bind). */
    function opsWallClaimsCam(camId) {
        if (!camId) return false;
        camId = String(camId).trim();
        if (wallHasPlayerForCam(camId)) return true;
        if (openAllWallSlotForCam(camId) != null) return true;
        let i;
        const slots = getSlots();
        for (i = 0; i < slots.length; i += 1) {
            if (pendingWallSlots[i] === camId) return true;
        }
        for (i = 0; i < slots.length; i += 1) {
            if (!slotRenderTimers.has(i)) continue;
            const el = slots[i];
            const bound = slotBoundCam(i) || el.dataset.camId || '';
            if (bound === camId) return true;
        }
        for (i = 0; i < slots.length; i += 1) {
            const el = slots[i];
            const bound = slotBoundCam(i) || el.dataset.camId || resolveCamIdForSlot(el);
            if (bound !== camId) continue;
            const st = el.querySelector('.video-slot-status');
            const label = (st && st.textContent) || '';
            if (label === 'Stopped' || label === 'Idle') continue;
            if (label === 'Offline' || label === tr('map.pin.offline')) continue;
            return true;
        }
        return false;
    }

    function wvpPinHasPendingOrActiveClaim(camId) {
        return !!(wvpVideoHandoffUi && camId && opsWallClaimsCam(camId));
    }

    function isWallPlayingCam(camId) {
        if (!camId) return false;
        if (streamingCamId === camId) return true;
        return wallHasPlayerForCam(camId);
    }

    function slotHasLiveWallPlayer(slotEl, idx) {
        return !!(players.has(idx) && slotEl.classList.contains('video-slot-has-live'));
    }

    function wallSlotHasLivePlayer(slotIndex, camId) {
        const slotEl = getSlots()[slotIndex];
        if (!slotEl || !camId) return false;
        const bound = slotEl.dataset.camId || streamCamForSlotKey(slotIndex);
        if (bound && bound !== camId) return false;
        const idx = findSlotIndex(slotEl);
        return !!(players.has(idx) && slotEl.classList.contains('video-slot-has-live'));
    }

    function syncWallStopDuringSos() {
        const sosActive = typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive();
        getSlots().forEach((slotEl) => {
            const stopBtn = slotEl.querySelector('.video-slot-stop');
            if (!stopBtn) return;
            const block = sosActive && slotEl.classList.contains('alarm');
            stopBtn.disabled = block;
            stopBtn.classList.toggle('sos-stop-disabled', block);
            stopBtn.title = block ? 'Stop disabled during SOS until acknowledged' : tr('video.stop');
        });
    }

    function applySosAlarmUi(camId, slotIndex, statusText) {
        const label = statusText || alarmStreamLabel();
        getSlots().forEach((el) => {
            const idx = findSlotIndex(el);
            const bound = streamCamForSlotKey(idx) || el.dataset.camId;
            if (!bound || bound !== camId) return;
            if (!players.has(idx) && !pendingWallSlots[idx] && !slotHasLiveWallPlayer(el, idx)) return;
            el.classList.add('alarm');
            const st = el.querySelector('.video-slot-status');
            if (players.has(idx)) {
                if (st) st.textContent = 'Live';
                removeAlarmStreamingOverlay(el);
            } else if (slotHasLiveWallPlayer(el, idx)) {
                if (st) st.textContent = 'Live';
                removeAlarmStreamingOverlay(el);
            } else {
                setSlotMeta(el, camId, label);
                ensureAlarmStreamingOverlay(el);
            }
        });
        const slotEl = getSlots()[slotIndex];
        if (!slotEl) return;
        const idx = findSlotIndex(slotEl);
        const occupied = streamCamForSlotKey(idx) || slotEl.dataset.camId;
        if (occupied && occupied !== camId && players.has(idx)) return;
        slotEl.dataset.camId = camId;
        activeCamId = camId;
        selectSlot(slotEl);
        slotEl.classList.add('alarm');
        const st = slotEl.querySelector('.video-slot-status');
        if (players.has(idx) || slotHasLiveWallPlayer(slotEl, idx)) {
            if (st) st.textContent = 'Live';
            removeAlarmStreamingOverlay(slotEl);
        } else {
            setSlotMeta(slotEl, camId, label);
            ensureAlarmStreamingOverlay(slotEl);
        }
        unmuteAudioForSosCam(camId);
        syncWallStopDuringSos();
        syncMapPopupPlayer(camId);
        if (!wallHasPlayerForCam(camId)) {
            syncMapPopupPlayer(camId);
            setTimeout(function () {
                syncMapPopupPlayer(camId);
            }, 600);
        }
    }

    function canStreamCam(camId) {
        if (!camId) return false;
        if (typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive()) {
            const sosCam = typeof global.getSosCamId === 'function' ? global.getSosCamId() : '';
            if (sosCam && sosCam === camId) return true;
        }
        if (global.FleetUi && FleetUi.isDeviceOnline) return FleetUi.isDeviceOnline(camId);
        return true;
    }

    function showOfflineSlot(slotEl, camId) {
        const slotIndex = findSlotIndex(slotEl);
        destroyPlayer(slotIndex);
        slotEl.dataset.camId = camId;
        activeCamId = camId;
        selectSlot(slotEl);
        slotEl.classList.remove('alarm');
        slotEl.classList.remove('video-slot-has-live');
        setSlotMeta(slotEl, camId, tr('map.pin.offline'));
        const stage = slotEl.querySelector('.video-slot-stage');
        if (stage) {
            stage.innerHTML = '<span class="video-slot-empty video-slot-offline">' + tr('map.pin.bwcOffline') + '</span>';
        }
        syncAllCallUi();
        syncAllPttUi();
    }

    function onDeviceWentOffline(camId) {
        if (!camId) return;
        if (camHasSignalLostFrame(camId)) {
            markVideoSignalLost(camId);
            return;
        }
        destroyMapPlayer(camId);
        releaseServerStreamIfIdle(camId);
        getSlots().forEach((slotEl) => {
            const bound = slotEl.dataset.camId || resolveCamIdForSlot(slotEl);
            if (bound !== camId) return;
            showOfflineSlot(slotEl, camId);
        });
        destroyMapPlayer(camId);
    }

    function assignCamToSlot(camId, slotIndex, opts) {
        const slots = getSlots();
        const slotEl = slots[slotIndex];
        if (!slotEl || !camId) return;
        camId = String(camId).trim();
        opts = opts || {};
        const existingLiveSlot = slots.findIndex(function (candidate, index) {
            if (index === slotIndex) return false;
            if (activeStreams.get(index) === camId) return true;
            if (players.has(index) && slotBoundCam(index) === camId) return true;
            return pendingWallSlots[index] === camId && candidate.dataset.camId === camId;
        });
        if (existingLiveSlot >= 0) {
            ensureBankVisibleForSlot(existingLiveSlot);
            return;
        }
        ensureBankVisibleForSlot(slotIndex);
        clearVideoSignalLostForCam(camId);
        if (bwcStoppedCams.has(camId) && !allowBwcStoppedLiveResume(opts)
            && !(opts.alarm || opts.forceInvite || opts.userPlay || opts.openAll || opts.sosLive)) {
            return;
        }
        clearBwcDeviceStoppedForCam(camId);
        ensureActivePlayersRegistry();
        const wallReg = getRegisteredActivePlayer(camId, 'wall');
        if (wallReg && wallReg.player) {
            const currentSlotPlayer = players.get(slotIndex);
            if (currentSlotPlayer && activeStreams.get(slotIndex) === camId) {
                return;
            }
            const slotClaimsCam = activeStreams.get(slotIndex) === camId
                || pendingWallSlots[slotIndex] === camId
                || slotEl.dataset.camId === camId;
            if (handoffPlayerAttaching(wallReg.player)
                && slotClaimsCam) {
                return;
            }
            const registeredMedia = [
                wallReg.canvas,
                wallReg.player.canvas,
                wallReg.player.video,
            ].filter(function (media, index, rows) {
                return media && rows.indexOf(media) === index;
            });
            const regMedia = registeredMedia.find(function (media) {
                return document.body.contains(media);
            }) || registeredMedia[0];
            const mediaInDom = !!(regMedia && document.body.contains(regMedia));
            console.log('Binding Cam:', camId, 'to Media:', regMedia, 'DOM Presence:', mediaInDom);
            if (mediaInDom && slotEl.contains(regMedia) && !(opts && opts.forceReassign)) {
                if (wallSlotHasLivePlayer(slotIndex, camId)) return;
                if (players.has(slotIndex) && activeStreams.get(slotIndex) === camId) return;
            }
            if (!mediaInDom) {
                try { wallReg.player.destroy(); } catch (_) { /* ignore */ }
                clearRegisteredActivePlayer(camId, 'wall');
                if (players.has(slotIndex)) players.delete(slotIndex);
            }
        }
        if (!(opts && opts.forceReassign) && wallSlotHasLivePlayer(slotIndex, camId)) return;
        if (openAllOccupiedSlots.has(slotIndex)) {
            const occupant = slotBoundCam(slotIndex);
            if (occupant && occupant !== camId && players.has(slotIndex)) {
                const openSlot = openAllWallSlotForCam(camId);
                if (openSlot != null && openSlot !== slotIndex) {
                    return assignCamToSlot(camId, openSlot, opts);
                }
                if (!(opts && opts.alarm && occupant === camId)) return;
            }
        }
        const allowOffline = !!(opts && (opts.alarm || opts.forceInvite));
        if (!canStreamCam(camId) && !allowOffline) {
            showOfflineSlot(slotEl, camId);
            return;
        }

        if (opts && opts.alarm && isStreamInvited(camId) && wallHasPlayerForCam(camId) && !opts.forceInvite) {
            applySosAlarmUi(camId, slotIndex);
            pendingSosVideo = null;
            return;
        }
        if (opts && opts.alarm && isSosUiOnlyTakeover(camId, opts)) {
            applySosAlarmUi(camId, slotIndex);
            pendingSosVideo = null;
            return;
        }
        if (opts && opts.alarm && streamingCamId === camId && !opts.forceInvite) {
            opts.skipInvite = true;
            opts.keepAlarm = true;
        }

        if (!opts || !opts.skipInvite) {
            ensureInvite(camId, !!(opts && (opts.forceInvite || opts.alarm)), opts);
        }
        if (opts && opts.alarm && (opts.forceInvite || opts.skipInvite)) {
            pendingWallSlots[slotIndex] = camId;
            opts.wallSlotReserved = true;
        } else if (!(opts && opts.wallSlotReserved)) {
            pendingWallSlots[slotIndex] = camId;
        }
        slotEl.dataset.camId = camId;
        slotEl.setAttribute('data-cam-id', camId);
        activeCamId = camId;
        selectSlot(slotEl);
        if (opts && opts.alarm) slotEl.classList.add('alarm');
        else if (!opts || !opts.keepAlarm) slotEl.classList.remove('alarm');

        setSlotMeta(slotEl, camId, streamWaitLabel(!!(opts && opts.alarm)));

        const stage = slotEl.querySelector('.video-slot-stage');
        if (!stage) {
            console.warn('[VideoWall] assignCamToSlot: missing .video-slot-stage', slotIndex, camId);
            return;
        }
        const keepCanvas = wallReg && wallReg.player && (function () {
            const c = wallReg.canvas || wallReg.player.canvas;
            return !!(c && document.body.contains(c) && stage.contains(c));
        }());
        if (keepCanvas) {
            const keptCanvas = wallReg.canvas || wallReg.player.canvas;
            console.log('Binding Cam:', camId, 'to Canvas:', keptCanvas, 'DOM Presence:', document.body.contains(keptCanvas));
            return;
        }
        if (wvpHandoffFlvReady(camId)) {
            attachWvpHandoffFlvToWallSlot(slotIndex, camId, slotEl, getWvpHandoffFlvUrl(camId));
            return;
        }
        stage.querySelectorAll('.video-slot-empty').forEach(function (n) { n.remove(); });
        destroyPlayer(slotIndex, { keepPending: !!(opts && opts.wallSlotReserved) });
        if (slotRenderTimers.has(slotIndex)) {
            clearTimeout(slotRenderTimers.get(slotIndex));
            slotRenderTimers.delete(slotIndex);
        }
        const renderToken = String(Date.now());
        slotEl.dataset.renderToken = renderToken;
        const renderTimer = setTimeout(function () {
            slotRenderTimers.delete(slotIndex);
            if (!stage.parentElement) return;
            if (slotEl.dataset.camId !== camId) return;
            if (slotEl.dataset.renderToken !== renderToken) return;
            if (wvpHandoffFlvReady(camId)) {
                attachWvpHandoffFlvToWallSlot(slotIndex, camId, slotEl, getWvpHandoffFlvUrl(camId));
                return;
            }
            if (stage.querySelector('video.me8-zlm-primary')) return;
            const lateReg = getRegisteredActivePlayer(camId, 'wall');
            if (lateReg && lateReg.player) {
                const lateCanvas = lateReg.canvas || lateReg.player.canvas;
                const lateVideo = lateReg.player.video || null;
                if (lateVideo && document.body.contains(lateVideo) && stage.contains(lateVideo)) {
                    return;
                }
                if (lateCanvas && document.body.contains(lateCanvas) && stage.contains(lateCanvas)) {
                    console.log('Binding Cam:', camId, 'to Canvas:', lateCanvas, 'DOM Presence:', document.body.contains(lateCanvas));
                    return;
                }
                try { lateReg.player.destroy(); } catch (_) { /* ignore */ }
                clearRegisteredActivePlayer(camId, 'wall');
            }
            stage.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.className = 'video-canvas';
            stage.appendChild(canvas);
            const streamingLabel = document.createElement('div');
            streamingLabel.className = 'video-slot-streaming-label streaming-label-live';
            streamingLabel.innerText = 'Live streaming...';
            stage.appendChild(streamingLabel);
            console.log('Binding Cam:', camId, 'to Canvas:', canvas, 'DOM Presence:', document.body.contains(canvas));
            attachCanvasPlayer(canvas, slotIndex, camId, slotEl.querySelector('.video-slot-status'), undefined, slotEl);
            setTimeout(function () {
                if (mapPopupRootForCam(camId)) syncMapPopupPlayer(camId);
            }, 500);
        }, 300);
        slotRenderTimers.set(slotIndex, renderTimer);
    }

    function isCameraLive(camId) {
        if (!camId) return false;
        return wallSlotDecodedForCam(camId) || mapPinHasLiveVideo(camId);
    }

    function noteExternalStream(camId) {
        if (!camId) return;
        streamingCamId = camId;
        activeCamId = camId;
    }

    function notifyStreamStopped() {
        streamingCamId = null;
        endPttTalk();
        destroyAllPlayers();
        getSlots().forEach((slotEl) => {
            const stage = slotEl.querySelector('.video-slot-stage');
            if (stage) {
                stage.innerHTML = '<span class="video-slot-empty">' + tr('video.stopped') + '</span>';
            }
            const st = slotEl.querySelector('.video-slot-status');
            if (st && (st.textContent === 'Live' || st.textContent === 'Connecting\u2026'
                || st.textContent === alarmStreamLabel() || st.textContent === liveStreamLabel())) {
                st.textContent = 'Stopped';
            }
        });
        const camId = activeCamId;
        if (camId) {
            resetMapPopupVideo(camId);
            dismissMapPinPopup(camId);
        }
        updateMapPinStopButton(null);
    }

    function resumeLiveAfterAck(camId) {
        if (!camId || !socket) return;
        const slotIndex = resolveSlotIndexForCam(camId);
        const sosActive = typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive();
        const alarm = sosActive ? true : false;
        setTimeout(function () {
            assignCamToSlot(camId, slotIndex, { alarm: alarm, keepAlarm: alarm });
            setTimeout(function () { syncMapPopupPlayer(camId); }, 600);
        }, 800);
    }

    function dismissMapPinPopup(camId) {
        if (camId && typeof global.closeMapPinPopup === 'function') {
            global.closeMapPinPopup(camId);
        }
    }

    function stopSlot(slotEl) {
        const idx = findSlotIndex(slotEl);
        let camId = streamCamForSlotKey(idx);
        if (!camId && typeof idx === 'number' && activeStreams.has(idx)) {
            camId = activeStreams.get(idx);
        }
        if (!camId) camId = slotEl.dataset.camId || '';
        if (camId) clearVideoSignalLostForCam(camId);
        if (camId) clearBwcDeviceStoppedForCam(camId);
        slotEl.classList.remove('video-slot-signal-lost');
        if (typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive()) {
            const sosCam = typeof global.getSosCamId === 'function' ? global.getSosCamId() : activeCamId;
            if (sosCam && camId && String(sosCam) === String(camId)) return;
        }
        if (typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive()
            && slotEl.classList.contains('alarm')) {
            return;
        }
        if (slotRenderTimers.has(idx)) {
            clearTimeout(slotRenderTimers.get(idx));
            slotRenderTimers.delete(idx);
        }
        pendingSosVideo = null;
        cancelPendingSosResume();
        slotEl.classList.remove('alarm');
        slotEl.classList.remove('video-slot-has-live');
        destroyPlayer(idx, { forceHandoffDestroy: true });
        if (typeof idx === 'number') delete pendingWallSlots[idx];
        const cfgCam = configuredSlotCamId(idx);
        if (cfgCam) {
            slotEl.dataset.camId = cfgCam;
        } else {
            delete slotEl.dataset.camId;
            slotEl.removeAttribute('data-cam-id');
        }
        if (isFixedCameraSourceId(camId)) {
            fetch('/api/fixed-cams/' + encodeURIComponent(fixedCameraRegistryId(camId)) + '/wall/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }).catch(function () { /* panel is already locally stopped */ });
            streamingCams.delete(camId);
            if (streamingCamId === camId) streamingCamId = streamingCams.values().next().value || null;
            const fixedStage = slotEl.querySelector('.video-slot-stage');
            if (fixedStage) {
                fixedStage.innerHTML = '<span class="video-slot-empty">' + tr('video.stopped') + '</span>';
            }
            setSlotMeta(slotEl, cfgCam || null, 'Stopped');
            return;
        }
        if (camId) {
            if (openAllSlotByCam && openAllSlotByCam[camId] === idx) {
                delete openAllSlotByCam[camId];
            }
            if (openAllReservedIds && openAllReservedIds.indexOf(camId) >= 0) {
                openAllReservedIds = openAllReservedIds.filter(function (id) { return id !== camId; });
            }
            if (voiceCallCamId === camId && socket) {
                socket.emit('end-bwc-call', { camId: camId });
            }
            destroyMapPlayer(camId);
            if (socket) {
                emitOpsStopVideo(camId, 'operator', 'stopSlot:panel-stop');
            }
            streamingCams.delete(camId);
            if (streamingCamId === camId) {
                streamingCamId = streamingCams.values().next().value || null;
            }
        }
        const stage = slotEl.querySelector('.video-slot-stage');
        if (stage) {
            stage.innerHTML = '<span class="video-slot-empty">' + tr('video.stopped') + '</span>';
        }
        setSlotMeta(slotEl, cfgCam || null, 'Stopped');
        if (camId) {
            resetMapPopupVideo(camId);
            dismissMapPinPopup(camId);
        }
    }

    function stopAllVideo() {
        cancelPendingSosResume();
        destroyAllPlayers();
        mapPlayers.clear();
        stopMapPinMirror(null);
        streamingCams.forEach(function (id) {
            if (isFixedCameraSourceId(id)) {
                fetch('/api/fixed-cams/' + encodeURIComponent(fixedCameraRegistryId(id)) + '/wall/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }).catch(function () { /* local stop still completes */ });
            } else {
                emitOpsStopVideo(id, 'operator', 'stopAllVideo');
            }
        });
        streamingCams.clear();
        streamingCamId = null;
        voiceCallCamId = null;
        voiceCallPending = false;
        endPttTalk();
        getSlots().forEach((slotEl) => {
            const stage = slotEl.querySelector('.video-slot-stage');
            if (stage) {
                stage.innerHTML = '<span class="video-slot-empty">' + tr('video.stopped') + '</span>';
            }
            const st = slotEl.querySelector('.video-slot-status');
            if (st && (st.textContent === 'Live' || st.textContent === 'Connecting\u2026'
                || st.textContent === alarmStreamLabel() || st.textContent === liveStreamLabel())) {
                st.textContent = 'Stopped';
            }
        });
        mapPlayers.forEach(function (_, id) {
            resetMapPopupVideo(id);
        });
    }

    function focusMapPinQuiet(camId) {
        if (!camId) return;
        activeCamId = camId;
        /* Pin Stop sticky must clear when wall/panel wants pin live again. */
        if (typeof global.clearPinVideoUserStop === 'function') {
            global.clearPinVideoUserStop(camId);
        }
        if (typeof global.clearMapPinPopupSuppression === 'function') {
            global.clearMapPinPopupSuppression(camId);
        }
        if (typeof global.expandMapPinVideo === 'function') {
            global.expandMapPinVideo(camId);
        }
        /* Keep every live wall panel's map popup open \u2014 panel-by-panel play, colocated spread + drag. */
        if (typeof global.selectFleetDevice === 'function') {
            global.selectFleetDevice(camId, {
                skipVideo: true,
                keepMulti: true,
                addToMulti: true,
            });
        } else if (typeof global.syncMapPinForCam === 'function') {
            global.syncMapPinForCam(camId, { openPopup: true });
        }
        ensurePopupsForLiveWallCams();
        if (typeof global.setPinClusterActive === 'function') {
            global.setPinClusterActive(camId);
        }
        if (typeof global.bringPinPopupToFront === 'function') {
            global.bringPinPopupToFront(camId);
        }
        if (wallHasPlayerForCam(camId)) syncMapPopupPlayer(camId);
        else updateMapPinStopButton(camId);
        /* One dock pass \u2014 triple delayed docks caused pin jump / top thrash. */
        if (typeof global.assignColocatedPinPopupDocks === 'function') {
            global.assignColocatedPinPopupDocks('focus-map-pin');
        }
    }

    function requestMasterPinLayout(caller, opts) {
        if (opts && opts.openAll) return;
        if (typeof global.assignColocatedPinPopupDocks === 'function') {
            global.assignColocatedPinPopupDocks(caller || 'single-pin-video');
        }
    }

    /** Open map popups + pin video for every active wall slot (multi-pin when colocated). */
    function wallActiveCamIds() {
        var ids = [];
        getSlots().forEach(function (slotEl) {
            var id = (slotEl.dataset.camId || slotEl.getAttribute('data-cam-id') || '').trim();
            if (!id) return;
            var st = slotEl.querySelector('.video-slot-status');
            var label = (st && st.textContent) || '';
            if (label === 'Stopped' || label === 'Idle') return;
            ids.push(id);
        });
        return ids;
    }

    /** Baseline Firmware Gold \u2014 openPopup for every live wall cam + pin video. */
    function ensurePopupsForLiveWallCams() {
        var ids = wallActiveCamIds();
        ids.forEach(function (id) {
            if (typeof global.clearMapPinPopupSuppression === 'function') {
                global.clearMapPinPopupSuppression(id);
            }
            if (typeof global.syncMapPinForCam === 'function') {
                global.syncMapPinForCam(id, { openPopup: true });
            }
        });
        ids.forEach(function (id) {
            if (wallHasPlayerForCam(id)) syncMapPopupPlayer(id);
            else updateMapPinStopButton(id);
        });
        return ids;
    }

    async function playFixedCameraOnSlot(slotEl, sourceId) {
        const slotIndex = findSlotIndex(slotEl);
        if (slotIndex < PIN_SLOT_COUNT || !isFixedCameraSourceId(sourceId)) return;
        const duplicateSlot = getSlots().findIndex(function (candidate, index) {
            return index !== slotIndex && slotBoundCam(index) === sourceId
                && (players.has(index) || activeStreams.get(index) === sourceId);
        });
        if (duplicateSlot >= 0) {
            ensureBankVisibleForSlot(duplicateSlot);
            setSlotMeta(slotEl, sourceId, 'Already live on Panel ' + (duplicateSlot + 1));
            return;
        }
        setSlotMeta(slotEl, sourceId, 'Connecting\u2026');
        try {
            const response = await fetch('/api/fixed-cams/' + encodeURIComponent(fixedCameraRegistryId(sourceId)) + '/wall/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error(data.error || 'Fixed camera start failed');
            destroyPlayer(slotIndex, { forceHandoffDestroy: true });
            slotEl.dataset.camId = sourceId;
            slotEl.setAttribute('data-cam-id', sourceId);
            slotEl.classList.add('video-slot-fixed-camera');
            const stage = slotEl.querySelector('.video-slot-stage');
            if (!stage) throw new Error('Panel video stage unavailable');
            stage.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.className = 'video-canvas';
            stage.appendChild(canvas);
            streamingCams.add(sourceId);
            attachCanvasPlayer(canvas, slotIndex, sourceId, slotEl.querySelector('.video-slot-status'), 0, slotEl);
            selectSlot(slotEl);
        } catch (err) {
            setSlotMeta(slotEl, sourceId, err && err.message ? err.message : 'Fixed camera start failed');
        }
    }

    function playSlot(slotEl) {
        console.log('[PIN-TRACE] 4. playSlot() executed', slotEl);
        const camId = String(resolveCamIdForSlot(slotEl) || '').trim();
        if (!camId) {
            setSlotMeta(slotEl, null, tr('video.setIdInConfig'));
            return;
        }
        const slotIndex = findSlotIndex(slotEl);
        if (isFixedCameraSourceId(camId)) {
            playFixedCameraOnSlot(slotEl, camId);
            return;
        }
        slotEl.classList.remove('video-slot-fixed-camera');
        if (typeof global.clearPinVideoUserStop === 'function') {
            global.clearPinVideoUserStop(camId);
        }
        clearPttRxLingerForCamIds([camId], true);
        assignCamToSlot(camId, slotIndex, {
            alarm: slotEl.classList.contains('alarm'),
            forceInvite: true,
            userPlay: true,
        });
        if (global.PttRx && PttRx.refreshBanner) PttRx.refreshBanner();
        if (slotIndex < PIN_SLOT_COUNT) focusMapPinQuiet(camId);
    }

    function playConfiguredPanelForPin(camId) {
        camId = String(camId || '').trim();
        if (!camId || isFixedCameraSourceId(camId)) return false;
        const liveSlot = findSlotByCamId(camId);
        if (liveSlot && liveSlot.classList.contains('video-slot-has-live') && wallHasPlayerForCam(camId)) {
            syncMapPopupPlayer(camId);
            requestMasterPinLayout('single-pin-already-live');
            return true;
        }
        const configuredChannel = global.VideoConfig && VideoConfig.findChannelByDeviceId
            ? VideoConfig.findChannelByDeviceId(camId)
            : null;
        const slotIndex = configuredChannel && typeof configuredChannel.slot === 'number'
            && configuredChannel.slot >= 0 && configuredChannel.slot < PIN_SLOT_COUNT
            ? configuredChannel.slot
            : null;
        const panelEl = slotIndex != null ? getSlots()[slotIndex] : null;
        console.log('[PIN-TRACE] 2. Configured panel lookup:', {
            camId: camId,
            panelFound: !!panelEl,
        });
        if (!panelEl) {
            console.warn('[PIN-TRACE] configured panel not found', { camId: camId });
            return false;
        }
        const playBtn = panelEl.querySelector('.video-slot-play');
        if (!playBtn) {
            console.warn('[PIN-TRACE] 3b. FATAL: Play button not found in panel');
            return false;
        }
        console.log('[PIN-TRACE] 3. Executing synthetic click on panel', panelEl.id);
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
        });
        playBtn.dispatchEvent(clickEvent);
        requestMasterPinLayout('single-pin-panel-play');
        return true;
    }

    function syncWallPanelForCam(camId, isAlarm) {
        if (!camId || wallHasPlayerForCam(camId)) return;
        const slotIndex = reserveWallSlotForCam(camId);
        assignCamToSlot(camId, slotIndex, {
            skipInvite: true,
            keepAlarm: true,
            wallSlotReserved: true,
            alarm: !!isAlarm,
        });
    }

    function syncAllOpenPinPopupControls() {
        eachOpenPinPopup(function (camId) {
            if (wvpVideoHandoffUi) {
                const host = mapPinHostForCam(camId);
                if (host) ensureWvpPinCanvas(host);
            }
            updateMapPinStopButton(camId);
        });
    }

    function normalizeMapPinVideoBox(host) {
        if (!host) return;
        host.style.display = 'block';
        host.style.padding = '0';
        const camId = host.getAttribute('data-cam-id') || '';
        const canvases = host.querySelectorAll('canvas');
        if (canvases.length > 1) {
            for (let i = 1; i < canvases.length; i++) canvases[i].remove();
        }
        const canvas = host.querySelector('canvas');
        if (canvas) {
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;background:#000;z-index:1';
        }
        const ph = host.querySelector('.map-pin-video-placeholder');
        const hasLive = !!(camId && mapPinHasLiveVideo(camId));
        const hasCanvas = !!(canvas && canvas.width > 8 && canvas.height > 8);
        const streaming = !!(camId && (mapPlayers.has(camId) || hasLive || hasCanvas));
        if (ph && streaming) ph.hidden = true;
    }

    function syncAllOpenPinVideoLayout() {
        eachOpenPinPopup(function (camId, root) {
            const box = root.querySelector('.map-pin-video');
            if (box) normalizeMapPinVideoBox(box);
        });
        if (typeof global.repairOpenPinPopupVideos === 'function') {
            global.repairOpenPinPopupVideos();
        }
    }

    function syncAllOpenPinWallPanels() {
        let pairs = [];
        if (openAllSlotByCam && Object.keys(openAllSlotByCam).length) {
            pairs = Object.keys(openAllSlotByCam).map(function (camId) {
                return { camId: camId, slot: openAllSlotByCam[camId] };
            }).sort(function (a, b) { return a.slot - b.slot; });
        } else {
            const openIds = openAllReservedIds || (typeof global.getOpenPinCamIds === 'function'
                ? global.getOpenPinCamIds()
                : []);
            const built = buildOpenAllAssignments(openIds.slice(0, PIN_SLOT_COUNT));
            pairs = built.pairs;
        }
        pairs.forEach(function (pair) {
            const camId = pair.camId;
            const i = pair.slot;
            if (!camId || i == null || i < 0) return;
            pendingWallSlots[i] = camId;
            const slotEl = getSlots()[i];
            if (slotEl) slotEl.dataset.camId = camId;
            if (!wallSlotHasLivePlayer(i, camId)) {
                assignCamToSlot(camId, i, {
                    forceInvite: true,
                    keepAlarm: true,
                    wallSlotReserved: true,
                    alarm: false,
                });
            }
        });
        healOpenAllWallStreams();
    }

    function playMapPinVideoIfPopupOpenWithSlot(camId, wallSlotIndex, attempt, opts) {
        if (!camId) return;
        opts = opts || {};
        if (pinStoppedByUser(camId)) {
            updateMapPinStopButton(camId);
            return;
        }
        if (wallSlotIndex == null || wallSlotIndex < 0) {
            playMapPinVideoIfPopupOpen(camId, attempt, opts);
            return;
        }
        if (!canStreamCam(camId) && !isAlarmCamId(camId)) return;
        attempt = attempt || 0;
        const root = mapPopupRootForCam(camId);
        if (!root) {
            if (attempt < 24) {
                setTimeout(function () { playMapPinVideoIfPopupOpenWithSlot(camId, wallSlotIndex, attempt + 1, opts); }, 100);
            }
            return;
        }
        if (root.getAttribute('data-offline-popup') === '1') return;
        const host = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
        if (!host) {
            if (attempt < 24) {
                setTimeout(function () { playMapPinVideoIfPopupOpenWithSlot(camId, wallSlotIndex, attempt + 1, opts); }, 100);
            }
            return;
        }
        requestMasterPinLayout('single-pin-slot-video-ready', opts);
        if (typeof global.shouldLazyPinLive === 'function' && global.shouldLazyPinLive(camId, opts)) {
            pendingWallSlots[wallSlotIndex] = camId;
            if (!wallHasPlayerForCam(camId) && !wallSlotHasLivePlayer(wallSlotIndex, camId)) {
                assignCamToSlot(camId, wallSlotIndex, {
                    keepAlarm: true,
                    wallSlotReserved: true,
                    alarm: isAlarmCamId(camId),
                });
            }
            updateMapPinStopButton(camId);
            return;
        }
        pendingWallSlots[wallSlotIndex] = camId;
        const pinCanvas = host.querySelector('canvas');
        if (getMapPlayer(camId) && pinCanvas && mapPinHasLiveVideo(camId)) {
            if (wallHasPlayerForCam(camId)) {
                attachMapPopupPlayer(camId, host);
                normalizeMapPinVideoBox(host);
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                return;
            }
            if (!wallSlotHasLivePlayer(wallSlotIndex, camId)) {
                assignCamToSlot(camId, wallSlotIndex, opts.forceLive ? {
                    forceInvite: true,
                    keepAlarm: true,
                    wallSlotReserved: true,
                    alarm: false,
                } : {
                    skipInvite: true,
                    keepAlarm: true,
                    wallSlotReserved: true,
                    alarm: false,
                });
            }
            normalizeMapPinVideoBox(host);
            updateMapPinStopButton(camId);
            return;
        }
        if (wallHasPlayerForCam(camId)) {
            if (typeof global.shouldLazyPinLive === 'function' && global.shouldLazyPinLive(camId, opts)) {
                updateMapPinStopButton(camId);
                return;
            }
            attachMapPopupPlayer(camId, host);
            normalizeMapPinVideoBox(host);
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            return;
        }
        if (guardFieldPttCommInsteadOfPinAutoPlay(camId, attempt, opts)) return;
        playOnMapPopup(camId, host, wallSlotIndex, opts);
    }

    function prepareOpenAllLive(camIds) {
        const ids = (camIds || []).map(function (id) { return String(id || '').trim(); }).filter(Boolean).slice(0, PIN_SLOT_COUNT);
        if (!ids.length) return;
        ids.forEach(function (camId) {
            if (typeof global.clearPinVideoUserStop === 'function') {
                global.clearPinVideoUserStop(camId);
            }
            clearBwcDeviceStoppedForCam(camId);
        });
        clearPttRxLingerForCamIds(ids, true);
        openAllReservedIds = ids.slice();
    }

    /** Open All: Video Config panel N \u2192 wall slot N; map popups use dock layout separately. */
    function openAllLivePins(camIds) {
        const ids = (camIds || []).map(function (id) { return String(id || '').trim(); }).filter(Boolean).slice(0, PIN_SLOT_COUNT);
        if (!ids.length) return;
        isBatchOpening = true;
        global.__me8PinBatchOpening = true;
        prepareOpenAllLive(ids);
        const liveOpts = { forceLive: true, openAll: true };
        const built = buildOpenAllAssignments(ids);
        const assignmentPairs = built.pairs.slice();
        openAllReservedIds = ids.slice();
        openAllSlotByCam = built.slotByCam;
        openAllOccupiedSlots.clear();
        for (let p = 0; p < assignmentPairs.length; p += 1) {
            const slotId = assignmentPairs[p].slot;
            const camId = assignmentPairs[p].camId;
            openAllOccupiedSlots.add(slotId);
            pendingWallSlots[slotId] = camId;
            const slotEl = getSlots()[slotId];
            if (slotEl) slotEl.dataset.camId = camId;
        }
        pauseRotationForSlots(Array.from(openAllOccupiedSlots));
        for (let i = 0; i < assignmentPairs.length; i += 1) {
            const staggerCamId = assignmentPairs[i].camId;
            const staggerSlotId = assignmentPairs[i].slot;
            setTimeout(function () {
                playMapPinVideoIfPopupOpenWithSlot(staggerCamId, staggerSlotId, 0, liveOpts);
            }, i * OPEN_ALL_DEVICE_STAGGER_MS);
        }
        let pinOnlyIdx = 0;
        ids.forEach(function (camId) {
            if (built.slotByCam[camId] != null) return;
            const stagger = assignmentPairs.length + pinOnlyIdx;
            pinOnlyIdx += 1;
            setTimeout(function () {
                playMapPinVideoIfPopupOpen(camId, 0, liveOpts);
            }, stagger * OPEN_ALL_DEVICE_STAGGER_MS);
        });
        const totalStaggerMs = Math.max(0, ids.length - 1) * OPEN_ALL_DEVICE_STAGGER_MS;
        if (openAllLivePinsSyncTimer) clearTimeout(openAllLivePinsSyncTimer);
        const batchWaitStartedAt = Date.now();
        function finishOpenAllBatch() {
            const openIds = typeof global.getOpenPinCamIds === 'function'
                ? global.getOpenPinCamIds().map(function (id) { return String(id || '').trim(); }) : [];
            const allInjected = ids.every(function (id) { return openIds.indexOf(id) >= 0; });
            if (!allInjected && Date.now() - batchWaitStartedAt < 3000) {
                openAllLivePinsSyncTimer = setTimeout(finishOpenAllBatch, 100);
                return;
            }
            openAllLivePinsSyncTimer = null;
            isBatchOpening = false;
            global.__me8PinBatchOpening = false;
            if (typeof global.assignColocatedPinPopupDocks === 'function') {
                global.assignColocatedPinPopupDocks('open-all-master');
            }
            if (typeof global.scheduleSmartPinTracking === 'function') {
                global.scheduleSmartPinTracking();
            }
            syncAllOpenPinWallPanels();
            syncAllOpenPinVideoLayout();
            syncAllOpenPinPopupControls();
            setTimeout(function () {
                healOpenAllWallStreams();
                syncAllOpenPinVideoLayout();
            }, 500);
            setTimeout(function () {
                healOpenAllWallStreams();
                ensureOpenAllWallIfPinLive();
                syncAllOpenPinVideoLayout();
                syncAllPttRxUi();
            }, 1200);
        }
        openAllLivePinsSyncTimer = setTimeout(finishOpenAllBatch, totalStaggerMs + 50);
    }

    function activePinCanvasSize() {
        const openCount = typeof global.getOpenPinCamIds === 'function'
            ? Math.max(1, global.getOpenPinCamIds().length)
            : 1;
        return {
            width: 260,
            height: openCount >= 7 ? 110 : (openCount >= 5 ? 120 : 136),
        };
    }

    function ensureWvpPinCanvas(element) {
        if (!element) return null;
        const size = activePinCanvasSize();
        const canvases = Array.from(element.querySelectorAll('canvas'));
        let canvas = element.querySelector('canvas.map-pin-video-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'map-pin-video-canvas';
            canvas.style.cssText = 'width:100%;height:100%;display:block;background:#000';
            element.appendChild(canvas);
        }
        canvases.forEach(function (candidate) {
            if (candidate !== canvas) candidate.remove();
        });
        canvas.classList.add('map-pin-video-canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        return canvas;
    }

    function playOnMapPopup(camId, element, forcedWallSlot, opts) {
        if (!camId || !element) return;
        opts = opts || {};
        if (bwcStoppedCams.has(camId) && !allowBwcStoppedLiveResume(opts)) {
            updateMapPinStopButton(camId);
            return;
        }
        if (allowBwcStoppedLiveResume(opts) || !bwcStoppedCams.has(camId)) {
            clearBwcDeviceStoppedForCam(camId);
        }
        if (opts.forceLive) clearPttRxLingerForCamIds([camId], true);
        const wallAlarm = !!element.closest('[data-sos-popup="1"]');
        const pinIsAlarm = wallAlarm || isAlarmCamId(camId);
        element.onclick = null;
        element.style.padding = '0';
        element.classList.remove('vid-box-live');
        if (isWallPlayingCam(camId)) {
            const wallSlot = (forcedWallSlot != null && forcedWallSlot >= 0)
                ? forcedWallSlot
                : (function () {
                    const onWall = findWallSlotForCam(camId);
                    return (onWall != null && onWall >= 0) ? onWall : reserveWallSlotForCam(camId);
                }());
            if (wallHasPlayerForCam(camId)) {
                attachMapPopupPlayer(camId, element);
                updateMapPinStopButton(camId);
                unmuteAudioForSosCam(camId);
                return;
            }
            if (wallSlot != null && wallSlot >= 0 && !wallSlotHasLivePlayer(wallSlot, camId)) {
                pendingWallSlots[wallSlot] = camId;
                assignCamToSlot(camId, wallSlot, {
                    skipInvite: true,
                    keepAlarm: true,
                    wallSlotReserved: true,
                    alarm: wallAlarm,
                });
            }
            attachMapPopupPlayer(camId, element);
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            return;
        }
        if (guardFieldPttCommInsteadOfPinAutoPlay(camId, 0, opts)) return;
        requestStreamForCam(camId, !!opts.forceLive);
        // mob-play-on-map-popup-wall-claim: always claim a wall slot (Firmware Gold).
        // Optional freeWallSlotForCam skip left opsWallClaimsCam false during colocated
        // popupclose \u2192 releaseServerStreamIfIdle \u2192 stop-video \u2192 pool kill.
        const slotIndex = (forcedWallSlot != null && forcedWallSlot >= 0)
            ? forcedWallSlot
            : reserveWallSlotForCam(camId);
        pendingWallSlots[slotIndex] = camId;
        const forceWallInvite = !!(opts.forceLive && !wvpVideoHandoffUi);
        assignCamToSlot(camId, slotIndex, forceWallInvite ? {
            forceInvite: true,
            keepAlarm: true,
            wallSlotReserved: true,
            alarm: wallAlarm,
        } : {
            skipInvite: true,
            keepAlarm: true,
            wallSlotReserved: true,
            alarm: wallAlarm,
        });
        if (wvpVideoHandoffUi) {
            /*
             * Fleet pin-first contract, WVP transport: the reserved/pending wall slot
             * remains the sole stream owner until video-stream-ready installs the FLV
             * player. The existing FLV onProven callback then syncs this pin mirror.
             * Never attach the classic map JSMpeg fallback in WVP mode.
             */
            destroyMapPlayer(camId);
            ensureWvpPinCanvas(element);
            element.classList.remove('vid-box-live', 'map-pin-has-live');
            showMapPinStreamingOverlay(camId, pinIsAlarm);
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            syncAllPttRxUi();
            return;
        }
        let canvas = element.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'map-pin-video-canvas';
            canvas.style.cssText = 'width:100%;height:100%;display:block;background:#000';
            element.appendChild(canvas);
        }
        showMapPinStreamingOverlay(camId, pinIsAlarm);
        destroyMapPlayer(camId);
        attachCanvasPlayer(canvas, 'map', camId, null);
        updateMapPinStopButton(camId);
        unmuteAudioForSosCam(camId);
        syncAllPttRxUi();
    }

    function playMapPinVideoIfPopupOpen(camId, attempt, opts) {
        if (!camId) return;
        opts = opts || {};
        if (bwcStoppedCams.has(camId) && !allowBwcStoppedLiveResume(opts)) {
            updateMapPinStopButton(camId);
            return;
        }
        if (pinStoppedByUser(camId)) {
            updateMapPinStopButton(camId);
            return;
        }
        if (isPttCommPinIntent(camId)) {
            syncMapPinPttComm(camId, attempt || 0);
            return;
        }
        if (typeof global.shouldLazyPinLive === 'function' && global.shouldLazyPinLive(camId, opts)) {
            updateMapPinStopButton(camId);
            return;
        }
        if (opts.forceLive && isStreamInvited(camId) && !isCameraLive(camId)) {
            requestStreamForCam(camId, true, opts);
        }
        if (typeof global.expandMapPinVideo === 'function') {
            global.expandMapPinVideo(camId);
        }
        if (!canStreamCam(camId) && !isAlarmCamId(camId)) return;
        attempt = attempt || 0;
        const retryMs = opts.sosLive ? 50 : 100;
        const maxAttempt = opts.sosLive ? 40 : 20;
        const root = mapPopupRootForCam(camId);
        if (!root) {
            if (attempt < maxAttempt) {
                setTimeout(function () { playMapPinVideoIfPopupOpen(camId, attempt + 1, opts); }, retryMs);
            }
            return;
        }
        if (root.getAttribute('data-offline-popup') === '1') return;
        const host = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
        if (!host) {
            if (attempt < maxAttempt) {
                setTimeout(function () { playMapPinVideoIfPopupOpen(camId, attempt + 1, opts); }, retryMs);
            }
            return;
        }
        requestMasterPinLayout('single-pin-video-ready', opts);
        const pinCanvas = host.querySelector('canvas');
        if (mapPinMirrorActive(camId) && host.querySelector('canvas.map-pin-mirror-canvas')) {
            updateMapPinStopButton(camId);
            return;
        }
        if (getMapPlayer(camId) && pinCanvas && mapPinHasLiveVideo(camId)) {
            updateMapPinStopButton(camId);
            return;
        }
        if (wallHasPlayerForCam(camId)) {
            if (typeof global.shouldLazyPinLive === 'function' && global.shouldLazyPinLive(camId, opts)) {
                updateMapPinStopButton(camId);
                return;
            }
            attachMapPopupPlayer(camId, host);
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            refreshPinPttAfterLivePin(camId);
            return;
        }
        if (guardFieldPttCommInsteadOfPinAutoPlay(camId, attempt, opts)) return;
        const wallSlot = resolvePinWallSlot(camId);
        if (wallSlot != null) {
            playMapPinVideoIfPopupOpenWithSlot(camId, wallSlot, attempt || 0, opts);
            return;
        }
        playOnMapPopup(camId, host, null, opts);
    }

    const SOS_PIN_AFTER_WALL_MS = 2500;

    function scheduleSosPinVideoAfterWall(camId, slotIndex) {
        const start = Date.now();
        function tryPin() {
            if (!camId || pinStoppedByUser(camId)) return;
            if (wallHasPlayerForCam(camId) || isStreamInvited(camId)
                || Date.now() - start >= SOS_PIN_AFTER_WALL_MS) {
                playMapPinVideoForSos(camId, slotIndex);
                return;
            }
            setTimeout(tryPin, 60);
        }
        tryPin();
    }

    function playMapPinVideoForSos(camId, slotIndex) {
        const sosLiveOpts = { forceLive: true, sosLive: true };
        const openSlot = openAllWallSlotForCam(camId);
        if (openSlot != null) {
            playMapPinVideoIfPopupOpenWithSlot(camId, openSlot, 0, sosLiveOpts);
            return;
        }
        if (slotIndex != null && slotIndex >= 0) {
            playMapPinVideoIfPopupOpenWithSlot(camId, slotIndex, 0, sosLiveOpts);
            return;
        }
        playMapPinVideoIfPopupOpen(camId, 0, sosLiveOpts);
    }

    function stopPinLive(camId) {
        if (!camId) camId = streamingCamId || activeCamId;
        if (!camId) return;
        clearVideoSignalLostForCam(camId);
        if (typeof global.markPinVideoUserStop === 'function') {
            global.markPinVideoUserStop(camId);
        }
        // Firmware Gold: pin stop only affects the map popup player, not the wall stream.
        destroyMapPlayer(camId);
        resetMapPopupVideo(camId);
        releaseServerStreamIfIdle(camId);
        if (typeof global.minimizeMapPinVideo === 'function') {
            global.minimizeMapPinVideo(camId);
        }
        if (typeof global.refreshOpenPinPopups === 'function') {
            setTimeout(function () { global.refreshOpenPinPopups(); }, 50);
        }
    }

    /** Leaflet popupclose: destroy map-pin JSMpeg only; wall panel player stays live. */
    function cleanupMapPinPlayerOnPopupClose(camId) {
        if (!camId) return;
        camId = String(camId).trim();
        if (mapPinCleanupInProgress.has(camId)) return;
        mapPinCleanupInProgress.add(camId);
        try {
            clearPttCommPinForced(camId);
            destroyMapPlayer(camId);
            const host = mapPopupVideoHostForCam(camId);
            if (host) {
                host.querySelectorAll('canvas.map-pin-video-canvas').forEach(function (c) { c.remove(); });
                host.classList.remove('vid-box-live', 'map-pin-has-live');
            }
            const wallOwnsPendingOrLive = opsWallClaimsCam(camId);
            /*
             * In WVP pin-first startup, pendingWallSlots/slot render/FLV player is the
             * durable viewer owner. A popup remount must not release that sole viewer.
             */
            if (!wallOwnsPendingOrLive) {
                releaseServerStreamIfIdle(camId);
            }
        } finally {
            mapPinCleanupInProgress.delete(camId);
        }
    }

    function resolveMapPinCamId(box, btn) {
        const pop = (box || btn) && (box || btn).closest('.map-popup');
        return (box && box.getAttribute('data-cam-id'))
            || (btn && btn.getAttribute('data-cam-id'))
            || (pop && pop.getAttribute('data-cam-id'))
            || activeCamId;
    }

    function bindMapPinVideoClick() {
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.leaflet-popup-content')) return;
            const callBtn = e.target.closest('.map-pin-call');
            if (callBtn) {
                e.preventDefault();
                e.stopPropagation();
                const cid = callBtn.getAttribute('data-cam-id') || streamingCamId;
                if (cid) toggleVoiceCall(cid);
                return;
            }
            const voiceBtn = e.target.closest('.map-pin-voice');
            if (voiceBtn) {
                e.preventDefault();
                e.stopPropagation();
                const cid = voiceBtn.getAttribute('data-cam-id') || streamingCamId;
                if (cid) toggleVoiceCall(cid, { audioOnly: true });
                return;
            }
            const pttBtn = e.target.closest('.map-pin-ptt');
            if (pttBtn) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const playBtn = e.target.closest('.map-pin-play');
            const box = e.target.closest('.leaflet-popup-content .map-pin-video');
            if (playBtn) {
                const camId = resolveMapPinCamId(box, playBtn);
                const host = box || document.querySelector('.leaflet-popup-content .map-pin-video');
                if (!camId || !host) return;
                e.preventDefault();
                e.stopPropagation();
                /* Clear before play \u2014 capture runs before dashboard-boot bubble clear (1-click Live). */
                if (typeof global.clearPinVideoUserStop === 'function') {
                    global.clearPinVideoUserStop(camId);
                }
                if (wvpVideoHandoffUi) playConfiguredPanelForPin(camId);
                else playOnMapPopup(camId, host, null, { forceLive: true, userPlay: true });
                return;
            }
            if (!box || box.querySelector('canvas')) return;
            if (e.target.closest('.map-pin-stop')) return;
            const camId = resolveMapPinCamId(box, null);
            if (!camId) return;
            e.preventDefault();
            e.stopPropagation();
            if (typeof global.clearPinVideoUserStop === 'function') {
                global.clearPinVideoUserStop(camId);
            }
            if (wvpVideoHandoffUi) playConfiguredPanelForPin(camId);
            else playOnMapPopup(camId, box, null, { forceLive: true, userPlay: true });
        }, true);
    }

    function bindMapPinStopClick() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.map-pin-stop');
            if (!btn || !btn.closest('.leaflet-popup-content')) return;
            const pop = btn.closest('.map-popup');
            const camId = btn.getAttribute('data-cam-id')
                || (pop && pop.getAttribute('data-cam-id'))
                || streamingCamId;
            if (!camId) return;
            e.preventDefault();
            e.stopPropagation();
            stopPinLive(camId);
        }, true);
    }

    function bindSlotControls() {
        getSlots().forEach((slotEl) => {
            slotEl.querySelector('.video-slot-play').addEventListener('click', (e) => {
                e.stopPropagation();
                playSlot(slotEl);
            });
            slotEl.querySelector('.video-slot-stop').addEventListener('click', (e) => {
                e.stopPropagation();
                stopSlot(slotEl);
            });
            const audioBtn = slotEl.querySelector('.video-slot-audio');
            if (audioBtn) {
                audioBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (audioBtn.disabled) return;
                    toggleSlotAudio(findSlotIndex(slotEl));
                });
            }
            const callBtn = slotEl.querySelector('.video-slot-call');
            if (callBtn) {
                callBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (callBtn.disabled || callBtn.hidden) return;
                    const idx = findSlotIndex(slotEl);
                    let camId = streamCamForSlotKey(idx) || resolveCamIdForSlot(slotEl);
                    if (camId) toggleVoiceCall(camId);
                });
            }
            const pttBtn = slotEl.querySelector('.video-slot-ptt');
            if (pttBtn) {
                bindPttHoldButton(pttBtn, function () {
                    const idx = findSlotIndex(slotEl);
                    return streamCamForSlotKey(idx) || resolveCamIdForSlot(slotEl);
                }, { forceOneToOne: true, wakeOnNotReady: true });
            }
            updateSlotCallButton(findSlotIndex(slotEl));
            updateSlotPttButton(findSlotIndex(slotEl));
            
            const popoutBtn = slotEl.querySelector('.video-slot-popout');

            if (popoutBtn) {

                popoutBtn.addEventListener('click', (e) => {

                    e.stopPropagation();

                    const slotContainer = e.target.closest('.video-slot');

                    const camId = slotContainer ? slotContainer.getAttribute('data-cam-id') : null;

                    if (!camId) return;

                    const port = window.location.port || '3888';

                    const attachExisting = isLiveCamId(camId)

                        && (wallHasPlayerForCam(camId) || mapPlayers.has(camId));

                    const url = '/live.html?camId=' + encodeURIComponent(camId)

                        + '&port=' + encodeURIComponent(port)

                        + (attachExisting ? '&stream=1' : '')

                        + '&t=' + Date.now();

                    window.open(

                        url,

                        'mobility-live-' + camId,

                        'width=1920,height=1080'

                    );

                });

            }

            slotEl.addEventListener('click', (e) => {

                if (e.target.closest('button')) return;

                selectSlot(slotEl);

                const idx = findSlotIndex(slotEl);

                const camId = streamCamForSlotKey(idx) || resolveCamIdForSlot(slotEl);

                if (camId) focusMapPinQuiet(camId);

            });

        });

    }

    let pendingSosVideo = null;
    let pendingSosResumeTimer = null;
    let sosReconnectTimer = null;

    function cancelPendingSosResume() {
        if (pendingSosResumeTimer) {
            clearTimeout(pendingSosResumeTimer);
            pendingSosResumeTimer = null;
        }
    }

    function scheduleSosStreamResume(camId, slotIndex, delayMs, opts) {
        if (!camId) return;
        cancelPendingSosResume();
        pendingSosResumeTimer = setTimeout(function () {
            pendingSosResumeTimer = null;
            resumeSosLiveStream(camId, slotIndex, opts);
        }, delayMs);
    }

    function resumeSosLiveStream(camId, slotIndex, opts) {
        opts = opts || {};
        if (!camId || !socket) return;
        clearPttRxLingerForCamIds([camId], true);
        const slotEl = getSlots()[slotIndex];
        if (!slotEl) return;
        slotEl.classList.add('alarm');
        slotEl.dataset.camId = camId;
        activeCamId = camId;
        selectSlot(slotEl);
        const stage = slotEl.querySelector('.video-slot-stage');
        const statusEl = slotEl.querySelector('.video-slot-status');
        const canvas = stage && stage.querySelector('canvas');
        const keepPlayer = !!(opts.keepPlayer && canvas && players.has(slotIndex));
        if (!keepPlayer) requestStreamForCam(camId, !wallHasPlayerForCam(camId));
        if (keepPlayer) {
            if (statusEl) statusEl.textContent = 'Live';
            removeAlarmStreamingOverlay(slotEl);
            return;
        }
        ensureAlarmStreamingOverlay(slotEl);
        if (statusEl) statusEl.textContent = alarmStreamLabel();
        if (canvas) {
            if (players.has(slotIndex)) destroyPlayer(slotIndex);
            attachCanvasPlayer(canvas, slotIndex, camId, statusEl, 0, slotEl);
        } else {
            assignCamToSlot(camId, slotIndex, { alarm: true, forceInvite: true, keepAlarm: true });
        }
        setTimeout(function () { syncMapPopupPlayer(camId); }, 300);
    }

    function reconnectSosPlayers(camId) {
        if (!camId) camId = activeCamId || streamingCamId;
        if (!camId) return;
        getSlots().forEach((el) => {
            if (!el.classList.contains('alarm')) return;
            const idx = findSlotIndex(el);
            const bound = streamCamForSlotKey(idx) || el.dataset.camId;
            if (bound !== camId) return;
            const canvas = el.querySelector('.video-slot-stage canvas');
            if (!canvas) return;
            const statusEl = el.querySelector('.video-slot-status');
            if (players.has(idx)) destroyPlayer(idx);
            attachCanvasPlayer(canvas, idx, camId, statusEl, 0, el);
        });
        if (mapPlayers.has(camId)) destroyMapPlayer(camId);
        syncMapPopupPlayer(camId);
        setTimeout(function () { syncMapPopupPlayer(camId); }, 400);
    }

    /** Open All: pin already live but wall panel still black (common on panel 1 / slot 0). */
    function ensureOpenAllWallIfPinLive() {
        if (!openAllSlotByCam) return;
        Object.keys(openAllSlotByCam).forEach(function (camId) {
            const slot = openAllSlotByCam[camId];
            if (slot == null || slot < 0 || !mapPinHasLiveVideo(camId)) return;
            if (wallSlotHasLivePlayer(slot, camId)) return;
            const slotEl = getSlots()[slot];
            if (slotEl) slotEl.dataset.camId = camId;
            pendingWallSlots[slot] = camId;
            assignCamToSlot(camId, slot, {
                skipInvite: true,
                keepAlarm: !!(slotEl && slotEl.classList.contains('alarm')),
                wallSlotReserved: true,
            });
        });
    }

    function healOpenAllWallStreams() {
        if (!openAllSlotByCam) return;
        Object.keys(openAllSlotByCam).forEach(function (camId) {
            const slot = openAllSlotByCam[camId];
            if (slot == null || slot < 0) return;
            const slotEl = getSlots()[slot];
            if (!slotEl) return;
            const bound = slotEl.dataset.camId || pendingWallSlots[slot];
            if (bound && bound !== camId) return;
            if (players.has(slot) && slotHasLiveWallPlayer(slotEl, slot)) return;
            if (players.has(slot) && !slotHasLiveWallPlayer(slotEl, slot)) {
                destroyPlayer(slot, { keepPending: true });
            }
            if (!isStreamInvited(camId) && !wallHasPlayerForCam(camId) && !mapPlayers.has(camId)) return;
            const slotAlarm = slotEl.classList.contains('alarm');
            const needsForceInvite = !slotHasLiveWallPlayer(slotEl, slot);
            assignCamToSlot(camId, slot, {
                forceInvite: needsForceInvite,
                skipInvite: !needsForceInvite,
                wallSlotReserved: true,
                keepAlarm: slotAlarm,
                alarm: slotAlarm,
            });
        });
    }

    function onHeartbeat(data) {
        if (!data || !data.cameraId) return;
        if (!pendingSosVideo || pendingSosVideo.cameraId !== data.cameraId) return;
        const slotIndex = pendingSosVideo.slotIndex;
        pendingSosVideo = null;
        assignCamToSlot(data.cameraId, slotIndex, { alarm: true });
    }

    function resolveSlotIndexForCam(camId) {
        let slotIndex = 0;
        if (global.VideoConfig) {
            const ch = VideoConfig.findChannelByDeviceId(camId);
            if (ch) slotIndex = ch.slot;
        }
        const byCam = findSlotByCamId(camId);
        if (byCam) return findSlotIndex(byCam);
        const liveSlot = getSlots().find((el) => slotIsLiveForCam(el, camId));
        if (liveSlot) return findSlotIndex(liveSlot);
        const openAllSlot = openAllWallSlotForCam(camId);
        if (openAllSlot != null) return openAllSlot;
        if (streamingCamId === camId) {
            for (const el of getSlots()) {
                const idx = findSlotIndex(el);
                if (!players.has(idx)) continue;
                const bound = streamCamForSlotKey(idx) || el.dataset.camId || resolveCamIdForSlot(el);
                if (bound === camId) return idx;
            }
        }
        if (wallSlotTaken(slotIndex, camId)) slotIndex = findWallSlotForCam(camId);
        return slotIndex;
    }

    function isSosUiOnlyTakeover(camId, data) {
        if (!camId || !data) return false;
        if (data.forceInvite || data.startVideo) return false;
        if (data.fromLiveBye) return true;
        if (data.alreadyLive && !data.refresh) return true;
        return false;
    }

    function playMapPinVideoForSosLiveOnly(camId, slotIndex) {
        if (!camId) return;
        const sosLiveOpts = { forceLive: true, sosLive: true };
        const root = mapPopupRootForCam(camId);
        if (!root) {
            playMapPinVideoIfPopupOpenWithSlot(camId, slotIndex, 0, sosLiveOpts);
            return;
        }
        const host = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
        if (!host) {
            playMapPinVideoIfPopupOpenWithSlot(camId, slotIndex, 0, sosLiveOpts);
            return;
        }
        if (wallHasPlayerForCam(camId)) {
            attachMapPopupPlayer(camId, host);
            normalizeMapPinVideoBox(host);
            updateMapPinStopButton(camId);
            unmuteAudioForSosCam(camId);
            return;
        }
        playMapPinVideoIfPopupOpenWithSlot(camId, slotIndex, 0, sosLiveOpts);
    }

    function isLiveSosWallTakeover(camId, data) {
        if (!camId || !data) return false;
        if (isSosUiOnlyTakeover(camId, data)) return true;
        if (data.alreadyLive) return true;
        if (data.startVideo) return false;
        return !!(wallHasPlayerForCam(camId) || streamingCamId === camId
            || (isStreamInvited(camId) && streamingCamId === camId));
    }

    function onSosAlarm(data) {
        if (!data || !data.cameraId) return;
        const camId = data.cameraId;
        clearOpenAllWallStateForSos(camId);
        unmuteAudioForSosCam(camId);
        activeCamId = camId;
        const slotIndex = resolveSlotIndexForCam(camId);
        pendingWallSlots[slotIndex] = camId;
        const slotEl = getSlots()[slotIndex];
        if (!slotEl) return;

        if (isLiveSosWallTakeover(camId, data)) {
            pendingSosVideo = null;
            applySosAlarmUi(camId, slotIndex);
            playMapPinVideoForSosLiveOnly(camId, slotIndex);
            if (typeof global.stashSosAckSnapshot === 'function') {
                global.stashSosAckSnapshot(camId);
            } else if (typeof global.captureSosAlarmSnapshot === 'function') {
                global.captureSosAlarmSnapshot(camId);
            }
            return;
        }

        setTimeout(healOpenAllWallStreams, 900);
        if (streamingCamId === camId) {
            pendingSosVideo = null;
            applySosAlarmUi(camId, slotIndex);
            if (!wallHasPlayerForCam(camId)) {
                assignCamToSlot(camId, slotIndex, { alarm: true, skipInvite: true });
            }
            playMapPinVideoForSos(camId, slotIndex);
            return;
        }
        if (isSosUiOnlyTakeover(camId, data) || !data.startVideo) {
            pendingSosVideo = null;
            applySosAlarmUi(camId, slotIndex);
            playMapPinVideoForSos(camId, slotIndex);
            return;
        }
        if (data.refresh && wallHasPlayerForCam(camId)) {
            pendingSosVideo = null;
            applySosAlarmUi(camId, slotIndex);
            playMapPinVideoForSos(camId, slotIndex);
            return;
        }
        applySosAlarmUi(camId, slotIndex);
        pendingSosVideo = null;
        if (!wallHasPlayerForCam(camId)) {
            assignCamToSlot(camId, slotIndex, { alarm: true, forceInvite: true });
        }
        scheduleSosPinVideoAfterWall(camId, slotIndex);
    }

    function bindRosterClick(handler) {
        if (document.getElementById('fleet-tbody') && typeof global.selectFleetDevice === 'function') return;
        const list = document.getElementById('roster-list');
        if (!list) return;
        list.addEventListener('click', (e) => {
            const row = e.target.closest('.fleet-row[data-cam-id], .roster-item[data-cam-id]');
            if (!row) return;
            if (typeof global.selectFleetDevice === 'function') {
                global.selectFleetDevice(row.dataset.camId);
                return;
            }
            document.querySelectorAll('.roster-item').forEach((el) => el.classList.remove('roster-active'));
            row.classList.add('roster-active');
            handler(row.dataset.camId);
        });
    }

    function relabelWallSlots() {
        getSlots().forEach(function (slotEl, i) {
            const lab = slotEl.querySelector('.video-slot-label');
            if (lab) lab.textContent = tr('video.panel', { n: i + 1 });
            const empty = slotEl.querySelector('.video-slot-empty');
            if (empty) empty.textContent = tr('video.selectDevice');
            const playBtn = slotEl.querySelector('.video-slot-play');
            if (playBtn) playBtn.title = tr('video.play');
            const audioBtn = slotEl.querySelector('.video-slot-audio');
            if (audioBtn) audioBtn.title = tr('video.listenWhenLive');
            const stopBtn = slotEl.querySelector('.video-slot-stop');
            if (stopBtn) stopBtn.title = tr('video.stop');
            const popBtn = slotEl.querySelector('.video-slot-popout');
            if (popBtn) { popBtn.title = 'Vid Popout'; popBtn.textContent = 'Vid Popout'; }
            const pttBtn = slotEl.querySelector('.video-slot-ptt');
            if (pttBtn) pttBtn.textContent = 'PTT';
        });
        syncAllCallUi();
        syncAllPttUi();
    }

    function init(ioSocket) {
        socket = ioSocket;
        socket.on('video-stream-ready', function (data) {
            var camId = data && data.camId;
            if (data && data.surface && data.surface !== OPS_VIEWER_SURFACE) return;
            if (camId) {
                camId = String(camId).trim();
                streamingCams.add(camId);
            }
            if (data && data.wvpVideoHandoff && data.flvUrl && camId) {
                attachWvpHandoffFlvForCam(camId, data.flvUrl);
            }
            syncAllPttUi();
            pendingSosVideo = null;
            cancelPendingSosResume();
            if (typeof global.isSosIncidentActive === 'function' && global.isSosIncidentActive()) {
                const sosCam = camId || (typeof global.getSosCamId === 'function' ? global.getSosCamId() : activeCamId);
                if (sosReconnectTimer) clearTimeout(sosReconnectTimer);
                sosReconnectTimer = setTimeout(function () {
                    sosReconnectTimer = null;
                    reconnectSosPlayers(sosCam);
                    unmuteAudioForSosCam(sosCam);
                }, 30);
            }
        });
        socket.on('video-stream-error', function (data) {
            var camId = data && data.camId;
            if (!camId) return;
            camId = String(camId).trim();
            streamingCams.delete(camId);
            clearWvpHandoffFlv(camId);
            if (streamingCamId === camId) {
                streamingCamId = streamingCams.values().next().value || null;
            }
        });
        socket.on('video-stream-stopped', function (data) {
            var camId = data && data.camId;
            if (!camId) return;
            camId = String(camId).trim();
            clearWvpHandoffFlv(camId);
            var reason = data && data.reason;
            if (signalLostCams.has(camId) && reason !== 'device_bye') return;
            if (localDashboardStopCams.has(camId)) {
                localDashboardStopCams.delete(camId);
                teardownWallPin(camId, 'operator');
                return;
            }
            if (reason === 'device_bye') {
                markBwcStoppedOverlay(camId);
                return;
            }
            /* stop-video after device BYE (clear watching) \u2014 keep Stopped by BWC chrome */
            if (bwcStoppedCams.has(camId)) {
                return;
            }
            teardownWallPin(camId, 'operator');
        });

        bindSlotControls();
        bindPinAudioControls();
        syncLayoutAudioVol();
        bindMapPinVideoClick();

        socket.on('bwc-call-state', onBwcCallState);
        socket.on('bwc-call-rx', onBwcCallRx);
        socket.on('server-capabilities', onServerCapabilities);
        socket.on('ptt-downlink-policy', function (data) {
            applyPttDownlinkPolicy(data);
            syncAllPttUi();
        });
        socket.on('ptt-device-state', onPttDeviceState);
        socket.on('ptt-talk-state', onPttTalkState);
        socket.on('live-voice-hint', onLiveVoiceHint);

        bindMapPinStopClick();

        bindRosterClick((camId) => {
            let slotIndex = 0;
            if (global.VideoConfig) {
                const ch = VideoConfig.findChannelByDeviceId(camId);
                if (ch) slotIndex = ch.slot;
            }
            assignCamToSlot(camId, slotIndex);
            focusMapPinQuiet(camId);
        });

        if (global.VideoConfig) VideoConfig.applyLabelsToWall();
        relabelWallSlots();

        const pollEl = document.getElementById('video-wall-poll');
        if (pollEl) pollEl.addEventListener('change', restartRotation);
        restartRotation();

        const bankNext = document.getElementById('video-wall-bank-next');
        if (bankNext) bankNext.addEventListener('click', toggleWallBankPage);
        applyWallBankPage('a');
        window.addEventListener('resize', scheduleWallSixteenNineFit);

        window.addEventListener('blur', endPttTalk);
        window.addEventListener('fm-i18n-changed', function () {
            relabelWallSlots();
            syncAllPttRxUi();
            updateWallBankTabLabels();
            scheduleWallSixteenNineFit();
        });
    }

    function findLiveCanvasForCam(camId) {
        if (!camId) return null;
        const wallCanvas = wallCanvasForCam(camId);
        if (wallCanvas) return wallCanvas;
        const host = mapPinHostForCam(camId) || getMapPopupVideoHost(camId);
        if (host && mapPlayers.has(camId)) {
            const canvas = host.querySelector('canvas');
            if (canvas && canvas.width > 8 && canvas.height > 8) return canvas;
        }
        return null;
    }

    function captureLiveFrameForCam(camId) {
        const canvas = findLiveCanvasForCam(camId);
        if (!canvas) return Promise.resolve(null);
        const dataUrl = liveFramePreviewDataUrl(camId);
        if (dataUrl) return Promise.resolve(dataUrl);
        return new Promise((resolve) => {
            let settled = false;
            const finish = (val) => {
                if (settled) return;
                settled = true;
                resolve(val);
            };
            const timer = setTimeout(() => finish(null), 1500);
            try {
                canvas.toBlob((blob) => {
                    clearTimeout(timer);
                    if (blob && blob.size > 500) {
                        const reader = new FileReader();
                        reader.onload = () => finish(reader.result || null);
                        reader.onerror = () => finish(null);
                        reader.readAsDataURL(blob);
                        return;
                    }
                    finish(null);
                }, 'image/jpeg', 0.88);
            } catch (_) {
                clearTimeout(timer);
                finish(null);
            }
        });
    }

    function liveFramePreviewDataUrl(camId) {
        const canvas = findLiveCanvasForCam(camId);
        if (!canvas) return null;
        try {
            return canvas.toDataURL('image/jpeg', 0.88);
        } catch (_) {
            return null;
        }
    }

    function hasLiveVideoFrameForCam(camId) {
        return !!findLiveCanvasForCam(camId);
    }

    /**
     * FR-BLACKLIST-MAP-PIN-TAKEOVER-V1 — put catching BWC on wall (steal unpinned slot if 8 full)
     * + open/play map pin. Does not edit pin-mirror cores.
     */
    function pickFrBlacklistWallSlot(camId) {
        const existing = findSlotByCamId(camId);
        if (existing) {
            return { slot: findSlotIndex(existing), stole: false, reused: true };
        }
        const free = freeWallSlotForCam(camId);
        if (free != null && free >= 0) {
            return { slot: free, stole: false, reused: false };
        }
        const pinned = Object.create(null);
        try {
            if (global.FleetUi && typeof FleetUi.getSelectedCamIds === 'function') {
                FleetUi.getSelectedCamIds().forEach(function (id) {
                    pinned[String(id || '').trim()] = true;
                });
            }
        } catch (_) { /* ignore */ }
        for (let i = PIN_SLOT_COUNT - 1; i >= 0; i -= 1) {
            const el = getSlots()[i];
            if (!el) continue;
            if (el.classList.contains('alarm')) continue;
            const bound = String(slotBoundCam(i) || el.dataset.camId || '').trim();
            if (bound && pinned[bound]) continue;
            return { slot: i, stole: true, victim: bound || null, pinnedBlock: false };
        }
        for (let i = PIN_SLOT_COUNT - 1; i >= 0; i -= 1) {
            const el = getSlots()[i];
            if (!el || el.classList.contains('alarm')) continue;
            const bound = String(slotBoundCam(i) || el.dataset.camId || '').trim();
            return { slot: i, stole: true, victim: bound || null, pinnedBlock: true };
        }
        return { slot: 0, stole: true, victim: null, pinnedBlock: true };
    }

    function openFrBlacklistMapPin(camId, slotIndex) {
        try {
            if (typeof global.clearMapPinPopupSuppression === 'function') {
                global.clearMapPinPopupSuppression(camId);
            }
        } catch (_) { /* ignore */ }
        try {
            if (typeof global.selectFleetDevice === 'function') {
                global.selectFleetDevice(camId, { addToMulti: true, keepMulti: true });
            }
        } catch (_) { /* ignore */ }
        try {
            const m = global.deviceMarkers && (global.deviceMarkers[camId]
                || (typeof global.normalizeCamId === 'function'
                    ? global.deviceMarkers[global.normalizeCamId(camId)] : null));
            if (m && m.openPopup) m.openPopup();
        } catch (_) { /* ignore */ }
        try {
            if (typeof global.enforceMaxOpenPinPopups === 'function') {
                global.enforceMaxOpenPinPopups(camId);
            }
        } catch (_) { /* ignore */ }
        playMapPinVideoIfPopupOpenWithSlot(camId, slotIndex, 0, {
            forceLive: true,
            frBlacklist: true,
        });
        setTimeout(function () {
            try { syncMapPopupPlayer(camId); } catch (_) { /* ignore */ }
        }, 350);
    }

    function promoteFrBlacklistLive(camId, opts) {
        opts = opts || {};
        const id = String(camId || '').trim();
        if (!id) return { ok: false, reason: 'camId_required' };
        const pick = pickFrBlacklistWallSlot(id);
        if (pick.slot == null || pick.slot < 0) {
            return { ok: false, reason: 'no_slot' };
        }
        ensureBankVisibleForSlot(pick.slot);
        pendingWallSlots[pick.slot] = id;
        const slotEl = getSlots()[pick.slot];
        if (slotEl) {
            slotEl.dataset.camId = id;
            slotEl.classList.add('fr-blacklist-hit');
            selectSlot(slotEl);
        }
        if (pick.reused && wallHasPlayerForCam(id)) {
            openFrBlacklistMapPin(id, pick.slot);
            return { ok: true, reused: true, slot: pick.slot };
        }
        assignCamToSlot(id, pick.slot, {
            forceInvite: true,
            forceReassign: true,
            frBlacklist: true,
            userPlay: true,
        });
        if (slotEl) slotEl.classList.add('fr-blacklist-hit');
        openFrBlacklistMapPin(id, pick.slot);
        if (pick.pinnedBlock && opts.onPinnedSteal) {
            try { opts.onPinnedSteal(pick.victim); } catch (_) { /* ignore */ }
        }
        return {
            ok: true,
            reused: !!pick.reused,
            stole: !!pick.stole,
            slot: pick.slot,
            victim: pick.victim || null,
            pinnedBlock: !!pick.pinnedBlock,
        };
    }

    global.VideoWall = {
        SLOT_COUNT,
        BANK_A_COUNT,
        MAX_LIVE_STREAMS,
        init,
        applyWallBankPage,
        toggleWallBankPage,
        getWallBankPage: function () { return wallBankPage; },
        onPttRxState,
        onPttRxLinger,
        clearAllFieldPttRx,
        syncMapPinPttComm,
        suppressPinOpenPttChrome,
        openMapPinPttComm: openMapPinPttComm,
        isPttCommPinForced: isPttCommPinForced,
        isPttCommPinIntent: isPttCommPinIntent,
        clearPttCommPinForced: clearPttCommPinForced,
        relabelWallSlots,
        onFleetUpdate,
        restartRotation,
        onHeartbeat,
        onSosAlarm,
        onDeviceWentOffline,
        assignCamToSlot,
        playOnMapPopup,
        playMapPinVideoIfPopupOpen,
        openAllLivePins,
        prepareOpenAllLive,
        releaseOpenAllState,
        syncAllOpenPinWallPanels,
        syncAllOpenPinVideoLayout,
        normalizeMapPinVideoBox,
        syncAllOpenPinPopupControls,
        stopSlot,
        playSlot,
        playConfiguredPanelForPin,
        selectCamera: (camId, slotIndex) => assignCamToSlot(camId, slotIndex == null ? 0 : slotIndex),
        clearAlarmStates,
        muteLiveAudioForCam,
        unmuteAudioForSosCam,
        stopAllVideo,
        syncMapPopupPlayer,
        syncMapPinAlarmStreaming,
        syncMapPinStreamingOverlay,
        updateMapPinStopButton,
        stopLiveForCam: stopPinLive,
        cleanupMapPinPlayerOnPopupClose,
        getActiveCamId: () => activeCamId,
        isCameraLive,
        noteExternalStream,
        notifyStreamStopped,
        resumeLiveAfterAck,
        isWallPlayingCam,
        wallHasPlayerForCam,
        opsWallClaimsCam,
        wvpPinHasPendingOrActiveClaim,
        wallSlotDecodedForCam,
        mapPinMirrorActive,
        syncWallStopDuringSos,
        mapPinHasLiveVideo,
        hasLiveVideoFrameForCam,
        liveFramePreviewDataUrl,
        captureLiveFrameForCam,
        videoWsUrl,
        toggleSlotAudio,
        isSlotAudioMuted,
        restorePttAfterSosSessionClose,
        setDispatchPttTeam,
        clearDispatchPttTeam,
        dispatchGroupNetActive,
        bindDispatchGroupPttHold,
        syncFleetPttRows,
        syncFleetVoiceRows,
        toggleVoiceCall,
        isLiveCamId,
        promoteFrBlacklistLive,
        syncPinVoiceUi,
        isPttReadyForCam,
        hasDashboardLiveForCam,
        hasActiveDashboardLiveForCam,
        getHandoffFlvUrlForCam: getWvpHandoffFlvUrl,
        bindPttHoldButton: bindPttHoldButton,
        beginPttTalk: beginPttTalk,
        endPttTalk: endPttTalk,
    };

})(window);
