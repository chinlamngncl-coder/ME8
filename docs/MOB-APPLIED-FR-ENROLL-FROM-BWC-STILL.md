# MOB-APPLIED — mob-fr-enroll-from-bwc-still

**Date:** 2026-07-14  
**Status:** APPLIED

## What

Enroll watchlist person from the **latest live BWC face snap** (snap ledger / Recent), not only ID photo upload.

- API: `POST /api/analytics/fr/blacklist/enroll-from-snap`
- Embedding: **`representProbePath`** (same path as live match)
- Skips ID-photo size gates (480px / 30KB) — snaps are already face crops
- UI: Watchlist → **Enroll from last BWC face**

## Prove (you)

1. Restart Fleet / refresh once (hard refresh if JS cached)  
2. Start watch → face appears on Recent  
3. Analytics → Watchlist → type name + grade  
4. Click **Enroll from last BWC face**  
5. Open that person → **Score vs last snap** — expect higher than ID-photo enroll (aim ≥70%)

## Not in this MOB

- Seeta cutover (`mob-fr-seeta-sidecar-wire`)  
- Blur reject  
- WVP lab JWT (`mob-wvp-lab-jwt-auth`)  
