# WEAPON-B-COLAB-CELLS-BOTH-V1

**MOB applied.** Operator: **Google Colab (GPU)** — learn **both**:
- **Negatives:** car / SUV / bull-bar / blur / wash (no boxes)
- **Positives:** Knife (+ person-in-frame stills) **with boxes**

Do **not** change architecture — same Track B as your working train.

---

## LOCKED CHECKLIST (read before ▶ Cell 1)

1. **Runtime → Change runtime type → GPU** (T4 etc.) **before** Cell 1.  
2. Cell 1 install is always `"rfdetr[train,loggers]"` — **never** bare `rfdetr`.  
3. Cell 2: paste **API key only** — workspace/project/version already filled.  
4. Cell 3: upload **two** zips (negatives + knife).  
5. Cell 6: `model.train(**train_kw)` — **no `amp=True`**.  
6. Paste **code only** from each fence — never the English headings.

---

## Locked B recipe (must match 8769 sidecar)

| Setting | Value |
|---------|--------|
| Model | `RFDETRMedium` |
| resolution | **576** |
| num_classes | **7** |
| dec_layers | **4** |
| positional_encoding_size | **36** |
| patch_size | **16** |
| num_windows | **2** |
| Classes (order) | `Handgun, Knife, Missile, Rifle, Shotgun, Sword, Tank` |
| Output | `weapon_rfdetr_best.pt` → `ME8/ai_engine/weights/` |

Product map (sidecar): Handgun/Rifle/Shotgun→gun; Knife/Sword→knife; skip Missile/Tank.

---

## Packs on this PC (upload these two)

```text
ME8/weapon-finetune-dataset/negative_car_bar_pack.zip   ← ~335 hard negatives
ME8/weapon-finetune-dataset/positive_knife_pack.zip     ← ~120 knife + boxes
```

## Your steps (short)

1. GPU on.  
2. New notebook **or** reuse — **re-paste** cells from this file (do not keep old Cell 3/5).  
3. ▶ 1 → 2 (key) → 3 (both zips) → 4 → 5 → 6 (long) → 7.  
4. Overwrite `ME8/ai_engine/weights/weapon_rfdetr_best.pt`.  
5. Say: `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`

---

## Cell 1 — GPU check + installs

```python
!nvidia-smi
!pip -q install -U pip
!pip -q install "rfdetr[train,loggers]" roboflow torch torchvision pillow tqdm
import torch
assert torch.cuda.is_available(), "Enable GPU: Runtime → Change runtime type → T4/A100"
print("CUDA", torch.cuda.get_device_name(0))
```

## Cell 2 — Config (API key only)

```python
import os
from pathlib import Path

# === PASTE API KEY ONLY ===
os.environ["ROBOFLOW_API_KEY"] = "PASTE_KEY"
ROBOFLOW_WORKSPACE = "weopon-detection"
ROBOFLOW_PROJECT = "weapon-detection-using-yolov8"
ROBOFLOW_VERSION = 1

EPOCHS = 30
BATCH = 4
OUT_DIR = Path("/content/finetune-out")
WEIGHTS_OUT = Path("/content/weapon_rfdetr_best.pt")
NEG_ZIP = Path("/content/negative_car_bar_pack.zip")
NEG_DIR = Path("/content/negative_car_bar")
POS_ZIP = Path("/content/positive_knife_pack.zip")
POS_DIR = Path("/content/positive_knife")

CLASS_NAMES = ["Handgun", "Knife", "Missile", "Rifle", "Shotgun", "Sword", "Tank"]
assert len(CLASS_NAMES) == 7
print("workspace:", ROBOFLOW_WORKSPACE, "project:", ROBOFLOW_PROJECT, "version:", ROBOFLOW_VERSION)
```

## Cell 3 — Upload **both** zips

