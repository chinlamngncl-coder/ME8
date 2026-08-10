# MOB DISC — Cell 6 missing train deps again (same fix) (2026-08-08)

**Status:** same issue as earlier today. **Not** a new mystery.  
Guide Cell 1 is now fixed so the next fresh paste includes train extras.

---

## What the red text means

```text
No module named 'pytorch_lightning'
Install them with 'pip install "rfdetr[train,loggers]"'
```

Cell 1 only installed plain `rfdetr` → enough to load, **not** enough to train.  
Your dataset / GPU / key / zip are fine. Cell 6 needs the train package pack.

---

## Do this now (one box, then re-run Cell 6)

1. New code cell (or edit Cell 1). Paste **only**:

```python
!pip -q install "rfdetr[train,loggers]"
```

2. ▶ play. Wait until done (no red).  
3. If Colab says restart runtime → Restart, then re-run Cell 2 (key) → 3/4/5 if needed → then Cell 6.  
4. If no restart asked → just ▶ **Cell 6** again.

Do **not** change Medium / 576 / 7 classes.

---

## Locked so we stop repeating

Cell 1 in `WEAPON-B-CAR-BAR-COLAB.md` now has:

```text
pip install "rfdetr[train,loggers]" …
```

not bare `pip install rfdetr`.

---

## After train finishes

Cell 7 → save `.pt` over `ai_engine\weights\weapon_rfdetr_best.pt` →  
`MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`
