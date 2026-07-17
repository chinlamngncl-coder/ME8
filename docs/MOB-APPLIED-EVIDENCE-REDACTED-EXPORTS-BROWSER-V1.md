# MOB-APPLIED: mob-evidence-redacted-exports-browser-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** `MOB-DISC-EVIDENCE-REDACTED-EXPORTS-SEARCH-PROPOSE.md`

## What shipped

Evidence Hub nav **Redacted exports** — same theme as Library / Case Files.

| Piece | Detail |
|-------|--------|
| Nav | After Evidence Library · visible with export permission / super-admin |
| Filters | Search · Period · Status (default **Finalized**) · Tag |
| Table | Redacted file · Size · Status · Source · Officer/device · When · Download / Open source |
| API | `GET /api/evidence/exports?status=&q=&period=&tag=&page=` |
| Download | Existing `export-stream/{exportId}` (finalized only) |
| Open | Existing evidence detail for source `fileId` |

## Files

- `lib/siteDb.js` — `listRedactedEvidenceExportsPage`
- `lib/evidenceWorkflow.js` — `listRedactedExports`
- `server.js` — `GET /api/evidence/exports`
- `public/index.html` — nav + panel
- `public/js/evidence-hub.js` — load/bind · cache `?v=20260717-redacted-exports-browser`
- `public/locales/*.json` — strings

## Operator

1. Restart Fleet (API).  
2. Hard refresh dashboard.  
3. Evidence → **Redacted exports** → leave status Finalized → search / Download / Open source.

## One line

**Evidence nav lists finalized redacts with search — Download redacted or open source clip.**
