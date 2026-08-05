# MOB-APPLIED: ANPR-OCR-CCT-S-GLOBAL-V1

**Date:** 2026-08-03  
**Status:** APPLIED  
**Disc:** `MOB-DISC-ANPR-OCR-NAI2170-FAIL-MIT-ENGINES-20260803.md`

## Changes

1. **OCR model** — FastALPR default `cct-xs-v2-global-model` → **`cct-s-v2-global-model`** (MIT).  
   Files: `fastalpr_engine.py`, `START-ANPR.bat`, `INSTALL.ps1`, `anprSidecarClient.js`

2. **Temporal char-majority vote** — per-track digit vote then letter vote; lock only after **≥2** samples (`FM_ANPR_TEMPORAL_MIN_LOCK=2`). Stops publishing four different wrong whole-strings for one car.  
   File: `dual_lpr.py` (`char_majority_plate`, `temporal_push`, live `ok` requires `temporalLocked`)

3. **PH soft confusion after vote** — letter block `1→I` / `0→O`; digit block `I→1` / `O→0` / `L→1`.  
   File: `dual_lpr.py` (`ph_soft_confusion`)

## Operator

1. Stop old ANPR window; run **`START-ANPR.bat`** (first run downloads `cct-s` weights — wait).  
2. Hard refresh dashboard.  
3. PASS: same SUV **NAI 2170** → rail shows **NAI 2170** (not four of KAD/WAI/XA/NA1217).  
4. Health `fastalprOcr` should show `cct-s-v2-global-model`.
