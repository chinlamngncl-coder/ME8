# MOB DISC — ANPR-PLATE-DETECT-ROI-V1 APPLIED

**Date:** 2026-07-29  
**Status:** **APPLIED** — operator **field FAIL** on yellow PUV tight crop (`RP07032017-tuch.jpg` / WOO·185) — see `MOB-DISC-ANPR-ROI-V1-FIELD-FAIL-YELLOW-PUV-20260729.md`  
**Partial PASS:** synthetic bumper scene (WZT 539) · **FAIL:** operator yellow PUV crop  
**APPLY:** go ahead / `ANPR-PLATE-DETECT-ROI-V1`  
**Parent:** `MOB-DISC-ANPR-MOB601-SHELL-PASS-FIELD-QUALITY-FAIL-20260729.md`

---

## What changed

| Piece | Change |
|-------|--------|
| Detect | `anpr-sidecar/plate_roi.py` — OpenCV morphology + Paddle line geometry (ban UV EXPRESS / DON'T TOUCH / phones); optional YOLO if weights load |
| OCR | Only on plate ROI crops; slogan lines filtered; prefer digit-bearing plate-like lines |
| Fail soft | `plate_not_found` if no ROI; format/low-conf still soft-fail |
| Default | Detect **ON** (Node + API); `skip_yolo`/`skip_detect` lab hatch only |
| Fallback | Tight crop / failed ROIs → one full-frame OCR attempt |

## Lab smoke (agent)

| Image | Result |
|-------|--------|
| Synthetic Case B (big **UV Express Service** + plate **WZT 539**) | **WZT 539** @ 100% (`paddle_line` ROI) |
| Synthetic **AAJ 8008** + NCR | **AAJ 8008** (`full_fallback` after bad NCR ROI) |

## Operator check

1. **Restart** `START-ANPR.bat` (Python code changed).  
2. Restart Fleet; hard-refresh Analytics → **ANPR**.  
3. Re-test night van (**WZT 539** / prior **HWZ 1539** fail) and yellow PUV crop.  
4. **PASS** if plate text matches human and bumper slogans do not become the plate.  
5. Still OK to soft-fail hard blur — not OK to publish wrong `AAA####` from UV EXPRESS.

## Still later

`ANPR-PH-OCR-HARDEN-V1` · plate YOLO weights pack · lists · live/offline · ship pack parity.
