# MOB DISC — Cell 6: Unknown parameter `amp` (2026-08-08)

**Status:** disc only.  
**Your screen:** Train deps OK now. New error:

```text
ValidationError: Unknown parameter(s): 'amp'
```

---

## What happened

Our Cell 6 had:

```python
model.train(**train_kw, amp=True)
```

Your Colab `rfdetr` version **does not accept `amp=`**.  
The `except TypeError` did **not** catch this (it is a **ValidationError**), so it still crashed.

Dataset + Medium model init look fine. Only the `amp` flag is wrong.

---

## What you do now

### Option A — quickest (edit Cell 6)

In Cell 6, find the train part. **Replace** the try/except block with **only**:

```python
print("train", train_kw)
model.train(**train_kw)
```

Do **not** pass `amp=True`.

Then ▶ Cell 6 again.

### Option B — whole train tail (if easier)

From `model = RFDETRMedium(` downward, keep the model create + `train_kw`, then use:

```python
print("train", train_kw)
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

---

## Later APPLY

`MOB-APPLY WEAPON-B-COLAB-CELL6-NO-AMP-V1`  
→ Fix the md so Cell 6 never passes `amp`.

---

## Standing

Error = `amp=True` not allowed. Remove it → re-run Cell 6.
