# MOB DISC — Plate YOLO pack field FAIL · leave uni-OCR path

**Date:** 2026-07-30  
**Status:** **LOCKED** — operator **FAIL** · escalate engine class  
**MOB failed:** `ANPR-PLATE-YOLO-PACK-AND-READ-V1`  
**Evidence:** Operator field FAIL on yellow PUV after YOLO ONNX pack + YOLO-first crop  
**Related:**  
- `MOB-DISC-ANPR-PLATE-YOLO-PACK-AND-READ-V1-APPLIED.md`  
- `MOB-DISC-ANPR-YELLOW-PUV-LOCK-V1-FIELD-FAIL-20260729.md`  
- `MOB-DISC-ANPR-GOOGLE-HYPERLPR-ULTIMATEALPR-PH-CHECK-20260729.md`  
- `MOB-DISC-ANPR-STOP-HARDCODE-PLATE-NATIVE-ENGINE-20260729.md`

---

## Plain English

1. Operator verdict: **FAIL**. YOLO pack + Paddle-on-crop is **not good enough** for field PH yellow. Feels like a **uni project** — fair.  
2. Night PASS earlier proved **gates/harm locks** work. Yellow still fails on a plate a human reads instantly. That is an **engine class** failure, not another CLAHE/ban tweak.  
3. **Stop** stacking OCR patches (colour ifs, more regex, another preprocess MOB). **Move** to a real plate recognizer or a commercial multi-nation ALPR bake-off.

---

## What we already tried (stop repeating)

| MOB | Result |
|-----|--------|
| MOB-601 Paddle + regex | Shell PASS · field FAIL |
| ROI V1 OpenCV/lines | Partial · yellow FAIL |
| Harden (CLAHE/aspect/upscale) | Night PASS · yellow FAIL |
| Yellow-lock (ban/badge/W00) | Field FAIL |
| Plate YOLO ONNX pack + YOLO-first | Lab synth PASS · **field FAIL** |

Lab synth ≠ UV Express camera JPEG. More of the same stack will not finish this.

---

## Root verdict

| Layer | Status |
|-------|--------|
| Soft fail / no wrong publish | Working |
| Plate **detect** (YOLO pack) | Helped lab · **not enough** alone for this photo |
| **Recognize** (generic Paddle OCR) | **The weak link** — uni-grade for embossed yellow + PH badge |
| Strategy | Detect → **plate-native rec** (not document OCR) |

---

## Next MOB (one path — pick and APPLY)

### Recommended: `ANPR-ULTIMATEALPR-EVAL-V1`

**Why first:** Docs list **Philippines** (Latin) and **Korea**. Production ALPR, not OCR homework. Fastest honest test of “is commercial good enough on *this* photo.”

| Scope | Do |
|-------|----|
| 1 | Lab integrate ultimateALPR SDK (license/trial as required) behind sidecar `/read` hatch or parallel engine flag |
| 2 | Run **same** `RP07032017-tuch.jpg` + night van |
| 3 | PASS = **WOO 185** (or soft fail only if truly unreadable) · night still PASS |
| 4 | OEM/legal note in disc before ship — not silent default |

**If license blocks:** fall back same week to open path below — do not invent a third OCR brand.

### Fallback (open): `ANPR-PLATE-RECOGNIZER-V1`

Plate YOLO crop (keep) → **LPRNet/CRNN** Latin fine-tune on our FAIL/PASS crops — not EasyOCR, not HyperLPR3 for PH.

---

## Explicit rejects (this disc)

| Idea | Why reject |
|------|------------|
| Another yellow CLAHE / ban MOB | Already failed twice |
| HyperLPR3 as PH core | CN plates only |
| EasyOCR primary | Still generic OCR |
| Lower regex / 80% floor | Brings back HWZ garbage |
| Lists / live ZLM | Not until yellow PASS |

---

## PASS / FAIL

| Layer | Status |
|-------|--------|
| YOLO pack field | **FAIL** |
| Night | Keep as regression (was PASS) |
| Uni-OCR-as-core | **Rejected going forward** |
| Next | **`ANPR-ULTIMATEALPR-EVAL-V1`** (prefer) or **`ANPR-PLATE-RECOGNIZER-V1`** |

---

## Operator decide

One line when ready:

- **`MOB-APPLY ANPR-ULTIMATEALPR-EVAL-V1`**  
  or  
- **`MOB-APPLY ANPR-PLATE-RECOGNIZER-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| YOLO+Paddle field | **FAIL** |
| Uni-project feel | **Accepted** — leave that class |
| Next | Commercial eval **or** plate-native open rec |
| Code | **None** until APPLY |
