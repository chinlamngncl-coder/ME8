# MOB-APPLIED — CASE-FILES-EMPTY-COMPACT-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-CASE-FILES-EMPTY-SCROLL-VOID-20260722.md`  
**Cache:** `case-files-ui.js?v=20260722-cf-empty-compact` + CSS in `public/index.html`

## Fixed

| Issue | Fix |
|-------|-----|
| Empty list → giant dark scroll void | `cf-list-empty` class: table wrap shrinks, no `flex:1` / `min-height:220px` |
| Panel forces full viewport when empty | `#ev-panel-case-files.cf-list-empty` drops forced min-height |
| Has rows regression | Without `cf-list-empty`: fill + internal scroll (FILL-LAYOUT kept) |
| Action column letter-stack risk | `cf-list-actions` exempt from `overflow-wrap: anywhere` |

## Files

- `public/index.html` — empty vs populated CSS split
- `public/js/case-files-ui.js` — `setCaseListEmptyState()` toggled from `loadList()`

## Operator verify

1. **Ctrl+F5** (no server restart).
2. Evidence → **Case files** (empty): compact — hints + filters + one “No case files yet” line; **no scroll into blank**.
3. **New case file** → one normal row; table area grows.
4. Many cases → scroll **inside** table area only; no horizontal scroll-right.

## Out of scope

- Auto-create on SOS Ack  
- Redacted exports row compact (separate MOB — done)
