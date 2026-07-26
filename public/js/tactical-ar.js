/**
 * Phase 2 Task 2.3 — Overwatch (AR) split (left map / right live + UV glass markers)
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
    let uiBound = false;
    let open = false;
    let pins = [];
    let activePreset = null; // { token, name, cameraId }
    let livePlayer = null;
    let liveCamId = null;

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
                openLinkedFromPin(pin);
            });
            host.appendChild(node);
            drawn += 1;
        });
        renderBubbles(list, preset);
        return drawn;
    }

    function renderBubbles(pinList, preset) {
        const host = bubblesHost();
        if (!host) return;
        host.innerHTML = '';
        const locked = !!(preset && preset.token);
        host.hidden = !locked;
        if (!locked) return;
        const presetToken = String(preset.token);
        (pinList || []).slice(0, 4).forEach(function (pin) {
            const want = pinPresetToken(pin);
            if (want && want !== presetToken) return;
            const linked = String(pin.device_id || pin.deviceId || '').trim();
            if (!linked) return;
            const uv = pinUv(pin);
            const bubble = document.createElement('button');
            bubble.type = 'button';
            bubble.className = 'ax-tactical-ar-bubble';
            bubble.style.left = (uv.uv_x * 100) + '%';
            bubble.style.top = (uv.uv_y * 100) + '%';
            bubble.textContent = tr('tactical.arBubble', 'Live') + '\n' + pinLabel(pin);
            bubble.addEventListener('click', function (ev) {
                ev.preventDefault();
                openLinkedFromPin(pin);
            });
            host.appendChild(bubble);
        });
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
        renderArPins(pins, null);
        const ptzPad = el('ax-tactical-ar-ptz');
        if (ptzPad) ptzPad.hidden = !open;
        setStatus(
            reason || tr('tactical.arStatusUnlocked', 'Camera moved — markers hidden'),
            'unlocked',
        );
        const manual = !!(opts && opts.manual) && wasLocked;
        if (manual && global.TacticalOverwatch && typeof TacticalOverwatch.onManualOverride === 'function') {
            try { TacticalOverwatch.onManualOverride(); } catch (_) { /* ignore */ }
        } else if (global.TacticalOverwatch && typeof TacticalOverwatch.onPresetCleared === 'function') {
            try { TacticalOverwatch.onPresetCleared(); } catch (_) { /* ignore */ }
        }
    }

    function setPins(next) {
        pins = Array.isArray(next) ? next.slice() : [];
        if (activePreset) renderArPins(pins, activePreset);
        else renderArPins(pins, null);
    }

    function stopLive() {
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

    function startLive(cameraId) {
        const stageEl = el('ax-tactical-ar-video-stage');
        if (!stageEl || !cameraId) return;
        stopLive();
        liveCamId = cameraId;
        setStatus(tr('tactical.arStatusConnecting', 'Connecting live…'), 'unlocked');
        if (!global.Me8LivePlayerFactory || typeof Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            setStatus(tr('tactical.arStatusNoPlayer', 'FLV player unavailable'), 'unlocked');
            return;
        }
        fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/zlm/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: OWNER }),
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
                                tr('tactical.arStatusLockedLive', 'Live + view locked — markers on'),
                                'locked',
                            );
                        } else {
                            setStatus(tr('tactical.arStatusLiveNeedLock', 'Live — press Use this view to show markers'), 'unlocked');
                        }
                    },
                    onFail: function () {
                        setStatus(tr('tactical.arStatusFail', 'Video unavailable'), 'unlocked');
                    },
                });
            });
        }).catch(function (err) {
            setStatus((err && err.message) || tr('tactical.arStatusFail', 'Video unavailable'), 'unlocked');
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

    function loadPresets(cameraId) {
        const presetSel = el('ax-tactical-ar-preset');
        const lockBtn = el('ax-tactical-ar-lock');
        if (!presetSel) return;
        presetSel.innerHTML = '<option value="">—</option>';
        presetSel.disabled = true;
        if (lockBtn) lockBtn.disabled = true;
        if (!cameraId) return;
        fetch('/api/fixed-cams/' + encodeURIComponent(cameraId) + '/ptz/presets', {
            credentials: 'same-origin',
        }).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok || !data || !data.ok) throw new Error((data && data.error) || 'Presets failed');
                const list = Array.isArray(data.presets) ? data.presets : [];
                list.forEach(function (p) {
                    const opt = document.createElement('option');
                    opt.value = String(p.token || '');
                    opt.textContent = String(p.name || p.token || '');
                    presetSel.appendChild(opt);
                });
                presetSel.disabled = list.length === 0;
                if (lockBtn) lockBtn.disabled = list.length === 0;
                if (!list.length) {
                    setStatus(tr('tactical.arStatusNoPresets', 'No saved views on this camera'), 'unlocked');
                }
            });
        }).catch(function (err) {
            setStatus((err && err.message) || tr('tactical.arStatusNoPresets', 'No saved views on this camera'), 'unlocked');
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
                const ptzCams = cams.filter(function (c) {
                    return c && c.enabled && c.ptzEnabled && c.streamSource === 'onvif';
                });
                if (!ptzCams.length) {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = tr('tactical.arNoPtz', 'No overview PTZ cameras');
                    camSel.appendChild(opt);
                    return;
                }
                ptzCams.forEach(function (c) {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name || c.id;
                    camSel.appendChild(opt);
                });
                loadPresets(camSel.value);
            })
            .catch(function () {
                camSel.innerHTML = '<option value="">—</option>';
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
            stopLive();
            clearPresetLock(tr('tactical.arStatusIdle', 'Overwatch idle — use a saved view to show markers'));
            if (global.TacticalOverwatch && typeof TacticalOverwatch.onOverwatchClosed === 'function') {
                try { TacticalOverwatch.onOverwatchClosed(); } catch (_) { /* ignore */ }
            }
        } else {
            loadPtzCameras().then(function () {
                setStatus(tr('tactical.arStatusIdle', 'Overwatch idle — use a saved view to show markers'), 'unlocked');
            });
        }
        setTimeout(invalidateMapSize, 50);
        setTimeout(invalidateMapSize, 250);
    }

    function lockSelectedPreset() {
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
        sendPtz('goto-preset', { presetToken: token })
            .then(function () {
                activePreset = { token: token, name: name, cameraId: cameraId };
                const n = renderArPins(pins, activePreset);
                setStatus(
                    tr('tactical.arStatusLocked', 'Using {name} — markers on ({n})')
                        .replace('{name}', name)
                        .replace('{n}', String(n)),
                    'locked',
                );
                if (global.TacticalOverwatch && typeof TacticalOverwatch.onPresetLocked === 'function') {
                    try { TacticalOverwatch.onPresetLocked(activePreset); } catch (_) { /* ignore */ }
                }
                if (!liveCamId) startLive(cameraId);
            })
            .catch(function (err) {
                clearPresetLock((err && err.message) || tr('tactical.arStatusGotoFail', 'Could not go to saved view'));
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
        const ptzPad = el('ax-tactical-ar-ptz');

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
                clearPresetLock(tr('tactical.arStatusCamChanged', 'Camera changed — use a saved view again'));
                loadPresets(camSel.value);
            });
        }
        if (presetSel) {
            presetSel.addEventListener('change', function () {
                if (activePreset) {
                    clearPresetLock(tr('tactical.arStatusPresetChanged', 'Saved view changed — press Use this view'));
                }
            });
        }
        if (ptzPad) {
            ptzPad.querySelectorAll('[data-ar-ptz]').forEach(function (btn) {
                const action = btn.getAttribute('data-ar-ptz');
                if (action === 'stop') {
                    btn.addEventListener('click', function () {
                        sendPtz('stop').catch(function () { /* ignore */ });
                    });
                    return;
                }
                btn.addEventListener('pointerdown', function (event) {
                    event.preventDefault();
                    try { btn.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
                    /* Manual move → hide Overwatch markers + FOV (View lock broken) */
                    if (activePreset) {
                        clearPresetLock(
                            tr('tactical.arStatusUnlocked', 'Camera moved — markers hidden'),
                            { manual: true },
                        );
                    }
                    sendPtz(action).catch(function () { /* ignore */ });
                });
                ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(function (evName) {
                    btn.addEventListener(evName, function () {
                        sendPtz('stop').catch(function () { /* ignore */ });
                    });
                });
            });
        }

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
