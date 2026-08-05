/**
 * Analytics Face \u2014 Load offline video \u2192 sample \u2192 crop rail (same probe path as live).
 */
(function (global) {
    var pollTimer = null;
    var busy = false;
    var previewUrl = null;

    function tr(key, fallback, vars) {
        var s = fallback || key;
        if (typeof I18n !== 'undefined' && I18n.t) {
            var v = I18n.t(key, vars);
            if (v && v !== key) s = v;
        }
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
            });
        }
        return s;
    }

    function statusEl() {
        return document.getElementById('ax-fr-offline-status');
    }

    function videoEl() {
        return document.getElementById('ax-fr-offline-video');
    }

    function clearPreview() {
        var v = videoEl();
        if (v) {
            try { v.pause(); } catch (_) { /* ignore */ }
            v.removeAttribute('src');
            try { v.load(); } catch (_) { /* ignore */ }
        }
        if (previewUrl) {
            try { URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
            previewUrl = null;
        }
    }

    function setLocalPreview(file) {
        clearPreview();
        if (!file) return;
        var v = videoEl();
        if (!v) return;
        previewUrl = URL.createObjectURL(file);
        v.src = previewUrl;
        var vidEl = document.getElementById('ax-fr-offline-video');
        if (vidEl) {
            vidEl.controls = true;
            vidEl.setAttribute('controls', '');
            vidEl.style.pointerEvents = 'auto';
        }
        try { v.play().catch(function () { /* ignore autoplay */ }); } catch (_) { /* ignore */ }
    }

    function setStatus(text, cls) {
        var el = statusEl();
        if (!el) return;
        el.textContent = text || '';
        el.className = 'hint ax-fr-offline-status' + (cls ? ' ' + cls : '');
        el.hidden = !text;
    }

    function setBusy(on) {
        busy = !!on;
        var btn = document.getElementById('ax-fr-load-video');
        if (btn) btn.disabled = busy;
    }

    function stopPoll() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function applyJob(job) {
        if (!job) {
            setBusy(false);
            return;
        }
        var running = job.status === 'queued' || job.status === 'extracting' || job.status === 'probing';
        setBusy(running);
        if (job.status === 'error') {
            setStatus(job.message || tr('analytics.fr.offlineFail', 'Offline video failed.'), 'is-err');
            stopPoll();
            return;
        }
        if (job.status === 'cancelled') {
            setStatus(tr('analytics.fr.offlineCancelled', 'Offline video cancelled.'), '');
            stopPoll();
            return;
        }
        if (job.status === 'done') {
            setStatus(job.message || tr('analytics.fr.offlineDone', 'Offline video done.'), 'is-ok');
            stopPoll();
            return;
        }
        var prog = '';
        if (job.framesTotal > 0) {
            prog = ' (' + (job.framesDone || 0) + '/' + job.framesTotal + ')';
        }
        setStatus((job.message || tr('analytics.fr.offlineWorking', 'Processing video\u2026')) + prog, '');
    }

    function pollStatus() {
        fetch('/api/analytics/fr/offline-video/status', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                applyJob(data && data.job);
            })
            .catch(function () { /* ignore */ });
    }

    function startPoll() {
        stopPoll();
        pollTimer = setInterval(pollStatus, 1200);
        pollStatus();
    }

    function cancelJob() {
        fetch('/api/analytics/fr/offline-video/cancel', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                applyJob(data && data.job);
                startPoll();
            })
            .catch(function () {
                setStatus(tr('analytics.fr.offlineFail', 'Offline video failed.'), 'is-err');
            });
    }

    function uploadFile(file) {
        if (!file || busy) return;
        setLocalPreview(file);
        var fd = new FormData();
        fd.append('video', file);
        setBusy(true);
        setStatus(tr('analytics.fr.offlineUploading', 'Uploading video\u2026'), '');
        fetch('/api/analytics/fr/offline-video', {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
        })
            .then(function (r) {
                return r.json().then(function (data) {
                    return { okHttp: r.ok, data: data };
                });
            })
            .then(function (pack) {
                var data = pack.data || {};
                if (!pack.okHttp || !data.ok) {
                    setBusy(false);
                    setStatus(data.message || tr('analytics.fr.offlineFail', 'Offline video failed.'), 'is-err');
                    return;
                }
                applyJob(data.job);
                startPoll();
            })
            .catch(function () {
                setBusy(false);
                setStatus(tr('analytics.fr.offlineFail', 'Offline video failed.'), 'is-err');
            });
    }

    function onPick() {
        var input = document.getElementById('ax-fr-offline-file');
        if (!input) return;
        input.value = '';
        input.click();
    }

    function syncScrub() {
        var v = videoEl();
        var scrub = document.getElementById('ax-fr-offline-scrub');
        if (!v || !scrub) return;
        var dur = v.duration;
        if (!dur || !isFinite(dur) || dur <= 0) {
            scrub.value = '0';
            return;
        }
        scrub.value = String(Math.round((v.currentTime / dur) * 1000));
    }

    function bindTransport() {
        var v = videoEl();
        var playBtn = document.getElementById('ax-fr-offline-play');
        var pauseBtn = document.getElementById('ax-fr-offline-pause');
        var stopBtn = document.getElementById('ax-fr-offline-stop');
        var scrub = document.getElementById('ax-fr-offline-scrub');
        if (v) {
            v.controls = true;
            v.setAttribute('controls', '');
            v.style.pointerEvents = 'auto';
            v.addEventListener('timeupdate', syncScrub);
            v.addEventListener('loadedmetadata', syncScrub);
        }
        if (playBtn) {
            playBtn.addEventListener('click', function () {
                var el = videoEl();
                if (!el || !el.src) return;
                try { el.play().catch(function () { /* ignore */ }); } catch (_) { /* ignore */ }
            });
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function () {
                var el = videoEl();
                if (!el) return;
                try { el.pause(); } catch (_) { /* ignore */ }
            });
        }
        if (stopBtn) {
            stopBtn.addEventListener('click', function () {
                var el = videoEl();
                if (!el) return;
                try { el.pause(); } catch (_) { /* ignore */ }
                try { el.currentTime = 0; } catch (_) { /* ignore */ }
                syncScrub();
            });
        }
        if (scrub) {
            scrub.addEventListener('input', function () {
                var el = videoEl();
                if (!el) return;
                var dur = el.duration;
                if (!dur || !isFinite(dur) || dur <= 0) return;
                el.currentTime = (Number(scrub.value) / 1000) * dur;
            });
        }
    }

    function bindUi() {
        bindTransport();
        var btn = document.getElementById('ax-fr-load-video');
        var input = document.getElementById('ax-fr-offline-file');
        if (btn) {
            btn.disabled = false;
            btn.addEventListener('click', onPick);
        }
        if (input) {
            input.addEventListener('change', function () {
                var f = input.files && input.files[0];
                if (f) uploadFile(f);
            });
        }
    }

    global.FrOfflineVideo = {
        bindUi: bindUi,
        cancel: cancelJob,
    };
})(window);
