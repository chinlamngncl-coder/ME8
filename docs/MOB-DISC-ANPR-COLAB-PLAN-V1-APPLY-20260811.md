# MOB-APPLY ANPR-COLAB-PLAN-V1 — LOCKED

**Date:** 2026-08-11  
**Status:** APPLIED (paper + Colab recipe). **No product code this APPLY.**  
**Order override:** ANPR Colab **before** Weapon touch-up (operator).  
**Read:** `.cursorrules` · keep live FastALPR · no PP-OCR · not a Weapon RF-DETR clone.

---

## What this genre is

Improve **plate find (detect)** on **your** site stills, then drop ONNX into the ANPR sidecar.

| Layer | This genre | Later (not this APPLY) |
|-------|------------|------------------------|
| **Detect** (box the plate) | **YES — Track A** | — |
| **OCR** (read characters) | Collect text labels now; train later | `ANPR-OCR-COLAB-V1` if still weak after detect PASS |
| Live BWC engine | **Stay FastALPR-only** + blur &lt; 35 | Never swap to PP-OCR |
| Heavy CCTV | FastALPR + HyperLPR unchanged | — |
| Weapon | Parked | After ANPR PASS |

---

## Why detect first (not OCR)

Sidecar already loads optional plate ONNX from:

`anpr-sidecar/models/plate_yolo11n.onnx`  
(or `FM_ANPR_YOLO_WEIGHTS`)

Live cascade still uses FastALPR for OCR. A better site detector helps crops / pack-and-read / ROI merge **without** rewriting the live OCR engine. OCR fine-tune is a second genre if chars stay wrong after detect PASS.

---

## Locked recipe file

**`ai_engine/colab/ANPR-DETECT-COLAB.md`** — paste cells there only.

| Setting | Locked |
|---------|--------|
| Task | 1-class plate detect |
| Class name | `plate` |
| Train size | prefer **≥200** labeled stills (100 min for first smoke) |
| Input | Roboflow zip **or** local YOLO zip (`images/` + `labels/` + `data.yaml`) |
| Export | **ONNX** only into product |
| Product file | `anpr-sidecar/models/plate_yolo11n.onnx` (overwrite) |
| License | **Colab may use Ultralytics to train**; product loads **onnxruntime only** (no Ultralytics pip in ship). No PP-OCR. |

---

## Dataset layout (this PC)

```text
ME8/anpr-finetune-dataset/
  README.txt                 ← short gather rules
  images/                    ← optional local stash
  exports/
    anpr_plate_detect.zip    ← what you upload to Colab (Roboflow YOLO export OK)
```

**Label:** one box per plate. **Also write plate text** in Roboflow metadata / filename if easy — saved for OCR genre later; not required for Track A train.

**Stills to prefer:** night, angle, far BWC, yellow, rain — especially frames where live missed or cropped wrong.

---

## Operator steps (short)

1. Gather / label stills → export YOLO zip → put under `anpr-finetune-dataset/exports/` (or upload straight from Roboflow in Colab).  
2. Open Colab GPU → paste cells from **`ai_engine/colab/ANPR-DETECT-COLAB.md`**.  
3. Download `plate_yolo11n.onnx` → overwrite `ME8/anpr-sidecar/models/plate_yolo11n.onnx`.  
4. Restart ANPR sidecar (port **8768** — one instance only).  
5. Say: **`MOB-APPLY ANPR-WEIGHTS-RELOAD-V1`** (verify path + smoke checklist; small code only if override env needed).  
6. Lab: live BWC still smooth; hard plates better / fewer miss → **PASS**.

---

## Next APPLYs (do not skip)

| Order | Name | When |
|-------|------|------|
| Now | (you run Colab) | After this plan |
| Then | `MOB-APPLY ANPR-WEIGHTS-RELOAD-V1` | Weights on disk |
| If OCR still bad | `MOB-APPLY ANPR-OCR-COLAB-V1` | After detect PASS |
| Later | `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1` | After ANPR genre closed |

---

## Forbidden

- PP-OCRv4 / generic word OCR for plates  
- Mixing Weapon + ANPR in one notebook  
- Changing live FastALPR path or blur gates in this plan  
- Declaring PASS without sidecar restart + one live smoke
