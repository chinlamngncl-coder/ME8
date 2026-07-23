# MOB-APPLIED — REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACT-CLEAN-DRAFTS-IT-VS-SUPER-DEAD-LOOP-20260722.md`  
**Also:** `MOB-DISC-REDACT-DECLUTTER-UI-WORST-JUDGMENT-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-clean-honest-err`

## Fixed

| Issue | Fix |
|-------|-----|
| “Contact your IT administrator” while Super admin | Cleanup path **never** uses `errors.generic` |
| Clean drafts fail with useless `alert` | Inline red error + honest text (restart / Super admin / failed) |
| HTML/404 breaks `res.json()` | Safe text→JSON parse → “Restart the server…” |
| Dismiss mistaken for clear | Label **Hide for now** + hint: does not delete drafts |
| Clean only when >5 pending | Clean drafts shown from **2+** drafts |

## Operator verify

1. **Restart** server (cleanup API).  
2. **Ctrl+F5**.  
3. Open clip with drafts → **Clean drafts** → confirm.  
4. Pass: drafts gone; Finalized Download rows stay.  
5. If API missing: red inline text says **restart** — not “call IT”.  
6. **Hide for now** only hides banner; drafts remain until Clean drafts.

## Out of scope

- Clearing **Finalized** Prior exports → `REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1`  
- App-wide rewrite of all `errors.generic`
