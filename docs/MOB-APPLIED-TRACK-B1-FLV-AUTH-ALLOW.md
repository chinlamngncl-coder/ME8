# MOB — WVP FLV allowlist (mpegts had no cookie)

**Status:** APPLIED 2026-07-14 — `mob-track-b1-flv-auth-allow`  
**Scope:** auth allowlist + mpegts IO options only.

## Why

Play API OK (session cookie). mpegts FLV GET had **no cookie** → global `requireDashboardAuth` → **401** → spinner.  
ZLM already had `/api/lab/zlm/flv/` public when lab flag on; WVP flv did not.

## Change

- `lib/dashboardAuth.js` — public when `FM_LAB_WVP=1`: `/api/lab/wvp/flv` (token still required)
- `public/js/wvp-lab-tile.js` + `test-wvp-tile.html` — `withCredentials: true`, `enableWorker: false`, error log
- cache bust `?v=20260714-b1-flv-auth`

## Prove

1. **Restart Fleet** (auth change is server-side)
2. Hard refresh → Lab tile → Play
3. Picture = **PASS**; spinner = **FAIL** (note any `mpegts error` in tile log)
