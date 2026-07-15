# MOB DISC — FR Expand eats the top chrome (bad geometry)

**Status:** DISC · **`mob-fr-map-expand-side-dock` APPLIED 2026-07-13**  
**Date:** 2026-07-13  
**Trigger:** Expand ~3× works, but the card grows **into / under the top nav** (“covered by the top”). Bad logic — bigger is useless if clipped.  
**Search:** fr-snap-map expand, autoPan, top chrome, leaflet popup, detach review, side dock  
**Related:** `mob-fr-map-snap-real-expand` (superseded for Expand) · `MOB-DISC-FR-MAP-PIN-TAG-RESTORE-VIEW.md`  

---

## APPLIED — `mob-fr-map-expand-side-dock`

| Action | Behavior |
|--------|----------|
| **Expand** | Closes pin bubble; opens **side dock** inside `#map` (left or right — free side vs pin) |
| **Minimize** | Closes dock; reopens small pin popup |
| **Tether** | Dashed rose line pin → dock; updates on pan/zoom |
| **Close** | Clears dock + FR marker |
| Size | ~`min(420px, 46% map width)`, `max-height: calc(100% - 64px)`, top inset **52px** (below Fit pins) |

**File:** `public/index.html` (CSS + map FR anchor helpers)

**Not under Axiom top nav** — dock is a child of the map container only.

---

## What was wrong

Expand as “same Leaflet bubble, larger CSS” → balloon above pin → fights header. Rejected.

---

## Design rule (locked)

**Expand must stay inside the map stage** — never borrow the global header band.

---

## Parked alternatives

| MOB | Status |
|-----|--------|
| `mob-fr-map-expand-flip-safe` | Not needed if side-dock PASS |
| grow Leaflet max-height only | Rejected |

---

## Verify

1. Hard refresh  
2. FR Show on map → small bubble OK  
3. **Expand** → card on side of map, face readable, tether to pin, **not** under top nav  
4. **Minimize** → back to pin bubble  
5. Keep / Close still work from dock  

---

## No further Expand code unless FAIL
