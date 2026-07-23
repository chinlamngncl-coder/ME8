# MOB APPLIED — CASE-FILES-LIST-DETAIL-COL-FIT-V2

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-DETAIL-GHOST-COL-20260722.md`

## Problem

After `LIST-ACTIONS-V2`, Open·Delete merged into one cell but **hidden Manage `<th>`** left a **ghost 8th column** — vertical border + blank box right of actions. Detail col also too wide (14%).

## Applied

1. **Removed** `<th id="cf-col-delete">` from table (not hidden — **gone**).
2. Placeholder row `colspan="7"`.
3. Detail column **`width: 1%`** + **`white-space: nowrap`**; removed `min-width: 108px`.
4. Freed width → Case ID **16%**, Title **26%**.
5. Removed JS toggling `cf-col-delete`.

## Files

- `public/index.html` — table header + column CSS
- `public/js/case-files-ui.js` — remove delCol logic

## Verify (operator)

1. **Ctrl+F5** → Case Files list
2. Detail: **Open · Delete** only — **no blank box**, **no extra vertical line** after Delete
3. Table has **7 columns** in header

## Cache

- `case-files-ui.js?v=20260722-cf-list-col-fit-v2`
