# MOB APPLIED — REVERT-MAP-PIN-COLOCATED-OUTWARD-DOCK-V2

**Date:** 2026-07-22  
**Status:** REVERT FAIL — pins vanish ~1s + Chin still covers kk (2026-07-22). See `MOB-DISC-MAP-PIN-REVERT-FAIL-VANISH-AND-CHIN-20260722.md`  
**Disc:** `MOB-DISC-MAP-PIN-V2-SCOPE-CREEP-OPEN-ALL-LAYOUT-GONE-20260722.md`

---

## What was reverted

Full undo of **V1 + V2** outward-dock experiments in map pin layout:

| Removed | Restored |
|---------|----------|
| `outwardDockSideForColocatedCam` | Gold slot `left` / `right` in `assignClusterDockPlans` |
| `outwardDockPlanForOpenCam` | Simple `PIN_POPUP_DOCK_SLOTS` per cluster size |
| `markerLayerPointForCam` screen-X sort (V1) | Slot/lng sort in `sortClusterForDock` |
| `clusterMetaForMapCluster` always-on | `clusterMetaForOpenCam` open-clusters only |
| Sync spread on marker click (V2) | Click → openPopup → debounced dock only |
| V2 `bringPinPopupToFront` sibling z-index | Single marker bringToFront |

---

## Files

- `public/index.html` (live map boot)
- `public/js/dashboard-boot.js` (mirror)

---

## Operator verify

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** | ☐ |
| 2 | Blue **“2”** → click → **two orange pins** (Chin + kk) | ☐ |
| 3 | **Open All** → L/R panels beside dots (gold layout) | ☐ |
| 4 | Click Chin only → kk dot visible (may still fail — pre-V2 known issue) | ☐ |

**Note:** Chin-cover-kk on single click was the original problem **before** V1/V2. This revert restores map + Open All layout — **does not** claim to fix single-click Chin cover.
