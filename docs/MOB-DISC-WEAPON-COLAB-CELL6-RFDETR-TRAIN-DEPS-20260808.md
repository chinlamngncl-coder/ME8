# MOB DISC — Cell 6: RF-DETR train deps missing (2026-08-08)

**Status:** disc only.  
**Your screen:** Cell 6 started (downloaded `rf-detr-medium.pth`, saw 7-class head) then died:

```text
ModuleNotFoundError: No module named 'pytorch_lightning'
ImportError: RF-DETR training dependencies are missing.
Install them with: pip install "rfdetr[train,loggers]"
```

---

## What happened

Cell 1 only did `pip install rfdetr` — enough to **import**, not enough to **train**.  
Training needs extra packages (`pytorch_lightning`, etc.).

Dataset path `/content/Weapon-Detection-using-YOLOv8-1` = OK (your B dataset loaded).  
Not a bad car zip. Not Roboflow key.

---

## What you do now

1. New code box **above Cell 6** (or edit Cell 1 and re-run). Paste **only**:

```python
!pip -q install "rfdetr[train,loggers]"
```

2. Press **▶**. Wait until it finishes (no red).  
3. Press **▶** on **Cell 6** again (do not change Medium / 576 / 7).  
4. Let train finish → Cell 7 download.

If Colab asks to restart runtime after pip: **Restart**, then re-run Cell 1 → 2 → (3 if needed) → 4 → 5 → pip train line → 6 → 7.

---

## Later APPLY (optional)

`MOB-APPLY WEAPON-B-COLAB-CELL1-TRAIN-EXTRAS-V1`  
→ Agent updates `WEAPON-B-CAR-BAR-COLAB.md` Cell 1 to include `"rfdetr[train,loggers]"` so this does not repeat.

---

## Standing

Cell 6 fail = missing train extras. One pip line, then re-run Cell 6.