```python
from google.colab import files
from pathlib import Path
import zipfile, shutil

NEG_ZIP = Path("/content/negative_car_bar_pack.zip")
NEG_DIR = Path("/content/negative_car_bar")
POS_ZIP = Path("/content/positive_knife_pack.zip")
POS_DIR = Path("/content/positive_knife")

def ensure_zip(dest: Path, hint: str):
    if dest.is_file():
        return dest
    print("Upload:", hint)
    files.upload()
    if dest.is_file():
        return dest
    # match by name fragment
    key = dest.stem.split("_pack")[0]
    for z in Path("/content").glob("*.zip"):
        if key in z.name.lower() or hint.split(".")[0].lower() in z.name.lower():
            return z
    raise SystemExit("Missing zip: " + hint)

NEG_ZIP = ensure_zip(NEG_ZIP, "negative_car_bar_pack.zip")
POS_ZIP = ensure_zip(POS_ZIP, "positive_knife_pack.zip")

def unzip_to(zpath: Path, out: Path):
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zpath, "r") as zf:
        zf.extractall(out)

unzip_to(NEG_ZIP, NEG_DIR)
unzip_to(POS_ZIP, POS_DIR)

jpgs = list(NEG_DIR.rglob("*.jpg")) + list(NEG_DIR.rglob("*.jpeg")) + list(NEG_DIR.rglob("*.png"))
knife_jpgs = list(POS_DIR.rglob("*.jpg")) + list(POS_DIR.rglob("*.jpeg"))
knife_ann = next(POS_DIR.rglob("_annotations.coco.json"), None)
print("negatives:", len(jpgs), "knife jpgs:", len(knife_jpgs), "knife ann:", knife_ann)
assert len(jpgs) >= 50, "Neg pack too small"
assert len(knife_jpgs) >= 20 and knife_ann and knife_ann.is_file(), "Knife pack missing images or _annotations.coco.json"
```

## Cell 4 — Download Roboflow COCO dataset

```python
from pathlib import Path
from roboflow import Roboflow

rf = Roboflow(api_key=os.environ["ROBOFLOW_API_KEY"])
proj = rf.workspace(ROBOFLOW_WORKSPACE).project(ROBOFLOW_PROJECT)
ds = proj.version(int(ROBOFLOW_VERSION)).download("coco")
DATASET = Path(ds.location)
print("dataset:", DATASET)
for split in ("train", "valid", "test"):
    p = DATASET / split
    print(split, "exists" if p.is_dir() else "MISSING", p)
```

## Cell 5 — Merge **both** into train

1) Car/blur → **background** (no boxes)  
2) Knife pack → **Knife boxes** (map to Roboflow’s Knife category id by name)

```python
import json, shutil
from pathlib import Path
from PIL import Image

def load_coco(split_dir: Path):
    ann = split_dir / "_annotations.coco.json"
    assert ann.is_file(), f"Missing {ann}"
    return json.loads(ann.read_text(encoding="utf-8")), ann

def save_coco(ann_path: Path, data: dict):
    ann_path.write_text(json.dumps(data), encoding="utf-8")

train_dir = DATASET / "train"
data, ann_path = load_coco(train_dir)
images = data.get("images") or []
annotations = data.get("annotations") or []
cats = data.get("categories") or []

# Find Roboflow Knife id (do not invent new classes)
knife_rf = None
for c in cats:
    if str(c.get("name") or "").strip().lower() == "knife":
        knife_rf = int(c["id"])
        break
assert knife_rf is not None, "Roboflow dataset has no Knife category — abort"
print("Roboflow Knife category_id:", knife_rf, "categories:", [c.get("name") for c in cats])

max_img = max([im["id"] for im in images], default=0)
max_ann = max([a["id"] for a in annotations], default=0)

# --- A) hard negatives (no boxes) ---
added_neg = 0
for src in jpgs:
    max_img += 1
    dest_name = f"neg_hard_{max_img}_{src.stem[:40]}{src.suffix.lower()}"
    shutil.copy2(src, train_dir / dest_name)
    with Image.open(src) as im0:
        w, h = im0.size
    images.append({"id": max_img, "file_name": dest_name, "width": w, "height": h})
    added_neg += 1

# --- B) knife positives (with boxes) ---
pos = json.loads(knife_ann.read_text(encoding="utf-8"))
pos_imgs = {im["id"]: im for im in (pos.get("images") or [])}
pos_by_img = {}
for a in (pos.get("annotations") or []):
    pos_by_img.setdefault(int(a["image_id"]), []).append(a)

added_pos = 0
added_boxes = 0
for old_id, im in pos_imgs.items():
    src = POS_DIR / im["file_name"]
    if not src.is_file():
        # zip may nest one folder
        hits = list(POS_DIR.rglob(im["file_name"]))
        if not hits:
            continue
        src = hits[0]
    max_img += 1
    dest_name = f"pos_knife_{max_img}_{src.stem[:40]}{src.suffix.lower()}"
    shutil.copy2(src, train_dir / dest_name)
    w = int(im.get("width") or 0)
    h = int(im.get("height") or 0)
    if not w or not h:
        with Image.open(src) as im0:
            w, h = im0.size
    images.append({"id": max_img, "file_name": dest_name, "width": w, "height": h})
    for a in pos_by_img.get(int(old_id), []):
        max_ann += 1
        bb = a.get("bbox") or [0, 0, 0, 0]
        annotations.append({
            "id": max_ann,
            "image_id": max_img,
            "category_id": knife_rf,
            "bbox": [float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3])],
            "area": float(a.get("area") or (float(bb[2]) * float(bb[3]))),
            "iscrowd": 0,
        })
        added_boxes += 1
    added_pos += 1

data["images"] = images
data["annotations"] = annotations
# keep Roboflow categories unchanged (7 classes)
save_coco(ann_path, data)
print(f"Merged neg={added_neg} knife_imgs={added_pos} knife_boxes={added_boxes}")
print(f"train images={len(images)} anns={len(annotations)}")
```

