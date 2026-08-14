# MOB-APPLY ANPR-STAGE2-SAFE-FALLBACK-V1 — APPLY lock

**Date:** 2026-08-11  
**Status:** APPLIED — restart ANPR sidecar **8768** (one process)

## Intent

Keep **Stage 1 vehicle** + **ph_id Stage 2 enhance** + FastALPR OCR.  
**Seatbelt:** if ph_id missing / load fail / no crop → **CCPD** so captures still work. Health must not force-load Ultralytics.

## Behavior

```text
vehicle → try ph_id → if no plate crop → CCPD → OCR
```

- `FM_ANPR_PLATE_DET=ph_id_only` — no CCPD  
- `FM_ANPR_PLATE_DET=ccpd_pose` — CCPD only  

## Files

- `anpr-sidecar/plate_yolo.py` — one-shot load, disable on fail, light health  
- `anpr-sidecar/dual_lpr.py` — auto CCPD seatbelt  
- `anpr-sidecar/pipeline.py` — health string  

## Operator

Restart sidecar → Engine should stay up → live plate smoke. Say PASS/FAIL.
