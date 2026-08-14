/**
 * WEAPON-ALARM-TOAST-BLINK-V1 — HQ blink + toast + hit queue.
 * WEAPON-ALERT-ACK-ONE-HIT-V1 — one Ack = one hitId; same cam queues (no overwrite).
 * OPS-CASE-WEAPON-MIGRATE-V1 — Ack/dismiss/overflow → server WD- cases; toast History → Evidence Cases.
 * No auto Ops. No SOS. No auto PTT. Operator chooses Ack / Open Weapon / Show on map.
 */
(function (global) {
    var current = null;
    var queue = [];
    var history = [];
    var MAX_QUEUE = 20;
    var MAX_PER_CAM = 5;
    var MAX_HISTORY = 100;
    var HISTORY_KEY = 'wd-weapon-alert-history-v1';
    var socketBound = false;
    var uiBound = false;

    /** Match i18n.js humanizeKey — missing keys must use fallback (not "Toast Title"). */
    function humanizeKeyTail(key) {
        var tail = String(key || '').split('.').pop() || String(key || '');
        return tail
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, function (c) { return c.toUpperCase(); })
            .trim();
    }

    function tr(key, fallback, params) {
        if (global.I18n && I18n.t) {
            var s = I18n.t(key, params);
            if (s && s !== key && s !== humanizeKeyTail(key)) return s;
        }
        var out = fallback != null ? String(fallback) : String(key || '');
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(function (k) {
                out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
            });
        }
        return out;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function cropUrl(hit) {
        if (!hit || !hit.cropFile) return '';
        return '/api/analytics/weapon/crop/' + encodeURIComponent(hit.cropFile);
    }

    function sameHit(a, b) {
        return !!(a && b && a.hitId && b.hitId && String(a.hitId) === String(b.hitId));
    }

    function loadHistory() {
        /* OPS-CASE-WEAPON-MIGRATE-V1 — session History is no longer the office; drop stale notes store. */
        try {
            if (global.sessionStorage) sessionStorage.removeItem(HISTORY_KEY);
        } catch (_) { /* ignore */ }
        history = [];
    }

    function saveHistory() {
        /* no-op: filing cabinet is Evidence → Cases */
    }

    function operatorName() {
        if (global.__fmDashboardUsername) return String(global.__fmDashboardUsername);
        var el = document.getElementById('header-session-user');
        var fromHeader = el && el.textContent ? String(el.textContent).trim() : '';
        if (fromHeader && fromHeader !== '—' && fromHeader !== '-') return fromHeader;
        var el2 = document.getElementById('display-dashboard-user');
        var fromDash = el2 && el2.textContent ? String(el2.textContent).trim() : '';
        if (fromDash && fromDash !== '—' && fromDash !== '-') return fromDash;
        return 'unknown';
    }

    function isSuperAdmin() {
        if (global.__fmDashboardRole === 'super_admin') return true;
        var roleEl = document.getElementById('header-session-role');
        if (roleEl && roleEl.classList && roleEl.classList.contains('super_admin')) return true;
        return false;
    }

    function dayStamp(at) {
        var d = new Date(at || Date.now());
        function p(n) { return n < 10 ? '0' + n : String(n); }
        return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    }

    function makeCaseId(hit) {
        var short = String((hit && hit.hitId) || 'x').replace(/[^a-zA-Z0-9]+/g, '').slice(-12) || 'x';
        return 'WD-' + dayStamp(hit && hit.at) + '-' + short;
    }

    function ensureCaseMeta(entry, hit) {
        if (!entry.kind) entry.kind = 'weapon';
        if (!entry.caseId) entry.caseId = makeCaseId(hit || entry);
        if (!entry.rev || entry.rev < 1) entry.rev = 0;
    }

    function bumpRev(entry) {
        entry.rev = (Number(entry.rev) || 0) + 1;
        return entry.rev;
    }

    function findHistory(hitId) {
        var id = String(hitId || '');
        var i;
        for (i = 0; i < history.length; i++) {
            if (history[i] && String(history[i].hitId) === id) return history[i];
        }
        return null;
    }

    function appendAudit(entry, action, noteText) {
        if (!entry) return;
        if (!Array.isArray(entry.audit)) entry.audit = [];
        var row = {
            at: Date.now(),
            user: operatorName(),
            action: String(action || 'touch'),
            rev: Number(entry.rev) || 0,
        };
        if (noteText != null && String(noteText).trim()) {
            row.note = String(noteText).trim().slice(0, 500);
        }
        entry.audit.unshift(row);
        if (entry.audit.length > 40) entry.audit = entry.audit.slice(0, 40);
        entry.lastTouchAt = row.at;
        entry.lastTouchUser = row.user;
        entry.lastTouchAction = row.action;
    }

    function wireOpsCase(hit, reason) {
        if (!hit || !hit.hitId) return;
        var payload = {
            hitId: hit.hitId,
            camId: hit.camId,
            cameraId: hit.camId,
            deviceName: hit.deviceName || null,
            cls: hit.cls || 'weapon',
            kind: hit.cls || 'weapon',
            at: hit.at || Date.now(),
            cropFile: hit.cropFile || null,
            conf: hit.conf != null ? hit.conf : null,
            closedReason: String(reason || 'ack'),
            caseId: hit.caseId || makeCaseId(hit),
        };
        try {
            fetch('/api/ops-cases/from-weapon', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok || !data || !data.ok) return;
                    if (data.case && data.case.caseId) {
                        var row = findHistory(hit.hitId);
                        if (row) {
                            row.caseId = data.case.caseId;
                            row.opsCaseId = data.case.caseId;
                            row.opsStatus = data.case.status;
                        }
                    }
                }).catch(function () { /* ignore */ });
            }).catch(function () { /* ignore — never block Ack */ });
        } catch (_) { /* ignore */ }
    }

    function goToWeaponCases(caseId) {
        try {
            if (global.OpsCasesUi && typeof OpsCasesUi.openWeaponCases === 'function') {
                OpsCasesUi.openWeaponCases({ caseId: caseId || null });
                return;
            }
        } catch (_) { /* ignore */ }
        try {
            if (global.EvidenceManager && EvidenceManager.showTab) {
                EvidenceManager.showTab('evidence');
            } else {
                var btnEv = document.getElementById('nav-tab-evidence');
                if (btnEv) btnEv.click();
            }
        } catch (_) { /* ignore */ }
        setTimeout(function () {
            try {
                if (global.EvidenceHub && EvidenceHub.showPanel) {
                    EvidenceHub.showPanel('ops-cases', { force: true });
                }
            } catch (_) { /* ignore */ }
        }, 150);
    }

    function pushHistory(hit, reason) {
        if (!hit || !hit.hitId) return;
        ensureCaseMeta(hit, hit);
        wireOpsCase(hit, reason);
        var existing = findHistory(hit.hitId);
        var entry = existing || {
            hitId: hit.hitId,
            camId: hit.camId,
            deviceName: hit.deviceName,
            cls: hit.cls,
            at: hit.at,
            cropFile: hit.cropFile,
            conf: hit.conf,
            caseId: hit.caseId || makeCaseId(hit),
        };
        entry.camId = hit.camId != null ? hit.camId : entry.camId;
        entry.deviceName = hit.deviceName != null ? hit.deviceName : entry.deviceName;
        entry.cls = hit.cls != null ? hit.cls : entry.cls;
        entry.at = hit.at != null ? hit.at : entry.at;
        entry.cropFile = hit.cropFile != null ? hit.cropFile : entry.cropFile;
        entry.conf = hit.conf != null ? hit.conf : entry.conf;
        ensureCaseMeta(entry, hit);
        entry.closedAt = Date.now();
        entry.closedReason = String(reason || 'ack');
        entry.closedBy = operatorName();
        history = history.filter(function (h) {
            return !(h && String(h.hitId) === String(entry.hitId));
        });
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        syncHistoryFab();
    }

    function formatWhen(at) {
        try {
            var d = new Date(at || Date.now());
            function p(n) { return n < 10 ? '0' + n : String(n); }
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
                ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
        } catch (_) {
            return '';
        }
    }

    function ensureUi() {
        var bar = document.getElementById('wd-hq-alert-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'wd-hq-alert-bar';
            bar.hidden = true;
            bar.setAttribute('role', 'status');
            bar.setAttribute('aria-live', 'assertive');
            bar.innerHTML =
                '<span class="wd-hq-alert-label">' + esc(tr('analytics.weapon.hqBarLabel', 'WEAPON')) + '</span>' +
                '<span class="wd-hq-alert-text" id="wd-hq-alert-text">&mdash;</span>' +
                '<span class="wd-hq-alert-pending" id="wd-hq-alert-pending" hidden>+0</span>' +
                '<div class="wd-hq-alert-actions">' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-hq-alert-history">' +
                esc(tr('analytics.weapon.hqCases', 'Cases')) + '</button>' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-hq-alert-open">' +
                esc(tr('analytics.weapon.hqOpenWeapon', 'Open Weapon')) + '</button>' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-hq-alert-map">' +
                esc(tr('analytics.weapon.hqShowMap', 'Show on map')) + '</button>' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-hq-alert-ack">' +
                esc(tr('analytics.fr.alarmAck', 'Ack')) + '</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="wd-hq-alert-dismiss">' +
                esc(tr('analytics.fr.alarmDismiss', 'Dismiss')) + '</button>' +
                '</div>';
            document.body.appendChild(bar);
        } else if (!document.getElementById('wd-hq-alert-history')) {
            var hqActions = bar.querySelector('.wd-hq-alert-actions');
            if (hqActions) {
                var hqHist = document.createElement('button');
                hqHist.type = 'button';
                hqHist.id = 'wd-hq-alert-history';
                hqHist.className = 'btn btn-action btn-sm';
                hqHist.textContent = tr('analytics.weapon.hqCases', 'Cases');
                hqActions.insertBefore(hqHist, hqActions.firstChild);
            }
        }

        var toast = document.getElementById('wd-weapon-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'wd-weapon-toast';
            toast.hidden = true;
            toast.innerHTML =
                '<div class="wd-weapon-toast-inner">' +
                '<div class="wd-weapon-toast-head">' +
                '<span class="wd-weapon-toast-title">' +
                esc(tr('analytics.weapon.toastTitle', 'Weapon detection')) + '</span>' +
                '<span class="wd-weapon-toast-queue" id="wd-weapon-toast-queue" hidden></span>' +
                '<button type="button" class="wd-weapon-toast-close" id="wd-weapon-toast-close" aria-label="' +
                esc(tr('common.close', 'Close')) + '">\u00D7</button>' +
                '</div>' +
                '<div class="wd-weapon-toast-body">' +
                '<div class="wd-weapon-toast-thumb-wrap">' +
                '<img id="wd-weapon-toast-thumb" alt="" hidden>' +
                '<span class="wd-weapon-toast-thumb-ph" id="wd-weapon-toast-thumb-ph">\u2014</span>' +
                '</div>' +
                '<div class="wd-weapon-toast-text">' +
                '<p class="wd-weapon-toast-line1" id="wd-weapon-toast-line1">\u2014</p>' +
                '<p class="wd-weapon-toast-line2" id="wd-weapon-toast-line2">\u2014</p>' +
                '</div>' +
                '</div>' +
                '<div class="wd-weapon-toast-actions">' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-weapon-toast-history">' +
                esc(tr('analytics.weapon.hqCases', 'Cases')) + '</button>' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-weapon-toast-open">' +
                esc(tr('analytics.weapon.hqOpenWeapon', 'Open Weapon')) + '</button>' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-weapon-toast-map">' +
                esc(tr('analytics.weapon.hqShowMap', 'Show on map')) + '</button>' +
                '<button type="button" class="btn btn-action btn-sm" id="wd-weapon-toast-ack">' +
                esc(tr('analytics.fr.alarmAck', 'Ack')) + '</button>' +
                '</div>' +
                '</div>';
            document.body.appendChild(toast);
        } else if (!document.getElementById('wd-weapon-toast-history')) {
            var toastActions = toast.querySelector('.wd-weapon-toast-actions');
            if (toastActions) {
                var tHist = document.createElement('button');
                tHist.type = 'button';
                tHist.id = 'wd-weapon-toast-history';
                tHist.className = 'btn btn-action btn-sm';
                tHist.textContent = tr('analytics.weapon.hqCases', 'Cases');
                toastActions.insertBefore(tHist, toastActions.firstChild);
            }
        }

        /* OPS-CASE-WEAPON-MIGRATE-V1 — hide toast History office / FAB. */
        var fab = document.getElementById('wd-weapon-history-fab');
        if (fab) fab.hidden = true;
        var panel = document.getElementById('wd-weapon-history');
        if (panel) panel.hidden = true;

        if (!uiBound) {
            uiBound = true;
            function bind(id, fn) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('click', fn);
            }
            bind('wd-hq-alert-ack', ackCurrent);
            bind('wd-hq-alert-dismiss', dismissCurrent);
            bind('wd-hq-alert-open', openWeapon);
            bind('wd-hq-alert-map', showOnMap);
            bind('wd-hq-alert-history', openHistory);
            bind('wd-weapon-toast-ack', ackCurrent);
            bind('wd-weapon-toast-close', dismissCurrent);
            bind('wd-weapon-toast-open', openWeapon);
            bind('wd-weapon-toast-map', showOnMap);
            bind('wd-weapon-toast-history', openHistory);
            bind('wd-weapon-history-fab', openHistory);
            bind('wd-weapon-history-close', closeHistory);
        }
        try {
            if (global.AnalyticToastDrag && typeof global.AnalyticToastDrag.enable === 'function') {
                global.AnalyticToastDrag.enable(toast, {
                    handle: '.wd-weapon-toast-head',
                    storageKey: 'ax-toast-pos-wd-weapon',
                });
            }
        } catch (_) { /* ignore */ }
    }

    function bindCaseUiOnce() {
        /* no-op — case office moved to Evidence → Cases */
    }

    function syncHistoryFab() {
        var fab = document.getElementById('wd-weapon-history-fab');
        if (fab) fab.hidden = true;
    }

    var caseHitId = null;

    function paintHistoryList() {
        /* no-op — toast History office removed */
    }

    function paintCase() {
        /* no-op — toast case office removed */
    }

    function openCase(hitId) {
        var entry = findHistory(hitId);
        var caseId = entry && (entry.opsCaseId || entry.caseId) ? (entry.opsCaseId || entry.caseId) : null;
        goToWeaponCases(caseId);
    }

    function closeCase() {
        caseHitId = null;
    }

    function saveCaseAddon() { /* office is Evidence → Cases */ }

    function editCaseNote() { /* office is Evidence → Cases */ }

    function deleteCaseNote() { /* office is Evidence → Cases */ }

    function openCaseSnap() {
        var entry = findHistory(caseHitId);
        if (!entry) return;
        reopenFromHistory(entry);
    }

    function openHistory() {
        goToWeaponCases(null);
    }

    function closeHistory() {
        var panel = document.getElementById('wd-weapon-history');
        if (panel) panel.hidden = true;
    }

    function reopenFromHistory(hit) {
        if (!hit) return;
        var entry = findHistory(hit.hitId) || hit;
        try {
            if (global.WeaponLiveWatch && typeof WeaponLiveWatch.openLightbox === 'function') {
                WeaponLiveWatch.openLightbox(entry);
                return;
            }
        } catch (_) { /* ignore */ }
        if (!current) {
            current = entry;
            paintCurrent();
        }
    }

    function syncQueueBadge() {
        var n = queue.length;
        var hq = document.getElementById('wd-hq-alert-pending');
        var tq = document.getElementById('wd-weapon-toast-queue');
        if (hq) {
            if (n > 0) {
                hq.hidden = false;
                hq.textContent = '+' + n;
            } else {
                hq.hidden = true;
            }
        }
        if (tq) {
            if (n > 0) {
                tq.hidden = false;
                tq.textContent = '+' + n;
            } else {
                tq.hidden = true;
            }
        }
    }

    var lastToneHitId = '';

    function paintCurrent() {
        ensureUi();
        var bar = document.getElementById('wd-hq-alert-bar');
        var toast = document.getElementById('wd-weapon-toast');
        if (!current) {
            if (bar) bar.hidden = true;
            if (toast) toast.hidden = true;
            document.body.classList.remove('wd-hq-alert-active');
            lastToneHitId = '';
            syncQueueBadge();
            return;
        }
        var name = String(current.deviceName || current.camId || '—');
        var cls = String(current.cls || 'weapon');
        var when = formatWhen(current.at);
        var text = name + ' · ' + cls + (when ? ' · ' + when : '');

        var hqText = document.getElementById('wd-hq-alert-text');
        if (hqText) hqText.textContent = text;
        if (bar) bar.hidden = false;
        document.body.classList.add('wd-hq-alert-active');

        var line1 = document.getElementById('wd-weapon-toast-line1');
        var line2 = document.getElementById('wd-weapon-toast-line2');
        var thumb = document.getElementById('wd-weapon-toast-thumb');
        var thumbPh = document.getElementById('wd-weapon-toast-thumb-ph');
        if (line1) line1.textContent = name;
        if (line2) line2.textContent = cls + (when ? ' · ' + when : '');
        var url = cropUrl(current);
        if (thumb) {
            if (url) {
                thumb.src = url;
                thumb.hidden = false;
                if (thumbPh) thumbPh.hidden = true;
            } else {
                thumb.removeAttribute('src');
                thumb.hidden = true;
                if (thumbPh) thumbPh.hidden = false;
            }
        }
        if (toast) toast.hidden = false;
        /* HQ-ALERT-AUDIO-V1 — tone once when a hit becomes the on-screen alert */
        var hid = String(current.hitId || '');
        if (hid && hid !== lastToneHitId) {
            lastToneHitId = hid;
            try {
                if (global.HqAlertAudio && typeof HqAlertAudio.play === 'function') {
                    HqAlertAudio.play('weapon', { tier: 'strong', key: hid });
                }
            } catch (_) { /* ignore */ }
        }
        syncQueueBadge();
    }

    function countCam(camId) {
        var n = 0;
        var id = String(camId || '');
        if (current && String(current.camId) === id) n++;
        var i;
        for (i = 0; i < queue.length; i++) {
            if (String(queue[i].camId) === id) n++;
        }
        return n;
    }

    /** Drop oldest waiting hit for this cam (queue only — never silent-clear current). */
    function dropOldestQueuedForCam(camId) {
        var id = String(camId || '');
        var i;
        for (i = 0; i < queue.length; i++) {
            if (String(queue[i].camId) === id) {
                var dropped = queue.splice(i, 1)[0];
                pushHistory(dropped, 'overflow');
                return true;
            }
        }
        return false;
    }

    function enqueue(hit) {
        if (!hit || !hit.hitId) return;
        var i;
        /* Same hitId → refresh payload only (not a new alert). */
        if (current && sameHit(current, hit)) {
            current = hit;
            paintCurrent();
            return;
        }
        for (i = 0; i < queue.length; i++) {
            if (sameHit(queue[i], hit)) {
                queue[i] = hit;
                syncQueueBadge();
                return;
            }
        }
        if (!current) {
            current = hit;
            paintCurrent();
            return;
        }
        /* WEAPON-ALERT-ACK-ONE-HIT-V1: do NOT replace by camId — queue each hit. */
        while (countCam(hit.camId) >= MAX_PER_CAM) {
            if (!dropOldestQueuedForCam(hit.camId)) break;
        }
        if (countCam(hit.camId) >= MAX_PER_CAM) {
            /* Per-cam full — keep in history instead of silent loss. */
            pushHistory(hit, 'overflow');
            syncQueueBadge();
            return;
        }
        queue.push(hit);
        while (queue.length > MAX_QUEUE) {
            pushHistory(queue.shift(), 'overflow');
        }
        syncQueueBadge();
    }

    function pullNext() {
        current = queue.length ? queue.shift() : null;
        paintCurrent();
    }

    /** One Ack / Dismiss = clear current hit only → history, then show next. */
    function ackCurrent() {
        if (current) pushHistory(current, 'ack');
        pullNext();
    }

    function dismissCurrent() {
        if (current) pushHistory(current, 'dismiss');
        pullNext();
    }

    function openWeapon() {
        var hit = current;
        if (!hit) return;
        try {
            if (global.EvidenceManager && EvidenceManager.showTab) {
                EvidenceManager.showTab('analytics');
            } else {
                var ax = document.getElementById('nav-tab-analytics');
                if (ax) ax.click();
            }
        } catch (_) { /* ignore */ }
        setTimeout(function () {
            try {
                if (global.AnalyticsHub && AnalyticsHub.showPanel) {
                    AnalyticsHub.showPanel('weapon');
                } else {
                    var btn = document.querySelector('.ax-hub-nav-btn[data-panel="weapon"]');
                    if (btn && !btn.disabled) btn.click();
                }
            } catch (_) { /* ignore */ }
            setTimeout(function () {
                try {
                    if (global.WeaponLiveWatch && WeaponLiveWatch.focusCamFromAlarm) {
                        WeaponLiveWatch.focusCamFromAlarm(hit.camId);
                    }
                } catch (_) { /* ignore */ }
            }, 200);
        }, 120);
    }

    function showOnMap() {
        var hit = current;
        if (!hit || !hit.camId) return;
        /* explicit map only — alertTier medium avoids FR blacklist wall steal */
        var adapted = {
            camId: hit.camId,
            deviceName: hit.deviceName,
            isLive: true,
            source: 'weapon-live',
            alertTier: 'medium',
            listStatus: 'suspect',
            kind: 'weapon',
        };
        try {
            if (global.FrAlarm && typeof FrAlarm.goOpsOnHit === 'function') {
                FrAlarm.goOpsOnHit(adapted, { explicit: true });
                return;
            }
        } catch (_) { /* ignore */ }
        try {
            if (global.EvidenceManager && EvidenceManager.showTab) {
                EvidenceManager.showTab('ops');
            } else {
                var ops = document.getElementById('nav-tab-ops');
                if (ops) ops.click();
            }
        } catch (_) { /* ignore */ }
    }

    function onDetect(hit) {
        if (!hit || !hit.hitId) return;
        ensureUi();
        enqueue(hit);
    }

    function bindSocket() {
        if (socketBound) return;
        var sock = global.__mobilityDashboardSocket || global.socket;
        if (!sock || typeof sock.on !== 'function') return;
        socketBound = true;
        sock.on('weapon-detect', function (hit) {
            onDetect(hit);
        });
    }

    function boot() {
        loadHistory();
        ensureUi();
        syncHistoryFab();
        paintHistoryList();
        bindSocket();
        if (!socketBound) {
            var n = 0;
            var iv = setInterval(function () {
                bindSocket();
                if (socketBound || ++n > 80) clearInterval(iv);
            }, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    global.WeaponAlarm = {
        onDetect: onDetect,
        ack: ackCurrent,
        dismiss: dismissCurrent,
        openWeapon: openWeapon,
        showOnMap: showOnMap,
        openHistory: openHistory,
        getCurrent: function () { return current; },
        getQueueLength: function () { return queue.length; },
        getHistoryLength: function () { return history.length; },
    };
})(window);
