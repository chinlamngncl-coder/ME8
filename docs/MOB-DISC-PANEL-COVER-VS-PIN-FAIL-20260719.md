# MOB DISC — Panel cover crop FAIL vs pin (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code until named MOB-APPLY**  
**Subject:** `MOB-DISC-PANEL-COVER-VS-PIN-FAIL`  
**Evidence:** Operator screenshot — same live cam **kk** on map pin vs Panel 2  
**Prior:** `MOB-APPLY-PANEL-WALL-REVERT-TO-COVER` (fluid slots + `object-fit: cover`)

---

## Verdict

**Cover on the Ops Panel Wall is FAIL for operators.**

Pin shows the **full scene** (flowers top → timer base).  
Panel 2 with **cover** cuts **top and bottom** (timer jammed to the bottom edge; flower heads gone).

Same stream, two framings → **user frustration**. Operators will not trust / will fight the wall view. Pin is the reference of “what the camera sees.”

---

## Why it happens (physics, not a bug in play)

| Surface | Box shape (approx) | Fit used | Result |
|---------|--------------------|----------|--------|
| Map pin | ~300×136 (wider than 16:9, but taller usable frame) | mirror / contain-class framing | Full subject visible |
| Panel slot | ~264×~very short (much **wider** than 16:9) | **`object-fit: cover`** | Scale to **fill width** → crop **top+bottom** |

Cover does exactly what we asked: fill the short-wide rail with zero side bars.  
Cost is **vertical crop**. On this rail that crop is **severe** — not a small trim.

There is **no CSS trick** that gives all of:

1. Six equal panels, no scroll, fill the 272px rail  
2. Zero black bars  
3. Same full frame as the pin  

Pick two.

---

## Operator preference (from this FAIL)

| Priority | Choice |
|----------|--------|
| Framing parity with pin / full scene | **Required** |
| No top/bottom sacrifice | **Required** |
| No scroll | Still required |
| Zero side black bars | **Secondary** — better than wrong crop |

So: **letterbox (contain) beats cover** for Ops panel, even if some side (or top/bottom) bars return.

---

## Options (DISC only — do not invent APPLY)

### Option A — Revert panel video to `object-fit: contain` (recommended next APPLY)

- Keep **fluid** 6-slot geometry (no scroll, no 16:9 lock).  
- Panel ZLM `<video>`: **`contain`** again (undo cover).  
- Result: **full frame like pin**; black bars appear where slot AR ≠ 16:9 (usually **left/right** on short-wide slots).  
- Honest trade: bars > cropped truth.

Suggested name when you want code: **`MOB-APPLY-PANEL-WALL-CONTAIN-FULL-FRAME`**

### Option B — Keep cover

- **Rejected** by operator evidence. Do not ship.

### Option C — Make slots closer to 16:9 without scroll (product / layout later)

Only if you later accept one of:

- Fewer simultaneous panels (e.g. 4 visible), or  
- Taller Ops window / less chrome so each `flex:1` stage is taller  

Then contain bars shrink and cover crop shrinks. **Not** a one-line CSS fix; separate MOB.

### Option D — Re-lock stage to 16:9 + scroll

Already rejected (scroll unacceptable).

---

## What NOT to do

- Do not “fix” cover with more zoom / different `object-position` — still crops truth.  
- Do not silently change pin to cover to “match” the wall — makes pin wrong too.  
- Do not touch play / SOS / PTT / Firmware Gold pin-mirror cores in a fit-only MOB.

---

## Proposed next step

1. Operator confirms: **bars OK if full frame matches pin**.  
2. Then **`MOB-APPLY-PANEL-WALL-CONTAIN-FULL-FRAME`**: revert panel `cover` → `contain` only (geometry already fluid).  
3. Hard refresh → pin and Panel 2 show **same** scene extents.

---

## Status

**DISC only.** Cover path = **FAIL**. Waiting for APPLY name before any edit.
