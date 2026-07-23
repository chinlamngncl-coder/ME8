# MOB APPLIED — MAP-PIN-COLOCATED-OUTWARD-DOCK-V2

**Date:** 2026-07-22  
**Status:** REVERTED — `REVERT-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2` (2026-07-22). See `MOB-APPLIED-REVERT-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2-20260722.md`

---

## Problem

Click **Chin only** → popup docked **right** → covered **kk** dot. V1 only fixed dock when two popups open.

---

## Fix

1. **`outwardDockSideForColocatedCam`** — 2-cam GPS cluster: dock **left** if pin is west of cluster center (screen X or GPS lng fallback pre-spread).
2. **`outwardDockPlanForOpenCam`** — single open popup in 2-cluster gets outward side, not `PIN_POPUP_DOCK_SLOTS[1]` right-only.
3. **`assignClusterDockPlans`** — length 1 + length 2 clusters use outward rule; 3+ unchanged.
4. **`clusterMetaForOpenCam` / `clusterMetaForMapCluster`** — treat colocated pair as cluster even when one popup open → no viewport flip undoing left dock.
5. **`runColocatedPinPopupDockLayout`** — mapCluster outward pass for every open cam in 2-cluster.
6. **Marker click** — spread + outward dock **before** `openPopup` (no 150ms wrong-side flash).
7. **`attachPinPopupDockForCam`** — initial bind uses outward, not blind right.

---

## Files

| File | Change |
|------|--------|
| `public/index.html` | Live map boot — outward dock V2 |
| `public/js/dashboard-boot.js` | Mirror |

---

## Operator verify

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** → click **Chin only** → kk dot visible + clickable | ☐ |
| 2 | Click **kk** → Chin dot visible | ☐ |
| 3 | Open All → both panels outward | ☐ |
| 4 | Chin panel arrow points at Chin; box not over kk | ☐ |
