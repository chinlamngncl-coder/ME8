/**
 * Analytics Hub — Face FR: Live shell, Verify 1:1, Watchlist enroll/dossier.
 * Operator-facing copy only — no install/script/port jargon on screen.
 */
(function (global) {
    var currentPanel = 'face';
    var bound = false;
    var blById = {};
    var blDrawerId = null;
    var pendingEnrollFile = null;
    var pendingEnrollPreviewUrl = null;
    var frSettings = { matchThreshold: 75, min: 70, max: 99, canManage: false };
    var pendingThresholdSave = null;
    var pendingRemoveId = null;
    var draftSaveTimer = null;
    var restoringDraft = false;
    var restoredDraftNotice = false;
    var draftDb = null;
    var DRAFT_META_KEY = 'me8.fr.watchlist.draft.v1';
    var DRAFT_DB_NAME = 'me8-fr-watchlist-draft';
    var DRAFT_STORE = 'drafts';
    var DRAFT_CROP_KEY = 'crop';
    var DRAFT_TTL_MS = 12 * 60 * 60 * 1000;
    var facePicker = {
        groups: [],
        lookup: { byDevice: {} },
        fleet: [],
        groupId: '',
        camId: '',
        cropFile: '',
        snaps: [],
        entryId: '',
    };

    function tr(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.t) {
            var s = I18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function frLicensed() {
        return !!(global.LicenseFeatures && LicenseFeatures.isEnabled && LicenseFeatures.isEnabled('fr'));
    }

    function gradeLabel(code) {
        var map = {
            poi: ['analytics.bl.gradePoi', 'Person of interest'],
            monitoring: ['analytics.bl.gradeMonitoring', 'On monitoring'],
            suspect: ['analytics.bl.gradeSuspect', 'Suspect'],
            blacklist: ['analytics.bl.gradeBlacklist', 'Blacklist'],
        };
        var e = map[code] || map.blacklist;
        return tr(e[0], e[1]);
    }

    function reasonLabel(code, other) {
        var map = {
            theft: ['analytics.bl.reasonTheft', 'Theft'],
            assault: ['analytics.bl.reasonAssault', 'Assault / violence'],
            trespass: ['analytics.bl.reasonTrespass', 'Trespass / banned'],
            fraud: ['analytics.bl.reasonFraud', 'Fraud'],
            suspicious: ['analytics.bl.reasonSuspicious', 'Suspicious behaviour'],
            investigation: ['analytics.bl.reasonInvestigation', 'Open investigation'],
            other: ['analytics.bl.reasonOther', 'Other'],
        };
        var e = map[code] || map.other;
        var label = tr(e[0], e[1]);
        if (code === 'other' && other) return label + ': ' + other;
        return label;
    }

    function gradeBadgeHtml(code) {
        var c = code || 'blacklist';
        return '<span class="ax-bl-grade is-' + esc(c) + '">' + esc(gradeLabel(c)) + '</span>';
    }

    function setGate() {
        var gate = document.getElementById('ax-license-gate');
        var body = document.getElementById('ax-hub-body');
        var licensed = frLicensed();
        if (gate) gate.hidden = licensed;
        if (body) body.hidden = !licensed;
        var anprBtn = document.querySelector('.ax-hub-nav-btn[data-panel="anpr"]');
        var weaponBtn = document.querySelector('.ax-hub-nav-btn[data-panel="weapon"]');
        if (anprBtn) {
            var anprOn = !!(global.LicenseFeatures && LicenseFeatures.isEnabled && LicenseFeatures.isEnabled('anpr'));
            anprBtn.disabled = !anprOn;
            anprBtn.title = anprOn ? '' : tr('analytics.moduleNotLicensed', 'Module not licensed');
        }
        if (weaponBtn) {
            weaponBtn.disabled = true;
            weaponBtn.title = tr('analytics.moduleNotLicensed', 'Module not licensed');
        }
    }

    function messageForCode(code) {
        var map = {
            'fr.not_licensed': ['analytics.verify.notLicensed', 'Face recognition is not licensed on this server.'],
            'fr.service_down': ['analytics.verify.serviceDown', 'Face matching is not available. Ask your administrator to start the face recognition service.'],
            'fr.need_two': ['analytics.verify.needTwo', 'Select two photos to compare.'],
            'fr.need_name': ['analytics.bl.needName', 'Enter a display name.'],
            'fr.no_face': ['analytics.verify.noFace', 'No face found in one or both photos. Use a clear, front-facing picture.'],
            'fr.multi_face': ['analytics.bl.multiFace', 'More than one face was found. Use a photo with only one person, or crop to a single face.'],
            'fr.multiple_faces': ['analytics.bl.multiFace', 'More than one face was found. Use a photo with only one person, or crop to a single face.'],
            'fr.quality_low': ['analytics.verify.qualityLow', 'Photo quality is too low for a reliable check. Try a sharper, well-lit image.'],
            'fr.quality_blur': ['analytics.bl.qualityBlur', 'This photo looks too blurry for a reliable enroll. Use a sharper picture.'],
            'fr.quality_lighting': ['analytics.bl.qualityLighting', 'This photo is too dark or too bright on the face. Use a clearer, evenly lit picture.'],
            'fr.face_too_small': ['analytics.bl.faceTooSmall', 'The face in this photo is too small. Crop closer so the face fills more of the picture, then try again.'],
            'fr.image_too_small': ['analytics.bl.imageTooSmall', 'This photo is too low-resolution. Use a clearer, larger photo (at least about 480×480 pixels).'],
            'fr.busy': ['analytics.verify.busy', 'Face matching is busy. Wait a moment and try again.'],
            'fr.bad_file': ['analytics.verify.badFile', 'Use JPEG/PNG ID photo, or Add recent snapshots from BWC.'],
            'fr.timeout': ['analytics.verify.timeout', 'Face matching took too long. Try again with smaller photos.'],
            'fr.blacklist_full': ['analytics.bl.full', 'Watchlist is full. Disable or remove an entry before adding another.'],
            'fr.not_found': ['analytics.bl.notFound', 'That watchlist entry was not found.'],
            'fr.failed': ['analytics.verify.failed', 'Face matching could not complete this check. Try again or contact your administrator.'],
            'fr.network': ['analytics.verify.network', 'Could not reach the server. Check your connection and try again.'],
        };
        var entry = map[code] || map['fr.failed'];
        return tr(entry[0], entry[1]);
    }

    function showPanel(panel) {
        currentPanel = panel || 'face';
        document.querySelectorAll('.ax-hub-nav-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-panel') === currentPanel);
        });
        document.querySelectorAll('.ax-hub-panel').forEach(function (el) {
            var id = el.id || '';
            var name = id.replace(/^ax-panel-/, '');
            el.hidden = name !== currentPanel;
        });
        if (currentPanel === 'verify') refreshSidecarStatus();
        if (currentPanel === 'blacklist') {
            refreshBlStatus();
            loadFrSettings();
            loadBlacklist();
        }
        if (currentPanel === 'face') {
            if (global.FrAlarm && FrAlarm.init) FrAlarm.init();
            if (global.FrLiveWatch && FrLiveWatch.onShow) FrLiveWatch.onShow();
            refreshSidecarStatus();
        }
    }

    function refreshSidecarStatus() {
        var el = document.getElementById('ax-fr-sidecar-status');
        if (!el) return;
        el.textContent = tr('analytics.verify.checking', 'Checking face matching…');
        fetch('/api/analytics/fr/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || !data.featureEnabled) {
                    el.textContent = messageForCode('fr.not_licensed');
                    return;
                }
                if (data.runtime && data.runtime.ok) {
                    el.textContent = tr('analytics.verify.serviceOk', 'Face matching is ready.');
                } else {
                    el.textContent = messageForCode('fr.service_down');
                }
            })
            .catch(function () {
                el.textContent = messageForCode('fr.service_down');
            });
    }

    function refreshBlStatus() {
        var el = document.getElementById('ax-bl-status');
        if (!el) return;
        el.hidden = true;
        el.textContent = '';
        fetch('/api/analytics/fr/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || !data.featureEnabled) {
                    el.textContent = messageForCode('fr.not_licensed');
                    el.hidden = false;
                    return;
                }
                if (data.runtime && data.runtime.ok) {
                    el.hidden = true;
                    el.textContent = '';
                } else {
                    el.textContent = messageForCode('fr.service_down');
                    el.hidden = false;
                }
            })
            .catch(function () {
                el.textContent = messageForCode('fr.service_down');
                el.hidden = false;
            });
    }

    function showVerifyResult(ok, html, cls) {
        var box = document.getElementById('ax-fr-verify-result');
        if (!box) return;
        box.hidden = false;
        box.className = 'ax-fr-verify-result' + (cls ? ' ' + cls : '');
        box.innerHTML = html;
    }

    function showBlMsg(html, cls) {
        var box = document.getElementById('ax-bl-msg');
        if (!box) return;
        box.hidden = false;
        box.className = 'ax-fr-verify-result' + (cls ? ' ' + cls : '');
        box.innerHTML = html;
    }

    function draftFieldIds() {
        return [
            'ax-bl-name',
            'ax-bl-id',
            'ax-bl-grade',
            'ax-bl-reason',
            'ax-bl-reason-other',
            'ax-bl-last-seen',
            'ax-bl-last-incident',
            'ax-bl-notes',
        ];
    }

    function collectDraftFields() {
        var fields = {};
        draftFieldIds().forEach(function (id) {
            var el = document.getElementById(id);
            if (el) fields[id] = String(el.value || '');
        });
        return fields;
    }

    function hasDraftFieldContent(fields) {
        fields = fields || collectDraftFields();
        return Object.keys(fields).some(function (id) {
            if (id === 'ax-bl-grade') return fields[id] && fields[id] !== 'suspect';
            if (id === 'ax-bl-reason') return fields[id] && fields[id] !== 'suspicious';
            return String(fields[id] || '').trim() !== '';
        });
    }

    function openDraftDb(cb) {
        if (!global.indexedDB) {
            cb(null);
            return;
        }
        if (draftDb) {
            cb(draftDb);
            return;
        }
        var req;
        try {
            req = indexedDB.open(DRAFT_DB_NAME, 1);
        } catch (_) {
            cb(null);
            return;
        }
        req.onupgradeneeded = function () {
            try {
                req.result.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
            } catch (_) { /* ignore */ }
        };
        req.onsuccess = function () {
            draftDb = req.result;
            cb(draftDb);
        };
        req.onerror = function () { cb(null); };
    }

    function saveDraftCrop(file) {
        if (!file) return;
        openDraftDb(function (db) {
            if (!db) return;
            try {
                var tx = db.transaction(DRAFT_STORE, 'readwrite');
                tx.objectStore(DRAFT_STORE).put({
                    id: DRAFT_CROP_KEY,
                    blob: file,
                    name: file.name || 'watchlist-enroll.jpg',
                    type: file.type || 'image/jpeg',
                    size: file.size || 0,
                    updatedAt: Date.now(),
                });
            } catch (_) { /* optional */ }
        });
    }

    function loadDraftCrop(cb) {
        openDraftDb(function (db) {
            if (!db) {
                cb(null);
                return;
            }
            try {
                var tx = db.transaction(DRAFT_STORE, 'readonly');
                var req = tx.objectStore(DRAFT_STORE).get(DRAFT_CROP_KEY);
                req.onsuccess = function () {
                    var row = req.result;
                    if (!row || !row.blob || (Date.now() - Number(row.updatedAt || 0)) > DRAFT_TTL_MS) {
                        cb(null);
                        return;
                    }
                    try {
                        cb(new File([row.blob], row.name || 'watchlist-enroll.jpg', { type: row.type || 'image/jpeg' }));
                    } catch (_) {
                        var b = row.blob;
                        b.name = row.name || 'watchlist-enroll.jpg';
                        cb(b);
                    }
                };
                req.onerror = function () { cb(null); };
            } catch (_) {
                cb(null);
            }
        });
    }

    function clearDraftCrop() {
        openDraftDb(function (db) {
            if (!db) return;
            try {
                db.transaction(DRAFT_STORE, 'readwrite').objectStore(DRAFT_STORE).delete(DRAFT_CROP_KEY);
            } catch (_) { /* optional */ }
        });
    }

    function saveWatchlistDraft() {
        if (restoringDraft) return;
        var fields = collectDraftFields();
        var hasText = hasDraftFieldContent(fields);
        var hasCrop = !!pendingEnrollFile;
        var hasPicker = !!facePicker.cropFile;
        if (!hasText && !hasCrop && !hasPicker) {
            try { sessionStorage.removeItem(DRAFT_META_KEY); } catch (_) { /* ignore */ }
            return;
        }
        try {
            sessionStorage.setItem(DRAFT_META_KEY, JSON.stringify({
                updatedAt: Date.now(),
                fields: fields,
                facePicker: {
                    groupId: facePicker.groupId || '',
                    camId: facePicker.camId || '',
                    cropFile: facePicker.cropFile || '',
                    entryId: facePicker.entryId || '',
                },
                hasCrop: hasCrop,
            }));
        } catch (_) { /* optional */ }
    }

    function scheduleWatchlistDraftSave() {
        clearTimeout(draftSaveTimer);
        draftSaveTimer = setTimeout(saveWatchlistDraft, 120);
    }

    function clearWatchlistDraft() {
        clearTimeout(draftSaveTimer);
        try { sessionStorage.removeItem(DRAFT_META_KEY); } catch (_) { /* ignore */ }
        clearDraftCrop();
    }

    function hasUnsavedWatchlistDraft() {
        var photoEl = document.getElementById('ax-bl-photo');
        return hasDraftFieldContent()
            || !!pendingEnrollFile
            || !!(photoEl && photoEl.files && photoEl.files[0])
            || !!facePicker.cropFile;
    }

    function restoreWatchlistDraft() {
        var meta = null;
        try {
            meta = JSON.parse(sessionStorage.getItem(DRAFT_META_KEY) || 'null');
        } catch (_) {
            meta = null;
        }
        if (!meta || !meta.updatedAt || (Date.now() - Number(meta.updatedAt)) > DRAFT_TTL_MS) {
            clearWatchlistDraft();
            return;
        }
        restoringDraft = true;
        var restored = false;
        var fields = meta.fields || {};
        draftFieldIds().forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || fields[id] == null) return;
            el.value = String(fields[id] || '');
            if (String(fields[id] || '').trim()) restored = true;
        });
        if (meta.facePicker) {
            facePicker.groupId = String(meta.facePicker.groupId || '');
            facePicker.camId = String(meta.facePicker.camId || '');
            facePicker.cropFile = String(meta.facePicker.cropFile || '');
            facePicker.entryId = String(meta.facePicker.entryId || '');
            if (facePicker.cropFile) restored = true;
        }
        syncReasonOtherVisibility();
        restoringDraft = false;
        loadDraftCrop(function (file) {
            if (file) {
                restoringDraft = true;
                setPendingCrop(file);
                restoringDraft = false;
                restored = true;
            }
            if (restored && !restoredDraftNotice) {
                restoredDraftNotice = true;
                showBlMsg('Unsaved Watchlist draft restored.', 'is-match');
            }
        });
    }

    function bindWatchlistDraftGuard() {
        draftFieldIds().forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', scheduleWatchlistDraftSave);
            el.addEventListener('change', scheduleWatchlistDraftSave);
        });
        global.addEventListener('beforeunload', function (ev) {
            if (!hasUnsavedWatchlistDraft()) return;
            saveWatchlistDraft();
            ev.preventDefault();
            ev.returnValue = '';
            return '';
        });
        setTimeout(restoreWatchlistDraft, 0);
    }

    function clearPendingCrop() {
        pendingEnrollFile = null;
        if (pendingEnrollPreviewUrl) {
            try { URL.revokeObjectURL(pendingEnrollPreviewUrl); } catch (_) { /* ignore */ }
            pendingEnrollPreviewUrl = null;
        }
        var prev = document.getElementById('ax-bl-crop-preview');
        var img = document.getElementById('ax-bl-crop-preview-img');
        if (prev) prev.hidden = true;
        if (img) img.removeAttribute('src');
        if (!restoringDraft) {
            clearDraftCrop();
            scheduleWatchlistDraftSave();
        }
    }

    function syncReasonOtherVisibility() {
        var reasonEl = document.getElementById('ax-bl-reason');
        var wrap = document.getElementById('ax-bl-reason-other-wrap');
        if (!wrap || !reasonEl) return;
        wrap.hidden = String(reasonEl.value || '') !== 'other';
    }

    function setPendingCrop(file) {
        clearPendingCrop();
        if (!file) return;
        pendingEnrollFile = file;
        pendingEnrollPreviewUrl = URL.createObjectURL(file);
        var prev = document.getElementById('ax-bl-crop-preview');
        var img = document.getElementById('ax-bl-crop-preview-img');
        if (img) img.src = pendingEnrollPreviewUrl;
        if (prev) prev.hidden = false;
        if (!restoringDraft) {
            saveDraftCrop(file);
            scheduleWatchlistDraftSave();
        }
    }

    function openEnrollCropper(file) {
        if (!file) {
            showBlMsg(messageForCode('fr.bad_file'), 'is-err');
            return;
        }
        if (!global.FrEnrollCropper || !FrEnrollCropper.open) {
            setPendingCrop(file);
            showBlMsg(tr('analytics.bl.cropFallback', 'Crop tool unavailable — using full image.'), '');
            return;
        }
        FrEnrollCropper.open(file, function (cropped) {
            if (!cropped) {
                showBlMsg(tr('analytics.bl.cropExportFail', 'Could not build crop image.'), 'is-err');
                return;
            }
            setPendingCrop(cropped);
            showBlMsg(tr('analytics.bl.cropReadyPreview', 'Crop ready for enroll'), 'is-match');
        });
    }

    function closeBlDrawer() {
        var d = document.getElementById('ax-bl-drawer');
        if (d) d.hidden = true;
        blDrawerId = null;
        var dbg = document.getElementById('ax-bl-match-debug-result');
        if (dbg) {
            dbg.hidden = true;
            dbg.textContent = '';
            dbg.className = 'hint ax-bl-match-debug-result';
        }
    }

    function showMatchDebugResult(text, cls) {
        var el = document.getElementById('ax-bl-match-debug-result');
        if (!el) return;
        el.hidden = false;
        el.textContent = text;
        el.className = 'hint ax-bl-match-debug-result' + (cls ? ' ' + cls : '');
    }

    /** mob-fr-score-result-plain — one operator line only (no engine/file/dims dump) */
    function runMatchDebug() {
        var id = blDrawerId;
        if (!id) {
            showMatchDebugResult(tr('analytics.bl.matchDebugNeedEntry', 'Open a watchlist person first.'), 'is-err');
            return;
        }
        var btn = document.getElementById('ax-bl-match-debug-btn');
        if (btn) btn.disabled = true;
        showMatchDebugResult(tr('analytics.bl.matchDebugRunning', 'Checking…'), '');
        fetch('/api/analytics/fr/match-debug', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId: id }),
        })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                    return { status: r.status, j: { ok: false, error: 'failed' } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (!j.ok) {
                    var errKey = j.error || '';
                    var errLine;
                    if (errKey === 'no_live_crop' || errKey === 'crop_missing') {
                        errLine = tr(
                            'analytics.bl.matchDebugNoSnap',
                            'No live face snap yet. Start watch, get a face on Recent, then try again.'
                        );
                    } else if (errKey === 'not_found') {
                        errLine = messageForCode('fr.not_found');
                    } else if (errKey === 'sidecar_down') {
                        errLine = messageForCode('fr.service_down');
                    } else if (errKey === 'no_gallery_embedding') {
                        errLine = tr(
                            'analytics.bl.matchDebugNoPrint',
                            'This person has no face fingerprint yet. Use Re-embed gallery, then try again.'
                        );
                    } else {
                        errLine = messageForCode('fr.failed');
                    }
                    showMatchDebugResult(errLine, 'is-err');
                    return;
                }
                var bar = j.barPct != null ? j.barPct : 70;
                var pct = j.scorePct;
                if (pct == null || isNaN(Number(pct))) pct = null;
                /* Prefer the live path score; if nonsense low and fresh exists, still show live path (honest). */
                var pass = !!(j.clears70);
                var pctStr = pct != null ? String(pct) : '—';
                var line = tr(
                    'analytics.bl.matchDebugPlain',
                    'Match: {pct}% · need {bar}% · {result}'
                )
                    .replace('{pct}', pctStr)
                    .replace('{bar}', String(bar))
                    .replace('{result}', pass
                        ? tr('analytics.bl.matchDebugPass', 'pass')
                        : tr('analytics.bl.matchDebugFail', 'fail'));
                showMatchDebugResult(line, pass ? 'is-ok' : 'is-low');
            })
            .catch(function () {
                showMatchDebugResult(messageForCode('fr.network'), 'is-err');
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    }

    function openBlDrawer(id) {
        var e = blById[id];
        var drawer = document.getElementById('ax-bl-drawer');
        if (!e || !drawer) return;
        blDrawerId = id;
        var dbg = document.getElementById('ax-bl-match-debug-result');
        if (dbg) {
            dbg.hidden = true;
            dbg.textContent = '';
            dbg.className = 'hint ax-bl-match-debug-result';
        }
        var title = document.getElementById('ax-bl-drawer-title');
        var face = document.getElementById('ax-bl-drawer-face');
        var dl = document.getElementById('ax-bl-drawer-dl');
        var samplesEl = document.getElementById('ax-bl-samples');
        if (title) title.textContent = e.displayName || '—';
        var photoUrl = e.photoFile
            ? ('/api/analytics/fr/blacklist/' + encodeURIComponent(e.id) + '/photo')
            : '';
        if (face) {
            if (photoUrl) {
                face.hidden = false;
                face.src = photoUrl;
            } else {
                face.hidden = true;
                face.removeAttribute('src');
            }
        }
        var when = e.enrolledAt ? String(e.enrolledAt).replace('T', ' ').slice(0, 19) : '—';
        var rows = [
            [tr('analytics.bl.grade', 'Watch grade'), gradeBadgeHtml(e.listStatus)],
            [tr('analytics.bl.reason', 'Reason'), esc(reasonLabel(e.reasonCode, e.reasonOther))],
            [tr('analytics.bl.idNumber', 'ID / case ref'), esc(e.idNumber || '—')],
            [tr('analytics.bl.lastSeen', 'Last seen'), esc(e.lastSeen || '—')],
            [tr('analytics.bl.lastIncident', 'Last incident'), esc(e.lastIncident || '—')],
            [tr('analytics.bl.notes', 'Notes'), esc(e.notes || '—')],
            [tr('analytics.bl.colWhen', 'Enrolled'), esc(when)],
            [tr('analytics.bl.enrolledBy', 'Enrolled by'), esc(e.enrolledBy || '—')],
            [tr('analytics.bl.colStatus', 'Status'), esc(e.enabled !== false
                ? tr('analytics.bl.active', 'Active')
                : tr('analytics.bl.disabled', 'Disabled'))],
        ];
        if (dl) {
            dl.innerHTML = rows.map(function (pair) {
                return '<dt>' + esc(pair[0]) + '</dt><dd>' + pair[1] + '</dd>';
            }).join('');
        }
        if (samplesEl) {
            var samples = Array.isArray(e.samples) ? e.samples : [];
            samplesEl.innerHTML = samples.length ? samples.map(function (s, i) {
                var src = s.photoFile
                    ? ('/api/analytics/fr/blacklist/' + encodeURIComponent(e.id) + '/sample/' + encodeURIComponent(s.sampleId) + '/photo')
                    : '';
                return '<div class="ax-bl-sample-chip">' +
                    (src ? ('<img src="' + esc(src) + '" alt="">') : '<span>—</span>') +
                    '<span>' + esc((i === 0 ? 'Primary' : ('Face ' + (i + 1)))) + '</span></div>';
            }).join('') : '';
        }
        drawer.hidden = false;
    }

    function runVerify() {
        var f1 = document.getElementById('ax-fr-file1');
        var f2 = document.getElementById('ax-fr-file2');
        var btn = document.getElementById('ax-fr-verify-btn');
        if (!f1 || !f2 || !f1.files || !f2.files || !f1.files[0] || !f2.files[0]) {
            showVerifyResult(false, messageForCode('fr.need_two'), 'is-err');
            return;
        }
        var fd = new FormData();
        fd.append('file1', f1.files[0]);
        fd.append('file2', f2.files[0]);
        fd.append('model', 'Facenet');
        if (btn) btn.disabled = true;
        showVerifyResult(false, tr('analytics.verify.running', 'Comparing photos…'), '');
        fetch('/api/analytics/fr/verify', { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                    return { status: r.status, j: { ok: false, code: 'fr.failed' } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (j.ok && (j.verified === true || j.verified === false)) {
                    var line = (j.verified
                        ? tr('analytics.verify.match', 'Match')
                        : tr('analytics.verify.nomatch', 'No match')) +
                        ' · ' + (j.scorePct != null ? j.scorePct + '%' : '—');
                    showVerifyResult(true, line, j.verified ? 'is-match' : 'is-nomatch');
                    return;
                }
                var code = j.code || null;
                if (!code) {
                    if (pack.status === 403) code = 'fr.not_licensed';
                    else if (pack.status === 503) code = 'fr.service_down';
                    else if (pack.status === 504) code = 'fr.timeout';
                    else if (pack.status === 400) code = 'fr.bad_file';
                    else code = 'fr.failed';
                }
                showVerifyResult(false, messageForCode(code), 'is-err');
            })
            .catch(function () {
                showVerifyResult(false, messageForCode('fr.network'), 'is-err');
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    }

    function loadBlacklist() {
        var tbody = document.getElementById('ax-bl-tbody');
        var countEl = document.getElementById('ax-bl-count');
        var qEl = document.getElementById('ax-bl-search');
        var gradeEl = document.getElementById('ax-bl-grade-filter');
        var q = qEl && qEl.value ? String(qEl.value).trim() : '';
        var grade = gradeEl && gradeEl.value ? String(gradeEl.value).trim() : '';
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="hint">' + esc(tr('analytics.bl.loading', 'Loading…')) + '</td></tr>';
        var url = '/api/analytics/fr/blacklist';
        var params = [];
        if (q) params.push('q=' + encodeURIComponent(q));
        if (grade) params.push('listStatus=' + encodeURIComponent(grade));
        if (params.length) url += '?' + params.join('&');
        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
            .then(function (pack) {
                var j = pack.j || {};
                if (!j.ok) {
                    blById = {};
                    if (tbody) {
                        tbody.innerHTML = '<tr><td colspan="8" class="hint">' +
                            esc(messageForCode(j.code || (pack.status === 403 ? 'fr.not_licensed' : 'fr.failed'))) +
                            '</td></tr>';
                    }
                    return;
                }
                if (countEl) {
                    countEl.textContent = tr('analytics.bl.count', '{count} / {max} active')
                        .replace('{count}', String(j.count || 0))
                        .replace('{max}', String(j.max || 5000));
                }
                var rows = j.entries || [];
                blById = {};
                rows.forEach(function (e) { if (e && e.id) blById[e.id] = e; });
                if (!tbody) return;
                if (!rows.length) {
                    tbody.innerHTML = '<tr><td colspan="8" class="hint">' +
                        esc(tr('analytics.bl.empty', 'No watchlist entries yet.')) + '</td></tr>';
                    return;
                }
                tbody.innerHTML = rows.map(function (e) {
                    var en = e.enabled !== false;
                    var when = e.enrolledAt ? String(e.enrolledAt).replace('T', ' ').slice(0, 19) : '—';
                    var status = en
                        ? tr('analytics.bl.active', 'Active')
                        : tr('analytics.bl.disabled', 'Disabled');
                    var toggleLabel = en
                        ? tr('analytics.bl.disable', 'Disable')
                        : tr('analytics.bl.enable', 'Enable');
                    var photoUrl = e.photoFile
                        ? ('/api/analytics/fr/blacklist/' + encodeURIComponent(e.id) + '/photo')
                        : '';
                    var faceCell = photoUrl
                        ? ('<a class="ax-bl-face-link" href="' + esc(photoUrl) + '" target="_blank" rel="noopener" title="' +
                            esc(tr('analytics.bl.openPhoto', 'Open enrolled photo')) + '">' +
                            '<img class="ax-bl-face" src="' + esc(photoUrl) + '" alt="" loading="lazy" ' +
                            'onerror="this.classList.add(\'is-broken\');this.removeAttribute(\'src\')"></a>')
                        : '<span class="ax-bl-face-ph" aria-hidden="true">—</span>';
                    return '<tr class="' + (en ? '' : 'is-disabled') + '" data-id="' + esc(e.id) + '">' +
                        '<td class="ax-bl-face-td">' + faceCell + '</td>' +
                        '<td><button type="button" class="ax-bl-name-btn ax-bl-open">' + esc(e.displayName) + '</button></td>' +
                        '<td>' + gradeBadgeHtml(e.listStatus) + '</td>' +
                        '<td>' + esc(reasonLabel(e.reasonCode, e.reasonOther)) + '</td>' +
                        '<td>' + esc(e.idNumber || '—') + '</td>' +
                        '<td>' + esc(when) + '</td>' +
                        '<td>' + esc(status) + '</td>' +
                        '<td><button type="button" class="btn btn-ghost btn-sm ax-bl-toggle" data-enabled="' +
                        (en ? '0' : '1') + '">' + esc(toggleLabel) + '</button> ' +
                        '<button type="button" class="btn btn-ghost btn-sm ax-bl-del">' +
                        esc(tr('analytics.bl.remove', 'Remove')) + '</button></td></tr>';
                }).join('');
            })
            .catch(function () {
                blById = {};
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="8" class="hint">' +
                        esc(messageForCode('fr.network')) + '</td></tr>';
                }
            });
    }

    function applyFrSettingsUi(data) {
        if (data && data.ok) {
            frSettings = {
                matchThreshold: parseInt(data.matchThreshold, 10) || 75,
                min: parseInt(data.min, 10) || 70,
                max: parseInt(data.max, 10) || 99,
                canManage: !!data.canManage,
                updatedAt: data.updatedAt || null,
                updatedBy: data.updatedBy || null,
            };
        }
        var thr = document.getElementById('ax-bl-threshold');
        var val = document.getElementById('ax-bl-threshold-val');
        var save = document.getElementById('ax-bl-threshold-save');
        var meta = document.getElementById('ax-bl-threshold-meta');
        if (thr) {
            thr.min = String(frSettings.min || 70);
            thr.max = String(frSettings.max || 99);
            thr.value = String(frSettings.matchThreshold || 75);
            thr.disabled = !frSettings.canManage;
        }
        if (val) val.textContent = String(frSettings.matchThreshold || 75) + '%';
        if (save) save.disabled = !frSettings.canManage;
        if (meta) {
            if (!frSettings.canManage) {
                meta.textContent = 'Locked';
            } else if (frSettings.updatedAt) {
                meta.textContent = 'Saved ' + String(frSettings.updatedAt).replace('T', ' ').slice(11, 19);
            } else {
                meta.textContent = 'Default';
            }
        }
    }

    function loadFrSettings() {
        fetch('/api/analytics/fr/settings', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) { applyFrSettingsUi(j); })
            .catch(function () { applyFrSettingsUi(null); });
    }

    function closeThresholdPasswordModal() {
        var modal = document.getElementById('ax-bl-threshold-modal');
        var input = document.getElementById('ax-bl-threshold-password');
        if (input) input.value = '';
        if (modal) modal.hidden = true;
        pendingThresholdSave = null;
    }

    function postFrThreshold(next, password) {
        var btn = document.getElementById('ax-bl-threshold-save');
        if (btn) btn.disabled = true;
        showBlMsg(tr('analytics.bl.thresholdSaving', 'Saving match threshold…'), '');
        fetch('/api/analytics/fr/settings', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchThreshold: next, adminPassword: password }),
        })
            .then(function (r) {
                return r.json().then(function (j) { return { okHttp: r.ok, j: j }; }).catch(function () {
                    return { okHttp: r.ok, j: { ok: false } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (!pack.okHttp || !j.ok) {
                    showBlMsg((j && j.error) || tr('analytics.bl.thresholdSaveFail', 'Could not save threshold.'), 'is-err');
                    loadFrSettings();
                    return;
                }
                applyFrSettingsUi(Object.assign({ ok: true, canManage: true }, j.settings || {}));
                showBlMsg('Alert threshold saved.', 'is-match');
            })
            .catch(function () {
                showBlMsg(messageForCode('fr.network'), 'is-err');
            })
            .finally(function () {
                if (btn) btn.disabled = !frSettings.canManage;
            });
    }

    function submitThresholdPasswordModal() {
        if (!pendingThresholdSave) return;
        var input = document.getElementById('ax-bl-threshold-password');
        var password = input ? String(input.value || '') : '';
        if (!password) {
            if (input) input.focus();
            return;
        }
        var next = pendingThresholdSave.value;
        closeThresholdPasswordModal();
        postFrThreshold(next, password);
    }

    function openThresholdPasswordModal(next) {
        pendingThresholdSave = { value: next };
        var modal = document.getElementById('ax-bl-threshold-modal');
        var input = document.getElementById('ax-bl-threshold-password');
        if (modal) modal.hidden = false;
        if (input) {
            input.value = '';
            setTimeout(function () { try { input.focus(); } catch (_) { /* ignore */ } }, 0);
        }
    }

    function saveFrThreshold() {
        var thr = document.getElementById('ax-bl-threshold');
        var next = thr ? parseInt(thr.value, 10) : NaN;
        if (isNaN(next)) next = frSettings.matchThreshold || 75;
        openThresholdPasswordModal(next);
    }

    function shortTime(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return String(iso).slice(0, 19).replace('T', ' ');
            return d.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch (_) {
            return String(iso).slice(0, 19).replace('T', ' ');
        }
    }

    function deviceLabel(camId) {
        var id = String(camId || '');
        var row = null;
        for (var i = 0; i < facePicker.fleet.length; i++) {
            if (String(facePicker.fleet[i].id || '') === id) {
                row = facePicker.fleet[i];
                break;
            }
        }
        var groupHit = facePicker.lookup && facePicker.lookup.byDevice && facePicker.lookup.byDevice[id];
        return (row && row.name) || (groupHit && groupHit.nickname) || id;
    }

    function pickerDevicesForGroup(groupId) {
        var seen = {};
        var out = [];
        function add(id, label) {
            id = String(id || '').trim();
            if (!id || seen[id]) return;
            seen[id] = true;
            out.push({ id: id, label: label || deviceLabel(id) });
        }
        if (groupId) {
            facePicker.groups.some(function (g) {
                if (String(g.id || '') !== groupId) return false;
                (g.members || []).forEach(function (m) {
                    add(m.deviceId, m.nickname || deviceLabel(m.deviceId));
                });
                return true;
            });
            return out;
        }
        facePicker.fleet.forEach(function (d) { add(d.id, d.name || d.id); });
        return out;
    }

    function renderFacePickerGroups() {
        var sel = document.getElementById('ax-bl-face-picker-group');
        if (!sel) return;
        var html = '<option value="">All groups</option>';
        facePicker.groups.forEach(function (g) {
            html += '<option value="' + esc(g.id) + '">' + esc(g.name || g.id) + '</option>';
        });
        sel.innerHTML = html;
        sel.value = facePicker.groupId || '';
    }

    function renderFacePickerCams() {
        var sel = document.getElementById('ax-bl-face-picker-cam');
        if (!sel) return;
        var devices = pickerDevicesForGroup(facePicker.groupId);
        var html = '<option value="">Select BWC</option>';
        devices.forEach(function (d) {
            html += '<option value="' + esc(d.id) + '">' + esc(d.label || d.id) + '</option>';
        });
        sel.innerHTML = html;
        if (facePicker.camId && devices.some(function (d) { return d.id === facePicker.camId; })) {
            sel.value = facePicker.camId;
        } else {
            facePicker.camId = '';
            sel.value = '';
        }
    }

    function renderFacePickerSnaps() {
        var grid = document.getElementById('ax-bl-face-picker-grid');
        var useBtn = document.getElementById('ax-bl-face-picker-use');
        if (useBtn) useBtn.disabled = !facePicker.cropFile;
        if (!grid) return;
        if (!facePicker.camId) {
            grid.innerHTML = '<div class="ax-bl-face-picker-empty">Select BWC.</div>';
            return;
        }
        if (!facePicker.snaps.length) {
            grid.innerHTML = '<div class="ax-bl-face-picker-empty">No BWC snapshot.</div>';
            return;
        }
        grid.innerHTML = facePicker.snaps.map(function (s) {
            var active = s.cropFile === facePicker.cropFile;
            var score = s.scorePct != null ? (' · ' + Math.round(Number(s.scorePct) || 0) + '%') : '';
            var img = s.cropUrl || ('/api/analytics/fr/snap/' + encodeURIComponent(s.cropFile));
            return '<button type="button" class="ax-bl-face-pick' + (active ? ' is-active' : '') +
                '" data-crop="' + esc(s.cropFile) + '">' +
                '<img src="' + esc(img) + '" alt="">' +
                '<span>' + esc(shortTime(s.at) + score) + '</span></button>';
        }).join('');
    }

    function loadFacePickerSnaps() {
        facePicker.cropFile = '';
        facePicker.snaps = [];
        renderFacePickerSnaps();
        if (!facePicker.camId) return;
        fetch('/api/analytics/fr/snaps?limit=36&camId=' + encodeURIComponent(facePicker.camId), { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                facePicker.snaps = (j && j.ok && Array.isArray(j.snaps)) ? j.snaps : [];
                renderFacePickerSnaps();
            })
            .catch(function () {
                facePicker.snaps = [];
                renderFacePickerSnaps();
            });
    }

    function closeFacePicker(keepSelection) {
        var modal = document.getElementById('ax-bl-face-picker-modal');
        if (modal) modal.hidden = true;
        if (!keepSelection) {
            facePicker.cropFile = '';
            facePicker.entryId = '';
        }
        scheduleWatchlistDraftSave();
    }

    function openFacePicker(entryId) {
        var modal = document.getElementById('ax-bl-face-picker-modal');
        var title = document.getElementById('ax-bl-face-picker-title');
        if (modal) modal.hidden = false;
        facePicker.entryId = String(entryId || '');
        facePicker.cropFile = '';
        if (title) title.textContent = 'Choose recent snapshot from BWC';
        Promise.all([
            fetch('/api/dispatch-groups', { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
            fetch('/api/fleet', { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
        ]).then(function (pack) {
            var groups = pack[0] || {};
            var fleet = pack[1] || {};
            facePicker.groups = Array.isArray(groups.groups) ? groups.groups : [];
            facePicker.lookup = groups.lookup || { byDevice: {} };
            facePicker.fleet = Array.isArray(fleet.fleet) ? fleet.fleet : [];
            renderFacePickerGroups();
            renderFacePickerCams();
            loadFacePickerSnaps();
        }).catch(function () {
            facePicker.groups = [];
            facePicker.fleet = [];
            renderFacePickerGroups();
            renderFacePickerCams();
            renderFacePickerSnaps();
        });
    }

    function addSampleFromRecentCrop(cropFile) {
        var id = facePicker.entryId || blDrawerId;
        cropFile = String(cropFile || '').trim();
        if (!id || !cropFile) {
            showBlMsg('Choose a BWC snapshot.', 'is-err');
            return;
        }
        closeFacePicker(true);
        showBlMsg('Adding BWC snapshot…', '');
        fetch('/api/analytics/fr/blacklist/' + encodeURIComponent(id) + '/sample-from-snap', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cropFile: cropFile }),
        })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                    return { status: r.status, j: { ok: false, code: 'fr.failed' } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (!j.ok) {
                    showBlMsg(messageForCode(j.code || 'fr.failed'), 'is-err');
                    return;
                }
                showBlMsg('BWC snapshot added.', 'is-match');
                facePicker.cropFile = '';
                facePicker.entryId = '';
                scheduleWatchlistDraftSave();
                if (j.entry && j.entry.id) blById[j.entry.id] = j.entry;
                loadBlacklist();
                openBlDrawer(id);
            })
            .catch(function () {
                showBlMsg(messageForCode('fr.network'), 'is-err');
            });
    }

    function enrollFromRecentCrop(cropFile) {
        var nameEl = document.getElementById('ax-bl-name');
        var idEl = document.getElementById('ax-bl-id');
        var gradeEl = document.getElementById('ax-bl-grade');
        var reasonEl = document.getElementById('ax-bl-reason');
        var reasonOtherEl = document.getElementById('ax-bl-reason-other');
        var lastSeenEl = document.getElementById('ax-bl-last-seen');
        var lastIncEl = document.getElementById('ax-bl-last-incident');
        var notesEl = document.getElementById('ax-bl-notes');
        var btn = document.getElementById('ax-bl-enroll-bwc-btn');
        var name = nameEl && nameEl.value ? String(nameEl.value).trim() : '';
        cropFile = String(cropFile || '').trim();
        if (!name) {
            closeFacePicker(true);
            showBlMsg(messageForCode('fr.need_name'), 'is-err');
            return;
        }
        if (!cropFile) {
            showBlMsg('Choose a BWC snapshot.', 'is-err');
            return;
        }
        var reasonCode = reasonEl ? String(reasonEl.value || 'suspicious') : 'suspicious';
        if (reasonCode === 'other') {
            var other = reasonOtherEl && reasonOtherEl.value ? String(reasonOtherEl.value).trim() : '';
            if (!other) {
                showBlMsg(tr('analytics.bl.needReasonOther', 'Enter a short reason when Other is selected.'), 'is-err');
                return;
            }
        }
        if (btn) btn.disabled = true;
        closeFacePicker(true);
        showBlMsg('Adding BWC snapshot…', '');
        fetch('/api/analytics/fr/blacklist/enroll-from-snap', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                displayName: name,
                idNumber: idEl && idEl.value ? String(idEl.value).trim() : '',
                listStatus: gradeEl ? String(gradeEl.value || 'suspect') : 'suspect',
                reasonCode: reasonCode,
                reasonOther: reasonOtherEl && reasonOtherEl.value ? String(reasonOtherEl.value).trim() : '',
                lastSeen: lastSeenEl && lastSeenEl.value ? String(lastSeenEl.value).trim() : '',
                lastIncident: lastIncEl && lastIncEl.value ? String(lastIncEl.value).trim() : '',
                notes: notesEl && notesEl.value ? String(notesEl.value).trim() : '',
                cropFile: cropFile,
            }),
        })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                    return { status: r.status, j: { ok: false, code: 'fr.failed' } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (j.ok && j.entry) {
                    showBlMsg(
                        'BWC snapshot added.' +
                            ' · ' + esc(j.entry.displayName) +
                            (j.cropFile ? (' · ' + esc(String(j.cropFile))) : ''),
                        'is-match'
                    );
                    if (nameEl) nameEl.value = '';
                    if (idEl) idEl.value = '';
                    if (reasonOtherEl) reasonOtherEl.value = '';
                    if (lastSeenEl) lastSeenEl.value = '';
                    if (lastIncEl) lastIncEl.value = '';
                    if (notesEl) notesEl.value = '';
                    if (gradeEl) gradeEl.value = 'suspect';
                    if (reasonEl) reasonEl.value = 'suspicious';
                    facePicker.cropFile = '';
                    facePicker.entryId = '';
                    clearPendingCrop();
                    clearWatchlistDraft();
                    syncReasonOtherVisibility();
                    loadBlacklist();
                    return;
                }
                if (j.error === 'no_live_crop' || j.error === 'crop_missing' || j.error === 'no_crop_selected') {
                    showBlMsg(tr(
                        'analytics.bl.enrollBwcNoSnap',
                        'Choose a BWC snapshot first.'
                    ), 'is-err');
                    return;
                }
                if (pack.status === 503) {
                    showBlMsg(messageForCode('fr.service_down'), 'is-err');
                    return;
                }
                showBlMsg(messageForCode(j.code || 'fr.failed'), 'is-err');
            })
            .catch(function () {
                showBlMsg(messageForCode('fr.network'), 'is-err');
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    }

    function enrollFromBwcStill() {
        openFacePicker();
    }

    function enrollBlacklist() {
        var nameEl = document.getElementById('ax-bl-name');
        var idEl = document.getElementById('ax-bl-id');
        var gradeEl = document.getElementById('ax-bl-grade');
        var reasonEl = document.getElementById('ax-bl-reason');
        var reasonOtherEl = document.getElementById('ax-bl-reason-other');
        var lastSeenEl = document.getElementById('ax-bl-last-seen');
        var lastIncEl = document.getElementById('ax-bl-last-incident');
        var notesEl = document.getElementById('ax-bl-notes');
        var photoEl = document.getElementById('ax-bl-photo');
        var btn = document.getElementById('ax-bl-enroll-btn');
        var name = nameEl && nameEl.value ? String(nameEl.value).trim() : '';
        if (!name) {
            showBlMsg(messageForCode('fr.need_name'), 'is-err');
            return;
        }
        var file = pendingEnrollFile || (photoEl && photoEl.files && photoEl.files[0]) || null;
        if (!file) {
            showBlMsg(messageForCode('fr.bad_file'), 'is-err');
            return;
        }
        if (!pendingEnrollFile && photoEl && photoEl.files && photoEl.files[0]) {
            openEnrollCropper(photoEl.files[0]);
            showBlMsg(tr('analytics.bl.cropFirst', 'Crop & check the face first, then Add to watchlist.'), '');
            return;
        }
        var reasonCode = reasonEl ? String(reasonEl.value || 'suspicious') : 'suspicious';
        if (reasonCode === 'other') {
            var other = reasonOtherEl && reasonOtherEl.value ? String(reasonOtherEl.value).trim() : '';
            if (!other) {
                showBlMsg(tr('analytics.bl.needReasonOther', 'Enter a short reason when Other is selected.'), 'is-err');
                return;
            }
        }
        var lower = String(file.name || 'watchlist-enroll.jpg').toLowerCase();
        if (!/\.(jpe?g|png)$/.test(lower) && file.type !== 'image/jpeg' && file.type !== 'image/png') {
            showBlMsg(messageForCode('fr.bad_file'), 'is-err');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showBlMsg(messageForCode('fr.bad_file'), 'is-err');
            return;
        }
        if (btn) btn.disabled = true;
        showBlMsg(tr('analytics.bl.enrolling', 'Enrolling…'), '');

        function doPost() {
            var fd = new FormData();
            fd.append('displayName', name);
            fd.append('idNumber', idEl && idEl.value ? String(idEl.value).trim() : '');
            fd.append('listStatus', gradeEl ? String(gradeEl.value || 'suspect') : 'suspect');
            fd.append('reasonCode', reasonCode);
            fd.append('reasonOther', reasonOtherEl && reasonOtherEl.value ? String(reasonOtherEl.value).trim() : '');
            fd.append('lastSeen', lastSeenEl && lastSeenEl.value ? String(lastSeenEl.value).trim() : '');
            fd.append('lastIncident', lastIncEl && lastIncEl.value ? String(lastIncEl.value).trim() : '');
            fd.append('notes', notesEl && notesEl.value ? String(notesEl.value).trim() : '');
            fd.append('photo', file, file.name || 'watchlist-enroll.jpg');
            fetch('/api/analytics/fr/blacklist', { method: 'POST', credentials: 'same-origin', body: fd })
                .then(function (r) {
                    return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                        return { status: r.status, j: { ok: false, code: 'fr.failed' } };
                    });
                })
                .then(function (pack) {
                    var j = pack.j || {};
                    if (j.ok && j.entry) {
                        showBlMsg(tr('analytics.bl.enrolled', 'Added to watchlist.') + ' · ' + esc(j.entry.displayName), 'is-match');
                        if (nameEl) nameEl.value = '';
                        if (idEl) idEl.value = '';
                        if (reasonOtherEl) reasonOtherEl.value = '';
                        if (lastSeenEl) lastSeenEl.value = '';
                        if (lastIncEl) lastIncEl.value = '';
                        if (notesEl) notesEl.value = '';
                        if (photoEl) photoEl.value = '';
                        if (gradeEl) gradeEl.value = 'suspect';
                        if (reasonEl) reasonEl.value = 'suspicious';
                        clearPendingCrop();
                        clearWatchlistDraft();
                        syncReasonOtherVisibility();
                        loadBlacklist();
                        return;
                    }
                    showBlMsg(messageForCode(j.code || 'fr.failed'), 'is-err');
                })
                .catch(function () {
                    showBlMsg(messageForCode('fr.network'), 'is-err');
                })
                .finally(function () {
                    if (btn) btn.disabled = false;
                });
        }

        doPost();
    }

    /** mob-fr-gallery-re-enroll-migrate */
    function closeMigrateModal() {
        var modal = document.getElementById('ax-bl-migrate-modal');
        if (modal) modal.hidden = true;
    }

    function submitMigrateGallery() {
        closeMigrateModal();
        var btn = document.getElementById('ax-bl-migrate-btn');
        if (btn) btn.disabled = true;
        showBlMsg('Refreshing Watchlist vectors…', '');
        fetch('/api/analytics/fr/blacklist/re-enroll-migrate', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                    return { status: r.status, j: { ok: false } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (j.ok) {
                    var line = tr(
                        'analytics.bl.migrateDone',
                        'Gallery re-embed done: {migrated} updated, {skipped} skipped, {failed} failed (engine {engine}).'
                    )
                        .replace('{migrated}', String(j.migrated || 0))
                        .replace('{skipped}', String(j.skipped || 0))
                        .replace('{failed}', String(j.failed || 0))
                        .replace('{engine}', String(j.engine || ''));
                    var cls = (j.failed > 0) ? '' : 'is-match';
                    if (j.failed > 0 && j.details && j.details.failed && j.details.failed.length) {
                        var first = j.details.failed[0];
                        line += ' · ' + esc(first.displayName || first.id || '') + ': ' + esc(first.error || '');
                    }
                    showBlMsg(line, cls);
                    loadBlacklist();
                    return;
                }
                showBlMsg(tr('analytics.bl.migrateFail', 'Gallery re-embed failed. Check that the face service is running.'), 'is-err');
            })
            .catch(function () {
                showBlMsg(messageForCode('fr.network'), 'is-err');
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    }

    function migrateGallery() {
        var modal = document.getElementById('ax-bl-migrate-modal');
        if (modal) modal.hidden = false;
    }

    function closeRemoveModal() {
        var modal = document.getElementById('ax-bl-remove-modal');
        if (modal) modal.hidden = true;
        pendingRemoveId = null;
    }

    function submitRemoveModal() {
        var id = pendingRemoveId;
        if (!id) return;
        closeRemoveModal();
        fetch('/api/analytics/fr/blacklist/' + encodeURIComponent(id), {
            method: 'DELETE',
            credentials: 'same-origin',
        }).then(function (r) { return r.json(); }).then(function (j) {
            if (!j || !j.ok) showBlMsg(messageForCode((j && j.code) || 'fr.failed'), 'is-err');
            else showBlMsg(tr('analytics.bl.removed', 'Removed from watchlist.'), 'is-nomatch');
            closeBlDrawer();
            loadBlacklist();
        }).catch(function () {
            showBlMsg(messageForCode('fr.network'), 'is-err');
        });
    }

    function openRemoveModal(id) {
        pendingRemoveId = id;
        var modal = document.getElementById('ax-bl-remove-modal');
        if (modal) modal.hidden = false;
    }

    function onBlTableClick(ev) {
        var t = ev.target;
        if (!t || !t.closest) return;
        if (t.closest && t.closest('a.ax-bl-face-link')) return;
        var row = t.closest('tr[data-id]');
        if (!row) return;
        var id = row.getAttribute('data-id');
        if (t.classList.contains('ax-bl-toggle')) {
            var en = t.getAttribute('data-enabled') === '1';
            fetch('/api/analytics/fr/blacklist/' + encodeURIComponent(id), {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: en }),
            }).then(function (r) { return r.json(); }).then(function (j) {
                if (!j || !j.ok) showBlMsg(messageForCode((j && j.code) || 'fr.failed'), 'is-err');
                loadBlacklist();
            }).catch(function () {
                showBlMsg(messageForCode('fr.network'), 'is-err');
            });
            return;
        }
        if (t.classList.contains('ax-bl-del')) {
            openRemoveModal(id);
            return;
        }
        if (t.classList.contains('ax-bl-open') || t.closest('.ax-bl-open')) {
            openBlDrawer(id);
        }
    }

    function onShow(opts) {
        opts = opts || {};
        setGate();
        if (frLicensed()) {
            showPanel(currentPanel || 'face');
        }
        if (typeof I18n !== 'undefined' && I18n.scheduleApply) {
            I18n.scheduleApply(document.getElementById('app-view-analytics'));
        }
    }

    function bootAnalyticsWhenLicensed() {
        setGate();
        if (!frLicensed()) return;
        var ax = document.getElementById('app-view-analytics');
        var popout = document.documentElement.classList.contains('analytics-popout-mode');
        if (!ax || (!popout && ax.hidden)) return;
        showPanel(currentPanel || 'face');
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        document.querySelectorAll('.ax-hub-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                showPanel(btn.getAttribute('data-panel'));
            });
        });
        var blThr = document.getElementById('ax-bl-threshold');
        var blThrVal = document.getElementById('ax-bl-threshold-val');
        if (blThr && blThrVal) {
            blThr.addEventListener('input', function () {
                blThrVal.textContent = String(blThr.value) + '%';
            });
        }
        var blThrSave = document.getElementById('ax-bl-threshold-save');
        if (blThrSave) blThrSave.addEventListener('click', saveFrThreshold);
        var blThrCancel = document.getElementById('ax-bl-threshold-cancel');
        if (blThrCancel) blThrCancel.addEventListener('click', closeThresholdPasswordModal);
        var blThrConfirm = document.getElementById('ax-bl-threshold-confirm');
        if (blThrConfirm) blThrConfirm.addEventListener('click', submitThresholdPasswordModal);
        var blThrPassword = document.getElementById('ax-bl-threshold-password');
        if (blThrPassword) {
            blThrPassword.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    submitThresholdPasswordModal();
                }
                if (ev.key === 'Escape') {
                    ev.preventDefault();
                    closeThresholdPasswordModal();
                }
            });
        }
        var blThrModal = document.getElementById('ax-bl-threshold-modal');
        if (blThrModal) {
            blThrModal.addEventListener('click', function (ev) {
                if (ev.target === blThrModal) closeThresholdPasswordModal();
            });
        }
        var blRemoveCancel = document.getElementById('ax-bl-remove-cancel');
        if (blRemoveCancel) blRemoveCancel.addEventListener('click', closeRemoveModal);
        var blRemoveConfirm = document.getElementById('ax-bl-remove-confirm');
        if (blRemoveConfirm) blRemoveConfirm.addEventListener('click', submitRemoveModal);
        var blRemoveModal = document.getElementById('ax-bl-remove-modal');
        if (blRemoveModal) {
            blRemoveModal.addEventListener('click', function (ev) {
                if (ev.target === blRemoveModal) closeRemoveModal();
            });
        }
        document.addEventListener('keydown', function (ev) {
            var pickerModal = document.getElementById('ax-bl-face-picker-modal');
            if (pickerModal && !pickerModal.hidden) {
                if (ev.key === 'Escape') {
                    ev.preventDefault();
                    closeFacePicker();
                }
                if (ev.key === 'Enter' && facePicker.cropFile) {
                    ev.preventDefault();
                    if (facePicker.entryId) addSampleFromRecentCrop(facePicker.cropFile);
                    else enrollFromRecentCrop(facePicker.cropFile);
                }
                return;
            }
            var removeModal = document.getElementById('ax-bl-remove-modal');
            if (removeModal && !removeModal.hidden) {
                if (ev.key === 'Escape') {
                    ev.preventDefault();
                    closeRemoveModal();
                }
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    submitRemoveModal();
                }
                return;
            }
            var migrateModal = document.getElementById('ax-bl-migrate-modal');
            if (!migrateModal || migrateModal.hidden) return;
            if (ev.key === 'Escape') {
                ev.preventDefault();
                closeMigrateModal();
            }
            if (ev.key === 'Enter') {
                ev.preventDefault();
                submitMigrateGallery();
            }
        });
        var vbtn = document.getElementById('ax-fr-verify-btn');
        if (vbtn) vbtn.addEventListener('click', runVerify);
        var ebtn = document.getElementById('ax-bl-enroll-btn');
        if (ebtn) ebtn.addEventListener('click', enrollBlacklist);
        var eBwc = document.getElementById('ax-bl-enroll-bwc-btn');
        if (eBwc) eBwc.addEventListener('click', enrollFromBwcStill);
        var pickerGroup = document.getElementById('ax-bl-face-picker-group');
        if (pickerGroup) {
            pickerGroup.addEventListener('change', function () {
                facePicker.groupId = String(pickerGroup.value || '');
                facePicker.camId = '';
                renderFacePickerCams();
                loadFacePickerSnaps();
                scheduleWatchlistDraftSave();
            });
        }
        var pickerCam = document.getElementById('ax-bl-face-picker-cam');
        if (pickerCam) {
            pickerCam.addEventListener('change', function () {
                facePicker.camId = String(pickerCam.value || '');
                loadFacePickerSnaps();
                scheduleWatchlistDraftSave();
            });
        }
        var pickerGrid = document.getElementById('ax-bl-face-picker-grid');
        if (pickerGrid) {
            pickerGrid.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest ? ev.target.closest('.ax-bl-face-pick') : null;
                if (!btn) return;
                facePicker.cropFile = String(btn.getAttribute('data-crop') || '');
                renderFacePickerSnaps();
                scheduleWatchlistDraftSave();
            });
        }
        var pickerUse = document.getElementById('ax-bl-face-picker-use');
        if (pickerUse) {
            pickerUse.addEventListener('click', function () {
                if (facePicker.entryId) addSampleFromRecentCrop(facePicker.cropFile);
                else enrollFromRecentCrop(facePicker.cropFile);
            });
        }
        var pickerCancel = document.getElementById('ax-bl-face-picker-cancel');
        if (pickerCancel) pickerCancel.addEventListener('click', closeFacePicker);
        var pickerModal = document.getElementById('ax-bl-face-picker-modal');
        if (pickerModal) {
            pickerModal.addEventListener('click', function (ev) {
                if (ev.target === pickerModal) closeFacePicker();
            });
        }
        var photoEl = document.getElementById('ax-bl-photo');
        if (photoEl) {
            photoEl.addEventListener('change', function () {
                clearPendingCrop();
                if (photoEl.files && photoEl.files[0]) openEnrollCropper(photoEl.files[0]);
                scheduleWatchlistDraftSave();
            });
        }
        var cropOpen = document.getElementById('ax-bl-crop-open');
        if (cropOpen) {
            cropOpen.addEventListener('click', function () {
                var f = (photoEl && photoEl.files && photoEl.files[0]) || pendingEnrollFile;
                if (!f) {
                    showBlMsg(tr('analytics.bl.cropNeedFile', 'Choose a photo first.'), 'is-err');
                    return;
                }
                openEnrollCropper(f);
            });
        }
        var rbtn = document.getElementById('ax-bl-refresh');
        if (rbtn) rbtn.addEventListener('click', loadBlacklist);
        var mbtn = document.getElementById('ax-bl-migrate-btn');
        if (mbtn) mbtn.addEventListener('click', migrateGallery);
        var migrateCancel = document.getElementById('ax-bl-migrate-cancel');
        if (migrateCancel) migrateCancel.addEventListener('click', closeMigrateModal);
        var migrateConfirm = document.getElementById('ax-bl-migrate-confirm');
        if (migrateConfirm) migrateConfirm.addEventListener('click', submitMigrateGallery);
        var migrateModal = document.getElementById('ax-bl-migrate-modal');
        if (migrateModal) {
            migrateModal.addEventListener('click', function (ev) {
                if (ev.target === migrateModal) closeMigrateModal();
            });
        }
        var search = document.getElementById('ax-bl-search');
        if (search) {
            var t = null;
            search.addEventListener('input', function () {
                clearTimeout(t);
                t = setTimeout(loadBlacklist, 300);
            });
        }
        var gradeFilter = document.getElementById('ax-bl-grade-filter');
        if (gradeFilter) gradeFilter.addEventListener('change', loadBlacklist);
        var reasonEl = document.getElementById('ax-bl-reason');
        if (reasonEl) reasonEl.addEventListener('change', syncReasonOtherVisibility);
        syncReasonOtherVisibility();
        bindWatchlistDraftGuard();
        var tbody = document.getElementById('ax-bl-tbody');
        if (tbody) tbody.addEventListener('click', onBlTableClick);
        var drawerClose = document.getElementById('ax-bl-drawer-close');
        if (drawerClose) drawerClose.addEventListener('click', closeBlDrawer);
        var matchDbgBtn = document.getElementById('ax-bl-match-debug-btn');
        if (matchDbgBtn) matchDbgBtn.addEventListener('click', runMatchDebug);
        var addSampleBtn = document.getElementById('ax-bl-add-sample-btn');
        if (addSampleBtn) addSampleBtn.addEventListener('click', function () {
            if (blDrawerId) openFacePicker(blDrawerId);
        });
        var drawer = document.getElementById('ax-bl-drawer');
        if (drawer) {
            drawer.addEventListener('click', function (ev) {
                if (ev.target === drawer) closeBlDrawer();
            });
        }
        if (global.LicenseFeatures && LicenseFeatures.onReady) {
            LicenseFeatures.onReady(function () { bootAnalyticsWhenLicensed(); });
        }
        if (global.FrOfflineVideo && FrOfflineVideo.bindUi) FrOfflineVideo.bindUi();
    }

    global.AnalyticsHub = {
        onShow: onShow,
        bindUi: bindUi,
        showPanel: showPanel,
        refreshGate: setGate,
        gradeLabel: gradeLabel,
        reasonLabel: reasonLabel,
        messageForCode: messageForCode,
    };
})(window);
