# MOB-APPLIED: mob-wall-soft-zlm-live-chase-v1

**Date:** 2026-07-16  
**Status:** APPLIED  
**File:** `public/js/live-player-factory.js`  
**Cache:** `?v=20260716-wall-chase-geom`

## What

Port lab soft live catch onto **wall** `softAttachZlmOverlay`:

- Soft rate `1.12×` when buffer debt > 1.5s  
- Hard snap when debt > 10s  
- Hard `liveBufferLatencyChasing` stays **OFF** (same as lab tile)

## Operator

1. **`RESTART-FLEET.bat`** (server: geometry MOB)  
2. Hard refresh (chase JS)  
3. Play normal panel → pass/fail on lag + picture  
