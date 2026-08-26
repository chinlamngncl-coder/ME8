/**
 * Phase 2 Task 2.3 - Overwatch (AR) split (left map / right live + UV glass markers)
 *
 * Operator chrome: Overwatch (AR) / Close Overwatch (never "Ar").
 * Pins use percentage UV so resize keeps alignment:
 *   left: (uv_x * 100) + '%'; top: (uv_y * 100) + '%'
 * Overlays + bubbles only when activePreset is locked.
 * Any manual PTZ pan/tilt/zoom clears the lock (markers hide).
 */
(function (global) {
    'use strict';

    const OWNER = 'tactical-ar';
    const MAX_PIP = 8;
    const MOUNT_SETTLE_MS = 300;
    let uiBound = false;
    let open = false;
    let pins = [];
    let activePreset = null; // { token, name, cameraId }
    let livePlayer = null;
    let liveCamId = null;
    let arPtzJoystick = null;
    const LAB_VIEW_TOKEN = '_current_';
    let isMountingOverwatch = false;
    let isSwapping = false; /* VMS-OVERWATCH-AR-PROMOTE-C2-V1 */
    let pipMounts = []; // { camId, owner, player, el, uv, label, mountedAt }
    let mountGen = 0;

    function overwatchBusy() {
        return !!(isMountingOverwatch || isSwapping);
    }

    function tr(key, fallback) {
        if (global.I18n && I18n.t) {
            const v = I18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback || key;
    }

    function el(id) {
        return document.getElementById(id);
    }

    function setStatus(text, mode) {
        const status = el('ax-tactical-ar-status');
        if (!status) return;
        status.textContent = text;
        status.classList.toggle('is-locked', mode === 'locked');
        status.classList.toggle('is-unlocked', mode === 'unlocked');
    }

    function stage() {
        return el('ax-tactical-stage');
    }

    function glass() {
        return el('ax-tactical-ar-glass');
    }

    function bubblesHost() {
        return el('ax-tactical-ar-bubbles');
    }

    function clamp01(n) {
        const x = Number(n);
        if (!Number.isFinite(x)) return 0;
        return Math.min(1, Math.max(0, x));
    }

    function pinUv(pin) {
        const x = pin && (pin.uv_x != null ? pin.uv_x : pin.uvX);
        const y = pin && (pin.uv_y != null ? pin.uv_y : pin.uvY);
        return { uv_x: clamp01(x), uv_y: clamp01(y) };
    }

    function pinPresetToken(pin) {
        if (!pin) return '';
        return String(pin.presetToken || pin.preset_id || pin.presetId || pin.onvifPreset || '').trim();
    }

    function pinLabel(pin) {
        return String((pin && (pin.name || pin.device_id || pin.deviceId)) || 'Pin').trim() || 'Pin';
    }

    /**
     * Project UV pins onto the glass layer with % positions (resize-stable).
     * Only renders when activePreset matches (or pin has no preset filter).
     */
    function renderArPins(pinList, preset) {
        const host = glass();
        if (!host) return 0;
        host.innerHTML = '';
        const locked = !!(preset && preset.token);
        host.classList.toggle('is-interactive', locked);
        host.setAttribute('aria-hidden', locked ? 'false' : 'true');
        if (!locked) return 0;

        const presetToken = String(preset.token);
        const list = Array.isArray(pinList) ? pinList : [];
        let drawn = 0;
        list.forEach(function (pin) {
            const want = pinPresetToken(pin);
            if (want && want !== presetToken) return;
            const uv = pinUv(pin);
            const node = document.createElement('button');
            node.type = 'button';
            node.className = 'ax-tactical-ar-pin';
            node.style.left = (uv.uv_x * 100) + '%';
            node.style.top = (uv.uv_y * 100) + '%';
            node.textContent = pinLabel(pin);
            node.title = pinLabel(pin);
            node.dataset.deviceId = String(pin.device_id || pin.deviceId || '');
            node.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                /* C2: promote in-place; do not open Ops / wall from Overwatch glass */
                onGlassPinActivate(pin);
            });
            host.appendChild(node);
            drawn += 1;
        });
        /* PIP video mount is separate (C1) — markers only here; extras beyond 8 stay markers */
        return drawn;
    }

    function onGlassPinActivate(pin) {
        const deviceId = String((pin && (pin.device_id || pin.deviceId)) || '').trim();
        if (!deviceId || !activePreset) return;
        if (overwatchBusy()) return;
        if (deviceId === String(liveCamId || '')) return;
        if (pipMounts.some(function (m) { return m && m.camId === deviceId; })) {
            promotePipCam(deviceId);
            return;
        }
        promoteMarkerCam(deviceId);
    }

    function renderBubbles() {
        /* superseded by mountPipsForPreset — keep host cleared when unlocked */
        const host = bubblesHost();
        if (!host) return;
        if (!activePreset) {
            host.innerHTML = '';
            host.hidden = true;
        }
    }

    function openLinkedFromPin(pin) {
        const deviceId = String((pin && (pin.device_id || pin.deviceId)) || '').trim();
        if (!deviceId) return;
        if (global.TacticalPoi && typeof TacticalPoi.openDeviceLive === 'function') {
            try { TacticalPoi.openDeviceLive(deviceId); return; } catch (_) { /* fall through */ }
        }
        if (global.VideoWall && typeof VideoWall.openCamera === 'function') {
            try { VideoWall.openCamera(deviceId); } catch (_) { /* ignore */ }
        }
    }

    function clearPresetLock(reason, opts) {
        const wasLocked = !!activePreset;
        activePreset = null;
        isSwapping = false;
        stopPips();
        renderArPins(pins, null);
        renderBubbles();
        const ptzPad = el('ax-tactical-ar-ptz');
        if (ptzPad) ptzPad.hidden = !open;
        setStatus(
            reason || tr('tactical.arStatusUnlocked', 'Camera moved - markers hidden'),
            'unlocked',
        );
        const manual = !!(opts && opts.manual) && wasLocked;
        if (manual && global.TacticalOverwatch && typeof TacticalOverwatch.onManualOverride === 'function') {
            try { TacticalOverwatch.onManualOverride(); } catch (_) { /* ignore */ }
        } else if (global.TacticalOverwatch && typeof TacticalOverwatch.onPresetCleared === 'function') {
            try { TacticalOverwatch.onPresetCleared(); } catch (_) { /* ignore */ }
        }
    }

    function sleepMs(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function stopPips() {
        pipMounts.forEach(function (m) {
            if (m && m.player && typeof m.player.destroy === 'function') {
                try { m.player.destroy(); } catch (_) { /* ignore */ }
            }
            if (m && m.camId) {
                fetch('/api/fixed-cams/' + encodeURIComponent(m.camId) + '/zlm/stop', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owner: m.owner || (OWNER + '-pip') }),
                }).catch(function () { /* ignore */ });
            }
        });
        pipMounts = [];
        const host = bubblesHost();
        if (host) {
            host.innerHTML = '';
            host.hidden = true;
        }
    }

    function teardownOverwatchVideo() {
        stopPips();
        stopLive();
    }

    /** Linked pins for this preset, max MAX_PIP unique cams (overview cam excluded). */
    function collectPipPins(pinList, preset) {
        const presetToken = String((preset && preset.token) || '');
        const focusId = String((preset && preset.cameraId) || '');
        const out = [];
        const seen = Object.create(null);
        (Array.isArray(pinList) ? pinList : []).forEach(function (pin) {
            const want = pinPresetToken(pin);
            if (want && want !== presetToken) return;
            const linked = String(pin.device_id || pin.deviceId || '').trim();
            if (!linked || linked === focusId) return;
            if (seen[linked]) return;
            seen[linked] = true;
            out.push(pin);
        });
        return out.slice(0, MAX_PIP);
    }

    function mountPipsForPreset(preset) {
        const host = bubblesHost();
        if (!host || !preset) return;
        host.innerHTML = '';
        host.hidden = false;
        pipMounts = [];
        if (!global.Me8LivePlayerFactory || typeof Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return;
        }
        const list = collectPipPins(pins, preset);
        list.forEach(function (pin) {
            const linked = String(pin.device_id || pin.deviceId || '').trim();
            if (!linked) return;
            mountOnePip({
                camId: linked,
                uv: pinUv(pin),
                label: pinLabel(pin),
            }).catch(function () { /* offline caption set inside */ });
        });
    }

    function killFocusOnly() {
        if (livePlayer && typeof livePlayer.destroy === 'function') {
            try { livePlayer.destroy(); } catch (_) { /* ignore */ }
        }
        livePlayer = null;
        const stageEl = el('ax-tactical-ar-video-stage');
        if (stageEl) stageEl.innerHTML = '';
        if (liveCamId) {
            fetch('/api/fixed-cams/' + encodeURIComponent(liveCamId) + '/zlm/stop', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: OWNER }),
            }).catch(function () { /* ignore */ });
        }
        liveCamId = null;
    }

    function killPipOnly(camId) {
        const id = String(camId || '');
        let removed = null;
        const next = [];
        pipMounts.forEach(function (m) {
            if (!m || m.camId !== id) {
                next.push(m);
                return;
            }
            removed = m;
            if (m.player && typeof m.player.destroy === 'function') {
                try { m.player.destroy(); } catch (_) { /* ignore */ }
            }
            fetch('/api/fixed-cams/' + encodeURIComponent(m.camId) + '/zlm/stop', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: m.owner || (OWNER + '-pip') }),
            }).catch(function () { /* ignore */ });
            if (m.el && m.el.parentNode) {
                try { m.el.parentNode.removeChild(m.el); } catch (_) { /* ignore */ }
            }
        });
        pipMounts = next;
        return removed;
    }

    function markFocusOffline() {
        const stageEl = el('ax-tactical-ar-video-stage');
        if (!stageEl) return;
        stageEl.innerHTML = '';
        const d = document.createElement('div');
        d.className = 'ax-tactical-ar-focus-offline';
        d.textContent = tr('tactical.arStatusFail', 'Video unavailable');
        stageEl.appendChild(d);
    }

    function mountOnePip(opts) {
        const host = bubblesHost();
        const camId = String((opts && opts.camId) || '').trim();
        const uv = (opts && opts.uv) || { uv_x: 0.5, uv_y: 0.5 };
        const label = String((opts && opts.label) || camId || 'PIP');
        if (!host || !camId) return Promise.reject(new Error('pip args'));
        if (!global.Me8LivePlayerFactory || typeof Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            return Promise.reject(new Error('no factory'));
        }

        const bubble = document.createElement('div');
        bubble.className = 'ax-tactical-ar-bubble ax-tactical-ar-pip';
        bubble.style.left = (uv.uv_x * 100) + '%';
        bubble.style.top = (uv.uv_y * 100) + '%';
        bubble.title = label;
        const stage = document.createElement('div');
        stage.className = 'ax-tactical-ar-pip-stage';
        bubble.appendChild(stage);
        const foot = document.createElement('div');
        foot.className = 'ax-tactical-ar-pip-foot';
        const caption = document.createElement('span');
        caption.className = 'ax-tactical-ar-pip-label';
        caption.textContent = label;
        const promoteBtn = document.createElement('button');
        promoteBtn.type = 'button';
        promoteBtn.className = 'ax-tactical-ar-pip-promote';
        promoteBtn.textContent = tr('tactical.arPromote', 'Promote');
        promoteBtn.title = tr('tactical.arPromote', 'Promote');
        promoteBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            promotePipCam(camId);
        });
        foot.appendChild(caption);
        foot.appendChild(promoteBtn);
        bubble.appendChild(foot);
        host.hidden = false;
        host.appendChild(bubble);

        const pipOwner = OWNER + '-pip-' + camId;
        const entry = {
            camId: camId,
            owner: pipOwner,
            player: null,
            el: bubble,
            uv: uv,
            label: label,
            mountedAt: Date.now(),
        };
        pipMounts.push(entry);

        return fetch('/api/fixed-cams/' + encodeURIComponent(camId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: pipOwner, viewMode: 'grid' }),
        }).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok || !data || !data.ok) throw new Error('pip start fail');
                const flvUrl = data.flvUrl || data.url || data.playUrl;
                if (!flvUrl) throw new Error('no flv');
                entry.player = Me8LivePlayerFactory.attachFlvPrimary(stage, flvUrl, {
                    proveMs: 300,
                    timeoutMs: 12000,
                    preferSubstream: true,
                    gridCount: MAX_PIP,
                });
                return entry;
            });
        }).catch(function (err) {
            caption.textContent = label + ' - offline';
            throw err;
        });
    }

    function setPins(next) {
        pins = Array.isArray(next) ? next.slice() : [];
        if (activePreset) renderArPins(pins, activePreset);
        else renderArPins(pins, null);
    }

    function stopLive() {
        killFocusOnly();
    }

    function startLive(cameraId) {
        const stageEl = el('ax-tactical-ar-video-stage');
        if (!stageEl || !cameraId) return Promise.resolve(false);
        killFocusOnly();
        liveCamId = cameraId;
        setStatus(tr('tactical.arStatusConnecting', 'Connecting live...'), 'unlocked');
        if (!global.Me8LivePlayerFactory || typeof Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            setStatus(tr('tactical.arStatusNoPlayer', 'Live video player unavailable'), 'unlocked');
            markFocusOffline();
            return Promise.resolve(false);
        }
        return fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER, viewMode: 'focus' }),
        }).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok || !data || !data.ok) throw new Error((data && data.error) || 'Live start failed');
                const flvUrl = data.flvUrl || data.url || data.playUrl;
                if (!flvUrl) throw new Error('No FLV URL');
                livePlayer = Me8LivePlayerFactory.attachFlvPrimary(stageEl, flvUrl, {
                    proveMs: 300,
                    timeoutMs: 12000,
                    onProven: function () {
                        if (activePreset) {
                            setStatus(
                                tr('tactical.arStatusLockedLive', 'Live + view locked - markers on'),
                                'locked',
                            );
                        } else {
                            setStatus(tr('tactical.arStatusLiveNeedLock', 'Live - press Use This View to show markers'), 'unlocked');
                        }
                    },
                    onFail: function () {
                        setStatus(tr('tactical.arStatusFail', 'Video unavailable'), 'unlocked');
                        markFocusOffline();
                    },
                });
                return true;
            });
        }).catch(function (err) {
            setStatus((err && err.message) || tr('tactical.arStatusFail', 'Video unavailable'), 'unlocked');
            markFocusOffline();
            liveCamId = cameraId;
            return false;
        });
    }

    /* C2: surgical PIP <-> Focus swap; other 7 untouched */
    function promotePipCam(pipCamId) {
        const id = String(pipCamId || '').trim();
        if (!id || overwatchBusy() || !activePreset) return;
        if (id === String(liveCamId || '')) return;
        const pip = pipMounts.find(function (m) { return m && m.camId === id; });
        if (!pip) return;
        const oldFocus = String(liveCamId || '');
        if (!oldFocus) return;

        isSwapping = true;
        setStatus(tr('tactical.arStatusPromoting', 'Switching focus...'), 'locked');
        const slotUv = pip.uv || { uv_x: 0.5, uv_y: 0.5 };
        const slotLabel = pip.label || oldFocus;

        killFocusOnly();
        killPipOnly(id);

        sleepMs(MOUNT_SETTLE_MS)
            .then(function () {
                return Promise.all([
                    startLive(id),
                    mountOnePip({ camId: oldFocus, uv: slotUv, label: slotLabel }).then(function () {
                        return true;
                    }).catch(function () {
                        return false;
                    }),
                ]);
            })
            .then(function () {
                if (activePreset) {
                    setStatus(
                        tr('tactical.arStatusLockedLive', 'Live + view locked - markers on'),
                        'locked',
                    );
                }
            })
            .catch(function () {
                /* fail-safe: leave remaining 7; dead slots already offline */
            })
            .then(function () {
                isSwapping = false;
            });
    }

    /* C2: marker beyond 8 — FIFO eviction */
    function promoteMarkerCam(markerCamId) {
        const id = String(markerCamId || '').trim();
        if (!id || overwatchBusy() || !activePreset) return;
        if (id === String(liveCamId || '')) return;
        if (pipMounts.some(function (m) { return m && m.camId === id; })) {
            promotePipCam(id);
            return;
        }
        const oldFocus = String(liveCamId || '');
        if (!oldFocus) return;
        if (!pipMounts.length) {
            /* no PIP to evict — just move focus */
            isSwapping = true;
            killFocusOnly();
            sleepMs(MOUNT_SETTLE_MS)
                .then(function () { return startLive(id); })
                .then(function () { isSwapping = false; })
                .catch(function () { isSwapping = false; });
            return;
        }

        let oldest = pipMounts[0];
        pipMounts.forEach(function (m) {
            if (!m) return;
            if (!oldest || (m.mountedAt || 0) < (oldest.mountedAt || 0)) oldest = m;
        });
        const slotUv = oldest.uv || { uv_x: 0.5, uv_y: 0.5 };
        const slotLabel = pinLabel({ name: oldFocus, device_id: oldFocus }) || oldFocus;
        const pin = pins.find(function (p) {
            return String((p && (p.device_id || p.deviceId)) || '') === oldFocus;
        });
        const demoteLabel = pin ? pinLabel(pin) : slotLabel;

        isSwapping = true;
        setStatus(tr('tactical.arStatusPromoting', 'Switching focus...'), 'locked');
        killFocusOnly();
        killPipOnly(oldest.camId);

        sleepMs(MOUNT_SETTLE_MS)
            .then(function () {
                return Promise.all([
                    startLive(id),
                    mountOnePip({ camId: oldFocus, uv: slotUv, label: demoteLabel }).then(function () {
                        return true;
                    }).catch(function () {
                        return false;
                    }),
                ]);
            })
            .then(function () {
                if (activePreset) {
                    setStatus(
                        tr('tactical.arStatusLockedLive', 'Live + view locked - markers on'),
                        'locked',
                    );
                }
            })
            .catch(function () { /* fail-safe: 7 remain */ })
            .then(function () {
                isSwapping = false;
            });
    }

    function sendPtz(action, extra) {
        const camSel = el('ax-tactical-ar-cam');
        const cameraId = camSel && camSel.value;
        if (!cameraId) return Promise.resolve();
        const body = Object.assign({ action: action }, extra || {});
        return fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/ptz', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok || (data && data.ok === false)) {
                    throw new Error((data && data.error) || ('HTTP ' + r.status));
                }
                return data;
            });
        });
    }

    /* VMS-PTZ-JOYSTICK-TACTICAL-AR-V1 - pad only; presets / goto-preset stay on sendPtz */
    function injectArPtzPadCss() {
        if (document.getElementById('ax-tactical-ar-ptz-runtime-style')) return;
        const style = document.createElement('style');
        style.id = 'ax-tactical-ar-ptz-runtime-style';
        /* AR-PTZ-NO-CLIP-V1 — zoom beside D-pad; Saved view presets stay in toolbar above */
        style.textContent =
            '#ax-tactical-ar-ptz{max-height:none!important;overflow:visible!important;flex:0 0 auto;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-panel{padding:0;border:0;background:transparent;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-title,' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-camera{display:none!important;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-compact-row{' +
            'display:flex!important;flex-direction:row;align-items:center;justify-content:center;gap:8px;flex-wrap:nowrap;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad{' +
            'display:grid!important;grid-template-columns:repeat(3,34px);' +
            'grid-template-areas:". up ." "left home right" ". down .";' +
            'justify-content:center;gap:4px;flex:0 0 auto;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad [data-ptz=up]{grid-area:up;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad [data-ptz=left]{grid-area:left;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad [data-ptz=home]{grid-area:home;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad [data-ptz=right]{grid-area:right;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad [data-ptz=down]{grid-area:down;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-compact-row > [data-ptz=zoom-out],' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-compact-row > [data-ptz=zoom-in]{' +
            'width:34px;height:34px;flex:0 0 auto;border:1px solid #475569;border-radius:4px;' +
            'background:#1e293b;color:#e2e8f0;cursor:pointer;touch-action:none;font-size:18px;line-height:1;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-pad button{' +
            'border:1px solid #475569;border-radius:4px;background:#1e293b;color:#e2e8f0;' +
            'cursor:pointer;touch-action:none;width:34px;height:28px;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-panel button:disabled{opacity:.35;cursor:not-allowed;}' +
            '#ax-tactical-ar-ptz-joystick-host .cw-ptz-status{margin-top:6px;min-height:18px;color:#64748b;font-size:9px;text-align:center;}';
        document.head.appendChild(style);
    }

    function ensureArPtzJoystick() {
        if (arPtzJoystick) return arPtzJoystick;
        const host = el('ax-tactical-ar-ptz-joystick-host');
        if (!host || !global.VmsPtzJoystick || typeof global.VmsPtzJoystick.create !== 'function') return null;
        injectArPtzPadCss();
        arPtzJoystick = global.VmsPtzJoystick.create(host, {
            showNumpad: false,
            isFloating: false,
            compact: true,
            classPrefix: 'cw-',
        }, {
            onMove: function () {
                if (!activePreset) return;
                clearPresetLock(
                    tr('tactical.arStatusUnlocked', 'Camera moved - markers hidden'),
                    { manual: true },
                );
            },
        });
        return arPtzJoystick;
    }

    function syncArPtzTarget() {
        ensureArPtzJoystick();
        if (!arPtzJoystick) return;
        const camSel = el('ax-tactical-ar-cam');
        const raw = camSel && String(camSel.value || '').replace(/^fixed:/i, '').trim();
        if (!raw) {
            arPtzJoystick.setTarget(null, { hasPtz: false, label: 'Empty' });
            return;
        }
        const label = camSel.options[camSel.selectedIndex]
            ? String(camSel.options[camSel.selectedIndex].textContent || 'Camera')
            : 'Camera';
        arPtzJoystick.setTarget(raw, { hasPtz: true, label: label });
    }

    function loadPresets(cameraId) {
        const presetSel = el('ax-tactical-ar-preset');
        const lockBtn = el('ax-tactical-ar-lock');
        if (!presetSel) return;
        presetSel.innerHTML = '<option value="">-</option>';
        presetSel.disabled = true;
        if (lockBtn) lockBtn.disabled = true;
        if (!cameraId) return;

        function applyPresetList(list) {
            const rows = Array.isArray(list) ? list.slice() : [];
            if (!rows.length) {
                rows.push({ token: LAB_VIEW_TOKEN, name: tr('tactical.arCurrentView', 'Current View') });
            }
            rows.forEach(function (p) {
                const opt = document.createElement('option');
                opt.value = String(p.token || '');
                opt.textContent = String(p.name || p.token || '');
                presetSel.appendChild(opt);
            });
            presetSel.disabled = false;
            if (lockBtn) lockBtn.disabled = false;
        }

        fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/ptz/presets', {
            credentials: 'same-origin',
        }).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok || !data || !data.ok) throw new Error((data && data.error) || 'Presets failed');
                applyPresetList(Array.isArray(data.presets) ? data.presets : []);
            });
        }).catch(function () {
            /* Non-PTZ / RTSP / VLC lab: still allow Use this View + PIP mount */
            applyPresetList([]);
            setStatus(tr('tactical.arStatusCurrentView', 'No saved PTZ views - Current View available'), 'unlocked');
        });
    }

    function loadPtzCameras() {
        const camSel = el('ax-tactical-ar-cam');
        if (!camSel) return Promise.resolve();
        return fetch('/api/fixed-cams', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                const cams = Array.isArray(data && data.cams) ? data.cams : [];
                camSel.innerHTML = '';
                /* Overview: any live-capable fixed cam (ONVIF or RTSP/VLC). PTZ pad still gates itself. */
                const liveCams = cams.filter(function (c) {
                    if (!c || !c.enabled) return false;
                    const src = String(c.streamSource || '');
                    return src === 'onvif' || src === 'rtsp';
                });
                if (!liveCams.length) {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = tr('tactical.arNoCam', 'No Overview Cameras');
                    camSel.appendChild(opt);
                    syncArPtzTarget();
                    return;
                }
                liveCams.forEach(function (c) {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name || 'Camera';
                    camSel.appendChild(opt);
                });
                loadPresets(camSel.value);
                syncArPtzTarget();
            })
            .catch(function () {
                camSel.innerHTML = '<option value="">-</option>';
                syncArPtzTarget();
            });
    }

    function invalidateMapSize() {
        if (global.TacticalShell && typeof TacticalShell.invalidateSize === 'function') {
            try { TacticalShell.invalidateSize(); } catch (_) { /* ignore */ }
        } else if (global.TacticalShell && typeof TacticalShell.getMap === 'function') {
            const map = TacticalShell.getMap();
            if (map && map.invalidateSize) {
                try { map.invalidateSize(); } catch (_) { /* ignore */ }
            }
        }
    }

    function setOpen(next) {
        open = !!next;
        const pane = el('ax-tactical-ar-pane');
        const st = stage();
        const liveBtn = el('ax-tactical-ar-live');
        const ptzPad = el('ax-tactical-ar-ptz');
        if (pane) pane.hidden = !open;
        if (st) st.classList.toggle('has-ar-split', open);
        if (liveBtn) liveBtn.disabled = !open;
        if (ptzPad) ptzPad.hidden = !open;
        if (!open) {
            teardownOverwatchVideo();
            clearPresetLock(tr('tactical.arStatusIdle', 'Overwatch idle - use a saved view to show markers'));
            if (global.TacticalOverwatch && typeof TacticalOverwatch.onOverwatchClosed === 'function') {
                try { TacticalOverwatch.onOverwatchClosed(); } catch (_) { /* ignore */ }
            }
        } else {
            loadPtzCameras().then(function () {
                setStatus(tr('tactical.arStatusIdle', 'Overwatch idle - use a saved view to show markers'), 'unlocked');
            });
        }
        setTimeout(invalidateMapSize, 50);
        setTimeout(invalidateMapSize, 250);
    }

    function lockSelectedPreset() {
        if (overwatchBusy()) return;
        const camSel = el('ax-tactical-ar-cam');
        const presetSel = el('ax-tactical-ar-preset');
        const cameraId = camSel && camSel.value;
        const token = presetSel && presetSel.value;
        if (!cameraId || !token) {
            setStatus(tr('tactical.arStatusPickPreset', 'Pick a camera and saved view first'), 'unlocked');
            return;
        }
        const name = presetSel.options[presetSel.selectedIndex]
            ? presetSel.options[presetSel.selectedIndex].textContent
            : token;
        isMountingOverwatch = true;
        const myGen = ++mountGen;
        setStatus(tr('tactical.arStatusSwitching', 'Switching saved view...'), 'unlocked');
        Promise.resolve()
            .then(function () {
                teardownOverwatchVideo();
                return sleepMs(MOUNT_SETTLE_MS);
            })
            .then(function () {
                if (myGen !== mountGen) return null;
                if (token === LAB_VIEW_TOKEN) return { ok: true, soft: true };
                return sendPtz('goto-preset', { presetToken: token }).catch(function () {
                    /* No PTZ / VLC lab: still lock markers + mount streams */
                    return { ok: true, soft: true };
                });
            })
            .then(function () {
                if (myGen !== mountGen) return;
                activePreset = { token: token, name: name, cameraId: cameraId };
                const n = renderArPins(pins, activePreset);
                setStatus(
                    tr('tactical.arStatusLocked', 'Using {name} - markers on ({n})')
                        .replace('{name}', name)
                        .replace('{n}', String(n)),
                    'locked',
                );
                if (global.TacticalOverwatch && typeof TacticalOverwatch.onPresetLocked === 'function') {
                    try { TacticalOverwatch.onPresetLocked(activePreset); } catch (_) { /* ignore */ }
                }
                startLive(cameraId);
                mountPipsForPreset(activePreset);
            })
            .catch(function (err) {
                if (myGen !== mountGen) return;
                clearPresetLock((err && err.message) || tr('tactical.arStatusGotoFail', 'Could not go to saved view'));
            })
            .then(function () {
                if (myGen === mountGen) isMountingOverwatch = false;
            });
    }

    function bindUi() {
        if (uiBound) return;
        uiBound = true;
        const openBtn = el('ax-tactical-ar-open');
        const closeBtn = el('ax-tactical-ar-close');
        const lockBtn = el('ax-tactical-ar-lock');
        const liveBtn = el('ax-tactical-ar-live');
        const camSel = el('ax-tactical-ar-cam');
        const presetSel = el('ax-tactical-ar-preset');

        if (openBtn) {
            openBtn.addEventListener('click', function () {
                setOpen(true);
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                setOpen(false);
            });
        }
        if (lockBtn) lockBtn.addEventListener('click', lockSelectedPreset);
        if (liveBtn) {
            liveBtn.addEventListener('click', function () {
                const id = camSel && camSel.value;
                if (id) startLive(id);
            });
        }
        if (camSel) {
            camSel.addEventListener('change', function () {
                clearPresetLock(tr('tactical.arStatusCamChanged', 'Camera changed - use a saved view again'));
                loadPresets(camSel.value);
                syncArPtzTarget();
            });
        }
        if (presetSel) {
            presetSel.addEventListener('change', function () {
                if (activePreset) {
                    clearPresetLock(tr('tactical.arStatusPresetChanged', 'Saved View changed - press Use This View'));
                }
            });
        }
        ensureArPtzJoystick();
        syncArPtzTarget();

        global.addEventListener('resize', function () {
            if (open && activePreset) renderArPins(pins, activePreset);
        });
    }

    function init() {
        bindUi();
    }

        global.TacticalAr = {
        init: init,
        open: function () { setOpen(true); },
        close: function () { setOpen(false); },
        setPins: setPins,
        renderArPins: renderArPins,
        renderOverwatchPins: renderArPins,
        getActivePreset: function () { return activePreset; },
        clearPresetLock: clearPresetLock,
        isOpen: function () { return open; },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : global);
