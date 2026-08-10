# MOB DISC — Roboflow: API key only (like Google) (2026-08-08)

**Status:** disc only. No code until APPLY.  
**You:** With Google you only typed the **API key**. With me you got workspace/project/version mumble. That was **my failure**, not yours.

---

## Truth

| Google path | What I wrongly asked |
|-------------|----------------------|
| Paste **API key** into a ready notebook | Dig URL for workspace / project / version |

Your working Track B Colab almost certainly already had workspace + project **filled in**. You only swapped the key. I should have done the same: **key first**, then **print a list** so you pick a number — not “read the URL.”

---

## What you do right now (no URL homework)

### A. Get only the API key (same as Google)

1. Open [https://app.roboflow.com](https://app.roboflow.com)  
2. Account / settings → **API key**  
3. Copy it  

That is the **only** secret you must know.

### B. Find project the easy way (click, don’t parse URL)

1. In Roboflow, open the dataset you already trained for weapons (7 classes).  
2. Click **Versions** (or **Download** / **Export**).  
3. Click the version you used before.  
4. Choose format **COCO** if asked.  
5. Roboflow shows a **ready code snippet** (like Google did).  
6. That snippet already contains workspace, project, version — **you only replace the API key** in that snippet if needed.

If you still have the **old Google Colab notebook** that worked: open it, copy the Roboflow download cell from there, paste as Cell 4 (download). Cell 2 only needs the key variable that cell uses.

---

## Better Cell 2 (next APPLY — agent fixes the md)

Stop asking you for workspace/project by hand.

**Proposed Cell 2 (API key only):**

```python
import os
from roboflow import Roboflow

os.environ["ROBOFLOW_API_KEY"] = "PASTE_KEY_ONLY"  # <-- only this

rf = Roboflow(api_key=os.environ["ROBOFLOW_API_KEY"])
ws = rf.workspace()   # default workspace for this key (Google-style)
print("workspace:", getattr(ws, "name", ws))
# print projects so you pick by name from the list — no URL
try:
    projs = ws.projects()
    print("projects:", projs)
except Exception as e:
    print("list projects:", e)
    print("Open your old Google Colab Roboflow cell and paste it as Cell 4 instead.")
```

Then you set **one** project name + version from the printed list or from your old notebook — still simpler than “parse URL.”

**APPLY name when you want me to rewrite the guide:**

`MOB-APPLY WEAPON-B-COLAB-API-KEY-ONLY-V1`

---

## Standing

- You did **not** fail.  
- I mumbled workspace/project like you were supposed to be a Roboflow admin.  
- Google way = **API key** (+ ready snippet / old notebook). We go back to that.

Until APPLY: use **old Google Colab Roboflow cell** + new Cell 1 installs + Cell 3 zip merge + Medium train cell — or wait for `WEAPON-B-COLAB-API-KEY-ONLY-V1`.
