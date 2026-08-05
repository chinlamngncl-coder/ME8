# MOB-APPLIED: ANPR-STATIONARY-DWELL-FLUSH-V1

**Date:** 2026-08-03  
**Status:** APPLIED  
**Disc:** `MOB-DISC-ANPR-STATIONARY-NO-CAPTURE-DWELL-20260803.md`

## Goal

Stationary car in frame (e.g. NBE 8489) gets **one** rail card after a short dwell — do not wait for the car to leave.

## Changes (`lib/anprTrackBestFrame.js`)

1. **`FM_ANPR_DWELL_MS`** default **2500** — if track still in view, life ≥ dwell, and `bestSharpness ≥ FM_ANPR_DWELL_SHARP_FLOOR` (default **35**) → OCR flush once (`flushReason: dwell`).  
2. Track stays in map with **`emitted: true`** (matched by IoU) so the same car does **not** open a new track every 2.5s.  
3. When the car finally leaves: cleanup only (no second OCR if already dwell-emitted).  
4. **Exit flush** unchanged for cars that leave before dwell (plus sharp-hold for soft macros).  
5. Poller log includes `flushReason` / `dwellFlush`.

CPU-budget grab stretch + sharp-emit gate + cam emit block **kept**.

## Operator PASS

1. Restart ME8 → hard refresh → ANPR watch on.  
2. Hold white car / clear plate in frame ~3–5s → **one** Recent Plates card (plate or Unclear).  
3. Stay 30s more → **no** card spam.  
4. Driving pass that leaves before 2.5s still emits on exit.
