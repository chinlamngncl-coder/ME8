/**
 * Analytics Face — Load offline video → sample → crop rail (same probe path as live).
 */
(function (global) {
    var pollTimer = null;
    var busy = false;

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
        var cancel = document.getElementById('ax-fr-offline-cancel');
        if (btn) btn.disabled = busy;
        if (cancel) cancel.hidden = !busy;
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
        setStatus((job.message || tr('analytics.fr.offlineWorking', 'Processing video…')) + prog, '');
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
        var fd = new FormData();
        fd.append('video', file);
        setBusy(true);
        setStatus(tr('analytics.fr.offlineUploading', 'Uploading video…'), '');
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

    function bindUi() {
        var btn = document.getElementById('ax-fr-load-video');
        var input = document.getElementById('ax-fr-offline-file');
        var cancel = document.getElementById('ax-fr-offline-cancel');
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
        if (cancel) {
            cancel.addEventListener('click', cancelJob);
        }
    }

    global.FrOfflineVideo = {
        bindUi: bindUi,
        cancel: cancelJob,
    };
})(window);
