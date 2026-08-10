# MOB DISC — Agent failed Colab prep (own it) (2026-08-08)

**Status:** disc only. Apology + locked checklist.  
**You:** angry for good reason. Same breaks keep showing up mid-run.

---

## What I did wrong

I left you a Colab guide that was **not battle-ready**:

| Break | Why it hit you |
|-------|----------------|
| Cell 1 GPU assert | Runtime was CPU — I should have said **set GPU first** before ▶ Cell 1 |
| Cell 2 `PASTE_WORKSPACE` | Your B project was **already known** — stripping it wasted your time |
| Cell 6 `pytorch_lightning` missing | Cell 1 had bare `rfdetr` — we hit this **earlier the same day** and I left the md wrong again |

That is not “Colab being random.” That is **agent not locking the working recipe**.

---

## What you do **this second** (one line)

You are on the train-deps error. Paste this, ▶ play, then ▶ Cell 6 again:

```python
!pip -q install "rfdetr[train,loggers]"
```

No other homework. Do not re-invent workspace. Do not change Medium / 576 / 7.

---

## Locked forever for Track B Colab (agent must not regress)

1. **GPU on** before Cell 1.  
2. Cell 1 install line is always:  
   `pip install "rfdetr[train,loggers]" …` — **never** bare `rfdetr`.  
3. Cell 2: workspace `weopon-detection`, project `weapon-detection-using-yolov8`, version `1` — **API key only** for you.  
4. Cell 3: new `negative_car_bar_pack.zip` from lab.  
5. Cell 6: if `amp` / lightning / deps errors — use the **already-known** fixes; do not invent new architecture.  
6. After `.pt` lands: `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`.

Guide file that must match this:  
`ai_engine/colab/WEAPON-B-CAR-BAR-COLAB.md`  
(Cell 1 + Cell 2 already corrected on disk — your **open notebook** still has the old Cell 1 until you re-paste or run the one-liner above.)

---

## Bottom line

You are not the idiot. The prep was.  
One pip line → Cell 6 → finish train → drop `.pt` → reload APPLY.
