/**
 * FR blacklist alarm — crop rail + popup + chime + HQ global bar (all pages).
 * mob-fr-hq-global-alert-bar: sticky strip until Ack/Dismiss.
 * mob-fr-rail-alert-shell: match rail card overlay + non-blocking alert drawer (layout only).
 * mob-fr-alert-drawer-shell: full drawer layout — video stub, compare photos, meta grid, actions.
 * mob-fr-red-toast-shell: non-blocking red hit toast — lab preview + shell on real hits.
 * mob-fr-hit-go-ops: on hit → auto Operations when not on ops surface; map pan when on Ops + GPS.
 * mob-fr-go-ops-freeze-fix: safe map invalidateSize after tab switch; lazy toast button bind; Go to map.
 * mob-fr-alert-drawer-info-first: compare/meta above fold; video collapsed footer; sticky actions.
 * mob-fr-alert-drawer-expand: header expand toggle; larger dispatch review mode; session persist.
 * mob-fr-lab-preview-gate: hide lab preview toolbar unless server FM_FR_LAB_UI=1.
 * mob-fr-snap-rail-16-fit: rail fills column without scroll; quiet Recent label.
 * mob-fr-hits-toolbar-chips: Matches chips far-right in toolbar; Recent stays 16; match-only sticky.
 * mob-fr-matches-chip-snap-size: chip size = Recent snap cell; hide Analytics h2.
 * mob-fr-snap-hide-zero-score: do not show Match: 0% for rolling snaps (fake zero).
 * mob-fr-rail-window-score: show best-of-window real % on Recent (near-miss).
 * mob-fr-rail-scored-only: Recent = scored frames only (no blank twin lottery).
 * mob-fr-map-focus-pin: Ops map pan + pin popup; fleet last-known fallback; explicit Map/Go to map.
 * mob-fr-map-focus-pin-v2: cluster reveal, skip Ops tab when already there, normalize camId, fuchsia pin pulse.
 * mob-fr-go-ops-by-tier: auto Ops/map only suspect+blacklist; explicit Go to map always.
 * mob-fr-map-auto-gate: auto dispatch only when score >= FM_FR_MAP_AUTO_SCORE_MIN (default 80).
 * mob-fr-hq-go-map: HQ bar Go to map; Open renamed Open detail.
 * mob-fr-toast-map-always: toast Go to map enabled when camId (any score; fleet GPS fallback).
 * mob-fr-toast-alert-field: toast Alert field — one tap BWC beep (same path as drawer).
 * mob-fr-drawer-map-fallback: drawer Go to map + fleet last-known; enable when camId present.
 * mob-fr-snap-lightbox-float: floating snap card — drag, minimize (Analytics open).
 * mob-fr-snap-map-anchor-card: Show on map → Ops + GPS popup card (no corner keep tab).
 * mob-fr-snap-keep-evidence-pack: Keep → storage/fr-kept + toast hint only (no second UI).
 * Speech via VoiceAlerts when available.
 */
