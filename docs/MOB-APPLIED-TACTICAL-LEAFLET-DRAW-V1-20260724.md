# MOB APPLIED — TACTICAL-LEAFLET-DRAW-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-LEAFLET-DRAW-V1` (after shell **PASS**)  
**Disc:** `MOB-DISC-TACTICAL-ZONE-PLAN-DRAFT-20260723.md`  
**Status:** APPLIED — operator PASS/FAIL pending  

---

## Scope

| In | Out |
|----|-----|
| Leaflet.draw (vendored) on **Tactical map only** | Ops map draw clutter |
| Rail: Polygon · Circle · Edit · Delete enabled | Turf / GPS entry-exit |
| Draw → GeoJSON in browser | `create-tactical-zone` socket |
| **Save zone** when Incident ID + shape → list stub | Auto `startPlay` / PTT |
| Status: Idle / Need incident / Need shape / Drawing / Ready / Saved | Zone vault DB |

---

## How to use (operator)

1. Ctrl+F5.  
2. **Tactical** → enter **Incident ID**.  
3. **Polygon** (click corners, click first point to close) **or** **Circle** (click-drag).  
4. **Save zone** → row appears under Zones (`ID · polygon|circle`).  
5. **Edit** / **Delete**: tap tool → change/remove → **tap same tool again** to finish.  
6. **Operations** still works; no tools on Ops map.

---

## Files

- `public/vendor/leaflet-draw/**` (js/css/images)  
- `public/js/tactical-shell.js`  
- `public/index.html` (links + button ids)  
- `public/css/global.css` (scoped + fixed stray `flex` fragment)  
- `public/locales/en.json`  
- `scripts/verify-tactical-leaflet-draw-v1.js`  

**Cache:** `?v=20260724-tactical-leaflet-draw-v1`

**Verify:** `npm run verify:tactical-draw`

---

## Next (not this MOB)

`TACTICAL-TURF-ENTRY-EXIT-V1` — GPS in/out → existing media/PTT hooks.

Say **PASS** or **FAIL** (what broke).
