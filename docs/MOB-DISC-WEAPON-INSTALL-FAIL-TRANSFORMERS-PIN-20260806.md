# MOB DISC — Weapon install failed (2026-08-06)

**Status:** disc only. **No code. No reinstall. No APPLY yet.**  
**Operator:** install failed for weapons.

---

## What I found (lab)

1. `weapon-sidecar\.venv` **exists** (Python 3.11.9).
2. First check: **`uvicorn` / `rfdetr` missing** → pip never finished cleanly the first time (or was interrupted). Torch alone is ~122 MB; first install can take many minutes.
3. Re-ran `pip install -r requirements.txt` in diagnose only: packages **did install**.
4. Import still **dies**:

```
ImportError: cannot import name 'find_pruneable_heads_and_indices'
from 'transformers.pytorch_utils'
```

| Package | Installed | Problem |
|---------|-----------|---------|
| `rfdetr` | **1.2.1** (locked in plan) | Needs transformers **v4** API |
| `transformers` | **5.14.1** (pip pulled latest) | Removed that helper in v5 |

So “install failed” is really: **bad dependency pin**, not “Python missing.”  
`START-WEAPON.bat` can look like install OK, then crash on start / health stays Not ready.

---

## Root cause (one sentence)

`requirements.txt` pins `rfdetr==1.2.1` but **does not pin** `transformers<5`, so pip installs transformers 5.x and RF-DETR cannot import.

Roboflow changelog: fix for transformers 5 is **`rfdetr>=1.6`**. Older line must stay on **`transformers<5`**.

---

## Recommendation (one path)

**Keep `rfdetr==1.2.1` (Apache plan unchanged).**  
Add pin: **`transformers>=4.46,<5`** (e.g. `4.57.1`).

Then operator:

1. Delete `weapon-sidecar\.venv` (clean)
2. Run `START-WEAPON.bat` again (or INSTALL.ps1)
3. Wait — first run can be 10–20+ minutes
4. Leave window open → Weapon pill **OK**

### Why not bump to rfdetr 1.6+ tonight

Works with transformers 5, but API / pin churn; our `app.py` was written against 1.2.1. Bigger MOB. Pin transformers is the smaller, safer fix for the locked engine.

### Not this bug

- License / AGPL — unrelated  
- Missing Python — you have 3.10 + 3.11  
- Weights download — never reached yet (models folder empty until engine loads)

---

## APPLY name (when you want the fix)

`MOB-APPLY WEAPON-SIDECAR-TRANSFORMERS-PIN-V1`

Exact change (after APPLY only): one line in `weapon-sidecar/requirements.txt` (+ maybe INSTALL note). No product UI. No git push unless you say so.

---

## You do now

Nothing required tonight. When ready: say the APPLY above, or paste the red error from the START-WEAPON window if it differs from this ImportError.
