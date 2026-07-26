# MOB-APPLIED — TACTICAL-GRAB-RESULT-TILE-BANK-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-GRAB-RESULT-TILE-BANK-V1`  
**Disc:** `MOB-DISC-PIN-STACK-GPS-NEAR-LR-TB-20260724.md`

## What you get

**Open grabbed** fills a **tile bank** beside/around the map — not stacked pin popups:

1. Map keeps grab circle + location markers (no multi-popup pile)  
2. Up to **8** live tiles in dock: **Right / Left / Top / Bottom** (select in bank header; remembered)  
3. BWC + fixed from grab → FLV in tiles (same playback paths; not wall dump)  
4. **Prev / Next** when grab set > 8  
5. **Close** clears the bank  
6. Single **Open linked** still may use pin popup  

## Files

- `public/js/tactical-poi.js`  
- `public/index.html`, `public/css/global.css`  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-grab-result-tile-bank-v1.js`  

**Cache:** `?v=20260724-tactical-grab-result-tile-bank-v1`  
**Verify:** `npm run verify:tactical-tile-bank`

## Operator smoke

**REJECTED (2026-07-24):** Edge tile bank is not the Tactical pin layout. See `MOB-DISC-TACTICAL-PIN-LR-TB-NOT-SCREEN-DOCK-20260724.md`.

Do not treat this APPLY as PASS for Operate.

## Next APPLY

`MOB-APPLY TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1`
