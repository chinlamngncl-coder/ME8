# MOB-APPLIED — REDACTED-EXPORTS-DETAIL-ACTIONS-V2

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACTED-EXPORTS-DETAIL-ACTIONS-UGLY-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-rx-detail-v2` + CSS in `public/index.html`

## Fixed

| Issue | Fix |
|-------|-----|
| Download / Open source = full-width ghost boxes | **`ev-rx-action-link`** — underlined inline links, `width: auto !important` |
| Rows tower tall | Actions on **one line** in Detail cell |
| 8 rows + scroll void below | **`ev-rx-few-rows`** when ≤12 rows — table shell shrinks |
| Case Files list Open/Delete boxes (same root bug) | **`#cf-list-wrap .cf-list-actions .btn`** `width: auto` (small add-on) |

## Root cause (locked)

Global `.btn { width: 100% }` — V1 never overrode it. Ghost `btn-sm` in a narrow Detail cell = **small box, big word, stacked**.

## Operator verify

1. **Ctrl+F5** (no server restart).  
2. **Redacted exports** → Detail: **Download · Open source** as compact blue links on one line.  
3. ~8 rows fit without giant row height; no scroll into blank below table.  
4. **Case files** list → Open / Delete compact (not full-width boxes).

## Out of scope

- Investigation holds disposition  
- Case file detail form (done: DETAIL-COMPACT-V1)
