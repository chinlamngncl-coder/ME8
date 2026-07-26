# MOB DISC — Split near-GPS pins + team color (match ops map)

**Date:** 2026-07-24  
**Status:** APPLIED — awaiting operator PASS/FAIL  
**APPLY:** `TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1`  
**APPLIED doc:** `MOB-APPLIED-TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1-20260724.md` 

---

## Operator ask

1. **Split the pin also** when GPS locations are near — same logic as the **ops map** (not only fan the video bubbles).  
2. On **full / wide map view**, the pin is easy to miss (“I don’t see the pin actually”).  
3. Pin color must be **team color** like ops — **purple is wrong**.

Video drag + popup spiderfy can stay. This Disc is about the **markers themselves**.

---

## Locked concept

| Piece | Ops map today | Tactical must match |
|-------|---------------|---------------------|
| Near GPS | `markerClusterGroup` + **spiderfy** so stacked units separate | Same idea on Tactical map for BWC / grab markers |
| Pin color | `groupColorForDevice` / map group team color | BWC (and grab ephemeral) pins use **team color**, not hardcoded purple |
| Visibility | Cluster / spiderfy so you can find units at zoomed-out view | At full view you must still **see** that someone is there (cluster badge or visible pin), then spiderfy to pick which |

```text
Full map view
  → near GPS → one cluster / stacked mark you can SEE
  → zoom or click → spiderfy pins apart (L/R/T/B around point)
  → each pin = team color
  → open video on those pins (existing drag + popup fan still OK)
```

**Purple POI** (prepare AR bookmarks) may stay a distinct “virtual POI” style **or** tint from linked cam’s team — agent recommendation: **BWC / grab pins = team color**; **manual POI** can keep a secondary style but must not steal BWC identity as purple.

---

## Why purple is wrong

Tactical hardcoded `.ax-tactical-poi-marker-inner` purple for all POI markers, and grab BWC used amber — neither is **ops team color**. Operator expects the same color language as the fleet map so they know **which team** at a glance.

---

## Recommended next APPLY (one)

**`TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1`**

Scope:

1. Tactical BWC / grab markers: **team color** via same `groupColorForDevice` (or shared helper) as ops/fleet.  
2. Near-GPS: **cluster + spiderfy** on the Tactical Leaflet map (reuse ops pattern / `L.markerClusterGroup` if already vendored for ops — same behavior).  
3. Full-view visibility: cluster icon or clear mark so pins aren’t “invisible”; spiderfy on zoom/click so stacked units separate.  
4. Keep pin **video** drag + popup offset from prior APPLYs.  
5. Out: Turf, dual-pane, edge tile bank, rewriting ops map.

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-PIN-VIDEO-DRAGGABLE-V1` | APPLIED — “good” |
| **`TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1`** | **APPLIED** — awaiting PASS |
| Turf | Next after PASS |

---

## Next command (after PASS)

`MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`
