# MOB DISC — ANPR-FASTALPR-EVAL-V1 field PASS

**Date:** 2026-07-30  
**Status:** **PASS** · promoted to ship — see `MOB-DISC-ANPR-FASTALPR-SHIP-DEFAULT-V1-APPLIED.md`  
**MOB:** `ANPR-FASTALPR-EVAL-V1`  
**Evidence:** Screenshot — `RP07032017-tuch.jpg` → **WOO 185** @ **98%** (green PLATE READ card)  
**Related:**  
- `MOB-DISC-ANPR-FASTALPR-EVAL-V1-APPLIED.md`  
- `MOB-DISC-ANPR-YOLO-PACK-FIELD-FAIL-LEAVE-UNI-OCR-20260730.md`

---

## Plain English

1. Operator: **“really good.”** Yellow PUV field photo that failed every Paddle/YOLO-OCR patch now reads correctly.  
2. **WOO 185** @ **98%** — same file `RP07032017-tuch.jpg` that was format-reject / plate-not-found before.  
3. Free FastALPR (global plate OCR) wins this bake-off vs uni-style Paddle-on-crop. **Keep FastALPR as default lab engine.**

---

## Evidence

| Item | Value |
|------|--------|
| File | `RP07032017-tuch.jpg` |
| Human / card | **WOO 185** |
| Confidence | **98%** |
| UI | Green PLATE READ · not soft fail |
| Engine | `fastalpr-eval-v1` (YOLO-v9 plate det + `cct-xs-v2-global`) |

---

## What this proves

| Lesson | Lock |
|--------|------|
| Generic document OCR (Paddle) on PH yellow | **Not ship core** |
| Plate-native / global ALPR OCR | **Correct class** |
| Soft fail + PH regex floor | Still useful as validator — did not block this PASS |
| YOLO pack alone | Detect helped; **reader** was the gap |

---

## Product direction (next — discuss, then APPLY)

| Priority | MOB / action | Why |
|----------|--------------|-----|
| 1 | Spot-check **night van** still PASS on FastALPR | Regression |
| 2 | **`ANPR-FASTALPR-SHIP-DEFAULT-V1`** — lock FastALPR as ship default (pack deps, INSTALL, health, manuals later) | Promote eval → product |
| 3 | Optional: try `global-plates-mobile-vit-v2-model` if any edge FAIL | Same stack, better OCR pack |
| 4 | Later: supplier CN SDKs bake-off only if FastALPR gaps appear | You can buy later — free path worked |

**Do not:** revert to Paddle as default · HyperLPR3 for PH · lower floor.

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| FastALPR eval field (yellow PUV) | **PASS** |
| Night van on FastALPR | **Pending spot-check** |
| Ship default lock | Not yet — next APPLY |

---

## Operator decide

When ready:

- Spot-check night, then say **`MOB-APPLY ANPR-FASTALPR-SHIP-DEFAULT-V1`**  
  or just **PASS** on night and we name the ship MOB then.

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| FastALPR eval yellow | **PASS** |
| Engine class | Plate/global ALPR — keep |
| Paddle-as-ANPR core | **Rejected** for this product face |
| Code | **None** until next APPLY |
