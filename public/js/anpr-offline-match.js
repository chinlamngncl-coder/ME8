/**
 * ANPR Offline Match — local .mp4/.avi player samples frames into the same
 * async read path (/api/analytics/anpr/read) and feeds the Live 4×4 rail.
 * Does not rewrite the 3-stage sidecar loop.
 */
(function (global) {
    'use strict';

    var SAMPLE_MS = 1800;
    var videoEl = null;
    var sampleTimer = null;
    var busy = false;
    var seqLocal = 0;
    var lastPlateAt = Object.create(null);

    function tr(key, fallback) {
        try {
            if (global.i18n && typeof global.i18n.t === 'function') {
                var v = global.i18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback || key;
    }

    function status(msg) {
        var el = document.getElementById('ax-anpr-offline-status');
        if (el) el.textContent = msg || '';
    }

    function stopSample() {
        if (sampleTimer) {
            clearInterval(sampleTimer);
            sampleTimer = null;
        }
    }

    function canvasJpegBlob(video) {
        return new Promise(function (resolve, reject) {
            try {
                var c = document.createElement('canvas');
                c.width = video.videoWidth || 640;
                c.height = video.videoHeight || 360;
                if (c.width < 8 || c.height < 8) {
                    reject(new Error('no_frame'));
                    return;
                }
                var ctx = c.getContext('2d');
                ctx.drawImage(video, 0, 0, c.width, c.height);
                c.toBlob(function (blob) {
                    if (!blob) reject(new Error('blob_fail'));
                    else resolve(blob);
                }, 'image/jpeg', 0.85);
            } catch (err) {
                reject(err);
            }
        });
    }

    function pushFromRead(data, whenIso) {
        if (!data || !global.AnprLiveWatch || typeof AnprLiveWatch.pushRail !== 'function') return;
        var vehicleUrl = null;
        var cropUrl = null;
        if (data.vehicleJpegB64) {
            vehicleUrl = 'data:image/jpeg;base64,' + String(data.vehicleJpegB64).replace(/^data:image\/\w+;base64,/, '');
        }
        if (data.cropJpegB64) {
            cropUrl = 'data:image/jpeg;base64,' + String(data.cropJpegB64).replace(/^data:image\/\w+;base64,/, '');
        }
        if (!vehicleUrl && !data.plate) return;
        var mmr = data.mmr || null;
        var listMatch = data.listMatch || (data.match && data.match.match) || null;
        if (listMatch && listMatch.match) listMatch = listMatch.match;
        seqLocal += 1;
        var plateCompact = data.plateCompact || data.plate || '';
        if (plateCompact) {
            var prev = lastPlateAt[plateCompact] || 0;
            if (Date.now() - prev < 8000) return;
            lastPlateAt[plateCompact] = Date.now();
        }
        var tick = {
            camId: 'offline',
            deviceLabel: tr('analytics.anpr.offlineCam', 'Offline video'),
            at: whenIso || new Date().toISOString(),
            plate: data.plate || null,
            plateCompact: plateCompact || null,
            vehicleUrl: vehicleUrl,
            cropUrl: cropUrl,
            vehicleLabel: data.vehicle && data.vehicle.label,
            make: (mmr && mmr.make) || (data.vehicle && data.vehicle.make) || null,
            model: (mmr && mmr.model) || (data.vehicle && data.vehicle.model) || null,
            color: (mmr && mmr.color) || (data.vehicle && data.vehicle.color) || null,
            mmrText: (mmr && mmr.mmrText) || null,
            mmrMismatch: !!(data.mmrMismatch),
            mmrMismatchDetail: data.mmrMismatchDetail || null,
            listMatch: listMatch,
            listStatus: listMatch && listMatch.listStatus,
            trackId: 'off-' + (plateCompact || seqLocal),
            seq: seqLocal,
            motion: 'Stationary',
            source: 'offline',
        };
        AnprLiveWatch.pushRail(tick);
        try {
            fetch('/api/analytics/anpr/history', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tick),
            }).catch(function () { /* ignore */ });
        } catch (_) { /* ignore */ }
    }

    function sampleOnce() {
        if (busy || !videoEl || videoEl.paused || videoEl.ended) return;
        busy = true;
        var whenIso = new Date().toISOString();
        canvasJpegBlob(videoEl)
            .then(function (blob) {
                var fd = new FormData();
                fd.append('photo', blob, 'offline-frame.jpg');
                return fetch('/api/analytics/anpr/read', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: fd,
                });
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                /* Status line stays quiet during sampling (no Sampled @ Xs jargon) */
                if (data && data.ok && data.plate) {
                    status(tr('analytics.anpr.offlineHit', 'Plate matched') + ': ' + String(data.plate));
                    var st = document.getElementById('ax-anpr-offline-status');
                    if (st) st.hidden = false;
                } else if (data && (data.error === 'ocr_exception' || data.error === 'engine_missing')) {
                    status(tr('analytics.anpr.offlineOcrErr', 'OCR error') + ': ' +
                        String(data.message || data.error || '').slice(0, 120));
                    var stErr = document.getElementById('ax-anpr-offline-status');
                    if (stErr) stErr.hidden = false;
                    try { console.warn('[anpr-offline] OCR fail', data); } catch (_) { /* ignore */ }
                }
                pushFromRead(data, whenIso);
            })
            .catch(function (err) {
                try { console.warn('[anpr-offline] sample fail', err); } catch (_) { /* ignore */ }
            })
            .then(function () { busy = false; });
    }

    function startSample() {
        stopSample();
        sampleTimer = setInterval(sampleOnce, SAMPLE_MS);
        sampleOnce();
    }

    function bind() {
        var zone = document.getElementById('ax-anpr-offline-dropzone');
        var input = document.getElementById('ax-anpr-offline-file');
        videoEl = document.getElementById('ax-anpr-offline-video');
        if (!zone || !input || !videoEl || zone._anprOfflineBound) return;
        zone._anprOfflineBound = true;

        function loadFile(file) {
            if (!file) return;
            var name = String(file.name || '').toLowerCase();
            if (!/\.(mp4|avi|webm|mov)$/.test(name) && !(file.type || '').startsWith('video/')) {
                status(tr('analytics.anpr.offlineBadFile', 'Use .mp4 or .avi video'));
                return;
            }
            stopSample();
            var url = URL.createObjectURL(file);
            videoEl.src = url;
            videoEl.hidden = false;
            var empty = zone.querySelector('.ax-anpr-offline-empty');
            if (empty) empty.hidden = true;
            status(tr('analytics.anpr.offlineReady', 'Video loaded — press play to analyze'));
            try { videoEl.load(); } catch (_) { /* ignore */ }
        }

        input.addEventListener('change', function () {
            loadFile(input.files && input.files[0]);
        });
        zone.addEventListener('dragover', function (ev) {
            ev.preventDefault();
            zone.classList.add('is-drag');
        });
        zone.addEventListener('dragleave', function () {
            zone.classList.remove('is-drag');
        });
        zone.addEventListener('drop', function (ev) {
            ev.preventDefault();
            zone.classList.remove('is-drag');
            var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
            loadFile(f);
        });
        videoEl.addEventListener('play', startSample);
        videoEl.addEventListener('pause', stopSample);
        videoEl.addEventListener('ended', stopSample);
    }

    function onShow() {
        bind();
        status(tr('analytics.anpr.uploadVideo', 'Upload Video'));
        var st0 = document.getElementById('ax-anpr-offline-status');
        if (st0) st0.hidden = true;
    }

    function onHide() {
        stopSample();
        if (videoEl && !videoEl.paused) {
            try { videoEl.pause(); } catch (_) { /* ignore */ }
        }
    }

    global.AnprOfflineMatch = {
        onShow: onShow,
        onHide: onHide,
    };
})(typeof window !== 'undefined' ? window : this);
