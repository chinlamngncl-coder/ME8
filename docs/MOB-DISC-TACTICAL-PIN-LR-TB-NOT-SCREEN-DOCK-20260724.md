# MOB DISC — Agent misread L/R/T/B (tile-bank dock = WRONG)

**Date:** 2026-07-24  
**Status:** APPLIED — `TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1` (await eyes PASS/FAIL)  
**Retracts as product face:** `TACTICAL-GRAB-RESULT-TILE-BANK-V1` (screen-edge video bank)

---

## Agent own it

You said GPS-near causes **pin stack**, and ops goes **left / right / top / bottom**.

Agent heard that as: build a **video wall dock** on the four **edges of the Tactical screen**.

That is a **joke** and wrong for Tactical.

**Tactical zone** = see the **pins** and manage **only the zone they want** — stay on the map, in the grab/zone.  
Nobody asked for wall panels glued to left/right/top/bottom of the desk like another Command Wall.

`TACTICAL-GRAB-RESULT-TILE-BANK-V1` is **rejected as the Operate layout**. Keep the files as a failed APPLY; do not treat edge-bank as PASS.

---

## What L/R/T/B actually means here (locked)

| Wrong (what agent built) | Right (ops) |
|--------------------------|-------------|
| Screen-edge tile bank (wall on 4 sides) | Stay **inside the tactical map / zone** |
| Leave the pin story for a dock chrome | **See the pin** — video belongs with the pin / zone |
| Manage a mini video wall | Manage **only the zone** they circled / care about |

**L / R / T / B** = how stacked pin videos **fan out around the pin cluster on the map** (offset popups / spiderfy so GPS-near cams are readable), **not** four screen docks.

```text
Zone / grab on map
  → pins in that zone only
  → video on those pins
  → if GPS piles up: spread pin video bubbles
       left / right / top / bottom of the cluster point
  → operator never leaves the zone map to a wall bank
```

Prepare / single Open linked pin popup = still valid.  
Batch grab = still **pin-facing**, with **stack fix = map-side offsets**, not a dock.

---

## What stays vs kill

| Keep | Kill / do not sell |
|------|---------------------|
| Grab circle, Prepare/Operate modes, banner | Open grabbed → **edge tile bank** as the success path |
| BWC/fixed FLV attach (media path) | “Dock Right/Left/Top/Bottom” as the product face |
| Cap 8 + cycle through **grabbed pins in zone** | Rebuilding Command Wall inside Tactical |

---

## Recommended next APPLY (one)

**`TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1`**

Scope:

1. Open grabbed keeps **pin video on the map** (popup / pin bubble) for cams in the zone only.  
2. When pins share near GPS (or would stack): **spiderfy / offset** those pin video panels to L/R/T/B around the cluster so each is visible.  
3. Cap 8 + Prev/Next still pages **which pins in the zone** are live — still on-map, not a dock.  
4. **Hide or ignore** the edge tile bank UI for Open grabbed (do not require operator to use it). Prefer remove bank from the grab path in this APPLY.  
5. Out: Turf, dual-pane wide PiP genre, wall dump.

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-GRAB-RESULT-TILE-BANK-V1` | APPLIED but **REJECTED** (wrong layout) |
| **`TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1`** | **NEXT** — pin video in zone; L/R/T/B = offset around pins |
| Dual-pane L2 | Still later / separate — not a substitute for pin-in-zone |
| Turf | Waits |

---

## Next command

`MOB-APPLY TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1`

Until APPLY — **zero code**.
