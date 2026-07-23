# MOB DISC — Pin stacking still broken (ops NOT fine) — unpark

**Status:** **Applied** `mob-map-pin-fan-2` 2026-07-10 — see also `MOB-DISC-MAP-PIN-FAN-2-SCOPE.md`  
**Search:** `Overlapping`, `Stacked`, `Open All`, `autoFanStackedPopups`, `Chin kk`  
**Supersedes park SOP in:** `MOB-DISC-MAP-PIN-OVERLAP-PARK.md`

---

## Your report (accepted)

> Ops does **not** feel fine. Still stacking. Restarted Fleet more than once.

**Accepted.** We stop telling you to ignore the blue bar. Persistent **panels on top of each other** (or HUD stuck on **Overlapping** with unusable stack) is an **ops defect**, not “FR noise.”

Fleet restart **will not** fix this. Layout lives in the **browser** (`index.html` pin dock). Restart only clears SIP/pool — same GPS + same dock code → same stack.

FR genre is unrelated. Do **not** mix Watchlist/cropper MOBs into this.

---

## What “still stacking” means (product bar)

| Fail | Pass |
|------|------|
| Open All Chin+kk → pin panels **cover each other** so you can’t use both | Panels sit **side by side** (left/right) with usable headers |
| HUD stays **Overlapping (2)** and drag is the only way every time | Prefer **Stacked nearby** or no need to drag for 2-cam lab |
| Feels broken every Open All | Feels like the layout you already paid for |

Video decode can still work while layout fails — that is why the earlier “park if video OK” call was **wrong for you**.

---

## Why restarts don’t help (honest)

```
Fleet restart  →  server / SIP / last-gps
Pin stack      →  client dock + overlap check after Open All
```

No server flag “clears” colocated popup layout. Hard refresh alone also won’t if the **code path** still leaves rects overlapping.

---

## Root cause we already found (not “GPS only”)

Layout **exists** (`PIN_POPUP_DOCK_SLOTS` left/right for 2, `assignColocatedPinPopupDocks`).  
HUD **Overlapping** = after that pass, popup **DOM rects still intersect**.

Strongest code smell for **your 2-cam lab**:

```js
function autoFanStackedPopups(cluster) {
    if (cluster.length === 2) return;  // ← no pixel fan rescue for Chin+kk
    // dead code below still has left/right fan for n===2
}
```

So for exactly **2** open colocated pins:

- Separation depends only on dock left/right (+ tiny y stagger).  
- If dock fails (map edge clamp, popup grows after live video, timing), **no 340px fan fallback**.  
- For 3+ cams, autoFan can still push. Lab is almost always **2** → you hit the hole every time.

Other contributors (same DISC family): viewport clamp collapsing both panels; layout before video size settles; Open All stagger.

**Not the cause:** offline UB-6A5G grey pin; FR watchlist dossier; “forgot GPS.”

---

## What we shall do (locked direction — still no apply until you say MOB-APPLY)

### One targeted MOB (not a merry-go-round)

| Name | Intent |
|------|--------|
| **`mob-map-pin-fan-2`** | When cluster size **=== 2** and rects still overlap after dock → apply the **existing** left/right fan offsets (remove the early `return`). Optionally one extra `assignColocated` after pin video attaches (~600–900 ms). |

**One file focus:** `public/index.html` (pin stack helpers).  
**Do not** touch `video-wall.js` pool, FR, or offline TTL in the same pass.

### Explicitly out of this MOB

- Softening HUD copy only (hides the bug)  
- Offline pin 8-hour TTL  
- FR enroll cropper  
- Rewriting all 8-slot dock tables “from scratch”

### Success check (your call after APPLY)

1. Hard refresh (Fleet already up).  
2. FR **off**. Open All Chin+kk. Wait ~2s.  
3. **Pass:** both pin panels usable without dragging; HUD ideally **Stacked nearby** or clear separation.  
4. **Fail:** still fully stacked → report; next would be clamp-fair (second MOB only if needed).

---

## Relation to earlier “it worked before FR”

Possible both true:

- Pin **video** PASS under firmware gold.  
- Pin **panel separation** was always fragile for n=2 (autoFan skip), and you’re done accepting it.

We do **not** need to prove FR broke dock. We need to **fix the n=2 hole** you feel every Open All.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Ops fine? | **No** — stacking still a real defect |
| Park still valid? | **No** — unparked |
| Fleet restart fix it? | **No** — client layout |
| Next? | **`mob-map-pin-fan-2`** when you say MOB-APPLY |
| Merry-go-round? | **One** MOB, one success check — then stop |

Say **`MOB-APPLY mob-map-pin-fan-2`** when ready.
