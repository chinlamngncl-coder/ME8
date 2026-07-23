# MOB APPLIED — CASE-FILES-FORM-ALIGN-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-FORM-LEFT-ALIGN-20260722.md`

## Problem

Field report form had jagged left edges — mixed `cf-meta-grid` + narrative outside grid; narrative capped at `max-width: 520px`; uneven row spacing.

## Applied

- **`.cf-form-stack`** — single vertical stack, uniform `gap: 10px`
- **`.cf-form-row-3`** — Officer | Device | Status aligned with Title width
- Narrative **inside** stack; label **above** textarea
- All inputs **`width: 100%`**, **`max-width: none`** in detail field report
- Read-only view uses same stack layout

## Files

- `public/js/case-files-ui.js` — form HTML template
- `public/index.html` — `.cf-form-stack` / `.cf-form-field` CSS

## Verify (operator)

1. **Ctrl+F5** → open case → Field report
2. Title, SOS, Narrative — **same left edge**, full width
3. Officer row aligns with Title above
4. Even spacing between rows; Narrative label on top

## Cache

- `case-files-ui.js?v=20260722-cf-form-align-v1`

## Next (separate MOB)

`CASE-FILES-DETAIL-BOX-CLOSE-V1` — visible bottom border / no viewport void inside panes
