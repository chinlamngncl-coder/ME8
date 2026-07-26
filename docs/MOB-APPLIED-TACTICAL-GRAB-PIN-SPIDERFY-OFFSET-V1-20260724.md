# MOB-APPLIED — TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1`  
**Disc:** `MOB-DISC-TACTICAL-PIN-LR-TB-NOT-SCREEN-DOCK-20260724.md`  
**Rejects:** edge tile bank as Operate face

## What you get

**Open grabbed** stays **on the map / in the zone**:

1. Pin video popups for cams in the grab (cap 8)  
2. If GPS is near (≤45 m): popup bubbles **fan L / R / T / B** (then diagonals) so they don’t stack  
3. Prev/Next pages which pins in the zone are live  
4. **No** screen-edge tile bank (removed from Tactical HTML)  
5. Open linked still uses a single pin popup  

## Files

- `public/js/tactical-poi.js` — `assignSpiderOffsets`, grab → pin live  
- `public/index.html` — bank UI removed; cycle back on OPERATE rail  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-grab-pin-spiderfy-offset-v1.js`  

**Cache:** `?v=20260724-tactical-grab-pin-spiderfy-offset-v1`  
**Verify:** `npm run verify:tactical-spiderfy`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. Grab circle over **near GPS** cams → **Open grabbed**  
3. Expect: **pin videos on the map**, fanned apart if stacked — **no** right/left dock wall  
4. Toast may say “GPS near — fanned L/R/T/B”  

Say **PASS** or **FAIL**.

## Next APPLY (ladder)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`  
Dual-pane stays a later genre (not a pin substitute).
