# MOB DISC — ANPR-FASTALPR-SHIP-DEFAULT-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **APPLIED** · ship default locked  
**MOB:** `ANPR-FASTALPR-SHIP-DEFAULT-V1`  
**Prior:** Eval field PASS (yellow **WOO 185** @ 98%) · night PASS (operator)  
**Related:** `MOB-DISC-ANPR-FASTALPR-EVAL-V1-FIELD-PASS-20260730.md`

---

## What shipped

| Item | Detail |
|------|--------|
| Default engine | **FastALPR** (`FM_ANPR_ENGINE=fastalpr`) |
| Engine tag | `fastalpr-ship-v1` |
| Health | `shipDefault: fastalpr` |
| START-ANPR.bat | Sets FastALPR; checks `fast_alpr` import |
| Node auto-spawn | Passes `FM_ANPR_ENGINE=fastalpr` |
| INSTALL.ps1 | Installs deps + warms FastALPR models |
| Hatch | `FM_ANPR_ENGINE=paddle` only (not ship default) |

---

## Locked product facts

- Soft fail + PH regex + ≥80% floor **remain** as validators.  
- Paddle-as-ANPR core **rejected** for product face.  
- ZLM / WVP untouched (read-only CV).

---

## Operator

Restart **one** `START-ANPR.bat` if needed. Hard refresh ANPR. Health should show `fastalpr-ship-v1`.

No further action required for this MOB unless regression.

---

## Lock record

| Item | Decision |
|------|----------|
| Ship ANPR engine | **FastALPR** |
| Eval → ship | **Done** |
| Code | **APPLIED** |
