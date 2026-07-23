# MOB DISC — Restore blue device-count cluster icon (dynamic, no hardcoding)

**Status:** FAIL — see `MOB-DISC-MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1-20260722.md`  
**Date:** 2026-07-22  
**Trigger:** Operator PASS on `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` (Chin/kk single-click). Now wants **blue number bubble** back on map when devices are nearby — count must follow **how many devices** are colocated, not hardcoded Chin/kk.  
**Prior:** `MOB-DISC-MAP-PIN-REVERT-FAIL-VANISH-AND-CHIN-20260722.md` (MOB A — same root cause)

---

## Plain English — what the blue icon is

| What you see | What it is |
|--------------|------------|
| **Blue circle with a number** (e.g. **2**, **3**) | **Leaflet MarkerCluster** — fleet feature since Phase B |
| Number | **Automatic** = how many patrol pins are within cluster radius on screen |
| Not Chin/kk names | Count comes from **markers in the cluster group** — any devices, any lab |

CSS already styles it blue: `index.html` `.marker-cluster-* div` (blue `#3b82f6`).

Config: `public/js/map-pin-layer.js` — `maxClusterRadius: 55`, `disableClusteringAtZoom: 16`, click → zoom / spiderfy.

**No hardcoding needed** — MarkerCluster already does dynamic counts.

---

## What PASS looks like

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** — map idle, Chin + kk same area → **blue “2”** (not one merged orange dot) | ☐ |
| 2 | Add/move a **3rd** nearby BWC → bubble shows **“3”** (or separate cluster if farther) | ☐ |
| 3 | **Click blue “2”** → zoom/spiderfy → **two orange pins** with labels; pins **stay** (no 1s vanish) | ☐ |
| 4 | Click **Chin only** → still PASS from prior MOB (panel left, kk visible) | ☐ |
| 5 | Close all popups → markers **collapse** back to blue **“2”** | ☐ |
| 6 | **Open All** → spread + L/R panels still PASS | ☐ |

---

## Why the blue icon is missing today

Two map systems **fight each other**:

```
IDLE (want blue "2"):
  Markers at same GPS  →  MarkerCluster groups them  →  blue bubble + count

TODAY (broken):
  zoomend / dock path  →  spreadStableColocatedMarkers()  →  pins pulled apart ~58px
  MarkerCluster sees 2 separate points (or 1 weird dot)  →  NO blue bubble
  GPS tick (no popups)  →  snap to GPS  →  flash then spread again on zoom  →  “gone after 1 sec”
```

### Code culprits (not removed — just always on)

| Where | What |
|-------|------|
| `zoomend` → `schedulePinSpreadReproject` → `spreadStableColocatedMarkers` | Spreads colocated pins **even when no popup open** |
| `assignColocatedPinPopupDocks` (150 ms) | Same spread before dock layout |
| `upsertDeviceMarker` | When popups &lt; 2: `setLatLng(_gpsLatLng)` — **good** for cluster, but **undone** by spread on next zoom |
| `collapseClusterMarkersToGps()` | **Exists but never called** — no idle collapse back to cluster |

**Single-open outward dock (PASS)** did not touch spread — bubble was already broken by spread-on-idle.

---

## Recommended MOB (agent pick)

**Name:** `MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1`  
(same fix as parked **MOB A** `MAP-PIN-SPREAD-KEEP-COLOCATED-V1` — one MOB, clearer name)

### In scope

1. **Gate `spreadStableColocatedMarkers`** — only when **at least one popup is open** in that GPS colocated group, or `Open All` / `__me8PinBatchOpening`.  
   **Idle map:** markers stay on `_gpsLatLng` → MarkerCluster shows blue count.

2. **`schedulePinSpreadReproject` on `zoomend`** — call spread **only if** `getOpenPinCamIds().length > 0`.

3. **Idle collapse** — when last popup in a GPS cluster closes: `collapseClusterMarkersToGps(cluster)` + `MapPinLayer` cluster refresh (add `refreshClusters()` wrapper if needed).

4. **Keep** `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` behaviour (do not revert).

### Out of scope

- Hardcode Chin/kk or fixed “2”
- Change cluster colours (already blue)
- WVP / video / Case Files
- New cluster plugin

### Files

- `public/index.html` (spread gate, zoomend gate, popup-close collapse)
- `public/js/map-pin-layer.js` (optional `refreshClusters()`)
- Mirror `dashboard-boot.js` if spread logic duplicated

### Risk

**Low–medium** — spread timing only; Chin single-click PASS must be re-tested.

---

## Order

| Step | MOB | Status |
|------|-----|--------|
| 1 | `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` | **PASS** |
| 2 | `MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1` | **FAIL** — replaced by hands-off disc |

---

## Ask

Applied 2026-07-22 — operator verify per MOB-APPLIED doc.
