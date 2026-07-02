/**
 * Inbound BWC PTT → operator speakers + fleet alert hooks.
 * Field RX: banner + row + audio; full banner hidden when live open — compact live toast instead.
 */
(function (global) {
    let socket = null;
    let ctx = null;
    let gain = null;
    let playState = { nextTime: 0, primed: false };
    const rxActive = new Set();
    let bannerEl = null;
    let liveToastEl = null;
    const pcmQueue = [];
    const JITTER_SEC = 0.08;
    const MAX_QUEUE_SEC = 0.5;
    const LINGER_MS = 25000;
    /** One-shot: swallow the next rx-end linger after live assign (PTT TCP drop), not cold field PTT. */
    const LINGER_LIVE_RX_END_GRACE_MS = 3500;
    let lingerCamId = null;
    let lingerTimer = null;
    const lingerRxEndSuppressOnce = Object.create(null);
    const lingerRxEndSuppressTimers = Object.create(null);

    function ensureAudio() {
        if (ctx) return true;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        ctx = new AudioCtx({ sampleRate: 8000 });
        gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(ctx.destination);
        return true;
    }

    /** User-gesture unlock — banner, fleet row, hold-PTT buttons (browser autoplay policy). */
    function unlockAudio() {
        if (!ensureAudio()) return;
        if (ctx.state === 'suspended') {
            try { ctx.resume(); } catch (_) { /* ignore */ }
        }
        if (pcmQueue.length && !playState.primed && queueDurationSec() >= JITTER_SEC) {
            playState.primed = true;
            playState.nextTime = ctx.currentTime + JITTER_SEC;
        }
        if (playState.primed) drainQueue();
    }

    function bindDashboardAudioUnlock() {
        const unlockSel = '#ptt-rx-banner,#ptt-rx-live-toast,.fleet-row,.fleet-row-ptt-btn,.map-pin-ptt,.video-slot-ptt';
        document.addEventListener('pointerdown', function (ev) {
            const t = ev.target;
            if (!t || !t.closest) return;
            if (t.closest(unlockSel)) unlockAudio();
        }, true);
    }

    function queueDurationSec() {
        let samples = 0;
        for (let i = 0; i < pcmQueue.length; i++) samples += pcmQueue[i].length;
        return samples / 8000;
    }

    function scheduleQueuedBuffer(int16) {
        if (!int16.length) return;
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
        }
        const ab = ctx.createBuffer(1, float32.length, 8000);
        ab.getChannelData(0).set(float32);
        const src = ctx.createBufferSource();
        src.buffer = ab;
        src.connect(gain);
        const t = Math.max(ctx.currentTime + 0.01, playState.nextTime);
        src.start(t);
        playState.nextTime = t + ab.duration;
    }

    function drainQueue() {
        if (!ensureAudio()) return;
        if (ctx.state === 'suspended') ctx.resume();
        while (pcmQueue.length) {
            scheduleQueuedBuffer(pcmQueue.shift());
        }
    }

    function playPcmChunk(chunk) {
        if (!ensureAudio()) return;
        const buf = chunk instanceof ArrayBuffer ? chunk : chunk.buffer;
        const int16 = new Int16Array(buf);
        if (!int16.length) return;

        pcmQueue.push(int16);
        while (queueDurationSec() > MAX_QUEUE_SEC) pcmQueue.shift();

        if (!playState.primed) {
            if (queueDurationSec() < JITTER_SEC) return;
            playState.primed = true;
            playState.nextTime = ctx.currentTime + JITTER_SEC;
            drainQueue();
            return;
        }

        if (playState.nextTime < ctx.currentTime - 0.15) {
            playState.nextTime = ctx.currentTime + 0.03;
        }
        drainQueue();
    }

    function deviceLabel(camId) {
        if (global.FleetUi && FleetUi.getDeviceName) {
            const n = FleetUi.getDeviceName(camId);
            if (n) return n;
        }
        return camId ? String(camId).slice(-8) : 'BWC';
    }

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function clearLingerTimer() {
        if (!lingerTimer) return;
        clearTimeout(lingerTimer);
        lingerTimer = null;
    }

    function normalizeCamKey(camId) {
        return camId ? String(camId).trim() : '';
    }

    function clearLingerRxEndSuppress(id) {
        if (!id) return;
        delete lingerRxEndSuppressOnce[id];
        if (lingerRxEndSuppressTimers[id]) {
            clearTimeout(lingerRxEndSuppressTimers[id]);
            delete lingerRxEndSuppressTimers[id];
        }
    }

    /** Cold release → 25s linger unless active live decode. Spurious rx-end (PTT TCP drop) never lingers. */
    function shouldSkipLingerOnRxEnd(camId, hadFieldRx) {
        const id = normalizeCamKey(camId);
        if (!id) return true;
        if (!hadFieldRx) {
            if (lingerRxEndSuppressOnce[id]) clearLingerRxEndSuppress(id);
            return true;
        }
        return hasActiveDashboardLive(id);
    }

    /** CW / wall live start — clear patrol linger; arm one-shot for invite TCP-drop rx-end only. */
    function suppressLingerForLive(camId) {
        const id = normalizeCamKey(camId);
        if (!id) return;
        clearLingerForCam(id);
        clearLingerRxEndSuppress(id);
        lingerRxEndSuppressOnce[id] = true;
        lingerRxEndSuppressTimers[id] = setTimeout(function () {
            delete lingerRxEndSuppressOnce[id];
            delete lingerRxEndSuppressTimers[id];
        }, LINGER_LIVE_RX_END_GRACE_MS);
    }

    function isCommandWallTabActive() {
        const cw = document.getElementById('app-view-command-wall');
        return !!(cw && !cw.hidden);
    }

    function openCommPinForCam(camId) {
        if (!camId) return;
        if (isCommandWallTabActive() && global.CommandWall && CommandWall.openPttCommForCam) {
            CommandWall.openPttCommForCam(camId);
            return;
        }
        if (!global.selectFleetDevice) return;
        global.selectFleetDevice(camId, { skipVideo: true, pttCommPin: true });
    }

    function ensureBanner() {
        if (bannerEl) return bannerEl;
        bannerEl = document.getElementById('ptt-rx-banner');
        if (bannerEl) return bannerEl;
        bannerEl = document.createElement('div');
        bannerEl.id = 'ptt-rx-banner';
        bannerEl.hidden = true;
        bannerEl.setAttribute('role', 'status');
        document.body.appendChild(bannerEl);
        bannerEl.addEventListener('click', function () {
            unlockAudio();
            openCommPinForCam(bannerEl.getAttribute('data-cam-id'));
        });
        return bannerEl;
    }

    function ensureLiveToast() {
        if (liveToastEl) return liveToastEl;
        liveToastEl = document.getElementById('ptt-rx-live-toast');
        if (liveToastEl) return liveToastEl;
        liveToastEl = document.createElement('div');
        liveToastEl.id = 'ptt-rx-live-toast';
        liveToastEl.hidden = true;
        liveToastEl.setAttribute('role', 'status');
        document.body.appendChild(liveToastEl);
        liveToastEl.addEventListener('click', function () {
            unlockAudio();
            openCommPinForCam(liveToastEl.getAttribute('data-cam-id'));
        });
        return liveToastEl;
    }

    function hideLiveToast() {
        const el = ensureLiveToast();
        el.hidden = true;
        el.removeAttribute('data-cam-id');
        el.textContent = '';
    }

    function clearLingerForCam(camId) {
        if (!camId) return;
        if (lingerCamId === camId) {
            lingerCamId = null;
            clearLingerTimer();
        }
        if (global.FleetUi && FleetUi.setPttRxLinger) FleetUi.setPttRxLinger(camId, false);
        if (global.VideoWall && VideoWall.onPttRxLinger) {
            VideoWall.onPttRxLinger({ camId: camId, active: false });
        }
        if (global.CommandWall && CommandWall.onPttRxLinger) {
            CommandWall.onPttRxLinger({ camId: camId, active: false });
        }
        updateBanner();
    }

    function startLinger(camId) {
        if (!camId) return;
        if (lingerCamId && lingerCamId !== camId) clearLingerForCam(lingerCamId);
        lingerCamId = camId;
        if (global.FleetUi && FleetUi.setPttRxLinger) FleetUi.setPttRxLinger(camId, true);
        if (global.VideoWall && VideoWall.onPttRxLinger) {
            VideoWall.onPttRxLinger({ camId: camId, active: true });
        }
        if (global.CommandWall && CommandWall.onPttRxLinger) {
            CommandWall.onPttRxLinger({ camId: camId, active: true });
        }
        clearLingerTimer();
        lingerTimer = setTimeout(function () {
            lingerTimer = null;
            clearLingerForCam(camId);
        }, LINGER_MS);
        updateBanner();
    }

    function clearAllLinger() {
        if (!lingerCamId && !lingerTimer) {
            updateBanner();
            return;
        }
        const cam = lingerCamId;
        lingerCamId = null;
        clearLingerTimer();
        if (cam) {
            if (global.FleetUi && FleetUi.setPttRxLinger) FleetUi.setPttRxLinger(cam, false);
            if (global.VideoWall && VideoWall.onPttRxLinger) {
                VideoWall.onPttRxLinger({ camId: cam, active: false });
            }
        }
        updateBanner();
    }

    function dismissCommForCam(camId) {
        if (camId) clearLingerForCam(camId);
        else clearAllLinger();
    }

    /** SOS Ack / session close — clear patrol field-PTT banner, linger, and RX state. */
    function dismissAllFieldPttSession() {
        const ids = new Set(rxActive);
        if (lingerCamId) ids.add(lingerCamId);
        rxActive.clear();
        lingerCamId = null;
        clearLingerTimer();
        pcmQueue.length = 0;
        playState.primed = false;
        playState.nextTime = 0;
        ids.forEach(function (camId) {
            if (global.FleetUi && FleetUi.setPttRxActive) FleetUi.setPttRxActive(camId, false);
            if (global.FleetUi && FleetUi.setPttRxLinger) FleetUi.setPttRxLinger(camId, false);
        });
        updateBanner();
        if (global.VideoWall && VideoWall.clearAllFieldPttRx) {
            VideoWall.clearAllFieldPttRx();
        }
        if (global.FleetUi && FleetUi.clearAllPttRxFlags) {
            FleetUi.clearAllPttRxFlags();
        }
    }

    function hasActiveDashboardLive(camId) {
        return !!(camId && global.VideoWall && VideoWall.hasActiveDashboardLiveForCam
            && VideoWall.hasActiveDashboardLiveForCam(camId));
    }

    function dashboardLiveSuppressesBanner(camId) {
        return hasActiveDashboardLive(camId);
    }

    function updateLiveToast(camId, mode) {
        if (!camId || !mode) {
            hideLiveToast();
            return;
        }
        const toast = ensureLiveToast();
        toast.hidden = false;
        toast.setAttribute('data-cam-id', camId || '');
        if (mode === 'linger') {
            toast.textContent = tr('ptt.bannerLinger', { name: deviceLabel(camId) });
            toast.classList.remove('ptt-rx-live-toast-active');
            toast.classList.add('ptt-rx-live-toast-linger');
        } else {
            toast.textContent = tr('ptt.bannerDuringLive', { name: deviceLabel(camId) });
            toast.classList.add('ptt-rx-live-toast-active');
            toast.classList.remove('ptt-rx-live-toast-linger');
        }
    }

    function updateBanner() {
        const el = ensureBanner();
        if (rxActive.size) {
            const camId = rxActive.values().next().value;
            if (dashboardLiveSuppressesBanner(camId)) {
                el.hidden = true;
                el.removeAttribute('data-cam-id');
                el.classList.remove('ptt-rx-banner-live', 'ptt-rx-banner-linger');
                updateLiveToast(camId, 'active');
                return;
            }
            el.hidden = false;
            el.setAttribute('data-cam-id', camId || '');
            el.textContent = tr('ptt.banner', { name: deviceLabel(camId) });
            el.classList.add('ptt-rx-banner-live');
            el.classList.remove('ptt-rx-banner-linger');
            hideLiveToast();
            return;
        }
        if (lingerCamId) {
            if (dashboardLiveSuppressesBanner(lingerCamId)) {
                el.hidden = true;
                el.removeAttribute('data-cam-id');
                el.classList.remove('ptt-rx-banner-live', 'ptt-rx-banner-linger');
                updateLiveToast(lingerCamId, 'linger');
                return;
            }
            el.hidden = false;
            el.setAttribute('data-cam-id', lingerCamId);
            el.textContent = tr('ptt.bannerLinger', { name: deviceLabel(lingerCamId) });
            el.classList.remove('ptt-rx-banner-live');
            el.classList.add('ptt-rx-banner-linger');
            hideLiveToast();
            return;
        }
        el.hidden = true;
        el.removeAttribute('data-cam-id');
        el.classList.remove('ptt-rx-banner-live', 'ptt-rx-banner-linger');
        hideLiveToast();
    }

    function chimeRx() {
        if (!ensureAudio()) return;
        try {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.value = 880;
            g.gain.value = 0.08;
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch (_) { /* ignore */ }
    }

    function onRxState(data) {
        if (!data || !data.camId) return;
        const camId = data.camId;
        const was = rxActive.has(camId);

        if (data.active) {
            if (!was) chimeRx();
            rxActive.add(camId);
            if (lingerCamId) clearLingerForCam(lingerCamId);
            if (global.FleetUi && FleetUi.setPttRxActive) FleetUi.setPttRxActive(camId, true);
        } else {
            rxActive.delete(camId);
            if (global.FleetUi && FleetUi.setPttRxActive) FleetUi.setPttRxActive(camId, false);
            if (!rxActive.size) {
                pcmQueue.length = 0;
                playState.primed = false;
                playState.nextTime = 0;
                if (shouldSkipLingerOnRxEnd(camId, was)) {
                    if (lingerCamId === camId) clearLingerForCam(camId);
                } else {
                    startLinger(camId);
                }
            }
        }

        if (global.VideoWall && VideoWall.onPttRxState) {
            VideoWall.onPttRxState(data);
        }
        if (global.CommandWall && CommandWall.onPttRxState) {
            CommandWall.onPttRxState(data);
        }
        updateBanner();
    }

    function init(ioSocket) {
        socket = ioSocket;
        socket.on('ptt-rx-state', onRxState);
        socket.on('ptt-rx-audio', function (meta, chunk) {
            if (!meta || !meta.camId || !chunk) return;
            playPcmChunk(chunk);
        });
        window.addEventListener('fm-i18n-changed', updateBanner);
        bindDashboardAudioUnlock();
    }

    function isAnyRxActive() {
        return rxActive.size > 0;
    }

    function isRxActive(camId) {
        return rxActive.has(camId);
    }

    function isLingerActive(camId) {
        return lingerCamId === camId;
    }

    global.PttRx = {
        init: init,
        unlockAudio: unlockAudio,
        isAnyRxActive: isAnyRxActive,
        isRxActive: isRxActive,
        isLingerActive: isLingerActive,
        clearLingerForCam: clearLingerForCam,
        clearAllLinger: clearAllLinger,
        suppressLingerForLive: suppressLingerForLive,
        dismissCommForCam: dismissCommForCam,
        dismissAllFieldPttSession: dismissAllFieldPttSession,
        refreshBanner: updateBanner,
    };
})(window);
