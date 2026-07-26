# MOB-APPLIED — TACTICAL-AR-CIRCLE-BATCH-OPEN-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-AR-CIRCLE-BATCH-OPEN-V1` (operator named MOB)  
**Disc:** `MOB-DISC-TACTICAL-AR-CIRCLE-AND-IN-VIDEO-PINS-20260724.md`, ladder `MOB-DISC-APPLY-PRIORITY-LADDER-20260724.md`

## What you get

Tactical **Draw** rail:

1. **Circle** (existing) → draw grab area on map  
2. **Open in circle** → finds inside the circle:
   - AR **POIs** (and their linked fixed/BWC ids)
   - **Fixed cams** with map lat/lng in radius  
   - **BWC** with GPS on the main fleet map in radius  
3. Opens live (wall / Open All path), **cap 8**, toast if wall full / offline skipped  

Does **not** require Save zone / Incident ID. Does not auto-open on draw finish.

## Files

- `public/js/tactical-shell.js` — `getGrabCircle`, button enable  
- `public/js/tactical-poi.js` — `openInCircle`  
- `public/index.html`, `public/css/global.css`  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-ar-circle-batch-open-v1.js`  

**Cache:** `?v=20260724-tactical-ar-circle-batch-open-v1`  
**Verify:** `npm run verify:tactical-circle`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. Place a few POIs with linked fixed cams (and/or have BWC GPS on ops map)  
3. **Circle** → draw over them  
4. **Open in circle** → streams open; if >8 → “Opened N of total — wall full”  

Say **PASS** or **FAIL**.

## Next APPLY (ladder — no wait)

After **PASS:** `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`
