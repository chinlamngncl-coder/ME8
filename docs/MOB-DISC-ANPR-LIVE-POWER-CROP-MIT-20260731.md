# MOB DISC — Powerful MIT plate cropper (cars / bikes / moving) — not “tune FastALPR tiny”

**Date:** 2026-07-31  
**Status:** DISC — **no code until** APPLY  
**Operator:** Crop-first APPLIED but **not cropping well**. Need a **very powerful** open-source **MIT** cropper (Chinese-trained packs OK as **weights/data**, not region hardcoding). Snapshot hard for **cars, bikes, moving vehicles**.

**Not this disc:** PH/CN regex packs. Matching text is separate. This is **detection + tight crop + cadence**.

---

## Why Live still crops poorly

| Today | Limit |
|-------|--------|
| Ship detect | FastALPR **`yolo-v9-t-384`** — tiny plate detector, one scale |
| Cadence | Grab ~every **3s**, crop dedupe ~2.5s — not “snapshot like crazy” |
| Scope | Plate-only box on full frame — weak on **small / angled / bike / distant** plates |
| Vehicle context | **No** car/moto detector to find vehicles first, then plate on bumper |
| Crop-first MOB | Fixed “emit ROI when box exists” — if the **box is wrong/missed**, rail stays empty or bad |

Crop-first was the **publish path**. Quality needs a **stronger detector stack** + denser sampling. Not another OCR regex MOB.

---

## License lock (ship)

| License | Ship? |
|---------|--------|
| **MIT / Apache-2.0** weights + ONNX runtime | **Yes** |
| Ultralytics **AGPL** train/infer stack as product dependency | **No** (openship risk) — ONNX weights exported elsewhere OK if runtime is onnxruntime only |
| GPL plate repos (e.g. some popular CN YOLOv5 plate demos) | **No** for ship binary |

**Chinese angle (correct reading):** Use **strong plate detect models trained on large open sets** (e.g. **CCPD** dataset is **MIT** — Chinese City Parking Dataset). That is **detector power**, not hardcoding Live to CN plate text.

---

## Target product behavior

```text
Live FLV grab (dense)
  → optional: vehicle detect (car / motorcycle / truck)  [MIT YOLO-class ONNX]
  → plate detect on full frame + vehicle ROIs (front & rear bias)
  → every confident plate box → tight JPEG → 8-rail (crop-first already)
  → OCR / list match later (unchanged genre)
```

| Need | Spec |
|------|------|
| Cars | Front + rear plates |
| Bikes | Motorcycle plate class / smaller boxes — lower min box size |
| Moving | Denser grabs (sub-second to ~1s) while watch Live; keep CPU cap via cam limit |
| Powerful cropper | Replace or **upgrade** tiny `yolo-v9-t-384` with a **larger MIT/Apache plate ONNX** (or dual: vehicle + plate) |

---

## Candidate stack (evaluate in lab — pick one before APPLY)

**Recommendation after risk:** Do **not** bolt a random GitHub README. Lab bake-off → one winner → one MOB.

| Option | Why consider | Risk |
|--------|----------------|------|
| **A — Stronger FastALPR / open-image-models plate ONNX** (same family as ship, larger det e.g. 512 / non-tiny) | Least glue; already in sidecar | May still miss bikes / far plates |
| **B — CCPD-trained plate YOLO → ONNX** (Apache/MIT weights only; onnxruntime) | Strong on varied angles / Chinese parking corpus → often transfers to many plate shapes | Must verify **license of weights** + ship size |
| **C — Two-stage: vehicle (car/moto) ONNX → plate on ROI** | Best for “moving cars and bikes” | Two models; more CPU; need schedule |

**Locked pick for next APPLY (agent recommendation):**  
**A first in lab** (bigger FastALPR / open-image-models plate det) **plus denser Live sample**. If field still fails bikes/far plates → **C** as follow-up MOB.  
Do **not** pull AGPL Ultralytics into ship. Do **not** GPL CN demos.

---

## Cadence (“snapshot like crazy”)

Separate knobs (same genre, can ship in one MOB with detector upgrade):

| Knob | Today | Target direction |
|------|--------|------------------|
| `FM_ANPR_POLL_SEC` | 3 | **1** (or 0.8–1.2) while ≤4 Live cams |
| `FM_ANPR_CROP_DEDUPE_MS` | 2500 | **800–1200** so rail rolls while vehicle moves |
| Max Live cams | 4 | Keep — crazy snapshot ≠ unlimited cams |

CPU melt = fail. Cap cams; densify per watched cam.

---

## What we will not do

- Hardcode PH or CN **text** region as the crop fix  
- Claim “Chinese = region pack” again  
- Bundle OCR rewrite + map-on-hit into the cropper MOB  
- Depend on Ultralytics AGPL in customer ship  

---

## MOB order

### 1) `ANPR-LIVE-POWER-CROP-MIT-V1` ← next

1. Lab bake-off: current tiny det vs **larger MIT/Apache plate ONNX** (FastALPR/open-image-models family preferred).  
2. Wire winner as Live **detect** path; keep crop-first emit (`cropJpegB64`).  
3. Raise Live grab cadence (poll ~1s, shorter crop dedupe) under existing cam cap.  
4. Document weights license + ship path under `anpr-sidecar/models/`.  
5. PASS on **moving car + bike** in lab video (tight crops on 8-rail), not still Snapshot only.

### 2) `ANPR-LIVE-VEHICLE-THEN-PLATE-V1` (if 1 still weak on bikes/far)

Vehicle ONNX (car/moto) → plate search on ROIs + full frame.

### 3) Speed / GPU later

CUDA / TensorRT only if lab CPU still melts after 1–2.

---

## PASS / FAIL (MOB 1)

**PASS:** Live watch on moving vehicle → continuous **tight** plate crops on 8-rail (car rear/front and at least one bike/moto pass). Miss rate clearly better than tiny FastALPR alone.  
**FAIL:** Still sparse/empty rail; full-frame junk; or AGPL/GPL pulled into ship.

---

## APPLY (when ready)

```
MOB-APPLY ANPR-LIVE-POWER-CROP-MIT-V1
```

Lab bake-off notes go in APPLIED disc. No code in this disc.
