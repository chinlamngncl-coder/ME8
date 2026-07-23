# MOB-APPLIED — KILL-FR-GRID-SCROLLBAR-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-KILL-FR-GRID-SCROLLBAR-V1`  
**Scope:** Face recognition **6-tile grid CSS only**. Sidebar / bottom watch card untouched. No FR API/JS pipeline changes.

## Fix

1. `.ax-fr-grid` — `overflow: hidden` (no scrollbar); `flex: 1 1 0; min-height: 0`; `grid-template-columns: repeat(3, 1fr)`; `grid-template-rows: 1fr 1fr`.
2. `.ax-fr-tile` — removed `aspect-ratio: 16 / 9`; `width/height: 100%` with `min-height: 0; min-width: 0` so tiles fill the 3×2 cells.
3. Video/canvas — `object-fit: contain` inside the tile (letterbox inside the cell, not outside the layout).

## Operator verify

1. Ctrl+F5 → Analytics → Face recognition  
2. No vertical scrollbar on the 6-tile matrix  
3. Six tiles fill the center area in a locked 3×2  

**PASS / FAIL:** _(operator)_
