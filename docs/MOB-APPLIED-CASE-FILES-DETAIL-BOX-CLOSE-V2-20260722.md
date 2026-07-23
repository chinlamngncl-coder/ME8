# MOB APPLIED — CASE-FILES-DETAIL-BOX-CLOSE-V2

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-CASE-FILES-DETAIL-BOX-BOTTOM-20260722.md`  
**Supersedes:** `CASE-FILES-DETAIL-BOX-CLOSE-V1` (verify FAIL — stretch kept inner void)

## V1 FAIL reason

BOX-CLOSE-V1 removed viewport `min-height` but **kept `align-items: stretch`** on the detail grid.

Stretch makes the bordered section **taller than its content**. Interior is same colour (`#0f172a`) as the page → **phantom void** below “Updated” / “No evidence linked yet”. Bottom border sits at the stretched edge, not under the fields.

## V2 applied

| Change | Detail |
|--------|--------|
| Detail grid | `align-items: start` — each pane **content height** |
| Panes | `align-self: start` — no stretch fill |
| Evidence panel detail | `overflow-y: auto` — scroll only when page is genuinely tall (many clips), not phantom void |

## Files

- `public/index.html`

## Cache

- `case-files-ui.js?v=20260722-cf-box-close-v2`

## Operator verify

1. **Ctrl+F5**
2. Open a case
3. **Bottom border** visible directly under Field report + Linked evidence content
4. **No** dark void inside either box below last field
5. Left/right may be **different heights** — that is correct (closed cards, not matched towers)
