# MOB APPLIED — CASE-FILES-LIST-DETAIL-COL-FIT-V3

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-COL-FIT-V2-REGRESSION-20260722.md`  
**Fixes:** `CASE-FILES-LIST-DETAIL-COL-FIT-V2` (1% crush → “Op” / “De”)

## Problem

Detail column set to `width: 1%` under `table-layout: fixed` — hard cap ~12–15px. `Open · Delete` and header **Detail** clipped.

## Applied

| Change | Detail |
|--------|--------|
| Col 7 | `width: 10%`, `min-width: 9.5em`, `max-width: 11em`, `nowrap` |
| Cols 1–6 | Rebalanced to 100% (17 / 27 / 11 / 8 / 7 / 16) |
| Table wrap | `overflow-x: auto` on case list — actions not clipped |
| Ghost col 8 | **Unchanged** — still removed (7 columns only) |

## Files

- `public/index.html`

## Cache

- `case-files-ui.js?v=20260722-cf-list-col-fit-v3`

## Operator verify

1. **Ctrl+F5**
2. Case Files → list view
3. **Detail** header fully visible
4. **Open · Delete** (or **Open** only) — full text, one line
5. No blank 8th column; no huge empty gutter after actions
