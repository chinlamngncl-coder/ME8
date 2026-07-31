# MOB DISC — ANPR-YELLOW-PUV-LOCK-V1 APPLIED

**Date:** 2026-07-29  
**Status:** **APPLIED** · field **FAIL** — see `MOB-DISC-ANPR-YELLOW-PUV-LOCK-V1-FIELD-FAIL-20260729.md`  
**MOB:** `ANPR-YELLOW-PUV-LOCK-V1`  
**Related:**  
- `MOB-DISC-ANPR-YELLOW-FAIL-NIGHT-PASS-20260729.md`  
- `MOB-DISC-ANPR-STOP-HARDCODE-PLATE-NATIVE-ENGINE-20260729.md`

---

## What shipped

| # | Change | File |
|---|--------|------|
| 1 | Ban **per line** — footer `NCR UV EXP` / `TOUCH` no longer kills a locked main line | `pipeline.py` `lock_plate_from_raw` |
| 2 | PH badge separators `: · . \|` → space before compact | `normalize_ph_badge_separators` |
| 3 | Main-line band whenever **yellow_puv** profile (not only tight full-frame) | `_try_roi_read` |
| 4 | Prefer shortest digit line over slogan join | `run_paddle` |
| 5 | **Yellow hint ROI** on mid-lower yellow paint for wide rear shots | `plate_roi.py` `yellow_hint_roi` |
| 6 | Keep O↔0 / I↔J bounded variants + ≥80% + regex | unchanged floors |

Engine: **`mob601-yellow-puv-lock-v1`**

---

## Operator verify

1. **Kill old ANPR** if port busy — one sidecar only.  
2. Restart `START-ANPR.bat` (or confirm health `yellowLock: v1`).  
3. Hard refresh Analytics → ANPR.  
4. Retest **`RP07032017-tuch.jpg`** → expect **WOO 185** (not format reject).  
5. Spot-check **night van** still PASS.

---

## Not in this MOB

- Plate-native recognizer (see strategy disc)  
- HyperLPR swap  
- Lowering regex / confidence floor  

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| Code APPLY | **DONE** |
| Yellow field | **Pending your PASS/FAIL** |
| Night regression | **Pending spot-check** |
