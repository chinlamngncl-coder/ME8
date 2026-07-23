# MOB APPLIED — CASE-FILES-DETAIL-FILL-SPLIT-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-DETAIL-RIGHT-BLANK-20260722.md` · `docs/MOB-DISC-CASE-FILES-FOUR-GAPS-20260722.md`

## Problem

Field report (left) and Linked evidence (right) were **unequal height** — short right pane + void beside/under it after COMPACT-V1.

## Applied

- Detail panel **fills viewport** below hub nav (like list fill, but detail mode)
- **50/50 grid** `align-items: stretch` — both panes **same height**, full width
- Narrative stays **fixed rows** (no flex-grow void in left pane)
- Linked evidence: **flex fill** in right pane; scroll **only** when clips linked (not empty void scroll)

## Files

- `public/index.html` — `cf-detail-active` fill/split CSS

## Verify (operator)

1. **Ctrl+F5** → Case Files → **Open** a case
2. Left + right boxes **same height**, edge to edge across panel
3. Short narrative — **no** scroll into blank inside left box
4. Link several clips — scroll **inside** right box only

## Cache

- `case-files-ui.js?v=20260722-cf-fill-split-v1` (cache bump; CSS change is main fix)
