# ANPR-DETECT-COLAB-V1

**From:** `MOB-APPLY ANPR-COLAB-PLAN-V1`  
**Goal:** Fine-tune **1-class plate detector** → export **ONNX** → `ME8/anpr-sidecar/models/plate_yolo11n.onnx`

Live BWC OCR stays **FastALPR**. Do **not** install/train PP-OCR. Do **not** mix Weapon cells.

---

## LOCKED CHECKLIST (before ▶ Cell 1)

1. **Runtime → Change runtime type → GPU** before Cell 1.  
2. Have a **YOLO detect** zip (Roboflow export or local) with class **`plate`**.  
3. Paste **code only** from each fence.  
4. After train: download ONNX → overwrite product file → restart sidecar **8768**.  
5. Then: `MOB-APPLY ANPR-WEIGHTS-RELOAD-V1`

---

## Your steps (short)

1. GPU on.  
2. New Colab notebook.  
3. ▶ 1 → 2 (upload zip) → 3 (train) → 4 (export ONNX) → 5 (download).  
4. Copy file to `ME8/anpr-sidecar/models/plate_yolo11n.onnx`.  
5. One ANPR process on 8768. Smoke live plate.

---

## Cell 1 — GPU + installs

```python
!nvidia-smi
!pip -q install -U pip
!pip -q install ultralytics onnx onnxruntime
import torch
assert torch.cuda.is_available(), "Enable GPU: Runtime → Change runtime type → T4"
print("CUDA", torch.cuda.get_device_name(0))
```

---

## Cell 2 — Upload dataset zip + unpack

```python
from google.colab import files
from pathlib import Path
import zipfile, shutil, os

ROOT = Path("/content/anpr_plate")
if ROOT.exists():
    shutil.rmtree(ROOT)
ROOT.mkdir(parents=True)

print("Upload YOLO zip (images + labels + data.yaml)…")
uploaded = files.upload()
assert uploaded, "No zip uploaded"
zname = next(iter(uploaded.keys()))
zpath = Path("/content") / zname
with zipfile.ZipFile(zpath, "r") as zf:
    zf.extractall(ROOT)

# Find data.yaml
cands = list(ROOT.rglob("data.yaml"))
assert cands, "data.yaml missing — use Roboflow YOLO export"
DATA_YAML = cands[0]
print("DATA_YAML", DATA_YAML)

# Force single class name plate (warn only)
txt = DATA_YAML.read_text(encoding="utf-8", errors="ignore")
print("--- data.yaml ---")
print(txt[:800])
```

---

## Cell 3 — Train (nano, short first pass)

```python
from ultralytics import YOLO
from pathlib import Path

DATA_YAML = next(Path("/content/anpr_plate").rglob("data.yaml"))
EPOCHS = 50          # raise to 80–100 if loss still dropping
IMGSZ = 640
MODEL = "yolo11n.pt"  # nano — matches sidecar naming intent

model = YOLO(MODEL)
results = model.train(
    data=str(DATA_YAML),
    epochs=EPOCHS,
    imgsz=IMGSZ,
    batch=16,
    device=0,
    project="/content/anpr_runs",
    name="plate_detect",
    exist_ok=True,
    patience=20,
)
best = Path(results.save_dir) / "weights" / "best.pt"
print("BEST", best, "exists", best.is_file())
```

---

## Cell 4 — Export ONNX (product file name)

```python
from ultralytics import YOLO
from pathlib import Path
import shutil

best = Path("/content/anpr_runs/plate_detect/weights/best.pt")
assert best.is_file(), "Train Cell 3 first"
model = YOLO(str(best))
out = model.export(format="onnx", imgsz=640, simplify=True, opset=12)
onnx_path = Path(out) if not isinstance(out, Path) else out
# Ultralytics returns str path
onnx_path = Path(str(out))
final = Path("/content/plate_yolo11n.onnx")
shutil.copy2(onnx_path, final)
print("ONNX ready:", final, "bytes", final.stat().st_size)
```

---

## Cell 5 — Download

```python
from google.colab import files
files.download("/content/plate_yolo11n.onnx")
print("Overwrite → ME8/anpr-sidecar/models/plate_yolo11n.onnx")
print("Restart ANPR sidecar (8768). Then: MOB-APPLY ANPR-WEIGHTS-RELOAD-V1")
```

---

## Lab smoke (after reload)

1. Sidecar `/health` ready; only **one** listener on 8768.  
2. Live BWC: plate read still responsive (FastALPR path).  
3. Hard site plates: fewer total misses vs before.  
4. No PP-OCR / no lag storm.

**PASS** → ANPR detect genre closed (OCR Colab only if chars still wrong).  
**FAIL** → more labeled stills + retrain; do not invent OCR swap.
