# MOB-APPLIED — CASE-FILES-DETAIL-COMPACT-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-CASE-FILES-DETAIL-UGLY-SCROLL-20260722.md`  
**Cache:** `case-files-ui.js?v=20260722-cf-detail-compact` + CSS in `public/index.html`

## Fixed

| Issue | Fix |
|-------|-----|
| Two skyscraper panels + scroll void | `cf-detail-active` — no viewport `min-height` on detail |
| Narrative eats left column | Fixed `rows="6"`, no `flex:1` grow on textarea |
| Empty linked evidence scroll shell | `cf-ev-empty` — one-line hint, no flex scroll |
| Columns misaligned / stretched | Grid `align-items: start`; sections `height: auto` |
| Fat Save / Link buttons | `width: auto` on detail action buttons |
| Field report meta cramped | Title + SOS full width; Officer/Device/Status in aligned row |

## Operator verify

1. **Ctrl+F5** (no server restart).  
2. Open or **New case file** → field report + linked evidence **compact**, top-aligned.  
3. No scroll into blank below narrative or under “No evidence linked yet”.  
4. Link several clips → right box scrolls internally only.  
5. **Back to case files** → list layout unchanged.

## Out of scope

- Investigation holds disposition  
- Redacted exports Detail buttons → `REDACTED-EXPORTS-DETAIL-ACTIONS-V2`
