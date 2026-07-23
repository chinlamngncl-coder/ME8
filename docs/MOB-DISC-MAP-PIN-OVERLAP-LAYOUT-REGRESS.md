# MOB DISC — “Overlapping” again: did our 8-BWC layout regress?

**Status:** Open — investigate / soak; **do not MOB-APPLY yet**  
**Date:** 2026-07-10  
**Search:** `Overlapping`, `PIN_POPUP_DOCK_SLOTS`, `assignColocatedPinPopupDocks`, `autoFanStackedPopups`, `MAX_OPEN_PIN_POPUPS`  
**Related:** earlier `MOB-DISC-FR-OPENALL-OVERLAP-OFFLINE-PIN.md` (partial — this one corrects the “only GPS” framing)

---

## Honest answer first

| Question | Honest answer |
|----------|----------------|
| Did FR / blacklist thumbs **delete** the pin layout? | **No.** FR did not touch dock layout. |
| Did something change in pin layout since firmware gold? | **Almost nothing.** Only clear related change found: `MAX_OPEN_PIN_POPUPS` **6 → 8** (matches 8-BWC SOP). Dock slot table for 1–8 was already there. |
| Is “Overlapping” *only* “because GPS”? | **GPS is the trigger** (Chin+kk colocated → same cluster). **Layout is supposed to separate panels.** Seeing **“Overlapping”** means the **layout pass did not fully clear screen rects** — not that layout was never built. |
| Is offline **UB-6A5G** causing Overlapping (2)? | **No.** HUD chips were **Chin · kk** only. Grey offline pin is separate last-GPS. |
| Did we “solve it tons of times” and then lose the rules? | **Rules are still in the tree.** What you see is either a **known residual** (HUD honesty when rects still collide) or a **timing/clamp failure** of that layout — not a wiped feature. |

Sorry for the earlier DISC leaning too hard on “just GPS / Open All.” You already paid for dock layout; the right question is: **why is the HUD still saying Overlapping after that layout runs?**

---

## What still exists (your layout — not gone)

| Piece | Still in `public/index.html`? |
|-------|-------------------------------|
| Cap open pin popups | `MAX_OPEN_PIN_POPUPS = 8` |
| Dock plan for 1–8 | `PIN_POPUP_DOCK_SLOTS` — 2 cams = **left + right** |
| Apply docks | `assignColocatedPinPopupDocks()` |
| Spread colocated **markers** | `spreadStableColocatedMarkers()` |
| Open All calls layout | `video-wall.js` → `assignColocatedPinPopupDocks` after stagger (+ retries) |
| HUD | `#map-pin-stack-hud` — **“Stacked nearby”** vs **“Overlapping”** |

**“Overlapping (N)”** is not a random error. It is set only when `clusterPopupsOverlap()` finds two open popup **DOM rects** still intersecting (12 px pad) **after** reposition.

So:

- Layout **ran** (or tried).  
- Rect check **failed** → label stays Overlapping.  
- If layout fully worked, label should be **“Stacked nearby (2)”** (HUD still visible for chips/drag, but not “Overlapping”).

---

## What “GPS” actually does here

```
GPS within PIN_COLOC_CLUSTER_M  →  same cluster
(+ optional screen merge if all open pins within PIN_COLOC_SCREEN_PX)
        ↓
assignClusterDockPlans → left/right/top/… for up to 8
        ↓
attachPinPopupDockLayout + spread markers
        ↓
clusterPopupsOverlap?  →  HUD “Overlapping” vs “Stacked nearby”
```

GPS explains **why Chin+kk are a pair**. It does **not** mean we abandoned layout. Layout is the next step; Overlapping means that step didn’t finish the job on screen.

---

## Code smell that matches your 2-cam lab (Chin + kk)

`autoFanStackedPopups`:

```js
if (cluster.length === 2) return;   // early exit — no pixel fan for exactly 2
// … dead code below still has a length===2 left/right fan …
```

