# MOB APPLIED — MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1

**Date:** 2026-07-22  
**Status:** PASS — operator confirmed 2026-07-22  
**Disc:** `MOB-DISC-MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1-20260722.md`  
**Supersedes FAIL:** `MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1`  
**Keep PASS:** `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1`

---

## Problem

Click blue **“2”** → MarkerCluster spiderfies → **~150 ms later snap back to blue** (“playing games”). Custom dock/spread/collapse fought MarkerCluster when **zero popups open**.

---

## Fix

**Rule:** When idle (`0` popups, not `__me8PinBatchOpening`) → **hands off** marker positions. MarkerCluster owns spiderfy. Dock/spread **only when popup open**.

| # | Change |
|---|--------|
| 1 | `assignColocatedPinPopupDocks` — **return immediately** when 0 popups (no debounce, spread, or collapse) |
| 2 | Marker `move` — dock only if **that cam’s popup is open** (ignore spiderfy moves) |
| 3 | `upsertDeviceMarker` — idle colocated: update `_gpsLatLng`; **skip `setLatLng`** (stops GPS re-stack) |
| 4 | `collapseIdleColocatedMarkersForClustering` — **popup-close only** (blue bubble return after close) |
| 5 | `schedulePinSpreadReproject` — spread only when popups open (unchanged enforcement) |
| 6 | Chin outward dock (`runColocatedPinPopupDockLayout` mapCluster pass) — **not touched** |

---

## Files

- `public/index.html`
- `public/js/dashboard-boot.js` (mirror)

---

## Operator verify

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** | ☐ |
| 2 | Idle → blue **“2”** | ☐ |
| 3 | Click **“2”** → **two pins stay** (no snap to blue) | ☐ |
| 4 | Click **Chin** only → panel **left**, kk visible | ☐ |
| 5 | Close all → blue **“2”** returns | ☐ |
| 6 | **Open All** → L/R OK | ☐ |
