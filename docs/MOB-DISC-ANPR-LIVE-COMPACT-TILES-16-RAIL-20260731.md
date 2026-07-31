# MOB DISC — ANPR Live: smaller 4 tiles + ~16 tight rails

**Date:** 2026-07-31  
**Status:** APPLIED as `ANPR-LIVE-COMPACT-TILES-16-RAIL-V1` — see `MOB-APPLIED-ANPR-LIVE-COMPACT-TILES-16-RAIL-V1-20260731.md`  
**Operator:** `ANPR-LIVE-TILES-VIEWPORT-LOCK-V1` = **PASS** (four full tiles visible). Ask: make live boxes **smaller**, put **~16 tight rails** on the side.

**Related:** viewport lock APPLIED; whole-vehicle crop still separate FAIL; PiP grab optional later.

---

## Plain answer

**Yes — can be done.** One layout MOB. Keep viewport lock (no cut-off). Do **not** grow live tile count; shrink the **center** live matrix and give width/height to the **Recent plates** rail.

| Today | Target |
|-------|--------|
| Live = 4 slots, large (fill remaining center) | Live = still **4**, but **smaller** boxes |
| Rail = **8** cards (2×4) | Rail = **16** tight cards |
| Viewport lock | **Keep** — all live tiles + all 16 rail cells fully on screen |

---

## Recommended layout (one path)

```text
┌──────────┬────────────────────┬─────────────────────────┐
│  roster  │  2×2 live (smaller)│  Recent plates 16 tight │
│          │  still 4 cams max  │  e.g. 2 cols × 8 rows   │
│          │                    │  or 4×4 if side is wide │
└──────────┴────────────────────┴─────────────────────────┘
```

| Piece | Spec |
|-------|------|
| Live tiles | Stay **4**. Shrink via layout: narrower center column and/or live block capped (e.g. max ~42–48% of Live row height / less `1fr` share) — **not** `aspect-ratio` back (that cut slots before). |
| Rail count | `RAIL_MAX = 16` in `anpr-live-watch.js` |
| Rail grid | Prefer **2×8** (readable vehicle thumb + plate line) or **4×4** if side column is wide enough — pick **2×8** first for “tight but still see vehicle”. |
| Card chrome | Tighter padding, smaller meta font, scene thumb dominates; plate text one line. |
| Viewport | Entire Live panel still **no page scroll** for matrix + rail. Roster may scroll inside its column only. |

**Not this MOB:** whole-vehicle crop quality, PiP grab, changing live from 4→8 video streams.

---

## Risk

| Risk | Mitigation |
|------|------------|
| 16 cards + big live → cut-off again | Cap live area; rail uses remaining side; re-check viewport lock PASS |
| Cards too tiny to see vehicle | 2×8 > 4×4 for scene thumbs; lightbox unchanged |
| CSS only in `index.html` | Prefer `global.css` (same as viewport lock) + cache bust |

---

## Proposed APPLY name

`ANPR-LIVE-COMPACT-TILES-16-RAIL-V1`

**PASS:** Four smaller live tiles fully visible; **16** rail cells fully visible on the side (tight); no bottom cut-off.  
**FAIL:** Live or rail clipped; or still only 8 rail slots.

---

## Lock

Viewport PASS stands.  
**Yes, smaller live + ~16 rails is doable** in one named APPLY.  
No code until: `MOB-APPLY ANPR-LIVE-COMPACT-TILES-16-RAIL-V1`
