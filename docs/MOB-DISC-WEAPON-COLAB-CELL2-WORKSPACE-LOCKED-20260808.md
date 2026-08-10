# MOB DISC — Cell 2: workspace put back (API key only) (2026-08-08)

**Status:** guide fixed in `ai_engine/colab/WEAPON-B-CAR-BAR-COLAB.md`.  
**Sorry:** Cell 2 had been left as `PASTE_WORKSPACE` / `PASTE_PROJECT` again. That was wrong. You already proved Track B on this project.

---

## Locked in Cell 2 (do not ask operator to dig these)

| Field | Value |
|-------|--------|
| Workspace | `weopon-detection` |
| Project | `weapon-detection-using-yolov8` |
| Version | `1` |
| **You paste** | **API key only** (`PASTE_KEY`) |

Public dataset page (reference):  
https://universe.roboflow.com/weopon-detection/weapon-detection-using-yolov8

---

## What you do in Colab right now

Replace your Cell 2 with the block from the md (or paste below), put your key in, ▶ play.

```python
import os
from pathlib import Path

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

CLASS_NAMES = ["Handgun", "Knife", "Missile", "Rifle", "Shotgun", "Sword", "Tank"]
assert len(CLASS_NAMES) == 7
print("workspace:", ROBOFLOW_WORKSPACE, "project:", ROBOFLOW_PROJECT, "version:", ROBOFLOW_VERSION)
```

Then Cell 3 → new zip → … → 7 as before.

Agent must **not** strip these IDs back to PASTE_* again.
