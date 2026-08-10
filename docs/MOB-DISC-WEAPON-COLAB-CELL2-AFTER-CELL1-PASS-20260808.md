# MOB DISC — Cell 1 PASS → how to do Cell 2 (2026-08-08)

**Status:** disc only.  
**Your screenshot:** Cell 1 worked (`CUDA Tesla T4`). Good.

---

## Cell 2 — exact steps

1. In Colab, **under** Cell 1, click **+ Code** (new empty box).  
2. Paste **only** the lines below into that new box (nothing else).  
3. Change the 4 Roboflow lines to **your** real values (same project you used for Track B).  
4. Click **▶** on that box. Wait until it finishes with no red error.  
5. Then we do Cell 3 (upload zip).

---

## Paste this into Cell 2 (code only)

```
import os
from pathlib import Path

# === EDIT THESE (same Roboflow project you used for Track B) ===
os.environ["ROBOFLOW_API_KEY"] = "PASTE_KEY"
ROBOFLOW_WORKSPACE = "PASTE_WORKSPACE"
ROBOFLOW_PROJECT = "PASTE_PROJECT"
ROBOFLOW_VERSION = 1   # int — your current B dataset version

# Train knobs (safe defaults)
EPOCHS = 30
BATCH = 4
OUT_DIR = Path("/content/finetune-out")
WEIGHTS_OUT = Path("/content/weapon_rfdetr_best.pt")
NEG_ZIP = Path("/content/negative_car_bar_pack.zip")
NEG_DIR = Path("/content/negative_car_bar")

CLASS_NAMES = ["Handgun", "Knife", "Missile", "Rifle", "Shotgun", "Sword", "Tank"]
assert len(CLASS_NAMES) == 7
```

Replace:

| Line | What to put |
|------|-------------|
| `PASTE_KEY` | Your Roboflow API key |
| `PASTE_WORKSPACE` | Workspace slug |
| `PASTE_PROJECT` | Project slug |
| `ROBOFLOW_VERSION = 1` | Your real version number (integer) |

Do **not** leave `PASTE_KEY` as text. Do **not** copy `` ``` `` marks.

---

## After Cell 2 PASS

Next = Cell 3: **+ Code** → paste Cell 3 code → ▶ → Choose Files →  
`ME8\weapon-finetune-dataset\negative_car_bar_pack.zip`
