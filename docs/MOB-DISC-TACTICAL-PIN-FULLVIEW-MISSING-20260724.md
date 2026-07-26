# MOB DISC — Tactical pins missing at full map (cluster APPLY FAIL)

**Date:** 2026-07-24  
**Status:** APPLIED — awaiting operator PASS/FAIL  
**APPLY:** `TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1`  
**APPLIED doc:** `MOB-APPLIED-TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1-20260724.md`

---

## What operator sees

- Tactical map tiles OK (Singapore island, roads, airports).  
- **Zero** app pins / clusters on top.  
- This is a **FAIL** of the cluster + team-color APPLY’s full-view promise (“must still see that someone is there”).

---

## What that APPLY was supposed to do

| Promise | Result |
|---------|--------|
| Team color (not purple) | Cannot judge — nothing visible |
| Cluster + spiderfy when GPS near | Cannot judge — nothing visible |
| Full / wide view still shows a mark | **FAIL** |

Prior pieces that were OK (drag video, popup fan) are not proven in this zoomed-out shot; this Disc is about **marker visibility / mount**.

---

## Likely causes (agent diagnosis — ranked)

### 1) Pins too small / unlabeled at island zoom (high)

Ops map pins use **dot + name label** (`bwc-pin-*`, ~wide icon).  
Tactical cluster APPLY used a **~24px colored circle** (and ~44px cluster). At full-island view that is easy to miss or look like “nothing.”  
Purple was already called hard to see; this APPLY may have made it **worse**, not better.

### 2) No markers actually mounted (high if no POIs / no GPS)

Tactical does **not** reuse ops Leaflet markers. It builds its own layer:

- Prepare **POIs** from localStorage — only if you placed some.  
- **Live BWC** via `syncLiveBwcPins` — only if device is online **and** GPS lat/lng resolves (`deviceMarkers` / device fields).  

If lab BWCs have no GPS (or filter as offline) and there are no POIs, the map stays empty even when the code path is healthy.

### 3) Cluster layer / mount glitch (medium)

Markers go through `L.markerClusterGroup` on the **Tactical** map only. A throw during `ensureCluster` / `remountMarkers`, or cluster icons not painting, would wipe the old simple `layerGroup` path and leave **tiles only**. Needs one repair pass with a safe fallback + a visible count.

### 4) Not this

- Tile server / Singapore basemap — tiles are fine.  
- Edge tile bank / dual-pane — unrelated.  
- Turning off WVP handoff — forbidden / not relevant.

---

## Locked product ask (from eyes)

At **full map view** on Tactical you must **see** units (cluster badge and/or ops-style pins).  
Zoom / click still spiderfy near-GPS stacks.  
Team color stays.  
Pin **video** drag + popup fan stay.

---

## Recommended next APPLY (one)

**`TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1`**

Scope:

1. **Prove mount:** Tactical always shows live BWC with GPS (and existing POIs) on its cluster layer; status or rail hint if count is 0 (“no GPS units”).  
2. **Full-view chrome:** Ops-like visibility — larger dot + short label (or equally visible cluster badge) so island zoom is not blank.  
3. **Keep** team color, cluster/spiderfy, popup fan, video drag.  
4. **Safe fallback:** if `markerClusterGroup` fails, fall back to plain layer group so pins never go totally dark.  
5. **Out:** Turf, dual-pane, edge bank, rewriting ops `map-pin-layer.js`.

Why this first (not Turf): eyes FAIL is “cannot see pins at all.” Zone engine is useless until markers are visible again.

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1` | APPLIED → **FAIL** (full view empty) |
| **`TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1`** | **APPLIED** — awaiting PASS |
| `TACTICAL-ZONE-TURF-ENTRY-EXIT-V1` | Waits until pins visible |

---

## Next command (after PASS)

`MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`
