# MOB APPLIED — ANPR-LIVE-8-RAIL-COMPACT-V1

**Date:** 2026-07-31  
**APPLY:** `MOB-APPLY ANPR-LIVE-8-RAIL-COMPACT-V1`  
**Status:** APPLIED — await operator PASS  

**Design:** `MOB-DISC-ANPR-LIVE-8-RAIL-COMPACT-20260731.md`  
**Map on hit (later):** `MOB-DISC-ANPR-LIVE-HIT-MAP-FR-PARITY-PARKED-20260731.md`

---

## What changed

| Item | Detail |
|------|--------|
| Giant still under tiles | **Removed** |
| Fat detail + confidence | **Removed** |
| Right column | **8-slot** Recent plates grid (2×4) |
| Card fields | Picture · plate · list · time · BWC — **no confidence** |
| Expand | Click / double-click card → plate snap lightbox (Esc / × close) |
| List hit | Thin hit bar under tiles + Ack + toast (unchanged alert family) |
| Map on hit | **Not in this MOB** — parked |

**Files:** `public/js/anpr-live-watch.js`, `public/index.html`, `public/locales/en.json`  
**Cache:** `anpr-live-watch.js?v=20260731-anpr-live-8-rail-compact-v1`

---

## Operator PASS

1. Hard refresh → ANPR → Live  
2. Right side shows **8** card slots (empty = —); no confidence dossier  
3. Start watch → plate reads fill the rail (newest first)  
4. Click a card → expand still with plate / list / when / BWC  
5. Live 2×2 not cut by a giant still underneath  

**FAIL:** Fat detail returns; only one thumb; still cut off under tiles.
