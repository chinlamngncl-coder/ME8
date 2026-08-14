# MOB-APPLIED ANPR-S2-REJECT-SQUARE-CROP-AND-NO-RESTART-V1 (2026-08-13)

## APPLY
`MOB-APPLY ANPR-S2-REJECT-SQUARE-CROP-AND-NO-RESTART-V1`

## Why
1. Stage-2 wrote `debug_ocr_crop.jpg` shape `(47, 48)` (near-square) → RapidOCR empty text.
2. Repeated `/watch/start` for same cam+URL stopped the live capture mid-read.

## Changes
1. `anpr-sidecar/plate_pose_ccpd.py` — after min size, reject crop if aspect not in `[1.6, 8.0]` (env `FM_ANPR_S2_MIN_ASPECT` / `FM_ANPR_S2_MAX_ASPECT`). Log `[ANPR-S2-RAW] aspect_reject`.
2. `anpr-sidecar/native_watch.py` — `start_watch`: if same cam + same URL + thread still alive → reuse, no stop/spawn.

## Operator
Restart **START-ANPR.bat** only. Start watch once. Expect: no OCR on square crops; no triple `watch stopped` storm for same URL.
