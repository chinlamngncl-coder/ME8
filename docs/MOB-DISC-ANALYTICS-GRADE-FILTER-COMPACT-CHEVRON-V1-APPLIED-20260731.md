# MOB APPLIED — ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-V1

**Date:** 2026-07-31  
**Status:** APPLIED — operator verify  
**Parent:** `MOB-DISC-ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-20260731.md`

## Your pic (List grade / Reason)

Those are `<select>`s that looked like tabs because:

1. `.enterprise-scope select` used `background:` shorthand → wiped the dark SVG caret from `UI-DARK-FORM-CONTROLS-UNIFY-V1`
2. Panel CSS repeated `background: #0f172a` on enroll/filter selects → same kill

**Fix for that pic:** dark field + grey caret on the right + `padding-right` so text does not cover the arrow. Still dark — no white OS patch.

## What changed (one root, not one-off paint)

| Area | Change |
|------|--------|
| `global.css` | `--select-chevron`; `select` / `.enterprise-scope select` use `background-color` + image (never shorthand) |
| Analytics enroll + grade filter | Compact width (~180 / Reason 220); caret re-stated |
| `settings-theme-unify.css` | Server Setup selects keep same dark caret |
| Cache | `global.css` + `settings-theme-unify.css` `?v=20260731-analytics-grade-filter-compact-chevron-v1` |

## Whole software vs one panel

**This MOB = root caret fix under enterprise-scope + Settings panel selects** (same kill class). Operator verify **Plate lists List grade / Reason first** (your pic). Toolbar **All grades** must also be short + caret.

## Operator PASS

1. Hard refresh (Ctrl+F5).  
2. ANPR → Plate lists → **List grade** and **Reason** show a **▼** on the right (not a blank tab).  
3. **All grades** filter is short beside search, with caret.  
4. No white arrow well / white Choose-file style patch on those selects.

## Future agent lock

Never set `background:` on `select` — only `background-color` + keep `background-image: var(--select-chevron)`. Check `.enterprise-scope` stretch before shipping any new Analytics filter.
