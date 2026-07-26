# MOB DISC — Tactical pin design (BWC vs fixed / prepared POI)

**Date:** 2026-07-26  
**Status:** **LOCKED** with `MOB-APPLY TACTICAL-POI-DRAG-DELETE-CLARITY-V1`

## Three pin kinds (do not mix)

| Kind | Who owns position | Drag on map? | Delete? |
|------|-------------------|--------------|---------|
| **BWC live** | Device GPS (moves by itself) | **No** — never edit GPS pin | Not as “Delete POI” (unit leaves when GPS gone / offline) |
| **Prepared POI** (Place POI) | Operator (saved lat/lng) | **Yes** — drag to edit place | **Yes** — select → Delete |
| **Fixed-cam linked POI** | Same as prepared (static site pin) | **Yes** — edit place when needed | **Yes** — select → Delete |

## Locked meaning of “fixed”

- Fixed cam pin **does not wander** like BWC.  
- It **stays** where you put it until you **deliberately** drag or delete.  
- “Without able to move” = **no auto-move**, not “forbidden to edit forever.”

## Operator rules (PREPARE)

1. Select pin (map or list).  
2. Drag the **map marker** to change place (not the video title bar).  
3. Delete = selected + **Delete POI** (with confirm).  
4. Rename / link fixed cam in the form anytime.

## Video chrome

Popup drag bar = move the **video window** only. Does **not** change pin GPS / POI place.

## Out of this MOB

- Floor-plan UV pins (later).  
- License Basic/Command caps.
