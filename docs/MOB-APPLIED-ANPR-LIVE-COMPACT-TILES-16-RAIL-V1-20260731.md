# MOB APPLIED — ANPR-LIVE-COMPACT-TILES-16-RAIL-V1

**Date:** 2026-07-31  
**APPLY:** `ANPR-LIVE-COMPACT-TILES-16-RAIL-V1`  
**Status:** APPLIED — await operator PASS  
**Disc:** `MOB-DISC-ANPR-LIVE-COMPACT-TILES-16-RAIL-20260731.md`

---

## What changed

| Before | After |
|--------|--------|
| Live 4 tiles fill full center height | Live still **4**, capped ~**46%** height + max-width **640px** (smaller) |
| Rail **8** (2×4) | Rail **16** (2×8), tighter padding/fonts |
| Side column ~220–300px | Wider rail column **300–420px** |
| Viewport lock | **Kept** — no `aspect-ratio` back |

**Files:** `public/css/global.css`, `public/index.html`, `public/js/anpr-live-watch.js` (`RAIL_MAX=16`), cache `?v=20260731-anpr-live-compact-tiles-16-rail-v1`

**Not in this MOB:** whole-vehicle crop, PiP, live stream count.

---

## Operator

1. Hard refresh (CSS + JS cache bust).  
2. Analytics → ANPR → **Live**.

**PASS:** Four **smaller** live tiles fully visible; **16** rail cells fully visible on the side; no bottom cut-off.  
**FAIL:** Live or rail clipped; or still only 8 rail slots.
