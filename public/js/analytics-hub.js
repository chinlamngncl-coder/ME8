/**
 * Analytics Hub \u2014 Face FR: Live shell, Verify 1:1, Watchlist enroll/dossier.
 * Operator-facing copy only \u2014 no install/script/port jargon on screen.
 */
(function (global) {
    var currentPanel = 'face';
    var weaponHealthTimer = null;
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
        return !!(global.LicenseFeatures && LicenseFeatures.isEnabled
            && (LicenseFeatures.isEnabled('analyticsFr') || LicenseFeatures.isEnabled('fr')));
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
            var anprOn = !!(global.LicenseFeatures && LicenseFeatures.isEnabled
                && (LicenseFeatures.isEnabled('analyticsAnpr') || LicenseFeatures.isEnabled('anpr')));
            anprBtn.disabled = !anprOn;
            anprBtn.title = anprOn ? '' : tr('analytics.moduleNotLicensed', 'Module not licensed');
        }
        if (weaponBtn) {
            var weaponOn = !!(global.LicenseFeatures && LicenseFeatures.isEnabled
                && LicenseFeatures.isEnabled('analyticsWeapon'));
            weaponBtn.disabled = !weaponOn;
            weaponBtn.title = weaponOn ? '' : tr('analytics.moduleNotLicensed', 'Module not licensed');
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
            'fr.image_too_small': ['analytics.bl.imageTooSmall', 'This photo is too low-resolution. Use a clearer, larger photo (at least about 480\u00D7480 pixels).'],
            'fr.busy': ['analytics.verify.busy', 'Face matching is busy. Wait a moment and try again.'],
            'fr.bad_file': ['analytics.verify.badFile', 'Use JPEG/PNG ID photo, or Add recent snapshots from BWC.'],
            'fr.timeout': ['analytics.verify.timeout', 'Face matching took too long. Try again with smaller photos.'],
            'fr.blacklist_full': ['analytics.bl.full', 'Watchlist is full. Disable or remove an entry before adding another.'],
            'fr.not_found': ['analytics.bl.notFound', 'That watchlist entry was not found.'],
            'fr.failed': ['analytics.verify.failed', 'Face matching could not complete this check. Try again or contact your administrator.'],
            'fr.network': ['analytics.verify.network', 'Could not reach the server. Check your connection and try again.'],
            'anpr.not_licensed': ['analytics.anpr.notLicensed', 'ANPR is not licensed on this server.'],
            'anpr.service_down': ['analytics.anpr.serviceDown', 'Plate reading is not available. Ask your administrator to check the ANPR service.'],
            'anpr.need_image': ['analytics.anpr.needImage', 'Choose a photo first, then crop the plate.'],
            'anpr.need_plate': ['analytics.anpr.lists.needPlate', 'Enter a plate number.'],
            'anpr.plate_exists': ['analytics.anpr.lists.plateExists', 'That plate is already on a list.'],
            'anpr.list_full': ['analytics.anpr.lists.full', 'Plate list is full. Remove an entry before adding another.'],
            'anpr.no_plate': ['analytics.anpr.noPlate', 'No plate found in this photo. Crop tighter on the number plate and try again.'],
            'anpr.format_reject': ['analytics.anpr.formatReject', 'No reliable plate read — the text did not match a valid plate format. Re-crop or try again.'],
            'anpr.quality_low': ['analytics.anpr.qualityLow', 'No reliable plate read — confidence too low. Re-crop closer to the plate and try again.'],
            'anpr.bad_file': ['analytics.anpr.badFile', 'Use a JPEG or PNG photo of the plate.'],
            'anpr.timeout': ['analytics.anpr.timeout', 'Plate reading took too long. Try again with a smaller crop.'],
            'anpr.busy': ['analytics.anpr.busy', 'Plate reading is busy. Wait a moment and try again.'],
            'anpr.failed': ['analytics.anpr.failed', 'Plate reading could not complete. Try again or contact your administrator.'],
            'anpr.network': ['analytics.verify.network', 'Could not reach the server. Check your connection and try again.'],
        };
        var entry = map[code] || map['fr.failed'];
        return tr(entry[0], entry[1]);
    }

    function isFrFamilyPanel(panel) {
        return panel === 'face' || panel === 'verify' || panel === 'blacklist';
    }

    var frLiveSub = 'live';

    function showFrLiveOffline(sub) {
        frLiveSub = (sub === 'offline') ? 'offline' : 'live';
        document.querySelectorAll('#ax-hub-fr-subnav .ax-hub-nav-btn').forEach(function (btn) {
            var frSub = btn.getAttribute('data-fr-sub');
            var panel = btn.getAttribute('data-panel');
            var active = false;
            if (panel === 'face' && (frSub === 'live' || frSub === 'offline')) {
                active = frSub === frLiveSub && currentPanel === 'face';
            } else if (panel === currentPanel) {
                active = true;
            }
            btn.classList.toggle('active', active);
        });
        var liveView = document.getElementById('ax-fr-live-view');
        var offlineView = document.getElementById('ax-fr-offline-view');
        var isOfflineSub = currentPanel === 'face' && frLiveSub === 'offline';
        if (liveView) liveView.hidden = !(currentPanel === 'face' && frLiveSub === 'live');
        if (offlineView) offlineView.hidden = !isOfflineSub;
        /* MASTER-CONSOLIDATION-PATCH-V1 — offline job status is shared toolbar chrome;
           don't let "Done — N face crop(s)" from a finished offline scan bleed into Live Watch. */
        var offlineStatusEl = document.getElementById('ax-fr-offline-status');
        if (offlineStatusEl) offlineStatusEl.hidden = !isOfflineSub || !offlineStatusEl.textContent;
        if (global.FrAlarm && typeof FrAlarm.syncLiveOfflineSurface === 'function') {
            FrAlarm.syncLiveOfflineSurface(isOfflineSub);
        }
    }

    function showPanel(panel) {
        var next = panel || 'face';
        if (next !== 'weapon') stopWeaponHealthPoll();
        currentPanel = next;
        var primaryKey = isFrFamilyPanel(currentPanel) ? 'face' : currentPanel;
        document.querySelectorAll('.ax-hub-nav-primary > .ax-hub-nav-btn[data-panel]').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-panel') === primaryKey);
        });
        var frSubNav = document.getElementById('ax-hub-fr-subnav');
        if (frSubNav) frSubNav.hidden = !isFrFamilyPanel(currentPanel);
        var frHealth = document.getElementById('ax-fr-sidecar-status');
        if (frHealth) frHealth.hidden = !isFrFamilyPanel(currentPanel);
        document.querySelectorAll('.ax-hub-panel').forEach(function (el) {
            var id = el.id || '';
            var name = id.replace(/^ax-panel-/, '');
            el.hidden = name !== currentPanel;
        });
        var ksBar = document.getElementById('ax-fr-hits-bar');
        if (ksBar) ksBar.hidden = currentPanel !== 'face';
        if (currentPanel === 'face') {
            showFrLiveOffline(frLiveSub || 'live');
        } else {
            showFrLiveOffline('live');
            document.querySelectorAll('#ax-hub-fr-subnav .ax-hub-nav-btn').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-panel') === currentPanel);
            });
        }
        if (currentPanel === 'verify' || currentPanel === 'blacklist') refreshSidecarStatus();
        if (currentPanel === 'anpr') {
            refreshAnprStatus();
            showAnprSub(anprSubPanel || 'snapshot');
            setTimeout(function () { consumeAutoLoadAnprFile(); }, 60);
        }
        if (currentPanel === 'blacklist') {
            refreshBlStatus();
            loadFrSettings();
            loadBlacklist();
        }
        if (currentPanel === 'face') {
            if (global.FrAlarm && FrAlarm.init) FrAlarm.init();
            if (frLiveSub === 'live' && global.FrLiveWatch && FrLiveWatch.onShow) FrLiveWatch.onShow();
            refreshSidecarStatus();
        }
        if (currentPanel === 'weapon') {
            refreshWeaponStatus();
            if (global.WeaponLiveWatch && WeaponLiveWatch.onShow) WeaponLiveWatch.onShow();
        }
    }

    function paintEngineHealth(el, kind, text) {
        if (!el) return;
        el.classList.remove('ok', 'bad', 'warn');
        if (kind === 'ok' || kind === 'bad' || kind === 'warn') {
            el.classList.add(kind);
        }
        el.textContent = text;
    }

    function refreshSidecarStatus() {
        var el = document.getElementById('ax-fr-sidecar-status');
        if (!el) return;
        paintEngineHealth(el, '', tr('analytics.verify.engineChecking', 'Checking FR Engine\u2026'));
        fetch('/api/analytics/fr/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || !data.featureEnabled) {
                    paintEngineHealth(el, 'warn', tr('analytics.verify.engineNotLicensed', 'FR Engine \u2014 Not licensed'));
                    return;
                }
                if (data.runtime && data.runtime.ok) {
                    paintEngineHealth(el, 'ok', tr('analytics.verify.engineOk', 'FR Engine \u2014 OK'));
                } else {
                    paintEngineHealth(el, 'bad', tr('analytics.verify.engineDown', 'FR Engine \u2014 Not available'));
                }
            })
            .catch(function () {
                paintEngineHealth(el, 'bad', tr('analytics.verify.engineDown', 'FR Engine \u2014 Not available'));
            });
    }

    function stopWeaponHealthPoll() {
        if (weaponHealthTimer) {
            clearInterval(weaponHealthTimer);
            weaponHealthTimer = null;
        }
    }

    function startWeaponHealthPoll() {
        if (weaponHealthTimer) return;
        weaponHealthTimer = setInterval(function () {
            if (currentPanel !== 'weapon') {
                stopWeaponHealthPoll();
                return;
            }
            refreshWeaponStatus({ quiet: true });
        }, 2000);
    }

    function weaponEngineFullyReady(runtime) {
        return !!(runtime && runtime.ok && runtime.ready !== false && !runtime.warming);
    }

    /** WEAPON-ENGINE-WARM-AUTO-V1: poll until ready while Weapon panel open — no page refresh. */
    function refreshWeaponStatus(opts) {
        opts = opts || {};
        var el = document.getElementById('ax-wd-engine-health');
        if (!el) return;
        if (!opts.quiet) {
            paintEngineHealth(el, '', tr('analytics.weapon.engineChecking', 'Checking Weapon Engine\u2026'));
        }
        fetch('/api/analytics/weapon/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (currentPanel !== 'weapon') {
                    stopWeaponHealthPoll();
                    return;
                }
                if (!data || !data.featureEnabled) {
                    stopWeaponHealthPoll();
                    paintEngineHealth(el, 'warn', tr('analytics.weapon.engineNotLicensed', 'Weapon Engine \u2014 Not licensed'));
                    return;
                }
                if (weaponEngineFullyReady(data.runtime)) {
                    paintEngineHealth(el, 'ok', tr('analytics.weapon.engineOk', 'Weapon Engine \u2014 OK'));
                    stopWeaponHealthPoll();
                    if (global.WeaponLiveWatch && WeaponLiveWatch.onShow) WeaponLiveWatch.onShow();
                    return;
                }
                if (data.runtime && data.runtime.ok &&
                    (data.runtime.warming || data.runtime.ready === false)) {
                    paintEngineHealth(el, 'warn', tr('analytics.weapon.engineWarming', 'Weapon Engine \u2014 Warming\u2026'));
                    startWeaponHealthPoll();
                    return;
                }
                paintEngineHealth(el, 'warn', tr('analytics.weapon.engineNotReady', 'Weapon Engine \u2014 Not ready'));
                startWeaponHealthPoll();
            })
            .catch(function () {
                if (currentPanel !== 'weapon') {
                    stopWeaponHealthPoll();
                    return;
                }
                paintEngineHealth(el, 'bad', tr('analytics.weapon.engineNotReady', 'Weapon Engine \u2014 Not ready'));
                startWeaponHealthPoll();
            });
    }

    var anprSourceFile = null;
    var anprCropFile = null;
    var anprPreviewUrl = null;
    var anprCropPreviewUrl = null;
    var anprSubPanel = 'snapshot';
    var plRemoveId = null;
    var anprBatchFiles = [];
    var anprBatchBusy = false;
    var ANPR_BATCH_MAX = 100;
    var ANPR_BATCH_CONCURRENCY = 2;

    function plateGradeLabel(code) {
        var map = {
            suspicious: ['analytics.anpr.lists.gradeSuspicious', 'Suspicious'],
            wanted: ['analytics.anpr.lists.gradeWanted', 'Wanted'],
            blacklist: ['analytics.anpr.lists.gradeBlacklist', 'Blacklist'],
        };
        var entry = map[code] || map.suspicious;
        return tr(entry[0], entry[1]);
    }

    function plateGradeBadgeHtml(code) {
        var c = code || 'suspicious';
        return '<span class="ax-bl-grade is-' + esc(c) + '">' + esc(plateGradeLabel(c)) + '</span>';
    }

    function showAnprSub(sub) {
        /* Live ingest removed — never surface Live panel; keep ids for cache-safe DOM. */
        if (sub === 'live') sub = 'snapshot';
        if (sub === 'lists') anprSubPanel = 'lists';
        else if (sub === 'offline') anprSubPanel = 'offline';
        else if (sub === 'history') anprSubPanel = 'history';
        else anprSubPanel = 'snapshot';
        document.querySelectorAll('.ax-anpr-subnav .ax-anpr-subnav-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-anpr-sub') === anprSubPanel);
        });
        var live = document.getElementById('ax-anpr-sub-live-panel');
        var snap = document.getElementById('ax-anpr-sub-snapshot-panel');
        var lists = document.getElementById('ax-anpr-sub-lists-panel');
        var offline = document.getElementById('ax-anpr-sub-offline-panel');
        var history = document.getElementById('ax-anpr-sub-history-panel');
        if (live) {
            live.hidden = true;
            live.setAttribute('aria-hidden', 'true');
        }
        if (snap) snap.hidden = anprSubPanel !== 'snapshot';
        if (lists) lists.hidden = anprSubPanel !== 'lists';
        if (offline) offline.hidden = anprSubPanel !== 'offline';
        if (history) history.hidden = anprSubPanel !== 'history';
        if (anprSubPanel === 'lists') loadPlateLists();
        if (global.AnprLiveWatch && typeof AnprLiveWatch.onHide === 'function') {
            AnprLiveWatch.onHide();
        }
        if (anprSubPanel === 'offline') {
            /* Bind glass/card open even if Live was never opened */
            if (global.AnprLiveWatch && typeof AnprLiveWatch.ensureUiBound === 'function') {
                AnprLiveWatch.ensureUiBound();
            }
            /* Paint Recent Plates empty state even when Live watch is not active */
            if (global.AnprLiveWatch && typeof AnprLiveWatch.renderRail === 'function') {
                AnprLiveWatch.renderRail();
            }
            if (global.AnprLiveWatch && typeof AnprLiveWatch.paintHitSlots === 'function') {
                AnprLiveWatch.paintHitSlots();
            }
            if (global.AnprOfflineMatch && AnprOfflineMatch.onShow) {
                AnprOfflineMatch.onShow();
            }
            if (global.AnprImageInvestigation && AnprImageInvestigation.onShow) {
                AnprImageInvestigation.onShow();
            }
        } else if (global.AnprOfflineMatch && AnprOfflineMatch.onHide) {
            AnprOfflineMatch.onHide();
            if (global.AnprImageInvestigation && AnprImageInvestigation.onHide) {
                AnprImageInvestigation.onHide();
            }
        }
        if (anprSubPanel === 'history' && global.AnprHistory && AnprHistory.onShow) {
            AnprHistory.onShow();
        }
        /* Offline (and non-Live): hide subnav "Active Watchlist Hits" — Live only */
        if (global.AnprLiveWatch && typeof AnprLiveWatch.syncSubnavWatchBadge === 'function') {
            AnprLiveWatch.syncSubnavWatchBadge();
        }
    }

    function showPlMsg(ok, html, cls) {
        var box = document.getElementById('ax-pl-msg');
        if (!box) return;
        box.hidden = false;
        box.className = 'ax-fr-verify-result' + (cls ? ' ' + cls : '');
        box.innerHTML = html;
    }

    function hidePlMsg() {
        var box = document.getElementById('ax-pl-msg');
        if (!box) return;
        box.hidden = true;
        box.innerHTML = '';
        box.className = 'ax-fr-verify-result';
    }

    function canManageAnalyticsLists() {
        try {
            return !!(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer());
        } catch (_) {
            return false;
        }
    }

    function loadPlateLists() {
        var tbody = document.getElementById('ax-pl-tbody');
        var countEl = document.getElementById('ax-pl-count');
        if (!tbody) return;
        if (!anprLicensed()) {
            tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(messageForCode('anpr.not_licensed')) + '</td></tr>';
            return;
        }
        var qEl = document.getElementById('ax-pl-search');
        var gEl = document.getElementById('ax-pl-grade-filter');
        var q = qEl ? String(qEl.value || '').trim() : '';
        var grade = gEl ? String(gEl.value || '').trim() : '';
        var url = '/api/analytics/anpr/lists';
        var params = [];
        if (q) params.push('q=' + encodeURIComponent(q));
        if (grade) params.push('listStatus=' + encodeURIComponent(grade));
        if (params.length) url += '?' + params.join('&');
        tbody.innerHTML = '<tr><td colspan="7" class="hint">' + esc(tr('analytics.anpr.lists.loading', 'Loading\u2026')) + '</td></tr>';
        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var rows = (data && data.entries) || [];
                if (countEl) {
                    countEl.textContent = tr('analytics.anpr.lists.count', '{n} plates')
                        .replace('{n}', String(rows.length));
                }
                if (!rows.length) {
                    tbody.innerHTML = '<tr><td colspan="7" class="hint">' +
                        esc(tr('analytics.anpr.lists.empty', 'No plates on this list yet.')) + '</td></tr>';
                    return;
                }
                tbody.innerHTML = rows.map(function (e) {
                    var when = e.enrolledAt ? String(e.enrolledAt).slice(0, 19).replace('T', ' ') : '\u2014';
                    var st = e.enabled === false
                        ? tr('analytics.bl.statusOff', 'Off')
                        : tr('analytics.bl.statusOn', 'On');
                    var removeCell = canManageAnalyticsLists()
                        ? ('<button type="button" class="btn btn-ghost btn-sm ax-pl-remove-btn" data-pl-id="' +
                            esc(e.id) + '">' + esc(tr('analytics.bl.remove', 'Remove')) + '</button>')
                        : '<span class="hint">\u2014</span>';
                    return '<tr data-pl-id="' + esc(e.id) + '">' +
                        '<td><strong>' + esc(e.plate || e.plateCompact || '\u2014') + '</strong></td>' +
                        '<td>' + esc(e.displayName || '\u2014') + '</td>' +
                        '<td>' + plateGradeBadgeHtml(e.listStatus) + '</td>' +
                        '<td>' + esc(reasonLabel(e.reasonCode)) + '</td>' +
                        '<td>' + esc(when) + '</td>' +
                        '<td>' + esc(st) + '</td>' +
                        '<td>' + removeCell + '</td>' +
                        '</tr>';
                }).join('');
            })
            .catch(function () {
                tbody.innerHTML = '<tr><td colspan="7" class="hint">' +
                    esc(messageForCode('anpr.network')) + '</td></tr>';
            });
    }

    function enrollPlateList() {
        if (!anprLicensed()) {
            showPlMsg(false, messageForCode('anpr.not_licensed'), 'is-err');
            return;
        }
        var plateEl = document.getElementById('ax-pl-plate');
        var plate = plateEl ? String(plateEl.value || '').trim() : '';
        if (!plate) {
            showPlMsg(false, messageForCode('anpr.need_plate'), 'is-err');
            return;
        }
        var gradeEl = document.getElementById('ax-pl-grade');
        var reasonEl = document.getElementById('ax-pl-reason');
        var reasonOtherEl = document.getElementById('ax-pl-reason-other');
        var labelEl = document.getElementById('ax-pl-label');
        var idEl = document.getElementById('ax-pl-id');
        var notesEl = document.getElementById('ax-pl-notes');
        var makeEl = document.getElementById('ax-pl-make');
        var modelEl = document.getElementById('ax-pl-model');
        var colorEl = document.getElementById('ax-pl-color');
        var btn = document.getElementById('ax-pl-enroll-btn');
        if (btn) btn.disabled = true;
        hidePlMsg();
        fetch('/api/analytics/anpr/lists', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                plate: plate,
                displayName: labelEl ? labelEl.value : '',
                idNumber: idEl ? idEl.value : '',
                notes: notesEl ? notesEl.value : '',
                listStatus: gradeEl ? gradeEl.value : 'suspicious',
                reasonCode: reasonEl ? reasonEl.value : 'suspicious',
                reasonOther: reasonOtherEl ? reasonOtherEl.value : '',
                registeredMake: makeEl ? makeEl.value : '',
                registeredModel: modelEl ? modelEl.value : '',
                registeredColor: colorEl ? colorEl.value : '',
            }),
        })
            .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
            .then(function (pack) {
                var j = pack.j || {};
                if (j.ok && j.entry) {
                    showPlMsg(true, esc(tr('analytics.anpr.lists.enrolled', 'Plate added to list.')), 'is-ok');
                    if (plateEl) plateEl.value = '';
                    if (labelEl) labelEl.value = '';
                    if (idEl) idEl.value = '';
                    if (notesEl) notesEl.value = '';
                    if (makeEl) makeEl.value = '';
                    if (modelEl) modelEl.value = '';
                    if (colorEl) colorEl.value = '';
                    loadPlateLists();
                    return;
                }
                showPlMsg(false, esc(j.message || messageForCode(j.code || 'anpr.failed')), 'is-err');
            })
            .catch(function () {
                showPlMsg(false, messageForCode('anpr.network'), 'is-err');
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    }

    function openPlRemoveModal(id) {
        plRemoveId = id || null;
        var modal = document.getElementById('ax-pl-remove-modal');
        if (modal) modal.hidden = false;
    }

    function closePlRemoveModal() {
        plRemoveId = null;
        var modal = document.getElementById('ax-pl-remove-modal');
        if (modal) modal.hidden = true;
    }

    function confirmPlRemove() {
        if (!plRemoveId) return;
        var id = plRemoveId;
        fetch('/api/analytics/anpr/lists/' + encodeURIComponent(id), {
            method: 'DELETE',
            credentials: 'same-origin',
        })
            .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
            .then(function (pack) {
                closePlRemoveModal();
                if (pack.j && pack.j.ok) {
                    showPlMsg(true, esc(tr('analytics.anpr.lists.removed', 'Plate removed.')), 'is-ok');
                    loadPlateLists();
                    return;
                }
                showPlMsg(false, messageForCode('anpr.failed'), 'is-err');
            })
            .catch(function () {
                closePlRemoveModal();
                showPlMsg(false, messageForCode('anpr.network'), 'is-err');
            });
    }

    function anprLicensed() {
        return !!(global.LicenseFeatures && LicenseFeatures.isEnabled
            && (LicenseFeatures.isEnabled('analyticsAnpr') || LicenseFeatures.isEnabled('anpr')));
    }

    /* ANPR-ENGINE-BADGE-STABLE-V1 — sticky OK; 3 consecutive fails → Off. */
    var ANPR_HEALTH_FAIL_NEED = 3;
    var anprHealthFailStreak = 0;
    var anprHealthLastKind = '';

    function refreshAnprStatus() {
        var el = document.getElementById('ax-anpr-status');
        if (!el) return;
        if (!anprLicensed()) {
            anprHealthFailStreak = 0;
            anprHealthLastKind = 'warn';
            paintEngineHealth(el, 'warn', tr('analytics.anpr.engineNotLicensed', 'ANPR Engine \u2014 Not licensed'));
            return;
        }
        if (!anprHealthLastKind) {
            paintEngineHealth(el, '', tr('analytics.anpr.engineChecking', 'Checking ANPR Engine\u2026'));
        }
        fetch('/api/analytics/anpr/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || !data.featureEnabled) {
                    anprHealthFailStreak = 0;
                    anprHealthLastKind = 'warn';
                    paintEngineHealth(el, 'warn', tr('analytics.anpr.engineNotLicensed', 'ANPR Engine \u2014 Not licensed'));
                    return;
                }
                if (data.runtime && (
                    data.runtime.ok
                    || data.runtime.dualEngine === true
                    || String(data.runtime.engine || '').indexOf('dual') >= 0
                    || data.runtime.fastalpr === 'ready'
                    || data.runtime.ocr === 'ready'
                )) {
                    anprHealthFailStreak = 0;
                    anprHealthLastKind = 'ok';
                    paintEngineHealth(el, 'ok', tr('analytics.anpr.engineOk', 'ANPR Engine \u2014 OK'));
                } else {
                    anprHealthFailStreak += 1;
                    if (anprHealthFailStreak >= ANPR_HEALTH_FAIL_NEED || anprHealthLastKind !== 'ok') {
                        anprHealthLastKind = 'bad';
                        paintEngineHealth(el, 'bad', tr('analytics.anpr.engineDown', 'ANPR Engine \u2014 Not available'));
                    }
                }
            })
            .catch(function () {
                anprHealthFailStreak += 1;
                if (anprHealthFailStreak >= ANPR_HEALTH_FAIL_NEED || anprHealthLastKind !== 'ok') {
                    anprHealthLastKind = 'bad';
                    paintEngineHealth(el, 'bad', tr('analytics.anpr.engineDown', 'ANPR Engine \u2014 Not available'));
                }
            });
    }

    function showAnprMsg(ok, html, cls) {
        var box = document.getElementById('ax-anpr-msg');
        if (!box) return;
        box.hidden = false;
        box.className = 'ax-fr-verify-result' + (cls ? ' ' + cls : '');
        box.innerHTML = html;
    }

    function hideAnprMsg() {
        var box = document.getElementById('ax-anpr-msg');
        if (!box) return;
        box.hidden = true;
        box.innerHTML = '';
        box.className = 'ax-fr-verify-result';
    }

    function setAnprActionMode(mode) {
        var readBtn = document.getElementById('ax-anpr-read-btn');
        var clearBtn = document.getElementById('ax-anpr-clear');
        var cropBtn = document.getElementById('ax-anpr-crop-btn');
        if (readBtn) readBtn.hidden = false;
        if (cropBtn) cropBtn.hidden = false;
        if (clearBtn) clearBtn.hidden = false;
        void mode;
    }

    function resetAnprResultCard() {
        var card = document.getElementById('ax-anpr-result-card');
        var plateEl = document.getElementById('ax-anpr-plate');
        var confEl = document.getElementById('ax-anpr-confidence');
        var noteEl = document.getElementById('ax-anpr-note');
        var matchEl = document.getElementById('ax-anpr-list-match');
        var thumb = document.getElementById('ax-anpr-crop-thumb');
        if (card) card.className = 'ax-anpr-result-card ax-anpr-active-card match-idle';
        if (plateEl) plateEl.textContent = tr('analytics.anpr.plateIdle', 'Awaiting analysis');
        if (confEl) confEl.textContent = '';
        if (confEl) {
            confEl.hidden = true;
            confEl.setAttribute('aria-hidden', 'true');
        }
        var badge = document.getElementById('ax-anpr-watchlist-badge');
        if (badge) badge.hidden = true;
        if (noteEl) noteEl.textContent = '';
        if (matchEl) {
            matchEl.hidden = true;
            matchEl.textContent = '';
            matchEl.className = 'ax-anpr-list-match';
        }
        if (thumb) {
            thumb.hidden = true;
            thumb.removeAttribute('src');
        }
        if (anprCropPreviewUrl) {
            try { URL.revokeObjectURL(anprCropPreviewUrl); } catch (_) { /* ignore */ }
            anprCropPreviewUrl = null;
        }
    }

    function showAnprResultCard(data) {
        var card = document.getElementById('ax-anpr-result-card');
        var plateEl = document.getElementById('ax-anpr-plate');
        var confEl = document.getElementById('ax-anpr-confidence');
        var noteEl = document.getElementById('ax-anpr-note');
        var matchEl = document.getElementById('ax-anpr-list-match');
        var thumb = document.getElementById('ax-anpr-crop-thumb');
        var plate = (data && data.plate) ? String(data.plate) : '\u2014';
        var hit = data && data.listMatch ? data.listMatch : null;
        if (card) {
            card.className = 'ax-anpr-result-card ax-anpr-active-card' + (hit ? ' is-watchlist-hit' : ' is-ok');
        }
        if (plateEl) plateEl.textContent = plate;
        var badge = document.getElementById('ax-anpr-watchlist-badge');
        if (badge) badge.hidden = !hit;
        if (confEl) {
            confEl.textContent = '';
            confEl.hidden = true;
            confEl.setAttribute('aria-hidden', 'true');
        }
        if (matchEl) {
            if (hit) {
                var grade = plateGradeLabel(hit.listStatus);
                var label = hit.displayName ? (' \u2014 ' + hit.displayName) : '';
                matchEl.textContent = tr('analytics.anpr.lists.hit', 'List hit: {grade}{label}')
                    .replace('{grade}', grade)
                    .replace('{label}', label);
                matchEl.className = 'ax-anpr-list-match is-hit';
                matchEl.hidden = false;
            } else {
                matchEl.textContent = tr('analytics.anpr.lists.noHit', 'Not on plate list');
                matchEl.className = 'ax-anpr-list-match is-clear';
                matchEl.hidden = false;
            }
        }
        if (noteEl) {
            noteEl.textContent = '';
        }
        if (thumb && anprCropFile) {
            if (anprCropPreviewUrl) {
                try { URL.revokeObjectURL(anprCropPreviewUrl); } catch (_) { /* ignore */ }
            }
            anprCropPreviewUrl = URL.createObjectURL(anprCropFile);
            thumb.src = anprCropPreviewUrl;
            thumb.hidden = false;
        }
    }

    function setAnprPreview(file) {
        var zone = document.getElementById('ax-anpr-dropzone');
        var img = document.getElementById('ax-anpr-preview');
        if (anprPreviewUrl) {
            try { URL.revokeObjectURL(anprPreviewUrl); } catch (_) { /* ignore */ }
            anprPreviewUrl = null;
        }
        if (!file || !img) {
            if (zone) zone.classList.remove('has-preview');
            if (img) img.removeAttribute('src');
            return;
        }
        anprPreviewUrl = URL.createObjectURL(file);
        img.src = anprPreviewUrl;
        if (zone) zone.classList.add('has-preview');
    }

    function clearAnprUi() {
        anprSourceFile = null;
        anprCropFile = null;
        var fileEl = document.getElementById('ax-anpr-file');
        if (fileEl) fileEl.value = '';
        setAnprPreview(null);
        resetAnprResultCard();
        hideAnprMsg();
        setAnprActionMode('edit');
    }

    /** Unassigned Evidence → ANPR auto-flow (sessionStorage.autoLoadAnprFile). */
    function consumeAutoLoadAnprFile() {
        var raw = '';
        try {
            raw = sessionStorage.getItem('autoLoadAnprFile') || '';
            sessionStorage.removeItem('autoLoadAnprFile');
        } catch (_) {
            raw = '';
        }
        if (!raw) {
            try {
                var legacy = sessionStorage.getItem('ftpInboxPendingAnpr');
                if (legacy) {
                    var parsed = JSON.parse(legacy);
                    raw = (parsed && (parsed.rel || parsed.url)) || '';
                    sessionStorage.removeItem('ftpInboxPendingAnpr');
                }
            } catch (_) { /* ignore */ }
        }
        if (!raw) return false;
        showAnprSub('snapshot');
        var url = String(raw);
        if (url.indexOf('/api/') !== 0 && url.indexOf('http') !== 0) {
            url = '/api/ftp-inbox/file?rel=' + encodeURIComponent(raw);
        }
        showAnprMsg(true, tr('analytics.anpr.reading', 'Reading plate\u2026'), '');
        fetch(url, { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('load_failed');
                return r.blob().then(function (blob) {
                    var name = 'unassigned-plate.jpg';
                    try {
                        var m = String(raw).split(/[/\\]/).pop();
                        if (m) name = m;
                    } catch (_) { /* ignore */ }
                    return new File([blob], name, { type: blob.type || 'image/jpeg' });
                });
            })
            .then(function (file) {
                anprSourceFile = file;
                anprCropFile = null;
                setAnprPreview(file);
                /* Skip crop modal for auto-flow — run /read immediately on full image */
                runAnprRead();
            })
            .catch(function () {
                showAnprMsg(false, messageForCode('anpr.need_image'), 'is-err');
            });
        return true;
    }

    function openAnprCropper(file) {
        if (!file) {
            showAnprMsg(false, messageForCode('anpr.need_image'), 'is-err');
            return;
        }
        if (!global.AnprPlateCropper || !AnprPlateCropper.open) {
            anprCropFile = file;
            setAnprPreview(file);
            showAnprMsg(true, tr('analytics.anpr.cropFallback', 'Crop tool unavailable \u2014 using full image.'), '');
            return;
        }
        AnprPlateCropper.open(file, function (cropped) {
            if (!cropped) {
                showAnprMsg(false, tr('analytics.anpr.cropExportFail', 'Could not build crop image.'), 'is-err');
                return;
            }
            anprCropFile = cropped;
            setAnprPreview(cropped);
            hideAnprMsg();
            resetAnprResultCard();
            setAnprActionMode('edit');
            showAnprMsg(true, tr('analytics.anpr.cropReadyPreview', 'Crop ready \u2014 click Read plate.'), 'is-match');
        });
    }

    function onAnprFileChange() {
        var fileEl = document.getElementById('ax-anpr-file');
        var file = fileEl && fileEl.files && fileEl.files[0];
        hideAnprMsg();
        resetAnprResultCard();
        setAnprActionMode('edit');
        anprCropFile = null;
        if (!file) {
            anprSourceFile = null;
            setAnprPreview(null);
            return;
        }
        anprSourceFile = file;
        setAnprPreview(file);
        openAnprCropper(file);
    }

    function runAnprRead() {
        var file = anprCropFile || anprSourceFile;
        if (!file) {
            showAnprMsg(false, messageForCode('anpr.need_image'), 'is-err');
            return;
        }
        if (!anprLicensed()) {
            showAnprMsg(false, messageForCode('anpr.not_licensed'), 'is-err');
            return;
        }
        var readBtn = document.getElementById('ax-anpr-read-btn');
        if (readBtn) readBtn.disabled = true;
        showAnprMsg(true, tr('analytics.anpr.reading', 'Reading plate\u2026'), '');
        var fd = new FormData();
        fd.append('photo', file, file.name || 'anpr-plate.jpg');
        fetch('/api/analytics/anpr/read', { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (j.ok && j.plate) {
                    showAnprResultCard(j);
                    hideAnprMsg();
                    setAnprActionMode('result');
                    return;
                }
                var code = j.code || 'anpr.failed';
                showAnprMsg(false, messageForCode(code), 'is-err');
                var card = document.getElementById('ax-anpr-result-card');
                if (card) card.className = 'ax-anpr-result-card ax-anpr-active-card is-err';
                var plateEl = document.getElementById('ax-anpr-plate');
                if (plateEl) plateEl.textContent = tr('analytics.anpr.plateIdle', 'Awaiting analysis');
                var badge = document.getElementById('ax-anpr-watchlist-badge');
                if (badge) badge.hidden = true;
                var confEl = document.getElementById('ax-anpr-confidence');
                if (confEl) {
                    confEl.textContent = '';
                    confEl.hidden = true;
                    confEl.setAttribute('aria-hidden', 'true');
                }
                var noteEl = document.getElementById('ax-anpr-note');
                if (noteEl) noteEl.textContent = '';
            })
            .catch(function () {
                showAnprMsg(false, messageForCode('anpr.network'), 'is-err');
            })
            .finally(function () {
                if (readBtn) readBtn.disabled = false;
            });
    }

    function setAnprBatchStatus(text) {
        var el = document.getElementById('ax-anpr-batch-status');
        if (el) el.textContent = text || '';
    }

    function syncAnprBatchButtons() {
        var runBtn = document.getElementById('ax-anpr-batch-run');
        var clearBtn = document.getElementById('ax-anpr-batch-clear');
        var n = anprBatchFiles.length;
        if (runBtn) runBtn.disabled = anprBatchBusy || n < 1;
        if (clearBtn) clearBtn.disabled = anprBatchBusy || n < 1;
        var empty = document.getElementById('ax-anpr-batch-drop-empty');
        var batchFileEl = document.getElementById('ax-anpr-batch-file');
        if (empty) {
            var browseHtml = '<button type="button" class="ax-anpr-browse-link" id="ax-anpr-batch-browse-btn">Browse Files</button>';
            if (n === 1) {
                empty.innerHTML = '1 file selected<br>' + browseHtml;
            } else if (n > 1) {
                empty.innerHTML = String(n) + ' files selected<br>' + browseHtml;
            } else {
                empty.innerHTML = 'Drop photos here (max 100)<br>' + browseHtml;
            }
            var bb = document.getElementById('ax-anpr-batch-browse-btn');
            if (bb && batchFileEl) {
                bb.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    batchFileEl.click();
                });
            }
        }
        if (!anprBatchBusy) {
            setAnprBatchStatus('');
        }
    }

    function clearAnprBatchUi() {
        anprBatchFiles = [];
        anprBatchBusy = false;
        var fileEl = document.getElementById('ax-anpr-batch-file');
        if (fileEl) fileEl.value = '';
        var box = document.getElementById('ax-anpr-batch-results');
        if (box) box.innerHTML = '';
        var head = document.getElementById('ax-anpr-batch-results-heading');
        if (head) head.hidden = true;
        syncAnprBatchButtons();
        setAnprBatchStatus('');
    }

    function addAnprBatchFiles(fileList) {
        if (!fileList || !fileList.length) return;
        var accepted = 0;
        var skipped = 0;
        for (var i = 0; i < fileList.length; i++) {
            if (anprBatchFiles.length >= ANPR_BATCH_MAX) {
                skipped += (fileList.length - i);
                break;
            }
            var f = fileList[i];
            if (!f || !f.type || String(f.type).indexOf('image/') !== 0) {
                skipped += 1;
                continue;
            }
            anprBatchFiles.push(f);
            accepted += 1;
        }
        syncAnprBatchButtons();
        if (skipped) {
            setAnprBatchStatus('+' + accepted + ' · skipped ' + skipped);
        }
    }

    function renderAnprBatchRow(item) {
        var box = document.getElementById('ax-anpr-batch-results');
        if (!box) return;
        var head = document.getElementById('ax-anpr-batch-results-heading');
        if (head) head.hidden = false;
        var hitsOnly = document.getElementById('ax-anpr-batch-hits-only');
        if (hitsOnly && hitsOnly.checked && !item.hit) return;
        var row = document.createElement('div');
        row.className = 'ax-anpr-batch-row'
            + (item.hit ? ' is-hit' : '')
            + (item.error ? ' is-err' : '');
        row.setAttribute('role', 'listitem');
        var thumbHtml = item.thumbUrl
            ? '<img class="ax-anpr-batch-row-thumb" alt="" src="' + esc(item.thumbUrl) + '">'
            : '<div class="ax-anpr-batch-row-thumb" aria-hidden="true"></div>';
        var plate = item.plate || tr('analytics.anpr.batchNoPlate', 'No plate');
        var listLine = item.hit
            ? tr('analytics.anpr.lists.hit', 'List hit: {grade}{label}')
                .replace('{grade}', plateGradeLabel(item.hit.listStatus))
                .replace('{label}', item.hit.displayName ? (' \u2014 ' + item.hit.displayName) : '')
            : (item.error
                ? String(item.error)
                : tr('analytics.anpr.lists.noHit', 'Not on plate list'));
        row.innerHTML = thumbHtml
            + '<div><div class="ax-anpr-batch-row-plate">' + esc(plate) + '</div>'
            + '<div class="ax-anpr-batch-row-meta">' + esc(item.name || '') + '</div></div>'
            + '<div class="ax-anpr-batch-row-list' + (item.hit ? ' is-hit' : '') + '">' + esc(listLine) + '</div>';
        box.appendChild(row);
    }

    function readAnprBatchOne(file) {
        var fd = new FormData();
        fd.append('photo', file, file.name || 'anpr-batch.jpg');
        return fetch('/api/analytics/anpr/read', { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j || {} }; });
            })
            .then(function (pack) {
                var j = pack.j;
                var thumbUrl = null;
                try { thumbUrl = URL.createObjectURL(file); } catch (_) { /* ignore */ }
                if (j.ok && j.plate) {
                    return {
                        name: file.name || '',
                        plate: String(j.plate),
                        hit: j.listMatch || null,
                        thumbUrl: thumbUrl,
                        error: null,
                    };
                }
                return {
                    name: file.name || '',
                    plate: null,
                    hit: null,
                    thumbUrl: thumbUrl,
                    error: messageForCode(j.code || 'anpr.no_plate'),
                };
            })
            .catch(function () {
                var thumbUrl = null;
                try { thumbUrl = URL.createObjectURL(file); } catch (_) { /* ignore */ }
                return {
                    name: file.name || '',
                    plate: null,
                    hit: null,
                    thumbUrl: thumbUrl,
                    error: messageForCode('anpr.network'),
                };
            });
    }

    function runAnprBatch() {
        if (anprBatchBusy) return;
        if (!anprLicensed()) {
            setAnprBatchStatus(messageForCode('anpr.not_licensed'));
            return;
        }
        if (!anprBatchFiles.length) return;
        anprBatchBusy = true;
        syncAnprBatchButtons();
        var box = document.getElementById('ax-anpr-batch-results');
        if (box) box.innerHTML = '';
        var head = document.getElementById('ax-anpr-batch-results-heading');
        if (head) head.hidden = true;
        var queue = anprBatchFiles.slice();
        var total = queue.length;
        var done = 0;
        var hits = 0;
        var cursor = 0;

        function pump() {
            if (cursor >= queue.length) return Promise.resolve();
            var file = queue[cursor++];
            setAnprBatchStatus(String(done) + ' / ' + total + (hits ? (' · ' + hits + ' hit') : ''));
            return readAnprBatchOne(file).then(function (item) {
                done += 1;
                if (item.hit) hits += 1;
                renderAnprBatchRow(item);
                setAnprBatchStatus(String(done) + ' / ' + total + (hits ? (' · ' + hits + ' hit') : ''));
                return pump();
            });
        }

        var workers = [];
        var n = Math.min(ANPR_BATCH_CONCURRENCY, queue.length);
        for (var w = 0; w < n; w++) workers.push(pump());
        Promise.all(workers).then(function () {
            anprBatchBusy = false;
            syncAnprBatchButtons();
            setAnprBatchStatus(String(done) + ' done' + (hits ? (' · ' + hits + ' hit') : ''));
        });
    }

    function bindAnprBatchUi() {
        var zone = document.getElementById('ax-anpr-batch-dropzone');
        var fileEl = document.getElementById('ax-anpr-batch-file');
        var runBtn = document.getElementById('ax-anpr-batch-run');
        var clearBtn = document.getElementById('ax-anpr-batch-clear');
        var hitsOnly = document.getElementById('ax-anpr-batch-hits-only');
        if (fileEl) {
            fileEl.addEventListener('change', function () {
                addAnprBatchFiles(fileEl.files);
                try { fileEl.value = ''; } catch (_) { /* ignore */ }
            });
        }
        if (zone) {
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
                if (ev.dataTransfer && ev.dataTransfer.files) {
                    addAnprBatchFiles(ev.dataTransfer.files);
                }
            });
            zone.addEventListener('click', function (ev) {
                if (ev.target && ev.target.id === 'ax-anpr-batch-browse-btn') return;
                if (fileEl) fileEl.click();
            });
        }
        if (runBtn) runBtn.addEventListener('click', runAnprBatch);
        if (clearBtn) clearBtn.addEventListener('click', clearAnprBatchUi);
        if (hitsOnly) {
            hitsOnly.addEventListener('change', function () {
                var rows = document.querySelectorAll('#ax-anpr-batch-results .ax-anpr-batch-row');
                var only = !!hitsOnly.checked;
                rows.forEach(function (row) {
                    if (!only) {
                        row.hidden = false;
                        return;
                    }
                    row.hidden = !row.classList.contains('is-hit');
                });
            });
        }
        syncAnprBatchButtons();
    }

    function bindAnprSingleDropzone() {
        var zone = document.getElementById('ax-anpr-dropzone');
        var fileEl = document.getElementById('ax-anpr-file');
        var browse = document.getElementById('ax-anpr-browse-btn');
        if (browse && fileEl) {
            browse.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                fileEl.click();
            });
        }
        if (zone && fileEl) {
            zone.addEventListener('click', function (ev) {
                if (ev.target && (ev.target.id === 'ax-anpr-browse-btn' || ev.target.closest && ev.target.closest('#ax-anpr-browse-btn'))) return;
                if (ev.target && ev.target.id === 'ax-anpr-preview') return;
                fileEl.click();
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
                var files = ev.dataTransfer && ev.dataTransfer.files;
                if (!files || !files.length) return;
                var f = files[0];
                try {
                    var dt = new DataTransfer();
                    dt.items.add(f);
                    fileEl.files = dt.files;
                    onAnprFileChange();
                } catch (_) {
                    anprSourceFile = f;
                    anprCropFile = null;
                    setAnprPreview(f);
                    openAnprCropper(f);
                    setAnprActionMode('edit');
                }
            });
        }
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
                    el.textContent = tr('analytics.verify.engineNotLicensed', 'FR Engine \u2014 Not licensed');
                    el.hidden = false;
                    return;
                }
                if (data.runtime && data.runtime.ok) {
                    el.hidden = true;
                    el.textContent = '';
                } else {
                    el.textContent = tr('analytics.verify.engineDown', 'FR Engine \u2014 Not available');
                    el.hidden = false;
                }
            })
            .catch(function () {
                el.textContent = tr('analytics.verify.engineDown', 'FR Engine \u2014 Not available');
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

    function hideVerifyStatus() {
        var box = document.getElementById('ax-fr-verify-result');
        if (!box) return;
        box.hidden = true;
        box.innerHTML = '';
        box.className = 'ax-fr-verify-result';
    }

    function setVerifyActionMode(mode) {
        var runBtn = document.getElementById('ax-fr-verify-btn');
        var clearBtn = document.getElementById('ax-fr-verify-clear');
        if (mode === 'result') {
            if (runBtn) runBtn.hidden = true;
            if (clearBtn) clearBtn.hidden = false;
        } else {
            if (runBtn) runBtn.hidden = false;
            if (clearBtn) clearBtn.hidden = true;
        }
    }

    function hideMatchResults() {
        var panel = document.getElementById('ax-fr-match-results');
        var scoreEl = document.getElementById('ax-fr-match-score');
        var verdictEl = document.getElementById('ax-fr-match-verdict');
        if (panel) {
            panel.hidden = false;
            panel.className = 'match-results-display match-idle';
        }
        if (scoreEl) scoreEl.textContent = tr('analytics.verify.scoreIdle', 'Awaiting verify');
        if (verdictEl) verdictEl.textContent = '';
    }

    function showMatchResults(scorePct, verified) {
        var panel = document.getElementById('ax-fr-match-results');
        var scoreEl = document.getElementById('ax-fr-match-score');
        var verdictEl = document.getElementById('ax-fr-match-verdict');
        if (!panel || !scoreEl) return;
        var n = scorePct != null && isFinite(Number(scorePct)) ? Number(scorePct) : null;
        var high = n != null ? n > 80 : !!verified;
        panel.hidden = false;
        panel.className = 'match-results-display ' + (high ? 'match-high' : 'match-low');
        scoreEl.textContent = n != null ? (Math.round(n * 10) / 10) + '%' : '\u2014';
        if (verdictEl) {
            verdictEl.textContent = verified
                ? tr('analytics.verify.match', 'Match')
                : tr('analytics.verify.nomatch', 'No match');
        }
        setVerifyActionMode('result');
        hideVerifyStatus();
    }

    function clearDropzonePreview(slot) {
        var zone = document.getElementById('ax-fr-dropzone-' + slot);
        var img = document.getElementById('ax-fr-preview-' + slot);
        if (zone) zone.classList.remove('has-preview');
        if (img) {
            img.removeAttribute('src');
            img.alt = slot === 1 ? 'Photo A preview' : 'Photo B preview';
        }
    }

    function previewVerifyFile(input, slot) {
        var file = input && input.files && input.files[0] ? input.files[0] : null;
        var zone = document.getElementById('ax-fr-dropzone-' + slot);
        var img = document.getElementById('ax-fr-preview-' + slot);
        if (!file || !img) {
            clearDropzonePreview(slot);
            return;
        }
        if (!file.type || file.type.indexOf('image/') !== 0) {
            clearDropzonePreview(slot);
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {
            img.src = String(reader.result || '');
            img.alt = file.name || (slot === 1 ? 'Photo A' : 'Photo B');
            if (zone) zone.classList.add('has-preview');
        };
        reader.onerror = function () {
            clearDropzonePreview(slot);
        };
        reader.readAsDataURL(file);
        /* Selecting new photos leaves prior score visible until re-run or clear */
        hideMatchResults();
        setVerifyActionMode('upload');
        hideVerifyStatus();
    }

    function clearVerifyUi() {
        var f1 = document.getElementById('ax-fr-file1');
        var f2 = document.getElementById('ax-fr-file2');
        if (f1) f1.value = '';
        if (f2) f2.value = '';
        clearDropzonePreview(1);
        clearDropzonePreview(2);
        hideMatchResults();
        hideVerifyStatus();
        setVerifyActionMode('upload');
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
            showBlMsg(tr('analytics.bl.cropFallback', 'Crop tool unavailable \u2014 using full image.'), '');
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

    /** mob-fr-score-result-plain \u2014 one operator line only (no engine/file/dims dump) */
    function runMatchDebug() {
        var id = blDrawerId;
        if (!id) {
            showMatchDebugResult(tr('analytics.bl.matchDebugNeedEntry', 'Open a watchlist person first.'), 'is-err');
            return;
        }
        var btn = document.getElementById('ax-bl-match-debug-btn');
        if (btn) btn.disabled = true;
        showMatchDebugResult(tr('analytics.bl.matchDebugRunning', 'Checking\u2026'), '');
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
                var pctStr = pct != null ? String(pct) : '\u2014';
                var line = tr(
                    'analytics.bl.matchDebugPlain',
                    'Match: {pct}% \u00B7 need {bar}% \u00B7 {result}'
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
        if (title) title.textContent = e.displayName || '\u2014';
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
        var when = e.enrolledAt ? String(e.enrolledAt).replace('T', ' ').slice(0, 19) : '\u2014';
        var rows = [
            [tr('analytics.bl.grade', 'Watch grade'), gradeBadgeHtml(e.listStatus)],
            [tr('analytics.bl.reason', 'Reason'), esc(reasonLabel(e.reasonCode, e.reasonOther))],
            [tr('analytics.bl.idNumber', 'ID / case ref'), esc(e.idNumber || '\u2014')],
            [tr('analytics.bl.lastSeen', 'Last seen'), esc(e.lastSeen || '\u2014')],
            [tr('analytics.bl.lastIncident', 'Last incident'), esc(e.lastIncident || '\u2014')],
            [tr('analytics.bl.notes', 'Notes'), esc(e.notes || '\u2014')],
            [tr('analytics.bl.colWhen', 'Enrolled'), esc(when)],
            [tr('analytics.bl.enrolledBy', 'Enrolled by'), esc(e.enrolledBy || '\u2014')],
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
                    (src ? ('<img src="' + esc(src) + '" alt="">') : '<span>\u2014</span>') +
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
            hideMatchResults();
            setVerifyActionMode('upload');
            showVerifyResult(false, messageForCode('fr.need_two'), 'is-err');
            return;
        }
        var fd = new FormData();
        fd.append('file1', f1.files[0]);
        fd.append('file2', f2.files[0]);
        fd.append('model', 'Facenet');
        if (btn) btn.disabled = true;
        hideMatchResults();
        setVerifyActionMode('upload');
        showVerifyResult(false, tr('analytics.verify.running', 'Comparing photos\u2026'), '');
        fetch('/api/analytics/fr/verify', { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function (r) {
                return r.json().then(function (j) { return { status: r.status, j: j }; }).catch(function () {
                    return { status: r.status, j: { ok: false, code: 'fr.failed' } };
                });
            })
            .then(function (pack) {
                var j = pack.j || {};
                if (j.ok && (j.verified === true || j.verified === false)) {
                    showMatchResults(j.scorePct, j.verified);
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
                hideMatchResults();
                setVerifyActionMode('upload');
                showVerifyResult(false, messageForCode(code), 'is-err');
            })
            .catch(function () {
                hideMatchResults();
                setVerifyActionMode('upload');
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
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="hint">' + esc(tr('analytics.bl.loading', 'Loading\u2026')) + '</td></tr>';
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
                    var when = e.enrolledAt ? String(e.enrolledAt).replace('T', ' ').slice(0, 19) : '\u2014';
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
                        : '<span class="ax-bl-face-ph" aria-hidden="true">\u2014</span>';
                    var toggleBtn = canManageAnalyticsLists()
                        ? ('<button type="button" class="btn btn-ghost btn-sm ax-bl-toggle" data-enabled="' +
                            (en ? '0' : '1') + '">' + esc(toggleLabel) + '</button> ')
                        : '';
                    var removeBtn = canManageAnalyticsLists()
                        ? ('<button type="button" class="btn btn-ghost btn-sm ax-bl-del">' +
                            esc(tr('analytics.bl.remove', 'Remove')) + '</button>')
                        : '<span class="hint">\u2014</span>';
                    return '<tr class="' + (en ? '' : 'is-disabled') + '" data-id="' + esc(e.id) + '">' +
                        '<td class="ax-bl-face-td">' + faceCell + '</td>' +
                        '<td><button type="button" class="ax-bl-name-btn ax-bl-open">' + esc(e.displayName) + '</button></td>' +
                        '<td>' + gradeBadgeHtml(e.listStatus) + '</td>' +
                        '<td>' + esc(reasonLabel(e.reasonCode, e.reasonOther)) + '</td>' +
                        '<td>' + esc(e.idNumber || '\u2014') + '</td>' +
                        '<td>' + esc(when) + '</td>' +
                        '<td>' + esc(status) + '</td>' +
                        '<td>' + toggleBtn + removeBtn + '</td></tr>';
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
        showBlMsg(tr('analytics.bl.thresholdSaving', 'Saving match threshold\u2026'), '');
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
        if (!iso) return '\u2014';
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
            var score = s.scorePct != null ? (' \u00B7 ' + Math.round(Number(s.scorePct) || 0) + '%') : '';
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
        showBlMsg('Adding BWC snapshot\u2026', '');
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
        showBlMsg('Adding BWC snapshot\u2026', '');
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
                            ' \u00B7 ' + esc(j.entry.displayName) +
                            (j.cropFile ? (' \u00B7 ' + esc(String(j.cropFile))) : ''),
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
        showBlMsg(tr('analytics.bl.enrolling', 'Enrolling\u2026'), '');

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
                        showBlMsg(tr('analytics.bl.enrolled', 'Added to watchlist.') + ' \u00B7 ' + esc(j.entry.displayName), 'is-match');
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
        showBlMsg('Refreshing Watchlist vectors\u2026', '');
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
                        line += ' \u00B7 ' + esc(first.displayName || first.id || '') + ': ' + esc(first.error || '');
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
        document.querySelectorAll('.ax-hub-nav-primary > .ax-hub-nav-btn[data-panel]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                showPanel(btn.getAttribute('data-panel'));
            });
        });
        document.querySelectorAll('#ax-hub-fr-subnav .ax-hub-nav-btn[data-panel]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                var panel = btn.getAttribute('data-panel');
                var frSub = btn.getAttribute('data-fr-sub');
                if (panel === 'face' && (frSub === 'live' || frSub === 'offline')) {
                    frLiveSub = frSub;
                    showPanel('face');
                    return;
                }
                showPanel(panel);
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
        var vclear = document.getElementById('ax-fr-verify-clear');
        if (vclear) vclear.addEventListener('click', clearVerifyUi);
        var vf1 = document.getElementById('ax-fr-file1');
        if (vf1) vf1.addEventListener('change', function () { previewVerifyFile(vf1, 1); });
        var vf2 = document.getElementById('ax-fr-file2');
        if (vf2) vf2.addEventListener('change', function () { previewVerifyFile(vf2, 2); });
        var anprFile = document.getElementById('ax-anpr-file');
        if (anprFile) anprFile.addEventListener('change', onAnprFileChange);
        var anprCropBtn = document.getElementById('ax-anpr-crop-btn');
        if (anprCropBtn) {
            anprCropBtn.addEventListener('click', function () {
                var f = anprSourceFile || anprCropFile;
                if (!f) {
                    showAnprMsg(false, messageForCode('anpr.need_image'), 'is-err');
                    return;
                }
                openAnprCropper(f);
            });
        }
        var anprReadBtn = document.getElementById('ax-anpr-read-btn');
        if (anprReadBtn) anprReadBtn.addEventListener('click', runAnprRead);
        var anprClear = document.getElementById('ax-anpr-clear');
        if (anprClear) anprClear.addEventListener('click', clearAnprUi);
        bindAnprSingleDropzone();
        bindAnprBatchUi();
        setAnprActionMode('edit');
        document.querySelectorAll('.ax-anpr-subnav .ax-anpr-subnav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showAnprSub(btn.getAttribute('data-anpr-sub'));
            });
        });
        var plEnroll = document.getElementById('ax-pl-enroll-btn');
        if (plEnroll) plEnroll.addEventListener('click', enrollPlateList);
        var plRefresh = document.getElementById('ax-pl-refresh');
        if (plRefresh) plRefresh.addEventListener('click', loadPlateLists);
        var plSearch = document.getElementById('ax-pl-search');
        if (plSearch) {
            plSearch.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    loadPlateLists();
                }
            });
        }
        var plGradeFilter = document.getElementById('ax-pl-grade-filter');
        if (plGradeFilter) plGradeFilter.addEventListener('change', loadPlateLists);
        var plReason = document.getElementById('ax-pl-reason');
        if (plReason) {
            plReason.addEventListener('change', function () {
                var wrap = document.getElementById('ax-pl-reason-other-wrap');
                if (wrap) wrap.hidden = String(plReason.value || '') !== 'other';
            });
        }
        var plTbody = document.getElementById('ax-pl-tbody');
        if (plTbody) {
            plTbody.addEventListener('click', function (ev) {
                var t = ev.target;
                if (!t || !t.classList || !t.classList.contains('ax-pl-remove-btn')) return;
                openPlRemoveModal(t.getAttribute('data-pl-id'));
            });
        }
        var plRmCancel = document.getElementById('ax-pl-remove-cancel');
        if (plRmCancel) plRmCancel.addEventListener('click', closePlRemoveModal);
        var plRmConfirm = document.getElementById('ax-pl-remove-confirm');
        if (plRmConfirm) plRmConfirm.addEventListener('click', confirmPlRemove);
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
        consumeAutoLoadAnprFile: consumeAutoLoadAnprFile,
    };
})(window);
