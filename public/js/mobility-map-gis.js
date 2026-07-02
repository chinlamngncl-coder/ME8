/**
 * Map region control — country/capital presets on the Leaflet map.
 */
(function (global) {
    'use strict';

    var STORAGE_COUNTRY = 'fm_map_country_v1';

    /** Capital-city views (English default = Singapore). */
    var COUNTRY_PRESETS = {
        sg: { pos: [1.3521, 103.8198], zoom: 11 },
        ph: { pos: [14.5995, 120.9842], zoom: 11 },
        id: { pos: [-6.2088, 106.8456], zoom: 11 },
        th: { pos: [13.7563, 100.5018], zoom: 11 },
        kr: { pos: [37.5665, 126.9780], zoom: 11 },
        cn: { pos: [39.9042, 116.4074], zoom: 11 },
        za: { pos: [-26.2041, 28.0473], zoom: 10 },
    };

    var LANG_DEFAULT = { en: 'sg', fil: 'ph', id: 'id', th: 'th', ko: 'kr', zh: 'cn' };
    var LANG_OPTIONS = {
        en: ['sg', 'ph', 'id', 'th', 'kr', 'za'],
        fil: ['ph', 'sg', 'id', 'th', 'kr', 'za'],
        id: ['id', 'sg', 'ph', 'th', 'kr', 'za'],
        th: ['th', 'sg', 'ph', 'id', 'kr', 'za'],
        ko: ['kr', 'sg', 'ph', 'id', 'th', 'za'],
        zh: ['cn', 'za'],
    };

    /** Plain country names — no i18n keys in the UI. */
    var COUNTRY_NAMES = {
        en: { sg: 'Singapore', ph: 'Philippines', id: 'Indonesia', th: 'Thailand', kr: 'Korea', cn: 'China', za: 'South Africa — JHB · CPT' },
        fil: { sg: 'Singapore', ph: 'Pilipinas', id: 'Indonesia', th: 'Thailand', kr: 'Korea', cn: 'China', za: 'South Africa — JHB · Cape Town' },
        id: { sg: 'Singapura', ph: 'Filipina', id: 'Indonesia', th: 'Thailand', kr: 'Korea', cn: 'Tiongkok', za: 'Afrika Selatan — JHB · Cape Town' },
        th: { sg: 'สิงคโปร์', ph: 'ฟิลิปปินส์', id: 'อินโดนีเซีย', th: 'ไทย', kr: 'เกาหลี', cn: 'จีน', za: 'แอฟริกาใต้ (จוךฮันเนสเบิร์ก·เคปทาวน์)' },
        ko: { sg: '싱가포르', ph: '필리핀', id: '인도네시아', th: '태국', kr: '한국', cn: '중국', za: '남아프리카공화국 (요하네스버그·케이프타운)' },
        zh: { cn: '中国', za: '南非（约翰内斯堡·开普敦）' },
    };

    var leafletMap = null;
    var countryCode = 'sg';
    var toolbarBuilt = false;

    function packCountryCodes() {
        try {
            var meta = document.querySelector('meta[name="fm-map-countries"]');
            if (!meta) return null;
            var list = String(meta.content || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            return list.length ? list : null;
        } catch (e) {
            return null;
        }
    }

    function countryOptionsForLang() {
        var pack = packCountryCodes();
        if (pack) return pack.filter(function (code) { return COUNTRY_PRESETS[code]; });
        return LANG_OPTIONS[currentLang()] || LANG_OPTIONS.en;
    }

    function currentLang() {
        if (global.I18n && I18n.getLocale) return I18n.getLocale();
        try { return localStorage.getItem('fm_ui_lang') || 'en'; } catch (e) { return 'en'; }
    }

    function countryLabel(code) {
        var lang = currentLang();
        var names = COUNTRY_NAMES[lang] || COUNTRY_NAMES.en;
        return names[code] || COUNTRY_NAMES.en[code] || code;
    }

    function readStoredCountry() {
        var opts = countryOptionsForLang();
        try {
            var v = localStorage.getItem(STORAGE_COUNTRY);
            if (v && COUNTRY_PRESETS[v] && opts.indexOf(v) >= 0) return v;
        } catch (e) { /* ignore */ }
        if (packCountryCodes()) return opts[0] || 'cn';
        return LANG_DEFAULT[currentLang()] || 'sg';
    }

    function persistPrefs() {
        try { localStorage.setItem(STORAGE_COUNTRY, countryCode); } catch (e) { /* ignore */ }
    }

    function getInitialView() {
        var p = COUNTRY_PRESETS[readStoredCountry()] || COUNTRY_PRESETS.sg;
        return { pos: p.pos.slice(), zoom: p.zoom };
    }

    function applyCountryPreset(fly) {
        var preset = COUNTRY_PRESETS[countryCode] || COUNTRY_PRESETS.sg;
        if (!leafletMap) return;
        if (fly !== false) leafletMap.setView(preset.pos, preset.zoom);
        persistPrefs();
        rebuildCountrySelect();
    }

    function rebuildCountrySelect() {
        var sel = document.getElementById('map-country-select');
        if (!sel) return;
        var opts = countryOptionsForLang();
        sel.innerHTML = opts.filter(function (code) { return COUNTRY_PRESETS[code]; }).map(function (code) {
            return '<option value="' + code + '"' + (code === countryCode ? ' selected' : '') + '>' +
                countryLabel(code) + '</option>';
        }).join('');
    }

    function buildToolbar() {
        if (toolbarBuilt) return;
        var wrap = document.querySelector('.map-canvas-wrap');
        if (!wrap) return;
        var bar = document.createElement('div');
        bar.id = 'map-view-controls';
        bar.innerHTML = '<button type="button" id="map-fit-pins-btn" data-i18n="map.fitPins" data-i18n-title="map.fitPinsTitle">Fit pins</button>' +
            '<select id="map-country-select" aria-label="Country"></select>';
        wrap.appendChild(bar);
        document.getElementById('map-fit-pins-btn').addEventListener('click', function () {
            if (global.fitMapToFleetPins) global.fitMapToFleetPins();
        });
        document.getElementById('map-country-select').addEventListener('change', function () {
            countryCode = this.value || countryCode;
            applyCountryPreset(true);
        });
        if (global.I18n && I18n.applyPage) I18n.applyPage(bar);
        toolbarBuilt = true;
        rebuildCountrySelect();
    }

    function onLangChange() {
        var opts = countryOptionsForLang();
        if (opts.indexOf(countryCode) < 0) countryCode = readStoredCountry();
        rebuildCountrySelect();
    }

    function init(mapInstance) {
        leafletMap = mapInstance;
        countryCode = readStoredCountry();
        buildToolbar();
        applyCountryPreset(false);
        global.addEventListener('fm-i18n-changed', onLangChange);
    }

    global.MobilityMapGis = {
        init: init,
        getInitialView: getInitialView,
        flyTo: function (lat, lon, zoom) {
            if (!leafletMap) return;
            var z = zoom != null ? zoom : Math.max(leafletMap.getZoom(), 14);
            leafletMap.setView([lat, lon], z);
        },
        invalidateSize: function () {
            if (leafletMap) try { leafletMap.invalidateSize(); } catch (e) { /* ignore */ }
        },
    };
})(typeof window !== 'undefined' ? window : this);