## Cell 6 — Train RFDETR **Medium** (Track B)

```python
from rfdetr import RFDETRMedium
from pathlib import Path
import shutil

OUT_DIR = Path("/content/finetune-out")
OUT_DIR.mkdir(parents=True, exist_ok=True)
WEIGHTS_OUT = Path("/content/weapon_rfdetr_best.pt")

model = RFDETRMedium(
    resolution=576,
    num_classes=7,
    device="cuda",
    dec_layers=4,
    positional_encoding_size=36,
    patch_size=16,
    num_windows=2,
)

train_kw = dict(
    dataset_dir=str(DATASET),
    epochs=EPOCHS,
    batch_size=BATCH,
    grad_accum_steps=max(1, 8 // max(1, BATCH)),
    lr=1e-4,
    output_dir=str(OUT_DIR),
    device="cuda",
)
print("train", train_kw)
# NEVER amp=True on this Colab rfdetr (ValidationError)
model.train(**train_kw)

candidates = [
    OUT_DIR / "checkpoint_best_total.pth",
    OUT_DIR / "checkpoint_best_ema.pth",
    OUT_DIR / "checkpoint_best_regular.pth",
    OUT_DIR / "checkpoint.pth",
]
src = next((c for c in candidates if c.is_file() and c.stat().st_size > 100000), None)
if src is None:
    pts = sorted(OUT_DIR.rglob("*.pth"), key=lambda p: p.stat().st_mtime, reverse=True)
    assert pts, "No checkpoint produced"
    src = pts[0]

import torch
obj = torch.load(src, map_location="cpu", weights_only=False)
if isinstance(obj, dict) and "model" in obj:
    mc = obj.get("model_config") or {}
    mc.setdefault("resolution", 576)
    mc.setdefault("num_classes", 7)
    mc.setdefault("dec_layers", 4)
    mc.setdefault("positional_encoding_size", 36)
    mc.setdefault("patch_size", 16)
    mc.setdefault("num_windows", 2)
    obj["model_config"] = mc
    args = obj.get("args") or {}
    args["class_names"] = CLASS_NAMES
    args["num_classes"] = 7
    obj["args"] = args
    torch.save(obj, WEIGHTS_OUT)
else:
    torch.save({
        "model": obj if not isinstance(obj, dict) else obj,
        "model_config": {
            "resolution": 576,
            "num_classes": 7,
            "dec_layers": 4,
            "positional_encoding_size": 36,
            "patch_size": 16,
            "num_windows": 2,
        },
        "args": {"class_names": CLASS_NAMES, "num_classes": 7},
    }, WEIGHTS_OUT)

print("WROTE", WEIGHTS_OUT, WEIGHTS_OUT.stat().st_size)
```

## Cell 7 — Download weights

```python
from google.colab import files
files.download(str(WEIGHTS_OUT))
print("Save as: ME8/ai_engine/weights/weapon_rfdetr_best.pt (replace old)")
```

---

## After download

```text
MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1
```

## Do not

- Train Track A smoke with this  
- Change to YOLO / Nano  
- Put `amp=True` back  
- Ask agent to train on lab CPU  
