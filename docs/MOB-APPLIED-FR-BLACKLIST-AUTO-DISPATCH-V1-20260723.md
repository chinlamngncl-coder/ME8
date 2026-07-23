# MOB APPLIED — FR-BLACKLIST-AUTO-DISPATCH-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-BLACKLIST-AUTO-DISPATCH-V1`  
**Operator:** auto at **75% and above** (same floor as match)  
**Disc:** `MOB-DISC-FR-BLACKLIST-BANNER-NO-AUTO-MAP-20260723.md`

## What changed

| Before | After |
|--------|-------|
| Auto go-ops score gate default **80** | Default **75** (`FM_FR_MAP_AUTO_SCORE_MIN`) |
| Soft grades could theoretically pass if `FM_FR_ALERT_TIER=0` | Auto map/tab = **Blacklist only** (tier high) |
| 75–79% Blacklist → red bar, no jump | **75%+ Blacklist → auto Ops + zoom + pin takeover** |

Soft grades (POI / monitoring / suspect) still **never** auto-jump.

**File:** `public/js/fr-alarm.js`  
**Cache:** `fr-alarm.js?v=20260723-fr-blacklist-auto-dispatch-v1`  
**Example env:** `.env.me8.example` comment updated to 75

## Operator verify

1. Ctrl+F5 (hard refresh).  
2. Watchlist row = **Blacklist**.  
3. Face watch → hit at **≥ 75%** (e.g. 77%).  

**PASS:** red bar **and** auto switch to Ops + map zoom + catching live pin/wall.  
**FAIL:** still stuck on Analytics with only bar → tell agent (confirm grade is Blacklist, score on bar ≥ 75).

## Next

Optional zone PTT polish, redact, or Stage B security.
