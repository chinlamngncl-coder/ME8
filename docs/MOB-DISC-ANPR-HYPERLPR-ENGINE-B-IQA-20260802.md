# MOB DISC — ANPR HyperLPR Engine B + micro Laplacian IQA (2026-08-02)

**Status:** APPLIED (operator execute immediately)  
**Scope:** Python sidecar only — no UI, no pose crop geometry change.

## Locked

- Engine A: FastALPR  
- Engine B: **HyperLPR3** (hatch `FM_ANPR_ENGINE_B=ppocrv4`)  
- Detection: CCPD YOLOv8-pose native warp (unchanged)  
- Micro IQA: Laplacian `fm < FM_ANPR_MICRO_BLUR_FLOOR` (default **100**) → discard, no OCR  
- Temporal tracker: keep only sharpest N `(plate, fm)` samples; lock prefers high fm  

## Startup banner

`Ship engine: DUAL (FastALPR + HyperLPR) | Detection: CCPD YOLO Pose`

## PASS

1. Restart `START-ANPR.bat`  
2. Health: `hyperlpr=ready`, `shipStack` dual+HyperLPR, `microBlurFloor=100`  
3. Blurry micros do not invent plates; sharp frames still dual-OCR  
