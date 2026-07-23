# MOB DISC — V2 broke blue “2” cluster click (confirmed regression)

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-22  
**Trigger:** Operator after `MAP-PIN-COLOCATED-OUTWARD-DOCK-V2` — blue **“2”** cluster icon no longer expands to **two orange pins** on click. **Open All** still opens both popups (screenshot 2).  
**Update 17:45:** Operator screenshot — **one merged orange dot** labeled **kk** only. Two pins stacked on **one pixel** again (same failure as yesterday, repeated).  
**Related:** `MOB-APPLIED-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2` (FAIL — regression + repeat of yesterday’s stacked-pin bug)

---

## Confirmed — V2 put the pins back on top of each other

| What you see now (17:45 screenshot) | What it means |
|-------------------------------------|---------------|
| **One** orange circle, label **kk** | Chin + kk **merged on same map pixel** — not two dots |
| No blue **“2”**, no Chin label | Spread logic stacked both pins; cluster/spiderfy can’t help |
| “We had this 5 times yesterday” | **Same bug class** — colocated spread/dock math fighting identical GPS |

**Yes: V2 re-introduced the bad stacked-pin state.** Not operator error.

---

## Confirmed — V2 broke cluster click (earlier report)

| What you see | Meaning |
|--------------|---------|
| Blue circle **“2”** — click does nothing | Leaflet cluster cannot split Chin + kk into two visible pins |
| **Open All** → both videos + “Stacked nearby (2)” | Popup path still works — different code path |
| Feels like “whole thing fucked” | Fair — cluster path regressed while Open All masks it |

**Yes: V2 introduced a real bug.** Not imagined.

---

## Plain English — why (same bug as yesterday)

Chin and kk share the **same GPS** (colocated lab pair).

V2 `outwardDockSideForColocatedCam` when longitude is **equal**:

```
Chin lng === center lng  →  'right'
kk lng   === center lng  →  'right'   ← BOTH same side
```

Spread moves **both pins to the same screen spot** (both east of center).

```
GOOD (pre-V2 / gold):     🟠Chin    🟠kk     two dots

BAD (V2, your screenshot):  🟠kk only   one dot — Chin hidden under kk
```

**Yesterday’s fix was:** slot order — first cam **left**, second **right** — even when GPS is identical.  
**V2 removed that tie-break** and replaced it with broken lng compare.

`spreadStableColocatedMarkers` also runs on **zoom** with **no popup open** — so the map looks broken **before you click anything**.

---

## Plain English — why (cluster click path)

---

## Code proof

`public/index.html` ~10429:

```javascript
return ll.lng < center.lng ? 'left' : 'right';
// equal lng → always 'right' for BOTH cams
```

`spreadStableColocatedMarkers` runs this on **every zoom** (via `schedulePinSpreadReproject` on `zoomend`) — **even with no popups open** — so the bad spread is active before you click anything.

---

## What PASS looks like

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** — map shows **two separate orange dots** (Chin + kk labels), not one merged dot | ☐ |
| 2 | If zoomed out: blue **“2”** — click → two separate pins | ☐ |
| 3 | Click **Chin only** → panel **left** of Chin; **kk dot visible** | ☐ |
| 4 | Click **kk** → Chin dot visible | ☐ |
| 5 | **Open All** → both panels outward | ☐ |

---

## Recommended fix — one MOB (agent pick)

**Name:** `MAP-PIN-COLOCATED-OUTWARD-DOCK-V3`

### In scope (small, targeted)

1. **Tie-break when GPS/screen equal** (Chin + kk same lat/lng):
   - Use `sortClusterForDock` order: index **0 → left**, index **1 → right** (same as pre-V2 slots).
   - Apply in `outwardDockSideForColocatedCam` only when `|lng diff| < epsilon` OR `|screen X diff| ≤ 2px`.

2. **Do not change** Open All, WVP, video, PTT, cluster plugin config.

3. Files: `public/index.html`, mirror `public/js/dashboard-boot.js`.

### Optional hardening (same MOB if cheap)

- Run `spreadStableColocatedMarkers` **only** when at least one popup is open in that GPS pair — stops fighting cluster zoom when map is idle. **Only if V3 tie-break alone doesn’t PASS test #2.**

### Out of scope

- Rebuild map / new app
- Turn off WVP
- Another night of dock/fan experiments

### Risk

**Low** — ~10 lines in one function + verify. If tie-break fails test #2, add spread-when-open guard in same MOB.

---

## What we will NOT do again

- Another open-ended dock/fan rewrite
- Mix lng compare + slot order without tie-break
- Spread colocated pins on every zoom when nothing is open (optional guard in V3 only if tie-break alone fails)

---

## If you want zero risk tonight

**Revert phrase (you only):** restore pre-V2 pin layout slice from baseline — stops merged-dot immediately.  
Agent will **not** auto-restore.

---

## Agent honesty

| Question | Answer |
|----------|--------|
| Did V2 stack pins again? | **Yes** — your screenshot proves it (one dot, kk label). |
| Same as yesterday? | **Yes** — identical GPS + missing left/right tie-break. |
| Can V3 fix in one pass? | **Yes** — restore slot tie-break when GPS equal; ~10 lines. |
| Another whole night? | **No** — one MOB, five checks, pass/fail, stop. |

---

## Ask (only if you want fix tonight)

**`MOB-APPLY MAP-PIN-COLOCATED-OUTWARD-DOCK-V3`**

If not: stop here. No more pin MOBs until you say go.
