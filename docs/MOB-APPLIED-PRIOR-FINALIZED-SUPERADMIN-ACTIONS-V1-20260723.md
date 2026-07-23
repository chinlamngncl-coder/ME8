# MOB-APPLIED — PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify (Super admin)  
**Disc:** `docs/MOB-DISC-PRIOR-FINALIZED-SUPERADMIN-ACTIONS-MISSING-20260723.md`

## What was wrong

Prior exports could stay on **Download-only** HTML after Super admin perms were live — especially when returning to the same clip detail without a force reload (`goDetailPriorExports` early-returned with scroll only).

## What changed

| Fix | Detail |
|-----|--------|
| Force rebuild on perms | Evidence open + detail → `loadDetail(id, true)` (not warm skip) |
| Force rebuild on Prior return | `goDetailPriorExports` always `loadDetail(id, true)` |
| Gate | `isEvidenceSuperAdmin()` = `dashboardRole === 'super_admin'` \|\| heuristic |
| Actions | Finalized row: **Download** · **Second pass** (action style) · **Remove**; section: **Clear finalized (N)** |
| Layout | Redact rows stack actions under the file name (full width) so controls are not clipped |

## Files

- `public/js/evidence-hub.js`
- `public/index.html` — CSS + cache `?v=20260723-prior-finalized-sa-actions-v1`

## Operator check (Super admin)

1. Hard refresh Evidence.  
2. Open the clip with **2 Finalized** Prior exports.  
3. Each row must show **Download**, **Second pass**, **Remove**.  
4. Section heading must show **Clear finalized (2)**.

**PASS** = all four controls visible without hunting. **FAIL** = still Download only.
