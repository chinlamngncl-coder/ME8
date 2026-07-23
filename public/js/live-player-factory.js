/**
 * Live player factory \u2014 Gate D pieces + mob-zlm-wall-safe-no-wipe.
 * Soft ZLM: overlay only after prove; never wipe host. Wall keeps JSMpeg underneath.
 */
(function (global) {
    'use strict';

    function absolutizeUrl(url) {
        if (!url) return url;
        if (/^https?:\/\//i.test(url) || /^wss?:\/\//i.test(url)) return url;
        var base = global.location && global.location.origin
            ? global.location.origin
            : ((global.location.protocol || 'http:') + '//' + (global.location.host || ''));
        return base + (url.charAt(0) === '/' ? url : '/' + url);
    }

    function fetchDescriptor(camId) {
        var id = String(camId || '').trim();
        if (!id) return Promise.resolve({ ok: false, engine: 'idle', error: 'camId required' });
        return fetch('/api/live/playback?camId=' + encodeURIComponent(id), {
            credentials: 'same-origin',
            cache: 'no-store',
        }).then(function (r) {
            return r.json().then(function (j) {
                return j || { ok: false, engine: 'idle' };
            });
        }).catch(function (err) {
            return { ok: false, engine: 'idle', error: String(err && err.message || err) };
        });
    }

    function fetchDescriptorPreferZlm(camId, opts) {
        var tries = (opts && opts.tries) || 6;
        var gapMs = (opts && opts.gapMs) || 700;
        var n = 0;
        function once() {
            return fetchDescriptor(camId).then(function (desc) {
                if (desc && desc.ok && desc.engine === 'zlm' && desc.flvUrl) return desc;
                n += 1;
                if (n >= tries) return desc;
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        once().then(resolve);
                    }, gapMs);
                });
            });
        }
        return once();
    }

    /**
     * Soft ZLM overlay \u2014 does NOT clear host. JSMpeg canvas stays.
     * Shows video only after prove (playing + short hold). Fail \u2192 remove overlay only.
     */
    function softAttachZlmOverlay(host, desc, opts) {
        opts = opts || {};
        if (!host || !desc || !desc.flvUrl) return null;
        if (typeof mpegts === 'undefined' || !mpegts.isSupported()) return null;

        var flvUrl = absolutizeUrl(desc.flvUrl);
        var proveMs = typeof opts.proveMs === 'number' ? opts.proveMs : 500;
        var onProven = opts.onProven;
        var onFail = opts.onFail;

        var prevPos = host.style.position;
        if (!prevPos || prevPos === 'static') host.style.position = 'relative';

        var video = document.createElement('video');
        video.className = 'me8-zlm-soft-overlay';
        video.setAttribute('playsinline', 'playsinline');
        video.muted = true;
        video.autoplay = true;
        video.style.cssText = [
            'position:absolute',
            'left:0',
            'top:0',
            'width:100%',
            'height:100%',
            'object-fit:contain',
            'background:#000',
            'opacity:0',
            'pointer-events:none',
            'z-index:2',
        ].join(';');
        host.appendChild(video);

        var player = mpegts.createPlayer({
            type: 'flv',
            isLive: true,
            url: flvUrl,
            withCredentials: true,
        }, {
            enableWorker: false,
            lazyLoad: false,
            liveBufferLatencyChasing: false,
        });
        player.attachMediaElement(video);

        var settled = false;
        var proveTimer = null;
        var failTimer = null;

        function cleanupOverlayOnly() {
            if (proveTimer) {
                clearTimeout(proveTimer);
                proveTimer = null;
            }
            if (failTimer) {
                clearTimeout(failTimer);
                failTimer = null;
            }
            try { player.pause(); } catch (_) { /* ignore */ }
            try { player.unload(); } catch (_) { /* ignore */ }
            try { player.detachMediaElement(); } catch (_) { /* ignore */ }
            try { player.destroy(); } catch (_) { /* ignore */ }
            try {
                if (video.parentNode) video.parentNode.removeChild(video);
            } catch (_) { /* ignore */ }
        }

        function fail(reason) {
            if (settled) return;
            settled = true;
            cleanupOverlayOnly();
            if (typeof onFail === 'function') onFail(reason || 'zlm_fail');
        }

        function prove() {
            if (settled) return;
            settled = true;
            if (proveTimer) {
                clearTimeout(proveTimer);
                proveTimer = null;
            }
            if (failTimer) {
                clearTimeout(failTimer);
                failTimer = null;
            }
            video.style.opacity = '1';
            if (typeof onProven === 'function') onProven();
        }

        function armProve() {
            if (settled || proveTimer) return;
            proveTimer = setTimeout(function () {
                proveTimer = null;
                if (settled) return;
                if (video.readyState >= 2 && !video.paused) prove();
                else fail('zlm_not_stable');
            }, proveMs);
        }

        player.on(mpegts.Events.ERROR, function () {
            fail('zlm_player_error');
        });
        video.addEventListener('playing', armProve);
        video.addEventListener('timeupdate', function () {
            if (!settled && video.currentTime > 0.05) armProve();
        });

        failTimer = setTimeout(function () {
            fail('zlm_prove_timeout');
        }, typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 8000);

        player.load();
        var playP = player.play();
        if (playP && typeof playP.catch === 'function') {
            playP.catch(function () { fail('zlm_play_reject'); });
        }

        return {
            engine: 'zlm',
            destroy: function () {
                settled = true;
                cleanupOverlayOnly();
            },
        };
    }

    /**
     * Primary FLV player \u2014 no JSMpeg underneath (MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1).
     */
    function attachFlvPrimary(host, flvUrl, opts) {
        opts = opts || {};
        if (!host || !flvUrl) return null;
        if (typeof mpegts === 'undefined' || !mpegts.isSupported()) {
            console.log('[me8-flv] attach fail', { url: flvUrl, reason: 'mpegts_unsupported' });
            return null;
        }

        var url = absolutizeUrl(flvUrl);
        console.log('[me8-flv] attach start', { url: url });
        var proveMs = typeof opts.proveMs === 'number' ? opts.proveMs : 300;
        var onProven = opts.onProven;
        var onFail = opts.onFail;
        var onVideoFrame = opts.onVideoFrame;

        var prevPos = host.style.position;
        if (!prevPos || prevPos === 'static') host.style.position = 'relative';

        var video = document.createElement('video');
        video.className = 'me8-zlm-primary';
        video.setAttribute('playsinline', 'playsinline');
        video.setAttribute('muted', 'muted');
        video.setAttribute('autoplay', 'autoplay');
        video.muted = true;
        video.autoplay = true;
        video.style.cssText = [
            'position:absolute',
            'left:0',
            'top:0',
            'width:100%',
            'height:100%',
            'object-fit:contain',
            'background:#000',
            'opacity:0',
            'z-index:1',
        ].join(';');
        host.appendChild(video);

        /* MOB-APPLY-MPEGTS-AUDIO-DROP-AND-MUTED \u2014 PCMA in FLV crashes MSE; drop audio track. */
        var player = mpegts.createPlayer({
            type: 'flv',
            isLive: true,
            url: url,
            hasAudio: false,
            hasVideo: true,
            withCredentials: true,
        }, {
            enableWorker: false,
            lazyLoad: false,
            liveBufferLatencyChasing: false,
        });
        player.attachMediaElement(video);

        var settled = false;
        var attaching = true;
        var proveTimer = null;
        var failTimer = null;
        var lastFrameTime = 0;

        function cleanup() {
            if (proveTimer) {
                clearTimeout(proveTimer);
                proveTimer = null;
            }
            if (failTimer) {
                clearTimeout(failTimer);
                failTimer = null;
            }
            try { player.pause(); } catch (_) { /* ignore */ }
            try { player.unload(); } catch (_) { /* ignore */ }
            try { player.detachMediaElement(); } catch (_) { /* ignore */ }
            try { player.destroy(); } catch (_) { /* ignore */ }
            try {
                if (video.parentNode) video.parentNode.removeChild(video);
            } catch (_) { /* ignore */ }
        }

        function fail(reason) {
            if (settled) return;
            settled = true;
            attaching = false;
            cleanup();
            console.log('[me8-flv] attach fail', { url: url, reason: reason || 'zlm_fail' });
            if (typeof onFail === 'function') onFail(reason || 'zlm_fail');
        }

        function prove() {
            if (settled) return;
            settled = true;
            attaching = false;
            if (proveTimer) {
                clearTimeout(proveTimer);
                proveTimer = null;
            }
            if (failTimer) {
                clearTimeout(failTimer);
                failTimer = null;
            }
            video.style.opacity = '1';
            console.log('[me8-flv] attach ok', { url: url });
            if (typeof onProven === 'function') onProven();
        }

        function armProve() {
            if (settled || proveTimer) return;
            proveTimer = setTimeout(function () {
                proveTimer = null;
                if (settled) return;
                if (video.readyState >= 2 && !video.paused) prove();
                else fail('zlm_not_stable');
            }, proveMs);
        }

        player.on(mpegts.Events.ERROR, function () {
            fail('zlm_player_error');
        });
        video.addEventListener('playing', armProve);
        video.addEventListener('timeupdate', function () {
            if (!settled && video.currentTime > 0.05) armProve();
            if (settled && typeof onVideoFrame === 'function') {
                var t = video.currentTime;
                if (t !== lastFrameTime) {
                    lastFrameTime = t;
                    onVideoFrame();
                }
            }
        });

        failTimer = setTimeout(function () {
            fail('zlm_prove_timeout');
        }, typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 10000);

        player.load();
        var playP = player.play();
        if (playP && typeof playP.catch === 'function') {
            playP.catch(function () { fail('zlm_play_reject'); });
        }

        return {
            engine: 'zlm',
            video: video,
            wvpHandoffAttaching: true,
            isHandoffAttaching: function () { return attaching && !settled; },
            destroy: function () {
                settled = true;
                attaching = false;
                cleanup();
            },
        };
    }

    function createJsmpegPlayer(desc, opts) {
        var canvas = opts && opts.canvas;
        var onVideoDecode = opts && opts.onVideoDecode;
        var wsUrl = (desc && desc.wsUrl) || (opts && opts.wsUrl);
        if (!canvas || !wsUrl || typeof JSMpeg === 'undefined') return null;
        var player = new JSMpeg.Player(wsUrl, {
            canvas: canvas,
            audio: false,
            pauseWhenHidden: false,
            disableGl: true,
            onVideoDecode: onVideoDecode,
        });
        return {
            engine: 'ffmpeg',
            destroy: function () {
                try { player.destroy(); } catch (_) { /* ignore */ }
            },
        };
    }

    global.Me8LivePlayerFactory = {
        fetchDescriptor: fetchDescriptor,
        fetchDescriptorPreferZlm: fetchDescriptorPreferZlm,
        softAttachZlmOverlay: softAttachZlmOverlay,
        attachFlvPrimary: attachFlvPrimary,
        createJsmpegPlayer: createJsmpegPlayer,
        absolutizeUrl: absolutizeUrl,
    };
})(typeof window !== 'undefined' ? window : this);
