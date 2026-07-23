# MOB-APPLIED — REDACT-CLEAR-FINALIZED-PASSWORD-CONFIRM-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify  
**Disc:** `docs/MOB-DISC-REDACTED-EXPORTS-EMPTY-AND-DELETE-VS-PASSWORD-20260723.md`

## What changed

Destroying **Finalized** redacted copies no longer uses typed `DELETE`. Same family as secure-export approve: **re-enter account password**.

| Action | Gate |
|--------|------|
| **Clear finalized (N)** | Confirm → password prompt → `POST …/cleanup-finalized` `{ adminPassword }` |
| **Remove** one Finalized Prior export | Confirm → password prompt → `DELETE …/redact/:id?finalized=1` + body `{ adminPassword }` |
| Draft / Clean drafts | Unchanged (confirm only; not custody destroy of Finalized) |

Server: `dashboardAuth.verifySessionPassword(req.dashboardUser, …)`. Wrong/empty password → **403** + `evidenceHub.exportFinalizedNeedPassword`.  
Audit detail adds `passwordConfirmed: true` and `actorUsername`.

## Files

- `server.js` — cleanup-finalized + finalized DELETE  
- `public/js/evidence-hub.js` — UI  
- `public/locales/en.json` — copy  
- `public/index.html` — cache `?v=20260723-redact-clear-finalized-password-v1`

## Operator check

1. Restart server · hard refresh Evidence.  
2. Open a clip with **2+ Finalized** Prior exports.  
3. **Clear finalized** → OK on warning → enter **wrong** password → must fail, copies stay.  
4. Retry with **correct** password → Finalized gone; original clip stays.  
5. Optional: single-row **Remove** on one Finalized → same password gate.

**PASS** = wrong password blocked; correct password clears; no “type DELETE” anywhere on that path.
