# MOB DISC — ANPR-FASTALPR-EVAL-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **APPLIED** · field **PASS** — see `MOB-DISC-ANPR-FASTALPR-EVAL-V1-FIELD-PASS-20260730.md`  
**MOB:** `ANPR-FASTALPR-EVAL-V1`  
**Related:** free bake-off after YOLO+Paddle field FAIL

---

## What shipped

| Item | Detail |
|------|--------|
| Engine | **FastALPR** (`yolo-v9-t-384` detect + `cct-xs-v2-global` OCR) |
| Default | `FM_ANPR_ENGINE=fastalpr` via `START-ANPR.bat` |
| Fallback | `FM_ANPR_ENGINE=paddle` → old YOLO+Paddle path |
| Post | PH regex lock + ≥80% floor (yellow-lock helpers kept) |
| Tag | `fastalpr-eval-v1` |

Files: `anpr-sidecar/fastalpr_engine.py`, `pipeline.py`, `START-ANPR.bat`, `requirements.txt`

---

## Lab smoke

Synthetic yellow + UV Express bumper → **WOO 185** @ **99%** · `engine: fastalpr-eval-v1` · **PASS**

---

## Operator verify

1. Close extra ANPR windows.  
2. Run **`START-ANPR.bat`** once (or use the FastALPR process already started).  
3. Hard refresh Analytics → ANPR.  
4. Retest **`RP07032017-tuch.jpg`** → expect **WOO 185**.  
5. Spot-check night van.  
6. Reply **PASS** / **FAIL**.

Health should show: `engine: fastalpr-eval-v1`, `fastalpr: ready`.

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| Code APPLY | **DONE** |
| Lab synth | **PASS** |
| Field yellow | **Pending you** |
