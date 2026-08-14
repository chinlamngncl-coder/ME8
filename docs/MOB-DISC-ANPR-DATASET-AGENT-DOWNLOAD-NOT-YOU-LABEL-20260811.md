# MOB DISC — ANPR dataset: agent downloads (you do NOT label) — 2026-08-11

**Status:** PAPER. Correction. No code this turn.  
**Read:** `.cursorrules`

---

## Correction (plain)

You are **not** supposed to walk around taking hard plate photos and boxing them by hand.

That was the wrong ask. Same pattern as **Weapon**: agent prepares the **pack** (download from Roboflow / GitHub / Hugging Face — license-clean). **You** only run Colab GPU and drop the ONNX.

Goal you care about: **better accuracy on running / hard plates** (night, angle, motion, far) — not homework.

---

## Who does what (locked)

| Step | Who | What |
|------|-----|------|
| **1** | **Agent** | Download + assemble YOLO plate-detect zip under `anpr-finetune-dataset/exports/` |
| **2** | **You** | Colab GPU — paste `ANPR-DETECT-COLAB.md`, upload that zip |
| **3** | **You** | Overwrite `anpr-sidecar/models/plate_yolo11n.onnx`, restart **8768** |
| **4** | **You** | `MOB-APPLY ANPR-WEIGHTS-RELOAD-V1` → live smoke PASS/FAIL |

Optional later (only if still weak on **your** PH site): add a **small site pack** — agent can help pull from evidence/fail stills; still not “you go photograph.”

---

## What we will pull (Track A detect)

Public **plate-box** sets (YOLO export), mix for running / night / angle where the set allows. Prefer **CC / MIT / Apache / CC-BY** Roboflow or GitHub. **No** PP-OCR trainers. **No** Ultralytics in the product — train in Colab, ship ONNX only.

Honest note: big Chinese CCPD helps detect geometry; **PH plate text** is mostly OCR (later genre). Track A still helps **find** the plate on moving cars so FastALPR gets a better crop.

---

## Forbidden ask (do not repeat)

- “You go take night photos and label in Roboflow” as the main path.

---

## One next step

When you want the download pack built on this PC:

```text
MOB-APPLY ANPR-DETECT-DATASET-PACK-V1
```

Then you only do Colab → ONNX → restart → reload APPLY.
