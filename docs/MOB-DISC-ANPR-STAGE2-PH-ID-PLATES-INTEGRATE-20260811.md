# MOB — ANPR Stage-2 PH ID plates integrate — 2026-08-11

**Status:** APPLIED (pipeline). Restart ANPR sidecar **8768** to load.

## Change

| Stage | Behavior |
|-------|----------|
| 1 | Vehicle YOLO crop — **unchanged** |
| 2 | **`ai_engine/weights/ph_id_plates_best.pt`** inside vehicle crop (replaces CCPD / WPOD / FastALPR-as-detector) |
| OCR | FastALPR live / HyperLPR heavy — **unchanged** |
| Track | `anprTrackBestFrame` IoU + best macros + consensus — **unchanged** |

Default: `FM_ANPR_PLATE_DET=ph_id_yolo`  
Legacy hatch: `legacy_ccpd` / `wpod` only if set.

## Files

- `anpr-sidecar/plate_yolo.py` — stage2 path + `localize_plate_in_vehicle_crop`
- `anpr-sidecar/dual_lpr.py` — cascade Stage 2
- `anpr-sidecar/pipeline.py` — health strings
- `ai_engine/weights/README.txt`

## Operator

Restart sidecar → `/health` shows `stage2Plate: ready` + Det: Stage2 ph_id_plates_best.pt OK → live plate smoke.
