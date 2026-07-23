# MOB APPLIED — CASE-FILES-DETAIL-BOX-CLOSE-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-DETAIL-BOX-BOTTOM-20260722.md`  
**Reverts/tunes:** `CASE-FILES-DETAIL-FILL-SPLIT-V1` viewport stretch only

## Problem

After FILL-SPLIT-V1, Field report + Linked evidence panes stretched to **viewport height**. Bottom border sat far below content; dark void inside panes felt like more form below.

## Applied

| Change | Detail |
|--------|--------|
| Detail panel | `flex: 0 1 auto` — **no** `min-height: calc(100vh - 168px)` |
| Detail wrap/body/grid | Content-sized — **no** `flex: 1` viewport fill |
| Panes | `height: auto` + `align-self: stretch` — equal height to **taller column**, not screen |
| Panes overflow | `overflow: visible` — bottom border visible near content |
| Linked list scroll | `max-height: min(420px, 55vh)` when clips linked; empty state does not flex-grow |

## Files

- `public/index.html` — `cf-detail-active` CSS

## Cache

- `case-files-ui.js?v=20260722-cf-box-close-v1` (CSS is main fix)

## Operator verify

1. **Ctrl+F5** (no server restart)
2. Case Files → **Open** a case
3. **Bottom border visible** on both boxes near content — no scroll to find it
4. No dark void suggesting more form below narrative / “No evidence linked yet”
5. Left + right boxes **still same height** (shorter side may have quiet space inside card — OK)
6. Link several clips → scroll **inside** right box only

## Out of scope

- List Detail column crush → `CASE-FILES-LIST-DETAIL-COL-FIT-V3`
- Form left rail → `CASE-FILES-FORM-ALIGN-V1` (already applied)
