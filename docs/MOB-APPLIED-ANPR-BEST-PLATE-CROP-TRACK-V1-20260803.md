# MOB-APPLIED: ANPR-BEST-PLATE-CROP-TRACK-V1

**Date:** 2026-08-03  
**Status:** APPLIED  
**Disc:** `MOB-DISC-ANPR-CROP-VS-ARU-MOVE-BEST-PLATE-20260803.md`

## Goal

ARU-Move-like evidence: track → tight plate micro → OCR best crop (open stack only).

## Changes

1. **Tighter CCPD crop** — pad clamp **8–12%** (default `0.10`); deskew-fail / bypass → `minAreaRect` keypoints + 1.05× grow + pad (`plate_pose_ccpd.py`).

2. **Per-track top-K plate rank** — score = area × log(sharpness) × warp/deskew bonus; keep K=3; OCR when **new best** / force-flush / no cache; else reuse OCR cache (`ocrSkipped: not_new_best`).  
   File: `dual_lpr.py` (`consider_plate_crop`, cascade in vehicle→plate).

3. **UI micro** — rail shows **tight detector crop**, not enhanced OCR buffer (`uiMicro`).

4. **Speed** — skip `enhance_plate_crop` when Laplacian fm ≥ `FM_ANPR_ENHANCE_SKIP_FM` (default **80**).

5. **Env / health** — `FM_ANPR_BOX_PAD`, `FM_ANPR_PLATE_RANK_K`, `FM_ANPR_ENHANCE_SKIP_FM` in `START-ANPR.bat` + `anprSidecarClient.js`; `/health` → `bestPlateCrop` + shipStack BestPlate line.

## Operator

1. Stop old ANPR; run **`START-ANPR.bat`**.  
2. Hard refresh dashboard.  
3. PASS: same SUV (e.g. **NAI 2170**) — micro **tight on plate** (little bumper), rail **one** strong card, fewer OCR stalls on mediocre flushes.  
4. Health `bestPlateCrop.boxPad` ≈ `0.10`, `rankK` = `3`.
