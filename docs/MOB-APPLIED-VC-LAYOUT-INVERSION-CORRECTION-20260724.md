# MOB APPLIED — VC-LAYOUT-INVERSION-CORRECTION

**Date:** 2026-07-24  
**FIX:** `MOB-FIX-VC-LAYOUT-INVERSION-CORRECTION`  
**Status:** APPLIED — operator PASS/FAIL pending  
**Cause:** Compact layout MOB collapsed the meeting video into a bottom strip and left a dead middle band.

---

## What was wrong

- Stage / body used `height: auto` and weak flex, so the middle did not claim space.
- Operations strip rules + overrides made the **people strip** feel like the main video.
- Spotlight tile did not reliably fill the main pane.

## What we fixed

| Fix | Detail |
|-----|--------|
| Column fill | `#vc-panel-live` → `#vc-stage` → canvas → body all `flex: 1 1 0%` / `height: 100%` between top chrome and dock |
| Speaker | Row layout; **main spotlight fills height**; filmstrip stays on the **side** |
| Operations | Spotlight **`flex: 1`** (main); people strip fixed ~96px footer only |
| Spotlight media | Tile `position: absolute; inset: 0`; `object-fit: contain` |
| Gallery fallback | `repeat(auto-fit, minmax(280px, 1fr))` filling the stage |
| JS | Operations without share uses Speaker chrome (side strip + full main) |

## Files

- `public/index.html` (CSS)
- `public/js/conference-layout.js` (mission class stamp)
- `public/js/vc-lazy.js` (cache)
- `scripts/verify-vc-layout-inversion-correction.js`

**Cache:** `?v=20260724-vc-layout-inversion-correction`

## Operator smoke

1. **Ctrl+F5** (required).  
2. Join VC.  
3. **PASS look:** large video in the **middle** of the screen (between room controls and bottom dock). Not a thin bar at the bottom with empty black above.  
4. Speaker = big main + side strip. Operations (with share) = big content above + thin people strip. Focus = one full feed.

Say **PASS** or **FAIL**.
