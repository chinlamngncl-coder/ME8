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
        if (!el) return;
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    function stopSample() {
        if (sampleTimer) {
            clearInterval(sampleTimer);
            sampleTimer = null;
        }
        if (videoEl && (videoEl.paused || videoEl.ended)) {
            var el = document.getElementById('ax-anpr-offline-status');
            if (el && /Matching/i.test(el.textContent || '')) status('');
        }
    }

    function canvasJpegBlob(video) {
        return new Promise(function (resolve, reject) {
            try {
                var vw = video.videoWidth || 640;
                var vh = video.videoHeight || 360;
                if (vw < 8 || vh < 8) {
                    reject(new Error('no_frame'));
                    return;
                }
                var scale = vw > 1280 ? (1280 / vw) : 1;
                var c = document.createElement('canvas');
                c.width = Math.max(8, Math.round(vw * scale));
                c.height = Math.max(8, Math.round(vh * scale));
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
        /* DATA FIREWALL — Offline tab only accepts source offline */
        var incomingSrc = String(data.source || 'offline').toLowerCase();
        if (incomingSrc === 'live' || incomingSrc !== 'offline') return;
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
            isWatchlistHit: !!(listMatch && (listMatch.id || listMatch.listStatus)),
            trackId: 'off-' + (plateCompact || seqLocal),
            seq: seqLocal,
            motion: 'Stationary',
            source: 'offline',
            isLive: false,
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
        if (!videoEl || videoEl.paused || videoEl.ended) return;
        if (busy) return;
        busy = true;
        var whenIso = new Date().toISOString();
        canvasJpegBlob(videoEl)
            .then(function (blob) {
                var fd = new FormData();
                fd.append('photo', blob, 'offline-frame.jpg');
                fd.append('ocrPath', 'fast');
                return fetch('/api/analytics/anpr/read', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: fd,
                });
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                pushFromRead(data, whenIso);
            })
            .catch(function (err) {
                try { console.warn('[anpr-offline] sample fail', err); } catch (_) { /* ignore */ }
            })
            .then(function () { busy = false; });
    }

    function startSample() {
        stopSample();
        status(tr('analytics.anpr.offlineMatching', 'Matching...'));
        sampleTimer = setInterval(sampleOnce, SAMPLE_MS);
        sampleOnce();
    }

    function loadFile(file) {
        if (!file) return;
        if (!videoEl) videoEl = document.getElementById('ax-anpr-offline-video');
        var zone = document.getElementById('ax-anpr-offline-dropzone');
        var name = String(file.name || '').toLowerCase();
        var isImg = /^image\//i.test(file.type || '') || /\.(jpe?g|png|webp|bmp)$/i.test(name);
        if (isImg) {
            if (global.AnprImageInvestigation && typeof AnprImageInvestigation.setMode === 'function') {
                AnprImageInvestigation.setMode('image');
            }
            if (global.AnprImageInvestigation && typeof AnprImageInvestigation.loadFromFile === 'function') {
                AnprImageInvestigation.loadFromFile(file);
            }
            return;
        }
        if (global.AnprImageInvestigation && typeof AnprImageInvestigation.setMode === 'function') {
            AnprImageInvestigation.setMode('video');
        }
        if (!/\.(mp4|avi|webm|mov)$/.test(name) && !(file.type || '').startsWith('video/')) {
            status(tr('analytics.anpr.offlineBadFile', 'Use .mp4 or .avi video'));
            return;
        }
        if (!videoEl) return;
        stopSample();
        var url = URL.createObjectURL(file);
        videoEl.src = url;
        videoEl.hidden = false;
        var empty = zone && zone.querySelector('.ax-anpr-offline-empty');
        if (empty) empty.hidden = true;
        status(tr('analytics.anpr.offlineReady', 'Video loaded — press play to analyze'));
        try { videoEl.load(); } catch (_) { /* ignore */ }
    }

    function loadFromEvidence(fileId) {
        var id = String(fileId || '').trim();
        if (!id) return;
        fetch('/api/evidence/preview/' + encodeURIComponent(id), { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('load_failed');
                return r.blob().then(function (blob) {
                    var name = id.split(/[/\\]/).pop() || 'triage-offline';
                    var type = blob.type || 'application/octet-stream';
                    loadFile(new File([blob], name, { type: type }));
                });
            })
            .catch(function () {
                status(tr('analytics.anpr.offlineBadFile', 'Use .mp4 or .avi video'));
            });
    }

    function bind() {
        var zone = document.getElementById('ax-anpr-offline-dropzone');
        var input = document.getElementById('ax-anpr-offline-file');
        videoEl = document.getElementById('ax-anpr-offline-video');
        if (!zone || !input || !videoEl || zone._anprOfflineBound) return;
        zone._anprOfflineBound = true;

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
        loadFile: loadFile,
        loadFromEvidence: loadFromEvidence,
    };
})(typeof window !== 'undefined' ? window : this);
