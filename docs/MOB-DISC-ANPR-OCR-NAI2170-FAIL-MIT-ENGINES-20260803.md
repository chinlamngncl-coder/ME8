# MOB DISC — Same car wrong OCR (NAI 2170) · what next · MIT/Apache engines

**Date:** 2026-08-03  
**Status:** DISCUSSION ONLY — no code until MOB-APPLY  
**Evidence:** Live rail — same white SUV, plate **NAI 2170** human-clear on micro-crops; four wrong strings in ~8s:

| Time | Crop quality | OCR published |
|------|----------------|---------------|
| 16:37:28 | Sharp | **KAD 2170** |
| 16:37:31 | Sharp | **XA1212** |
| 16:37:33 | Sharp | **WAI 2170** |
| 16:37:36 | OK | **NA1217** |

**Verdict in one line:** Cropping is mostly fixed. **Recognition (OCR) is the failing layer.** More crop polish alone will not get NAI 2170.

---

## What this proves

1. **Micro-crop path is good enough for a human** — N / A / I / 2 / 1 / 7 / 0 are readable on several tiles.  
2. **Current live OCR (FastALPR + `cct-xs-v2-global`)** is **too weak / too confused** on PH Latin emboss (N↔W/X/K, I↔1/D).  
3. **Temporal lock is not saving you** — each tick locks a *different* wrong plate, so the rail shows four “confident” wrong hits instead of one corrected string.  
4. **HyperLPR / “Chinese plate” engines are the wrong product bet for PH** — they shine on CN yellow/blue formats; your FAIL is Latin LLL + digits (NAI 2170). Prior disc already rejected HyperLPR as PH core.

---

## What we should *not* do next

| Idea | Why not |
|------|---------|
| Another CLAHE / blur / regex MOB only | Crops are already readable; regex already relaxed |
| Make HyperLPR Engine B default for live PH | CN-biased; already caused live lag; wrong alphabet priority |
| Bring PP-OCR back as live core | Document OCR hallucination history on blurry/edge plates |
| Buy random “market ALPR” without bake-off on *these* crops | Waste week; must PASS NAI 2170 + prior FAIL set first |

---

## MIT / Apache plate engines worth considering

**Plate-specialized (cars / bikes), not generic document OCR:**

| Engine / model | License | Role | Fit for us |
|----------------|---------|------|------------|
| **fast-plate-ocr `cct-s-v2-global-model`** (via FastALPR) | **MIT** | Plate OCR, larger than current `cct-xs` | **Best next step** — same stack, drop-in heavier OCR, still ONNX-fast |
| **fast-plate-ocr `cct-xs-v2-global`** (current) | MIT | Tiny plate OCR | **Proven weak** on this FAIL set |
| **open-image-models YOLO plate det** | MIT | Detect only | Keep for detect; not OCR |
| **CCPD YOLOv8-pose** (current Stage 3) | weights vary; YOLO Ultralytics AGPL if .pt — we use ONNX path | 4-pt localize | Keep for crop; already helping |
| **LPRNet / CRNN** (CCPD / OpenALPR-style Latin fine-tune) | often **Apache-2** code; train on our crops | Plate sequence rec | Strong medium-term if `cct-s` still fails PH |
| **Nomeroff Net** | GPL-ish / mixed — **avoid** for ship | — | License risk |
| **HyperLPR3** | permissive for CN | CN plates | **Not** PH Latin core |
| **PaddleOCR PP-OCRv4** | Apache-2 | Generic OCR | Purged from live for a reason |

**Honest market note:** Many “powerful” demos are commercial (Plate Recognizer, OpenALPR commercial, etc.) or GPL. For **MIT/Apache ship**, the practical short list is: **fast-plate-ocr (upgrade size)** → then **fine-tuned LPRNet/CRNN on our FAIL/PASS crops**.

---

## Speed (crop not fast enough)

Cropping improved but the live path is still heavy:

- CCPD pose ONNX every flush  
- Lanczos / CLAHE enhance on micro  
- FastALPR det+OCR on padded micro  

**Recommendation (with OCR upgrade, not instead of it):**

1. Live path: **skip enhance** when micro already sharp (Laplacian above a mid floor).  
2. Keep **FastALPR OCR-only on micro** (no second full-frame hunt).  
3. Temporal: **one rail card per track** until majority vote — stop emitting four wrong plates for one car.

---

## Recommended single path (risk pick)

### Phase A — `ANPR-OCR-CCT-S-GLOBAL-V1` (do this first)

1. Switch live FastALPR OCR model: **`cct-xs-v2-global-model` → `cct-s-v2-global-model`** (MIT, same FastALPR API).  
2. Add **per-track character majority vote** over last N ticks (e.g. 3–5): for NAI 2170, positions vote N/A/I/2/1/7/0 instead of publishing WAI / KAD / XA….  
3. Soft PH confusion pass after vote only: I↔1 in letter block vs digit block (position-aware) — **after** stronger OCR, not instead.  
4. PASS gate: this SUV **NAI 2170** must publish **NAI 2170** (or compact NAI2170) on ≥2 of 3 sharp crops; no four different wrong strings for one track.

### Phase B — only if Phase A still fails on field set

`ANPR-PLATE-LPRNET-LATIN-V1` — Apache/MIT LPRNet or fine-tuned fast-plate-ocr on **our** PH FAIL crops (NAI / ALA / UNM / yellow PUV). Keep CCPD crop.

### Crop speed follow-up (after OCR PASS or in same APPLY if small)

`ANPR-LIVE-CROP-FAST-PATH-V2` — skip enhance when sharp; tighter OCR timeout; one emit per track until vote locks.

---

## Why not “Chinese alphabet algorithm” as the headline fix

Chinese-specialized ALPR (HyperLPR, CN CCPD rec heads) optimizes for **CN character sets and plate layouts**. Your plate is **Latin PH** (NAI 2170). Using CN-first engines for PH emboss often **hurts** N/W/I/1 confusion. Use **global / Latin plate OCR** (fast-plate-ocr global family), then fine-tune on PH.

---

## Operator ask

When ready:

`MOB-APPLY ANPR-OCR-CCT-S-GLOBAL-V1`

Scope: OCR model upgrade + temporal majority vote; no PP-OCR return; no HyperLPR as live PH core; crop enhance optional small speed hatch only if named in APPLY.
