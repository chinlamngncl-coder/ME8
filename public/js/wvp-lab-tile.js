/**
 * mob-track-b2-two-wvp-tiles — two independent WVP live tiles (lab only).
 * Same B1 lessons: absolute FLV URL, allowlist token path, hasAudio:false (G.711).
 * Does not touch command wall / Open All / pool FFmpeg.
 *
 * mob-wvp-lab-mpegts-live-chase — soft live-edge (playbackRate), emergency jump >10s,
 * focus snap. Bundled mpegts has no liveSync; do not turn liveBufferLatencyChasing on.
 */
(function (global) {
    'use strict';

    var panel = null;
    var bound = false;
    var deviceList = [];
    var slots = {
        a: { player: null, playing: null, autoReopen: false, reopenCount: 0 },
        b: { player: null, playing: null, autoReopen: false, reopenCount: 0 },
    };
    var MAX_REOPEN = 12;
    var REOPEN_GAP_MS = 8000;
    var STALL_MS = 22000;
    /* Soft catch-up band (seconds of buffered.end - currentTime) */
    var CHASE_SOFT_SEC = 1.5;
    var CHASE_SOFT_RATE = 1.12;
    var CHASE_HARD_SEC = 10;
    var CHASE_TICK_MS = 1000;
    var CHASE_LOG_COOL_MS = 8000;

    function $(id) {
        return document.getElementById(id);
    }

    function log(msg) {
        var el = $('me8-wvp-lab-log');
        if (!el) return;
        var t = new Date().toLocaleTimeString();
        el.textContent = t + ' — ' + msg + '\n' + el.textContent;
    }

    function setBadge(text, ok) {
        var b = $('me8-wvp-lab-badge');
        if (!b) return;
        b.textContent = text;
        b.className = 'me8-wvp-lab-badge' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
    }

    async function readJson(res) {
        var text = await res.text();
        var trimmed = (text || '').trim();
        if (!trimmed) throw new Error('Empty API reply (HTTP ' + res.status + ')');
        if (trimmed.charAt(0) === '<' || /login\.html/i.test(trimmed)) {
            throw new Error('Session lost — refresh dashboard and sign in again');
        }
        try {
            return JSON.parse(trimmed);
        } catch (err) {
            throw new Error('Bad API reply (HTTP ' + res.status + '): ' + trimmed.slice(0, 100));
        }
    }

    function absolutizeUrl(url) {
        if (!url) return url;
        if (/^https?:\/\//i.test(url) || /^wss?:\/\//i.test(url)) return url;
        var base = global.location && global.location.origin
            ? global.location.origin
            : ((global.location.protocol || 'http:') + '//' + (global.location.host || ''));
        return base + (url.charAt(0) === '/' ? url : '/' + url);
    }

    function clearReopenTimer(key) {
        var slot = slots[key];
        if (!slot || !slot._reopenTimer) return;
        try { clearTimeout(slot._reopenTimer); } catch (_) {}
        slot._reopenTimer = null;
    }

    function bufferDelaySec(video) {
        try {
            if (!video || !video.buffered || !video.buffered.length) return 0;
            var end = video.buffered.end(video.buffered.length - 1);
            var ct = video.currentTime || 0;
            var d = end - ct;
            return d > 0 ? d : 0;
        } catch (_) {
            return 0;
        }
    }

    /** Soft-first live edge: rate catch-up; hard seek only if debt > CHASE_HARD_SEC. */
    function chaseLiveEdge(key, video, reason) {
        var slot = slots[key];
        if (!slot || !video || slot.player == null) return;
        if (document.hidden && reason !== 'focus') return;
        var delay = bufferDelaySec(video);
        var now = Date.now();
        try {
            if (delay > CHASE_HARD_SEC) {
                var end = video.buffered.end(video.buffered.length - 1);
                var pad = 0.25;
                video.currentTime = Math.max(0, end - pad);
                video.playbackRate = 1;
                if (!slot._lastChaseLog || now - slot._lastChaseLog > CHASE_LOG_COOL_MS) {
                    slot._lastChaseLog = now;
                    log('Tile ' + key.toUpperCase() + ': live snap ' + delay.toFixed(1) + 's' +
                        (reason ? ' (' + reason + ')' : ''));
                }
                return;
            }
            if (delay > CHASE_SOFT_SEC) {
                if (video.playbackRate !== CHASE_SOFT_RATE) {
                    video.playbackRate = CHASE_SOFT_RATE;
                    if (!slot._lastChaseLog || now - slot._lastChaseLog > CHASE_LOG_COOL_MS) {
                        slot._lastChaseLog = now;
                        log('Tile ' + key.toUpperCase() + ': soft chase ' + delay.toFixed(1) + 's @' +
                            CHASE_SOFT_RATE + 'x' + (reason ? ' (' + reason + ')' : ''));
                    }
                }
                return;
            }
            if (video.playbackRate !== 1) video.playbackRate = 1;
        } catch (_) {}
    }

    function armLiveChase(key, video) {
        var slot = slots[key];
        if (!slot || !video) return;
        if (slot._chaseIv) {
            try { clearInterval(slot._chaseIv); } catch (_) {}
            slot._chaseIv = null;
        }
        slot._chaseIv = setInterval(function () {
            chaseLiveEdge(key, video, 'tick');
        }, CHASE_TICK_MS);
    }

    function destroySlot(key) {
        var slot = slots[key];
        if (!slot) return;
        clearReopenTimer(key);
        if (slot._keepIv) {
            try { clearInterval(slot._keepIv); } catch (_) {}
            slot._keepIv = null;
        }
        if (slot._chaseIv) {
            try { clearInterval(slot._chaseIv); } catch (_) {}
            slot._chaseIv = null;
        }
        if (slot._onVis) {
            try { document.removeEventListener('visibilitychange', slot._onVis); } catch (_) {}
            slot._onVis = null;
        }
        slot._lastCt = null;
        slot._lastCtAt = 0;
        slot._lastChaseLog = 0;
        if (slot.player) {
            try { slot.player.pause(); } catch (_) {}
            try { slot.player.unload(); } catch (_) {}
            try { slot.player.detachMediaElement(); } catch (_) {}
            try { slot.player.destroy(); } catch (_) {}
            slot.player = null;
        }
        var stage = $('me8-wvp-lab-stage-' + key);
        if (stage) stage.innerHTML = '';
    }

    function scheduleReopen(key) {
        var slot = slots[key];
        if (!slot || !slot.autoReopen || !slot.playing) return;
        if (slot.reopenCount >= MAX_REOPEN) {
            setBadge('player err', false);
            return;
        }
        if (slot._reopenTimer) return;
        slot._reopenTimer = setTimeout(function () {
            slot._reopenTimer = null;
            reopenTile(key);
        }, REOPEN_GAP_MS);
    }

    async function reopenTile(key) {
        var slot = slots[key];
        if (!slot || !slot.autoReopen || !slot.playing) return;
        slot.reopenCount += 1;
        var deviceId = slot.playing.deviceId;
        var channelId = slot.playing.channelId;
        try {
            log('Tile ' + key.toUpperCase() + ': reopen #' + slot.reopenCount);
            var res = await fetch('/api/lab/wvp/play', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ deviceId: deviceId, channelId: channelId || deviceId }),
            });
            var data = await readJson(res);
            if (!res.ok) {
                log('Tile ' + key.toUpperCase() + ': reopen fail');
                scheduleReopen(key);
                return;
            }
            slot.playing = { deviceId: data.deviceId, channelId: data.channelId };
            slot._lastCt = null;
            slot._lastCtAt = 0;
            startPlayback(key, data);
        } catch (err) {
            log('Tile ' + key.toUpperCase() + ': reopen err');
            scheduleReopen(key);
        }
    }

    /** Keep live FLV reading in Chromium/Opera (private/incognito included). */
    function armLiveKeepalive(key, video) {
        var slot = slots[key];
        if (!slot || !video) return;
        if (slot._keepIv) {
            try { clearInterval(slot._keepIv); } catch (_) {}
        }
        if (slot._onVis) {
            try { document.removeEventListener('visibilitychange', slot._onVis); } catch (_) {}
        }
        function kick() {
            if (!slots[key] || slots[key].player == null) return;
            try {
                if (video.muted) {
                    video.muted = false;
                    video.volume = 0.01;
                }
            } catch (_) {}
            try {
                if (video.paused) video.play().catch(function () {});
            } catch (_) {}
            /* mob-wvp-tile-auto-reopen — frozen currentTime while session still wanted */
            if (slot.autoReopen) {
                var ct = video.currentTime || 0;
                if (slot._lastCt == null) {
                    slot._lastCt = ct;
                    slot._lastCtAt = Date.now();
                } else if (Math.abs(ct - slot._lastCt) > 0.08) {
                    slot._lastCt = ct;
                    slot._lastCtAt = Date.now();
                } else if (Date.now() - slot._lastCtAt > STALL_MS) {
                    slot._lastCtAt = Date.now();
                    scheduleReopen(key);
                }
            }
        }
        slot._onVis = function () {
            if (document.hidden) return;
            kick();
            /* Tab back: clear background buffer debt (soft or emergency snap) */
            chaseLiveEdge(key, video, 'focus');
        };
        document.addEventListener('visibilitychange', slot._onVis);
        slot._keepIv = setInterval(kick, 15000);
    }

    function destroyAll() {
        destroySlot('a');
        destroySlot('b');
    }

    function playFlv(key, url, opts) {
        opts = opts || {};
        destroySlot(key);
        if (!global.mpegts || !mpegts.getFeatureList().mseLivePlayback) {
            log('Tile ' + key.toUpperCase() + ': mpegts.js not available');
            setBadge('no player', false);
            return;
        }
        var stage = $('me8-wvp-lab-stage-' + key);
        if (!stage) return;
        var abs = absolutizeUrl(url);
        /* Same-origin HTTP/HTTPS may send cookies; ws / cross-host never. */
        var withCred = false;
        try {
            if (/^https?:\/\//i.test(abs) && global.location
                && abs.indexOf(global.location.origin) === 0) {
                withCred = true;
            }
        } catch (_) {}
        var video = document.createElement('video');
        video.controls = true;
        /* mob-wvp-tile-nomute-stall — hard mute lets Chromium/Opera pause live FLV;
         * Play click is a gesture so tiny volume is allowed; hasAudio stays false (G.711). */
        video.muted = false;
        try { video.volume = 0.01; } catch (_) {}
        video.playsInline = true;
        video.autoplay = true;
        stage.appendChild(video);
        var player = mpegts.createPlayer({
            type: 'flv',
            isLive: true,
            url: abs,
            hasAudio: false,
            hasVideo: true,
            withCredentials: withCred,
        }, {
            enableWorker: false,
            lazyLoad: false,
            enableStashBuffer: false,
            stashInitialSize: 128,
            /* Hard mpegts chase OFF — soft rate + emergency >10s in chaseLiveEdge */
            liveBufferLatencyChasing: false,
        });
        player.attachMediaElement(video);
        player.load();
        var p = video.play();
        if (p && p.catch) {
            p.catch(function () {
                /* fallback mute only if autoplay blocks unmuted */
                try {
                    video.muted = true;
                    video.play().catch(function () {});
                } catch (_) {}
                log('Tile ' + key.toUpperCase() + ': click video if blocked');
            });
        }
        armLiveKeepalive(key, video);
        armLiveChase(key, video);
        slots[key].player = player;
        log('Tile ' + key.toUpperCase() + ' ' + (opts.via || 'play') + ' ' + abs);
        try {
            player.on(mpegts.Events.ERROR, function (errType, errDetail) {
                log('Tile ' + key.toUpperCase() + ' mpegts: ' + errType + ' ' + (errDetail || ''));
                var chain = opts._chain || null;
                var idx = typeof opts._chainIdx === 'number' ? opts._chainIdx : -1;
                if (chain && idx >= 0 && idx < chain.length) {
                    var next = chain[idx];
                    log('Tile ' + key.toUpperCase() + ': ' + (opts.via || 'play') + ' failed → ' + next.via);
                    playFlv(key, next.url, {
                        via: next.via,
                        _chain: chain,
                        _chainIdx: idx + 1,
                        autoReopen: opts.autoReopen,
                    });
                    return;
                }
                if (opts.fallbackUrl && !opts._fellBack) {
                    opts._fellBack = true;
                    log('Tile ' + key.toUpperCase() + ': fallback → proxy');
                    playFlv(key, opts.fallbackUrl, { via: 'proxy-fallback', autoReopen: opts.autoReopen });
                    return;
                }
                scheduleReopen(key);
            });
        } catch (_) {}
    }

    function startPlayback(key, data) {
        /* Order: ws_flv (WVP class) → HTTP direct → Fleet proxy. Reopen stays safety only. */
        var preferWs = data.preferWs !== false;
        var preferDirect = data.preferDirect !== false;
        var ws = data.wsFlv || null;
        var direct = data.directFlv || data.upstreamFlv || null;
        var proxy = data.flvUrl || null;
        var autoReopen = !!(slots[key] && slots[key].autoReopen);
        var chain = [];
        if (preferWs && ws) chain.push({ url: ws, via: 'ws-flv' });
        if (preferDirect && direct) chain.push({ url: direct, via: 'direct-zlm' });
        if (proxy) chain.push({ url: proxy, via: 'proxy' });
        if (!chain.length) {
            log('Tile ' + key.toUpperCase() + ': no FLV URL');
            setBadge('no url', false);
            return;
        }
        var first = chain[0];
        playFlv(key, first.url, {
            via: first.via,
            _chain: chain,
            _chainIdx: 1,
            autoReopen: autoReopen,
        });
    }

    function fillDeviceSelect(sel, preferId) {
        if (!sel) return;
        sel.innerHTML = '';
        if (!deviceList.length) {
            sel.innerHTML = '<option value="">(none — cam on SIP 5061?)</option>';
            return;
        }
        deviceList.forEach(function (d) {
            var opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = (d.online ? '[ON] ' : '[off] ') + (d.name || d.deviceId);
            sel.appendChild(opt);
        });
        if (preferId) {
            sel.value = preferId;
            if (sel.value !== preferId && deviceList[0]) sel.value = deviceList[0].deviceId;
        }
    }

    async function loadChannels(key, deviceId) {
        var chSel = $('me8-wvp-lab-channel-' + key);
        if (!chSel || !deviceId) return;
        chSel.innerHTML = '';
        try {
            var res = await fetch('/api/lab/wvp/devices/' + encodeURIComponent(deviceId) + '/channels', {
                credentials: 'same-origin',
            });
            var data = await readJson(res);
            if (!res.ok) {
                log('Tile ' + key.toUpperCase() + ': ' + ((data && data.error) || 'channels failed'));
                return;
            }
            (data.list || []).forEach(function (ch) {
                var opt = document.createElement('option');
                opt.value = ch.channelId;
                opt.textContent = (ch.name || ch.channelId);
                chSel.appendChild(opt);
            });
        } catch (err) {
            log('Tile ' + key.toUpperCase() + ': ' + String(err && err.message || err));
        }
    }

    async function refreshDevices() {
        setBadge('loading');
        try {
            var st = await fetch('/api/lab/wvp/status', { credentials: 'same-origin' });
            var stData = await readJson(st);
            if (!st.ok) {
                log((stData && stData.error) || 'status failed');
                setBadge('fail', false);
                return;
            }
            log('WVP ok · pick cam A and cam B');
            var res = await fetch('/api/lab/wvp/devices', { credentials: 'same-origin' });
            var data = await readJson(res);
            if (!res.ok) {
                log((data && data.error) || 'device list failed');
                setBadge('fail', false);
                return;
            }
            deviceList = data.list || [];
            if (!deviceList.length) {
                fillDeviceSelect($('me8-wvp-lab-device-a'));
                fillDeviceSelect($('me8-wvp-lab-device-b'));
                setBadge('no devices', false);
                return;
            }
            var idA = deviceList[0].deviceId;
            var idB = (deviceList[1] && deviceList[1].deviceId) || idA;
            fillDeviceSelect($('me8-wvp-lab-device-a'), idA);
            fillDeviceSelect($('me8-wvp-lab-device-b'), idB);
            setBadge(deviceList.length + ' cam(s)', true);
            await loadChannels('a', idA);
            await loadChannels('b', idB);
        } catch (err) {
            log(String(err && err.message || err));
            setBadge('error', false);
        }
    }

    async function onPlay(key) {
        var deviceId = ($('me8-wvp-lab-device-' + key) && $('me8-wvp-lab-device-' + key).value) || '';
        var channelId = ($('me8-wvp-lab-channel-' + key) && $('me8-wvp-lab-channel-' + key).value) || deviceId;
        if (!deviceId) {
            log('Tile ' + key.toUpperCase() + ': pick a device');
            return;
        }
        destroySlot(key);
        slots[key].autoReopen = true;
        slots[key].reopenCount = 0;
        clearReopenTimer(key);
        try {
            log('Tile ' + key.toUpperCase() + ': starting WVP play…');
            var res = await fetch('/api/lab/wvp/play', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ deviceId: deviceId, channelId: channelId || deviceId }),
            });
            var data = await readJson(res);
            if (!res.ok) {
                log('Tile ' + key.toUpperCase() + ': ' + ((data && data.error) || 'play failed'));
                setBadge('play fail', false);
                return;
            }
            slots[key].playing = { deviceId: data.deviceId, channelId: data.channelId };
            startPlayback(key, data);
            setBadge('2 tiles ready', true);
        } catch (err) {
            log('Tile ' + key.toUpperCase() + ': ' + String(err && err.message || err));
            setBadge('error', false);
        }
    }

    async function onStop(key) {
        slots[key].autoReopen = false;
        clearReopenTimer(key);
        destroySlot(key);
        var playing = slots[key].playing;
        slots[key].playing = null;
        slots[key].reopenCount = 0;
        if (!playing) {
            log('Tile ' + key.toUpperCase() + ': stopped');
            return;
        }
        try {
            await fetch('/api/lab/wvp/stop', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playing),
            });
            log('Tile ' + key.toUpperCase() + ': stop sent');
        } catch (err) {
            log('Tile ' + key.toUpperCase() + ' stop: ' + (err && err.message || err));
        }
    }

    function applyGate(on) {
        try {
            document.body.classList.toggle('fm-lab-wvp', !!on);
        } catch (_) {}
        panel = $('me8-wvp-lab-tile');
        if (!panel) return;
        if (on) {
            panel.hidden = false;
            panel.removeAttribute('hidden');
            if (!bound) bind();
        } else {
            panel.hidden = true;
            destroyAll();
        }
    }

    function bind() {
        if (bound) return;
        bound = true;
        ['a', 'b'].forEach(function (key) {
            var deviceSel = $('me8-wvp-lab-device-' + key);
            if (deviceSel) {
                deviceSel.addEventListener('change', function () {
                    loadChannels(key, deviceSel.value);
                });
            }
            var btnPlay = $('me8-wvp-lab-play-' + key);
            var btnStop = $('me8-wvp-lab-stop-' + key);
            if (btnPlay) btnPlay.addEventListener('click', function () { onPlay(key); });
            if (btnStop) btnStop.addEventListener('click', function () { onStop(key); });
        });
        var btnRefresh = $('me8-wvp-lab-refresh');
        var btnMin = $('me8-wvp-lab-min');
        if (btnRefresh) btnRefresh.addEventListener('click', refreshDevices);
        if (btnMin) {
            btnMin.addEventListener('click', function () {
                panel.classList.toggle('me8-wvp-lab-collapsed');
            });
        }
        refreshDevices();
    }

    function onCapabilities(data) {
        global.__fmServerCapabilities = data || global.__fmServerCapabilities || null;
        applyGate(!!(data && data.labWvp));
    }

    function boot() {
        panel = $('me8-wvp-lab-tile');
        if (global.__fmServerCapabilities) {
            applyGate(!!global.__fmServerCapabilities.labWvp);
        }
        function trySock() {
            var sock = global.__mobilityDashboardSocket || global.socket;
            if (!sock || !sock.on) return false;
            sock.on('server-capabilities', onCapabilities);
            return true;
        }
        if (!trySock()) {
            var n = 0;
            var iv = setInterval(function () {
                if (trySock() || ++n > 80) clearInterval(iv);
            }, 250);
        }
        fetch('/api/auth/session', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (s) {
                if (s && s.ok && s.labWvp) applyGate(true);
            })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    global.WvpLabTile = { applyGate: applyGate, refresh: refreshDevices };
})(typeof window !== 'undefined' ? window : global);
