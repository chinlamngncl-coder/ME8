# MOB APPLIED — ANPR-LIVE-TILES-VIEWPORT-LOCK-V1

**Date:** 2026-07-31  
**APPLY:** `ANPR-LIVE-TILES-VIEWPORT-LOCK-V1` (operator named MOB)  
**Status:** APPLIED — await operator PASS  
**Disc:** `MOB-DISC-ANPR-LIVE-SLOTS-CUTOFF-AND-WHOLE-VEHICLE-20260731.md`

---

## What changed

| Before | After |
|--------|--------|
| Live tiles `aspect-ratio: 16/9` + layout `min-height: 70vh` | Tiles fill a **2×2 `1fr/1fr` grid** inside remaining panel height (FR parity) |
| Slots 3–4 cut by page bottom | Live matrix **locked in viewport** — all 4 slots fully visible |
| Inline-only fragile CSS | Viewport lock in `public/css/global.css` + matched `index.html` live rules |

**Not in this MOB:** whole-vehicle crop, PiP grab, rail crop quality.

**Files:** `public/css/global.css`, `public/index.html` (cache `global.css?v=20260731-anpr-live-tiles-viewport-lock-v1`)

---

## Operator

1. Hard refresh (CSS cache bust).  
2. Analytics → ANPR → **Live**.  
3. Confirm **all four** slots fully on screen (no cut strip at bottom). Optional: Start watch on one cam — video still fills its slot.

**PASS:** Four complete live tiles visible without scrolling the page for the matrix.  
**FAIL:** Bottom row still clipped or page must scroll to see slots 3–4.
