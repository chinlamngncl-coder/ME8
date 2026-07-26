# MOB DISC — Tactical near-GPS pins still stacked (split like Ops)

**Date:** 2026-07-24  
**Status:** DISC — **LOCKED** (eyes)  
**Evidence:** Zoomed tactical map — two BWCs (`340200000013…` / overlapping second label) share one orange stack; labels unreadable.  
**Ask:** “Try to split it more — check how ops page do it.”

---

## What operator sees

Pins **mount** (mount-prove path working).  
Near-GPS units still **sit on top of each other** — need **marker** split like Ops, not only video-popup fan.

---

## How Ops does it (source of truth)

Ops does **not** leave colocated markers at identical display lat/lng.

| Piece | Ops (`dashboard-boot.js`) |
|-------|---------------------------|
| True GPS | Kept on `marker._gpsLatLng` |
| Who is “near”? | `clusterAllPinCamIdsByGps()` — meters threshold `PIN_COLOC_CLUSTER_M` |
| Split | `spreadStableColocatedMarkers()` — from GPS **centroid**, offset each pin in **screen pixels** on L/R/T/B (and diags) via `PIN_DOCK_SPREAD_BEARING` + `distPx` (~58px+, grows with count) |
| Display | `mk.setLatLng(map.layerPointToLatLng(offsetPoint))` — visual only |
| Restore | Non-spread pins snap back to `_gpsLatLng` |
| Zoom-out | Also `MapPinLayer` MarkerCluster / spiderfy |

So Ops splits the **dots + name tags** on the map. Popups are a separate fan.

---

## What Tactical does today (gap)

| Piece | Tactical today |
|-------|----------------|
| Live BWC markers | Copied GPS onto second map; ops-style label+dot chrome |
| Pin layer | Plain `L.layerGroup` (cluster removed in mount-prove) |
| Near-GPS | Markers stay on **true GPS** → **stack** (this screenshot) |
| Spiderfy | `assignSpiderOffsets` only fans **video popups** on Open grabbed — **does not move marker icons** |

So “split more” ≠ bigger popup offset. Need **Ops-like marker spread** on Tactical.

---

## Locked product ask

When two+ Tactical pins share near GPS (same lab stack as Ops):

1. **Markers + labels** fan apart (L/R/T/B, readable) — same idea as Ops pixel spread.  
2. True GPS stays stored (for grab circle / Turf later) — display offset only.  
3. Keep team color, video drag, grab popup fan.  
4. Do **not** rewrite Ops `dashboard-boot.js` / Firmware Gold pin cores — **port the pattern** into `tactical-poi.js` only.

---

## Recommended next APPLY (one)

**`TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1`**

Scope:

1. Cluster live BWC (+ optional POI) by map distance (Ops-like meters threshold).  
2. When cluster size ≥ 2: spread **display** positions from centroid in pixel bearings L/R/T/B (Ops `distPx` ballpark; tune so labels don’t overlap).  
3. Keep `host.lat/lng` (or `_gpsLatLng` on marker) as true GPS; grab / distance math uses true GPS.  
4. Re-run spread on zoom/moveend so split stays stable.  
5. Out: blueprint UV schema, SEC genre, Turf, dual-pane, editing Ops map code.

**Why this first:** Eyes are on readable pins now that mount works. Blueprint SSOT stays paper. SEC stays next genre after Tactical pin UX PASS (unless operator jumps SEC).

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1` | APPLIED — pins visible |
| **`TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1`** | **NEXT** — split stacked markers like Ops |
| Blueprint schema UV | Paper — waits |
| SEC Google five | After Tactical pin UX handoff (or override) |

---

## Next command

`MOB-APPLY TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1`

Until APPLY — **zero code**.
