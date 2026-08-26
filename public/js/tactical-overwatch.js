/**
 * Overwatch - Right video is master ("Set on Right, Show on Left").
 * Views (not "presets" in operator chrome) sync FOV/heading to the Leaflet map.
 *
 * Event bus (document CustomEvents):
 *   tactical-ow:view-config     - live Save View edits { name, azimuth, fov, cameraId, token }
 *   tactical-ow:view-locked     - Use this view succeeded
 *   tactical-ow:manual-override - PTZ pan broke View lock
 *   tactical-ow:view-cleared    - overlays cleared (close / cam change / idle)
 */
(function (global) {
    'use strict';

    const STORE_KEY = 'fm_tactical_overwatch_view_spatial_v1';
    const LEGACY_STORE_KEY = 'fm_tactical_overwatch_preset_spatial_v1';
    const DEFAULT_FOV = 60;
    const DEFAULT_RANGE_M = 180;
    const R_EARTH = 6378137;
    const EVT = {
        VIEW_CONFIG: 'tactical-ow:view-config',
        VIEW_LOCKED: 'tactical-ow:view-locked',
        MANUAL_OVERRIDE: 'tactical-ow:manual-override',
        VIEW_CLEARED: 'tactical-ow:view-cleared',
    };

    let fovLayer = null;
    let camMarker = null;
    let fixedCamCache = {};
    let lastCamId = '';
    let lastToken = '';
    let configuring = false; // Save View panel open / editing without requiring lock
    let busBound = false;

    function tr(key, fallback) {
        if (global.I18n && I18n.t) {
            const v = I18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback || key;
    }

    function el(id) {
        return document.getElementById(id);
    }

    function getMap() {
        if (global.TacticalShell && typeof TacticalShell.getMap === 'function') {
            return TacticalShell.getMap();
        }
        return null;
    }

    function emit(type, detail) {
        try {
            document.dispatchEvent(new CustomEvent(type, { detail: detail || {}, bubbles: true }));
        } catch (_) { /* ignore */ }
    }

    function on(type, handler) {
        document.addEventListener(type, handler);
    }

    function spatialKey(cameraId, token) {
        return String(cameraId || '').trim() + '|' + String(token || '').trim();
    }

    function loadStore() {
        try {
            let raw = global.localStorage && localStorage.getItem(STORE_KEY);
            if (!raw && global.localStorage) {
                raw = localStorage.getItem(LEGACY_STORE_KEY);
                if (raw) {
                    try { localStorage.setItem(STORE_KEY, raw); } catch (_) { /* ignore */ }
                }
            }
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function saveStore(store) {
        try {
            if (global.localStorage) localStorage.setItem(STORE_KEY, JSON.stringify(store || {}));
        } catch (_) { /* ignore */ }
    }

    function normalizeSpatial(raw) {
        const azimuth = ((Number(raw && raw.azimuth) % 360) + 360) % 360;
        let fov = Number(raw && (raw.fov_width != null ? raw.fov_width : (raw.fov != null ? raw.fov : raw.fovWidth)));
        if (!Number.isFinite(fov) || fov <= 0) fov = DEFAULT_FOV;
        fov = Math.min(170, Math.max(5, fov));
        const lat = Number(raw && raw.lat);
        const lng = Number(raw && (raw.lng != null ? raw.lng : raw.lon));
        const rangeM = Number(raw && (raw.range_m != null ? raw.range_m : raw.rangeM));
        const name = String((raw && (raw.name || raw.viewName)) || '').trim();
        return {
            azimuth: Number.isFinite(azimuth) ? azimuth : 0,
            fov_width: fov,
            fov: fov,
            name: name,
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
            range_m: Number.isFinite(rangeM) && rangeM > 0 ? rangeM : DEFAULT_RANGE_M,
        };
    }

    function getViewSpatial(cameraId, token) {
        const store = loadStore();
        const hit = store[spatialKey(cameraId, token)];
        return hit ? normalizeSpatial(hit) : null;
    }

    function setViewSpatial(cameraId, token, patch) {
        const store = loadStore();
        const key = spatialKey(cameraId, token);
        const prev = store[key] ? normalizeSpatial(store[key]) : normalizeSpatial({});
        const next = normalizeSpatial(Object.assign({}, prev, patch || {}));
        store[key] = next;
        saveStore(store);
        return next;
    }

    /** @deprecated alias - Views, not presets */
    function getPresetSpatial(cameraId, token) {
        return getViewSpatial(cameraId, token);
    }
    function setPresetSpatial(cameraId, token, patch) {
        return setViewSpatial(cameraId, token, patch);
    }

    function destination(lat, lng, bearingDeg, distM) {
        const br = (bearingDeg * Math.PI) / 180;
        const φ1 = (lat * Math.PI) / 180;
        const λ1 = (lng * Math.PI) / 180;
        const δ = distM / R_EARTH;
        const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(br));
        const λ2 = λ1 + Math.atan2(
            Math.sin(br) * Math.sin(δ) * Math.cos(φ1),
            Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
        );
        return [φ2 * 180 / Math.PI, ((λ2 * 180 / Math.PI + 540) % 360) - 180];
    }

    function coneLatLngs(lat, lng, azimuth, fovWidth, rangeM) {
        const half = fovWidth / 2;
        const steps = Math.max(6, Math.round(fovWidth / 8));
        const pts = [[lat, lng]];
        for (let i = 0; i <= steps; i += 1) {
            const bearing = azimuth - half + (fovWidth * i) / steps;
            pts.push(destination(lat, lng, bearing, rangeM));
        }
        pts.push([lat, lng]);
        return pts;
    }

    function clearFov() {
        const map = getMap();
        if (fovLayer && map) {
            try { map.removeLayer(fovLayer); } catch (_) { /* ignore */ }
        }
        if (camMarker && map) {
            try { map.removeLayer(camMarker); } catch (_) { /* ignore */ }
        }
        fovLayer = null;
        camMarker = null;
    }

    function resolveCamLatLng(cameraId, spatial) {
        let lat = spatial && spatial.lat;
        let lng = spatial && spatial.lng;
        const camId = String(cameraId || lastCamId || '').trim();
        if ((lat == null || lng == null) && camId && fixedCamCache[camId]) {
            lat = Number(fixedCamCache[camId].lat);
            lng = Number(fixedCamCache[camId].lng);
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
            return null;
        }
        return { lat: lat, lng: lng, cameraId: camId };
    }

    /**
     * Left map FOV - primary API: drawCameraFov(azimuth, fov)
     * Also accepts drawCameraFov({ azimuth, fov_width, cameraId, ... })
     */
    function drawCameraFov(azimuthOrConfig, fovMaybe) {
        let azimuth;
        let fov;
        let cameraId = lastCamId;
        let rangeM = DEFAULT_RANGE_M;
        let lat = null;
        let lng = null;

        if (azimuthOrConfig && typeof azimuthOrConfig === 'object') {
            const spatial = normalizeSpatial(azimuthOrConfig);
            azimuth = spatial.azimuth;
            fov = spatial.fov_width;
            rangeM = spatial.range_m;
            lat = spatial.lat;
            lng = spatial.lng;
            cameraId = String(azimuthOrConfig.cameraId || cameraId || '').trim();
        } else {
            azimuth = ((Number(azimuthOrConfig) % 360) + 360) % 360;
            fov = Number(fovMaybe);
            if (!Number.isFinite(fov) || fov <= 0) fov = DEFAULT_FOV;
            fov = Math.min(170, Math.max(5, fov));
        }

        clearFov();
        const map = getMap();
        const L = global.L;
        if (!map || !L) return false;

        const pos = resolveCamLatLng(cameraId, { lat: lat, lng: lng });
        if (!pos) return false;

        const iconHtml =
            '<div class="ax-tactical-ow-cam-icon" style="transform:rotate(' + azimuth + 'deg)">' +
            '<span class="ax-tactical-ow-cam-body"></span>' +
            '<span class="ax-tactical-ow-cam-lens"></span>' +
            '</div>';
        const icon = L.divIcon({
            className: 'ax-tactical-ow-cam-divicon',
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });
        camMarker = L.marker([pos.lat, pos.lng], { icon: icon, interactive: false, keyboard: false });
        camMarker.addTo(map);

        const ring = coneLatLngs(pos.lat, pos.lng, azimuth, fov, rangeM);
        fovLayer = L.polygon(ring, {
            color: '#38bdf8',
            weight: 1.5,
            opacity: 0.95,
            fillColor: '#0ea5e9',
            fillOpacity: 0.22,
            interactive: false,
            className: 'ax-tactical-ow-fov-cone',
        });
        fovLayer.addTo(map);
        return true;
    }

    function setCompassVisible(on) {
        const box = el('ax-tactical-ow-compass');
        if (box) box.hidden = !on;
    }

    function updateCompass(azimuthDeg) {
        const needle = el('ax-tactical-ow-compass-needle');
        const label = el('ax-tactical-ow-compass-az');
        const az = ((Number(azimuthDeg) % 360) + 360) % 360;
        if (needle) needle.style.transform = 'translate(-50%, -50%) rotate(' + (-az) + 'deg)';
        if (label) label.textContent = Math.round(az) + ' deg';
        setCompassVisible(true);
    }

    function hideCompass() {
        setCompassVisible(false);
    }

    function setManualBanner(on) {
        const banner = el('ax-tactical-ow-manual-banner');
        if (banner) banner.hidden = !on;
    }

    function readSaveViewForm() {
        const nameEl = el('ax-tactical-ow-view-name');
        const azSlider = el('ax-tactical-ow-azimuth-slider');
        const fovSlider = el('ax-tactical-ow-fov-slider');
        const azNum = el('ax-tactical-ow-azimuth');
        const fovNum = el('ax-tactical-ow-fov');
        const az = azSlider
            ? Number(azSlider.value)
            : (azNum ? Number(azNum.value) : 0);
        const fov = fovSlider
            ? Number(fovSlider.value)
            : (fovNum ? Number(fovNum.value) : DEFAULT_FOV);
        return {
            name: nameEl ? String(nameEl.value || '').trim() : '',
            azimuth: az,
            fov: fov,
            fov_width: fov,
            cameraId: lastCamId,
            token: lastToken,
        };
    }

    function writeSaveViewForm(spatial, nameHint) {
        const nameEl = el('ax-tactical-ow-view-name');
        const azSlider = el('ax-tactical-ow-azimuth-slider');
        const fovSlider = el('ax-tactical-ow-fov-slider');
        const azVal = el('ax-tactical-ow-azimuth-val');
        const fovVal = el('ax-tactical-ow-fov-val');
        const azNum = el('ax-tactical-ow-azimuth');
        const fovNum = el('ax-tactical-ow-fov');
        if (!spatial) return;
        const az = Math.round(spatial.azimuth);
        const fov = Math.round(spatial.fov_width);
        if (nameEl && (spatial.name || nameHint)) nameEl.value = spatial.name || nameHint || '';
        if (azSlider) azSlider.value = String(az);
        if (fovSlider) fovSlider.value = String(fov);
        if (azVal) azVal.textContent = az + ' deg';
        if (fovVal) fovVal.textContent = fov + ' deg';
        if (azNum) azNum.value = String(az);
        if (fovNum) fovNum.value = String(fov);
    }

    function cacheFixedCams(cams) {
        fixedCamCache = {};
        (cams || []).forEach(function (c) {
            if (!c || !c.id) return;
            fixedCamCache[String(c.id)] = {
                lat: Number(c.lat),
                lng: Number(c.lng != null ? c.lng : c.lon),
                name: c.name || c.id,
            };
        });
    }

    function refreshFixedCams() {
        return fetch('/api/fixed-cams', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                cacheFixedCams(data && data.cams);
            })
            .catch(function () { /* ignore */ });
    }

    function currentCameraId() {
        if (lastCamId) return lastCamId;
        const camSel = el('ax-tactical-ar-cam');
        return camSel && camSel.value ? String(camSel.value) : '';
    }

    function currentToken() {
        if (lastToken) return lastToken;
        const presetSel = el('ax-tactical-ar-preset');
        return presetSel && presetSel.value ? String(presetSel.value) : '';
    }

    /**
     * Glass UV pins - % layout. When only pins passed, uses active View from TacticalAr.
     */
    function renderOverwatchPins(pins, activeView) {
        let view = activeView;
        if (view === undefined && global.TacticalAr && typeof TacticalAr.getActivePreset === 'function') {
            view = TacticalAr.getActivePreset();
        }
        if (global.TacticalAr && typeof TacticalAr.renderArPins === 'function') {
            return TacticalAr.renderArPins(pins, view || null);
        }
        return 0;
    }

    /** Right -> Left: live Apply from Save View form */
    function publishViewConfig(source) {
        const form = readSaveViewForm();
        lastCamId = currentCameraId() || form.cameraId;
        lastToken = currentToken() || form.token;
        form.cameraId = lastCamId;
        form.token = lastToken;
        form.source = source || 'slider';
        configuring = true;
        setManualBanner(false);

        if (lastCamId && lastToken) {
            setViewSpatial(lastCamId, lastToken, form);
        }

        emit(EVT.VIEW_CONFIG, form);
        return form;
    }

    /** Left map listener for Right master state */
    function onViewConfigFromRight(ev) {
        const d = (ev && ev.detail) || {};
        const az = d.azimuth;
        const fov = d.fov != null ? d.fov : d.fov_width;
        if (d.cameraId) lastCamId = String(d.cameraId);
        drawCameraFov(az, fov);
        updateCompass(az);
    }

    function onViewLockedFromRight(ev) {
        const d = (ev && ev.detail) || {};
        setManualBanner(false);
        configuring = false;
        if (d.cameraId) lastCamId = String(d.cameraId);
        if (d.token) lastToken = String(d.token);
        const form = Object.assign({}, readSaveViewForm(), d);
        writeSaveViewForm(normalizeSpatial(form), d.name);
        drawCameraFov(form.azimuth, form.fov_width || form.fov);
        updateCompass(form.azimuth);
    }

    function onManualOverrideFromRight() {
        configuring = false;
        clearFov();
        hideCompass();
        setManualBanner(true);
        if (global.TacticalAr && typeof TacticalAr.renderArPins === 'function') {
            try { TacticalAr.renderArPins([], null); } catch (_) { /* ignore */ }
        }
    }

    function onViewClearedFromRight() {
        configuring = false;
        clearFov();
        hideCompass();
        setManualBanner(false);
    }

    function bindLeftListeners() {
        if (busBound) return;
        busBound = true;
        on(EVT.VIEW_CONFIG, onViewConfigFromRight);
        on(EVT.VIEW_LOCKED, onViewLockedFromRight);
        on(EVT.MANUAL_OVERRIDE, onManualOverrideFromRight);
        on(EVT.VIEW_CLEARED, onViewClearedFromRight);
    }

    function onPresetLocked(activeView) {
        Promise.resolve(refreshFixedCams()).then(function () {
            if (!activeView) return;
            lastCamId = String(activeView.cameraId || '');
            lastToken = String(activeView.token || '');
            const saved = getViewSpatial(lastCamId, lastToken) || normalizeSpatial({});
            const form = readSaveViewForm();
            const merged = normalizeSpatial(Object.assign({}, saved, {
                name: form.name || saved.name || activeView.name || '',
                azimuth: form.azimuth,
                fov_width: form.fov_width || form.fov,
            }));
            setViewSpatial(lastCamId, lastToken, merged);
            writeSaveViewForm(merged, activeView.name);
            setManualBanner(false);
            emit(EVT.VIEW_LOCKED, Object.assign({}, merged, {
                cameraId: lastCamId,
                token: lastToken,
                name: activeView.name || merged.name,
            }));
        });
    }

    function onManualOverride() {
        emit(EVT.MANUAL_OVERRIDE, { cameraId: lastCamId, token: lastToken });
    }

    function onPresetCleared() {
        emit(EVT.VIEW_CLEARED, { reason: 'cleared' });
    }

    function onOverwatchClosed() {
        lastToken = '';
        emit(EVT.VIEW_CLEARED, { reason: 'closed' });
    }

    function bindSaveViewPanel() {
        const azSlider = el('ax-tactical-ow-azimuth-slider');
        const fovSlider = el('ax-tactical-ow-fov-slider');
        const nameEl = el('ax-tactical-ow-view-name');
        const azNum = el('ax-tactical-ow-azimuth');
        const fovNum = el('ax-tactical-ow-fov');

        function onLiveEdit() {
            const form = publishViewConfig('live');
            const azVal = el('ax-tactical-ow-azimuth-val');
            const fovVal = el('ax-tactical-ow-fov-val');
            if (azVal) azVal.textContent = Math.round(form.azimuth) + ' deg';
            if (fovVal) fovVal.textContent = Math.round(form.fov) + ' deg';
            if (azNum) azNum.value = String(Math.round(form.azimuth));
            if (fovNum) fovNum.value = String(Math.round(form.fov));
        }

        ['input', 'change'].forEach(function (evName) {
            if (azSlider) azSlider.addEventListener(evName, onLiveEdit);
            if (fovSlider) fovSlider.addEventListener(evName, onLiveEdit);
            if (nameEl) nameEl.addEventListener(evName, onLiveEdit);
            if (azNum) azNum.addEventListener(evName, function () {
                if (azSlider) azSlider.value = azNum.value;
                onLiveEdit();
            });
            if (fovNum) fovNum.addEventListener(evName, function () {
                if (fovSlider) fovSlider.value = fovNum.value;
                onLiveEdit();
            });
        });

        const camSel = el('ax-tactical-ar-cam');
        if (camSel) {
            camSel.addEventListener('change', function () {
                lastCamId = String(camSel.value || '');
                lastToken = '';
            });
        }
        const presetSel = el('ax-tactical-ar-preset');
        if (presetSel) {
            presetSel.addEventListener('change', function () {
                lastToken = String(presetSel.value || '');
                const saved = lastCamId && lastToken ? getViewSpatial(lastCamId, lastToken) : null;
                if (saved) {
                    writeSaveViewForm(saved, presetSel.options[presetSel.selectedIndex]
                        ? presetSel.options[presetSel.selectedIndex].textContent
                        : '');
                } else if (presetSel.selectedIndex >= 0) {
                    const nameEl2 = el('ax-tactical-ow-view-name');
                    if (nameEl2) {
                        nameEl2.value = presetSel.options[presetSel.selectedIndex]
                            ? presetSel.options[presetSel.selectedIndex].textContent
                            : '';
                    }
                }
            });
        }
    }

    function init() {
        bindLeftListeners();
        bindSaveViewPanel();
        refreshFixedCams();
    }

    global.TacticalOverwatch = {
        init: init,
        EVT: EVT,
        emit: emit,
        on: on,
        getViewSpatial: getViewSpatial,
        setViewSpatial: setViewSpatial,
        getPresetSpatial: getPresetSpatial,
        setPresetSpatial: setPresetSpatial,
        drawCameraFov: drawCameraFov,
        clearFov: clearFov,
        updateCompass: updateCompass,
        hideCompass: hideCompass,
        renderOverwatchPins: renderOverwatchPins,
        publishViewConfig: publishViewConfig,
        onPresetLocked: onPresetLocked,
        onPresetCleared: onPresetCleared,
        onManualOverride: onManualOverride,
        onOverwatchClosed: onOverwatchClosed,
        setManualBanner: setManualBanner,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : global);
