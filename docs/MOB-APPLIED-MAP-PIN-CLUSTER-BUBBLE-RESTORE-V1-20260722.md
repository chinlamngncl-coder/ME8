# MOB APPLIED — MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1

**Date:** 2026-07-22  
**Status:** FAIL — operator 2026-07-22 (click blue → 2 pins → snap back to blue). See `MOB-DISC-MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1-20260722.md`  
**Disc:** `MOB-DISC-MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1-20260722.md`

---

## Problem

Idle map: blue **MarkerCluster** count bubble missing for colocated devices (Chin+kk). Pins flash then vanish ~1s after cluster click when no popups open.

**Cause:** `spreadStableColocatedMarkers()` ran on **zoomend** and dock debounce **even with zero popups open**, pulling colocated pins ~58px apart → MarkerCluster could not group them. `collapseClusterMarkersToGps()` existed but was never called on popup close.

---

## Fix

1. **Gate spread** — `spreadStableColocatedMarkers` only runs when `getOpenPinCamIds().length > 0` or `__me8PinBatchOpening`; per-cluster spread only when that GPS group has an open popup.

2. **Idle collapse** — new `collapseIdleColocatedMarkersForClustering()` calls `collapseClusterMarkersToGps` + `reattachColocatedMarkersForCluster` + `refreshMapPinClusters` when last popup closes (via `assignColocatedPinPopupDocks`).

3. **zoomend** — `schedulePinSpreadReproject` calls spread **only** when popups open (preserves MarkerCluster spiderfy after blue-bubble click).

4. **`MapPinLayer.refreshClusters()`** — wrapper for cluster group refresh after idle collapse.

5. **Boot / GPS upsert** — no spread when idle; boot path collapses colocated markers for clustering.

**Not changed:** `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` (`runColocatedPinPopupDockLayout` mapCluster pass, `clusterMetaForOpenCam`).

---

## Files

- `public/index.html`
- `public/js/map-pin-layer.js` (`refreshClusters`)
- `public/js/dashboard-boot.js` (mirror)

**Cache bust:** `map-pin-layer.js?v=20260722-cluster-bubble-restore`

---

## Operator verify

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** | ☐ |
| 2 | Idle map → **blue “2”** for Chin+kk (dynamic count) | ☐ |
| 3 | Click **“2”** → two orange pins **stay** (no 1s vanish) | ☐ |
| 4 | Click **Chin only** → panel left; **kk dot visible** (prior MOB regression check) | ☐ |
| 5 | Close all popups → blue **“2”** returns | ☐ |
| 6 | **Open All** → L/R spread + panels still OK | ☐ |
