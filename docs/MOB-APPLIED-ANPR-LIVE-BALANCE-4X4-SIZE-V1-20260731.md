# MOB APPLIED — ANPR-LIVE-BALANCE-4X4-SIZE-V1

**Date:** 2026-07-31  
**APPLY:** `ANPR-LIVE-BALANCE-4X4-SIZE-V1`  
**Status:** APPLIED — operator **PASS** 2026-07-31 — git checkpoint requested  
**Disc:** `MOB-DISC-ANPR-LIVE-BOTH-TOO-SMALL-OPERATOR-PICS-20260731.md` · `MOB-DISC-ANPR-LIVE-BALANCE-PASS-GIT-CHECKPOINT-20260731.md`

---

## Scope wall

**Touched only:** ANPR Live layout CSS in `public/css/global.css` + matching Live rules / cache in `public/index.html`.  
**Not touched:** China zip, language, map, license, ANPR JS engine, FR, Settings, login.html, sidecars.

---

## What changed

| Before (FAIL) | After |
|---------------|--------|
| Live capped ~40% / max-width 560px (postage) | Live **fills** center column (usable 2×2) |
| Rail column capped ~320–440px | Live + rail **share** row (`1fr` / `1.2fr`) |
| Tiny rail card chrome | Slightly larger padding/fonts on 4×4 cells |

Shape unchanged: roster \| **4** live \| **4×4** rail. Viewport lock kept.

**Cache:** `global.css?v=20260731-anpr-live-balance-4x4-size-v1`

---

## Operator

Hard refresh → Analytics → ANPR → **Live**.

**PASS:** Live readable (not tiny); 4×4 cells readable (not tiny); both on screen; no cut-off.  
**FAIL:** Still postage either side, or live eats rail again.
