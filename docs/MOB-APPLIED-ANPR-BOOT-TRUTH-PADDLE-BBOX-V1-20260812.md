# MOB-APPLIED — ANPR-BOOT-TRUTH-PADDLE-BBOX-V1

**Date:** 2026-08-12  
**APPLY:** `ANPR-BOOT-TRUTH-PADDLE-BBOX-V1`  
**Disc:** `docs/MOB-DISC-ANPR-PADDLE-VS-FASTALPR-LOGS-20260812.md`

## Changed

- `START-ANPR.bat` — title/echo = PaddleOCR + YOLO bbox; default `FM_ANPR_ENGINE=paddleocr`; venv check imports `paddleocr` not `fast_alpr`.
- `anpr-sidecar/app.py` — API title PaddleOCR; boot comment matches bbox path.
- `anpr-sidecar/plate_yolo.py` — boot log: Stage2 bbox via `plate_pose_ccpd.py` (not “CCPD/baseline”).
- `anpr-sidecar/pipeline.py` — default engine `paddleocr`; `/health` does **not** call `fastalpr_status()` unless `FM_ANPR_ENGINE=fastalpr`.

## Hatch

`FM_ANPR_ENGINE=fastalpr` before `START-ANPR.bat` still loads FastALPR.

## Operator

Close the old ANPR window. Run `START-ANPR.bat` again. Header must say PaddleOCR. Must **not** see `open_image_models ... yolo_v9` unless hatch. Then Live ANPR on a live cam → look for `[PADDLE-DEBUG]`.
