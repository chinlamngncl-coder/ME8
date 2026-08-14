# MOB DISC — ANPR Colab: what YOU do (plain) — 2026-08-11

**Status:** PAPER. No code.  
**Read:** `.cursorrules`

Ignore long ladders. **Only this list.**

---

## What you do (in order)

### Step 1 — Collect pictures
Save stills where plates are hard (night, angle, far, yellow, rain, misses).  
Aim for **100+** (200 better).

### Step 2 — Draw boxes
In Roboflow (or any YOLO label tool): draw one box on each plate.  
Class name = **`plate`**.

### Step 3 — Export zip
Export as **YOLO** detect zip (must include `data.yaml` + images + labels).

### Step 4 — Train in Colab
1. Open Google Colab → **GPU** on.  
2. Open file: `ME8/ai_engine/colab/ANPR-DETECT-COLAB.md`  
3. Paste Cell 1 → 2 → 3 → 4 → 5 (code only).  
4. Cell 2: upload your zip.  
5. Wait for train. Download `plate_yolo11n.onnx`.

### Step 5 — Put file on PC
Overwrite:

`ME8/anpr-sidecar/models/plate_yolo11n.onnx`

### Step 6 — Restart ANPR
Stop extra ANPR processes. Start **one** sidecar on port **8768**.

### Step 7 — Tell me
Type exactly:

```text
MOB-APPLY ANPR-WEIGHTS-RELOAD-V1
```

I check wiring / smoke list. Then you test live plate once → say PASS or FAIL.

---

## What you do NOT do yet

- Weapon Colab / weapon reload  
- OCR Colab  
- Anything else until Step 7

---

## One line

**Label plates → Colab train → drop ONNX → restart 8768 → message me that APPLY.**
