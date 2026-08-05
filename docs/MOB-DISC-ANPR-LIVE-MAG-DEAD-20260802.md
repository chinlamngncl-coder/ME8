# MOB DISC — Live magnifier dead (2026-08-02)

**Status:** APPLIED — `ANPR-LIVE-MAG-OPEN-BY-INDEX-V1`  
**Genre:** ANPR Live rail UI

## Root cause (was)

Handlers preferred capture id; synthetic `idx_live_N` on the button was never on the tick → `findRailTick` miss → glass no-op.

## Applied

**File:** `public/js/anpr-live-watch.js` (+ cache bust)

1. **`data-anpr-open` = grid index** (0-based); `data-anpr-capture-id` secondary.
2. **`findRailTick`:** numeric index first; parse `idx_live_N` / `idx_offline_N`; then id/hitId/frameUuid.
3. **Paint stamps `t.id`** so button ids are never orphaned.
4. **`openKeyFromRailEl`:** always prefer `data-anpr-rail` index.
5. Capture-phase listener `_anprSnapOpenByIndexV1` + `stopImmediatePropagation` so older id-first handlers cannot eat the click.

Cache: `anpr-live-watch.js?v=20260802-mag-open-by-index-v1`

## PASS

1. Hard refresh.  
2. Live → Recent Plates → click glass → `#ax-anpr-snap-lightbox` with macro/micro.  
3. No `openAnprModal miss` in console.  
4. × / Esc / backdrop closes.