(function (global) {
    /** Recent rolling faces (16-fit). */
    var cropRailMax = 16;
    /** Sticky Matches chips in toolbar (far right). */
    var hitsBarMax = 5;
    var hitsOverflowCount = 0;
    var hitsChipResizeBound = false;
    var hitsChipResizeTimer = null;
    var bound = false;
    var queue = [];
    var current = null;
    var activeStandbyTeam = null;
    var FR_STANDBY_RADIUS_M = 500;
    var RED_TOAST_MINIMIZE_MS = 60000;
    var redToastTimer = null;
    var redToastUiBound = false;

    function friendlyCamName(camId) {
        if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
            return FleetDisplay.friendlyDeviceName(camId) || String(camId).slice(-8);
        }
        if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
            return FleetUi.getDeviceName(camId) || String(camId).slice(-8);
        }
        return String(camId).slice(-8);
    }

    function shortCamId(camId) {
        var id = String(camId || '');
        return id.length > 10 ? id.slice(-8) : id;
    }

    function clearRedToastTimer() {
        if (redToastTimer) {
            clearTimeout(redToastTimer);
            redToastTimer = null;
        }
    }

    function buildRedToastHtml() {
        return (
            '<div class="fr-red-toast-inner">' +
            '<div class="fr-red-toast-head">' +
            '<span class="fr-red-toast-title" id="fr-red-toast-title">' +
            esc(tr('analytics.fr.redToastTitle', 'Face match')) + '</span>' +
            '<span class="fr-red-toast-queue" id="fr-red-toast-queue" hidden></span>' +
            '<button type="button" class="fr-red-toast-minimize" id="fr-red-toast-minimize" ' +
            'title="' + esc(tr('analytics.fr.redToastMinimize', 'Minimize to bar')) + '" aria-label="' +
            esc(tr('analytics.fr.redToastMinimize', 'Minimize to bar')) + '">−</button>' +
            '</div>' +
            '<div class="fr-red-toast-body">' +
            '<div class="fr-red-toast-thumb-wrap">' +
            '<img id="fr-red-toast-thumb" alt="" hidden>' +
            '<span class="fr-red-toast-thumb-ph" id="fr-red-toast-thumb-ph">—</span>' +
            '</div>' +
            '<div class="fr-red-toast-text">' +
            '<p class="fr-red-toast-line1" id="fr-red-toast-line1">—</p>' +
            '<p class="fr-red-toast-line2" id="fr-red-toast-line2">—</p>' +
            '</div></div>' +
            '<div class="fr-red-toast-actions">' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-red-toast-map">' +
            esc(tr('analytics.fr.redToastGoMap', 'Go to map')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-red-toast-field">' +
            esc(tr('analytics.fr.alarmField', 'Alert field')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-red-toast-live" disabled ' +
            'title="' + esc(tr('analytics.fr.redToastShowLiveHint', 'Live promote connects in Act 3')) + '">' +
            esc(tr('analytics.fr.redToastShowLive', 'Show live')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-red-toast-detail">' +
            esc(tr('analytics.fr.redToastOpenDetail', 'Open detail')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-red-toast-ack">' +
            esc(tr('analytics.fr.alarmAck', 'Ack')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="fr-red-toast-dismiss">' +
            esc(tr('analytics.fr.alarmDismiss', 'Dismiss')) + '</button>' +
            '</div></div>'
        );
    }

    function redToastEl() {
        return document.getElementById('fr-red-toast');
    }

    function ensureRedToast() {
        var el = redToastEl();
        if (!el) {
            el = document.createElement('div');
            el.id = 'fr-red-toast';
            el.hidden = true;
            el.setAttribute('role', 'alert');
            el.setAttribute('aria-live', 'assertive');
            el.innerHTML = buildRedToastHtml();
            document.body.appendChild(el);
            redToastUiBound = false;
        }
        bindRedToastUi();
        return el;
    }

    function bindRedToastUi() {
        if (redToastUiBound) return;
        var toastAck = document.getElementById('fr-red-toast-ack');
        var toastDismiss = document.getElementById('fr-red-toast-dismiss');
        var toastDetail = document.getElementById('fr-red-toast-detail');
        var toastMinimize = document.getElementById('fr-red-toast-minimize');
        var toastMap = document.getElementById('fr-red-toast-map');
        var toastField = document.getElementById('fr-red-toast-field');
        if (!toastAck && !toastDismiss && !toastDetail && !toastMinimize && !toastMap && !toastField) return;
        if (toastAck) toastAck.addEventListener('click', onFrAlarmAck);
        if (toastDismiss) toastDismiss.addEventListener('click', onFrAlarmDismiss);
        if (toastDetail) toastDetail.addEventListener('click', onFrToastDetail);
        if (toastMinimize) toastMinimize.addEventListener('click', minimizeRedToast);
        if (toastMap) toastMap.addEventListener('click', onFrToastGoMap);
        if (toastField) toastField.addEventListener('click', onFrFieldAlertClick);
        redToastUiBound = true;
    }

    function updateRedToastQueueBadge(pending) {
        var badge = document.getElementById('fr-red-toast-queue');
        if (!badge) return;
        var n = Math.max(0, Number(pending) || 0);
        if (n > 0) {
            badge.hidden = false;
            badge.textContent = '+' + n;
        } else {
            badge.hidden = true;
            badge.textContent = '';
        }
    }

    function hitCanGoToMap(hit) {
        return !!(hit && !hit._labPreview && hit.camId);
    }

    function syncMapGoBtn(btn, hit) {
        if (!btn) return;
        if (!hitCanGoToMap(hit)) {
            btn.disabled = true;
            if (hit && hit._labPreview) {
                btn.title = tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match');
            } else {
                btn.title = tr('analytics.fr.mapNoLocation', 'No location for this unit');
            }
            return;
        }
        btn.disabled = false;
        btn.removeAttribute('title');
    }

    function syncRedToastMapBtn(hit) {
        syncMapGoBtn(document.getElementById('fr-red-toast-map'), hit);
    }

    function syncRedToastFieldBtn(hit) {
        var btn = document.getElementById('fr-red-toast-field');
        if (!btn) return;
        if (!hit || !hit.camId || hit._labPreview) {
            btn.disabled = true;
            if (hit && hit._labPreview) {
                btn.title = tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match');
            } else {
                btn.removeAttribute('title');
            }
            return;
        }
        btn.disabled = false;
        btn.removeAttribute('title');
    }

    function syncDrawerMapBtn(hit) {
        syncMapGoBtn(document.getElementById('fr-alert-drawer-map'), hit);
    }

    function drawerGpsLine(hit) {
        var loc = resolveHitMapLocation(hit);
        if (loc && loc.source === 'hit') {
            return formatSnapGps({ lat: loc.lat, lon: loc.lon, gpsAt: loc.gpsAt || hit.gpsAt || '' });
        }
        if (loc && loc.source === 'fleet') {
            return tr('analytics.fr.mapLastKnownPosition', 'Showing last known position');
        }
        return tr('analytics.fr.snapNoGps', 'No GPS');
    }

    function fillRedToast(hit) {
        if (!hit) return;
        ensureRedToast();
        var line1 = document.getElementById('fr-red-toast-line1');
        var line2 = document.getElementById('fr-red-toast-line2');
        var thumb = document.getElementById('fr-red-toast-thumb');
        var thumbPh = document.getElementById('fr-red-toast-thumb-ph');
        var displayName = hit.displayName || hit.blacklistId || '—';
        var score = hit.scorePct != null ? String(hit.scorePct) : '—';
        var device = hit.deviceLabel || friendlyCamName(hit.camId);
        if (line1) {
            line1.textContent = tr('analytics.fr.redToastLine1', '{name} · {score}%', {
                name: displayName,
                score: score,
            });
        }
        if (line2) {
            line2.textContent = tr('analytics.fr.redToastLine2', 'BWC {device} · {cam}', {
                device: device,
                cam: shortCamId(hit.camId),
            });
        }
        var cropUrl = hit.cropUrl ? String(hit.cropUrl) : '';
        if (thumb) {
            thumb.src = cropUrl;
            thumb.hidden = !cropUrl;
        }
        if (thumbPh) thumbPh.hidden = !!cropUrl;
        syncRedToastMapBtn(hit);
        syncRedToastFieldBtn(hit);
        updateRedToastQueueBadge(queue.length);
    }

    function minimizeRedToast() {
        var el = redToastEl();
        if (el) el.hidden = true;
        clearRedToastTimer();
    }

    function hideRedToast() {
        minimizeRedToast();
        syncRedToastMapBtn(null);
        syncRedToastFieldBtn(null);
        updateRedToastQueueBadge(0);
    }

    function showRedToast(hit) {
        if (!hit) return;
        ensureRedToast();
        fillRedToast(hit);
        var el = redToastEl();
        if (el) el.hidden = false;
        clearRedToastTimer();
        redToastTimer = setTimeout(minimizeRedToast, RED_TOAST_MINIMIZE_MS);
    }

    function viewVisible(id) {
        var el = document.getElementById(id);
        return !!(el && !el.hidden);
    }

    function frAutoGoOpsEnabled() {
        if (global.FM_FR_AUTO_GO_OPS === '0' || global.FM_FR_AUTO_GO_OPS === false) return false;
        return true;
    }

    function frAutoMapEnabled() {
        if (global.FM_FR_AUTO_MAP === '0' || global.FM_FR_AUTO_MAP === false) return false;
        return true;
    }

    function mapAutoScoreMin() {
        var raw = global.FM_FR_MAP_AUTO_SCORE_MIN;
        if (raw === undefined || raw === null || raw === '') return 80;
        var n = parseInt(raw, 10);
        if (!Number.isFinite(n)) return 80;
        return Math.max(70, Math.min(99, n));
    }

    function suspectAutoDispatchEnabled() {
        if (global.FM_FR_AUTO_GO_OPS_SUSPECT === '0' || global.FM_FR_AUTO_GO_OPS_SUSPECT === false) {
            return false;
        }
        return true;
    }

    function alertTierForHit(hit) {
        if (!hit) return 'high';
        if (hit.alertTier) return String(hit.alertTier).toLowerCase();
        var status = String(hit.listStatus || 'blacklist').trim().toLowerCase();
        if (status === 'poi') return 'silent';
        if (status === 'monitoring') return 'low';
        if (status === 'suspect') return 'medium';
        return 'high';
    }

    function hitMeetsAutoScore(hit) {
        if (!hit || hit.scorePct == null) return false;
        var score = Number(hit.scorePct);
        if (!Number.isFinite(score)) return false;
        return score >= mapAutoScoreMin();
    }

    /** Auto map/tab on hit — grade tier + score >= mapAutoScoreMin (default 80). */
    function shouldAutoMapForHit(hit) {
        if (!hit || hit._labPreview) return false;
        if (!frAutoMapEnabled()) return false;
        if (!hitMeetsAutoScore(hit)) return false;
        if (global.FM_FR_ALERT_TIER === '0' || global.FM_FR_ALERT_TIER === false) {
            return true;
        }
        var tier = alertTierForHit(hit);
        if (tier === 'silent' || tier === 'low') return false;
        if (tier === 'medium' && !suspectAutoDispatchEnabled()) return false;
        return tier === 'medium' || tier === 'high';
    }

    /** Auto tab/pan on hit — master switch + shouldAutoMapForHit. */
    function shouldAutoGoOpsForHit(hit) {
        if (!frAutoGoOpsEnabled()) return false;
        return shouldAutoMapForHit(hit);
    }

    /** Ops, command wall, or conference — do not auto-switch away on hit. */
    function isOperationalSurface() {
        return viewVisible('app-view-ops')
            || viewVisible('app-view-command-wall')
            || viewVisible('app-view-conference');
    }

    function invalidateOpsMap(cb) {
        var done = typeof cb === 'function' ? cb : function () {};
        try {
            if (global.FleetUi && FleetUi.refreshLayout) {
                FleetUi.refreshLayout();
            } else if (typeof global.map !== 'undefined' && global.map && global.map.invalidateSize) {
                global.map.invalidateSize();
            }
        } catch (_) { /* ignore */ }
        var finish = function () {
            try {
                if (typeof global.map !== 'undefined' && global.map && global.map.invalidateSize) {
                    global.map.invalidateSize();
                }
            } catch (_) { /* ignore */ }
            done();
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () {
                setTimeout(finish, 90);
            });
        } else {
            setTimeout(finish, 90);
        }
    }

    function isAnalyticsPopoutMode() {
        return document.documentElement.classList.contains('analytics-popout-mode')
            || !!global.__mobilityAnalyticsPopout;
    }

    function focusOpsOnDesk(hit, opts) {
        opts = opts || {};
        try {
            var openerWin = window.opener;
            if (!openerWin || openerWin.closed) {
                showStandbyToast(tr(
                    'analytics.fr.popoutGoOpsNoDesk',
                    'Open Operations on the main dashboard to view the map.'
                ), 6000);
                return false;
            }
            if (hit && openerWin.FrAlarm && typeof openerWin.FrAlarm.goOpsOnHit === 'function') {
                openerWin.FrAlarm.goOpsOnHit(hit, opts);
            } else if (openerWin.EvidenceManager && openerWin.EvidenceManager.showTab) {
                openerWin.EvidenceManager.showTab('ops');
            } else {
                var opsBtn = openerWin.document && openerWin.document.getElementById('nav-tab-ops');
                if (opsBtn) opsBtn.click();
            }
            openerWin.focus();
            if (opts.explicit) {
                showStandbyToast(tr(
                    'analytics.fr.popoutGoOpsDesk',
                    'Switched Operations on main dashboard'
                ), 4000);
            }
            return true;
        } catch (_) {
            showStandbyToast(tr(
                'analytics.fr.popoutGoOpsNoDesk',
                'Open Operations on the main dashboard to view the map.'
            ), 6000);
            return false;
        }
    }

    function switchToOpsTab(cb) {
        if (isAnalyticsPopoutMode()) {
            focusOpsOnDesk(null, {});
            if (typeof cb === 'function') setTimeout(cb, 120);
            return;
        }
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('ops');
        } else {
            var opsBtn = document.getElementById('nav-tab-ops');
            if (opsBtn) opsBtn.click();
        }
        invalidateOpsMap(cb);
    }

    function normalizeHitCamId(camId) {
        if (!camId) return '';
        var nid = String(camId);
        if (typeof global.normalizeCamId === 'function') nid = global.normalizeCamId(camId);
        return nid;
    }

    function resolveDeviceMarker(camId) {
        if (!camId || !global.deviceMarkers) return null;
        var nid = normalizeHitCamId(camId);
        return global.deviceMarkers[nid] || global.deviceMarkers[camId] || null;
    }

    var frHitFocusCamId = null;

    function clearFrHitPinFocus() {
        if (!frHitFocusCamId) {
            global.frHitMapFocusCamId = null;
            return;
        }
        frHitFocusCamId = null;
        global.frHitMapFocusCamId = null;
    }

    function applyFrHitPinFocus(camId) {
        clearFrHitPinFocus();
        var nid = normalizeHitCamId(camId);
        if (!nid) return;
        frHitFocusCamId = nid;
        global.frHitMapFocusCamId = nid;
        var m = resolveDeviceMarker(nid);
        if (!m || !m._icon) return;
        var wrap = m._icon.querySelector('.bwc-pin-wrap');
        if (wrap) wrap.classList.add('fr-hit-focus');
        if (m.bringToFront) m.bringToFront();
        if (m.setZIndexOffset) m.setZIndexOffset(1500);
        if (typeof global.refreshAllDeviceMarkerStyles === 'function') {
            try { global.refreshAllDeviceMarkerStyles(); } catch (_) { /* ignore */ }
        }
    }

    function fleetPinLatLng(camId) {
        if (!camId) return null;
        var m = resolveDeviceMarker(camId);
        if (!m) return null;
        var ll = m._gpsLatLng || (typeof m.getLatLng === 'function' ? m.getLatLng() : null);
        if (!ll) return null;
        var lat = Number(ll.lat != null ? ll.lat : ll[0]);
        var lon = Number(ll.lng != null ? ll.lng : ll.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { lat: lat, lon: lon };
    }

    function resolveHitMapLocation(hit) {
        if (!hit) return null;
        if (hitHasGps(hit)) {
            return {
                lat: Number(hit.lat),
                lon: Number(hit.lon),
                source: 'hit',
                gpsAt: hit.gpsAt || null,
            };
        }
        if (hit.camId) {
            var pin = fleetPinLatLng(hit.camId);
            if (pin) {
                return { lat: pin.lat, lon: pin.lon, source: 'fleet', gpsAt: null };
            }
        }
        return null;
    }

    function finishMapPinFocus(camId, lat, lon) {
        var nid = normalizeHitCamId(camId);
        if (!nid) return;
        if (typeof MapPinLayer !== 'undefined' && MapPinLayer.setPopupOpenCamId) {
            MapPinLayer.setPopupOpenCamId(nid, true);
        }
        if (typeof global.clearMapPinPopupSuppression === 'function') {
            global.clearMapPinPopupSuppression(nid);
        }
        global.mapPinPopupFocusCamId = nid;
        frHitFocusCamId = nid;
        global.frHitMapFocusCamId = nid;
        if (typeof global.upsertDeviceMarker === 'function') {
            global.upsertDeviceMarker(nid, lat, lon, false, true, true);
        }
        var m = resolveDeviceMarker(nid);
        function afterReveal() {
            if (m && m.openPopup && (!m.isPopupOpen || !m.isPopupOpen())) {
                m.openPopup();
            }
            applyFrHitPinFocus(nid);
            if (typeof global.selectFleetDevice === 'function') {
                try {
                    global.selectFleetDevice(nid, { skipMapPopup: true, addToMulti: true, keepMulti: true });
                } catch (_) { /* ignore */ }
            }
            if (typeof global.assignColocatedPinPopupDocks === 'function') {
                setTimeout(function () { global.assignColocatedPinPopupDocks(); }, 150);
            }
        }
        if (m && typeof MapPinLayer !== 'undefined' && MapPinLayer.revealMarker) {
            MapPinLayer.revealMarker(m, function () {
                setTimeout(afterReveal, 50);
            });
        } else {
            afterReveal();
        }
    }

    function focusHitOnMap(hit, opts) {
        opts = opts || {};
        if (!hit) return false;
        var loc = resolveHitMapLocation(hit);
        if (!loc) {
            if (opts.toastOnFail !== false) {
                showStandbyToast(tr('analytics.fr.mapNoLocation', 'No location for this unit'), 4500);
            }
            return false;
        }
        if (loc.source === 'fleet' && opts.toastLastKnown) {
            showStandbyToast(tr('analytics.fr.mapLastKnownPosition', 'Showing last known position'), 4500);
        }
        try {
            var targetZoom = 17;
            if (typeof global.map !== 'undefined' && global.map && global.map.getZoom) {
                targetZoom = Math.max(global.map.getZoom() || 14, 17);
            }
            if (typeof global.map !== 'undefined' && global.map && global.map.setView) {
                global.map.setView([loc.lat, loc.lon], targetZoom, { animate: true });
            }
            if (!hit.camId) return true;
            var ran = false;
            function runFocus() {
                if (ran) return;
                ran = true;
                finishMapPinFocus(hit.camId, loc.lat, loc.lon);
            }
            if (global.map && typeof global.map.once === 'function') {
                global.map.once('moveend', runFocus);
            }
            setTimeout(runFocus, 420);
            return true;
        } catch (_) {
            return false;
        }
    }

    function goOpsOnHit(hit, opts) {
        opts = opts || {};
        if (!hit) return;
        if (hit._labPreview) {
            if (opts.explicit) {
                showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 5000);
            }
            return;
        }
        if (isAnalyticsPopoutMode()) {
            if (!opts.explicit && !shouldAutoGoOpsForHit(hit)) return;
            focusOpsOnDesk(hit, opts);
            return;
        }
        if (!opts.explicit && !shouldAutoGoOpsForHit(hit)) return;

        var onOps = viewVisible('app-view-ops');
        var onOpSurface = isOperationalSurface();

        function panWhenReady() {
            focusHitOnMap(hit, {
                toastLastKnown: !!opts.explicit,
                toastOnFail: opts.explicit !== false,
            });
        }

        if (!onOpSurface) {
            switchToOpsTab(panWhenReady);
            return;
        }
        if (onOps) {
            invalidateOpsMap(panWhenReady);
            return;
        }
        if (opts.explicit) {
            switchToOpsTab(panWhenReady);
        }
    }

    function showStandbyToast(message, ms) {
        var el = document.getElementById('fr-ptt-standby-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'fr-ptt-standby-toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.hidden = false;
        if (showStandbyToast._t) clearTimeout(showStandbyToast._t);
        showStandbyToast._t = setTimeout(function () { el.hidden = true; }, ms || 12000);
    }

    function syncStandbyPttUi() {
        var btn = document.getElementById('fr-alarm-standby-ptt');
        var hqBtn = document.getElementById('fr-hq-alert-standby-ptt');
        var drawerBtn = document.getElementById('fr-alert-drawer-standby-ptt');
        var active = Array.isArray(activeStandbyTeam) && activeStandbyTeam.length > 1;
        [btn, hqBtn, drawerBtn].forEach(function (b) {
            if (!b) return;
            b.classList.toggle('fr-standby-ptt-active', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
            if (active) {
                b.textContent = tr('analytics.fr.standbyPttTeamOnBtn', 'Standby PTT · ON');
            } else {
                b.textContent = tr('analytics.fr.standbyPttTeam', 'Standby PTT team');
            }
        });
        var status = document.getElementById('fr-alarm-standby-status');
        if (status) {
            if (active) {
                var labels = activeStandbyTeam.map(friendlyCamName).join(', ');
                status.hidden = false;
                status.textContent = tr('analytics.fr.standbyPttTeamOn', 'Standby PTT ON — {n} unit(s): {names}. Hold PTT on map or wall.', {
                    n: activeStandbyTeam.length,
                    names: labels,
                });
            } else {
                status.hidden = true;
                status.textContent = '';
            }
        }
        syncDrawerStandbyUi();
    }

    function applyStandbyPttResult(data) {
        if (!data || !data.ok || !data.pttTeam || !data.pttTeam.team) return false;
        activeStandbyTeam = data.pttTeam.team.slice();
        global.activeFrStandbyPttTeam = activeStandbyTeam;
        syncStandbyPttUi();
        var names = activeStandbyTeam.map(friendlyCamName).join(' + ');
        showStandbyToast(tr('analytics.fr.standbyPttTeamOk', 'Standby PTT ON — {names} ({n} units). Hold PTT to talk.', {
            names: names,
            n: activeStandbyTeam.length,
        }), 14000);
        return true;
    }

    function pushFrStandbyPttTeamNow() {
        if (!current || !current.camId) {
            alert(tr('analytics.fr.standbyPttNoHit', 'No active FR hit.'));
            return;
        }
        if (current._labPreview) {
            showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 5000);
            return;
        }
        var btn = document.getElementById('fr-alarm-standby-ptt');
        var hqBtn = document.getElementById('fr-hq-alert-standby-ptt');
        var drawerBtn = document.getElementById('fr-alert-drawer-standby-ptt');
        if ((btn && btn.disabled) || (hqBtn && hqBtn.disabled) || (drawerBtn && drawerBtn.disabled)) return;
        if (btn) btn.disabled = true;
        if (hqBtn) hqBtn.disabled = true;
        if (drawerBtn) drawerBtn.disabled = true;
        showStandbyToast(tr('analytics.fr.standbyPttPushing', 'Pushing standby PTT team…'), 8000);

        var camId = current.camId;
        var helpers = [];
        if (typeof global.computeNearbyForCam === 'function') {
            helpers = global.computeNearbyForCam(camId, FR_STANDBY_RADIUS_M)
                .filter(function (d) { return d.online !== false; })
                .map(function (d) { return d.cameraId; });
        }
        if (!helpers.length && typeof global.computeNearestForCam === 'function') {
            var nearest = global.computeNearestForCam(camId);
            if (nearest && nearest.online !== false && confirm(tr('analytics.fr.standbyPttNearestConfirm',
                'No unit inside 500 m. Push standby PTT to nearest ({name}, {dist} m GPS)?',
                { name: nearest.name || nearest.cameraId, dist: nearest.distanceM }))) {
                helpers = [nearest.cameraId];
            } else if (!nearest || nearest.online === false) {
                if (btn) btn.disabled = false;
                if (hqBtn) hqBtn.disabled = false;
                if (drawerBtn) drawerBtn.disabled = false;
                alert(tr('analytics.fr.standbyPttNoNearby', 'No online nearby units within 500 m.'));
                return;
            } else {
                if (btn) btn.disabled = false;
                if (hqBtn) hqBtn.disabled = false;
                if (drawerBtn) drawerBtn.disabled = false;
                return;
            }
        }

        fetch('/api/analytics/fr/ptt-standby-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                hitId: current.hitId,
                camId: camId,
                helperCamIds: helpers,
            }),
        }).then(function (r) { return r.json(); }).then(function (data) {
            if (!applyStandbyPttResult(data)) {
                var err = (data && data.error) || tr('analytics.fr.standbyPttFail', 'Standby PTT push failed.');
                showStandbyToast(err, 8000);
                alert(err + ' ' + tr('analytics.fr.standbyPttFailHint', 'Is PTT enabled on server?'));
            }
        }).catch(function () {
            showStandbyToast(tr('analytics.fr.standbyPttFail', 'Standby PTT push failed.'), 8000);
            alert(tr('analytics.fr.standbyPttFail', 'Standby PTT push failed.'));
        }).finally(function () {
            if (btn) btn.disabled = false;
            if (hqBtn) hqBtn.disabled = false;
            if (drawerBtn) drawerBtn.disabled = false;
        });
    }

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

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getSocket() {
        return global.__mobilityDashboardSocket || global.socket || null;
    }

    function playChime() {
        try {
            var Ctx = global.AudioContext || global.webkitAudioContext;
            if (!Ctx) return;
            var ctx = playChime._ctx || (playChime._ctx = new Ctx());
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            g.gain.value = 0.0001;
            o.connect(g);
            g.connect(ctx.destination);
            var t = ctx.currentTime;
            g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
            o.start(t);
            o.stop(t + 0.3);
        } catch (_) { /* ignore */ }
    }

    function makeEmptyCropCard() {
        var card = document.createElement('div');
        card.className = 'ax-fr-crop-card is-empty';
        card.dataset.cropUrl = '';
        card.innerHTML = '<div class="ax-fr-crop-ph">—</div>';
        return card;
    }

    function readCropSlot(card) {
        if (!card) return { cropUrl: '', match: false };
        var lat = card.dataset.lat !== undefined && card.dataset.lat !== '' ? Number(card.dataset.lat) : null;
        var lon = card.dataset.lon !== undefined && card.dataset.lon !== '' ? Number(card.dataset.lon) : null;
        var scorePct = card.dataset.scorePct !== undefined && card.dataset.scorePct !== ''
            ? Number(card.dataset.scorePct) : null;
        var tSec = card.dataset.tSec !== undefined && card.dataset.tSec !== ''
            ? Number(card.dataset.tSec) : null;
        return {
            cropUrl: card.dataset.cropUrl || '',
            match: card.classList.contains('is-match'),
            camId: card.dataset.camId || '',
            deviceLabel: card.dataset.deviceLabel || '',
            at: card.dataset.at || '',
            lat: Number.isFinite(lat) ? lat : null,
            lon: Number.isFinite(lon) ? lon : null,
            gpsAt: card.dataset.gpsAt || '',
            scorePct: Number.isFinite(scorePct) ? scorePct : null,
            hitId: card.dataset.hitId || '',
            displayName: card.dataset.displayName || '',
            listStatus: card.dataset.listStatus || '',
            blacklistId: card.dataset.blacklistId || '',
            source: card.dataset.source || '',
            jobId: card.dataset.jobId || '',
            playUrl: card.dataset.playUrl || '',
            tSec: Number.isFinite(tSec) ? tSec : null,
        };
    }

    function writeCropSlotMeta(card, tick) {
        if (!card) return;
        var t = tick || {};
        card.dataset.camId = t.camId ? String(t.camId) : '';
        card.dataset.deviceLabel = t.deviceLabel ? String(t.deviceLabel) : '';
        card.dataset.at = t.at ? String(t.at) : '';
        if (t.lat != null && Number.isFinite(Number(t.lat))) {
            card.dataset.lat = String(t.lat);
        } else {
            delete card.dataset.lat;
        }
        if (t.lon != null && Number.isFinite(Number(t.lon))) {
            card.dataset.lon = String(t.lon);
        } else {
            delete card.dataset.lon;
        }
        if (t.gpsAt) {
            card.dataset.gpsAt = String(t.gpsAt);
        } else {
            delete card.dataset.gpsAt;
        }
        if (t.scorePct != null && Number.isFinite(Number(t.scorePct))) {
            /* mob-fr-snap-hide-zero-score — rolling path sends 0; do not store fake scores */
            if (Number(t.scorePct) > 0 || t.match) {
                card.dataset.scorePct = String(t.scorePct);
            } else {
                delete card.dataset.scorePct;
            }
        } else {
            delete card.dataset.scorePct;
        }
        if (t.hitId) {
            card.dataset.hitId = String(t.hitId);
        } else {
            delete card.dataset.hitId;
        }
        if (t.displayName) {
            card.dataset.displayName = String(t.displayName);
        } else {
            delete card.dataset.displayName;
        }
        if (t.listStatus) {
            card.dataset.listStatus = String(t.listStatus);
        } else {
            delete card.dataset.listStatus;
        }
        if (t.blacklistId) {
            card.dataset.blacklistId = String(t.blacklistId);
        } else {
            delete card.dataset.blacklistId;
        }
        /* mob-fr-offline-crop-play-at */
        if (t.source) card.dataset.source = String(t.source);
        else delete card.dataset.source;
        if (t.jobId) card.dataset.jobId = String(t.jobId);
        else delete card.dataset.jobId;
        if (t.playUrl) card.dataset.playUrl = String(t.playUrl);
        else delete card.dataset.playUrl;
        if (t.tSec != null && Number.isFinite(Number(t.tSec))) {
            card.dataset.tSec = String(t.tSec);
        } else {
            delete card.dataset.tSec;
        }
    }

    function clearCropSlotMeta(card) {
        if (!card) return;
        delete card.dataset.camId;
        delete card.dataset.deviceLabel;
        delete card.dataset.at;
        delete card.dataset.lat;
        delete card.dataset.lon;
        delete card.dataset.gpsAt;
        delete card.dataset.scorePct;
        delete card.dataset.hitId;
        delete card.dataset.displayName;
        delete card.dataset.listStatus;
        delete card.dataset.blacklistId;
        delete card.dataset.source;
        delete card.dataset.jobId;
        delete card.dataset.playUrl;
        delete card.dataset.tSec;
    }

    function markRailAlertActive(hit) {
        if (!hit || !hit.hitId) return;
        var hitsList = ensureHitsBar();
        var list = ensureCropRail();
        clearRailAlertActive(hitsList);
        clearRailAlertActive(list);
        var i;
        var pools = [hitsList, list];
        var p;
        for (p = 0; p < pools.length; p++) {
            var rail = pools[p];
            if (!rail) continue;
            for (i = 0; i < rail.children.length; i++) {
                var card = rail.children[i];
                if (!card.classList.contains('is-match')) continue;
                if (card.dataset.hitId === hit.hitId) {
                    card.classList.add('is-alert-active');
                    return;
                }
            }
        }
        if (hitsList && hitsList.children[0] && hitsList.children[0].classList.contains('is-match')) {
            hitsList.children[0].dataset.hitId = hit.hitId;
            hitsList.children[0].classList.add('is-alert-active');
        }
    }

    function clearRailAlertActive(list) {
        if (!list) return;
        for (var i = 0; i < list.children.length; i++) {
            list.children[i].classList.remove('is-alert-active');
        }
    }

    function buildMatchCardInner(url, tick) {
        var isMatch = !!(tick && tick.match);
        var scoreNum = tick && tick.scorePct != null && Number.isFinite(Number(tick.scorePct))
            ? Number(tick.scorePct) : null;
        /* mob-fr-rail-window-score + mob-fr-snap-hide-zero-score */
        var showScore = scoreNum != null && (isMatch || scoreNum > 0);
        var inner = '<img src="' + esc(url) + '" alt="">';
        if (tick && tick.playUrl && tick.tSec != null) {
            inner += '<span class="ax-fr-crop-play-badge">' +
                esc(tr('analytics.fr.snapPlayBadge', 'Play')) + '</span>';
        }
        if (isMatch) {
            var name = tick.displayName || tick.deviceLabel || '';
            var score = showScore ? String(Math.round(scoreNum)) + '%' : '';
            inner += '<span class="ax-fr-crop-match-badge">' +
                esc(tr('analytics.fr.railMatchBadge', 'MATCH')) + '</span>';
            inner += '<div class="ax-fr-crop-match-meta">';
            inner += '<span class="ax-fr-crop-match-name">' + esc(name || '—') + '</span>';
            inner += '<span class="ax-fr-crop-match-score">' + esc(score || '—') + '</span>';
            inner += '</div>';
            return inner;
        }
        if (showScore) {
            inner += '<div class="ax-fr-crop-match-meta is-near">';
            inner += '<span class="ax-fr-crop-match-score">' + esc(String(Math.round(scoreNum)) + '%') + '</span>';
            inner += '</div>';
        }
        return inner;
    }

    function fillCropSlot(card, tick) {
        if (!card) return;
        var url = tick && tick.cropUrl ? String(tick.cropUrl) : '';
        var isMatch = !!(tick && tick.match);
        var scoreNum = tick && tick.scorePct != null && Number.isFinite(Number(tick.scorePct))
            ? Number(tick.scorePct) : null;
        var hasNearScore = !isMatch && scoreNum != null && scoreNum > 0;
        var grade = tick && tick.listStatus
            ? String(tick.listStatus).trim().toLowerCase().replace(/[^a-z]/g, '')
            : '';
        card.dataset.cropUrl = url;
        if (url) {
            writeCropSlotMeta(card, tick);
        } else {
            clearCropSlotMeta(card);
        }
        card.className = 'ax-fr-crop-card'
            + (url ? (isMatch ? ' is-match' : '') : ' is-empty')
            + (hasNearScore ? ' is-near-score' : '');
        if (url && isMatch && grade) {
            card.classList.add('is-grade-' + grade);
        }
        card.classList.remove('is-alert-active');
        if (url) {
            card.innerHTML = buildMatchCardInner(url, tick);
            card.onclick = function () {
                if (isMatch && current && card.dataset.hitId && card.dataset.hitId === current.hitId) {
                    openAlertDrawerShell(current);
                } else {
                    openSnapLightbox(readCropSlot(card));
                }
            };
            card.ondblclick = card.onclick;
        } else {
            card.innerHTML = '<div class="ax-fr-crop-ph">—</div>';
            card.onclick = null;
            card.ondblclick = null;
        }
    }

    function syncHitsOverflowBadge() {
        var el = document.getElementById('ax-fr-hits-overflow');
        if (!el) return;
        if (hitsOverflowCount > 0) {
            el.hidden = false;
            el.textContent = tr('analytics.fr.subjectMatchesOverflow', '+{n}')
                .replace('{n}', String(hitsOverflowCount));
        } else {
            el.hidden = true;
            el.textContent = '+0';
        }
    }

    /**
     * mob-fr-matches-chip-snap-size — Matches chips match one Recent snap cell size.
     */
    function syncHitsChipSizeToSnap() {
        var list = document.getElementById('ax-fr-hits-list');
        if (!list) return;
        var w = 104;
        var h = 72;
        try {
            ensureCropRail();
            var sample = document.querySelector('#ax-fr-crop-rail .ax-fr-crop-list .ax-fr-crop-card');
            if (sample) {
                var r = sample.getBoundingClientRect();
                if (r.width >= 48 && r.height >= 40) {
                    w = Math.round(r.width);
                    h = Math.round(r.height);
                }
            }
        } catch (_) { /* keep fallback */ }
        /* Keep usable on tiny windows; avoid runaway on huge monitors */
        w = Math.max(72, Math.min(120, w));
        h = Math.max(56, Math.min(110, h));
        list.style.setProperty('--fr-hit-chip-w', w + 'px');
        list.style.setProperty('--fr-hit-chip-h', h + 'px');
    }

    function bindHitsChipResize() {
        if (hitsChipResizeBound) return;
        hitsChipResizeBound = true;
        window.addEventListener('resize', function () {
            clearTimeout(hitsChipResizeTimer);
            hitsChipResizeTimer = setTimeout(syncHitsChipSizeToSnap, 120);
        });
    }

    /** mob-fr-hits-toolbar-chips + mob-fr-matches-chip-snap-size */
    function ensureHitsBar() {
        var list = document.getElementById('ax-fr-hits-list');
        if (!list) return null;
        var title = document.getElementById('ax-fr-hits-bar-title');
        if (title) {
            title.textContent = tr('analytics.fr.matchesShort', 'Known subjects');
        }
        while (list.children.length < hitsBarMax) {
            list.appendChild(makeEmptyCropCard());
        }
        while (list.children.length > hitsBarMax) {
            list.removeChild(list.lastChild);
        }
        syncHitsOverflowBadge();
        bindHitsChipResize();
        /* After rail layout paints — measure real snap cell */
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () {
                syncHitsChipSizeToSnap();
                requestAnimationFrame(syncHitsChipSizeToSnap);
            });
        } else {
            setTimeout(syncHitsChipSizeToSnap, 0);
        }
        return list;
    }

    function findHitsSlotByKey(list, tick) {
        if (!list || !tick) return -1;
        var keyId = tick.hitId || '';
        var keyBl = tick.blacklistId || '';
        var i;
        for (i = 0; i < list.children.length; i++) {
            var card = list.children[i];
            if (!card.classList.contains('is-match')) continue;
            if (keyId && card.dataset.hitId === keyId) return i;
            if (keyBl && card.dataset.blacklistId === keyBl && card.dataset.camId === String(tick.camId || '')) {
                return i;
            }
            if (!keyId && !keyBl && tick.displayName && card.dataset.displayName === tick.displayName
                && card.dataset.camId === String(tick.camId || '')) {
                return i;
            }
        }
        return -1;
    }

    function pushSubjectMatch(tick) {
        var list = ensureHitsBar();
        if (!list || !tick || !tick.cropUrl) return;
        var payload = Object.assign({}, tick, { match: true });
        var idx = findHitsSlotByKey(list, payload);
        if (idx >= 0) {
            fillCropSlot(list.children[idx], payload);
            return;
        }
        var last = readCropSlot(list.children[hitsBarMax - 1]);
        if (last && last.cropUrl && last.match) {
            hitsOverflowCount += 1;
            syncHitsOverflowBadge();
        }
        var i;
        for (i = hitsBarMax - 1; i > 0; i--) {
            fillCropSlot(list.children[i], readCropSlot(list.children[i - 1]));
        }
        fillCropSlot(list.children[0], payload);
    }

    function pushCrop(tick) {
        if (!tick) return;
        /* mob-fr-hits-toolbar-chips — known-subject matches → Known subjects bar */
        if (tick.match && tick.cropUrl) {
            pushSubjectMatch(tick);
            return;
        }
        /* mob-fr-rail-scored-only — ignore unscored rolling twins on Recent */
        if (tick.rolling) return;
        var scoreNum = tick.scorePct != null && Number.isFinite(Number(tick.scorePct))
            ? Number(tick.scorePct) : 0;
        if (!tick.cropUrl || scoreNum <= 0) return;
        var list = ensureCropRail();
        if (!list) return;
        ensureRailSlots(list);
        var i;
        for (i = cropRailMax - 1; i > 0; i--) {
            fillCropSlot(list.children[i], readCropSlot(list.children[i - 1]));
        }
        fillCropSlot(list.children[0], tick);
    }

    function ensureRailSlots(list) {
        if (!list) return;
        while (list.children.length < cropRailMax) {
            list.appendChild(makeEmptyCropCard());
        }
        while (list.children.length > cropRailMax) {
            list.removeChild(list.lastChild);
        }
    }

    function ensureCropRail() {
        var el = document.getElementById('ax-fr-crop-rail');
        if (!el) return null;
        if (!el.querySelector('.ax-fr-crop-list')) {
            el.innerHTML =
                '<h4 class="ax-fr-snapshot-title">' + esc(tr('analytics.fr.snapshotRecent', 'Recent')) + '</h4>' +
                '<div class="ax-fr-crop-list"></div>';
        }
        var staleHint = document.getElementById('ax-fr-crop-empty');
        if (staleHint) staleHint.remove();
        var titleEl = el.querySelector('.ax-fr-snapshot-title');
        if (titleEl) {
            titleEl.textContent = tr('analytics.fr.snapshotRecent', 'Recent');
        }
        var list = el.querySelector('.ax-fr-crop-list');
        ensureRailSlots(list);
        return list;
    }

    function formatSnapTime(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return String(iso);
            return d.toLocaleString();
        } catch (_) {
            return String(iso);
        }
    }

    function snapHasGps(slot) {
        return !!(slot && Number.isFinite(slot.lat) && Number.isFinite(slot.lon));
    }

    function formatSnapGps(slot) {
        if (!snapHasGps(slot)) return tr('analytics.fr.snapNoGps', 'No GPS');
        var s = slot.lat.toFixed(6) + ', ' + slot.lon.toFixed(6);
        if (slot.gpsAt) {
            s += ' · ' + tr('analytics.fr.snapGpsAt', 'GPS {time}', { time: formatSnapTime(slot.gpsAt) });
        }
        return s;
    }

    function copySnapLocation(slot) {
        if (!snapHasGps(slot)) {
            showStandbyToast(tr('analytics.fr.snapNoGps', 'No GPS'), 3500);
            return;
        }
        var text = slot.lat.toFixed(6) + ',' + slot.lon.toFixed(6);
        function done(ok) {
            showStandbyToast(ok
                ? tr('analytics.fr.snapCopyOk', 'Location copied')
                : tr('analytics.fr.snapCopyFail', 'Copy failed'), 3000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () { done(false); });
            return;
        }
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            done(document.execCommand('copy'));
            document.body.removeChild(ta);
        } catch (_) {
            done(false);
        }
    }

    function showSnapOnMap(slot) {
        if (!snapHasGps(slot)) {
            showStandbyToast(tr('analytics.fr.snapNoGps', 'No GPS'), 3500);
            return;
        }
        var ok = false;
        /* mob-fr-snap-map-anchor-card — prefer map-anchored popup over corner float */
        if (typeof global.openFrSnapMapAnchorCard === 'function') {
            ok = !!global.openFrSnapMapAnchorCard(slot);
        } else if (typeof global.showFrSnapOnMap === 'function') {
            ok = !!global.showFrSnapOnMap(slot.lat, slot.lon, slot.camId || null, slot);
        }
        if (!ok) {
            showStandbyToast(tr('analytics.fr.snapMapFail', 'Could not open map'), 4000);
            return;
        }
        var lb = document.getElementById('fr-snap-lightbox');
        if (lb) {
            lb.hidden = true;
            lb.classList.remove('is-minimized');
        }
        var staleKept = document.getElementById('fr-snap-kept');
        if (staleKept && staleKept.parentNode) staleKept.parentNode.removeChild(staleKept);
    }

    function setSnapPanelMinimized(el, minimized) {
        if (!el) return;
        el.classList.toggle('is-minimized', !!minimized);
        var minBtn = el.querySelector('.fr-snap-float-min');
        if (minBtn) {
            minBtn.textContent = minimized ? '□' : '−';
            minBtn.setAttribute('aria-label', minimized
                ? tr('analytics.fr.snapExpand', 'Expand')
                : tr('analytics.fr.snapMinimize', 'Minimize'));
            minBtn.title = minBtn.getAttribute('aria-label');
        }
    }

    function fillSnapPanelContent(el, slot) {
        if (!el || !slot) return;
        el._tick = slot;
        var img = el.querySelector('img');
        if (img) img.src = slot.cropUrl || '';
        var name = slot.deviceLabel || (slot.camId ? friendlyCamName(slot.camId) : '—');
        var titleEl = el.querySelector('.fr-snap-float-title');
        if (titleEl) {
            titleEl.textContent = tr('analytics.fr.snapFloatTitleNamed', 'Snapshot · {name}', {
                name: name,
            });
        }
        var bwcEl = el.querySelector('.fr-snap-meta-bwc');
        var timeEl = el.querySelector('.fr-snap-meta-time');
        var gpsEl = el.querySelector('.fr-snap-meta-gps');
        var scoreEl = el.querySelector('.fr-snap-meta-score');
        if (bwcEl) {
            bwcEl.textContent = tr('analytics.fr.snapMetaBwc', '{name} · {cam}', {
                name: name,
                cam: slot.camId || '—',
            });
        }
        if (timeEl) {
            timeEl.textContent = tr('analytics.fr.snapMetaTime', 'Time: {time}', {
                time: formatSnapTime(slot.at),
            });
        }
        if (gpsEl) gpsEl.textContent = formatSnapGps(slot);
        if (scoreEl) {
            /* mob-fr-snap-hide-zero-score — 0% from rolling is not a real gallery score */
            var showScore = slot.scorePct != null && Number.isFinite(slot.scorePct)
                && (slot.match || Number(slot.scorePct) > 0);
            if (showScore) {
                scoreEl.textContent = tr('analytics.fr.snapMetaScore', 'Match: {score}%', {
                    score: slot.scorePct,
                });
                scoreEl.hidden = false;
            } else {
                scoreEl.textContent = '';
                scoreEl.hidden = true;
            }
        }
        var hasGps = snapHasGps(slot);
        var copyBtn = el.querySelector('.fr-snap-copy-loc');
        var mapBtn = el.querySelector('.fr-snap-show-map');
        var playBtn = el.querySelector('.fr-snap-play');
        if (copyBtn) copyBtn.disabled = !hasGps;
        if (mapBtn) mapBtn.disabled = !hasGps;
        if (playBtn) {
            var canPlay = !!(slot.playUrl && slot.jobId && slot.tSec != null && Number.isFinite(slot.tSec));
            playBtn.hidden = !canPlay;
            playBtn.disabled = !canPlay;
        }
    }

    function snapFloatPanelHtml() {
        return (
            '<div class="fr-snap-float-chrome">' +
            '<span class="fr-snap-float-title">' +
            esc(tr('analytics.fr.snapFloatTitle', 'Snapshot')) + '</span>' +
            '<button type="button" class="fr-snap-float-btn fr-snap-float-min" aria-label="' +
            esc(tr('analytics.fr.snapMinimize', 'Minimize')) + '">−</button>' +
            '<button type="button" class="fr-snap-float-btn fr-snap-float-close" aria-label="' +
            esc(tr('common.close', 'Close')) + '">×</button>' +
            '</div>' +
            '<div class="fr-snap-lightbox-body">' +
            '<div class="fr-snap-lightbox-inner">' +
            '<img alt="">' +
            '<div class="fr-snap-lightbox-meta">' +
            '<p class="fr-snap-meta-line fr-snap-meta-bwc"></p>' +
            '<p class="fr-snap-meta-line fr-snap-meta-time"></p>' +
            '<p class="fr-snap-meta-line fr-snap-meta-gps"></p>' +
            '<p class="fr-snap-meta-line fr-snap-meta-score"></p>' +
            '<div class="fr-snap-lightbox-actions">' +
            '<button type="button" class="btn btn-sm fr-snap-copy-loc">' +
            esc(tr('analytics.fr.snapCopyLoc', 'Copy location')) + '</button>' +
            '<button type="button" class="btn btn-sm fr-snap-show-map">' +
            esc(tr('analytics.fr.snapShowMap', 'Show on map')) + '</button>' +
            '<button type="button" class="btn btn-sm fr-snap-play" hidden>' +
            esc(tr('analytics.fr.snapPlayFromHere', 'Play from here')) + '</button>' +
            '<button type="button" class="btn btn-sm fr-snap-keep">' +
            esc(tr('analytics.fr.snapKeep', 'Keep')) + '</button>' +
            '</div></div></div></div>'
        );
    }

    function bindSnapPanelChrome(el) {
        if (!el || el._frSnapChromeBound) return;
        el._frSnapChromeBound = true;
        var closeBtn = el.querySelector('.fr-snap-float-close');
        var minBtn = el.querySelector('.fr-snap-float-min');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                el.hidden = true;
                el.classList.remove('is-minimized');
            });
        }
        if (minBtn) {
            minBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                setSnapPanelMinimized(el, !el.classList.contains('is-minimized'));
            });
        }
        var copyBtn = el.querySelector('.fr-snap-copy-loc');
        var mapBtn = el.querySelector('.fr-snap-show-map');
        var playBtn = el.querySelector('.fr-snap-play');
        var keepBtn = el.querySelector('.fr-snap-keep');
        if (copyBtn) {
            copyBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                copySnapLocation(el._tick);
            });
        }
        if (mapBtn) {
            mapBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                showSnapOnMap(el._tick);
            });
        }
        if (playBtn) {
            playBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openOfflineCropPlay(el._tick);
            });
        }
        if (keepBtn) {
            keepBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                keepEvidencePack(el._tick);
            });
        }
        bindSnapFloatDrag(el);
    }

    /** mob-fr-offline-crop-play-at — investigation Play (match not required) */
    function openOfflineCropPlay(slot) {
        if (!slot || !slot.playUrl || !slot.jobId) {
            showStandbyToast(tr('analytics.fr.snapPlayGone', 'Video no longer available. Load the file again.'), 4000);
            return;
        }
        var tSec = slot.tSec != null && Number.isFinite(Number(slot.tSec)) ? Number(slot.tSec) : 0;
        var dlg = document.getElementById('fr-offline-play');
        if (!dlg) {
            dlg = document.createElement('div');
            dlg.id = 'fr-offline-play';
            dlg.className = 'fr-offline-play';
            dlg.innerHTML =
                '<div class="fr-offline-play-inner">' +
                '<div class="fr-offline-play-bar">' +
                '<span class="fr-offline-play-title"></span>' +
                '<button type="button" class="btn btn-ghost btn-sm fr-offline-play-close">' +
                esc(tr('common.close', 'Close')) + '</button></div>' +
                '<video class="fr-offline-play-video" controls playsinline></video>' +
                '</div>';
            document.body.appendChild(dlg);
            dlg.querySelector('.fr-offline-play-close').addEventListener('click', function () {
                var v = dlg.querySelector('video');
                if (v) {
                    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) { /* ignore */ }
                }
                dlg.hidden = true;
            });
        }
        var title = dlg.querySelector('.fr-offline-play-title');
        var video = dlg.querySelector('video');
        if (title) {
            title.textContent = tr('analytics.fr.snapPlayTitle', 'Play · {name} @ {t}s', {
                name: slot.deviceLabel || slot.camId || 'video',
                t: tSec,
            });
        }
        if (video) {
            video.src = slot.playUrl + (slot.playUrl.indexOf('?') >= 0 ? '&' : '?') + 't=' + encodeURIComponent(String(tSec));
            video.onloadedmetadata = function () {
                try {
                    if (tSec > 0 && Number.isFinite(video.duration) && tSec < video.duration) {
                        video.currentTime = tSec;
                    } else if (tSec > 0) {
                        video.currentTime = Math.min(tSec, Math.max(0, (video.duration || tSec) - 0.1));
                    }
                    video.play().catch(function () { /* autoplay may block */ });
                } catch (_) { /* ignore */ }
            };
        }
        dlg.hidden = false;
    }

    function blobToJpegB64(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var s = String(reader.result || '');
                var i = s.indexOf(',');
                resolve(i >= 0 ? s.slice(i + 1) : s);
            };
            reader.onerror = function () { reject(new Error('read_failed')); };
            reader.readAsDataURL(blob);
        });
    }

    /**
     * mob-fr-snap-keep-evidence-pack — disk only + toast; no second floating tab
     * mob-fr-map-keep-require-crop — refuse without cropUrl; clearer fail toasts
     */
    function keepEvidencePack(slot) {
        if (!slot || !slot.cropUrl) {
            showStandbyToast(tr(
                'analytics.fr.snapKeepNoCrop',
                'No face crop for this pin — open the snap again to Keep'
            ), 4000);
            return;
        }
        showStandbyToast(tr('analytics.fr.snapKeeping', 'Saving for investigation…'), 4000);
        fetch(slot.cropUrl, { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) {
                    var err = new Error('crop_fetch');
                    err.code = 'crop_fetch';
                    err.status = r.status;
                    throw err;
                }
                return r.blob();
            })
            .then(function (blob) { return blobToJpegB64(blob); })
            .then(function (jpegB64) {
                return fetch('/api/analytics/fr/kept', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        jpegB64: jpegB64,
                        camId: slot.camId || '',
                        deviceLabel: slot.deviceLabel || '',
                        at: slot.at || null,
                        lat: slot.lat,
                        lon: slot.lon,
                        scorePct: slot.scorePct,
                        match: !!slot.match,
                        displayName: slot.displayName || (slot.match && slot.match.displayName) || null,
                        blacklistId: slot.blacklistId || (slot.match && slot.match.id) || null,
                        hitId: slot.hitId || null,
                    }),
                });
            })
            .then(function (r) { return r.json().then(function (data) { return { status: r.status, data: data }; }); })
            .then(function (pack) {
                if (!pack.data || !pack.data.ok) {
                    if (pack.status === 403) {
                        showStandbyToast(tr(
                            'analytics.fr.snapKeepNotLicensed',
                            'Face recognition is not licensed — cannot Keep'
                        ), 4500);
                    } else {
                        showStandbyToast(tr(
                            'analytics.fr.snapKeepSaveFail',
                            'Could not save investigation hold'
                        ), 3500);
                    }
                    return;
                }
                var hint = pack.data.hint
                    || tr('analytics.fr.snapKeptFolderHint',
                        'Saved to Investigation holds (Evidence tab). IT path: {folder}.',
                        { folder: pack.data.folderHint || 'storage/fr-kept' });
                showStandbyToast(hint, 7000);
                try {
                    if (global.FrKeptUi && FrKeptUi.refresh) FrKeptUi.refresh();
                } catch (_) { /* ignore */ }
            })
            .catch(function (err) {
                if (err && err.code === 'crop_fetch') {
                    showStandbyToast(tr(
                        'analytics.fr.snapKeepCropGone',
                        'Crop expired — open the snap again, then Keep'
                    ), 4500);
                    return;
                }
                showStandbyToast(tr(
                    'analytics.fr.snapKeepSaveFail',
                    'Could not save investigation hold'
                ), 3500);
            });
    }

    function clampSnapFloatPosition(el, left, top) {
        if (!el) return;
        var rect = el.getBoundingClientRect();
        var w = rect.width || 280;
        var h = rect.height || 40;
        var maxL = Math.max(8, window.innerWidth - w - 8);
        var maxT = Math.max(8, window.innerHeight - h - 8);
        var l = Math.min(maxL, Math.max(8, left));
        var t = Math.min(maxT, Math.max(8, top));
        el.style.left = l + 'px';
        el.style.top = t + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    }

    function bindSnapFloatDrag(el) {
        var chrome = el.querySelector('.fr-snap-float-chrome');
        if (!chrome || chrome._frSnapDragBound) return;
        chrome._frSnapDragBound = true;
        var dragging = false;
        var startX = 0;
        var startY = 0;
        var origL = 0;
        var origT = 0;
        chrome.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('.fr-snap-float-btn')) return;
            var rect = el.getBoundingClientRect();
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origL = rect.left;
            origT = rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            clampSnapFloatPosition(el, origL + (e.clientX - startX), origT + (e.clientY - startY));
        });
        document.addEventListener('mouseup', function () {
            dragging = false;
        });
    }

    function ensureSnapLightbox() {
        var el = document.getElementById('fr-snap-lightbox');
        /* recreate if missing Keep / Play (evidence + offline play-at) or chrome */
        if (el && (!el.querySelector('.fr-snap-float-chrome') || !el.querySelector('.fr-snap-keep')
            || !el.querySelector('.fr-snap-play'))) {
            el.parentNode.removeChild(el);
            el = null;
        }
        var staleKept = document.getElementById('fr-snap-kept');
        if (staleKept && staleKept.parentNode) staleKept.parentNode.removeChild(staleKept);
        if (el) return el;
        el = document.createElement('div');
        el.id = 'fr-snap-lightbox';
        el.hidden = true;
        el.setAttribute('data-fr-snap-float', '1');
        el.innerHTML = snapFloatPanelHtml();
        bindSnapPanelChrome(el);
        document.body.appendChild(el);
        return el;
    }

    function openSnapLightbox(slot) {
        if (!slot || !slot.cropUrl) return;
        var lb = ensureSnapLightbox();
        fillSnapPanelContent(lb, slot);
        setSnapPanelMinimized(lb, false);
        if (!lb.style.left && !lb.style.top) {
            lb.style.right = '16px';
            lb.style.bottom = '16px';
            lb.style.left = 'auto';
            lb.style.top = 'auto';
        }
        lb.hidden = false;
    }

    function backdrop() {
        return document.getElementById('fr-alarm-backdrop');
    }

    function alertDrawer() {
        return document.getElementById('fr-alert-drawer');
    }

    var DRAWER_EXPAND_KEY = 'fr-drawer-expanded';

    function buildAlertDrawerHtml() {
        return (
            '<div class="fr-alert-drawer-header">' +
            '<h3 class="fr-alert-drawer-title" id="fr-alert-drawer-title">' +
            esc(tr('analytics.fr.alertDrawerTitle', 'Face match alert')) + '</h3>' +
            '<span class="fr-alert-drawer-score-pill" id="fr-alert-drawer-score-pill">—</span>' +
            '<button type="button" class="fr-alert-drawer-expand" id="fr-alert-drawer-expand" ' +
            'aria-pressed="false" aria-label="' + esc(tr('analytics.fr.alertDrawerExpand', 'Expand')) + '">⤢</button>' +
            '<button type="button" class="fr-alert-drawer-close" id="fr-alert-drawer-close" aria-label="Close">×</button>' +
            '</div>' +
            '<div class="fr-alert-drawer-body">' +
            '<div class="fr-alert-drawer-compare">' +
            '<div class="fr-alert-drawer-photo-card">' +
            '<span class="fr-alert-drawer-photo-label">' + esc(tr('analytics.fr.alertDrawerFieldSnap', 'Field snap')) + '</span>' +
            '<div class="fr-alert-drawer-photo-frame">' +
            '<img id="fr-alert-drawer-crop" alt="">' +
            '<span class="fr-alert-drawer-photo-empty" id="fr-alert-drawer-crop-empty">' +
            esc(tr('analytics.fr.alertDrawerNoPhoto', 'No photo')) + '</span></div></div>' +
            '<div class="fr-alert-drawer-photo-card">' +
            '<span class="fr-alert-drawer-photo-label">' + esc(tr('analytics.fr.alertDrawerWatchlist', 'Watchlist')) + '</span>' +
            '<div class="fr-alert-drawer-photo-frame">' +
            '<img id="fr-alert-drawer-photo" alt="">' +
            '<span class="fr-alert-drawer-photo-empty" id="fr-alert-drawer-photo-empty">' +
            esc(tr('analytics.fr.alertDrawerNoPhoto', 'No photo')) + '</span></div></div></div>' +
            '<div class="fr-alert-drawer-meta-grid">' +
            '<span class="fr-alert-drawer-meta-k">' + esc(tr('analytics.fr.alertDrawerMetaName', 'Name')) + '</span>' +
            '<span class="fr-alert-drawer-meta-v" id="fr-alert-drawer-meta-name">—</span>' +
            '<span class="fr-alert-drawer-meta-k">' + esc(tr('analytics.fr.alertDrawerMetaScore', 'Match')) + '</span>' +
            '<span class="fr-alert-drawer-meta-v" id="fr-alert-drawer-meta-score">—</span>' +
            '<span class="fr-alert-drawer-meta-k">' + esc(tr('analytics.fr.alertDrawerMetaBwc', 'BWC')) + '</span>' +
            '<span class="fr-alert-drawer-meta-v" id="fr-alert-drawer-meta-bwc">—</span>' +
            '<span class="fr-alert-drawer-meta-k">' + esc(tr('analytics.fr.alertDrawerMetaTime', 'Time')) + '</span>' +
            '<span class="fr-alert-drawer-meta-v" id="fr-alert-drawer-meta-time">—</span>' +
            '<span class="fr-alert-drawer-meta-k">' + esc(tr('analytics.fr.alertDrawerMetaGps', 'GPS')) + '</span>' +
            '<span class="fr-alert-drawer-meta-v" id="fr-alert-drawer-meta-gps">—</span></div>' +
            '<p class="fr-alert-drawer-grade" id="fr-alert-drawer-dossier" hidden>' +
            '<span id="fr-alert-drawer-grade" class="ax-bl-grade">—</span> ' +
            '<span id="fr-alert-drawer-reason">—</span></p>' +
            '<p class="fr-alert-drawer-field-status" id="fr-alert-drawer-field-status" hidden></p>' +
            '</div>' +
            '<div class="fr-alert-drawer-actions">' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-alert-drawer-ack">' +
            esc(tr('analytics.fr.alarmAck', 'Ack')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="fr-alert-drawer-field">' +
            esc(tr('analytics.fr.alarmField', 'Alert field')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm sos-ptt-btn" id="fr-alert-drawer-standby-ptt">' +
            esc(tr('analytics.fr.standbyPttTeam', 'Standby PTT team')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="fr-alert-drawer-map">' +
            esc(tr('analytics.fr.alertDrawerGoMap', 'Go to map')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="fr-alert-drawer-dismiss">' +
            esc(tr('analytics.fr.alarmDismiss', 'Dismiss')) + '</button>' +
            '</div>' +
            '<p class="fr-alert-drawer-standby" id="fr-alert-drawer-standby-status" hidden></p>' +
            '<div class="fr-alert-drawer-video-footer">' +
            '<button type="button" class="fr-alert-drawer-video-toggle" id="fr-alert-drawer-video-toggle" ' +
            'aria-expanded="false" aria-controls="fr-alert-drawer-video">' +
            '<span class="fr-alert-drawer-video-toggle-icon" aria-hidden="true">▶</span>' +
            '<span class="fr-alert-drawer-video-toggle-label">' +
            esc(tr('analytics.fr.alertDrawerVideoToggle', 'Live preview')) + '</span>' +
            '<span class="fr-alert-drawer-video-source" id="fr-alert-drawer-video-source">BWC</span>' +
            '<span class="fr-alert-drawer-video-chevron" aria-hidden="true">▼</span>' +
            '</button>' +
            '<div class="fr-alert-drawer-video" id="fr-alert-drawer-video" hidden>' +
            '<canvas class="fr-alert-drawer-video-canvas" id="fr-alert-drawer-video-canvas" aria-hidden="true"></canvas>' +
            '<div class="fr-alert-drawer-video-ph" id="fr-alert-drawer-video-ph">' +
            '<span class="fr-alert-drawer-video-ph-icon" aria-hidden="true">▶</span>' +
            '<span>' + esc(tr('analytics.fr.alertDrawerVideoPh', 'Live video placeholder')) + '</span>' +
            '<span class="hint">' + esc(tr('analytics.fr.alertDrawerVideoHint', 'Live stream connects in a later update')) + '</span>' +
            '</div></div></div>'
        );
    }

    function setDrawerVideoCollapsed(collapsed) {
        var el = alertDrawer();
        var video = document.getElementById('fr-alert-drawer-video');
        var btn = document.getElementById('fr-alert-drawer-video-toggle');
        if (!el) return;
        if (collapsed) {
            el.classList.add('fr-video-collapsed');
            if (video) video.hidden = true;
            if (btn) btn.setAttribute('aria-expanded', 'false');
        } else {
            el.classList.remove('fr-video-collapsed');
            if (video) video.hidden = false;
            if (btn) btn.setAttribute('aria-expanded', 'true');
        }
    }

    function onDrawerVideoToggle() {
        var el = alertDrawer();
        if (!el) return;
        setDrawerVideoCollapsed(!el.classList.contains('fr-video-collapsed'));
    }

    function readDrawerExpandedPref() {
        try {
            return sessionStorage.getItem(DRAWER_EXPAND_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function writeDrawerExpandedPref(expanded) {
        try {
            sessionStorage.setItem(DRAWER_EXPAND_KEY, expanded ? '1' : '0');
        } catch (e) { /* ignore */ }
    }

    function setDrawerExpanded(expanded, persist) {
        var el = alertDrawer();
        var btn = document.getElementById('fr-alert-drawer-expand');
        if (!el) return;
        if (expanded) {
            el.classList.add('fr-drawer-expanded');
            if (btn) {
                btn.setAttribute('aria-pressed', 'true');
                btn.textContent = '⤡';
                btn.setAttribute('aria-label', tr('analytics.fr.alertDrawerContract', 'Contract'));
            }
        } else {
            el.classList.remove('fr-drawer-expanded');
            if (btn) {
                btn.setAttribute('aria-pressed', 'false');
                btn.textContent = '⤢';
                btn.setAttribute('aria-label', tr('analytics.fr.alertDrawerExpand', 'Expand'));
            }
        }
        if (persist !== false) writeDrawerExpandedPref(expanded);
    }

    function onDrawerExpandToggle() {
        var el = alertDrawer();
        if (!el) return;
        setDrawerExpanded(!el.classList.contains('fr-drawer-expanded'));
    }

    function applyDrawerExpandPref() {
        setDrawerExpanded(readDrawerExpandedPref(), false);
    }

    function migrateAlertDrawerIfNeeded() {
        var el = alertDrawer();
        if (el && el.querySelector('#fr-alert-drawer-video-toggle') && el.querySelector('#fr-alert-drawer-expand')) {
            return el;
        }
        if (el && el.parentNode) el.parentNode.removeChild(el);
        return null;
    }

    function bindDrawerVideoToggle() {
        var btn = document.getElementById('fr-alert-drawer-video-toggle');
        if (!btn || btn.dataset.frBound === '1') return;
        btn.dataset.frBound = '1';
        btn.addEventListener('click', onDrawerVideoToggle);
    }

    function bindDrawerExpandToggle() {
        var btn = document.getElementById('fr-alert-drawer-expand');
        if (!btn || btn.dataset.frBound === '1') return;
        btn.dataset.frBound = '1';
        btn.addEventListener('click', onDrawerExpandToggle);
    }

    function ensureAlertDrawer() {
        var el = migrateAlertDrawerIfNeeded() || alertDrawer();
        if (el) return el;
        el = document.createElement('div');
        el.id = 'fr-alert-drawer';
        el.className = 'fr-video-collapsed';
        el.hidden = true;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-labelledby', 'fr-alert-drawer-title');
        el.innerHTML = buildAlertDrawerHtml();
        document.body.appendChild(el);
        bindDrawerVideoToggle();
        bindDrawerExpandToggle();
        applyDrawerExpandPref();
        return el;
    }

    function setDrawerPhoto(cropEl, emptyEl, url) {
        if (!cropEl) return;
        var has = !!(url && String(url).trim());
        cropEl.src = has ? url : '';
        cropEl.hidden = !has;
        if (emptyEl) emptyEl.hidden = has;
    }

    function hitHasGps(hit) {
        return !!(hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lon)));
    }

    function fillAlertDrawer(hit) {
        if (!hit) return;
        ensureAlertDrawer();
        var scorePill = document.getElementById('fr-alert-drawer-score-pill');
        var nameEl = document.getElementById('fr-alert-drawer-meta-name');
        var scoreEl = document.getElementById('fr-alert-drawer-meta-score');
        var bwcEl = document.getElementById('fr-alert-drawer-meta-bwc');
        var timeEl = document.getElementById('fr-alert-drawer-meta-time');
        var gpsEl = document.getElementById('fr-alert-drawer-meta-gps');
        var cropEl = document.getElementById('fr-alert-drawer-crop');
        var cropEmpty = document.getElementById('fr-alert-drawer-crop-empty');
        var photoEl = document.getElementById('fr-alert-drawer-photo');
        var photoEmpty = document.getElementById('fr-alert-drawer-photo-empty');
        var dossier = document.getElementById('fr-alert-drawer-dossier');
        var gradeEl = document.getElementById('fr-alert-drawer-grade');
        var reasonEl = document.getElementById('fr-alert-drawer-reason');
        var mapBtn = document.getElementById('fr-alert-drawer-map');
        var fieldStatus = document.getElementById('fr-alert-drawer-field-status');
        var videoSrc = document.getElementById('fr-alert-drawer-video-source');
        var displayName = hit.displayName || hit.blacklistId || '—';
        var scoreText = hit.scorePct != null ? String(hit.scorePct) + '%' : '—';
        if (scorePill) scorePill.textContent = scoreText;
        if (videoSrc) videoSrc.textContent = hit.camId || tr('analytics.fr.alertDrawerVideoSource', 'BWC');
        if (nameEl) nameEl.textContent = displayName;
        if (scoreEl) scoreEl.textContent = scoreText;
        if (bwcEl) {
            bwcEl.textContent = tr('analytics.fr.snapMetaBwc', '{name} · {cam}', {
                name: hit.deviceLabel || displayName,
                cam: hit.camId || '—',
            });
        }
        if (timeEl) {
            timeEl.textContent = hit.at ? formatSnapTime(hit.at) : (hit.detectedAt ? formatSnapTime(hit.detectedAt) : '—');
        }
        if (gpsEl) {
            gpsEl.textContent = drawerGpsLine(hit);
        }
        if (dossier && gradeEl && reasonEl) {
            var status = hit.listStatus || 'blacklist';
            var gradeText = (global.AnalyticsHub && AnalyticsHub.gradeLabel)
                ? AnalyticsHub.gradeLabel(status)
                : status;
            var reasonText = (global.AnalyticsHub && AnalyticsHub.reasonLabel)
                ? AnalyticsHub.reasonLabel(hit.reasonCode || 'other', hit.reasonOther || '')
                : (hit.reasonCode || '');
            gradeEl.className = 'ax-bl-grade is-' + String(status).replace(/[^a-z]/gi, '');
            gradeEl.textContent = gradeText;
            reasonEl.textContent = reasonText;
            dossier.hidden = false;
        }
        setDrawerPhoto(cropEl, cropEmpty, hit.cropUrl);
        setDrawerPhoto(photoEl, photoEmpty, hit.photoUrl);
        if (mapBtn) syncDrawerMapBtn(hit);
        if (fieldStatus) fieldStatus.hidden = true;
        syncDrawerStandbyUi();
    }

    function syncDrawerStandbyUi() {
        var drawerStatus = document.getElementById('fr-alert-drawer-standby-status');
        var modalStatus = document.getElementById('fr-alarm-standby-status');
        if (!drawerStatus) return;
        if (modalStatus && !modalStatus.hidden) {
            drawerStatus.hidden = false;
            drawerStatus.textContent = modalStatus.textContent;
        } else {
            drawerStatus.hidden = true;
            drawerStatus.textContent = '';
        }
    }

    function openAlertDrawerShell(hit) {
        if (!hit) return;
        var el = ensureAlertDrawer();
        fillAlertDrawer(hit);
        setDrawerVideoCollapsed(true);
        applyDrawerExpandPref();
        el.hidden = false;
    }

    function closeAlertDrawer() {
        var el = alertDrawer();
        if (el) el.hidden = true;
    }

    function hqBar() {
        return document.getElementById('fr-hq-alert-bar');
    }

    function updateHqBar(hit) {
        var bar = hqBar();
        if (!bar) return;
        if (!hit) {
            bar.hidden = true;
            document.body.classList.remove('fr-hq-alert-active');
            return;
        }
        var textEl = document.getElementById('fr-hq-alert-text');
        var pendEl = document.getElementById('fr-hq-alert-pending');
        if (textEl) {
            textEl.textContent = tr('analytics.fr.hqBarText', '{name} · {cam} · {score}%', {
                name: hit.displayName || hit.blacklistId || '—',
                cam: hit.deviceLabel || hit.camId || '—',
                score: hit.scorePct != null ? hit.scorePct : '—',
            });
        }
        if (pendEl) {
            if (queue.length > 0) {
                pendEl.hidden = false;
                pendEl.textContent = '+' + queue.length;
            } else {
                pendEl.hidden = true;
            }
        }
        var hqMap = document.getElementById('fr-hq-alert-map');
        if (hqMap) {
            hqMap.disabled = !!(hit._labPreview) || !hit.camId;
        }
        bar.hidden = false;
        document.body.classList.add('fr-hq-alert-active');
    }

    function fillModal(hit) {
        if (!hit) return;
        var nameEl = document.getElementById('fr-alarm-name');
        var camEl = document.getElementById('fr-alarm-cam');
        var scoreEl = document.getElementById('fr-alarm-score');
        var cropEl = document.getElementById('fr-alarm-crop');
        var photoEl = document.getElementById('fr-alarm-photo');
        if (nameEl) nameEl.textContent = hit.displayName || hit.blacklistId || '—';
        if (camEl) camEl.textContent = (hit.deviceLabel || hit.camId || '—');
        if (scoreEl) scoreEl.textContent = String(hit.scorePct != null ? hit.scorePct : '—') + '%';
        var dossier = document.getElementById('fr-alarm-dossier');
        var gradeEl = document.getElementById('fr-alarm-grade');
        var reasonEl = document.getElementById('fr-alarm-reason');
        if (dossier && gradeEl && reasonEl) {
            var status = hit.listStatus || 'blacklist';
            var gradeText = (global.AnalyticsHub && AnalyticsHub.gradeLabel)
                ? AnalyticsHub.gradeLabel(status)
                : status;
            var reasonText = (global.AnalyticsHub && AnalyticsHub.reasonLabel)
                ? AnalyticsHub.reasonLabel(hit.reasonCode || 'other', hit.reasonOther || '')
                : (hit.reasonCode || '');
            gradeEl.className = 'ax-bl-grade is-' + String(status).replace(/[^a-z]/gi, '');
            gradeEl.textContent = gradeText;
            reasonEl.textContent = reasonText;
            dossier.hidden = false;
        }
        if (cropEl) {
            cropEl.src = hit.cropUrl || '';
            cropEl.hidden = !hit.cropUrl;
        }
        if (photoEl) {
            photoEl.src = hit.photoUrl || '';
            photoEl.hidden = !hit.photoUrl;
        }
    }

    function showHit(hit) {
        if (!hit) return;
        current = hit;
        fillModal(hit);
        updateHqBar(hit);
        showRedToast(hit);
        goOpsOnHit(hit);
        markRailAlertActive(hit);
        playChime();
        if (global.FrLiveWatch && FrLiveWatch.flashCam) {
            FrLiveWatch.flashCam(hit.camId);
        }
    }

    function openModalOnly() {
        if (!current) return;
        fillModal(current);
        openAlertDrawerShell(current);
    }

    function clearActive() {
        current = null;
        updateHqBar(null);
        hideRedToast();
        closeAlertDrawer();
        var bd = backdrop();
        if (bd) bd.hidden = true;
        var list = ensureCropRail();
        clearRailAlertActive(list);
        if (queue.length) {
            setTimeout(function () { showHit(queue.shift()); }, 200);
        }
    }

    function hideModal() {
        /* Ack/Dismiss path — clear active + bar; may open next queued hit */
        clearActive();
    }

    function onFrAlarmAck() {
        if (!current) {
            hideRedToast();
            return;
        }
        if (current._labPreview) {
            clearActive();
            return;
        }
        emitAction('fr-alarm-ack');
        hideModal();
    }

    function onFrAlarmDismiss() {
        if (!current) {
            hideRedToast();
            return;
        }
        if (current._labPreview) {
            clearActive();
            return;
        }
        emitAction('fr-alarm-dismiss');
        hideModal();
    }

    function onFrToastDetail() {
        if (!current) {
            previewAlertDrawerLab();
            return;
        }
        openAlertDrawerShell(current);
    }

    function onFrHqGoMap() {
        if (current) {
            goOpsOnHit(current, { explicit: true });
            return;
        }
        switchToOpsTab(function () {});
    }

    function onFrToastGoMap() {
        if (current) {
            if (current._labPreview) {
                showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 5000);
                return;
            }
            goOpsOnHit(current, { explicit: true });
            return;
        }
        switchToOpsTab(function () {});
    }

    function onHit(hit) {
        if (!hit || !hit.hitId) return;
        pushSubjectMatch({
            camId: hit.camId,
            deviceLabel: hit.deviceLabel,
            cropUrl: hit.cropUrl,
            match: true,
            displayName: hit.displayName,
            scorePct: hit.scorePct,
            hitId: hit.hitId,
            blacklistId: hit.blacklistId,
            listStatus: hit.listStatus || 'blacklist',
            faces: 1,
            at: hit.at,
            lat: hit.lat,
            lon: hit.lon,
            gpsAt: hit.gpsAt,
        });
        if (current) {
            queue.push(hit);
            if (queue.length > 8) queue.shift();
            updateHqBar(current);
            updateRedToastQueueBadge(queue.length);
            playChime();
            return;
        }
        showHit(hit);
    }

    function emitAction(ev) {
        var sock = getSocket();
        if (!sock || !current) return;
        sock.emit(ev, {
            hitId: current.hitId,
            camId: current.camId,
            blacklistId: current.blacklistId,
            displayName: current.displayName || '',
        });
    }

    function setFieldBtnBusy(busy) {
        ['fr-alarm-field', 'fr-alert-drawer-field', 'fr-red-toast-field'].forEach(function (id) {
            var btn = document.getElementById(id);
            if (btn) btn.disabled = !!busy;
        });
    }

    function onFrFieldAlertClick() {
        if (!current || !current.camId) return;
        if (current._labPreview) {
            showDrawerFieldStatus(false, 'lab');
            showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 5000);
            return;
        }
        setFieldBtnBusy(true);
        emitAction('fr-field-alert');
    }

    function showDrawerFieldStatus(ok, err) {
        var el = document.getElementById('fr-alert-drawer-field-status');
        if (!el) return;
        el.hidden = false;
        el.className = 'fr-alert-drawer-field-status ' + (ok ? 'is-ok' : 'is-err');
        if (ok) {
            el.textContent = tr('analytics.fr.alarmFieldOk', 'Field alert sent');
        } else if (err === 'lab') {
            el.textContent = tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match');
        } else if (err === 'cooldown') {
            el.textContent = tr('analytics.fr.alarmFieldCooldown', 'Wait a few seconds before alerting again');
        } else {
            el.textContent = tr('analytics.fr.alarmFieldFail', 'Field alert failed — BWC not on PTT or no SIP contact');
        }
    }

    function showFieldStatus(ok, err) {
        var meta = document.querySelector('#fr-alarm-panel .fr-alarm-meta');
        if (meta) {
            var prev = document.getElementById('fr-alarm-field-status');
            if (prev) prev.remove();
            var el = document.createElement('p');
            el.id = 'fr-alarm-field-status';
            el.className = 'hint';
            el.style.margin = '6px 0 0';
            el.style.color = ok ? '#86efac' : '#fca5a5';
            if (ok) {
                el.textContent = tr('analytics.fr.alarmFieldOk', 'Field alert sent');
            } else if (err === 'cooldown') {
                el.textContent = tr('analytics.fr.alarmFieldCooldown', 'Wait a few seconds before alerting again');
            } else {
                el.textContent = tr('analytics.fr.alarmFieldFail', 'Field alert failed — BWC not on PTT or no SIP contact');
            }
            meta.parentNode.insertBefore(el, meta.nextSibling);
        }
        showDrawerFieldStatus(ok, err);
    }

    function showHitOnMapFromCurrent() {
        if (!current) return;
        if (current._labPreview) {
            showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 5000);
            return;
        }
        goOpsOnHit(current, { explicit: true });
    }

    function buildLabPreviewHit() {
        var camId = '34020000001329000008';
        if (typeof FleetUi !== 'undefined' && FleetUi.listDevices) {
            var devices = FleetUi.listDevices() || [];
            if (devices.length && devices[0].cameraId) camId = devices[0].cameraId;
        }
        return {
            hitId: 'lab-preview-' + Date.now(),
            camId: camId,
            deviceLabel: friendlyCamName(camId),
            displayName: tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'),
            blacklistId: 'lab-preview',
            scorePct: 87,
            cropUrl: '',
            photoUrl: '',
            listStatus: 'suspect',
            reasonCode: 'suspicious',
            at: new Date().toISOString(),
            lat: null,
            lon: null,
            _labPreview: true,
        };
    }

    function previewRedToastLab() {
        var hit = buildLabPreviewHit();
        hit.displayName = tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match');
        showRedToast(hit);
        showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 6000);
    }

    function previewAlertDrawerLab() {
        if (current && !current._labPreview) {
            showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 5000);
            openAlertDrawerShell(current);
            return;
        }
        var hit = buildLabPreviewHit();
        current = hit;
        fillModal(hit);
        updateHqBar(hit);
        openAlertDrawerShell(hit);
        showStandbyToast(tr('analytics.fr.previewDrawerLabHint', 'Layout preview only — not a real match'), 6000);
    }

    function applyFrLabPreviewGate(enabled) {
        var on = !!enabled;
        global.FM_FR_LAB_UI = on;
        if (document.body) {
            document.body.classList.toggle('fm-fr-lab-ui', on);
        }
    }

    function syncFrLabPreviewGate() {
        if (global.__fmServerCapabilities) {
            applyFrLabPreviewGate(!!global.__fmServerCapabilities.frLabUi);
            return;
        }
        fetch('/api/analytics/fr/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                applyFrLabPreviewGate(!!(j && j.frLabUi));
            })
            .catch(function () {
                applyFrLabPreviewGate(false);
            });
    }

    function onFrServerCapabilities(data) {
        global.__fmServerCapabilities = data || null;
        applyFrLabPreviewGate(!!(data && data.frLabUi));
    }

    function bindFrLabPreviewGateSocket(sock) {
        if (!sock || sock.__frLabGateCapBound) return;
        sock.__frLabGateCapBound = true;
        sock.on('server-capabilities', onFrServerCapabilities);
    }

    function bindSocket() {
        var sock = getSocket();
        if (!sock || sock.__frAlarmBound) return;
        sock.__frAlarmBound = true;
        bindFrLabPreviewGateSocket(sock);
        sock.on('fr-blacklist-hit', onHit);
        sock.on('fr-crop-tick', function (tick) {
            pushCrop(tick || {});
        });
        sock.on('fr-alarm-acked', function (p) {
            if (current && p && p.hitId === current.hitId) hideModal();
        });
        sock.on('fr-alarm-dismissed', function (p) {
            if (current && p && p.hitId === current.hitId) hideModal();
        });
        sock.on('fr-field-alert-result', function (p) {
            setFieldBtnBusy(false);
            syncRedToastFieldBtn(current);
            showFieldStatus(!!(p && p.ok), p && p.error);
        });
    }

    function bindUi() {
        if (!bound) {
            bound = true;
            ensureAlertDrawer();
            ensureHitsBar();
            ensureCropRail();
            var ack = document.getElementById('fr-alarm-ack');
            var dismiss = document.getElementById('fr-alarm-dismiss');
            var field = document.getElementById('fr-alarm-field');
            var standby = document.getElementById('fr-alarm-standby-ptt');
            var hqStandby = document.getElementById('fr-hq-alert-standby-ptt');
            var hqMap = document.getElementById('fr-hq-alert-map');
            var hqOpen = document.getElementById('fr-hq-alert-open');
            var hqAck = document.getElementById('fr-hq-alert-ack');
            var hqDismiss = document.getElementById('fr-hq-alert-dismiss');
            var drawerAck = document.getElementById('fr-alert-drawer-ack');
            var drawerDismiss = document.getElementById('fr-alert-drawer-dismiss');
            var drawerField = document.getElementById('fr-alert-drawer-field');
            var drawerStandby = document.getElementById('fr-alert-drawer-standby-ptt');
            var drawerClose = document.getElementById('fr-alert-drawer-close');
            var drawerMap = document.getElementById('fr-alert-drawer-map');
            var previewBtn = document.getElementById('ax-fr-preview-drawer');
            var previewToastBtn = document.getElementById('ax-fr-preview-toast');
            if (ack) ack.addEventListener('click', onFrAlarmAck);
            if (dismiss) dismiss.addEventListener('click', onFrAlarmDismiss);
            if (drawerAck) drawerAck.addEventListener('click', onFrAlarmAck);
            if (drawerDismiss) drawerDismiss.addEventListener('click', onFrAlarmDismiss);
            if (drawerClose) {
                drawerClose.addEventListener('click', function () {
                    closeAlertDrawer();
                });
            }
            if (field) field.addEventListener('click', onFrFieldAlertClick);
            if (drawerField) drawerField.addEventListener('click', onFrFieldAlertClick);
            if (standby) standby.addEventListener('click', pushFrStandbyPttTeamNow);
            if (hqStandby) hqStandby.addEventListener('click', pushFrStandbyPttTeamNow);
            if (drawerStandby) drawerStandby.addEventListener('click', pushFrStandbyPttTeamNow);
            if (drawerMap) drawerMap.addEventListener('click', showHitOnMapFromCurrent);
            bindDrawerVideoToggle();
            bindDrawerExpandToggle();
            if (previewBtn) previewBtn.addEventListener('click', previewAlertDrawerLab);
            if (previewToastBtn) previewToastBtn.addEventListener('click', previewRedToastLab);
            if (hqMap) hqMap.addEventListener('click', onFrHqGoMap);
            if (hqOpen) {
                hqOpen.addEventListener('click', function () {
                    openModalOnly();
                });
            }
            if (hqAck) hqAck.addEventListener('click', onFrAlarmAck);
            if (hqDismiss) hqDismiss.addEventListener('click', onFrAlarmDismiss);
        }
        bindRedToastUi();
        bindSocket();
    }

    function init() {
        syncFrLabPreviewGate();
        bindUi();
        ensureCropRail();
    }

    global.FrAlarm = {
        init: init,
        bindUi: bindUi,
        onHit: onHit,
        pushStandbyPttTeam: pushFrStandbyPttTeamNow,
        previewDrawerLab: previewAlertDrawerLab,
        previewRedToastLab: previewRedToastLab,
        showRedToast: showRedToast,
        goOpsOnHit: goOpsOnHit,
        keepEvidencePack: keepEvidencePack,
        toast: showStandbyToast,
        applyLabPreviewGate: applyFrLabPreviewGate,
    };

    (function frLabPreviewGateBoot() {
        function tryBind() {
            var sock = global.__mobilityDashboardSocket || global.socket;
            if (!sock) return false;
            bindFrLabPreviewGateSocket(sock);
            return true;
        }
        if (!tryBind()) {
            var n = 0;
            var iv = setInterval(function () {
                if (tryBind() || ++n > 80) clearInterval(iv);
            }, 100);
        }
    })();
})(window);
