/**
 * ANPR Offline Match — Image Investigation hub (manual upload + FTP inbox stub).
 * Scaffold only: Run Scan POSTs stubbed until backend /api is APPLYed.
 */
(function (global) {
    'use strict';

    /** @type {{ source: string, name: string, previewUrl: string, file?: File, ftpPath?: string, ftpId?: string }|null} */
    var selectedImage = null;
    var isScanning = false;
    /** @type {Array<{ id?: string, name?: string, url?: string, path?: string, mtime?: string }>} */
    var ftpInbox = [];
    var bound = false;
    var mode = 'video';

    function tr(key, fallback) {
        try {
            if (global.i18n && typeof global.i18n.t === 'function') {
                var v = global.i18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback || key;
    }

    function el(id) {
        return document.getElementById(id);
    }

    function setMode(next) {
        mode = next === 'image' ? 'image' : 'video';
        var videoView = el('ax-anpr-offline-video-view');
        var imageView = el('ax-anpr-offline-image-view');
        if (videoView) videoView.hidden = mode !== 'video';
        if (imageView) imageView.hidden = mode !== 'image';
        document.querySelectorAll('.ax-anpr-offline-mode-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-offline-mode') === mode);
        });
        if (mode === 'image') {
            loadFtpInbox();
            syncScanUi();
        } else if (global.AnprOfflineMatch && typeof AnprOfflineMatch.onShow === 'function') {
            /* keep video bindings warm when returning to video mode */
            try { AnprOfflineMatch.onShow(); } catch (_) { /* ignore */ }
        }
        if (mode === 'image' && global.AnprOfflineMatch && typeof AnprOfflineMatch.onHide === 'function') {
            try { AnprOfflineMatch.onHide(); } catch (_) { /* ignore */ }
        }
    }

    function revokePreview() {
        if (selectedImage && selectedImage.previewUrl && String(selectedImage.previewUrl).indexOf('blob:') === 0) {
            try { URL.revokeObjectURL(selectedImage.previewUrl); } catch (_) { /* ignore */ }
        }
    }

    function syncScanUi() {
        var runBtn = el('ax-anpr-image-run-scan');
        var clearBtn = el('ax-anpr-image-clear');
        var spinner = el('ax-anpr-image-scan-spinner');
        var status = el('ax-anpr-image-scan-status');
        var meta = el('ax-anpr-image-selected-meta');
        var preview = el('ax-anpr-image-preview');
        var empty = el('ax-anpr-image-drop-empty');
        var has = !!selectedImage;
        if (runBtn) runBtn.disabled = !has || isScanning;
        if (clearBtn) clearBtn.disabled = !has || isScanning;
        if (spinner) {
            spinner.hidden = !isScanning;
            spinner.setAttribute('aria-hidden', isScanning ? 'false' : 'true');
        }
        if (status) {
            status.textContent = isScanning
                ? tr('analytics.anpr.imageScanning', 'Scanning…')
                : (has ? '' : tr('analytics.anpr.imageSelectFirst', 'Select an image to enable analysis'));
        }
        if (meta) {
            meta.textContent = has
                ? ((selectedImage.source === 'ftp' ? 'FTP: ' : 'Upload: ') + (selectedImage.name || 'image'))
                : '';
        }
        if (preview) {
            if (has && selectedImage.previewUrl) {
                preview.src = selectedImage.previewUrl;
                preview.hidden = false;
            } else {
                preview.removeAttribute('src');
                preview.hidden = true;
            }
        }
        if (empty) empty.hidden = !!(has && selectedImage && selectedImage.previewUrl);
        document.querySelectorAll('.ax-anpr-image-ftp-card').forEach(function (card) {
            var id = card.getAttribute('data-ftp-id') || '';
            var active = !!(selectedImage && selectedImage.source === 'ftp'
                && String(selectedImage.ftpId || selectedImage.name) === id);
            card.classList.toggle('is-selected', active);
        });
    }

    function setSelectedFromFile(file) {
        if (!file || !/^image\//i.test(file.type || '') && !/\.(jpe?g|png|webp|bmp)$/i.test(file.name || '')) {
            return;
        }
        revokePreview();
        selectedImage = {
            source: 'upload',
            name: file.name || 'upload.jpg',
            file: file,
            previewUrl: URL.createObjectURL(file),
        };
        var resultBox = el('ax-anpr-image-scan-result');
        if (resultBox) resultBox.hidden = true;
        syncScanUi();
    }

    function setSelectedFromFtp(item) {
        if (!item) return;
        revokePreview();
        selectedImage = {
            source: 'ftp',
            name: item.name || item.path || 'ftp-image',
            ftpPath: item.path || item.url || '',
            ftpId: String(item.id || item.name || item.path || ''),
            previewUrl: item.url || item.thumbUrl || '',
        };
        var resultBox = el('ax-anpr-image-scan-result');
        if (resultBox) resultBox.hidden = true;
        syncScanUi();
    }

    function clearSelection() {
        revokePreview();
        selectedImage = null;
        var resultBox = el('ax-anpr-image-scan-result');
        var jsonEl = el('ax-anpr-image-scan-json');
        if (resultBox) resultBox.hidden = true;
        if (jsonEl) jsonEl.textContent = '';
        var fileInput = el('ax-anpr-image-file');
        if (fileInput) fileInput.value = '';
        syncScanUi();
    }

    function paintFtpGrid() {
        var grid = el('ax-anpr-image-ftp-grid');
        if (!grid) return;
        if (!ftpInbox.length) {
            grid.innerHTML = '<div class="ax-anpr-image-ftp-empty">' +
                tr('analytics.anpr.imageFtpEmpty', 'No inbox files yet') + '</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < ftpInbox.length; i++) {
            var it = ftpInbox[i] || {};
            var id = String(it.id || it.name || it.path || i);
            var name = it.name || it.path || ('file-' + i);
            var url = it.url || it.thumbUrl || '';
            var thumb = url
                ? ('<img src="' + String(url).replace(/"/g, '&quot;') + '" alt="" loading="lazy">')
                : '<span class="ax-anpr-image-ftp-ph">JPG</span>';
            html += '<button type="button" class="ax-anpr-image-ftp-card" role="listitem" data-ftp-id="' +
                id.replace(/"/g, '') + '" data-ftp-idx="' + i + '" title="' +
                String(name).replace(/"/g, '&quot;') + '">' +
                '<span class="ax-anpr-image-ftp-thumb">' + thumb + '</span>' +
                '<span class="ax-anpr-image-ftp-name">' + String(name).replace(/</g, '&lt;') + '</span>' +
                '</button>';
        }
        grid.innerHTML = html;
        syncScanUi();
    }

    function loadFtpInbox() {
        var grid = el('ax-anpr-image-ftp-grid');
        if (grid) {
            grid.innerHTML = '<div class="ax-anpr-image-ftp-empty">' +
                tr('analytics.anpr.imageFtpLoading', 'Loading inbox…') + '</div>';
        }
        fetch('/api/ftp-inbox', { credentials: 'same-origin' })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return { ok: r.ok, status: r.status, body: body };
                });
            })
            .then(function (res) {
                var body = res.body || {};
                var list = Array.isArray(body.files) ? body.files
                    : (Array.isArray(body.items) ? body.items
                        : (Array.isArray(body) ? body : []));
                if (!res.ok) {
                    ftpInbox = [];
                    if (grid) {
                        grid.innerHTML = '<div class="ax-anpr-image-ftp-empty">' +
                            tr('analytics.anpr.imageFtpStub', 'FTP inbox API not ready yet') +
                            ' (' + (body.error || res.status || 'stub') + ')</div>';
                    }
                    return;
                }
                ftpInbox = list;
                paintFtpGrid();
            })
            .catch(function () {
                ftpInbox = [];
                if (grid) {
                    grid.innerHTML = '<div class="ax-anpr-image-ftp-empty">' +
                        tr('analytics.anpr.imageFtpStub', 'FTP inbox API not ready yet') + '</div>';
                }
            });
    }

    /**
     * Stub — will POST image to Node → ANPR/FR sidecars in a later APPLY.
     * @param {{ source: string, name: string, file?: File, ftpPath?: string }} image
     */
    function handleRunScan(image) {
        if (!image || isScanning) return;
        isScanning = true;
        syncScanUi();
        var resultBox = el('ax-anpr-image-scan-result');
        var jsonEl = el('ax-anpr-image-scan-json');

        /* Scaffold: simulate async scan; replace with real FormData POST later */
        var stubPayload = {
            ok: false,
            stub: true,
            message: 'Scan endpoint not wired yet — POST /api/analytics/anpr/image-scan (pending APPLY)',
            source: image.source,
            name: image.name,
            ftpPath: image.ftpPath || null,
            plateText: null,
            frMatch: null,
        };

        var finish = function (payload) {
            isScanning = false;
            syncScanUi();
            if (resultBox) resultBox.hidden = false;
            if (jsonEl) {
                try {
                    jsonEl.textContent = JSON.stringify(payload, null, 2);
                } catch (_) {
                    jsonEl.textContent = String(payload);
                }
            }
        };

        /* Prefer real endpoint when present; fall back to stub JSON */
        var fd = new FormData();
        fd.append('source', image.source || 'upload');
        if (image.file) fd.append('image', image.file, image.name || 'scan.jpg');
        if (image.ftpPath) fd.append('ftpPath', image.ftpPath);

        fetch('/api/analytics/anpr/image-scan', {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
        })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return { okHttp: r.ok, status: r.status, body: body };
                });
            })
            .then(function (res) {
                if (res.okHttp && res.body && typeof res.body === 'object') {
                    finish(res.body);
                    return;
                }
                stubPayload.httpStatus = res.status;
                stubPayload.server = res.body || null;
                finish(stubPayload);
            })
            .catch(function () {
                finish(stubPayload);
            });
    }

    function bindDropzone() {
        var zone = el('ax-anpr-image-dropzone');
        var input = el('ax-anpr-image-file');
        if (!zone || !input || zone._axImageInvestBound) return;
        zone._axImageInvestBound = true;

        zone.addEventListener('click', function () {
            if (!isScanning) input.click();
        });
        zone.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                if (!isScanning) input.click();
            }
        });
        input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            if (f) setSelectedFromFile(f);
        });
        ['dragenter', 'dragover'].forEach(function (evt) {
            zone.addEventListener(evt, function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                zone.classList.add('is-drag');
            });
        });
        ['dragleave', 'drop'].forEach(function (evt) {
            zone.addEventListener(evt, function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                zone.classList.remove('is-drag');
            });
        });
        zone.addEventListener('drop', function (ev) {
            var dt = ev.dataTransfer;
            var f = dt && dt.files && dt.files[0];
            if (f) setSelectedFromFile(f);
        });
    }

    function bind() {
        if (bound) return;
        bound = true;
        bindDropzone();
        document.querySelectorAll('.ax-anpr-offline-mode-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setMode(btn.getAttribute('data-offline-mode'));
            });
        });
        var runBtn = el('ax-anpr-image-run-scan');
        if (runBtn) {
            runBtn.addEventListener('click', function () {
                if (selectedImage) handleRunScan(selectedImage);
            });
        }
        var clearBtn = el('ax-anpr-image-clear');
        if (clearBtn) clearBtn.addEventListener('click', clearSelection);
        var refreshBtn = el('ax-anpr-image-inbox-refresh');
        if (refreshBtn) refreshBtn.addEventListener('click', loadFtpInbox);
        var grid = el('ax-anpr-image-ftp-grid');
        if (grid) {
            grid.addEventListener('click', function (ev) {
                var card = ev.target && ev.target.closest ? ev.target.closest('.ax-anpr-image-ftp-card') : null;
                if (!card) return;
                var idx = parseInt(card.getAttribute('data-ftp-idx') || '-1', 10);
                if (idx >= 0 && ftpInbox[idx]) setSelectedFromFtp(ftpInbox[idx]);
            });
        }
        syncScanUi();
    }

    function onShow() {
        bind();
        setMode(mode || 'video');
        if (mode === 'image') loadFtpInbox();
    }

    function onHide() {
        isScanning = false;
        syncScanUi();
    }

    global.AnprImageInvestigation = {
        onShow: onShow,
        onHide: onHide,
        setMode: setMode,
        handleRunScan: handleRunScan,
        setSelectedFromFile: setSelectedFromFile,
        loadFromFile: setSelectedFromFile,
        getSelectedImage: function () { return selectedImage; },
        get isScanning() { return isScanning; },
    };
})(typeof window !== 'undefined' ? window : this);
