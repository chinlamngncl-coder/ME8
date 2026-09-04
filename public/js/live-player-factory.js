/**
 * Live player factory — Gate D + UNIFIED AXIOM STREAM ENGINE adapter.
 * Soft ZLM overlay never wipes JSMpeg host. Primary FLV via AxiomFlvManager
 * (lab-proven soft-chase 1.5s/1.12x/10s, detach hygiene, dense-grid substream option).
 */
(function (global) {
    'use strict';

    function absolutizeUrl(url) {
        if (global.AxiomFlvManager && typeof global.AxiomFlvManager.absolutizeUrl === 'function') {
            return global.AxiomFlvManager.absolutizeUrl(url);
        }
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

    function objectFitCssForHost(host) {
        try {
            if (host && host.closest && (
                host.closest('.cw-cell-stage')
                || host.closest('#cw-wall')
                || host.closest('#app-view-command-wall')
                || host.closest('.cell-stage')
            )) {
                return 'object-fit:cover';
            }
        } catch (_) { /* ignore */ }
        return 'object-fit:contain';
    }

    function axiomAttach(video, flvUrl, attachOpts) {
        if (!global.AxiomFlvManager || typeof global.AxiomFlvManager.attach !== 'function') {
            console.log('[me8-flv] attach fail', { reason: 'axiom_flv_missing' });
            return null;
        }
        return global.AxiomFlvManager.attach(video, flvUrl, attachOpts || {});
    }

    /**
     * Soft ZLM overlay — does NOT clear host. JSMpeg canvas stays.
     */
    function softAttachZlmOverlay(host, desc, opts) {
        opts = opts || {};
        if (!host || !desc || !desc.flvUrl) return null;

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
            objectFitCssForHost(host),
            'background:#000',
            'opacity:0',
            'pointer-events:none',
            'z-index:2',
        ].join(';');
        host.appendChild(video);

        var settled = false;
        var proveTimer = null;
        var failTimer = null;

        function cleanupOverlayOnly() {
            if (proveTimer) { clearTimeout(proveTimer); proveTimer = null; }
            if (failTimer) { clearTimeout(failTimer); failTimer = null; }
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(video);
            } catch (_) { /* ignore */ }
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
            if (proveTimer) { clearTimeout(proveTimer); proveTimer = null; }
            if (failTimer) { clearTimeout(failTimer); failTimer = null; }
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

        var handle = axiomAttach(video, flvUrl, {
            withCredentials: true,
            pauseWhenHidden: true,
            gridCount: opts.gridCount,
            preferSubstream: opts.preferSubstream,
            focusUpgrade: opts.focusUpgrade,
            quality: opts.quality,
            onError: function () { fail('zlm_player_error'); },
        });
        if (!handle) {
            fail('axiom_attach_null');
            return null;
        }

        video.addEventListener('playing', armProve);
        video.addEventListener('timeupdate', function () {
            if (!settled && video.currentTime > 0.05) armProve();
        });

        failTimer = setTimeout(function () {
            fail('zlm_prove_timeout');
        }, typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 8000);

        return {
            engine: 'zlm',
            video: video,
            destroy: function () {
                settled = true;
                cleanupOverlayOnly();
            },
        };
    }

    /**
     * Primary FLV — all panels (Ops / FR / ANPR / Tactical / CW) via AxiomFlvManager.
     */
    function attachFlvPrimary(host, flvUrl, opts) {
        opts = opts || {};
        if (!host || !flvUrl) return null;

        var url = absolutizeUrl(flvUrl);
        console.log('[me8-flv] attach start', { url: url });
        var proveMs = typeof opts.proveMs === 'number' ? opts.proveMs : 300;
        var onProven = opts.onProven;
        var onFail = opts.onFail;
        var onStreamLost = opts.onStreamLost;
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
            objectFitCssForHost(host),
            'background:#000',
            'opacity:0',
            'z-index:1',
        ].join(';');
        host.appendChild(video);

        var settled = false;
        var attaching = true;
        var proveTimer = null;
        var failTimer = null;
        var lastFrameTime = 0;
        var onTimeUpdate = null;
        var onEnded = null;

        function cleanup() {
            if (proveTimer) { clearTimeout(proveTimer); proveTimer = null; }
            if (failTimer) { clearTimeout(failTimer); failTimer = null; }
            /* INV-LIVE-REFRESH-AND-CACHE-V1 — listeners off, then detach → pause → unload → remove */
            try { video.removeEventListener('playing', armProve); } catch (_) { /* ignore */ }
            try { if (onTimeUpdate) video.removeEventListener('timeupdate', onTimeUpdate); } catch (_) { /* ignore */ }
            try { if (onEnded) video.removeEventListener('ended', onEnded); } catch (_) { /* ignore */ }
            try {
                if (global.AxiomFlvManager) global.AxiomFlvManager.detach(video);
            } catch (_) { /* ignore */ }
            try { video.pause(); } catch (_) { /* ignore */ }
            try { video.removeAttribute('src'); video.load(); } catch (_) { /* ignore */ }
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
            if (proveTimer) { clearTimeout(proveTimer); proveTimer = null; }
            if (failTimer) { clearTimeout(failTimer); failTimer = null; }
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

        /* Infer dense grid from host when caller did not pass gridCount */
        var gridCount = opts.gridCount;
        if (gridCount == null) {
            try {
                var wall = host.closest && (
                    host.closest('#cw-wall')
                    || host.closest('.cw-wall')
                    || host.closest('#video-wall')
                    || host.closest('.ax-anpr-live-tiles')
                    || host.closest('.ax-fr-tiles')
                );
                if (wall) {
                    var cells = wall.querySelectorAll('video.me8-zlm-primary, .cw-cell, .ax-anpr-live-tile, .ax-fr-tile');
                    gridCount = cells && cells.length ? cells.length : undefined;
                }
            } catch (_) { /* ignore */ }
        }

        var handle = axiomAttach(video, url, {
            withCredentials: true,
            pauseWhenHidden: opts.pauseWhenHidden !== false,
            gridCount: gridCount,
            preferSubstream: opts.preferSubstream,
            focusUpgrade: opts.focusUpgrade === true,
            quality: opts.quality,
            onError: function () {
                if (!settled) {
                    fail('zlm_player_error');
                    return;
                }
                if (typeof onStreamLost === 'function') {
                    try { onStreamLost('zlm_player_error'); } catch (_) { /* ignore */ }
                }
            },
        });
        if (!handle) {
            fail('axiom_attach_null');
            return null;
        }

        /* INV-LIVE-REFRESH-AND-CACHE-V1 — named handlers so cleanup() can remove them; an
           anonymous timeupdate closure kept firing onVideoFrame on a destroyed tile. */
        onTimeUpdate = function () {
            if (!settled && video.currentTime > 0.05) armProve();
            if (settled && typeof onVideoFrame === 'function') {
                var t = video.currentTime;
                if (t !== lastFrameTime) {
                    lastFrameTime = t;
                    onVideoFrame();
                }
            }
        };
        onEnded = function () {
            if (!settled) return;
            if (typeof onStreamLost === 'function') {
                try { onStreamLost('zlm_ended'); } catch (_) { /* ignore */ }
            }
        };
        video.addEventListener('playing', armProve);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('ended', onEnded);

        failTimer = setTimeout(function () {
            fail('zlm_prove_timeout');
        }, typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 10000);

        return {
            engine: 'zlm',
            video: video,
            wvpHandoffAttaching: true,
            axiom: handle,
            isHandoffAttaching: function () { return attaching && !settled; },
            upgradeToMain: function () {
                if (handle && typeof handle.upgradeToMain === 'function') return handle.upgradeToMain();
                return null;
            },
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
