# MOB DISC — Where is `amp=True` in Cell 6? (2026-08-08)

**Status:** disc only.  
**Ask:** Where the fuck is it?

---

## Where

**Inside your Colab Cell 6 code box** (the long train cell you already ran).

Scroll **inside that same cell** until you see lines that look like this:

```python
try:
    model.train(**train_kw, amp=True)
except TypeError:
    model.train(**train_kw)
```

The bad bit is: **`amp=True`** on the `model.train(...)` line.

It is **not** in Cell 1 / 2 / 3 / 4 / 5.  
It is **not** on your Windows PC.  
It is **only** in that Colab Cell 6 text.

---

## What to do (click by click)

1. Click inside **Cell 6** (the train cell).  
2. Press **Ctrl+F** (Find).  
3. Search for: `amp`  
4. You will land on `amp=True`.  
5. Delete the whole try/except and leave **only**:

```python
print("train", train_kw)
model.train(**train_kw)
```

So after edit, near the train call you should see **no** word `amp` at all.

6. Press **▶** on Cell 6 again.

---

## If Find finds nothing

You may have already deleted it, or Cell 6 was re-pasted wrong.  
Then paste a clean train call: add a line under `train_kw = dict(...)`:

```python
print("train", train_kw)
model.train(**train_kw)
```

and **remove** any other `model.train(...` lines in that cell.

---

## Standing

`amp=True` = text inside **Cell 6**. Ctrl+F → `amp` → delete it → run Cell 6.
