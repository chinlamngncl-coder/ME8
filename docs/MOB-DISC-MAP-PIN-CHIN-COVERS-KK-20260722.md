# MOB DISC — Map: Chin click covers kk pin (colocated pins)

**Status:** REVERTED 2026-07-22 — `REVERT-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2`  
**Date:** 2026-07-22  
**Trigger:** Operator — only problem left on map. Click **Chin** → Chin popup **covers kk pin** (can’t click kk). Click **kk** → **can see Chin pin**. Video path OK enough to move on after this layout fix.  
**Search:** `colocated`, `assignColocatedPinPopupDocks`, `PIN_POPUP_DOCK_SLOTS`, `chin`, `kk`  
**Related:** `MOB-DISC-MAP-PIN-FAN-2-REVERT.md` · `MOB-DISC-PIN-CLICK-POPUP-STOP-MINIMIZE-JUMP-20260721.md`

---

## Plain English — what you see

Chin and kk are **two bodycams at the same place** on the map (lab stack).

| You click | What happens |
|-----------|----------------|
| **Chin** | Chin video box opens **on top of** kk’s orange dot — hard to click kk |
| **kk** | kk video box opens — **Chin dot still visible** and clickable |

**Not a WVP / live engine bug** for this one. **Popup placement** bug for **two pins together**.

---

## What PASS looks like

| Rule | Detail |
|------|--------|
| Click **Chin** | Chin popup opens — **kk pin still visible and clickable** |
| Click **kk** | kk popup opens — **Chin pin still visible and clickable** |
| Both open (Open All) | Two boxes **beside** the pins — not on top of each other |
| Map does not jump to top | Keep today’s behaviour if still OK |
| Works for **any** two colocated cams — not hardcoded Chin/kk names |

---

## Why it happens (simple)

Code spreads the two dots **left and right** on the map. Good.

But the **video popup** side (left vs right of the dot) is picked from **channel slot / name sort**, not from **where the dot actually sits on screen**.

So Chin can get **“open on the right”** even when Chin’s dot is already on the **left** — the big popup grows **toward kk** and **covers kk’s pin**.

When you click **kk** (usually the **right** dot), its popup opens **more to the right** — away from Chin. That’s why kk feels fine and Chin does not.

```
FAIL (click Chin):
   [Chin popup — big box]
              🟠 Chin    🟠 kk  ← kk hidden under box

PASS:
   [Chin popup]  🟠 Chin    🟠 kk  [kk popup]
        ↑ left of Chin              ↑ right of kk
```

---

## Recommended MOB (one fix)

**Name:** `MAP-PIN-COLOCATED-OUTWARD-DOCK-V1`

### In scope

1. When **exactly 2** colocated pins (same GPS cluster):
   - After spread, read **screen position** of each dot.
   - **Left dot** → dock popup **left** (away from partner).
   - **Right dot** → dock popup **right** (away from partner).
2. On **click** / `bringPinPopupToFront`: re-run dock for that cluster so focused cam does not cover sibling **marker**.
3. Optional safety: sibling marker **z-index** stays above popup **edge** so dot stays clickable if boxes almost touch.
4. **No** map-edge fan (revert disc — do not repeat ±420px exile).
5. Files: `public/js/dashboard-boot.js` (dock assign), maybe small CSS only if needed.

### Out of scope

- WVP handoff / FLV / start-video
- Case Files
- Hardcode `chin` / `kk` strings
- 3+ pin fan (already separate path)

### Risk

**Low–medium** — map popup layout only; test Chin+kk + Open All.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Map idle → click **Chin** → kk pin **visible**, click kk works | ☐ |
| 2 | Close → click **kk** → Chin pin **visible**, click Chin works | ☐ |
| 3 | **Open All** → both popups, neither covers the other’s dot | ☐ |
| 4 | Pin video still plays (no regression to “must Open All first” unless separate) | ☐ |

---

## Order vs other map work

| Item | Status |
|------|--------|
| Case Files list/detail | **PASS** — done |
| **This MOB** | **Next** — only layout problem you named |
| Pin video without Open All first | Separate — `PIN-CLICK-POPUP-OPEN-…` if still fails **after** this PASS |

**Do this layout MOB first** — you can’t test click-to-video if kk is buried under Chin’s box.

---

## Agent pick

**`MOB-APPLY MAP-PIN-COLOCATED-OUTWARD-DOCK-V1`** — one APPLY, then you test Chin/kk clicks.

---

## Ask

**`MOB-APPLY MAP-PIN-COLOCATED-OUTWARD-DOCK-V1`**
