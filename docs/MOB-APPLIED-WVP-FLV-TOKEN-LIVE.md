# MOB — WVP FLV live token (no 3‑min kill)

**Status:** APPLIED 2026-07-14 — `mob-wvp-flv-token-live`  
**File:** `lib/wvpLabClient.js` only

## Change

- Token TTL **180s → 12h** (override: `FM_WVP_FLV_TOKEN_TTL_MS`)
- Sliding renew on each proxy open
- Upstream idle timeout: **connect 30s only**, then **disabled** for live pipe

## You prove

1. **Restart Fleet** (server change)
2. Dashboard lab tiles → Play (proxy fallback or direct — both OK)
3. Leave running **> 5 minutes** (old break ~3 min on proxy)
4. Still picture = **PASS**; dies again = **FAIL** (next: mute-stall / auto-reopen)

Disc: `docs/MOB-DISC-WVP-TILE-STABILITY-FIX.md`
