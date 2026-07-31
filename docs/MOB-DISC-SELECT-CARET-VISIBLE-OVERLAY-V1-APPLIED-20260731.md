# MOB APPLIED — SELECT-CARET-VISIBLE-OVERLAY-V1

**Date:** 2026-07-31  
**Status:** APPLIED — operator verify  
**Parent:** `MOB-DISC-SELECT-CARET-VISIBLE-OVERLAY-20260731.md`

## Fix

Caret is no longer only `select` `background-image` (failed eyes).

- Shared `.ax-select-wrap` + `::after` light triangle (`#e2e8f0`) on the right  
- Wrapped: Watchlist grade/reason/filter + Plate lists List grade/Reason/filter  
- Select IDs unchanged; dark field; `appearance: none`; no white OS arrow  
- Cache: `global.css?v=20260731-select-caret-visible-overlay-v1`

## Operator PASS

1. Hard refresh (Ctrl+F5).  
2. ANPR → Plate lists → **List grade** / **Reason** show a **clear light ▼**.  
3. Click still opens the list.  
4. Watchlist grade/reason/filter same.
