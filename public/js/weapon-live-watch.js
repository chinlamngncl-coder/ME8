/**
 * Analytics Weapon — Live Watch shell (WEAPON-LIVE-WATCH-SHELL-V1).
 * FR-style mapGroup roster. Already-live FLV only — no silent INVITE.
 * WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1: hold analytics-weapon viewer ref (no wake).
 */
(function (global) {
    var MAX_WATCH = 32;
    var LIVE_SLOTS = 6;
    var SURFACE = 'analytics-weapon';
    var ROSTER_EXPAND_INLINE_MAX = 6;
    var ROSTER_COLS = 5;
    var ROSTER_ROWS = 6;
    var ROSTER_MEMBERS_PER_COL = ROSTER_ROWS - 1;

    var watching = false;
    var selected = [];
    var slotCam = [null, null, null, null, null, null];
    var players = [null, null, null, null, null, null];
    var fleetById = Object.create(null);
    var socketBound = false;
    var rosterTimer = null;
    var rosterSearch = '';
    var rosterFilter = 'online';
    var rosterSearchFocused = false;
    var rosterGroupExpanded = Object.create(null);
    var recentHits = [];
    var recentTimer = null;

    /** Match i18n.js humanizeKey — missing keys must use fallback (not "Lb Zoom Hint"). */
    function humanizeKeyTail(key) {
        var tail = String(key || '').split('.').pop() || String(key || '');
        return tail
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, function (c) { return c.toUpperCase(); })
            .trim();
    }

    function tr(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.t) {
            var s = I18n.t(key);
            if (s && s !== key && s !== humanizeKeyTail(key)) return s;
        }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getSocket() {
        if (global.__mobilityDashboardSocket && typeof global.__mobilityDashboardSocket.emit === 'function') {
            return global.__mobilityDashboardSocket;
        }
        if (global.socket && typeof global.socket.emit === 'function') return global.socket;
        return null;
    }

    function normalizeCamId(camId) {
        return String(camId || '').trim();
    }

    function deviceName(camId) {
        var d = fleetById[camId];
        if (d && d.name) return String(d.name);
        return String(camId);
    }

    function deviceOnline(camId) {
        var d = fleetById[camId];
        if (d && d.online) return true;
        if (global.GlobalDevicePresence && typeof GlobalDevicePresence.isOnline === 'function') {
            return !!GlobalDevicePresence.isOnline(camId);
        }
        return false;
    }

    function shortCamId(camId) {
        if (global.FleetDisplay && typeof FleetDisplay.shortTechnicalId === 'function') {
            return FleetDisplay.shortTechnicalId(camId);
        }
        var s = String(camId || '');
        if (s.length <= 8) return s;
        return '\u2026' + s.slice(-4);
    }

    function groupColorForDevice(camId, mapGroup) {
        var lk = global.dispatchGroupLookup || {};
        if (camId && lk.byDevice && lk.byDevice[camId] && lk.byDevice[camId].color) {
            return lk.byDevice[camId].color;
        }
        var gk = String(mapGroup || '').toLowerCase();
        if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
            return lk.byName[gk].color;
        }
        return '#64748b';
    }

    function tileEl(slot) {
        return document.querySelector('#ax-panel-weapon .ax-wd-tile[data-wd-slot="' + slot + '"]');
    }

    function setTileMeta(slot, camId, state) {
        var tile = tileEl(slot);
        if (!tile) return;
        var label = tile.querySelector('.ax-wd-tile-label');
        var ph = tile.querySelector('.ax-fr-tile-ph');
        tile.classList.remove('is-live', 'is-tile-warn', 'is-tile-error', 'is-tile-connecting');
        if (label) {
            label.textContent = camId
                ? (String(slot + 1) + '  ' + (deviceName(camId) || camId))
                : String(slot + 1);
            if (camId) label.title = String(camId);
            else label.removeAttribute('title');
        }
        if (!camId) {
            if (ph) ph.textContent = tr('analytics.weapon.tileIdle', 'Select cameras and Start watch');
            return;
        }
        if (state === 'live') {
            tile.classList.add('is-live');
            if (ph) ph.textContent = '';
            return;
        }
        if (state === 'connecting') {
            tile.classList.add('is-tile-connecting');
            if (ph) ph.textContent = tr('analytics.weapon.tileConnecting', 'Connecting\u2026');
            return;
        }
        if (state === 'offline') {
            tile.classList.add('is-tile-error');
            if (ph) ph.textContent = tr('analytics.weapon.tileOffline', 'Camera offline');
            return;
        }
        if (state === 'player-error') {
            tile.classList.add('is-tile-error');
            if (ph) ph.textContent = tr('analytics.weapon.tilePlayerError', 'Player unavailable');
            return;
        }
        tile.classList.add('is-tile-warn');
        if (ph) ph.textContent = tr('analytics.weapon.tileNotLive', 'Not live \u2014 open on Ops first');
    }

    function destroyPlayer(slot) {
        var p = players[slot];
        if (p) {
            try { p.destroy(); } catch (_) { /* ignore */ }
            players[slot] = null;
        }
        var tile = tileEl(slot);
        if (tile) {
            tile.querySelectorAll('video.me8-zlm-primary').forEach(function (el) {
                try { el.remove(); } catch (_) { /* ignore */ }
            });
            tile.classList.remove('is-live');
        }
    }

    function holdViewer(camId) {
        camId = normalizeCamId(camId);
        var sock = getSocket();
        if (!sock || !camId) return;
        try {
            sock.emit('register-viewer-only', {
                camId: camId,
                surface: SURFACE,
                holdOnly: true,
            });
        } catch (_) { /* ignore */ }
    }

    function releaseViewer(camId) {
        camId = normalizeCamId(camId);
        var sock = getSocket();
        if (!sock || !camId) return;
        try {
            sock.emit('stop-video', {
                camId: camId,
                surface: SURFACE,
                reason: 'weapon-stop',
                clientReason: 'weapon-tile-stop',
            });
        } catch (_) { /* ignore */ }
    }

    function stopSlot(slot) {
        var id = slotCam[slot];
        destroyPlayer(slot);
        slotCam[slot] = null;
        setTileMeta(slot, null, null);
        if (id) releaseViewer(id);
        emitWatchSlots();
    }

    function attachFlv(slot, camId, flvUrl) {
        if (!global.Me8LivePlayerFactory
            || typeof global.Me8LivePlayerFactory.attachFlvPrimary !== 'function') {
            setTileMeta(slot, camId, 'player-error');
            return;
        }
        var tile = tileEl(slot);
        if (!tile || !watching) return;
        destroyPlayer(slot);
        setTileMeta(slot, camId, 'connecting');
        var handle = global.Me8LivePlayerFactory.attachFlvPrimary(tile, flvUrl, {
            proveMs: 300,
            timeoutMs: 10000,
            onProven: function () {
                if (slotCam[slot] !== camId) return;
                setTileMeta(slot, camId, 'live');
            },
            onFail: function () {
                if (slotCam[slot] !== camId) return;
                setTileMeta(slot, camId, 'player-error');
            },
        });
        if (!handle) {
            setTileMeta(slot, camId, 'player-error');
            return;
        }
        players[slot] = handle;
    }

    function startSlot(slot, camId) {
        camId = normalizeCamId(camId);
        if (slot < 0 || slot >= LIVE_SLOTS || !camId) return;
        if (slotCam[slot] === camId && players[slot]) return;
        if (slotCam[slot] && slotCam[slot] !== camId) stopSlot(slot);
        slotCam[slot] = camId;
        setTileMeta(slot, camId, 'connecting');
        emitWatchSlots();
        if (!deviceOnline(camId)) {
            setTileMeta(slot, camId, 'offline');
            return;
        }
        fetch('/api/analytics/weapon/already-live?camId=' + encodeURIComponent(camId), {
            credentials: 'same-origin',
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (slotCam[slot] !== camId) return;
                if (data && data.flvUrl) {
                    holdViewer(camId);
                    attachFlv(slot, camId, data.flvUrl);
                    return;
                }
                setTileMeta(slot, camId, 'not-live');
            })
            .catch(function () {
                if (slotCam[slot] !== camId) return;
                setTileMeta(slot, camId, 'not-live');
            });
    }

    function activeSlotCams() {
        var out = [];
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i]) out.push(slotCam[i]);
        }
        return out;
    }

    function findEmptySlot() {
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (!slotCam[i]) return i;
        }
        return -1;
    }

    function fillInitialSlots() {
        var online = selected.filter(deviceOnline);
        var want = online.slice(0, LIVE_SLOTS);
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (want[i]) startSlot(i, want[i]);
            else stopSlot(i);
        }
    }

    function emitWatchSlots() {
        var sock = getSocket();
        if (!sock) return;
        sock.emit('weapon-watch-slots', { camIds: watching ? activeSlotCams() : [] });
    }

    function paintDetectGrid(hits) {
        var grid = document.getElementById('ax-wd-detect-grid');
        if (!grid) return;
        var list = Array.isArray(hits) ? hits : [];
        var magSvg = '<svg class="ax-wd-rail-mag-icon" viewBox="0 0 24 24" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round"/></svg>';
        if (!list.length) {
            grid.innerHTML = '<div class="ax-wd-detect-empty hint">' +
                esc(tr('analytics.weapon.recentEmpty', 'No detections yet')) + '</div>';
            return;
        }
        grid.innerHTML = '';
        list.forEach(function (hit) {
            if (!hit) return;
            var slot = document.createElement('div');
            slot.className = 'ax-wd-detect-slot is-hit';
            slot.setAttribute('role', 'listitem');
            slot.setAttribute('data-hit-id', String(hit.hitId || ''));
            var src = hit.cropFile
                ? ('/api/analytics/weapon/crop/' + encodeURIComponent(hit.cropFile))
                : '';
            var label = String(hit.cls || 'weapon') + ' \u00B7 ' +
                String(hit.deviceName || hit.camId || '');
            slot.innerHTML = (src ? '<img src="' + esc(src) + '" alt="">' : '') +
                '<button type="button" class="ax-wd-rail-mag" title="' +
                esc(tr('analytics.weapon.magnify', 'Magnify')) +
                '" aria-label="' + esc(tr('analytics.weapon.magnify', 'Magnify')) +
                '">' + magSvg + '</button>' +
                '<span class="ax-wd-detect-meta">' + esc(label) + '</span>';
            var open = (function (h) {
                return function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    openWdLightbox(h);
                };
            })(hit);
            slot.addEventListener('click', open);
            var magBtn = slot.querySelector('.ax-wd-rail-mag');
            if (magBtn) magBtn.addEventListener('click', open);
            grid.appendChild(slot);
        });
    }

    function formatHitTime(at) {
        var n = Number(at) || 0;
        if (!n) return '';
        try {
            var d = new Date(n);
            if (isNaN(d.getTime())) return '';
            var p = function (x) { return (x < 10 ? '0' : '') + x; };
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
                ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
        } catch (_) {
            return '';
        }
    }

    function closeWdLightbox() {
        var el = document.getElementById('ax-wd-snap-lightbox');
        var bd = document.getElementById('ax-wd-snap-lightbox-backdrop');
        if (el) {
            el.hidden = true;
            el.classList.remove('is-open');
        }
        if (bd) {
            bd.hidden = true;
            bd.classList.remove('is-open');
        }
    }

    function ensureWdLightbox() {
        var bd = document.getElementById('ax-wd-snap-lightbox-backdrop');
        if (!bd) {
            bd = document.createElement('div');
            bd.id = 'ax-wd-snap-lightbox-backdrop';
            bd.className = 'ax-wd-snap-lightbox-backdrop';
            bd.hidden = true;
            bd.addEventListener('click', function () { closeWdLightbox(); });
            document.body.appendChild(bd);
        }
        var el = document.getElementById('ax-wd-snap-lightbox');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ax-wd-snap-lightbox';
            el.className = 'ax-wd-snap-lightbox';
            el.hidden = true;
            el.innerHTML =
                '<div class="ax-wd-snap-lb-chrome" data-wd-drag-handle="1">' +
                '<h3 class="ax-wd-snap-lb-title"></h3>' +
                '<button type="button" class="ax-wd-snap-lb-close" aria-label="' +
                esc(tr('common.close', 'Close')) + '">\u00D7</button></div>' +
                '<div class="ax-wd-snap-lb-body">' +
                '<div class="ax-wd-snap-lb-scene-wrap">' +
                '<img class="ax-wd-snap-lb-img ax-wd-snap-lb-scene" alt="">' +
                '</div>' +
                '<p class="ax-wd-snap-lb-meta hint"></p>' +
                '<p class="ax-wd-snap-lb-zoom-hint hint">' +
                esc(tr('analytics.weapon.lbZoomHint', 'Hover to magnify')) +
                '</p>' +
                '</div>';
            document.body.appendChild(el);
            var closeBtn = el.querySelector('.ax-wd-snap-lb-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function (ev) {
                    if (ev && ev.stopPropagation) ev.stopPropagation();
                    closeWdLightbox();
                });
            }
            var wrap = el.querySelector('.ax-wd-snap-lb-scene-wrap');
            var scene = el.querySelector('.ax-wd-snap-lb-scene');
            if (wrap && scene) {
                wrap.addEventListener('mousemove', function (ev) {
                    var r = wrap.getBoundingClientRect();
                    if (!r.width || !r.height) return;
                    var x = ((ev.clientX - r.left) / r.width) * 100;
                    var y = ((ev.clientY - r.top) / r.height) * 100;
                    wrap.classList.add('is-zooming');
                    scene.style.transformOrigin = x + '% ' + y + '%';
                    scene.style.transform = 'scale(2.2)';
                });
                wrap.addEventListener('mouseleave', function () {
                    wrap.classList.remove('is-zooming');
                    scene.style.transform = '';
                    scene.style.transformOrigin = '';
                });
            }
            /* ANPR-style header drag — not locked to screen center */
            (function bindWdDrag() {
                var handle = el.querySelector('[data-wd-drag-handle]');
                if (!handle || el._wdDragBound) return;
                el._wdDragBound = true;
                var dragging = false;
                var ox = 0;
                var oy = 0;
                handle.addEventListener('pointerdown', function (ev) {
                    if (ev.button != null && ev.button !== 0) return;
                    if (ev.target && ev.target.closest && ev.target.closest('.ax-wd-snap-lb-close')) return;
                    dragging = true;
                    var rect = el.getBoundingClientRect();
                    ox = ev.clientX - rect.left;
                    oy = ev.clientY - rect.top;
                    el.style.right = 'auto';
                    el.style.bottom = 'auto';
                    el.style.left = rect.left + 'px';
                    el.style.top = rect.top + 'px';
                    el.style.transform = 'none';
                    try { handle.setPointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
                    ev.preventDefault();
                });
                handle.addEventListener('pointermove', function (ev) {
                    if (!dragging) return;
                    var nx = ev.clientX - ox;
                    var ny = ev.clientY - oy;
                    var maxX = Math.max(0, window.innerWidth - el.offsetWidth);
                    var maxY = Math.max(0, window.innerHeight - el.offsetHeight);
                    el.style.left = Math.max(0, Math.min(maxX, nx)) + 'px';
                    el.style.top = Math.max(0, Math.min(maxY, ny)) + 'px';
                });
                function endDrag(ev) {
                    if (!dragging) return;
                    dragging = false;
                    try { handle.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
                }
                handle.addEventListener('pointerup', endDrag);
                handle.addEventListener('pointercancel', endDrag);
            })();
        }
        if (!document.documentElement._axWdLbEsc) {
            document.documentElement._axWdLbEsc = true;
            document.addEventListener('keydown', function (ev) {
                if (ev.key === 'Escape') closeWdLightbox();
            });
        }
        return el;
    }

    function clampWdLightboxPos(el) {
        if (!el || !el.style.left || !el.style.top) return;
        var left = parseFloat(el.style.left);
        var top = parseFloat(el.style.top);
        if (!isFinite(left) || !isFinite(top)) return;
        var maxX = Math.max(0, window.innerWidth - el.offsetWidth);
        var maxY = Math.max(0, window.innerHeight - el.offsetHeight);
        el.style.left = Math.max(0, Math.min(maxX, left)) + 'px';
        el.style.top = Math.max(0, Math.min(maxY, top)) + 'px';
    }

    function openWdLightbox(hit) {
        if (!hit) return;
        var el = ensureWdLightbox();
        var bd = document.getElementById('ax-wd-snap-lightbox-backdrop');
        /* WEAPON-LIGHTBOX-POS-KEEP-V1 — keep drag place until refresh (FR snap float style) */
        if (!el.style.left && !el.style.top) {
            el.style.left = '';
            el.style.top = '';
            el.style.right = '';
            el.style.bottom = '';
            el.style.transform = '';
        } else {
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.transform = 'none';
        }
        var title = el.querySelector('.ax-wd-snap-lb-title');
        var img = el.querySelector('.ax-wd-snap-lb-img');
        var meta = el.querySelector('.ax-wd-snap-lb-meta');
        var cls = String(hit.cls || 'weapon');
        var name = String(hit.deviceName || hit.camId || '');
        var when = formatHitTime(hit.at);
        if (title) {
            title.textContent = tr('analytics.weapon.lbTitle', 'Weapon detection') +
                ' \u2014 ' + cls;
        }
        if (img) {
            img.src = hit.cropFile
                ? ('/api/analytics/weapon/crop/' + encodeURIComponent(hit.cropFile))
                : '';
            img.alt = cls;
        }
        if (meta) {
            meta.textContent = [name, cls, when].filter(Boolean).join(' \u00B7 ');
        }
        if (bd) {
            bd.hidden = false;
            bd.classList.add('is-open');
        }
        el.hidden = false;
        el.classList.add('is-open');
        if (el.style.left && el.style.top) {
            clampWdLightboxPos(el);
        }
    }

    function mergeRecent(list) {
        var byId = Object.create(null);
        recentHits.forEach(function (h) {
            if (h && h.hitId) byId[h.hitId] = h;
        });
        (list || []).forEach(function (h) {
            if (h && h.hitId) byId[h.hitId] = h;
        });
        recentHits = Object.keys(byId).map(function (k) { return byId[k]; })
            .sort(function (a, b) { return (b.at || 0) - (a.at || 0); })
            .slice(0, 20);
        paintDetectGrid(recentHits);
    }

    function pollRecent() {
        fetch('/api/analytics/weapon/recent', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.ok && Array.isArray(data.hits)) mergeRecent(data.hits);
            })
            .catch(function () { /* ignore */ });
    }

    function startWatch() {
        if (!selected.length) return;
        watching = true;
        fillInitialSlots();
        emitWatchSlots();
        pollRecent();
        renderWatchList();
    }

    function stopWatch() {
        watching = false;
        for (var i = 0; i < LIVE_SLOTS; i++) stopSlot(i);
        emitWatchSlots();
        renderWatchList();
    }

    function stopAllWatch() {
        if (!watching && !selected.length) return;
        var ok = global.confirm(tr('analytics.fr.stopAllConfirm',
            'Stop all video and clear the watch set?'));
        if (!ok) return;
        if (watching) stopWatch();
        selected = [];
        renderWatchList();
    }

    function clearWatchSet() {
        if (!selected.length) return;
        if (watching) {
            var ok = global.confirm(tr('analytics.fr.clearWatchConfirm',
                'Stop video and clear all selected cameras?'));
            if (!ok) return;
            stopWatch();
        }
        selected = [];
        renderWatchList();
    }

    function toggleSelect(camId, checked) {
        camId = normalizeCamId(camId);
        var idx = selected.indexOf(camId);
        if (checked) {
            if (idx >= 0) return;
            if (selected.length >= MAX_WATCH) {
                renderWatchList();
                return;
            }
            selected.push(camId);
            if (watching) {
                var empty = findEmptySlot();
                if (empty >= 0 && deviceOnline(camId)) startSlot(empty, camId);
            }
        } else {
            if (idx < 0) return;
            selected.splice(idx, 1);
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId) stopSlot(i);
            }
            if (watching && !selected.length) watching = false;
        }
        renderWatchList();
    }

    function toggleGroupWatch(devices, checked) {
        if (checked) {
            (devices || []).forEach(function (d) {
                if (!d || !d.id || !d.online) return;
                var id = String(d.id);
                if (selected.indexOf(id) >= 0) return;
                if (selected.length >= MAX_WATCH) return;
                toggleSelect(id, true);
            });
        } else {
            (devices || []).forEach(function (d) {
                if (!d || !d.id) return;
                if (selected.indexOf(String(d.id)) >= 0) toggleSelect(String(d.id), false);
            });
        }
    }

    function tileSlotFor(camId) {
        camId = String(camId || '');
        for (var i = 0; i < LIVE_SLOTS; i++) {
            if (slotCam[i] === camId) return i + 1;
        }
        return 0;
    }

    function tileBadgeHtml(camId) {
        var slot = tileSlotFor(camId);
        if (slot > 0) {
            return '<span class="ax-fr-roster-badge is-live">' +
                esc(tr('analytics.fr.tileBadge', 'Live {n}').replace('{n}', String(slot))) + '</span>';
        }
        if (selected.indexOf(String(camId)) >= 0) {
            return '<span class="ax-fr-roster-badge is-rotate">' +
                esc(tr('analytics.fr.rotateBadge', 'Queued')) + '</span>';
        }
        return '<span class="ax-fr-roster-badge is-idle">\u2014</span>';
    }

    function groupOnlineCounts(devices) {
        var total = devices ? devices.length : 0;
        var online = 0;
        (devices || []).forEach(function (d) { if (d && d.online) online += 1; });
        return { online: online, total: total };
    }

    function groupSelectedCount(devices) {
        var n = 0;
        (devices || []).forEach(function (d) {
            if (d && selected.indexOf(String(d.id)) >= 0) n += 1;
        });
        return n;
    }

    function groupWatchState(devices) {
        var on = 0;
        var sel = 0;
        (devices || []).forEach(function (d) {
            if (!d || !d.online) return;
            sel += 1;
            if (selected.indexOf(String(d.id)) >= 0) on += 1;
        });
        if (!sel) return 'disabled';
        if (on === 0) return 'unchecked';
        if (on >= sel) return 'checked';
        return 'indeterminate';
    }

    function groupMatchesSearch(devices) {
        var q = String(rosterSearch || '').trim().toLowerCase();
        if (!q) return false;
        for (var i = 0; i < (devices || []).length; i++) {
            var d = devices[i];
            if (!d) continue;
            var hay = (String(d.name || '') + ' ' + String(d.id || '')).toLowerCase();
            if (hay.indexOf(q) >= 0) return true;
        }
        return false;
    }

    function isGroupExpanded(block) {
        if (!block || !block.header) return true;
        var gName = block.header.groupName;
        if (Object.prototype.hasOwnProperty.call(rosterGroupExpanded, gName)) {
            return !!rosterGroupExpanded[gName];
        }
        var devices = (block.header.devices && block.header.devices.length)
            ? block.header.devices : (block.members || []);
        if (groupMatchesSearch(devices)) return true;
        if (rosterFilter === 'selected' && groupSelectedCount(devices) > 0) return true;
        return devices.length <= ROSTER_EXPAND_INLINE_MAX;
    }

    function buildGroupedFleetRows(rows) {
        var byGroup = {};
        var ungrouped = [];
        rows.forEach(function (m) {
            var g = String(m.mapGroup || '').trim();
            if (!g) {
                ungrouped.push(m);
                return;
            }
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(m);
        });
        var out = [];
        Object.keys(byGroup).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (gName) {
            out.push({ type: 'header', groupName: gName, color: groupColorForDevice(null, gName), devices: byGroup[gName] });
            byGroup[gName].sort(function (a, b) {
                return String(a.name || a.id).localeCompare(String(b.name || b.id));
            }).forEach(function (m) { out.push({ type: 'row', device: m }); });
        });
        if (ungrouped.length) {
            if (Object.keys(byGroup).length) {
                out.push({
                    type: 'header',
                    groupName: tr('fleet.groupUngrouped', 'Ungrouped'),
                    color: '#64748b',
                    ungrouped: true,
                    devices: ungrouped,
                });
            }
            ungrouped.sort(function (a, b) {
                return String(a.name || a.id).localeCompare(String(b.name || b.id));
            }).forEach(function (m) { out.push({ type: 'row', device: m }); });
        }
        return out;
    }

    function rosterDevicesFiltered() {
        var q = String(rosterSearch || '').trim().toLowerCase();
        var list = [];
        Object.keys(fleetById).forEach(function (id) {
            var d = fleetById[id];
            if (!d) return;
            if (rosterFilter === 'online' && !d.online) return;
            if (rosterFilter === 'offline' && d.online) return;
            if (rosterFilter === 'selected' && selected.indexOf(id) < 0) return;
            if (q) {
                var hay = (String(d.name || '') + ' ' + String(d.id || '') + ' ' + String(d.mapGroup || '')).toLowerCase();
                if (hay.indexOf(q) < 0) return;
            }
            list.push(d);
        });
        return list;
    }

    function rosterNameHtml(d, id) {
        var name = d.name || id;
        return '<span class="ax-fr-roster-name" title="' + esc(String(id)) + '">' +
            esc(name) + ' <span class="ax-fr-roster-id-inline">(' + esc(shortCamId(id)) + ')</span></span>';
    }

    function rosterDeviceRowHtml(d, isMember) {
        var id = String(d.id);
        var checked = selected.indexOf(id) >= 0;
        var onTile = tileSlotFor(id) > 0;
        var disableMore = !checked && selected.length >= MAX_WATCH;
        var pinColor = d.groupColor || groupColorForDevice(id, d.mapGroup);
        var rowCls = 'ax-fr-roster-row' +
            (isMember ? ' is-member' : '') +
            (onTile ? ' is-on-tile' : '') +
            (!d.online ? ' is-offline' : '');
        return '<tr class="' + rowCls + '" data-cam="' + esc(id) + '">' +
            '<td class="ax-fr-roster-cell-cb">' +
            '<input type="checkbox" class="ax-fr-roster-watch-cb" data-cam="' + esc(id) + '"' +
            (checked ? ' checked' : '') +
            (disableMore ? ' disabled' : '') +
            (d.online ? '' : ' disabled') + '></td>' +
            '<td class="ax-fr-roster-cell-pin"></td>' +
            '<td class="ax-fr-roster-cell-status">' +
            '<span class="ax-fr-roster-status' + (d.online ? ' is-on' : ' is-off') + '" title="' +
            esc(d.online ? tr('fleet.online', 'Online') : tr('fleet.offline', 'Offline')) + '"></span>' +
            '<span class="ax-fr-roster-dot" style="background:' + esc(pinColor) + '"></span></td>' +
            '<td class="ax-fr-roster-cell-name' + (isMember ? ' is-member' : '') + '">' + rosterNameHtml(d, id) + '</td>' +
            '<td class="ax-fr-roster-cell-tile">' + tileBadgeHtml(id) + '</td>' +
            '</tr>';
    }

    function buildRosterGroupBlocks(grouped) {
        var blocks = [];
        var cur = null;
        grouped.forEach(function (entry) {
            if (entry.type === 'header') {
                cur = { header: entry, members: [] };
                blocks.push(cur);
            } else if (entry.type === 'row') {
                if (!cur) {
                    cur = {
                        header: {
                            groupName: tr('fleet.groupUngrouped', 'Ungrouped'),
                            color: '#64748b',
                            devices: [],
                            ungrouped: true,
                        },
                        members: [],
                    };
                    blocks.push(cur);
                }
                cur.members.push(entry.device);
                if (cur.header.devices) cur.header.devices.push(entry.device);
            }
        });
        blocks.forEach(function (block) {
            if (block.header && (!block.header.devices || !block.header.devices.length)) {
                block.header.devices = block.members.slice();
            }
        });
        return blocks;
    }

    function rosterGroupCardHeadHtml(entry, expanded, members) {
        var devices = (entry.devices && entry.devices.length) ? entry.devices : (members || []);
        var cnt = groupOnlineCounts(devices);
        var inWatch = groupSelectedCount(devices);
        var gState = groupWatchState(devices);
        var gName = entry.groupName;
        var chev = expanded ? '\u25BC' : '\u25B6';
        var meta = tr('analytics.fr.groupOnline', '{online}/{total} online')
            .replace('{online}', String(cnt.online))
            .replace('{total}', String(cnt.total));
        if (inWatch > 0) {
            meta += ' \u00B7 ' + tr('analytics.fr.groupInWatch', '{n} in watch').replace('{n}', String(inWatch));
        }
        return '<div class="ax-fr-roster-card-head" data-group="' + esc(gName) + '">' +
            '<div class="ax-fr-roster-group-label">' +
            '<button type="button" class="ax-fr-roster-group-expand" data-group="' + esc(gName) + '"' +
            ' aria-expanded="' + (expanded ? 'true' : 'false') + '">' +
            esc(chev) + '</button>' +
            '<label class="ax-fr-roster-group-check">' +
            '<input type="checkbox" class="ax-fr-roster-group-cb" data-group="' + esc(gName) + '"' +
            (gState === 'checked' ? ' checked' : '') +
            (gState === 'disabled' ? ' disabled' : '') + '>' +
            '<span class="ax-fr-roster-group-dot" style="background:' + esc(entry.color) + '"></span>' +
            '<span class="ax-fr-roster-group-name">' + esc(gName) + '</span>' +
            '<span class="ax-fr-roster-group-meta">' + esc(meta) + '</span>' +
            '</label></div></div>';
    }

    function buildGroupColumnSlices(blocks) {
        var slices = [];
        (blocks || []).forEach(function (block) {
            if (!block || !block.header) return;
            var expanded = isGroupExpanded(block);
            var members = (block.members || []).slice();
            if (!expanded) {
                slices.push({ header: block.header, members: [], collapsed: true });
                return;
            }
            if (!members.length) {
                slices.push({ header: block.header, members: [] });
                return;
            }
            var i;
            for (i = 0; i < members.length; i += ROSTER_MEMBERS_PER_COL) {
                slices.push({
                    header: block.header,
                    members: members.slice(i, i + ROSTER_MEMBERS_PER_COL),
                });
            }
        });
        return slices;
    }

    function buildGroupCardHtml(block) {
        var expanded = !block.collapsed;
        var gName = block.header.groupName;
        var html = '<div class="ax-fr-roster-group-card" data-group="' + esc(gName) + '">';
        html += rosterGroupCardHeadHtml(block.header, expanded, block.header.devices || block.members);
        if (expanded && block.members.length) {
            html += '<table class="ax-fr-roster-table ax-fr-roster-card-table"><tbody>';
            block.members.forEach(function (d) {
                html += rosterDeviceRowHtml(d, true);
            });
            html += '</tbody></table>';
        }
        html += '</div>';
        return html;
    }

    function buildGroupGridHtml(blocks) {
        var slices = buildGroupColumnSlices(blocks);
        var html = '';
        var i;
        for (i = 0; i < slices.length; i += ROSTER_COLS) {
            html += '<div class="ax-fr-roster-level">';
            html += '<div class="ax-fr-roster-grid">';
            var j;
            for (j = 0; j < ROSTER_COLS; j++) {
                var slice = slices[i + j];
                if (slice) html += buildGroupCardHtml(slice);
                else html += '<div class="ax-fr-roster-group-card is-empty-col"></div>';
            }
            html += '</div></div>';
        }
        return html;
    }

    function watchMetaText(groupCount) {
        return tr('analytics.fr.rosterMeta', '{n}/{max} selected \u00B7 {live}/{slots} live')
            .replace('{n}', String(selected.length))
            .replace('{max}', String(MAX_WATCH))
            .replace('{live}', String(activeSlotCams().length))
            .replace('{slots}', String(LIVE_SLOTS)) +
            (groupCount ? (' \u00B7 ' + String(groupCount) + ' ' + tr('analytics.fr.rosterGroups', 'groups')) : '');
    }

    function watchBarHtml(groupCount) {
        return '<div class="ax-fr-watch-bar">' +
            '<div class="ax-fr-roster-actions">' +
            '<button type="button" class="ax-hub-nav-btn ax-hub-nav-sub-btn active" id="ax-wd-watch-start"' +
            (watching || selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.watchStart', 'Start watch')) + '</button>' +
            '<button type="button" class="ax-hub-nav-btn ax-hub-nav-sub-btn" id="ax-wd-watch-stop"' +
            (watching ? '' : ' disabled') + '>' +
            esc(tr('analytics.fr.stopVideo', 'Stop video')) + '</button>' +
            '<button type="button" class="ax-hub-nav-btn ax-hub-nav-sub-btn" id="ax-wd-watch-stop-all"' +
            (!watching && selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.stopAll', 'Stop all')) + '</button>' +
            '<button type="button" class="ax-hub-nav-btn ax-hub-nav-sub-btn" id="ax-wd-roster-clear"' +
            (selected.length === 0 ? ' disabled' : '') + '>' +
            esc(tr('analytics.fr.clearWatch', 'Clear')) + '</button>' +
            '</div>' +
            '<span id="ax-wd-watch-meta" class="hint ax-fr-roster-summary">' +
            esc(watchMetaText(groupCount)) +
            '</span>' +
            '<div class="ax-fr-roster-tools">' +
            '<input type="search" id="ax-wd-roster-search" class="ax-fr-roster-search" autocomplete="off" ' +
            'placeholder="' + esc(tr('analytics.weapon.rosterSearch', 'Search cameras\u2026')) + '" value="' + esc(rosterSearch) + '">' +
            '<select id="ax-wd-roster-filter" class="ax-fr-roster-filter">' +
            '<option value="all"' + (rosterFilter === 'all' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterAll', 'All')) + '</option>' +
            '<option value="online"' + (rosterFilter === 'online' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterOnline', 'Online')) + '</option>' +
            '<option value="selected"' + (rosterFilter === 'selected' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterSelected', 'In watch')) + '</option>' +
            '<option value="offline"' + (rosterFilter === 'offline' ? ' selected' : '') + '>' +
            esc(tr('analytics.fr.rosterFilterOffline', 'Offline')) + '</option>' +
            '</select>' +
            '</div></div>';
    }

    function syncWatchBar(groupCount) {
        var startBtn = document.getElementById('ax-wd-watch-start');
        var stopBtn = document.getElementById('ax-wd-watch-stop');
        var stopAllBtn = document.getElementById('ax-wd-watch-stop-all');
        var clearBtn = document.getElementById('ax-wd-roster-clear');
        if (startBtn) startBtn.disabled = !!(watching || selected.length === 0);
        if (stopBtn) stopBtn.disabled = !watching;
        if (stopAllBtn) stopAllBtn.disabled = !!(!watching && selected.length === 0);
        if (clearBtn) clearBtn.disabled = selected.length === 0;
        var meta = document.getElementById('ax-wd-watch-meta');
        if (meta) meta.textContent = watchMetaText(groupCount);
        var searchEl = document.getElementById('ax-wd-roster-search');
        if (searchEl && document.activeElement !== searchEl) searchEl.value = rosterSearch;
        var filterEl = document.getElementById('ax-wd-roster-filter');
        if (filterEl && filterEl.value !== rosterFilter) filterEl.value = rosterFilter;
    }

    function renderWatchList() {
        var el = document.getElementById('ax-wd-watch-list');
        if (!el) return;
        var searchEl = document.getElementById('ax-wd-roster-search');
        if (searchEl && document.activeElement === searchEl) rosterSearchFocused = true;
        else if (searchEl) rosterSearch = searchEl.value || rosterSearch;

        var filtered = rosterDevicesFiltered();
        var grouped = buildGroupedFleetRows(filtered);
        var groupCount = 0;
        grouped.forEach(function (e) { if (e.type === 'header') groupCount += 1; });

        if (!el.querySelector('.ax-fr-watch-bar')) {
            el.innerHTML = watchBarHtml(groupCount);
        } else {
            syncWatchBar(groupCount);
        }

        var node = el.firstChild;
        while (node) {
            var next = node.nextSibling;
            if (!(node.classList && node.classList.contains('ax-fr-watch-bar'))) {
                el.removeChild(node);
            }
            node = next;
        }

        if (!Object.keys(fleetById).length) {
            el.insertAdjacentHTML('beforeend', '<p class="hint ax-fr-roster-empty">' +
                esc(tr('analytics.weapon.rosterNoFleet', 'No cameras registered.')) + '</p>');
            bindWatchRoster();
            return;
        }

        if (!filtered.length) {
            el.insertAdjacentHTML('beforeend', '<p class="hint ax-fr-roster-empty">' +
                esc(tr('analytics.weapon.rosterNoMatch', 'No cameras match this filter.')) + '</p>');
            bindWatchRoster();
            return;
        }

        el.insertAdjacentHTML('beforeend',
            '<div class="ax-fr-roster-wrap ax-fr-roster-scroll">' +
            buildGroupGridHtml(buildRosterGroupBlocks(grouped)) + '</div>');
        bindWatchRoster();
    }

    function bindWatchRoster() {
        var startBtn = document.getElementById('ax-wd-watch-start');
        var stopBtn = document.getElementById('ax-wd-watch-stop');
        var stopAllBtn = document.getElementById('ax-wd-watch-stop-all');
        var clearBtn = document.getElementById('ax-wd-roster-clear');
        if (startBtn) startBtn.onclick = function () { startWatch(); };
        if (stopBtn) stopBtn.onclick = function () { stopWatch(); };
        if (stopAllBtn) stopAllBtn.onclick = function () { stopAllWatch(); };
        if (clearBtn) clearBtn.onclick = function () { clearWatchSet(); };

        var searchEl = document.getElementById('ax-wd-roster-search');
        if (searchEl) {
            searchEl.oninput = function () {
                rosterSearch = searchEl.value || '';
                renderWatchList();
            };
            if (rosterSearchFocused) {
                searchEl.focus();
                try {
                    var len = searchEl.value.length;
                    searchEl.setSelectionRange(len, len);
                } catch (_) { /* ignore */ }
                rosterSearchFocused = false;
            }
        }
        var filterEl = document.getElementById('ax-wd-roster-filter');
        if (filterEl) {
            filterEl.onchange = function () {
                rosterFilter = filterEl.value || 'online';
                renderWatchList();
            };
        }

        var el = document.getElementById('ax-wd-watch-list');
        if (!el) return;
        el.querySelectorAll('.ax-fr-roster-watch-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                toggleSelect(cb.getAttribute('data-cam'), cb.checked);
            });
        });
        el.querySelectorAll('.ax-fr-roster-group-expand').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var gName = btn.getAttribute('data-group');
                if (!gName) return;
                var blocks = buildRosterGroupBlocks(buildGroupedFleetRows(rosterDevicesFiltered()));
                var expanded = false;
                blocks.forEach(function (block) {
                    if (block.header && block.header.groupName === gName) {
                        expanded = isGroupExpanded(block);
                    }
                });
                rosterGroupExpanded[gName] = !expanded;
                renderWatchList();
            });
        });
        el.querySelectorAll('.ax-fr-roster-group-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var gName = cb.getAttribute('data-group');
                var devices = [];
                Object.keys(fleetById).forEach(function (id) {
                    var d = fleetById[id];
                    if (!d) return;
                    var g = String(d.mapGroup || '').trim();
                    var label = g || tr('fleet.groupUngrouped', 'Ungrouped');
                    if (label === gName) devices.push(d);
                });
                toggleGroupWatch(devices, cb.checked);
            });
            if (cb.indeterminate !== undefined) {
                var gName2 = cb.getAttribute('data-group');
                var devs = [];
                Object.keys(fleetById).forEach(function (id) {
                    var d = fleetById[id];
                    if (!d) return;
                    var g = String(d.mapGroup || '').trim();
                    var label = g || tr('fleet.groupUngrouped', 'Ungrouped');
                    if (label === gName2) devs.push(d);
                });
                cb.indeterminate = groupWatchState(devs) === 'indeterminate';
            }
        });
    }

    function ingestFleet(list) {
        fleetById = Object.create(null);
        (list || []).forEach(function (d) {
            if (!d || !d.id) return;
            var id = String(d.id);
            var mapGroup = String(d.mapGroup || '').trim();
            var online = !!d.online;
            if (!online && global.GlobalDevicePresence && typeof GlobalDevicePresence.isOnline === 'function') {
                online = !!GlobalDevicePresence.isOnline(id);
            }
            fleetById[id] = {
                id: id,
                name: d.name || d.id,
                online: online,
                mapGroup: mapGroup,
                groupColor: groupColorForDevice(id, mapGroup),
            };
        });
        if (watching) {
            for (var i = 0; i < LIVE_SLOTS; i++) {
                var id = slotCam[i];
                if (id && !deviceOnline(id)) setTileMeta(i, id, 'offline');
            }
        }
        renderWatchList();
    }

    function loadFleet() {
        fetch('/api/fleet', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                ingestFleet((data && data.fleet) || []);
            })
            .catch(function () {
                renderWatchList();
            });
    }

    function bindSocket() {
        if (socketBound) return;
        var sock = getSocket();
        if (!sock) return;
        socketBound = true;
        sock.on('fleet-roster', function (payload) {
            var list = Array.isArray(payload) ? payload
                : (payload && Array.isArray(payload.fleet) ? payload.fleet : null);
            if (list) ingestFleet(list);
        });
        sock.on('weapon-detect', function (hit) {
            if (hit && hit.hitId) mergeRecent([hit]);
        });
    }

    function onShow() {
        bindSocket();
        loadFleet();
        if (!socketBound) {
            var n = 0;
            var iv = setInterval(function () {
                bindSocket();
                if (socketBound || ++n > 40) clearInterval(iv);
            }, 100);
        }
        if (!rosterTimer) {
            rosterTimer = setInterval(function () {
                var panel = document.getElementById('ax-panel-weapon');
                if (panel && !panel.hidden) loadFleet();
            }, 30000);
        }
        if (!watching) {
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (!slotCam[i]) setTileMeta(i, null, null);
            }
        }
        if (!recentTimer) {
            recentTimer = setInterval(function () {
                var panel = document.getElementById('ax-panel-weapon');
                if (panel && !panel.hidden) pollRecent();
            }, 2500);
        }
        pollRecent();
        emitWatchSlots();
        renderWatchList();
    }

    function focusCamFromAlarm(camId) {
        camId = normalizeCamId(camId);
        if (!camId) return;
        onShow();
        if (selected.indexOf(camId) < 0) {
            if (selected.length >= MAX_WATCH) {
                var drop = selected[0];
                toggleSelect(drop, false);
            }
            toggleSelect(camId, true);
        }
        if (!watching) startWatch();
        else if (deviceOnline(camId)) {
            var existing = -1;
            for (var i = 0; i < LIVE_SLOTS; i++) {
                if (slotCam[i] === camId) { existing = i; break; }
            }
            if (existing < 0) {
                var empty = findEmptySlot();
                if (empty >= 0) startSlot(empty, camId);
                else startSlot(0, camId);
            }
        }
        emitWatchSlots();
        renderWatchList();
    }

    global.addEventListener('beforeunload', function () {
        if (watching) stopWatch();
    });

    global.WeaponLiveWatch = {
        onShow: onShow,
        stop: stopWatch,
        isWatching: function () { return watching; },
        focusCamFromAlarm: focusCamFromAlarm,
        openLightbox: openWdLightbox,
    };
})(window);
