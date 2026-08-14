# MOB-DISC — ANPR: PaddleOCR vs FastALPR logs (what actually ran)

**Date:** 2026-08-12  
**Status:** paper lock — no code this disc  
**Trigger:** Operator paste of `START-ANPR.bat` window still saying FastALPR + `ccpd_pose`

---

## Operator question

“See, done? CCP was not good. Have you even done it?”

**Answer:** The **live OCR function** was switched to PaddleOCR in `dual_lpr.py`. Stage-2 **pose warp** was replaced with **YOLOv8 bbox slice** in `plate_pose_ccpd.py`. The **window you pasted is not proof of either**. It is boot chrome + FastALPR still loading in the background.

---

## What the pasted log actually is

| Line | What it is | What it is not |
|------|------------|----------------|
| `ANPR sidecar (FastALPR ship default)` | Stale text in `START-ANPR.bat` | Not the OCR engine that runs on a crop |
| `Live/BWC: FastALPR + cct-s-v2-global` | Same bat echo | Not PaddleOCR |
| `FM_ANPR_PLATE_DET=ccpd_pose` | Bat still sets this default | Does **not** mean old 4-corner pose is still the crop math |
| `[anpr-stage2] soft-skip boot gate — ccpd_pose (CCPD/baseline)` | `plate_yolo.py` skips **ultralytics ph_id** when env is `ccpd_pose` | Does **not** mean CCPD pose warp ran |
| `open_image_models ... yolo_v9` | **FastALPR** detector ONNX loading (`fastalpr_engine`) | **Not** PaddleOCR. Paddle would log `[PADDLE-DEBUG]` |

There is **no** `[PADDLE-DEBUG]` / `RAW OCR RESULT` / `YOLO-bbox` in the paste. So this window never reached Stage-2 crop → Paddle on a live plate.

---

## What was actually changed (code on disk)

1. **OCR (live Engine A)** — `anpr-sidecar/dual_lpr.py`  
   `engine_a_fastlpr()` no longer calls `read_with_fastalpr`. It calls `read_with_paddleocr()` → `ocr.ocr(plate_crop, cls=True)`.

2. **Stage 2 crop** — `anpr-sidecar/plate_pose_ccpd.py`  
   CCPD 4-corner `warpPerspective` was ripped. Same function name `localize_plate_native_warp()` now does YOLOv8 **bbox** → unpad `÷ scale` → numpy slice.  
   Env `FM_ANPR_PLATE_DET=ccpd_pose` still **selects this file**. The name is leftover. The pose math is gone.

3. **Not changed (why the window still looks FastALPR)**  
   - `START-ANPR.bat` title, echoes, `FM_ANPR_ENGINE=fastalpr`  
   - `app.py` / `pipeline.py` health still treat FastALPR as ship engine (`fa["ready"]`)  
   - That health/init path **still loads** FastALPR → `open_image_models` YOLO v9 log  
   - Boot line in `plate_yolo.py` still prints “CCPD/baseline” for `ccpd_pose`

---

## Why Paddle can be “in the file” and still silent

Paddle only runs **after** native ingest gets a vehicle crop **and** Stage 2 returns a plate box.

If Stage 2 misses (`no_plate_box`) we **drop the frame** (macro OCR fallback was removed). Then: no `engine_a`, no `[PADDLE-DEBUG]`.

FastALPR can still **load** on `/health` even when live OCR is Paddle.

---

## Locked facts

- Live crop OCR intended path = **PaddleOCR**, not FastALPR CCT.  
- Stage 2 intended path = **bbox slice** in `plate_pose_ccpd.py`, not CCPD 4-corner warp.  
- Operator log paste = **boot + FastALPR still imported**, not a Paddle PASS/FAIL.  
- PASS for Paddle = Python window shows `[PADDLE-DEBUG] Attempting OCR` then `RAW OCR RESULT`.

---

## Next APPLY (one)

`ANPR-BOOT-TRUTH-PADDLE-BBOX-V1`

- Bat + health strings: PaddleOCR + YOLO bbox (stop lying FastALPR).  
- Stop loading FastALPR on sidecar boot/health unless hatch `FM_ANPR_ENGINE=fastalpr`.  
- Boot log: `ccpd_pose` → “Stage2 bbox (`plate_pose_ccpd.py`)” not “CCPD/baseline”.

Operator: restart `START-ANPR.bat`, turn Live ANPR on a **live** cam, look for `[PADDLE-DEBUG]` — not the bat header.
