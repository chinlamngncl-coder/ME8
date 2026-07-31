# MOB DISC — COMMAND-WALL-FILL-COVER-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **PASS** (operator confirmed 2026-07-30)  
**APPLY:** `MOB-APPLY COMMAND-WALL-FILL-COVER-V1`  
**Parent:** `MOB-DISC-COMMAND-WALL-RECOMMEND-COVER-FILL-20260730.md`

---

## What changed

Command Wall live video uses **`object-fit: cover`** so cells fill edge-to-edge (no tall side blacks). Slight edge crop OK.

| Surface | Fit |
|---------|-----|
| Command Wall (`#app-view-command-wall` / popout `command-wall.html`) | **cover** |
| Ops wall, map pin, FR tiles, VC | Unchanged (**contain**) |

## Files

- `public/index.html` — CW CSS `cover !important`
- `public/command-wall.html` — popout same
- `public/js/live-player-factory.js` — `objectFitCssForHost` for CW hosts
- Cache: `live-player-factory.js?v=20260730-cw-fill-cover-v1`

## Operator verify

1. Hard refresh → Command Wall → Chin / kk Live.
2. **PASS:** cell filled, no tall black left/right pillars.
3. **FAIL:** severe crop (faces cut) or Ops/pin look changed — say so; revert is one flip back to contain.

**Operator result (2026-07-30):** **PASS**

## Lock

Command Wall mosaic = cover fill. Other live surfaces stay contain unless separately APPLYed.
