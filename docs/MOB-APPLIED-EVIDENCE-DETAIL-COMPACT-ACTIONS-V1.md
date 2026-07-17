# MOB APPLIED — `mob-evidence-detail-compact-actions-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Parent:** `docs/MOB-DISC-EVIDENCE-DETAIL-COMPACT-ACTIONS.md`  
**Genre:** Evidence Hub UI only — not wall / pin / PTT / SIP

---

## What changed

| File | Change |
|------|--------|
| `public/index.html` | `#ev-panel-detail` compact `.btn` override (`width: auto`) — same pattern as Analytics / Server Config; Evidence ID row styles; `.ev-detail-side-actions` flex row |
| `public/js/evidence-hub.js` | Detail head labels **Evidence ID** + id; wrap Save / Case / Archive in `.ev-detail-side-actions` |
| Cache | `evidence-hub.js?v=20260716-detail-compact` |

---

## Product result

- **Open Preview** / **Export trimmed clip** / side actions = content-sized chips, not full-width blue bars
- Bare `EV-…` under filename → labeled **Evidence ID** (kept — catalog id, not removed)
- Original recording / id format unchanged

---

## Operator check

1. Hard refresh Evidence Hub  
2. Open a file detail  
3. Confirm: Evidence ID label + compact Open Preview / Export / Save (not page-width blue tabs)

---

## Rollback

Revert the three touch points above (CSS block, detail head markup, cache bust).
