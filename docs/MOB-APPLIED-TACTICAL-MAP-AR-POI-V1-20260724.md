# MOB APPLIED — TACTICAL-MAP-AR-POI-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY TACTICAL-MAP-AR-POI-V1` (+ **AR POI STACK OK**)  
**Disc:** `MOB-DISC-TACTICAL-MAP-AR-POI-OPEN-SOURCE-STACK-20260724.md`, `MOB-DISC-TACTICAL-MAP-AR-NOT-GLASSES-20260724.md`  
**Status:** APPLIED — operator PASS/FAIL pending  

---

## Stack (locked)

| Use | Avoid |
|-----|--------|
| Leaflet `L.marker` / `L.divIcon` / `L.layerGroup` | AR.js, WebXR, Cesium, Mapbox GL |
| Existing `/api/fixed-cams/…/zlm/start` + FLV popup | New video player |
| Optional wall panel via `VideoWall.playSlot` (`fixed:…`) | New MCU |

**License pack:** BSD-2 Leaflet already vendored; POIs in `localStorage` (`me8.tacticalPois.v1`); module stays under `#ax-panel-tactical` for future entitlement gating.

---

## What you get

Tactical rail **AR POIs**:

1. **Place POI** → click map → purple pin  
2. Name + **Linked fixed cam** dropdown  
3. **Open linked** → live in POI popup + try video wall panel 9+  
4. Drag pin to move; **Delete POI**  
5. List of POIs in rail  

**Out:** floor-plan overlay (T2), User Circle link UI, Turf, glasses.

---

## Files

- `public/js/tactical-poi.js` (new)  
- `public/js/tactical-shell.js` (onShow → TacticalPoi)  
- `public/index.html`, `public/css/global.css`  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-map-ar-poi-v1.js`  

**Cache:** `?v=20260724-tactical-map-ar-poi-v1`  
**Verify:** `npm run verify:tactical-poi`

---

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. **Place POI** → click map → name it  
3. Pick a **Linked fixed cam** (must exist in Fixed cameras)  
4. **Open linked** → popup shows Connecting/Live (and/or wall panel)  
5. Drag pin; Delete  

Say **PASS** or **FAIL**.
