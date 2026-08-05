# MOB DISC — Magnifier dead Live + Offline (2026-08-02)

**Status:** APPLIED — `ANPR-MAG-RAILBYSCOPE-FIX-V1`  
**Surfaces:** Live + Offline Recent Plates

## Root cause (was)

`findRailTick` called `railByScope` but the function was **missing** → every glass click threw `ReferenceError` before lightbox.

## Applied

**File:** `public/js/anpr-live-watch.js`

1. Added `railByScope(scope)` → `offlineRail` / `liveRail`.
2. Kept index-first `findRailTick` / `openKeyFromRailEl`.
3. `openAnprModal` wrapped in try/catch → logs `[anpr] openAnprModal err` if anything else throws.

Cache: `anpr-live-watch.js?v=20260802-mag-railbyscope-fix-v1`

## PASS

1. Hard refresh (must load new `?v=`).  
2. Live glass → lightbox.  
3. Offline glass → lightbox.  
4. Console: no `railByScope is not defined`.
