# MOB DISC — UI-DARK-FORM-CONTROLS-UNIFY-V1 APPLIED

**Date:** 2026-07-31  
**Status:** **APPLIED** — awaiting operator PASS  
**APPLY:** `UI-DARK-FORM-CONTROLS-UNIFY-V1` (same as `MOB-APPLY UI-DARK-FORM-CONTROLS-UNIFY-V1`)  
**Parent:** `MOB-DISC-UI-DARK-FORM-CONTROLS-NO-WHITE-PATCH-20260731.md`

---

## What changed

Global dark control skin in `public/css/global.css`:

| Control | Fix |
|---------|-----|
| `html` | `color-scheme: dark` |
| All `select` | `appearance: none` + dark body + dark SVG chevron (no light OS arrow well) |
| Text / textarea | Dark field colours |
| `input[type=file]` | Dark field + dark `::file-selector-button` (no light “Choose file”) |

New Analytics / Settings / Evidence / Ops controls inherit automatically.

## Files

- `public/css/global.css` — unify block  
- `public/index.html` + other HTML shells — cache `global.css?v=20260731-dark-form-controls-unify-v1`

## Operator verify

1. Hard refresh (Ctrl+F5).
2. Analytics → Watchlist: grade **select** — dark arrow, no light strip.
3. Any **Choose file** (Watchlist photo / Verify / Evidence) — dark button, no white patch.
4. Spot-check Settings dropdowns — still dark and clickable (border / hover / focus).

## Lock

Light native select/file chrome on dark Axiom UI is forbidden. Future MOBs rely on this global skin — do not reintroduce panel-only white patches.
