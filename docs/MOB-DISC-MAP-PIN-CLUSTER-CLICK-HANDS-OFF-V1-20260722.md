# MOB DISC — MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1

**Status:** PASS — operator confirmed 2026-07-22 — see `MOB-APPLIED-MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1-20260722.md`  
**Date:** 2026-07-22  
**Trigger:** Operator FAIL — click blue **“2”** → two pins flash → **snap back to blue** (~150 ms). “Playing games.” Prior agent ran away; this is the **single path forward**, not a park.  
**Prior FAIL:** `MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1` — do **not** iterate; **replace** with this MOB.  
**Keep PASS:** `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` (Chin-only left dock).

---

## Not giving up

| Wrong | Right |
|-------|-------|
| “Map is too hard” | **One surgical MOB** — stop custom pin code when no popup open |
| “Pick A or B” | **Agent pick:** `MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1` only |
| “Stop pin work” | **Finish** cluster click + blue bubble — original Fleet behaviour |
| Agent edits without APPLY | **Zero change** until `MOB-APPLY MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1` |

This **is** original Fleet (MarkerCluster Phase B). Custom spread/dock code ** broke** it. Fix = **hands off when idle**, dock/spread **only when popup open**.

---

## Original behaviour (what PASS is)

| State | Map |
|-------|-----|
| Idle, zoomed out | Blue bubble, **dynamic count** (2, 3, … — not hardcoded) |
| Click blue bubble | **N orange pins stay** (spiderfy) until zoom out / click away / open pin |
| Popup open | Spread + dock (Open All, Chin-only PASS, etc.) |
| Close last popup | Collapse → blue bubble returns |

**Plugin:** `public/js/map-pin-layer.js` — `L.markerClusterGroup`, `spiderfyOnMaxZoom: true`, `maxClusterRadius: 55`.

---

## FAIL symptom (operator 2026-07-22)

```
Click blue "2"
  → spiderfy: 2 pins visible          (~0 ms)   OK
  → dock debounce fires               (~150 ms) BAD
  → collapseIdleColocated… + refresh  → blue "2" again   "playing games"
```

Second timer (pre-existing): GPS flush ~300 ms → `upsertDeviceMarker` → `setLatLng` stacks pins — same class of bug; **same MOB fixes both**.

---

## Root cause (locked)

**Two systems on the same markers:**

1. **MarkerCluster** — group, spiderfy, keep pins apart after cluster click  
2. **Custom spread/collapse/dock** — for popup panels / Open All  

They **fight when no popup is open.**

### Kill chain (live `public/index.html`)

| Step | Code | Effect |
|------|------|--------|
| 1 | Cluster click | MarkerCluster spiderfies |
| 2 | Spiderfy moves markers | `m.on('move')` → `assignColocatedPinPopupDocks('gps-update')` |
| 3 | 150 ms debounce, 0 popups | `collapseIdleColocatedMarkersForClustering()` (**CLUSTER-BUBBLE-RESTORE-V1**) |
| 4 | `collapseClusterMarkersToGps` + `refreshMapPinClusters()` | Same GPS → blue bubble |

**CLUSTER-BUBBLE-RESTORE-V1** restored idle blue but ** broke cluster click** by collapsing on spiderfy `move`.

---

## Regression timeline (honesty)

| When | What |
|------|------|
| Phase B | Cluster click + blue count **worked** |
| Colocated dock era | `spreadStableColocatedMarkers` on zoom/dock **even idle** → no blue bubble |
| Outward-dock V1/V2 | Global rewrite → merged pins, dead cluster |
| Revert | Spread-on-idle + GPS collapse → flash/vanish |
| CLUSTER-BUBBLE-RESTORE-V1 | Idle collapse on dock path → **snap-back on cluster click** (FAIL) |
| **Next** | **HANDS-OFF-V1** — one MOB, one verify |

---

## MOB — MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1

**Rule:** `getOpenPinCamIds().length === 0` and not `__me8PinBatchOpening` → **do not move colocated markers**. MarkerCluster owns position. Dock/spread **only** when a popup is open.

### In scope

| # | Change | File(s) |
|---|--------|---------|
| 1 | `assignColocatedPinPopupDocks` — **return immediately** when 0 popups (no debounce, no spread, no collapse) | `index.html`, `dashboard-boot.js` |
| 2 | Marker `move` hook — call dock **only** if **that cam’s popup is open** (ignore spiderfy / cluster moves) | `index.html` |
| 3 | `upsertDeviceMarker` — idle colocated: update `_gpsLatLng`; **skip `setLatLng`** when 0 popups (stops GPS re-stack) | `index.html`, `dashboard-boot.js` |
| 4 | **Delete** `collapseIdleColocatedMarkersForClustering` from generic dock/zoom paths; popup-close may collapse **once** if blue bubble doesn’t return | same |
| 5 | `schedulePinSpreadReproject` / `zoomend` — **no spread** when 0 popups (already partial; enforce) | `index.html` |
| 6 | **Do not touch** `runColocatedPinPopupDockLayout` mapCluster pass / `clusterMetaForOpenCam` (Chin PASS) | — |

### Out of scope

- Global `assignClusterDockPlans` rewrite  
- Revert MarkerCluster / WVP  
- Hardcode Chin/kk or fixed “2”  
- Another bubble-restore MOB on top of FAIL code without reverting FAIL collapse path first  

### Files

- `public/index.html` (live map — primary)  
- `public/js/dashboard-boot.js` (mirror)  
- Cache bust if `map-pin-layer.js` touched (unlikely this MOB)

### Risk

**Low** — idle path only. Popup-open dock unchanged. Re-test Chin-only + Open All after cluster click PASS.

---

## Operator verify (one pass)

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** | ☐ |
| 2 | Idle → blue **“2”** | ☐ |
| 3 | Click **“2”** → **two pins stay** (no snap to blue) | ☐ |
| 4 | Click **Chin** only → panel **left**, kk visible | ☐ |
| 5 | Close all → blue **“2”** returns | ☐ |
| 6 | **Open All** → L/R OK | ☐ |

Operator: restart, refresh once, pass/fail from what you see. Agent owns diff, cache bust, doc.

---

## APPLY phrase

**`MOB-APPLY MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1`**

Until then: **disc only, no edits.**

---

## Agent must NOT

- Say park, give up, 80% fine, or “which do you prefer”  
- Bundle another MOB into this one  
- Re-run CLUSTER-BUBBLE-RESTORE-V1 logic  
- Touch Chin PASS dock without explicit separate MOB  

## Agent must DO (on APPLY)

1. Implement table above — **one MOB**  
2. Write `MOB-APPLIED-MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1-20260722.md`  
3. Mark CLUSTER-BUBBLE-RESTORE-V1 superseded (FAIL stays on record)  
4. Cache bust if needed  

---

## Status ledger

| MOB | Status |
|-----|--------|
| `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` | **PASS** |
| `MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1` | **FAIL** — superseded |
| `MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1` | **PASS** |
