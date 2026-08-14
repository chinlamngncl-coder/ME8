# MOB-APPLY ANPR-HEALTH-500-FIX-V1 — APPLY lock

**Date:** 2026-08-11  
**Status:** APPLIED — **restart START-ANPR.bat** (old process still has broken import)

## Root cause (lab)

Seatbelt APPLY left a **SyntaxError** in `plate_yolo.py` (`global` after use of `_stage2_error`).  
Import of `yolo_engine_status` failed → `/health` **HTTP 500** → UI **ANPR Engine — Not available** for ~1h+.

Agent should have caught this in the seatbelt MOB — **that was our miss.**

## Fix

1. Move `global` to top of `localize_plate_in_vehicle_crop`  
2. `/health` + `health_payload` never throw 500 (catch → `ok: false` JSON)  
3. Verified local: `health_payload()` → **`ok: True`**, FastALPR ready  

## Customer risk

**Yes — any ship with the broken SyntaxError would show the same Not available.**  
This APPLY must be in the tree **before** customer pack. Health harden is for any future status bugs too.

## Operator

1. Close ANPR bat / kill PID on 8768  
2. Run **START-ANPR.bat** again  
3. Hard refresh ANPR Live → badge **OK** → plate smoke  
