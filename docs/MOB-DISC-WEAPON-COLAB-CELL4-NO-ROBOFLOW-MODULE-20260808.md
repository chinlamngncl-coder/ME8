# MOB DISC — Cell 4 error: no module named roboflow (2026-08-08)

**Status:** disc only.  
**Your screen:** Cell 4 dies on `from roboflow import Roboflow` → `ModuleNotFoundError: No module named 'roboflow'`.  
**You:** Cell 3 negative zip already done. Good — keep that; do not re-upload yet.

---

## What happened (simple)

Cell 4 needs the **roboflow** package.  
Colab says it is **not installed in this runtime right now**.

Usual causes:

1. **Cell 1** (the `!pip install rfdetr roboflow …` box) was **not run**, or **failed**, or you skipped it.  
2. Or Colab **restarted** the runtime after Cell 1 (Reconnect / change GPU / idle) → packages wiped → Cell 1 must run again.  
3. Or Cell 1 was still installing when you jumped ahead.

This is **not** a bad zip. Negatives pack is fine.

---

## What you do now (order)

1. Go back to **Cell 1** → press **▶** again.  
2. Wait until it finishes (no red error). You should see CUDA / Tesla again.  
3. Run **Cell 2** ▶ again (API key + workspace lines) — variables reset after restart.  
4. **Cell 3:** if zip is still on Colab (`/content/negative_car_bar` or the zip file), you can skip re-upload. If unsure, ▶ Cell 3 again.  
5. Then **Cell 4** ▶ again.

### Optional one-liner if Cell 1 is annoying

New box **above Cell 4**, run once:

```python
!pip -q install roboflow rfdetr pillow tqdm
```

Then ▶ Cell 4.

---

## Standing

| Item | Status |
|------|--------|
| Negatives zip | You already did — OK |
| Cell 4 error | Missing `roboflow` install / runtime reset |
| Fix | Re-run Cell 1 (or pip line) → Cell 2 → Cell 4 |

Not your Roboflow key. Not the car pack.
