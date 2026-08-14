# MOB-APPLY VIDEO-POPOUT-MINIMAP-V1 — APPLY lock

**Date:** 2026-08-11  
**Status:** APPLIED — operator PASS/FAIL

## Intent

Ops wall **video pop-out** (`live.html`): large video + floating **mini-map** with **that cam’s pin** moving. Drag + resize. Opposite of Ops (map stage + small video).

## Files

- `public/js/live-popout-minimap.js` (new) — Leaflet instance, GPS, drag/resize  
- `public/live.html` — leaflet + init/destroy  
- `public/css/global.css` — panel chrome  

**Not touched:** Firmware Gold pin-mirror, Ops `#map`, matrix multi-popout.

## Operator check

1. Ops wall → live cam → **Pop out**.  
2. Large video live.  
3. Bottom-right **Map · camId** — pin appears / moves with GPS (Follow on).  
4. Drag map by header; resize corner; video stays.  
5. Close pop-out → Ops map still OK.
