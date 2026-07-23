# MOB-APPLIED — REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-PRIOR-EXPORTS-CLEAR-FINALIZED-HOW-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-clear-finalized`

## Fixed

| Issue | Fix |
|-------|-----|
| Finalized Prior exports only had Download | Super-admin **Remove** on each Finalized row (confirm) |
| Long Finalized pile | **Clear finalized (N)** when 2+ — typed `DELETE` confirm |
| Worry about source wipe | Confirm copy + API only delete redacted **copy**; original library clip stays |
| Custody | Trail kept; audit lines for remove/clear |

## API

- `DELETE /api/evidence/redact/:exportId?finalized=1` — one Finalized redact (disk + DB)
- `POST /api/evidence/detail/:fileId/redact/cleanup-finalized` — body `{ "confirm": "DELETE" }` — all Finalized for that clip  
- Audit: `evidence.redact_finalized_removed` / `evidence.redact_finalized_cleaned`

## Operator verify

1. **Restart server** (new API). **Ctrl+F5**.
2. Open a clip with Finalized Prior exports as **Super admin**.
3. One Finalized row → **Remove** → confirm → row gone; original clip still in Library.
4. If 2+ Finalized → **Clear finalized (N)** → type `DELETE` → all Finalized for that clip gone.
5. Custody still lists history; new line shows Finalized removed / cleared.

## Out of scope

- Auto-retention cron  
- Wiping custody / audit_log  
- Deleting the source library file  
- Draft cleanup (already in CLEANUP-V1)
