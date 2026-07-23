# MOB DISC — Map pin n=2 modest dock-gap (2026-07-10)

**MOB:** `mob-map-pin-dock-gap-2`  
**File:** `public/index.html` only  
**Not:** edge fan / `autoFanStackedPopups` for n=2 (still early-return)

---

## Change (vs gold / prior)

| Knob | Gold / before | This MOB |
|------|---------------|----------|
| Pair extra gap (n=2) | +10 px | **+36** (`PIN_DOCK_PAIR_EXTRA_GAP`) |
| Pair label clear | 48 | **48+28** (`PIN_DOCK_PAIR_LABEL_EXTRA`) |
| Pair y-stagger | ±22 | **±56** (`PIN_DOCK_PAIR_YSTAGGER`) |
| Marker spread min (n=2) | max(58, …) | **max(88, …)** |

Still dock **left/right beside pins**. No ±400 edge fan.

---

## Test

1. Hard refresh Ops map  
2. Open All Chin + kk (colocated)  
3. Expect faceplates L/R with more gap / stagger — not map-edge shove  
4. HUD Overlapping chips may still show (gold UX) — panels should not sit on top of each other  

Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL** (+ what broke).
