# MOB-APPLIED: ANPR-LIVE-GUARANTEED-CROP-EMIT-V1

**Date:** 2026-08-03  
**Status:** APPLIED  
**Disc:** `MOB-DISC-ANPR-ZERO-SNAPSHOT-AFTER-DWELL-FAIL-20260803.md`

## Changes

1. **`FM_ANPR_DWELL_SHARP_FLOOR` default `0`** — dwell no longer requires sharpness ≥ 35 (`lib/anprTrackBestFrame.js`).  
2. Dwell fires on **timer + macro** while car still in view (no exit required).  
3. **Guaranteed rail crop** — Unclear + macro/micro still published; pairing hold no longer swallows crop-only ticks (`lib/anprLivePoller.js`).

## PASS

Restart ME8 → hold car ~3–5s → **≥1** Recent Plates card (plate or Unclear with crop).
