# MOB-DISC — ANPR Snap Lightbox Big Mag V1

**Date:** 2026-08-02  
**APPLY:** `ANPR-SNAP-LIGHTBOX-BIG-MAG-V1`  
**Scope:** ANPR glass → big lightbox + in-modal hover zoom only.

## Locked product fact

Glass opens **`#ax-anpr-snap-lightbox`**.  
**FrAlarm is untouched** — existing Live list-hit parallel triage stays exactly as before. This MOB does not invent FR work and does not remove FrAlarm.

## Applied

1. Dim backdrop + **centered large** panel (~720px, not tiny bottom-right dock).
2. Macro + micro images with **hover-to-zoom scale(3)** (`cursor: zoom-in`).
3. Hint: “Hover image to enlarge”.
4. Close: × / Esc / backdrop click.
5. Open harden: rail index fallback so glass does not silent-fail.
6. Cache: `global.css` + `anpr-live-watch.js` `?v=20260802-anpr-snap-lightbox-big-mag-v1`

## Untouched

- `FrAlarm.showHit` path on Live list hits  
- Dual engines / Python  
- Card HTML structure (`ax-anpr-snap-card`)  
- Offline subnav watchlist badge (separate MOB)

## Operator

1. Hard refresh dashboard.  
2. Recent Plates → click glass → big centered ANPR lightbox.  
3. Hover car / plate image → enlarges.  
4. List hit still may also raise FrAlarm triage (unchanged).
