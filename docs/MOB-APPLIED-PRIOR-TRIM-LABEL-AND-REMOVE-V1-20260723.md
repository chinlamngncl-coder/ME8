# MOB-APPLIED — PRIOR-TRIM-LABEL-AND-REMOVE-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify (Super admin)  
**Disc:** `docs/MOB-DISC-TRIM-DELETE-SECOND-PASS-TEACH-AND-ZERO-REDACTS-CHECK-20260723.md`

## What changed

| Item | Detail |
|------|--------|
| Label | Prior exports: **`[Trim]`** + section **Trim copies** |
| Time | **Created …** (not Burned) |
| Remove one | Confirm → password → `DELETE /api/evidence/trim/:id` |
| Clear all (2+) | **Clear trims (N)** → confirm → password → `POST …/trim/cleanup` |
| Original | Never deleted |

## Files

- `lib/siteDb.js` — `listTrimExports`
- `lib/evidenceWorkflow.js` — `removeTrimExport` / `removeTrimExportsForFile`
- `server.js` — routes + password gate
- `lib/auditActionLabels.js` — trim remove/clean labels
- `public/js/evidence-hub.js` — UI
- `public/locales/en.json`
- `public/index.html` — CSS + `?v=20260723-prior-trim-label-remove-v1`

## Operator check

1. **Restart server** (new API) · hard refresh Evidence.  
2. Open the clip with the two `_trim_` files.  
3. Prior exports → **Trim copies** · each row **`[Trim]`** · **Created** · **Download** · **Remove**.  
4. Section shows **Clear trims (2)**.  
5. Remove one (wrong password must fail) · or Clear trims with correct password → both gone; source clip stays.

**PASS** = trim labeled + removable. **FAIL** = still Download-only or no Trim section.
