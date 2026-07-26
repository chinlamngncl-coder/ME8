# MOB DISC — Tactical pins still missing (ops-chrome APPLY FAIL)

**Date:** 2026-07-24  
**Status:** DISC — **LOCKED**  
**Eyes:** **FAIL** — island / Singapore zoom still tiles only (airports/roads from basemap). No BWC label pins, no POI pins, no cluster badge.  
**Failed APPLY:** `TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1` (repair of cluster APPLY — both FAIL at full view)

---

## What we know

| Check | Result |
|-------|--------|
| Basemap / Leaflet host | OK (Singapore tiles paint) |
| Ops-style chrome code shipped | Yes (label+dot, cache bust) |
| Pins / cluster visible to operator | **No** |
| Blueprint / DB pins | N/A — not built; pins are lat/lng layers only |

Chrome size alone did **not** fix the empty map. Problem is almost certainly **mount / data / silent error**, not “dot too small.”

---

## Ranked root causes

### 1) Silent throw on Tactical show (high)

`TacticalShell.onShow` wraps `TacticalPoi.onShow()` in `try/catch` and **swallows errors**.  
Any exception in `ensureCluster` / `remountMarkers` / `pinIcon` / `syncLiveBwcPins` → **tiles only**, operator sees nothing, console may be empty if not open.

### 2) Zero GPS sources on Tactical mirror (high)

Live BWC pins are **copied** from fleet GPS (`deviceMarkers` / device lat-lng).  
They are **not** the ops Leaflet markers themselves (second map instance).

If at smoke time:

- no BWC GPS yet, and  
- no Prepare POIs in `localStorage` (`me8.tacticalPois.v1`),  

…the layer correctly has **0 markers** → blank island. Ops chrome cannot invent pins.

### 3) Cluster layer + hidden panel (medium)

Tactical view starts `hidden`. Map/cluster created or refreshed while size is 0, then shown — markers sometimes never paint until `invalidateSize` + cluster refresh. Current path may not force a post-visible remount.

### 4) Not this

- Wrong basemap  
- Need for blueprint % math (not built)  
- Edge tile bank / Turf  

---

## Locked product ask

On Tactical at full map, operator must either:

1. **See** BWC/POI pins (or one clear cluster), **or**  
2. See an **unmissable on-map message** that nothing is mounted (not a quiet blank OSM).

And: errors must not be swallowed — mount must be provable.

---

## Recommended next APPLY (one)

**`TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1`**

Scope:

1. **Stop swallowing** Tactical POI onShow errors (log + status line).  
2. **Prove mount path:** after panel visible → `invalidateSize` → remount/sync → if cluster flaky, **force plain `L.layerGroup`** for pins (keep spiderfy popup offsets; cluster can return later).  
3. **Copy GPS aggressively** from `window.deviceMarkers` / devices; if ops has pins and Tactical count is 0, that is a bug to fix in this MOB.  
4. **On-map empty state** (banner on `#ax-tactical-map`) when count is 0 — “No GPS units — Place POI or wait for BWC GPS”.  
5. Keep team color + ops label chrome + video drag.  
6. **Out:** Turf, blueprint overlay, dual-pane, rewriting ops map core.

Why this before Turf: cannot do zone entry/exit UX if the pin layer is invisible or empty without explanation.

---

## Operator note (for next smoke)

When you test the next APPLY, also glance at **Ops** map once:

- If Ops **has** named BWC pins and Tactical does not → mount bug (this MOB).  
- If Ops also has **no** pins → no GPS yet; empty Tactical is expected until Place POI or GPS arrives (empty banner must still show).

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1` | FAIL |
| `TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1` | **FAIL** |
| **`TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1`** | **NEXT** |
| Turf | Waits |

---

## Next command

`MOB-APPLY TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1`

Until APPLY — **zero code**.