So for the **most common lab case (2 colocated)**:

- Separation depends **only** on dock **left/right** (+ small yStagger ±22).  
- The **extra fan fallback** (340 px) is **disabled** for n=2.  
- For n≥3, if dock still overlaps, autoFan can push offsets.

That is **old** (in tree since operator-voice port / Jul 2), **not** introduced by FR this week. It may be why 2-cam still flashes or sticks on “Overlapping” when dock isn’t enough (large live panels, map edge clamp, size growth after video attaches).

---

## Likely reasons layout “exists” but HUD still says Overlapping

| Hypothesis | Why plausible | FR related? |
|------------|---------------|-------------|
| **A. Viewport clamp** | Dock left/right then `Math.max/min` to map bounds collapses both panels toward the same edge | No |
| **B. Size race** | Layout uses ~300×280 before live video grows popup → later rects overlap; retries at 150/450 ms may still lose to late decode | No (Open All timing) |
| **C. n=2 no autoFan** | When left/right isn’t enough, no 340 px fan rescue | No — old |
| **D. Marker spread + dock** | Markers spread left/right of center; popups dock left of west + right of east — usually good; if spread weak or GPS jitter, can still collide | No |
| **E. FR dual live** | Extra `analytics-fr` viewers — can stress pool; **does not** rewrite dock. Could delay pin video → longer race (B) | Indirect only |
| **F. Layout deleted / GPS-only** | **False** — rules still present | — |

---

## What changed recently (honest diff check)

Since firmware-gold pin lock (`6facfbb` era) → HEAD, pin-dock **logic** was not rewritten by FR MOBs.

| Change | Effect on Overlapping |
|--------|------------------------|
| `MAX_OPEN_PIN_POPUPS` 6→8 | Allows more open pins; **not** why 2-cam Chin+kk fail |
| FR Analytics / blacklist | Separate surface; **no** edit to `PIN_POPUP_DOCK_SLOTS` / `assignColocatedPinPopupDocks` |
| Offline last-gps pin | Unrelated to HUD chips |

So: **we did not silently rip out the 8-BWC layout this week.** If Overlapping feels worse, more likely **timing / clamp / n=2 fan skip** than “GPS only and layout gone.”

---

## Offline UB-6A5G (again, short)

- Last location from `storage/last-gps.json` — **by design** survives refresh.  
- Not in Overlapping (2) chips.  
- Separate DISC topic (TTL) — don’t mix into pin-dock fix.

---

## Suggested soak (no code yet)

1. Open All Chin+kk only (FR **off**). After ~2 s, does HUD say **Overlapping** or **Stacked nearby**?  
2. Drag one header apart — does Overlapping clear?  
3. Zoom out / pan so panels aren’t on map edge — still Overlapping?  
4. Same with FR watch on — any difference? (Expect same HUD; maybe slower video.)

If (1) already Overlapping with FR off → **not an FR regression**; dock residual.

---

## Possible later MOBs (only after soak — not apply now)

| Name | Idea |
|------|------|
| `mob-map-pin-fan-2` | Allow autoFan for **n=2** when dock still overlaps (use the dead left/right fan) |
| `mob-map-pin-overlap-relayout` | After pin video size settles, one more dock+overlap pass |
| `mob-map-pin-clamp-fair` | Don’t clamp both stacked popups onto the same edge |

Pick one cause from soak first.

---

## Bottom line

| | |
|--|--|
| Layout for 8 BWC | **Still there** |
| Did FR remove it? | **No** |
| Did something big change? | **No** — only max open 6→8 stood out |
| Why “Overlapping”? | **Rects still collide after dock** — HUD is telling the truth |
| GPS | **Why they’re clustered**, not “we only use GPS and forgot layout” |
| Next | Soak FR-off Open All; then decide if `mob-map-pin-fan-2` / relayout |

Park until soak answers.
