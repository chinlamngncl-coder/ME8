# MOB APPLIED — CASE-FILES-LIST-DETAIL-COL-FIT-V4

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-COL-FIT-V3-FAIL-20260722.md`  
**Fixes:** V3 `width: 10%` inner void; V2 `1%`-only clip

## Applied

| Change | Detail |
|--------|--------|
| Col 7 | `width: 1%` + `min-width: 11em` — shrink to **Open · Delete** |
| Removed | `width: 10%`, `max-width: 11em` (V3 void cause) |
| Cols 1–6 | 16 / 28 / 12 / 8 / 7 / 15 — slack to Title |
| List `td.cf-list-actions` | `display: table-cell` — no flex on cell (detail `.cf-ev-actions` unchanged) |
| Links | `display: inline` in list cells |

## Files

- `public/index.html`

## Cache

- `case-files-ui.js?v=20260722-cf-list-col-fit-v4`

## Operator verify

1. **Ctrl+F5**
2. Case Files → list
3. **Detail** header + **Open · Delete** full text
4. **No** empty box inside Detail cell — column hugs links
5. No 8th column
