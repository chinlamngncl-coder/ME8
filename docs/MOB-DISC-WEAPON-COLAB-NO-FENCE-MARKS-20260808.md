# MOB DISC — Do NOT copy ```python — how to run Cell 1 then Cell 2 (2026-08-08)

**Status:** disc only.  
**Your error:** `SyntaxError` on `` ```python ``  
**Cause:** You copied the **markdown fence lines**. Those are for the .md file only. **Colab must never see them.**

Google’s notebook worked because Google gave you **clean code boxes** — no `` ``` `` marks.

Sorry. The .md format was the wrong delivery for you.

---

## Rule (one line)

**Copy only the Python lines between the fences. Never copy `` ```python `` or `` ``` ``.**

### Wrong (what you pasted)

```
```python
!nvidia-smi
...
```
```

Colab sees `` ```python `` → **SyntaxError**.

### Right (what goes in the Colab box)

```
!nvidia-smi
!pip -q install -U pip
...
print("CUDA", torch.cuda.get_device_name(0))
```

No fence lines. No “Cell 1 —”. No tables.

---

## How to run (slow and clear)

### A. Make two boxes first (practice)

1. Colab → **+ Code** (one empty box).  
2. Open `WEAPON-B-CAR-BAR-COLAB.md` on the PC.  
3. Find **## Cell 1**. Below it you see `` ```python `` then code then `` ``` ``.  
4. Select **from `!nvidia-smi` down to the last `print(...)`** — stop **before** the closing `` ``` ``.  
5. Paste into Colab box 1.  
6. Click the **▶** on the left of that box. Wait until it finishes (no red error).

That is “run Cell 1.”

7. Click **+ Code** again (second empty box under the first).  
8. In the md, find **## Cell 2**. Copy only from `import os` to `assert len(CLASS_NAMES) == 7` — **no** fences.  
9. Paste into box 2. Edit your Roboflow key.  
10. Click **▶** on box 2. Wait.

That is “run Cell 2.”

11. **+ Code** for box 3 → paste Cell 3 code only → ▶ → Choose Files → zip.  
12. Same for 4, 5, 6, 7 — **each its own box**, **▶ one at a time**.

---

## Picture of the page

```
┌─────────────────────────┐
│ box 1  [▶]  code only   │  ← run this first
└─────────────────────────┘
┌─────────────────────────┐
│ box 2  [▶]  code only   │  ← run this second
└─────────────────────────┘
┌─────────────────────────┐
│ box 3  [▶]  code only   │  ← run this third (upload zip)
└─────────────────────────┘
...
```

You do **not** put Cell 1–7 in one box.  
You do **not** run them all at once.  
You do **not** copy `` ```python ``.

---

## Next APPLY (so this never happens again)

Say:

`MOB-APPLY WEAPON-B-COLAB-CELLS-PLAIN-PY-V1`

Agent will give you a **`.py` file with NO markdown fences** — upload to Colab or copy clean sections. No `` ``` `` anywhere.

---

## Standing

Your hiccup = **fence marks in a code cell**, not Track B broken.  
Google had no hiccup because they never showed you `` ```python ``.
