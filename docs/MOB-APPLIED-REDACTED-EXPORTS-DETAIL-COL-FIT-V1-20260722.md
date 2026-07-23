# MOB APPLIED — REDACTED-EXPORTS-DETAIL-COL-FIT-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-REDACTED-EXPORTS-DETAIL-COL-RIGHT-BLANK-20260722.md`

## Problem

Detail column was **20% + min-width 148px** while `Download · Open source` needs ~130px — dead gutter on the right inside every row.

## Applied

- Last column **`width: 1%`** + **`white-space: nowrap`** (shrink-to-fit under `table-layout: fixed`)
- Removed **`min-width: 148px`**
- Freed width → **Redacted file 30%**, **Source 20%**
- V2/V3 link styling unchanged

## Files

- `public/index.html` — column width CSS only

## Verify (operator)

1. **Ctrl+F5** → Evidence → Redacted exports
2. Detail column: links tight, **no wide blank** to the right
3. `Download · Open source` still one line
4. Long filenames still ellipsis in file column

## Cache

- CSS in `index.html` — Ctrl+F5 sufficient (no JS change)
