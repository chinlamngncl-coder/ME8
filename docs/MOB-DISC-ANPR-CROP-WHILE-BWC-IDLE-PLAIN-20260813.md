# MOB-DISC: BWC looks idle — why ANPR still crops? (2026-08-13)

## Your question (plain)

You **Stop watch**. BWC is in front of you. **No video on the camera.**  
ANPR window still shows crop / OCR.  

**Is it hacked? Fake crops?**

**No. Not hacked. Not inventing plates from nowhere.**

---

## How it can still crop (one picture)

```
BWC screen (what you see)     ≠     ANPR Python (what still runs)
     "I'm idle"                            still has an open stream handle
                                           still grabs frames
                                           still runs YOLO + OCR
```

Two different things:

| What you look at | What ANPR uses |
|------------------|----------------|
| BWC body / LED / “not in live” | A **network stream URL** (FLV) opened earlier |
| Dashboard tile stopped | Python **watch thread** may still be alive |

If that Python watch was **not fully killed**, it keeps:

1. Reading whatever the old URL still gives (live push, leftover server stream, or repeated last frames)  
2. Drawing a crop box  
3. Printing OCR lines  

That crop is **from those frames** — not a random fake generator.  
If the stream is dead/junk, you get garbage like **`K`** / empty — which matches your log (not real plates).

---

## Why Stop watch didn’t kill it (product bug — not magic)

Fleet log already showed:

- Stop → hard-stop BWC video  
- Then ANPR watch / stream start again **or**  
- Empty watch list but Python **`watchStop` never run** (code returns early and leaves the OCR thread running)

So: **UI says stopped. Python may still be working.**  
That is a **bug we must fix**, not a hacker.

---

## What is NOT happening

- Not someone remote hacking your BWC for fun  
- Not ANPR “making up” crops with no image  
- Not proof the BWC screen must still show Live to you  

---

## What you do right now (no APPLY)

1. ANPR **Stop all** (again).  
2. Close **START-ANPR.bat** completely.  
3. When the black ANPR window is gone → **zero** new crops. That proves crops came from that Python process.

---

## Fix (next APPLY)

`MOB-APPLY ANPR-STOP-MUST-KILL-NATIVE-WATCH-V1`  

Meaning in one line: **Stop watch = kill Python capture + OCR for that cam. No leftover thread. No silent re-start.**

---

## PASS after that APPLY

Stop watch → within a few seconds ANPR bat shows **watch stopped** and **no** new `YOLO-bbox` / `RAPID-OCR` lines while you stand idle with the BWC.
