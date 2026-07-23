# MOB-APPLIED — PRIOR-EXPORTS-ROW-COMPACT-UNIFY-V1

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify  
**Disc:** `docs/MOB-DISC-PRIOR-EXPORTS-ROW-SPLIT-WIDE-UNIFY-20260723.md`

## What changed (layout only)

| Before (broken) | After (unified) |
|-----------------|-----------------|
| `flex-direction: column` on redact/trim rows | Removed — single horizontal row |
| Actions `flex: 1 1 100%` (full-width second deck) | Actions `flex: 0 0 auto` · **right** |
| Full-width ghost buttons / empty band | Chips `width: auto` · side by side |

**Kept:** `[Trim]` / Remove / Clear trims / Second pass behaviour — untouched.

## Files

- `public/index.html` — Prior exports CSS only

## Operator check

1. Hard refresh Evidence (Ctrl+F5).  
2. Open clip with Trim copies.  
3. Each row: filename/meta on the **left**, **Download · Remove** chips on the **right** — **no** tall empty gap.

**PASS** = one tidy row. **FAIL** = still stacked / wide split.
