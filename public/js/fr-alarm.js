/**
 * FR blacklist alarm — crop rail + popup + chime + HQ global bar (all pages).
 * mob-fr-hq-global-alert-bar: sticky strip until Ack/Dismiss.
 * Speech via VoiceAlerts when available.
 */
(function (global) {
    var cropRailMax = 16;
    var bound = false;
    var queue = [];
    var current = null;
    var activeStandbyTeam = null;
    var FR_STANDBY_RADIUS_M = 500;

    function friendlyCamName(camId) {
        if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
            return FleetDisplay.friendlyDeviceName(camId) || String(camId).slice(-8);
        }
        if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
            return FleetUi.getDeviceName(camId) || String(camId).slice(-8);
        }
        return String(camId).slice(-8);
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
        var active = Array.isArray(activeStandbyTeam) && activeStandbyTeam.length > 1;
        [btn, hqBtn].forEach(function (b) {
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
        var btn = document.getElementById('fr-alarm-standby-ptt');
        var hqBtn = document.getElementById('fr-hq-alert-standby-ptt');
        if ((btn && btn.disabled) || (hqBtn && hqBtn.disabled)) return;
        if (btn) btn.disabled = true;
        if (hqBtn) hqBtn.disabled = true;
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
                alert(tr('analytics.fr.standbyPttNoNearby', 'No online nearby units within 500 m.'));
                return;
            } else {
                if (btn) btn.disabled = false;
                if (hqBtn) hqBtn.disabled = false;
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
            card.dataset.scorePct = String(t.scorePct);
        } else {
            delete card.dataset.scorePct;
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
    }

    function fillCropSlot(card, tick) {
        if (!card) return;
        var url = tick && tick.cropUrl ? String(tick.cropUrl) : '';
        var isMatch = !!(tick && tick.match);
        card.dataset.cropUrl = url;
        if (url) {
            writeCropSlotMeta(card, tick);
        } else {
            clearCropSlotMeta(card);
        }
        card.className = 'ax-fr-crop-card' + (url ? (isMatch ? ' is-match' : '') : ' is-empty');
        if (url) {
            card.innerHTML = '<img src="' + esc(url) + '" alt="">';
            card.onclick = function () { openSnapLightbox(readCropSlot(card)); };
            card.ondblclick = card.onclick;
        } else {
            card.innerHTML = '<div class="ax-fr-crop-ph">—</div>';
            card.onclick = null;
            card.ondblclick = null;
        }
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

    function syncCropRailEmptyHint(list) {
        var empty = document.getElementById('ax-fr-crop-empty');
        if (!empty || !list) return;
        var any = false;
        for (var i = 0; i < list.children.length; i++) {
            if (list.children[i].dataset.cropUrl) {
                any = true;
                break;
            }
        }
        empty.hidden = any;
    }

    function ensureCropRail() {
        var el = document.getElementById('ax-fr-crop-rail');
        if (!el) return null;
        if (!el.querySelector('.ax-fr-crop-list')) {
            el.innerHTML =
                '<h4 class="ax-fr-snapshot-title">' + esc(tr('analytics.fr.snapshotGrid16', 'Snapshot (16)')) + '</h4>' +
                '<p class="hint ax-fr-crop-empty" id="ax-fr-crop-empty">' +
                esc(tr('analytics.fr.cropEmpty', 'Snaps appear while watch is running.')) +
                '</p><div class="ax-fr-crop-list"></div>';
        }
        var titleEl = el.querySelector('.ax-fr-snapshot-title');
        if (titleEl) {
            titleEl.textContent = tr('analytics.fr.snapshotGrid16', 'Snapshot (16)');
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
        if (typeof global.showFrSnapOnMap === 'function') {
            if (global.showFrSnapOnMap(slot.lat, slot.lon, slot.camId || null)) return;
        }
        showStandbyToast(tr('analytics.fr.snapMapFail', 'Could not open map'), 4000);
    }

    function ensureSnapLightbox() {
        var el = document.getElementById('fr-snap-lightbox');
        if (el && !el.querySelector('.fr-snap-lightbox-meta')) {
            el.parentNode.removeChild(el);
            el = null;
        }
        if (el) return el;
        el = document.createElement('div');
        el.id = 'fr-snap-lightbox';
        el.hidden = true;
        el.innerHTML =
            '<button type="button" class="fr-snap-lightbox-close" aria-label="Close">×</button>' +
            '<div class="fr-snap-lightbox-inner">' +
            '<img alt="">' +
            '<div class="fr-snap-lightbox-meta">' +
            '<p class="fr-snap-meta-line" id="fr-snap-meta-bwc"></p>' +
            '<p class="fr-snap-meta-line" id="fr-snap-meta-time"></p>' +
            '<p class="fr-snap-meta-line" id="fr-snap-meta-gps"></p>' +
            '<p class="fr-snap-meta-line" id="fr-snap-meta-score"></p>' +
            '<div class="fr-snap-lightbox-actions">' +
            '<button type="button" class="btn btn-sm" id="fr-snap-copy-loc">' +
            esc(tr('analytics.fr.snapCopyLoc', 'Copy location')) + '</button>' +
            '<button type="button" class="btn btn-sm" id="fr-snap-show-map">' +
            esc(tr('analytics.fr.snapShowMap', 'Show on map')) + '</button>' +
            '</div></div></div>';
        el.addEventListener('click', function (e) {
            if (e.target === el || (e.target.classList && e.target.classList.contains('fr-snap-lightbox-close'))) {
                el.hidden = true;
            }
        });
        var copyBtn = el.querySelector('#fr-snap-copy-loc');
        var mapBtn = el.querySelector('#fr-snap-show-map');
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
        document.body.appendChild(el);
        return el;
    }

    function openSnapLightbox(slot) {
        if (!slot || !slot.cropUrl) return;
        var lb = ensureSnapLightbox();
        lb._tick = slot;
        var img = lb.querySelector('img');
        if (img) img.src = slot.cropUrl;
        var bwcEl = lb.querySelector('#fr-snap-meta-bwc');
        var timeEl = lb.querySelector('#fr-snap-meta-time');
        var gpsEl = lb.querySelector('#fr-snap-meta-gps');
        var scoreEl = lb.querySelector('#fr-snap-meta-score');
        var name = slot.deviceLabel || (slot.camId ? friendlyCamName(slot.camId) : '—');
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
            if (slot.scorePct != null && Number.isFinite(slot.scorePct)) {
                scoreEl.textContent = tr('analytics.fr.snapMetaScore', 'Match: {score}%', {
                    score: slot.scorePct,
                });
                scoreEl.hidden = false;
            } else {
                scoreEl.textContent = '';
                scoreEl.hidden = true;
            }
        }
        var copyBtn = lb.querySelector('#fr-snap-copy-loc');
        var mapBtn = lb.querySelector('#fr-snap-show-map');
        var hasGps = snapHasGps(slot);
        if (copyBtn) copyBtn.disabled = !hasGps;
        if (mapBtn) mapBtn.disabled = !hasGps;
        lb.hidden = false;
    }

    function pushCrop(tick) {
        var list = ensureCropRail();
        if (!list || !tick) return;
        if (!tick.cropUrl && !tick.match) {
            if (!tick.faces) return;
        }
        ensureRailSlots(list);
        var i;
        for (i = cropRailMax - 1; i > 0; i--) {
            fillCropSlot(list.children[i], readCropSlot(list.children[i - 1]));
        }
        fillCropSlot(list.children[0], tick);
        syncCropRailEmptyHint(list);
    }

    function backdrop() {
        return document.getElementById('fr-alarm-backdrop');
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
        var bd = backdrop();
        if (bd) bd.hidden = false;
        playChime();
        if (global.FrLiveWatch && FrLiveWatch.flashCam) {
            FrLiveWatch.flashCam(hit.camId);
        }
    }

    function openModalOnly() {
        if (!current) return;
        fillModal(current);
        var bd = backdrop();
        if (bd) bd.hidden = false;
    }

    function clearActive() {
        current = null;
        updateHqBar(null);
        var bd = backdrop();
        if (bd) bd.hidden = true;
        if (queue.length) {
            setTimeout(function () { showHit(queue.shift()); }, 200);
        }
    }

    function hideModal() {
        /* Ack/Dismiss path — clear active + bar; may open next queued hit */
        clearActive();
    }

    function onHit(hit) {
        if (!hit || !hit.hitId) return;
        pushCrop({
            camId: hit.camId,
            deviceLabel: hit.deviceLabel,
            cropUrl: hit.cropUrl,
            match: true,
            displayName: hit.displayName,
            scorePct: hit.scorePct,
            faces: 1,
        });
        if (current) {
            queue.push(hit);
            if (queue.length > 8) queue.shift();
            updateHqBar(current);
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
        var btn = document.getElementById('fr-alarm-field');
        if (!btn) return;
        btn.disabled = !!busy;
    }

    function showFieldStatus(ok, err) {
        var meta = document.querySelector('#fr-alarm-panel .fr-alarm-meta');
        if (!meta) return;
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

    function bindSocket() {
        var sock = getSocket();
        if (!sock || sock.__frAlarmBound) return;
        sock.__frAlarmBound = true;
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
            showFieldStatus(!!(p && p.ok), p && p.error);
        });
    }

    function bindUi() {
        if (!bound) {
            bound = true;
            var ack = document.getElementById('fr-alarm-ack');
            var dismiss = document.getElementById('fr-alarm-dismiss');
            var field = document.getElementById('fr-alarm-field');
            var standby = document.getElementById('fr-alarm-standby-ptt');
            var hqStandby = document.getElementById('fr-hq-alert-standby-ptt');
            var hqOpen = document.getElementById('fr-hq-alert-open');
            var hqAck = document.getElementById('fr-hq-alert-ack');
            var hqDismiss = document.getElementById('fr-hq-alert-dismiss');
            if (ack) {
                ack.addEventListener('click', function () {
                    emitAction('fr-alarm-ack');
                    hideModal();
                });
            }
            if (dismiss) {
                dismiss.addEventListener('click', function () {
                    emitAction('fr-alarm-dismiss');
                    hideModal();
                });
            }
            if (field) {
                field.addEventListener('click', function () {
                    if (!current || !current.camId) return;
                    setFieldBtnBusy(true);
                    emitAction('fr-field-alert');
                });
            }
            if (standby) {
                standby.addEventListener('click', pushFrStandbyPttTeamNow);
            }
            if (hqStandby) {
                hqStandby.addEventListener('click', pushFrStandbyPttTeamNow);
            }
            if (hqOpen) {
                hqOpen.addEventListener('click', function () {
                    openModalOnly();
                });
            }
            if (hqAck) {
                hqAck.addEventListener('click', function () {
                    emitAction('fr-alarm-ack');
                    hideModal();
                });
            }
            if (hqDismiss) {
                hqDismiss.addEventListener('click', function () {
                    emitAction('fr-alarm-dismiss');
                    hideModal();
                });
            }
        }
        bindSocket();
    }

    function init() {
        bindUi();
        ensureCropRail();
    }

    global.FrAlarm = {
        init: init,
        bindUi: bindUi,
        onHit: onHit,
        pushStandbyPttTeam: pushFrStandbyPttTeamNow,
    };
})(window);
