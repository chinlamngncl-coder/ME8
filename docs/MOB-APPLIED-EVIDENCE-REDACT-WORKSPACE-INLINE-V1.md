# MOB-APPLIED: mob-evidence-redact-workspace-inline-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** `MOB-DISC-EVIDENCE-REDACT-PLACEMENT-SAVE-HINT-PROPOSE.md` (section 1 only)

## What shipped

**Redact video** opens as an Evidence Hub panel (same dark shell as Library / detail) — not a body overlay modal.

| Piece | Detail |
|-------|--------|
| Panel | `#ev-panel-redact` + `#ev-redact-shell` inside `#evidence-panel` |
| Open | `openRedactWorkspace` → `showPanel('redact')` |
| Leave | **Back to evidence** / Cancel → source detail; note Close / Finalize → detail + Prior exports |
| Legacy | `#ev-redact-dialog` removed at runtime; CSS `display:none` if leftover |
| Cache | `evidence-hub.js?v=20260717-redact-workspace-inline` |

Burn / face-follow / Save / Finalize behavior unchanged — shell only.

## Files

- `public/index.html` — hub panel + inline CSS · cache bust
- `public/js/evidence-hub.js` — ensure/open/close + `showPanel('redact')`
- `public/locales/*.json` — `evidenceHub.redactBack`

## Not in this MOB

`mob-evidence-save-meta-dirty-hint-v1` (Save with no changes hint) — still propose only.

## Operator

1. Hard refresh dashboard (Ctrl+F5).  
2. Evidence → open a clip → **Redact video**.  
3. Pass = hub switches in-place (no floating pop over the map); **Back to evidence** returns to that clip.  
4. Fail = still a sudden overlay dialog → tell agent.

## One line

**Redact = Evidence hub workspace, not a pop modal.**
