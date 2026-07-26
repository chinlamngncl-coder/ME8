# MOB DISC — Tactical pin spread too wide (match Ops exactly)

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED** (eyes after `TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1`)  
**Ask:** Not so wide — check Ops — just do what Ops does. Full map pins too far apart / confusing.

---

## What operator sees

Spread **works** (pins no longer stacked) but the ring is **too large**, especially zoomed out — units look “across the map,” not a tight coloc stack like Ops.

---

## What we did wrong vs Ops

| | Ops (`dashboard-boot.js`) | Tactical APPLY (now) |
|--|---------------------------|----------------------|
| Pixel radius | `distPx = Math.max(58, 38 + n * 14)` | `Math.max(90, 56 + n * 22)` — **wider on purpose** (wrong) |
| When spread shows | Coloc logic + **MarkerCluster** at low zoom (one badge, not a huge ring) | **Always** spreads every coloc cluster at **every** zoom |
| Full / island zoom | Cluster icon — pins not flung across Singapore | Same 90px offset ≈ **huge** ground distance → confusing |

So the bug is not “need more split” — it is **we overshot Ops** and **spread at zooms where Ops would still be clustered**.

---

## Locked fix ask

1. Use **exact Ops** formula: `Math.max(58, 38 + cluster.length * 14)`.  
2. Same bearings idea (L/R/T/B).  
3. **Do not spread at island / full zoom** — only spread when zoom is high enough that Ops would show individual pins (Ops cluster disables around zoom **16**; use the same idea: below that threshold, keep markers on true GPS / collapse; at/above, apply Ops `distPx`).  
4. Keep `_gpsLatLng` as true GPS.  
5. Out: rewriting Ops, blueprint, SEC, Turf.

---

## Recommended next APPLY (one)

**`TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1`**

Scope:

1. Change `distPx` to Ops: `Math.max(58, 38 + cluster.length * 14)`.  
2. Gate spread: only when `map.getZoom() >= 16` (or Ops-equivalent); else snap display to true GPS.  
3. Re-run on zoomend (already wired).  
4. No other features.

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1` | APPLIED → **too wide** (eyes) |
| **`TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1`** | **NEXT** |
| SEC Google five | After this PASS (or override) |

---

## Next command

`MOB-APPLY TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1`

Until APPLY — **zero code**.
