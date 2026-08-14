/**
 * MOB-APPLY TACTICAL-BLUEPRINT-UI-V1
 * + MOB-APPLY TACTICAL-BLUEPRINT-PLACE-RESIZE-V1
 * + MOB-APPLY TACTICAL-BLUEPRINT-CLEAR-REMOVE-V1
 * + MOB-APPLY TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1
 * Super Admin floor-plan upload / show / drag / aspect-locked resize / save / remove.
 */
(function (global) {
    'use strict';

    const STORE_KEY = 'fm_tactical_active_blueprint_v1';
    const HALF_WIDTH_M = 120;
    const MIN_HALF_W_M = 15;
    const MAX_HALF_W_M = 2500;
    const ADJUST_OPACITY = 0.55;
    const NORMAL_OPACITY = 0.92;

    let blueprints = [];
    let overlay = null;
    let activeId = '';
    let activeBpMeta = null;
    let uiBound = false;
    let selectedFile = null;
    let adjustMode = false;
    let editRect = null;
    let cornerMarkers = [];
    let moveState = null;
    let resizeState = null;
    let draftBounds = null;

    function el(id) {
        return document.getElementById(id);
    }

    function tr(key, fallback, vars) {
        let out = fallback || key;
        if (global.I18n && I18n.t) {
            const v = I18n.t(key, vars);
            if (v && v !== key) out = v;
        }
        if (vars && typeof out === 'string') {
            Object.keys(vars).forEach(function (k) {
                out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
            });
        }
        return out;
    }

    function setStatus(msg, kind) {
        const status = el('ax-tactical-bp-status');
        if (!status) return;
        status.textContent = msg || '';
        status.classList.toggle('is-ok', kind === 'ok');
        status.classList.toggle('is-err', kind === 'err');
    }

    /** Never paint err.message / JSON / HTML on the Floor plan strip. */
    function looksRawTech(s) {
        if (!s || typeof s !== 'string') return true;
        const t = s.trim();
        if (!t || t.length > 220) return true;
        return /Unexpected token|<!DOCTYPE|is not valid JSON|SyntaxError|ECONN|ENOENT|stack|at\s+\S+\s*\(/i.test(t);
    }

    function plainApiError(data) {
        if (!data) return '';
        if (data.errorKey) {
            const keyed = tr(data.errorKey, '');
            if (keyed && keyed !== data.errorKey) return keyed;
        }
        if (typeof data.error === 'string' && !looksRawTech(data.error)) return data.error.trim();
        return '';
    }

    function failMsg(fallbackKey, fallbackText, pack, err) {
        const status = pack && pack.status;
        if (status === 401) {
            return tr('tactical.bpSessionExpired', 'Session expired — sign in again');
        }
        if (status === 403) {
            return tr('tactical.bpForbidden', 'Super Admin required for floor plans');
        }
        if (status === 404 || status === 405 || status === 501 || status === 502) {
            return tr(
                'tactical.bpNeedRestart',
                'This action is not on the running server yet. Restart Axiom, hard-refresh (Ctrl+F5), then try again.',
            );
        }
        if (status === 503) {
            return tr('tactical.bpCatalogBusy', 'Catalog not ready — wait a moment and try again');
        }
        const fromApi = plainApiError(pack && pack.data);
        if (fromApi) return fromApi;
        if (err || (pack && pack.parseFail)) {
            try {
                console.warn('[tactical-blueprint]', fallbackKey, status || '', err || 'non-json');
            } catch (_) { /* ignore */ }
            if (fallbackKey === 'tactical.bpRemoveFail' || fallbackKey === 'tactical.bpSaveFail') {
                return tr(
                    'tactical.bpNeedRestart',
                    'This action is not on the running server yet. Restart Axiom, hard-refresh (Ctrl+F5), then try again.',
                );
            }
        }
        return tr(fallbackKey, fallbackText);
    }

    function fetchBpJson(url, options) {
        return fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}))
            .then(function (res) {
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                if (ct.indexOf('json') !== -1) {
                    return res.json().then(function (data) {
                        return { ok: res.ok, status: res.status, data: data, parseFail: false };
                    }).catch(function (err) {
                        return { ok: false, status: res.status, data: null, parseFail: true, err: err };
                    });
                }
                return res.text().then(function (text) {
                    if (!text || !String(text).trim()) {
                        return { ok: res.ok, status: res.status, data: {}, parseFail: false };
                    }
                    try {
                        const data = JSON.parse(text);
                        return { ok: res.ok, status: res.status, data: data, parseFail: false };
                    } catch (parseErr) {
                        try {
                            console.warn('[tactical-blueprint] expected JSON:', url, String(text).slice(0, 160));
                        } catch (_) { /* ignore */ }
                        return { ok: false, status: res.status, data: null, parseFail: true, err: parseErr };
                    }
                });
            });
    }

    function isSuperAdmin(session) {
        const role = session && (session.role || (session.user && session.user.role));
        return role === 'super_admin';
    }

    function getMap() {
        if (global.TacticalShell && typeof TacticalShell.ensureMap === 'function') {
            return TacticalShell.ensureMap();
        }
        if (global.TacticalShell && typeof TacticalShell.getMap === 'function') {
            return TacticalShell.getMap();
        }
        return null;
    }

    function readStore() {
        try {
            const raw = sessionStorage.getItem(STORE_KEY);
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || !o.id || !o.imageUrl) return null;
            return o;
        } catch (_) {
            return null;
        }
    }

    function writeStore(payload) {
        try {
            if (!payload) sessionStorage.removeItem(STORE_KEY);
            else sessionStorage.setItem(STORE_KEY, JSON.stringify(payload));
        } catch (_) { /* ignore */ }
    }

    function formatBytes(n) {
        const b = Number(n) || 0;
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function aspectOf(bp) {
        const w = bp && Number(bp.originalWidth);
        const h = bp && Number(bp.originalHeight);
        if (w > 0 && h > 0) return w / h;
        return 1.5;
    }

    function metersPerDeg(lat) {
        const latPerM = 1 / 111320;
        const lngPerM = 1 / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
        return { latPerM: latPerM, lngPerM: lngPerM };
    }

    function boundsAroundCenter(map, widthPx, heightPx) {
        const center = map.getCenter();
        const aspect = (widthPx > 0 && heightPx > 0) ? (widthPx / heightPx) : 1.5;
        return boundsFromCenterHalf(center, HALF_WIDTH_M, aspect);
    }

    function boundsFromCenterHalf(center, halfWm, aspect) {
        const halfW = Math.max(MIN_HALF_W_M, Math.min(MAX_HALF_W_M, halfWm));
        const halfH = halfW / Math.max(0.05, aspect);
        const m = metersPerDeg(center.lat);
        return global.L.latLngBounds(
            [center.lat - halfH * m.latPerM, center.lng - halfW * m.lngPerM],
            [center.lat + halfH * m.latPerM, center.lng + halfW * m.lngPerM],
        );
    }

    function boundsToPlain(bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        return { south: sw.lat, west: sw.lng, north: ne.lat, east: ne.lng };
    }

    function plainToBounds(p) {
        if (!p || p.south == null) return null;
        return global.L.latLngBounds([p.south, p.west], [p.north, p.east]);
    }

    function halfWidthMeters(bounds) {
        const c = bounds.getCenter();
        const m = metersPerDeg(c.lat);
        return ((bounds.getEast() - bounds.getWest()) / 2) / m.lngPerM;
    }

    function resolveBounds(bp, opts) {
        opts = opts || {};
        if (opts.bounds && opts.bounds.south != null) return plainToBounds(opts.bounds);
        if (bp && bp.placement) return plainToBounds(bp.placement);
        const map = getMap();
        if (!map) return null;
        return boundsAroundCenter(map, bp.originalWidth, bp.originalHeight);
    }

    function persistLocal(bp, bounds) {
        const plain = boundsToPlain(bounds);
        activeId = String(bp.id || activeId || '');
        writeStore({
            id: activeId,
            name: bp.name || '',
            imageUrl: bp.imageUrl,
            originalWidth: bp.originalWidth,
            originalHeight: bp.originalHeight,
            bounds: plain,
        });
        if (activeId) {
            for (let i = 0; i < blueprints.length; i++) {
                if (String(blueprints[i].id) === activeId) {
                    blueprints[i].placement = plain;
                    break;
                }
            }
        }
    }

    function destroyEditChrome() {
        const map = getMap();
        cornerMarkers.forEach(function (mk) {
            if (map && mk) {
                try { map.removeLayer(mk); } catch (_) { /* ignore */ }
            }
        });
        cornerMarkers = [];
        if (editRect && map) {
            try { map.removeLayer(editRect); } catch (_) { /* ignore */ }
        }
        editRect = null;
        moveState = null;
        resizeState = null;
        draftBounds = null;
    }

    function applyOverlayBounds(bounds, opacity) {
        if (!overlay || !bounds) return;
        try { overlay.setBounds(bounds); } catch (_) { /* ignore */ }
        try { overlay.setOpacity(opacity != null ? opacity : (adjustMode ? ADJUST_OPACITY : NORMAL_OPACITY)); } catch (_) { /* ignore */ }
    }

    function cornerIcon() {
        return global.L.divIcon({
            className: 'ax-tactical-bp-corner-wrap',
            html: '<span class="ax-tactical-bp-corner"></span>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
        });
    }

    function syncEditChrome(bounds) {
        const map = getMap();
        if (!map || !global.L || !adjustMode) return;
        draftBounds = bounds;
        applyOverlayBounds(bounds, readOpacity());

        if (!editRect) {
            editRect = global.L.rectangle(bounds, {
                color: '#38bdf8',
                weight: 2,
                dashArray: '6,4',
                fillColor: '#0ea5e9',
                fillOpacity: 0.08,
                interactive: true,
                className: 'ax-tactical-bp-edit-rect',
            });
            editRect.addTo(map);
            editRect.on('mousedown', onRectMouseDown);
        } else {
            editRect.setBounds(bounds);
        }

        const corners = [
            { name: 'nw', ll: bounds.getNorthWest() },
            { name: 'ne', ll: bounds.getNorthEast() },
            { name: 'se', ll: bounds.getSouthEast() },
            { name: 'sw', ll: bounds.getSouthWest() },
        ];
        if (cornerMarkers.length !== 4) {
            cornerMarkers.forEach(function (mk) {
                try { map.removeLayer(mk); } catch (_) { /* ignore */ }
            });
            cornerMarkers = corners.map(function (c) {
                const mk = global.L.marker(c.ll, {
                    draggable: true,
                    icon: cornerIcon(),
                    zIndexOffset: 1200,
                    keyboard: false,
                });
                mk._bpCorner = c.name;
                mk.on('drag', onCornerDrag);
                mk.on('dragend', onCornerDragEnd);
                mk.addTo(map);
                return mk;
            });
        } else {
            corners.forEach(function (c, i) {
                try { cornerMarkers[i].setLatLng(c.ll); } catch (_) { /* ignore */ }
                cornerMarkers[i]._bpCorner = c.name;
            });
        }
    }

    function readOpacity() {
        const slider = el('ax-tactical-bp-opacity');
        if (!slider) return adjustMode ? ADJUST_OPACITY : NORMAL_OPACITY;
        const v = Number(slider.value);
        if (!Number.isFinite(v)) return ADJUST_OPACITY;
        return Math.max(0.2, Math.min(1, v / 100));
    }

    function onOpacityInput() {
        if (!overlay) return;
        try { overlay.setOpacity(readOpacity()); } catch (_) { /* ignore */ }
        const val = el('ax-tactical-bp-opacity-val');
        const slider = el('ax-tactical-bp-opacity');
        if (val && slider) val.textContent = String(slider.value) + '%';
    }

    function onRectMouseDown(ev) {
        if (!adjustMode || !draftBounds) return;
        const oe = ev.originalEvent;
        if (oe && oe.target && String(oe.target.className || '').indexOf('ax-tactical-bp-corner') >= 0) return;
        const map = getMap();
        if (!map) return;
        if (oe) {
            try { oe.preventDefault(); oe.stopPropagation(); } catch (_) { /* ignore */ }
        }
        moveState = {
            start: ev.latlng,
            bounds: draftBounds,
        };
        map.dragging.disable();
        map.on('mousemove', onMapMouseMove);
        map.on('mouseup', onMapMouseUp);
    }

    function onMapMouseMove(ev) {
        if (moveState) {
            const dLat = ev.latlng.lat - moveState.start.lat;
            const dLng = ev.latlng.lng - moveState.start.lng;
            const b = moveState.bounds;
            const next = global.L.latLngBounds(
                [b.getSouth() + dLat, b.getWest() + dLng],
                [b.getNorth() + dLat, b.getEast() + dLng],
            );
            syncEditChrome(next);
            return;
        }
        if (resizeState) {
            applyCornerResize(ev.latlng);
        }
    }

    function onMapMouseUp() {
        const map = getMap();
        if (map) {
            map.off('mousemove', onMapMouseMove);
            map.off('mouseup', onMapMouseUp);
            try { map.dragging.enable(); } catch (_) { /* ignore */ }
        }
        moveState = null;
        resizeState = null;
    }

    function oppositeCorner(name) {
        if (name === 'nw') return 'se';
        if (name === 'ne') return 'sw';
        if (name === 'se') return 'nw';
        return 'ne';
    }

    function cornerLatLng(bounds, name) {
        if (name === 'nw') return bounds.getNorthWest();
        if (name === 'ne') return bounds.getNorthEast();
        if (name === 'se') return bounds.getSouthEast();
        return bounds.getSouthWest();
    }

    function onCornerDrag(ev) {
        if (!adjustMode || !draftBounds || !activeBpMeta) return;
        const name = ev.target && ev.target._bpCorner;
        if (!name) return;
        applyCornerResize(ev.target.getLatLng(), name);
    }

    function onCornerDragEnd() {
        resizeState = null;
    }

    function applyCornerResize(freeLl, cornerName) {
        const aspect = aspectOf(activeBpMeta);
        const name = cornerName || (resizeState && resizeState.corner);
        if (!name || !draftBounds) return;
        const fixedName = oppositeCorner(name);
        const fixed = cornerLatLng(draftBounds, fixedName);
        const m = metersPerDeg((fixed.lat + freeLl.lat) / 2);
        let widthM = Math.abs(freeLl.lng - fixed.lng) / m.lngPerM;
        if (widthM < MIN_HALF_W_M * 2) widthM = MIN_HALF_W_M * 2;
        if (widthM > MAX_HALF_W_M * 2) widthM = MAX_HALF_W_M * 2;
        const heightM = widthM / aspect;
        const signLat = freeLl.lat >= fixed.lat ? 1 : -1;
        const signLng = freeLl.lng >= fixed.lng ? 1 : -1;
        const newFree = global.L.latLng(
            fixed.lat + signLat * heightM * m.latPerM,
            fixed.lng + signLng * widthM * m.lngPerM,
        );
        const south = Math.min(fixed.lat, newFree.lat);
        const north = Math.max(fixed.lat, newFree.lat);
        const west = Math.min(fixed.lng, newFree.lng);
        const east = Math.max(fixed.lng, newFree.lng);
        const next = global.L.latLngBounds([south, west], [north, east]);
        const halfW = halfWidthMeters(next);
        if (halfW < MIN_HALF_W_M || halfW > MAX_HALF_W_M) return;
        syncEditChrome(next);
    }

    function stopAdjustMode(opts) {
        opts = opts || {};
        adjustMode = false;
        const map = getMap();
        if (map) {
            map.off('mousemove', onMapMouseMove);
            map.off('mouseup', onMapMouseUp);
            try { map.dragging.enable(); } catch (_) { /* ignore */ }
            const c = map.getContainer && map.getContainer();
            if (c) c.classList.remove('ax-tactical-bp-adjusting');
        }
        destroyEditChrome();
        if (overlay) {
            try { overlay.setOpacity(NORMAL_OPACITY); } catch (_) { /* ignore */ }
        }
        const adj = el('ax-tactical-bp-adjust');
        if (adj) adj.classList.remove('active');
        const tools = el('ax-tactical-bp-adjust-tools');
        if (tools) tools.hidden = true;
        syncButtons();
        if (!opts.silent) {
            setStatus(tr('tactical.bpAdjustOff', 'Adjust off'), null);
        }
    }

    function startAdjustMode() {
        if (!overlay || !activeBpMeta) {
            setStatus(tr('tactical.bpNeedOnMap', 'Show a plan on the map first'), 'err');
            return;
        }
        const map = getMap();
        if (!map) return;
        adjustMode = true;
        const bounds = overlay.getBounds ? overlay.getBounds() : draftBounds;
        const c = map.getContainer && map.getContainer();
        if (c) c.classList.add('ax-tactical-bp-adjusting');
        const adj = el('ax-tactical-bp-adjust');
        if (adj) adj.classList.add('active');
        const tools = el('ax-tactical-bp-adjust-tools');
        if (tools) tools.hidden = false;
        const slider = el('ax-tactical-bp-opacity');
        if (slider) slider.value = String(Math.round(ADJUST_OPACITY * 100));
        onOpacityInput();
        syncEditChrome(bounds);
        setStatus(tr('tactical.bpAdjustHint', 'Drag plan · pull corners to size · Save placement'), null);
        syncButtons();
    }

    function toggleAdjust() {
        if (adjustMode) stopAdjustMode();
        else startAdjustMode();
    }

    function clearOverlay() {
        stopAdjustMode({ silent: true });
        const map = getMap();
        if (overlay && map) {
            try { map.removeLayer(overlay); } catch (_) { /* ignore */ }
        }
        overlay = null;
        activeId = '';
        activeBpMeta = null;
        writeStore(null);
        syncButtons();
    }

    function showBlueprint(bp, opts) {
        opts = opts || {};
        if (!bp || !bp.imageUrl || !global.L) return false;
        const map = getMap();
        if (!map) return false;

        stopAdjustMode({ silent: true });
        if (overlay) {
            try { map.removeLayer(overlay); } catch (_) { /* ignore */ }
            overlay = null;
        }

        const bounds = resolveBounds(bp, opts);
        if (!bounds) return false;

        overlay = global.L.imageOverlay(bp.imageUrl, bounds, {
            opacity: NORMAL_OPACITY,
            interactive: false,
            className: 'ax-tactical-bp-overlay',
        });
        overlay.addTo(map);
        if (!opts.skipFit) {
            try { map.fitBounds(bounds.pad(0.08), { animate: false, maxZoom: 19 }); } catch (_) { /* ignore */ }
        }

        activeBpMeta = {
            id: bp.id,
            name: bp.name,
            imageUrl: bp.imageUrl,
            originalWidth: bp.originalWidth,
            originalHeight: bp.originalHeight,
            placement: bp.placement || null,
        };
        persistLocal(activeBpMeta, bounds);
        syncSelect();
        syncButtons();
        return true;
    }

    function doSavePlacement() {
        if (!activeId || !overlay) {
            setStatus(tr('tactical.bpNeedOnMap', 'Show a plan on the map first'), 'err');
            return;
        }
        const bounds = draftBounds || (overlay.getBounds && overlay.getBounds());
        if (!bounds) return;
        const placement = boundsToPlain(bounds);
        setStatus(tr('tactical.bpSaving', 'Saving placement…'), null);
        fetchBpJson('/api/tactical/blueprints/' + encodeURIComponent(activeId) + '/placement', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placement: placement }),
        })
            .then(function (pack) {
                if (!pack.ok || pack.parseFail || !pack.data || !pack.data.ok) {
                    setStatus(failMsg('tactical.bpSaveFail', 'Could not save placement', pack, pack.err), 'err');
                    return;
                }
                const bp = pack.data.blueprint;
                if (bp) {
                    activeBpMeta = bp;
                    for (let i = 0; i < blueprints.length; i++) {
                        if (String(blueprints[i].id) === String(bp.id)) {
                            blueprints[i] = bp;
                            break;
                        }
                    }
                    persistLocal(bp, plainToBounds(bp.placement || placement));
                }
                stopAdjustMode({ silent: true });
                if (overlay) {
                    try { overlay.setOpacity(NORMAL_OPACITY); } catch (_) { /* ignore */ }
                }
                setStatus(tr('tactical.bpSaved', 'Placement saved'), 'ok');
                syncButtons();
            })
            .catch(function (err) {
                setStatus(failMsg('tactical.bpSaveFail', 'Could not save placement', null, err), 'err');
            });
    }

    function syncButtons() {
        const sel = el('ax-tactical-bp-select');
        const showBtn = el('ax-tactical-bp-show');
        const clearBtn = el('ax-tactical-bp-clear') || el('ax-tactical-bp-hide');
        const removeBtn = el('ax-tactical-bp-remove');
        const uploadBtn = el('ax-tactical-bp-upload');
        const adjustBtn = el('ax-tactical-bp-adjust');
        const saveBtn = el('ax-tactical-bp-save-place');
        const hasSel = !!(sel && sel.value);
        const onMap = !!overlay;
        if (showBtn) showBtn.disabled = !hasSel;
        if (clearBtn) clearBtn.disabled = !onMap && !activeId;
        if (removeBtn) removeBtn.disabled = !hasSel;
        if (uploadBtn) uploadBtn.disabled = !selectedFile;
        if (adjustBtn) adjustBtn.disabled = !onMap;
        if (saveBtn) saveBtn.disabled = !adjustMode || !onMap;
    }

    function syncSelect() {
        const sel = el('ax-tactical-bp-select');
        if (!sel) return;
        const keep = activeId || sel.value || '';
        sel.innerHTML = '';
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '—';
        sel.appendChild(blank);
        blueprints.forEach(function (bp) {
            const opt = document.createElement('option');
            opt.value = bp.id;
            const placed = bp.placement ? ' · placed' : '';
            opt.textContent = (bp.name || 'Blueprint') + ' · ' + formatBytes(bp.byteSize) + placed;
            sel.appendChild(opt);
        });
        if (keep && blueprints.some(function (b) { return String(b.id) === String(keep); })) {
            sel.value = keep;
        }
        syncButtons();
    }

    function findBp(id) {
        const sid = String(id || '');
        for (let i = 0; i < blueprints.length; i++) {
            if (String(blueprints[i].id) === sid) return blueprints[i];
        }
        return null;
    }

    function loadList() {
        return fetchBpJson('/api/tactical/blueprints?limit=100')
            .then(function (pack) {
                if (!pack.ok || pack.parseFail || !pack.data || !pack.data.ok) {
                    const msg = failMsg('tactical.bpListFail', 'Could not load plans', pack, pack.err);
                    throw Object.assign(new Error('bp-list-fail'), { operatorMsg: msg });
                }
                blueprints = Array.isArray(pack.data.blueprints) ? pack.data.blueprints : [];
                syncSelect();
                return blueprints;
            });
    }

    function onFilePicked() {
        const input = el('ax-tactical-bp-file');
        const label = el('ax-tactical-bp-file-label');
        selectedFile = (input && input.files && input.files[0]) ? input.files[0] : null;
        if (label) {
            label.textContent = selectedFile
                ? (selectedFile.name + ' · ' + formatBytes(selectedFile.size))
                : '';
        }
        syncButtons();
        setStatus('', null);
    }

    function doUpload() {
        if (!selectedFile) return;
        const nameEl = el('ax-tactical-bp-name');
        const name = (nameEl && nameEl.value ? String(nameEl.value).trim() : '') || 'Blueprint';
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('name', name);
        setStatus(tr('tactical.bpUploading', 'Uploading…'), null);
        const uploadBtn = el('ax-tactical-bp-upload');
        if (uploadBtn) uploadBtn.disabled = true;

        fetchBpJson('/api/tactical/blueprints/upload', {
            method: 'POST',
            body: fd,
        })
            .then(function (pack) {
                if (!pack.ok || pack.parseFail || !pack.data || !pack.data.ok) {
                    setStatus(failMsg('tactical.bpUploadFail', 'Upload failed', pack, pack.err), 'err');
                    return null;
                }
                const bp = pack.data.blueprint;
                setStatus(tr('tactical.bpUploadOk', 'Uploaded — show & adjust on map'), 'ok');
                selectedFile = null;
                const input = el('ax-tactical-bp-file');
                if (input) input.value = '';
                const label = el('ax-tactical-bp-file-label');
                if (label) label.textContent = '';
                return loadList().then(function () {
                    if (bp) {
                        activeId = String(bp.id);
                        syncSelect();
                        if (showBlueprint(bp)) startAdjustMode();
                    }
                });
            })
            .catch(function (err) {
                setStatus(
                    (err && err.operatorMsg)
                        || failMsg('tactical.bpUploadFail', 'Upload failed', null, err),
                    'err',
                );
            })
            .finally(function () {
                syncButtons();
            });
    }

    function doShow() {
        const sel = el('ax-tactical-bp-select');
        const id = sel && sel.value;
        const bp = findBp(id);
        if (!bp) {
            setStatus(tr('tactical.bpNeedSelect', 'Pick a saved plan first'), 'err');
            return;
        }
        if (showBlueprint(bp)) {
            setStatus(
                bp.placement
                    ? tr('tactical.bpShownPlaced', 'Plan on map (saved place)')
                    : tr('tactical.bpShown', 'Plan on map — tap Adjust to place'),
                'ok',
            );
        } else {
            setStatus(tr('tactical.bpShowFail', 'Could not show plan'), 'err');
        }
    }

    function doClearFromMap() {
        clearOverlay();
        setStatus(tr('tactical.bpCleared', 'Plan cleared from map'), null);
    }

    function doRemovePlan() {
        const sel = el('ax-tactical-bp-select');
        const id = sel && sel.value;
        const bp = findBp(id);
        if (!bp) {
            setStatus(tr('tactical.bpNeedSelect', 'Pick a saved plan first'), 'err');
            return;
        }
        const label = bp.name || 'Blueprint';
        const ok = global.confirm
            ? global.confirm(tr('tactical.bpRemoveConfirm', 'Remove “{name}” from this site? This cannot be undone.', { name: label }))
            : true;
        if (!ok) return;
        setStatus(tr('tactical.bpRemoving', 'Removing plan…'), null);
        fetchBpJson('/api/tactical/blueprints/' + encodeURIComponent(bp.id), {
            method: 'DELETE',
        })
            .then(function (pack) {
                if (!pack.ok || pack.parseFail || !pack.data || !pack.data.ok) {
                    setStatus(failMsg('tactical.bpRemoveFail', 'Could not remove plan', pack, pack.err), 'err');
                    return;
                }
                if (String(activeId) === String(bp.id)) clearOverlay();
                blueprints = blueprints.filter(function (b) { return String(b.id) !== String(bp.id); });
                syncSelect();
                setStatus(tr('tactical.bpRemoved', 'Plan removed'), 'ok');
            })
            .catch(function (err) {
                setStatus(failMsg('tactical.bpRemoveFail', 'Could not remove plan', null, err), 'err');
            })
            .finally(function () {
                syncButtons();
            });
    }

    function restoreFromStore() {
        const saved = readStore();
        if (!saved || !saved.imageUrl) return;
        activeId = String(saved.id || '');
        syncSelect();
        const fromList = findBp(activeId);
        const bp = fromList || {
            id: saved.id,
            name: saved.name,
            imageUrl: saved.imageUrl,
            originalWidth: saved.originalWidth,
            originalHeight: saved.originalHeight,
            placement: saved.bounds || null,
        };
        if (fromList && fromList.placement) {
            showBlueprint(fromList, { skipFit: false });
        } else {
            showBlueprint(bp, { bounds: saved.bounds, skipFit: false });
        }
    }

    function bindUi() {
        if (uiBound) return;
        uiBound = true;
        const file = el('ax-tactical-bp-file');
        const upload = el('ax-tactical-bp-upload');
        const show = el('ax-tactical-bp-show');
        const clearBtn = el('ax-tactical-bp-clear') || el('ax-tactical-bp-hide');
        const removeBtn = el('ax-tactical-bp-remove');
        const sel = el('ax-tactical-bp-select');
        const adjust = el('ax-tactical-bp-adjust');
        const savePlace = el('ax-tactical-bp-save-place');
        const opacity = el('ax-tactical-bp-opacity');
        if (file) file.addEventListener('change', onFilePicked);
        if (upload) upload.addEventListener('click', doUpload);
        if (show) show.addEventListener('click', doShow);
        if (clearBtn) clearBtn.addEventListener('click', doClearFromMap);
        if (removeBtn) removeBtn.addEventListener('click', doRemovePlan);
        if (sel) sel.addEventListener('change', syncButtons);
        if (adjust) adjust.addEventListener('click', toggleAdjust);
        if (savePlace) savePlace.addEventListener('click', doSavePlacement);
        if (opacity) opacity.addEventListener('input', onOpacityInput);
    }

    function revealBlock(show) {
        const block = el('ax-tactical-bp-block');
        if (!block) return;
        block.hidden = !show;
    }

    function onShow() {
        bindUi();
        const sessionP = (global.SessionBus && SessionBus.get)
            ? SessionBus.get()
            : fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function () { return null; });

        sessionP.then(function (session) {
            if (!isSuperAdmin(session)) {
                revealBlock(false);
                stopAdjustMode({ silent: true });
                return;
            }
            revealBlock(true);
            if (typeof global.I18n !== 'undefined' && I18n.scheduleApply) {
                I18n.scheduleApply(el('ax-tactical-bp-block') || el('ax-tactical-prepare-block'));
            }
            loadList()
                .then(function () {
                    restoreFromStore();
                })
                .catch(function (err) {
                    setStatus(
                        (err && err.operatorMsg)
                            || failMsg('tactical.bpListFail', 'Could not load plans', null, err),
                        'err',
                    );
                });
        });
    }

    global.TacticalBlueprintUi = {
        onShow: onShow,
        clearOverlay: clearOverlay,
        getActiveId: function () { return activeId; },
        isAdjusting: function () { return adjustMode; },
    };
}(typeof window !== 'undefined' ? window : this));
