/**
 * VMS-MAP-NORTH-ROSE-V1 / SPATIAL-TACTICAL — Leaflet north-up chrome (not device heading).
 * Outdoor GIS maps only; do not attach to indoor floor CRS.Simple plans.
 */
(function (global) {
    'use strict';

    function attach(map) {
        if (!map || typeof global.L === 'undefined' || !global.L.Control) return null;
        if (map._me8NorthRoseControl) return map._me8NorthRoseControl;
        var NorthRose = global.L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function () {
                var el = global.L.DomUtil.create('div', 'leaflet-bar leaflet-control me8-map-north-rose');
                el.setAttribute('role', 'img');
                el.setAttribute('aria-label', 'Map north');
                el.title = 'North';
                el.innerHTML = '<i class="me8-map-north-pointer" aria-hidden="true"></i><span class="me8-map-north-n">N</span>';
                global.L.DomEvent.disableClickPropagation(el);
                global.L.DomEvent.disableScrollPropagation(el);
                return el;
            },
        });
        var ctrl = new NorthRose();
        map.addControl(ctrl);
        map._me8NorthRoseControl = ctrl;
        return ctrl;
    }

    global.Me8MapNorthRose = { attach: attach };
})(window);
