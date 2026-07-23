# MOB APPLIED — CASE-FILES-LIST-TABLE-ONE-VIEW-V5

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-LIST-TABLE-ONE-VIEW-V5-20260722.md`  
**Replaces:** COL-FIT V2 · V3 · V4 (all FAIL)

## Problem

Case Files list required **horizontal scroll** to see Detail; **“De”** clipped; `min-width: 11em` + `overflow-x: auto` forced table wider than panel.

## Applied (one pass)

| Item | Change |
|------|--------|
| **Removed** | `overflow-x: auto`, `min-width: 11em`, `width: 1%` col hacks |
| **Removed** | `display: flex` on list `td.cf-list-actions` |
| **Table** | `width: 100%`, `max-width: 100%`, `table-layout: fixed` |
| **Wrap** | `overflow-x: hidden` always |
| **Columns** | 14 / 30 / 9 / 7 / 6 / 14 / **20** = 100% — Detail on screen |
| **Case ID** | Ellipsis (no break-all blowout) |
| **Links** | Plain inline in `td.cf-list-actions` |
| **Detail pane** | `.cf-ev-actions` flex unchanged |

## Files

- `public/index.html`

## Cache

- `case-files-ui.js?v=20260722-cf-list-one-view-v5`

## Operator verify

1. **Ctrl+F5**
2. Case Files → list — **no horizontal scrollbar**
3. **Detail** + **Open · Delete** visible without scrolling
4. No void inside Detail cell; no 8th column
