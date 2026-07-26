# MOB APPLIED — TACTICAL-DRAW-DELETE-LIST-UX-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY TACTICAL-DRAW-DELETE-LIST-UX-V1`  
**Disc:** `MOB-DISC-TACTICAL-DRAW-DELETE-LIST-UX-20260724.md`  
**Status:** APPLIED — operator PASS/FAIL pending  

---

## Fixes

| Issue | Fix |
|-------|-----|
| Delete stuck on **Deleting** | One-shot: arm Delete → **click shape** → gone immediately |
| Status never said Deleted | Status → **Deleted**; Delete button disarms |
| Zone row faint `123 · polygon` | Bold **Incident ID** + **Polygon/Circle** badge |

Edit still: tap Edit → change → tap Edit again to finish (unchanged).  
Esc cancels armed Delete.

## Out of scope

Turf, socket vault, Ops map, APK, VC.

## Files

- `public/js/tactical-shell.js`  
- `public/css/global.css`  
- `public/locales/en.json`  
- `public/index.html` (cache)  
- `scripts/verify-tactical-draw-delete-list-ux-v1.js`  

**Cache:** `?v=20260724-tactical-draw-delete-list-ux-v1`  
**Verify:** `npm run verify:tactical-delete-ux`

## Operator smoke

1. Ctrl+F5 → **Tactical**.  
2. Incident ID → draw Polygon → **Save zone** → row shows **ID** + **[Polygon]** badge.  
3. **Delete** → click the shape on the map → shape + row gone; status **Deleted** (not stuck Deleting).  
4. Ops map unchanged.

Say **PASS** or **FAIL**.
