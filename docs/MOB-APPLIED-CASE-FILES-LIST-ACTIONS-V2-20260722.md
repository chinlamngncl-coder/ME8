# MOB APPLIED — CASE-FILES-LIST-ACTIONS-V2

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-ACTIONS-AND-BACK-NAV-20260722.md`

## Problem

Case Files list **Detail** / **Manage** columns showed full-width ghost **Open** / **Delete** boxes (global `.btn { width: 100% }`).

## Applied

- **Detail** column only — inline link actions (`cf-list-action-link`)
- Super-admin: **`Open · Delete`** on one line in Detail (Manage column hidden)
- Operators: **Open** link only
- `flex-wrap: nowrap`; Detail column widened slightly

## Files

- `public/js/case-files-ui.js` — `renderListActions()`, merged columns
- `public/index.html` — scoped link CSS

## Verify (operator)

1. **Ctrl+F5** → Evidence → Case Files
2. Detail column: **Open** (or **Open · Delete** if super-admin) — one line, no stacked boxes
3. Open still opens field report; Delete still opens password modal

## Cache

- `case-files-ui.js?v=20260722-cf-list-actions-v2`

## Next (separate MOB)

`CASE-FILES-BACK-NAV-V1` — prominent back bar on detail view
