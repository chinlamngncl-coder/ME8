# MOB DISC — Stage 1 keep + Stage 2 ph_id: already APPLIED? — 2026-08-11

**Status:** PAPER. No code.  
**Read:** `.cursorrules`

---

## Short answer

**You do not need a V2 for the architecture.**  
**Stage 1 vehicle = keep · Stage 2 ph_id = enhance · OCR FastALPR** is already what the last two APPLYs locked in.

| MOB | What it did |
|-----|-------------|
| Stage-2 integrate (earlier) | Made **ph_id** the Stage-2 champion (replaced CCPD as default) |
| **`ANPR-STAGE2-SAFE-FALLBACK-V1`** (just now) | Keeps that design + **CCPD seatbelt** if ph_id fails/misses so engine/captures don’t die |

So the MOB you just APPLIED **is** “Stage 1 keep + Stage 2 ph_id” — plus the seatbelt. Not a different product plan.

---

## When would you need V2?

Only if **after** sidecar restart + live smoke you still get:

- Engine Not available / crash loop, **or**  
- Engine OK but **zero** captures with clear plates  

Then a **named V2** (diagnose logs → one fix). Not “re-apply the same idea.”

---

## One next step

Restart ANPR **8768** → hard refresh ANPR Live → PASS/FAIL.  
**PASS** → done for this genre. **FAIL** → report what you see → then V2 name if needed.
