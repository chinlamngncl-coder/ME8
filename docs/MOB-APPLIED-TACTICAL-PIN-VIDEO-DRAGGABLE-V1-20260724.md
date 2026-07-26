# MOB-APPLIED — TACTICAL-PIN-VIDEO-DRAGGABLE-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-PIN-VIDEO-DRAGGABLE-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-VIDEO-DRAGGABLE-20260724.md`

## What you get

Pin video bubbles are **draggable** on the Tactical map:

1. Drag handle on the popup title bar (grab cursor)  
2. Moves the **video panel only** — does not change POI / BWC GPS  
3. Spiderfy still runs on Open grabbed; after that **your drag wins**  
4. Close / Prev–Next / new grab resets park position  
5. Touch drag supported  

## Files

- `public/js/tactical-poi.js` — `enablePopupDrag`  
- `public/css/global.css` — drag handle  
- `public/index.html` cache  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-pin-video-draggable-v1.js`  

**Cache:** `?v=20260724-tactical-pin-video-draggable-v1`  
**Verify:** `npm run verify:tactical-drag-pin`

## Operator smoke

1. **Ctrl+F5** → **Tactical** → Open grabbed (or Open linked)  
2. Drag the **title bar** of a pin video  
3. Expect: bubble moves; map pin stays; you can clear a stacked / blocked spot  

Say **PASS** or **FAIL**.

## Next APPLY (ladder)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`
