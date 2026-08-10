# MOB DISC — Cell 6 `amp` again (my fault) (2026-08-08)

**Status:** same known break. Guide Cell 6 on disk is fixed. Your open notebook still has the bad line.  
**Error:** `ValidationError: Unknown parameter(s): 'amp'`

---

## Why (no mumble)

Cell 6 still had `amp=True`. Your `rfdetr` does not take `amp`.  
`except TypeError` does **not** catch this — Pydantic raises **ValidationError**.

Dataset + Medium + 7 classes look fine. Only delete `amp`.

---

## Do this now

In Cell 6, replace the try/except train block with **only**:

```python
print("train", train_kw)
model.train(**train_kw)
```

Then ▶ **Cell 6** again. Let it train.

Do **not** add `amp=True`. Do not change Medium / 576 / 7.

---

## Locked

`WEAPON-B-CAR-BAR-COLAB.md` Cell 6 no longer has `amp`.  
Agent must not put `amp=True` back.

After train → Cell 7 → overwrite `.pt` → `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`
