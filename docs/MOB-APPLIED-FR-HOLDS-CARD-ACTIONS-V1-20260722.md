# MOB APPLIED — FR-HOLDS-CARD-ACTIONS-V1

**Date:** 2026-07-22  
**Related:** same session as `FR-HOLDS-DISPOSITION-STATUS-V1` · pattern from `REDACTED-EXPORTS-DETAIL-ACTIONS-V2`

## Problem

Global `.btn { width: 100% }` made Open / Copy ID (and new Clear / Discard) render as full-width stacked ghost boxes on hold cards.

## Applied

- Scoped `#ev-panel-investigation-holds .ev-hold-actions` to **inline link-style** actions (`width: auto !important`, underline, compact).
- Danger styling for Discard (muted red link).
- Toolbar Refresh + filter select also `width: auto`.

## Files

- `public/index.html` — CSS scoped to investigation holds panel
- `public/js/fr-kept-ui.js` — `ev-hold-action-link` classes on card buttons

## Verify (operator)

Ctrl+F5 → Investigation holds → card actions appear as **inline links** on one row (wrap on narrow cards), not tall stacked boxes.

## Cache

- `fr-kept-ui.js?v=20260722-holds-disposition-v1`
