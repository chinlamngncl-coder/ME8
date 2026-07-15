# MOB DISC — Plain English: what to do after the face-engine upgrade

**Status:** DISC only — **no new code**  
**Date:** 2026-07-14  
**For:** Operator who is **not** a developer  
**Rule:** No “buffalo / ONNX / sidecar / re-embed” without saying **where to click**.

---

## Sorry — plain talk

You asked for a **stronger face match**. We turned that on for the **lab**.

That change only helps **after** two things you do on the screen:

1. Restart the system (so the new face brain loads).  
2. Press one Watchlist button so old face “fingerprints” are rebuilt for the new brain.

Until you do step 2, scores can still look bad — not because you failed, because the list is still using the **old** fingerprints.

---

## What “Re-embed gallery” means (one sentence)

**It is a button on Watchlist** that says **“Re-embed gallery”**.

It means: *take every person’s photo already on the Watchlist and rebuild their face fingerprint for the current face engine.*  
Photos stay the same. Names stay the same. Only the hidden fingerprint updates.

You do **not** need to know what “embed” means. Just: **click that button once**, wait until it says done.

---

## Where to look / what to click (in order)

### A — Restart once

1. Run **`RESTART-FLEET.bat`** the same way you always restart Fleet.  
2. Wait until the dashboard is up.  
3. Hard refresh the browser (Ctrl+Shift+R).

*(First restart after this change may take longer — the PC may download a bigger face pack. If health stays red for many minutes, tell me “face engine won’t start.”)*

---

### B — Rebuild Watchlist fingerprints

1. Open **Analytics** (Face).  
2. Open the **Watchlist** tab (people list — not the live tiles).  
3. Find the button **Re-embed gallery** (same row as Refresh / search).  
4. Click it → confirm if asked → wait.  
5. You should see a short “done” style message (updated / skipped / failed counts).

**That is the whole “re-embed” thing.** Nothing in a folder. Nothing in code.

---

### C — Test if match got better

1. Go back to **Face** live watch.  
2. Start watch and get **your face** (or the enrolled person) on a tile so a snap appears on Recent.  
3. Open **Watchlist** again.  
4. Click the **person** (open their detail).  
5. Click **Score vs last snap**.  
6. Read the **big percent**.

| Result | What it means for you |
|--------|------------------------|
| **70% or higher** | Good enough for the locked bar — say **CHECKPOINT PASS** + the number |
| **Still under 70** (e.g. 50s) | Still not good enough — say **CHECKPOINT FAIL** + the number. We pick the next fix. **Do not** move the threshold slider down. |

---

## What is “buffalo”? (optional — you can ignore)

**Buffalo** is just the **name of the face-model pack** inside the face service. Like a brand of engine oil — not a screen you use.

| You need to know | You do **not** need to know |
|------------------|-----------------------------|
| Restart → Re-embed gallery → Score vs last snap | buffalo_l, ONNX, sidecar, cosine, dims |

If something asks “where do I see buffalo?” — **you don’t.** Operators never open that. Techs see it only in health logs. Your job is the **percent** on **Score vs last snap**.

---

## Legal one-liner (for later ship — not today’s clicks)

The face pack we use for lab is **not free to put in a customer product** without a paid license from the model vendor.  
**Today = lab test only.** Ship / tender = separate business step. Not your click path tonight.

---

## Bottom line

1. **Restart Fleet**  
2. **Watchlist → Re-embed gallery** (one button)  
3. **Score vs last snap** → tell me the **%**

That is the whole MOB for you. No tech vocabulary required.
