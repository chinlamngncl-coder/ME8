# MOB-APPLY WEAPON-LIVE-TILE-EXPAND-V1 — APPLY lock

**Date:** 2026-08-11  
**Status:** APPLIED — operator PASS/FAIL after hard refresh

## Intent

Weapon Live: click a tile → fills the 6-grid; click again → back to grid (same as FR/ANPR).

## Files

- `public/js/weapon-live-watch.js` — `expandedTileId` + click on `.ax-wd-tile` (ignore buttons); clear on Stop  
- `public/css/global.css` — weapon `is-tile-expanded` / `is-expanded-hidden`  
- `public/index.html` — cache `?v=20260811-wd-tile-expand-v1`

## Operator check

1. Hard refresh → Analytics → Weapon.  
2. Start watch on a cam.  
3. Click the live tile → big.  
4. Click again → 6-grid.  
5. Pop-out / other buttons still work if present.
