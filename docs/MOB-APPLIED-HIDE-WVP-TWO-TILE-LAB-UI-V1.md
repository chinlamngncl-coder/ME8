# MOB-APPLIED: mob-hide-wvp-two-tile-lab-ui-v1

**Date:** 2026-07-16  
**Status:** APPLIED

## What

Operator never sees **Lab · WVP two tiles**.

| File | Change |
|------|--------|
| `public/index.html` | CSS never un-hides `#me8-wvp-lab-tile` |
| `public/js/wvp-lab-tile.js` | `applyGate` always hides; boot does not open panel |
| Cache | `wvp-lab-tile.js?v=20260716-hide-lab-ui` |

## Not removed

- `/api/lab/wvp/*` (broker soft-after may still use)  
- `FM_LAB_WVP=1` server flag  

## Operator

Hard refresh once.
