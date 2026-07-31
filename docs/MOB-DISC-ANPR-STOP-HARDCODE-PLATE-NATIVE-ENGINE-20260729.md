# MOB DISC — Stop hardcoding every plate · plate-native engine direction

**Date:** 2026-07-29  
**Status:** **OPEN FOR DISCUSSION** — strategy · no engine swap until named APPLY  
**Trigger:** Operator — “so many plate types… hardcode one by one kills us”; ask for powerful Chinese options that are **not** old-school OCR  
**Related:**  
- `MOB-DISC-ANPR-YELLOW-PUV-LOCK-V1-APPLIED.md` (tactical PH fix — still needed)  
- `MOB-DISC-ANPR-MOB601-CONSOLIDATE-YOLO-PADDLE-20260729.md`

---

## Plain English

You are right. **Hardcoding every plate style** (yellow PUV, night white, KR, TH, embassy…) as one-off if/else rules **does not scale**. It burns lab time, confuses field gathering, and turns the product into a scrapbook of patches.

That does **not** mean throw away today’s yellow lock. Tactical gates (soft fail, regex floor, ban slogans) stay. The **engine** must become **plate-native**, not “document OCR + more PH rules.”

---

## What “OCR is old school” means here

| Approach | What it is | Fit for ANPR |
|----------|------------|--------------|
| **Generic OCR** (Tesseract, EN PaddleOCR on whole scene) | Read any text | **Wrong job** — bumper slogans win |
| **OCR on plate crop only** (what we do now) | Still generic character OCR | Better · still weak on yellow/emboss/badge |
| **Plate-native recognizer** | Model trained to output **plate strings** from a plate crop (LPRNet / CRNN / sequential head) | **Correct job** |
| **Detect + recognize end-to-end** | YOLO/plate detector → plate recognizer | Production ALPR pattern |

So: not “ban all Chinese CV” — ban treating ANPR as **office OCR**.

---

## Chinese / open options (honest ranking for Mobility Axiom)

| Option | Plate-native? | Strength | Risk for us |
|--------|---------------|----------|-------------|
| **YOLO plate detect + LPRNet / CRNN** | Yes | Industry default; train/fine-tune per region | Need **PH/SE Asia plate photos** to fine-tune |
| **PaddleOCR as rec head only** (after tight plate box) | Semi | Strong CN tooling; we already ship Paddle | Still OCR-ish unless fine-tuned on plates |
| **HyperLPR / HyperLPR3** | Yes (CN plates) | Fast CN blue/green plates | **CN-first** · weak on PH yellow PUV · aging stack |
| **CCPD-trained CN models** | Yes | Huge CN data | Wrong alphabet/layout for PH |
| **Commercial CN SDKs** (SenseTime / Megvii / Huawei, etc.) | Yes | Strong in CN cities | License cost · OEM ban risk · cloud/on-prem politics · not PH-first |
| **More regex / colour ifs** | No | Quick lab patch | **Kills product** if this stays the strategy |

**Recommendation:** Do **not** adopt HyperLPR as the ship engine for PH/KR/TH. It optimizes **Chinese** plates. Use the **Chinese ALPR pattern** (detect + plate recognizer), not the CN plate weights blindly.

---

## How markets scale without hardcoding forever

```
Ship core:   plate DETECT (geometry/YOLO)  →  plate RECOGNIZER (sequence model)
Thin gate:   regional FORMAT pack (PH / KR / TH) — regex as validator only
Field loop:  soft-fail crops + operator PASS photos  →  fine-tune recognizer
```

| Layer | Hardcode? | Grows how? |
|-------|-----------|------------|
| Detector | No — one plate-box model | More diverse vehicle photos |
| Recognizer | No — char sequence model | **Customer/field plate crops** (your “gathering” becomes training fuel, not rule tickets) |
| Region pack | Thin yes — format only | One pack per market, not per paint colour |
| Soft fail + floor | Keep | Safety, not accuracy |

**User gathering** should feed **labeled plate crops** into fine-tune — not a queue of “add another if yellow then…” MOBS.

---

## What we do now vs next (do not bundle)

| Now (tactical) | Next (strategic MOB — discuss, then APPLY) |
|----------------|--------------------------------------------|
| `ANPR-YELLOW-PUV-LOCK-V1` — stop footer/ban killing WOO 185 | **`ANPR-PLATE-RECOGNIZER-V1`** — LPRNet/CRNN (or equal) on plate ROI; Paddle optional fallback |
| Keep PH/KR/TH regex as **validator** | Collect PASS/FAIL crops into a **region dataset** folder (lab) |
| Keep soft fail | Pack YOLO plate weights for ship (already queued) |

**One recommendation:** After yellow lock field PASS, next named MOB is **`ANPR-PLATE-RECOGNIZER-V1`** (plate-native), not `ANPR-HARDCODE-NEXT-COLOUR-V2`.

---

## PASS criteria for strategy (later)

- New market ≈ new **region pack** + optional fine-tune — not 20 colour MOBs  
- Field wrong reads drop without growing ban-lists forever  
- OEM-safe — no banned vendor names in UI; prefer open weights we control  

---

## Operator decide

1. Finish tactical: retest yellow after **`ANPR-YELLOW-PUV-LOCK-V1`** APPLY.  
2. When ready for engine shift: **`MOB-APPLY ANPR-PLATE-RECOGNIZER-V1`** (scope disc first if you want numbers).  

**No plate-native swap in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Hardcode every plate style | **Rejected as strategy** |
| Generic OCR as long-term ANPR core | **Rejected** |
| Pattern: detect + plate recognizer | **Accepted direction** |
| HyperLPR as PH ship engine | **No** (CN-first) |
| Next strategic MOB name | **`ANPR-PLATE-RECOGNIZER-V1`** |
| Code from this disc | **None** |
