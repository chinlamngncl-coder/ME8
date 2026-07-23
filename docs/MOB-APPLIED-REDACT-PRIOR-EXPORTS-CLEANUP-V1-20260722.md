# MOB-APPLIED — REDACT-PRIOR-EXPORTS-CLEANUP-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-PRIOR-EXPORTS-AND-CUSTODY-GROW-CLEAR-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-redact-cleanup`

## Fixed

| Issue | Fix |
|-------|-----|
| Prior exports only grows | Super-admin **Remove** on each Note pending / draft row |
| Many drafts bury the list | **Clean drafts (N)** when pending > 5 (section + banner) |
| Worry about wiping audit | **Custody trail untouched** — only audit lines for remove/clean |
| Finalized risk | Finalized rows **cannot** be removed in v1 |

## API

- `DELETE /api/evidence/redact/:exportId` — one non-finalized redact (disk + DB)
- `POST /api/evidence/detail/:fileId/redact/cleanup-drafts` — all non-finalized redacts for that clip  
- Audit: `evidence.redact_export_removed` / `evidence.redact_drafts_cleaned`

## Operator verify

1. Restart server (new API). Hard refresh (**Ctrl+F5**).  
2. Open the long Prior exports clip as **super-admin**.  
3. On one **Note pending** row → **Remove** → confirm → row gone; original clip still there.  
4. If >5 pending → **Clean drafts** → confirm → only Finalized remain.  
5. Custody still lists history; new line shows draft removed / drafts cleaned.

## Out of scope (left alone)

- Deleting Finalized exports  
- Clearing custody / audit  
- Auto-retention cron
