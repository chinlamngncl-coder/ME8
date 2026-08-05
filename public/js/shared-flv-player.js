/**
 * UNIFIED AXIOM STREAM ENGINE — AxiomFlvManager
 * Central HTTP-FLV attach / soft-chase / detach for Ops · FR · ANPR · Tactical · Command Wall · VC · lab.
 * Soft-chase math = proven lab (`wvp-lab-tile.js` / mob-wvp-lab-mpegts-live-chase):
 *   soft >1.5s @ 1.12x · hard seek >10s · reset 1.0x
 * Hard mpegts liveBufferLatencyChasing stays OFF (known minutes-lag failure).
 */
(function (global) {
    'use strict';

    /* Soft catch-up band (seconds of buffered.end - currentTime) — lab-proven */
    var CHASE_SOFT_SEC = 1.5;
    var CHASE_SOFT_RATE = 1.12;
    var CHASE_HARD_SEC = 10;
    var CHASE_HARD_PAD = 0.25;
    var CHASE_TICK_MS = 1000;
    var DENSE_GRID = 16;

    /** videoElement → session */
    var byVideo = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var sessions = [];
    var urlRefCount = Object.create(null);

    function absolutizeUrl(url) {
        if (!url) return url;
        var s = String(url);
        if (s.charAt(0) === '/') {
            var baseRel = global.location && global.location.origin
                ? global.location.origin
                : ((global.location.protocol || 'http:') + '//' + (global.location.host || ''));
            return baseRel + s;
        }
        if (/^https?:\/\//i.test(s) || /^wss?:\/\//i.test(s)) {
            try {
                var abs = new URL(s);
                if (/\/api\/lab\//i.test(abs.pathname)) {
                    return (global.location.origin || '') + abs.pathname + (abs.search || '');
                }
                if (global.location && global.location.protocol === 'https:' && abs.protocol === 'http:') {
                    var zlmPorts = { '18088': 1, '8080': 1 };
                    if (zlmPorts[abs.port] || /\/(live|rtp)\//i.test(abs.pathname)) {
                        return (global.location.origin || '')
                            + '/api/lab/media/upstream-flv?u=' + encodeURIComponent(s);
                    }
                }
            } catch (_) { /* keep */ }
            return s;
        }
        var base = global.location && global.location.origin
            ? global.location.origin
            : ((global.location.protocol || 'http:') + '//' + (global.location.host || ''));
        return base + (s.charAt(0) === '/' ? s : '/' + s);
    }

    /**
     * Prefer ZLM low-bitrate sub when dense grids (32/64). Focus upgrade → main.
     * Patterns: *_sub.live.flv, /sub/, ?substream=1
     */
    function resolveStreamUrl(streamUrl, options) {
        options = options || {};
        var url = absolutizeUrl(streamUrl);
        var wantSub = !!options.preferSubstream
            || (typeof options.gridCount === 'number' && options.gridCount > DENSE_GRID
                && options.focusUpgrade !== true);
        if (options.focusUpgrade === true) wantSub = false;
        if (options.quality === 'sub') wantSub = true;
        if (options.quality === 'main') wantSub = false;
        if (!wantSub || !url) return url;
        return toSubstreamUrl(url);
    }

    function toSubstreamUrl(url) {
        var s = String(url);
        if (/_sub(\.|\/|\?)/i.test(s) || /\/sub\//i.test(s) || /[?&]sub(stream)?=1/i.test(s)) {
            return s;
        }
        /* ZLM common: cam.live.flv → cam_sub.live.flv */
        var out = s.replace(/(\/live\/|\/rtp\/)([^/?#]+?)(\.live\.flv|\.flv)/i, function (_, p, name, ext) {
            if (/_sub$/i.test(name)) return _ + name + ext;
            return p + name + '_sub' + ext;
        });
        if (out !== s) return out;
        if (s.indexOf('?') >= 0) return s + '&substream=1';
        return s + (/\.flv/i.test(s) ? '' : '') + (s.indexOf('?') < 0 ? '?substream=1' : '&substream=1');
    }

    function toMainStreamUrl(url) {
        var s = String(url);
        s = s.replace(/_sub(\.live\.flv|\.flv)/i, '$1');
        s = s.replace(/\/sub\//i, '/');
        s = s.replace(/([?&])sub(stream)?=1&?/i, '$1').replace(/[?&]$/, '');
        return s;
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
    function softChaseTick(session, reason) {
        if (!session || !session.video || session.destroyed) return;
        if (session.pausedForVisibility) return;
        if (document.hidden && reason !== 'focus') return;
        var video = session.video;
        var delay = bufferDelaySec(video);
        try {
            if (delay > CHASE_HARD_SEC) {
                var end = video.buffered.end(video.buffered.length - 1);
                video.currentTime = Math.max(0, end - CHASE_HARD_PAD);
                video.playbackRate = 1;
                return;
            }
            if (delay > CHASE_SOFT_SEC) {
                if (video.playbackRate !== CHASE_SOFT_RATE) video.playbackRate = CHASE_SOFT_RATE;
                return;
            }
            if (video.playbackRate !== 1) video.playbackRate = 1;
        } catch (_) { /* ignore */ }
    }

    function armChase(session) {
        disarmChase(session);
        session.chaseIv = setInterval(function () {
            softChaseTick(session);
        }, CHASE_TICK_MS);
    }

    function disarmChase(session) {
        if (session && session.chaseIv) {
            try { clearInterval(session.chaseIv); } catch (_) { /* ignore */ }
            session.chaseIv = null;
        }
    }

    /** Strict detach order: pause → unload → detachMediaElement → destroy */
    function teardownPlayer(player) {
        if (!player) return;
        try { player.pause(); } catch (_) { /* ignore */ }
        try { player.unload(); } catch (_) { /* ignore */ }
        try { player.detachMediaElement(); } catch (_) { /* ignore */ }
        try { player.destroy(); } catch (_) { /* ignore */ }
    }

    function getSession(video) {
        if (!video) return null;
        if (byVideo) return byVideo.get(video) || null;
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i].video === video) return sessions[i];
        }
        return null;
    }

    function setSession(video, session) {
        if (byVideo) byVideo.set(video, session);
        if (sessions.indexOf(session) < 0) sessions.push(session);
    }

    function clearSession(video, session) {
        if (byVideo) {
            try { byVideo.delete(video); } catch (_) { /* ignore */ }
        }
        var ix = sessions.indexOf(session);
        if (ix >= 0) sessions.splice(ix, 1);
    }

    function bumpUrl(url, delta) {
        if (!url) return;
        var n = (urlRefCount[url] || 0) + delta;
        if (n <= 0) delete urlRefCount[url];
        else urlRefCount[url] = n;
    }

    function pauseForVisibility(session) {
        if (!session || session.destroyed || session.pausedForVisibility) return;
        session.pausedForVisibility = true;
        try { if (session.player) session.player.pause(); } catch (_) { /* ignore */ }
        try { session.video.pause(); } catch (_) { /* ignore */ }
    }

    function resumeFromVisibility(session) {
        if (!session || session.destroyed || !session.pausedForVisibility) return;
        session.pausedForVisibility = false;
        try {
            var p = session.player && session.player.play();
            if (p && p.catch) p.catch(function () {});
        } catch (_) { /* ignore */ }
        try {
            var vp = session.video.play();
            if (vp && vp.catch) vp.catch(function () {});
        } catch (_) { /* ignore */ }
        softChaseTick(session, 'focus');
    }

    function armVisibility(session) {
        if (!session || !session.video) return;
        if (typeof IntersectionObserver !== 'undefined' && !session.io) {
            try {
                session.io = new IntersectionObserver(function (entries) {
                    var e = entries && entries[0];
                    if (!e) return;
                    if (e.isIntersecting && e.intersectionRatio > 0.05) resumeFromVisibility(session);
                    else pauseForVisibility(session);
                }, { threshold: [0, 0.05, 0.25] });
                session.io.observe(session.video);
            } catch (_) {
                session.io = null;
            }
        }
        if (!session._onVis) {
            session._onVis = function () {
                if (document.hidden) pauseForVisibility(session);
                else resumeFromVisibility(session);
            };
            try { document.addEventListener('visibilitychange', session._onVis); } catch (_) { /* ignore */ }
        }
    }

    function disarmVisibility(session) {
        if (session && session.io) {
            try { session.io.disconnect(); } catch (_) { /* ignore */ }
            session.io = null;
        }
        if (session && session._onVis) {
            try { document.removeEventListener('visibilitychange', session._onVis); } catch (_) { /* ignore */ }
            session._onVis = null;
        }
    }

    /**
     * @param {HTMLVideoElement} videoElement
     * @param {string} streamUrl
     * @param {object} [options]
     */
    function attach(videoElement, streamUrl, options) {
        options = options || {};
        if (!videoElement || !streamUrl) return null;
        if (typeof mpegts === 'undefined' || !mpegts.isSupported()) {
            console.log('[axiom-flv] attach fail', { reason: 'mpegts_unsupported' });
            return null;
        }

        var existing = getSession(videoElement);
        var url = resolveStreamUrl(streamUrl, options);
        if (existing && !existing.destroyed && existing.url === url) {
            /* De-dupe: same element + same URL — reuse session */
            return existing.handle || existing;
        }
        if (existing) detach(videoElement);

        var withCred = options.withCredentials !== false;
        var player = mpegts.createPlayer({
            type: 'flv',
            isLive: true,
            url: url,
            hasAudio: false,
            hasVideo: true,
            withCredentials: withCred,
        }, {
            enableWorker: false,
            lazyLoad: false,
            enableStashBuffer: false,
            stashInitialSize: 128,
            liveBufferLatencyChasing: false,
        });

        var session = {
            video: videoElement,
            player: player,
            url: url,
            sourceUrl: String(streamUrl),
            destroyed: false,
            pausedForVisibility: false,
            chaseIv: null,
            io: null,
            _onVis: null,
            options: options,
        };

        try { player.attachMediaElement(videoElement); } catch (err) {
            console.log('[axiom-flv] attachMedia fail', err);
            teardownPlayer(player);
            return null;
        }

        bumpUrl(url, 1);
        setSession(videoElement, session);

        if (typeof options.onError === 'function') {
            try {
                player.on(mpegts.Events.ERROR, function (t, d) {
                    try { options.onError(t, d); } catch (_) { /* ignore */ }
                });
            } catch (_) { /* ignore */ }
        }

        try { player.load(); } catch (_) { /* ignore */ }
        try {
            var playP = player.play();
            if (playP && playP.catch) {
                playP.catch(function () {
                    try {
                        videoElement.muted = true;
                        videoElement.play().catch(function () {});
                    } catch (_) { /* ignore */ }
                });
            }
        } catch (_) { /* ignore */ }

        armChase(session);
        if (options.pauseWhenHidden !== false) armVisibility(session);

        var handle = {
            engine: 'zlm',
            video: videoElement,
            url: url,
            player: player,
            destroy: function () { detach(videoElement); },
            detach: function () { detach(videoElement); },
            upgradeToMain: function () {
                var main = toMainStreamUrl(session.sourceUrl || url);
                return attach(videoElement, main, Object.assign({}, options, {
                    focusUpgrade: true,
                    quality: 'main',
                    preferSubstream: false,
                }));
            },
            downgradeToSub: function () {
                return attach(videoElement, session.sourceUrl || url, Object.assign({}, options, {
                    preferSubstream: true,
                    quality: 'sub',
                    focusUpgrade: false,
                }));
            },
        };
        session.handle = handle;
        console.log('[axiom-flv] attach', {
            url: url,
            sub: /_sub|\bsubstream=1|\/sub\//i.test(url),
            refs: urlRefCount[url] || 1,
        });
        return handle;
    }

    function detach(videoElement) {
        var session = getSession(videoElement);
        if (!session || session.destroyed) return;
        session.destroyed = true;
        disarmChase(session);
        disarmVisibility(session);
        bumpUrl(session.url, -1);
        teardownPlayer(session.player);
        session.player = null;
        clearSession(videoElement, session);
        try { if (videoElement) videoElement.playbackRate = 1; } catch (_) { /* ignore */ }
        try { if (videoElement) videoElement.pause(); } catch (_) { /* ignore */ }
        try { if (videoElement) videoElement.removeAttribute('src'); } catch (_) { /* ignore */ }
        try { if (videoElement) videoElement.load(); } catch (_) { /* ignore */ }
    }

    function detachAll() {
        var copy = sessions.slice();
        for (var i = 0; i < copy.length; i++) {
            if (copy[i] && copy[i].video) detach(copy[i].video);
        }
    }

    function activeCount() {
        return sessions.length;
    }

    function urlActiveCount(url) {
        return urlRefCount[absolutizeUrl(url)] || 0;
    }

    global.AxiomFlvManager = {
        attach: attach,
        detach: detach,
        detachAll: detachAll,
        absolutizeUrl: absolutizeUrl,
        resolveStreamUrl: resolveStreamUrl,
        toSubstreamUrl: toSubstreamUrl,
        toMainStreamUrl: toMainStreamUrl,
        activeCount: activeCount,
        urlActiveCount: urlActiveCount,
        DENSE_GRID: DENSE_GRID,
        CHASE_SOFT_SEC: CHASE_SOFT_SEC,
        CHASE_SOFT_RATE: CHASE_SOFT_RATE,
        CHASE_HARD_SEC: CHASE_HARD_SEC,
    };
    /* Alias */
    global.AxiomStreamEngine = global.AxiomFlvManager;
})(typeof window !== 'undefined' ? window : this);
