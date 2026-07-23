# MOB APPLIED — MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1

**Date:** 2026-07-22  
**Status:** PASS — operator confirmed 2026-07-22  
**Disc:** `MOB-DISC-MAP-PIN-REVERT-FAIL-VANISH-AND-CHIN-20260722.md` (MOB B)

---

## Problem

Click **Chin only** (kk popup closed) → panel docked **right** → covered **kk** dot.  
Cause: `clusterOpenPinCamIds` sees one open popup → `PIN_POPUP_DOCK_SLOTS[1]` = always right.  
Live `index.html` lacked the **mapCluster** outward pass that `dashboard-boot.js` already had.

---

## Fix (surgical — no global rewrite)

1. **`runColocatedPinPopupDockLayout`** (`index.html`): after open-cluster loop, for each **open** cam in a **2-GPS** `colocatedMapClusterForCam` pair → apply `assignClusterDockPlans(mapCluster)` slot **left/right** (Chin left, kk right by sort order).

2. **`clusterMetaForOpenCam`**: if cam is in 2-GPS colocated pair, return cluster meta **even when only one popup open** — stops viewport flip undoing left dock on reposition.

**Not changed:** `assignClusterDockPlans`, `spreadStableColocatedMarkers`, marker click, V1/V2 outward globals.

---

## Files

- `public/index.html` (live map)
- `public/js/dashboard-boot.js` (`clusterMetaForOpenCam` mirror only; mapCluster pass was already present)

---

## Operator verify

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** | ☐ |
| 2 | Click **Chin only** → panel **left** of Chin; **kk dot visible + clickable** | ☐ |
| 3 | Click **kk** → Chin dot visible | ☐ |
| 4 | **Open All** → still L/R outward (no regression) | ☐ |

**Note:** Pins vanish ~1s after cluster click is **MOB A** (`MAP-PIN-SPREAD-KEEP-COLOCATED-V1`) — not in this MOB.
