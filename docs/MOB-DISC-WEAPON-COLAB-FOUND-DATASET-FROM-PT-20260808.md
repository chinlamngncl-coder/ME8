# MOB DISC — Found your first Colab dataset (from your .pt) (2026-08-08)

**Status:** disc only.  
**You were right.** You already gave the result of the first Colab — the weights file. I should have **read it** instead of asking you for workspace/project again.

---

## What was already on disk (hours ago)

File: `ai_engine/weights/weapon_rfdetr_best.pt`

Inside `args.dataset_dir`:

```text
/content/Weapon-Detection-using-YOLOv8-1
```

That is the Roboflow download folder name = **project + version**.

| Setting | Value (locked from your .pt) |
|---------|------------------------------|
| Workspace | `weopon-detection` |
| Project | `weapon-detection-using-yolov8` |
| Version | `1` |
| Classes | Handgun, Knife, Missile, Rifle, Shotgun, Sword, Tank (7) |
| Model | RFDETRMedium |
| Public page | https://universe.roboflow.com/weopon-detection/weapon-detection-using-yolov8 |

Matches Google style: **you only type the API key**. Workspace/project/version were already known from your train.

Sorry I asked you to dig URLs. That was me not searching your own checkpoint.

---

## Cell 2 — paste this (only replace the API key)

```python
import os
from pathlib import Path

# ONLY edit the API key (same as Google taught you)
os.environ["ROBOFLOW_API_KEY"] = "PASTE_YOUR_API_KEY_HERE"

# Locked from your first Colab .pt — do not invent
ROBOFLOW_WORKSPACE = "weopon-detection"
ROBOFLOW_PROJECT = "weapon-detection-using-yolov8"
ROBOFLOW_VERSION = 1

EPOCHS = 30
BATCH = 4
OUT_DIR = Path("/content/finetune-out")
WEIGHTS_OUT = Path("/content/weapon_rfdetr_best.pt")
NEG_ZIP = Path("/content/negative_car_bar_pack.zip")
NEG_DIR = Path("/content/negative_car_bar")

CLASS_NAMES = ["Handgun", "Knife", "Missile", "Rifle", "Shotgun", "Sword", "Tank"]
assert len(CLASS_NAMES) == 7
print("OK config", ROBOFLOW_WORKSPACE, ROBOFLOW_PROJECT, "v", ROBOFLOW_VERSION)
```

Then ▶ Cell 2.

---

## Standing

- API key = only thing you fill.  
- Workspace/project/version = **already recovered from your B weights**.  
- Next: Cell 3 upload zip → merge → train Medium again.
