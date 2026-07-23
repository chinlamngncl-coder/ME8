# MOB DISC — Revert FAIL: pins vanish ~1s + Chin still covers kk

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-22  
**Trigger:** Operator after `REVERT-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2` — pins show then **gone after ~1 second**; **Chin still covers kk**. “Cheater / took it off.”  
**Related:** `MOB-APPLIED-REVERT-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2-20260722.md`

---

## Not a cheat — what revert actually did

Revert put code back to **pre-V1/V2 git baseline** (gold slot spread + dock). It did **not** delete a working Chin fix — **that fix was never PASS**.

| Claim | Truth |
|-------|-------|
| “You took it off” | Revert removed **broken** V2 global rewrite. No stable Chin fix existed to keep. |
| “Did not solve Chin covering kk” | **Correct.** Baseline **never** solved single-click Chin. Revert honestly restores old behaviour — including that bug. |
| “Disappear after 1 sec” | **Real bug** — see below. Not revert malice; **pre-existing GPS collapse** in live `index.html`. |

---

## Symptom 1 — two pins flash, then gone (~1 sec)

### What you see

1. Click blue **“2”** or zoom in → **briefly** two orange dots  
2. ~0.3–1 s later → back to **one dot** / cluster / kk-only stack  

### Why (code, plain English)

Two timers fight each other:

| Step | What runs | Effect |
|------|-----------|--------|
| A | Cluster click / `zoomend` → `spreadStableColocatedMarkers` (80 ms) | Spreads Chin **left**, kk **right** — **good** |
| B | GPS tick → `upsertDeviceMarker` (~300 ms batch from `MapPinLayer`) | If **fewer than 2 popups open**, **forces marker back to raw GPS** |

Live code `public/index.html` ~12093–12101:

```javascript
if (getOpenPinCamIds().length >= 2) {
    spreadStableColocatedMarkers();
} else if (m && m._gpsLatLng) {
    m.setLatLng(m._gpsLatLng);   // ← collapses spread; both pins same pixel again
}
```

**No popup open** when you only clicked the cluster → GPS update **undoes spread** → pins merge → look like they **disappeared**.

This logic was **already in baseline** before V1/V2. V2 made it worse (both pins same side). Revert brought back **slot spread** but **left the GPS collapse** — so flash-then-vanish remains.

---

## Symptom 2 — Chin click still covers kk

### Still broken on revert — why

When **only Chin** popup is open:

```
clusterOpenPinCamIds([chin])  →  one cluster, length 1
assignClusterDockPlans        →  PIN_POPUP_DOCK_SLOTS[1]  →  always RIGHT
```

Live `runColocatedPinPopupDockLayout` in **`index.html`** has **no** “Chin is in 2-cam GPS pair with kk” pass.  
(`dashboard-boot.js` mirror has that pass but **map does not load it** — inline script in `index.html` is live.)

So Chin panel still grows **toward kk**. **Revert could not fix this** — it was broken before V1.

---

## What V1/V2 did wrong (why we reverted)

| Approach | Result |
|----------|--------|
| V1/V2 changed **global** `assignClusterDockPlans` + spread | Broke cluster click, merged pins, Open All layout |
| Should have been **one branch**: single-open + colocated 2-GPS only | Never done |

---

## What PASS looks like (both issues)

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** — click **“2”** → **two pins stay** visible (no 1s vanish) | ☐ |
| 2 | Click **Chin only** → panel **left** of Chin; **kk dot visible** | ☐ |
| 3 | Click **kk** → Chin dot visible | ☐ |
| 4 | **Open All** → L/R panels; pins stay spread | ☐ |

---

## Recommended fix — **surgical** (two tiny MOBs, not one global rewrite)

**Agent pick:** do **A** then **B** only if you ever say APPLY again. **Not tonight unless you name both.**

### A — `MAP-PIN-SPREAD-KEEP-COLOCATED-V1` (pins vanish)

**One change:** In `upsertDeviceMarker`, if cam is in a **2-GPS colocated pair**, **do not** `setLatLng(_gpsLatLng)` collapse when popups &lt; 2. Keep spread (or call `spreadStableColocatedMarkers` for that pair only).

**Do not touch** dock / popup layout.

### B — `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` (Chin covers kk)

**One change:** In `runColocatedPinPopupDockLayout` (**index.html only**), for each **open** cam where `colocatedMapClusterForCam` length = 2: assign **left/right slot from sort order** even when only one popup open.

**Do not touch** `assignClusterDockPlans` for 2-open clusters. **Do not** add `outwardDockSideForColocatedCam` globally.

---

## Honesty

| Question | Answer |
|----------|--------|
| Did revert cheat? | **No** — restored baseline; baseline never PASS on Chin. |
| Why 1s vanish? | **GPS collapse** when popups &lt; 2 — real, fixable in MOB A. |
| Why Chin still bad? | **Single-popup right dock** — fixable in MOB B only. |
| Another global V3? | **No.** Two surgical MOBs or stop. |

---

## Your call

- **Stop** — no more pin work (valid)  
- **`MOB-APPLY MAP-PIN-SPREAD-KEEP-COLOCATED-V1`** then test #1 only  
- **`MOB-APPLY MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1`** after A PASS — test Chin  

No APPLY from agent unless you name the exact MOB.
