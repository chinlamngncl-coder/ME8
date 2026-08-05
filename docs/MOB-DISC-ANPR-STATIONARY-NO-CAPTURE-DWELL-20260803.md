# MOB DISC — Stationary car 30s · no grab / no plate (after CPU budget)

**Date:** 2026-08-03  
**Status:** APPLIED — `ANPR-STATIONARY-DWELL-FLUSH-V1` (`MOB-APPLIED-ANPR-STATIONARY-DWELL-FLUSH-V1-20260803.md`)  
**Evidence:** ANPR Live — white Hyundai **NBE 8489** clear in tile ≥30s; rail stuck on older **UNCLEAR** (other car). Engine OK.  
**Just applied:** `ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`

---

## Straight answer

**You are right: less capture.** Two layers:

1. **Main bug (was already true, now obvious):** OCR / rail emit only runs when the **vehicle track leaves** (no detect for ~1s). A **stationary** car that stays locked in the frame keeps refreshing `lastSeen` → **flush never fires** → **nothing on Recent Plates** no matter how clear NBE 8489 is.  
2. **CPU budget MOB made it worse:** fewer ffmpeg grabs while busy + sharp-hold after leave + 5s same-cam block → even when something does flush, you get **less** and slower. It did **not** add “read plate while parked in view.”

So: not “FLV broken.” Live tile shows the car; **poller never publishes until exit**, and exit never comes while you stand still on it.

---

## How live ANPR emits today (locked fact)

```text
Grab still → YOLO vehicle → update track (lastSeen = now)
                              ↓
         only when lastSeen old ≥ MAX_AGE (~1s)  →  OCR macro → rail
                              ↓
         car still visible every tick → lastSeen never ages → NO OCR
```

| Situation | What happens |
|-----------|----------------|
| Car drives through and leaves | Track ages out → flush → plate / Unclear |
| Car **parks in frame 30s** | Track stays alive → **zero rail card** |
| Soft mush then leave | Sharp-hold may wait up to 2.5s; gate may force Unclear |

Your screenshot matches: tile = NBE 8489; rail = old Unclear from another pass.

---

## What CPU-budget changed (honest)

| Change | Effect on this test |
|--------|---------------------|
| Grab stretch when OCR busy (~2 FPS) | Fewer chances to *start* a track / flicker break |
| Skip grab over budget | Same |
| Sharp hold after leave | Only after exit — not why 30s silent |
| Cam emit block 5s | Blocks double-spam; **not** a 30s lockout |
| Sharp emit strip mush | Would still show **Unclear** if flush ran |

**Root miss for stationary = no dwell flush.** Budget made “less grab” feel real; stationary silence is deeper.

---

## What we must not do

- Blame WVP / turn handoff off  
- Re-open hard mpegts chase  
- “OCR every frame” again (CPU melt)  
- Undo all of CPU-budget blindly without a **dwell emit** path  

---

## Risk pick (one next MOB)

| Option | Verdict |
|--------|---------|
| **A. Dwell / stationary flush** — if same track in view ≥ ~2–3s **and** best macro sharp enough → OCR **once**, mark `emitted`, keep watching without re-spam | **RECOMMENDED** |
| B. Only raise grab FPS again | Helps a little; **does not** fix “never exit = never emit” |
| C. Revert whole CPU-budget MOB | Restores mush/jerk risk; still no stationary emit |
| D. OCR every grab while stationary | **Reject** — kills live FLV again |

### Recommended name: `ANPR-STATIONARY-DWELL-FLUSH-V1`

**Scope (track + poller only):**

1. On observe: if track `lifeMs ≥ DWELL_MS` (default **2500**) and `bestSharpness ≥ floor` and not yet `emitted` → harvest **now** (same OCR path as exit flush).  
2. Mark track `emitted` so standing on the same car does not flood the rail.  
3. Keep exit flush for cars that leave before dwell.  
4. Keep sharp-emit gate (no 11WM4 mush) and cam block for doubles.  
5. Do **not** remove busy grab stretch entirely — optional soften only if dwell PASS still feels starved.  
6. **No** player / pin / handoff changes.

**PASS (you):**

1. Park white car (NBE 8489 class) in frame ~3–5s → **one** rail card with plate (or one Unclear if soft).  
2. Stay another 30s → **no** spam of 10 cards.  
3. Driving pass still works on leave.  
4. Live tile stays usable (no return to heavy jerk).

---

## Operator next

Say exactly:

**`MOB-APPLY ANPR-STATIONARY-DWELL-FLUSH-V1`**

Until then: **no code** — this disc only.  
(Standing on a car waiting for exit will keep showing nothing — by current design.)
