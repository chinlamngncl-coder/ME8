# MOB-APPLIED — CASE-FILES-EMPTY-COMPACT-V2

**Date:** 2026-07-22  
**Status:** APPLIED (V2 retry — V1 operator FAIL)  
**Disc:** `MOB-DISC-CASE-FILES-EMPTY-COMPACT-V1-MISS-V2-20260722.md`  
**Cache:** `case-files-ui.js?v=20260722-cf-empty-compact-v2`, `evidence-hub.js?v=20260722-cf-empty-v2`

## Fixed

| Issue | Fix |
|-------|-----|
| V1: table shell still scrolls empty | **Hide table + filters** when empty |
| Giant 8-column header for zero rows | **`#cf-empty-state`** compact card instead |
| Outer `#evidence-panel` scroll | **`ev-case-files-empty`** → `overflow: hidden` |
| Revisit tab skips layout sync | **`onShow` always runs**; `warm` syncs from cache |
| Has rows regression | Fill + internal scroll only when **not** `.cf-list-empty` |

## Operator verify

1. **Ctrl+F5**.  
2. Case Files (empty): hints, toolbar, small **“No case files yet”** card — **no scroll into blank**.  
3. **New case file** → filters + table; normal rows.  
4. Tab away / back → still compact if empty.

## Supersedes

- `MOB-APPLIED-CASE-FILES-EMPTY-COMPACT-V1-20260722.md` (partial — operator FAIL)
