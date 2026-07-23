# MOB-APPLIED — REDACT-FINALIZE-DONE-NO-LOOP-V1 (copy N2 + P1)

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify  
**Disc:** `docs/MOB-DISC-REDACT-FINALIZE-DEAD-CIRCLE-AND-PRIOR-HINT-20260723.md`  
**Copy pick:** Note **N2** · Prior hint **P1**

## Behaviour

| Before | After |
|--------|--------|
| Reopen note on already-Finalized → Finalize forever / “already finalized” | Probe status → **Done** panel (Download) |
| Stale session “Finish Finalize” when all Finalized | Clear pending; no banner |
| Save draft / Finalize on Finalized | Treated as **already done** → Done + N2 hint |
| Prior exports hint (long / vague) | **P1** plain wording |

## Copy

- **N2 Done (already):** “This redacted copy is already Finalized.” + “Use Download or Open Prior exports. Need more blur? Prior exports → Second pass… — do not Finalize again.”
- **P1 Prior hint:** “Download = this redacted file is done. Second pass = open that file again to blur more. Burn time = when this copy was made (file name date is the original clip).”

## Files

- `public/js/evidence-hub.js`
- `public/locales/en.json`
- `public/index.html` — `?v=20260723-redact-finalize-done-no-loop-v1`

## Operator check

1. Hard refresh Evidence.  
2. Open a clip that already has Finalized Prior exports.  
3. You must **not** get stuck on note + Finalize with red “already finalized.”  
4. If something reopens that export → **Done** screen with Download + Prior.  
5. Prior exports hint reads as P1.

**PASS** = no Finalize dead circle; Done / Prior path is clear.
