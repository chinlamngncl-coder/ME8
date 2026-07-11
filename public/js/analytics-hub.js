/**
 * Analytics Hub — Face FR: Live shell, Verify 1:1, Watchlist enroll/dossier.
 * Operator-facing copy only — no install/script/port jargon on screen.
 */
(function (global) {
    var currentPanel = 'face';
    var bound = false;
    var blById = {};
    var pendingEnrollFile = null;
    var pendingEnrollPreviewUrl = null;

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
            'fr.bad_file': ['analytics.verify.badFile', 'This file type or size is not supported. Use JPEG or PNG (30 KB–20 MB).'],
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
    }

    function openBlDrawer(id) {
        var e = blById[id];
        var drawer = document.getElementById('ax-bl-drawer');
        if (!e || !drawer) return;
        var title = document.getElementById('ax-bl-drawer-title');
        var face = document.getElementById('ax-bl-drawer-face');
        var dl = document.getElementById('ax-bl-drawer-dl');
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
        if (file.size < 30000 || file.size > 20 * 1024 * 1024) {
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
            if (!window.confirm(tr('analytics.bl.confirmRemove', 'Remove this person from the watchlist?'))) return;
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
        var thr = document.getElementById('ax-fr-threshold');
        var thrVal = document.getElementById('ax-fr-threshold-val');
        if (thr && thrVal) {
            thr.addEventListener('input', function () {
                thrVal.textContent = String(thr.value) + '%';
                if (global.FrLiveWatch && FrLiveWatch.emitWatchSlots) FrLiveWatch.emitWatchSlots();
            });
        }
        var vbtn = document.getElementById('ax-fr-verify-btn');
        if (vbtn) vbtn.addEventListener('click', runVerify);
        var ebtn = document.getElementById('ax-bl-enroll-btn');
        if (ebtn) ebtn.addEventListener('click', enrollBlacklist);
        var photoEl = document.getElementById('ax-bl-photo');
        if (photoEl) {
            photoEl.addEventListener('change', function () {
                clearPendingCrop();
                if (photoEl.files && photoEl.files[0]) openEnrollCropper(photoEl.files[0]);
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
        var tbody = document.getElementById('ax-bl-tbody');
        if (tbody) tbody.addEventListener('click', onBlTableClick);
        var drawerClose = document.getElementById('ax-bl-drawer-close');
        if (drawerClose) drawerClose.addEventListener('click', closeBlDrawer);
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
