# MOB DISC — ANPR-PLATE-YOLO-PACK-AND-READ-V1 APPLIED

**Date:** 2026-07-29  
**Status:** **APPLIED** · field **FAIL** — see `MOB-DISC-ANPR-YOLO-PACK-FIELD-FAIL-LEAVE-UNI-OCR-20260730.md`  
**MOB:** `ANPR-PLATE-YOLO-PACK-AND-READ-V1`  
**Related:** `MOB-DISC-ANPR-YELLOW-PUV-LOCK-V1-FIELD-FAIL-20260729.md`

---

## What shipped

| Item | Detail |
|------|--------|
| Weights | `anpr-sidecar/models/plate_yolo11n.onnx` (+ optional `.pt`) — morsetechlab YOLOv11n plate detect |
| Runtime | **onnxruntime** first (no torch) · Ultralytics `.pt` fallback |
| Detect policy | **YOLO-first** — if plate YOLO hits, OCR **only** those crops |
| Post | Yellow-lock ban-per-line · badge `:` · W00→WOO · CLAHE/upscale keep |
| Engine tag | `mob601-plate-yolo-pack-v1` |
| Install | `INSTALL.ps1` downloads ONNX + pins `protobuf<=3.20.2` for Windows Paddle |

---

## Lab smoke

Synthetic yellow plate + UV Express bumper → **WOO 185** @ 84% · `det.source=yolo` · `ocrMode=main_band` · **PASS**

Health: `yolo: ready` · `yoloKind: onnx` · `ocr: ready` · `plateYoloPack: v1`

---

## Operator verify (now)

1. Hard refresh Analytics → ANPR (sidecar already restarted with pack).  
2. Retest **`RP07032017-tuch.jpg`** → expect **WOO 185**.  
3. Spot-check night van still PASS.

If port 8768 busy: close other ANPR windows, run **one** `START-ANPR.bat`.

---

## Not in this MOB

- LPRNet plate recognizer (`ANPR-PLATE-RECOGNIZER-V1`)  
- ultimateALPR / HyperLPR3  
- Fine-tune on PH-only dataset (follow-on if field still weak)

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| Code + weights pack | **DONE** |
| Lab synth yellow | **PASS** |
| Field yellow photo | **Pending you** |
| Night regression | **Pending spot-check** |
