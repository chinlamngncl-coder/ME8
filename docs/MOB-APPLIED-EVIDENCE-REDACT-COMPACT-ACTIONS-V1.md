# MOB-APPLIED: mob-evidence-redact-compact-actions-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Parent rule:** `MOB-DISC-EVIDENCE-DETAIL-COMPACT-ACTIONS.md` / `mob-evidence-detail-compact-actions-v1`

## Mandate

Redact workspace uses the **same unified Evidence chips** — content-sized `btn-action btn-sm` / `btn-ghost`.  
**No full-row blue “Save redacted copy” highway.**

## What changed

| File | Change |
|------|--------|
| `public/index.html` | Extend compact `.btn` override to `#ev-panel-redact` |
| `public/index.html` | Remove `.ev-redact-actions #ev-redact-save { flex: 1 1 200px }` stretch |

## Pass / fail

| Pass | Fail |
|------|------|
| **Save redacted copy** / Cancel / Back = short chips in a wrap row | Full-width blue bar across the footer |
| Same look as **Save case info** on detail | University-form full blue |

## Operator

Hard refresh (Ctrl+F5) → Evidence → Redact → check Save button.

## One line

**Redact Save = content-sized chip — unified with Evidence detail; no full blue bar.**
