# MOB-APPLIED — CENTRE-SUMMARY-HONEST-LOAD-V2

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY CENTRE-SUMMARY-HONEST-LOAD-V2`  
**Follows:** `CENTRE-SUMMARY-LOAD-ERROR-CLEAR-V1` (subtitle clear stayed; red bar was still remapped)

## What changed

1. Centre Summary **never** routes fail text through `OperatorUI` / `OperatorErrorVoice` (that path remapped everything to “Something went wrong…”).
2. Red bar shows honest Centre copy only:
   - **401/403** or super-admin body → `Super admin login required.`
   - Other fail → `Failed to load summary.`
3. Subtitle still clears “Loading…” (`Load failed — try Refresh…` or auth text).
4. Load uses safe JSON parse; stable `centre-auth` / `centre-load` sentinels (no i18n race on Error.message).

## Files

| File | Change |
|------|--------|
| `public/js/command-centre.js` | `centreMsg` / `looksCentreAuth` / honest `showError` + `load` |
| `public/index.html` | cache `?v=20260722-centre-honest-load-v2` |
| `public/command-centre.html` | same cache |

## Operator verify

1. **Ctrl+F5**
2. Open **Centre Summary**
3. Expect one of:
   - Summary KPIs load (super admin) → **PASS**
   - Red bar: **Super admin login required.** (not “Something went wrong…”) → **PASS** for auth case
   - Red bar: **Failed to load summary.** + subtitle not stuck on Loading → report FAIL with what you see

**PASS / FAIL:** _(operator)_

**Next in remaining queue:** `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`
