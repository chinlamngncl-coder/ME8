# MOB DISC — Zero snapshots after dwell MOB (field FAIL)

**Date:** 2026-08-03  
**Status:** APPLIED — `ANPR-LIVE-GUARANTEED-CROP-EMIT-V1`  
**Operator:** Stationary clear plate in Live ≥30s → **not even 1 snapshot**. Angry — fair.  
**Just applied (failed in field):** `ANPR-STATIONARY-DWELL-FLUSH-V1` + prior `ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`

---

## Straight answer (no spin)

**Dwell MOB did not deliver what you needed.**  
A clear car on the tile ≠ a rail card. Tonight’s stack can still produce **zero publishes** while the FLV looks fine.

That is a **product FAIL**, not “you didn’t wait long enough.”

---

## Why zero is possible (stacked gates)

Live publish only happens if **all** of these succeed:

```text
watch slots → grab JPEG (ffmpeg) → /track YOLO vehicle
  → keep macro (w≥150) → dwell OR exit flush
  → /read-macro OCR → sharp-emit gate → cam emit block → rail
```

Any break → **no snapshot**.

### Most likely deadlock after dwell MOB

| Gate | Default | Deadlock |
|------|---------|----------|
| **Dwell flush** | needs `bestSharpness ≥ 35` **and** life ≥ 2.5s | Car stays in frame → **exit never runs** |
| **Exit flush** | needs car **gone** ~1s | Stationary → never gone |
| Result | Sharpness on **vehicle macro** often &lt; 35 on BWC even when plate looks clear to you | **Neither dwell nor exit** → **0 cards forever** |

That matches your test: NBE-class car locked in view, rail frozen / empty.

### Other kill switches still in play

| Gate | Effect |
|------|--------|
| Grab over budget (&gt;900 ms) | Still dropped — no track update |
| Frame `blur_reject` (fm &lt; 20) | `/track` returns no vehicle |
| `no_vehicle` | YOLO miss → no track |
| `below_min_macro_w` (w &lt; 150) | Discard — no OCR |
| Cam emit block 5s | Can hide a card right after a prior Unclear |
| ME8 not restarted / watch slots empty | Poller never grabs that cam |

We do **not** have your `fleet.log` lines in this turn. The **design** alone already allows zero; logs would only say *which* gate.

---

## What we got wrong

1. Treated “dwell + sharp floor” as enough for stationary — **sharp floor + no exit = silence**.  
2. Stacked CPU-budget + sharp-hold + sharp-emit + dwell without a **guaranteed crop publish** path.  
3. Optimized for mush/jerk before locking **“always at least one macro card when a car is held.”**

Skill complaint: the last two APPLYs fixed the wrong failure mode for *this* desk test. Own that.

---

## What we must not do

- Another OCR model / HyperLPR on live  
- Chase / handoff / pin changes  
- “OCR every frame” melt  
- Pretend restart-only will fix a sharp-floor deadlock  

---

## Risk pick (one next MOB)

| Option | Verdict |
|--------|---------|
| **A. Guaranteed crop emit** — dwell flush **without** sharp floor (or floor **0**); if OCR fails/soft → still publish **macro (+ micro if any) as Unclear**; exit path same; keep cam block so no flood | **RECOMMENDED** |
| B. Only lower dwell sharp to 5 | Helps; still may discard / silence on other gates |
| C. Revert both budget + dwell | Restores jerk/mush; does not guarantee stationary crop |
| D. More logs only | Needed for proof, **not** enough alone |

### Recommended name: `ANPR-LIVE-GUARANTEED-CROP-EMIT-V1`

**Scope:**

1. **Dwell:** `lifeMs ≥ DWELL_MS` + `metMinWidth` + has macro → flush **even if sharpness &lt; 35** (hatch: `FM_ANPR_DWELL_SHARP_FLOOR=0` default **0** for live).  
2. **Always rail a crop** on that flush: plate string if good; else **Unclear** with macro (and micro if OCR returned one). Never “silent discard” for a wide-enough held vehicle.  
3. Keep **one emit per track** (emitted flag) + cam block — no spam.  
4. Log one line per decision: `grab|track|dwell|discard|emit` with reason (so next FAIL is not blind).  
5. Soften grab-budget only if logs show perpetual over-budget skips (secondary).  
6. **No** player / pin / handoff.

**PASS (you):**

1. Restart ME8. Watch on. Hold clear car ~3–5s.  
2. **At least one** Recent Plates card (plate **or** Unclear **with** vehicle crop).  
3. Stay 30s → still only one card for that car.  
4. Tile stays usable.

---

## Operator next

Say exactly:

**`MOB-APPLY ANPR-LIVE-GUARANTEED-CROP-EMIT-V1`**

Until then: **no code**.

If you want proof before APPLY: paste any `anpr live grab` / `anpr live track` / `anpr track discard` / `anpr track emit` lines from media log after one failed hold — optional, not required to APPLY the guarantee MOB.
