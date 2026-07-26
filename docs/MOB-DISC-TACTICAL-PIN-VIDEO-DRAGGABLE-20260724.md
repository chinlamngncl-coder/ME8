# MOB DISC — Draggable pin videos (stack + map block + walking BWC)

**Date:** 2026-07-24  
**Status:** APPLIED — `TACTICAL-PIN-VIDEO-DRAGGABLE-V1` (await eyes PASS/FAIL)  
**Builds on:** `TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1` (pin video in zone; L/R/T/B fan)

---

## Operator ask (plain English)

Spiderfy helps, but still:

- Pins can stack / crowd  
- Video bubbles can **block** map places you need to see  
- **BWC walks** — the world moves; the video panel should be something the operator can **move about** so they stay in control  

So: allow **pin videos to be dragged** (repositioned by the user), not locked only to auto fan offsets.

---

## Locked concept

| Piece | Role |
|-------|------|
| **Map pin / marker** | Still tracks **where** the cam/POI is (GPS can move for BWC) |
| **Pin video panel** | Live FLV bubble — operator may **drag** it on the map so it doesn’t stack or cover the wrong place |
| **Spiderfy** | Still a good **first open** layout when GPS-near; after that, **user drag wins** |
| **Zone** | Still only manage what you grabbed — no edge wall dock |

```text
Open grabbed → videos appear on/near pins (spiderfy if needed)
Operator drags a video bubble → stays where they put it (until close / next grab page)
BWC walks → marker can follow GPS; panel stays where operator parked it
  (optional later: “re-attach to pin” / “follow pin” — not required in V1)
```

**V1 rule:** Drag moves the **video panel** only. Does **not** rewrite POI lat/lng or BWC GPS. Marker can keep moving; panel is parked by the operator.

---

## Why this fits Tactical

- Stay **on the map / in the zone** (not a 4-side bank)  
- Stacking / blocking becomes the operator’s choice, not a hard layout fail  
- Walking BWC: you watch the picture without the bubble chasing and covering the street you care about  

---

## Recommended next APPLY (one)

**`TACTICAL-PIN-VIDEO-DRAGGABLE-V1`**

Scope:

1. Grabbed (and Open linked) pin video popups are **draggable** on the Tactical map.  
2. Drag updates popup screen position (Leaflet popup drag or equivalent lightweight handle) — no wall dock.  
3. Auto spiderfy on Open grabbed **still runs once**; after drag, keep user position for that open session.  
4. Close popup / Prev–Next page / new grab → reset (no need to persist drag across sessions in V1).  
5. Out: Turf, dual-pane, follow-GPS-for-panel (unless trivial), edge tile bank.

**Risk (agent owns):** Leaflet popups are awkward to drag; prefer a small custom map pane / `L.DivOverlay` or drag handle on popup content that sets `popup.setOffset` / reposition — reuse existing FLV stage, don’t invent a new player.

---

## Ladder

| Item | Status |
|------|--------|
| `TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1` | APPLIED — “not bad already” |
| **`TACTICAL-PIN-VIDEO-DRAGGABLE-V1`** | **NEXT** |
| Turf / dual-pane | Wait |

---

## Next command

`MOB-APPLY TACTICAL-PIN-VIDEO-DRAGGABLE-V1`

Until APPLY — **zero code**.
