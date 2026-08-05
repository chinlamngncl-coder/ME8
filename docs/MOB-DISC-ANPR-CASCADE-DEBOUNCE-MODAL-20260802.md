# MOB-DISC — Cascaded crop, track debounce, health/modal stabilize

**Date:** 2026-08-02  
**Mandate:** CRITICAL FIXES — cascaded cropping, track debounce, modal, health check.

## Locked fixes

| # | Issue | Fix |
|---|--------|-----|
| 1 | Full-frame plate hunt | Cascaded only: YOLO vehicle → macro → WPOD/plate inside macro → dual OCR. No vehicle → skip plate OCR. Absolute plate coords offset by vehicle origin. |
| 2 | WS UI spam | Emit once per Track ID after harvest; block **3s** (`FM_ANPR_TRACK_EMIT_BLOCK_MS`). |
| 3 | UNCLEAR / Not available | Plate from `plate` / `plateCompact` / `dual.consensus.plate` / `rawText`. Health OK if `runtime.ok` **or** dual/fastalpr/ocr ready. |
| 4 | Magnifier dead | Magnifier opens ANPR `#ax-anpr-snap-lightbox` (macro+micro), not FrAlarm FR snap. `data-anpr-rail-scope` on cards. `window.openAnprModal` kept. |

## Operator

1. Restart **START-ANPR.bat** (loads `dual_lpr.cascade_plate_from_vehicle_macro`).
2. Restart ME8.
3. Hard-refresh (`?v=20260802-cascade-debounce-modal`).
4. Click magnifier → vehicle + plate lightbox.
5. Health badge should read **ANPR Engine — OK** when sidecar is up.
